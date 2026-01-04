/**
 * Dashboard v3 Types
 *
 * Types for the planning-control first dashboard experience.
 */

/**
 * Task types for today's plan
 */
export type PlanTaskType =
  | 'study_path_question'  // A specific question from study path
  | 'review_due'           // Review due cards from mistake notebook
  | 'pattern_track_continue' // Continue a pattern track
  | 'custom_solve'         // Free-form problem solving

/**
 * A task in today's plan
 */
export interface PlanTask {
  id: string
  type: PlanTaskType
  title: string
  description?: string
  /** For study_path_question */
  questionId?: string
  topicId?: string
  /** For pattern_track_continue */
  trackId?: string
  patternId?: string
  /** Task state */
  completed: boolean
  completedAt?: string
}

/**
 * Today's plan - stored in localStorage per user+date
 */
export interface TodayPlan {
  dateKey: string  // YYYY-MM-DD
  userId: string
  tasks: PlanTask[]
  activeTaskIndex: number
  createdAt: string
  updatedAt: string
}

/**
 * Hero metrics for the dashboard
 */
export interface DashboardMetrics {
  /** Days practiced in the last 7 days */
  daysPracticed: number
  /** Total days in the period (7) */
  totalDays: number
  /** Problems solved in the last 7 days */
  problemsSolved: number
  /** Change vs previous 7 days */
  problemsSolvedChange: number
  /** Average max hint level used (0-5 scale, lower is better) */
  avgMaxHintLevel: number
  /** Change vs previous 7 days (negative is improvement) */
  avgMaxHintLevelChange: number
  /** Topics touched this week */
  topicsTouched: string[]
  /** Last computed timestamp */
  computedAt: string
}

/**
 * Coverage summary - topics touched this week
 */
export interface TopicCoverage {
  topicId: string
  topicName: string
  questionsAttempted: number
  questionsSolved: number
  lastAccessedAt: string
}

/**
 * Session state for the session runner
 */
export interface PlanSession {
  planDateKey: string
  startedAt: string
  currentTaskIndex: number
  completedTaskIds: string[]
}

/**
 * Task suggestion from recommender
 */
export interface TaskSuggestion {
  type: PlanTaskType
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  /** Data needed to create the task */
  questionId?: string
  topicId?: string
  trackId?: string
  patternId?: string
}
