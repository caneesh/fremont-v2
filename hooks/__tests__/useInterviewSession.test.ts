import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useInterviewSession } from '../useInterviewSession'
import { interviewService } from '@/lib/interview'
import type { InterviewModeConfig } from '../useInterviewMode'
import type { InterviewSession, TimerState, RubricResult } from '@/lib/interview'

// Mock the interview service
vi.mock('@/lib/interview', () => ({
  interviewService: {
    startInterview: vi.fn(),
    submitStepAnswer: vi.fn(),
    getTimerState: vi.fn(),
    abandonSession: vi.fn(),
    getSessionResults: vi.fn(),
  },
  updateTimerState: vi.fn((session: InterviewSession) => ({
    ...session,
    timerState: {
      ...session.timerState,
      elapsedSeconds: session.timerState.elapsedSeconds + 1,
      remainingSeconds: Math.max(0, session.timerState.remainingSeconds - 1),
      isExpired: session.timerState.remainingSeconds <= 1,
    },
  })),
}))

// Helper to create mock session
function createMockSession(overrides: Partial<InterviewSession> = {}): InterviewSession {
  return {
    id: 'test-session-123',
    userId: 'test-user',
    questionId: 'q1',
    status: 'in_progress',
    config: {
      timerEnabled: true,
      timeLimitSeconds: 1800,
      hintsHidden: true,
      explanationsRequired: true,
      rubricScoringEnabled: true,
    },
    timerState: {
      startTime: Date.now(),
      elapsedSeconds: 0,
      remainingSeconds: 1800,
      isExpired: false,
    },
    currentStepIndex: 0,
    totalSteps: 3,
    stepAttempts: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

// Helper to create mock config
function createMockConfig(overrides: Partial<InterviewModeConfig> = {}): InterviewModeConfig {
  return {
    enabled: true,
    timerEnabled: true,
    timeLimitMinutes: 30,
    hintsHidden: true,
    explanationsRequired: true,
    ...overrides,
  }
}

// Helper to create mock rubric result
function createMockRubricResult(): RubricResult {
  return {
    totalScore: 85,
    maxScore: 100,
    percentage: 85,
    dimensions: [
      {
        name: 'Correctness',
        score: 90,
        maxScore: 100,
        weight: 0.3,
        criteria: [],
      },
    ],
  }
}

describe('useInterviewSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('should initialize with null session', () => {
      const config = createMockConfig({ enabled: false })
      const { result } = renderHook(() => useInterviewSession(config))

      expect(result.current.session).toBeNull()
      expect(result.current.isActive).toBe(false)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.results).toBeNull()
    })

    it('should initialize timer state to zero', () => {
      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      expect(result.current.remainingSeconds).toBe(0)
      expect(result.current.isExpired).toBe(false)
    })
  })

  describe('start', () => {
    it('should start a new interview session', async () => {
      const mockSession = createMockSession()
      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      expect(interviewService.startInterview).toHaveBeenCalledWith({
        userId: 'anonymous',
        questionId: 'q1',
        totalSteps: 3,
        config: {
          timerEnabled: true,
          timeLimitSeconds: 1800,
          hintsHidden: true,
          explanationsRequired: true,
          rubricScoringEnabled: true,
        },
      })

      expect(result.current.session).toEqual(mockSession)
      expect(result.current.isActive).toBe(true)
      // Timer may have already ticked once due to immediate effect
      expect(result.current.remainingSeconds).toBeGreaterThanOrEqual(1799)
      expect(result.current.remainingSeconds).toBeLessThanOrEqual(1800)
    })

    it('should not start if interview mode is disabled', async () => {
      const config = createMockConfig({ enabled: false })
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      expect(interviewService.startInterview).not.toHaveBeenCalled()
      expect(result.current.session).toBeNull()
    })

    it('should set loading state while starting', async () => {
      const mockSession = createMockSession()
      vi.mocked(interviewService.startInterview).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ session: mockSession }), 100))
      )

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      let startPromise: Promise<void>
      act(() => {
        startPromise = result.current.start('q1', 3)
      })

      expect(result.current.isLoading).toBe(true)

      await act(async () => {
        vi.advanceTimersByTime(100)
        await startPromise!
      })

      expect(result.current.isLoading).toBe(false)
    })

    it('should handle start errors', async () => {
      vi.mocked(interviewService.startInterview).mockRejectedValue(
        new Error('Failed to start')
      )

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      expect(result.current.error).toBe('Failed to start')
      expect(result.current.session).toBeNull()
      expect(result.current.isLoading).toBe(false)
    })

    it('should clear previous results when starting new session', async () => {
      const mockSession = createMockSession()
      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      // Start and complete a session first
      await act(async () => {
        await result.current.start('q1', 3)
      })

      // Start a new session
      await act(async () => {
        await result.current.start('q2', 5)
      })

      expect(result.current.results).toBeNull()
    })

    it('should use custom userId', async () => {
      const mockSession = createMockSession({ userId: 'custom-user' })
      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config, 'custom-user'))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      expect(interviewService.startInterview).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'custom-user' })
      )
    })
  })

  describe('submitAnswer', () => {
    it('should submit an answer and update session', async () => {
      const mockSession = createMockSession()
      const updatedSession = createMockSession({ currentStepIndex: 1 })

      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })
      vi.mocked(interviewService.submitStepAnswer).mockResolvedValue({
        session: updatedSession,
        stepResult: { isCorrect: true, attemptNumber: 1, hintsRequested: 0 },
        sessionCompleted: false,
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      await act(async () => {
        const submitResult = await result.current.submitAnswer('step_0', 'F=ma', true)
        expect(submitResult.sessionCompleted).toBe(false)
      })

      expect(result.current.session?.currentStepIndex).toBe(1)
    })

    it('should return false for sessionCompleted if no session', async () => {
      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      const submitResult = await result.current.submitAnswer('step_0', 'answer', true)

      expect(submitResult.sessionCompleted).toBe(false)
      expect(interviewService.submitStepAnswer).not.toHaveBeenCalled()
    })

    it('should pass explanation data when provided', async () => {
      const mockSession = createMockSession()
      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })
      vi.mocked(interviewService.submitStepAnswer).mockResolvedValue({
        session: mockSession,
        stepResult: { isCorrect: true, attemptNumber: 1, hintsRequested: 0 },
        sessionCompleted: false,
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      const explanation = {
        approach: 'Used Newton\'s second law',
        invariant: 'Conservation of momentum',
      }

      await act(async () => {
        await result.current.submitAnswer('step_0', 'F=ma', true, explanation)
      })

      expect(interviewService.submitStepAnswer).toHaveBeenCalledWith(
        expect.objectContaining({
          explanation: {
            approach: 'Used Newton\'s second law',
            invariant: 'Conservation of momentum',
            complexity: undefined,
          },
        }),
        expect.any(Function)
      )
    })

    it('should set results when session completes', async () => {
      const mockSession = createMockSession()
      const completedSession = createMockSession({
        status: 'completed',
        currentStepIndex: 2,
        stepAttempts: [
          { stepId: 'step_0', isCorrect: true, attemptNumber: 1, hintsRequested: 0, timestamp: Date.now() },
          { stepId: 'step_1', isCorrect: true, attemptNumber: 1, hintsRequested: 0, timestamp: Date.now() },
          { stepId: 'step_2', isCorrect: true, attemptNumber: 1, hintsRequested: 0, timestamp: Date.now() },
        ],
      })
      const mockRubric = createMockRubricResult()

      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })
      vi.mocked(interviewService.submitStepAnswer).mockResolvedValue({
        session: completedSession,
        stepResult: { isCorrect: true, attemptNumber: 1, hintsRequested: 0 },
        sessionCompleted: true,
        rubricResult: mockRubric,
        grade: 'B',
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      await act(async () => {
        await result.current.submitAnswer('step_2', 'answer', true)
      })

      expect(result.current.results).not.toBeNull()
      expect(result.current.results?.grade).toBe('B')
      expect(result.current.results?.rubricResult).toEqual(mockRubric)
    })
  })

  describe('abandon', () => {
    it('should abandon the session', async () => {
      const mockSession = createMockSession()
      const abandonedSession = createMockSession({ status: 'abandoned' })

      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })
      vi.mocked(interviewService.abandonSession).mockResolvedValue({
        session: abandonedSession,
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      await act(async () => {
        await result.current.abandon('User quit')
      })

      expect(interviewService.abandonSession).toHaveBeenCalledWith({
        sessionId: 'test-session-123',
        reason: 'User quit',
      })
      expect(result.current.session?.status).toBe('abandoned')
    })

    it('should use default reason if not provided', async () => {
      const mockSession = createMockSession()
      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })
      vi.mocked(interviewService.abandonSession).mockResolvedValue({
        session: createMockSession({ status: 'abandoned' }),
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      await act(async () => {
        await result.current.abandon()
      })

      expect(interviewService.abandonSession).toHaveBeenCalledWith({
        sessionId: 'test-session-123',
        reason: 'User abandoned',
      })
    })

    it('should do nothing if no session exists', async () => {
      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.abandon()
      })

      expect(interviewService.abandonSession).not.toHaveBeenCalled()
    })
  })

  describe('clearResults', () => {
    it('should clear results and session', async () => {
      const mockSession = createMockSession()
      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      expect(result.current.session).not.toBeNull()

      act(() => {
        result.current.clearResults()
      })

      expect(result.current.session).toBeNull()
      expect(result.current.results).toBeNull()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('Timer', () => {
    it('should update remaining seconds when session is active', async () => {
      const mockSession = createMockSession({
        timerState: {
          startTime: Date.now(),
          elapsedSeconds: 0,
          remainingSeconds: 1800,
          isExpired: false,
        },
      })

      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      // Timer may have already ticked once due to immediate effect
      expect(result.current.remainingSeconds).toBeGreaterThanOrEqual(1799)
      expect(result.current.remainingSeconds).toBeLessThanOrEqual(1800)
    })

    it('should stop timer when session is not in progress', async () => {
      const completedSession = createMockSession({ status: 'completed' })

      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: completedSession,
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      // Timer effect should not run for completed sessions
      expect(result.current.isActive).toBe(false)
    })
  })

  describe('isActive', () => {
    it('should be true when session status is in_progress', async () => {
      const mockSession = createMockSession({ status: 'in_progress' })
      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      expect(result.current.isActive).toBe(true)
    })

    it('should be false when session is completed', async () => {
      const mockSession = createMockSession({ status: 'completed' })
      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })

      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      await act(async () => {
        await result.current.start('q1', 3)
      })

      expect(result.current.isActive).toBe(false)
    })

    it('should be false when no session exists', () => {
      const config = createMockConfig()
      const { result } = renderHook(() => useInterviewSession(config))

      expect(result.current.isActive).toBe(false)
    })
  })

  describe('Config Changes', () => {
    it('should use updated config for new sessions', async () => {
      const mockSession = createMockSession()
      vi.mocked(interviewService.startInterview).mockResolvedValue({
        session: mockSession,
      })

      const { result, rerender } = renderHook(
        ({ config }) => useInterviewSession(config),
        { initialProps: { config: createMockConfig({ timeLimitMinutes: 30 }) } }
      )

      // Start with 30 minutes
      await act(async () => {
        await result.current.start('q1', 3)
      })

      expect(interviewService.startInterview).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ timeLimitSeconds: 1800 }),
        })
      )

      vi.clearAllMocks()

      // Update config to 45 minutes
      rerender({ config: createMockConfig({ timeLimitMinutes: 45 }) })

      await act(async () => {
        await result.current.start('q2', 3)
      })

      expect(interviewService.startInterview).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({ timeLimitSeconds: 2700 }),
        })
      )
    })
  })
})
