import { describe, it, expect } from 'vitest'
import {
  getDefaultTrackGateState,
  areTrackGatesComplete,
  isStepBlockedByTrackGates,
  getIncompleteGateMessage,
  isEquationStep,
  PHYSICS_PRINCIPLES,
} from '../trackGates'

describe('trackGates', () => {
  describe('getDefaultTrackGateState', () => {
    it('should return situation and diagram gates for foundation1', () => {
      const state = getDefaultTrackGateState('foundation1')

      expect(state.track).toBe('foundation1')
      expect(state.situationExplanation).toBeDefined()
      expect(state.situationExplanation?.type).toBe('situation_explanation')
      expect(state.situationExplanation?.isComplete).toBe(false)
      expect(state.diagramDescription).toBeDefined()
      expect(state.diagramDescription?.type).toBe('diagram_description')
      expect(state.diagramDescription?.isComplete).toBe(false)
      expect(state.modelSelection).toBeUndefined()
    })

    it('should return model selection gate for foundation2', () => {
      const state = getDefaultTrackGateState('foundation2')

      expect(state.track).toBe('foundation2')
      expect(state.modelSelection).toBeDefined()
      expect(state.modelSelection?.type).toBe('model_selection')
      expect(state.modelSelection?.isComplete).toBe(false)
      expect(state.situationExplanation).toBeUndefined()
      expect(state.diagramDescription).toBeUndefined()
    })

    it('should return no gates for intermediate', () => {
      const state = getDefaultTrackGateState('intermediate')

      expect(state.track).toBe('intermediate')
      expect(state.situationExplanation).toBeUndefined()
      expect(state.diagramDescription).toBeUndefined()
      expect(state.modelSelection).toBeUndefined()
    })

    it('should return no gates for competitive', () => {
      const state = getDefaultTrackGateState('competitive')

      expect(state.track).toBe('competitive')
      expect(state.situationExplanation).toBeUndefined()
      expect(state.diagramDescription).toBeUndefined()
      expect(state.modelSelection).toBeUndefined()
    })
  })

  describe('areTrackGatesComplete', () => {
    it('should return false when F1 gates are incomplete', () => {
      const state = getDefaultTrackGateState('foundation1')
      expect(areTrackGatesComplete(state)).toBe(false)
    })

    it('should return false when only situation explanation is complete', () => {
      const state = getDefaultTrackGateState('foundation1')
      state.situationExplanation!.isComplete = true
      expect(areTrackGatesComplete(state)).toBe(false)
    })

    it('should return true when both F1 gates are complete', () => {
      const state = getDefaultTrackGateState('foundation1')
      state.situationExplanation!.isComplete = true
      state.diagramDescription!.isComplete = true
      expect(areTrackGatesComplete(state)).toBe(true)
    })

    it('should return false when F2 model selection is incomplete', () => {
      const state = getDefaultTrackGateState('foundation2')
      expect(areTrackGatesComplete(state)).toBe(false)
    })

    it('should return true when F2 model selection is complete', () => {
      const state = getDefaultTrackGateState('foundation2')
      state.modelSelection!.isComplete = true
      expect(areTrackGatesComplete(state)).toBe(true)
    })

    it('should return true for intermediate track', () => {
      const state = getDefaultTrackGateState('intermediate')
      expect(areTrackGatesComplete(state)).toBe(true)
    })

    it('should return true for competitive track', () => {
      const state = getDefaultTrackGateState('competitive')
      expect(areTrackGatesComplete(state)).toBe(true)
    })
  })

  describe('isEquationStep', () => {
    it('should return false for first step (index 0)', () => {
      expect(isEquationStep(0, 3)).toBe(false)
    })

    it('should return true for steps after first', () => {
      expect(isEquationStep(1, 3)).toBe(true)
      expect(isEquationStep(2, 3)).toBe(true)
    })

    it('should return false if only one step exists', () => {
      expect(isEquationStep(0, 1)).toBe(false)
    })
  })

  describe('isStepBlockedByTrackGates', () => {
    it('should not block first step for F1', () => {
      const state = getDefaultTrackGateState('foundation1')
      expect(isStepBlockedByTrackGates(0, 3, state)).toBe(false)
    })

    it('should block second step for F1 when gates incomplete', () => {
      const state = getDefaultTrackGateState('foundation1')
      expect(isStepBlockedByTrackGates(1, 3, state)).toBe(true)
    })

    it('should not block second step for F1 when gates complete', () => {
      const state = getDefaultTrackGateState('foundation1')
      state.situationExplanation!.isComplete = true
      state.diagramDescription!.isComplete = true
      expect(isStepBlockedByTrackGates(1, 3, state)).toBe(false)
    })

    it('should block second step for F2 when model selection incomplete', () => {
      const state = getDefaultTrackGateState('foundation2')
      expect(isStepBlockedByTrackGates(1, 3, state)).toBe(true)
    })

    it('should not block any steps for intermediate', () => {
      const state = getDefaultTrackGateState('intermediate')
      expect(isStepBlockedByTrackGates(0, 3, state)).toBe(false)
      expect(isStepBlockedByTrackGates(1, 3, state)).toBe(false)
      expect(isStepBlockedByTrackGates(2, 3, state)).toBe(false)
    })

    it('should not block any steps for competitive', () => {
      const state = getDefaultTrackGateState('competitive')
      expect(isStepBlockedByTrackGates(0, 3, state)).toBe(false)
      expect(isStepBlockedByTrackGates(1, 3, state)).toBe(false)
    })

    it('should not block when gate state is null', () => {
      expect(isStepBlockedByTrackGates(1, 3, null)).toBe(false)
    })
  })

  describe('getIncompleteGateMessage', () => {
    it('should return null when gates are complete', () => {
      const state = getDefaultTrackGateState('foundation1')
      state.situationExplanation!.isComplete = true
      state.diagramDescription!.isComplete = true
      expect(getIncompleteGateMessage(state)).toBeNull()
    })

    it('should return situation message for F1 when situation incomplete', () => {
      const state = getDefaultTrackGateState('foundation1')
      const message = getIncompleteGateMessage(state)
      expect(message).toContain('explain the situation')
    })

    it('should return diagram message for F1 when only diagram incomplete', () => {
      const state = getDefaultTrackGateState('foundation1')
      state.situationExplanation!.isComplete = true
      const message = getIncompleteGateMessage(state)
      expect(message).toContain('describe')
    })

    it('should return model selection message for F2', () => {
      const state = getDefaultTrackGateState('foundation2')
      const message = getIncompleteGateMessage(state)
      expect(message).toContain('physics principle')
    })

    it('should return null for intermediate', () => {
      const state = getDefaultTrackGateState('intermediate')
      expect(getIncompleteGateMessage(state)).toBeNull()
    })
  })

  describe('PHYSICS_PRINCIPLES', () => {
    it('should have 10 principles', () => {
      expect(PHYSICS_PRINCIPLES.length).toBe(10)
    })

    it('should have newton, energy, momentum as first principles', () => {
      expect(PHYSICS_PRINCIPLES[0].id).toBe('newton')
      expect(PHYSICS_PRINCIPLES[1].id).toBe('energy')
      expect(PHYSICS_PRINCIPLES[2].id).toBe('momentum')
    })

    it('should have other as last principle', () => {
      expect(PHYSICS_PRINCIPLES[PHYSICS_PRINCIPLES.length - 1].id).toBe('other')
    })
  })
})
