/**
 * useStudyDashboardModel Hook
 *
 * Single source of truth for dashboard state.
 * Aggregates data from multiple sources into a unified model.
 *
 * Data Sources:
 * - problemHistoryService: Problem attempts, in-progress work
 * - studyPathService: Topic progress, study stats
 * - mistakeNotebook: SRS cards, due reviews
 * - todayPlanService: Today's study plan
 * - authService: User identification
 *
 * @example
 * function Dashboard() {
 *   const { model, isLoading, error, refresh } = useStudyDashboardModel()
 *
 *   if (isLoading) return <LoadingSkeleton />
 *   if (error) return <ErrorState error={error} onRetry={refresh} />
 *
 *   return <DashboardContent model={model} />
 * }
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import type {
  DashboardModel,
  UseStudyDashboardModelReturn,
  DataProvider,
  LoadingState,
  StudyPlan,
  StudyTask,
  CurrentModule,
  DueReview,
  RecentMistake,
  ActivityMetrics,
  EmptyState,
  PrimaryAction,
} from '@/types/dashboardModel'
import { problemHistoryService } from '@/lib/problemHistory'
import { studyPathService } from '@/lib/studyPath/studyPathService'
import { getNotebookStats, getCardsDue } from '@/lib/mistakeNotebook'
import * as planService from '@/lib/dashboard/todayPlanService'
import { authService } from '@/lib/auth/authService'
import { FEATURE_FLAGS } from '@/lib/featureFlags'

// ============================================================================
// Constants
// ============================================================================

const CACHE_DURATION_MS = 30_000 // 30 seconds
const RECENT_DAYS = 7

// ============================================================================
// Data Provider Detection
// ============================================================================

function detectDataProvider(): DataProvider {
  // Check if we're using database (Prisma)
  if (process.env.NEXT_PUBLIC_USE_DATABASE === 'true') {
    return 'db'
  }

  // Check if mock data is enabled
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') {
    return 'mock'
  }

  // Default to localStorage
  return 'local'
}

// ============================================================================
// Empty State Generators
// ============================================================================

function getPlanEmptyState(): EmptyState {
  return {
    reason: 'no_plan',
    title: 'No Study Plan',
    description: 'Create a study plan to organize your practice and track progress.',
    ctaLabel: 'Create Plan',
    ctaRoute: '/study-path',
    icon: 'calendar',
  }
}

function getCurrentModuleEmptyState(): EmptyState {
  return {
    reason: 'no_progress',
    title: 'No Active Work',
    description: 'Start a problem to begin building your physics skills.',
    ctaLabel: 'Start Problem',
    ctaRoute: '/pattern-track',
    icon: 'play',
  }
}

function getReviewsEmptyState(): EmptyState {
  return {
    reason: 'no_reviews',
    title: 'No Reviews Due',
    description: 'Complete more problems to build your review queue.',
    ctaLabel: 'Practice Now',
    ctaRoute: '/pattern-track',
    icon: 'check',
  }
}

function getMistakesEmptyState(): EmptyState {
  return {
    reason: 'no_mistakes',
    title: 'No Mistakes Tracked',
    description: 'Mistakes are learning opportunities. They\'ll appear here as you practice.',
    ctaLabel: 'Start Practicing',
    ctaRoute: '/pattern-track',
    icon: 'lightbulb',
  }
}

function getNewUserEmptyState(): EmptyState {
  return {
    reason: 'new_user',
    title: 'Welcome to PhysiScaffold',
    description: 'Begin your physics mastery journey with scaffolded problem-solving.',
    ctaLabel: 'Get Started',
    ctaRoute: '/pattern-track',
    icon: 'rocket',
  }
}

// ============================================================================
// Data Loaders
// ============================================================================

function loadStudyPlan(userId: string): StudyPlan | null {
  try {
    const plan = planService.getOrCreatePlan(userId)

    if (!plan || plan.tasks.length === 0) {
      return null
    }

    const completedCount = plan.tasks.filter(t => t.completed).length
    // Estimate 10 minutes per task
    const totalMinutes = plan.tasks.length * 10

    // Map task types to our simplified types
    const mapTaskType = (type: string): StudyTask['type'] => {
      switch (type) {
        case 'study_path_question':
        case 'custom_solve':
          return 'problem'
        case 'review_due':
          return 'review'
        case 'pattern_track_continue':
          return 'lesson'
        default:
          return 'problem'
      }
    }

    // Map task status
    const mapStatus = (completed: boolean): StudyTask['status'] => {
      return completed ? 'completed' : 'pending'
    }

    return {
      id: `plan_${plan.dateKey}`,
      dateKey: plan.dateKey,
      tasks: plan.tasks.map(t => ({
        id: t.id,
        type: mapTaskType(t.type),
        title: t.title,
        description: t.description,
        route: t.questionId ? `/solve?question=${t.questionId}` : '/solve',
        estimatedMinutes: 10,
        status: mapStatus(t.completed),
        metadata: { questionId: t.questionId, topicId: t.topicId },
      })),
      activeTaskIndex: plan.activeTaskIndex || 0,
      completedCount,
      totalCount: plan.tasks.length,
      estimatedMinutes: totalMinutes,
    }
  } catch (error) {
    console.error('[useStudyDashboardModel] Error loading plan:', error)
    return null
  }
}

function loadCurrentModule(): CurrentModule | null {
  try {
    const { attempts } = problemHistoryService.getHistory({
      status: 'IN_PROGRESS',
      limit: 1,
    })

    if (attempts.length === 0) {
      return null
    }

    const attempt = attempts[0]
    let progress = { currentStep: 1, totalSteps: 5, percentComplete: 0 }

    if (attempt.draftSolution) {
      try {
        const draft = JSON.parse(attempt.draftSolution)
        const totalSteps = draft.stepProgress?.length || 5
        const completedSteps = draft.stepProgress?.filter((s: { isCompleted?: boolean }) => s.isCompleted).length || 0
        progress = {
          currentStep: completedSteps + 1,
          totalSteps,
          percentComplete: Math.round((completedSteps / totalSteps) * 100),
        }
      } catch {
        // Use defaults
      }
    }

    // Check if resumable (within 7 days)
    const lastActive = new Date(attempt.lastOpenedAt || attempt.updatedAt)
    const daysSince = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    const canResume = daysSince < 7

    return {
      type: 'problem',
      id: attempt.problemId,
      title: attempt.problemTitle,
      route: `/solve?problemId=${attempt.problemId}&resume=1`,
      progress,
      lastActiveAt: attempt.lastOpenedAt || attempt.updatedAt,
      canResume,
    }
  } catch (error) {
    console.error('[useStudyDashboardModel] Error loading current module:', error)
    return null
  }
}

function loadDueReviews(): DueReview[] {
  try {
    const cards = getCardsDue()
    const today = new Date().toISOString().split('T')[0]

    return cards.slice(0, 10).map(card => ({
      id: card.id,
      type: 'mistake' as const,
      title: card.problemTitle || 'Review Card',
      dueAt: card.srs.dueDate,
      isOverdue: card.srs.dueDate < today,
      lastReviewedAt: card.lastReviewedAt,
      reviewCount: card.reviewCount || 0,
    }))
  } catch (error) {
    // Mistake notebook may not be available
    return []
  }
}

function loadRecentMistakes(): RecentMistake[] {
  try {
    // Load from events storage
    if (typeof window === 'undefined') return []

    const eventsKey = 'physiscaffold_events'
    const stored = localStorage.getItem(eventsKey)
    if (!stored) return []

    const events = JSON.parse(stored) as Array<{
      type: string
      payload?: Record<string, unknown>
      timestamp: string
    }>

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RECENT_DAYS)
    const cutoffStr = cutoff.toISOString()

    const mistakeEvents = events
      .filter(e =>
        e.type === 'mistake_recorded' &&
        e.timestamp >= cutoffStr
      )
      .slice(0, 5)

    return mistakeEvents.map((e, i) => ({
      id: `mistake_${i}`,
      problemId: (e.payload?.problemId as string) || 'unknown',
      problemTitle: (e.payload?.problemTitle as string) || 'Problem',
      stepId: (e.payload?.stepId as string) || 'unknown',
      mistakeType: (e.payload?.mistakeType as string) || 'error',
      description: (e.payload?.description as string) || 'Mistake recorded',
      occurredAt: e.timestamp,
      severity: (e.payload?.severity as 'low' | 'medium' | 'high') || 'medium',
      isAddressed: false,
    }))
  } catch {
    return []
  }
}

function loadActivityMetrics(): ActivityMetrics {
  try {
    const allAttempts = problemHistoryService.listAllAttempts()
    const stats = studyPathService.getStudyStats()

    // Calculate days practiced this week
    const today = new Date()
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    const daysWithAttempts = new Set<string>()
    let thisWeekSolved = 0
    let prevWeekSolved = 0
    let totalHintLevel = 0
    let hintCount = 0

    for (const attempt of allAttempts) {
      const attemptDate = new Date(attempt.createdAt)
      const dateKey = attemptDate.toISOString().split('T')[0]

      if (attemptDate >= weekAgo) {
        daysWithAttempts.add(dateKey)
        if (attempt.status === 'SOLVED') thisWeekSolved++

        // Calculate hint level from draft
        if (attempt.draftSolution) {
          try {
            const draft = JSON.parse(attempt.draftSolution)
            const maxHint = Math.max(
              0,
              ...(draft.stepProgress?.map((s: { currentHintLevel?: number }) => s.currentHintLevel || 0) || [0])
            )
            totalHintLevel += maxHint
            hintCount++
          } catch {
            // Skip
          }
        }
      } else {
        const twoWeeksAgo = new Date(today)
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
        if (attemptDate >= twoWeeksAgo && attempt.status === 'SOLVED') {
          prevWeekSolved++
        }
      }
    }

    // Find last active time
    let lastActiveAt: string | null = null
    if (allAttempts.length > 0) {
      const sorted = [...allAttempts].sort((a, b) =>
        new Date(b.lastOpenedAt || b.updatedAt).getTime() -
        new Date(a.lastOpenedAt || a.updatedAt).getTime()
      )
      lastActiveAt = sorted[0].lastOpenedAt || sorted[0].updatedAt
    }

    return {
      daysPracticed: daysWithAttempts.size,
      totalDays: 7,
      problemsSolved: thisWeekSolved,
      problemsSolvedChange: thisWeekSolved - prevWeekSolved,
      avgHintLevel: hintCount > 0 ? totalHintLevel / hintCount : 0,
      avgHintLevelChange: 0, // Would need historical data
      streakDays: daysWithAttempts.size, // Simplified
      lastActiveAt,
    }
  } catch (error) {
    console.error('[useStudyDashboardModel] Error loading metrics:', error)
    return {
      daysPracticed: 0,
      totalDays: 7,
      problemsSolved: 0,
      problemsSolvedChange: 0,
      avgHintLevel: 0,
      avgHintLevelChange: 0,
      streakDays: 0,
      lastActiveAt: null,
    }
  }
}

// ============================================================================
// Primary Action Calculator
// ============================================================================

function calculatePrimaryAction(
  currentModule: CurrentModule | null,
  dueReviews: DueReview[],
  plan: StudyPlan | null,
  metrics: ActivityMetrics
): PrimaryAction | null {
  // Priority 1: Continue in-progress work
  if (currentModule?.canResume) {
    return {
      type: 'continue',
      title: `Continue: ${currentModule.title}`,
      description: `Step ${currentModule.progress.currentStep}/${currentModule.progress.totalSteps}`,
      ctaLabel: 'Continue',
      route: currentModule.route,
      urgency: 'high',
    }
  }

  // Priority 2: Overdue reviews
  const overdueCount = dueReviews.filter(r => r.isOverdue).length
  if (overdueCount >= 3) {
    return {
      type: 'review',
      title: `${overdueCount} Reviews Overdue`,
      description: 'Review now to prevent forgetting',
      ctaLabel: 'Start Review',
      route: '/mistake-notebook?review=true',
      urgency: 'high',
    }
  }

  // Priority 3: Due reviews
  if (dueReviews.length >= 3) {
    return {
      type: 'review',
      title: `${dueReviews.length} Reviews Due`,
      description: 'Reinforce your learning',
      ctaLabel: 'Start Review',
      route: '/mistake-notebook?review=true',
      urgency: 'medium',
    }
  }

  // Priority 4: Next task in plan
  if (plan && plan.activeTaskIndex < plan.tasks.length) {
    const nextTask = plan.tasks[plan.activeTaskIndex]
    return {
      type: 'continue',
      title: nextTask.title,
      description: nextTask.description || 'Next in your plan',
      ctaLabel: 'Start',
      route: nextTask.route,
      urgency: 'medium',
    }
  }

  // Priority 5: New user - start fresh
  if (!metrics.lastActiveAt || metrics.problemsSolved === 0) {
    return {
      type: 'start_fresh',
      title: 'Start Your First Problem',
      description: 'Begin with a scaffolded physics problem',
      ctaLabel: 'Get Started',
      route: '/pattern-track',
      urgency: 'low',
    }
  }

  // Priority 6: Create plan
  if (!plan) {
    return {
      type: 'create_plan',
      title: 'Plan Your Practice',
      description: 'Create a study plan for focused learning',
      ctaLabel: 'Create Plan',
      route: '/study-path',
      urgency: 'low',
    }
  }

  return null
}

// ============================================================================
// Main Hook
// ============================================================================

export function useStudyDashboardModel(): UseStudyDashboardModelReturn {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [lastComputedAt, setLastComputedAt] = useState<string | null>(null)

  // Core data state
  const [plan, setPlan] = useState<StudyPlan | null>(null)
  const [currentModule, setCurrentModule] = useState<CurrentModule | null>(null)
  const [dueReviews, setDueReviews] = useState<DueReview[]>([])
  const [recentMistakes, setRecentMistakes] = useState<RecentMistake[]>([])
  const [activityMetrics, setActivityMetrics] = useState<ActivityMetrics>({
    daysPracticed: 0,
    totalDays: 7,
    problemsSolved: 0,
    problemsSolvedChange: 0,
    avgHintLevel: 0,
    avgHintLevelChange: 0,
    streakDays: 0,
    lastActiveAt: null,
  })

  // User and provider info
  const userId = authService.getUser()?.userId || 'anonymous'
  const dataProvider = detectDataProvider()

  // Feature flags
  const featureFlags = useMemo(() => ({
    dashboardV3: FEATURE_FLAGS.DASHBOARD_V3,
    warmupProtocol: FEATURE_FLAGS.WARMUP_PROTOCOL,
    studyPlanV2: FEATURE_FLAGS.STUDY_PLAN_V2,
    mistakeNotebook: FEATURE_FLAGS.MISTAKE_NOTEBOOK,
    patternTrack: FEATURE_FLAGS.PATTERN_FIRST_MODE,
  }), [])

  // Load all data
  const loadData = useCallback(async () => {
    setLoadingState('loading')
    setError(null)

    try {
      // Load all data sources in parallel where possible
      const loadedPlan = loadStudyPlan(userId)
      const loadedModule = loadCurrentModule()
      const loadedReviews = loadDueReviews()
      const loadedMistakes = loadRecentMistakes()
      const loadedMetrics = loadActivityMetrics()

      setPlan(loadedPlan)
      setCurrentModule(loadedModule)
      setDueReviews(loadedReviews)
      setRecentMistakes(loadedMistakes)
      setActivityMetrics(loadedMetrics)
      setLastComputedAt(new Date().toISOString())
      setLoadingState('loaded')
    } catch (err) {
      console.error('[useStudyDashboardModel] Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
      setLoadingState('error')
    }
  }, [userId])

  // Initial load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Compute empty states
  const emptyStates = useMemo(() => ({
    plan: plan === null ? getPlanEmptyState() : null,
    currentModule: currentModule === null ? getCurrentModuleEmptyState() : null,
    reviews: dueReviews.length === 0 ? getReviewsEmptyState() : null,
    mistakes: recentMistakes.length === 0 ? getMistakesEmptyState() : null,
  }), [plan, currentModule, dueReviews.length, recentMistakes.length])

  // Compute derived state
  const hasAnyProgress = activityMetrics.problemsSolved > 0 || activityMetrics.lastActiveAt !== null
  const needsOnboarding = !hasAnyProgress && plan === null

  // Calculate primary action
  const primaryAction = useMemo(() =>
    calculatePrimaryAction(currentModule, dueReviews, plan, activityMetrics),
    [currentModule, dueReviews, plan, activityMetrics]
  )

  // Build complete model
  const model: DashboardModel = useMemo(() => ({
    // Meta
    userId,
    dataProvider,
    loadingState,
    error,
    computedAt: lastComputedAt || new Date().toISOString(),

    // Core study state
    plan,
    currentModule,
    dueReviews,
    recentMistakes,
    activityMetrics,

    // Empty states
    emptyStates,

    // Feature flags
    featureFlags,

    // Computed
    hasAnyProgress,
    primaryAction,
    needsOnboarding,
  }), [
    userId,
    dataProvider,
    loadingState,
    error,
    lastComputedAt,
    plan,
    currentModule,
    dueReviews,
    recentMistakes,
    activityMetrics,
    emptyStates,
    featureFlags,
    hasAnyProgress,
    primaryAction,
    needsOnboarding,
  ])

  // Actions
  const refresh = useCallback(async () => {
    await loadData()
  }, [loadData])

  const createPlan = useCallback(() => {
    // Navigate to plan creation
    window.location.href = '/study-path'
  }, [])

  const dismissEmptyState = useCallback((key: keyof DashboardModel['emptyStates']) => {
    // Could persist dismissal to localStorage
    console.log(`Dismissed empty state: ${key}`)
  }, [])

  return {
    model,
    isLoading: loadingState === 'loading' || loadingState === 'idle',
    error,
    refresh,
    createPlan,
    dismissEmptyState,
  }
}

export default useStudyDashboardModel
