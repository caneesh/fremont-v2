import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { errorPatternService } from '../errorPatternService'
import { COMMON_ERROR_PATTERNS } from '@/types/errorPatterns'

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

// Setup global mocks
beforeEach(() => {
  // @ts-ignore
  global.localStorage = localStorageMock
  localStorageMock.clear()
})

afterEach(() => {
  localStorageMock.clear()
})

describe('ErrorPatternService', () => {
  const STUDENT_ID = 'test-student-123'
  const PROBLEM_ID = 'problem-001'
  const PATTERN_ID = 'EP001' // Method Selection pattern

  describe('recordError', () => {
    it('should record a new error instance', () => {
      errorPatternService.recordError(
        STUDENT_ID,
        PATTERN_ID,
        PROBLEM_ID,
        'A block slides down a frictionless incline...',
        'I tried using energy conservation',
        'Use force analysis with Newton\'s laws',
        {
          topic: 'Mechanics - Dynamics',
          difficulty: 'medium',
          hintsUsed: 3,
          timeSpent: 300,
        }
      )

      const errors = errorPatternService.getStudentErrors(STUDENT_ID)
      expect(errors).toHaveLength(1)
      expect(errors[0].patternId).toBe(PATTERN_ID)
      expect(errors[0].studentId).toBe(STUDENT_ID)
      expect(errors[0].problemId).toBe(PROBLEM_ID)
      expect(errors[0].context.hintsUsed).toBe(3)
    })

    it('should generate unique IDs for each error', () => {
      errorPatternService.recordError(
        STUDENT_ID,
        PATTERN_ID,
        PROBLEM_ID,
        'Problem 1',
        'Attempt 1',
        'Correct 1',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 1, timeSpent: 100 }
      )

      errorPatternService.recordError(
        STUDENT_ID,
        PATTERN_ID,
        'problem-002',
        'Problem 2',
        'Attempt 2',
        'Correct 2',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 1, timeSpent: 100 }
      )

      const errors = errorPatternService.getStudentErrors(STUDENT_ID)
      expect(errors).toHaveLength(2)
      expect(errors[0].id).not.toBe(errors[1].id)
    })
  })

  describe('getStudentErrors', () => {
    it('should return only errors for the specified student', () => {
      errorPatternService.recordError(
        STUDENT_ID,
        PATTERN_ID,
        PROBLEM_ID,
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 1, timeSpent: 100 }
      )

      errorPatternService.recordError(
        'another-student',
        PATTERN_ID,
        PROBLEM_ID,
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 1, timeSpent: 100 }
      )

      const errors = errorPatternService.getStudentErrors(STUDENT_ID)
      expect(errors).toHaveLength(1)
      expect(errors[0].studentId).toBe(STUDENT_ID)
    })

    it('should return empty array for student with no errors', () => {
      const errors = errorPatternService.getStudentErrors('new-student')
      expect(errors).toHaveLength(0)
    })
  })

  describe('getErrorPatternSummaries', () => {
    it('should group errors by pattern', () => {
      // Record 3 instances of EP001
      for (let i = 0; i < 3; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          'EP001',
          `problem-${i}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
        )
      }

      // Record 2 instances of EP002
      for (let i = 0; i < 2; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          'EP002',
          `problem-${i + 10}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
        )
      }

      const summaries = errorPatternService.getErrorPatternSummaries(STUDENT_ID)
      expect(summaries).toHaveLength(2)

      const ep001Summary = summaries.find(s => s.pattern.id === 'EP001')
      const ep002Summary = summaries.find(s => s.pattern.id === 'EP002')

      expect(ep001Summary?.occurrences).toBe(3)
      expect(ep002Summary?.occurrences).toBe(2)
    })

    it('should sort by severity and occurrences', () => {
      // Record high severity pattern (EP001 - high)
      errorPatternService.recordError(
        STUDENT_ID,
        'EP001',
        'problem-1',
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
      )

      // Record medium severity pattern (EP003 - medium) with more occurrences
      for (let i = 0; i < 3; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          'EP003',
          `problem-${i + 10}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
        )
      }

      const summaries = errorPatternService.getErrorPatternSummaries(STUDENT_ID)
      // High severity should come first despite fewer occurrences
      expect(summaries[0].pattern.id).toBe('EP001')
    })

    it('should track first and last seen timestamps', () => {
      vi.useFakeTimers()
      const startTime = new Date('2024-01-01T10:00:00Z')
      vi.setSystemTime(startTime)

      errorPatternService.recordError(
        STUDENT_ID,
        PATTERN_ID,
        'problem-1',
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
      )

      // Advance time by 1 day
      vi.advanceTimersByTime(24 * 60 * 60 * 1000)

      errorPatternService.recordError(
        STUDENT_ID,
        PATTERN_ID,
        'problem-2',
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
      )

      const summaries = errorPatternService.getErrorPatternSummaries(STUDENT_ID)
      const summary = summaries[0]

      expect(new Date(summary.firstSeen).getTime()).toBe(startTime.getTime())
      expect(new Date(summary.lastSeen).getTime()).toBe(
        startTime.getTime() + 24 * 60 * 60 * 1000
      )

      vi.useRealTimers()
    })
  })

  describe('trend analysis', () => {
    it('should detect improving trend', () => {
      vi.useFakeTimers()
      const now = Date.now()

      // Old errors (older than 7 days)
      vi.setSystemTime(now - 10 * 24 * 60 * 60 * 1000)
      for (let i = 0; i < 3; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          PATTERN_ID,
          `problem-old-${i}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
        )
      }

      // No recent errors
      vi.setSystemTime(now)

      const summaries = errorPatternService.getErrorPatternSummaries(STUDENT_ID)
      expect(summaries[0].trend).toBe('improving')

      vi.useRealTimers()
    })

    it('should detect worsening trend', () => {
      vi.useFakeTimers()
      const now = Date.now()

      // 1 old error
      vi.setSystemTime(now - 10 * 24 * 60 * 60 * 1000)
      errorPatternService.recordError(
        STUDENT_ID,
        PATTERN_ID,
        'problem-old',
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
      )

      // 3 recent errors (within 7 days)
      vi.setSystemTime(now - 2 * 24 * 60 * 60 * 1000)
      for (let i = 0; i < 3; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          PATTERN_ID,
          `problem-recent-${i}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
        )
      }

      vi.setSystemTime(now)

      const summaries = errorPatternService.getErrorPatternSummaries(STUDENT_ID)
      expect(summaries[0].trend).toBe('worsening')

      vi.useRealTimers()
    })

    it('should detect persistent trend', () => {
      vi.useFakeTimers()
      const now = Date.now()

      // Same number of old and recent errors
      vi.setSystemTime(now - 10 * 24 * 60 * 60 * 1000)
      errorPatternService.recordError(
        STUDENT_ID,
        PATTERN_ID,
        'problem-old',
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
      )

      vi.setSystemTime(now - 2 * 24 * 60 * 60 * 1000)
      errorPatternService.recordError(
        STUDENT_ID,
        PATTERN_ID,
        'problem-recent',
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
      )

      vi.setSystemTime(now)

      const summaries = errorPatternService.getErrorPatternSummaries(STUDENT_ID)
      expect(summaries[0].trend).toBe('persistent')

      vi.useRealTimers()
    })
  })

  describe('mastery detection', () => {
    it('should not mark pattern as mastered with recent errors', () => {
      vi.useFakeTimers()
      const now = Date.now()

      // 5 old errors
      vi.setSystemTime(now - 10 * 24 * 60 * 60 * 1000)
      for (let i = 0; i < 5; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          PATTERN_ID,
          `problem-${i}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
        )
      }

      // 1 recent error
      vi.setSystemTime(now - 2 * 24 * 60 * 60 * 1000)
      errorPatternService.recordError(
        STUDENT_ID,
        PATTERN_ID,
        'problem-recent',
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 2, timeSpent: 100 }
      )

      vi.setSystemTime(now)

      const summaries = errorPatternService.getErrorPatternSummaries(STUDENT_ID)
      expect(summaries[0].mastered).toBe(false)

      vi.useRealTimers()
    })
  })

  describe('getInsights', () => {
    it('should generate warning for high-frequency errors', () => {
      for (let i = 0; i < 3; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          'EP001', // High severity pattern
          `problem-${i}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 3, timeSpent: 100 }
        )
      }

      const insights = errorPatternService.getInsights(STUDENT_ID)
      const warnings = insights.filter(i => i.type === 'warning')

      expect(warnings.length).toBeGreaterThan(0)
      expect(warnings[0].message).toContain('3 times')
    })

    it('should generate celebration for improving patterns', () => {
      vi.useFakeTimers()
      const now = Date.now()

      // Old errors
      vi.setSystemTime(now - 10 * 24 * 60 * 60 * 1000)
      for (let i = 0; i < 2; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          PATTERN_ID,
          `problem-${i}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 3, timeSpent: 100 }
        )
      }

      vi.setSystemTime(now)

      const insights = errorPatternService.getInsights(STUDENT_ID)
      const celebrations = insights.filter(i => i.type === 'celebration')

      expect(celebrations.length).toBeGreaterThan(0)

      vi.useRealTimers()
    })
  })

  describe('getCriticalPatterns', () => {
    it('should return high severity, frequent, not mastered patterns', () => {
      // High severity pattern with 3 occurrences
      for (let i = 0; i < 3; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          'EP001', // High severity
          `problem-${i}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 3, timeSpent: 100 }
        )
      }

      // Low severity pattern with 5 occurrences
      for (let i = 0; i < 5; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          'EP007', // Low severity
          `problem-${i + 10}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 3, timeSpent: 100 }
        )
      }

      const critical = errorPatternService.getCriticalPatterns(STUDENT_ID)

      // Should only include high severity pattern
      expect(critical.length).toBe(1)
      expect(critical[0].pattern.id).toBe('EP001')
      expect(critical[0].pattern.severity).toBe('high')
    })
  })

  describe('shouldShowWarning', () => {
    it('should return true for high severity patterns with 2+ occurrences', () => {
      errorPatternService.recordError(
        STUDENT_ID,
        'EP001',
        'problem-1',
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 3, timeSpent: 100 }
      )

      errorPatternService.recordError(
        STUDENT_ID,
        'EP001',
        'problem-2',
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 3, timeSpent: 100 }
      )

      expect(errorPatternService.shouldShowWarning(STUDENT_ID, 'EP001')).toBe(true)
    })

    it('should return false for patterns with only 1 occurrence', () => {
      errorPatternService.recordError(
        STUDENT_ID,
        'EP001',
        'problem-1',
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 3, timeSpent: 100 }
      )

      expect(errorPatternService.shouldShowWarning(STUDENT_ID, 'EP001')).toBe(false)
    })

    it('should return false for non-existent patterns', () => {
      expect(errorPatternService.shouldShowWarning(STUDENT_ID, 'NONEXISTENT')).toBe(false)
    })
  })

  describe('getStatistics', () => {
    it('should calculate correct statistics', () => {
      // Record 5 errors of EP001
      for (let i = 0; i < 5; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          'EP001',
          `problem-${i}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 3, timeSpent: 100 }
        )
      }

      // Record 3 errors of EP002
      for (let i = 0; i < 3; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          'EP002',
          `problem-${i + 10}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 3, timeSpent: 100 }
        )
      }

      const stats = errorPatternService.getStatistics(STUDENT_ID)

      expect(stats.totalErrors).toBe(8)
      expect(stats.uniquePatterns).toBe(2)
      expect(stats.mostCommonCategory).toBeTruthy()
    })

    it('should calculate improvement rate correctly', () => {
      vi.useFakeTimers()
      const now = Date.now()

      // Create a mastered pattern (old errors, no recent ones)
      vi.setSystemTime(now - 10 * 24 * 60 * 60 * 1000)
      for (let i = 0; i < 5; i++) {
        errorPatternService.recordError(
          STUDENT_ID,
          'EP001',
          `problem-${i}`,
          'Problem',
          'Attempt',
          'Correct',
          { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 3, timeSpent: 100 }
        )
      }

      vi.setSystemTime(now)

      const stats = errorPatternService.getStatistics(STUDENT_ID)

      // 1 unique pattern, 1 mastered = 100% improvement rate
      expect(stats.improvementRate).toBe(100)

      vi.useRealTimers()
    })
  })

  describe('localStorage integration', () => {
    it('should persist data across service instances', () => {
      errorPatternService.recordError(
        STUDENT_ID,
        PATTERN_ID,
        PROBLEM_ID,
        'Problem',
        'Attempt',
        'Correct',
        { topic: 'Mechanics', difficulty: 'easy', hintsUsed: 3, timeSpent: 100 }
      )

      // Data should be in localStorage
      const stored = localStorage.getItem('physiscaffold_error_patterns')
      expect(stored).toBeTruthy()

      const data = JSON.parse(stored!)
      expect(data.instances).toHaveLength(1)
      expect(data.instances[0].studentId).toBe(STUDENT_ID)
    })
  })
})
