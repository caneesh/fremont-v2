/**
 * Momentum Engine
 *
 * Tracks micro-wins to reinforce progress through decision quality.
 * Surfaces meaningful, low-noise wins tied to decision quality, not just correctness.
 *
 * Win Types:
 * - Decision Win: correct first attempt on a decision gate
 * - Hint-Free Win: step completed without hints
 * - Rebuild Win: rebuild gate passed after reveal
 *
 * Rules:
 * - Streaks reset only on consecutive failures (2+), not single mistakes
 * - Feedback appears immediately after triggering action
 * - Momentum does NOT inflate mastery score (motivates, not grades)
 */

import {
  type MomentumState,
  type MomentumEvent,
  type MomentumEventType,
  type StreakType,
  type StreakCounter,
  type PatternStreaks,
  createInitialMomentumState,
  createInitialPatternStreaks,
  createInitialStreakCounter,
  getMomentumMessage,
  serializeMomentumState,
  deserializeMomentumState,
  STREAK_FEEDBACK_THRESHOLDS,
  CONSECUTIVE_FAILURES_TO_RESET,
} from '@/types/momentum'
import { eventLogger } from '@/lib/storage/eventLogger'

const MOMENTUM_STATE_KEY = 'physiscaffold_momentum_state'

// ============================================
// Session State Management
// ============================================

/**
 * Load momentum state from sessionStorage
 */
export function loadMomentumState(): MomentumState | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = sessionStorage.getItem(MOMENTUM_STATE_KEY)
    if (!stored) return null
    return deserializeMomentumState(stored)
  } catch (error) {
    console.error('[MomentumEngine] Failed to load state:', error)
    return null
  }
}

/**
 * Save momentum state to sessionStorage
 */
export function saveMomentumState(state: MomentumState): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(MOMENTUM_STATE_KEY, serializeMomentumState(state))
  } catch (error) {
    console.error('[MomentumEngine] Failed to save state:', error)
  }
}

/**
 * Clear momentum state
 */
export function clearMomentumState(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(MOMENTUM_STATE_KEY)
}

/**
 * Get or create momentum state
 */
export function getOrCreateMomentumState(): MomentumState {
  const existing = loadMomentumState()
  if (existing) return existing

  const newState = createInitialMomentumState()
  saveMomentumState(newState)
  return newState
}

// ============================================
// Pattern Streak Management
// ============================================

/**
 * Get or create streaks for a specific pattern
 */
function getPatternStreaks(
  state: MomentumState,
  patternId: string
): PatternStreaks {
  const existing = state.patternStreaks.get(patternId)
  if (existing) return existing

  const newStreaks = createInitialPatternStreaks(patternId)
  state.patternStreaks.set(patternId, newStreaks)
  return newStreaks
}

/**
 * Get streak counter for a type (session or pattern level)
 */
function getStreakCounter(
  state: MomentumState,
  streakType: StreakType,
  patternId?: string
): StreakCounter {
  if (patternId) {
    const patternStreaks = getPatternStreaks(state, patternId)
    return patternStreaks[streakType]
  }
  return state.session[streakType]
}

// ============================================
// Core Streak Logic
// ============================================

/**
 * Record a win and update streak counters
 * Returns updated state and any momentum event to display
 */
export function recordWin(
  state: MomentumState,
  streakType: StreakType,
  options: {
    patternId?: string
    stepId?: number
    problemId?: string
  } = {}
): { updatedState: MomentumState; event: MomentumEvent | null } {
  const { patternId, stepId, problemId } = options
  const now = new Date().toISOString()

  // Update session-level streak
  const sessionCounter = state.session[streakType]
  const wasRecovery = sessionCounter.consecutiveFailures >= 1

  updateCounterForWin(sessionCounter, now)

  // Update pattern-level streak if patternId provided
  if (patternId) {
    const patternStreaks = getPatternStreaks(state, patternId)
    updateCounterForWin(patternStreaks[streakType], now)
  }

  // Determine if we should show feedback
  const event = createMomentumEventIfThresholdMet(
    streakType,
    sessionCounter.current,
    wasRecovery,
    {
      patternId,
      stepId,
      problemId,
      timestamp: now,
    }
  )

  if (event) {
    state.pendingEvent = event
    state.eventHistory.push(event)

    // Log momentum event for analytics
    eventLogger.momentumWin(streakType, sessionCounter.current, wasRecovery, {
      problemId,
      stepId,
      patternId,
    })
  }

  saveMomentumState(state)
  return { updatedState: state, event }
}

/**
 * Record a failure and potentially reset streak
 * Only resets after CONSECUTIVE_FAILURES_TO_RESET (2) consecutive failures
 */
export function recordFailure(
  state: MomentumState,
  streakType: StreakType,
  options: {
    patternId?: string
    stepId?: number
    problemId?: string
  } = {}
): { updatedState: MomentumState; streakReset: boolean } {
  const { patternId, stepId, problemId } = options

  // Update session-level streak
  const sessionCounter = state.session[streakType]
  const previousStreak = sessionCounter.current
  const wasReset = updateCounterForFailure(sessionCounter)

  // Update pattern-level streak if patternId provided
  if (patternId) {
    const patternStreaks = getPatternStreaks(state, patternId)
    updateCounterForFailure(patternStreaks[streakType])
  }

  // Log streak reset for analytics
  if (wasReset && previousStreak > 0) {
    eventLogger.momentumStreakReset(streakType, previousStreak, {
      problemId,
      stepId,
      patternId,
    })
  }

  saveMomentumState(state)
  return { updatedState: state, streakReset: wasReset }
}

/**
 * Update a streak counter for a win
 */
function updateCounterForWin(counter: StreakCounter, timestamp: string): void {
  counter.current += 1
  counter.totalWins += 1
  counter.consecutiveFailures = 0
  counter.lastWinAt = timestamp

  if (counter.current > counter.best) {
    counter.best = counter.current
  }
}

/**
 * Update a streak counter for a failure
 * Returns true if streak was reset
 */
function updateCounterForFailure(counter: StreakCounter): boolean {
  counter.consecutiveFailures += 1

  // Only reset streak after 2+ consecutive failures
  if (counter.consecutiveFailures >= CONSECUTIVE_FAILURES_TO_RESET) {
    counter.current = 0
    counter.consecutiveFailures = 0
    return true
  }

  return false
}

/**
 * Create a momentum event if streak meets feedback threshold
 */
function createMomentumEventIfThresholdMet(
  streakType: StreakType,
  count: number,
  isRecovery: boolean,
  context: {
    patternId?: string
    stepId?: number
    problemId?: string
    timestamp: string
  }
): MomentumEvent | null {
  const threshold = STREAK_FEEDBACK_THRESHOLDS[streakType]

  // Show feedback for recovery even at count 1
  if (!isRecovery && count < threshold) {
    return null
  }

  const message = getMomentumMessage(streakType, count, isRecovery)
  if (!message) return null

  // Convert camelCase streakType to snake_case for event type
  // e.g., 'hintFree' -> 'hint_free'
  const snakeCaseType = streakType.replace(/([A-Z])/g, '_$1').toLowerCase()

  const eventType = isRecovery
    ? 'recovery_win' as const
    : count === 1
      ? `${snakeCaseType}_win` as MomentumEventType
      : `${snakeCaseType}_streak` as MomentumEventType

  return {
    type: eventType,
    streakType,
    streakCount: count,
    message,
    timestamp: context.timestamp,
    patternId: context.patternId,
    stepId: context.stepId,
    problemId: context.problemId,
    isRecovery,
  }
}

// ============================================
// Convenience Functions for Specific Win Types
// ============================================

/**
 * Record a decision gate win (correct first attempt)
 */
export function recordDecisionWin(
  state: MomentumState,
  options: {
    patternId?: string
    stepId?: number
    problemId?: string
    isFirstAttempt: boolean
  }
): { updatedState: MomentumState; event: MomentumEvent | null } {
  // Only counts as a "decision win" if it's a first attempt
  if (!options.isFirstAttempt) {
    // Not a win, just a correct retry - don't count toward streak
    // but do clear consecutive failures
    const sessionCounter = state.session.decision
    sessionCounter.consecutiveFailures = 0

    if (options.patternId) {
      const patternStreaks = getPatternStreaks(state, options.patternId)
      patternStreaks.decision.consecutiveFailures = 0
    }

    saveMomentumState(state)
    return { updatedState: state, event: null }
  }

  return recordWin(state, 'decision', options)
}

/**
 * Record a decision gate failure
 */
export function recordDecisionFailure(
  state: MomentumState,
  options: {
    patternId?: string
    stepId?: number
    problemId?: string
  } = {}
): { updatedState: MomentumState; streakReset: boolean } {
  return recordFailure(state, 'decision', options)
}

/**
 * Record a hint-free step completion
 */
export function recordHintFreeWin(
  state: MomentumState,
  options: {
    patternId?: string
    stepId?: number
    problemId?: string
    maxHintLevelUsed: number // 0 means no hints used
  }
): { updatedState: MomentumState; event: MomentumEvent | null } {
  // Only counts if no hints were used (level 0)
  if (options.maxHintLevelUsed > 0) {
    // Used hints - record as failure
    return {
      ...recordFailure(state, 'hintFree', options),
      event: null,
    }
  }

  return recordWin(state, 'hintFree', options)
}

/**
 * Record a rebuild gate pass
 */
export function recordRebuildWin(
  state: MomentumState,
  options: {
    patternId?: string
    stepId?: number
    problemId?: string
  }
): { updatedState: MomentumState; event: MomentumEvent | null } {
  return recordWin(state, 'rebuild', options)
}

/**
 * Record a rebuild gate failure
 */
export function recordRebuildFailure(
  state: MomentumState,
  options: {
    patternId?: string
    stepId?: number
    problemId?: string
  } = {}
): { updatedState: MomentumState; streakReset: boolean } {
  return recordFailure(state, 'rebuild', options)
}

// ============================================
// Event Management
// ============================================

/**
 * Consume pending event (marks it as shown)
 * Call this after displaying feedback to user
 */
export function consumePendingEvent(
  state: MomentumState
): { updatedState: MomentumState; event: MomentumEvent | null } {
  const event = state.pendingEvent
  state.pendingEvent = null
  saveMomentumState(state)
  return { updatedState: state, event }
}

/**
 * Check if there's a pending event to display
 */
export function hasPendingEvent(state: MomentumState): boolean {
  return state.pendingEvent !== null
}

// ============================================
// Analytics & Summary
// ============================================

/**
 * Get momentum summary for a session
 */
export function getMomentumSummary(state: MomentumState): {
  session: {
    decisionStreak: number
    decisionBest: number
    decisionTotal: number
    hintFreeStreak: number
    hintFreeBest: number
    hintFreeTotal: number
    rebuildStreak: number
    rebuildBest: number
    rebuildTotal: number
  }
  totalEvents: number
  recoveryCount: number
} {
  const recoveryCount = state.eventHistory.filter(e => e.isRecovery).length

  return {
    session: {
      decisionStreak: state.session.decision.current,
      decisionBest: state.session.decision.best,
      decisionTotal: state.session.decision.totalWins,
      hintFreeStreak: state.session.hintFree.current,
      hintFreeBest: state.session.hintFree.best,
      hintFreeTotal: state.session.hintFree.totalWins,
      rebuildStreak: state.session.rebuild.current,
      rebuildBest: state.session.rebuild.best,
      rebuildTotal: state.session.rebuild.totalWins,
    },
    totalEvents: state.eventHistory.length,
    recoveryCount,
  }
}

/**
 * Get pattern-specific momentum summary
 */
export function getPatternMomentumSummary(
  state: MomentumState,
  patternId: string
): {
  decisionStreak: number
  decisionBest: number
  decisionTotal: number
  hintFreeStreak: number
  hintFreeBest: number
  hintFreeTotal: number
  rebuildStreak: number
  rebuildBest: number
  rebuildTotal: number
} | null {
  const patternStreaks = state.patternStreaks.get(patternId)
  if (!patternStreaks) return null

  return {
    decisionStreak: patternStreaks.decision.current,
    decisionBest: patternStreaks.decision.best,
    decisionTotal: patternStreaks.decision.totalWins,
    hintFreeStreak: patternStreaks.hintFree.current,
    hintFreeBest: patternStreaks.hintFree.best,
    hintFreeTotal: patternStreaks.hintFree.totalWins,
    rebuildStreak: patternStreaks.rebuild.current,
    rebuildBest: patternStreaks.rebuild.best,
    rebuildTotal: patternStreaks.rebuild.totalWins,
  }
}

/**
 * Get telemetry-ready state snapshot
 */
export function getMomentumTelemetry(state: MomentumState): Record<string, unknown> {
  const summary = getMomentumSummary(state)
  return {
    ...summary,
    patternsTracked: state.patternStreaks.size,
    sessionStartedAt: state.sessionStartedAt,
    lastEventAt: state.eventHistory.length > 0
      ? state.eventHistory[state.eventHistory.length - 1].timestamp
      : null,
  }
}
