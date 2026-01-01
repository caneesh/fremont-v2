/**
 * Skip-or-Commit Gate Types
 *
 * Forces learners to make a strategic decision at a configured time:
 * - Commit: continue solving the problem
 * - Skip: exit and move to next problem (trains exam-time strategy)
 */

// ============================================
// Configuration Types
// ============================================

/**
 * Time pressure configuration for a problem
 */
export interface TimePressureConfig {
  /** Enable the skip-or-commit gate */
  enableSkipCommit: boolean
  /** Seconds after opening problem to show the gate (default: 25) */
  gateSeconds: number
  /** Seconds before auto-commit if user doesn't decide (default: 8) */
  autoCommitSeconds?: number
  /** Expected solve time in seconds (for analytics) */
  expectedSolveTimeSeconds?: number
}

/**
 * Default time pressure configuration
 */
export const DEFAULT_TIME_PRESSURE_CONFIG: TimePressureConfig = {
  enableSkipCommit: true,
  gateSeconds: 25,
  autoCommitSeconds: 8,
}

// ============================================
// Decision Types
// ============================================

/**
 * User's decision at the skip-or-commit gate
 */
export type SkipCommitDecision = 'commit' | 'skip' | 'auto_commit'

/**
 * Skip-or-commit gate state for an attempt
 */
export interface SkipCommitState {
  /** User's decision */
  decision: SkipCommitDecision | null
  /** Time taken to make decision (ms) */
  decisionTimeMs: number | null
  /** Whether the problem was skipped */
  wasSkipped: boolean
  /** Whether decision was auto-commit (user ignored the gate) */
  wasAutoCommit: boolean
  /** Timestamp when gate was shown */
  gateShownAt: number | null
  /** Timestamp when decision was made */
  decisionMadeAt: number | null
}

/**
 * Initial skip-commit state
 */
export const INITIAL_SKIP_COMMIT_STATE: SkipCommitState = {
  decision: null,
  decisionTimeMs: null,
  wasSkipped: false,
  wasAutoCommit: false,
  gateShownAt: null,
  decisionMadeAt: null,
}

// ============================================
// Analytics Types
// ============================================

/**
 * Session-level skip-commit analytics
 */
export interface SkipCommitAnalytics {
  /** Total problems attempted in session */
  totalAttempted: number
  /** Problems committed to */
  committed: number
  /** Problems skipped */
  skipped: number
  /** Problems auto-committed (user ignored gate) */
  autoCommitted: number
  /** Average decision time in ms */
  avgDecisionTimeMs: number
  /** Problems that should have been skipped (spent >2x expected time AND got wrong) */
  shouldHaveSkipped: SkipCandidate[]
}

/**
 * A problem that the analytics suggest should have been skipped
 */
export interface SkipCandidate {
  problemId: string
  problemTitle: string
  actualTimeMs: number
  expectedTimeMs: number
  timeRatio: number
  wasCorrect: boolean
}

/**
 * Calculate skip-commit analytics from session attempts
 */
export function calculateSkipCommitAnalytics(
  attempts: Array<{
    problemId: string
    problemTitle: string
    skipCommitState?: SkipCommitState
    timeSpentMs: number
    expectedTimeMs?: number
    wasCorrect: boolean
  }>
): SkipCommitAnalytics {
  const withDecisions = attempts.filter(a => a.skipCommitState?.decision)

  const committed = withDecisions.filter(
    a => a.skipCommitState?.decision === 'commit'
  ).length

  const skipped = withDecisions.filter(
    a => a.skipCommitState?.decision === 'skip'
  ).length

  const autoCommitted = withDecisions.filter(
    a => a.skipCommitState?.decision === 'auto_commit'
  ).length

  const decisionTimes = withDecisions
    .map(a => a.skipCommitState?.decisionTimeMs)
    .filter((t): t is number => t !== null && t !== undefined)

  const avgDecisionTimeMs = decisionTimes.length > 0
    ? decisionTimes.reduce((a, b) => a + b, 0) / decisionTimes.length
    : 0

  // Find problems that should have been skipped:
  // - Spent > 2x expected time AND got wrong
  const shouldHaveSkipped: SkipCandidate[] = attempts
    .filter(a => {
      if (!a.expectedTimeMs || a.wasCorrect) return false
      const timeRatio = a.timeSpentMs / a.expectedTimeMs
      return timeRatio > 2
    })
    .map(a => ({
      problemId: a.problemId,
      problemTitle: a.problemTitle,
      actualTimeMs: a.timeSpentMs,
      expectedTimeMs: a.expectedTimeMs!,
      timeRatio: a.timeSpentMs / a.expectedTimeMs!,
      wasCorrect: a.wasCorrect,
    }))

  return {
    totalAttempted: attempts.length,
    committed,
    skipped,
    autoCommitted,
    avgDecisionTimeMs,
    shouldHaveSkipped,
  }
}

// ============================================
// Storage Types
// ============================================

/**
 * Skip-commit data to persist with attempt
 */
export interface SkipCommitPersistence {
  decision: SkipCommitDecision | null
  decisionTimeMs: number | null
  wasSkipped: boolean
  wasAutoCommit: boolean
}

/**
 * Convert state to persistence format
 */
export function toSkipCommitPersistence(
  state: SkipCommitState
): SkipCommitPersistence {
  return {
    decision: state.decision,
    decisionTimeMs: state.decisionTimeMs,
    wasSkipped: state.wasSkipped,
    wasAutoCommit: state.wasAutoCommit,
  }
}
