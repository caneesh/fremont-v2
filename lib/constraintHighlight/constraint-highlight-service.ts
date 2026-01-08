/**
 * Constraint Highlight Service
 *
 * Wires the constraint highlight policy with storage and provides
 * a clean API for the UI layer.
 */

import type {
  ConstraintHighlight,
  ProblemConstraint,
  ConstraintSessionState,
  ConstraintHighlightState,
  ConstraintDetectionResult,
  ConstraintHighlightDecision,
} from '@/types/constraintHighlight'

import {
  createConstraintSessionState,
  addConstraintsToStep,
  highlightConstraint,
  acknowledgeConstraint,
  dismissConstraint,
  getStepConstraintState,
  getConstraintEffectiveness,
} from '@/lib/core/entities/constraint-highlight'

import {
  detectConstraints,
  shouldHighlightConstraint,
  getConstraintById,
  DEFAULT_CONSTRAINTS,
  generateConstraintHint,
} from '@/lib/core/policies/constraint-highlight-policy'

// =============================================================================
// STORAGE (localStorage-based)
// =============================================================================

const STORAGE_PREFIX = 'constraint_highlight_'

function getStorageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`
}

function loadSessionState(sessionId: string): ConstraintSessionState | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(getStorageKey(sessionId))
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('[ConstraintHighlight] Failed to load session state:', error)
  }

  return null
}

function saveSessionState(state: ConstraintSessionState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(getStorageKey(state.sessionId), JSON.stringify(state))
  } catch (error) {
    console.error('[ConstraintHighlight] Failed to save session state:', error)
  }
}

// =============================================================================
// SERVICE INTERFACE
// =============================================================================

export interface ConstraintHighlightService {
  /**
   * Initialize a constraint highlight session for a problem
   */
  initializeSession(
    sessionId: string,
    problemText: string,
    stepCount: number
  ): ConstraintSessionState

  /**
   * Get current session state
   */
  getSessionState(sessionId: string): ConstraintSessionState | null

  /**
   * Detect constraints for a specific step
   */
  detectStepConstraints(
    sessionId: string,
    stepIndex: number,
    stepPrompt: string,
    problemText: string
  ): ConstraintDetectionResult

  /**
   * Check if a constraint should be highlighted after wrong answer
   */
  checkHighlightTrigger(
    sessionId: string,
    stepIndex: number,
    wrongAttemptCount: number
  ): ConstraintHighlightDecision

  /**
   * Trigger constraint highlight for a step
   */
  triggerHighlight(
    sessionId: string,
    stepIndex: number,
    constraintId: string
  ): { sessionState: ConstraintSessionState; constraint: ConstraintHighlight | null }

  /**
   * Acknowledge a highlighted constraint
   */
  acknowledgeHighlight(
    sessionId: string,
    stepIndex: number,
    constraintId: string
  ): ConstraintSessionState

  /**
   * Dismiss highlight without acknowledgment
   */
  dismissHighlight(sessionId: string, stepIndex: number): ConstraintSessionState

  /**
   * Get step-level constraint state
   */
  getStepState(
    sessionId: string,
    stepIndex: number
  ): ConstraintHighlightState | null

  /**
   * Get a constraint by ID
   */
  getConstraint(constraintId: string): ConstraintHighlight | null

  /**
   * Get all available constraints
   */
  getAllConstraints(): readonly ConstraintHighlight[]

  /**
   * Generate hint text for a constraint
   */
  getConstraintHint(
    constraintId: string,
    context?: { stepPrompt?: string; userAnswer?: string }
  ): string | null

  /**
   * Get effectiveness statistics
   */
  getEffectiveness(sessionId: string): {
    totalHighlighted: number
    totalAcknowledged: number
    acknowledgementRate: number
    mostMissedConstraints: string[]
  } | null
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

function createConstraintHighlightService(): ConstraintHighlightService {
  // In-memory cache for SSR
  const memoryCache = new Map<string, ConstraintSessionState>()

  const getState = (sessionId: string): ConstraintSessionState | null => {
    // Check memory cache first (for SSR)
    if (memoryCache.has(sessionId)) {
      return memoryCache.get(sessionId)!
    }

    // Try localStorage
    const stored = loadSessionState(sessionId)
    if (stored) {
      memoryCache.set(sessionId, stored)
      return stored
    }

    return null
  }

  const setState = (state: ConstraintSessionState): void => {
    memoryCache.set(state.sessionId, state)
    saveSessionState(state)
  }

  return {
    initializeSession(
      sessionId: string,
      problemText: string,
      stepCount: number
    ): ConstraintSessionState {
      // Check for existing session
      const existing = getState(sessionId)
      if (existing) {
        return existing
      }

      // Create new session
      const state = createConstraintSessionState(sessionId, stepCount)

      // Detect constraints in problem text for all steps
      const detection = detectConstraints(problemText)
      let updatedState = state

      if (detection.found) {
        // Add detected constraints to first step (they apply globally)
        for (let i = 0; i < stepCount; i++) {
          updatedState = addConstraintsToStep(
            updatedState,
            i,
            detection.constraints as ProblemConstraint[]
          )
        }
      }

      setState(updatedState)
      return updatedState
    },

    getSessionState(sessionId: string): ConstraintSessionState | null {
      return getState(sessionId)
    },

    detectStepConstraints(
      sessionId: string,
      stepIndex: number,
      stepPrompt: string,
      problemText: string
    ): ConstraintDetectionResult {
      const detection = detectConstraints(problemText, stepPrompt)

      // Update session state with detected constraints
      const state = getState(sessionId)
      if (state && detection.found) {
        const updatedState = addConstraintsToStep(
          state,
          stepIndex,
          detection.constraints as ProblemConstraint[]
        )
        setState(updatedState)
      }

      return detection
    },

    checkHighlightTrigger(
      sessionId: string,
      stepIndex: number,
      wrongAttemptCount: number
    ): ConstraintHighlightDecision {
      const state = getState(sessionId)
      if (!state) {
        return {
          shouldHighlight: false,
          reason: 'no_constraints_found',
        }
      }

      return shouldHighlightConstraint(state, stepIndex, wrongAttemptCount)
    },

    triggerHighlight(
      sessionId: string,
      stepIndex: number,
      constraintId: string
    ): { sessionState: ConstraintSessionState; constraint: ConstraintHighlight | null } {
      const state = getState(sessionId)
      if (!state) {
        return {
          sessionState: createConstraintSessionState(sessionId, 0),
          constraint: null,
        }
      }

      const updatedState = highlightConstraint(state, stepIndex, constraintId)
      setState(updatedState)

      const constraint = getConstraintById(constraintId)

      return {
        sessionState: updatedState,
        constraint,
      }
    },

    acknowledgeHighlight(
      sessionId: string,
      stepIndex: number,
      constraintId: string
    ): ConstraintSessionState {
      const state = getState(sessionId)
      if (!state) {
        return createConstraintSessionState(sessionId, 0)
      }

      const updatedState = acknowledgeConstraint(state, stepIndex, constraintId)
      setState(updatedState)

      return updatedState
    },

    dismissHighlight(sessionId: string, stepIndex: number): ConstraintSessionState {
      const state = getState(sessionId)
      if (!state) {
        return createConstraintSessionState(sessionId, 0)
      }

      const updatedState = dismissConstraint(state, stepIndex)
      setState(updatedState)

      return updatedState
    },

    getStepState(
      sessionId: string,
      stepIndex: number
    ): ConstraintHighlightState | null {
      const state = getState(sessionId)
      if (!state) return null

      return getStepConstraintState(state, stepIndex)
    },

    getConstraint(constraintId: string): ConstraintHighlight | null {
      return getConstraintById(constraintId)
    },

    getAllConstraints(): readonly ConstraintHighlight[] {
      return DEFAULT_CONSTRAINTS
    },

    getConstraintHint(
      constraintId: string,
      context?: { stepPrompt?: string; userAnswer?: string }
    ): string | null {
      const constraint = getConstraintById(constraintId)
      if (!constraint) return null

      return generateConstraintHint(constraint, context)
    },

    getEffectiveness(sessionId: string): {
      totalHighlighted: number
      totalAcknowledged: number
      acknowledgementRate: number
      mostMissedConstraints: string[]
    } | null {
      const state = getState(sessionId)
      if (!state) return null

      return getConstraintEffectiveness(state)
    },
  }
}

// Export singleton instance
export const constraintHighlightService = createConstraintHighlightService()
