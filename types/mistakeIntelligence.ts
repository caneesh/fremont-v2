/**
 * Mistake Intelligence Types
 *
 * Types for displaying actionable mistake insights on the dashboard.
 * Shows top recurring errors to help students focus on fixable issues.
 */

/**
 * Severity level for mistake categorization
 */
export type MistakeSeverityLevel = 'low' | 'medium' | 'high'

/**
 * A categorized mistake for display
 */
export interface MistakeCategory {
  /** Unique identifier for this category */
  id: string

  /** Human-readable category name */
  category: string

  /** Brief description of the mistake pattern */
  description: string

  /** Number of times this mistake has occurred */
  occurrenceCount: number

  /** When this mistake last occurred */
  lastOccurred: string

  /** Associated pattern name (if linked) */
  associatedPattern?: string

  /** Associated pattern ID for navigation */
  associatedPatternId?: string

  /** Severity based on frequency and impact */
  severity: MistakeSeverityLevel

  /** Whether this mistake is "fixable" with targeted practice */
  isFixable: boolean

  /** Suggested action to address this mistake */
  suggestedAction?: string
}

/**
 * Complete mistake intelligence data for dashboard
 */
export interface MistakeIntelligenceData {
  /** Top mistake categories (max 3 for display) */
  topMistakes: MistakeCategory[]

  /** Total unique mistake types tracked */
  totalMistakeTypes: number

  /** Total mistake occurrences */
  totalOccurrences: number

  /** Whether a review session is available */
  reviewSessionAvailable: boolean

  /** Number of cards due for review */
  cardsDueForReview: number

  /** Whether data is loading */
  isLoading: boolean

  /** Timestamp when computed */
  computedAt: string
}

/**
 * Get severity based on occurrence count
 */
export function getSeverityFromCount(count: number): MistakeSeverityLevel {
  if (count >= 5) return 'high'
  if (count >= 3) return 'medium'
  return 'low'
}

/**
 * Get severity color classes
 */
export function getSeverityColor(severity: MistakeSeverityLevel): {
  text: string
  bg: string
  border: string
} {
  switch (severity) {
    case 'high':
      return {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800/50',
      }
    case 'medium':
      return {
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-amber-200 dark:border-amber-800/50',
      }
    case 'low':
      return {
        text: 'text-gray-600 dark:text-dark-text-secondary',
        bg: 'bg-gray-50 dark:bg-dark-card-soft',
        border: 'border-gray-200 dark:border-dark-border',
      }
  }
}

/**
 * Get severity icon indicator
 */
export function getSeverityLabel(severity: MistakeSeverityLevel): string {
  switch (severity) {
    case 'high': return 'Frequent'
    case 'medium': return 'Recurring'
    case 'low': return 'Occasional'
  }
}
