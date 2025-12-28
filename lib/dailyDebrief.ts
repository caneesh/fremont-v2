/**
 * Daily Debrief Generator
 *
 * Generates a daily summary of learning activity:
 * - Top 3 struggled concepts
 * - Recommended 10-minute review plan
 * - Motivational messages
 */

import { eventLogger } from './storage/eventLogger'
import { STORAGE_KEYS } from './storage/types'
import { getAllCards, getCardsDue, getCardsOverdue } from './mistakeNotebook'
import { estimateReviewTime } from './srsScheduler'
import type { StoredEvent } from './storage/types'
import type {
  DailyDebrief,
  StruggledConcept,
  ReviewPlanItem,
  MistakeCard
} from '@/types/mistakeNotebook'

// ============================================
// Storage Helpers
// ============================================

function getDebriefs(): DailyDebrief[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DAILY_DEBRIEFS)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveDebriefs(debriefs: DailyDebrief[]): void {
  if (typeof window === 'undefined') return

  try {
    // Keep only last 30 debriefs
    const trimmed = debriefs.slice(-30)
    localStorage.setItem(STORAGE_KEYS.DAILY_DEBRIEFS, JSON.stringify(trimmed))
  } catch (error) {
    console.error('Failed to save debriefs:', error)
  }
}

function getLastDebriefDate(): string | null {
  if (typeof window === 'undefined') return null

  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_DEBRIEF_DATE)
  } catch {
    return null
  }
}

function setLastDebriefDate(date: string): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.LAST_DEBRIEF_DATE, date)
  } catch (error) {
    console.error('Failed to save last debrief date:', error)
  }
}

// ============================================
// Debrief Generation
// ============================================

/**
 * Check if a debrief is due today
 */
export function isDebriefDue(): boolean {
  const today = new Date().toISOString().split('T')[0]
  const lastDate = getLastDebriefDate()

  return lastDate !== today
}

/**
 * Get today's events (since midnight local time)
 */
function getTodayEvents(): StoredEvent[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.toISOString()

  const result = eventLogger.getRecentEvents(500)
  if (!result.success || !result.data) return []

  return result.data.filter(event =>
    event.timestamp >= todayStart
  )
}

/**
 * Analyze events to find struggled concepts
 */
function analyzeStruggledConcepts(
  events: StoredEvent[],
  cards: MistakeCard[]
): StruggledConcept[] {
  // Group cards by concept
  const conceptMap = new Map<string, {
    name: string
    mistakeCount: number
    hintsTotal: number
    lastSeen: string
    cardIds: string[]
  }>()

  // Analyze from mistake cards
  for (const card of cards) {
    for (const tag of card.conceptTags) {
      const existing = conceptMap.get(tag) || {
        name: formatConceptName(tag),
        mistakeCount: 0,
        hintsTotal: 0,
        lastSeen: card.createdAt,
        cardIds: []
      }

      existing.mistakeCount++
      existing.hintsTotal += card.hintLevelReached
      if (card.createdAt > existing.lastSeen) {
        existing.lastSeen = card.createdAt
      }
      existing.cardIds.push(card.id)

      conceptMap.set(tag, existing)
    }
  }

  // Boost counts from today's events
  for (const event of events) {
    if (event.type === 'hint_unlocked' || event.type === 'step_failed' || event.type === 'task_incorrect') {
      // Try to associate with a concept (from metadata if available)
      const conceptTag = event.metadata.conceptTag as string | undefined
      if (conceptTag && conceptMap.has(conceptTag)) {
        const existing = conceptMap.get(conceptTag)!
        existing.mistakeCount++
        conceptMap.set(conceptTag, existing)
      }
    }
  }

  // Convert to array and sort by mistake count
  const concepts: StruggledConcept[] = Array.from(conceptMap.entries())
    .map(([tag, data]) => ({
      conceptTag: tag,
      conceptName: data.name,
      mistakeCount: data.mistakeCount,
      lastSeen: data.lastSeen,
      averageHintsNeeded: data.cardIds.length > 0
        ? data.hintsTotal / data.cardIds.length
        : 0,
      relatedCards: data.cardIds
    }))
    .sort((a, b) => b.mistakeCount - a.mistakeCount)
    .slice(0, 3)

  return concepts
}

/**
 * Format concept tag to readable name
 */
function formatConceptName(tag: string): string {
  return tag
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Generate a 10-minute review plan
 */
function generateReviewPlan(
  struggledConcepts: StruggledConcept[],
  dueCards: MistakeCard[]
): ReviewPlanItem[] {
  const plan: ReviewPlanItem[] = []
  let totalMinutes = 0
  const TARGET_MINUTES = 10

  // Priority 1: Due flashcard reviews (up to 5 minutes)
  if (dueCards.length > 0) {
    const cardsToReview = Math.min(dueCards.length, 10) // Max 10 cards
    const reviewTime = Math.min(estimateReviewTime(cardsToReview), 5)

    plan.push({
      type: 'flashcard_review',
      title: 'Review Due Cards',
      description: `${cardsToReview} cards are due for review. Quick recall practice.`,
      estimatedMinutes: reviewTime,
      conceptTags: [...new Set(dueCards.slice(0, cardsToReview).flatMap(c => c.conceptTags))],
      cardIds: dueCards.slice(0, cardsToReview).map(c => c.id)
    })
    totalMinutes += reviewTime
  }

  // Priority 2: Concept review for top struggled concept
  if (struggledConcepts.length > 0 && totalMinutes < TARGET_MINUTES) {
    const topConcept = struggledConcepts[0]
    const conceptTime = Math.min(3, TARGET_MINUTES - totalMinutes)

    plan.push({
      type: 'concept_review',
      title: `Review: ${topConcept.conceptName}`,
      description: `This concept appeared in ${topConcept.mistakeCount} mistakes. Revisit the fundamentals.`,
      estimatedMinutes: conceptTime,
      conceptTags: [topConcept.conceptTag],
      cardIds: topConcept.relatedCards.slice(0, 3)
    })
    totalMinutes += conceptTime
  }

  // Priority 3: Practice problem suggestion
  if (struggledConcepts.length > 1 && totalMinutes < TARGET_MINUTES) {
    const secondConcept = struggledConcepts[1]
    const practiceTime = Math.min(4, TARGET_MINUTES - totalMinutes)

    plan.push({
      type: 'practice_problem',
      title: `Practice: ${secondConcept.conceptName}`,
      description: `Try a problem involving ${secondConcept.conceptName} to reinforce learning.`,
      estimatedMinutes: practiceTime,
      conceptTags: [secondConcept.conceptTag]
    })
    totalMinutes += practiceTime
  }

  return plan
}

/**
 * Generate an encouraging message based on performance
 */
function generateEncouragement(
  mistakesMade: number,
  stepsCompleted: number,
  cardsDue: number
): string {
  const messages = {
    great: [
      "Excellent work today! Your consistency is building strong foundations.",
      "You're making great progress! Keep up the focused practice.",
      "Another productive day! Your problem-solving skills are growing.",
    ],
    good: [
      "Good effort today! Every mistake is a learning opportunity.",
      "Solid practice session! Focus on the concepts that challenged you.",
      "You're putting in the work - that's what matters most!",
    ],
    needsWork: [
      "Challenging day, but that's how we grow! Tomorrow is a fresh start.",
      "Tough problems build tough skills. You've got this!",
      "Every expert was once a beginner. Keep pushing forward!",
    ],
    noActivity: [
      "Ready for some physics? Your review cards are waiting!",
      "A quick 10-minute review can make a big difference.",
      "Let's tackle some problems together today!",
    ]
  }

  let category: keyof typeof messages

  if (stepsCompleted === 0 && mistakesMade === 0) {
    category = 'noActivity'
  } else if (mistakesMade <= 2 && stepsCompleted >= 5) {
    category = 'great'
  } else if (mistakesMade <= 5) {
    category = 'good'
  } else {
    category = 'needsWork'
  }

  const categoryMessages = messages[category]
  return categoryMessages[Math.floor(Math.random() * categoryMessages.length)]
}

/**
 * Generate today's debrief
 */
export function generateDailyDebrief(): DailyDebrief {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  // Get today's events
  const events = getTodayEvents()

  // Get all cards and due cards
  const allCards = getAllCards()
  const dueCards = getCardsDue()
  const overdueCards = getCardsOverdue()

  // Calculate stats from events
  const problemsAttempted = new Set(
    events
      .filter(e => e.type === 'problem_started')
      .map(e => e.metadata.problemId)
  ).size

  const stepsCompleted = events.filter(e => e.type === 'step_completed').length
  const hintsUsed = events.filter(e =>
    e.type === 'hint_unlocked' || e.type === 'hint_viewed'
  ).length

  // Count today's mistakes
  const todayCards = allCards.filter(card =>
    card.createdAt.startsWith(today)
  )
  const mistakesMade = todayCards.length

  // Analyze struggled concepts
  const struggledConcepts = analyzeStruggledConcepts(events, allCards)

  // Find strong concepts (in cards with high correct streaks)
  const strongConcepts = [...new Set(
    allCards
      .filter(card => card.correctStreak >= 3)
      .flatMap(card => card.conceptTags)
  )].slice(0, 5)

  // Generate review plan
  const reviewPlan = generateReviewPlan(struggledConcepts, dueCards)

  // Generate encouragement
  const encouragement = generateEncouragement(mistakesMade, stepsCompleted, dueCards.length)

  const debrief: DailyDebrief = {
    id: `debrief_${today}`,
    date: today,
    generatedAt: now,

    problemsAttempted,
    stepsCompleted,
    mistakesMade,
    hintsUsed,

    topStruggledConcepts: struggledConcepts,
    strongConcepts,

    reviewPlan,
    encouragement,

    cardsDueToday: dueCards.length,
    cardsOverdue: overdueCards.length
  }

  // Save debrief
  const debriefs = getDebriefs()
  // Remove any existing debrief for today
  const filtered = debriefs.filter(d => d.date !== today)
  filtered.push(debrief)
  saveDebriefs(filtered)

  // Mark as generated
  setLastDebriefDate(today)

  return debrief
}

/**
 * Get today's debrief (generate if needed)
 */
export function getTodayDebrief(): DailyDebrief {
  const today = new Date().toISOString().split('T')[0]
  const debriefs = getDebriefs()

  // Check if we have today's debrief
  const existing = debriefs.find(d => d.date === today)
  if (existing) {
    return existing
  }

  // Generate new debrief
  return generateDailyDebrief()
}

/**
 * Get debrief for a specific date
 */
export function getDebriefByDate(date: string): DailyDebrief | null {
  const debriefs = getDebriefs()
  return debriefs.find(d => d.date === date) || null
}

/**
 * Get recent debriefs
 */
export function getRecentDebriefs(limit: number = 7): DailyDebrief[] {
  const debriefs = getDebriefs()
  return debriefs
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
}

/**
 * Calculate overall progress from debriefs
 */
export function getProgressTrend(days: number = 7): {
  averageMistakes: number
  averageSteps: number
  trend: 'improving' | 'stable' | 'declining'
} {
  const debriefs = getRecentDebriefs(days)

  if (debriefs.length < 2) {
    return {
      averageMistakes: debriefs[0]?.mistakesMade || 0,
      averageSteps: debriefs[0]?.stepsCompleted || 0,
      trend: 'stable'
    }
  }

  const totalMistakes = debriefs.reduce((sum, d) => sum + d.mistakesMade, 0)
  const totalSteps = debriefs.reduce((sum, d) => sum + d.stepsCompleted, 0)

  const averageMistakes = totalMistakes / debriefs.length
  const averageSteps = totalSteps / debriefs.length

  // Compare first half to second half
  const mid = Math.floor(debriefs.length / 2)
  const recentMistakes = debriefs.slice(0, mid).reduce((sum, d) => sum + d.mistakesMade, 0) / mid
  const olderMistakes = debriefs.slice(mid).reduce((sum, d) => sum + d.mistakesMade, 0) / (debriefs.length - mid)

  let trend: 'improving' | 'stable' | 'declining'
  if (recentMistakes < olderMistakes * 0.8) {
    trend = 'improving'
  } else if (recentMistakes > olderMistakes * 1.2) {
    trend = 'declining'
  } else {
    trend = 'stable'
  }

  return { averageMistakes, averageSteps, trend }
}
