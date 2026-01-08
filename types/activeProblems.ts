/**
 * Active Problems Types
 *
 * Types for displaying in-progress and recent problems on the dashboard.
 * Supports continuity and momentum for learning sessions.
 */

/**
 * Problem status for display
 */
export type ProblemDisplayStatus = 'in_progress' | 'solved' | 'skipped'

/**
 * A problem item for the active problems list
 */
export interface ActiveProblemItem {
  /** Unique problem ID */
  problemId: string

  /** Problem title/description */
  title: string

  /** Physics domain (Mechanics, Thermodynamics, etc.) */
  domain?: string

  /** Current status */
  status: ProblemDisplayStatus

  /** For in-progress: current step number */
  currentStep?: number

  /** For in-progress: total steps */
  totalSteps?: number

  /** When this was last updated/completed */
  timestamp: string

  /** Time spent in seconds (for solved) */
  timeSpent?: number

  /** Whether draft is available for resume */
  hasDraft: boolean

  /** Route to navigate to this problem */
  route: string
}

/**
 * Complete active problems data for dashboard
 */
export interface ActiveProblemsData {
  /** In-progress problems (resumable) */
  inProgress: ActiveProblemItem[]

  /** Recently completed problems */
  recentlySolved: ActiveProblemItem[]

  /** Recently skipped problems */
  recentlySkipped: ActiveProblemItem[]

  /** All items combined and sorted */
  allItems: ActiveProblemItem[]

  /** Whether data is loading */
  isLoading: boolean

  /** Timestamp when computed */
  computedAt: string
}

/**
 * Get status color classes
 */
export function getStatusColors(status: ProblemDisplayStatus): {
  text: string
  bg: string
  border: string
  icon: string
} {
  switch (status) {
    case 'in_progress':
      return {
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800/50',
        icon: 'text-blue-500',
      }
    case 'solved':
      return {
        text: 'text-green-600 dark:text-green-400',
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800/50',
        icon: 'text-green-500',
      }
    case 'skipped':
      return {
        text: 'text-gray-600 dark:text-dark-text-secondary',
        bg: 'bg-gray-50 dark:bg-dark-card-soft',
        border: 'border-gray-200 dark:border-dark-border',
        icon: 'text-gray-400',
      }
  }
}

/**
 * Get status label
 */
export function getStatusLabel(status: ProblemDisplayStatus): string {
  switch (status) {
    case 'in_progress': return 'In Progress'
    case 'solved': return 'Solved'
    case 'skipped': return 'Skipped'
  }
}

/**
 * Get action label based on status
 */
export function getActionLabel(status: ProblemDisplayStatus): string {
  switch (status) {
    case 'in_progress': return 'Resume'
    case 'solved': return 'Review'
    case 'skipped': return 'Retry'
  }
}

/**
 * Format relative time for display
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Format duration in seconds to readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}
