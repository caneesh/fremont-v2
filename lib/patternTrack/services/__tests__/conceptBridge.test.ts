import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  findMiniProblemsForWeakConcepts,
  getMiniProblemForPattern,
} from '../conceptBridge'
import {
  setRepositoryFactory,
  resetRepositoryFactory,
  type IRepositoryFactory,
  type IPatternRepository,
  type IQuestionRepository,
} from '../../repositories'
import type { Pattern, Question } from '../../schema'

// Sample test data
const mockPatterns: Pattern[] = [
  {
    id: 'pattern_newton_2',
    name: "Newton's Second Law Application",
    description: 'Applying F = ma',
    category: 'mechanics',
    difficulty: 2,
    recognition_cues: ['Object accelerating'],
    common_pitfalls: ['Wrong sign'],
    related_pattern_ids: [],
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'pattern_friction',
    name: 'Friction Force Analysis',
    description: 'Analyzing friction forces',
    category: 'mechanics',
    difficulty: 2,
    recognition_cues: ['Rough surface'],
    common_pitfalls: ['Wrong friction type'],
    related_pattern_ids: [],
    display_order: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'pattern_energy_conservation',
    name: 'Conservation of Mechanical Energy',
    description: 'Energy conservation principles',
    category: 'mechanics',
    difficulty: 3,
    recognition_cues: ['Height changes'],
    common_pitfalls: ['Forgetting friction'],
    related_pattern_ids: [],
    display_order: 5,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'pattern_inclined_plane',
    name: 'Inclined Plane Analysis',
    description: 'Motion on inclines',
    category: 'mechanics',
    difficulty: 3,
    recognition_cues: ['Incline angle'],
    common_pitfalls: ['Wrong component'],
    related_pattern_ids: [],
    display_order: 4,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'pattern_momentum_conservation',
    name: 'Conservation of Momentum',
    description: 'Momentum conservation in collisions',
    category: 'mechanics',
    difficulty: 3,
    recognition_cues: ['Collision'],
    common_pitfalls: ['Sign errors'],
    related_pattern_ids: [],
    display_order: 6,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

const mockQuestions: Question[] = [
  {
    id: 'q_mech_001',
    problem_text: 'A 5 kg block with 20 N force. Find acceleration.',
    pattern_refs: [{ pattern_id: 'pattern_newton_2', relevance: 'primary' }],
    difficulty: 1,
    category: 'mechanics',
    hints: [],
    answer: { type: 'numeric', value: 4, unit: 'm/s²' },
    solution_explanation: 'Using F = ma',
    tags: ['newton_2'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'q_mech_002',
    problem_text: 'Block on rough surface with friction coefficient 0.3.',
    pattern_refs: [{ pattern_id: 'pattern_friction', relevance: 'primary' }],
    difficulty: 2,
    category: 'mechanics',
    hints: [],
    answer: { type: 'numeric', value: 2, unit: 'm/s²' },
    solution_explanation: 'Friction calculation',
    tags: ['friction'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'q_mech_003',
    problem_text: 'Ball dropped from 20m height. Find final speed.',
    pattern_refs: [{ pattern_id: 'pattern_energy_conservation', relevance: 'primary' }],
    difficulty: 2,
    category: 'mechanics',
    hints: [],
    answer: { type: 'numeric', value: 20, unit: 'm/s' },
    solution_explanation: 'Energy conservation',
    tags: ['energy'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'q_mech_004',
    problem_text: 'Another Newton second law problem with harder difficulty.',
    pattern_refs: [{ pattern_id: 'pattern_newton_2', relevance: 'primary' }],
    difficulty: 3,
    category: 'mechanics',
    hints: [],
    answer: { type: 'numeric', value: 5, unit: 'm/s²' },
    solution_explanation: 'Complex F = ma',
    tags: ['newton_2'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'q_mech_005',
    problem_text: 'Question without primary pattern ref.',
    pattern_refs: [{ pattern_id: 'pattern_newton_2', relevance: 'secondary' }],
    difficulty: 2,
    category: 'mechanics',
    hints: [],
    answer: { type: 'numeric', value: 1, unit: 'm/s²' },
    solution_explanation: 'Test',
    tags: [],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

// Create mock repository factory
function createMockRepositoryFactory(): IRepositoryFactory {
  const mockPatternRepo: Partial<IPatternRepository> = {
    getById: vi.fn(async (id: string) => mockPatterns.find(p => p.id === id) || null),
    getByIds: vi.fn(async (ids: string[]) => mockPatterns.filter(p => ids.includes(p.id))),
  }

  const mockQuestionRepo: Partial<IQuestionRepository> = {
    getRandomForPatterns: vi.fn(async (patternIds: string[], count: number, excludeIds: string[]) => {
      const filtered = mockQuestions.filter(
        q => q.pattern_refs.some(ref => patternIds.includes(ref.pattern_id)) &&
             !excludeIds.includes(q.id)
      )
      return filtered.slice(0, count)
    }),
  }

  return {
    patterns: mockPatternRepo as IPatternRepository,
    questions: mockQuestionRepo as IQuestionRepository,
    lessons: {} as any,
    progress: {} as any,
    sessions: {} as any,
  }
}

describe('conceptBridge', () => {
  let mockFactory: IRepositoryFactory

  beforeEach(() => {
    mockFactory = createMockRepositoryFactory()
    setRepositoryFactory(mockFactory)
  })

  afterEach(() => {
    resetRepositoryFactory()
    vi.clearAllMocks()
  })

  describe('findMiniProblemsForWeakConcepts', () => {
    describe('Concept to Pattern Mapping', () => {
      it('maps exact concept names to patterns', async () => {
        const result = await findMiniProblemsForWeakConcepts(["newton's second law"], 2)

        expect(result.matchedPatterns).toHaveLength(1)
        expect(result.matchedPatterns[0].id).toBe('pattern_newton_2')
      })

      it('maps alternative concept names to same pattern', async () => {
        const result1 = await findMiniProblemsForWeakConcepts(['f = ma'], 1)
        const result2 = await findMiniProblemsForWeakConcepts(["newton's 2nd law"], 1)

        expect(result1.matchedPatterns[0]?.id).toBe('pattern_newton_2')
        expect(result2.matchedPatterns[0]?.id).toBe('pattern_newton_2')
      })

      it('handles case-insensitive matching', async () => {
        const result = await findMiniProblemsForWeakConcepts(["NEWTON'S SECOND LAW"], 1)

        expect(result.matchedPatterns).toHaveLength(1)
        expect(result.matchedPatterns[0].id).toBe('pattern_newton_2')
      })

      it('handles partial matching (concept contains key)', async () => {
        const result = await findMiniProblemsForWeakConcepts(['kinetic friction force'], 1)

        expect(result.matchedPatterns).toHaveLength(1)
        expect(result.matchedPatterns[0].id).toBe('pattern_friction')
      })

      it('handles partial matching (key contains concept)', async () => {
        const result = await findMiniProblemsForWeakConcepts(['incline'], 1)

        expect(result.matchedPatterns).toHaveLength(1)
        expect(result.matchedPatterns[0].id).toBe('pattern_inclined_plane')
      })

      it('handles fuzzy word matching', async () => {
        const result = await findMiniProblemsForWeakConcepts(['momentum conservation'], 1)

        expect(result.matchedPatterns).toHaveLength(1)
        expect(result.matchedPatterns[0].id).toBe('pattern_momentum_conservation')
      })

      it('returns empty result for unknown concepts', async () => {
        const result = await findMiniProblemsForWeakConcepts(['quantum entanglement'], 2)

        expect(result.weakConcepts).toEqual(['quantum entanglement'])
        expect(result.matchedPatterns).toHaveLength(0)
        expect(result.miniProblems).toHaveLength(0)
      })

      it('handles multiple concepts mapping to different patterns', async () => {
        const result = await findMiniProblemsForWeakConcepts(['friction', 'energy conservation'], 2)

        expect(result.matchedPatterns.length).toBeGreaterThanOrEqual(2)
        expect(result.matchedPatterns.map(p => p.id)).toContain('pattern_friction')
        expect(result.matchedPatterns.map(p => p.id)).toContain('pattern_energy_conservation')
      })

      it('deduplicates pattern IDs when concepts map to same pattern', async () => {
        const result = await findMiniProblemsForWeakConcepts(['f = ma', "newton's second law"], 2)

        // Both map to pattern_newton_2, should only appear once in matchedPatterns
        const patternIds = result.matchedPatterns.map(p => p.id)
        const uniqueIds = [...new Set(patternIds)]
        expect(patternIds.length).toBe(uniqueIds.length)
      })
    })

    describe('Mini-Problem Selection', () => {
      it('returns mini-problems for matched patterns', async () => {
        const result = await findMiniProblemsForWeakConcepts(['friction'], 2)

        expect(result.miniProblems.length).toBeGreaterThan(0)
        expect(result.miniProblems[0].question).toBeDefined()
        expect(result.miniProblems[0].pattern).toBeDefined()
        expect(result.miniProblems[0].reason).toBeDefined()
      })

      it('respects maxProblems parameter', async () => {
        const result = await findMiniProblemsForWeakConcepts(["newton's second law"], 1)

        expect(result.miniProblems.length).toBeLessThanOrEqual(1)
      })

      it('sorts problems by difficulty (easier first)', async () => {
        const result = await findMiniProblemsForWeakConcepts(["newton's second law"], 2)

        if (result.miniProblems.length >= 2) {
          expect(result.miniProblems[0].question.difficulty)
            .toBeLessThanOrEqual(result.miniProblems[1].question.difficulty)
        }
      })

      it('only includes questions with primary pattern refs', async () => {
        const result = await findMiniProblemsForWeakConcepts(["newton's second law"], 5)

        for (const mp of result.miniProblems) {
          const hasPrimary = mp.question.pattern_refs.some(ref => ref.relevance === 'primary')
          expect(hasPrimary).toBe(true)
        }
      })

      it('provides reason referencing the weak concept', async () => {
        const result = await findMiniProblemsForWeakConcepts(['friction'], 1)

        expect(result.miniProblems[0]?.reason).toContain('friction')
      })

      it('tries to cover different patterns for variety', async () => {
        const result = await findMiniProblemsForWeakConcepts(['friction', "newton's second law"], 2)

        if (result.miniProblems.length === 2) {
          const patternIds = result.miniProblems.map(mp => mp.pattern.id)
          // With 2 different concepts, should try to have 2 different patterns
          expect(new Set(patternIds).size).toBe(2)
        }
      })
    })

    describe('Edge Cases', () => {
      it('handles empty concepts array', async () => {
        const result = await findMiniProblemsForWeakConcepts([], 2)

        expect(result.weakConcepts).toEqual([])
        expect(result.matchedPatterns).toHaveLength(0)
        expect(result.miniProblems).toHaveLength(0)
      })

      it('handles whitespace in concept names', async () => {
        const result = await findMiniProblemsForWeakConcepts(['  friction  '], 1)

        expect(result.matchedPatterns).toHaveLength(1)
      })

      it('preserves original concept names in result', async () => {
        const concepts = ["Newton's Second Law", 'FRICTION']
        const result = await findMiniProblemsForWeakConcepts(concepts, 2)

        expect(result.weakConcepts).toEqual(concepts)
      })
    })
  })

  describe('getMiniProblemForPattern', () => {
    it('returns a mini-problem for valid pattern ID', async () => {
      const result = await getMiniProblemForPattern('pattern_newton_2')

      expect(result).not.toBeNull()
      expect(result?.pattern.id).toBe('pattern_newton_2')
      expect(result?.question).toBeDefined()
      expect(result?.reason).toContain("Newton's Second Law")
    })

    it('returns null for unknown pattern ID', async () => {
      const result = await getMiniProblemForPattern('pattern_unknown')

      expect(result).toBeNull()
    })

    it('selects question closest to requested difficulty', async () => {
      const result = await getMiniProblemForPattern('pattern_newton_2', 1)

      // q_mech_001 has difficulty 1, q_mech_004 has difficulty 3
      // Should prefer q_mech_001
      expect(result?.question.difficulty).toBe(1)
    })

    it('defaults to difficulty 2', async () => {
      const result = await getMiniProblemForPattern('pattern_friction')

      // q_mech_002 has difficulty 2
      expect(result?.question.difficulty).toBe(2)
    })

    it('excludes specified question IDs', async () => {
      const result = await getMiniProblemForPattern('pattern_newton_2', 2, ['q_mech_001'])

      expect(result?.question.id).not.toBe('q_mech_001')
    })

    it('returns null when all questions are excluded', async () => {
      const result = await getMiniProblemForPattern(
        'pattern_friction',
        2,
        ['q_mech_002'] // Only friction question
      )

      expect(result).toBeNull()
    })

    it('provides correct reason format', async () => {
      const result = await getMiniProblemForPattern('pattern_friction')

      expect(result?.reason).toBe('Practice Friction Force Analysis')
    })
  })

  describe('Repository Integration', () => {
    it('calls patterns.getByIds with correct pattern IDs', async () => {
      await findMiniProblemsForWeakConcepts(['friction'], 1)

      expect(mockFactory.patterns.getByIds).toHaveBeenCalledWith(['pattern_friction'])
    })

    it('calls questions.getRandomForPatterns with correct parameters', async () => {
      await findMiniProblemsForWeakConcepts(['friction'], 2)

      expect(mockFactory.questions.getRandomForPatterns).toHaveBeenCalledWith(
        ['pattern_friction'],
        4, // maxProblems * 2
        []
      )
    })

    it('calls patterns.getById for single pattern lookup', async () => {
      await getMiniProblemForPattern('pattern_newton_2')

      expect(mockFactory.patterns.getById).toHaveBeenCalledWith('pattern_newton_2')
    })

    it('passes excludeIds to questions.getRandomForPatterns', async () => {
      await getMiniProblemForPattern('pattern_newton_2', 2, ['q1', 'q2'])

      expect(mockFactory.questions.getRandomForPatterns).toHaveBeenCalledWith(
        ['pattern_newton_2'],
        3,
        ['q1', 'q2']
      )
    })
  })
})
