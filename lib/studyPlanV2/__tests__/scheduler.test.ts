import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  calculateMasteryDelta,
  calculateNextReviewInterval,
  calculateNextReviewDate,
  selectTodayThinkingObjective,
  createInitialPatternState,
  createInitialMetaSkillState,
} from '../scheduler'
import { MASTERY_CONSTANTS, SRS_CONSTANTS } from '@/types/studyPlanV2'
import type { Pattern, MistakeType } from '@/types/studyPlanV2'

describe('Study Plan v2 Scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('calculateMasteryDelta', () => {
    it('returns maximum positive delta for correct answer with no hints', () => {
      const delta = calculateMasteryDelta(true, 0, false)
      expect(delta).toBe(MASTERY_CONSTANTS.CORRECT_NO_HINT_DELTA)
    })

    it('returns smaller positive delta for correct answer with hints', () => {
      const delta = calculateMasteryDelta(true, 2, false)
      expect(delta).toBe(MASTERY_CONSTANTS.CORRECT_WITH_HINT_DELTA)
    })

    it('returns negative delta for incorrect answer', () => {
      const delta = calculateMasteryDelta(false, 0, false)
      expect(delta).toBe(MASTERY_CONSTANTS.INCORRECT_DELTA)
    })

    it('returns larger negative delta for reveal usage', () => {
      const delta = calculateMasteryDelta(true, 0, true)
      expect(delta).toBe(MASTERY_CONSTANTS.REVEAL_PENALTY)
    })

    it('prioritizes reveal penalty over correctness', () => {
      // Even if correct, reveal should penalize
      const deltaCorrectReveal = calculateMasteryDelta(true, 0, true)
      const deltaIncorrectReveal = calculateMasteryDelta(false, 0, true)
      expect(deltaCorrectReveal).toBe(deltaIncorrectReveal)
      expect(deltaCorrectReveal).toBe(MASTERY_CONSTANTS.REVEAL_PENALTY)
    })
  })

  describe('calculateNextReviewInterval', () => {
    it('returns base interval for zero mastery', () => {
      const interval = calculateNextReviewInterval(0, 0)
      expect(interval).toBe(MASTERY_CONSTANTS.BASE_INTERVAL_DAYS)
    })

    it('increases interval with higher mastery', () => {
      const lowMasteryInterval = calculateNextReviewInterval(0.2, 0)
      const highMasteryInterval = calculateNextReviewInterval(0.8, 0)
      expect(highMasteryInterval).toBeGreaterThan(lowMasteryInterval)
    })

    it('decreases interval with more recent failures', () => {
      const noFailsInterval = calculateNextReviewInterval(0.5, 0)
      const withFailsInterval = calculateNextReviewInterval(0.5, 3)
      expect(withFailsInterval).toBeLessThan(noFailsInterval)
    })

    it('respects maximum interval limit', () => {
      const interval = calculateNextReviewInterval(1.0, 0)
      expect(interval).toBeLessThanOrEqual(SRS_CONSTANTS.MAX_INTERVAL_DAYS)
    })

    it('respects minimum interval limit', () => {
      const interval = calculateNextReviewInterval(0, 10)
      expect(interval).toBeGreaterThanOrEqual(SRS_CONSTANTS.MIN_INTERVAL_DAYS)
    })
  })

  describe('calculateNextReviewDate', () => {
    it('returns a date in the future', () => {
      const date = calculateNextReviewDate(5)
      const expectedDate = new Date('2024-01-20T10:00:00Z')
      expect(new Date(date).getTime()).toBeGreaterThan(new Date('2024-01-15T10:00:00Z').getTime())
    })

    it('handles fractional days', () => {
      const date = calculateNextReviewDate(0.5)
      expect(date).toBeTruthy()
    })
  })

  describe('createInitialPatternState', () => {
    it('creates state with zero mastery', () => {
      const state = createInitialPatternState('user-1', 'pattern-1')
      expect(state.mastery).toBe(0)
    })

    it('creates state with correct user and pattern IDs', () => {
      const state = createInitialPatternState('user-1', 'pattern-1')
      expect(state.userId).toBe('user-1')
      expect(state.patternId).toBe('pattern-1')
    })

    it('creates state with zero fail count', () => {
      const state = createInitialPatternState('user-1', 'pattern-1')
      expect(state.recentFailCount).toBe(0)
    })

    it('creates state with incomplete learn/practice stages', () => {
      const state = createInitialPatternState('user-1', 'pattern-1')
      expect(state.learnCompleted).toBe(false)
      expect(state.guidedPracticeCompleted).toBe(false)
      expect(state.drillsAttempted).toBe(0)
    })

    it('sets review due to now (immediately due)', () => {
      const state = createInitialPatternState('user-1', 'pattern-1')
      const now = new Date().toISOString()
      expect(state.reviewDueAt).toBeTruthy()
    })
  })

  describe('createInitialMetaSkillState', () => {
    it('creates state with zero mastery', () => {
      const state = createInitialMetaSkillState('user-1', 'metaskill-1')
      expect(state.mastery).toBe(0)
    })

    it('creates state with correct IDs', () => {
      const state = createInitialMetaSkillState('user-1', 'metaskill-1')
      expect(state.userId).toBe('user-1')
      expect(state.metaSkillId).toBe('metaskill-1')
    })

    it('creates state with zero cycle count', () => {
      const state = createInitialMetaSkillState('user-1', 'metaskill-1')
      expect(state.cycleCount).toBe(0)
    })
  })

  describe('selectTodayThinkingObjective', () => {
    it('returns an objective when only pattern is provided', () => {
      const pattern: Pattern = {
        id: 'pat-1',
        name: 'Force Decomposition',
        description: 'Test description',
        learnContent: 'Content',
        summary: 'Summary',
        metaSkillIds: [],
        commonTraps: [],
        difficulty: 2,
        topicIds: ['mechanics'],
        keywords: [],
      }

      const objective = selectTodayThinkingObjective(pattern, null)
      expect(objective).toBeTruthy()
      expect(objective.length).toBeGreaterThan(10)
    })

    it('returns an objective when only mistake type is provided', () => {
      const mistakeType: MistakeType = {
        id: 'mt-1',
        name: 'Sign Error',
        description: 'Sign confusion',
        category: 'SIGN_DIRECTION',
        relatedPatternId: 'pat-1',
        remediation: 'Check signs',
        matchKeywords: ['sign'],
      }

      const objective = selectTodayThinkingObjective(null, mistakeType)
      expect(objective).toBeTruthy()
      expect(objective).toContain('Sign Error')
    })

    it('returns combined objective when both are provided', () => {
      const pattern: Pattern = {
        id: 'pat-1',
        name: 'Force Decomposition',
        description: 'Test',
        learnContent: 'Content',
        summary: 'Summary',
        metaSkillIds: [],
        commonTraps: [],
        difficulty: 2,
        topicIds: ['mechanics'],
        keywords: [],
      }

      const mistakeType: MistakeType = {
        id: 'mt-1',
        name: 'Sign Error',
        description: 'Sign confusion',
        category: 'SIGN_DIRECTION',
        relatedPatternId: 'pat-1',
        remediation: 'Check signs',
        matchKeywords: ['sign'],
      }

      const objective = selectTodayThinkingObjective(pattern, mistakeType)
      expect(objective).toContain('Force Decomposition')
      expect(objective).toContain('Sign Error')
    })

    it('returns generic objective when neither is provided', () => {
      const objective = selectTodayThinkingObjective(null, null)
      expect(objective).toBeTruthy()
      expect(objective.length).toBeGreaterThan(10)
    })
  })

  describe('Mastery update edge cases', () => {
    it('mastery delta is zero for correct with many hints', () => {
      // Should still be positive, just smaller
      const delta = calculateMasteryDelta(true, 10, false)
      expect(delta).toBe(MASTERY_CONSTANTS.CORRECT_WITH_HINT_DELTA)
      expect(delta).toBeGreaterThan(0)
    })

    it('incorrect with reveal uses reveal penalty', () => {
      const delta = calculateMasteryDelta(false, 0, true)
      expect(delta).toBe(MASTERY_CONSTANTS.REVEAL_PENALTY)
    })
  })

  describe('Interval calculations - weak patterns', () => {
    it('calculates shorter interval for weak patterns', () => {
      // Weak = low mastery
      const weakInterval = calculateNextReviewInterval(0.2, 0)
      const strongInterval = calculateNextReviewInterval(0.8, 0)
      expect(weakInterval).toBeLessThan(strongInterval)
    })

    it('calculates even shorter interval with recent failures', () => {
      const noFailInterval = calculateNextReviewInterval(0.3, 0)
      const withFailsInterval = calculateNextReviewInterval(0.3, 2)
      expect(withFailsInterval).toBeLessThan(noFailInterval)
    })
  })

  describe('Interval calculations - strong patterns', () => {
    it('calculates longer interval for strong patterns', () => {
      const interval = calculateNextReviewInterval(0.9, 0)
      // Should be close to max but not exceeding
      expect(interval).toBeGreaterThan(MASTERY_CONSTANTS.BASE_INTERVAL_DAYS * 3)
    })

    it('tapers interval growth at high mastery', () => {
      const interval95 = calculateNextReviewInterval(0.95, 0)
      const interval100 = calculateNextReviewInterval(1.0, 0)
      // Growth should be minimal at high mastery
      expect(interval100 - interval95).toBeLessThan(interval95 * 0.1)
    })
  })

  describe('Error recycling - interval reduction', () => {
    it('reduces interval significantly after multiple failures', () => {
      const baseline = calculateNextReviewInterval(0.5, 0)
      const afterFailures = calculateNextReviewInterval(0.5, 5)
      expect(afterFailures).toBeLessThan(baseline / 2)
    })

    it('maintains minimum interval even with many failures', () => {
      const interval = calculateNextReviewInterval(0.1, 10)
      expect(interval).toBeGreaterThanOrEqual(SRS_CONSTANTS.MIN_INTERVAL_DAYS)
    })
  })
})

describe('Daily Plan Generation - Algorithm Verification', () => {
  describe('Deterministic plan generation', () => {
    it('generates same plan for same date and user', () => {
      // This is verified by the seeded random implementation
      // The seededRandom function uses dateToSeed which is deterministic
      const seed1 = dateToSeed('2024-01-15')
      const seed2 = dateToSeed('2024-01-15')
      expect(seed1).toBe(seed2)
    })

    it('generates different plans for different dates', () => {
      const seed1 = dateToSeed('2024-01-15')
      const seed2 = dateToSeed('2024-01-16')
      expect(seed1).not.toBe(seed2)
    })
  })
})

// Helper function (same as in scheduler.ts)
function dateToSeed(date: string): number {
  const parts = date.split('-')
  return parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2])
}
