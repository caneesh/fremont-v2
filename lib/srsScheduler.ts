/**
 * SRS Scheduler - SM-2-like Spaced Repetition Algorithm
 *
 * Based on the SuperMemo SM-2 algorithm with modifications:
 * - Simpler learning phase with fixed intervals
 * - Capped maximum interval at 180 days
 * - Streak-based bonuses
 */

import type {
  MistakeCard,
  SRSData,
  SRSStatus,
  ReviewQuality,
  SRS_INTERVALS
} from '@/types/mistakeNotebook'

// ============================================
// Constants
// ============================================

const MIN_EASE_FACTOR = 1.3
const DEFAULT_EASE_FACTOR = 2.5
const MAX_INTERVAL = 180 // days

// Learning steps in minutes (before graduating to review)
const LEARNING_STEPS = [1, 10] // 1 min, 10 min

// ============================================
// Core SRS Functions
// ============================================

/**
 * Create initial SRS data for a new card
 */
export function createInitialSRS(): SRSData {
  const today = new Date().toISOString().split('T')[0]

  return {
    status: 'new',
    interval: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    dueDate: today,
    step: 0
  }
}

/**
 * Calculate next review date based on quality of response
 * Uses SM-2 algorithm with modifications
 */
export function calculateNextReview(
  currentSRS: SRSData,
  quality: ReviewQuality
): SRSData {
  const today = new Date()

  // Handle based on current status
  if (currentSRS.status === 'new' || currentSRS.status === 'learning') {
    return handleLearningPhase(currentSRS, quality, today)
  }

  if (currentSRS.status === 'suspended') {
    // Don't modify suspended cards
    return currentSRS
  }

  // Review phase (graduated cards)
  return handleReviewPhase(currentSRS, quality, today)
}

/**
 * Handle learning phase (new and learning cards)
 */
function handleLearningPhase(
  srs: SRSData,
  quality: ReviewQuality,
  today: Date
): SRSData {
  const newSRS = { ...srs }

  if (quality < 3) {
    // Failed - reset to first step
    newSRS.step = 0
    newSRS.status = 'learning'
    newSRS.dueDate = addMinutes(today, LEARNING_STEPS[0]).toISOString().split('T')[0]
  } else if (quality === 3) {
    // Hard - repeat current step
    const stepMinutes = LEARNING_STEPS[srs.step] || LEARNING_STEPS[LEARNING_STEPS.length - 1]
    newSRS.dueDate = addMinutes(today, stepMinutes).toISOString().split('T')[0]
  } else if (quality === 4) {
    // Good - advance to next step or graduate
    if (srs.step >= LEARNING_STEPS.length - 1) {
      // Graduate to review
      newSRS.status = 'review'
      newSRS.interval = 1
      newSRS.dueDate = addDays(today, 1).toISOString().split('T')[0]
    } else {
      newSRS.step = srs.step + 1
      newSRS.status = 'learning'
      const stepMinutes = LEARNING_STEPS[newSRS.step]
      newSRS.dueDate = addMinutes(today, stepMinutes).toISOString().split('T')[0]
    }
  } else {
    // Easy (5) - graduate immediately with bonus interval
    newSRS.status = 'review'
    newSRS.interval = 4 // Easy interval
    newSRS.dueDate = addDays(today, 4).toISOString().split('T')[0]
  }

  return newSRS
}

/**
 * Handle review phase (graduated cards)
 * Uses modified SM-2 algorithm
 */
function handleReviewPhase(
  srs: SRSData,
  quality: ReviewQuality,
  today: Date
): SRSData {
  const newSRS = { ...srs }

  if (quality < 3) {
    // Failed - reset to learning
    newSRS.status = 'learning'
    newSRS.step = 0
    newSRS.interval = 0
    newSRS.dueDate = addMinutes(today, LEARNING_STEPS[0]).toISOString().split('T')[0]

    // Decrease ease factor
    newSRS.easeFactor = Math.max(MIN_EASE_FACTOR, srs.easeFactor - 0.2)
  } else {
    // Passed - calculate new interval using SM-2
    let newInterval: number

    if (srs.interval === 0) {
      newInterval = 1
    } else if (srs.interval === 1) {
      newInterval = 3
    } else {
      // Apply ease factor
      newInterval = Math.round(srs.interval * newSRS.easeFactor)
    }

    // Apply quality modifier
    if (quality === 3) {
      // Hard - multiply by 1.2 instead of ease factor
      newInterval = Math.round(srs.interval * 1.2)
      newSRS.easeFactor = Math.max(MIN_EASE_FACTOR, srs.easeFactor - 0.15)
    } else if (quality === 4) {
      // Good - normal progression
      // Ease factor stays the same
    } else if (quality === 5) {
      // Easy - bonus interval and increase ease
      newInterval = Math.round(newInterval * 1.3)
      newSRS.easeFactor = srs.easeFactor + 0.15
    }

    // Cap at maximum interval
    newInterval = Math.min(newInterval, MAX_INTERVAL)

    // Check for graduation (>= 21 days consistently)
    if (newInterval >= 21 && srs.interval >= 14) {
      newSRS.status = 'graduated'
    }

    newSRS.interval = newInterval
    newSRS.dueDate = addDays(today, newInterval).toISOString().split('T')[0]
  }

  return newSRS
}

// ============================================
// Query Functions
// ============================================

/**
 * Get cards due for review today
 */
export function getDueCards(cards: MistakeCard[]): MistakeCard[] {
  const today = new Date().toISOString().split('T')[0]

  return cards
    .filter(card =>
      card.srs.status !== 'suspended' &&
      card.srs.dueDate <= today
    )
    .sort((a, b) => {
      // Sort by: overdue first, then by due date, then by severity
      const aOverdue = a.srs.dueDate < today
      const bOverdue = b.srs.dueDate < today

      if (aOverdue !== bOverdue) return aOverdue ? -1 : 1
      if (a.srs.dueDate !== b.srs.dueDate) {
        return a.srs.dueDate.localeCompare(b.srs.dueDate)
      }

      // Sort by severity (major first)
      const severityOrder = { major: 0, moderate: 1, minor: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })
}

/**
 * Get overdue cards
 */
export function getOverdueCards(cards: MistakeCard[]): MistakeCard[] {
  const today = new Date().toISOString().split('T')[0]

  return cards.filter(card =>
    card.srs.status !== 'suspended' &&
    card.srs.dueDate < today
  )
}

/**
 * Get cards by status
 */
export function getCardsByStatus(
  cards: MistakeCard[],
  status: SRSStatus
): MistakeCard[] {
  return cards.filter(card => card.srs.status === status)
}

/**
 * Calculate forecast for upcoming reviews
 */
export function getReviewForecast(
  cards: MistakeCard[],
  days: number = 7
): Record<string, number> {
  const forecast: Record<string, number> = {}
  const today = new Date()

  for (let i = 0; i < days; i++) {
    const date = addDays(today, i).toISOString().split('T')[0]
    forecast[date] = cards.filter(card =>
      card.srs.status !== 'suspended' &&
      card.srs.dueDate === date
    ).length
  }

  return forecast
}

/**
 * Estimate time to complete reviews
 */
export function estimateReviewTime(cardCount: number): number {
  // Average 30 seconds per card review
  return Math.ceil(cardCount * 0.5) // minutes
}

// ============================================
// Card Management
// ============================================

/**
 * Suspend a card (remove from review rotation)
 */
export function suspendCard(card: MistakeCard): MistakeCard {
  return {
    ...card,
    srs: {
      ...card.srs,
      status: 'suspended'
    },
    updatedAt: new Date().toISOString()
  }
}

/**
 * Unsuspend a card (return to review rotation)
 */
export function unsuspendCard(card: MistakeCard): MistakeCard {
  const today = new Date().toISOString().split('T')[0]

  return {
    ...card,
    srs: {
      ...card.srs,
      status: card.srs.interval > 0 ? 'review' : 'learning',
      dueDate: today // Due immediately
    },
    updatedAt: new Date().toISOString()
  }
}

/**
 * Reset a card to new status
 */
export function resetCard(card: MistakeCard): MistakeCard {
  return {
    ...card,
    srs: createInitialSRS(),
    reviewCount: 0,
    correctStreak: 0,
    lastReviewedAt: undefined,
    updatedAt: new Date().toISOString()
  }
}

/**
 * Apply review result to a card
 */
export function applyReview(
  card: MistakeCard,
  quality: ReviewQuality
): MistakeCard {
  const newSRS = calculateNextReview(card.srs, quality)
  const isCorrect = quality >= 3

  return {
    ...card,
    srs: newSRS,
    reviewCount: card.reviewCount + 1,
    correctStreak: isCorrect ? card.correctStreak + 1 : 0,
    lastReviewedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

// ============================================
// Utility Functions
// ============================================

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date)
  result.setMinutes(result.getMinutes() + minutes)
  return result
}

/**
 * Format interval for display
 */
export function formatInterval(days: number): string {
  if (days === 0) return 'Now'
  if (days === 1) return '1 day'
  if (days < 7) return `${days} days`
  if (days < 30) {
    const weeks = Math.round(days / 7)
    return weeks === 1 ? '1 week' : `${weeks} weeks`
  }
  if (days < 365) {
    const months = Math.round(days / 30)
    return months === 1 ? '1 month' : `${months} months`
  }
  const years = Math.round(days / 365)
  return years === 1 ? '1 year' : `${years} years`
}

/**
 * Get status display info
 */
export function getStatusDisplay(status: SRSStatus): {
  label: string
  color: string
  bgClass: string
} {
  switch (status) {
    case 'new':
      return {
        label: 'New',
        color: 'text-blue-600 dark:text-blue-400',
        bgClass: 'bg-blue-100 dark:bg-blue-900/30'
      }
    case 'learning':
      return {
        label: 'Learning',
        color: 'text-amber-600 dark:text-amber-400',
        bgClass: 'bg-amber-100 dark:bg-amber-900/30'
      }
    case 'review':
      return {
        label: 'Review',
        color: 'text-green-600 dark:text-green-400',
        bgClass: 'bg-green-100 dark:bg-green-900/30'
      }
    case 'graduated':
      return {
        label: 'Mastered',
        color: 'text-purple-600 dark:text-purple-400',
        bgClass: 'bg-purple-100 dark:bg-purple-900/30'
      }
    case 'suspended':
      return {
        label: 'Suspended',
        color: 'text-gray-600 dark:text-gray-400',
        bgClass: 'bg-gray-100 dark:bg-gray-800'
      }
  }
}
