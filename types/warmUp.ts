/**
 * Warm-Up Protocol Types
 *
 * Short micro-drills before main session based on spaced repetition decay scores.
 * Helps students warm up with foundational skills before tackling new problems.
 */

/**
 * Warm-up block configuration with drills based on topic
 */
export interface WarmUpBlock {
  readonly id: string
  readonly topicId: string
  readonly title: string
  readonly description: string
  readonly durationMinutes: number // 2-5 minutes
  readonly drillTemplateIds: readonly string[]
  readonly difficulty: 'easy' | 'medium' | 'hard'
  readonly prerequisites?: readonly string[] // topicIds
}

/**
 * A warm-up drill item (simplified drill)
 */
export interface WarmUpDrillItem {
  readonly id: string
  readonly warmUpBlockId: string
  readonly promptText: string
  readonly type: 'mcq' | 'short' | 'fill'
  readonly choices?: readonly string[]
  readonly correctAnswer: string
  readonly explanation: string
  readonly timeLimitSeconds: number // Typically 15-30 seconds
}

/**
 * User's warm-up session state
 */
export interface WarmUpSession {
  readonly id: string
  readonly tenantId: string
  readonly userId: string
  readonly date: string // YYYY-MM-DD
  readonly assignedBlocks: readonly AssignedWarmUpBlock[]
  readonly status: WarmUpSessionStatus
  readonly startedAt?: string
  readonly completedAt?: string
  readonly skippedAt?: string
  readonly skipReason?: string
}

export type WarmUpSessionStatus =
  | 'assigned'    // Warm-up has been assigned but not started
  | 'in_progress' // User is working through warm-up
  | 'completed'   // User finished all warm-up blocks
  | 'skipped'     // User skipped (allowed once per day)

/**
 * An assigned warm-up block with completion tracking
 */
export interface AssignedWarmUpBlock {
  readonly blockId: string
  readonly order: number
  readonly status: 'pending' | 'in_progress' | 'completed' | 'skipped'
  readonly score?: number // 0-100
  readonly itemResults?: readonly WarmUpItemResult[]
  readonly startedAt?: string
  readonly completedAt?: string
}

/**
 * Result of a single warm-up drill item
 */
export interface WarmUpItemResult {
  readonly itemId: string
  readonly userAnswer: string
  readonly isCorrect: boolean
  readonly attemptCount: number
  readonly timeSpentSeconds: number
}

/**
 * User's warm-up skip tracking (once per day limit)
 */
export interface WarmUpSkipRecord {
  readonly userId: string
  readonly tenantId: string
  readonly lastSkipDate: string // YYYY-MM-DD
  readonly skipCount: number // Lifetime skip count
}

/**
 * Selection input for warm-up algorithm
 */
export interface WarmUpSelectionInput {
  readonly tenantId: string
  readonly userId: string
  readonly date: string
  readonly patternStates: readonly PatternDecayScore[]
  readonly recentMistakeTypes: readonly string[]
  readonly maxBlocks: number
  readonly maxDurationMinutes: number
}

/**
 * Pattern with decay score for warm-up selection
 */
export interface PatternDecayScore {
  readonly patternId: string
  readonly topicId: string
  readonly mastery: number // 0-1
  readonly decayScore: number // Higher = more urgent for review
  readonly daysSinceLastSeen: number
}

/**
 * Output of warm-up selection algorithm
 */
export interface WarmUpSelectionResult {
  readonly selectedBlocks: readonly WarmUpBlock[]
  readonly totalDurationMinutes: number
  readonly selectionReason: string
  readonly priorityTopics: readonly string[]
}

// Policy constants
export const WARMUP_POLICY = {
  MIN_DURATION_MINUTES: 2,
  MAX_DURATION_MINUTES: 5,
  MAX_BLOCKS_PER_SESSION: 3,
  MAX_ITEMS_PER_BLOCK: 5,
  DEFAULT_ITEM_TIME_LIMIT_SECONDS: 20,
  SKIP_PENALTY_MASTERY_DELTA: -0.05,
  DECAY_THRESHOLD_FOR_INCLUSION: 0.3, // Include if decay > this
  MASTERY_THRESHOLD_FOR_SKIP: 0.85, // Don't include if mastery > this
  SKIPS_ALLOWED_PER_DAY: 1,
} as const

// Event types for warm-up
export type WarmUpEventType =
  | 'warmup_assigned'
  | 'warmup_started'
  | 'warmup_item_completed'
  | 'warmup_block_completed'
  | 'warmup_completed'
  | 'warmup_skipped'

export interface WarmUpEventMetadata {
  warmUpSessionId?: string
  blockId?: string
  itemId?: string
  isCorrect?: boolean
  timeSpentSeconds?: number
  score?: number
  skipReason?: string
  totalBlocks?: number
  completedBlocks?: number
}
