/**
 * Dashboard Metrics Service
 *
 * Computes hero metrics from existing data sources:
 * - problemHistoryService for attempts and solutions
 * - studyPathService for topic progress
 */

import { problemHistoryService } from '@/lib/problemHistory'
import { studyPathService } from '@/lib/studyPath/studyPathService'
import type { DashboardMetrics, TopicCoverage } from '@/types/dashboard'
import type { ProblemAttempt } from '@/types/history'

/**
 * Get the date key for a timestamp (YYYY-MM-DD)
 */
function getDateKey(timestamp: string): string {
  return new Date(timestamp).toISOString().split('T')[0]
}

/**
 * Get date keys for the last N days
 */
function getLastNDays(n: number): string[] {
  const days: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < n; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    days.push(date.toISOString().split('T')[0])
  }

  return days
}

/**
 * Filter attempts within a date range
 */
function filterAttemptsByDateRange(
  attempts: ProblemAttempt[],
  startDate: string,
  endDate: string
): ProblemAttempt[] {
  return attempts.filter(attempt => {
    const attemptDate = getDateKey(attempt.createdAt)
    return attemptDate >= startDate && attemptDate <= endDate
  })
}

/**
 * Calculate average max hint level from attempts
 * Uses stepProgress.currentHintLevel from problem progress
 */
function calculateAvgMaxHintLevel(attempts: ProblemAttempt[]): number {
  if (attempts.length === 0) return 0

  let totalMaxHint = 0
  let countWithHints = 0

  for (const attempt of attempts) {
    // Load progress to get hint levels
    const progress = attempt.status === 'SOLVED'
      ? problemHistoryService.loadFinalSolution(attempt.id)
      : problemHistoryService.loadDraft(attempt.id)

    if (progress?.stepProgress) {
      const stepHintLevels = Object.values(progress.stepProgress)
        .map(sp => sp.currentHintLevel || 0)

      if (stepHintLevels.length > 0) {
        const maxHint = Math.max(...stepHintLevels)
        totalMaxHint += maxHint
        countWithHints++
      }
    }
  }

  return countWithHints > 0 ? totalMaxHint / countWithHints : 0
}

/**
 * Compute dashboard hero metrics
 */
export function computeDashboardMetrics(): DashboardMetrics {
  const allAttempts = problemHistoryService.listAllAttempts()
  const last7Days = getLastNDays(7)
  const prev7Days = getLastNDays(14).slice(7) // Days 8-14

  const today = last7Days[0]
  const weekAgo = last7Days[6]
  const twoWeeksAgo = prev7Days[6]

  // Filter attempts for each period
  const thisWeekAttempts = filterAttemptsByDateRange(allAttempts, weekAgo, today)
  const prevWeekAttempts = filterAttemptsByDateRange(allAttempts, twoWeeksAgo, last7Days[6])

  // Days practiced - unique dates with attempts
  const daysWithAttempts = new Set(
    thisWeekAttempts.map(a => getDateKey(a.createdAt))
  )
  const daysPracticed = daysWithAttempts.size

  // Problems solved
  const thisWeekSolved = thisWeekAttempts.filter(a => a.status === 'SOLVED').length
  const prevWeekSolved = prevWeekAttempts.filter(a => a.status === 'SOLVED').length
  const problemsSolvedChange = thisWeekSolved - prevWeekSolved

  // Average max hint level
  const thisWeekAvgHint = calculateAvgMaxHintLevel(thisWeekAttempts)
  const prevWeekAvgHint = calculateAvgMaxHintLevel(prevWeekAttempts)
  const avgMaxHintLevelChange = thisWeekAvgHint - prevWeekAvgHint

  // Topics touched - get from study stats
  const studyStats = studyPathService.getStudyStats()
  const topicsTouched: string[] = []

  for (const [topicId, progress] of Object.entries(studyStats.topicProgress)) {
    if (progress.lastAccessedAt) {
      const accessDate = getDateKey(progress.lastAccessedAt)
      if (last7Days.includes(accessDate)) {
        topicsTouched.push(topicId)
      }
    }
  }

  return {
    daysPracticed,
    totalDays: 7,
    problemsSolved: thisWeekSolved,
    problemsSolvedChange,
    avgMaxHintLevel: Math.round(thisWeekAvgHint * 10) / 10,
    avgMaxHintLevelChange: Math.round(avgMaxHintLevelChange * 10) / 10,
    topicsTouched,
    computedAt: new Date().toISOString(),
  }
}

/**
 * Get topic coverage summary for the week
 */
export function getTopicCoverage(): TopicCoverage[] {
  const studyStats = studyPathService.getStudyStats()
  const last7Days = getLastNDays(7)
  const coverage: TopicCoverage[] = []

  // Get topic names from studyPathService
  const topics = studyPathService.getAllTopics()
  const topicNameMap = new Map(topics.map(t => [t.id, t.name]))

  for (const [topicId, progress] of Object.entries(studyStats.topicProgress)) {
    if (progress.lastAccessedAt) {
      const accessDate = getDateKey(progress.lastAccessedAt)
      if (last7Days.includes(accessDate)) {
        coverage.push({
          topicId,
          topicName: topicNameMap.get(topicId) || topicId,
          questionsAttempted: progress.questionsAttempted.length,
          questionsSolved: progress.questionsSolved.length,
          lastAccessedAt: progress.lastAccessedAt,
        })
      }
    }
  }

  // Sort by last accessed (most recent first)
  coverage.sort((a, b) =>
    new Date(b.lastAccessedAt).getTime() - new Date(a.lastAccessedAt).getTime()
  )

  return coverage
}

/**
 * Get a "wins" message for the dashboard
 */
export function getWinsMessage(metrics: DashboardMetrics): string | null {
  if (metrics.problemsSolvedChange > 0) {
    return `Solved +${metrics.problemsSolvedChange} vs last week!`
  }

  if (metrics.avgMaxHintLevelChange < -0.5) {
    return `Using fewer hints than last week!`
  }

  if (metrics.daysPracticed >= 5) {
    return `${metrics.daysPracticed}/7 days practiced this week!`
  }

  if (metrics.problemsSolved > 0) {
    return `${metrics.problemsSolved} problems solved this week!`
  }

  return null
}
