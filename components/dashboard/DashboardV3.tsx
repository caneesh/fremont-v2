'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardTiles from './DashboardTiles'
import DashboardHeroMetrics from './DashboardHeroMetrics'
import TodayPlanEditor from './TodayPlanEditor'
import TaskPickerModal from './TaskPickerModal'
import WinsCard from './WinsCard'
import CoverageSummary from './CoverageSummary'
import DashboardDevPanel from './DashboardDevPanel'
import DashboardEmptyState from './DashboardEmptyState'
import { TodaysFocus } from './TodaysFocus'
import { ProgressOverview } from './ProgressOverview'
import { MistakeIntelligence } from './MistakeIntelligence'
import { ActiveProblems } from './ActiveProblems'
import { SystemSignals } from './SystemSignals'
import { WarmUpGate, WarmUpPlayer, WarmUpResults } from '@/components/warmup'
import { getTopicCoverage, getWinsMessage } from '@/lib/dashboard/dashboardMetrics'
import * as planService from '@/lib/dashboard/todayPlanService'
import { useStudyDashboardModel } from '@/hooks/useStudyDashboardModel'
import { useWarmUp } from '@/hooks/useWarmUp'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import type { TodayPlan, TopicCoverage, TaskSuggestion } from '@/types/dashboard'

interface DashboardV3Props {
  /**
   * Callback to switch to v1 study path view
   */
  onSwitchToV1?: () => void
}

/**
 * Dashboard V3 - Planning-control first dashboard
 *
 * Uses useStudyDashboardModel() as single source of truth for state.
 */
export default function DashboardV3({ onSwitchToV1 }: DashboardV3Props) {
  const router = useRouter()

  // Single source of truth for dashboard state
  const { model, isLoading: modelLoading, error: modelError, refresh } = useStudyDashboardModel()

  // Local UI state
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [coverage, setCoverage] = useState<TopicCoverage[]>([])
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([])
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false)

  const userId = model.userId

  // Warm-up hook - only active when feature flag is enabled
  const warmUp = useWarmUp(userId)

  // Sync plan from model and load additional data
  useEffect(() => {
    if (modelLoading) return

    // Convert model plan to TodayPlan format for existing components
    const todayPlan = planService.getOrCreatePlan(userId)
    setPlan(todayPlan)

    // Get coverage
    const topicCoverage = getTopicCoverage()
    setCoverage(topicCoverage)

    // Get suggestions
    const taskSuggestions = planService.getTaskSuggestions(userId)
    setSuggestions(taskSuggestions)

    // Cleanup old plans
    planService.cleanupOldPlans(userId)
  }, [userId, modelLoading, model.plan])

  // Plan management handlers
  const handleAddTask = useCallback(() => {
    setIsTaskPickerOpen(true)
  }, [])

  const handleSelectTask = useCallback((suggestion: TaskSuggestion) => {
    const taskData = planService.createTaskFromSuggestion(suggestion)
    const updatedPlan = planService.addTask(userId, taskData)
    setPlan(updatedPlan)
  }, [userId])

  const handleRemoveTask = useCallback((taskId: string) => {
    const updatedPlan = planService.removeTask(userId, taskId)
    setPlan(updatedPlan)
  }, [userId])

  const handleMoveUp = useCallback((taskId: string) => {
    const updatedPlan = planService.moveTaskUp(userId, taskId)
    setPlan(updatedPlan)
  }, [userId])

  const handleMoveDown = useCallback((taskId: string) => {
    const updatedPlan = planService.moveTaskDown(userId, taskId)
    setPlan(updatedPlan)
  }, [userId])

  const handleStartSession = useCallback(() => {
    if (!plan || plan.tasks.length === 0) return

    const activeTask = plan.tasks[plan.activeTaskIndex]
    if (!activeTask) return

    const route = planService.getTaskRoute(activeTask)
    router.push(`${route}${route.includes('?') ? '&' : '?'}fromPlan=1&planDate=${plan.dateKey}`)
  }, [plan, router])

  // Derive metrics from model for existing components
  const metrics = {
    daysPracticed: model.activityMetrics.daysPracticed,
    totalDays: model.activityMetrics.totalDays,
    problemsSolved: model.activityMetrics.problemsSolved,
    problemsSolvedChange: model.activityMetrics.problemsSolvedChange,
    avgMaxHintLevel: model.activityMetrics.avgHintLevel,
    avgMaxHintLevelChange: model.activityMetrics.avgHintLevelChange,
    topicsTouched: [] as string[],
    computedAt: model.computedAt,
  }

  // Get wins message
  const winsMessage = getWinsMessage(metrics)

  // Show loading state
  if (modelLoading || (FEATURE_FLAGS.WARMUP_PROTOCOL && warmUp.phase === 'loading')) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent mb-4"></div>
          <p className="text-gray-500 dark:text-dark-text-muted">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Show warm-up gate if feature is enabled and warm-up is pending
  if (FEATURE_FLAGS.WARMUP_PROTOCOL && warmUp.phase === 'gate') {
    return (
      <WarmUpGate
        session={warmUp.session}
        canSkip={warmUp.canSkip}
        isLoading={warmUp.isLoading}
        onStart={warmUp.start}
        onSkip={warmUp.skipSession}
      />
    )
  }

  // Show warm-up player if in progress
  if (FEATURE_FLAGS.WARMUP_PROTOCOL && warmUp.phase === 'playing') {
    return (
      <WarmUpPlayer
        block={warmUp.currentBlock}
        items={warmUp.currentItems}
        currentItemIndex={warmUp.currentItemIndex}
        progress={warmUp.progress}
        isLoading={warmUp.isLoading}
        onSubmit={warmUp.submitAnswer}
      />
    )
  }

  // Show warm-up results
  if (FEATURE_FLAGS.WARMUP_PROTOCOL && warmUp.phase === 'results') {
    return (
      <WarmUpResults
        session={warmUp.session}
        onContinue={warmUp.finishResults}
      />
    )
  }

  // Show error state for warm-up
  if (FEATURE_FLAGS.WARMUP_PROTOCOL && warmUp.phase === 'error') {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center max-w-md">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-text-primary mb-2">
            Warm-up Error
          </h2>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
            {warmUp.error || 'Something went wrong with warm-up.'}
          </p>
          <button
            onClick={() => warmUp.reset()}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-strong transition-colors"
          >
            Continue to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Show onboarding for new users
  if (model.needsOnboarding) {
    return (
      <>
        <DashboardEmptyState
          state={{
            reason: 'new_user',
            title: 'Welcome to PhysiScaffold',
            description: 'Begin your physics mastery journey with scaffolded problem-solving. We\'ll guide you step-by-step through complex problems.',
            ctaLabel: 'Start Your First Problem',
            ctaRoute: '/pattern-track',
            icon: 'rocket',
          }}
          variant="full"
        />
        <DashboardDevPanel model={model} />
      </>
    )
  }

  // Normal dashboard rendering (warm-up complete or disabled)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
            Your Dashboard
          </h1>
          <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
            Plan your practice, track your progress
          </p>
        </div>
        {onSwitchToV1 && (
          <button
            onClick={onSwitchToV1}
            className="text-sm text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text-secondary"
          >
            View Topics
          </button>
        )}
      </div>

      {/* Primary Dashboard Tiles - Current study state at a glance */}
      {/* Links directly to: /solve?problemId=X&resume=1, /mistake-notebook?review=true, etc. */}
      <DashboardTiles />

      {/* Wins Card */}
      {winsMessage && <WinsCard message={winsMessage} />}

      {/* Section 1: Today's Focus - Primary CTA */}
      <TodaysFocus />

      {/* Hero Metrics */}
      <DashboardHeroMetrics metrics={metrics} />

      {/* Main Content - Two Column on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Takes 2 columns on desktop */}
        <div className="lg:col-span-2 space-y-6">
          {/* Plan Editor or Empty State */}
          {plan ? (
            <TodayPlanEditor
              plan={plan}
              onAddTask={handleAddTask}
              onRemoveTask={handleRemoveTask}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onStartSession={handleStartSession}
            />
          ) : model.emptyStates.plan && (
            <DashboardEmptyState state={model.emptyStates.plan} variant="card" />
          )}

          {/* Section 4: Active Problems or Empty State */}
          {model.currentModule ? (
            <ActiveProblems />
          ) : model.emptyStates.currentModule && (
            <DashboardEmptyState state={model.emptyStates.currentModule} variant="inline" />
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Section 2: Progress Overview */}
          <ProgressOverview />

          {/* Section 3: Mistake Intelligence */}
          <MistakeIntelligence />

          {/* Coverage Summary */}
          <CoverageSummary coverage={coverage} />
        </div>
      </div>

      {/* Section 5: System Signals - Collapsible at bottom */}
      <SystemSignals defaultCollapsed={true} />

      {/* Task Picker Modal */}
      <TaskPickerModal
        isOpen={isTaskPickerOpen}
        onClose={() => setIsTaskPickerOpen(false)}
        onSelectTask={handleSelectTask}
        suggestions={suggestions}
      />

      {/* Dev Panel - only visible in development */}
      <DashboardDevPanel model={model} />
    </div>
  )
}
