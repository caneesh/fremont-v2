/**
 * Reviewer Trust Policy Tests
 *
 * Tests for deterministic trust scoring based on golden sample calibration.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateDeviation,
  calculateTrustScoreChange,
  getTrustLevel,
  updateTrustScore,
  calculateQueuePriority,
  canCalibrateNow,
  createInitialTrustProfile,
  addCalibrationAttempt,
  qualifiesForTrusted,
  getCalibrationFeedback,
  TRUST_POLICY,
} from '../reviewer-trust-policy'
import type {
  ExpertGrade,
  ReviewerGrade,
  ReviewerTrustProfile,
  CalibrationAttempt,
  TrustScoreUpdate,
} from '@/types/reviewerTrust'

// Helper to create expert grade
function createExpertGrade(overrides?: Partial<ExpertGrade>): ExpertGrade {
  return {
    overallScore: 75,
    dimensions: [
      { dimension: 'correctness', score: 80 },
      { dimension: 'clarity', score: 70 },
      { dimension: 'completeness', score: 75 },
    ],
    comments: [],
    correctApproach: true,
    hasErrors: false,
    ...overrides,
  }
}

// Helper to create reviewer grade
function createReviewerGrade(overrides?: Partial<ReviewerGrade>): ReviewerGrade {
  return {
    overallScore: 75,
    dimensions: [
      { dimension: 'correctness', score: 80 },
      { dimension: 'clarity', score: 70 },
      { dimension: 'completeness', score: 75 },
    ],
    comments: [],
    correctApproachMarked: true,
    errorsIdentified: [],
    ...overrides,
  }
}

// Helper to create trust profile
function createTrustProfile(overrides?: Partial<ReviewerTrustProfile>): ReviewerTrustProfile {
  return {
    reviewerId: 'reviewer-1',
    tenantId: 'tenant-1',
    trustScore: 50,
    trustLevel: 'apprentice',
    calibrationHistory: [],
    totalReviewsCompleted: 0,
    totalCalibrationsCompleted: 0,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('calculateDeviation', () => {
  it('should return 0 for identical grades', () => {
    const expertGrade = createExpertGrade()
    const reviewerGrade = createReviewerGrade()

    const deviation = calculateDeviation(reviewerGrade, expertGrade)

    expect(deviation).toBe(0)
  })

  it('should calculate deviation for different overall scores', () => {
    const expertGrade = createExpertGrade({ overallScore: 80 })
    const reviewerGrade = createReviewerGrade({ overallScore: 70 })

    const deviation = calculateDeviation(reviewerGrade, expertGrade)

    // Overall deviation = |70 - 80| = 10, weighted at 0.5 = 5
    // Plus dimension and error match components
    expect(deviation).toBeGreaterThan(0)
    expect(deviation).toBeLessThan(20)
  })

  it('should calculate deviation for different dimension scores', () => {
    const expertGrade = createExpertGrade({
      dimensions: [
        { dimension: 'correctness', score: 90 },
        { dimension: 'clarity', score: 80 },
      ],
    })
    const reviewerGrade = createReviewerGrade({
      dimensions: [
        { dimension: 'correctness', score: 70 },
        { dimension: 'clarity', score: 60 },
      ],
    })

    const deviation = calculateDeviation(reviewerGrade, expertGrade)

    expect(deviation).toBeGreaterThan(5)
  })

  it('should factor in error identification accuracy', () => {
    const expertGrade = createExpertGrade({
      hasErrors: true,
      errorTypes: ['sign_error', 'unit_error'],
    })
    const reviewerGrade = createReviewerGrade({
      errorsIdentified: ['sign_error'], // Only caught one
    })

    const deviation = calculateDeviation(reviewerGrade, expertGrade)

    // Should have some deviation due to missed error
    expect(deviation).toBeGreaterThan(0)
  })

  it('should give full score when both agree no errors', () => {
    const expertGrade = createExpertGrade({
      hasErrors: false,
      errorTypes: [],
    })
    const reviewerGrade = createReviewerGrade({
      errorsIdentified: [],
    })

    const deviation = calculateDeviation(reviewerGrade, expertGrade)

    // Only overall and dimension deviations matter
    expect(deviation).toBe(0)
  })

  it('should penalize false positives (finding errors when none exist)', () => {
    const expertGrade = createExpertGrade({
      hasErrors: false,
      errorTypes: [],
    })
    const reviewerGrade = createReviewerGrade({
      errorsIdentified: ['fake_error_1', 'fake_error_2'],
    })

    const deviationWithFP = calculateDeviation(reviewerGrade, expertGrade)
    const deviationWithoutFP = calculateDeviation(
      createReviewerGrade({ errorsIdentified: [] }),
      expertGrade
    )

    expect(deviationWithFP).toBeGreaterThan(deviationWithoutFP)
  })

  it('should be deterministic (same inputs = same outputs)', () => {
    const expertGrade = createExpertGrade({ overallScore: 85 })
    const reviewerGrade = createReviewerGrade({ overallScore: 78 })

    const deviation1 = calculateDeviation(reviewerGrade, expertGrade)
    const deviation2 = calculateDeviation(reviewerGrade, expertGrade)

    expect(deviation1).toBe(deviation2)
  })
})

describe('calculateTrustScoreChange', () => {
  it('should return bonus for perfect deviation', () => {
    const change = calculateTrustScoreChange(3) // Within PERFECT_DEVIATION_MAX (5)

    expect(change).toBe(TRUST_POLICY.PERFECT_CALIBRATION_BONUS)
  })

  it('should return smaller bonus for close deviation', () => {
    const change = calculateTrustScoreChange(8) // Within CLOSE_DEVIATION_MAX (10)

    expect(change).toBe(TRUST_POLICY.CLOSE_CALIBRATION_BONUS)
  })

  it('should return small penalty for acceptable deviation', () => {
    const change = calculateTrustScoreChange(15) // Within ACCEPTABLE_DEVIATION_MAX (20)

    expect(change).toBe(TRUST_POLICY.ACCEPTABLE_DEVIATION_PENALTY)
  })

  it('should return larger penalty for large deviation', () => {
    const change = calculateTrustScoreChange(30) // Beyond ACCEPTABLE_DEVIATION_MAX

    expect(change).toBe(TRUST_POLICY.LARGE_DEVIATION_PENALTY)
  })

  it('should return bonus at exact threshold', () => {
    const change = calculateTrustScoreChange(TRUST_POLICY.PERFECT_DEVIATION_MAX)

    expect(change).toBe(TRUST_POLICY.PERFECT_CALIBRATION_BONUS)
  })
})

describe('getTrustLevel', () => {
  it('should return novice for low scores', () => {
    expect(getTrustLevel(0)).toBe('novice')
    expect(getTrustLevel(20)).toBe('novice')
    expect(getTrustLevel(40)).toBe('novice')
  })

  it('should return apprentice for mid-low scores', () => {
    expect(getTrustLevel(41)).toBe('apprentice')
    expect(getTrustLevel(50)).toBe('apprentice')
    expect(getTrustLevel(65)).toBe('apprentice')
  })

  it('should return trusted for mid-high scores', () => {
    expect(getTrustLevel(66)).toBe('trusted')
    expect(getTrustLevel(75)).toBe('trusted')
    expect(getTrustLevel(85)).toBe('trusted')
  })

  it('should return expert for high scores', () => {
    expect(getTrustLevel(86)).toBe('expert')
    expect(getTrustLevel(95)).toBe('expert')
    expect(getTrustLevel(100)).toBe('expert')
  })
})

describe('updateTrustScore', () => {
  it('should increase score for good calibration', () => {
    const profile = createTrustProfile({ trustScore: 50 })

    const update = updateTrustScore(profile, 3) // Perfect calibration

    expect(update.newScore).toBeGreaterThan(update.previousScore)
    expect(update.change).toBe(TRUST_POLICY.PERFECT_CALIBRATION_BONUS)
  })

  it('should decrease score for poor calibration', () => {
    const profile = createTrustProfile({ trustScore: 50 })

    const update = updateTrustScore(profile, 25) // Large deviation

    expect(update.newScore).toBeLessThan(update.previousScore)
    expect(update.change).toBe(TRUST_POLICY.LARGE_DEVIATION_PENALTY)
  })

  it('should not exceed 100', () => {
    const profile = createTrustProfile({ trustScore: 98 })

    const update = updateTrustScore(profile, 2) // Perfect calibration, +5

    expect(update.newScore).toBe(100)
  })

  it('should not go below 0', () => {
    const profile = createTrustProfile({ trustScore: 2 })

    const update = updateTrustScore(profile, 30) // Large deviation, -3

    expect(update.newScore).toBe(0)
  })

  it('should detect level changes', () => {
    const profile = createTrustProfile({
      trustScore: 64,
      trustLevel: 'apprentice',
    })

    const update = updateTrustScore(profile, 3) // +5 = 69, still apprentice
    expect(update.levelChanged).toBe(true) // 69 > 65 = trusted
    expect(update.newLevel).toBe('trusted')
  })

  it('should provide reason for change', () => {
    const profile = createTrustProfile({ trustScore: 50 })

    const perfectUpdate = updateTrustScore(profile, 3)
    expect(perfectUpdate.reason).toContain('Excellent')

    const poorUpdate = updateTrustScore(profile, 25)
    expect(poorUpdate.reason).toContain('Significant deviation')
  })
})

describe('calculateQueuePriority', () => {
  it('should give highest priority to experts', () => {
    const expertProfile = createTrustProfile({
      trustScore: 90,
      trustLevel: 'expert',
    })

    const priority = calculateQueuePriority(expertProfile)

    expect(priority.priority).toBe(200) // 100 * 2.0
    expect(priority.canSelfReview).toBe(true)
    expect(priority.canReviewAdvanced).toBe(true)
    expect(priority.maxDailyReviews).toBe(20)
  })

  it('should give moderate priority to trusted reviewers', () => {
    const trustedProfile = createTrustProfile({
      trustScore: 75,
      trustLevel: 'trusted',
    })

    const priority = calculateQueuePriority(trustedProfile)

    expect(priority.priority).toBe(150) // 100 * 1.5
    expect(priority.canSelfReview).toBe(true)
    expect(priority.canReviewAdvanced).toBe(true)
    expect(priority.maxDailyReviews).toBe(15)
  })

  it('should give lower priority to apprentices', () => {
    const apprenticeProfile = createTrustProfile({
      trustScore: 55,
      trustLevel: 'apprentice',
    })

    const priority = calculateQueuePriority(apprenticeProfile)

    expect(priority.priority).toBe(120) // 100 * 1.2
    expect(priority.canSelfReview).toBe(false) // Below 70
    expect(priority.canReviewAdvanced).toBe(false)
    expect(priority.maxDailyReviews).toBe(10)
  })

  it('should give base priority to novices', () => {
    const noviceProfile = createTrustProfile({
      trustScore: 30,
      trustLevel: 'novice',
    })

    const priority = calculateQueuePriority(noviceProfile)

    expect(priority.priority).toBe(100) // 100 * 1.0
    expect(priority.canSelfReview).toBe(false)
    expect(priority.canReviewAdvanced).toBe(false)
    expect(priority.maxDailyReviews).toBe(5)
  })

  it('should allow self-review at threshold', () => {
    const atThreshold = createTrustProfile({
      trustScore: TRUST_POLICY.SELF_REVIEW_MIN_TRUST,
      trustLevel: 'trusted',
    })

    const priority = calculateQueuePriority(atThreshold)

    expect(priority.canSelfReview).toBe(true)
  })
})

describe('canCalibrateNow', () => {
  it('should allow calibration if never calibrated', () => {
    const profile = createTrustProfile({
      lastCalibrationDate: undefined,
    })

    const result = canCalibrateNow(profile)

    expect(result.canCalibrate).toBe(true)
  })

  it('should deny calibration during cooldown', () => {
    const now = new Date()
    const recentCalibration = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago

    const profile = createTrustProfile({
      lastCalibrationDate: recentCalibration.toISOString(),
    })

    const result = canCalibrateNow(profile, now)

    expect(result.canCalibrate).toBe(false)
    expect(result.reason).toContain('cooldown')
    expect(result.cooldownEndsAt).toBeDefined()
  })

  it('should allow calibration after cooldown', () => {
    const now = new Date()
    const oldCalibration = new Date(
      now.getTime() - (TRUST_POLICY.CALIBRATION_COOLDOWN_HOURS + 1) * 60 * 60 * 1000
    )

    const profile = createTrustProfile({
      lastCalibrationDate: oldCalibration.toISOString(),
    })

    const result = canCalibrateNow(profile, now)

    expect(result.canCalibrate).toBe(true)
  })

  it('should allow calibration at exact cooldown end', () => {
    const now = new Date()
    const exactCooldown = new Date(
      now.getTime() - TRUST_POLICY.CALIBRATION_COOLDOWN_HOURS * 60 * 60 * 1000
    )

    const profile = createTrustProfile({
      lastCalibrationDate: exactCooldown.toISOString(),
    })

    const result = canCalibrateNow(profile, now)

    expect(result.canCalibrate).toBe(true)
  })
})

describe('createInitialTrustProfile', () => {
  it('should create profile with default values', () => {
    const profile = createInitialTrustProfile('reviewer-123', 'tenant-456')

    expect(profile.reviewerId).toBe('reviewer-123')
    expect(profile.tenantId).toBe('tenant-456')
    expect(profile.trustScore).toBe(50)
    expect(profile.trustLevel).toBe('apprentice')
    expect(profile.calibrationHistory).toEqual([])
    expect(profile.totalReviewsCompleted).toBe(0)
    expect(profile.totalCalibrationsCompleted).toBe(0)
    expect(profile.createdAt).toBeDefined()
    expect(profile.updatedAt).toBeDefined()
  })

  it('should set correct trust level for initial score', () => {
    const profile = createInitialTrustProfile('r1', 't1')

    expect(getTrustLevel(profile.trustScore)).toBe(profile.trustLevel)
  })
})

describe('addCalibrationAttempt', () => {
  it('should add attempt to history', () => {
    const profile = createTrustProfile({
      calibrationHistory: [],
      totalCalibrationsCompleted: 0,
    })

    const attempt: CalibrationAttempt = {
      id: 'attempt-1',
      goldenSampleId: 'sample-1',
      reviewerGrade: createReviewerGrade(),
      expertGrade: createExpertGrade(),
      deviationScore: 5,
      scoreChange: 5,
      attemptedAt: '2025-01-15T12:00:00Z',
    }

    const update: TrustScoreUpdate = {
      previousScore: 50,
      newScore: 55,
      change: 5,
      reason: 'Good',
      newLevel: 'apprentice',
      levelChanged: false,
    }

    const updatedProfile = addCalibrationAttempt(profile, attempt, update)

    expect(updatedProfile.calibrationHistory.length).toBe(1)
    expect(updatedProfile.calibrationHistory[0].id).toBe('attempt-1')
    expect(updatedProfile.totalCalibrationsCompleted).toBe(1)
    expect(updatedProfile.trustScore).toBe(55)
    expect(updatedProfile.lastCalibrationDate).toBe('2025-01-15T12:00:00Z')
  })

  it('should preserve existing history', () => {
    const existingAttempt: CalibrationAttempt = {
      id: 'attempt-0',
      goldenSampleId: 'sample-0',
      reviewerGrade: createReviewerGrade(),
      expertGrade: createExpertGrade(),
      deviationScore: 10,
      scoreChange: 3,
      attemptedAt: '2025-01-01T12:00:00Z',
    }

    const profile = createTrustProfile({
      calibrationHistory: [existingAttempt],
      totalCalibrationsCompleted: 1,
    })

    const newAttempt: CalibrationAttempt = {
      id: 'attempt-1',
      goldenSampleId: 'sample-1',
      reviewerGrade: createReviewerGrade(),
      expertGrade: createExpertGrade(),
      deviationScore: 5,
      scoreChange: 5,
      attemptedAt: '2025-01-15T12:00:00Z',
    }

    const update: TrustScoreUpdate = {
      previousScore: 53,
      newScore: 58,
      change: 5,
      reason: 'Good',
      newLevel: 'apprentice',
      levelChanged: false,
    }

    const updatedProfile = addCalibrationAttempt(profile, newAttempt, update)

    expect(updatedProfile.calibrationHistory.length).toBe(2)
    expect(updatedProfile.totalCalibrationsCompleted).toBe(2)
  })
})

describe('qualifiesForTrusted', () => {
  it('should return true when score and calibrations meet requirements', () => {
    const profile = createTrustProfile({
      trustScore: 70, // Above APPRENTICE_MAX (65)
      totalCalibrationsCompleted: 5, // Meets MIN_CALIBRATIONS_FOR_TRUSTED
    })

    expect(qualifiesForTrusted(profile)).toBe(true)
  })

  it('should return false when score is too low', () => {
    const profile = createTrustProfile({
      trustScore: 60, // Below threshold
      totalCalibrationsCompleted: 10,
    })

    expect(qualifiesForTrusted(profile)).toBe(false)
  })

  it('should return false when not enough calibrations', () => {
    const profile = createTrustProfile({
      trustScore: 80,
      totalCalibrationsCompleted: 3, // Below MIN_CALIBRATIONS_FOR_TRUSTED
    })

    expect(qualifiesForTrusted(profile)).toBe(false)
  })

  it('should return false when both requirements unmet', () => {
    const profile = createTrustProfile({
      trustScore: 50,
      totalCalibrationsCompleted: 2,
    })

    expect(qualifiesForTrusted(profile)).toBe(false)
  })
})

describe('getCalibrationFeedback', () => {
  it('should provide excellent feedback for perfect calibration', () => {
    const reviewerGrade = createReviewerGrade({ overallScore: 80 })
    const expertGrade = createExpertGrade({ overallScore: 80 })

    const feedback = getCalibrationFeedback(reviewerGrade, expertGrade, 2)

    expect(feedback.summary).toContain('Excellent')
    expect(feedback.strengths.length).toBeGreaterThan(0)
  })

  it('should provide good feedback for close calibration', () => {
    const reviewerGrade = createReviewerGrade({ overallScore: 75 })
    const expertGrade = createExpertGrade({ overallScore: 80 })

    const feedback = getCalibrationFeedback(reviewerGrade, expertGrade, 8)

    expect(feedback.summary).toContain('Good')
  })

  it('should provide acceptable feedback for moderate deviation', () => {
    // Use diff > 15 to trigger improvements (60 vs 80 = 20)
    const reviewerGrade = createReviewerGrade({ overallScore: 60 })
    const expertGrade = createExpertGrade({ overallScore: 80 })

    const feedback = getCalibrationFeedback(reviewerGrade, expertGrade, 15)

    expect(feedback.summary).toContain('Acceptable')
    expect(feedback.improvements.length).toBeGreaterThan(0)
  })

  it('should provide critical feedback for large deviation', () => {
    const reviewerGrade = createReviewerGrade({ overallScore: 50 })
    const expertGrade = createExpertGrade({ overallScore: 80 })

    const feedback = getCalibrationFeedback(reviewerGrade, expertGrade, 25)

    expect(feedback.summary).toContain('differed significantly')
  })

  it('should identify strengths in dimension scoring', () => {
    const reviewerGrade = createReviewerGrade({
      dimensions: [
        { dimension: 'correctness', score: 82 }, // Close to expert
        { dimension: 'clarity', score: 50 }, // Far from expert
      ],
    })
    const expertGrade = createExpertGrade({
      dimensions: [
        { dimension: 'correctness', score: 80 },
        { dimension: 'clarity', score: 80 },
      ],
    })

    const feedback = getCalibrationFeedback(reviewerGrade, expertGrade, 10)

    expect(feedback.strengths.some(s => s.includes('correctness'))).toBe(true)
    expect(feedback.improvements.some(i => i.includes('clarity'))).toBe(true)
  })

  it('should recognize strong error identification', () => {
    // Use different overall/dimension scores so they don't fill strengths before error check
    // (strengths limited to 3, error check comes after overall and dimensions)
    const reviewerGrade = createReviewerGrade({
      overallScore: 65, // diff = 10, not in <=5 for "Excellent"
      dimensions: [
        { dimension: 'correctness', score: 70 }, // diff = 10, not in <=5
        { dimension: 'clarity', score: 60 }, // diff = 10, not in <=5
      ],
      errorsIdentified: ['sign_error', 'unit_error'],
    })
    const expertGrade = createExpertGrade({
      overallScore: 75,
      dimensions: [
        { dimension: 'correctness', score: 80 },
        { dimension: 'clarity', score: 70 },
      ],
      hasErrors: true,
      errorTypes: ['sign_error', 'unit_error'],
    })

    const feedback = getCalibrationFeedback(reviewerGrade, expertGrade, 5)

    expect(feedback.strengths.some(s => s.includes('error'))).toBe(true)
  })

  it('should suggest improvement for poor error identification', () => {
    const reviewerGrade = createReviewerGrade({
      errorsIdentified: [],
    })
    const expertGrade = createExpertGrade({
      hasErrors: true,
      errorTypes: ['sign_error', 'unit_error', 'calculation_error'],
    })

    const feedback = getCalibrationFeedback(reviewerGrade, expertGrade, 15)

    expect(feedback.improvements.some(i => i.includes('error'))).toBe(true)
  })

  it('should limit improvements and strengths to 3 each', () => {
    const reviewerGrade = createReviewerGrade({
      dimensions: [
        { dimension: 'correctness', score: 80 },
        { dimension: 'clarity', score: 80 },
        { dimension: 'completeness', score: 80 },
        { dimension: 'efficiency', score: 80 },
        { dimension: 'style', score: 80 },
      ],
    })
    const expertGrade = createExpertGrade({
      dimensions: [
        { dimension: 'correctness', score: 80 },
        { dimension: 'clarity', score: 80 },
        { dimension: 'completeness', score: 80 },
        { dimension: 'efficiency', score: 80 },
        { dimension: 'style', score: 80 },
      ],
    })

    const feedback = getCalibrationFeedback(reviewerGrade, expertGrade, 0)

    expect(feedback.strengths.length).toBeLessThanOrEqual(3)
    expect(feedback.improvements.length).toBeLessThanOrEqual(3)
  })
})

describe('TRUST_POLICY constants', () => {
  it('should have valid level thresholds in ascending order', () => {
    expect(TRUST_POLICY.NOVICE_MAX).toBeLessThan(TRUST_POLICY.APPRENTICE_MAX)
    expect(TRUST_POLICY.APPRENTICE_MAX).toBeLessThan(TRUST_POLICY.TRUSTED_MAX)
    expect(TRUST_POLICY.TRUSTED_MAX).toBeLessThan(100)
  })

  it('should have valid deviation thresholds in ascending order', () => {
    expect(TRUST_POLICY.PERFECT_DEVIATION_MAX).toBeLessThan(TRUST_POLICY.CLOSE_DEVIATION_MAX)
    expect(TRUST_POLICY.CLOSE_DEVIATION_MAX).toBeLessThan(TRUST_POLICY.ACCEPTABLE_DEVIATION_MAX)
  })

  it('should have positive bonuses and negative penalties', () => {
    expect(TRUST_POLICY.PERFECT_CALIBRATION_BONUS).toBeGreaterThan(0)
    expect(TRUST_POLICY.CLOSE_CALIBRATION_BONUS).toBeGreaterThan(0)
    expect(TRUST_POLICY.ACCEPTABLE_DEVIATION_PENALTY).toBeLessThan(0)
    expect(TRUST_POLICY.LARGE_DEVIATION_PENALTY).toBeLessThan(0)
  })

  it('should have valid priority multipliers', () => {
    expect(TRUST_POLICY.EXPERT_PRIORITY_MULTIPLIER).toBeGreaterThan(
      TRUST_POLICY.TRUSTED_PRIORITY_MULTIPLIER
    )
    expect(TRUST_POLICY.TRUSTED_PRIORITY_MULTIPLIER).toBeGreaterThan(
      TRUST_POLICY.APPRENTICE_PRIORITY_MULTIPLIER
    )
    expect(TRUST_POLICY.APPRENTICE_PRIORITY_MULTIPLIER).toBeGreaterThan(
      TRUST_POLICY.NOVICE_PRIORITY_MULTIPLIER
    )
  })
})
