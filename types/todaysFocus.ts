/**
 * Today's Focus Types
 *
 * Types for the primary action recommendation system.
 * Determines what the student should work on next based on:
 * - In-progress problems
 * - SRS due cards
 * - Pattern track recommendations
 */

/**
 * The type of primary action recommended
 */
export type PrimaryActionType =
  | 'continue_problem'   // Resume an in-progress problem
  | 'start_review'       // Review SRS due cards
  | 'practice_pattern'   // Practice a specific pattern
  | 'start_fresh'        // New user - start first problem

/**
 * Data for continuing an in-progress problem
 */
export interface ContinueProblemData {
  problemId: string
  problemTitle: string
  currentStep: number
  totalSteps: number
  patternName?: string
  lastSavedAt: string
}

/**
 * Data for starting a review session
 */
export interface StartReviewData {
  dueCardCount: number
  overdueCount: number
  estimatedMinutes: number
}

/**
 * Data for practicing a pattern
 */
export interface PracticePatternData {
  patternId: string
  patternName: string
  trackId?: string
  trackName?: string
  stepType: 'learn' | 'practice' | 'drill'
  decayScore?: number
  reason: 'high_decay' | 'next_in_curriculum' | 'needs_reinforcement'
}

/**
 * The primary action to display
 */
export interface PrimaryAction {
  type: PrimaryActionType

  /** Data specific to the action type */
  continueData?: ContinueProblemData
  reviewData?: StartReviewData
  patternData?: PracticePatternData

  /** Human-readable label for the CTA button */
  ctaLabel: string

  /** Route to navigate to */
  route: string
}

/**
 * A secondary action (de-emphasized alternative)
 */
export interface SecondaryAction {
  type: 'review' | 'practice_pattern' | 'new_problem' | 'continue_problem'
  label: string
  description?: string
  count?: number
  route: string
}

/**
 * Complete data for the Today's Focus section
 */
export interface TodaysFocusData {
  /** The single primary action */
  primaryAction: PrimaryAction

  /** Human-readable explanation for why this was chosen */
  rationale: string

  /** De-emphasized alternative actions (max 3) */
  secondaryActions: SecondaryAction[]

  /** Whether data is still loading */
  isLoading: boolean

  /** Timestamp when this was computed */
  computedAt: string
}

/**
 * Empty state for new users
 */
export interface TodaysFocusEmptyState {
  title: string
  description: string
  ctaLabel: string
  route: string
}

/**
 * Priority weights for action selection
 */
export const ACTION_PRIORITY = {
  /** In-progress problem from last 24 hours */
  RECENT_IN_PROGRESS: 100,
  /** Overdue SRS cards (more than 3) */
  OVERDUE_SRS: 90,
  /** In-progress problem from last 7 days */
  OLD_IN_PROGRESS: 80,
  /** Due SRS cards (3+) */
  DUE_SRS: 70,
  /** Pattern with high decay score */
  HIGH_DECAY_PATTERN: 60,
  /** Next pattern in curriculum */
  NEXT_CURRICULUM: 50,
  /** Default - new problem */
  NEW_PROBLEM: 10,
} as const
