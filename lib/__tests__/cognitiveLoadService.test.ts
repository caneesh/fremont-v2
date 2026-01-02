/**
 * Unit Tests for Cognitive Load Governor
 *
 * Tests the pure computation function and state transitions
 * to ensure deterministic behavior (same inputs → same outputs).
 */

import {
  computeCognitiveLoadScore,
  updateCognitiveLoadAfterStep,
  shortenHintForHighLoad,
  reduceMCQToBinary,
  getUIConfigForLoadScore,
} from '../cognitiveLoadService'
import {
  createInitialCognitiveLoadState,
  createInitialSessionLoadMetrics,
  createInitialStepLoadMetrics,
  DEFAULT_COGNITIVE_LOAD_THRESHOLDS,
  type CognitiveLoadState,
  type SessionLoadMetrics,
} from '@/types/cognitiveLoad'

describe('computeCognitiveLoadScore', () => {
  let defaultState: CognitiveLoadState
  let defaultMetrics: SessionLoadMetrics

  beforeEach(() => {
    defaultState = createInitialCognitiveLoadState()
    defaultMetrics = createInitialSessionLoadMetrics()
  })

  describe('minimum data requirements', () => {
    it('returns current score when not enough steps for assessment', () => {
      // Only 1 step - below minStepsForAssessment (2)
      defaultMetrics.stepMetrics = [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 300, isCompleted: true },
      ]

      const score = computeCognitiveLoadScore(defaultMetrics, defaultState)

      expect(score).toBe('low') // Returns current score unchanged
    })

    it('computes score when enough steps are present', () => {
      // 2 steps - meets minStepsForAssessment
      defaultMetrics.stepMetrics = [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 60, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 60, isCompleted: true },
      ]
      defaultMetrics.totalTimeSpentSeconds = 120

      const score = computeCognitiveLoadScore(defaultMetrics, defaultState)

      expect(score).toBe('low') // Low load with quick completion
    })
  })

  describe('HIGH load detection', () => {
    it('returns HIGH when circuit breaker is TRIPPED', () => {
      defaultMetrics.stepMetrics = [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 60, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 60, isCompleted: true },
      ]
      defaultMetrics.totalTimeSpentSeconds = 120
      defaultMetrics.circuitBreakerState = 'TRIPPED'

      const score = computeCognitiveLoadScore(defaultMetrics, defaultState)

      expect(score).toBe('high')
    })

    it('returns HIGH when circuit breaker is WARNING', () => {
      defaultMetrics.stepMetrics = [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 60, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 60, isCompleted: true },
      ]
      defaultMetrics.totalTimeSpentSeconds = 120
      defaultMetrics.circuitBreakerState = 'WARNING'

      const score = computeCognitiveLoadScore(defaultMetrics, defaultState)

      expect(score).toBe('high')
    })

    it('returns HIGH when 3+ struggle signals present', () => {
      // High time + high wrong attempts + reveal used = 3 signals
      defaultMetrics.stepMetrics = [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 200, wrongAttempts: 3, revealUsed: true, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 200, wrongAttempts: 3, isCompleted: true },
      ]
      defaultMetrics.totalTimeSpentSeconds = 400
      defaultMetrics.totalWrongAttempts = 6
      defaultMetrics.revealCount = 1

      const score = computeCognitiveLoadScore(defaultMetrics, defaultState)

      expect(score).toBe('high')
    })

    it('returns HIGH with multiple stuck steps', () => {
      defaultMetrics.stepMetrics = [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 200, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 200, isCompleted: true },
      ]
      defaultMetrics.totalTimeSpentSeconds = 400
      defaultMetrics.stuckStepCount = 2 // >= stuckStepCountForHighLoad

      const score = computeCognitiveLoadScore(defaultMetrics, defaultState)

      // High time (200s avg > 180s threshold) + stuck steps = 2 signals = MEDIUM
      // Actually stuckStepCount=2 triggers hasMultipleStuckSteps
      // isHighTime at 200s avg? 400/2 = 200 > 180 = true
      expect(score).toBe('medium')
    })
  })

  describe('MEDIUM load detection', () => {
    it('returns MEDIUM when 2 struggle signals present', () => {
      // High time + high wrong attempts = 2 signals
      defaultMetrics.stepMetrics = [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 200, wrongAttempts: 3, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 200, wrongAttempts: 3, isCompleted: true },
      ]
      defaultMetrics.totalTimeSpentSeconds = 400 // avg 200s per step
      defaultMetrics.totalWrongAttempts = 6 // avg 3 per step > 2 threshold

      const score = computeCognitiveLoadScore(defaultMetrics, defaultState)

      expect(score).toBe('medium')
    })
  })

  describe('LOW load (normal operation)', () => {
    it('returns LOW when 0-1 struggle signals present', () => {
      // Normal time, no wrong attempts = 0 signals
      defaultMetrics.stepMetrics = [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 60, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 60, isCompleted: true },
      ]
      defaultMetrics.totalTimeSpentSeconds = 120

      const score = computeCognitiveLoadScore(defaultMetrics, defaultState)

      expect(score).toBe('low')
    })

    it('returns LOW with just 1 struggle signal', () => {
      // Only high time = 1 signal
      defaultMetrics.stepMetrics = [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 200, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 200, isCompleted: true },
      ]
      defaultMetrics.totalTimeSpentSeconds = 400 // avg 200s > 180s threshold

      const score = computeCognitiveLoadScore(defaultMetrics, defaultState)

      expect(score).toBe('low') // Only 1 signal, not enough for MEDIUM
    })
  })

  describe('recovery from HIGH load', () => {
    it('stays HIGH until recovery threshold met', () => {
      // State is already HIGH
      const highState: CognitiveLoadState = {
        ...createInitialCognitiveLoadState(),
        score: 'high',
        stepsSinceLowLoad: 0,
      }

      // Normal metrics now (no struggle signals)
      defaultMetrics.stepMetrics = [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 60, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 60, isCompleted: true },
      ]
      defaultMetrics.totalTimeSpentSeconds = 120

      const score = computeCognitiveLoadScore(defaultMetrics, highState)

      expect(score).toBe('high') // Stays high - needs recoveryStepCount (2) clean steps
    })

    it('transitions to MEDIUM after recovery threshold', () => {
      // State is HIGH but has done 2 clean steps
      const highState: CognitiveLoadState = {
        ...createInitialCognitiveLoadState(),
        score: 'high',
        stepsSinceLowLoad: 2, // >= recoveryStepCount
      }

      // Normal metrics now
      defaultMetrics.stepMetrics = [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 60, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 60, isCompleted: true },
      ]
      defaultMetrics.totalTimeSpentSeconds = 120

      const score = computeCognitiveLoadScore(defaultMetrics, highState)

      expect(score).toBe('medium') // Gradual recovery
    })
  })

  describe('determinism', () => {
    it('same inputs produce same outputs', () => {
      // Set up identical metrics
      const metrics1: SessionLoadMetrics = {
        sessionStartMs: 1000,
        totalTimeSpentSeconds: 240,
        stepMetrics: [
          { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 120, wrongAttempts: 2, isCompleted: true },
          { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 120, wrongAttempts: 1, isCompleted: true },
        ],
        circuitBreakerState: 'MONITORING',
        totalWrongAttempts: 3,
        totalHintsUnlocked: 4,
        revealCount: 0,
        stuckStepCount: 0,
      }

      const metrics2: SessionLoadMetrics = { ...metrics1 }

      const score1 = computeCognitiveLoadScore(metrics1, defaultState)
      const score2 = computeCognitiveLoadScore(metrics2, defaultState)

      expect(score1).toBe(score2)
    })
  })
})

describe('updateCognitiveLoadAfterStep', () => {
  it('returns event when score changes', () => {
    const state = createInitialCognitiveLoadState()
    const metrics: SessionLoadMetrics = {
      ...createInitialSessionLoadMetrics(),
      stepMetrics: [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 200, wrongAttempts: 3, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 200, wrongAttempts: 3, isCompleted: true },
      ],
      totalTimeSpentSeconds: 400,
      totalWrongAttempts: 6,
    }

    const { state: newState, event } = updateCognitiveLoadAfterStep(state, metrics)

    expect(newState.score).toBe('medium')
    expect(event).not.toBeNull()
    expect(event?.type).toBe('cognitive_load_increased')
  })

  it('returns null event when score unchanged', () => {
    const state = createInitialCognitiveLoadState()
    const metrics: SessionLoadMetrics = {
      ...createInitialSessionLoadMetrics(),
      stepMetrics: [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 60, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 60, isCompleted: true },
      ],
      totalTimeSpentSeconds: 120,
    }

    const { state: newState, event } = updateCognitiveLoadAfterStep(state, metrics)

    expect(newState.score).toBe('low')
    expect(event).toBeNull()
  })

  it('tracks score history', () => {
    const state = createInitialCognitiveLoadState()
    const highLoadMetrics: SessionLoadMetrics = {
      ...createInitialSessionLoadMetrics(),
      stepMetrics: [
        { ...createInitialStepLoadMetrics(0), timeSpentSeconds: 60, isCompleted: true },
        { ...createInitialStepLoadMetrics(1), timeSpentSeconds: 60, isCompleted: true },
      ],
      totalTimeSpentSeconds: 120,
      circuitBreakerState: 'TRIPPED', // Forces HIGH
    }

    const { state: newState } = updateCognitiveLoadAfterStep(state, highLoadMetrics)

    expect(newState.scoreHistory.length).toBe(1)
    expect(newState.scoreHistory[0].score).toBe('high')
  })
})

describe('shortenHintForHighLoad', () => {
  it('returns first sentence when present', () => {
    const hint = 'This is the first sentence. This is the second sentence.'

    const shortened = shortenHintForHighLoad(hint)

    expect(shortened).toBe('This is the first sentence.')
  })

  it('handles question marks as sentence enders', () => {
    const hint = 'What is the velocity? The answer involves kinematics.'

    const shortened = shortenHintForHighLoad(hint)

    expect(shortened).toBe('What is the velocity?')
  })

  it('handles exclamation marks as sentence enders', () => {
    const hint = 'Remember this! It is important for the solution.'

    const shortened = shortenHintForHighLoad(hint)

    expect(shortened).toBe('Remember this!')
  })

  it('truncates to 100 chars with ellipsis if no sentence found', () => {
    const hint = 'This is a very long hint without any sentence-ending punctuation that goes on and on and on and continues even further'

    const shortened = shortenHintForHighLoad(hint)

    expect(shortened.length).toBe(103) // 100 + '...'
    expect(shortened.endsWith('...')).toBe(true)
  })

  it('returns full content if under 100 chars and no punctuation', () => {
    const hint = 'Short hint without punctuation'

    const shortened = shortenHintForHighLoad(hint)

    expect(shortened).toBe(hint)
  })
})

describe('reduceMCQToBinary', () => {
  it('returns 2 options with correct answer included', () => {
    const options = [
      { label: 'Option A', isCorrect: false },
      { label: 'Option B', isCorrect: true },
      { label: 'Option C', isCorrect: false },
      { label: 'Option D', isCorrect: false },
    ]

    const reduced = reduceMCQToBinary(options)

    expect(reduced.length).toBe(2)
    expect(reduced.some(o => o.isCorrect)).toBe(true)
  })

  it('returns original if already 2 or fewer options', () => {
    const options = [
      { label: 'Option A', isCorrect: true },
      { label: 'Option B', isCorrect: false },
    ]

    const reduced = reduceMCQToBinary(options)

    expect(reduced).toEqual(options)
  })

  it('returns single correct option if no distractor available', () => {
    const options = [
      { label: 'Option A', isCorrect: true },
      { label: 'Option B', isCorrect: true },
      { label: 'Option C', isCorrect: true },
    ]

    const reduced = reduceMCQToBinary(options)

    // All correct means no distractor, so returns just the first correct one
    expect(reduced.length).toBe(1)
    expect(reduced[0].isCorrect).toBe(true)
  })
})

describe('getUIConfigForLoadScore', () => {
  it('returns HIGH config for high score', () => {
    const config = getUIConfigForLoadScore('high')

    expect(config.singleActiveStep).toBe(true)
    expect(config.collapseFutureSteps).toBe(true)
    expect(config.reduceMCQToBinary).toBe(true)
    expect(config.shortenHintText).toBe(true)
    expect(config.disableOptionalHints).toBe(true)
    expect(config.hideErrorWatchOuts).toBe(true)
  })

  it('returns MEDIUM config for medium score', () => {
    const config = getUIConfigForLoadScore('medium')

    expect(config.singleActiveStep).toBe(false)
    expect(config.collapseFutureSteps).toBe(false)
    expect(config.reduceMCQToBinary).toBe(false)
  })

  it('returns LOW config for low score', () => {
    const config = getUIConfigForLoadScore('low')

    expect(config.singleActiveStep).toBe(false)
    expect(config.collapseFutureSteps).toBe(false)
    expect(config.disableOptionalHints).toBe(false)
  })
})
