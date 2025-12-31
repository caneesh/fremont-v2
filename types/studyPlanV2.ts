/**
 * Study Plan v2 Types
 *
 * Pattern-first learning system with:
 * - Meta-skills (foundational thinking skills)
 * - Pattern Tracks (core problem-solving patterns)
 * - Topic exposure (secondary, aligned to patterns)
 * - Error recycling (mistake → pattern → fix loop)
 * - Confidence-weighted spaced repetition (SRS)
 */

// ============================================
// Meta-Skills (Foundation Layer)
// ============================================

/**
 * Meta-skill: A foundational thinking skill that spans multiple patterns.
 * Examples: Sign/Direction Discipline, Dimensional Analysis, Boundary Case Thinking
 */
export interface MetaSkill {
  id: string
  name: string
  description: string
  /** Core mental habits this meta-skill develops */
  habits: string[]
  /** Which patterns benefit from this meta-skill */
  relatedPatternIds: string[]
  /** Lesson/concept page URL or content key */
  learnContentKey: string
  /** Order for display and rotation */
  order: number
}

// ============================================
// Patterns (Core Layer)
// ============================================

/**
 * Pattern: A reusable problem-solving approach or technique.
 * Examples: Constraint Projection, Frame Selection, Conservation Check
 */
export interface Pattern {
  id: string
  name: string
  description: string
  /** Detailed explanation for the "Learn" session */
  learnContent: string
  /** Quick summary shown in dashboard */
  summary: string
  /** Which meta-skills this pattern requires */
  metaSkillIds: string[]
  /** Common mistakes when applying this pattern */
  commonTraps: string[]
  /** Difficulty level 1-5 */
  difficulty: number
  /** Which topics this pattern appears in */
  topicIds: string[]
  /** Keywords for search/filtering */
  keywords: string[]
}

/**
 * PatternTrack: A sequence of patterns to master in order.
 * Used for weekly focus and structured progression.
 */
export interface PatternTrack {
  id: string
  name: string
  description: string
  /** Ordered list of pattern IDs in this track */
  patternIds: string[]
  /** Prerequisites: other tracks that should be completed first */
  prerequisiteTrackIds: string[]
  /** Approximate time to complete in days */
  estimatedDays: number
  /** Which topics this track prepares you for */
  targetTopicIds: string[]
  /** Order for display */
  order: number
}

// ============================================
// Problems (Enhanced with Pattern Tags)
// ============================================

/**
 * Enhanced Problem with pattern and trap tags for v2.
 * Extends the existing Question type with additional metadata.
 */
export interface ProblemV2 {
  id: string
  title: string
  statement: string
  /** Primary topic (mechanics, thermodynamics, etc.) */
  topicId: string
  /** Subtopic within the topic */
  subtopicId: string
  /** Difficulty 1-5 */
  difficulty: number
  /** Original source (JEE Advanced, Irodov, etc.) */
  source?: string
  year?: number
  /** Expected solve time in minutes */
  expectedTime: number
  /** Concepts covered (existing field) */
  concepts: string[]
  /** Pattern tags: which patterns this problem exercises */
  patternTags: string[]
  /** Trap tags: common mistakes students make on this problem */
  trapTags: string[]
  /** Problem type for session selection */
  problemType: 'learn' | 'practice' | 'drill' | 'challenge'
  /** Whether this is a micro-drill for error recycling */
  isMicroDrill: boolean
  /** If micro-drill, which mistake types it targets */
  targetsMistakeTypes?: string[]
}

// ============================================
// Mistake Types (Error Classification)
// ============================================

/**
 * MistakeType: A categorization of common errors.
 * Used for error recycling and targeted practice.
 */
export interface MistakeType {
  id: string
  name: string
  description: string
  /** Category of mistake */
  category: MistakeCategory
  /** Which pattern this mistake relates to */
  relatedPatternId: string
  /** Which meta-skill, if any, this mistake indicates weakness in */
  relatedMetaSkillId?: string
  /** Remediation: what to practice */
  remediation: string
  /** Keywords to match in error analysis */
  matchKeywords: string[]
}

export type MistakeCategory =
  | 'SIGN_DIRECTION'           // Sign/direction errors
  | 'FORCE_DECOMPOSITION'      // Component resolution errors
  | 'FRAME_SELECTION'          // Reference frame issues
  | 'CONSTRAINT_MISSED'        // Missed problem constraints
  | 'CONSERVATION_MISUSE'      // Incorrect conservation application
  | 'LOW_CONFIDENCE'           // Revealed answer without trying
  | 'FRAGILE_UNDERSTANDING'    // Correct but needed many hints
  | 'ALGEBRA_ERROR'            // Mathematical manipulation errors
  | 'UNIT_ERROR'               // Unit conversion/consistency errors
  | 'CONCEPTUAL_CONFUSION'     // Mixed up related concepts

// ============================================
// User State (Per-User Progress)
// ============================================

/**
 * UserPatternState: Tracks a user's progress on a single pattern.
 */
export interface UserPatternState {
  patternId: string
  userId: string
  /** Mastery score 0..1 */
  mastery: number
  /** Last time this pattern was practiced */
  lastSeenAt: string
  /** When the next review is due (SRS) */
  reviewDueAt: string
  /** Count of recent failures (decays over time) */
  recentFailCount: number
  /** Total problems attempted for this pattern */
  totalAttempts: number
  /** Total correct (no hint, no reveal) */
  totalCorrect: number
  /** Session stages completed */
  learnCompleted: boolean
  guidedPracticeCompleted: boolean
  drillsAttempted: number
  /** Timestamps for completion */
  learnCompletedAt?: string
  guidedPracticeCompletedAt?: string
}

/**
 * UserMetaSkillState: Tracks a user's progress on a meta-skill.
 */
export interface UserMetaSkillState {
  metaSkillId: string
  userId: string
  /** Mastery score 0..1 */
  mastery: number
  /** Last practice date */
  lastPracticedAt: string
  /** When next practice is due */
  nextPracticeDueAt: string
  /** How many times we've cycled through this */
  cycleCount: number
}

/**
 * UserMistakeEvent: A single mistake instance for a user.
 */
export interface UserMistakeEvent {
  id: string
  userId: string
  /** Which mistake type was detected */
  mistakeTypeId: string
  /** Problem where mistake occurred */
  problemId: string
  /** Step within problem */
  stepIndex: number
  /** When the mistake happened */
  occurredAt: string
  /** Context for the mistake */
  context: {
    /** What the user attempted */
    userAttempt?: string
    /** Hint level reached before mistake */
    hintLevel: number
    /** Whether user revealed the answer */
    usedReveal: boolean
    /** Time spent on step in seconds */
    timeSpentSeconds: number
  }
  /** Whether this has been addressed via error recycling */
  recycled: boolean
  /** When it was recycled */
  recycledAt?: string
}

// ============================================
// Daily Plan (Generated Each Day)
// ============================================

/**
 * SessionType: The type of study session.
 */
export type SessionType = 'learn' | 'guided_practice' | 'timed_drill' | 'review_mistakes'

/**
 * DailyPlanItem: A single item in the daily plan.
 */
export interface DailyPlanItem {
  id: string
  type: SessionType
  /** Human-readable title */
  title: string
  /** Brief description */
  description: string
  /** Pattern being practiced (if applicable) */
  patternId?: string
  /** Meta-skill being practiced (if applicable) */
  metaSkillId?: string
  /** Problem IDs to work through */
  problemIds: string[]
  /** Estimated time in minutes */
  estimatedMinutes: number
  /** Priority for ordering */
  priority: number
  /** Whether this is an error recycling item */
  isErrorRecycling: boolean
  /** If error recycling, which mistake type it addresses */
  mistakeTypeId?: string
  /** Whether this item has been completed today */
  completed: boolean
  /** Completion timestamp */
  completedAt?: string
}

/**
 * DailyPlan: The complete plan for a single day.
 */
export interface DailyPlan {
  id: string
  userId: string
  /** The date this plan is for (YYYY-MM-DD) */
  date: string
  /** When the plan was generated */
  generatedAt: string
  /** Today's thinking objective (one sentence) */
  thinkingObjective: string
  /** The pattern track currently in focus */
  focusedPatternTrackId: string
  /** The pattern currently being emphasized */
  focusedPatternId: string
  /** Topics being covered today */
  topicExposure: string[]
  /** The planned items for today */
  items: DailyPlanItem[]
  /** Overall completion percentage */
  completionPercent: number
  /** Version for cache invalidation */
  version: number
}

// ============================================
// Step Attempt Telemetry
// ============================================

/**
 * StepAttemptEvent: Telemetry for a single step attempt.
 */
export interface StepAttemptEvent {
  id: string
  userId: string
  problemId: string
  stepIndex: number
  /** When the attempt occurred */
  attemptedAt: string
  /** Whether the step was correct */
  isCorrect: boolean
  /** How many hints were used */
  hintCount: number
  /** Whether the answer was revealed */
  usedReveal: boolean
  /** Whether user entered read-only mode */
  enteredReadOnlyMode: boolean
  /** Time spent on this step in seconds */
  timeSpentSeconds: number
  /** User's confidence rating if provided */
  confidenceRating?: 'low' | 'medium' | 'high'
  /** Detected mistake type (if any) */
  detectedMistakeTypeId?: string
  /** Pattern being exercised */
  patternId?: string
}

// ============================================
// Mastery & SRS Constants
// ============================================

export const MASTERY_CONSTANTS = {
  /** Delta for correct answer with no hints */
  CORRECT_NO_HINT_DELTA: 0.15,
  /** Delta for correct answer with hints */
  CORRECT_WITH_HINT_DELTA: 0.08,
  /** Delta for incorrect answer */
  INCORRECT_DELTA: -0.12,
  /** Delta for reveal/read-only (bigger penalty) */
  REVEAL_PENALTY: -0.20,
  /** Minimum mastery */
  MIN_MASTERY: 0,
  /** Maximum mastery */
  MAX_MASTERY: 1,
  /** Threshold to consider pattern "weak" */
  WEAK_THRESHOLD: 0.4,
  /** Threshold to consider pattern "strong" */
  STRONG_THRESHOLD: 0.75,
  /** Base interval in days for SRS */
  BASE_INTERVAL_DAYS: 1,
  /** Factor for interval growth based on mastery */
  INTERVAL_MASTERY_FACTOR: 5,
  /** Decay rate for recent_fail_count (per day) */
  FAIL_COUNT_DECAY_RATE: 0.1,
} as const

export const SRS_CONSTANTS = {
  /** Maximum interval in days */
  MAX_INTERVAL_DAYS: 60,
  /** Minimum interval in days */
  MIN_INTERVAL_DAYS: 0.5,
  /** How much recent failures reduce interval */
  FAIL_COUNT_INTERVAL_DIVISOR: 1,
} as const

// ============================================
// Dashboard Display Types
// ============================================

/**
 * ConfidenceMeterEntry: Entry for the confidence meter display.
 */
export interface ConfidenceMeterEntry {
  patternId: string
  patternName: string
  mastery: number
  trend: 'improving' | 'stable' | 'declining'
  lastSeen: string
  isWeak: boolean
}

/**
 * ErrorWatchlistEntry: Entry for the error watchlist display.
 */
export interface ErrorWatchlistEntry {
  mistakeTypeId: string
  mistakeTypeName: string
  occurrenceCount: number
  lastOccurred: string
  relatedPatternName: string
  suggestedAction: string
}

/**
 * PatternTrackProgress: Progress within a pattern track.
 */
export interface PatternTrackProgress {
  trackId: string
  trackName: string
  currentPatternIndex: number
  totalPatterns: number
  completedPatterns: number
  overallMastery: number
  isActive: boolean
}

// ============================================
// Storage Keys
// ============================================

export const STUDY_PLAN_V2_STORAGE_KEYS = {
  USER_PATTERN_STATES: 'physiscaffold_v2_pattern_states',
  USER_METASKILL_STATES: 'physiscaffold_v2_metaskill_states',
  USER_MISTAKE_EVENTS: 'physiscaffold_v2_mistake_events',
  DAILY_PLANS: 'physiscaffold_v2_daily_plans',
  STEP_ATTEMPTS: 'physiscaffold_v2_step_attempts',
  CURRENT_TRACK_ID: 'physiscaffold_v2_current_track',
  LAST_METASKILL_DATE: 'physiscaffold_v2_last_metaskill_date',
} as const

// ============================================
// Type Guards
// ============================================

export function isPatternWeak(state: UserPatternState): boolean {
  return state.mastery < MASTERY_CONSTANTS.WEAK_THRESHOLD
}

export function isPatternStrong(state: UserPatternState): boolean {
  return state.mastery >= MASTERY_CONSTANTS.STRONG_THRESHOLD
}

export function isPatternDue(state: UserPatternState): boolean {
  const now = new Date().toISOString()
  return state.reviewDueAt <= now
}

export function isProblemV2(obj: unknown): obj is ProblemV2 {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'patternTags' in obj &&
    'trapTags' in obj
  )
}
