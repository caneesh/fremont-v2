/**
 * useDashboardData - Direct wire to existing data sources
 *
 * No invented models. Just reads from:
 * - problemHistoryService (localStorage: physiscaffold_problem_attempts)
 * - mistakeNotebook (localStorage: physiscaffold_mistake_cards)
 * - studyPathService (localStorage: physiscaffold_study_progress)
 * - todayPlanService (localStorage: physiscaffold_today_plan_*)
 */

import { useState, useEffect, useCallback } from 'react'
import { problemHistoryService } from '@/lib/problemHistory'
import { getCardsDue, getNotebookStats } from '@/lib/mistakeNotebook'
import { studyPathService } from '@/lib/studyPath/studyPathService'
import * as planService from '@/lib/dashboard/todayPlanService'
import { authService } from '@/lib/auth/authService'
import type { ProblemAttempt } from '@/types/history'
import type { MistakeCard, MistakeNotebookStats } from '@/types/mistakeNotebook'
import type { StudyStats } from '@/types/studyPath'
import type { TodayPlan } from '@/types/dashboard'

// ============================================================================
// Types - derived from existing data, not invented
// ============================================================================

export interface ContinueItem {
  problemId: string
  problemTitle: string
  route: string // Deep link to exact step
  lastActiveAt: string
  stepInfo: { current: number; total: number } | null
}

export interface ReviewQueueSummary {
  dueCount: number
  overdueCount: number
  route: string
  topCards: Array<{
    id: string
    problemTitle: string
    stepTitle: string
  }>
}

export interface ProgressSummary {
  problemsSolved: number
  problemsAttempted: number
  timeSpentMinutes: number
  // TODO: Add pattern mastery when pattern service exists
  patternsMastered: number | null // null = data not available yet
}

export interface DashboardData {
  // 1. Continue where you left off
  continueItem: ContinueItem | null

  // 2. Today's tasks
  todayPlan: TodayPlan | null

  // 3. Progress summary
  progress: ProgressSummary

  // 4. Review queue
  reviewQueue: ReviewQueueSummary

  // Meta
  isLoading: boolean
  userId: string
}

// ============================================================================
// Hook
// ============================================================================

export function useDashboardData(): DashboardData & { refresh: () => void } {
  const [isLoading, setIsLoading] = useState(true)
  const [continueItem, setContinueItem] = useState<ContinueItem | null>(null)
  const [todayPlan, setTodayPlan] = useState<TodayPlan | null>(null)
  const [progress, setProgress] = useState<ProgressSummary>({
    problemsSolved: 0,
    problemsAttempted: 0,
    timeSpentMinutes: 0,
    patternsMastered: null, // TODO: wire to pattern service
  })
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueSummary>({
    dueCount: 0,
    overdueCount: 0,
    route: '/mistake-notebook?review=true',
    topCards: [],
  })

  const userId = authService.getUser()?.userId || 'anonymous'

  const loadData = useCallback(() => {
    setIsLoading(true)

    try {
      // 1. Continue where you left off - from problemHistoryService
      const { attempts: inProgressAttempts } = problemHistoryService.getHistory({
        status: 'IN_PROGRESS',
        limit: 1,
      })

      if (inProgressAttempts.length > 0) {
        const attempt = inProgressAttempts[0]
        const stepInfo = parseStepInfo(attempt)

        setContinueItem({
          problemId: attempt.problemId,
          problemTitle: attempt.problemTitle,
          route: `/solve?problemId=${attempt.problemId}&resume=1`,
          lastActiveAt: attempt.lastOpenedAt || attempt.updatedAt,
          stepInfo,
        })
      } else {
        setContinueItem(null)
      }

      // 2. Today's plan - from todayPlanService
      const plan = planService.getOrCreatePlan(userId)
      if (plan && plan.tasks.length > 0) {
        setTodayPlan(plan)
      } else {
        setTodayPlan(null)
      }

      // 3. Progress summary - from studyPathService
      const stats: StudyStats = studyPathService.getStudyStats()
      setProgress({
        problemsSolved: stats.totalQuestionsSolved,
        problemsAttempted: stats.totalQuestionsAttempted,
        timeSpentMinutes: stats.totalTimeSpent,
        patternsMastered: null, // TODO: wire when pattern mastery tracking exists
      })

      // 4. Review queue - from mistakeNotebook
      const dueCards: MistakeCard[] = getCardsDue()
      const notebookStats: MistakeNotebookStats = getNotebookStats()

      setReviewQueue({
        dueCount: notebookStats.dueToday,
        overdueCount: notebookStats.overdue,
        route: '/mistake-notebook?review=true',
        topCards: dueCards.slice(0, 3).map(card => ({
          id: card.id,
          problemTitle: card.problemTitle,
          stepTitle: card.stepTitle,
        })),
      })
    } catch (error) {
      console.error('[useDashboardData] Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    continueItem,
    todayPlan,
    progress,
    reviewQueue,
    isLoading,
    userId,
    refresh: loadData,
  }
}

// ============================================================================
// Helpers
// ============================================================================

function parseStepInfo(attempt: ProblemAttempt): { current: number; total: number } | null {
  if (!attempt.draftSolution) return null

  try {
    const draft = JSON.parse(attempt.draftSolution)
    const stepProgress = draft.stepProgress as Array<{ isCompleted?: boolean }> | undefined

    if (!stepProgress || stepProgress.length === 0) return null

    const completedCount = stepProgress.filter(s => s.isCompleted).length
    return {
      current: completedCount + 1,
      total: stepProgress.length,
    }
  } catch {
    return null
  }
}

export default useDashboardData
