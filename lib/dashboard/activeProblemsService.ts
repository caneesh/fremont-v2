/**
 * Active Problems Service
 *
 * Retrieves and formats problem history for the dashboard:
 * - In-progress problems with draft state
 * - Recently solved problems
 * - Recently skipped problems
 */

import type {
  ActiveProblemsData,
  ActiveProblemItem,
  ProblemDisplayStatus,
} from '@/types/activeProblems'
import { problemHistoryService } from '@/lib/problemHistory'
import type { ProblemAttempt, ProblemProgress, ProblemStatus } from '@/types/history'

/**
 * Maximum items to display
 */
const MAX_ITEMS = 5

/**
 * Days to look back for recent problems
 */
const RECENT_DAYS = 7

/**
 * Map internal status to display status
 */
function mapStatus(status: ProblemStatus): ProblemDisplayStatus {
  switch (status) {
    case 'IN_PROGRESS': return 'in_progress'
    case 'SOLVED': return 'solved'
    case 'SKIPPED': return 'skipped'
  }
}

/**
 * Extract domain from problem title or ID
 */
function extractDomain(attempt: ProblemAttempt): string | undefined {
  // Try to parse from draft solution if available
  if (attempt.draftSolution) {
    try {
      const progress: ProblemProgress = JSON.parse(attempt.draftSolution)
      // Domain might be stored in progress metadata
      // For now, extract from problem text patterns
      const text = progress.problemText?.toLowerCase() || ''
      if (text.includes('projectile') || text.includes('velocity') || text.includes('acceleration')) {
        return 'Mechanics'
      }
      if (text.includes('heat') || text.includes('temperature') || text.includes('thermal')) {
        return 'Thermodynamics'
      }
      if (text.includes('charge') || text.includes('current') || text.includes('voltage')) {
        return 'Electromagnetism'
      }
      if (text.includes('lens') || text.includes('mirror') || text.includes('light')) {
        return 'Optics'
      }
    } catch {
      // Ignore parse errors
    }
  }

  // Try to extract from title
  const title = attempt.problemTitle.toLowerCase()
  if (title.includes('mechanics') || title.includes('motion')) return 'Mechanics'
  if (title.includes('thermo')) return 'Thermodynamics'
  if (title.includes('electro') || title.includes('circuit')) return 'Electromagnetism'
  if (title.includes('optic') || title.includes('wave')) return 'Optics'

  return undefined
}

/**
 * Parse step progress from draft solution
 */
function parseStepProgress(attempt: ProblemAttempt): {
  currentStep: number
  totalSteps: number
} | null {
  if (!attempt.draftSolution) return null

  try {
    const progress: ProblemProgress = JSON.parse(attempt.draftSolution)
    const totalSteps = progress.stepProgress?.length || 0
    const completedSteps = progress.stepProgress?.filter(s => s.isCompleted).length || 0

    if (totalSteps === 0) return null

    return {
      currentStep: Math.min(completedSteps + 1, totalSteps),
      totalSteps,
    }
  } catch {
    return null
  }
}

/**
 * Estimate time spent from progress data
 */
function estimateTimeSpent(attempt: ProblemAttempt): number | undefined {
  // Try to get from final solution
  if (attempt.finalSolution) {
    try {
      const progress: ProblemProgress = JSON.parse(attempt.finalSolution)
      if (progress.timeSpentMs) {
        return Math.floor(progress.timeSpentMs / 1000)
      }
    } catch {
      // Ignore
    }
  }

  // Estimate from timestamps
  const created = new Date(attempt.createdAt).getTime()
  const updated = new Date(attempt.updatedAt).getTime()
  const diffSeconds = Math.floor((updated - created) / 1000)

  // Only return if reasonable (< 2 hours)
  if (diffSeconds > 0 && diffSeconds < 7200) {
    return diffSeconds
  }

  return undefined
}

/**
 * Build route for a problem
 */
function buildRoute(attempt: ProblemAttempt): string {
  const base = `/solve?problemId=${encodeURIComponent(attempt.problemId)}`

  if (attempt.status === 'IN_PROGRESS') {
    return `${base}&resume=1`
  }

  if (attempt.status === 'SOLVED') {
    return `${base}&review=1`
  }

  // Skipped - just go to problem
  return base
}

/**
 * Convert ProblemAttempt to ActiveProblemItem
 */
function toActiveItem(attempt: ProblemAttempt): ActiveProblemItem {
  const stepProgress = parseStepProgress(attempt)

  return {
    problemId: attempt.problemId,
    title: attempt.problemTitle,
    domain: extractDomain(attempt),
    status: mapStatus(attempt.status),
    currentStep: stepProgress?.currentStep,
    totalSteps: stepProgress?.totalSteps,
    timestamp: attempt.lastOpenedAt || attempt.updatedAt,
    timeSpent: attempt.status === 'SOLVED' ? estimateTimeSpent(attempt) : undefined,
    hasDraft: !!attempt.draftSolution,
    route: buildRoute(attempt),
  }
}

/**
 * Check if attempt is within recent days window
 */
function isRecent(attempt: ProblemAttempt, days: number): boolean {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffStr = cutoff.toISOString()

  const timestamp = attempt.lastOpenedAt || attempt.updatedAt
  return timestamp >= cutoffStr
}

/**
 * Compute active problems data
 */
export function computeActiveProblems(): ActiveProblemsData {
  try {
    // Get all attempts
    const allAttempts = problemHistoryService.listAllAttempts()

    if (allAttempts.length === 0) {
      return getEmptyActiveProblems()
    }

    // Filter to recent attempts
    const recentAttempts = allAttempts.filter(a => isRecent(a, RECENT_DAYS))

    // Separate by status
    const inProgress = recentAttempts
      .filter(a => a.status === 'IN_PROGRESS')
      .sort((a, b) => {
        const aTime = a.lastOpenedAt || a.updatedAt
        const bTime = b.lastOpenedAt || b.updatedAt
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      })
      .slice(0, MAX_ITEMS)
      .map(toActiveItem)

    const recentlySolved = recentAttempts
      .filter(a => a.status === 'SOLVED')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_ITEMS)
      .map(toActiveItem)

    const recentlySkipped = recentAttempts
      .filter(a => a.status === 'SKIPPED')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, MAX_ITEMS)
      .map(toActiveItem)

    // Combine all items, prioritizing in-progress
    const allItems: ActiveProblemItem[] = []

    // Add in-progress first
    allItems.push(...inProgress)

    // Add solved and skipped, sorted by recency
    const completed = [...recentlySolved, ...recentlySkipped]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Fill remaining slots
    const remaining = MAX_ITEMS - allItems.length
    allItems.push(...completed.slice(0, remaining))

    return {
      inProgress,
      recentlySolved,
      recentlySkipped,
      allItems,
      isLoading: false,
      computedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[ActiveProblems] Error computing data:', error)
    return getEmptyActiveProblems()
  }
}

/**
 * Get empty state
 */
export function getEmptyActiveProblems(): ActiveProblemsData {
  return {
    inProgress: [],
    recentlySolved: [],
    recentlySkipped: [],
    allItems: [],
    isLoading: false,
    computedAt: new Date().toISOString(),
  }
}
