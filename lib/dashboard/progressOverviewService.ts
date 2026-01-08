/**
 * Progress Overview Service
 *
 * Computes progress data for the dashboard:
 * - Pattern mastery from Study Plan v2
 * - Confidence distribution from step attempts
 * - Sanity check completion rate from event logs
 */

import type {
  ProgressOverviewData,
  PatternMasteryItem,
  PatternState,
  ConfidenceDistribution,
  SanityCheckStats,
  MasteryLevel,
} from '@/types/progressOverview'
import { masteryToLevel } from '@/types/progressOverview'
import { studyPlanV2Service } from '@/lib/studyPlanV2/studyPlanV2Service'
import type { UserPatternState, Pattern } from '@/types/studyPlanV2'

// Storage key for sanity check events
const SANITY_CHECK_STORAGE_KEY = 'physiscaffold_sanity_checks'

/**
 * Determine the pattern state based on user progress
 */
function determinePatternState(
  pattern: Pattern,
  state: UserPatternState
): PatternState {
  // Not started - no engagement
  if (!state.learnCompleted && state.totalAttempts === 0) {
    return 'not_started'
  }

  // Learning phase
  if (!state.learnCompleted) {
    return 'learning'
  }

  // Practicing phase
  if (!state.guidedPracticeCompleted) {
    return 'practicing'
  }

  // Check if needs review (due for SRS or mastery declining)
  const now = new Date().toISOString()
  if (state.reviewDueAt <= now || state.recentFailCount > 2 || state.mastery < 0.4) {
    return 'needs_review'
  }

  // Stable - completed and not due
  return 'stable'
}

/**
 * Determine trend based on recent performance
 */
function determineTrend(state: UserPatternState): 'improving' | 'stable' | 'declining' {
  if (state.recentFailCount > 2) return 'declining'
  if (state.mastery > 0.6 && state.recentFailCount === 0) return 'improving'
  return 'stable'
}

/**
 * Get pattern mastery items from Study Plan v2
 */
function getPatternMasteryItems(userId: string): PatternMasteryItem[] {
  const patterns = studyPlanV2Service.getAllPatterns()
  const items: PatternMasteryItem[] = []

  for (const pattern of patterns) {
    const state = studyPlanV2Service.getPatternState(userId, pattern.id)
    const patternState = determinePatternState(pattern, state)
    const trend = determineTrend(state)

    // Get problem counts (simplified - would come from content repo)
    const problems = studyPlanV2Service.getProblemsByPattern(pattern.id)

    items.push({
      patternId: pattern.id,
      patternName: pattern.name,
      state: patternState,
      masteryLevel: masteryToLevel(state.mastery),
      masteryScore: state.mastery,
      problemsCompleted: state.totalCorrect,
      problemsTotal: problems.length || 5, // Default if no problems loaded
      needsAttention: patternState === 'needs_review' || state.mastery < 0.4,
      trend,
      lastPracticed: state.lastSeenAt,
    })
  }

  // Sort by priority: needs_review first, then by state, then by mastery
  return items.sort((a, b) => {
    const stateOrder: Record<PatternState, number> = {
      'needs_review': 0,
      'learning': 1,
      'practicing': 2,
      'not_started': 3,
      'stable': 4,
    }

    const stateCompare = stateOrder[a.state] - stateOrder[b.state]
    if (stateCompare !== 0) return stateCompare

    // Within same state, sort by mastery (lowest first for attention)
    return a.masteryScore - b.masteryScore
  })
}

/**
 * Get confidence distribution from step attempts
 */
function getConfidenceDistribution(userId: string): ConfidenceDistribution {
  // Try to get from localStorage step attempts
  if (typeof window === 'undefined') {
    return { low: 0, medium: 0, high: 0, total: 0 }
  }

  try {
    const key = 'physiscaffold_v2_step_attempts'
    const stored = localStorage.getItem(key)
    if (!stored) {
      return { low: 0, medium: 0, high: 0, total: 0 }
    }

    const attempts = JSON.parse(stored) as Array<{
      userId: string
      confidenceRating?: 'low' | 'medium' | 'high'
      attemptedAt: string
    }>

    // Filter to user and last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString()

    const recent = attempts.filter(a =>
      a.userId === userId &&
      a.confidenceRating &&
      a.attemptedAt >= cutoff
    )

    const distribution: ConfidenceDistribution = {
      low: 0,
      medium: 0,
      high: 0,
      total: recent.length,
    }

    for (const attempt of recent) {
      if (attempt.confidenceRating === 'low') distribution.low++
      else if (attempt.confidenceRating === 'medium') distribution.medium++
      else if (attempt.confidenceRating === 'high') distribution.high++
    }

    return distribution
  } catch {
    return { low: 0, medium: 0, high: 0, total: 0 }
  }
}

/**
 * Get sanity check completion stats from event logs
 */
function getSanityCheckStats(userId: string): SanityCheckStats {
  if (typeof window === 'undefined') {
    return { completed: 0, total: 0, percentage: 0 }
  }

  try {
    // Check stored events
    const eventsKey = 'physiscaffold_events'
    const stored = localStorage.getItem(eventsKey)
    if (!stored) {
      return { completed: 0, total: 0, percentage: 0 }
    }

    const events = JSON.parse(stored) as Array<{
      type: string
      userId?: string
      timestamp: string
    }>

    // Filter to user and sanity check related events
    const sanityEvents = events.filter(e =>
      (e.userId === userId || !e.userId) &&
      (e.type === 'sanity_check_completed' || e.type === 'problem_marked_solved')
    )

    // Count sanity checks completed vs problems solved
    const completed = sanityEvents.filter(e => e.type === 'sanity_check_completed').length
    const total = sanityEvents.filter(e => e.type === 'problem_marked_solved').length

    // If we have more sanity checks than problems, use problem count
    const adjustedTotal = Math.max(total, completed)
    const percentage = adjustedTotal > 0 ? Math.round((completed / adjustedTotal) * 100) : 0

    return {
      completed,
      total: adjustedTotal,
      percentage,
    }
  } catch {
    return { completed: 0, total: 0, percentage: 0 }
  }
}

/**
 * Compute complete progress overview data
 */
export function computeProgressOverview(userId: string): ProgressOverviewData {
  const patterns = getPatternMasteryItems(userId)
  const confidenceDistribution = getConfidenceDistribution(userId)
  const sanityCheckStats = getSanityCheckStats(userId)

  // Compute summary
  const totalPatterns = patterns.length
  const stablePatterns = patterns.filter(p => p.state === 'stable').length
  const patternsNeedingReview = patterns.filter(p => p.state === 'needs_review').length

  const totalMastery = patterns.reduce((sum, p) => sum + p.masteryScore, 0)
  const averageMastery = totalPatterns > 0 ? totalMastery / totalPatterns : 0

  return {
    patterns,
    confidenceDistribution,
    sanityCheckStats,
    summary: {
      totalPatterns,
      stablePatterns,
      patternsNeedingReview,
      averageMastery,
    },
    isLoading: false,
    computedAt: new Date().toISOString(),
  }
}

/**
 * Get empty state for new users
 */
export function getEmptyProgressOverview(): ProgressOverviewData {
  return {
    patterns: [],
    confidenceDistribution: { low: 0, medium: 0, high: 0, total: 0 },
    sanityCheckStats: { completed: 0, total: 0, percentage: 0 },
    summary: {
      totalPatterns: 0,
      stablePatterns: 0,
      patternsNeedingReview: 0,
      averageMastery: 0,
    },
    isLoading: false,
    computedAt: new Date().toISOString(),
  }
}
