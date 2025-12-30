/**
 * useCircuitBreaker Hook
 *
 * React hook for integrating the Circuit Breaker pattern into components.
 * Provides state management and callbacks for error tracking and drill interventions.
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { circuitBreakerService } from '@/lib/circuitBreakerService'
import { getDrillById } from '@/lib/drillBank'
import type {
  ErrorTag,
  CircuitBreakerState,
  ThresholdEvaluation,
  DrillTask,
} from '@/types/circuitBreaker'

// Map grading error types to ErrorTags
const GRADE_ERROR_TO_TAG: Record<string, ErrorTag> = {
  sign: 'sign_convention',
  algebra: 'algebra_manipulation',
  units: 'unit_conversion',
  concept: 'conservation_scope', // Default for conceptual errors
  approach: 'conservation_scope',
}

interface UseCircuitBreakerOptions {
  sessionId: string
  problemId: string
  onWarning?: (message: string, tag: ErrorTag) => void
}

interface UseCircuitBreakerReturn {
  // State
  state: CircuitBreakerState
  isProblemLocked: boolean
  currentDrill: DrillTask | null
  warningMessage: string | null
  warningTag: ErrorTag | null

  // Actions
  recordError: (
    errorTag: ErrorTag,
    stepId: number,
    source: 'grading' | 'task_incorrect' | 'constraint_collision',
    context?: string
  ) => ThresholdEvaluation

  recordGradingErrors: (
    errors: Array<{ type: string; description: string }>,
    stepId: number
  ) => ThresholdEvaluation | null

  startDrill: () => boolean
  completeDrill: (success: boolean) => void
  skipDrill: () => void
  dismissWarning: () => void

  // Query
  getErrorSummary: () => { tag: ErrorTag; count: number; label: string }[]
}

export function useCircuitBreaker({
  sessionId,
  problemId,
  onWarning,
}: UseCircuitBreakerOptions): UseCircuitBreakerReturn {
  const [state, setState] = useState<CircuitBreakerState>('MONITORING')
  const [currentDrill, setCurrentDrill] = useState<DrillTask | null>(null)
  const [warningMessage, setWarningMessage] = useState<string | null>(null)
  const [warningTag, setWarningTag] = useState<ErrorTag | null>(null)

  // Initialize session on mount
  useEffect(() => {
    circuitBreakerService.getOrCreateSession(sessionId, problemId)
    const currentState = circuitBreakerService.getCurrentState(sessionId, problemId)
    setState(currentState)

    // If there's an active intervention, restore the drill
    const session = circuitBreakerService.getSession(sessionId, problemId)
    if (session?.currentIntervention) {
      const drill = getDrillById(session.currentIntervention.drillId)
      if (drill) {
        setCurrentDrill(drill)
      }
    }
  }, [sessionId, problemId])

  // Record an error and handle state transitions
  const recordError = useCallback(
    (
      errorTag: ErrorTag,
      stepId: number,
      source: 'grading' | 'task_incorrect' | 'constraint_collision',
      context?: string
    ): ThresholdEvaluation => {
      const evaluation = circuitBreakerService.recordError(
        sessionId,
        problemId,
        errorTag,
        stepId,
        source,
        context
      )

      setState(evaluation.state)

      if (evaluation.state === 'WARNING' && evaluation.message) {
        setWarningMessage(evaluation.message)
        setWarningTag(evaluation.triggeringTag || null)
        onWarning?.(evaluation.message, evaluation.triggeringTag!)
      }

      if (evaluation.state === 'TRIPPED' && evaluation.suggestedDrillId) {
        const drill = getDrillById(evaluation.suggestedDrillId)
        if (drill) {
          setCurrentDrill(drill)
        }
      }

      return evaluation
    },
    [sessionId, problemId, onWarning]
  )

  // Record errors from grading response
  const recordGradingErrors = useCallback(
    (
      errors: Array<{ type: string; description: string }>,
      stepId: number
    ): ThresholdEvaluation | null => {
      if (!errors || errors.length === 0) return null

      let lastEvaluation: ThresholdEvaluation | null = null

      for (const error of errors) {
        const errorTag = GRADE_ERROR_TO_TAG[error.type]
        if (errorTag) {
          lastEvaluation = recordError(
            errorTag,
            stepId,
            'grading',
            error.description
          )

          // If we tripped, stop processing more errors
          if (lastEvaluation.shouldIntervene) {
            break
          }
        }
      }

      return lastEvaluation
    },
    [recordError]
  )

  // Start the drill intervention
  const startDrill = useCallback((): boolean => {
    if (!currentDrill) return false

    const started = circuitBreakerService.startDrill(sessionId, problemId, currentDrill)
    if (started) {
      setState('DRILLING')
    }
    return started
  }, [sessionId, problemId, currentDrill])

  // Complete the drill
  const completeDrill = useCallback(
    (success: boolean) => {
      const session = circuitBreakerService.completeDrill(sessionId, problemId, success)
      if (session) {
        setState('MONITORING') // Will transition through RECOVERED automatically
        setCurrentDrill(null)
        setWarningMessage(null)
        setWarningTag(null)
      }
    },
    [sessionId, problemId]
  )

  // Skip the drill
  const skipDrill = useCallback(() => {
    circuitBreakerService.skipDrill(sessionId, problemId)
    setState('MONITORING')
    setCurrentDrill(null)
    setWarningMessage(null)
    setWarningTag(null)
  }, [sessionId, problemId])

  // Dismiss warning
  const dismissWarning = useCallback(() => {
    setWarningMessage(null)
    setWarningTag(null)
  }, [])

  // Get error summary
  const getErrorSummary = useCallback(() => {
    return circuitBreakerService.getErrorSummary(sessionId, problemId)
  }, [sessionId, problemId])

  // Derived state
  const isProblemLocked = useMemo(
    () => state === 'TRIPPED' || state === 'DRILLING',
    [state]
  )

  return {
    state,
    isProblemLocked,
    currentDrill,
    warningMessage,
    warningTag,
    recordError,
    recordGradingErrors,
    startDrill,
    completeDrill,
    skipDrill,
    dismissWarning,
    getErrorSummary,
  }
}
