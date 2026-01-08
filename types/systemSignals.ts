/**
 * System Signals Types
 *
 * Types for displaying active feature flags and learning modes.
 * Provides transparency into the system's pedagogical configuration.
 */

/**
 * A feature flag for display
 */
export interface DisplayableFeatureFlag {
  /** Internal flag key */
  key: string

  /** Human-readable display name */
  displayName: string

  /** Brief description of what this feature does */
  description: string

  /** Whether the feature is currently enabled */
  isEnabled: boolean

  /** Category for grouping */
  category: 'learning_mode' | 'feedback' | 'practice' | 'advanced'

  /** How this helps exam performance (tooltip text) */
  examBenefit?: string
}

/**
 * Learning mode summary for quick display
 */
export interface LearningModeSummary {
  /** Pattern-First Mode enabled */
  patternFirst: boolean

  /** Socratic Tutor enabled */
  socraticTutor: boolean

  /** Skip-or-Commit Gate enabled */
  skipOrCommit: boolean

  /** Confidence-Weighted SRS enabled */
  confidenceSRS: boolean

  /** Study Plan v2 (pattern-driven) enabled */
  studyPlanV2: boolean
}

/**
 * Complete system signals data
 */
export interface SystemSignalsData {
  /** Feature flags relevant to user experience */
  flags: DisplayableFeatureFlag[]

  /** Quick summary of learning modes */
  learningModes: LearningModeSummary

  /** Count of enabled features */
  enabledCount: number

  /** Total displayable features */
  totalCount: number

  /** Timestamp when computed */
  computedAt: string
}

/**
 * Get category label
 */
export function getCategoryLabel(category: DisplayableFeatureFlag['category']): string {
  switch (category) {
    case 'learning_mode': return 'Learning Mode'
    case 'feedback': return 'Feedback'
    case 'practice': return 'Practice'
    case 'advanced': return 'Advanced'
  }
}

/**
 * Get category color
 */
export function getCategoryColor(category: DisplayableFeatureFlag['category']): {
  text: string
  bg: string
} {
  switch (category) {
    case 'learning_mode':
      return {
        text: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-100 dark:bg-purple-900/30',
      }
    case 'feedback':
      return {
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 dark:bg-blue-900/30',
      }
    case 'practice':
      return {
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-100 dark:bg-green-900/30',
      }
    case 'advanced':
      return {
        text: 'text-gray-600 dark:text-dark-text-secondary',
        bg: 'bg-gray-100 dark:bg-dark-card-soft',
      }
  }
}
