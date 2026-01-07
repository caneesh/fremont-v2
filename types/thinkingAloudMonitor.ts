/**
 * Thinking-Aloud Monitor Types (PhaseC_03)
 *
 * Detect prolonged silence while typing in Interview Mode
 * and nudge user to explain their thinking.
 */

/**
 * Speech activity event
 */
export interface SpeechActivityEvent {
  readonly type: 'speech_start' | 'speech_end' | 'silence_detected'
  readonly timestamp: string
  readonly durationSeconds?: number
}

/**
 * Typing activity event
 */
export interface TypingActivityEvent {
  readonly type: 'typing_start' | 'typing_pause' | 'typing_resume'
  readonly timestamp: string
  readonly characterCount?: number
}

/**
 * Silence detection configuration
 */
export interface SilenceDetectionConfig {
  readonly enabled: boolean
  readonly silenceThresholdSeconds: number // Default: 120 (2 min)
  readonly typingRequiredSeconds: number // Min typing time before checking
  readonly nudgeIntervalSeconds: number // Min time between nudges
}

/**
 * Silence detection state
 */
export interface SilenceDetectionState {
  readonly sessionId: string
  readonly isMonitoring: boolean
  readonly lastSpeechAt?: string
  readonly lastTypingAt?: string
  readonly typingWithoutSpeechSeconds: number
  readonly nudgesShown: number
  readonly nudgesDismissed: number
  readonly penaltiesApplied: number
}

/**
 * Nudge to explain thinking
 */
export interface SilenceNudge {
  readonly id: string
  readonly sessionId: string
  readonly triggeredAt: string
  readonly silenceDurationSeconds: number
  readonly response: NudgeResponse
  readonly respondedAt?: string
}

export type NudgeResponse =
  | 'not_responded' // Still showing
  | 'will_explain' // User agreed to explain
  | 'continue_silent' // User chose to continue without explaining
  | 'dismissed' // User dismissed

/**
 * UI action suggestion from core
 */
export interface SilenceUIAction {
  readonly action: 'INTERVIEW_NUDGE' | 'IGNORE'
  readonly message?: string
  readonly penaltyInfo?: {
    applied: boolean
    amount: number
    reason: string
  }
}

/**
 * Communication penalty for silence
 */
export interface CommunicationPenalty {
  readonly sessionId: string
  readonly penaltyType: 'silence' | 'no_explanation'
  readonly amount: number // Percentage points
  readonly appliedAt: string
  readonly reason: string
}

// Policy constants
export const THINKING_ALOUD_POLICY = {
  // Thresholds
  SILENCE_THRESHOLD_SECONDS: 120, // 2 minutes
  MIN_TYPING_BEFORE_CHECK_SECONDS: 30,
  MIN_NUDGE_INTERVAL_SECONDS: 180, // 3 minutes between nudges

  // Penalties
  CONTINUE_SILENT_PENALTY: 5, // 5% communication penalty
  MAX_PENALTIES_PER_SESSION: 3,

  // Limits
  MAX_NUDGES_PER_SESSION: 5,
} as const

// Event types
export type ThinkingAloudEventType =
  | 'speech_activity_detected'
  | 'silence_detected'
  | 'typing_activity_detected'
  | 'silence_nudge_shown'
  | 'silence_nudge_responded'
  | 'communication_penalty_applied'
