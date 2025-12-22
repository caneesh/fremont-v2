import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { explainToFriendService } from '../explainToFriendService'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

beforeEach(() => {
  // @ts-ignore
  global.localStorage = localStorageMock
  localStorageMock.clear()
})

afterEach(() => {
  localStorageMock.clear()
})

describe('ExplainToFriendService', () => {
  const STUDENT_ID = 'test-student-123'
  const PROBLEM_ID = 'problem-001'
  const EXPLANATION = `The main approach is using Newton's second law with forces.
The key step is decomposing all forces into components.
This works because we account for all forces acting on the object.`

  describe('recordExplanation', () => {
    it('should record a new explanation', () => {
      explainToFriendService.recordExplanation(
        STUDENT_ID,
        PROBLEM_ID,
        EXPLANATION,
        'excellent'
      )

      const explanations = explainToFriendService.getStudentExplanations(STUDENT_ID)
      expect(explanations).toHaveLength(1)
      expect(explanations[0].explanation).toBe(EXPLANATION)
      expect(explanations[0].quality).toBe('excellent')
      expect(explanations[0].lineCount).toBe(3)
    })

    it('should generate unique IDs', () => {
      explainToFriendService.recordExplanation(STUDENT_ID, PROBLEM_ID, EXPLANATION, 'good')
      explainToFriendService.recordExplanation(STUDENT_ID, 'problem-002', EXPLANATION, 'good')

      const explanations = explainToFriendService.getStudentExplanations(STUDENT_ID)
      expect(explanations).toHaveLength(2)
      expect(explanations[0].id).not.toBe(explanations[1].id)
    })

    it('should calculate line count and word count', () => {
      const multiWordExplanation = `This is a longer line with many words to test counting.
Second line also has multiple words in it.
Third line completes the explanation with more words.`

      explainToFriendService.recordExplanation(
        STUDENT_ID,
        PROBLEM_ID,
        multiWordExplanation,
        'excellent'
      )

      const explanations = explainToFriendService.getStudentExplanations(STUDENT_ID)
      expect(explanations[0].lineCount).toBe(3)
      expect(explanations[0].wordCount).toBeGreaterThan(20)
    })

    it('should store feedback if provided', () => {
      const feedback = 'Great explanation with clear physics concepts'

      explainToFriendService.recordExplanation(
        STUDENT_ID,
        PROBLEM_ID,
        EXPLANATION,
        'excellent',
        feedback
      )

      const explanations = explainToFriendService.getStudentExplanations(STUDENT_ID)
      expect(explanations[0].feedback).toBe(feedback)
    })
  })

  describe('getStudentExplanations', () => {
    it('should return only explanations for specified student', () => {
      explainToFriendService.recordExplanation(STUDENT_ID, PROBLEM_ID, EXPLANATION, 'good')
      explainToFriendService.recordExplanation('another-student', PROBLEM_ID, EXPLANATION, 'good')

      const explanations = explainToFriendService.getStudentExplanations(STUDENT_ID)
      expect(explanations).toHaveLength(1)
      expect(explanations[0].studentId).toBe(STUDENT_ID)
    })

    it('should return empty array for student with no explanations', () => {
      const explanations = explainToFriendService.getStudentExplanations('new-student')
      expect(explanations).toHaveLength(0)
    })
  })

  describe('getProblemExplanation', () => {
    it('should return most recent explanation for a problem', () => {
      vi.useFakeTimers()

      explainToFriendService.recordExplanation(STUDENT_ID, PROBLEM_ID, 'First attempt', 'needs_work')

      vi.advanceTimersByTime(1000)

      explainToFriendService.recordExplanation(STUDENT_ID, PROBLEM_ID, 'Second attempt', 'good')

      const explanation = explainToFriendService.getProblemExplanation(STUDENT_ID, PROBLEM_ID)
      expect(explanation).not.toBeNull()
      expect(explanation!.explanation).toBe('Second attempt')
      expect(explanation!.quality).toBe('good')

      vi.useRealTimers()
    })

    it('should return null if no explanation exists for problem', () => {
      const explanation = explainToFriendService.getProblemExplanation(STUDENT_ID, 'nonexistent')
      expect(explanation).toBeNull()
    })
  })

  describe('getStatistics', () => {
    it('should calculate correct statistics', () => {
      explainToFriendService.recordExplanation(STUDENT_ID, 'p1', EXPLANATION, 'excellent')
      explainToFriendService.recordExplanation(STUDENT_ID, 'p2', EXPLANATION, 'excellent')
      explainToFriendService.recordExplanation(STUDENT_ID, 'p3', EXPLANATION, 'good')
      explainToFriendService.recordExplanation(STUDENT_ID, 'p4', EXPLANATION, 'needs_work')

      const stats = explainToFriendService.getStatistics(STUDENT_ID)

      expect(stats.totalExplanations).toBe(4)
      expect(stats.excellentCount).toBe(2)
      expect(stats.goodCount).toBe(1)
      expect(stats.needsWorkCount).toBe(1)
      expect(stats.improvementRate).toBe(50) // 2/4 = 50%
    })

    it('should calculate average word count', () => {
      explainToFriendService.recordExplanation(STUDENT_ID, 'p1', 'Short one.\nShort two.\nShort three.', 'good')
      explainToFriendService.recordExplanation(
        STUDENT_ID,
        'p2',
        'This is a much longer explanation with many more words.\nSecond line also longer.\nThird line longer too.',
        'good'
      )

      const stats = explainToFriendService.getStatistics(STUDENT_ID)
      expect(stats.averageWordCount).toBeGreaterThan(0)
    })

    it('should handle empty statistics', () => {
      const stats = explainToFriendService.getStatistics('new-student')

      expect(stats.totalExplanations).toBe(0)
      expect(stats.improvementRate).toBe(0)
      expect(stats.averageWordCount).toBe(0)
    })
  })

  describe('getRecentTrend', () => {
    it('should detect improving trend', () => {
      vi.useFakeTimers()
      const now = Date.now()

      // Older explanations with lower quality
      vi.setSystemTime(now - 10 * 24 * 60 * 60 * 1000)
      explainToFriendService.recordExplanation(STUDENT_ID, 'p1', EXPLANATION, 'needs_work')
      explainToFriendService.recordExplanation(STUDENT_ID, 'p2', EXPLANATION, 'needs_work')

      // Recent explanations with higher quality
      vi.setSystemTime(now)
      explainToFriendService.recordExplanation(STUDENT_ID, 'p3', EXPLANATION, 'good')
      explainToFriendService.recordExplanation(STUDENT_ID, 'p4', EXPLANATION, 'excellent')
      explainToFriendService.recordExplanation(STUDENT_ID, 'p5', EXPLANATION, 'excellent')

      const trend = explainToFriendService.getRecentTrend(STUDENT_ID)
      expect(trend).toBe('improving')

      vi.useRealTimers()
    })

    it('should detect declining trend', () => {
      vi.useFakeTimers()
      const now = Date.now()

      // Older explanations with higher quality
      vi.setSystemTime(now - 10 * 24 * 60 * 60 * 1000)
      explainToFriendService.recordExplanation(STUDENT_ID, 'p1', EXPLANATION, 'excellent')
      explainToFriendService.recordExplanation(STUDENT_ID, 'p2', EXPLANATION, 'excellent')

      // Recent explanations with lower quality
      vi.setSystemTime(now)
      explainToFriendService.recordExplanation(STUDENT_ID, 'p3', EXPLANATION, 'good')
      explainToFriendService.recordExplanation(STUDENT_ID, 'p4', EXPLANATION, 'needs_work')
      explainToFriendService.recordExplanation(STUDENT_ID, 'p5', EXPLANATION, 'needs_work')

      const trend = explainToFriendService.getRecentTrend(STUDENT_ID)
      expect(trend).toBe('declining')

      vi.useRealTimers()
    })

    it('should detect stable trend', () => {
      explainToFriendService.recordExplanation(STUDENT_ID, 'p1', EXPLANATION, 'good')
      explainToFriendService.recordExplanation(STUDENT_ID, 'p2', EXPLANATION, 'good')
      explainToFriendService.recordExplanation(STUDENT_ID, 'p3', EXPLANATION, 'good')

      const trend = explainToFriendService.getRecentTrend(STUDENT_ID)
      expect(trend).toBe('stable')
    })

    it('should return stable for insufficient data', () => {
      explainToFriendService.recordExplanation(STUDENT_ID, 'p1', EXPLANATION, 'good')

      const trend = explainToFriendService.getRecentTrend(STUDENT_ID)
      expect(trend).toBe('stable')
    })
  })

  describe('localStorage integration', () => {
    it('should persist data across service instances', () => {
      explainToFriendService.recordExplanation(STUDENT_ID, PROBLEM_ID, EXPLANATION, 'excellent')

      const stored = localStorage.getItem('physiscaffold_friend_explanations')
      expect(stored).toBeTruthy()

      const data = JSON.parse(stored!)
      expect(data.explanations).toHaveLength(1)
      expect(data.explanations[0].studentId).toBe(STUDENT_ID)
    })
  })

  describe('cleanup', () => {
    it('should remove old explanations', () => {
      vi.useFakeTimers()
      const now = Date.now()

      // Old explanation (100 days ago)
      vi.setSystemTime(now - 100 * 24 * 60 * 60 * 1000)
      explainToFriendService.recordExplanation(STUDENT_ID, 'old', EXPLANATION, 'good')

      // Recent explanation
      vi.setSystemTime(now)
      explainToFriendService.recordExplanation(STUDENT_ID, 'recent', EXPLANATION, 'excellent')

      explainToFriendService.cleanup()

      const explanations = explainToFriendService.getStudentExplanations(STUDENT_ID)
      expect(explanations).toHaveLength(1)
      expect(explanations[0].problemId).toBe('recent')

      vi.useRealTimers()
    })
  })
})
