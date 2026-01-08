/**
 * Today's Focus Service
 *
 * Computes the primary action recommendation based on:
 * 1. In-progress problems (continuity)
 * 2. SRS due cards (spaced repetition urgency)
 * 3. Pattern track recommendations (curriculum progress)
 *
 * Priority order:
 * 1. Recent in-progress problem (< 24h) - highest priority for continuity
 * 2. Overdue SRS cards (3+) - urgent review needed
 * 3. Older in-progress problem (< 7 days) - resume abandoned work
 * 4. Due SRS cards (3+) - scheduled review
 * 5. Pattern with high decay - needs reinforcement
 * 6. Next pattern in curriculum - forward progress
 */

import type {
  TodaysFocusData,
  PrimaryAction,
  SecondaryAction,
  ACTION_PRIORITY,
} from '@/types/todaysFocus'
import { problemHistoryService } from '@/lib/problemHistory'
import { getNotebookStats, getCardsDue } from '@/lib/mistakeNotebook'
import { resolveNextAction, isNextAction } from './patternTrackResolveService'
import type { ProblemAttempt, ProblemProgress } from '@/types/history'

/**
 * Hours threshold for "recent" in-progress problem
 */
const RECENT_HOURS = 24

/**
 * Days threshold for resumable in-progress problem
 */
const RESUMABLE_DAYS = 7

/**
 * Minimum SRS cards to trigger review recommendation
 */
const MIN_SRS_CARDS = 3

/**
 * Check if a date string is within the last N hours
 */
function isWithinHours(dateStr: string, hours: number): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  return diffHours <= hours
}

/**
 * Check if a date string is within the last N days
 */
function isWithinDays(dateStr: string, days: number): boolean {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  return diffDays <= days
}

/**
 * Format relative time for display
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  return `${diffDays} days ago`
}

/**
 * Parse problem progress to get step counts
 */
function parseProgress(attempt: ProblemAttempt): { currentStep: number; totalSteps: number } | null {
  if (!attempt.draftSolution) return null

  try {
    const progress: ProblemProgress = JSON.parse(attempt.draftSolution)
    const totalSteps = progress.stepProgress?.length || 0
    const completedSteps = progress.stepProgress?.filter(s => s.isCompleted).length || 0
    return {
      currentStep: completedSteps + 1,
      totalSteps,
    }
  } catch {
    return null
  }
}

/**
 * Get the most recent in-progress problem
 */
function getInProgressProblem(): ProblemAttempt | null {
  const { attempts } = problemHistoryService.getHistory({ status: 'IN_PROGRESS', limit: 10 })

  if (attempts.length === 0) return null

  // Sort by lastOpenedAt or updatedAt (most recent first)
  const sorted = [...attempts].sort((a, b) => {
    const aDate = a.lastOpenedAt || a.updatedAt
    const bDate = b.lastOpenedAt || b.updatedAt
    return new Date(bDate).getTime() - new Date(aDate).getTime()
  })

  // Return most recent within resumable window
  const resumable = sorted.find(a => {
    const date = a.lastOpenedAt || a.updatedAt
    return isWithinDays(date, RESUMABLE_DAYS)
  })

  return resumable || null
}

/**
 * Check if an in-progress problem is recent (< 24h)
 */
function isRecentInProgress(attempt: ProblemAttempt): boolean {
  const date = attempt.lastOpenedAt || attempt.updatedAt
  return isWithinHours(date, RECENT_HOURS)
}

/**
 * Build the primary action for continuing a problem
 */
function buildContinueProblemAction(attempt: ProblemAttempt): PrimaryAction {
  const progress = parseProgress(attempt)

  return {
    type: 'continue_problem',
    continueData: {
      problemId: attempt.problemId,
      problemTitle: attempt.problemTitle,
      currentStep: progress?.currentStep || 1,
      totalSteps: progress?.totalSteps || 5,
      lastSavedAt: attempt.lastOpenedAt || attempt.updatedAt,
    },
    ctaLabel: 'Continue Problem',
    route: `/solve?problemId=${attempt.problemId}&resume=1`,
  }
}

/**
 * Build the primary action for SRS review
 */
function buildReviewAction(dueCount: number, overdueCount: number): PrimaryAction {
  // Estimate 30 seconds per card
  const estimatedMinutes = Math.ceil(dueCount * 0.5)

  return {
    type: 'start_review',
    reviewData: {
      dueCardCount: dueCount,
      overdueCount,
      estimatedMinutes,
    },
    ctaLabel: `Review ${dueCount} Cards`,
    route: '/mistake-notebook?review=true',
  }
}

/**
 * Build the primary action for pattern practice
 */
function buildPatternAction(userId: string): PrimaryAction | null {
  const nextAction = resolveNextAction(userId)

  if (!isNextAction(nextAction)) {
    return null
  }

  return {
    type: 'practice_pattern',
    patternData: {
      patternId: nextAction.patternId,
      patternName: nextAction.patternName,
      trackId: nextAction.trackId,
      trackName: nextAction.trackName,
      stepType: nextAction.stepType,
      reason: 'next_in_curriculum',
    },
    ctaLabel: `Practice: ${nextAction.patternName}`,
    route: nextAction.route,
  }
}

/**
 * Build the default action for new users
 */
function buildStartFreshAction(): PrimaryAction {
  return {
    type: 'start_fresh',
    ctaLabel: 'Start Your First Problem',
    route: '/pattern-track',
  }
}

/**
 * Generate rationale text for the primary action
 */
function generateRationale(action: PrimaryAction): string {
  switch (action.type) {
    case 'continue_problem': {
      const data = action.continueData!
      const stepInfo = `${data.currentStep}/${data.totalSteps} steps complete`
      return `You're ${stepInfo}. Pick up where you left off.`
    }

    case 'start_review': {
      const data = action.reviewData!
      if (data.overdueCount > 0) {
        return `${data.overdueCount} cards overdue. Review now to prevent forgetting.`
      }
      return `${data.dueCardCount} cards due for review to reinforce your learning.`
    }

    case 'practice_pattern': {
      const data = action.patternData!
      if (data.reason === 'high_decay') {
        return `Your "${data.patternName}" skills need reinforcement.`
      }
      return `Continue building your "${data.patternName}" foundation.`
    }

    case 'start_fresh':
      return 'Begin with a scaffolded problem to establish your baseline.'

    default:
      return 'Recommended based on your learning progress.'
  }
}

/**
 * Build secondary actions (alternatives to primary)
 */
function buildSecondaryActions(
  primary: PrimaryAction,
  userId: string
): SecondaryAction[] {
  const secondary: SecondaryAction[] = []

  // Add SRS review if not primary
  if (primary.type !== 'start_review') {
    try {
      const stats = getNotebookStats()
      if (stats.dueToday > 0) {
        secondary.push({
          type: 'review',
          label: `Review ${stats.dueToday} due cards`,
          count: stats.dueToday,
          route: '/mistake-notebook?review=true',
        })
      }
    } catch {
      // Notebook not available
    }
  }

  // Add pattern practice if not primary
  if (primary.type !== 'practice_pattern') {
    const patternAction = buildPatternAction(userId)
    if (patternAction && patternAction.patternData) {
      secondary.push({
        type: 'practice_pattern',
        label: `Practice "${patternAction.patternData.patternName}"`,
        route: patternAction.route,
      })
    }
  }

  // Add in-progress problem if not primary
  if (primary.type !== 'continue_problem') {
    const inProgress = getInProgressProblem()
    if (inProgress) {
      const progress = parseProgress(inProgress)
      secondary.push({
        type: 'continue_problem',
        label: `Resume: ${inProgress.problemTitle}`,
        description: progress ? `Step ${progress.currentStep}/${progress.totalSteps}` : undefined,
        route: `/solve?problemId=${inProgress.problemId}&resume=1`,
      })
    }
  }

  // Always add option to start new problem
  if (primary.type !== 'start_fresh') {
    secondary.push({
      type: 'new_problem',
      label: 'Solve New Problem',
      route: '/solve',
    })
  }

  // Limit to 3 secondary actions
  return secondary.slice(0, 3)
}

/**
 * Compute the today's focus data
 *
 * Priority logic:
 * 1. Recent in-progress problem (< 24h)
 * 2. Overdue SRS cards (3+)
 * 3. Older in-progress problem (< 7 days)
 * 4. Due SRS cards (3+)
 * 5. Pattern with next step
 * 6. Default - start fresh
 */
export function computeTodaysFocus(userId: string): TodaysFocusData {
  let primaryAction: PrimaryAction

  // Check for in-progress problem
  const inProgress = getInProgressProblem()
  const isRecent = inProgress && isRecentInProgress(inProgress)

  // Check for SRS cards
  let dueCount = 0
  let overdueCount = 0
  try {
    const stats = getNotebookStats()
    dueCount = stats.dueToday
    overdueCount = stats.overdue
  } catch {
    // Notebook not available
  }

  // Priority 1: Recent in-progress problem (highest priority for continuity)
  if (isRecent && inProgress) {
    primaryAction = buildContinueProblemAction(inProgress)
  }
  // Priority 2: Overdue SRS cards (3+)
  else if (overdueCount >= MIN_SRS_CARDS) {
    primaryAction = buildReviewAction(dueCount, overdueCount)
  }
  // Priority 3: Older in-progress problem
  else if (inProgress) {
    primaryAction = buildContinueProblemAction(inProgress)
  }
  // Priority 4: Due SRS cards (3+)
  else if (dueCount >= MIN_SRS_CARDS) {
    primaryAction = buildReviewAction(dueCount, overdueCount)
  }
  // Priority 5: Next pattern in curriculum
  else {
    const patternAction = buildPatternAction(userId)
    if (patternAction) {
      primaryAction = patternAction
    } else {
      // Priority 6: Default - start fresh
      primaryAction = buildStartFreshAction()
    }
  }

  // Generate rationale and secondary actions
  const rationale = generateRationale(primaryAction)
  const secondaryActions = buildSecondaryActions(primaryAction, userId)

  return {
    primaryAction,
    rationale,
    secondaryActions,
    isLoading: false,
    computedAt: new Date().toISOString(),
  }
}

/**
 * Get empty state for new users
 */
export function getEmptyState(): TodaysFocusData {
  return {
    primaryAction: buildStartFreshAction(),
    rationale: 'Begin with a scaffolded problem to establish your baseline.',
    secondaryActions: [],
    isLoading: false,
    computedAt: new Date().toISOString(),
  }
}
