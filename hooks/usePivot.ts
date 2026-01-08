'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  PivotQuestion,
  PivotSessionState,
  PivotTrigger,
  PivotDecision,
} from '@/types/pivot'
import { pivotService } from '@/lib/pivot'

// =============================================================================
// TYPES
// =============================================================================

export interface UsePivotOptions {
  sessionId: string
  userId: string
  stepCount: number
  enabled?: boolean
}

export interface UsePivotReturn {
  // State
  isInitialized: boolean
  sessionState: PivotSessionState | null
  activePivot: PivotQuestion | null
  activeStepIndex: number | null

  // Actions
  checkTrigger: (trigger: PivotTrigger, stepDifficulty?: 'easy' | 'medium' | 'hard') => Promise<PivotDecision>
  showPivot: (stepIndex: number, timeSpentSeconds: number, patternId?: string) => Promise<void>
  answerPivot: (answer: string, wasHelpful: boolean) => Promise<{ timeBonus: number; explanation: string }>
  skipPivot: () => Promise<void>
  dismissPivot: () => void

  // Helpers
  hasActivePivot: boolean
  pivotsShownCount: number
}

// =============================================================================
// HOOK
// =============================================================================

export function usePivot({
  sessionId,
  userId,
  stepCount,
  enabled = true,
}: UsePivotOptions): UsePivotReturn {
  const [isInitialized, setIsInitialized] = useState(false)
  const [sessionState, setSessionState] = useState<PivotSessionState | null>(null)
  const [activePivot, setActivePivot] = useState<PivotQuestion | null>(null)
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null)

  const initRef = useRef(false)

  // Initialize session on mount
  useEffect(() => {
    if (!enabled || !sessionId || initRef.current) return

    initRef.current = true

    pivotService
      .initializeSession(sessionId, userId, stepCount)
      .then((state) => {
        setSessionState(state)
        setIsInitialized(true)
      })
      .catch((error) => {
        console.error('Failed to initialize pivot session:', error)
        setIsInitialized(true) // Still mark as initialized to prevent retries
      })
  }, [sessionId, userId, stepCount, enabled])

  // Check if pivot should trigger
  const checkTrigger = useCallback(
    async (
      trigger: PivotTrigger,
      stepDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
    ): Promise<PivotDecision> => {
      if (!enabled || !isInitialized) {
        return { shouldTrigger: false, reason: 'disabled' }
      }

      try {
        const result = await pivotService.checkTrigger(sessionId, trigger, stepDifficulty)

        if (result.sessionState) {
          setSessionState(result.sessionState)
        }

        return result.decision
      } catch (error) {
        console.error('Failed to check pivot trigger:', error)
        return { shouldTrigger: false, reason: 'disabled' }
      }
    },
    [sessionId, enabled, isInitialized]
  )

  // Show pivot question
  const showPivot = useCallback(
    async (stepIndex: number, timeSpentSeconds: number, patternId?: string): Promise<void> => {
      if (!enabled || !isInitialized) return

      try {
        const result = await pivotService.showPivot(
          sessionId,
          stepIndex,
          timeSpentSeconds,
          patternId
        )

        setSessionState(result.sessionState)
        setActivePivot(result.pivot)
        setActiveStepIndex(stepIndex)
      } catch (error) {
        console.error('Failed to show pivot:', error)
      }
    },
    [sessionId, enabled, isInitialized]
  )

  // Answer pivot question
  const answerPivot = useCallback(
    async (
      answer: string,
      wasHelpful: boolean
    ): Promise<{ timeBonus: number; explanation: string }> => {
      if (!activePivot || activeStepIndex === null) {
        return { timeBonus: 0, explanation: '' }
      }

      try {
        const result = await pivotService.answerPivot(sessionId, activeStepIndex, {
          pivotQuestionId: activePivot.id,
          stepId: `step_${activeStepIndex}`,
          userAnswer: answer,
          timeSpentSeconds: 0, // Tracked externally
          wasHelpful,
        })

        setSessionState(result.sessionState)
        setActivePivot(null)
        setActiveStepIndex(null)

        return {
          timeBonus: result.timeBonus,
          explanation: result.explanation,
        }
      } catch (error) {
        console.error('Failed to answer pivot:', error)
        setActivePivot(null)
        setActiveStepIndex(null)
        return { timeBonus: 0, explanation: '' }
      }
    },
    [sessionId, activePivot, activeStepIndex]
  )

  // Skip pivot question
  const skipPivot = useCallback(async (): Promise<void> => {
    if (activeStepIndex === null) return

    try {
      const result = await pivotService.skipPivot(sessionId, activeStepIndex)
      setSessionState(result.sessionState)
    } catch (error) {
      console.error('Failed to skip pivot:', error)
    } finally {
      setActivePivot(null)
      setActiveStepIndex(null)
    }
  }, [sessionId, activeStepIndex])

  // Dismiss pivot without API call (for UI only)
  const dismissPivot = useCallback(() => {
    setActivePivot(null)
    setActiveStepIndex(null)
  }, [])

  return {
    // State
    isInitialized,
    sessionState,
    activePivot,
    activeStepIndex,

    // Actions
    checkTrigger,
    showPivot,
    answerPivot,
    skipPivot,
    dismissPivot,

    // Helpers
    hasActivePivot: activePivot !== null,
    pivotsShownCount: sessionState?.totalPivotsShown ?? 0,
  }
}

export default usePivot
