'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardHeroMetrics from './DashboardHeroMetrics'
import TodayPlanEditor from './TodayPlanEditor'
import TaskPickerModal from './TaskPickerModal'
import WinsCard from './WinsCard'
import CoverageSummary from './CoverageSummary'
import { TodaysFocus } from './TodaysFocus'
import { ProgressOverview } from './ProgressOverview'
import { MistakeIntelligence } from './MistakeIntelligence'
import { ActiveProblems } from './ActiveProblems'
import { SystemSignals } from './SystemSignals'
import { WarmUpGate, WarmUpPlayer, WarmUpResults } from '@/components/warmup'
import { computeDashboardMetrics, getTopicCoverage, getWinsMessage } from '@/lib/dashboard/dashboardMetrics'
import * as planService from '@/lib/dashboard/todayPlanService'
import { authService } from '@/lib/auth/authService'
import { useWarmUp } from '@/hooks/useWarmUp'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import type { DashboardMetrics, TodayPlan, TopicCoverage, TaskSuggestion } from '@/types/dashboard'

interface DashboardV3Props {
  /**
   * Callback to switch to v1 study path view
   */
  onSwitchToV1?: () => void
}

/**
 * Dashboard V3 - Planning-control first dashboard
 */
export default function DashboardV3({ onSwitchToV1 }: DashboardV3Props) {
  const router = useRouter()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [plan, setPlan] = useState<TodayPlan | null>(null)
  const [coverage, setCoverage] = useState<TopicCoverage[]>([])
  const [suggestions, setSuggestions] = useState<TaskSuggestion[]>([])
  const [isTaskPickerOpen, setIsTaskPickerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const userId = authService.getUser()?.userId || 'anonymous'

  // Warm-up hook - only active when feature flag is enabled
  const warmUp = useWarmUp(userId)

  // Load dashboard data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Compute metrics
        const dashboardMetrics = computeDashboardMetrics()
        setMetrics(dashboardMetrics)

        // Load plan
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
      } catch (error) {
        console.error('[DashboardV3] Error loading data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [userId])

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

  // Get wins message
  const winsMessage = metrics ? getWinsMessage(metrics) : null

  // Show loading state
  if (isLoading || (FEATURE_FLAGS.WARMUP_PROTOCOL && warmUp.phase === 'loading')) {
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

      {/* Wins Card */}
      {winsMessage && <WinsCard message={winsMessage} />}

      {/* Section 1: Today's Focus - Primary CTA */}
      <TodaysFocus />

      {/* Hero Metrics */}
      {metrics && <DashboardHeroMetrics metrics={metrics} />}

      {/* Main Content - Two Column on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Takes 2 columns on desktop */}
        <div className="lg:col-span-2 space-y-6">
          {/* Plan Editor */}
          {plan && (
            <TodayPlanEditor
              plan={plan}
              onAddTask={handleAddTask}
              onRemoveTask={handleRemoveTask}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              onStartSession={handleStartSession}
            />
          )}

          {/* Section 4: Active Problems */}
          <ActiveProblems />
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
    </div>
  )
}
