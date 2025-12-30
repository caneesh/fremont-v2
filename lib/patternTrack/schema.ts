/**
 * Pattern Identification Track - Schema & Types
 *
 * Defines the core data models for the pattern-based learning system.
 * Designed for JSON backend (V1) with easy migration path to Postgres/Prisma (V2).
 */

// ============================================================================
// Core Entity Types
// ============================================================================

/**
 * A physics pattern that students learn to identify
 * Examples: "Conservation of Energy", "Newton's Second Law Application"
 */
export interface Pattern {
  id: string
  name: string
  description: string
  /** Category for grouping (e.g., "mechanics", "electromagnetism") */
  category: string
  /** Difficulty 1-5 */
  difficulty: number
  /** Visual cues that indicate this pattern */
  recognition_cues: string[]
  /** Common mistakes when applying this pattern */
  common_pitfalls: string[]
  /** Related patterns for cross-referencing */
  related_pattern_ids: string[]
  /** Order within category for structured learning */
  display_order: number
  /** Timestamps for future DB compatibility */
  created_at: string
  updated_at: string
}

/**
 * A lesson that teaches one or more patterns
 */
export interface Lesson {
  id: string
  title: string
  description: string
  /** Patterns taught in this lesson */
  pattern_ids: string[]
  /** Ordered content blocks */
  content: LessonContent[]
  /** Prerequisites (other lesson IDs) */
  prerequisite_lesson_ids: string[]
  /** Estimated time in minutes */
  estimated_minutes: number
  /** Order within the track */
  display_order: number
  created_at: string
  updated_at: string
}

/**
 * Content block within a lesson
 */
export type LessonContent =
  | { type: 'text'; content: string }
  | { type: 'example'; pattern_id: string; problem: string; solution: string; explanation: string }
  | { type: 'diagram'; url: string; alt: string; caption?: string }
  | { type: 'video'; url: string; duration_seconds: number }
  | { type: 'interactive'; component_id: string; props?: Record<string, unknown> }
  | { type: 'checkpoint'; question_ids: string[] }

/**
 * A practice question that tests pattern identification
 */
export interface Question {
  id: string
  /** The problem statement (supports LaTeX via $...$) */
  problem_text: string
  /** Patterns that apply to this problem */
  pattern_refs: PatternRef[]
  /** Difficulty 1-5 */
  difficulty: number
  /** Problem category */
  category: string
  /** Subcategory for finer filtering */
  subcategory?: string
  /** Hints available for this question */
  hints: QuestionHint[]
  /** The correct answer (for auto-grading) */
  answer: QuestionAnswer
  /** Detailed solution explanation */
  solution_explanation: string
  /** Tags for filtering and search */
  tags: string[]
  /** Source reference (textbook, exam, etc.) */
  source?: string
  created_at: string
  updated_at: string
}

/**
 * Reference to a pattern within a question
 */
export interface PatternRef {
  pattern_id: string
  /** How this pattern applies (primary, secondary, supporting) */
  relevance: 'primary' | 'secondary' | 'supporting'
  /** Explanation of how this pattern applies */
  application_notes?: string
}

/**
 * A hint for a question
 */
export interface QuestionHint {
  order: number
  text: string
  /** Optional pattern this hint relates to */
  pattern_id?: string
}

/**
 * Answer format for a question
 */
export type QuestionAnswer =
  | { type: 'numeric'; value: number; unit: string; tolerance?: number }
  | { type: 'symbolic'; expression: string; equivalent_forms?: string[] }
  | { type: 'multiple_choice'; options: string[]; correct_index: number }
  | { type: 'pattern_selection'; correct_pattern_ids: string[] }
  | { type: 'free_response'; rubric: string[] }

// ============================================================================
// Progress & Analytics Types
// ============================================================================

/**
 * User's progress on a specific pattern
 */
export interface PatternProgress {
  user_id: string
  pattern_id: string
  /** Mastery level 0-100 */
  mastery_level: number
  /** Total attempts on questions with this pattern */
  total_attempts: number
  /** Successful identifications */
  successful_identifications: number
  /** Times this pattern was missed when it applied */
  missed_identifications: number
  /** Times this pattern was incorrectly applied */
  false_positives: number
  /** Current streak of correct identifications */
  current_streak: number
  /** Best streak achieved */
  best_streak: number
  /** Last practiced timestamp */
  last_practiced_at: string
  /** SRS-style next review date */
  next_review_at: string
  /** History of practice sessions */
  practice_history: PatternPracticeEntry[]
  created_at: string
  updated_at: string
}

/**
 * A single practice entry for a pattern
 */
export interface PatternPracticeEntry {
  timestamp: string
  question_id: string
  /** Did they identify this pattern correctly? */
  identified_correctly: boolean
  /** Time taken in seconds */
  time_taken_seconds: number
  /** Confidence if provided */
  confidence?: 'low' | 'medium' | 'high'
}

/**
 * User's progress on a lesson
 */
export interface LessonProgress {
  user_id: string
  lesson_id: string
  /** Completion status */
  status: 'not_started' | 'in_progress' | 'completed'
  /** Index of current content block */
  current_content_index: number
  /** Checkpoint scores (checkpoint index -> score) */
  checkpoint_scores: Record<number, number>
  /** Time spent in seconds */
  time_spent_seconds: number
  /** Completion timestamp */
  completed_at?: string
  created_at: string
  updated_at: string
}

/**
 * User's overall progress in the pattern track
 */
export interface TrackProgress {
  user_id: string
  /** Overall mastery score 0-100 */
  overall_mastery: number
  /** Patterns mastered (mastery >= 80) */
  patterns_mastered: number
  /** Total patterns available */
  total_patterns: number
  /** Lessons completed */
  lessons_completed: number
  /** Total lessons available */
  total_lessons: number
  /** Total questions attempted */
  questions_attempted: number
  /** Total questions answered correctly */
  questions_correct: number
  /** Current daily streak */
  daily_streak: number
  /** Last active date */
  last_active_at: string
  /** Weak patterns needing review */
  weak_pattern_ids: string[]
  /** Strong patterns for mixed practice */
  strong_pattern_ids: string[]
  created_at: string
  updated_at: string
}

// ============================================================================
// Session & Practice Types
// ============================================================================

/**
 * A practice session configuration
 */
export interface PracticeSession {
  id: string
  user_id: string
  /** Type of practice */
  mode: 'focused' | 'mixed' | 'review' | 'test'
  /** Patterns to focus on (for focused mode) */
  focus_pattern_ids?: string[]
  /** Number of questions */
  question_count: number
  /** Questions in this session */
  question_ids: string[]
  /** Current question index */
  current_index: number
  /** Results for each question */
  results: SessionQuestionResult[]
  /** Session start time */
  started_at: string
  /** Session end time */
  ended_at?: string
  /** Total time limit in seconds (for test mode) */
  time_limit_seconds?: number
}

/**
 * Result for a single question in a session
 */
export interface SessionQuestionResult {
  question_id: string
  /** Patterns the user identified */
  identified_pattern_ids: string[]
  /** User's answer */
  user_answer: string
  /** Was the answer correct? */
  is_correct: boolean
  /** Were all patterns identified? */
  patterns_correct: boolean
  /** Time taken in seconds */
  time_taken_seconds: number
  /** Hints used */
  hints_used: number
  /** Confidence rating */
  confidence?: 'low' | 'medium' | 'high'
  /** Timestamp */
  answered_at: string
}

// ============================================================================
// Filter & Query Types
// ============================================================================

/**
 * Filter options for questions
 */
export interface QuestionFilter {
  pattern_ids?: string[]
  categories?: string[]
  difficulty_min?: number
  difficulty_max?: number
  tags?: string[]
  exclude_ids?: string[]
  /** Only questions not attempted by user */
  unattempted_only?: boolean
  /** Only questions user got wrong before */
  previously_wrong_only?: boolean
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number
  page_size: number
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PatternWithProgress extends Pattern {
  progress?: PatternProgress
}

export interface LessonWithProgress extends Lesson {
  progress?: LessonProgress
  patterns: Pattern[]
}

export interface QuestionWithPatterns extends Question {
  patterns: Pattern[]
}

// ============================================================================
// Utility Types for Repository Pattern
// ============================================================================

export type CreatePattern = Omit<Pattern, 'id' | 'created_at' | 'updated_at'>
export type UpdatePattern = Partial<CreatePattern>

export type CreateLesson = Omit<Lesson, 'id' | 'created_at' | 'updated_at'>
export type UpdateLesson = Partial<CreateLesson>

export type CreateQuestion = Omit<Question, 'id' | 'created_at' | 'updated_at'>
export type UpdateQuestion = Partial<CreateQuestion>
