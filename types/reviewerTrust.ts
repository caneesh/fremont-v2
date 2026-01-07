/**
 * Reviewer Trust + Golden Samples Types
 *
 * Reviewers earn trust scores by accurately grading "golden" samples
 * (expert-graded examples). Trust affects queue priority and self-review thresholds.
 */

/**
 * A golden sample with expert grading
 */
export interface GoldenSample {
  readonly id: string
  readonly problemId: string
  readonly submissionCode: string
  readonly submissionExplanation?: string
  readonly expertGrade: ExpertGrade
  readonly difficulty: 'easy' | 'medium' | 'hard'
  readonly focusAreas: readonly ReviewFocusArea[]
  readonly createdAt: string
}

/**
 * Expert's grading of a golden sample
 */
export interface ExpertGrade {
  readonly overallScore: number // 0-100
  readonly dimensions: readonly GradeDimension[]
  readonly comments: readonly ExpertComment[]
  readonly correctApproach: boolean
  readonly hasErrors: boolean
  readonly errorTypes?: readonly string[]
}

/**
 * Individual grading dimension
 */
export interface GradeDimension {
  readonly dimension: string // e.g., 'correctness', 'clarity', 'completeness'
  readonly score: number // 0-100
  readonly expertNotes?: string
}

/**
 * Expert comment on the submission
 */
export interface ExpertComment {
  readonly lineRange?: { start: number; end: number }
  readonly commentText: string
  readonly severity: 'info' | 'suggestion' | 'issue' | 'critical'
}

/**
 * Focus area for review
 */
export type ReviewFocusArea =
  | 'correctness'
  | 'clarity'
  | 'completeness'
  | 'efficiency'
  | 'explanation_quality'
  | 'error_identification'

/**
 * Reviewer's trust profile
 */
export interface ReviewerTrustProfile {
  readonly reviewerId: string
  readonly tenantId: string
  readonly trustScore: number // 0-100
  readonly trustLevel: TrustLevel
  readonly calibrationHistory: readonly CalibrationAttempt[]
  readonly totalReviewsCompleted: number
  readonly totalCalibrationsCompleted: number
  readonly lastCalibrationDate?: string
  readonly createdAt: string
  readonly updatedAt: string
}

export type TrustLevel = 'novice' | 'apprentice' | 'trusted' | 'expert'

/**
 * A calibration attempt (grading a golden sample)
 */
export interface CalibrationAttempt {
  readonly id: string
  readonly goldenSampleId: string
  readonly reviewerGrade: ReviewerGrade
  readonly expertGrade: ExpertGrade
  readonly deviationScore: number // How far from expert
  readonly scoreChange: number // Trust score change
  readonly attemptedAt: string
}

/**
 * Reviewer's grade of a submission
 */
export interface ReviewerGrade {
  readonly overallScore: number
  readonly dimensions: readonly GradeDimension[]
  readonly comments: readonly ReviewerComment[]
  readonly correctApproachMarked: boolean
  readonly errorsIdentified: readonly string[]
}

/**
 * Reviewer's comment
 */
export interface ReviewerComment {
  readonly lineRange?: { start: number; end: number }
  readonly commentText: string
  readonly severity: 'info' | 'suggestion' | 'issue' | 'critical'
}

/**
 * Trust score calculation result
 */
export interface TrustScoreUpdate {
  readonly previousScore: number
  readonly newScore: number
  readonly change: number
  readonly reason: string
  readonly newLevel: TrustLevel
  readonly levelChanged: boolean
}

/**
 * Queue priority based on trust
 */
export interface ReviewQueuePriority {
  readonly reviewerId: string
  readonly priority: number // Higher = see more submissions
  readonly canSelfReview: boolean
  readonly maxDailyReviews: number
  readonly canReviewAdvanced: boolean
}

// Policy constants
export const REVIEWER_TRUST_POLICY = {
  // Trust score thresholds for levels
  NOVICE_MAX: 40,
  APPRENTICE_MAX: 65,
  TRUSTED_MAX: 85,
  // Above 85 is expert

  // Score changes
  PERFECT_CALIBRATION_BONUS: 5,
  CLOSE_CALIBRATION_BONUS: 3,
  ACCEPTABLE_DEVIATION_PENALTY: -1,
  LARGE_DEVIATION_PENALTY: -3,

  // Deviation thresholds
  PERFECT_DEVIATION_MAX: 5, // Within 5 points
  CLOSE_DEVIATION_MAX: 10,
  ACCEPTABLE_DEVIATION_MAX: 20,

  // Calibration requirements
  MIN_CALIBRATIONS_FOR_TRUSTED: 5,
  CALIBRATION_COOLDOWN_HOURS: 24, // Can recalibrate after 24h

  // Queue priority multipliers
  EXPERT_PRIORITY_MULTIPLIER: 2.0,
  TRUSTED_PRIORITY_MULTIPLIER: 1.5,
  APPRENTICE_PRIORITY_MULTIPLIER: 1.2,
  NOVICE_PRIORITY_MULTIPLIER: 1.0,

  // Self-review thresholds
  SELF_REVIEW_MIN_TRUST: 70, // Need 70+ trust to self-review
} as const

// Event types
export type ReviewerTrustEventType =
  | 'reviewer_calibration_started'
  | 'reviewer_calibration_completed'
  | 'reviewer_trust_updated'
  | 'reviewer_level_changed'
  | 'golden_sample_created'

export interface ReviewerTrustEventMetadata {
  reviewerId?: string
  goldenSampleId?: string
  previousScore?: number
  newScore?: number
  previousLevel?: TrustLevel
  newLevel?: TrustLevel
  deviationScore?: number
}
