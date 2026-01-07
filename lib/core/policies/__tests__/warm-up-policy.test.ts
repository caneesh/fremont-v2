/**
 * Warm-Up Policy Tests
 *
 * Tests for deterministic drill selection based on spaced repetition decay.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateSelectionScore,
  selectWarmUpBlocks,
  calculateDecayScore,
  canSkipWarmUp,
  calculateSkipPenalty,
  shouldAssignWarmUp,
  DEFAULT_WARMUP_BLOCKS,
  WARMUP_SELECTION_THRESHOLDS,
} from '../warm-up-policy'
import type { PatternDecayScore, WarmUpSelectionInput, WarmUpSkipRecord } from '@/types/warmUp'

describe('calculateSelectionScore', () => {
  it('should give higher score to higher decay', () => {
    const highDecay: PatternDecayScore = {
      patternId: 'p1',
      topicId: 'vector_component',
      mastery: 0.5,
      decayScore: 0.8,
      daysSinceLastSeen: 10,
    }

    const lowDecay: PatternDecayScore = {
      patternId: 'p2',
      topicId: 'sign_convention',
      mastery: 0.5,
      decayScore: 0.2,
      daysSinceLastSeen: 2,
    }

    const highScore = calculateSelectionScore(highDecay, [])
    const lowScore = calculateSelectionScore(lowDecay, [])

    expect(highScore).toBeGreaterThan(lowScore)
  })

  it('should give higher score to lower mastery', () => {
    const lowMastery: PatternDecayScore = {
      patternId: 'p1',
      topicId: 'vector_component',
      mastery: 0.2,
      decayScore: 0.5,
      daysSinceLastSeen: 5,
    }

    const highMastery: PatternDecayScore = {
      patternId: 'p2',
      topicId: 'sign_convention',
      mastery: 0.9,
      decayScore: 0.5,
      daysSinceLastSeen: 5,
    }

    const lowMasteryScore = calculateSelectionScore(lowMastery, [])
    const highMasteryScore = calculateSelectionScore(highMastery, [])

    expect(lowMasteryScore).toBeGreaterThan(highMasteryScore)
  })

  it('should boost score for topics with recent mistakes', () => {
    const pattern: PatternDecayScore = {
      patternId: 'p1',
      topicId: 'vector_component',
      mastery: 0.5,
      decayScore: 0.5,
      daysSinceLastSeen: 5,
    }

    const scoreWithMistake = calculateSelectionScore(pattern, ['vector_component'])
    const scoreWithoutMistake = calculateSelectionScore(pattern, [])

    expect(scoreWithMistake).toBeGreaterThan(scoreWithoutMistake)
    expect(scoreWithMistake - scoreWithoutMistake).toBeCloseTo(
      WARMUP_SELECTION_THRESHOLDS.RECENT_MISTAKE_WEIGHT
    )
  })
})

describe('selectWarmUpBlocks', () => {
  it('should select blocks deterministically (same input = same output)', () => {
    const input: WarmUpSelectionInput = {
      tenantId: 'test',
      userId: 'user1',
      date: '2025-01-01',
      patternStates: [
        {
          patternId: 'p1',
          topicId: 'vector_component',
          mastery: 0.3,
          decayScore: 0.7,
          daysSinceLastSeen: 8,
        },
        {
          patternId: 'p2',
          topicId: 'sign_convention',
          mastery: 0.5,
          decayScore: 0.5,
          daysSinceLastSeen: 5,
        },
        {
          patternId: 'p3',
          topicId: 'trig_identity',
          mastery: 0.6,
          decayScore: 0.3,
          daysSinceLastSeen: 3,
        },
      ],
      recentMistakeTypes: [],
      maxBlocks: 2,
      maxDurationMinutes: 5,
    }

    const result1 = selectWarmUpBlocks(input, DEFAULT_WARMUP_BLOCKS)
    const result2 = selectWarmUpBlocks(input, DEFAULT_WARMUP_BLOCKS)

    expect(result1.selectedBlocks.length).toBe(result2.selectedBlocks.length)
    expect(result1.selectedBlocks.map(b => b.id)).toEqual(
      result2.selectedBlocks.map(b => b.id)
    )
    expect(result1.totalDurationMinutes).toBe(result2.totalDurationMinutes)
  })

  it('should respect maxBlocks constraint', () => {
    const input: WarmUpSelectionInput = {
      tenantId: 'test',
      userId: 'user1',
      date: '2025-01-01',
      patternStates: [
        { patternId: 'p1', topicId: 'vector_component', mastery: 0.3, decayScore: 0.7, daysSinceLastSeen: 8 },
        { patternId: 'p2', topicId: 'sign_convention', mastery: 0.3, decayScore: 0.7, daysSinceLastSeen: 8 },
        { patternId: 'p3', topicId: 'trig_identity', mastery: 0.3, decayScore: 0.7, daysSinceLastSeen: 8 },
        { patternId: 'p4', topicId: 'unit_conversion', mastery: 0.3, decayScore: 0.7, daysSinceLastSeen: 8 },
      ],
      recentMistakeTypes: [],
      maxBlocks: 2,
      maxDurationMinutes: 20, // High to not be the constraint
    }

    const result = selectWarmUpBlocks(input, DEFAULT_WARMUP_BLOCKS)

    expect(result.selectedBlocks.length).toBeLessThanOrEqual(2)
  })

  it('should respect maxDurationMinutes constraint', () => {
    const input: WarmUpSelectionInput = {
      tenantId: 'test',
      userId: 'user1',
      date: '2025-01-01',
      patternStates: [
        { patternId: 'p1', topicId: 'vector_component', mastery: 0.3, decayScore: 0.7, daysSinceLastSeen: 8 },
        { patternId: 'p2', topicId: 'sign_convention', mastery: 0.3, decayScore: 0.7, daysSinceLastSeen: 8 },
        { patternId: 'p3', topicId: 'conservation_scope', mastery: 0.3, decayScore: 0.7, daysSinceLastSeen: 8 },
      ],
      recentMistakeTypes: [],
      maxBlocks: 10, // High to not be the constraint
      maxDurationMinutes: 5,
    }

    const result = selectWarmUpBlocks(input, DEFAULT_WARMUP_BLOCKS)

    expect(result.totalDurationMinutes).toBeLessThanOrEqual(5)
  })

  it('should exclude high mastery topics unless heavily decayed', () => {
    const input: WarmUpSelectionInput = {
      tenantId: 'test',
      userId: 'user1',
      date: '2025-01-01',
      patternStates: [
        {
          patternId: 'p1',
          topicId: 'vector_component',
          mastery: 0.95, // Very high mastery
          decayScore: 0.3, // Low decay
          daysSinceLastSeen: 3,
        },
      ],
      recentMistakeTypes: [],
      maxBlocks: 3,
      maxDurationMinutes: 10,
    }

    const result = selectWarmUpBlocks(input, DEFAULT_WARMUP_BLOCKS)

    // Should not include the high mastery topic
    const vectorBlock = result.selectedBlocks.find(b => b.topicId === 'vector_component')
    expect(vectorBlock).toBeUndefined()
  })

  it('should include high mastery topics if heavily decayed', () => {
    const input: WarmUpSelectionInput = {
      tenantId: 'test',
      userId: 'user1',
      date: '2025-01-01',
      patternStates: [
        {
          patternId: 'p1',
          topicId: 'vector_component',
          mastery: 0.9,
          decayScore: 0.75, // High decay threshold
          daysSinceLastSeen: 14,
        },
      ],
      recentMistakeTypes: [],
      maxBlocks: 3,
      maxDurationMinutes: 10,
    }

    const result = selectWarmUpBlocks(input, DEFAULT_WARMUP_BLOCKS)

    // Should include despite high mastery due to high decay
    const vectorBlock = result.selectedBlocks.find(b => b.topicId === 'vector_component')
    expect(vectorBlock).toBeDefined()
  })

  it('should prioritize topics with recent mistakes', () => {
    const input: WarmUpSelectionInput = {
      tenantId: 'test',
      userId: 'user1',
      date: '2025-01-01',
      patternStates: [
        {
          patternId: 'p1',
          topicId: 'vector_component',
          mastery: 0.5,
          decayScore: 0.4,
          daysSinceLastSeen: 4,
        },
        {
          patternId: 'p2',
          topicId: 'sign_convention',
          mastery: 0.5,
          decayScore: 0.4,
          daysSinceLastSeen: 4,
        },
      ],
      recentMistakeTypes: ['sign_convention'], // Recent mistake on sign_convention
      maxBlocks: 1, // Only pick one
      maxDurationMinutes: 10,
    }

    const result = selectWarmUpBlocks(input, DEFAULT_WARMUP_BLOCKS)

    // Should prioritize sign_convention due to recent mistake
    expect(result.selectedBlocks.length).toBe(1)
    expect(result.selectedBlocks[0].topicId).toBe('sign_convention')
  })

  it('should return empty selection when no eligible topics', () => {
    const input: WarmUpSelectionInput = {
      tenantId: 'test',
      userId: 'user1',
      date: '2025-01-01',
      patternStates: [], // No patterns
      recentMistakeTypes: [],
      maxBlocks: 3,
      maxDurationMinutes: 10,
    }

    const result = selectWarmUpBlocks(input, DEFAULT_WARMUP_BLOCKS)

    expect(result.selectedBlocks.length).toBe(0)
    expect(result.totalDurationMinutes).toBe(0)
  })
})

describe('calculateDecayScore', () => {
  it('should return 0 for topics seen today', () => {
    const score = calculateDecayScore(0.5, 0)
    expect(score).toBe(0)
  })

  it('should return higher score for longer time since last seen', () => {
    const score5days = calculateDecayScore(0.5, 5)
    const score10days = calculateDecayScore(0.5, 10)

    expect(score10days).toBeGreaterThan(score5days)
  })

  it('should return higher score for lower mastery', () => {
    const lowMasteryScore = calculateDecayScore(0.2, 7)
    const highMasteryScore = calculateDecayScore(0.8, 7)

    expect(lowMasteryScore).toBeGreaterThan(highMasteryScore)
  })

  it('should cap at 1.0', () => {
    const score = calculateDecayScore(0, 100) // Very long time, no mastery
    expect(score).toBeLessThanOrEqual(1)
  })
})

describe('canSkipWarmUp', () => {
  it('should allow skip when no previous skip record', () => {
    const result = canSkipWarmUp(null, '2025-01-01')
    expect(result.canSkip).toBe(true)
  })

  it('should allow skip when last skip was on different day', () => {
    const skipRecord: WarmUpSkipRecord = {
      userId: 'user1',
      tenantId: 'test',
      lastSkipDate: '2024-12-31',
      skipCount: 5,
    }

    const result = canSkipWarmUp(skipRecord, '2025-01-01')
    expect(result.canSkip).toBe(true)
  })

  it('should deny skip when already skipped today', () => {
    const skipRecord: WarmUpSkipRecord = {
      userId: 'user1',
      tenantId: 'test',
      lastSkipDate: '2025-01-01',
      skipCount: 1,
    }

    const result = canSkipWarmUp(skipRecord, '2025-01-01')
    expect(result.canSkip).toBe(false)
    expect(result.reason).toBeDefined()
  })
})

describe('calculateSkipPenalty', () => {
  it('should calculate penalty for each skipped topic', () => {
    const blocks = [
      { id: 'b1', topicId: 'vector_component', title: '', description: '', durationMinutes: 3, drillTemplateIds: [], difficulty: 'easy' as const },
      { id: 'b2', topicId: 'sign_convention', title: '', description: '', durationMinutes: 2, drillTemplateIds: [], difficulty: 'easy' as const },
    ]

    const result = calculateSkipPenalty(blocks)

    expect(Object.keys(result.penaltyPerTopic).length).toBe(2)
    expect(result.totalPenalty).toBe(-0.1) // 2 * -0.05
  })

  it('should return empty penalty for no blocks', () => {
    const result = calculateSkipPenalty([])

    expect(Object.keys(result.penaltyPerTopic).length).toBe(0)
    expect(result.totalPenalty).toBeCloseTo(0) // Use toBeCloseTo to handle -0 vs 0
  })
})

describe('shouldAssignWarmUp', () => {
  it('should not assign if already completed today', () => {
    const patternStates: PatternDecayScore[] = [
      { patternId: 'p1', topicId: 'vector_component', mastery: 0.3, decayScore: 0.7, daysSinceLastSeen: 8 },
    ]

    const result = shouldAssignWarmUp(patternStates, '2025-01-01', '2025-01-01')
    expect(result).toBe(false)
  })

  it('should assign if decayed topics exist', () => {
    const patternStates: PatternDecayScore[] = [
      { patternId: 'p1', topicId: 'vector_component', mastery: 0.7, decayScore: 0.25, daysSinceLastSeen: 3 },
    ]

    const result = shouldAssignWarmUp(patternStates, '2025-01-01')
    expect(result).toBe(true)
  })

  it('should assign if low mastery topics exist', () => {
    const patternStates: PatternDecayScore[] = [
      { patternId: 'p1', topicId: 'vector_component', mastery: 0.3, decayScore: 0.1, daysSinceLastSeen: 1 },
    ]

    const result = shouldAssignWarmUp(patternStates, '2025-01-01')
    expect(result).toBe(true)
  })

  it('should not assign if all topics have high mastery and low decay', () => {
    const patternStates: PatternDecayScore[] = [
      { patternId: 'p1', topicId: 'vector_component', mastery: 0.9, decayScore: 0.1, daysSinceLastSeen: 1 },
    ]

    const result = shouldAssignWarmUp(patternStates, '2025-01-01')
    expect(result).toBe(false)
  })
})
