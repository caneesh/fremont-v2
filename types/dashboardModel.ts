/**
 * Dashboard Model Types
 *
 * Single source of truth for dashboard state.
 * All dashboard components derive their state from this model.
 */

// ============================================================================
// Core Model Types
// ============================================================================

/**
 * Data provider types for the dashboard
 */
export type DataProvider = 'mock' | 'local' | 'db'

/**
 * Loading state for async data
 */
export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error'

/**
 * Today's study plan
 */
export interface StudyPlan {
  id: string
  dateKey: string
  tasks: StudyTask[]
  activeTaskIndex: number
  completedCount: number
  totalCount: number
  estimatedMinutes: number
}

/**
 * Individual study task in the plan
 */
export interface StudyTask {
  id: string
  type: 'problem' | 'review' | 'lesson' | 'drill' | 'warmup'
  title: string
  description?: string
  route: string
  estimatedMinutes: number
  status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  metadata?: Record<string, unknown>
}

/**
 * Current module/problem being worked on
 */
export interface CurrentModule {
  type: 'problem' | 'lesson' | 'drill' | 'review'
  id: string
  title: string
  route: string
  progress: {
    currentStep: number
    totalSteps: number
    percentComplete: number
  }
  lastActiveAt: string
  canResume: boolean
}

/**
 * Due review item (SRS card)
 */
export interface DueReview {
  id: string
  type: 'mistake' | 'concept' | 'pattern'
  title: string
  dueAt: string
  isOverdue: boolean
  lastReviewedAt?: string
  reviewCount: number
}

/**
 * Recent mistake entry
 */
export interface RecentMistake {
  id: string
  problemId: string
  problemTitle: string
  stepId: string
  mistakeType: string
  description: string
  occurredAt: string
  severity: 'low' | 'medium' | 'high'
  isAddressed: boolean
}

/**
 * Activity metrics
 */
export interface ActivityMetrics {
  daysPracticed: number
  totalDays: number
  problemsSolved: number
  problemsSolvedChange: number
  avgHintLevel: number
  avgHintLevelChange: number
  streakDays: number
  lastActiveAt: string | null
}

/**
 * Empty state reasons
 */
export type EmptyStateReason =
  | 'no_plan'           // No study plan created
  | 'no_progress'       // No problems attempted
  | 'no_reviews'        // No reviews due
  | 'no_mistakes'       // No mistakes recorded
  | 'new_user'          // Brand new user
  | 'data_unavailable'  // Data source error

/**
 * Empty state with CTA
 */
export interface EmptyState {
  reason: EmptyStateReason
  title: string
  description: string
  ctaLabel: string
  ctaRoute: string
  icon?: string
}

// ============================================================================
// Main Dashboard Model
// ============================================================================

/**
 * Complete dashboard model - single source of truth
 */
export interface DashboardModel {
  // Meta
  userId: string
  dataProvider: DataProvider
  loadingState: LoadingState
  error: string | null
  computedAt: string

  // Core study state
  plan: StudyPlan | null
  currentModule: CurrentModule | null
  dueReviews: DueReview[]
  recentMistakes: RecentMistake[]
  activityMetrics: ActivityMetrics

  // Empty states (set when data is unavailable)
  emptyStates: {
    plan: EmptyState | null
    currentModule: EmptyState | null
    reviews: EmptyState | null
    mistakes: EmptyState | null
  }

  // Feature flags affecting dashboard
  featureFlags: {
    dashboardV3: boolean
    warmupProtocol: boolean
    studyPlanV2: boolean
    mistakeNotebook: boolean
    patternTrack: boolean
  }

  // Computed/derived
  hasAnyProgress: boolean
  primaryAction: PrimaryAction | null
  needsOnboarding: boolean
}

/**
 * Primary action recommendation
 */
export interface PrimaryAction {
  type: 'continue' | 'review' | 'start_fresh' | 'warmup' | 'create_plan'
  title: string
  description: string
  ctaLabel: string
  route: string
  urgency: 'low' | 'medium' | 'high'
}

// ============================================================================
// Hook Return Type
// ============================================================================

/**
 * Return type for useStudyDashboardModel hook
 */
export interface UseStudyDashboardModelReturn {
  model: DashboardModel
  isLoading: boolean
  error: string | null

  // Actions
  refresh: () => Promise<void>
  createPlan: () => void
  dismissEmptyState: (key: keyof DashboardModel['emptyStates']) => void
}
