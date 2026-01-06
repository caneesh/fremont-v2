'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  interviewService,
  type InterviewSession,
  type ExplanationSubmission,
  type RubricResult,
  type Grade,
  updateTimerState,
} from '@/lib/interview';
import type { InterviewModeConfig } from './useInterviewMode';

// =============================================================================
// TYPES
// =============================================================================

export interface InterviewSessionState {
  session: InterviewSession | null;
  isLoading: boolean;
  error: string | null;
}

export interface InterviewResults {
  rubricResult: RubricResult;
  grade: Grade;
  summary: {
    totalSteps: number;
    stepsCompleted: number;
    correctOnFirstTry: number;
    totalHintsUsed: number;
    totalTimeSeconds: number;
  };
}

export interface UseInterviewSessionReturn {
  // State
  session: InterviewSession | null;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  results: InterviewResults | null;

  // Timer
  remainingSeconds: number;
  isExpired: boolean;

  // Actions
  start: (questionId: string, totalSteps: number) => Promise<void>;
  submitAnswer: (
    stepId: string,
    answer: string | number | string[],
    isCorrect: boolean,
    explanation?: Partial<ExplanationSubmission>
  ) => Promise<{ sessionCompleted: boolean }>;
  abandon: (reason?: string) => Promise<void>;
  clearResults: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useInterviewSession(
  config: InterviewModeConfig,
  userId: string = 'anonymous'
): UseInterviewSessionReturn {
  const [state, setState] = useState<InterviewSessionState>({
    session: null,
    isLoading: false,
    error: null,
  });
  const [results, setResults] = useState<InterviewResults | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer effect - update every second when session is active
  useEffect(() => {
    if (!state.session || state.session.status !== 'in_progress') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const updateTimer = () => {
      if (!state.session) return;

      const updated = updateTimerState(state.session);
      setRemainingSeconds(updated.timerState.remainingSeconds);
      setIsExpired(updated.timerState.isExpired);

      // If expired, update session state
      if (updated.timerState.isExpired && state.session.status === 'in_progress') {
        setState((prev) => ({
          ...prev,
          session: updated,
        }));

        // Fetch results for timed out session
        fetchResults(state.session.id);
      }
    };

    // Initial update
    updateTimer();

    // Start interval
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [state.session?.id, state.session?.status]);

  // Fetch results helper
  const fetchResults = useCallback(async (sessionId: string) => {
    try {
      const resultData = await interviewService.getSessionResults({ sessionId });
      if (resultData.rubricResult && resultData.grade) {
        setResults({
          rubricResult: resultData.rubricResult,
          grade: resultData.grade,
          summary: resultData.summary,
        });
      }
    } catch (err) {
      console.error('[useInterviewSession] Failed to fetch results:', err);
    }
  }, []);

  // Start a new interview session
  const start = useCallback(
    async (questionId: string, totalSteps: number) => {
      if (!config.enabled) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      setResults(null);

      try {
        const { session } = await interviewService.startInterview({
          userId,
          questionId,
          totalSteps,
          config: {
            timerEnabled: config.timerEnabled,
            timeLimitSeconds: config.timeLimitMinutes * 60,
            hintsHidden: config.hintsHidden,
            explanationsRequired: config.explanationsRequired,
            rubricScoringEnabled: true,
          },
        });

        setState({
          session,
          isLoading: false,
          error: null,
        });

        setRemainingSeconds(session.timerState.remainingSeconds);
        setIsExpired(false);
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to start interview',
        }));
      }
    },
    [config, userId]
  );

  // Submit an answer
  const submitAnswer = useCallback(
    async (
      stepId: string,
      answer: string | number | string[],
      isCorrect: boolean,
      explanation?: Partial<ExplanationSubmission>
    ): Promise<{ sessionCompleted: boolean }> => {
      if (!state.session) {
        return { sessionCompleted: false };
      }

      try {
        const result = await interviewService.submitStepAnswer(
          {
            sessionId: state.session.id,
            stepId,
            answer,
            explanation: explanation
              ? {
                  approach: explanation.approach || undefined,
                  invariant: explanation.invariant || undefined,
                  complexity: explanation.complexity || undefined,
                }
              : undefined,
          },
          // Provide custom validator that uses the passed isCorrect value
          async () => isCorrect
        );

        setState((prev) => ({
          ...prev,
          session: result.session,
        }));

        // If session completed, set results
        if (result.sessionCompleted && result.rubricResult && result.grade) {
          setResults({
            rubricResult: result.rubricResult,
            grade: result.grade,
            summary: {
              totalSteps: result.session.totalSteps,
              stepsCompleted: result.session.currentStepIndex + 1,
              correctOnFirstTry: result.session.stepAttempts.filter(
                (a, i, arr) =>
                  a.isCorrect && arr.findIndex((x) => x.stepId === a.stepId) === i
              ).length,
              totalHintsUsed: result.session.stepAttempts.reduce(
                (sum, a) => sum + a.hintsRequested,
                0
              ),
              totalTimeSeconds: result.session.timerState.elapsedSeconds,
            },
          });
        }

        return { sessionCompleted: result.sessionCompleted };
      } catch (err) {
        console.error('[useInterviewSession] Submit failed:', err);
        return { sessionCompleted: false };
      }
    },
    [state.session]
  );

  // Abandon session
  const abandon = useCallback(
    async (reason: string = 'User abandoned') => {
      if (!state.session) return;

      try {
        const { session } = await interviewService.abandonSession({
          sessionId: state.session.id,
          reason,
        });

        setState((prev) => ({
          ...prev,
          session,
        }));
      } catch (err) {
        console.error('[useInterviewSession] Abandon failed:', err);
      }
    },
    [state.session]
  );

  // Clear results
  const clearResults = useCallback(() => {
    setResults(null);
    setState({
      session: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    session: state.session,
    isActive: state.session?.status === 'in_progress',
    isLoading: state.isLoading,
    error: state.error,
    results,
    remainingSeconds,
    isExpired,
    start,
    submitAnswer,
    abandon,
    clearResults,
  };
}
