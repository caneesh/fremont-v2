/**
 * Mistake Notebook + SRS Types
 *
 * Tracks learning mistakes and schedules reviews using
 * spaced repetition (SM-2-like algorithm).
 */

import type { StepType } from './scaffold'

// ============================================
// Mistake Trigger Types
// ============================================

export type MistakeTrigger =
  | 'hint_requested'      // User requested a hint
  | 'step_failed'         // User failed step validation
  | 'timeout'             // User took too long
  | 'task_incorrect'      // Micro-task answered incorrectly
  | 'multiple_attempts'   // Required multiple attempts

export type MistakeSeverity = 'minor' | 'moderate' | 'major'

// ============================================
// Mistake Card
// ============================================

export interface MistakeCard {
  id: string
  createdAt: string              // ISO timestamp
  updatedAt: string              // ISO timestamp

  // Context
  problemId: string
  problemTitle: string           // Short problem description
  stepId: number
  stepTitle: string

  // Classification
  conceptTags: string[]          // e.g., ["conservation_of_momentum", "collisions"]
  stepType: StepType             // physics_concept, math_manipulation, etc.
  domain: string                 // e.g., "Mechanics"
  subdomain: string              // e.g., "Conservation Laws"

  // Mistake details
  trigger: MistakeTrigger
  severity: MistakeSeverity
  misconceptionNote: string      // Short note about what went wrong (NO full solution)
  hintLevelReached: number       // How many hints before getting it

  // SRS scheduling
  srs: SRSData

  // Stats
  reviewCount: number            // Times reviewed
  correctStreak: number          // Consecutive correct reviews
  lastReviewedAt?: string        // ISO timestamp
}

// ============================================
// SRS (Spaced Repetition) Data
// ============================================

export type SRSStatus = 'new' | 'learning' | 'review' | 'graduated' | 'suspended'

export interface SRSData {
  status: SRSStatus
  interval: number               // Days until next review
  easeFactor: number             // SM-2 ease factor (default 2.5)
  dueDate: string                // ISO date (YYYY-MM-DD)
  step: number                   // Learning step (for new cards)
}

// SRS intervals for learning phase
export const SRS_LEARNING_STEPS = [1, 3]  // minutes
export const SRS_GRADUATING_INTERVAL = 1  // days
export const SRS_EASY_INTERVAL = 4        // days

// Review intervals
export const SRS_INTERVALS = {
  initial: 1,    // 1 day
  second: 3,     // 3 days
  third: 7,      // 7 days
  fourth: 14,    // 14 days
  max: 180       // 6 months max
}

// ============================================
// Review Session
// ============================================

export type ReviewQuality =
  | 0  // Complete blackout, wrong answer
  | 1  // Incorrect, but upon seeing hint remembered
  | 2  // Incorrect, but easy to recall with effort
  | 3  // Correct with serious difficulty
  | 4  // Correct after hesitation
  | 5  // Perfect response

export interface ReviewResult {
  cardId: string
  quality: ReviewQuality
  responseTimeMs: number
  reviewedAt: string
}

export interface ReviewSession {
  id: string
  startedAt: string
  completedAt?: string
  cardsReviewed: number
  cardsCorrect: number
  results: ReviewResult[]
}

// ============================================
// Daily Debrief
// ============================================

export interface StruggledConcept {
  conceptTag: string
  conceptName: string
  mistakeCount: number
  lastSeen: string
  averageHintsNeeded: number
  relatedCards: string[]         // Card IDs
}

export interface ReviewPlanItem {
  type: 'concept_review' | 'practice_problem' | 'flashcard_review'
  title: string
  description: string
  estimatedMinutes: number
  conceptTags: string[]
  cardIds?: string[]
}

export interface DailyDebrief {
  id: string
  date: string                   // YYYY-MM-DD
  generatedAt: string

  // Summary stats
  problemsAttempted: number
  stepsCompleted: number
  mistakesMade: number
  hintsUsed: number

  // Analysis
  topStruggledConcepts: StruggledConcept[]  // Top 3
  strongConcepts: string[]                   // Concepts with no mistakes

  // Recommendations
  reviewPlan: ReviewPlanItem[]               // ~10 minute plan
  encouragement: string                      // Motivational message

  // Cards due
  cardsDueToday: number
  cardsOverdue: number
}

// ============================================
// Filters and Queries
// ============================================

export interface MistakeNotebookFilters {
  conceptTags?: string[]
  stepTypes?: StepType[]
  domains?: string[]
  triggers?: MistakeTrigger[]
  srsStatus?: SRSStatus[]
  dueOnly?: boolean              // Only cards due for review
  searchQuery?: string
}

export interface MistakeNotebookStats {
  totalCards: number
  cardsByStatus: Record<SRSStatus, number>
  cardsByDomain: Record<string, number>
  dueToday: number
  overdue: number
  averageRetention: number       // Percentage
  streakDays: number             // Consecutive days with reviews
}

// ============================================
// Storage Keys
// ============================================

export const MISTAKE_STORAGE_KEYS = {
  CARDS: 'physiscaffold_mistake_cards',
  REVIEWS: 'physiscaffold_review_sessions',
  DEBRIEFS: 'physiscaffold_daily_debriefs',
  LAST_DEBRIEF_DATE: 'physiscaffold_last_debrief',
  STREAK: 'physiscaffold_review_streak'
} as const

// ============================================
// Type Guards
// ============================================

export function isMistakeCard(obj: unknown): obj is MistakeCard {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'conceptTags' in obj &&
    'srs' in obj &&
    'trigger' in obj
  )
}

export function isCardDue(card: MistakeCard): boolean {
  const today = new Date().toISOString().split('T')[0]
  return card.srs.dueDate <= today && card.srs.status !== 'suspended'
}

export function isCardOverdue(card: MistakeCard): boolean {
  const today = new Date().toISOString().split('T')[0]
  return card.srs.dueDate < today && card.srs.status !== 'suspended'
}
