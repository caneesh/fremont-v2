/**
 * DashboardTiles Tests
 *
 * Tests that dashboard tiles:
 * 1. Render correct state based on data
 * 2. Link to the exact screens
 * 3. Show placeholder states when data unavailable
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom/vitest'

// Mock the hooks and services
vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: vi.fn(),
}))

vi.mock('@/lib/dashboard/todayPlanService', () => ({
  getTaskRoute: vi.fn((task: { questionId?: string }) => `/solve?question=${task.questionId}`),
}))

// Mock next/link
vi.mock('next/link', () => ({
  default: function MockLink({ children, href }: { children: React.ReactNode; href: string }) {
    return <a href={href}>{children}</a>
  },
}))

import DashboardTiles from '../DashboardTiles'
import { useDashboardData } from '@/hooks/useDashboardData'

const mockUseDashboardData = useDashboardData as ReturnType<typeof vi.fn>

describe('DashboardTiles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Continue Tile', () => {
    it('shows "No problem in progress" when continueItem is null', () => {
      mockUseDashboardData.mockReturnValue({
        continueItem: null,
        todayPlan: null,
        progress: { problemsSolved: 0, problemsAttempted: 0, timeSpentMinutes: 0, patternsMastered: null },
        reviewQueue: { dueCount: 0, overdueCount: 0, route: '/mistake-notebook?review=true', topCards: [] },
        isLoading: false,
        userId: 'test-user',
        refresh: vi.fn(),
      })

      render(<DashboardTiles />)

      expect(screen.getByText('No problem in progress')).toBeInTheDocument()
      expect(screen.getByText('Start a new problem →')).toBeInTheDocument()
    })

    it('shows continue item with deep link when in progress', () => {
      mockUseDashboardData.mockReturnValue({
        continueItem: {
          problemId: 'prob-123',
          problemTitle: 'Newton\'s Laws Problem',
          route: '/solve?problemId=prob-123&resume=1',
          lastActiveAt: new Date().toISOString(),
          stepInfo: { current: 3, total: 5 },
        },
        todayPlan: null,
        progress: { problemsSolved: 5, problemsAttempted: 10, timeSpentMinutes: 120, patternsMastered: null },
        reviewQueue: { dueCount: 0, overdueCount: 0, route: '/mistake-notebook?review=true', topCards: [] },
        isLoading: false,
        userId: 'test-user',
        refresh: vi.fn(),
      })

      render(<DashboardTiles />)

      expect(screen.getByText('Newton\'s Laws Problem')).toBeInTheDocument()
      expect(screen.getByText('Step 3/5')).toBeInTheDocument()
      expect(screen.getByText('Resume →')).toBeInTheDocument()

      // Check deep link
      const link = screen.getByRole('link', { name: /Resume/ })
      expect(link.closest('a')).toHaveAttribute('href', '/solve?problemId=prob-123&resume=1')
    })
  })

  describe('Review Queue Tile', () => {
    it('shows "No reviews due" when queue is empty', () => {
      mockUseDashboardData.mockReturnValue({
        continueItem: null,
        todayPlan: null,
        progress: { problemsSolved: 0, problemsAttempted: 0, timeSpentMinutes: 0, patternsMastered: null },
        reviewQueue: { dueCount: 0, overdueCount: 0, route: '/mistake-notebook?review=true', topCards: [] },
        isLoading: false,
        userId: 'test-user',
        refresh: vi.fn(),
      })

      render(<DashboardTiles />)

      expect(screen.getByText('No reviews due. Nice work!')).toBeInTheDocument()
    })

    it('shows review count and links to review page', () => {
      mockUseDashboardData.mockReturnValue({
        continueItem: null,
        todayPlan: null,
        progress: { problemsSolved: 0, problemsAttempted: 0, timeSpentMinutes: 0, patternsMastered: null },
        reviewQueue: {
          dueCount: 5,
          overdueCount: 2,
          route: '/mistake-notebook?review=true',
          topCards: [
            { id: '1', problemTitle: 'Problem A', stepTitle: 'Step 1' },
            { id: '2', problemTitle: 'Problem B', stepTitle: 'Step 2' },
          ],
        },
        isLoading: false,
        userId: 'test-user',
        refresh: vi.fn(),
      })

      render(<DashboardTiles />)

      expect(screen.getByText('5')).toBeInTheDocument() // Due count
      expect(screen.getByText('2 overdue!')).toBeInTheDocument()
      expect(screen.getByText('Start review →')).toBeInTheDocument()

      // Check deep link to review
      const link = screen.getByRole('link', { name: /Start review/ })
      expect(link.closest('a')).toHaveAttribute('href', '/mistake-notebook?review=true')
    })
  })

  describe('Progress Tile', () => {
    it('shows progress stats', () => {
      mockUseDashboardData.mockReturnValue({
        continueItem: null,
        todayPlan: null,
        progress: {
          problemsSolved: 15,
          problemsAttempted: 20,
          timeSpentMinutes: 180,
          patternsMastered: null,
        },
        reviewQueue: { dueCount: 0, overdueCount: 0, route: '/mistake-notebook?review=true', topCards: [] },
        isLoading: false,
        userId: 'test-user',
        refresh: vi.fn(),
      })

      render(<DashboardTiles />)

      expect(screen.getByText('15')).toBeInTheDocument() // Problems Solved
      expect(screen.getByText('75%')).toBeInTheDocument() // Success Rate (15/20)
      expect(screen.getByText('180m')).toBeInTheDocument() // Time Spent
      expect(screen.getByText('Patterns (TODO)')).toBeInTheDocument() // TODO marker for missing data
    })
  })

  describe('Today Tasks Tile', () => {
    it('shows "No tasks planned" when plan is empty', () => {
      mockUseDashboardData.mockReturnValue({
        continueItem: null,
        todayPlan: null,
        progress: { problemsSolved: 0, problemsAttempted: 0, timeSpentMinutes: 0, patternsMastered: null },
        reviewQueue: { dueCount: 0, overdueCount: 0, route: '/mistake-notebook?review=true', topCards: [] },
        isLoading: false,
        userId: 'test-user',
        refresh: vi.fn(),
      })

      render(<DashboardTiles />)

      expect(screen.getByText('No tasks planned for today')).toBeInTheDocument()
    })

    it('shows task list with progress', () => {
      mockUseDashboardData.mockReturnValue({
        continueItem: null,
        todayPlan: {
          tasks: [
            { id: '1', type: 'study_path_question' as const, title: 'Solve momentum problem', completed: true, questionId: 'q1' },
            { id: '2', type: 'review_due' as const, title: 'Review mistakes', completed: false },
            { id: '3', type: 'custom_solve' as const, title: 'Practice projectile motion', completed: false },
          ],
          activeTaskIndex: 1,
          dateKey: '2026-01-10',
        },
        progress: { problemsSolved: 0, problemsAttempted: 0, timeSpentMinutes: 0, patternsMastered: null },
        reviewQueue: { dueCount: 0, overdueCount: 0, route: '/mistake-notebook?review=true', topCards: [] },
        isLoading: false,
        userId: 'test-user',
        refresh: vi.fn(),
      })

      render(<DashboardTiles />)

      expect(screen.getByText('1/3')).toBeInTheDocument() // Task progress
      expect(screen.getByText('Solve momentum problem')).toBeInTheDocument()
      expect(screen.getByText('Review mistakes')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('shows skeleton loader when loading', () => {
      mockUseDashboardData.mockReturnValue({
        continueItem: null,
        todayPlan: null,
        progress: { problemsSolved: 0, problemsAttempted: 0, timeSpentMinutes: 0, patternsMastered: null },
        reviewQueue: { dueCount: 0, overdueCount: 0, route: '/mistake-notebook?review=true', topCards: [] },
        isLoading: true,
        userId: 'test-user',
        refresh: vi.fn(),
      })

      const { container } = render(<DashboardTiles />)

      // Check for skeleton elements
      const skeletons = container.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })
})
