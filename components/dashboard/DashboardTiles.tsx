'use client'

/**
 * DashboardTiles - Four focused tiles linking to exact screens
 *
 * 1. Continue where you left off → /solve?problemId=X&resume=1
 * 2. Today's tasks → plan tasks or /pattern-track
 * 3. Progress summary → stats display
 * 4. Review queue → /mistake-notebook?review=true
 */

import Link from 'next/link'
import { useDashboardData } from '@/hooks/useDashboardData'
import * as planService from '@/lib/dashboard/todayPlanService'
import type { PlanTask } from '@/types/dashboard'

export default function DashboardTiles() {
  const {
    continueItem,
    todayPlan,
    progress,
    reviewQueue,
    isLoading,
  } = useDashboardData()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white dark:bg-dark-card rounded-xl p-6 animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-dark-card-soft rounded w-1/2 mb-4" />
            <div className="h-4 bg-gray-200 dark:bg-dark-card-soft rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Tile 1: Continue where you left off */}
      <ContinueTile continueItem={continueItem} />

      {/* Tile 2: Today's Tasks */}
      <TodayTasksTile plan={todayPlan} />

      {/* Tile 3: Progress Summary */}
      <ProgressTile progress={progress} />

      {/* Tile 4: Review Queue */}
      <ReviewQueueTile reviewQueue={reviewQueue} />
    </div>
  )
}

// ============================================================================
// Tile 1: Continue
// ============================================================================

interface ContinueTileProps {
  continueItem: {
    problemId: string
    problemTitle: string
    route: string
    lastActiveAt: string
    stepInfo: { current: number; total: number } | null
  } | null
}

function ContinueTile({ continueItem }: ContinueTileProps) {
  if (!continueItem) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-dark-card-soft flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Continue</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-dark-text-muted mb-4">
          No problem in progress
        </p>
        <Link
          href="/pattern-track"
          className="inline-flex items-center text-sm text-accent hover:underline"
        >
          Start a new problem →
        </Link>
      </div>
    )
  }

  const timeAgo = getTimeAgo(continueItem.lastActiveAt)

  return (
    <Link
      href={continueItem.route}
      className="bg-accent/5 dark:bg-accent/10 rounded-xl border-2 border-accent p-6 hover:bg-accent/10 dark:hover:bg-accent/20 transition-colors group"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="font-semibold text-accent">Continue</h3>
      </div>
      <p className="text-gray-900 dark:text-dark-text-primary font-medium mb-1 line-clamp-1">
        {continueItem.problemTitle}
      </p>
      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-dark-text-muted">
        {continueItem.stepInfo && (
          <span>Step {continueItem.stepInfo.current}/{continueItem.stepInfo.total}</span>
        )}
        <span>• {timeAgo}</span>
      </div>
      <div className="mt-3 text-sm text-accent font-medium group-hover:underline">
        Resume →
      </div>
    </Link>
  )
}

// ============================================================================
// Tile 2: Today's Tasks
// ============================================================================

interface TodayTasksTileProps {
  plan: {
    tasks: PlanTask[]
    activeTaskIndex: number
    dateKey: string
  } | null
}

function TodayTasksTile({ plan }: TodayTasksTileProps) {
  if (!plan || plan.tasks.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-dark-card-soft flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Today&apos;s Tasks</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-dark-text-muted mb-4">
          No tasks planned for today
        </p>
        <Link
          href="/pattern-track"
          className="inline-flex items-center text-sm text-accent hover:underline"
        >
          Add a task →
        </Link>
      </div>
    )
  }

  const completedCount = plan.tasks.filter(t => t.completed).length
  const nextTask = plan.tasks[plan.activeTaskIndex]
  const nextTaskRoute = nextTask ? planService.getTaskRoute(nextTask) : '/pattern-track'

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Today&apos;s Tasks</h3>
        </div>
        <span className="text-sm text-gray-500 dark:text-dark-text-muted">
          {completedCount}/{plan.tasks.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 dark:bg-dark-card-soft rounded-full h-2 mb-4">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all"
          style={{ width: `${(completedCount / plan.tasks.length) * 100}%` }}
        />
      </div>

      {/* Task list preview */}
      <ul className="space-y-2 mb-4">
        {plan.tasks.slice(0, 3).map((task, i) => (
          <li key={task.id} className="flex items-center gap-2 text-sm">
            {task.completed ? (
              <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : i === plan.activeTaskIndex ? (
              <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-300 dark:text-dark-border flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth={2} />
              </svg>
            )}
            <span className={`truncate ${task.completed ? 'line-through text-gray-400' : 'text-gray-700 dark:text-dark-text-secondary'}`}>
              {task.title}
            </span>
          </li>
        ))}
      </ul>

      {nextTask && !nextTask.completed && (
        <Link
          href={nextTaskRoute}
          className="inline-flex items-center text-sm text-accent font-medium hover:underline"
        >
          Start: {nextTask.title} →
        </Link>
      )}
    </div>
  )
}

// ============================================================================
// Tile 3: Progress Summary
// ============================================================================

interface ProgressTileProps {
  progress: {
    problemsSolved: number
    problemsAttempted: number
    timeSpentMinutes: number
    patternsMastered: number | null
  }
}

function ProgressTile({ progress }: ProgressTileProps) {
  const successRate = progress.problemsAttempted > 0
    ? Math.round((progress.problemsSolved / progress.problemsAttempted) * 100)
    : 0

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Progress</h3>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
            {progress.problemsSolved}
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-text-muted">Problems Solved</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
            {successRate}%
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-text-muted">Success Rate</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
            {progress.timeSpentMinutes}m
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-text-muted">Time Spent</p>
        </div>
        <div>
          {progress.patternsMastered !== null ? (
            <>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                {progress.patternsMastered}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Patterns Mastered</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-300 dark:text-dark-text-muted">—</p>
              {/* TODO: Wire to pattern mastery service */}
              <p className="text-xs text-gray-400 dark:text-dark-text-muted">Patterns (TODO)</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Tile 4: Review Queue
// ============================================================================

interface ReviewQueueTileProps {
  reviewQueue: {
    dueCount: number
    overdueCount: number
    route: string
    topCards: Array<{
      id: string
      problemTitle: string
      stepTitle: string
    }>
  }
}

function ReviewQueueTile({ reviewQueue }: ReviewQueueTileProps) {
  const hasReviews = reviewQueue.dueCount > 0

  if (!hasReviews) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-dark-card-soft flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Review Queue</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-dark-text-muted mb-4">
          No reviews due. Nice work!
        </p>
        <Link
          href="/mistake-notebook"
          className="inline-flex items-center text-sm text-accent hover:underline"
        >
          View notebook →
        </Link>
      </div>
    )
  }

  const isUrgent = reviewQueue.overdueCount > 0

  return (
    <Link
      href={reviewQueue.route}
      className={`rounded-xl border-2 p-6 transition-colors group ${
        isUrgent
          ? 'bg-orange-50 dark:bg-orange-900/10 border-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/20'
          : 'bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border hover:border-accent'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isUrgent
              ? 'bg-orange-200 dark:bg-orange-900/30'
              : 'bg-purple-100 dark:bg-purple-900/30'
          }`}>
            <svg className={`w-5 h-5 ${isUrgent ? 'text-orange-600' : 'text-purple-600 dark:text-purple-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className={`font-semibold ${isUrgent ? 'text-orange-700 dark:text-orange-400' : 'text-gray-900 dark:text-dark-text-primary'}`}>
            Review Queue
          </h3>
        </div>
        <span className={`text-lg font-bold ${isUrgent ? 'text-orange-600' : 'text-purple-600 dark:text-purple-400'}`}>
          {reviewQueue.dueCount}
        </span>
      </div>

      {reviewQueue.overdueCount > 0 && (
        <p className="text-sm text-orange-600 dark:text-orange-400 mb-3">
          {reviewQueue.overdueCount} overdue!
        </p>
      )}

      {reviewQueue.topCards.length > 0 && (
        <ul className="space-y-1 mb-3">
          {reviewQueue.topCards.map(card => (
            <li key={card.id} className="text-sm text-gray-600 dark:text-dark-text-secondary truncate">
              • {card.problemTitle}: {card.stepTitle}
            </li>
          ))}
        </ul>
      )}

      <div className={`text-sm font-medium group-hover:underline ${isUrgent ? 'text-orange-600' : 'text-accent'}`}>
        Start review →
      </div>
    </Link>
  )
}

// ============================================================================
// Helpers
// ============================================================================

function getTimeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
