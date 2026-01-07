/**
 * Pivot Injection Policy Tests
 *
 * Tests for deterministic pivot trigger decisions.
 */

import { describe, it, expect } from 'vitest'
import {
  shouldTriggerPivot,
  selectPivotQuestion,
  calculatePivotTimeBonus,
  getPivotsByCategory,
  getPivotsForPatterns,
  PIVOT_THRESHOLDS,
  DEFAULT_PIVOT_QUESTIONS,
} from '../pivot-policy'
import {
  createPivotSessionState,
  triggerPivot,
  PIVOT_POLICY_CONSTANTS,
} from '../../entities/pivot'
import type { PivotTrigger } from '@/types/pivot'

describe('shouldTriggerPivot', () => {
  const createBaseTrigger = (overrides?: Partial<PivotTrigger>): PivotTrigger => ({
    stepId: 'step_0',
    stepIndex: 0,
    timeSpentSeconds: 60,
    attemptCount: 0,
    hintLevel: 0,
    ...overrides,
  })

  it('should not trigger if time is below minimum threshold', () => {
    const trigger = createBaseTrigger({ timeSpentSeconds: 30 }) // Less than 60s
    const sessionState = createPivotSessionState({
      sessionId: 'test',
      userId: 'user1',
      stepCount: 5,
    })

    const result = shouldTriggerPivot(trigger, sessionState, 'medium')

    expect(result.shouldTrigger).toBe(false)
    expect(result.reason).toBe('not_enough_time')
  })

  it('should trigger when time threshold exceeded for medium difficulty', () => {
    const trigger = createBaseTrigger({
      timeSpentSeconds: PIVOT_THRESHOLDS.MEDIUM_STEP_TIME + 1,
    })
    const sessionState = createPivotSessionState({
      sessionId: 'test',
      userId: 'user1',
      stepCount: 5,
    })

    const result = shouldTriggerPivot(trigger, sessionState, 'medium')

    expect(result.shouldTrigger).toBe(true)
    expect(result.reason).toBe('time_threshold_exceeded')
    expect(result.suggestedPivot).toBeDefined()
  })

  it('should use lower time threshold for easy steps', () => {
    const trigger = createBaseTrigger({
      timeSpentSeconds: PIVOT_THRESHOLDS.EASY_STEP_TIME + 1,
    })
    const sessionState = createPivotSessionState({
      sessionId: 'test',
      userId: 'user1',
      stepCount: 5,
    })

    const result = shouldTriggerPivot(trigger, sessionState, 'easy')

    expect(result.shouldTrigger).toBe(true)
    expect(result.reason).toBe('time_threshold_exceeded')
  })

  it('should use higher time threshold for hard steps', () => {
    const trigger = createBaseTrigger({
      timeSpentSeconds: PIVOT_THRESHOLDS.MEDIUM_STEP_TIME + 1, // Above medium but below hard
    })
    const sessionState = createPivotSessionState({
      sessionId: 'test',
      userId: 'user1',
      stepCount: 5,
    })

    const result = shouldTriggerPivot(trigger, sessionState, 'hard')

    // Should NOT trigger because hard threshold is higher
    expect(result.shouldTrigger).toBe(false)
  })

  it('should trigger on multiple wrong attempts', () => {
    const trigger = createBaseTrigger({
      timeSpentSeconds: 90, // Above minimum but below time threshold
      attemptCount: PIVOT_THRESHOLDS.WRONG_ATTEMPTS_MEDIUM,
    })
    const sessionState = createPivotSessionState({
      sessionId: 'test',
      userId: 'user1',
      stepCount: 5,
    })

    const result = shouldTriggerPivot(trigger, sessionState, 'medium')

    expect(result.shouldTrigger).toBe(true)
    expect(result.reason).toBe('multiple_wrong_attempts')
  })

  it('should trigger on hint escalation', () => {
    const trigger = createBaseTrigger({
      timeSpentSeconds: 90,
      attemptCount: 1,
      hintLevel: PIVOT_THRESHOLDS.HINT_LEVEL_TRIGGER,
    })
    const sessionState = createPivotSessionState({
      sessionId: 'test',
      userId: 'user1',
      stepCount: 5,
    })

    const result = shouldTriggerPivot(trigger, sessionState, 'medium')

    expect(result.shouldTrigger).toBe(true)
    expect(result.reason).toBe('hint_escalation')
  })

  it('should not trigger if max pivots per session reached', () => {
    let sessionState = createPivotSessionState({
      sessionId: 'test',
      userId: 'user1',
      stepCount: 10,
    })

    // Trigger max pivots
    for (let i = 0; i < PIVOT_POLICY_CONSTANTS.MAX_PIVOTS_PER_SESSION; i++) {
      sessionState = triggerPivot(
        sessionState,
        i,
        DEFAULT_PIVOT_QUESTIONS[0],
        100
      )
    }

    const trigger = createBaseTrigger({
      stepIndex: 5,
      timeSpentSeconds: 200,
    })

    const result = shouldTriggerPivot(trigger, sessionState, 'medium')

    expect(result.shouldTrigger).toBe(false)
    expect(result.reason).toBe('max_pivots_reached')
  })

  it('should not trigger during cooldown period', () => {
    const trigger = createBaseTrigger({
      timeSpentSeconds: 150,
    })
    const sessionState = createPivotSessionState({
      sessionId: 'test',
      userId: 'user1',
      stepCount: 5,
    })

    // Last pivot was 60 seconds ago (less than cooldown)
    const lastPivotTime = new Date(
      Date.now() - 60 * 1000
    ).toISOString()

    const result = shouldTriggerPivot(
      trigger,
      sessionState,
      'medium',
      lastPivotTime
    )

    expect(result.shouldTrigger).toBe(false)
    expect(result.reason).toBe('recently_triggered')
  })

  it('should trigger after cooldown period', () => {
    const trigger = createBaseTrigger({
      timeSpentSeconds: 150,
    })
    const sessionState = createPivotSessionState({
      sessionId: 'test',
      userId: 'user1',
      stepCount: 5,
    })

    // Last pivot was 3 minutes ago (more than cooldown)
    const lastPivotTime = new Date(
      Date.now() - 180 * 1000
    ).toISOString()

    const result = shouldTriggerPivot(
      trigger,
      sessionState,
      'medium',
      lastPivotTime
    )

    expect(result.shouldTrigger).toBe(true)
  })

  it('should be deterministic (same inputs = same outputs)', () => {
    const trigger = createBaseTrigger({
      timeSpentSeconds: 150,
      patternId: 'collision',
    })
    const sessionState = createPivotSessionState({
      sessionId: 'test',
      userId: 'user1',
      stepCount: 5,
    })

    const result1 = shouldTriggerPivot(trigger, sessionState, 'medium')
    const result2 = shouldTriggerPivot(trigger, sessionState, 'medium')

    expect(result1.shouldTrigger).toBe(result2.shouldTrigger)
    expect(result1.reason).toBe(result2.reason)
    expect(result1.suggestedPivot?.id).toBe(result2.suggestedPivot?.id)
  })
})

describe('selectPivotQuestion', () => {
  it('should return a pivot question', () => {
    const pivot = selectPivotQuestion()

    expect(pivot).toBeDefined()
    expect(pivot.id).toBeDefined()
    expect(pivot.questionText).toBeDefined()
  })

  it('should prioritize pivots matching pattern', () => {
    const pivot = selectPivotQuestion('collision')

    // Should select a pivot that relates to collisions
    expect(pivot.triggerPatterns.some(p =>
      p === '*' || p.includes('collision') || 'collision'.includes(p)
    )).toBe(true)
  })

  it('should exclude specified IDs', () => {
    const excludeIds = [DEFAULT_PIVOT_QUESTIONS[0].id]
    const pivot = selectPivotQuestion(undefined, excludeIds)

    expect(excludeIds.includes(pivot.id)).toBe(false)
  })

  it('should be deterministic for same pattern', () => {
    const pivot1 = selectPivotQuestion('friction')
    const pivot2 = selectPivotQuestion('friction')

    expect(pivot1.id).toBe(pivot2.id)
  })
})

describe('calculatePivotTimeBonus', () => {
  it('should return bonus for correct MCQ answer', () => {
    const pivot = DEFAULT_PIVOT_QUESTIONS.find(p => p.type === 'mcq')!
    const correctAnswer = pivot.correctAnswer!

    const bonus = calculatePivotTimeBonus(pivot, correctAnswer, true)

    expect(bonus).toBe(PIVOT_POLICY_CONSTANTS.CORRECT_PIVOT_TIME_BONUS_SECONDS)
  })

  it('should return no bonus for wrong MCQ answer', () => {
    const pivot = DEFAULT_PIVOT_QUESTIONS.find(p => p.type === 'mcq')!

    const bonus = calculatePivotTimeBonus(pivot, 'wrong answer', true)

    expect(bonus).toBe(0)
  })

  it('should return bonus for helpful reflection', () => {
    const pivot = DEFAULT_PIVOT_QUESTIONS.find(p => p.type === 'reflection')!

    const bonus = calculatePivotTimeBonus(pivot, 'any answer', true)

    expect(bonus).toBe(PIVOT_POLICY_CONSTANTS.CORRECT_PIVOT_TIME_BONUS_SECONDS)
  })

  it('should return no bonus for unhelpful reflection', () => {
    const pivot = DEFAULT_PIVOT_QUESTIONS.find(p => p.type === 'reflection')!

    const bonus = calculatePivotTimeBonus(pivot, 'any answer', false)

    expect(bonus).toBe(0)
  })

  it('should return partial bonus for substantial short answer', () => {
    const pivot = DEFAULT_PIVOT_QUESTIONS.find(p => p.type === 'short')!

    const bonus = calculatePivotTimeBonus(
      pivot,
      'This is a substantial answer with more than ten characters',
      true
    )

    expect(bonus).toBeGreaterThan(0)
    expect(bonus).toBeLessThan(PIVOT_POLICY_CONSTANTS.CORRECT_PIVOT_TIME_BONUS_SECONDS)
  })
})

describe('getPivotsByCategory', () => {
  it('should return pivots for specified category', () => {
    const simplifyPivots = getPivotsByCategory('simplify')

    expect(simplifyPivots.length).toBeGreaterThan(0)
    expect(simplifyPivots.every(p => p.category === 'simplify')).toBe(true)
  })

  it('should return different pivots for different categories', () => {
    const simplifyPivots = getPivotsByCategory('simplify')
    const constraintPivots = getPivotsByCategory('constraint')

    const simplifyIds = simplifyPivots.map(p => p.id)
    const constraintIds = constraintPivots.map(p => p.id)

    // No overlap
    expect(simplifyIds.some(id => constraintIds.includes(id))).toBe(false)
  })
})

describe('getPivotsForPatterns', () => {
  it('should return pivots matching patterns', () => {
    const pivots = getPivotsForPatterns(['friction', 'force'])

    expect(pivots.length).toBeGreaterThan(0)
    // Each returned pivot should match at least one pattern
    pivots.forEach(pivot => {
      const hasMatch = pivot.triggerPatterns.some(
        tp =>
          tp === '*' ||
          tp.includes('friction') ||
          tp.includes('force') ||
          'friction'.includes(tp) ||
          'force'.includes(tp)
      )
      expect(hasMatch).toBe(true)
    })
  })

  it('should include universal (*) pivots', () => {
    const pivots = getPivotsForPatterns(['random_pattern'])

    // Should include pivots with '*' trigger pattern
    const universalPivots = pivots.filter(p => p.triggerPatterns.includes('*'))
    expect(universalPivots.length).toBeGreaterThan(0)
  })
})

describe('DEFAULT_PIVOT_QUESTIONS', () => {
  it('should have pivots for all categories', () => {
    const categories = ['simplify', 'analogy', 'constraint', 'decompose', 'visualize', 'reverse']

    categories.forEach(category => {
      const pivots = DEFAULT_PIVOT_QUESTIONS.filter(p => p.category === category)
      expect(pivots.length).toBeGreaterThan(0)
    })
  })

  it('should have valid question structure', () => {
    DEFAULT_PIVOT_QUESTIONS.forEach(pivot => {
      expect(pivot.id).toBeDefined()
      expect(pivot.questionText.length).toBeGreaterThan(10)
      expect(pivot.explanation.length).toBeGreaterThan(0)
      expect(['mcq', 'short', 'reflection']).toContain(pivot.type)
      expect(pivot.triggerPatterns.length).toBeGreaterThan(0)

      if (pivot.type === 'mcq') {
        expect(pivot.choices).toBeDefined()
        expect(pivot.choices!.length).toBeGreaterThanOrEqual(2)
        expect(pivot.correctAnswer).toBeDefined()
      }
    })
  })
})
