/**
 * Mistake Intelligence Service
 *
 * Computes actionable mistake insights for the dashboard:
 * - Groups mistakes by category
 * - Ranks by frequency
 * - Links to patterns for targeted practice
 */

import type {
  MistakeIntelligenceData,
  MistakeCategory,
  MistakeSeverityLevel,
} from '@/types/mistakeIntelligence'
import { getSeverityFromCount } from '@/types/mistakeIntelligence'
import {
  getAllCards,
  getCardsDue,
  getNotebookStats,
} from '@/lib/mistakeNotebook'
import type { MistakeCard, MistakeTrigger } from '@/types/mistakeNotebook'

/**
 * Map trigger types to human-readable categories
 */
const TRIGGER_CATEGORY_MAP: Record<MistakeTrigger, string> = {
  'hint_requested': 'Needed Hints',
  'step_failed': 'Step Errors',
  'timeout': 'Time Pressure',
  'task_incorrect': 'Task Mistakes',
  'multiple_attempts': 'Multiple Attempts',
  'socratic_misconception': 'Conceptual Gaps',
  'overconfident_answer': 'Overconfidence',
  'repeated_struggle': 'Extended Struggle',
}

/**
 * Get description for trigger type
 */
function getTriggerDescription(trigger: MistakeTrigger): string {
  switch (trigger) {
    case 'hint_requested':
      return 'Required hints to proceed'
    case 'step_failed':
      return 'Made errors on solution steps'
    case 'timeout':
      return 'Took longer than expected'
    case 'task_incorrect':
      return 'Incorrect on comprehension tasks'
    case 'multiple_attempts':
      return 'Needed several tries'
    case 'socratic_misconception':
      return 'Fundamental concept misunderstanding'
    case 'overconfident_answer':
      return 'Confident but incorrect'
    case 'repeated_struggle':
      return 'Extended difficulty with material'
    default:
      return 'General mistake pattern'
  }
}

/**
 * Get suggested action for trigger type
 */
function getSuggestedAction(trigger: MistakeTrigger): string {
  switch (trigger) {
    case 'hint_requested':
      return 'Review foundational concepts'
    case 'step_failed':
      return 'Practice similar problem types'
    case 'timeout':
      return 'Work on timed drills'
    case 'task_incorrect':
      return 'Focus on comprehension checks'
    case 'multiple_attempts':
      return 'Slow down and plan first'
    case 'socratic_misconception':
      return 'Revisit core principles'
    case 'overconfident_answer':
      return 'Verify before finalizing'
    case 'repeated_struggle':
      return 'Break down into smaller steps'
    default:
      return 'Review and practice'
  }
}

/**
 * Group cards by concept tag and aggregate
 */
function groupByConceptTag(cards: MistakeCard[]): Map<string, {
  count: number
  lastOccurred: string
  triggers: MistakeTrigger[]
  domains: string[]
}> {
  const groups = new Map<string, {
    count: number
    lastOccurred: string
    triggers: MistakeTrigger[]
    domains: string[]
  }>()

  for (const card of cards) {
    // Use first concept tag as primary grouping
    const conceptTag = card.conceptTags[0] || 'General'

    const existing = groups.get(conceptTag)
    if (existing) {
      existing.count++
      if (card.createdAt > existing.lastOccurred) {
        existing.lastOccurred = card.createdAt
      }
      if (!existing.triggers.includes(card.trigger)) {
        existing.triggers.push(card.trigger)
      }
      if (!existing.domains.includes(card.domain)) {
        existing.domains.push(card.domain)
      }
    } else {
      groups.set(conceptTag, {
        count: 1,
        lastOccurred: card.createdAt,
        triggers: [card.trigger],
        domains: [card.domain],
      })
    }
  }

  return groups
}

/**
 * Group cards by trigger type and aggregate
 */
function groupByTrigger(cards: MistakeCard[]): Map<MistakeTrigger, {
  count: number
  lastOccurred: string
  conceptTags: string[]
  domains: string[]
}> {
  const groups = new Map<MistakeTrigger, {
    count: number
    lastOccurred: string
    conceptTags: string[]
    domains: string[]
  }>()

  for (const card of cards) {
    const existing = groups.get(card.trigger)
    if (existing) {
      existing.count++
      if (card.createdAt > existing.lastOccurred) {
        existing.lastOccurred = card.createdAt
      }
      // Add unique concept tags
      for (const tag of card.conceptTags) {
        if (!existing.conceptTags.includes(tag)) {
          existing.conceptTags.push(tag)
        }
      }
      if (!existing.domains.includes(card.domain)) {
        existing.domains.push(card.domain)
      }
    } else {
      groups.set(card.trigger, {
        count: 1,
        lastOccurred: card.createdAt,
        conceptTags: [...card.conceptTags],
        domains: [card.domain],
      })
    }
  }

  return groups
}

/**
 * Format concept tag for display
 */
function formatConceptTag(tag: string): string {
  return tag
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Compute mistake intelligence data
 */
export function computeMistakeIntelligence(): MistakeIntelligenceData {
  try {
    const allCards = getAllCards()
    const dueCards = getCardsDue()
    const stats = getNotebookStats()

    if (allCards.length === 0) {
      return getEmptyMistakeIntelligence()
    }

    // Get cards from last 30 days for relevance
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoff = thirtyDaysAgo.toISOString()

    const recentCards = allCards.filter(card => card.createdAt >= cutoff)

    // If no recent cards, use all cards but limit impact
    const cardsToAnalyze = recentCards.length > 0 ? recentCards : allCards.slice(-20)

    // Group by trigger type for category-based analysis
    const triggerGroups = groupByTrigger(cardsToAnalyze)

    // Convert to MistakeCategory array
    const categories: MistakeCategory[] = []

    for (const [trigger, data] of triggerGroups) {
      const severity = getSeverityFromCount(data.count)

      categories.push({
        id: `trigger_${trigger}`,
        category: TRIGGER_CATEGORY_MAP[trigger] || trigger,
        description: getTriggerDescription(trigger),
        occurrenceCount: data.count,
        lastOccurred: data.lastOccurred,
        associatedPattern: data.conceptTags[0]
          ? formatConceptTag(data.conceptTags[0])
          : undefined,
        severity,
        isFixable: true,
        suggestedAction: getSuggestedAction(trigger),
      })
    }

    // Sort by occurrence count (highest first)
    categories.sort((a, b) => b.occurrenceCount - a.occurrenceCount)

    // Take top 3
    const topMistakes = categories.slice(0, 3)

    return {
      topMistakes,
      totalMistakeTypes: categories.length,
      totalOccurrences: cardsToAnalyze.reduce((sum, _) => sum + 1, 0),
      reviewSessionAvailable: dueCards.length > 0,
      cardsDueForReview: stats.dueToday,
      isLoading: false,
      computedAt: new Date().toISOString(),
    }
  } catch (error) {
    console.error('[MistakeIntelligence] Error computing data:', error)
    return getEmptyMistakeIntelligence()
  }
}

/**
 * Get empty state for new users
 */
export function getEmptyMistakeIntelligence(): MistakeIntelligenceData {
  return {
    topMistakes: [],
    totalMistakeTypes: 0,
    totalOccurrences: 0,
    reviewSessionAvailable: false,
    cardsDueForReview: 0,
    isLoading: false,
    computedAt: new Date().toISOString(),
  }
}
