/**
 * Confidence-Weighted SRS Scheduler
 *
 * Extends the base SM-2 algorithm with a correctness × confidence matrix.
 * The key insight: Wrong + High Confidence is the most dangerous state
 * (indicates a misconception) and requires aggressive rescheduling.
 *
 * Decision Matrix:
 * ┌───────────┬───────────┬────────────┬───────────────────────────┐
 * │ Correct   │ Confidence│ Outcome    │ Action                    │
 * ├───────────┼───────────┼────────────┼───────────────────────────┤
 * │ ✓ Yes     │ High      │ Mastery    │ 1.5× interval boost       │
 * │ ✓ Yes     │ Medium    │ Progressing│ Normal SM-2               │
 * │ ✓ Yes     │ Low       │ Lucky Guess│ 0.6× interval (sooner)    │
 * │ ✗ No      │ Low       │ Learning   │ Reset to learning         │
 * │ ✗ No      │ Medium    │ Confusion  │ Reset + ease penalty      │
 * │ ✗ No      │ High      │ Misconception│ Reset + MAJOR ease penalty│
 * └───────────┴───────────┴────────────┴───────────────────────────┘
 */

import type { SRSData, ReviewQuality } from '@/types/mistakeNotebook'
import type {
  Confidence,
  ConfidenceReviewInput,
  ConfidenceOutcome,
  ConfidenceMatrixResult
} from '@/types/confidence'
import {
  CONFIDENCE_INTERVAL_MULTIPLIERS,
  CONFIDENCE_EASE_ADJUSTMENTS
} from '@/types/confidence'
import { calculateNextReview } from './srsScheduler'

// ============================================
// Constants
// ============================================

const MIN_EASE_FACTOR = 1.3
const MAX_INTERVAL = 180 // days

// ============================================
// Core Algorithm
// ============================================

/**
 * Determine the outcome category from correctness and confidence
 */
export function getConfidenceOutcome(
  isCorrect: boolean,
  confidence: Confidence
): ConfidenceOutcome {
  if (isCorrect) {
    switch (confidence) {
      case 'high': return 'mastery'
      case 'medium': return 'progressing'
      case 'low': return 'lucky_guess'
    }
  } else {
    switch (confidence) {
      case 'high': return 'dangerous_misconception'
      case 'medium': return 'confusion'
      case 'low': return 'learning'
    }
  }
}

/**
 * Get the full matrix result for a correctness × confidence combination
 */
export function getMatrixResult(
  isCorrect: boolean,
  confidence: Confidence
): ConfidenceMatrixResult {
  const outcome = getConfidenceOutcome(isCorrect, confidence)
  const correctnessKey = isCorrect ? 'correct' : 'wrong'

  const intervalMultiplier = CONFIDENCE_INTERVAL_MULTIPLIERS[correctnessKey][confidence]
  const easeAdjustment = CONFIDENCE_EASE_ADJUSTMENTS[correctnessKey][confidence]

  // Determine if we should reset to learning phase
  const shouldResetToLearning = !isCorrect

  // UI messaging
  const uiConfig = getUIConfig(outcome)

  return {
    outcome,
    intervalMultiplier,
    easeAdjustment,
    shouldResetToLearning,
    uiMessage: uiConfig.message,
    uiColor: uiConfig.color
  }
}

/**
 * Get UI configuration for an outcome
 */
function getUIConfig(outcome: ConfidenceOutcome): {
  message: string
  color: 'green' | 'blue' | 'amber' | 'orange' | 'red'
} {
  switch (outcome) {
    case 'mastery':
      return {
        message: 'Excellent! Solid understanding.',
        color: 'green'
      }
    case 'progressing':
      return {
        message: 'Good progress!',
        color: 'blue'
      }
    case 'lucky_guess':
      return {
        message: "Correct! But let's reinforce this soon.",
        color: 'amber'
      }
    case 'learning':
      return {
        message: "That's okay - you're learning!",
        color: 'blue'
      }
    case 'confusion':
      return {
        message: "Let's review this concept more.",
        color: 'orange'
      }
    case 'dangerous_misconception':
      return {
        message: 'Important: This needs attention.',
        color: 'red'
      }
  }
}

/**
 * Convert correctness and confidence to a ReviewQuality score
 * This maps the 2D matrix to the SM-2 0-5 quality scale
 */
export function toReviewQuality(
  isCorrect: boolean,
  confidence: Confidence
): ReviewQuality {
  if (isCorrect) {
    // Correct answers map to quality 3-5
    switch (confidence) {
      case 'low': return 3    // Correct with difficulty
      case 'medium': return 4 // Correct after hesitation
      case 'high': return 5   // Perfect response
    }
  } else {
    // Wrong answers map to quality 0-2
    switch (confidence) {
      case 'high': return 0   // Complete blackout (misconception)
      case 'medium': return 1 // Incorrect but remembered with hint
      case 'low': return 2    // Incorrect but easy to recall
    }
  }
}

/**
 * Calculate next review with confidence weighting
 *
 * This is the main entry point for the confidence-weighted algorithm.
 * It wraps the base SM-2 algorithm and applies confidence-based modifiers.
 */
export function calculateConfidenceWeightedReview(
  currentSRS: SRSData,
  input: ConfidenceReviewInput
): SRSData {
  const { isCorrect, confidence } = input

  // Step 1: Map to base quality and get SM-2 result
  const baseQuality = toReviewQuality(isCorrect, confidence)
  let newSRS = calculateNextReview(currentSRS, baseQuality)

  // Step 2: Get matrix result for additional modifiers
  const matrixResult = getMatrixResult(isCorrect, confidence)

  // Step 3: Apply confidence-specific modifiers
  if (isCorrect) {
    // Apply interval multiplier for correct answers
    if (matrixResult.intervalMultiplier !== 1.0 && newSRS.interval > 0) {
      newSRS = {
        ...newSRS,
        interval: Math.min(
          MAX_INTERVAL,
          Math.max(1, Math.round(newSRS.interval * matrixResult.intervalMultiplier))
        ),
        dueDate: addDays(new Date(), newSRS.interval).toISOString().split('T')[0]
      }
    }

    // Apply ease adjustment
    if (matrixResult.easeAdjustment !== 0) {
      newSRS = {
        ...newSRS,
        easeFactor: Math.max(
          MIN_EASE_FACTOR,
          newSRS.easeFactor + matrixResult.easeAdjustment
        )
      }
    }
  } else {
    // Wrong answer handling is mostly done by base SM-2
    // Apply additional ease penalty for dangerous misconception
    if (matrixResult.outcome === 'dangerous_misconception') {
      newSRS = {
        ...newSRS,
        easeFactor: Math.max(
          MIN_EASE_FACTOR,
          newSRS.easeFactor + matrixResult.easeAdjustment
        )
      }
    }
  }

  return newSRS
}

// ============================================
// Utility Functions
// ============================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

// ============================================
// Analytics Helpers
// ============================================

/**
 * Calculate the distribution of outcomes over a set of reviews
 */
export function calculateOutcomeDistribution(
  reviews: Array<{ isCorrect: boolean; confidence: Confidence }>
): Record<ConfidenceOutcome, number> {
  const distribution: Record<ConfidenceOutcome, number> = {
    mastery: 0,
    progressing: 0,
    lucky_guess: 0,
    learning: 0,
    confusion: 0,
    dangerous_misconception: 0
  }

  for (const review of reviews) {
    const outcome = getConfidenceOutcome(review.isCorrect, review.confidence)
    distribution[outcome]++
  }

  return distribution
}

/**
 * Calculate calibration score - how well confidence matches performance
 * Returns a score from 0 (poor calibration) to 1 (perfect calibration)
 *
 * Well-calibrated students:
 * - Are correct when they say "high confidence"
 * - Are uncertain when they don't know
 */
export function calculateCalibrationScore(
  reviews: Array<{ isCorrect: boolean; confidence: Confidence }>
): number {
  if (reviews.length === 0) return 0

  let calibratedCount = 0

  for (const review of reviews) {
    const { isCorrect, confidence } = review

    // Well-calibrated scenarios:
    // 1. High confidence + Correct = calibrated
    // 2. Low confidence + Wrong = calibrated
    // 3. Medium confidence = always partially calibrated (0.5)
    if (confidence === 'high' && isCorrect) {
      calibratedCount += 1
    } else if (confidence === 'low' && !isCorrect) {
      calibratedCount += 1
    } else if (confidence === 'medium') {
      calibratedCount += 0.5
    }
    // High confidence + Wrong or Low confidence + Correct = not calibrated (0)
  }

  return calibratedCount / reviews.length
}

/**
 * Identify misconception patterns
 * Returns cards where student was confidently wrong multiple times
 */
export function identifyMisconceptions(
  reviews: Array<{
    cardId: string
    isCorrect: boolean
    confidence: Confidence
  }>
): string[] {
  const misconceptionCards = new Map<string, number>()

  for (const review of reviews) {
    if (!review.isCorrect && review.confidence === 'high') {
      const count = misconceptionCards.get(review.cardId) || 0
      misconceptionCards.set(review.cardId, count + 1)
    }
  }

  // Return cards with 2+ misconception instances
  return Array.from(misconceptionCards.entries())
    .filter(([, count]) => count >= 2)
    .map(([cardId]) => cardId)
}

/**
 * Get personalized feedback based on confidence patterns
 */
export function getConfidenceFeedback(
  reviews: Array<{ isCorrect: boolean; confidence: Confidence }>
): {
  pattern: 'overconfident' | 'underconfident' | 'well_calibrated' | 'insufficient_data'
  message: string
  recommendation: string
} {
  if (reviews.length < 5) {
    return {
      pattern: 'insufficient_data',
      message: 'Keep practicing to see confidence patterns.',
      recommendation: 'Complete more reviews to get personalized insights.'
    }
  }

  const calibration = calculateCalibrationScore(reviews)
  const distribution = calculateOutcomeDistribution(reviews)

  // Check for overconfidence (high misconception rate)
  const totalWrong = distribution.learning + distribution.confusion + distribution.dangerous_misconception
  const overconfidenceRate = totalWrong > 0
    ? distribution.dangerous_misconception / totalWrong
    : 0

  // Check for underconfidence (high lucky guess rate)
  const totalCorrect = distribution.mastery + distribution.progressing + distribution.lucky_guess
  const underconfidenceRate = totalCorrect > 0
    ? distribution.lucky_guess / totalCorrect
    : 0

  if (overconfidenceRate > 0.3) {
    return {
      pattern: 'overconfident',
      message: "You're sometimes confident about things you haven't fully mastered.",
      recommendation: 'Try to pause and verify your understanding before committing to an answer.'
    }
  }

  if (underconfidenceRate > 0.3) {
    return {
      pattern: 'underconfident',
      message: 'You know more than you think! Trust your knowledge.',
      recommendation: "When you're uncertain, try to articulate why - often you know more than you realize."
    }
  }

  if (calibration > 0.7) {
    return {
      pattern: 'well_calibrated',
      message: 'Great self-awareness! Your confidence matches your knowledge.',
      recommendation: 'Keep up the metacognitive practice.'
    }
  }

  return {
    pattern: 'well_calibrated',
    message: 'Your confidence calibration is developing nicely.',
    recommendation: 'Continue paying attention to how certain you feel before answering.'
  }
}
