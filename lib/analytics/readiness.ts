/**
 * Phase 8: Analytics & Readiness Scoring
 *
 * Interpretable, defensible metrics for students and parents.
 * No vanity scores - only actionable insights.
 */

import { prisma } from '@/lib/db'
import { Track, AttemptOutcome } from '@prisma/client'

// =============================================================================
// READINESS MODEL
// =============================================================================

/**
 * Readiness score per physics pattern
 *
 * Not a "grade" - a measure of preparation for harder problems.
 */
export interface PatternReadiness {
  patternId: string
  patternName: string
  readinessScore: number      // 0-100
  confidenceLevel: 'low' | 'medium' | 'high'
  questionsAttempted: number
  questionsCompleted: number
  averageScore: number
  lastAttemptDate: Date | null
  trend: 'improving' | 'stable' | 'declining' | 'unknown'
  strengthAreas: string[]
  improvementAreas: string[]
}

/**
 * Cross-track readiness assessment
 */
export interface TrackReadiness {
  track: Track
  overallReadiness: number    // 0-100
  patternReadiness: PatternReadiness[]
  canProgressToNext: boolean
  nextTrack: Track | null
  blockers: string[]
  recommendations: string[]
}

/**
 * Parent-facing summary (simplified, non-technical)
 */
export interface ParentSummary {
  overallProgress: 'on_track' | 'ahead' | 'needs_attention'
  strengthsText: string       // "Strong in momentum and energy problems"
  improvementText: string     // "Working on inclined plane problems"
  engagementLevel: 'high' | 'moderate' | 'low'
  consistencyScore: number    // 0-100 (study regularity)
  weeklyActivitySummary: {
    questionsAttempted: number
    questionsCompleted: number
    timeSpentMins: number
    streak: number
  }
  actionableAdvice: string[]  // Max 3 specific suggestions
}

// =============================================================================
// INPUT SIGNALS
// =============================================================================

/**
 * Inputs used for readiness calculation
 * (Transparent for explainability)
 */
export const READINESS_INPUTS = {
  // Performance signals
  COMPLETION_RATE: {
    id: 'completion_rate',
    description: 'Percentage of attempted questions completed',
    weight: 0.20,
    source: 'user_question_history.outcome',
  },
  AVERAGE_SCORE: {
    id: 'average_score',
    description: 'Average score on completed questions',
    weight: 0.25,
    source: 'user_question_history.score',
  },
  RECENT_TREND: {
    id: 'recent_trend',
    description: 'Score trend over last 10 questions',
    weight: 0.15,
    source: 'user_question_history (computed)',
  },

  // Efficiency signals
  HINT_DEPENDENCY: {
    id: 'hint_dependency',
    description: 'Inverse of average hints used per question',
    weight: 0.15,
    source: 'user_question_history.hints_used',
  },
  TIME_EFFICIENCY: {
    id: 'time_efficiency',
    description: 'Solving time vs expected time ratio',
    weight: 0.10,
    source: 'user_question_history.duration_sec',
  },

  // Coverage signals
  PATTERN_BREADTH: {
    id: 'pattern_breadth',
    description: 'Number of unique patterns attempted',
    weight: 0.10,
    source: 'user_question_history.pattern_id (distinct)',
  },
  DIFFICULTY_PROGRESSION: {
    id: 'difficulty_progression',
    description: 'Highest difficulty level consistently succeeded',
    weight: 0.05,
    source: 'user_question_history.difficulty',
  },
} as const

// =============================================================================
// READINESS CALCULATION
// =============================================================================

/**
 * Calculate pattern readiness for a user
 */
export async function calculatePatternReadiness(
  userId: string,
  patternId: string
): Promise<PatternReadiness> {
  // Get pattern info
  const pattern = await prisma.pattern.findUnique({
    where: { patternId },
    select: { label: true },
  })

  // Get user's attempts for this pattern
  const attempts = await prisma.userQuestionHistory.findMany({
    where: {
      userId,
      patternId,
    },
    orderBy: { completedAt: 'desc' },
    take: 50,
  })

  const completed = attempts.filter(a => a.outcome === AttemptOutcome.completed)
  const scores = completed
    .filter(a => a.score !== null)
    .map(a => a.score!)

  // Calculate metrics
  const questionsAttempted = attempts.length
  const questionsCompleted = completed.length
  const averageScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : 0

  // Calculate trend (last 10 vs previous 10)
  const recentScores = scores.slice(0, 10)
  const previousScores = scores.slice(10, 20)
  let trend: 'improving' | 'stable' | 'declining' | 'unknown' = 'unknown'

  if (recentScores.length >= 5 && previousScores.length >= 5) {
    const recentAvg = recentScores.reduce((s, v) => s + v, 0) / recentScores.length
    const previousAvg = previousScores.reduce((s, v) => s + v, 0) / previousScores.length
    const diff = recentAvg - previousAvg

    if (diff > 5) trend = 'improving'
    else if (diff < -5) trend = 'declining'
    else trend = 'stable'
  }

  // Calculate readiness score
  const completionRate = questionsAttempted > 0 ? questionsCompleted / questionsAttempted : 0
  const normalizedScore = averageScore / 100
  const hintsUsed = completed.reduce((sum, a) => sum + a.hintsUsed, 0)
  const avgHints = questionsCompleted > 0 ? hintsUsed / questionsCompleted : 0
  const hintIndependence = Math.max(0, 1 - avgHints / 3)

  const readinessScore = Math.round(
    (completionRate * 0.3 + normalizedScore * 0.5 + hintIndependence * 0.2) * 100
  )

  // Determine confidence level
  let confidenceLevel: 'low' | 'medium' | 'high' = 'low'
  if (questionsAttempted >= 10) confidenceLevel = 'high'
  else if (questionsAttempted >= 5) confidenceLevel = 'medium'

  // Identify strengths and improvement areas
  const strengthAreas: string[] = []
  const improvementAreas: string[] = []

  if (completionRate >= 0.8) strengthAreas.push('High completion rate')
  if (averageScore >= 75) strengthAreas.push('Strong accuracy')
  if (avgHints <= 1) strengthAreas.push('Independent problem solver')

  if (completionRate < 0.6) improvementAreas.push('Work on completing problems')
  if (averageScore < 60) improvementAreas.push('Review core concepts')
  if (avgHints > 2) improvementAreas.push('Try solving without hints')

  return {
    patternId,
    patternName: pattern?.label || patternId,
    readinessScore,
    confidenceLevel,
    questionsAttempted,
    questionsCompleted,
    averageScore: Math.round(averageScore),
    lastAttemptDate: attempts[0]?.completedAt || null,
    trend,
    strengthAreas,
    improvementAreas,
  }
}

/**
 * Calculate track readiness for a user
 */
export async function calculateTrackReadiness(
  userId: string,
  track: Track
): Promise<TrackReadiness> {
  // Get all patterns in this track
  const questionsInTrack = await prisma.question.findMany({
    where: { track, lifecycleState: 'approved' },
    select: { primaryPatternId: true },
    distinct: ['primaryPatternId'],
  })

  const patternIds = questionsInTrack
    .map(q => q.primaryPatternId)
    .filter((p): p is string => p !== null)

  // Calculate readiness for each pattern
  const patternReadinessPromises = patternIds.map(
    patternId => calculatePatternReadiness(userId, patternId)
  )
  const patternReadiness = await Promise.all(patternReadinessPromises)

  // Calculate overall readiness
  const readyPatterns = patternReadiness.filter(p => p.readinessScore >= 70)
  const overallReadiness = patternReadiness.length > 0
    ? Math.round(
        patternReadiness.reduce((sum, p) => sum + p.readinessScore, 0) / patternReadiness.length
      )
    : 0

  // Determine next track
  const trackOrder: Track[] = [Track.foundation1, Track.foundation2, Track.intermediate, Track.competitive]
  const currentIndex = trackOrder.indexOf(track)
  const nextTrack = currentIndex < trackOrder.length - 1 ? trackOrder[currentIndex + 1] : null

  // Check if can progress
  const canProgressToNext = overallReadiness >= 70 && readyPatterns.length >= patternIds.length * 0.7

  // Generate blockers and recommendations
  const blockers: string[] = []
  const recommendations: string[] = []

  const weakPatterns = patternReadiness.filter(p => p.readinessScore < 60)
  if (weakPatterns.length > 0) {
    blockers.push(`Need improvement in: ${weakPatterns.map(p => p.patternName).join(', ')}`)
  }

  if (overallReadiness < 70) {
    recommendations.push('Focus on completing more problems in weak areas')
  }

  const lowConfidence = patternReadiness.filter(p => p.confidenceLevel === 'low')
  if (lowConfidence.length > 0) {
    recommendations.push(`Practice more in: ${lowConfidence.map(p => p.patternName).join(', ')}`)
  }

  return {
    track,
    overallReadiness,
    patternReadiness,
    canProgressToNext,
    nextTrack,
    blockers,
    recommendations,
  }
}

// =============================================================================
// PARENT-FACING SUMMARY
// =============================================================================

/**
 * Generate parent-friendly summary
 */
export async function generateParentSummary(userId: string): Promise<ParentSummary> {
  // Get recent activity
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const recentAttempts = await prisma.userQuestionHistory.findMany({
    where: {
      userId,
      startedAt: { gte: oneWeekAgo },
    },
    select: {
      outcome: true,
      durationSec: true,
      score: true,
      patternId: true,
    },
  })

  const weeklyCompleted = recentAttempts.filter(a => a.outcome === 'completed')
  const weeklyTimeSpent = recentAttempts.reduce((sum, a) => sum + (a.durationSec || 0), 0)

  // Calculate streak
  const allAttempts = await prisma.userQuestionHistory.findMany({
    where: { userId },
    orderBy: { completedAt: 'desc' },
    take: 30,
    select: { completedAt: true, outcome: true },
  })

  let streak = 0
  for (const attempt of allAttempts) {
    if (attempt.outcome === 'completed') streak++
    else break
  }

  // Calculate engagement level
  let engagementLevel: 'high' | 'moderate' | 'low' = 'low'
  if (recentAttempts.length >= 20) engagementLevel = 'high'
  else if (recentAttempts.length >= 10) engagementLevel = 'moderate'

  // Calculate consistency (study days / 7)
  const studyDays = new Set(
    recentAttempts.map(a => a.patternId) // Use as proxy for unique study days
  ).size
  const consistencyScore = Math.round((Math.min(studyDays, 7) / 7) * 100)

  // Determine overall progress
  const avgScore = weeklyCompleted.length > 0
    ? weeklyCompleted.reduce((sum, a) => sum + (a.score || 0), 0) / weeklyCompleted.length
    : 0

  let overallProgress: 'on_track' | 'ahead' | 'needs_attention' = 'on_track'
  if (avgScore >= 80 && weeklyCompleted.length >= 15) overallProgress = 'ahead'
  else if (avgScore < 50 || weeklyCompleted.length < 5) overallProgress = 'needs_attention'

  // Generate natural language summaries
  const strongPatterns = recentAttempts
    .filter(a => (a.score || 0) >= 80)
    .map(a => a.patternId)
  const uniqueStrong = [...new Set(strongPatterns)].slice(0, 3)

  const weakPatterns = recentAttempts
    .filter(a => (a.score || 0) < 60)
    .map(a => a.patternId)
  const uniqueWeak = [...new Set(weakPatterns)].slice(0, 2)

  const strengthsText = uniqueStrong.length > 0
    ? `Showing strong understanding in ${uniqueStrong.length} topic area${uniqueStrong.length > 1 ? 's' : ''}`
    : 'Building foundation across topics'

  const improvementText = uniqueWeak.length > 0
    ? `Working on strengthening ${uniqueWeak.length} area${uniqueWeak.length > 1 ? 's' : ''}`
    : 'Making good progress across all areas'

  // Generate actionable advice
  const actionableAdvice: string[] = []

  if (engagementLevel === 'low') {
    actionableAdvice.push('Try to practice at least 3 problems per day')
  }
  if (consistencyScore < 50) {
    actionableAdvice.push('More regular practice sessions will help retention')
  }
  if (avgScore < 60 && weeklyCompleted.length >= 5) {
    actionableAdvice.push('Consider reviewing fundamentals before attempting harder problems')
  }
  if (streak >= 5) {
    actionableAdvice.push('Great momentum! Keep up the consistent practice')
  }

  // Limit to 3 pieces of advice
  const finalAdvice = actionableAdvice.slice(0, 3)
  if (finalAdvice.length === 0) {
    finalAdvice.push('Continue with regular practice to maintain progress')
  }

  return {
    overallProgress,
    strengthsText,
    improvementText,
    engagementLevel,
    consistencyScore,
    weeklyActivitySummary: {
      questionsAttempted: recentAttempts.length,
      questionsCompleted: weeklyCompleted.length,
      timeSpentMins: Math.round(weeklyTimeSpent / 60),
      streak,
    },
    actionableAdvice: finalAdvice,
  }
}

// =============================================================================
// UPDATE FREQUENCY
// =============================================================================

/**
 * When to update readiness scores
 */
export const UPDATE_TRIGGERS = {
  // Real-time updates
  ON_QUESTION_COMPLETE: true,

  // Batch updates
  DAILY_RECALCULATION: true,
  DAILY_RECALC_TIME: '02:00 UTC',

  // Manual triggers
  ON_USER_REQUEST: true,
  MAX_MANUAL_REQUESTS_PER_DAY: 5,
}

/**
 * Stale data thresholds
 */
export const STALENESS_THRESHOLDS = {
  // Pattern readiness is stale if no activity for N days
  PATTERN_STALE_DAYS: 7,

  // Track readiness recalculated if underlying patterns changed
  TRACK_RECALC_ON_PATTERN_CHANGE: true,

  // Parent summary cached for N hours
  PARENT_SUMMARY_CACHE_HOURS: 4,
}

// =============================================================================
// UX PRESENTATION RULES
// =============================================================================

/**
 * Rules for presenting analytics to users
 */
export const PRESENTATION_RULES = {
  // Never show raw AI metrics
  HIDE_AI_METRICS: true,

  // Always show alongside actionable advice
  REQUIRE_ADVICE_WITH_SCORE: true,

  // Use encouraging language
  USE_POSITIVE_FRAMING: true,

  // Avoid comparisons to other users
  NO_PEER_COMPARISON: true,

  // Show trend over absolute value when available
  PREFER_TREND_OVER_ABSOLUTE: true,

  // Round scores to nearest 5 for simplicity
  ROUND_SCORES_TO_5: true,
}

/**
 * Format readiness score for display
 */
export function formatReadinessForDisplay(score: number): {
  displayValue: number
  label: string
  color: 'green' | 'yellow' | 'orange' | 'red'
} {
  // Round to nearest 5
  const displayValue = Math.round(score / 5) * 5

  let label: string
  let color: 'green' | 'yellow' | 'orange' | 'red'

  if (displayValue >= 80) {
    label = 'Ready'
    color = 'green'
  } else if (displayValue >= 60) {
    label = 'Almost Ready'
    color = 'yellow'
  } else if (displayValue >= 40) {
    label = 'Building'
    color = 'orange'
  } else {
    label = 'Getting Started'
    color = 'red'
  }

  return { displayValue, label, color }
}
