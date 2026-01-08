'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  ConstraintHighlight,
  ConstraintSessionState,
  ConstraintHighlightState,
  ConstraintHighlightDecision,
  TextPosition,
} from '@/types/constraintHighlight'
import { constraintHighlightService } from '@/lib/constraintHighlight'

// =============================================================================
// TYPES
// =============================================================================

export interface UseConstraintHighlightOptions {
  sessionId: string
  problemText: string
  stepCount: number
  enabled?: boolean
}

export interface ActiveHighlight {
  constraintId: string
  constraint: ConstraintHighlight
  stepIndex: number
  position: TextPosition
}

export interface UseConstraintHighlightReturn {
  // State
  isInitialized: boolean
  sessionState: ConstraintSessionState | null
  activeHighlight: ActiveHighlight | null

  // Actions
  checkTrigger: (
    stepIndex: number,
    wrongAttemptCount: number
  ) => ConstraintHighlightDecision
  triggerHighlight: (stepIndex: number, constraintId: string) => void
  acknowledgeHighlight: () => void
  dismissHighlight: () => void

  // Helpers
  getStepState: (stepIndex: number) => ConstraintHighlightState | null
  getConstraint: (constraintId: string) => ConstraintHighlight | null
  getConstraintHint: (constraintId: string) => string | null
  hasActiveHighlight: boolean

  // Statistics
  totalHighlighted: number
  totalAcknowledged: number
}

// =============================================================================
// HOOK
// =============================================================================

export function useConstraintHighlight({
  sessionId,
  problemText,
  stepCount,
  enabled = true,
}: UseConstraintHighlightOptions): UseConstraintHighlightReturn {
  const [isInitialized, setIsInitialized] = useState(false)
  const [sessionState, setSessionState] = useState<ConstraintSessionState | null>(null)
  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlight | null>(null)

  const initRef = useRef(false)

  // Initialize session on mount
  useEffect(() => {
    if (!enabled || !sessionId || !problemText || initRef.current) return

    initRef.current = true

    try {
      const state = constraintHighlightService.initializeSession(
        sessionId,
        problemText,
        stepCount
      )
      setSessionState(state)
      setIsInitialized(true)

      // Log detected constraints
      const totalConstraints = state.stepStates.reduce(
        (sum, s) => sum + s.problemConstraints.length,
        0
      )
      if (totalConstraints > 0) {
        console.log(
          `[ConstraintHighlight] Initialized with ${totalConstraints} constraints detected`
        )
      }
    } catch (error) {
      console.error('[ConstraintHighlight] Failed to initialize:', error)
      setIsInitialized(true) // Mark as initialized to prevent retries
    }
  }, [sessionId, problemText, stepCount, enabled])

  // Check if highlight should trigger
  const checkTrigger = useCallback(
    (stepIndex: number, wrongAttemptCount: number): ConstraintHighlightDecision => {
      if (!enabled || !isInitialized) {
        return { shouldHighlight: false, reason: 'no_constraints_found' }
      }

      return constraintHighlightService.checkHighlightTrigger(
        sessionId,
        stepIndex,
        wrongAttemptCount
      )
    },
    [sessionId, enabled, isInitialized]
  )

  // Trigger highlight for a constraint
  const triggerHighlight = useCallback(
    (stepIndex: number, constraintId: string): void => {
      if (!enabled || !isInitialized) return

      const result = constraintHighlightService.triggerHighlight(
        sessionId,
        stepIndex,
        constraintId
      )

      setSessionState(result.sessionState)

      if (result.constraint) {
        // Find the position of this constraint in the step state
        const stepState = result.sessionState.stepStates[stepIndex]
        const problemConstraint = stepState?.problemConstraints.find(
          c => c.constraintId === constraintId
        )

        setActiveHighlight({
          constraintId,
          constraint: result.constraint,
          stepIndex,
          position: problemConstraint?.position || { start: 0, end: 0 },
        })

        console.log(
          `[ConstraintHighlight] Triggered highlight for "${result.constraint.keyword}" on step ${stepIndex}`
        )
      }
    },
    [sessionId, enabled, isInitialized]
  )

  // Acknowledge the active highlight
  const acknowledgeHighlight = useCallback((): void => {
    if (!activeHighlight) return

    const updatedState = constraintHighlightService.acknowledgeHighlight(
      sessionId,
      activeHighlight.stepIndex,
      activeHighlight.constraintId
    )

    setSessionState(updatedState)
    setActiveHighlight(null)

    console.log(
      `[ConstraintHighlight] Acknowledged "${activeHighlight.constraint.keyword}"`
    )
  }, [sessionId, activeHighlight])

  // Dismiss highlight without acknowledgment
  const dismissHighlight = useCallback((): void => {
    if (!activeHighlight) return

    const updatedState = constraintHighlightService.dismissHighlight(
      sessionId,
      activeHighlight.stepIndex
    )

    setSessionState(updatedState)
    setActiveHighlight(null)
  }, [sessionId, activeHighlight])

  // Get step state
  const getStepState = useCallback(
    (stepIndex: number): ConstraintHighlightState | null => {
      return constraintHighlightService.getStepState(sessionId, stepIndex)
    },
    [sessionId]
  )

  // Get constraint by ID
  const getConstraint = useCallback(
    (constraintId: string): ConstraintHighlight | null => {
      return constraintHighlightService.getConstraint(constraintId)
    },
    []
  )

  // Get constraint hint
  const getConstraintHint = useCallback(
    (constraintId: string): string | null => {
      return constraintHighlightService.getConstraintHint(constraintId)
    },
    []
  )

  return {
    // State
    isInitialized,
    sessionState,
    activeHighlight,

    // Actions
    checkTrigger,
    triggerHighlight,
    acknowledgeHighlight,
    dismissHighlight,

    // Helpers
    getStepState,
    getConstraint,
    getConstraintHint,
    hasActiveHighlight: activeHighlight !== null,

    // Statistics
    totalHighlighted: sessionState?.totalConstraintsHighlighted ?? 0,
    totalAcknowledged: sessionState?.totalConstraintsAcknowledged ?? 0,
  }
}

export default useConstraintHighlight
