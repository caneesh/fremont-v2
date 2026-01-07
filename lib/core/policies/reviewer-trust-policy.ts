/**
 * Reviewer Trust Policy
 *
 * Deterministic scoring for reviewer trust based on golden sample calibration.
 */

import type {
  GoldenSample,
  ExpertGrade,
  ReviewerGrade,
  ReviewerTrustProfile,
  TrustLevel,
  TrustScoreUpdate,
  CalibrationAttempt,
  ReviewQueuePriority,
} from '@/types/reviewerTrust'

// Re-export policy constants
export const TRUST_POLICY = {
  NOVICE_MAX: 40,
  APPRENTICE_MAX: 65,
  TRUSTED_MAX: 85,
  PERFECT_CALIBRATION_BONUS: 5,
  CLOSE_CALIBRATION_BONUS: 3,
  ACCEPTABLE_DEVIATION_PENALTY: -1,
  LARGE_DEVIATION_PENALTY: -3,
  PERFECT_DEVIATION_MAX: 5,
  CLOSE_DEVIATION_MAX: 10,
  ACCEPTABLE_DEVIATION_MAX: 20,
  MIN_CALIBRATIONS_FOR_TRUSTED: 5,
  CALIBRATION_COOLDOWN_HOURS: 24,
  EXPERT_PRIORITY_MULTIPLIER: 2.0,
  TRUSTED_PRIORITY_MULTIPLIER: 1.5,
  APPRENTICE_PRIORITY_MULTIPLIER: 1.2,
  NOVICE_PRIORITY_MULTIPLIER: 1.0,
  SELF_REVIEW_MIN_TRUST: 70,
} as const

/**
 * Calculate deviation between reviewer and expert grades - DETERMINISTIC
 */
export function calculateDeviation(
  reviewerGrade: ReviewerGrade,
  expertGrade: ExpertGrade
): number {
  // Calculate overall score deviation
  const overallDeviation = Math.abs(
    reviewerGrade.overallScore - expertGrade.overallScore
  )

  // Calculate dimension deviations
  let dimensionDeviation = 0
  let matchedDimensions = 0

  for (const expertDim of expertGrade.dimensions) {
    const reviewerDim = reviewerGrade.dimensions.find(
      d => d.dimension === expertDim.dimension
    )
    if (reviewerDim) {
      dimensionDeviation += Math.abs(reviewerDim.score - expertDim.score)
      matchedDimensions++
    }
  }

  // Average dimension deviation
  const avgDimensionDeviation =
    matchedDimensions > 0 ? dimensionDeviation / matchedDimensions : 0

  // Calculate error identification accuracy
  const errorMatchScore = calculateErrorMatchScore(
    reviewerGrade.errorsIdentified,
    expertGrade.errorTypes || []
  )

  // Weighted combination
  const weights = {
    overall: 0.5,
    dimensions: 0.3,
    errorMatch: 0.2,
  }

  const weightedDeviation =
    overallDeviation * weights.overall +
    avgDimensionDeviation * weights.dimensions +
    (100 - errorMatchScore) * weights.errorMatch // Invert error match to deviation

  return Math.round(weightedDeviation)
}

/**
 * Calculate error match score
 */
function calculateErrorMatchScore(
  reviewerErrors: readonly string[],
  expertErrors: readonly string[]
): number {
  if (expertErrors.length === 0 && reviewerErrors.length === 0) {
    return 100 // Both agree no errors
  }

  if (expertErrors.length === 0) {
    // Expert says no errors, reviewer found some (false positives)
    return Math.max(0, 100 - reviewerErrors.length * 20)
  }

  // Count matches
  let matches = 0
  for (const expertError of expertErrors) {
    if (
      reviewerErrors.some(
        re =>
          re.toLowerCase().includes(expertError.toLowerCase()) ||
          expertError.toLowerCase().includes(re.toLowerCase())
      )
    ) {
      matches++
    }
  }

  // Precision and recall
  const recall = expertErrors.length > 0 ? matches / expertErrors.length : 0
  const precision =
    reviewerErrors.length > 0 ? matches / reviewerErrors.length : expertErrors.length === 0 ? 1 : 0

  // F1 score
  if (precision + recall === 0) return 0
  return Math.round((2 * precision * recall) / (precision + recall) * 100)
}

/**
 * Calculate trust score change based on calibration - DETERMINISTIC
 */
export function calculateTrustScoreChange(deviationScore: number): number {
  if (deviationScore <= TRUST_POLICY.PERFECT_DEVIATION_MAX) {
    return TRUST_POLICY.PERFECT_CALIBRATION_BONUS
  }

  if (deviationScore <= TRUST_POLICY.CLOSE_DEVIATION_MAX) {
    return TRUST_POLICY.CLOSE_CALIBRATION_BONUS
  }

  if (deviationScore <= TRUST_POLICY.ACCEPTABLE_DEVIATION_MAX) {
    return TRUST_POLICY.ACCEPTABLE_DEVIATION_PENALTY
  }

  return TRUST_POLICY.LARGE_DEVIATION_PENALTY
}

/**
 * Determine trust level from score - DETERMINISTIC
 */
export function getTrustLevel(score: number): TrustLevel {
  if (score <= TRUST_POLICY.NOVICE_MAX) {
    return 'novice'
  }
  if (score <= TRUST_POLICY.APPRENTICE_MAX) {
    return 'apprentice'
  }
  if (score <= TRUST_POLICY.TRUSTED_MAX) {
    return 'trusted'
  }
  return 'expert'
}

/**
 * Update trust score after calibration - DETERMINISTIC
 */
export function updateTrustScore(
  currentProfile: ReviewerTrustProfile,
  deviationScore: number
): TrustScoreUpdate {
  const previousScore = currentProfile.trustScore
  const scoreChange = calculateTrustScoreChange(deviationScore)

  // Apply change with bounds
  let newScore = previousScore + scoreChange
  newScore = Math.max(0, Math.min(100, newScore))

  const previousLevel = currentProfile.trustLevel
  const newLevel = getTrustLevel(newScore)

  return {
    previousScore,
    newScore,
    change: scoreChange,
    reason: getChangeReason(deviationScore, scoreChange),
    newLevel,
    levelChanged: previousLevel !== newLevel,
  }
}

/**
 * Get human-readable reason for score change
 */
function getChangeReason(deviationScore: number, change: number): string {
  if (change > 0) {
    if (deviationScore <= TRUST_POLICY.PERFECT_DEVIATION_MAX) {
      return 'Excellent calibration - nearly matched expert grade!'
    }
    return 'Good calibration - close to expert grade.'
  }

  if (change === 0) {
    return 'Acceptable calibration - room for improvement.'
  }

  if (deviationScore > TRUST_POLICY.ACCEPTABLE_DEVIATION_MAX) {
    return 'Significant deviation from expert grade - review the expert feedback.'
  }

  return 'Slight deviation from expert grade.'
}

/**
 * Calculate queue priority for reviewer - DETERMINISTIC
 */
export function calculateQueuePriority(
  profile: ReviewerTrustProfile
): ReviewQueuePriority {
  const multiplier = getPriorityMultiplier(profile.trustLevel)
  const basePriority = 100

  return {
    reviewerId: profile.reviewerId,
    priority: Math.round(basePriority * multiplier),
    canSelfReview: profile.trustScore >= TRUST_POLICY.SELF_REVIEW_MIN_TRUST,
    maxDailyReviews: getMaxDailyReviews(profile.trustLevel),
    canReviewAdvanced: profile.trustLevel === 'expert' || profile.trustLevel === 'trusted',
  }
}

/**
 * Get priority multiplier for trust level
 */
function getPriorityMultiplier(level: TrustLevel): number {
  switch (level) {
    case 'expert':
      return TRUST_POLICY.EXPERT_PRIORITY_MULTIPLIER
    case 'trusted':
      return TRUST_POLICY.TRUSTED_PRIORITY_MULTIPLIER
    case 'apprentice':
      return TRUST_POLICY.APPRENTICE_PRIORITY_MULTIPLIER
    default:
      return TRUST_POLICY.NOVICE_PRIORITY_MULTIPLIER
  }
}

/**
 * Get max daily reviews for trust level
 */
function getMaxDailyReviews(level: TrustLevel): number {
  switch (level) {
    case 'expert':
      return 20
    case 'trusted':
      return 15
    case 'apprentice':
      return 10
    default:
      return 5
  }
}

/**
 * Check if reviewer can calibrate now
 */
export function canCalibrateNow(
  profile: ReviewerTrustProfile,
  now: Date = new Date()
): { canCalibrate: boolean; reason?: string; cooldownEndsAt?: string } {
  if (!profile.lastCalibrationDate) {
    return { canCalibrate: true }
  }

  const lastCalibration = new Date(profile.lastCalibrationDate)
  const cooldownMs = TRUST_POLICY.CALIBRATION_COOLDOWN_HOURS * 60 * 60 * 1000
  const cooldownEnds = new Date(lastCalibration.getTime() + cooldownMs)

  if (now < cooldownEnds) {
    return {
      canCalibrate: false,
      reason: 'Calibration cooldown in effect',
      cooldownEndsAt: cooldownEnds.toISOString(),
    }
  }

  return { canCalibrate: true }
}

/**
 * Create initial trust profile
 */
export function createInitialTrustProfile(
  reviewerId: string,
  tenantId: string
): ReviewerTrustProfile {
  const now = new Date().toISOString()
  const initialScore = 50 // Start in middle

  return {
    reviewerId,
    tenantId,
    trustScore: initialScore,
    trustLevel: getTrustLevel(initialScore),
    calibrationHistory: [],
    totalReviewsCompleted: 0,
    totalCalibrationsCompleted: 0,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Add calibration attempt to profile
 */
export function addCalibrationAttempt(
  profile: ReviewerTrustProfile,
  attempt: CalibrationAttempt,
  update: TrustScoreUpdate
): ReviewerTrustProfile {
  return {
    ...profile,
    trustScore: update.newScore,
    trustLevel: update.newLevel,
    calibrationHistory: [...profile.calibrationHistory, attempt],
    totalCalibrationsCompleted: profile.totalCalibrationsCompleted + 1,
    lastCalibrationDate: attempt.attemptedAt,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Check if reviewer qualifies for trusted level
 */
export function qualifiesForTrusted(profile: ReviewerTrustProfile): boolean {
  return (
    profile.trustScore > TRUST_POLICY.APPRENTICE_MAX &&
    profile.totalCalibrationsCompleted >= TRUST_POLICY.MIN_CALIBRATIONS_FOR_TRUSTED
  )
}

/**
 * Get calibration feedback
 */
export function getCalibrationFeedback(
  reviewerGrade: ReviewerGrade,
  expertGrade: ExpertGrade,
  deviationScore: number
): {
  summary: string
  improvements: string[]
  strengths: string[]
} {
  const improvements: string[] = []
  const strengths: string[] = []

  // Check overall score
  const overallDiff = Math.abs(reviewerGrade.overallScore - expertGrade.overallScore)
  if (overallDiff <= 5) {
    strengths.push('Excellent overall score accuracy')
  } else if (overallDiff > 15) {
    improvements.push('Work on overall score calibration')
  }

  // Check dimensions
  for (const expertDim of expertGrade.dimensions) {
    const reviewerDim = reviewerGrade.dimensions.find(
      d => d.dimension === expertDim.dimension
    )
    if (reviewerDim) {
      const dimDiff = Math.abs(reviewerDim.score - expertDim.score)
      if (dimDiff <= 5) {
        strengths.push(`Good ${expertDim.dimension} assessment`)
      } else if (dimDiff > 15) {
        improvements.push(`Review ${expertDim.dimension} scoring criteria`)
      }
    }
  }

  // Check error identification
  const errorMatch = calculateErrorMatchScore(
    reviewerGrade.errorsIdentified,
    expertGrade.errorTypes || []
  )
  if (errorMatch >= 80) {
    strengths.push('Strong error identification')
  } else if (errorMatch < 50) {
    improvements.push('Focus on identifying errors accurately')
  }

  // Summary
  let summary: string
  if (deviationScore <= TRUST_POLICY.PERFECT_DEVIATION_MAX) {
    summary = 'Excellent calibration! Your review closely matched the expert assessment.'
  } else if (deviationScore <= TRUST_POLICY.CLOSE_DEVIATION_MAX) {
    summary = 'Good calibration. Minor differences from expert assessment.'
  } else if (deviationScore <= TRUST_POLICY.ACCEPTABLE_DEVIATION_MAX) {
    summary = 'Acceptable calibration. Review the expert feedback to improve.'
  } else {
    summary = 'Your review differed significantly from the expert. Study the expert feedback carefully.'
  }

  return {
    summary,
    improvements: improvements.slice(0, 3),
    strengths: strengths.slice(0, 3),
  }
}
