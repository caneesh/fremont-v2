/**
 * Storage Abstraction Layer - Type Definitions
 *
 * Defines all types for the storage provider interface,
 * event logging, and data validation.
 */

// ============================================
// Event Types
// ============================================

export type EventType =
  // Problem lifecycle events
  | 'problem_started'
  | 'problem_saved_draft'
  | 'problem_marked_solved'
  | 'problem_deleted'
  // Step events
  | 'step_activated'
  | 'step_completed'
  | 'step_failed'
  // Hint events
  | 'hint_unlocked'
  | 'hint_viewed'
  // Micro-task events
  | 'task_attempted'
  | 'task_correct'
  | 'task_incorrect'
  | 'task_confidence_rated'
  | 'reading_mode_activated'
  // Reveal-Reconstruct-Validate flow events
  | 'reveal_opened'
  | 'reveal_explanation_shown'
  | 'reconstruct_question_answered'
  | 'reconstruct_completed'
  | 'reveal_closed'
  | 'concept_confusion_detected'
  // Sanity check events
  | 'sanity_check_completed'
  // Reflection events
  | 'reflection_started'
  | 'reflection_completed'
  // User preference events
  | 'preference_changed'
  // Error events
  | 'error_occurred'
  // Circuit Breaker events
  | 'circuit_breaker_warning'
  | 'circuit_breaker_tripped'
  | 'drill_started'
  | 'drill_completed'
  | 'drill_skipped'
  // Micro-Pattern Drill events
  | 'drill_item_completed'
  | 'drill_abandoned'
  // Pattern-First Mode events
  | 'pattern_first_shown'
  | 'pattern_selected'
  | 'pattern_first_timeout'
  | 'pattern_first_unlock'
  | 'pattern_correctness'
  // Confidence Repair events
  | 'bad_session_detected'
  | 'recovery_mode_activated'
  | 'recovery_warmup_started'
  | 'recovery_warmup_completed'
  | 'recovery_mode_completed'
  | 'recovery_mode_abandoned'
  // Warm-up Protocol events
  | 'warmup_assigned'
  | 'warmup_started'
  | 'warmup_item_completed'
  | 'warmup_block_completed'
  | 'warmup_completed'
  | 'warmup_skipped'
  // Pivot Injection events
  | 'pivot_triggered'
  | 'pivot_shown'
  | 'pivot_answered'
  | 'pivot_skipped'
  | 'pivot_helpful_feedback'
  // Constraint Highlight events
  | 'constraint_detected'
  | 'constraint_highlighted'
  | 'constraint_acknowledged'
  | 'constraint_dismissed'
  | 'constraint_missed'
  // Reviewer Trust events
  | 'reviewer_calibration_started'
  | 'reviewer_calibration_completed'
  | 'reviewer_trust_updated'
  | 'reviewer_level_changed'
  | 'golden_sample_created'
  // Clean Code Gate events
  | 'clean_code_check_started'
  | 'clean_code_check_passed'
  | 'clean_code_check_failed'
  | 'clean_code_issue_fixed'
  | 'clean_code_gate_bypassed'
  // Debug/Refactor Mode events
  | 'debug_problem_started'
  | 'debug_hypothesis_submitted'
  | 'debug_fix_submitted'
  | 'debug_completed'
  | 'refactor_problem_started'
  | 'refactor_smell_identified'
  | 'refactor_submitted'
  | 'refactor_completed'
  // System Design Whiteboard events
  | 'design_session_started'
  | 'design_component_added'
  | 'design_component_removed'
  | 'design_connection_added'
  | 'design_justification_submitted'
  | 'design_reviewed'
  | 'design_completed'
  // Voice Annotation events
  | 'voice_recording_started'
  | 'voice_recording_completed'
  | 'voice_annotation_added'
  | 'voice_annotation_played'
  | 'voice_review_submitted'
  // Calendar Integration events
  | 'calendar_connected'
  | 'calendar_synced'
  | 'calendar_disconnected'
  | 'session_scheduled'
  | 'session_missed_detected'
  | 'session_compressed'
  | 'catchup_plan_created'
  // Thinking-Aloud Monitor events
  | 'speech_activity_detected'
  | 'silence_detected'
  | 'typing_activity_detected'
  | 'silence_nudge_shown'
  | 'silence_nudge_responded'
  | 'communication_penalty_applied'
  // Momentum Engine events
  | 'momentum_decision_win'
  | 'momentum_decision_streak'
  | 'momentum_hint_free_win'
  | 'momentum_hint_free_streak'
  | 'momentum_rebuild_win'
  | 'momentum_rebuild_streak'
  | 'momentum_recovery'
  | 'momentum_streak_reset'
  | 'momentum_feedback_shown'
  // Learning Integrity events (silent detection)
  | 'integrity_signal_detected'
  | 'integrity_session_flagged'
  | 'integrity_check_triggered'
  | 'integrity_check_passed'
  | 'integrity_check_failed'
  // Socratic-First Mode events
  | 'socratic_step_complete'
  | 'socratic_exchange'
  | 'socratic_misconception_detected'
  | 'socratic_stuck_mode_entered'
  | 'socratic_hint_viewed'

export interface EventMetadata {
  problemId?: string
  stepId?: number
  level?: number
  taskType?: string
  attemptNumber?: number
  isCorrect?: boolean
  duration?: number // milliseconds
  errorMessage?: string
  preferenceKey?: string
  preferenceValue?: unknown
  // Reveal-Reconstruct-Validate flow metadata
  levelId?: number
  questionId?: string
  selectedOptionId?: string
  outcome?: 'solid' | 'partial' | 'mismatch'
  conceptTag?: string
  // Circuit Breaker metadata
  errorTag?: string
  drillId?: string
  circuitBreakerState?: string
  drillSuccess?: boolean
  // Confidence-weighted SRS metadata
  confidence?: 'low' | 'medium' | 'high'
  // Pattern-First Mode metadata
  selectedPatternId?: string
  primaryPatternId?: string
  patternOptionsCount?: number
  lockSeconds?: number
  hadSelection?: boolean
  wasCorrect?: boolean
  // Confidence Repair metadata
  recoveryTriggers?: string[]
  warmUpProblemId?: string
  warmUpPatternId?: string
  recoveryDurationMs?: number
  recoveryWasSuccessful?: boolean
  revealCount?: number
  circuitBreakerTripped?: boolean
  averageStepTimeMs?: number
  sessionEndedMidProblem?: boolean
  // Momentum Engine metadata
  streakType?: 'decision' | 'hintFree' | 'rebuild'
  streakCount?: number
  isRecovery?: boolean
  patternId?: string
  momentumEventType?: string
  [key: string]: unknown // Allow additional metadata
}

export interface StoredEvent {
  id: string
  type: EventType
  timestamp: string // ISO date string
  sessionId: string
  userId?: string
  metadata: EventMetadata
}

// ============================================
// User Preferences
// ============================================

export interface UserPreferences {
  userId?: string
  theme?: 'light' | 'dark' | 'system'
  showHintsAutomatically?: boolean
  enableAnimations?: boolean
  enableSoundEffects?: boolean
  defaultHintLevel?: number
  scaffoldDensity?: 1 | 2 | 3 | 4 | 5  // Scaffold detail level (1=micro, 5=macro)
  studyReminders?: boolean
  lastVisitedAt?: string
  customSettings?: Record<string, unknown>
}

// ============================================
// Storage Keys Registry
// ============================================

export const STORAGE_KEYS = {
  // Core data
  PROBLEM_ATTEMPTS: 'physiscaffold_problem_attempts',
  EVENTS: 'physiscaffold_events',
  USER_PREFERENCES: 'physiscaffold_user_preferences',
  USER_ID: 'physiscaffold_user',
  SESSION_ID: 'physiscaffold_session',

  // Learning analytics
  ERROR_PATTERNS: 'physiscaffold_error_patterns',
  MISTAKE_PATTERNS: 'physiscaffold_mistake_patterns',
  CONCEPT_MASTERY: 'physiscaffold_concept_mastery',
  STUDY_PROGRESS: 'physiscaffold_study_progress',

  // Feature-specific
  FRIEND_EXPLANATIONS: 'physiscaffold_friend_explanations',
  SPOT_MISTAKE_PREFIX: 'physiscaffold_spot_mistake_',

  // Mistake Notebook + SRS
  MISTAKE_CARDS: 'physiscaffold_mistake_cards',
  REVIEW_SESSIONS: 'physiscaffold_review_sessions',
  DAILY_DEBRIEFS: 'physiscaffold_daily_debriefs',
  LAST_DEBRIEF_DATE: 'physiscaffold_last_debrief',
  REVIEW_STREAK: 'physiscaffold_review_streak',

  // Reveal-Reconstruct-Validate flow
  REVEAL_FLOW_STATUS: 'physiscaffold_reveal_flow_status',

  // Circuit Breaker
  CIRCUIT_BREAKER: 'physiscaffold_circuit_breaker',

  // Cognitive Load Governor
  COGNITIVE_LOAD_STATE: 'physiscaffold_cognitive_load_state',
  COGNITIVE_LOAD_METRICS: 'physiscaffold_cognitive_load_metrics',

  // Confidence Repair System
  RECOVERY_DATA: 'physiscaffold_recovery_data',
  SESSION_METRICS: 'physiscaffold_session_metrics',
} as const

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS]

// ============================================
// Storage Provider Results
// ============================================

export interface StorageResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============================================
// Storage Provider Configuration
// ============================================

export interface StorageProviderConfig {
  maxEventsToStore?: number // Default: 1000
  eventRetentionDays?: number // Default: 30
  enableCompression?: boolean
  debugMode?: boolean
}

// ============================================
// Re-export existing types for convenience
// ============================================

export type {
  ProblemAttempt,
  ProblemProgress,
  ProblemStatus,
  StepProgress,
  MicroTaskStepProgress,
  ReflectionAnswer,
  HistoryFilters
} from '@/types/history'

export type {
  ScaffoldData,
  Step,
  HintLevel,
  Concept,
  SanityCheck,
  ScaffoldDensity,
  StepType,
  ValidationErrorType
} from '@/types/scaffold'

export type {
  MicroTaskScaffoldData,
  MicroTaskStep,
  MicroTask
} from '@/types/microTask'

export type {
  ErrorTag,
  CircuitBreakerState,
  CircuitBreakerSessionState,
  DrillTask,
  ThresholdEvaluation
} from '@/types/circuitBreaker'
