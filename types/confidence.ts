/**
 * Confidence-Weighted SRS Types
 *
 * Types for the self-scored confidence system that weights
 * SRS scheduling based on student confidence levels.
 */

// ============================================
// Confidence Levels
// ============================================

/**
 * Student's self-reported confidence level
 */
export type Confidence = 'low' | 'medium' | 'high'

/**
 * Numeric score for confidence (for calculations)
 */
export type ConfidenceScore = 1 | 2 | 3

/**
 * Map confidence to numeric score
 */
export const CONFIDENCE_SCORES: Record<Confidence, ConfidenceScore> = {
  low: 1,
  medium: 2,
  high: 3
}

// ============================================
// Decision Matrix
// ============================================

/**
 * Outcome categories from the correctness × confidence matrix
 */
export type ConfidenceOutcome =
  | 'mastery'                 // Correct + High: solid understanding
  | 'progressing'             // Correct + Medium: normal progression
  | 'lucky_guess'             // Correct + Low: got it but uncertain
  | 'learning'                // Wrong + Low: expected struggle
  | 'confusion'               // Wrong + Medium: gap in understanding
  | 'dangerous_misconception' // Wrong + High: false confidence (most critical!)

/**
 * Full result of the confidence × correctness matrix
 */
export interface ConfidenceMatrixResult {
  outcome: ConfidenceOutcome
  intervalMultiplier: number
  easeAdjustment: number
  shouldResetToLearning: boolean
  uiMessage: string
  uiColor: 'green' | 'blue' | 'amber' | 'orange' | 'red'
}

// ============================================
// Multiplier Constants
// ============================================

/**
 * Interval multipliers based on correctness and confidence
 * Applied AFTER the base SM-2 calculation
 */
export const CONFIDENCE_INTERVAL_MULTIPLIERS = {
  correct: {
    high: 1.5,    // Accelerate mastery
    medium: 1.0,  // Standard progression
    low: 0.6      // Review sooner (lucky guess)
  },
  wrong: {
    high: 0,      // Reset completely
    medium: 0,    // Reset to learning
    low: 0        // Reset to learning
  }
} as const

/**
 * Ease factor adjustments based on correctness and confidence
 * These modify the ease factor which affects all future intervals
 */
export const CONFIDENCE_EASE_ADJUSTMENTS = {
  correct: {
    high: +0.15,   // Boost for confident correct
    medium: 0,     // No change
    low: -0.10     // Slight penalty for uncertain correct
  },
  wrong: {
    high: -0.30,   // Severe penalty for misconception
    medium: -0.20, // Moderate penalty
    low: -0.10     // Mild penalty (expected struggle)
  }
} as const

// ============================================
// Review Input/Output Types
// ============================================

/**
 * Input for confidence-weighted review calculation
 */
export interface ConfidenceReviewInput {
  isCorrect: boolean
  confidence: Confidence
}

/**
 * Extended review result with confidence data
 */
export interface ConfidenceReviewResult {
  cardId: string
  isCorrect: boolean
  confidence: Confidence
  outcome: ConfidenceOutcome
  responseTimeMs: number
  reviewedAt: string
}

// ============================================
// UI Display Helpers
// ============================================

/**
 * Display configuration for confidence options
 */
export interface ConfidenceOption {
  value: Confidence
  label: string
  emoji: string
  shortLabel: string
  description: string
  keyboardShortcut: string
}

/**
 * Predefined confidence options for UI
 */
export const CONFIDENCE_OPTIONS: ConfidenceOption[] = [
  {
    value: 'low',
    label: 'Just guessing',
    emoji: '🎲',
    shortLabel: 'Guess',
    description: "I'm not sure about this",
    keyboardShortcut: '1'
  },
  {
    value: 'medium',
    label: 'Somewhat confident',
    emoji: '🤔',
    shortLabel: 'Okay',
    description: 'I think I know this',
    keyboardShortcut: '2'
  },
  {
    value: 'high',
    label: 'Very confident',
    emoji: '💪',
    shortLabel: 'Sure',
    description: "I'm certain about this",
    keyboardShortcut: '3'
  }
]

/**
 * Get display info for an outcome
 */
export function getOutcomeDisplay(outcome: ConfidenceOutcome): {
  label: string
  description: string
  color: string
  bgClass: string
  icon: string
} {
  switch (outcome) {
    case 'mastery':
      return {
        label: 'Mastery',
        description: 'Solid understanding - accelerating review schedule',
        color: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-900/30',
        icon: '🎯'
      }
    case 'progressing':
      return {
        label: 'Progressing',
        description: 'Good progress - normal review schedule',
        color: 'text-blue-600 dark:text-blue-400',
        bgClass: 'bg-blue-100 dark:bg-blue-900/30',
        icon: '📈'
      }
    case 'lucky_guess':
      return {
        label: 'Lucky Guess',
        description: "Got it right but uncertain - we'll review this sooner",
        color: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-100 dark:bg-amber-900/30',
        icon: '🍀'
      }
    case 'learning':
      return {
        label: 'Learning',
        description: "That's okay - you're still learning this concept",
        color: 'text-blue-600 dark:text-blue-400',
        bgClass: 'bg-blue-100 dark:bg-blue-900/30',
        icon: '📚'
      }
    case 'confusion':
      return {
        label: 'Needs Review',
        description: "There's a gap here - let's work on this more",
        color: 'text-orange-600 dark:text-orange-400',
        bgClass: 'bg-orange-100 dark:bg-orange-900/30',
        icon: '🔄'
      }
    case 'dangerous_misconception':
      return {
        label: 'Important to Fix',
        description: 'You were confident but incorrect - this needs attention',
        color: 'text-red-600 dark:text-red-400',
        bgClass: 'bg-red-100 dark:bg-red-900/30',
        icon: '⚠️'
      }
  }
}
