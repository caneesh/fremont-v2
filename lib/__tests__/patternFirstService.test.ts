import {
  validateSelection,
  shouldShowPatternFirst,
  createInitialSelectionState,
  createSelectionState,
  createTimeoutState,
  toProgressFormat,
  fromProgressFormat,
  defaultTimePressure,
} from '../patternFirstService'
import type { PatternOption, PatternSelectionProgress, TimePressureConfig } from '@/types/patternFirst'

describe('patternFirstService', () => {
  describe('validateSelection', () => {
    it('returns isPrimary true when selected pattern matches primary', () => {
      const result = validateSelection('momentum', 'momentum')
      expect(result.isPrimary).toBe(true)
      expect(result.isSecondary).toBe(false)
      expect(result.isCorrect).toBe(true)
    })

    it('returns isSecondary true when selected pattern is in secondary list', () => {
      const result = validateSelection('energy', 'momentum', ['energy', 'work'])
      expect(result.isPrimary).toBe(false)
      expect(result.isSecondary).toBe(true)
      expect(result.isCorrect).toBe(true)
    })

    it('returns isCorrect false when selection does not match any valid pattern', () => {
      const result = validateSelection('kinematics', 'momentum', ['energy'])
      expect(result.isPrimary).toBe(false)
      expect(result.isSecondary).toBe(false)
      expect(result.isCorrect).toBe(false)
    })

    it('handles missing secondaryIds gracefully', () => {
      const result = validateSelection('kinematics', 'momentum')
      expect(result.isSecondary).toBe(false)
    })
  })

  describe('shouldShowPatternFirst', () => {
    const mockPatterns: PatternOption[] = [
      { id: 'momentum', name: 'Conservation of Momentum', description: 'Test' },
      { id: 'energy', name: 'Conservation of Energy', description: 'Test' },
    ]

    const enabledTimePressure: TimePressureConfig = {
      enablePatternFirst: true,
      lockSeconds: 12,
      showCountdown: true,
      allowTimeoutProceed: true,
    }

    it('returns true when all conditions are met', () => {
      expect(shouldShowPatternFirst(mockPatterns, 'momentum', enabledTimePressure, undefined)).toBe(true)
    })

    it('returns false when patterns array is empty', () => {
      expect(shouldShowPatternFirst([], 'momentum', enabledTimePressure, undefined)).toBe(false)
    })

    it('returns false when patterns is undefined', () => {
      expect(shouldShowPatternFirst(undefined, 'momentum', enabledTimePressure, undefined)).toBe(false)
    })

    it('returns false when primaryPatternId is undefined', () => {
      expect(shouldShowPatternFirst(mockPatterns, undefined, enabledTimePressure, undefined)).toBe(false)
    })

    it('returns false when enablePatternFirst is false', () => {
      const disabled: TimePressureConfig = { ...enabledTimePressure, enablePatternFirst: false }
      expect(shouldShowPatternFirst(mockPatterns, 'momentum', disabled, undefined)).toBe(false)
    })

    it('returns false when timePressure is undefined', () => {
      expect(shouldShowPatternFirst(mockPatterns, 'momentum', undefined, undefined)).toBe(false)
    })

    it('returns false when user has already selected a pattern', () => {
      const existingSelection: PatternSelectionProgress = {
        selectedPatternId: 'energy',
        patternDecisionTimeMs: 5000,
        patternDecisionCorrect: false,
        patternTimedOut: false,
      }
      expect(shouldShowPatternFirst(mockPatterns, 'momentum', enabledTimePressure, existingSelection)).toBe(false)
    })

    it('returns false when user has timed out', () => {
      const timedOutSelection: PatternSelectionProgress = {
        selectedPatternId: null,
        patternDecisionTimeMs: 12000,
        patternDecisionCorrect: null,
        patternTimedOut: true,
      }
      expect(shouldShowPatternFirst(mockPatterns, 'momentum', enabledTimePressure, timedOutSelection)).toBe(false)
    })
  })

  describe('createInitialSelectionState', () => {
    it('creates correct initial state', () => {
      const state = createInitialSelectionState()
      expect(state.selectedPatternId).toBeNull()
      expect(state.decisionTimeMs).toBe(0)
      expect(state.isCorrect).toBeNull()
      expect(state.timedOut).toBe(false)
      expect(state.timestamp).toBe('')
    })
  })

  describe('createSelectionState', () => {
    it('creates state for correct selection', () => {
      const state = createSelectionState('momentum', 5000, true)
      expect(state.selectedPatternId).toBe('momentum')
      expect(state.decisionTimeMs).toBe(5000)
      expect(state.isCorrect).toBe(true)
      expect(state.timedOut).toBe(false)
      expect(state.timestamp).not.toBe('')
    })

    it('creates state for incorrect selection', () => {
      const state = createSelectionState('energy', 8000, false)
      expect(state.selectedPatternId).toBe('energy')
      expect(state.isCorrect).toBe(false)
    })
  })

  describe('createTimeoutState', () => {
    it('creates state for timeout', () => {
      const state = createTimeoutState(12000)
      expect(state.selectedPatternId).toBeNull()
      expect(state.decisionTimeMs).toBe(12000)
      expect(state.isCorrect).toBeNull()
      expect(state.timedOut).toBe(true)
      expect(state.timestamp).not.toBe('')
    })
  })

  describe('toProgressFormat', () => {
    it('converts selection state to progress format', () => {
      const state = createSelectionState('momentum', 5000, true)
      const progress = toProgressFormat(state)

      expect(progress.selectedPatternId).toBe('momentum')
      expect(progress.patternDecisionTimeMs).toBe(5000)
      expect(progress.patternDecisionCorrect).toBe(true)
      expect(progress.patternTimedOut).toBe(false)
    })
  })

  describe('fromProgressFormat', () => {
    it('converts progress format to selection state', () => {
      const progress: PatternSelectionProgress = {
        selectedPatternId: 'energy',
        patternDecisionTimeMs: 7000,
        patternDecisionCorrect: false,
        patternTimedOut: false,
      }
      const state = fromProgressFormat(progress)

      expect(state.selectedPatternId).toBe('energy')
      expect(state.decisionTimeMs).toBe(7000)
      expect(state.isCorrect).toBe(false)
      expect(state.timedOut).toBe(false)
      expect(state.timestamp).toBe('') // Not stored in progress
    })
  })

  describe('defaultTimePressure', () => {
    it('has correct default values', () => {
      expect(defaultTimePressure.enablePatternFirst).toBe(false)
      expect(defaultTimePressure.lockSeconds).toBe(12)
      expect(defaultTimePressure.showCountdown).toBe(true)
      expect(defaultTimePressure.allowTimeoutProceed).toBe(true)
    })
  })
})
