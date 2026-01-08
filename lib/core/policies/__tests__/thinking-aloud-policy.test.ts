/**
 * Thinking-Aloud Monitor Policy Tests
 *
 * Tests for deterministic silence detection and nudge system.
 */

import { describe, it, expect } from 'vitest'
import {
  createDefaultConfig,
  updateConfig,
  createDetectionState,
  startMonitoring,
  stopMonitoring,
  recordSpeechActivity,
  recordTypingActivity,
  calculateSilenceDuration,
  updateTypingWithoutSpeech,
  shouldShowNudge,
  createNudge,
  recordNudgeShown,
  respondToNudge,
  recordNudgeResponse,
  shouldApplyPenalty,
  calculatePenaltyAmount,
  createPenalty,
  applyPenalty,
  getUIAction,
  getNudgeMessage,
  calculateTotalPenalty,
  getSessionStats,
  shouldPauseMonitoring,
  validateConfig,
  processSpeechEvent,
  processTypingEvent,
  hasExceededPenaltyLimit,
  hasExceededNudgeLimit,
  getTimeUntilNextNudge,
  getSilenceProgress,
  createSpeechEvent,
  createTypingEvent,
  resetSilenceCounter,
  getPenaltyHistorySummary,
  isActivelySpeaking,
  isActivelyTyping,
  getActivityStatus,
  formatSilenceDuration,
  wasNudgeEffective,
  calculateNudgeEffectiveness,
  getRecommendedAction,
  THINKING_ALOUD_POLICY,
  EXTENDED_THINKING_ALOUD_POLICY,
} from '../thinking-aloud-policy'
import type {
  SilenceDetectionConfig,
  SilenceDetectionState,
  SilenceNudge,
  CommunicationPenalty,
} from '@/types/thinkingAloudMonitor'

// Helper to create timestamps
function timestamp(minutesFromNow: number = 0): string {
  const date = new Date('2025-01-15T10:00:00Z')
  date.setMinutes(date.getMinutes() + minutesFromNow)
  return date.toISOString()
}

// Helper to create state with typing
function createTypingState(overrides?: Partial<SilenceDetectionState>): SilenceDetectionState {
  return {
    ...createDetectionState('session-1'),
    isMonitoring: true,
    lastSpeechAt: timestamp(0),
    lastTypingAt: timestamp(1),
    ...overrides,
  }
}

describe('createDefaultConfig', () => {
  it('should create config with default values', () => {
    const config = createDefaultConfig()

    expect(config.enabled).toBe(true)
    expect(config.silenceThresholdSeconds).toBe(THINKING_ALOUD_POLICY.SILENCE_THRESHOLD_SECONDS)
    expect(config.typingRequiredSeconds).toBe(THINKING_ALOUD_POLICY.MIN_TYPING_BEFORE_CHECK_SECONDS)
    expect(config.nudgeIntervalSeconds).toBe(THINKING_ALOUD_POLICY.MIN_NUDGE_INTERVAL_SECONDS)
  })
})

describe('updateConfig', () => {
  it('should update specific fields', () => {
    const config = createDefaultConfig()
    const updated = updateConfig(config, { silenceThresholdSeconds: 180 })

    expect(updated.silenceThresholdSeconds).toBe(180)
    expect(updated.enabled).toBe(true) // Unchanged
  })

  it('should allow disabling', () => {
    const config = createDefaultConfig()
    const updated = updateConfig(config, { enabled: false })

    expect(updated.enabled).toBe(false)
  })
})

describe('createDetectionState', () => {
  it('should create initial state', () => {
    const state = createDetectionState('session-1')

    expect(state.sessionId).toBe('session-1')
    expect(state.isMonitoring).toBe(false)
    expect(state.lastSpeechAt).toBeUndefined()
    expect(state.lastTypingAt).toBeUndefined()
    expect(state.typingWithoutSpeechSeconds).toBe(0)
    expect(state.nudgesShown).toBe(0)
    expect(state.nudgesDismissed).toBe(0)
    expect(state.penaltiesApplied).toBe(0)
  })
})

describe('startMonitoring', () => {
  it('should enable monitoring', () => {
    const state = createDetectionState('session-1')
    const started = startMonitoring(state, timestamp())

    expect(started.isMonitoring).toBe(true)
    expect(started.lastSpeechAt).toBeDefined()
    expect(started.typingWithoutSpeechSeconds).toBe(0)
  })
})

describe('stopMonitoring', () => {
  it('should disable monitoring', () => {
    let state = createDetectionState('session-1')
    state = startMonitoring(state, timestamp())
    const stopped = stopMonitoring(state)

    expect(stopped.isMonitoring).toBe(false)
  })
})

describe('recordSpeechActivity', () => {
  it('should update lastSpeechAt on speech_start', () => {
    const state = createTypingState({ typingWithoutSpeechSeconds: 60 })
    const event = createSpeechEvent('speech_start', timestamp(5))
    const updated = recordSpeechActivity(state, event)

    expect(updated.lastSpeechAt).toBe(timestamp(5))
    expect(updated.typingWithoutSpeechSeconds).toBe(0) // Reset on speech
  })

  it('should update lastSpeechAt on speech_end', () => {
    const state = createTypingState()
    const event = createSpeechEvent('speech_end', timestamp(5), 10)
    const updated = recordSpeechActivity(state, event)

    expect(updated.lastSpeechAt).toBe(timestamp(5))
  })

  it('should not update if not monitoring', () => {
    const state = createDetectionState('session-1')
    const event = createSpeechEvent('speech_start', timestamp(5))
    const updated = recordSpeechActivity(state, event)

    expect(updated.lastSpeechAt).toBeUndefined()
  })
})

describe('recordTypingActivity', () => {
  it('should update lastTypingAt on typing_start', () => {
    const state = createTypingState()
    const event = createTypingEvent('typing_start', timestamp(5))
    const updated = recordTypingActivity(state, event)

    expect(updated.lastTypingAt).toBe(timestamp(5))
  })

  it('should update lastTypingAt on typing_resume', () => {
    const state = createTypingState()
    const event = createTypingEvent('typing_resume', timestamp(5), 100)
    const updated = recordTypingActivity(state, event)

    expect(updated.lastTypingAt).toBe(timestamp(5))
  })

  it('should not update on typing_pause', () => {
    const state = createTypingState({ lastTypingAt: timestamp(1) })
    const event = createTypingEvent('typing_pause', timestamp(5))
    const updated = recordTypingActivity(state, event)

    expect(updated.lastTypingAt).toBe(timestamp(1)) // Unchanged
  })
})

describe('calculateSilenceDuration', () => {
  it('should return 0 if no speech recorded', () => {
    const state = createTypingState({ lastSpeechAt: undefined })
    expect(calculateSilenceDuration(state, timestamp(5))).toBe(0)
  })

  it('should return 0 if no typing recorded', () => {
    const state = createTypingState({ lastTypingAt: undefined })
    expect(calculateSilenceDuration(state, timestamp(5))).toBe(0)
  })

  it('should return 0 if typing before speech', () => {
    const state = createTypingState({
      lastSpeechAt: timestamp(5),
      lastTypingAt: timestamp(1), // Typing before speech
    })
    expect(calculateSilenceDuration(state, timestamp(10))).toBe(0)
  })

  it('should calculate silence duration correctly', () => {
    const state = createTypingState({
      lastSpeechAt: timestamp(0),
      lastTypingAt: timestamp(1), // Typing after speech
    })
    // Current time is 3 minutes after speech started
    expect(calculateSilenceDuration(state, timestamp(3))).toBe(180) // 3 minutes
  })
})

describe('updateTypingWithoutSpeech', () => {
  it('should update silence duration', () => {
    const state = createTypingState({
      lastSpeechAt: timestamp(0),
      lastTypingAt: timestamp(1),
      typingWithoutSpeechSeconds: 0,
    })
    const updated = updateTypingWithoutSpeech(state, timestamp(3))

    expect(updated.typingWithoutSpeechSeconds).toBe(180)
  })

  it('should not update if not monitoring', () => {
    const state = createTypingState({ isMonitoring: false })
    const updated = updateTypingWithoutSpeech(state, timestamp(10))

    expect(updated.typingWithoutSpeechSeconds).toBe(state.typingWithoutSpeechSeconds)
  })
})

describe('shouldShowNudge', () => {
  const config = createDefaultConfig()

  it('should not nudge if disabled', () => {
    const state = createTypingState({ typingWithoutSpeechSeconds: 300 })
    const disabledConfig = updateConfig(config, { enabled: false })

    const result = shouldShowNudge(state, disabledConfig, timestamp(5))

    expect(result.shouldNudge).toBe(false)
    expect(result.reason).toContain('disabled')
  })

  it('should not nudge if not monitoring', () => {
    const state = createTypingState({ isMonitoring: false })

    const result = shouldShowNudge(state, config, timestamp(5))

    expect(result.shouldNudge).toBe(false)
  })

  it('should not nudge if max nudges reached', () => {
    const state = createTypingState({
      nudgesShown: THINKING_ALOUD_POLICY.MAX_NUDGES_PER_SESSION,
      typingWithoutSpeechSeconds: 300,
    })

    const result = shouldShowNudge(state, config, timestamp(5))

    expect(result.shouldNudge).toBe(false)
    expect(result.reason).toContain('Max nudges')
  })

  it('should not nudge if too soon since last nudge', () => {
    const state = createTypingState({ typingWithoutSpeechSeconds: 300 })
    const lastNudge = timestamp(1)
    const currentTime = timestamp(2) // Only 1 minute later

    const result = shouldShowNudge(state, config, currentTime, lastNudge)

    expect(result.shouldNudge).toBe(false)
    expect(result.reason).toContain('Too soon')
  })

  it('should not nudge if below silence threshold', () => {
    const state = createTypingState({ typingWithoutSpeechSeconds: 60 }) // 1 minute

    const result = shouldShowNudge(state, config, timestamp(5))

    expect(result.shouldNudge).toBe(false)
    expect(result.reason).toContain('threshold')
  })

  it('should nudge when all conditions met', () => {
    const state = createTypingState({
      typingWithoutSpeechSeconds: THINKING_ALOUD_POLICY.SILENCE_THRESHOLD_SECONDS + 10,
      lastTypingAt: timestamp(0),
    })

    // Current time is well after typing started
    const result = shouldShowNudge(state, config, timestamp(5))

    expect(result.shouldNudge).toBe(true)
  })
})

describe('createNudge', () => {
  it('should create nudge with not_responded status', () => {
    const nudge = createNudge('nudge-1', 'session-1', 130, timestamp())

    expect(nudge.id).toBe('nudge-1')
    expect(nudge.sessionId).toBe('session-1')
    expect(nudge.silenceDurationSeconds).toBe(130)
    expect(nudge.response).toBe('not_responded')
    expect(nudge.respondedAt).toBeUndefined()
  })
})

describe('recordNudgeShown', () => {
  it('should increment nudge count', () => {
    const state = createTypingState({ nudgesShown: 0 })
    const updated = recordNudgeShown(state)

    expect(updated.nudgesShown).toBe(1)
  })
})

describe('respondToNudge', () => {
  it('should update nudge response', () => {
    const nudge = createNudge('nudge-1', 'session-1', 130, timestamp())
    const responded = respondToNudge(nudge, 'will_explain', timestamp(1))

    expect(responded.response).toBe('will_explain')
    expect(responded.respondedAt).toBe(timestamp(1))
  })
})

describe('recordNudgeResponse', () => {
  it('should increment dismissed count for dismissed response', () => {
    const state = createTypingState({ nudgesDismissed: 0 })
    const updated = recordNudgeResponse(state, 'dismissed')

    expect(updated.nudgesDismissed).toBe(1)
  })

  it('should increment dismissed count for continue_silent', () => {
    const state = createTypingState({ nudgesDismissed: 0 })
    const updated = recordNudgeResponse(state, 'continue_silent')

    expect(updated.nudgesDismissed).toBe(1)
  })

  it('should reset silence counter on will_explain', () => {
    const state = createTypingState({
      typingWithoutSpeechSeconds: 150,
      nudgesDismissed: 0,
    })
    const updated = recordNudgeResponse(state, 'will_explain')

    expect(updated.typingWithoutSpeechSeconds).toBe(0)
    expect(updated.nudgesDismissed).toBe(0)
  })
})

describe('shouldApplyPenalty', () => {
  it('should apply penalty for continue_silent', () => {
    const state = createTypingState({ penaltiesApplied: 0 })
    const result = shouldApplyPenalty(state, 'continue_silent')

    expect(result.shouldApply).toBe(true)
  })

  it('should not apply penalty for will_explain', () => {
    const state = createTypingState()
    const result = shouldApplyPenalty(state, 'will_explain')

    expect(result.shouldApply).toBe(false)
  })

  it('should not apply penalty if max reached', () => {
    const state = createTypingState({
      penaltiesApplied: THINKING_ALOUD_POLICY.MAX_PENALTIES_PER_SESSION,
    })
    const result = shouldApplyPenalty(state, 'continue_silent')

    expect(result.shouldApply).toBe(false)
    expect(result.reason).toContain('Max penalties')
  })
})

describe('calculatePenaltyAmount', () => {
  it('should return base penalty for first offense', () => {
    const amount = calculatePenaltyAmount(0)
    expect(amount).toBe(THINKING_ALOUD_POLICY.CONTINUE_SILENT_PENALTY)
  })

  it('should return 1.5x for second offense', () => {
    const amount = calculatePenaltyAmount(1)
    expect(amount).toBe(THINKING_ALOUD_POLICY.CONTINUE_SILENT_PENALTY * 1.5)
  })

  it('should return 2x for third offense', () => {
    const amount = calculatePenaltyAmount(2)
    expect(amount).toBe(THINKING_ALOUD_POLICY.CONTINUE_SILENT_PENALTY * 2)
  })
})

describe('createPenalty', () => {
  it('should create penalty object', () => {
    const penalty = createPenalty('session-1', 'silence', 5, timestamp(), 'Continued silent')

    expect(penalty.sessionId).toBe('session-1')
    expect(penalty.penaltyType).toBe('silence')
    expect(penalty.amount).toBe(5)
    expect(penalty.reason).toBe('Continued silent')
  })
})

describe('applyPenalty', () => {
  it('should increment penalties applied', () => {
    const state = createTypingState({ penaltiesApplied: 0 })
    const updated = applyPenalty(state)

    expect(updated.penaltiesApplied).toBe(1)
  })
})

describe('getUIAction', () => {
  const config = createDefaultConfig()

  it('should return IGNORE when no nudge needed', () => {
    const state = createTypingState({ typingWithoutSpeechSeconds: 30 })
    const action = getUIAction(state, config, timestamp(5))

    expect(action.action).toBe('IGNORE')
  })

  it('should return INTERVIEW_NUDGE with message when nudge needed', () => {
    const state = createTypingState({
      typingWithoutSpeechSeconds: THINKING_ALOUD_POLICY.SILENCE_THRESHOLD_SECONDS + 10,
      lastTypingAt: timestamp(0),
    })
    const action = getUIAction(state, config, timestamp(5))

    expect(action.action).toBe('INTERVIEW_NUDGE')
    expect(action.message).toBeDefined()
  })
})

describe('getNudgeMessage', () => {
  it('should return different messages based on nudge count', () => {
    const msg0 = getNudgeMessage(0, 180)
    const msg1 = getNudgeMessage(1, 180)
    const msg2 = getNudgeMessage(2, 180)

    expect(msg0).toContain('3 minutes')
    expect(msg1).toContain('think aloud')
    expect(msg2).toContain('Communication')
  })
})

describe('calculateTotalPenalty', () => {
  it('should sum all penalties', () => {
    const penalties: CommunicationPenalty[] = [
      createPenalty('s1', 'silence', 5, timestamp(), 'r1'),
      createPenalty('s1', 'silence', 7.5, timestamp(1), 'r2'),
    ]

    expect(calculateTotalPenalty(penalties)).toBe(12.5)
  })

  it('should return 0 for empty array', () => {
    expect(calculateTotalPenalty([])).toBe(0)
  })
})

describe('getSessionStats', () => {
  it('should calculate session statistics', () => {
    const state = createTypingState({
      nudgesShown: 3,
      nudgesDismissed: 1,
      penaltiesApplied: 1,
    })
    const penalties: CommunicationPenalty[] = [
      createPenalty('s1', 'silence', 5, timestamp(), 'r1'),
    ]

    const stats = getSessionStats(state, penalties)

    expect(stats.totalNudges).toBe(3)
    expect(stats.nudgesResponded).toBe(2)
    expect(stats.penaltiesApplied).toBe(1)
    expect(stats.totalPenaltyPercent).toBe(5)
    expect(stats.communicationScore).toBe(95)
  })
})

describe('shouldPauseMonitoring', () => {
  it('should return true during grace period', () => {
    const sessionStart = timestamp(0)
    const currentTime = timestamp(0) // Same time, within grace period

    // Add 30 seconds (within 60 second grace)
    const date = new Date(currentTime)
    date.setSeconds(date.getSeconds() + 30)

    expect(shouldPauseMonitoring(sessionStart, date.toISOString())).toBe(true)
  })

  it('should return false after grace period', () => {
    const sessionStart = timestamp(0)
    const currentTime = timestamp(2) // 2 minutes later

    expect(shouldPauseMonitoring(sessionStart, currentTime)).toBe(false)
  })
})

describe('validateConfig', () => {
  it('should accept valid config', () => {
    const config = createDefaultConfig()
    const result = validateConfig(config)

    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('should reject too low silence threshold', () => {
    const config = updateConfig(createDefaultConfig(), { silenceThresholdSeconds: 20 })
    const result = validateConfig(config)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('at least 30'))).toBe(true)
  })

  it('should reject too high silence threshold', () => {
    const config = updateConfig(createDefaultConfig(), { silenceThresholdSeconds: 700 })
    const result = validateConfig(config)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('10 minutes'))).toBe(true)
  })

  it('should reject nudge interval less than silence threshold', () => {
    const config = updateConfig(createDefaultConfig(), {
      silenceThresholdSeconds: 120,
      nudgeIntervalSeconds: 100,
    })
    const result = validateConfig(config)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('greater than'))).toBe(true)
  })
})

describe('processSpeechEvent', () => {
  it('should handle speech_start', () => {
    const state = createTypingState()
    const event = createSpeechEvent('speech_start', timestamp(5))
    const updated = processSpeechEvent(state, event)

    expect(updated.lastSpeechAt).toBe(timestamp(5))
  })

  it('should not change state for silence_detected event', () => {
    const state = createTypingState()
    const event = createSpeechEvent('silence_detected', timestamp(5))
    const updated = processSpeechEvent(state, event)

    expect(updated.lastSpeechAt).toBe(state.lastSpeechAt)
  })
})

describe('processTypingEvent', () => {
  it('should handle typing_start', () => {
    const state = createTypingState()
    const event = createTypingEvent('typing_start', timestamp(5))
    const updated = processTypingEvent(state, event)

    expect(updated.lastTypingAt).toBe(timestamp(5))
  })
})

describe('hasExceededPenaltyLimit', () => {
  it('should return true when limit reached', () => {
    const state = createTypingState({
      penaltiesApplied: THINKING_ALOUD_POLICY.MAX_PENALTIES_PER_SESSION,
    })

    expect(hasExceededPenaltyLimit(state)).toBe(true)
  })

  it('should return false when under limit', () => {
    const state = createTypingState({ penaltiesApplied: 1 })

    expect(hasExceededPenaltyLimit(state)).toBe(false)
  })
})

describe('hasExceededNudgeLimit', () => {
  it('should return true when limit reached', () => {
    const state = createTypingState({
      nudgesShown: THINKING_ALOUD_POLICY.MAX_NUDGES_PER_SESSION,
    })

    expect(hasExceededNudgeLimit(state)).toBe(true)
  })

  it('should return false when under limit', () => {
    const state = createTypingState({ nudgesShown: 2 })

    expect(hasExceededNudgeLimit(state)).toBe(false)
  })
})

describe('getTimeUntilNextNudge', () => {
  const config = createDefaultConfig()

  it('should return remaining time', () => {
    const lastNudge = timestamp(0)
    const currentTime = timestamp(1) // 1 minute later

    const remaining = getTimeUntilNextNudge(config, lastNudge, currentTime)

    expect(remaining).toBe(config.nudgeIntervalSeconds - 60)
  })

  it('should return 0 if enough time passed', () => {
    const lastNudge = timestamp(0)
    const currentTime = timestamp(5) // 5 minutes later

    const remaining = getTimeUntilNextNudge(config, lastNudge, currentTime)

    expect(remaining).toBe(0)
  })
})

describe('getSilenceProgress', () => {
  const config = createDefaultConfig()

  it('should return 0 if disabled', () => {
    const state = createTypingState({ typingWithoutSpeechSeconds: 60 })
    const disabledConfig = updateConfig(config, { enabled: false })

    expect(getSilenceProgress(state, disabledConfig)).toBe(0)
  })

  it('should return percentage of threshold', () => {
    const state = createTypingState({
      typingWithoutSpeechSeconds: config.silenceThresholdSeconds / 2,
    })

    expect(getSilenceProgress(state, config)).toBe(50)
  })

  it('should cap at 100', () => {
    const state = createTypingState({
      typingWithoutSpeechSeconds: config.silenceThresholdSeconds * 2,
    })

    expect(getSilenceProgress(state, config)).toBe(100)
  })
})

describe('createSpeechEvent', () => {
  it('should create speech event', () => {
    const event = createSpeechEvent('speech_start', timestamp(), 5)

    expect(event.type).toBe('speech_start')
    expect(event.timestamp).toBe(timestamp())
    expect(event.durationSeconds).toBe(5)
  })
})

describe('createTypingEvent', () => {
  it('should create typing event', () => {
    const event = createTypingEvent('typing_start', timestamp(), 100)

    expect(event.type).toBe('typing_start')
    expect(event.timestamp).toBe(timestamp())
    expect(event.characterCount).toBe(100)
  })
})

describe('resetSilenceCounter', () => {
  it('should reset counter to 0', () => {
    const state = createTypingState({ typingWithoutSpeechSeconds: 150 })
    const reset = resetSilenceCounter(state)

    expect(reset.typingWithoutSpeechSeconds).toBe(0)
  })
})

describe('getPenaltyHistorySummary', () => {
  it('should summarize penalty history', () => {
    const penalties: CommunicationPenalty[] = [
      createPenalty('s1', 'silence', 5, timestamp(0), 'r1'),
      createPenalty('s1', 'silence', 7.5, timestamp(1), 'r2'),
      createPenalty('s1', 'no_explanation', 5, timestamp(2), 'r3'),
    ]

    const summary = getPenaltyHistorySummary(penalties)

    expect(summary.silencePenalties).toBe(2)
    expect(summary.noExplanationPenalties).toBe(1)
    expect(summary.totalAmount).toBe(17.5)
    expect(summary.lastPenaltyAt).toBe(timestamp(2))
  })

  it('should handle empty penalties', () => {
    const summary = getPenaltyHistorySummary([])

    expect(summary.silencePenalties).toBe(0)
    expect(summary.totalAmount).toBe(0)
    expect(summary.lastPenaltyAt).toBeUndefined()
  })
})

describe('isActivelySpeaking', () => {
  it('should return true if speech was recent', () => {
    const lastSpeech = timestamp(0)
    const date = new Date(lastSpeech)
    date.setSeconds(date.getSeconds() + 2) // 2 seconds later

    expect(isActivelySpeaking(lastSpeech, date.toISOString())).toBe(true)
  })

  it('should return false if speech was not recent', () => {
    const lastSpeech = timestamp(0)
    const currentTime = timestamp(1) // 1 minute later

    expect(isActivelySpeaking(lastSpeech, currentTime)).toBe(false)
  })

  it('should return false if no speech', () => {
    expect(isActivelySpeaking(undefined, timestamp())).toBe(false)
  })
})

describe('isActivelyTyping', () => {
  it('should return true if typing was recent', () => {
    const lastTyping = timestamp(0)
    const date = new Date(lastTyping)
    date.setSeconds(date.getSeconds() + 1) // 1 second later

    expect(isActivelyTyping(lastTyping, date.toISOString())).toBe(true)
  })

  it('should return false if typing was not recent', () => {
    const lastTyping = timestamp(0)
    const currentTime = timestamp(1) // 1 minute later

    expect(isActivelyTyping(lastTyping, currentTime)).toBe(false)
  })
})

describe('getActivityStatus', () => {
  it('should detect silently typing', () => {
    const lastTyping = timestamp(0)
    const date = new Date(lastTyping)
    date.setSeconds(date.getSeconds() + 1)

    const state = createTypingState({
      lastSpeechAt: timestamp(-1), // Speech was 1 minute ago
      lastTypingAt: lastTyping,
    })

    const status = getActivityStatus(state, date.toISOString())

    expect(status.isTyping).toBe(true)
    expect(status.isSpeaking).toBe(false)
    expect(status.isSilentlyTyping).toBe(true)
  })
})

describe('formatSilenceDuration', () => {
  it('should format seconds', () => {
    expect(formatSilenceDuration(45)).toBe('45 seconds')
  })

  it('should format minutes', () => {
    expect(formatSilenceDuration(120)).toBe('2 minutes')
  })

  it('should format single minute', () => {
    expect(formatSilenceDuration(60)).toBe('1 minute')
  })

  it('should format minutes and seconds', () => {
    expect(formatSilenceDuration(90)).toBe('1m 30s')
  })
})

describe('wasNudgeEffective', () => {
  it('should return true for will_explain', () => {
    const nudge = respondToNudge(
      createNudge('n1', 's1', 120, timestamp()),
      'will_explain',
      timestamp(1)
    )

    expect(wasNudgeEffective(nudge)).toBe(true)
  })

  it('should return false for dismissed', () => {
    const nudge = respondToNudge(
      createNudge('n1', 's1', 120, timestamp()),
      'dismissed',
      timestamp(1)
    )

    expect(wasNudgeEffective(nudge)).toBe(false)
  })
})

describe('calculateNudgeEffectiveness', () => {
  it('should calculate effectiveness percentage', () => {
    const nudges = [
      respondToNudge(createNudge('n1', 's1', 120, timestamp()), 'will_explain', timestamp(1)),
      respondToNudge(createNudge('n2', 's1', 120, timestamp()), 'dismissed', timestamp(1)),
      respondToNudge(createNudge('n3', 's1', 120, timestamp()), 'will_explain', timestamp(1)),
      respondToNudge(createNudge('n4', 's1', 120, timestamp()), 'continue_silent', timestamp(1)),
    ]

    expect(calculateNudgeEffectiveness(nudges)).toBe(50) // 2 out of 4
  })

  it('should return 100 for empty array', () => {
    expect(calculateNudgeEffectiveness([])).toBe(100)
  })
})

describe('getRecommendedAction', () => {
  const config = createDefaultConfig()

  it('should return continue for low silence', () => {
    const state = createTypingState({ typingWithoutSpeechSeconds: 30 })
    expect(getRecommendedAction(state, config, timestamp())).toBe('continue')
  })

  it('should return warn for moderate silence', () => {
    const state = createTypingState({
      typingWithoutSpeechSeconds: config.silenceThresholdSeconds * 0.6,
    })
    expect(getRecommendedAction(state, config, timestamp())).toBe('warn')
  })

  it('should return nudge when threshold reached', () => {
    const state = createTypingState({
      typingWithoutSpeechSeconds: config.silenceThresholdSeconds,
      nudgesShown: 0,
    })
    expect(getRecommendedAction(state, config, timestamp())).toBe('nudge')
  })

  it('should return penalize after nudge shown', () => {
    const state = createTypingState({
      typingWithoutSpeechSeconds: config.silenceThresholdSeconds,
      nudgesShown: 1,
      penaltiesApplied: 0,
    })
    expect(getRecommendedAction(state, config, timestamp())).toBe('penalize')
  })
})

describe('THINKING_ALOUD_POLICY constants', () => {
  it('should have reasonable threshold values', () => {
    expect(THINKING_ALOUD_POLICY.SILENCE_THRESHOLD_SECONDS).toBeGreaterThan(60)
    expect(THINKING_ALOUD_POLICY.MIN_TYPING_BEFORE_CHECK_SECONDS).toBeGreaterThan(0)
    expect(THINKING_ALOUD_POLICY.MIN_NUDGE_INTERVAL_SECONDS).toBeGreaterThan(
      THINKING_ALOUD_POLICY.SILENCE_THRESHOLD_SECONDS
    )
  })

  it('should have reasonable penalty values', () => {
    expect(THINKING_ALOUD_POLICY.CONTINUE_SILENT_PENALTY).toBeGreaterThan(0)
    expect(THINKING_ALOUD_POLICY.CONTINUE_SILENT_PENALTY).toBeLessThanOrEqual(10)
    expect(THINKING_ALOUD_POLICY.MAX_PENALTIES_PER_SESSION).toBeGreaterThan(0)
  })
})

describe('EXTENDED_THINKING_ALOUD_POLICY constants', () => {
  it('should have escalating penalty multipliers', () => {
    expect(EXTENDED_THINKING_ALOUD_POLICY.SECOND_PENALTY_MULTIPLIER).toBeGreaterThan(
      EXTENDED_THINKING_ALOUD_POLICY.FIRST_PENALTY_MULTIPLIER
    )
    expect(EXTENDED_THINKING_ALOUD_POLICY.THIRD_PENALTY_MULTIPLIER).toBeGreaterThan(
      EXTENDED_THINKING_ALOUD_POLICY.SECOND_PENALTY_MULTIPLIER
    )
  })

  it('should have valid grace periods', () => {
    expect(EXTENDED_THINKING_ALOUD_POLICY.SESSION_START_GRACE_SECONDS).toBeGreaterThan(0)
    expect(EXTENDED_THINKING_ALOUD_POLICY.POST_NUDGE_GRACE_SECONDS).toBeGreaterThan(0)
  })
})
