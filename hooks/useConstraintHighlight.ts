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
import { DEFAULT_CONSTRAINTS, detectConstraints } from '@/lib/core/policies/constraint-highlight-policy'

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

interface ConstraintTriggerDecision {
  shouldHighlight: boolean
  constraintId?: string
}

interface UseConstraintHighlightReturn {
  isInitialized: boolean
  activeHighlight: ActiveHighlight | null
  checkTrigger: (stepIndex: number, wrongAttempts: number) => ConstraintTriggerDecision
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
    const extracted = detectConstraints(problemText)
    extractedConstraintsRef.current = [...extracted.constraints]

    // Add constraints to each step
    let updatedState = state
    for (let i = 0; i < stepCount; i++) {
      updatedState = addConstraintsToStep(updatedState, i, [...extracted.constraints])
    }

    setSessionState(updatedState)
    setIsInitialized(true)
  }, [sessionId, problemText, stepCount, enabled])

  // Check if highlight should be triggered
  const checkTrigger = useCallback((stepIndex: number, wrongAttempts: number): ConstraintTriggerDecision => {
    if (!enabled || !sessionState) return { shouldHighlight: false }

    // Trigger after 1 wrong attempt
    if (wrongAttempts < 1) return { shouldHighlight: false }

    // Check if there's a constraint to highlight
    const nextConstraint = getNextConstraintToHighlight(sessionState, stepIndex)
    if (!nextConstraint) return { shouldHighlight: false }

    return { shouldHighlight: true, constraintId: nextConstraint.constraintId }
  }, [enabled, sessionState])

  // Trigger a highlight
  const triggerHighlight = useCallback((stepIndex: number) => {
    if (!enabled || !sessionState) return

    const nextConstraint = getNextConstraintToHighlight(sessionState, stepIndex)
    if (!nextConstraint) return

    // Find the constraint definition
    const constraintDef = DEFAULT_CONSTRAINTS.find(
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
