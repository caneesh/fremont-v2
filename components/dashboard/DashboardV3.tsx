'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import DashboardHeroMetrics from './DashboardHeroMetrics'
import TodayPlanEditor from './TodayPlanEditor'
import TaskPickerModal from './TaskPickerModal'
import WinsCard from './WinsCard'
import CoverageSummary from './CoverageSummary'
import { ProgressOverview } from './ProgressOverview'
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

      {/* Hero Metrics */}
      {metrics && <DashboardHeroMetrics metrics={metrics} />}

      {/* Main Content - Two Column on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Editor - Takes 2 columns on desktop */}
        <div className="lg:col-span-2">
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
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white dark:bg-dark-card rounded-xl p-5 shadow-md dark:shadow-dark-md border border-gray-100 dark:border-dark-border">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/solve')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors text-left"
              >
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                  Solve Custom Problem
                </span>
              </button>
              <button
                onClick={() => router.push('/mistake-notebook?review=true')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors text-left"
              >
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                  Review Mistakes
                </span>
              </button>
              <button
                onClick={() => router.push('/pattern-track')}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors text-left"
              >
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                  Pattern Tracks
                </span>
              </button>
            </div>
          </div>

          {/* Progress Overview */}
          <ProgressOverview />

          {/* Coverage Summary */}
          <CoverageSummary coverage={coverage} />
        </div>
      </div>

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
