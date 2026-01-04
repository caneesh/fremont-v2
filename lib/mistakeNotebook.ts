/**
 * Mistake Notebook Service
 *
 * Manages mistake cards, detects triggers, and persists data.
 * Uses StorageProvider for persistence (no database required).
 */

import { STORAGE_KEYS } from './storage/types'
import { createInitialSRS, getDueCards, getOverdueCards, applyReview } from './srsScheduler'
import type {
  MistakeCard,
  MistakeTrigger,
  MistakeSeverity,
  MistakeNotebookFilters,
  MistakeNotebookStats,
  ReviewSession,
  ReviewResult,
  ReviewQuality,
  SRSStatus
} from '@/types/mistakeNotebook'
import type { StepType } from '@/types/scaffold'

// ============================================
// Storage Helpers
// ============================================

function getCards(): MistakeCard[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MISTAKE_CARDS)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveCards(cards: MistakeCard[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.MISTAKE_CARDS, JSON.stringify(cards))
  } catch (error) {
    console.error('Failed to save mistake cards:', error)
  }
}

function getReviewSessions(): ReviewSession[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.REVIEW_SESSIONS)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveReviewSessions(sessions: ReviewSession[]): void {
  if (typeof window === 'undefined') return

  try {
    // Keep only last 100 sessions
    const trimmed = sessions.slice(-100)
    localStorage.setItem(STORAGE_KEYS.REVIEW_SESSIONS, JSON.stringify(trimmed))
  } catch (error) {
    console.error('Failed to save review sessions:', error)
  }
}

// ============================================
// Card Creation
// ============================================

/**
 * Generate a unique card ID
 */
function generateCardId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Determine severity based on trigger and context
 */
function determineSeverity(
  trigger: MistakeTrigger,
  hintLevel: number,
  attemptCount?: number
): MistakeSeverity {
  // Major: conceptual issues or needing many hints
  if (trigger === 'step_failed' && (attemptCount || 0) >= 3) return 'major'
  if (hintLevel >= 4) return 'major'

  // Moderate: needed help but got there
  if (trigger === 'hint_requested' && hintLevel >= 2) return 'moderate'
  if (trigger === 'task_incorrect' && (attemptCount || 0) >= 2) return 'moderate'
  if (trigger === 'timeout') return 'moderate'

  // Minor: small slips
  return 'minor'
}

/**
 * Generate a misconception note based on trigger (NO full solution)
 */
function generateMisconceptionNote(
  trigger: MistakeTrigger,
  stepType: StepType,
  stepTitle: string,
  conceptTags: string[]
): string {
  const conceptStr = conceptTags.slice(0, 2).join(', ')

  switch (trigger) {
    case 'hint_requested':
      if (stepType === 'physics_concept') {
        return `Needed help identifying the physics principle for "${stepTitle}". Review: ${conceptStr}`
      }
      if (stepType === 'math_manipulation') {
        return `Needed guidance on mathematical approach for "${stepTitle}". Practice: ${conceptStr}`
      }
      return `Required hints to complete "${stepTitle}". Focus on: ${conceptStr}`

    case 'step_failed':
      if (stepType === 'physics_concept') {
        return `Initial physics understanding was incorrect for "${stepTitle}". Key concept: ${conceptStr}`
      }
      return `Made errors in "${stepTitle}". Review the approach for: ${conceptStr}`

    case 'timeout':
      return `Took extra time on "${stepTitle}". Consider reviewing: ${conceptStr}`

    case 'task_incorrect':
      return `Incorrect response on task in "${stepTitle}". Practice: ${conceptStr}`

    case 'multiple_attempts':
      return `Required multiple attempts for "${stepTitle}". Strengthen: ${conceptStr}`

    default:
      return `Review needed for "${stepTitle}". Focus on: ${conceptStr}`
  }
}

export interface CreateCardInput {
  problemId: string
  problemTitle: string
  stepId: number
  stepTitle: string
  conceptTags: string[]
  stepType: StepType
  domain: string
  subdomain: string
  trigger: MistakeTrigger
  hintLevelReached: number
  attemptCount?: number
}

/**
 * Create a new mistake card
 */
export function createMistakeCard(input: CreateCardInput): MistakeCard {
  const now = new Date().toISOString()

  const severity = determineSeverity(
    input.trigger,
    input.hintLevelReached,
    input.attemptCount
  )

  const card: MistakeCard = {
    id: generateCardId(),
    createdAt: now,
    updatedAt: now,

    problemId: input.problemId,
    problemTitle: input.problemTitle,
    stepId: input.stepId,
    stepTitle: input.stepTitle,

    conceptTags: input.conceptTags,
    stepType: input.stepType,
    domain: input.domain,
    subdomain: input.subdomain,

    trigger: input.trigger,
    severity,
    misconceptionNote: generateMisconceptionNote(
      input.trigger,
      input.stepType,
      input.stepTitle,
      input.conceptTags
    ),
    hintLevelReached: input.hintLevelReached,

    srs: createInitialSRS(),

    reviewCount: 0,
    correctStreak: 0
  }

  // Save to storage
  const cards = getCards()
  cards.push(card)
  saveCards(cards)

  return card
}

/**
 * Check if a similar card already exists (avoid duplicates)
 */
export function cardExists(
  problemId: string,
  stepId: number
): boolean {
  const cards = getCards()
  return cards.some(card =>
    card.problemId === problemId &&
    card.stepId === stepId
  )
}

/**
 * Create card only if one doesn't already exist for this step
 */
export function createCardIfNotExists(input: CreateCardInput): MistakeCard | null {
  if (cardExists(input.problemId, input.stepId)) {
    return null
  }
  return createMistakeCard(input)
}

// ============================================
// Card Retrieval
// ============================================

/**
 * Get all cards
 */
export function getAllCards(): MistakeCard[] {
  return getCards()
}

/**
 * Get a card by ID
 */
export function getCardById(id: string): MistakeCard | null {
  const cards = getCards()
  return cards.find(card => card.id === id) || null
}

/**
 * Get cards with filters
 */
export function getFilteredCards(filters: MistakeNotebookFilters): MistakeCard[] {
  let cards = getCards()

  if (filters.conceptTags?.length) {
    cards = cards.filter(card =>
      filters.conceptTags!.some(tag => card.conceptTags.includes(tag))
    )
  }

  if (filters.stepTypes?.length) {
    cards = cards.filter(card =>
      filters.stepTypes!.includes(card.stepType)
    )
  }

  if (filters.domains?.length) {
    cards = cards.filter(card =>
      filters.domains!.includes(card.domain)
    )
  }

  if (filters.triggers?.length) {
    cards = cards.filter(card =>
      filters.triggers!.includes(card.trigger)
    )
  }

  if (filters.srsStatus?.length) {
    cards = cards.filter(card =>
      filters.srsStatus!.includes(card.srs.status)
    )
  }

  if (filters.dueOnly) {
    cards = getDueCards(cards)
  }

  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase()
    cards = cards.filter(card =>
      card.problemTitle.toLowerCase().includes(query) ||
      card.stepTitle.toLowerCase().includes(query) ||
      card.conceptTags.some(tag => tag.toLowerCase().includes(query)) ||
      card.misconceptionNote.toLowerCase().includes(query)
    )
  }

  return cards
}

/**
 * Get cards due for review
 */
export function getCardsDue(): MistakeCard[] {
  return getDueCards(getCards())
}

/**
 * Get overdue cards
 */
export function getCardsOverdue(): MistakeCard[] {
  return getOverdueCards(getCards())
}

// ============================================
// Card Updates
// ============================================

/**
 * Update a card
 */
export function updateCard(
  id: string,
  updates: Partial<MistakeCard>
): MistakeCard | null {
  const cards = getCards()
  const index = cards.findIndex(card => card.id === id)

  if (index === -1) return null

  const updatedCard: MistakeCard = {
    ...cards[index],
    ...updates,
    updatedAt: new Date().toISOString()
  }

  cards[index] = updatedCard
  saveCards(cards)

  return updatedCard
}

/**
 * Delete a card
 */
export function deleteCard(id: string): boolean {
  const cards = getCards()
  const filtered = cards.filter(card => card.id !== id)

  if (filtered.length === cards.length) return false

  saveCards(filtered)
  return true
}

/**
 * Suspend a card
 */
export function suspendCard(id: string): MistakeCard | null {
  return updateCard(id, {
    srs: {
      ...getCardById(id)!.srs,
      status: 'suspended' as SRSStatus
    }
  })
}

/**
 * Unsuspend a card
 */
export function unsuspendCard(id: string): MistakeCard | null {
  const card = getCardById(id)
  if (!card) return null

  const today = new Date().toISOString().split('T')[0]

  return updateCard(id, {
    srs: {
      ...card.srs,
      status: card.srs.interval > 0 ? 'review' : 'learning',
      dueDate: today
    }
  })
}

// ============================================
// Review Session
// ============================================

/**
 * Start a new review session
 */
export function startReviewSession(): ReviewSession {
  const session: ReviewSession = {
    id: `session_${Date.now()}`,
    startedAt: new Date().toISOString(),
    cardsReviewed: 0,
    cardsCorrect: 0,
    results: []
  }

  return session
}

/**
 * Record a review result
 */
export function recordReview(
  session: ReviewSession,
  cardId: string,
  quality: ReviewQuality,
  responseTimeMs: number,
  confidenceData?: { isCorrect: boolean; confidence: 'low' | 'medium' | 'high' }
): { session: ReviewSession; updatedCard: MistakeCard | null } {
  const card = getCardById(cardId)
  if (!card) {
    return { session, updatedCard: null }
  }

  // Apply review to card
  const updatedCard = applyReview(card, quality)

  // Update in storage
  const cards = getCards()
  const index = cards.findIndex(c => c.id === cardId)
  if (index !== -1) {
    cards[index] = updatedCard
    saveCards(cards)
  }

  // Update session with optional confidence data
  const result: ReviewResult = {
    cardId,
    quality,
    responseTimeMs,
    reviewedAt: new Date().toISOString(),
    ...(confidenceData && {
      isCorrect: confidenceData.isCorrect,
      confidence: confidenceData.confidence
    })
  }

  // For confidence-based reviews, use the explicit isCorrect value
  const isCorrectAnswer = confidenceData ? confidenceData.isCorrect : quality >= 3

  const updatedSession: ReviewSession = {
    ...session,
    cardsReviewed: session.cardsReviewed + 1,
    cardsCorrect: session.cardsCorrect + (isCorrectAnswer ? 1 : 0),
    results: [...session.results, result]
  }

  return { session: updatedSession, updatedCard }
}

/**
 * Complete a review session
 */
export function completeReviewSession(session: ReviewSession): ReviewSession {
  const completedSession: ReviewSession = {
    ...session,
    completedAt: new Date().toISOString()
  }

  // Save to history
  const sessions = getReviewSessions()
  sessions.push(completedSession)
  saveReviewSessions(sessions)

  // Update streak
  updateReviewStreak()

  return completedSession
}

/**
 * Update review streak
 */
function updateReviewStreak(): void {
  if (typeof window === 'undefined') return

  const today = new Date().toISOString().split('T')[0]
  const storedStreak = localStorage.getItem(STORAGE_KEYS.REVIEW_STREAK)

  let streak = { lastDate: '', count: 0 }
  if (storedStreak) {
    try {
      streak = JSON.parse(storedStreak)
    } catch {
      // Reset if invalid
    }
  }

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  if (streak.lastDate === today) {
    // Already reviewed today
    return
  } else if (streak.lastDate === yesterdayStr) {
    // Consecutive day - increment streak
    streak = { lastDate: today, count: streak.count + 1 }
  } else {
    // Streak broken - reset to 1
    streak = { lastDate: today, count: 1 }
  }

  localStorage.setItem(STORAGE_KEYS.REVIEW_STREAK, JSON.stringify(streak))
}

// ============================================
// Statistics
// ============================================

/**
 * Get notebook statistics
 */
export function getNotebookStats(): MistakeNotebookStats {
  const cards = getCards()
  const today = new Date().toISOString().split('T')[0]

  // Count by status
  const cardsByStatus: Record<SRSStatus, number> = {
    new: 0,
    learning: 0,
    review: 0,
    graduated: 0,
    suspended: 0
  }

  const cardsByDomain: Record<string, number> = {}
  let dueToday = 0
  let overdue = 0
  let totalCorrectStreak = 0

  for (const card of cards) {
    cardsByStatus[card.srs.status]++

    cardsByDomain[card.domain] = (cardsByDomain[card.domain] || 0) + 1

    if (card.srs.status !== 'suspended') {
      if (card.srs.dueDate === today) dueToday++
      if (card.srs.dueDate < today) overdue++
    }

    totalCorrectStreak += card.correctStreak
  }

  // Get streak
  let streakDays = 0
  if (typeof window !== 'undefined') {
    try {
      const storedStreak = localStorage.getItem(STORAGE_KEYS.REVIEW_STREAK)
      if (storedStreak) {
        const streak = JSON.parse(storedStreak)
        streakDays = streak.count || 0
      }
    } catch {
      // Ignore
    }
  }

  // Calculate average retention (based on correct streaks)
  const reviewedCards = cards.filter(c => c.reviewCount > 0)
  const averageRetention = reviewedCards.length > 0
    ? (totalCorrectStreak / reviewedCards.reduce((sum, c) => sum + c.reviewCount, 0)) * 100
    : 0

  return {
    totalCards: cards.length,
    cardsByStatus,
    cardsByDomain,
    dueToday: dueToday + overdue, // Include overdue in due count
    overdue,
    averageRetention: Math.min(100, Math.round(averageRetention)),
    streakDays
  }
}

/**
 * Get unique concept tags across all cards
 */
export function getAllConceptTags(): string[] {
  const cards = getCards()
  const tags = new Set<string>()

  for (const card of cards) {
    for (const tag of card.conceptTags) {
      tags.add(tag)
    }
  }

  return Array.from(tags).sort()
}

/**
 * Get unique domains across all cards
 */
export function getAllDomains(): string[] {
  const cards = getCards()
  const domains = new Set<string>()

  for (const card of cards) {
    domains.add(card.domain)
  }

  return Array.from(domains).sort()
}

// ============================================
// Socratic-First Mode Integration
// ============================================

import type {
  SocraticMistakeTrigger,
  SocraticExchangeRecord,
  VerificationResult,
} from '@/types/socraticFirst'

/**
 * Input for creating a Socratic mistake card
 */
export interface CreateSocraticCardInput {
  problemId: string
  problemTitle: string
  stepId: number
  stepTitle: string
  conceptTags: string[]
  stepType: StepType
  domain: string
  subdomain: string
  trigger: SocraticMistakeTrigger
  exchanges: SocraticExchangeRecord[]
  misconceptionDetails?: Array<{
    conceptId: string
    description: string
    severity: 'minor' | 'moderate' | 'major'
  }>
}

/**
 * Create a mistake card from Socratic interaction
 */
export function createSocraticMistakeCard(input: CreateSocraticCardInput): MistakeCard {
  const now = new Date().toISOString()

  // Determine severity based on Socratic trigger and context
  let severity: MistakeSeverity = 'minor'

  if (input.trigger === 'socratic_misconception') {
    // Check misconception severity from AI analysis
    const maxSeverity = input.misconceptionDetails?.reduce(
      (max, m) => {
        const severityOrder = { minor: 1, moderate: 2, major: 3 }
        return severityOrder[m.severity] > severityOrder[max] ? m.severity : max
      },
      'minor' as 'minor' | 'moderate' | 'major'
    )
    severity = maxSeverity || 'moderate'
  } else if (input.trigger === 'overconfident_answer') {
    // Overconfidence is a moderate concern - they thought they knew but didn't
    severity = 'moderate'
  } else if (input.trigger === 'repeated_struggle') {
    // Many exchanges without progress is major
    severity = input.exchanges.length >= 5 ? 'major' : 'moderate'
  }

  // Generate misconception note from Socratic context
  const misconceptionNote = generateSocraticMisconceptionNote(input)

  // Calculate pseudo hint level from exchanges
  // Pure Socratic with few exchanges = low level
  // Many exchanges or misconceptions = higher level
  let hintLevelReached = 0
  if (input.trigger === 'socratic_misconception') {
    hintLevelReached = severity === 'major' ? 4 : severity === 'moderate' ? 3 : 2
  } else if (input.trigger === 'overconfident_answer') {
    hintLevelReached = 2
  } else if (input.trigger === 'repeated_struggle') {
    hintLevelReached = Math.min(input.exchanges.length - 1, 4)
  }

  const card: MistakeCard = {
    id: generateCardId(),
    createdAt: now,
    updatedAt: now,

    problemId: input.problemId,
    problemTitle: input.problemTitle,
    stepId: input.stepId,
    stepTitle: input.stepTitle,

    conceptTags: input.conceptTags,
    stepType: input.stepType,
    domain: input.domain,
    subdomain: input.subdomain,

    trigger: input.trigger,
    severity,
    misconceptionNote,
    hintLevelReached,

    srs: createInitialSRS(),

    reviewCount: 0,
    correctStreak: 0
  }

  // Save to storage
  const cards = getCards()
  cards.push(card)
  saveCards(cards)

  console.log(
    `[MistakeNotebook] Created Socratic card: ${input.trigger} for "${input.stepTitle}" (${severity})`
  )

  return card
}

/**
 * Generate misconception note for Socratic interactions
 */
function generateSocraticMisconceptionNote(input: CreateSocraticCardInput): string {
  const conceptStr = input.conceptTags.slice(0, 2).join(', ')
  const lastExchange = input.exchanges[input.exchanges.length - 1]
  const lastFeedback = lastExchange?.aiVerification?.feedback

  switch (input.trigger) {
    case 'socratic_misconception':
      // Use misconception details if available
      if (input.misconceptionDetails?.length) {
        const mainMisconception = input.misconceptionDetails[0]
        return `Misconception detected in "${input.stepTitle}": ${mainMisconception.description}. Key concepts: ${conceptStr}`
      }
      return `Fundamental misunderstanding identified in "${input.stepTitle}". Focus on: ${conceptStr}`

    case 'overconfident_answer':
      return `Overconfident response on "${input.stepTitle}" - reported high confidence but AI found gaps. ${lastFeedback ? `Feedback: "${lastFeedback.slice(0, 100)}..."` : `Review: ${conceptStr}`}`

    case 'repeated_struggle':
      return `Extended difficulty with "${input.stepTitle}" (${input.exchanges.length} exchanges needed). Strengthen understanding of: ${conceptStr}`

    default:
      return `Difficulty in Socratic exploration of "${input.stepTitle}". Review: ${conceptStr}`
  }
}

/**
 * Check if a Socratic mistake card should be created based on exchange results
 * Returns the appropriate trigger if a card should be created, null otherwise
 */
export function shouldCreateSocraticCard(
  exchanges: SocraticExchangeRecord[],
  finalVerification?: VerificationResult
): SocraticMistakeTrigger | null {
  if (exchanges.length === 0) return null

  // Check for misconception
  if (finalVerification?.answerQuality === 'misconception') {
    return 'socratic_misconception'
  }

  // Check exchanges for misconception pattern
  const misconceptionCount = exchanges.filter(
    e => e.aiVerification.answerQuality === 'misconception'
  ).length
  if (misconceptionCount >= 2) {
    return 'socratic_misconception'
  }

  // Check for overconfidence pattern
  const overconfidentCount = exchanges.filter(
    e => e.selfReport === 'solid' &&
      (e.aiVerification.answerQuality === 'partial' || e.aiVerification.answerQuality === 'misconception')
  ).length
  if (overconfidentCount >= 1) {
    return 'overconfident_answer'
  }

  // Check for repeated struggle (many exchanges without reaching mastery)
  if (exchanges.length >= 5 && finalVerification?.answerQuality !== 'excellent') {
    return 'repeated_struggle'
  }

  return null
}

/**
 * Create a Socratic mistake card only if conditions are met
 */
export function createSocraticCardIfNeeded(
  input: Omit<CreateSocraticCardInput, 'trigger'>,
  exchanges: SocraticExchangeRecord[],
  finalVerification?: VerificationResult
): MistakeCard | null {
  // Check if we should create a card
  const trigger = shouldCreateSocraticCard(exchanges, finalVerification)
  if (!trigger) return null

  // Check for existing card
  if (cardExists(input.problemId, input.stepId)) {
    return null
  }

  return createSocraticMistakeCard({
    ...input,
    trigger,
    exchanges,
    misconceptionDetails: finalVerification?.conceptGaps?.map(gap => ({
      conceptId: gap,
      description: `Gap in understanding: ${gap}`,
      severity: 'moderate' as const,
    })),
  })
}
