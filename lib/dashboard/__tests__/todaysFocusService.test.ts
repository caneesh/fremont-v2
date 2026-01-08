/**
 * Today's Focus Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock dependencies
const mockProblemHistoryService = vi.hoisted(() => ({
  getHistory: vi.fn(),
}))

const mockMistakeNotebook = vi.hoisted(() => ({
  getNotebookStats: vi.fn(),
  getCardsDue: vi.fn(),
}))

const mockPatternTrackResolve = vi.hoisted(() => ({
  resolveNextAction: vi.fn(),
  isNextAction: vi.fn(),
}))

vi.mock('@/lib/problemHistory', () => ({
  problemHistoryService: mockProblemHistoryService,
}))

vi.mock('@/lib/mistakeNotebook', () => mockMistakeNotebook)

vi.mock('../patternTrackResolveService', () => mockPatternTrackResolve)

// Import after mocking
import { computeTodaysFocus, getEmptyState } from '../todaysFocusService'

describe('todaysFocusService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mocks
    mockProblemHistoryService.getHistory.mockReturnValue({ attempts: [], total: 0 })
    mockMistakeNotebook.getNotebookStats.mockReturnValue({ dueToday: 0, overdue: 0, total: 0 })
    mockPatternTrackResolve.resolveNextAction.mockReturnValue(null)
    mockPatternTrackResolve.isNextAction.mockReturnValue(false)
  })

  describe('getEmptyState', () => {
    it('returns start_fresh action for new users', () => {
      const result = getEmptyState()

      expect(result.primaryAction.type).toBe('start_fresh')
      expect(result.primaryAction.ctaLabel).toBe('Start Your First Problem')
      expect(result.primaryAction.route).toBe('/pattern-track')
      expect(result.secondaryActions).toEqual([])
      expect(result.isLoading).toBe(false)
      expect(result.rationale).toContain('baseline')
    })
  })

  describe('computeTodaysFocus', () => {
    describe('Priority 1: Recent in-progress problem (< 24h)', () => {
      it('returns continue_problem for recent in-progress problem', () => {
        const recentTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
        mockProblemHistoryService.getHistory.mockReturnValue({
          attempts: [{
            problemId: 'problem-1',
            problemTitle: 'Kinematics Problem',
            status: 'IN_PROGRESS',
            lastOpenedAt: recentTime,
            updatedAt: recentTime,
            draftSolution: JSON.stringify({
              stepProgress: [
                { stepId: 1, isCompleted: true },
                { stepId: 2, isCompleted: true },
                { stepId: 3, isCompleted: false },
                { stepId: 4, isCompleted: false },
              ],
            }),
          }],
          total: 1,
        })

        const result = computeTodaysFocus('user-1')

        expect(result.primaryAction.type).toBe('continue_problem')
        expect(result.primaryAction.continueData?.problemId).toBe('problem-1')
        expect(result.primaryAction.continueData?.problemTitle).toBe('Kinematics Problem')
        expect(result.primaryAction.continueData?.currentStep).toBe(3)
        expect(result.primaryAction.continueData?.totalSteps).toBe(4)
        expect(result.primaryAction.ctaLabel).toBe('Continue Problem')
        expect(result.primaryAction.route).toContain('problemId=problem-1')
        expect(result.primaryAction.route).toContain('resume=1')
      })

      it('prioritizes recent in-progress over overdue SRS cards', () => {
        const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
        mockProblemHistoryService.getHistory.mockReturnValue({
          attempts: [{
            problemId: 'problem-1',
            problemTitle: 'Recent Problem',
            status: 'IN_PROGRESS',
            lastOpenedAt: recentTime,
            updatedAt: recentTime,
            draftSolution: JSON.stringify({ stepProgress: [] }),
          }],
          total: 1,
        })
        mockMistakeNotebook.getNotebookStats.mockReturnValue({
          dueToday: 10,
          overdue: 5,
          total: 50,
        })

        const result = computeTodaysFocus('user-1')

        expect(result.primaryAction.type).toBe('continue_problem')
      })
    })

    describe('Priority 2: Overdue SRS cards (3+)', () => {
      it('returns start_review when 3+ cards are overdue', () => {
        mockMistakeNotebook.getNotebookStats.mockReturnValue({
          dueToday: 8,
          overdue: 5,
          total: 50,
        })

        const result = computeTodaysFocus('user-1')

        expect(result.primaryAction.type).toBe('start_review')
        expect(result.primaryAction.reviewData?.dueCardCount).toBe(8)
        expect(result.primaryAction.reviewData?.overdueCount).toBe(5)
        expect(result.primaryAction.ctaLabel).toBe('Review 8 Cards')
        expect(result.primaryAction.route).toBe('/mistake-notebook?review=true')
      })

      it('does not trigger review for < 3 overdue cards', () => {
        mockMistakeNotebook.getNotebookStats.mockReturnValue({
          dueToday: 2,
          overdue: 2,
          total: 20,
        })

        const result = computeTodaysFocus('user-1')

        expect(result.primaryAction.type).not.toBe('start_review')
      })
    })

    describe('Priority 3: Older in-progress problem (< 7 days)', () => {
      it('returns continue_problem for older in-progress problem', () => {
        const oldTime = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
        mockProblemHistoryService.getHistory.mockReturnValue({
          attempts: [{
            problemId: 'old-problem',
            problemTitle: 'Old Problem',
            status: 'IN_PROGRESS',
            lastOpenedAt: oldTime,
            updatedAt: oldTime,
            draftSolution: JSON.stringify({ stepProgress: [{ stepId: 1, isCompleted: true }] }),
          }],
          total: 1,
        })

        const result = computeTodaysFocus('user-1')

        expect(result.primaryAction.type).toBe('continue_problem')
        expect(result.primaryAction.continueData?.problemId).toBe('old-problem')
      })

      it('prioritizes overdue SRS over older in-progress', () => {
        const oldTime = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days ago
        mockProblemHistoryService.getHistory.mockReturnValue({
          attempts: [{
            problemId: 'old-problem',
            problemTitle: 'Old Problem',
            status: 'IN_PROGRESS',
            lastOpenedAt: oldTime,
            updatedAt: oldTime,
            draftSolution: JSON.stringify({ stepProgress: [] }),
          }],
          total: 1,
        })
        mockMistakeNotebook.getNotebookStats.mockReturnValue({
          dueToday: 5,
          overdue: 4,
          total: 50,
        })

        const result = computeTodaysFocus('user-1')

        expect(result.primaryAction.type).toBe('start_review')
      })

      it('does not return problems older than 7 days', () => {
        const veryOldTime = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() // 10 days ago
        mockProblemHistoryService.getHistory.mockReturnValue({
          attempts: [{
            problemId: 'very-old-problem',
            problemTitle: 'Very Old Problem',
            status: 'IN_PROGRESS',
            lastOpenedAt: veryOldTime,
            updatedAt: veryOldTime,
            draftSolution: JSON.stringify({ stepProgress: [] }),
          }],
          total: 1,
        })

        const result = computeTodaysFocus('user-1')

        expect(result.primaryAction.type).not.toBe('continue_problem')
      })
    })

    describe('Priority 4: Due SRS cards (3+)', () => {
      it('returns start_review when 3+ cards are due', () => {
        mockMistakeNotebook.getNotebookStats.mockReturnValue({
          dueToday: 5,
          overdue: 0,
          total: 30,
        })

        const result = computeTodaysFocus('user-1')

        expect(result.primaryAction.type).toBe('start_review')
        expect(result.primaryAction.reviewData?.dueCardCount).toBe(5)
        expect(result.primaryAction.reviewData?.overdueCount).toBe(0)
      })
    })

    describe('Priority 5: Pattern practice', () => {
      it('returns practice_pattern when next pattern is available', () => {
        mockPatternTrackResolve.resolveNextAction.mockReturnValue({
          patternId: 'pattern-kinematics',
          patternName: 'Kinematics',
          trackId: 'mechanics',
          trackName: 'Mechanics',
          stepType: 'practice',
          route: '/pattern-track/practice?patternId=pattern-kinematics',
        })
        mockPatternTrackResolve.isNextAction.mockReturnValue(true)

        const result = computeTodaysFocus('user-1')

        expect(result.primaryAction.type).toBe('practice_pattern')
        expect(result.primaryAction.patternData?.patternId).toBe('pattern-kinematics')
        expect(result.primaryAction.patternData?.patternName).toBe('Kinematics')
        expect(result.primaryAction.ctaLabel).toBe('Practice: Kinematics')
      })
    })

    describe('Priority 6: Start fresh (default)', () => {
      it('returns start_fresh when no other actions available', () => {
        const result = computeTodaysFocus('user-1')

        expect(result.primaryAction.type).toBe('start_fresh')
        expect(result.primaryAction.ctaLabel).toBe('Start Your First Problem')
        expect(result.primaryAction.route).toBe('/pattern-track')
      })
    })
  })

  describe('Rationale generation', () => {
    it('generates rationale for continue_problem', () => {
      const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      mockProblemHistoryService.getHistory.mockReturnValue({
        attempts: [{
          problemId: 'p1',
          problemTitle: 'Test',
          status: 'IN_PROGRESS',
          lastOpenedAt: recentTime,
          updatedAt: recentTime,
          draftSolution: JSON.stringify({
            stepProgress: [
              { stepId: 1, isCompleted: true },
              { stepId: 2, isCompleted: false },
            ],
          }),
        }],
        total: 1,
      })

      const result = computeTodaysFocus('user-1')

      expect(result.rationale).toContain('2/2 steps complete')
      expect(result.rationale).toContain('Pick up where you left off')
    })

    it('generates rationale for overdue review', () => {
      mockMistakeNotebook.getNotebookStats.mockReturnValue({
        dueToday: 10,
        overdue: 5,
        total: 50,
      })

      const result = computeTodaysFocus('user-1')

      expect(result.rationale).toContain('5 cards overdue')
      expect(result.rationale).toContain('prevent forgetting')
    })

    it('generates rationale for due review', () => {
      mockMistakeNotebook.getNotebookStats.mockReturnValue({
        dueToday: 5,
        overdue: 0,
        total: 30,
      })

      const result = computeTodaysFocus('user-1')

      expect(result.rationale).toContain('5 cards due')
      expect(result.rationale).toContain('reinforce')
    })

    it('generates rationale for pattern practice', () => {
      mockPatternTrackResolve.resolveNextAction.mockReturnValue({
        patternId: 'p1',
        patternName: 'Forces',
        stepType: 'learn',
        route: '/pattern-track/learn',
      })
      mockPatternTrackResolve.isNextAction.mockReturnValue(true)

      const result = computeTodaysFocus('user-1')

      expect(result.rationale).toContain('Forces')
      expect(result.rationale).toContain('foundation')
    })

    it('generates rationale for start_fresh', () => {
      const result = computeTodaysFocus('user-1')

      expect(result.rationale).toContain('baseline')
    })
  })

  describe('Secondary actions', () => {
    it('includes SRS review as secondary when not primary', () => {
      const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      mockProblemHistoryService.getHistory.mockReturnValue({
        attempts: [{
          problemId: 'p1',
          problemTitle: 'Test',
          status: 'IN_PROGRESS',
          lastOpenedAt: recentTime,
          updatedAt: recentTime,
          draftSolution: '{}',
        }],
        total: 1,
      })
      mockMistakeNotebook.getNotebookStats.mockReturnValue({
        dueToday: 2,
        overdue: 0,
        total: 10,
      })

      const result = computeTodaysFocus('user-1')

      expect(result.primaryAction.type).toBe('continue_problem')
      const reviewSecondary = result.secondaryActions.find(a => a.type === 'review')
      expect(reviewSecondary).toBeDefined()
      expect(reviewSecondary?.label).toContain('2 due cards')
    })

    it('includes pattern practice as secondary when not primary', () => {
      mockMistakeNotebook.getNotebookStats.mockReturnValue({
        dueToday: 5,
        overdue: 3,
        total: 30,
      })
      mockPatternTrackResolve.resolveNextAction.mockReturnValue({
        patternId: 'p1',
        patternName: 'Energy',
        stepType: 'practice',
        route: '/pattern-track/practice',
      })
      mockPatternTrackResolve.isNextAction.mockReturnValue(true)

      const result = computeTodaysFocus('user-1')

      expect(result.primaryAction.type).toBe('start_review')
      const patternSecondary = result.secondaryActions.find(a => a.type === 'practice_pattern')
      expect(patternSecondary).toBeDefined()
      expect(patternSecondary?.label).toContain('Energy')
    })

    it('includes in-progress problem as secondary when not primary', () => {
      const oldTime = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      mockProblemHistoryService.getHistory.mockReturnValue({
        attempts: [{
          problemId: 'p1',
          problemTitle: 'Pending Problem',
          status: 'IN_PROGRESS',
          lastOpenedAt: oldTime,
          updatedAt: oldTime,
          draftSolution: JSON.stringify({
            stepProgress: [{ stepId: 1, isCompleted: true }],
          }),
        }],
        total: 1,
      })
      mockMistakeNotebook.getNotebookStats.mockReturnValue({
        dueToday: 5,
        overdue: 5,
        total: 30,
      })

      const result = computeTodaysFocus('user-1')

      expect(result.primaryAction.type).toBe('start_review')
      const continueSecondary = result.secondaryActions.find(a => a.type === 'continue_problem')
      expect(continueSecondary).toBeDefined()
      expect(continueSecondary?.label).toContain('Pending Problem')
    })

    it('includes new problem option as secondary', () => {
      const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      mockProblemHistoryService.getHistory.mockReturnValue({
        attempts: [{
          problemId: 'p1',
          problemTitle: 'Test',
          status: 'IN_PROGRESS',
          lastOpenedAt: recentTime,
          updatedAt: recentTime,
          draftSolution: '{}',
        }],
        total: 1,
      })

      const result = computeTodaysFocus('user-1')

      const newProblemSecondary = result.secondaryActions.find(a => a.type === 'new_problem')
      expect(newProblemSecondary).toBeDefined()
      expect(newProblemSecondary?.label).toBe('Solve New Problem')
    })

    it('limits secondary actions to 3', () => {
      const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      mockProblemHistoryService.getHistory.mockReturnValue({
        attempts: [{
          problemId: 'p1',
          problemTitle: 'Test',
          status: 'IN_PROGRESS',
          lastOpenedAt: recentTime,
          updatedAt: recentTime,
          draftSolution: '{}',
        }],
        total: 1,
      })
      mockMistakeNotebook.getNotebookStats.mockReturnValue({
        dueToday: 5,
        overdue: 0,
        total: 30,
      })
      mockPatternTrackResolve.resolveNextAction.mockReturnValue({
        patternId: 'p1',
        patternName: 'Test Pattern',
        stepType: 'practice',
        route: '/test',
      })
      mockPatternTrackResolve.isNextAction.mockReturnValue(true)

      const result = computeTodaysFocus('user-1')

      expect(result.secondaryActions.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Edge cases', () => {
    it('handles missing draftSolution gracefully', () => {
      const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      mockProblemHistoryService.getHistory.mockReturnValue({
        attempts: [{
          problemId: 'p1',
          problemTitle: 'Test',
          status: 'IN_PROGRESS',
          lastOpenedAt: recentTime,
          updatedAt: recentTime,
          draftSolution: null,
        }],
        total: 1,
      })

      const result = computeTodaysFocus('user-1')

      expect(result.primaryAction.type).toBe('continue_problem')
      expect(result.primaryAction.continueData?.currentStep).toBe(1)
      expect(result.primaryAction.continueData?.totalSteps).toBe(5) // default
    })

    it('handles invalid JSON in draftSolution', () => {
      const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      mockProblemHistoryService.getHistory.mockReturnValue({
        attempts: [{
          problemId: 'p1',
          problemTitle: 'Test',
          status: 'IN_PROGRESS',
          lastOpenedAt: recentTime,
          updatedAt: recentTime,
          draftSolution: 'invalid json',
        }],
        total: 1,
      })

      const result = computeTodaysFocus('user-1')

      expect(result.primaryAction.type).toBe('continue_problem')
      expect(result.primaryAction.continueData?.currentStep).toBe(1)
    })

    it('handles notebook service error gracefully', () => {
      mockMistakeNotebook.getNotebookStats.mockImplementation(() => {
        throw new Error('Storage not available')
      })

      const result = computeTodaysFocus('user-1')

      // Should fall through to pattern or start_fresh
      expect(['practice_pattern', 'start_fresh']).toContain(result.primaryAction.type)
    })

    it('uses updatedAt when lastOpenedAt is not available', () => {
      const recentTime = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      mockProblemHistoryService.getHistory.mockReturnValue({
        attempts: [{
          problemId: 'p1',
          problemTitle: 'Test',
          status: 'IN_PROGRESS',
          lastOpenedAt: null,
          updatedAt: recentTime,
          draftSolution: '{}',
        }],
        total: 1,
      })

      const result = computeTodaysFocus('user-1')

      expect(result.primaryAction.type).toBe('continue_problem')
    })

    it('returns computedAt timestamp', () => {
      const before = new Date().toISOString()
      const result = computeTodaysFocus('user-1')
      const after = new Date().toISOString()

      expect(result.computedAt).toBeDefined()
      expect(result.computedAt >= before).toBe(true)
      expect(result.computedAt <= after).toBe(true)
    })
  })
})
