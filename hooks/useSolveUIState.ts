'use client'

import { useMemo } from 'react'
import { type SolveUIState, SOLVE_UI_VISIBILITY } from '@/lib/solveUIConfig'

interface UseSolveUIStateParams {
  /** Whether all steps have been completed */
  allStepsComplete: boolean
  /** Whether the problem has been marked as solved (after sanity check or manual) */
  isProblemSolved: boolean
  /** Whether reflection has been completed */
  isReflectionComplete: boolean
}

/** Visibility configuration type - union of SOLVING and COMPLETED states */
type VisibilityConfig = typeof SOLVE_UI_VISIBILITY.SOLVING | typeof SOLVE_UI_VISIBILITY.COMPLETED

interface UseSolveUIStateReturn {
  /** Current UI state: SOLVING or COMPLETED */
  state: SolveUIState
  /** Visibility flags for each component */
  visibility: VisibilityConfig
  /** Whether the user is in "solving" mode (actively working on steps) */
  isSolving: boolean
  /** Whether the user has completed the problem */
  isCompleted: boolean
  /** Helper for step progress indicator */
  showCompletionActions: boolean
}

/**
 * useSolveUIState - Hook for computing solve page UI state
 *
 * Implements a simple state machine:
 * - SOLVING: User is actively working through steps
 * - COMPLETED: User has finished all steps AND completed reflection
 *
 * The state determines which components are visible:
 * - SOLVING: Focus on current step, hide post-completion actions
 * - COMPLETED: Show completion actions, practice options, simulation
 */
export function useSolveUIState({
  allStepsComplete,
  isProblemSolved,
  isReflectionComplete,
}: UseSolveUIStateParams): UseSolveUIStateReturn {
  const result = useMemo(() => {
    // Completed when problem is solved AND reflection is done
    // This matches the existing behavior in SolutionScaffold where
    // post-solve components are shown after `isProblemSolved && isReflectionComplete`
    const isCompleted = isProblemSolved && isReflectionComplete

    const state: SolveUIState = isCompleted ? 'COMPLETED' : 'SOLVING'
    const visibility = SOLVE_UI_VISIBILITY[state]

    return {
      state,
      visibility,
      isSolving: state === 'SOLVING',
      isCompleted: state === 'COMPLETED',
      showCompletionActions: isCompleted,
    }
  }, [isProblemSolved, isReflectionComplete])

  return result
}

/**
 * Helper function to compute step progress text
 * e.g., "Step 2 of 4"
 */
export function getStepProgressText(currentStep: number, totalSteps: number): string {
  return `Step ${currentStep + 1} of ${totalSteps}`
}
