/**
 * Micro-Pattern Drills Types
 *
 * Rapid-fire questions designed to train reflex pattern recognition.
 * Each drill contains 8-15 micro prompts derived from a pattern,
 * with a 20-second time limit per question.
 */

// ============================================
// Core Types
// ============================================

/**
 * Type of drill item question
 */
export type DrillItemType = 'mcq' | 'short'

/**
 * A single drill item (question)
 */
export interface DrillItem {
  /** Unique identifier for this item */
  id: string
  /** The question/prompt text */
  promptText: string
  /** Type of question: multiple choice or short answer */
  type: DrillItemType
  /** Answer choices for MCQ (2-4 options) */
  choices?: string[]
  /** The correct answer (choice text for MCQ, or exact/regex for short) */
  correctAnswer: string
  /** One-line explanation shown after answering */
  explanationOneLiner: string
  /** Time limit in seconds (default: 20) */
  timeLimitSeconds: number
  /** Difficulty level */
  difficulty?: 'easy' | 'medium' | 'hard'
  /** Optional hint shown after first wrong attempt */
  hint?: string
}

/**
 * A complete drill set for a pattern
 */
export interface Drill {
  /** Unique identifier for this drill */
  id: string
  /** Pattern ID this drill trains */
  patternId: string
  /** Display title */
  title: string
  /** Brief description of what this drill covers */
  description?: string
  /** The drill items (8-15 questions) */
  items: DrillItem[]
  /** Estimated total time in seconds */
  estimatedTimeSeconds?: number
  /** Difficulty level of the drill overall */
  difficulty?: 'easy' | 'medium' | 'hard'
  /** Tags for categorization */
  tags?: string[]
  /** Creation/update metadata */
  createdAt?: string
  updatedAt?: string
}

// ============================================
// Session State Types
// ============================================

/**
 * Result of a single drill item attempt
 */
export interface DrillItemResult {
  /** Item ID */
  itemId: string
  /** User's answer */
  answer: string | null
  /** Whether the answer was correct */
  correct: boolean
  /** Time taken to answer in milliseconds */
  timeMs: number
  /** Whether the user ran out of time */
  timedOut: boolean
  /** Timestamp of completion */
  completedAt: string
}

/**
 * Current state of an active drill session
 */
export interface DrillSessionState {
  /** Drill ID being played */
  drillId: string
  /** Pattern ID for this drill */
  patternId: string
  /** Current item index (0-based) */
  currentIndex: number
  /** Total number of items */
  totalItems: number
  /** Results for completed items */
  results: DrillItemResult[]
  /** Session start timestamp */
  startedAt: string
  /** Whether the session is complete */
  isComplete: boolean
  /** Whether the session was abandoned */
  abandoned?: boolean
}

/**
 * Summary statistics for a completed drill session
 */
export interface DrillSessionSummary {
  /** Drill ID */
  drillId: string
  /** Pattern ID */
  patternId: string
  /** Number of correct answers */
  correctCount: number
  /** Total number of items */
  totalItems: number
  /** Accuracy percentage (0-100) */
  accuracy: number
  /** Average response time in milliseconds */
  averageTimeMs: number
  /** Total session time in milliseconds */
  totalTimeMs: number
  /** Number of timed out items */
  timedOutCount: number
  /** IDs of items answered incorrectly (for redo) */
  wrongItemIds: string[]
  /** Slowest items by time (top 3) */
  slowestItems: Array<{ itemId: string; timeMs: number }>
  /** Session completion timestamp */
  completedAt: string
}

// ============================================
// Progress Tracking Types
// ============================================

/**
 * Historical progress for a specific drill
 */
export interface DrillProgress {
  /** Drill ID */
  drillId: string
  /** Pattern ID */
  patternId: string
  /** Number of times completed */
  completionCount: number
  /** Best accuracy achieved (0-100) */
  bestAccuracy: number
  /** Best average time in milliseconds */
  bestAverageTimeMs: number
  /** Most recent attempt date */
  lastAttemptAt: string
  /** Historical session summaries (last 5) */
  recentSessions: DrillSessionSummary[]
}

/**
 * Overall drill progress across all patterns
 */
export interface DrillOverallProgress {
  /** Total drills completed */
  totalDrillsCompleted: number
  /** Total items answered */
  totalItemsAnswered: number
  /** Overall accuracy percentage */
  overallAccuracy: number
  /** Average response time across all drills */
  overallAverageTimeMs: number
  /** Progress by pattern */
  byPattern: Record<string, DrillProgress>
  /** Patterns needing more practice (accuracy < 70%) */
  weakPatternIds: string[]
  /** Patterns with strong performance (accuracy > 90%) */
  strongPatternIds: string[]
}

// ============================================
// Component Props Types
// ============================================

/**
 * Props for the DrillPlayer component
 */
export interface DrillPlayerProps {
  /** The drill to play */
  drill: Drill
  /** Callback when an item is answered */
  onItemComplete: (result: DrillItemResult) => void
  /** Callback when the drill is complete */
  onDrillComplete: (summary: DrillSessionSummary) => void
  /** Callback to exit/abandon the drill */
  onExit: () => void
  /** Whether to show item feedback immediately */
  showImmediateFeedback?: boolean
  /** Starting item index (for redo wrong only mode) */
  startIndex?: number
  /** Item IDs to include (for redo wrong only mode) */
  itemFilter?: string[]
}

/**
 * Props for the DrillResults component
 */
export interface DrillResultsProps {
  /** Summary of the completed session */
  summary: DrillSessionSummary
  /** The drill data for display */
  drill: Drill
  /** Callback to redo wrong items only */
  onRedoWrong: () => void
  /** Callback to retry full drill */
  onRetryFull: () => void
  /** Callback to return to drill selection */
  onExit: () => void
}

// ============================================
// Analytics Event Types
// ============================================

/**
 * Drill-related analytics events
 */
export interface DrillEventMetadata {
  drillId: string
  patternId: string
  itemId?: string
  itemIndex?: number
  totalItems?: number
  correct?: boolean
  timeMs?: number
  timedOut?: boolean
  accuracy?: number
  averageTimeMs?: number
  sessionDurationMs?: number
}

// ============================================
// Default Values
// ============================================

export const DEFAULT_ITEM_TIME_LIMIT = 20 // seconds
export const MIN_DRILL_ITEMS = 8
export const MAX_DRILL_ITEMS = 15
export const WEAK_ACCURACY_THRESHOLD = 70 // percent
export const STRONG_ACCURACY_THRESHOLD = 90 // percent
