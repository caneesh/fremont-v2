import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getOrCreateIntegrityState,
  clearIntegrityState,
  saveIntegrityState,
  detectFastAnswer,
  detectTabBlur,
  detectExplanationGap,
  detectPerformanceSpike,
  recordSignal,
  recordAnswerSubmission,
  checkForIntervention,
  generateComprehensionCheck,
  validateComprehensionResponse,
  recordComprehensionResult,
  shouldIncreaseGates,
  updateBaseline,
} from '../integrityMonitor'
import {
  createInitialIntegrityState,
  MIN_ANSWER_TIME_MS,
  SCORE_THRESHOLDS,
  SIGNAL_WEIGHTS,
} from '@/types/integritySignal'

describe('IntegrityMonitor', () => {
  beforeEach(() => {
    clearIntegrityState()
  })

  afterEach(() => {
    clearIntegrityState()
  })

  describe('Session State Management', () => {
    it('creates initial state when none exists', () => {
      const state = getOrCreateIntegrityState()

      expect(state).toBeDefined()
      expect(state.accumulator.score).toBe(0)
      expect(state.accumulator.signalCounts.fast_correct_answer).toBe(0)
      expect(state.activeIntervention).toBeNull()
      expect(state.gatesIncreased).toBe(false)
    })

    it('returns existing state when one exists', () => {
      const firstState = getOrCreateIntegrityState()
      firstState.accumulator.score = 1.5
      // Must save after modification
      saveIntegrityState(firstState)

      const secondState = getOrCreateIntegrityState()

      // Should return saved state
      expect(secondState.accumulator.score).toBe(1.5)
    })
  })

  describe('Signal Detection - Fast Answer', () => {
    it('detects suspiciously fast answers', () => {
      const result = detectFastAnswer(1000, 'simple_mcq') // 1s for 3s min

      expect(result.detected).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('does not flag normal answer times', () => {
      const result = detectFastAnswer(5000, 'simple_mcq') // 5s for 3s min

      expect(result.detected).toBe(false)
      expect(result.confidence).toBe(0)
    })

    it('scales confidence with speed', () => {
      const veryFast = detectFastAnswer(500, 'simple_mcq')
      const somewhatFast = detectFastAnswer(2000, 'simple_mcq')

      expect(veryFast.confidence).toBeGreaterThan(somewhatFast.confidence)
    })

    it('uses correct threshold for question type', () => {
      const complexResult = detectFastAnswer(5000, 'complex_mcq') // 5s for 8s min

      expect(complexResult.detected).toBe(true) // 5s is fast for complex
    })
  })

  describe('Signal Detection - Tab Blur', () => {
    it('detects significant tab blur', () => {
      const result = detectTabBlur(8000, 10000) // 8s blur in 10s answer

      expect(result.detected).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('ignores brief tab switches', () => {
      const result = detectTabBlur(1000, 10000) // 1s blur in 10s answer

      expect(result.detected).toBe(false)
    })

    it('confidence scales with blur duration', () => {
      const longBlur = detectTabBlur(9000, 10000) // 90% of time
      const shortBlur = detectTabBlur(4000, 10000) // 40% of time

      expect(longBlur.confidence).toBeGreaterThan(shortBlur.confidence)
    })
  })

  describe('Signal Detection - Explanation Gap', () => {
    it('detects correct answer with no explanation', () => {
      const result = detectExplanationGap(true, 0, 5)

      expect(result.detected).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.8)
    })

    it('does not flag correct answer with good explanation', () => {
      const result = detectExplanationGap(true, 10, 5)

      expect(result.detected).toBe(false)
    })

    it('does not flag incorrect answers', () => {
      const result = detectExplanationGap(false, 0, 5)

      expect(result.detected).toBe(false)
    })
  })

  describe('Signal Detection - Performance Spike', () => {
    it('detects sudden performance improvement', () => {
      const result = detectPerformanceSpike(
        0.9, // Recent: 90% correct
        0.3, // Overall: 30% correct
        10   // 10 samples
      )

      expect(result.detected).toBe(true)
    })

    it('does not flag gradual improvement', () => {
      const result = detectPerformanceSpike(
        0.6, // Recent: 60% correct
        0.4, // Overall: 40% correct
        10
      )

      expect(result.detected).toBe(false)
    })

    it('requires sufficient sample size', () => {
      const result = detectPerformanceSpike(
        1.0, // 100% recent
        0.2, // 20% overall
        3    // Only 3 samples - too few
      )

      expect(result.detected).toBe(false)
    })
  })

  describe('Signal Recording', () => {
    it('records signal and updates score', () => {
      const state = createInitialIntegrityState()

      recordSignal(state, {
        type: 'fast_correct_answer',
        timestamp: new Date().toISOString(),
        confidence: 0.8,
      })

      expect(state.accumulator.signalCounts.fast_correct_answer).toBe(1)
      expect(state.accumulator.score).toBeGreaterThan(0)
      expect(state.accumulator.recentSignals.length).toBe(1)
    })

    it('accumulates multiple signals', () => {
      const state = createInitialIntegrityState()
      const now = new Date().toISOString()

      recordSignal(state, { type: 'fast_correct_answer', timestamp: now, confidence: 0.8 })
      recordSignal(state, { type: 'tab_blur_before_correct', timestamp: now, confidence: 0.7 })

      expect(state.accumulator.signalCounts.fast_correct_answer).toBe(1)
      expect(state.accumulator.signalCounts.tab_blur_before_correct).toBe(1)
      expect(state.accumulator.recentSignals.length).toBe(2)
    })

    it('caps recent signals at max', () => {
      const state = createInitialIntegrityState()

      // Add more than max signals
      for (let i = 0; i < 15; i++) {
        recordSignal(state, {
          type: 'fast_correct_answer',
          timestamp: new Date().toISOString(),
          confidence: 0.5,
        })
      }

      expect(state.accumulator.recentSignals.length).toBeLessThanOrEqual(10)
    })
  })

  describe('Answer Submission Recording', () => {
    it('tracks fast correct answers', () => {
      const { state } = recordAnswerSubmission(
        true,        // correct
        1000,        // 1 second (very fast)
        'simple_mcq',
        { stepId: 1 }
      )

      expect(state.accumulator.signalCounts.fast_correct_answer).toBeGreaterThan(0)
    })

    it('tracks paste events', () => {
      const { state } = recordAnswerSubmission(
        true,
        5000,
        'simple_mcq',
        { wasPasted: true }
      )

      expect(state.accumulator.signalCounts.paste_detected).toBe(1)
    })

    it('does not track incorrect answers', () => {
      const { state } = recordAnswerSubmission(
        false,       // incorrect
        500,         // very fast
        'simple_mcq'
      )

      expect(state.accumulator.signalCounts.fast_correct_answer).toBe(0)
    })

    it('updates baseline metrics', () => {
      recordAnswerSubmission(true, 5000, 'simple_mcq')

      const state = getOrCreateIntegrityState()

      expect(state.baseline.sampleCount).toBe(1)
      expect(state.baseline.averageAnswerTimeMs).toBe(5000)
    })
  })

  describe('Intervention Logic', () => {
    it('triggers comprehension check at threshold', () => {
      const state = createInitialIntegrityState()

      // Accumulate score above GENTLE_CHECK threshold
      state.accumulator.score = SCORE_THRESHOLDS.GENTLE_CHECK + 0.1

      const intervention = checkForIntervention(state)

      expect(intervention).not.toBeNull()
      expect(intervention?.type).toBe('comprehension_check')
    })

    it('does not trigger below threshold', () => {
      const state = createInitialIntegrityState()
      state.accumulator.score = SCORE_THRESHOLDS.GENTLE_CHECK - 0.5

      const intervention = checkForIntervention(state)

      expect(intervention).toBeNull()
    })

    it('increases gates at higher threshold', () => {
      const state = createInitialIntegrityState()
      state.accumulator.score = SCORE_THRESHOLDS.INCREASE_GATES + 0.1

      checkForIntervention(state)

      expect(state.gatesIncreased).toBe(true)
    })

    it('does not pile on interventions', () => {
      const state = createInitialIntegrityState()
      state.accumulator.score = SCORE_THRESHOLDS.GENTLE_CHECK + 0.5
      state.activeIntervention = 'comprehension_check' // Already has one

      const intervention = checkForIntervention(state)

      expect(intervention).toBeNull()
    })
  })

  describe('Comprehension Check Generation', () => {
    it('generates a valid check', () => {
      const check = generateComprehensionCheck(
        'Apply Newton\'s Second Law',
        ['Newton', 'force', 'acceleration'],
        'A block on an incline'
      )

      expect(check.id).toBeDefined()
      expect(check.question).toBeDefined()
      expect(check.minWords).toBeGreaterThan(0)
    })
  })

  describe('Comprehension Check Validation', () => {
    const check = {
      id: 'test',
      question: 'Why does this work?',
      expectedElements: ['newton', 'force'],
      minWords: 5,
      passFeedback: 'Great!',
      struggleFeedback: 'Keep trying!',
    }

    it('passes with adequate response', () => {
      const result = validateComprehensionResponse(
        'Newton\'s laws tell us that force causes acceleration',
        check
      )

      expect(result.passed).toBe(true)
      expect(result.feedback).toBe(check.passFeedback)
    })

    it('fails with too short response', () => {
      const result = validateComprehensionResponse(
        'Force',
        check
      )

      expect(result.passed).toBe(false)
    })

    it('is lenient with word count alone', () => {
      const result = validateComprehensionResponse(
        'The object accelerates because of the applied push using physics principles',
        { ...check, expectedElements: [] } // No required elements
      )

      expect(result.passed).toBe(true)
    })
  })

  describe('Comprehension Result Recording', () => {
    it('reduces score on pass', () => {
      const state = createInitialIntegrityState()
      state.accumulator.score = 2.0
      state.activeIntervention = 'comprehension_check'

      recordComprehensionResult(state, true)

      expect(state.accumulator.score).toBeLessThan(2.0)
      expect(state.accumulator.verificationsPassed).toBe(1)
    })

    it('clears active intervention', () => {
      const state = createInitialIntegrityState()
      state.activeIntervention = 'comprehension_check'

      recordComprehensionResult(state, true)

      expect(state.activeIntervention).toBeNull()
    })
  })

  describe('Gate Increase Check', () => {
    it('returns true when gates are increased', () => {
      const state = createInitialIntegrityState()
      state.gatesIncreased = true

      expect(shouldIncreaseGates(state)).toBe(true)
    })

    it('returns false by default', () => {
      const state = createInitialIntegrityState()

      expect(shouldIncreaseGates(state)).toBe(false)
    })
  })

  describe('Baseline Tracking', () => {
    it('calculates running average', () => {
      const state = createInitialIntegrityState()

      updateBaseline(state, 5000, 10) // First sample
      updateBaseline(state, 7000, 20) // Second sample

      expect(state.baseline.sampleCount).toBe(2)
      expect(state.baseline.averageAnswerTimeMs).toBe(6000) // (5000+7000)/2
      expect(state.baseline.typicalWordCount).toBe(15) // (10+20)/2
    })
  })

  describe('Score Thresholds - Generous', () => {
    it('has high thresholds to avoid false positives', () => {
      // Multiple fast answers should not immediately trigger intervention
      const signalsNeeded = Math.ceil(
        SCORE_THRESHOLDS.GENTLE_CHECK / SIGNAL_WEIGHTS.fast_correct_answer
      )

      // Should need at least 10 signals for gentle check
      expect(signalsNeeded).toBeGreaterThanOrEqual(10)
    })

    it('requires significant accumulation for gate increase', () => {
      const signalsNeeded = Math.ceil(
        SCORE_THRESHOLDS.INCREASE_GATES / SIGNAL_WEIGHTS.explanation_gap
      )

      // Should need 8+ explanation gaps for gate increase
      expect(signalsNeeded).toBeGreaterThanOrEqual(8)
    })
  })
})
