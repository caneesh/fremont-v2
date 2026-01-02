/**
 * Independence Metrics Service
 *
 * Tracks and computes independence metrics for learning analytics.
 * Independence = ability to solve problems without hints/reveals.
 *
 * Key metrics:
 * - Independence Score: 0-100 based on hint usage
 * - Trend: improving/stable/declining over time
 * - Per-topic breakdown
 */

import { problemHistoryService } from '@/lib/problemHistory'
import type { ProblemAttempt, ProblemProgress, StepProgress } from '@/types/history'

/**
 * Independence score for a single problem attempt
 */
export interface ProblemIndependenceScore {
  attemptId: string
  problemTitle: string
  /** Score 0-100 */
  score: number
  /** Max hint level used across all steps (0-5) */
  maxHintLevel: number
  /** Number of steps where reveals were used */
  stepsRevealed: number
  /** Total steps in the problem */
  totalSteps: number
  /** Time spent in seconds */
  timeSpentSeconds: number
  /** When the attempt was made */
  attemptedAt: string
  /** Topic if available */
  topicId?: string
}

/**
 * Aggregated independence metrics
 */
export interface IndependenceMetrics {
  /** Overall independence score (0-100) */
  overallScore: number
  /** Trend over last 2 weeks */
  trend: 'improving' | 'stable' | 'declining'
  /** Change in score from last week */
  weeklyChange: number
  /** Problems solved with high independence (score >= 70) */
  highIndependenceCount: number
  /** Problems solved with hints (score 30-69) */
  assistedCount: number
  /** Problems where student struggled (score < 30) */
  struggleCount: number
  /** Total problems analyzed */
  totalProblems: number
  /** Per-day breakdown for the last 7 days */
  dailyScores: Array<{
    date: string
    score: number
    count: number
  }>
  /** Per-topic breakdown */
  topicBreakdown: Array<{
    topicId: string
    topicName: string
    score: number
    count: number
  }>
}

/**
 * Calculate independence score for a single step
 * Lower hint levels = higher independence
 */
function calculateStepScore(stepProgress: StepProgress): number {
  const hintLevel = stepProgress.currentHintLevel || 0

  // Score based on hint level (5 levels: 0-4)
  // Level 0 (no hints) = 100
  // Level 1 (slight nudge) = 85
  // Level 2 (conceptual hint) = 70
  // Level 3 (structured guidance) = 50
  // Level 4 (detailed walkthrough) = 25
  // Level 5 (solution shown) = 0
  const scoreByLevel = [100, 85, 70, 50, 25, 0]
  return scoreByLevel[Math.min(hintLevel, 5)] || 0
}

/**
 * Calculate independence score for a problem attempt
 */
export function calculateProblemIndependence(
  attempt: ProblemAttempt,
  progress: ProblemProgress | null
): ProblemIndependenceScore {
  if (!progress || !progress.stepProgress) {
    return {
      attemptId: attempt.id,
      problemTitle: attempt.problemTitle,
      score: 0,
      maxHintLevel: 0,
      stepsRevealed: 0,
      totalSteps: 0,
      timeSpentSeconds: 0,
      attemptedAt: attempt.createdAt,
    }
  }

  const stepEntries = Object.values(progress.stepProgress)
  const totalSteps = stepEntries.length

  if (totalSteps === 0) {
    return {
      attemptId: attempt.id,
      problemTitle: attempt.problemTitle,
      score: 100, // No steps = no hints needed
      maxHintLevel: 0,
      stepsRevealed: 0,
      totalSteps: 0,
      timeSpentSeconds: 0,
      attemptedAt: attempt.createdAt,
    }
  }

  // Calculate per-step scores
  const stepScores = stepEntries.map(calculateStepScore)
  const avgScore = stepScores.reduce((a, b) => a + b, 0) / stepScores.length

  // Count steps where full solution was revealed (hint level 5)
  const stepsRevealed = stepEntries.filter(sp => (sp.currentHintLevel || 0) >= 5).length

  // Find max hint level
  const maxHintLevel = Math.max(...stepEntries.map(sp => sp.currentHintLevel || 0))

  // Estimate time spent (if we have timing metadata)
  let timeSpentSeconds = 0
  if (progress.timeSpentMs) {
    timeSpentSeconds = Math.round(progress.timeSpentMs / 1000)
  }

  return {
    attemptId: attempt.id,
    problemTitle: attempt.problemTitle,
    score: Math.round(avgScore),
    maxHintLevel,
    stepsRevealed,
    totalSteps,
    timeSpentSeconds,
    attemptedAt: attempt.createdAt,
  }
}

/**
 * Get date key from timestamp
 */
function getDateKey(timestamp: string): string {
  return new Date(timestamp).toISOString().split('T')[0]
}

/**
 * Get last N days as date keys
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
 * Compute aggregated independence metrics
 */
export function computeIndependenceMetrics(): IndependenceMetrics {
  const allAttempts = problemHistoryService.listAllAttempts()
  const last7Days = getLastNDays(7)
  const prev7Days = getLastNDays(14).slice(7)

  // Calculate independence scores for all attempts
  const allScores: ProblemIndependenceScore[] = []

  for (const attempt of allAttempts) {
    if (attempt.status !== 'SOLVED') continue

    const progress = problemHistoryService.loadFinalSolution(attempt.id)
    const score = calculateProblemIndependence(attempt, progress)
    allScores.push(score)
  }

  // Filter by date ranges
  const thisWeekScores = allScores.filter(s => {
    const date = getDateKey(s.attemptedAt)
    return last7Days.includes(date)
  })

  const prevWeekScores = allScores.filter(s => {
    const date = getDateKey(s.attemptedAt)
    return prev7Days.includes(date)
  })

  // Calculate overall score (this week)
  const overallScore = thisWeekScores.length > 0
    ? Math.round(thisWeekScores.reduce((sum, s) => sum + s.score, 0) / thisWeekScores.length)
    : 0

  // Calculate previous week score
  const prevWeekScore = prevWeekScores.length > 0
    ? Math.round(prevWeekScores.reduce((sum, s) => sum + s.score, 0) / prevWeekScores.length)
    : 0

  // Determine trend
  const weeklyChange = overallScore - prevWeekScore
  let trend: 'improving' | 'stable' | 'declining' = 'stable'
  if (weeklyChange >= 5) trend = 'improving'
  else if (weeklyChange <= -5) trend = 'declining'

  // Count by independence level
  const highIndependenceCount = thisWeekScores.filter(s => s.score >= 70).length
  const assistedCount = thisWeekScores.filter(s => s.score >= 30 && s.score < 70).length
  const struggleCount = thisWeekScores.filter(s => s.score < 30).length

  // Daily breakdown
  const dailyScores = last7Days.map(date => {
    const dayScores = thisWeekScores.filter(s => getDateKey(s.attemptedAt) === date)
    return {
      date,
      score: dayScores.length > 0
        ? Math.round(dayScores.reduce((sum, s) => sum + s.score, 0) / dayScores.length)
        : 0,
      count: dayScores.length,
    }
  })

  // Topic breakdown (would need topic info from problems)
  const topicBreakdown: IndependenceMetrics['topicBreakdown'] = []
  const topicGroups = new Map<string, ProblemIndependenceScore[]>()

  for (const score of thisWeekScores) {
    if (score.topicId) {
      const existing = topicGroups.get(score.topicId) || []
      existing.push(score)
      topicGroups.set(score.topicId, existing)
    }
  }

  for (const [topicId, scores] of topicGroups) {
    topicBreakdown.push({
      topicId,
      topicName: topicId, // Would need to look up actual name
      score: Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length),
      count: scores.length,
    })
  }

  return {
    overallScore,
    trend,
    weeklyChange,
    highIndependenceCount,
    assistedCount,
    struggleCount,
    totalProblems: thisWeekScores.length,
    dailyScores,
    topicBreakdown,
  }
}

/**
 * Get independence score label
 */
export function getIndependenceLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  if (score >= 20) return 'Needs Practice'
  return 'Getting Started'
}

/**
 * Get color class for independence score
 */
export function getIndependenceColor(score: number): string {
  if (score >= 80) return 'text-green-600 dark:text-green-400'
  if (score >= 60) return 'text-blue-600 dark:text-blue-400'
  if (score >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}
