/**
 * useDebugRefactor Hook
 *
 * Manages debug/refactor mode state for problem solving.
 * Provides actions and state for the UI layer.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import {
  debugRefactorService,
  type DebugSession,
  type RefactorSession,
  type TestResult,
  DEBUG_STEP_ORDER,
  REFACTOR_STEP_ORDER,
} from '@/lib/debugRefactor'
import type {
  ProblemMode,
  DebugProblem,
  RefactorProblem,
  DebugStep,
  RefactorStep,
  ModeSubmissionResult,
  DebugHint,
} from '@/types/debugRefactorMode'
import {
  getDebugStepDescription,
  getRefactorStepDescription,
} from '@/lib/core/policies/debug-refactor-policy'

interface UseDebugRefactorOptions {
  sessionId: string
  mode: ProblemMode
  problem: DebugProblem | RefactorProblem
  enabled?: boolean
}

interface StepInfo {
  id: string
  title: string
  description: string
  isComplete: boolean
  isCurrent: boolean
}

interface UseDebugRefactorReturn {
  // State
  isEnabled: boolean
  isInitialized: boolean
  debugSession: DebugSession | null
  refactorSession: RefactorSession | null
  currentStep: DebugStep | RefactorStep | null
  progress: number
  isComplete: boolean
  remainingAttempts: number
  result: ModeSubmissionResult | null

  // Derived state
  steps: StepInfo[]
  canAdvance: boolean
  advanceReason: string | null
  availableHints: readonly DebugHint[]

  // Actions
  advance: (input?: {
    hypothesis?: string
    smells?: readonly string[]
    reflection?: string
  }) => void
  submitCode: (
    code: string,
    testResults: readonly TestResult[],
    extras?: { bugTags?: readonly string[]; styleGoals?: readonly string[] }
  ) => void
  useHint: () => void
  evaluate: () => ModeSubmissionResult | null
  reset: () => void
}

export function useDebugRefactor({
  sessionId,
  mode,
  problem,
  enabled = true,
}: UseDebugRefactorOptions): UseDebugRefactorReturn {
  const isEnabled = enabled && FEATURE_FLAGS.DEBUG_REFACTOR_MODE

  const [isInitialized, setIsInitialized] = useState(false)
  const [debugSession, setDebugSession] = useState<DebugSession | null>(null)
  const [refactorSession, setRefactorSession] = useState<RefactorSession | null>(null)
  const [result, setResult] = useState<ModeSubmissionResult | null>(null)

  // Initialize session
  useEffect(() => {
    if (!isEnabled) {
      setIsInitialized(true)
      return
    }

    if (mode === 'debug') {
      const session = debugRefactorService.startDebugSession(sessionId, problem.id)
      setDebugSession(session)
    } else {
      const session = debugRefactorService.startRefactorSession(sessionId, problem.id)
      setRefactorSession(session)
    }

    setIsInitialized(true)
  }, [isEnabled, sessionId, mode, problem.id])

  // Current step
  const currentStep = useMemo(() => {
    if (mode === 'debug') {
      return debugSession?.currentStep ?? null
    }
    return refactorSession?.currentStep ?? null
  }, [mode, debugSession, refactorSession])

  // Progress
  const progress = useMemo(() => {
    return debugRefactorService.getProgress(sessionId, mode)
  }, [sessionId, mode, debugSession, refactorSession])

  // Is complete
  const isComplete = useMemo(() => {
    return debugRefactorService.isComplete(sessionId, mode)
  }, [sessionId, mode, debugSession, refactorSession])

  // Remaining attempts
  const remainingAttempts = useMemo(() => {
    return debugRefactorService.getRemainingAttempts(sessionId, mode)
  }, [sessionId, mode, debugSession, refactorSession])

  // Steps info
  const steps = useMemo((): StepInfo[] => {
    if (mode === 'debug') {
      const completed = debugSession?.stepsCompleted ?? []
      const current = debugSession?.currentStep ?? 'understand'

      return DEBUG_STEP_ORDER.map((step) => ({
        id: step,
        title: step.charAt(0).toUpperCase() + step.slice(1),
        description: getDebugStepDescription(step),
        isComplete: completed.includes(step),
        isCurrent: step === current,
      }))
    } else {
      const completed = refactorSession?.stepsCompleted ?? []
      const current = refactorSession?.currentStep ?? 'read'

      return REFACTOR_STEP_ORDER.map((step) => ({
        id: step,
        title: step.charAt(0).toUpperCase() + step.slice(1),
        description: getRefactorStepDescription(step),
        isComplete: completed.includes(step),
        isCurrent: step === current,
      }))
    }
  }, [mode, debugSession, refactorSession])

  // Can advance check
  const canAdvanceCheck = useMemo(() => {
    return debugRefactorService.canAdvance(sessionId, mode)
  }, [sessionId, mode, debugSession, refactorSession])

  const canAdvance = canAdvanceCheck.canComplete
  const advanceReason = canAdvanceCheck.reason ?? null

  // Available hints (debug mode only)
  const availableHints = useMemo(() => {
    if (mode !== 'debug' || !debugSession) return []
    return debugRefactorService.getHints(sessionId, problem as DebugProblem)
  }, [mode, sessionId, debugSession, problem])

  // Advance to next step
  const advance = useCallback(
    (input?: {
      hypothesis?: string
      smells?: readonly string[]
      reflection?: string
    }) => {
      if (!isEnabled) return

      if (mode === 'debug') {
        const session = debugRefactorService.advanceDebug(sessionId, input)
        setDebugSession(session)
      } else {
        const session = debugRefactorService.advanceRefactor(sessionId, input)
        setRefactorSession(session)
      }
    },
    [isEnabled, sessionId, mode]
  )

  // Submit code
  const submitCode = useCallback(
    (
      _code: string,
      testResults: readonly TestResult[],
      extras?: { bugTags?: readonly string[]; styleGoals?: readonly string[] }
    ) => {
      if (!isEnabled) return

      if (mode === 'debug') {
        const session = debugRefactorService.submitDebugFix(
          sessionId,
          testResults,
          extras?.bugTags ?? []
        )
        setDebugSession(session)
      } else {
        const session = debugRefactorService.submitRefactor(
          sessionId,
          testResults,
          extras?.styleGoals ?? []
        )
        setRefactorSession(session)
      }
    },
    [isEnabled, sessionId, mode]
  )

  // Use hint
  const useHint = useCallback(() => {
    if (!isEnabled || mode !== 'debug') return

    const session = debugRefactorService.useDebugHint(sessionId)
    setDebugSession(session)
  }, [isEnabled, sessionId, mode])

  // Evaluate submission
  const evaluate = useCallback((): ModeSubmissionResult | null => {
    if (!isEnabled) return null

    let evalResult: ModeSubmissionResult | null = null

    if (mode === 'debug') {
      evalResult = debugRefactorService.evaluateDebug(
        sessionId,
        problem as DebugProblem
      )
    } else {
      evalResult = debugRefactorService.evaluateRefactor(
        sessionId,
        problem as RefactorProblem
      )
    }

    setResult(evalResult)
    return evalResult
  }, [isEnabled, sessionId, mode, problem])

  // Reset session
  const reset = useCallback(() => {
    debugRefactorService.clearSession(sessionId, mode)
    setDebugSession(null)
    setRefactorSession(null)
    setResult(null)

    // Re-initialize
    if (mode === 'debug') {
      const session = debugRefactorService.startDebugSession(sessionId, problem.id)
      setDebugSession(session)
    } else {
      const session = debugRefactorService.startRefactorSession(sessionId, problem.id)
      setRefactorSession(session)
    }
  }, [sessionId, mode, problem.id])

  return {
    isEnabled,
    isInitialized,
    debugSession,
    refactorSession,
    currentStep,
    progress,
    isComplete,
    remainingAttempts,
    result,
    steps,
    canAdvance,
    advanceReason,
    availableHints,
    advance,
    submitCode,
    useHint,
    evaluate,
    reset,
  }
}
