/**
 * Pivot Injection Types
 *
 * When a student takes too long on a step, inject a "pivot" question
 * to help them think about the problem from a different angle.
 */

/**
 * Pivot question configuration
 */
export interface PivotQuestion {
  readonly id: string
  readonly questionText: string
  readonly type: 'mcq' | 'short' | 'reflection'
  readonly choices?: readonly string[]
  readonly correctAnswer?: string
  readonly explanation: string
  readonly category: PivotCategory
  readonly triggerPatterns: readonly string[] // patterns/concepts this pivot helps with
}

/**
 * Category of pivot question
 */
export type PivotCategory =
  | 'simplify' // Ask student to think about a simpler version
  | 'analogy' // Draw connection to familiar concept
  | 'constraint' // Focus on a specific constraint they may have missed
  | 'decompose' // Break the problem into smaller parts
  | 'visualize' // Encourage visual/diagram thinking
  | 'reverse' // Work backwards from the answer

/**
 * Trigger configuration for when to show pivot
 */
export interface PivotTrigger {
  readonly stepId: string
  readonly stepIndex: number
  readonly timeSpentSeconds: number
  readonly attemptCount: number
  readonly hintLevel: number
  readonly patternId?: string
}

/**
 * Pivot injection state for a session
 */
export interface PivotSessionState {
  readonly sessionId: string
  readonly userId: string
  readonly stepPivotStates: readonly StepPivotState[]
  readonly totalPivotsShown: number
  readonly totalPivotsAnswered: number
}

/**
 * Pivot state for a specific step
 */
export interface StepPivotState {
  readonly stepId: string
  readonly stepIndex: number
  readonly status: PivotStatus
  readonly triggeredAt?: string
  readonly answeredAt?: string
  readonly timeToTriggerSeconds?: number
  readonly pivotQuestionId?: string
  readonly userAnswer?: string
  readonly wasHelpful?: boolean // User feedback
}

export type PivotStatus =
  | 'not_triggered' // No pivot shown yet
  | 'pending' // Pivot is ready to show but waiting
  | 'showing' // Pivot question is being displayed
  | 'answered' // User answered the pivot
  | 'skipped' // User skipped the pivot
  | 'disabled' // Pivots disabled for this step

/**
 * Result of checking if pivot should trigger
 */
export interface PivotDecision {
  readonly shouldTrigger: boolean
  readonly reason: PivotDecisionReason
  readonly suggestedPivot?: PivotQuestion
}

export type PivotDecisionReason =
  | 'time_threshold_exceeded'
  | 'multiple_wrong_attempts'
  | 'hint_escalation'
  | 'explicit_request'
  | 'not_enough_time'
  | 'recently_triggered'
  | 'max_pivots_reached'
  | 'disabled'

/**
 * Pivot answer submission
 */
export interface PivotAnswerSubmission {
  readonly pivotQuestionId: string
  readonly stepId: string
  readonly userAnswer: string
  readonly timeSpentSeconds: number
  readonly wasHelpful?: boolean
}

// Policy constants
export const PIVOT_POLICY = {
  // Time thresholds (seconds)
  MIN_TIME_BEFORE_TRIGGER: 60, // At least 60s before considering pivot
  DEFAULT_TIME_THRESHOLD: 120, // 2 minutes default
  HARD_STEP_TIME_THRESHOLD: 180, // 3 minutes for harder steps

  // Attempt thresholds
  WRONG_ATTEMPT_TRIGGER: 3, // After 3 wrong attempts

  // Cooldown
  MIN_TIME_BETWEEN_PIVOTS: 120, // At least 2 minutes between pivots

  // Limits
  MAX_PIVOTS_PER_STEP: 2,
  MAX_PIVOTS_PER_SESSION: 5,

  // Time bonuses
  CORRECT_PIVOT_TIME_BONUS_SECONDS: 30, // Extra time if pivot answered correctly
} as const

// Event types for pivot
export type PivotEventType =
  | 'pivot_triggered'
  | 'pivot_shown'
  | 'pivot_answered'
  | 'pivot_skipped'
  | 'pivot_helpful_feedback'

export interface PivotEventMetadata {
  pivotId?: string
  stepId?: string
  stepIndex?: number
  triggerReason?: PivotDecisionReason
  timeToTriggerSeconds?: number
  userAnswer?: string
  wasCorrect?: boolean
  wasHelpful?: boolean
}
