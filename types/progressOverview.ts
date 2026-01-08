/**
 * Progress Overview Types
 *
 * Types for displaying learning progress at the skill/pattern level.
 * Shows depth of learning, not just volume.
 */

/**
 * Pattern completion state
 * Represents the current learning stage for a pattern
 */
export type PatternState =
  | 'not_started'  // No engagement yet
  | 'learning'     // Learn phase in progress
  | 'practicing'   // Practice phase in progress
  | 'needs_review' // Completed but mastery declining / due for SRS
  | 'stable'       // Mastered and not due for review

/**
 * Mastery level (1-5 scale for visual display)
 * Maps from 0-1 mastery score
 */
export type MasteryLevel = 1 | 2 | 3 | 4 | 5

/**
 * A single pattern's mastery data for display
 */
export interface PatternMasteryItem {
  patternId: string
  patternName: string

  /** Current state in the learning progression */
  state: PatternState

  /** Mastery level for bar display (1-5) */
  masteryLevel: MasteryLevel

  /** Raw mastery score (0-1) for tooltips */
  masteryScore: number

  /** Problems completed for this pattern */
  problemsCompleted: number

  /** Total problems available */
  problemsTotal: number

  /** Whether this pattern needs attention (weak or declining) */
  needsAttention: boolean

  /** Trend indicator */
  trend: 'improving' | 'stable' | 'declining'

  /** Last practiced date */
  lastPracticed?: string
}

/**
 * Confidence distribution buckets
 */
export interface ConfidenceDistribution {
  /** Count of low confidence answers */
  low: number

  /** Count of medium confidence answers */
  medium: number

  /** Count of high confidence answers */
  high: number

  /** Total answers with confidence ratings */
  total: number
}

/**
 * Sanity check completion stats
 */
export interface SanityCheckStats {
  /** Completed sanity checks */
  completed: number

  /** Total problems where sanity check was available */
  total: number

  /** Completion percentage */
  percentage: number
}

/**
 * Complete progress overview data
 */
export interface ProgressOverviewData {
  /** Pattern mastery items, sorted by state priority */
  patterns: PatternMasteryItem[]

  /** Confidence distribution from recent answers */
  confidenceDistribution: ConfidenceDistribution

  /** Sanity check completion rate */
  sanityCheckStats: SanityCheckStats

  /** Summary statistics */
  summary: {
    /** Total patterns available */
    totalPatterns: number

    /** Patterns in stable state */
    stablePatterns: number

    /** Patterns needing review */
    patternsNeedingReview: number

    /** Overall average mastery (0-1) */
    averageMastery: number
  }

  /** Whether data is loading */
  isLoading: boolean

  /** Timestamp when computed */
  computedAt: string
}

/**
 * Map mastery score (0-1) to mastery level (1-5)
 */
export function masteryToLevel(mastery: number): MasteryLevel {
  if (mastery >= 0.8) return 5
  if (mastery >= 0.6) return 4
  if (mastery >= 0.4) return 3
  if (mastery >= 0.2) return 2
  return 1
}

/**
 * Get display label for pattern state
 */
export function getStateLabel(state: PatternState): string {
  switch (state) {
    case 'not_started': return 'Not Started'
    case 'learning': return 'Learning'
    case 'practicing': return 'Practicing'
    case 'needs_review': return 'Needs Review'
    case 'stable': return 'Stable'
  }
}

/**
 * Get color class for pattern state
 */
export function getStateColor(state: PatternState): string {
  switch (state) {
    case 'not_started': return 'text-gray-400 dark:text-dark-text-muted'
    case 'learning': return 'text-blue-500 dark:text-blue-400'
    case 'practicing': return 'text-amber-500 dark:text-amber-400'
    case 'needs_review': return 'text-orange-500 dark:text-orange-400'
    case 'stable': return 'text-green-500 dark:text-green-400'
  }
}

/**
 * Get background color class for mastery bar
 */
export function getMasteryBarColor(level: MasteryLevel, state: PatternState): string {
  if (state === 'not_started') return 'bg-gray-200 dark:bg-dark-card-soft'
  if (state === 'needs_review') return 'bg-orange-400 dark:bg-orange-500'

  switch (level) {
    case 1: return 'bg-red-400 dark:bg-red-500'
    case 2: return 'bg-orange-400 dark:bg-orange-500'
    case 3: return 'bg-amber-400 dark:bg-amber-500'
    case 4: return 'bg-lime-400 dark:bg-lime-500'
    case 5: return 'bg-green-400 dark:bg-green-500'
  }
}
