import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getSessionMetrics,
  clearSessionMetrics,
  recordRevealUsed,
  recordCircuitBreakerTripped,
  recordStepCompletion,
  recordStepAttempted,
  recordSessionEndedMidProblem,
  evaluateTriggers,
  isBadSession,
  analyzeSession,
  calculateAverageStepTime,
  loadRecoveryData,
  saveRecoveryData,
  persistSessionOutcome,
  getLastSessionOutcome,
  clearLastSessionOutcome,
  finalizeSession,
  getSessionOutcomeSummary,
  isSessionTrendingBad,
} from '../sessionOutcomeAnalyzer'
import {
  getRecoveryModeState,
  isRecoveryModeActive,
  shouldActivateRecoveryMode,
  activateRecoveryMode,
  recordWarmUpCompletion,
  abandonRecoveryMode,
  resetRecoveryMode,
  isRevealDisabled,
  shouldEnableExtraMicroTasks,
  shouldUseSupportiveTone,
  getRecoveryModeMessage,
  getRecoveryUIStatus,
  initializeRecoveryCheck,
} from '../recoveryModePolicy'
import {
  type SessionOutcome,
  type SessionMetrics,
  type WarmUpProblem,
  type BadSessionTrigger,
  DEFAULT_DETECTION_THRESHOLDS,
  INITIAL_SESSION_METRICS,
  createInitialRecoveryStorage,
} from '@/types/confidenceRepair'
import { STORAGE_KEYS } from '@/lib/storage/types'

// Mock the feature flags module
vi.mock('../featureFlags', () => ({
  isFeatureEnabled: (flag: string) => flag === 'CONFIDENCE_REPAIR',
  FEATURE_FLAGS: { CONFIDENCE_REPAIR: true },
}))

// Use separate storage maps for localStorage and sessionStorage
const localStorageMap = new Map<string, string>()
const sessionStorageMap = new Map<string, string>()

const createMockStorage = (map: Map<string, string>) => ({
  getItem: vi.fn((key: string) => map.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { map.set(key, value) }),
  removeItem: vi.fn((key: string) => { map.delete(key) }),
  clear: vi.fn(() => map.clear()),
  key: vi.fn((index: number) => Array.from(map.keys())[index] ?? null),
  get length() { return map.size },
})

const mockLocalStorage = createMockStorage(localStorageMap)
const mockSessionStorage = createMockStorage(sessionStorageMap)

// Apply mocks
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, configurable: true })
Object.defineProperty(window, 'sessionStorage', { value: mockSessionStorage, configurable: true })

describe('ConfidenceRepairSystem', () => {
  beforeEach(() => {
    localStorageMap.clear()
    sessionStorageMap.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    localStorageMap.clear()
    sessionStorageMap.clear()
    vi.clearAllMocks()
  })

  // ============================================
  // Session Metrics Tests
  // ============================================

  describe('Session Metrics', () => {
    it('returns initial metrics when none stored', () => {
      const metrics = getSessionMetrics()

      expect(metrics).toEqual(INITIAL_SESSION_METRICS)
      expect(metrics.revealCount).toBe(0)
      expect(metrics.circuitBreakerTripped).toBe(false)
      expect(metrics.stepTimesMs).toEqual([])
      expect(metrics.endedMidProblem).toBe(false)
    })

    it('records reveal usage', () => {
      recordRevealUsed()
      recordRevealUsed()

      const metrics = getSessionMetrics()
      expect(metrics.revealCount).toBe(2)
    })

    it('records circuit breaker trip', () => {
      recordCircuitBreakerTripped()

      const metrics = getSessionMetrics()
      expect(metrics.circuitBreakerTripped).toBe(true)
    })

    it('records step completions with timing', () => {
      recordStepCompletion(60000)
      recordStepCompletion(120000)
      recordStepCompletion(180000)

      const metrics = getSessionMetrics()
      expect(metrics.stepTimesMs).toEqual([60000, 120000, 180000])
      expect(metrics.stepsCompleted).toBe(3)
    })

    it('records step attempts', () => {
      recordStepAttempted()
      recordStepAttempted()

      const metrics = getSessionMetrics()
      expect(metrics.stepsAttempted).toBe(2)
    })

    it('records session ended mid-problem', () => {
      recordSessionEndedMidProblem('problem-123')

      const metrics = getSessionMetrics()
      expect(metrics.endedMidProblem).toBe(true)
      expect(metrics.incompleteProblemId).toBe('problem-123')
    })

    it('clears metrics correctly', () => {
      recordRevealUsed()
      recordCircuitBreakerTripped()
      clearSessionMetrics()

      const metrics = getSessionMetrics()
      expect(metrics.revealCount).toBe(0)
      expect(metrics.circuitBreakerTripped).toBe(false)
    })
  })

  // ============================================
  // Detection Logic Tests
  // ============================================

  describe('Detection Logic', () => {
    it('calculates average step time correctly', () => {
      expect(calculateAverageStepTime([60000, 120000, 180000])).toBe(120000)
      expect(calculateAverageStepTime([100000])).toBe(100000)
      expect(calculateAverageStepTime([])).toBe(0)
    })

    describe('evaluateTriggers', () => {
      it('detects reveal overuse trigger', () => {
        const metrics: SessionMetrics = {
          ...INITIAL_SESSION_METRICS,
          revealCount: 3, // Over default threshold of 2
        }

        const triggers = evaluateTriggers(metrics)
        expect(triggers).toContain('reveal_overuse')
      })

      it('detects circuit breaker trip trigger', () => {
        const metrics: SessionMetrics = {
          ...INITIAL_SESSION_METRICS,
          circuitBreakerTripped: true,
        }

        const triggers = evaluateTriggers(metrics)
        expect(triggers).toContain('circuit_breaker_trip')
      })

      it('detects slow step time trigger', () => {
        const metrics: SessionMetrics = {
          ...INITIAL_SESSION_METRICS,
          stepTimesMs: [400000, 350000, 380000], // Average > 5 min threshold
        }

        const triggers = evaluateTriggers(metrics)
        expect(triggers).toContain('slow_step_time')
      })

      it('detects session incomplete trigger', () => {
        const metrics: SessionMetrics = {
          ...INITIAL_SESSION_METRICS,
          endedMidProblem: true,
          incompleteProblemId: 'problem-123',
        }

        const triggers = evaluateTriggers(metrics)
        expect(triggers).toContain('session_incomplete')
      })

      it('returns empty array when no triggers activated', () => {
        const metrics: SessionMetrics = {
          ...INITIAL_SESSION_METRICS,
          revealCount: 1, // Under threshold
          stepTimesMs: [60000, 80000], // Fast
        }

        const triggers = evaluateTriggers(metrics)
        expect(triggers).toEqual([])
      })

      it('respects custom thresholds', () => {
        const metrics: SessionMetrics = {
          ...INITIAL_SESSION_METRICS,
          revealCount: 1, // Under default but over custom
        }

        const customThresholds = {
          ...DEFAULT_DETECTION_THRESHOLDS,
          maxRevealCount: 0, // Lower threshold
        }

        const triggers = evaluateTriggers(metrics, customThresholds)
        expect(triggers).toContain('reveal_overuse')
      })
    })

    describe('isBadSession', () => {
      it('returns true when 2+ triggers are activated', () => {
        const triggers: BadSessionTrigger[] = ['reveal_overuse', 'circuit_breaker_trip']
        expect(isBadSession(triggers)).toBe(true)
      })

      it('returns true when all 4 triggers are activated', () => {
        const triggers: BadSessionTrigger[] = [
          'reveal_overuse',
          'circuit_breaker_trip',
          'slow_step_time',
          'session_incomplete',
        ]
        expect(isBadSession(triggers)).toBe(true)
      })

      it('returns false when only 1 trigger is activated', () => {
        const triggers: BadSessionTrigger[] = ['reveal_overuse']
        expect(isBadSession(triggers)).toBe(false)
      })

      it('returns false when no triggers are activated', () => {
        const triggers: BadSessionTrigger[] = []
        expect(isBadSession(triggers)).toBe(false)
      })

      it('respects custom minTriggersRequired', () => {
        const triggers: BadSessionTrigger[] = ['reveal_overuse']
        expect(isBadSession(triggers, 1)).toBe(true)
        expect(isBadSession(triggers, 2)).toBe(false)
      })
    })
  })

  // ============================================
  // Session Analysis Tests
  // ============================================

  describe('Session Analysis', () => {
    it('analyzes session and generates outcome', () => {
      recordRevealUsed()
      recordRevealUsed()
      recordRevealUsed()
      recordCircuitBreakerTripped()

      const outcome = analyzeSession()

      expect(outcome.sessionId).toBeDefined()
      expect(outcome.endedAt).toBeDefined()
      expect(outcome.metrics.revealCount).toBe(3)
      expect(outcome.metrics.circuitBreakerTripped).toBe(true)
      expect(outcome.activatedTriggers).toContain('reveal_overuse')
      expect(outcome.activatedTriggers).toContain('circuit_breaker_trip')
      expect(outcome.isBadSession).toBe(true)
    })

    it('generates summary for telemetry', () => {
      // Clear and record fresh metrics
      clearSessionMetrics()
      recordRevealUsed()
      recordStepCompletion(100000)
      recordStepCompletion(100000)

      const summary = getSessionOutcomeSummary()

      expect(summary.metrics.revealCount).toBeGreaterThanOrEqual(1)
      expect(summary.metrics.stepTimesMs.length).toBeGreaterThanOrEqual(2)
      expect(summary.avgStepTimeMs).toBeGreaterThan(0)
      expect(summary.isBad).toBe(false)
      expect(summary.triggers).toBeDefined()
    })

    it('detects trending towards bad session', () => {
      // No triggers
      expect(isSessionTrendingBad().trending).toBe(false)

      // One trigger - trending
      recordRevealUsed()
      recordRevealUsed()
      recordRevealUsed()
      expect(isSessionTrendingBad().trending).toBe(true)
      expect(isSessionTrendingBad().triggersActive).toBe(1)
    })
  })

  // ============================================
  // Session Persistence Tests
  // ============================================

  describe('Session Persistence', () => {
    it('persists session outcome for next session', () => {
      const outcome: SessionOutcome = {
        sessionId: 'test-session',
        endedAt: new Date().toISOString(),
        metrics: INITIAL_SESSION_METRICS,
        activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
        isBadSession: true,
      }

      persistSessionOutcome(outcome)
      const loaded = getLastSessionOutcome()

      expect(loaded).toBeDefined()
      expect(loaded?.sessionId).toBe('test-session')
      expect(loaded?.isBadSession).toBe(true)
    })

    it('clears last session outcome', () => {
      const outcome: SessionOutcome = {
        sessionId: 'test-session',
        endedAt: new Date().toISOString(),
        metrics: INITIAL_SESSION_METRICS,
        activatedTriggers: [],
        isBadSession: false,
      }

      persistSessionOutcome(outcome)
      clearLastSessionOutcome()

      expect(getLastSessionOutcome()).toBeUndefined()
    })

    it('finalizes session with incomplete problem', () => {
      recordRevealUsed()
      recordCircuitBreakerTripped()

      const outcome = finalizeSession('incomplete-problem-id')

      expect(outcome.metrics.endedMidProblem).toBe(true)
      expect(outcome.metrics.incompleteProblemId).toBe('incomplete-problem-id')
      expect(outcome.activatedTriggers).toContain('session_incomplete')
    })
  })

  // ============================================
  // Recovery Mode Policy Tests
  // ============================================

  describe('Recovery Mode Policy', () => {
    const mockWarmUpProblem: WarmUpProblem = {
      problemId: 'warmup-1',
      problemTitle: 'Easy Newton Problem',
      patternId: 'newtons-second-law',
      patternName: "Newton's Second Law",
      masteryLevel: 'high',
      difficulty: 'Easy',
    }

    beforeEach(() => {
      resetRecoveryMode()
      clearLastSessionOutcome()
    })

    it('starts in inactive state', () => {
      const state = getRecoveryModeState()

      expect(state.status).toBe('inactive')
      expect(state.warmUpsCompleted).toBe(0)
    })

    it('does not activate when no bad session recorded', () => {
      const { shouldActivate } = shouldActivateRecoveryMode()
      expect(shouldActivate).toBe(false)
    })

    it('activates when previous session was bad', () => {
      // Persist a bad session outcome
      const badOutcome: SessionOutcome = {
        sessionId: 'bad-session',
        endedAt: new Date().toISOString(),
        metrics: INITIAL_SESSION_METRICS,
        activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
        isBadSession: true,
      }
      persistSessionOutcome(badOutcome)

      const { shouldActivate, triggeringOutcome } = shouldActivateRecoveryMode()

      expect(shouldActivate).toBe(true)
      expect(triggeringOutcome?.sessionId).toBe('bad-session')
    })

    it('activates recovery mode with warm-up problem', () => {
      const triggeringOutcome: SessionOutcome = {
        sessionId: 'bad-session',
        endedAt: new Date().toISOString(),
        metrics: INITIAL_SESSION_METRICS,
        activatedTriggers: ['reveal_overuse', 'session_incomplete'],
        isBadSession: true,
      }

      const state = activateRecoveryMode(triggeringOutcome, mockWarmUpProblem)

      expect(state.status).toBe('active')
      expect(state.warmUpProblem).toEqual(mockWarmUpProblem)
      expect(state.triggeringOutcome).toEqual(triggeringOutcome)
      expect(state.warmUpsCompleted).toBe(0)
    })

    it('clears triggering outcome after activation', () => {
      const outcome: SessionOutcome = {
        sessionId: 'bad-session',
        endedAt: new Date().toISOString(),
        metrics: INITIAL_SESSION_METRICS,
        activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
        isBadSession: true,
      }
      persistSessionOutcome(outcome)
      activateRecoveryMode(outcome, mockWarmUpProblem)

      // Should not trigger again
      expect(getLastSessionOutcome()).toBeUndefined()
    })

    it('completes recovery after successful warm-up', () => {
      const outcome: SessionOutcome = {
        sessionId: 'bad-session',
        endedAt: new Date().toISOString(),
        metrics: INITIAL_SESSION_METRICS,
        activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
        isBadSession: true,
      }
      activateRecoveryMode(outcome, mockWarmUpProblem)

      const { recoveryCompleted, updatedState } = recordWarmUpCompletion()

      expect(recoveryCompleted).toBe(true)
      expect(updatedState.status).toBe('completed')
      expect(updatedState.warmUpsCompleted).toBe(1)
      expect(updatedState.completedAt).toBeDefined()
    })

    it('abandons recovery mode correctly', () => {
      const outcome: SessionOutcome = {
        sessionId: 'bad-session',
        endedAt: new Date().toISOString(),
        metrics: INITIAL_SESSION_METRICS,
        activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
        isBadSession: true,
      }
      activateRecoveryMode(outcome, mockWarmUpProblem)

      const resetState = abandonRecoveryMode()

      expect(resetState.status).toBe('inactive')
    })

    it('provides correct recovery mode configuration', () => {
      const outcome: SessionOutcome = {
        sessionId: 'bad-session',
        endedAt: new Date().toISOString(),
        metrics: INITIAL_SESSION_METRICS,
        activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
        isBadSession: true,
      }
      activateRecoveryMode(outcome, mockWarmUpProblem)

      expect(isRevealDisabled()).toBe(true)
      expect(shouldEnableExtraMicroTasks()).toBe(true)
      expect(shouldUseSupportiveTone()).toBe(true)
    })

    it('returns correct recovery message', () => {
      expect(getRecoveryModeMessage()).toBe("Let's rebuild confidence first.")
    })

    it('provides complete UI status', () => {
      const outcome: SessionOutcome = {
        sessionId: 'bad-session',
        endedAt: new Date().toISOString(),
        metrics: INITIAL_SESSION_METRICS,
        activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
        isBadSession: true,
      }
      activateRecoveryMode(outcome, mockWarmUpProblem)

      const status = getRecoveryUIStatus()

      expect(status.active).toBe(true)
      expect(status.message).toBe("Let's rebuild confidence first.")
      expect(status.warmUpProblem).toEqual(mockWarmUpProblem)
      expect(status.warmUpsCompleted).toBe(0)
      expect(status.warmUpsRequired).toBe(1)
      expect(status.config.revealDisabled).toBe(true)
    })

    it('initializes recovery check correctly', () => {
      const badOutcome: SessionOutcome = {
        sessionId: 'bad-session',
        endedAt: new Date().toISOString(),
        metrics: INITIAL_SESSION_METRICS,
        activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
        isBadSession: true,
      }
      persistSessionOutcome(badOutcome)

      const check = initializeRecoveryCheck()

      expect(check.needsRecovery).toBe(true)
      expect(check.triggeringOutcome).toBeDefined()
      expect(typeof check.activate).toBe('function')

      // Activate using the callback
      const state = check.activate(mockWarmUpProblem)
      expect(state.status).toBe('active')
    })
  })

  // ============================================
  // Integration Tests
  // ============================================

  describe('Integration: Full Recovery Flow', () => {
    const mockWarmUpProblem: WarmUpProblem = {
      problemId: 'warmup-1',
      problemTitle: 'Easy Newton Problem',
      patternId: 'newtons-second-law',
      patternName: "Newton's Second Law",
      masteryLevel: 'high',
      difficulty: 'Easy',
    }

    beforeEach(() => {
      resetRecoveryMode()
      clearSessionMetrics()
      clearLastSessionOutcome()
    })

    it('complete flow: bad session → recovery → success', () => {
      // Step 1: Simulate a bad session
      recordRevealUsed()
      recordRevealUsed()
      recordRevealUsed() // Over threshold
      recordCircuitBreakerTripped()

      // Step 2: Finalize the session
      const outcome = finalizeSession('incomplete-problem')
      expect(outcome.isBadSession).toBe(true)
      expect(outcome.activatedTriggers.length).toBeGreaterThanOrEqual(2)

      // Step 3: New session - check for recovery
      const { needsRecovery, activate } = initializeRecoveryCheck()
      expect(needsRecovery).toBe(true)

      // Step 4: Activate recovery with warm-up
      const recoveryState = activate(mockWarmUpProblem)
      expect(recoveryState.status).toBe('active')
      expect(isRecoveryModeActive()).toBe(true)
      expect(isRevealDisabled()).toBe(true)

      // Step 5: Complete warm-up successfully
      const { recoveryCompleted } = recordWarmUpCompletion()
      expect(recoveryCompleted).toBe(true)

      // Step 6: Verify recovery is complete
      const finalState = getRecoveryModeState()
      expect(finalState.status).toBe('completed')
    })

    it('no recovery needed for good session', () => {
      // Simulate a good session
      recordStepCompletion(60000)
      recordStepCompletion(45000)
      recordStepAttempted()

      // Finalize
      const outcome = finalizeSession()
      expect(outcome.isBadSession).toBe(false)

      // Check for recovery
      const { needsRecovery } = initializeRecoveryCheck()
      expect(needsRecovery).toBe(false)
    })

    it('recovery mode prevents multiple activations', () => {
      // First bad session
      const badOutcome: SessionOutcome = {
        sessionId: 'bad-1',
        endedAt: new Date().toISOString(),
        metrics: INITIAL_SESSION_METRICS,
        activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
        isBadSession: true,
      }
      persistSessionOutcome(badOutcome)

      // Activate recovery
      activateRecoveryMode(badOutcome, mockWarmUpProblem)

      // Try to check again - should not need recovery (already active)
      const result = shouldActivateRecoveryMode()
      expect(result.shouldActivate).toBe(false)
    })
  })

  // ============================================
  // Edge Cases
  // ============================================

  describe('Edge Cases', () => {
    it('handles empty step times array for average calculation', () => {
      expect(calculateAverageStepTime([])).toBe(0)
    })

    it('handles multiple warm-up requirements', () => {
      const outcome: SessionOutcome = {
        sessionId: 'bad-session',
        endedAt: new Date().toISOString(),
        metrics: INITIAL_SESSION_METRICS,
        activatedTriggers: ['reveal_overuse', 'circuit_breaker_trip'],
        isBadSession: true,
      }

      // Activate with config requiring 2 warm-ups
      activateRecoveryMode(outcome, {
        problemId: 'warmup-1',
        problemTitle: 'Test',
        patternId: 'pattern-1',
        patternName: 'Pattern',
        masteryLevel: 'high',
        difficulty: 'Easy',
      })

      // Manually set higher requirement
      const data = loadRecoveryData()
      data.recoveryState.config.warmUpProblemsRequired = 2
      saveRecoveryData(data)

      // First warm-up - not complete
      const first = recordWarmUpCompletion()
      expect(first.recoveryCompleted).toBe(false)
      expect(first.updatedState.warmUpsCompleted).toBe(1)

      // Second warm-up - complete
      const second = recordWarmUpCompletion()
      expect(second.recoveryCompleted).toBe(true)
      expect(second.updatedState.warmUpsCompleted).toBe(2)
    })

    it('handles inactive state for UI helper functions', () => {
      resetRecoveryMode()

      expect(isRevealDisabled()).toBe(false)
      expect(shouldEnableExtraMicroTasks()).toBe(false)
      expect(shouldUseSupportiveTone()).toBe(false)

      const status = getRecoveryUIStatus()
      expect(status.active).toBe(false)
      expect(status.message).toBe('')
    })
  })
})
