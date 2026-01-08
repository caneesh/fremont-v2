/**
 * Thinking-Aloud Monitor Policy
 *
 * Deterministic detection of prolonged silence during typing in Interview Mode.
 * Nudges users to verbalize their reasoning and applies communication penalties
 * for continued silence.
 */

import type {
  SpeechActivityEvent,
  TypingActivityEvent,
  SilenceDetectionConfig,
  SilenceDetectionState,
  SilenceNudge,
  NudgeResponse,
  SilenceUIAction,
  CommunicationPenalty,
} from '@/types/thinkingAloudMonitor'
import { THINKING_ALOUD_POLICY } from '@/types/thinkingAloudMonitor'

// Re-export policy constants
export { THINKING_ALOUD_POLICY }

/**
 * Extended policy constants
 */
export const EXTENDED_THINKING_ALOUD_POLICY = {
  // Speech detection
  MIN_SPEECH_DURATION_SECONDS: 2,
  SPEECH_GAP_THRESHOLD_SECONDS: 5,
  // Typing detection
  TYPING_PAUSE_THRESHOLD_SECONDS: 3,
  MIN_CHARACTERS_FOR_TYPING: 5,
  // Penalty escalation
  FIRST_PENALTY_MULTIPLIER: 1,
  SECOND_PENALTY_MULTIPLIER: 1.5,
  THIRD_PENALTY_MULTIPLIER: 2,
  // Grace periods
  SESSION_START_GRACE_SECONDS: 60, // No nudges in first minute
  POST_NUDGE_GRACE_SECONDS: 30, // Grace period after showing nudge
} as const

/**
 * Create default silence detection config - DETERMINISTIC
 */
export function createDefaultConfig(): SilenceDetectionConfig {
  return {
    enabled: true,
    silenceThresholdSeconds: THINKING_ALOUD_POLICY.SILENCE_THRESHOLD_SECONDS,
    typingRequiredSeconds: THINKING_ALOUD_POLICY.MIN_TYPING_BEFORE_CHECK_SECONDS,
    nudgeIntervalSeconds: THINKING_ALOUD_POLICY.MIN_NUDGE_INTERVAL_SECONDS,
  }
}

/**
 * Update config - DETERMINISTIC
 */
export function updateConfig(
  config: SilenceDetectionConfig,
  updates: Partial<Omit<SilenceDetectionConfig, 'enabled'>> & { enabled?: boolean }
): SilenceDetectionConfig {
  return {
    ...config,
    ...updates,
  }
}

/**
 * Create initial detection state - DETERMINISTIC
 */
export function createDetectionState(sessionId: string): SilenceDetectionState {
  return {
    sessionId,
    isMonitoring: false,
    typingWithoutSpeechSeconds: 0,
    nudgesShown: 0,
    nudgesDismissed: 0,
    penaltiesApplied: 0,
  }
}

/**
 * Start monitoring - DETERMINISTIC
 */
export function startMonitoring(
  state: SilenceDetectionState,
  startTime: string
): SilenceDetectionState {
  return {
    ...state,
    isMonitoring: true,
    lastSpeechAt: startTime,
    lastTypingAt: undefined,
    typingWithoutSpeechSeconds: 0,
  }
}

/**
 * Stop monitoring - DETERMINISTIC
 */
export function stopMonitoring(state: SilenceDetectionState): SilenceDetectionState {
  return {
    ...state,
    isMonitoring: false,
  }
}

/**
 * Record speech activity - DETERMINISTIC
 */
export function recordSpeechActivity(
  state: SilenceDetectionState,
  event: SpeechActivityEvent
): SilenceDetectionState {
  if (!state.isMonitoring) return state

  if (event.type === 'speech_start' || event.type === 'speech_end') {
    return {
      ...state,
      lastSpeechAt: event.timestamp,
      typingWithoutSpeechSeconds: 0, // Reset silence counter on speech
    }
  }

  return state
}

/**
 * Record typing activity - DETERMINISTIC
 */
export function recordTypingActivity(
  state: SilenceDetectionState,
  event: TypingActivityEvent
): SilenceDetectionState {
  if (!state.isMonitoring) return state

  if (event.type === 'typing_start' || event.type === 'typing_resume') {
    return {
      ...state,
      lastTypingAt: event.timestamp,
    }
  }

  return state
}

/**
 * Calculate silence duration - DETERMINISTIC
 */
export function calculateSilenceDuration(
  state: SilenceDetectionState,
  currentTime: string
): number {
  if (!state.lastSpeechAt) return 0
  if (!state.lastTypingAt) return 0

  const lastSpeech = new Date(state.lastSpeechAt).getTime()
  const lastTyping = new Date(state.lastTypingAt).getTime()
  const now = new Date(currentTime).getTime()

  // Only count silence if typing is happening after last speech
  if (lastTyping <= lastSpeech) return 0

  // Silence duration is time since last speech while typing
  return Math.floor((now - lastSpeech) / 1000)
}

/**
 * Update typing without speech duration - DETERMINISTIC
 */
export function updateTypingWithoutSpeech(
  state: SilenceDetectionState,
  currentTime: string
): SilenceDetectionState {
  if (!state.isMonitoring) return state
  if (!state.lastTypingAt) return state

  const silenceDuration = calculateSilenceDuration(state, currentTime)

  return {
    ...state,
    typingWithoutSpeechSeconds: silenceDuration,
  }
}

/**
 * Check if nudge is needed - DETERMINISTIC
 */
export function shouldShowNudge(
  state: SilenceDetectionState,
  config: SilenceDetectionConfig,
  currentTime: string,
  lastNudgeTime?: string
): { shouldNudge: boolean; reason?: string } {
  if (!config.enabled) {
    return { shouldNudge: false, reason: 'Monitoring disabled' }
  }

  if (!state.isMonitoring) {
    return { shouldNudge: false, reason: 'Not monitoring' }
  }

  if (state.nudgesShown >= THINKING_ALOUD_POLICY.MAX_NUDGES_PER_SESSION) {
    return { shouldNudge: false, reason: 'Max nudges reached' }
  }

  // Check nudge interval
  if (lastNudgeTime) {
    const lastNudge = new Date(lastNudgeTime).getTime()
    const now = new Date(currentTime).getTime()
    const secondsSinceNudge = (now - lastNudge) / 1000

    if (secondsSinceNudge < config.nudgeIntervalSeconds) {
      return { shouldNudge: false, reason: 'Too soon since last nudge' }
    }
  }

  // Check typing duration threshold
  if (!state.lastTypingAt) {
    return { shouldNudge: false, reason: 'No typing detected' }
  }

  const typingStart = new Date(state.lastTypingAt).getTime()
  const now = new Date(currentTime).getTime()
  const typingDuration = (now - typingStart) / 1000

  if (typingDuration < config.typingRequiredSeconds) {
    return { shouldNudge: false, reason: 'Not enough typing time' }
  }

  // Check silence threshold
  if (state.typingWithoutSpeechSeconds < config.silenceThresholdSeconds) {
    return { shouldNudge: false, reason: 'Below silence threshold' }
  }

  return { shouldNudge: true }
}

/**
 * Create nudge - DETERMINISTIC
 */
export function createNudge(
  nudgeId: string,
  sessionId: string,
  silenceDuration: number,
  triggeredAt: string
): SilenceNudge {
  return {
    id: nudgeId,
    sessionId,
    triggeredAt,
    silenceDurationSeconds: silenceDuration,
    response: 'not_responded',
  }
}

/**
 * Record nudge shown - DETERMINISTIC
 */
export function recordNudgeShown(state: SilenceDetectionState): SilenceDetectionState {
  return {
    ...state,
    nudgesShown: state.nudgesShown + 1,
  }
}

/**
 * Respond to nudge - DETERMINISTIC
 */
export function respondToNudge(
  nudge: SilenceNudge,
  response: NudgeResponse,
  respondedAt: string
): SilenceNudge {
  return {
    ...nudge,
    response,
    respondedAt,
  }
}

/**
 * Record nudge response in state - DETERMINISTIC
 */
export function recordNudgeResponse(
  state: SilenceDetectionState,
  response: NudgeResponse
): SilenceDetectionState {
  const isDismissed = response === 'dismissed' || response === 'continue_silent'

  return {
    ...state,
    nudgesDismissed: isDismissed ? state.nudgesDismissed + 1 : state.nudgesDismissed,
    // Reset silence counter if user agrees to explain
    typingWithoutSpeechSeconds: response === 'will_explain' ? 0 : state.typingWithoutSpeechSeconds,
  }
}

/**
 * Check if penalty should be applied - DETERMINISTIC
 */
export function shouldApplyPenalty(
  state: SilenceDetectionState,
  nudgeResponse: NudgeResponse
): { shouldApply: boolean; reason?: string } {
  if (nudgeResponse !== 'continue_silent') {
    return { shouldApply: false, reason: 'User did not choose to continue silent' }
  }

  if (state.penaltiesApplied >= THINKING_ALOUD_POLICY.MAX_PENALTIES_PER_SESSION) {
    return { shouldApply: false, reason: 'Max penalties reached' }
  }

  return { shouldApply: true }
}

/**
 * Calculate penalty amount - DETERMINISTIC
 */
export function calculatePenaltyAmount(penaltiesApplied: number): number {
  const basePenalty = THINKING_ALOUD_POLICY.CONTINUE_SILENT_PENALTY

  if (penaltiesApplied === 0) {
    return basePenalty * EXTENDED_THINKING_ALOUD_POLICY.FIRST_PENALTY_MULTIPLIER
  } else if (penaltiesApplied === 1) {
    return basePenalty * EXTENDED_THINKING_ALOUD_POLICY.SECOND_PENALTY_MULTIPLIER
  } else {
    return basePenalty * EXTENDED_THINKING_ALOUD_POLICY.THIRD_PENALTY_MULTIPLIER
  }
}

/**
 * Create penalty - DETERMINISTIC
 */
export function createPenalty(
  sessionId: string,
  penaltyType: 'silence' | 'no_explanation',
  amount: number,
  appliedAt: string,
  reason: string
): CommunicationPenalty {
  return {
    sessionId,
    penaltyType,
    amount,
    appliedAt,
    reason,
  }
}

/**
 * Apply penalty to state - DETERMINISTIC
 */
export function applyPenalty(state: SilenceDetectionState): SilenceDetectionState {
  return {
    ...state,
    penaltiesApplied: state.penaltiesApplied + 1,
  }
}

/**
 * Get UI action for current state - DETERMINISTIC
 */
export function getUIAction(
  state: SilenceDetectionState,
  config: SilenceDetectionConfig,
  currentTime: string,
  lastNudgeTime?: string
): SilenceUIAction {
  const nudgeCheck = shouldShowNudge(state, config, currentTime, lastNudgeTime)

  if (!nudgeCheck.shouldNudge) {
    return { action: 'IGNORE' }
  }

  const message = getNudgeMessage(state.nudgesShown, state.typingWithoutSpeechSeconds)

  return {
    action: 'INTERVIEW_NUDGE',
    message,
  }
}

/**
 * Get nudge message - DETERMINISTIC
 */
export function getNudgeMessage(nudgeCount: number, silenceSeconds: number): string {
  const minutes = Math.floor(silenceSeconds / 60)

  if (nudgeCount === 0) {
    return `You've been typing for ${minutes} minutes without explaining your thinking. In interviews, communication is key - try explaining your approach out loud.`
  } else if (nudgeCount === 1) {
    return `Remember to think aloud! Interviewers want to understand your reasoning process, not just see your code.`
  } else if (nudgeCount === 2) {
    return `Communication is part of the evaluation. Continuing in silence may affect your score.`
  } else {
    return `Please verbalize your thought process to practice effective interview communication.`
  }
}

/**
 * Calculate total penalty percentage - DETERMINISTIC
 */
export function calculateTotalPenalty(penalties: readonly CommunicationPenalty[]): number {
  return penalties.reduce((total, p) => total + p.amount, 0)
}

/**
 * Get session statistics - DETERMINISTIC
 */
export function getSessionStats(
  state: SilenceDetectionState,
  penalties: readonly CommunicationPenalty[]
): {
  totalNudges: number
  nudgesResponded: number
  penaltiesApplied: number
  totalPenaltyPercent: number
  communicationScore: number
} {
  const nudgesResponded = state.nudgesShown - state.nudgesDismissed
  const totalPenaltyPercent = calculateTotalPenalty(penalties)

  // Communication score starts at 100 and decreases with penalties
  const communicationScore = Math.max(0, 100 - totalPenaltyPercent)

  return {
    totalNudges: state.nudgesShown,
    nudgesResponded,
    penaltiesApplied: state.penaltiesApplied,
    totalPenaltyPercent,
    communicationScore,
  }
}

/**
 * Check if monitoring should be paused - DETERMINISTIC
 */
export function shouldPauseMonitoring(
  sessionStartTime: string,
  currentTime: string
): boolean {
  const start = new Date(sessionStartTime).getTime()
  const now = new Date(currentTime).getTime()
  const secondsSinceStart = (now - start) / 1000

  // Pause during grace period at session start
  return secondsSinceStart < EXTENDED_THINKING_ALOUD_POLICY.SESSION_START_GRACE_SECONDS
}

/**
 * Validate config - DETERMINISTIC
 */
export function validateConfig(config: SilenceDetectionConfig): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (config.silenceThresholdSeconds < 30) {
    errors.push('Silence threshold must be at least 30 seconds')
  }

  if (config.silenceThresholdSeconds > 600) {
    errors.push('Silence threshold cannot exceed 10 minutes')
  }

  if (config.typingRequiredSeconds < 10) {
    errors.push('Typing required seconds must be at least 10')
  }

  if (config.nudgeIntervalSeconds < 60) {
    errors.push('Nudge interval must be at least 60 seconds')
  }

  if (config.nudgeIntervalSeconds <= config.silenceThresholdSeconds) {
    errors.push('Nudge interval should be greater than silence threshold')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Process speech event and get updated state - DETERMINISTIC
 */
export function processSpeechEvent(
  state: SilenceDetectionState,
  event: SpeechActivityEvent
): SilenceDetectionState {
  if (!state.isMonitoring) return state

  switch (event.type) {
    case 'speech_start':
    case 'speech_end':
      return recordSpeechActivity(state, event)
    case 'silence_detected':
      // Silence event doesn't update speech timestamp
      return state
    default:
      return state
  }
}

/**
 * Process typing event and get updated state - DETERMINISTIC
 */
export function processTypingEvent(
  state: SilenceDetectionState,
  event: TypingActivityEvent
): SilenceDetectionState {
  if (!state.isMonitoring) return state

  return recordTypingActivity(state, event)
}

/**
 * Check if session has exceeded penalty limit - DETERMINISTIC
 */
export function hasExceededPenaltyLimit(state: SilenceDetectionState): boolean {
  return state.penaltiesApplied >= THINKING_ALOUD_POLICY.MAX_PENALTIES_PER_SESSION
}

/**
 * Check if session has exceeded nudge limit - DETERMINISTIC
 */
export function hasExceededNudgeLimit(state: SilenceDetectionState): boolean {
  return state.nudgesShown >= THINKING_ALOUD_POLICY.MAX_NUDGES_PER_SESSION
}

/**
 * Get time until next nudge allowed - DETERMINISTIC
 */
export function getTimeUntilNextNudge(
  config: SilenceDetectionConfig,
  lastNudgeTime: string,
  currentTime: string
): number {
  const lastNudge = new Date(lastNudgeTime).getTime()
  const now = new Date(currentTime).getTime()
  const elapsed = (now - lastNudge) / 1000

  return Math.max(0, config.nudgeIntervalSeconds - elapsed)
}

/**
 * Get silence progress toward threshold - DETERMINISTIC
 * Returns 0-100 representing percentage toward nudge trigger
 */
export function getSilenceProgress(
  state: SilenceDetectionState,
  config: SilenceDetectionConfig
): number {
  if (!config.enabled || !state.isMonitoring) return 0

  const progress = (state.typingWithoutSpeechSeconds / config.silenceThresholdSeconds) * 100
  return Math.min(100, Math.max(0, Math.round(progress)))
}

/**
 * Create speech activity event - DETERMINISTIC
 */
export function createSpeechEvent(
  type: SpeechActivityEvent['type'],
  timestamp: string,
  durationSeconds?: number
): SpeechActivityEvent {
  return {
    type,
    timestamp,
    durationSeconds,
  }
}

/**
 * Create typing activity event - DETERMINISTIC
 */
export function createTypingEvent(
  type: TypingActivityEvent['type'],
  timestamp: string,
  characterCount?: number
): TypingActivityEvent {
  return {
    type,
    timestamp,
    characterCount,
  }
}

/**
 * Reset silence counter - DETERMINISTIC
 */
export function resetSilenceCounter(state: SilenceDetectionState): SilenceDetectionState {
  return {
    ...state,
    typingWithoutSpeechSeconds: 0,
  }
}

/**
 * Get penalty history summary - DETERMINISTIC
 */
export function getPenaltyHistorySummary(
  penalties: readonly CommunicationPenalty[]
): {
  silencePenalties: number
  noExplanationPenalties: number
  totalAmount: number
  lastPenaltyAt?: string
} {
  const silencePenalties = penalties.filter(p => p.penaltyType === 'silence').length
  const noExplanationPenalties = penalties.filter(p => p.penaltyType === 'no_explanation').length
  const totalAmount = calculateTotalPenalty(penalties)
  const lastPenaltyAt = penalties.length > 0
    ? penalties[penalties.length - 1].appliedAt
    : undefined

  return {
    silencePenalties,
    noExplanationPenalties,
    totalAmount,
    lastPenaltyAt,
  }
}

/**
 * Determine if user is actively speaking - DETERMINISTIC
 */
export function isActivelySpeaking(
  lastSpeechAt: string | undefined,
  currentTime: string
): boolean {
  if (!lastSpeechAt) return false

  const lastSpeech = new Date(lastSpeechAt).getTime()
  const now = new Date(currentTime).getTime()
  const secondsSinceSpeech = (now - lastSpeech) / 1000

  return secondsSinceSpeech < EXTENDED_THINKING_ALOUD_POLICY.SPEECH_GAP_THRESHOLD_SECONDS
}

/**
 * Determine if user is actively typing - DETERMINISTIC
 */
export function isActivelyTyping(
  lastTypingAt: string | undefined,
  currentTime: string
): boolean {
  if (!lastTypingAt) return false

  const lastTyping = new Date(lastTypingAt).getTime()
  const now = new Date(currentTime).getTime()
  const secondsSinceTyping = (now - lastTyping) / 1000

  return secondsSinceTyping < EXTENDED_THINKING_ALOUD_POLICY.TYPING_PAUSE_THRESHOLD_SECONDS
}

/**
 * Get activity status - DETERMINISTIC
 */
export function getActivityStatus(
  state: SilenceDetectionState,
  currentTime: string
): {
  isSpeaking: boolean
  isTyping: boolean
  isSilentlyTyping: boolean
} {
  const isSpeaking = isActivelySpeaking(state.lastSpeechAt, currentTime)
  const isTyping = isActivelyTyping(state.lastTypingAt, currentTime)
  const isSilentlyTyping = isTyping && !isSpeaking

  return {
    isSpeaking,
    isTyping,
    isSilentlyTyping,
  }
}

/**
 * Format silence duration for display - DETERMINISTIC
 */
export function formatSilenceDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`
  }

  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }

  return `${minutes}m ${remainingSeconds}s`
}

/**
 * Check if nudge was effective (user responded positively) - DETERMINISTIC
 */
export function wasNudgeEffective(nudge: SilenceNudge): boolean {
  return nudge.response === 'will_explain'
}

/**
 * Calculate nudge effectiveness rate - DETERMINISTIC
 */
export function calculateNudgeEffectiveness(
  nudges: readonly SilenceNudge[]
): number {
  if (nudges.length === 0) return 100

  const effectiveNudges = nudges.filter(wasNudgeEffective).length
  return Math.round((effectiveNudges / nudges.length) * 100)
}

/**
 * Get recommended action based on state - DETERMINISTIC
 */
export function getRecommendedAction(
  state: SilenceDetectionState,
  config: SilenceDetectionConfig,
  currentTime: string
): 'continue' | 'nudge' | 'warn' | 'penalize' {
  if (!config.enabled || !state.isMonitoring) {
    return 'continue'
  }

  const silenceProgress = getSilenceProgress(state, config)

  if (silenceProgress < 50) {
    return 'continue'
  }

  if (silenceProgress < 80) {
    return 'warn'
  }

  if (silenceProgress >= 100) {
    if (state.nudgesShown > 0 && state.penaltiesApplied < THINKING_ALOUD_POLICY.MAX_PENALTIES_PER_SESSION) {
      return 'penalize'
    }
    return 'nudge'
  }

  return 'warn'
}
