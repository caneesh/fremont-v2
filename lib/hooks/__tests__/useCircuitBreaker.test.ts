import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useCircuitBreaker } from '../useCircuitBreaker'
import { circuitBreakerService } from '../../circuitBreakerService'
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

describe('useCircuitBreaker', () => {
  const SESSION_ID = 'test-session-123'
  const PROBLEM_ID = 'problem-001'

  describe('Initialization', () => {
    it('should initialize with MONITORING state', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      expect(result.current.state).toBe('MONITORING')
      expect(result.current.isProblemLocked).toBe(false)
      expect(result.current.currentDrill).toBeNull()
      expect(result.current.warningMessage).toBeNull()
      expect(result.current.warningTag).toBeNull()
    })

    it('should create a session on mount', () => {
      renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      const session = circuitBreakerService.getSession(SESSION_ID, PROBLEM_ID)
      expect(session).not.toBeNull()
      expect(session?.state).toBe('MONITORING')
    })

    it('should restore existing session state', () => {
      // Pre-create a session with some errors
      circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'vector_component',
        1,
        'grading'
      )
      circuitBreakerService.recordError(
        SESSION_ID,
        PROBLEM_ID,
        'vector_component',
        2,
        'grading'
      )

      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      // Should be in WARNING state (2 errors for vector_component)
      expect(result.current.state).toBe('WARNING')
    })
  })

  describe('recordError', () => {
    it('should record an error and return evaluation', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      let evaluation: ReturnType<typeof result.current.recordError>

      act(() => {
        evaluation = result.current.recordError('vector_component', 1, 'grading', 'Test context')
      })

      expect(evaluation!.state).toBe('MONITORING')
      expect(evaluation!.shouldIntervene).toBe(false)
    })

    it('should transition to WARNING state at threshold', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
      })

      act(() => {
        result.current.recordError('vector_component', 2, 'grading')
      })

      expect(result.current.state).toBe('WARNING')
      expect(result.current.warningMessage).toBeTruthy()
      expect(result.current.warningTag).toBe('vector_component')
    })

    it('should transition to TRIPPED state and suggest drill', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
        result.current.recordError('vector_component', 3, 'grading')
      })

      expect(result.current.state).toBe('TRIPPED')
      expect(result.current.isProblemLocked).toBe(true)
      expect(result.current.currentDrill).not.toBeNull()
      expect(result.current.currentDrill?.linkedErrorTag).toBe('vector_component')
    })

    it('should call onWarning callback when entering WARNING state', () => {
      const onWarning = vi.fn()

      const { result } = renderHook(() =>
        useCircuitBreaker({
          sessionId: SESSION_ID,
          problemId: PROBLEM_ID,
          onWarning,
        })
      )

      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
      })

      expect(onWarning).toHaveBeenCalledWith(
        expect.any(String),
        'vector_component'
      )
    })
  })

  describe('recordGradingErrors', () => {
    it('should map grading error types to ErrorTags', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      const errors = [
        { type: 'sign', description: 'Sign error in velocity' },
        { type: 'algebra', description: 'Algebra mistake' },
      ]

      act(() => {
        result.current.recordGradingErrors(errors, 1)
      })

      const summary = result.current.getErrorSummary()
      expect(summary).toHaveLength(2)
      expect(summary.find(s => s.tag === 'sign_convention')).toBeDefined()
      expect(summary.find(s => s.tag === 'algebra_manipulation')).toBeDefined()
    })

    it('should return null for empty errors', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      let evaluation: ReturnType<typeof result.current.recordGradingErrors>

      act(() => {
        evaluation = result.current.recordGradingErrors([], 1)
      })

      expect(evaluation).toBeNull()
    })

    it('should stop processing when intervention is triggered', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      // Pre-load errors to be close to threshold
      act(() => {
        result.current.recordError('sign_convention', 1, 'grading')
        result.current.recordError('sign_convention', 2, 'grading')
      })

      // This should trigger intervention on first error
      const errors = [
        { type: 'sign', description: 'Third sign error - should trip' },
        { type: 'algebra', description: 'This should not be recorded' },
      ]

      act(() => {
        result.current.recordGradingErrors(errors, 3)
      })

      expect(result.current.state).toBe('TRIPPED')

      // Algebra error should not be recorded because we stopped at trip
      const summary = result.current.getErrorSummary()
      const algebraCount = summary.find(s => s.tag === 'algebra_manipulation')
      expect(algebraCount).toBeUndefined()
    })

    it('should handle unit conversion errors', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordGradingErrors(
          [{ type: 'units', description: 'Unit mismatch' }],
          1
        )
      })

      const summary = result.current.getErrorSummary()
      expect(summary.find(s => s.tag === 'unit_conversion')).toBeDefined()
    })

    it('should map concept errors to conservation_scope', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordGradingErrors(
          [{ type: 'concept', description: 'Wrong physics principle' }],
          1
        )
      })

      const summary = result.current.getErrorSummary()
      expect(summary.find(s => s.tag === 'conservation_scope')).toBeDefined()
    })
  })

  describe('Drill Lifecycle', () => {
    it('should start drill when in TRIPPED state', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      // Trip the circuit breaker
      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
        result.current.recordError('vector_component', 3, 'grading')
      })

      expect(result.current.currentDrill).not.toBeNull()

      let started: boolean

      act(() => {
        started = result.current.startDrill()
      })

      expect(started!).toBe(true)
      expect(result.current.state).toBe('DRILLING')
    })

    it('should not start drill when not in TRIPPED state', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      let started: boolean

      act(() => {
        started = result.current.startDrill()
      })

      expect(started!).toBe(false)
      expect(result.current.state).toBe('MONITORING')
    })

    it('should complete drill successfully', async () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      // Trip and start drill
      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
        result.current.recordError('vector_component', 3, 'grading')
      })

      act(() => {
        result.current.startDrill()
      })

      act(() => {
        result.current.completeDrill(true)
      })

      expect(result.current.state).toBe('MONITORING')
      expect(result.current.currentDrill).toBeNull()
      expect(result.current.isProblemLocked).toBe(false)
    })

    it('should complete drill with failure', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      // Trip and start drill
      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
        result.current.recordError('vector_component', 3, 'grading')
      })

      act(() => {
        result.current.startDrill()
      })

      act(() => {
        result.current.completeDrill(false)
      })

      expect(result.current.state).toBe('MONITORING')
      expect(result.current.currentDrill).toBeNull()
    })

    it('should skip drill', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      // Trip and start drill
      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
        result.current.recordError('vector_component', 3, 'grading')
      })

      act(() => {
        result.current.startDrill()
      })

      act(() => {
        result.current.skipDrill()
      })

      expect(result.current.state).toBe('MONITORING')
      expect(result.current.currentDrill).toBeNull()
      expect(result.current.warningMessage).toBeNull()
    })

    it('should reset error count after drill completion', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      // Trip and complete drill
      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
        result.current.recordError('vector_component', 3, 'grading')
      })

      act(() => {
        result.current.startDrill()
        result.current.completeDrill(true)
      })

      const summary = result.current.getErrorSummary()
      const vectorCount = summary.find(s => s.tag === 'vector_component')

      expect(vectorCount?.count).toBe(0)
    })
  })

  describe('Warning Management', () => {
    it('should set warning message in WARNING state', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
      })

      expect(result.current.warningMessage).toBeTruthy()
      expect(result.current.warningMessage).toContain('Vector Components')
    })

    it('should dismiss warning', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
      })

      expect(result.current.warningMessage).toBeTruthy()

      act(() => {
        result.current.dismissWarning()
      })

      expect(result.current.warningMessage).toBeNull()
      expect(result.current.warningTag).toBeNull()
    })

    it('should clear warning after drill completion', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      // Get to WARNING, then TRIPPED
      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
      })

      expect(result.current.warningMessage).toBeTruthy()

      act(() => {
        result.current.recordError('vector_component', 3, 'grading')
      })

      act(() => {
        result.current.startDrill()
        result.current.completeDrill(true)
      })

      expect(result.current.warningMessage).toBeNull()
    })
  })

  describe('Error Summary', () => {
    it('should return error summary with counts and labels', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
        result.current.recordError('sign_convention', 1, 'task_incorrect')
      })

      const summary = result.current.getErrorSummary()

      expect(summary).toHaveLength(2)

      const vectorSummary = summary.find(s => s.tag === 'vector_component')
      expect(vectorSummary?.count).toBe(2)
      expect(vectorSummary?.label).toBe('Vector Components')

      const signSummary = summary.find(s => s.tag === 'sign_convention')
      expect(signSummary?.count).toBe(1)
      expect(signSummary?.label).toBe('Sign Convention')
    })

    it('should return empty array for new session', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      const summary = result.current.getErrorSummary()
      expect(summary).toHaveLength(0)
    })
  })

  describe('isProblemLocked', () => {
    it('should be false in MONITORING state', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      expect(result.current.isProblemLocked).toBe(false)
    })

    it('should be false in WARNING state', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
      })

      expect(result.current.state).toBe('WARNING')
      expect(result.current.isProblemLocked).toBe(false)
    })

    it('should be true in TRIPPED state', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
        result.current.recordError('vector_component', 3, 'grading')
      })

      expect(result.current.state).toBe('TRIPPED')
      expect(result.current.isProblemLocked).toBe(true)
    })

    it('should be true in DRILLING state', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordError('vector_component', 1, 'grading')
        result.current.recordError('vector_component', 2, 'grading')
        result.current.recordError('vector_component', 3, 'grading')
      })

      act(() => {
        result.current.startDrill()
      })

      expect(result.current.state).toBe('DRILLING')
      expect(result.current.isProblemLocked).toBe(true)
    })
  })

  describe('Different Error Sources', () => {
    it('should handle grading source errors', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordError('algebra_manipulation', 1, 'grading')
      })

      const summary = result.current.getErrorSummary()
      expect(summary.find(s => s.tag === 'algebra_manipulation')?.count).toBe(1)
    })

    it('should handle task_incorrect source errors', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordError('trig_identity', 1, 'task_incorrect')
      })

      const summary = result.current.getErrorSummary()
      expect(summary.find(s => s.tag === 'trig_identity')?.count).toBe(1)
    })

    it('should handle constraint_collision source errors', () => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordError('force_enumeration', 1, 'constraint_collision')
      })

      const summary = result.current.getErrorSummary()
      expect(summary.find(s => s.tag === 'force_enumeration')?.count).toBe(1)
    })
  })

  describe('Multiple Sessions', () => {
    it('should maintain separate state for different sessions', () => {
      const { result: result1 } = renderHook(() =>
        useCircuitBreaker({ sessionId: 'session-1', problemId: 'problem-1' })
      )

      const { result: result2 } = renderHook(() =>
        useCircuitBreaker({ sessionId: 'session-2', problemId: 'problem-2' })
      )

      act(() => {
        result1.current.recordError('vector_component', 1, 'grading')
        result1.current.recordError('vector_component', 2, 'grading')
      })

      expect(result1.current.state).toBe('WARNING')
      expect(result2.current.state).toBe('MONITORING')
    })

    it('should maintain separate state for same session, different problems', () => {
      const { result: result1 } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: 'problem-1' })
      )

      const { result: result2 } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: 'problem-2' })
      )

      act(() => {
        result1.current.recordError('vector_component', 1, 'grading')
        result1.current.recordError('vector_component', 2, 'grading')
        result1.current.recordError('vector_component', 3, 'grading')
      })

      expect(result1.current.state).toBe('TRIPPED')
      expect(result2.current.state).toBe('MONITORING')
    })
  })

  describe('All Error Tags', () => {
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

    it.each(errorTags)('should handle %s error tag', (errorTag) => {
      const { result } = renderHook(() =>
        useCircuitBreaker({ sessionId: SESSION_ID, problemId: PROBLEM_ID })
      )

      act(() => {
        result.current.recordError(errorTag, 1, 'grading')
      })

      const summary = result.current.getErrorSummary()
      expect(summary.find(s => s.tag === errorTag)).toBeDefined()
      expect(summary.find(s => s.tag === errorTag)?.count).toBe(1)
    })
  })
})
