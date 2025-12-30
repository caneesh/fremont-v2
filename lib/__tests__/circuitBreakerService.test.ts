import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { circuitBreakerService } from '../circuitBreakerService'
import { getDrillsForTag, getDrillById } from '../drillBank'
import type { ErrorTag } from '@/types/circuitBreaker'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

// Setup global mocks
beforeEach(() => {
  // @ts-ignore
  global.localStorage = localStorageMock
  localStorageMock.clear()
  circuitBreakerService.clearAllSessions()
  circuitBreakerService.resetThresholds()
})

afterEach(() => {
  localStorageMock.clear()
  vi.useRealTimers()
})

describe('CircuitBreakerService', () => {
  const SESSION_ID = 'test-session-123'
  const PROBLEM_ID = 'problem-001'
  const ERROR_TAG: ErrorTag = 'vector_component'

  describe('Session Management', () => {
    it('should create a new session', () => {
      const session = circuitBreakerService.getOrCreateSession(SESSION_ID, PROBLEM_ID)

      expect(session).toBeDefined()
      expect(session.sessionId).toBe(SESSION_ID)
      expect(session.problemId).toBe(PROBLEM_ID)
      expect(session.state).toBe('MONITORING')
      expect(session.errors).toHaveLength(0)
      expect(session.errorCounts).toHaveLength(0)
      expect(session.interventionHistory).toHaveLength(0)
    })

    it('should return existing session if already created', () => {
      const session1 = circuitBreakerService.getOrCreateSession(SESSION_ID, PROBLEM_ID)

      // Record an error to modify the session
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, ERROR_TAG, 1, 'grading')

      const session2 = circuitBreakerService.getOrCreateSession(SESSION_ID, PROBLEM_ID)

      expect(session2.errors).toHaveLength(1)
      expect(session1.sessionId).toBe(session2.sessionId)
    })

    it('should create separate sessions for different problems', () => {
      circuitBreakerService.getOrCreateSession(SESSION_ID, 'problem-001')
      circuitBreakerService.getOrCreateSession(SESSION_ID, 'problem-002')

      const session1 = circuitBreakerService.getSession(SESSION_ID, 'problem-001')
      const session2 = circuitBreakerService.getSession(SESSION_ID, 'problem-002')

      expect(session1).not.toBeNull()
      expect(session2).not.toBeNull()
      expect(session1?.problemId).toBe('problem-001')
      expect(session2?.problemId).toBe('problem-002')
    })

    it('should return null for non-existent session', () => {
      const session = circuitBreakerService.getSession('non-existent', 'problem')
      expect(session).toBeNull()
    })
  })

  describe('Error Recording', () => {
    it('should record a new error', () => {
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        ERROR_TAG,
        1,
        'grading',
        'Incorrect vector resolution'
      )

      expect(evaluation.state).toBe('MONITORING')
      expect(evaluation.shouldIntervene).toBe(false)

      const session = circuitBreakerService.getSession(SESSION_ID, PROBLEM_ID)
      expect(session?.errors).toHaveLength(1)
      expect(session?.errors[0].errorTag).toBe(ERROR_TAG)
      expect(session?.errors[0].stepId).toBe(1)
      expect(session?.errors[0].source).toBe('grading')
      expect(session?.errors[0].context).toBe('Incorrect vector resolution')
    })

    it('should increment error count for repeated errors', () => {
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, ERROR_TAG, 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, ERROR_TAG, 2, 'grading')

      const session = circuitBreakerService.getSession(SESSION_ID, PROBLEM_ID)
      const tagCount = session?.errorCounts.find(ec => ec.errorTag === ERROR_TAG)

      expect(tagCount?.count).toBe(2)
      expect(tagCount?.stepIds).toContain(1)
      expect(tagCount?.stepIds).toContain(2)
    })

    it('should track multiple error tags separately', () => {
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'sign_convention', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      const session = circuitBreakerService.getSession(SESSION_ID, PROBLEM_ID)

      expect(session?.errorCounts).toHaveLength(2)

      const vectorCount = session?.errorCounts.find(ec => ec.errorTag === 'vector_component')
      const signCount = session?.errorCounts.find(ec => ec.errorTag === 'sign_convention')

      expect(vectorCount?.count).toBe(2)
      expect(signCount?.count).toBe(1)
    })

    it('should generate unique IDs for each error', () => {
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, ERROR_TAG, 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, ERROR_TAG, 2, 'grading')

      const session = circuitBreakerService.getSession(SESSION_ID, PROBLEM_ID)

      expect(session?.errors[0].id).not.toBe(session?.errors[1].id)
    })
  })

  describe('Threshold Evaluation - WARNING State', () => {
    it('should transition to WARNING at warningCount', () => {
      // vector_component has warningCount: 2, tripCount: 3
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'vector_component',
        2,
        'grading'
      )

      expect(evaluation.state).toBe('WARNING')
      expect(evaluation.shouldIntervene).toBe(false)
      expect(evaluation.triggeringTag).toBe('vector_component')
      expect(evaluation.message).toContain('Vector Components')
    })

    it('should show remaining count in warning message', () => {
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'vector_component',
        2,
        'grading'
      )

      expect(evaluation.message).toContain('One more')
    })
  })

  describe('Threshold Evaluation - TRIPPED State', () => {
    it('should transition to TRIPPED at tripCount', () => {
      // vector_component has tripCount: 3
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'vector_component',
        3,
        'grading'
      )

      expect(evaluation.state).toBe('TRIPPED')
      expect(evaluation.shouldIntervene).toBe(true)
      expect(evaluation.triggeringTag).toBe('vector_component')
      expect(evaluation.suggestedDrillId).toBeDefined()
    })

    it('should suggest a drill when tripped', () => {
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'vector_component',
        3,
        'grading'
      )

      expect(evaluation.suggestedDrillId).toBeTruthy()

      // Verify the drill exists
      const drill = getDrillById(evaluation.suggestedDrillId!)
      expect(drill).not.toBeNull()
      expect(drill?.linkedErrorTag).toBe('vector_component')
    })

    it('should lock the problem when tripped', () => {
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      expect(circuitBreakerService.isProblemLocked(SESSION_ID, PROBLEM_ID)).toBe(true)
    })
  })

  describe('Threshold Evaluation - Different Error Tags', () => {
    it('should use different thresholds for different error tags', () => {
      // conservation_scope has tripCount: 2 (stricter)
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'conservation_scope', 1, 'grading')
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'conservation_scope',
        2,
        'grading'
      )

      expect(evaluation.state).toBe('TRIPPED')
      expect(evaluation.shouldIntervene).toBe(true)
    })

    it('should use lenient thresholds for procedural errors', () => {
      // unit_conversion has tripCount: 4 (more lenient)
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'unit_conversion', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'unit_conversion', 2, 'grading')
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'unit_conversion',
        3,
        'grading'
      )

      expect(evaluation.state).toBe('WARNING')
      expect(evaluation.shouldIntervene).toBe(false)
    })
  })

  describe('Drill Lifecycle', () => {
    it('should start a drill', () => {
      // Trip the circuit breaker
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      const drills = getDrillsForTag('vector_component')
      const drill = drills[0]

      const started = circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, drill)

      expect(started).toBe(true)

      const session = circuitBreakerService.getSession(SESSION_ID, PROBLEM_ID)
      expect(session?.state).toBe('DRILLING')
      expect(session?.currentIntervention).toBeDefined()
      expect(session?.currentIntervention?.drillId).toBe(drill.id)
      expect(session?.currentIntervention?.triggeredBy).toBe('vector_component')
    })

    it('should not start drill if not in TRIPPED state', () => {
      circuitBreakerService.getOrCreateSession(SESSION_ID, PROBLEM_ID)

      const drills = getDrillsForTag('vector_component')
      const started = circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, drills[0])

      expect(started).toBe(false)
    })

    it('should record drill attempts', () => {
      // Setup: trip and start drill
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      const drills = getDrillsForTag('vector_component')
      circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, drills[0])

      // Record attempts
      circuitBreakerService.recordDrillAttempt(SESSION_ID, PROBLEM_ID, false)
      circuitBreakerService.recordDrillAttempt(SESSION_ID, PROBLEM_ID, true)

      const session = circuitBreakerService.getSession(SESSION_ID, PROBLEM_ID)
      expect(session?.currentIntervention?.attemptCount).toBe(2)
    })

    it('should complete drill successfully', () => {
      vi.useFakeTimers()

      // Setup: trip and start drill
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      const drills = getDrillsForTag('vector_component')
      circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, drills[0])

      // Complete drill
      const session = circuitBreakerService.completeDrill(SESSION_ID, PROBLEM_ID, true)

      expect(session).not.toBeNull()
      expect(session?.state).toBe('RECOVERED')
      expect(session?.currentIntervention).toBeUndefined()
      expect(session?.interventionHistory).toHaveLength(1)
      expect(session?.interventionHistory[0].success).toBe(true)
      expect(session?.interventionHistory[0].errorTag).toBe('vector_component')

      vi.useRealTimers()
    })

    it('should reset error count after drill completion', () => {
      // Setup: trip and start drill
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      const drills = getDrillsForTag('vector_component')
      circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, drills[0])
      circuitBreakerService.completeDrill(SESSION_ID, PROBLEM_ID, true)

      const session = circuitBreakerService.getSession(SESSION_ID, PROBLEM_ID)
      const tagCount = session?.errorCounts.find(ec => ec.errorTag === 'vector_component')

      expect(tagCount?.count).toBe(0)
    })

    it('should add cooldown after drill completion', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      // Setup: trip and complete drill
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      const drills = getDrillsForTag('vector_component')
      circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, drills[0])
      circuitBreakerService.completeDrill(SESSION_ID, PROBLEM_ID, true)

      const session = circuitBreakerService.getSession(SESSION_ID, PROBLEM_ID)
      const cooldown = session?.cooldowns.find(c => c.errorTag === 'vector_component')

      expect(cooldown).toBeDefined()
      // vector_component has 30 min cooldown
      expect(new Date(cooldown!.expiresAt).getTime()).toBe(now + 30 * 60 * 1000)

      vi.useRealTimers()
    })

    it('should skip drill recording as failed', () => {
      // Setup: trip and start drill
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      const drills = getDrillsForTag('vector_component')
      circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, drills[0])

      const skipped = circuitBreakerService.skipDrill(SESSION_ID, PROBLEM_ID)

      expect(skipped).toBe(true)

      const session = circuitBreakerService.getSession(SESSION_ID, PROBLEM_ID)
      expect(session?.interventionHistory[0].success).toBe(false)
    })
  })

  describe('Cooldown Logic', () => {
    it('should not trip during cooldown period', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      // Trip and complete drill
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      const drills = getDrillsForTag('vector_component')
      circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, drills[0])
      circuitBreakerService.completeDrill(SESSION_ID, PROBLEM_ID, true)

      // Advance time but still within cooldown (30 min for vector_component)
      vi.advanceTimersByTime(15 * 60 * 1000) // 15 minutes

      // Try to trigger again
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 4, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 5, 'grading')
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'vector_component',
        6,
        'grading'
      )

      // Should not trip because of cooldown
      expect(evaluation.shouldIntervene).toBe(false)

      vi.useRealTimers()
    })

    it('should trip after cooldown expires', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      // Trip and complete drill
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      const drills = getDrillsForTag('vector_component')
      circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, drills[0])
      circuitBreakerService.completeDrill(SESSION_ID, PROBLEM_ID, true)

      // Advance time past cooldown (30 min for vector_component)
      vi.advanceTimersByTime(31 * 60 * 1000) // 31 minutes

      // Try to trigger again - should work now
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 4, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 5, 'grading')
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'vector_component',
        6,
        'grading'
      )

      expect(evaluation.shouldIntervene).toBe(true)
      expect(evaluation.state).toBe('TRIPPED')

      vi.useRealTimers()
    })

    it('should allow different error tag to trip while another is in cooldown', () => {
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      // Trip vector_component and complete
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      const vectorDrills = getDrillsForTag('vector_component')
      circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, vectorDrills[0])
      circuitBreakerService.completeDrill(SESSION_ID, PROBLEM_ID, true)

      // Advance a bit
      vi.advanceTimersByTime(5 * 60 * 1000)

      // Different tag (conservation_scope has tripCount: 2) should still work
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'conservation_scope', 4, 'grading')
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'conservation_scope',
        5,
        'grading'
      )

      expect(evaluation.shouldIntervene).toBe(true)
      expect(evaluation.triggeringTag).toBe('conservation_scope')

      vi.useRealTimers()
    })
  })

  describe('Error Recording During Drill', () => {
    it('should not record errors while drilling', () => {
      // Trip and start drill
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      const drills = getDrillsForTag('vector_component')
      circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, drills[0])

      // Try to record another error
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'sign_convention',
        4,
        'grading'
      )

      expect(evaluation.state).toBe('DRILLING')
      expect(evaluation.message).toContain('Complete the current drill')

      // Error should not be recorded
      const session = circuitBreakerService.getSession(SESSION_ID, PROBLEM_ID)
      const signCount = session?.errorCounts.find(ec => ec.errorTag === 'sign_convention')
      expect(signCount).toBeUndefined()
    })
  })

  describe('Query Methods', () => {
    it('should get current state', () => {
      circuitBreakerService.getOrCreateSession(SESSION_ID, PROBLEM_ID)

      expect(circuitBreakerService.getCurrentState(SESSION_ID, PROBLEM_ID)).toBe('MONITORING')

      // Trigger warning
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')

      expect(circuitBreakerService.getCurrentState(SESSION_ID, PROBLEM_ID)).toBe('WARNING')
    })

    it('should check if problem is locked', () => {
      circuitBreakerService.getOrCreateSession(SESSION_ID, PROBLEM_ID)

      expect(circuitBreakerService.isProblemLocked(SESSION_ID, PROBLEM_ID)).toBe(false)

      // Trip
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      expect(circuitBreakerService.isProblemLocked(SESSION_ID, PROBLEM_ID)).toBe(true)
    })

    it('should get error summary', () => {
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'sign_convention', 3, 'grading')

      const summary = circuitBreakerService.getErrorSummary(SESSION_ID, PROBLEM_ID)

      expect(summary).toHaveLength(2)

      const vectorSummary = summary.find(s => s.tag === 'vector_component')
      const signSummary = summary.find(s => s.tag === 'sign_convention')

      expect(vectorSummary?.count).toBe(2)
      expect(vectorSummary?.label).toBe('Vector Components')
      expect(signSummary?.count).toBe(1)
      expect(signSummary?.label).toBe('Sign Convention')
    })

    it('should get intervention history', () => {
      // Trip and complete two drills
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      const drills = getDrillsForTag('vector_component')
      circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, drills[0])
      circuitBreakerService.completeDrill(SESSION_ID, PROBLEM_ID, true)

      const history = circuitBreakerService.getInterventionHistory(SESSION_ID, PROBLEM_ID)

      expect(history).toHaveLength(1)
      expect(history[0].errorTag).toBe('vector_component')
      expect(history[0].success).toBe(true)
    })
  })

  describe('Statistics', () => {
    it('should calculate overall statistics', () => {
      // Complete a successful drill
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 3, 'grading')

      let drills = getDrillsForTag('vector_component')
      circuitBreakerService.startDrill(SESSION_ID, PROBLEM_ID, drills[0])
      circuitBreakerService.completeDrill(SESSION_ID, PROBLEM_ID, true)

      // Complete a failed drill in another session
      circuitBreakerService.recordError('session-2', 'problem-2', 'sign_convention', 1, 'grading')
      circuitBreakerService.recordError('session-2', 'problem-2', 'sign_convention', 2, 'grading')
      circuitBreakerService.recordError('session-2', 'problem-2', 'sign_convention', 3, 'grading')

      drills = getDrillsForTag('sign_convention')
      circuitBreakerService.startDrill('session-2', 'problem-2', drills[0])
      circuitBreakerService.completeDrill('session-2', 'problem-2', false)

      const stats = circuitBreakerService.getStatistics()

      expect(stats.totalInterventions).toBe(2)
      expect(stats.successRate).toBe(0.5)
      expect(stats.tagBreakdown).toHaveLength(2)
    })

    it('should identify most common error tag', () => {
      // Multiple interventions for vector_component
      for (let i = 0; i < 2; i++) {
        const sessionId = `session-vec-${i}`
        circuitBreakerService.recordError(sessionId, `problem-${i}`, 'vector_component', 1, 'grading')
        circuitBreakerService.recordError(sessionId, `problem-${i}`, 'vector_component', 2, 'grading')
        circuitBreakerService.recordError(sessionId, `problem-${i}`, 'vector_component', 3, 'grading')

        const drills = getDrillsForTag('vector_component')
        circuitBreakerService.startDrill(sessionId, `problem-${i}`, drills[0])
        circuitBreakerService.completeDrill(sessionId, `problem-${i}`, true)
      }

      // One intervention for sign_convention
      circuitBreakerService.recordError('session-sign', 'problem-sign', 'sign_convention', 1, 'grading')
      circuitBreakerService.recordError('session-sign', 'problem-sign', 'sign_convention', 2, 'grading')
      circuitBreakerService.recordError('session-sign', 'problem-sign', 'sign_convention', 3, 'grading')

      const signDrills = getDrillsForTag('sign_convention')
      circuitBreakerService.startDrill('session-sign', 'problem-sign', signDrills[0])
      circuitBreakerService.completeDrill('session-sign', 'problem-sign', true)

      const stats = circuitBreakerService.getStatistics()

      expect(stats.mostCommonTag).toBe('vector_component')
    })
  })

  describe('Configuration', () => {
    it('should allow custom thresholds', () => {
      circuitBreakerService.setThresholds([
        { errorTag: 'vector_component', warningCount: 1, tripCount: 2, cooldownMinutes: 10 }
      ])

      // Should trip at 2 now instead of 3
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'vector_component',
        2,
        'grading'
      )

      expect(evaluation.state).toBe('TRIPPED')
      expect(evaluation.shouldIntervene).toBe(true)
    })

    it('should reset to default thresholds', () => {
      circuitBreakerService.setThresholds([
        { errorTag: 'vector_component', warningCount: 1, tripCount: 2, cooldownMinutes: 10 }
      ])

      circuitBreakerService.resetThresholds()

      // Should use default tripCount: 3 again
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 2, 'grading')
      const evaluation = circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'vector_component',
        3,
        'grading'
      )

      expect(evaluation.state).toBe('TRIPPED')
    })
  })

  describe('Drill Selection', () => {
    it('should select a drill for error tag', () => {
      const drill = circuitBreakerService.selectDrill('vector_component')

      expect(drill).not.toBeNull()
      expect(drill?.linkedErrorTag).toBe('vector_component')
    })

    it('should get drill by ID', () => {
      const drills = getDrillsForTag('vector_component')
      const drillId = drills[0].id

      const drill = circuitBreakerService.getDrillById(drillId)

      expect(drill).not.toBeNull()
      expect(drill?.id).toBe(drillId)
    })

    it('should return null for unknown drill ID', () => {
      const drill = circuitBreakerService.getDrillById('non-existent-drill')
      expect(drill).toBeNull()
    })
  })

  describe('localStorage Persistence', () => {
    it('should persist session data', () => {
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')

      const stored = localStorage.getItem('physiscaffold_circuit_breaker')
      expect(stored).toBeTruthy()

      const data = JSON.parse(stored!)
      expect(data.sessions).toHaveLength(1)
      expect(data.sessions[0].sessionId).toBe(SESSION_ID)
    })

    it('should clear all sessions', () => {
      circuitBreakerService.recordError(SESSION_ID, PROBLEM_ID, 'vector_component', 1, 'grading')

      circuitBreakerService.clearAllSessions()

      const stored = localStorage.getItem('physiscaffold_circuit_breaker')
      expect(stored).toBeNull()
    })
  })
})

describe('DrillBank', () => {
  describe('getDrillsForTag', () => {
    it('should return drills for each error tag', () => {
      const errorTags: ErrorTag[] = [
        'vector_component',
        'sign_convention',
        'trig_identity',
        'unit_conversion',
        'algebra_manipulation',
        'conservation_scope',
        'reference_frame',
        'force_enumeration',
      ]

      for (const tag of errorTags) {
        const drills = getDrillsForTag(tag)
        expect(drills.length).toBeGreaterThan(0)

        // Verify all drills match the tag
        for (const drill of drills) {
          expect(drill.linkedErrorTag).toBe(tag)
        }
      }
    })

    it('should return drills with valid task structure', () => {
      const drills = getDrillsForTag('vector_component')

      for (const drill of drills) {
        expect(drill.id).toBeTruthy()
        expect(drill.task).toBeDefined()
        expect(drill.task.question).toBeTruthy()
        expect(drill.task.explanation).toBeTruthy()
        expect(drill.expectedDurationSeconds).toBe(10)
        expect(drill.maxAttempts).toBe(2)
        expect(['foundation', 'reinforcement']).toContain(drill.difficulty)
      }
    })

    it('should have correct task types', () => {
      const drills = getDrillsForTag('sign_convention')

      for (const drill of drills) {
        expect(['MULTIPLE_CHOICE', 'FILL_BLANK']).toContain(drill.task.type)

        if (drill.task.type === 'MULTIPLE_CHOICE') {
          expect(drill.task.options.length).toBeGreaterThanOrEqual(2)
          expect(drill.task.correctIndex).toBeDefined()
        }

        if (drill.task.type === 'FILL_BLANK') {
          expect(drill.task.sentence).toContain('____')
          expect(drill.task.correctTerm).toBeTruthy()
          expect(drill.task.distractors.length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('getDrillById', () => {
    it('should find drill by ID', () => {
      const drill = getDrillById('drill_vec_001')

      expect(drill).not.toBeNull()
      expect(drill?.id).toBe('drill_vec_001')
      expect(drill?.linkedErrorTag).toBe('vector_component')
    })

    it('should return null for non-existent ID', () => {
      const drill = getDrillById('non_existent_drill')
      expect(drill).toBeNull()
    })
  })
})
