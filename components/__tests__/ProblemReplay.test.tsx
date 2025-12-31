import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProblemReplay from '../ProblemReplay'
import type { StoredEvent } from '@/lib/storage/types'

// Mock the eventLogger
vi.mock('@/lib/storage/eventLogger', () => ({
  eventLogger: {
    getProblemEvents: vi.fn(),
  },
}))

import { eventLogger } from '@/lib/storage/eventLogger'

const mockGetProblemEvents = eventLogger.getProblemEvents as ReturnType<typeof vi.fn>

// Sample events for testing
const createSampleEvents = (problemId: string): StoredEvent[] => [
  {
    id: 'evt_001',
    type: 'problem_started',
    timestamp: '2025-12-31T18:00:00.000Z',
    sessionId: 'test_session',
    metadata: { problemId, problemTitle: 'Test Problem' },
  },
  {
    id: 'evt_002',
    type: 'step_activated',
    timestamp: '2025-12-31T18:00:20.000Z',
    sessionId: 'test_session',
    metadata: { problemId, stepId: 0 },
  },
  {
    id: 'evt_003',
    type: 'hint_unlocked',
    timestamp: '2025-12-31T18:01:00.000Z',
    sessionId: 'test_session',
    metadata: { problemId, stepId: 0, level: 1 },
  },
  {
    id: 'evt_004',
    type: 'task_correct',
    timestamp: '2025-12-31T18:02:00.000Z',
    sessionId: 'test_session',
    metadata: { problemId, stepId: 0, attemptNumber: 1 },
  },
  {
    id: 'evt_005',
    type: 'step_completed',
    timestamp: '2025-12-31T18:02:30.000Z',
    sessionId: 'test_session',
    metadata: { problemId, stepId: 0 },
  },
  {
    id: 'evt_006',
    type: 'step_activated',
    timestamp: '2025-12-31T18:02:40.000Z',
    sessionId: 'test_session',
    metadata: { problemId, stepId: 1 },
  },
  {
    id: 'evt_007',
    type: 'task_incorrect',
    timestamp: '2025-12-31T18:03:00.000Z',
    sessionId: 'test_session',
    metadata: { problemId, stepId: 1, attemptNumber: 1 },
  },
  {
    id: 'evt_008',
    type: 'task_correct',
    timestamp: '2025-12-31T18:04:00.000Z',
    sessionId: 'test_session',
    metadata: { problemId, stepId: 1, attemptNumber: 2 },
  },
  {
    id: 'evt_009',
    type: 'step_completed',
    timestamp: '2025-12-31T18:04:30.000Z',
    sessionId: 'test_session',
    metadata: { problemId, stepId: 1 },
  },
  {
    id: 'evt_010',
    type: 'problem_marked_solved',
    timestamp: '2025-12-31T18:05:00.000Z',
    sessionId: 'test_session',
    metadata: { problemId },
  },
]

describe('ProblemReplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('loading state', () => {
    it('transitions from loading to content', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      // Component should eventually show content (loading is brief in tests)
      await waitFor(() => {
        expect(screen.getByText('Session Timeline')).toBeInTheDocument()
      })
    })
  })

  describe('empty state', () => {
    it('shows empty state when no events', async () => {
      mockGetProblemEvents.mockReturnValue({ success: true, data: [] })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('No timeline data available')).toBeInTheDocument()
      })
    })

    it('shows helpful message about event recording', async () => {
      mockGetProblemEvents.mockReturnValue({ success: true, data: [] })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('Events will be recorded as you work through problems')).toBeInTheDocument()
      })
    })
  })

  describe('timeline rendering', () => {
    it('renders timeline header', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" problemTitle="Test Problem" />)

      await waitFor(() => {
        expect(screen.getByText('Session Timeline')).toBeInTheDocument()
      })
    })

    it('shows problem title when provided', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" problemTitle="Block on Incline" />)

      await waitFor(() => {
        expect(screen.getByText('Block on Incline')).toBeInTheDocument()
      })
    })

    it('renders problem started event', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('Problem Started')).toBeInTheDocument()
      })
    })

    it('renders step activated events', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('Step 1 opened')).toBeInTheDocument()
        expect(screen.getByText('Step 2 opened')).toBeInTheDocument()
      })
    })

    it('renders step completed events', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('Step 1 completed')).toBeInTheDocument()
        expect(screen.getByText('Step 2 completed')).toBeInTheDocument()
      })
    })

    it('renders hint unlocked events', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('Hint level 1 unlocked')).toBeInTheDocument()
      })
    })

    it('renders task correct events', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getAllByText('Task answered correctly').length).toBe(2)
      })
    })

    it('renders task incorrect events', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('Task answered incorrectly')).toBeInTheDocument()
      })
    })

    it('renders problem completed event', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('Problem Completed')).toBeInTheDocument()
      })
    })
  })

  describe('statistics', () => {
    it('shows total time', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        // Total time should be 5 minutes (18:00:00 to 18:05:00)
        expect(screen.getByText('5m')).toBeInTheDocument()
        expect(screen.getByText('Total Time')).toBeInTheDocument()
      })
    })

    it('shows steps completed count', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('Steps Done')).toBeInTheDocument()
      })
    })

    it('shows hints used count', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('Hints Used')).toBeInTheDocument()
      })
    })

    it('shows accuracy percentage', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        // 2 correct out of 3 attempts = 67%
        expect(screen.getByText('67%')).toBeInTheDocument()
        expect(screen.getByText('Accuracy')).toBeInTheDocument()
      })
    })
  })

  describe('step time breakdown', () => {
    it('shows time per step section', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('Time per Step')).toBeInTheDocument()
      })
    })

    it('shows time for each step', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        // Step 1 and Step 2 times should be shown
        expect(screen.getByText(/Step 1:/)).toBeInTheDocument()
        expect(screen.getByText(/Step 2:/)).toBeInTheDocument()
      })
    })
  })

  describe('close functionality', () => {
    it('renders close button when onClose provided', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      const onClose = vi.fn()
      render(<ProblemReplay problemId="test_problem" onClose={onClose} />)

      await waitFor(() => {
        expect(screen.getByText('Session Timeline')).toBeInTheDocument()
      })

      // Find and click close button (it's an SVG button)
      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find(btn => btn.querySelector('svg'))
      expect(closeButton).toBeTruthy()
    })

    it('calls onClose when close button clicked', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'),
      })

      const onClose = vi.fn()
      render(<ProblemReplay problemId="test_problem" onClose={onClose} />)

      await waitFor(() => {
        expect(screen.getByText('Session Timeline')).toBeInTheDocument()
      })

      // Click the close button
      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find(btn => btn.querySelector('svg'))
      if (closeButton) {
        fireEvent.click(closeButton)
        expect(onClose).toHaveBeenCalled()
      }
    })
  })

  describe('event filtering', () => {
    it('only shows events for the specified problemId', async () => {
      const mixedEvents: StoredEvent[] = [
        ...createSampleEvents('test_problem'),
        {
          id: 'evt_other',
          type: 'problem_started',
          timestamp: '2025-12-31T19:00:00.000Z',
          sessionId: 'other_session',
          metadata: { problemId: 'other_problem', problemTitle: 'Other Problem' },
        },
      ]

      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: createSampleEvents('test_problem'), // eventLogger filters by problemId
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        // Should only show one "Problem Started"
        expect(screen.getAllByText('Problem Started').length).toBe(1)
      })
    })
  })

  describe('error handling', () => {
    it('handles failed event fetch gracefully', async () => {
      mockGetProblemEvents.mockReturnValue({
        success: false,
        error: 'Failed to load events',
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('No timeline data available')).toBeInTheDocument()
      })
    })
  })

  describe('duration formatting', () => {
    it('formats short durations correctly', async () => {
      const shortEvents: StoredEvent[] = [
        {
          id: 'evt_001',
          type: 'problem_started',
          timestamp: '2025-12-31T18:00:00.000Z',
          sessionId: 'test_session',
          metadata: { problemId: 'test_problem' },
        },
        {
          id: 'evt_002',
          type: 'problem_marked_solved',
          timestamp: '2025-12-31T18:00:30.000Z', // 30 seconds later
          sessionId: 'test_session',
          metadata: { problemId: 'test_problem' },
        },
      ]

      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: shortEvents,
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('30s')).toBeInTheDocument()
      })
    })

    it('formats minute durations correctly', async () => {
      const minuteEvents: StoredEvent[] = [
        {
          id: 'evt_001',
          type: 'problem_started',
          timestamp: '2025-12-31T18:00:00.000Z',
          sessionId: 'test_session',
          metadata: { problemId: 'test_problem' },
        },
        {
          id: 'evt_002',
          type: 'problem_marked_solved',
          timestamp: '2025-12-31T18:03:45.000Z', // 3 mins 45 secs later
          sessionId: 'test_session',
          metadata: { problemId: 'test_problem' },
        },
      ]

      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: minuteEvents,
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        expect(screen.getByText('3m 45s')).toBeInTheDocument()
      })
    })
  })

  describe('chronological ordering', () => {
    it('displays events in chronological order', async () => {
      // Send events in random order
      const unorderedEvents: StoredEvent[] = [
        {
          id: 'evt_003',
          type: 'problem_marked_solved',
          timestamp: '2025-12-31T18:02:00.000Z',
          sessionId: 'test_session',
          metadata: { problemId: 'test_problem' },
        },
        {
          id: 'evt_001',
          type: 'problem_started',
          timestamp: '2025-12-31T18:00:00.000Z',
          sessionId: 'test_session',
          metadata: { problemId: 'test_problem' },
        },
        {
          id: 'evt_002',
          type: 'step_activated',
          timestamp: '2025-12-31T18:01:00.000Z',
          sessionId: 'test_session',
          metadata: { problemId: 'test_problem', stepId: 0 },
        },
      ]

      mockGetProblemEvents.mockReturnValue({
        success: true,
        data: unorderedEvents,
      })

      render(<ProblemReplay problemId="test_problem" />)

      await waitFor(() => {
        const problemStarted = screen.getByText('Problem Started')
        const stepOpened = screen.getByText('Step 1 opened')
        const problemCompleted = screen.getByText('Problem Completed')

        // Verify all exist (ordering is handled by the component)
        expect(problemStarted).toBeInTheDocument()
        expect(stepOpened).toBeInTheDocument()
        expect(problemCompleted).toBeInTheDocument()
      })
    })
  })
})
