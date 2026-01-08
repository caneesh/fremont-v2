/**
 * useConstraintHighlight Hook
 *
 * Manages constraint highlighting state for problem solving.
 * Highlights constraints students may have missed after wrong answers.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type {
  ConstraintHighlight,
  ProblemConstraint,
  ConstraintSessionState,
  TextPosition,
} from '@/types/constraintHighlight'
import {
  createConstraintSessionState,
  addConstraintsToStep,
  highlightConstraint,
  acknowledgeConstraint,
  dismissConstraint,
  getNextConstraintToHighlight,
} from '@/lib/core/entities/constraint-highlight'
import { extractConstraints } from '@/lib/constraintExtractor'
import { CONSTRAINT_DEFINITIONS } from '@/lib/constraintImplicationRules'

interface UseConstraintHighlightOptions {
  sessionId: string
  problemText: string
  stepCount: number
  enabled?: boolean
}

interface ActiveHighlight {
  constraint: ConstraintHighlight
  position: TextPosition
  stepIndex: number
}

interface UseConstraintHighlightReturn {
  isInitialized: boolean
  activeHighlight: ActiveHighlight | null
  checkTrigger: (stepIndex: number, wrongAttempts: number) => boolean
  triggerHighlight: (stepIndex: number) => void
  acknowledgeHighlight: () => void
  dismissHighlight: () => void
  hasActiveHighlight: boolean
}

export function useConstraintHighlight({
  sessionId,
  problemText,
  stepCount,
  enabled = true,
}: UseConstraintHighlightOptions): UseConstraintHighlightReturn {
  const [isInitialized, setIsInitialized] = useState(false)
  const [sessionState, setSessionState] = useState<ConstraintSessionState | null>(null)
  const [activeHighlight, setActiveHighlight] = useState<ActiveHighlight | null>(null)

  const extractedConstraintsRef = useRef<ProblemConstraint[]>([])

  // Initialize session state and extract constraints
  useEffect(() => {
    if (!enabled) {
      setIsInitialized(true)
      return
    }

    // Create session state
    const state = createConstraintSessionState(sessionId, stepCount)

    // Extract constraints from problem text
    const extracted = extractConstraints(problemText)
    extractedConstraintsRef.current = extracted.constraints as ProblemConstraint[]

    // Add constraints to each step
    let updatedState = state
    for (let i = 0; i < stepCount; i++) {
      updatedState = addConstraintsToStep(updatedState, i, extracted.constraints as ProblemConstraint[])
    }

    setSessionState(updatedState)
    setIsInitialized(true)
  }, [sessionId, problemText, stepCount, enabled])

  // Check if highlight should be triggered
  const checkTrigger = useCallback((stepIndex: number, wrongAttempts: number): boolean => {
    if (!enabled || !sessionState) return false

    // Trigger after 1 wrong attempt
    if (wrongAttempts < 1) return false

    // Check if there's a constraint to highlight
    const nextConstraint = getNextConstraintToHighlight(sessionState, stepIndex)
    return nextConstraint !== null
  }, [enabled, sessionState])

  // Trigger a highlight
  const triggerHighlight = useCallback((stepIndex: number) => {
    if (!enabled || !sessionState) return

    const nextConstraint = getNextConstraintToHighlight(sessionState, stepIndex)
    if (!nextConstraint) return

    // Find the constraint definition
    const constraintDef = CONSTRAINT_DEFINITIONS.find(
      c => c.id === nextConstraint.constraintId
    )
    if (!constraintDef) return

    // Update session state
    const updatedState = highlightConstraint(sessionState, stepIndex, nextConstraint.constraintId)
    setSessionState(updatedState)

    // Set active highlight
    setActiveHighlight({
      constraint: constraintDef,
      position: nextConstraint.position,
      stepIndex,
    })
  }, [enabled, sessionState])

  // Acknowledge the highlight
  const acknowledgeHighlight = useCallback(() => {
    if (!activeHighlight || !sessionState) return

    const updatedState = acknowledgeConstraint(
      sessionState,
      activeHighlight.stepIndex,
      activeHighlight.constraint.id
    )
    setSessionState(updatedState)
    setActiveHighlight(null)
  }, [activeHighlight, sessionState])

  // Dismiss the highlight
  const dismissHighlight = useCallback(() => {
    if (!activeHighlight || !sessionState) return

    const updatedState = dismissConstraint(sessionState, activeHighlight.stepIndex)
    setSessionState(updatedState)
    setActiveHighlight(null)
  }, [activeHighlight, sessionState])

  return {
    isInitialized,
    activeHighlight,
    checkTrigger,
    triggerHighlight,
    acknowledgeHighlight,
    dismissHighlight,
    hasActiveHighlight: activeHighlight !== null,
  }
}
