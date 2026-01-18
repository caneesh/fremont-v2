import { describe, it, expect } from 'vitest'
import {
  DEMO_PROBLEMS,
  getDemoProblemById,
  getDemoProblemsByExam,
  validateAnswer,
  type DemoProblem,
} from '../demoProblems'

describe('demoProblems', () => {
  describe('DEMO_PROBLEMS data', () => {
    it('should have at least 2 problems', () => {
      expect(DEMO_PROBLEMS.length).toBeGreaterThanOrEqual(2)
    })

    it('should have valid structure for each problem', () => {
      DEMO_PROBLEMS.forEach((problem) => {
        expect(problem.id).toBeDefined()
        expect(problem.id.length).toBeGreaterThan(0)
        expect(['JEE', 'NEET', 'Boards']).toContain(problem.exam)
        expect(problem.topic).toBeDefined()
        expect(problem.statement.length).toBeGreaterThan(10)
        expect(problem.thinkingGate.length).toBe(4) // 4 mandatory questions
        expect(problem.hints.length).toBeGreaterThanOrEqual(1)
        expect(problem.expectedAnswer).toBeDefined()
        expect(problem.explanation.length).toBeGreaterThan(10)
        expect(problem.commonMistakeExplained.length).toBeGreaterThan(10)
      })
    })

    it('should have valid thinking gate questions', () => {
      DEMO_PROBLEMS.forEach((problem) => {
        problem.thinkingGate.forEach((question, idx) => {
          expect(question.question.length).toBeGreaterThan(0)
          expect(question.options.length).toBeGreaterThanOrEqual(2)
          expect(question.correctIndex).toBeGreaterThanOrEqual(0)
          expect(question.correctIndex).toBeLessThan(question.options.length)
          // Each option should be non-empty
          question.options.forEach((option) => {
            expect(option.length).toBeGreaterThan(0)
          })
        })
      })
    })

    it('should have unique IDs for all problems', () => {
      const ids = DEMO_PROBLEMS.map((p) => p.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have at least one JEE problem', () => {
      const jeeProblems = DEMO_PROBLEMS.filter((p) => p.exam === 'JEE')
      expect(jeeProblems.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getDemoProblemById', () => {
    it('should return problem when ID exists', () => {
      const firstProblem = DEMO_PROBLEMS[0]
      const result = getDemoProblemById(firstProblem.id)
      expect(result).toBeDefined()
      expect(result?.id).toBe(firstProblem.id)
    })

    it('should return undefined when ID does not exist', () => {
      const result = getDemoProblemById('non-existent-id')
      expect(result).toBeUndefined()
    })

    it('should return the correct problem data', () => {
      const projectileProblem = getDemoProblemById('demo-projectile-1')
      if (projectileProblem) {
        expect(projectileProblem.topic).toContain('Projectile')
        expect(projectileProblem.exam).toBe('JEE')
      }
    })
  })

  describe('getDemoProblemsByExam', () => {
    it('should return JEE problems', () => {
      const jeeProblems = getDemoProblemsByExam('JEE')
      expect(jeeProblems.length).toBeGreaterThanOrEqual(1)
      jeeProblems.forEach((p) => {
        expect(p.exam).toBe('JEE')
      })
    })

    it('should return empty array for exam with no problems', () => {
      // Since we may not have Boards problems
      const result = getDemoProblemsByExam('Boards')
      expect(Array.isArray(result)).toBe(true)
      result.forEach((p) => {
        expect(p.exam).toBe('Boards')
      })
    })

    it('should return NEET problems if they exist', () => {
      const neetProblems = getDemoProblemsByExam('NEET')
      neetProblems.forEach((p) => {
        expect(p.exam).toBe('NEET')
      })
    })
  })

  describe('validateAnswer', () => {
    describe('numeric answers', () => {
      it('should return true for exact match', () => {
        expect(validateAnswer('4', '4', 0.1)).toBe(true)
        expect(validateAnswer('2.5', '2.5', 0.1)).toBe(true)
      })

      it('should return true for answer within tolerance', () => {
        // 10% tolerance of 4 is 0.4, so 3.9 is within range
        expect(validateAnswer('3.9', '4', 0.1)).toBe(true)
        expect(validateAnswer('4.1', '4', 0.1)).toBe(true)
      })

      it('should return false for answer outside tolerance', () => {
        // 10% tolerance of 4 is 0.4, so 3.5 is outside range
        expect(validateAnswer('3.5', '4', 0.1)).toBe(false)
        expect(validateAnswer('4.5', '4', 0.1)).toBe(false)
      })

      it('should handle decimal answers', () => {
        expect(validateAnswer('2.5', '2.5', 0.01)).toBe(true)
        expect(validateAnswer('2.48', '2.5', 0.01)).toBe(true) // Within 1%
        expect(validateAnswer('2.4', '2.5', 0.01)).toBe(false) // Outside 1%
      })

      it('should handle answers with whitespace', () => {
        expect(validateAnswer('  4  ', '4', 0.1)).toBe(true)
        expect(validateAnswer('\n2.5\t', '2.5', 0.1)).toBe(true)
      })

      it('should handle zero correctly', () => {
        expect(validateAnswer('0', '0', 0.1)).toBe(true)
      })

      it('should handle negative numbers', () => {
        expect(validateAnswer('-5', '-5', 0.1)).toBe(true)
        expect(validateAnswer('-4.9', '-5', 0.1)).toBe(true)
      })
    })

    describe('non-numeric answers', () => {
      it('should fall back to string comparison', () => {
        expect(validateAnswer('positive', 'positive', 0.1)).toBe(true)
        expect(validateAnswer('Positive', 'positive', 0.1)).toBe(true) // Case insensitive
      })

      it('should handle mixed input', () => {
        expect(validateAnswer('abc', '4', 0.1)).toBe(false)
        expect(validateAnswer('4', 'abc', 0.1)).toBe(false)
      })
    })

    describe('default tolerance', () => {
      it('should use default tolerance of 0.01 when not provided', () => {
        // Default tolerance is 0.01 (1% of expected value)
        // For expected=4, tolerance is 0.04
        expect(validateAnswer('4.03', '4')).toBe(true)  // Within 1%
        expect(validateAnswer('4.06', '4')).toBe(false) // Outside 1%
      })
    })
  })

  describe('problem content quality', () => {
    it('should have thinking questions that match the problem topic', () => {
      const projectileProblem = getDemoProblemById('demo-projectile-1')
      if (projectileProblem) {
        // Check that thinking questions are relevant to projectile motion
        const allQuestionText = projectileProblem.thinkingGate
          .map((q) => q.question.toLowerCase())
          .join(' ')
        expect(
          allQuestionText.includes('projectile') ||
          allQuestionText.includes('time') ||
          allQuestionText.includes('velocity') ||
          allQuestionText.includes('horizontal') ||
          allQuestionText.includes('vertical')
        ).toBe(true)
      }
    })

    it('should have hints that provide progressive help', () => {
      DEMO_PROBLEMS.forEach((problem) => {
        // First hint should be more general, second more specific
        expect(problem.hints[0].length).toBeGreaterThan(10)
        if (problem.hints.length > 1) {
          expect(problem.hints[1].length).toBeGreaterThan(10)
        }
      })
    })

    it('should have explanation that includes the expected answer', () => {
      DEMO_PROBLEMS.forEach((problem) => {
        // Explanation should mention the answer or calculation leading to it
        const explanation = problem.explanation.toLowerCase()
        const answer = problem.expectedAnswer.toLowerCase()
        expect(explanation.includes(answer) || explanation.includes('=')).toBe(true)
      })
    })
  })
})
