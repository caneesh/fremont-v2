/**
 * Adaptive Scaffold Density Calculator
 *
 * Analyzes user's recent performance events to recommend
 * an appropriate scaffold density level.
 *
 * Logic:
 * - High hint usage + low success rate → density 1-2 (more guidance)
 * - Moderate performance → density 3 (balanced)
 * - Low hint usage + high success rate → density 4-5 (advanced)
 */

import { eventLogger } from './storage/eventLogger'
import type { ScaffoldDensity } from '@/types/scaffold'
import type { StoredEvent } from './storage/types'

interface PerformanceMetrics {
  totalProblems: number
  problemsSolved: number
  avgHintsPerProblem: number
  avgAttemptsPerStep: number
  taskSuccessRate: number
  recentTrend: 'improving' | 'stable' | 'struggling'
}

interface DensityRecommendation {
  recommended: ScaffoldDensity
  confidence: 'low' | 'medium' | 'high'
  reason: string
  metrics: PerformanceMetrics
}

/**
 * Calculate performance metrics from recent events
 */
function calculateMetrics(events: StoredEvent[]): PerformanceMetrics {
  // Group events by problem
  const problemEvents = new Map<string, StoredEvent[]>()

  for (const event of events) {
    const problemId = event.metadata.problemId
    if (problemId) {
      if (!problemEvents.has(problemId)) {
        problemEvents.set(problemId, [])
      }
      problemEvents.get(problemId)!.push(event)
    }
  }

  // Calculate per-problem metrics
  let totalHints = 0
  let totalStepAttempts = 0
  let totalTasksAttempted = 0
  let totalTasksCorrect = 0
  let problemsSolved = 0

  for (const [, evts] of problemEvents) {
    const hintsUsed = evts.filter(e =>
      e.type === 'hint_unlocked' || e.type === 'hint_viewed'
    ).length

    const stepFails = evts.filter(e => e.type === 'step_failed').length
    const taskCorrect = evts.filter(e => e.type === 'task_correct').length
    const taskIncorrect = evts.filter(e => e.type === 'task_incorrect').length
    const solved = evts.some(e => e.type === 'problem_marked_solved')

    totalHints += hintsUsed
    totalStepAttempts += stepFails
    totalTasksAttempted += taskCorrect + taskIncorrect
    totalTasksCorrect += taskCorrect
    if (solved) problemsSolved++
  }

  const totalProblems = problemEvents.size
  const avgHintsPerProblem = totalProblems > 0 ? totalHints / totalProblems : 0
  const avgAttemptsPerStep = totalProblems > 0 ? totalStepAttempts / totalProblems : 0
  const taskSuccessRate = totalTasksAttempted > 0
    ? totalTasksCorrect / totalTasksAttempted
    : 0.5 // Default to 50% if no data

  // Calculate trend from recent vs older problems
  const recentProblems = Array.from(problemEvents.entries())
    .sort((a, b) => {
      const aTime = a[1][0]?.timestamp || ''
      const bTime = b[1][0]?.timestamp || ''
      return bTime.localeCompare(aTime)
    })
    .slice(0, 3)

  const olderProblems = Array.from(problemEvents.entries())
    .sort((a, b) => {
      const aTime = a[1][0]?.timestamp || ''
      const bTime = b[1][0]?.timestamp || ''
      return bTime.localeCompare(aTime)
    })
    .slice(3, 6)

  let recentTrend: 'improving' | 'stable' | 'struggling' = 'stable'

  if (recentProblems.length >= 2 && olderProblems.length >= 2) {
    const recentHintAvg = recentProblems.reduce((sum, [, evts]) =>
      sum + evts.filter(e => e.type === 'hint_unlocked').length, 0
    ) / recentProblems.length

    const olderHintAvg = olderProblems.reduce((sum, [, evts]) =>
      sum + evts.filter(e => e.type === 'hint_unlocked').length, 0
    ) / olderProblems.length

    if (recentHintAvg < olderHintAvg * 0.7) {
      recentTrend = 'improving'
    } else if (recentHintAvg > olderHintAvg * 1.3) {
      recentTrend = 'struggling'
    }
  }

  return {
    totalProblems,
    problemsSolved,
    avgHintsPerProblem,
    avgAttemptsPerStep,
    taskSuccessRate,
    recentTrend
  }
}

/**
 * Calculate recommended density from metrics
 */
function recommendFromMetrics(metrics: PerformanceMetrics): DensityRecommendation {
  const {
    totalProblems,
    avgHintsPerProblem,
    taskSuccessRate,
    recentTrend
  } = metrics

  // Not enough data - default to balanced
  if (totalProblems < 2) {
    return {
      recommended: 3,
      confidence: 'low',
      reason: 'Not enough problem history for personalized recommendation',
      metrics
    }
  }

  // Score calculation (higher = more advanced)
  let score = 3 // Start at balanced

  // Hint usage factor (-1 to +1)
  // < 3 hints avg = advanced, > 8 hints avg = needs more guidance
  const hintFactor = avgHintsPerProblem < 3 ? 1
    : avgHintsPerProblem < 5 ? 0.5
    : avgHintsPerProblem < 8 ? 0
    : avgHintsPerProblem < 12 ? -0.5
    : -1

  // Task success factor (-1 to +1)
  const successFactor = taskSuccessRate > 0.85 ? 1
    : taskSuccessRate > 0.7 ? 0.5
    : taskSuccessRate > 0.5 ? 0
    : taskSuccessRate > 0.3 ? -0.5
    : -1

  // Trend factor (-0.5 to +0.5)
  const trendFactor = recentTrend === 'improving' ? 0.5
    : recentTrend === 'struggling' ? -0.5
    : 0

  // Calculate final score
  score += hintFactor + successFactor + trendFactor

  // Clamp to 1-5 and round
  const recommended = Math.round(Math.max(1, Math.min(5, score))) as ScaffoldDensity

  // Determine confidence based on data volume
  const confidence = totalProblems >= 10 ? 'high'
    : totalProblems >= 5 ? 'medium'
    : 'low'

  // Generate reason
  let reason = ''
  if (recommended <= 2) {
    reason = 'Based on your recent activity, more detailed scaffolding may help'
    if (avgHintsPerProblem > 8) {
      reason += ' - you\'ve been using many hints'
    }
    if (taskSuccessRate < 0.5) {
      reason += ' - task accuracy suggests more guidance needed'
    }
  } else if (recommended >= 4) {
    reason = 'You\'re doing great! Fewer steps should provide the right challenge'
    if (avgHintsPerProblem < 3) {
      reason += ' - minimal hint usage shows strong understanding'
    }
    if (taskSuccessRate > 0.85) {
      reason += ' - high accuracy on tasks'
    }
  } else {
    reason = 'Balanced scaffolding matches your current performance level'
  }

  if (recentTrend === 'improving') {
    reason += ' (trending upward!)'
  } else if (recentTrend === 'struggling') {
    reason += ' (recent challenges detected)'
  }

  return {
    recommended,
    confidence,
    reason,
    metrics
  }
}

/**
 * Get adaptive density recommendation based on user's event history
 *
 * @param limit Number of recent events to analyze (default 200)
 * @returns Density recommendation with reasoning
 */
export function getAdaptiveDensity(limit: number = 200): DensityRecommendation {
  // Get recent events
  const result = eventLogger.getRecentEvents(limit)

  if (!result.success || !result.data || result.data.length === 0) {
    return {
      recommended: 3,
      confidence: 'low',
      reason: 'No performance history available yet',
      metrics: {
        totalProblems: 0,
        problemsSolved: 0,
        avgHintsPerProblem: 0,
        avgAttemptsPerStep: 0,
        taskSuccessRate: 0.5,
        recentTrend: 'stable'
      }
    }
  }

  const metrics = calculateMetrics(result.data)
  return recommendFromMetrics(metrics)
}

/**
 * Get just the recommended density value (convenience function)
 */
export function getRecommendedDensity(): ScaffoldDensity {
  return getAdaptiveDensity().recommended
}

/**
 * Check if user should see adaptive density suggestion
 * (Only show if they have enough history and haven't set a preference)
 */
export function shouldShowAdaptiveSuggestion(
  userPreferenceDensity: ScaffoldDensity | undefined,
  minProblemsForSuggestion: number = 3
): boolean {
  if (userPreferenceDensity !== undefined) {
    // User has explicitly set a preference
    return false
  }

  const recommendation = getAdaptiveDensity()
  return recommendation.metrics.totalProblems >= minProblemsForSuggestion
}
