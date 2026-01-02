/**
 * Momentum Engine Types
 *
 * Tracks micro-wins to reinforce progress through decision quality,
 * not just correctness. Motivates without grading.
 *
 * Three streak types:
 * 1. Decision Streaks - Correct first attempts on decision gates
 * 2. Hint-Free Streaks - Steps completed without hints
 * 3. Rebuild Success Streaks - Rebuild gates passed after reveal
 */

// ============================================
// Streak Types
// ============================================

export type StreakType = 'decision' | 'hintFree' | 'rebuild'

/**
 * Individual streak counter with consecutive failure tracking
 */
export interface StreakCounter {
  /** Current streak count */
  current: number
  /** Best streak achieved this session */
  best: number
  /** Consecutive failures (resets streak when >= 2) */
  consecutiveFailures: number
  /** Total wins of this type in session */
  totalWins: number
  /** Timestamp of last win */
  lastWinAt: string | null
}

/**
 * Create initial streak counter
 */
export function createInitialStreakCounter(): StreakCounter {
  return {
    current: 0,
    best: 0,
    consecutiveFailures: 0,
    totalWins: 0,
    lastWinAt: null,
  }
}

// ============================================
// Pattern-Level Streaks
// ============================================

/**
 * Streaks tracked for a specific pattern (e.g., "kinematics", "free-body-diagram")
 */
export interface PatternStreaks {
  patternId: string
  decision: StreakCounter
  hintFree: StreakCounter
  rebuild: StreakCounter
}

/**
 * Create initial pattern streaks
 */
export function createInitialPatternStreaks(patternId: string): PatternStreaks {
  return {
    patternId,
    decision: createInitialStreakCounter(),
    hintFree: createInitialStreakCounter(),
    rebuild: createInitialStreakCounter(),
  }
}

// ============================================
// Session-Level Momentum State
// ============================================

/**
 * Full momentum state for a session
 */
export interface MomentumState {
  /** Session-level streaks (across all patterns) */
  session: {
    decision: StreakCounter
    hintFree: StreakCounter
    rebuild: StreakCounter
  }
  /** Per-pattern streaks */
  patternStreaks: Map<string, PatternStreaks>
  /** Pending momentum event to display (consumed after shown) */
  pendingEvent: MomentumEvent | null
  /** History of momentum events this session (for analytics) */
  eventHistory: MomentumEvent[]
  /** Session start timestamp */
  sessionStartedAt: string
}

/**
 * Create initial momentum state
 */
export function createInitialMomentumState(): MomentumState {
  return {
    session: {
      decision: createInitialStreakCounter(),
      hintFree: createInitialStreakCounter(),
      rebuild: createInitialStreakCounter(),
    },
    patternStreaks: new Map(),
    pendingEvent: null,
    eventHistory: [],
    sessionStartedAt: new Date().toISOString(),
  }
}

// ============================================
// Momentum Events
// ============================================

export type MomentumEventType =
  | 'decision_win'
  | 'decision_streak'
  | 'hint_free_win'
  | 'hint_free_streak'
  | 'rebuild_win'
  | 'rebuild_streak'
  | 'recovery_win'  // Recovered after a mistake

/**
 * A momentum event that triggers UI feedback
 */
export interface MomentumEvent {
  type: MomentumEventType
  streakType: StreakType
  streakCount: number
  message: string
  timestamp: string
  /** Pattern ID if pattern-specific */
  patternId?: string
  /** Step ID where event occurred */
  stepId?: number
  /** Problem ID */
  problemId?: string
  /** Whether this was a recovery (came back from failure) */
  isRecovery: boolean
}

// ============================================
// Momentum Feedback Copy
// ============================================

/**
 * Get appropriate feedback message for a momentum event
 */
export function getMomentumMessage(
  type: StreakType,
  count: number,
  isRecovery: boolean
): string {
  if (isRecovery) {
    return 'Recovered after mistake — that\'s mastery'
  }

  switch (type) {
    case 'decision':
      if (count === 1) return 'Good decision'
      if (count === 2) return '2 correct decisions in a row'
      if (count >= 3) return `${count} correct decisions in a row`
      break
    case 'hintFree':
      if (count === 1) return 'Solved without hints — strong thinking'
      if (count === 2) return '2 steps without hints'
      if (count >= 3) return `${count} steps solved hint-free`
      break
    case 'rebuild':
      if (count === 1) return 'Rebuilt understanding successfully'
      if (count >= 2) return `${count} rebuilds mastered`
      break
  }

  return ''
}

// ============================================
// Thresholds for streak messaging
// ============================================

/**
 * Minimum streak count to trigger UI feedback (avoid noise)
 */
export const STREAK_FEEDBACK_THRESHOLDS: Record<StreakType, number> = {
  decision: 2,   // Show at 2+ correct decisions
  hintFree: 1,   // Show immediately for hint-free (rarer)
  rebuild: 1,    // Show immediately for rebuild (rarer)
}

/**
 * Consecutive failures required to reset streak
 * (single mistake doesn't break streak)
 */
export const CONSECUTIVE_FAILURES_TO_RESET = 2

// ============================================
// Serialization helpers
// ============================================

/**
 * Convert momentum state to JSON-serializable format
 */
export function serializeMomentumState(state: MomentumState): string {
  return JSON.stringify({
    ...state,
    patternStreaks: Array.from(state.patternStreaks.entries()),
  })
}

/**
 * Parse momentum state from JSON string
 */
export function deserializeMomentumState(json: string): MomentumState {
  const parsed = JSON.parse(json)
  return {
    ...parsed,
    patternStreaks: new Map(parsed.patternStreaks || []),
  }
}

// ============================================
// Telemetry Event Types
// ============================================

export type MomentumTelemetryEventType =
  | 'momentum_win_recorded'
  | 'momentum_streak_achieved'
  | 'momentum_streak_reset'
  | 'momentum_feedback_shown'
  | 'momentum_recovery'

export interface MomentumTelemetryEvent {
  type: MomentumTelemetryEventType
  streakType: StreakType
  count: number
  patternId?: string
  problemId?: string
  stepId?: number
  timestamp: string
}
