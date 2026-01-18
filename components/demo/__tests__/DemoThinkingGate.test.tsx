import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DemoThinkingGate from '../DemoThinkingGate'
import { DEMO_PROBLEMS } from '@/lib/demo/demoProblems'

describe('DemoThinkingGate', () => {
  const mockProblem = DEMO_PROBLEMS[0]
  const defaultProps = {
    problem: mockProblem,
    onComplete: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the problem statement', () => {
      render(<DemoThinkingGate {...defaultProps} />)

      expect(screen.getByText('Problem')).toBeInTheDocument()
      expect(screen.getByText(mockProblem.statement)).toBeInTheDocument()
    })

    it('renders exam and topic badges', () => {
      render(<DemoThinkingGate {...defaultProps} />)

      expect(screen.getByText(mockProblem.exam)).toBeInTheDocument()
      expect(screen.getByText(mockProblem.topic)).toBeInTheDocument()
    })

    it('renders the thinking gate header', () => {
      render(<DemoThinkingGate {...defaultProps} />)

      expect(screen.getByText('Think First')).toBeInTheDocument()
      expect(screen.getByText('Answer these conceptual questions before solving')).toBeInTheDocument()
    })

    it('renders the first question initially', () => {
      render(<DemoThinkingGate {...defaultProps} />)

      expect(screen.getByText(mockProblem.thinkingGate[0].question)).toBeInTheDocument()
    })

    it('renders all options for the current question', () => {
      render(<DemoThinkingGate {...defaultProps} />)

      mockProblem.thinkingGate[0].options.forEach((option) => {
        expect(screen.getByText(option)).toBeInTheDocument()
      })
    })

    it('renders progress indicator', () => {
      render(<DemoThinkingGate {...defaultProps} />)

      expect(screen.getByText(`Question 1 of ${mockProblem.thinkingGate.length}`)).toBeInTheDocument()
      expect(screen.getByText('0 answered')).toBeInTheDocument()
    })

    it('renders the "Why This Matters" section', () => {
      render(<DemoThinkingGate {...defaultProps} />)

      expect(screen.getByText('Why the Thinking Gate?')).toBeInTheDocument()
    })
  })

  describe('Question Navigation', () => {
    it('shows first question when no initialAnswers', () => {
      render(<DemoThinkingGate {...defaultProps} />)

      expect(screen.getByText(mockProblem.thinkingGate[0].question)).toBeInTheDocument()
      expect(screen.getByText('0 answered')).toBeInTheDocument()
    })

    it('shows second question when initialAnswers has one answer', () => {
      render(
        <DemoThinkingGate
          {...defaultProps}
          initialAnswers={[0]}
        />
      )

      expect(screen.getByText(mockProblem.thinkingGate[1].question)).toBeInTheDocument()
      expect(screen.getByText('1 answered')).toBeInTheDocument()
    })

    it('disables Previous button on first question', () => {
      render(<DemoThinkingGate {...defaultProps} />)

      const previousButton = screen.getByText('Previous')
      expect(previousButton.className).toContain('text-gray-400')
    })

    it('allows navigating back with Previous button', () => {
      render(
        <DemoThinkingGate
          {...defaultProps}
          initialAnswers={[0, 1]} // Start at question 3
        />
      )

      // Should be on question 3
      expect(screen.getByText(mockProblem.thinkingGate[2].question)).toBeInTheDocument()

      // Click Previous
      fireEvent.click(screen.getByText('Previous'))

      // Should show question 2
      expect(screen.getByText(mockProblem.thinkingGate[1].question)).toBeInTheDocument()
    })

    it('Previous button is enabled when not on first question', () => {
      render(
        <DemoThinkingGate
          {...defaultProps}
          initialAnswers={[0]}
        />
      )

      const previousButton = screen.getByText('Previous')
      expect(previousButton.className).not.toContain('cursor-not-allowed')
    })
  })

  describe('Completion', () => {
    it('shows completion state when all questions answered via initialAnswers', () => {
      const allAnswers = mockProblem.thinkingGate.map(() => 0)

      render(
        <DemoThinkingGate
          {...defaultProps}
          initialAnswers={allAnswers}
        />
      )

      // Should show completion state
      expect(screen.getByText('Great thinking!')).toBeInTheDocument()
      expect(screen.getByText('Proceed to Solve')).toBeInTheDocument()
    })

    it('calls onComplete with answers when Proceed to Solve is clicked', () => {
      const onComplete = vi.fn()
      const allAnswers = mockProblem.thinkingGate.map((_, i) => i % 4) // Mix of answers

      render(
        <DemoThinkingGate
          {...defaultProps}
          onComplete={onComplete}
          initialAnswers={allAnswers}
        />
      )

      // Click Proceed to Solve
      const proceedButton = screen.getByText('Proceed to Solve')
      fireEvent.click(proceedButton)

      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(onComplete).toHaveBeenCalledWith(allAnswers)
    })
  })

  describe('Initial Answers', () => {
    it('starts at correct question when initialAnswers provided', () => {
      render(
        <DemoThinkingGate
          {...defaultProps}
          initialAnswers={[0, 1]} // Already answered 2 questions
        />
      )

      // Should be on question 3 (index 2)
      expect(screen.getByText(mockProblem.thinkingGate[2].question)).toBeInTheDocument()
      expect(screen.getByText('2 answered')).toBeInTheDocument()
    })

    it('shows completion if all answers provided', async () => {
      const allAnswers = mockProblem.thinkingGate.map(() => 0)

      render(
        <DemoThinkingGate
          {...defaultProps}
          initialAnswers={allAnswers}
        />
      )

      expect(screen.getByText('Great thinking!')).toBeInTheDocument()
    })
  })

  describe('Progress Bar', () => {
    it('shows empty progress bar initially', () => {
      render(<DemoThinkingGate {...defaultProps} />)

      // Progress should be 0 answered
      expect(screen.getByText('0 answered')).toBeInTheDocument()
    })

    it('updates progress bar as questions are answered', async () => {
      // Test with initial answers to verify progress calculation
      render(
        <DemoThinkingGate
          {...defaultProps}
          initialAnswers={[0]} // One answer already provided
        />
      )

      // Should show 1/4 = 25% progress
      expect(screen.getByText('1 answered')).toBeInTheDocument()
    })
  })

  describe('Question Dots Navigation', () => {
    it('renders navigation dots for each question', () => {
      const { container } = render(<DemoThinkingGate {...defaultProps} />)

      const dots = container.querySelectorAll('.rounded-full.w-2\\.5.h-2\\.5')
      expect(dots.length).toBe(mockProblem.thinkingGate.length)
    })

    it('allows clicking dots to navigate', () => {
      const { container } = render(
        <DemoThinkingGate
          {...defaultProps}
          initialAnswers={[0, 1, 2]} // 3 questions answered
        />
      )

      const dots = container.querySelectorAll('.rounded-full.w-2\\.5.h-2\\.5')

      // Click on first dot to go back to question 1
      fireEvent.click(dots[0])

      expect(screen.getByText(mockProblem.thinkingGate[0].question)).toBeInTheDocument()
    })
  })
})
