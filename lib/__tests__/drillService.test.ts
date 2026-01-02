import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createDrillSession,
  recordItemResult,
  calculateSessionSummary,
  completeDrillSession,
  checkAnswer,
  getItemTimeLimit,
  formatTimeDisplay,
  getPerformanceLabel,
} from '../drillService'
import type { Drill, DrillItem, DrillItemResult, DrillSessionState } from '@/types/drill'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
})

// Mock eventLogger
vi.mock('@/lib/storage', () => ({
  eventLogger: {
    log: vi.fn(),
  },
}))

describe('drillService', () => {
  const sampleDrillItem: DrillItem = {
    id: 'item-001',
    promptText: 'What is 2 + 2?',
    type: 'short',
    correctAnswer: '4',
    explanationOneLiner: 'Basic addition',
    timeLimitSeconds: 20,
  }

  const sampleMCQItem: DrillItem = {
    id: 'item-002',
    promptText: 'Which is correct?',
    type: 'mcq',
    choices: ['mg sin θ', 'mg cos θ', 'mg tan θ', 'mg'],
    correctAnswer: 'mg sin θ',
    explanationOneLiner: 'Component parallel to incline',
    timeLimitSeconds: 20,
  }

  const sampleDrill: Drill = {
    id: 'drill-001',
    patternId: 'test-pattern',
    title: 'Test Drill',
    description: 'A test drill',
    items: [sampleDrillItem, sampleMCQItem],
  }

  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('createDrillSession', () => {
    it('creates a new drill session with correct initial state', () => {
      const session = createDrillSession(sampleDrill)

      expect(session.drillId).toBe('drill-001')
      expect(session.patternId).toBe('test-pattern')
      expect(session.currentIndex).toBe(0)
      expect(session.totalItems).toBe(2)
      expect(session.results).toEqual([])
      expect(session.isComplete).toBe(false)
      expect(session.startedAt).toBeTruthy()
    })

    it('saves session to localStorage', () => {
      createDrillSession(sampleDrill)
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })
  })

  describe('recordItemResult', () => {
    it('updates session with new result and advances index', () => {
      const session = createDrillSession(sampleDrill)
      const result: DrillItemResult = {
        itemId: 'item-001',
        answer: '4',
        correct: true,
        timeMs: 5000,
        timedOut: false,
        completedAt: new Date().toISOString(),
      }

      const updatedSession = recordItemResult(session, result)

      expect(updatedSession.currentIndex).toBe(1)
      expect(updatedSession.results).toHaveLength(1)
      expect(updatedSession.results[0]).toEqual(result)
      expect(updatedSession.isComplete).toBe(false)
    })

    it('marks session complete when last item is answered', () => {
      const session: DrillSessionState = {
        drillId: 'drill-001',
        patternId: 'test-pattern',
        currentIndex: 1,
        totalItems: 2,
        results: [
          {
            itemId: 'item-001',
            answer: '4',
            correct: true,
            timeMs: 5000,
            timedOut: false,
            completedAt: new Date().toISOString(),
          },
        ],
        startedAt: new Date().toISOString(),
        isComplete: false,
      }

      const result: DrillItemResult = {
        itemId: 'item-002',
        answer: 'mg sin θ',
        correct: true,
        timeMs: 3000,
        timedOut: false,
        completedAt: new Date().toISOString(),
      }

      const updatedSession = recordItemResult(session, result)
      expect(updatedSession.isComplete).toBe(true)
    })
  })

  describe('calculateSessionSummary', () => {
    it('calculates correct statistics from results', () => {
      const session: DrillSessionState = {
        drillId: 'drill-001',
        patternId: 'test-pattern',
        currentIndex: 2,
        totalItems: 2,
        results: [
          {
            itemId: 'item-001',
            answer: '4',
            correct: true,
            timeMs: 5000,
            timedOut: false,
            completedAt: new Date().toISOString(),
          },
          {
            itemId: 'item-002',
            answer: 'wrong',
            correct: false,
            timeMs: 15000,
            timedOut: false,
            completedAt: new Date().toISOString(),
          },
        ],
        startedAt: new Date().toISOString(),
        isComplete: true,
      }

      const summary = calculateSessionSummary(session)

      expect(summary.correctCount).toBe(1)
      expect(summary.totalItems).toBe(2)
      expect(summary.accuracy).toBe(50)
      expect(summary.totalTimeMs).toBe(20000)
      expect(summary.averageTimeMs).toBe(10000)
      expect(summary.timedOutCount).toBe(0)
      expect(summary.wrongItemIds).toEqual(['item-002'])
    })

    it('calculates 100% accuracy when all correct', () => {
      const session: DrillSessionState = {
        drillId: 'drill-001',
        patternId: 'test-pattern',
        currentIndex: 2,
        totalItems: 2,
        results: [
          {
            itemId: 'item-001',
            answer: '4',
            correct: true,
            timeMs: 5000,
            timedOut: false,
            completedAt: new Date().toISOString(),
          },
          {
            itemId: 'item-002',
            answer: 'mg sin θ',
            correct: true,
            timeMs: 3000,
            timedOut: false,
            completedAt: new Date().toISOString(),
          },
        ],
        startedAt: new Date().toISOString(),
        isComplete: true,
      }

      const summary = calculateSessionSummary(session)
      expect(summary.accuracy).toBe(100)
      expect(summary.wrongItemIds).toEqual([])
    })

    it('identifies slowest items correctly', () => {
      const session: DrillSessionState = {
        drillId: 'drill-001',
        patternId: 'test-pattern',
        currentIndex: 3,
        totalItems: 3,
        results: [
          {
            itemId: 'item-001',
            answer: '4',
            correct: true,
            timeMs: 5000,
            timedOut: false,
            completedAt: new Date().toISOString(),
          },
          {
            itemId: 'item-002',
            answer: 'mg sin θ',
            correct: true,
            timeMs: 18000,
            timedOut: false,
            completedAt: new Date().toISOString(),
          },
          {
            itemId: 'item-003',
            answer: 'test',
            correct: true,
            timeMs: 10000,
            timedOut: false,
            completedAt: new Date().toISOString(),
          },
        ],
        startedAt: new Date().toISOString(),
        isComplete: true,
      }

      const summary = calculateSessionSummary(session)

      expect(summary.slowestItems).toHaveLength(3)
      expect(summary.slowestItems[0].itemId).toBe('item-002')
      expect(summary.slowestItems[0].timeMs).toBe(18000)
    })

    it('counts timed out items', () => {
      const session: DrillSessionState = {
        drillId: 'drill-001',
        patternId: 'test-pattern',
        currentIndex: 2,
        totalItems: 2,
        results: [
          {
            itemId: 'item-001',
            answer: null,
            correct: false,
            timeMs: 20000,
            timedOut: true,
            completedAt: new Date().toISOString(),
          },
          {
            itemId: 'item-002',
            answer: 'mg sin θ',
            correct: true,
            timeMs: 3000,
            timedOut: false,
            completedAt: new Date().toISOString(),
          },
        ],
        startedAt: new Date().toISOString(),
        isComplete: true,
      }

      const summary = calculateSessionSummary(session)
      expect(summary.timedOutCount).toBe(1)
    })
  })

  describe('checkAnswer', () => {
    it('returns true for exact match on short answer', () => {
      expect(checkAnswer(sampleDrillItem, '4')).toBe(true)
    })

    it('returns true for case-insensitive match', () => {
      const item: DrillItem = {
        ...sampleDrillItem,
        correctAnswer: 'Answer',
      }
      expect(checkAnswer(item, 'answer')).toBe(true)
      expect(checkAnswer(item, 'ANSWER')).toBe(true)
    })

    it('returns true for MCQ exact match', () => {
      expect(checkAnswer(sampleMCQItem, 'mg sin θ')).toBe(true)
    })

    it('returns false for incorrect answer', () => {
      expect(checkAnswer(sampleDrillItem, '5')).toBe(false)
    })

    it('handles numeric tolerance (within 1%)', () => {
      const item: DrillItem = {
        ...sampleDrillItem,
        correctAnswer: '100',
      }
      expect(checkAnswer(item, '100.5')).toBe(true)
      expect(checkAnswer(item, '99.5')).toBe(true)
      expect(checkAnswer(item, '98')).toBe(false)
    })

    it('handles whitespace in answers', () => {
      expect(checkAnswer(sampleDrillItem, '  4  ')).toBe(true)
    })
  })

  describe('getItemTimeLimit', () => {
    it('returns item-specific time limit when set', () => {
      expect(getItemTimeLimit(sampleDrillItem)).toBe(20)
    })

    it('returns default time limit when not set', () => {
      const item: DrillItem = {
        ...sampleDrillItem,
        timeLimitSeconds: undefined as unknown as number,
      }
      expect(getItemTimeLimit(item)).toBe(20)
    })

    it('returns custom time limit', () => {
      const item: DrillItem = {
        ...sampleDrillItem,
        timeLimitSeconds: 30,
      }
      expect(getItemTimeLimit(item)).toBe(30)
    })
  })

  describe('formatTimeDisplay', () => {
    it('formats milliseconds to seconds with s suffix', () => {
      expect(formatTimeDisplay(5000)).toBe('5s')
      expect(formatTimeDisplay(15000)).toBe('15s')
    })

    it('rounds up to nearest second', () => {
      expect(formatTimeDisplay(5500)).toBe('6s')
      expect(formatTimeDisplay(5001)).toBe('6s')
    })
  })

  describe('getPerformanceLabel', () => {
    it('returns Excellent for 90%+', () => {
      const result = getPerformanceLabel(95)
      expect(result.label).toBe('Excellent')
      expect(result.color).toBe('text-green-600')
    })

    it('returns Excellent for exactly 90%', () => {
      const result = getPerformanceLabel(90)
      expect(result.label).toBe('Excellent')
    })

    it('returns Good for 70-89%', () => {
      const result = getPerformanceLabel(80)
      expect(result.label).toBe('Good')
      expect(result.color).toBe('text-blue-600')
    })

    it('returns Needs Practice for 50-69%', () => {
      const result = getPerformanceLabel(60)
      expect(result.label).toBe('Needs Practice')
      expect(result.color).toBe('text-amber-600')
    })

    it('returns Keep Practicing for below 50%', () => {
      const result = getPerformanceLabel(40)
      expect(result.label).toBe('Keep Practicing')
      expect(result.color).toBe('text-red-600')
    })
  })

  describe('completeDrillSession', () => {
    it('returns summary and clears active session', () => {
      const session: DrillSessionState = {
        drillId: 'drill-001',
        patternId: 'test-pattern',
        currentIndex: 2,
        totalItems: 2,
        results: [
          {
            itemId: 'item-001',
            answer: '4',
            correct: true,
            timeMs: 5000,
            timedOut: false,
            completedAt: new Date().toISOString(),
          },
          {
            itemId: 'item-002',
            answer: 'mg sin θ',
            correct: true,
            timeMs: 3000,
            timedOut: false,
            completedAt: new Date().toISOString(),
          },
        ],
        startedAt: new Date().toISOString(),
        isComplete: true,
      }

      const summary = completeDrillSession(session)

      expect(summary.drillId).toBe('drill-001')
      expect(summary.accuracy).toBe(100)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('physiscaffold_drill_active_session')
    })
  })
})
