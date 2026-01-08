import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSolveUIState, getStepProgressText } from '../useSolveUIState'

describe('useSolveUIState', () => {
  describe('state computation', () => {
    it('returns SOLVING state when problem is not solved', () => {
      const { result } = renderHook(() =>
        useSolveUIState({
          allStepsComplete: false,
          isProblemSolved: false,
          isReflectionComplete: false,
        })
      )

      expect(result.current.state).toBe('SOLVING')
      expect(result.current.isSolving).toBe(true)
      expect(result.current.isCompleted).toBe(false)
    })

    it('returns SOLVING state when steps complete but not solved', () => {
      const { result } = renderHook(() =>
        useSolveUIState({
          allStepsComplete: true,
          isProblemSolved: false,
          isReflectionComplete: false,
        })
      )

      expect(result.current.state).toBe('SOLVING')
      expect(result.current.isSolving).toBe(true)
    })

    it('returns SOLVING state when solved but reflection not complete', () => {
      const { result } = renderHook(() =>
        useSolveUIState({
          allStepsComplete: true,
          isProblemSolved: true,
          isReflectionComplete: false,
        })
      )

      expect(result.current.state).toBe('SOLVING')
      expect(result.current.isSolving).toBe(true)
    })

    it('returns COMPLETED state when both solved AND reflection complete', () => {
      const { result } = renderHook(() =>
        useSolveUIState({
          allStepsComplete: true,
          isProblemSolved: true,
          isReflectionComplete: true,
        })
      )

      expect(result.current.state).toBe('COMPLETED')
      expect(result.current.isCompleted).toBe(true)
      expect(result.current.isSolving).toBe(false)
    })
  })

  describe('visibility flags', () => {
    it('hides post-completion components during SOLVING', () => {
      const { result } = renderHook(() =>
        useSolveUIState({
          allStepsComplete: false,
          isProblemSolved: false,
          isReflectionComplete: false,
        })
      )

      expect(result.current.visibility.whatIfSimulation).toBe(false)
      expect(result.current.visibility.problemVariations).toBe(false)
      expect(result.current.visibility.nextChallenge).toBe(false)
      expect(result.current.visibility.completionActions).toBe(false)
    })

    it('shows solving components during SOLVING', () => {
      const { result } = renderHook(() =>
        useSolveUIState({
          allStepsComplete: false,
          isProblemSolved: false,
          isReflectionComplete: false,
        })
      )

      expect(result.current.visibility.stepAccordion).toBe(true)
      expect(result.current.visibility.stepProgressIndicator).toBe(true)
      expect(result.current.visibility.primaryCTA).toBe(true)
      expect(result.current.visibility.conceptsDrawerButton).toBe(true)
    })

    it('shows post-completion components in COMPLETED state', () => {
      const { result } = renderHook(() =>
        useSolveUIState({
          allStepsComplete: true,
          isProblemSolved: true,
          isReflectionComplete: true,
        })
      )

      expect(result.current.visibility.whatIfSimulation).toBe(true)
      expect(result.current.visibility.problemVariations).toBe(true)
      expect(result.current.visibility.nextChallenge).toBe(true)
      expect(result.current.visibility.completionActions).toBe(true)
    })
  })

  describe('showCompletionActions', () => {
    it('is false during SOLVING', () => {
      const { result } = renderHook(() =>
        useSolveUIState({
          allStepsComplete: false,
          isProblemSolved: false,
          isReflectionComplete: false,
        })
      )

      expect(result.current.showCompletionActions).toBe(false)
    })

    it('is true in COMPLETED state', () => {
      const { result } = renderHook(() =>
        useSolveUIState({
          allStepsComplete: true,
          isProblemSolved: true,
          isReflectionComplete: true,
        })
      )

      expect(result.current.showCompletionActions).toBe(true)
    })
  })
})

describe('getStepProgressText', () => {
  it('formats step progress correctly (1-indexed)', () => {
    expect(getStepProgressText(0, 4)).toBe('Step 1 of 4')
    expect(getStepProgressText(1, 4)).toBe('Step 2 of 4')
    expect(getStepProgressText(3, 4)).toBe('Step 4 of 4')
  })

  it('handles single step', () => {
    expect(getStepProgressText(0, 1)).toBe('Step 1 of 1')
  })

  it('handles many steps', () => {
    expect(getStepProgressText(9, 10)).toBe('Step 10 of 10')
  })
})
