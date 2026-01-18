import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DemoResult from '../DemoResult'
import { DEMO_PROBLEMS } from '@/lib/demo/demoProblems'

describe('DemoResult', () => {
  const mockProblem = DEMO_PROBLEMS[0]
  const defaultProps = {
    problem: mockProblem,
    userAnswer: '4',
    isCorrect: true,
    thinkingAnswers: mockProblem.thinkingGate.map((q) => q.correctIndex),
    onTryAnother: vi.fn(),
    onStartOver: vi.fn(),
  }

  describe('Correct Answer Display', () => {
    it('shows success banner when correct', () => {
      render(<DemoResult {...defaultProps} />)

      expect(screen.getByText('Excellent Work!')).toBeInTheDocument()
      expect(screen.getByText('You solved the problem correctly!')).toBeInTheDocument()
    })

    it('displays user answer and correct answer', () => {
      render(<DemoResult {...defaultProps} userAnswer="42" />)

      expect(screen.getByText(/Your Answer:/)).toBeInTheDocument()
      expect(screen.getByText(/42/)).toBeInTheDocument()
      expect(screen.getByText(/Correct Answer:/)).toBeInTheDocument()
    })

    it('uses green styling for correct answer', () => {
      const { container } = render(<DemoResult {...defaultProps} />)

      const banner = container.querySelector('.from-green-50')
      expect(banner).toBeInTheDocument()
    })
  })

  describe('Incorrect Answer Display', () => {
    it('shows attempt banner when incorrect', () => {
      render(<DemoResult {...defaultProps} isCorrect={false} userAnswer="5" />)

      expect(screen.getByText('Good Attempt!')).toBeInTheDocument()
      expect(screen.getByText("Let's understand what went wrong.")).toBeInTheDocument()
    })

    it('uses amber styling for incorrect answer', () => {
      const { container } = render(
        <DemoResult {...defaultProps} isCorrect={false} userAnswer="5" />
      )

      const banner = container.querySelector('.from-amber-50')
      expect(banner).toBeInTheDocument()
    })
  })

  describe('Thinking Gate Performance', () => {
    it('shows thinking gate performance section', () => {
      render(<DemoResult {...defaultProps} />)

      expect(screen.getByText('Thinking Gate Performance')).toBeInTheDocument()
    })

    it('shows correct count when all answers correct', () => {
      render(<DemoResult {...defaultProps} />)

      expect(
        screen.getByText(
          `${mockProblem.thinkingGate.length} / ${mockProblem.thinkingGate.length} correct`
        )
      ).toBeInTheDocument()
    })

    it('shows partial count when some answers wrong', () => {
      const wrongAnswers = mockProblem.thinkingGate.map((q, i) =>
        i === 0 ? (q.correctIndex + 1) % q.options.length : q.correctIndex
      )

      render(<DemoResult {...defaultProps} thinkingAnswers={wrongAnswers} />)

      const totalQuestions = mockProblem.thinkingGate.length
      expect(
        screen.getByText(`${totalQuestions - 1} / ${totalQuestions} correct`)
      ).toBeInTheDocument()
    })

    it('shows encouraging message for perfect score', () => {
      render(<DemoResult {...defaultProps} />)

      expect(
        screen.getByText(/Great conceptual understanding/)
      ).toBeInTheDocument()
    })

    it('shows improvement suggestion for partial score', () => {
      const wrongAnswers = [0, 0, 0, 0] // All wrong (assuming correct indices are different)
      render(<DemoResult {...defaultProps} thinkingAnswers={wrongAnswers} />)

      expect(
        screen.getByText(/Reviewing the conceptual questions/)
      ).toBeInTheDocument()
    })

    it('displays progress bar with correct fill', () => {
      const { container } = render(<DemoResult {...defaultProps} />)

      const progressBar = container.querySelector('.bg-indigo-500')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar?.getAttribute('style')).toContain('100%')
    })
  })

  describe('Explanation Section', () => {
    it('shows solution explanation', () => {
      render(<DemoResult {...defaultProps} />)

      expect(screen.getByText('Solution Explanation')).toBeInTheDocument()
      expect(screen.getByText(mockProblem.explanation)).toBeInTheDocument()
    })

    it('uses blue styling for explanation', () => {
      const { container } = render(<DemoResult {...defaultProps} />)

      const explanationSection = container.querySelector('.bg-blue-50')
      expect(explanationSection).toBeInTheDocument()
    })
  })

  describe('Common Mistake Section', () => {
    it('shows common mistake explanation', () => {
      render(<DemoResult {...defaultProps} />)

      expect(screen.getByText('Common Mistake to Avoid')).toBeInTheDocument()
      expect(screen.getByText(mockProblem.commonMistakeExplained)).toBeInTheDocument()
    })

    it('uses rose styling for common mistake', () => {
      const { container } = render(<DemoResult {...defaultProps} />)

      const mistakeSection = container.querySelector('.bg-rose-50')
      expect(mistakeSection).toBeInTheDocument()
    })
  })

  describe('CTA Buttons', () => {
    it('shows Try Another Problem button', () => {
      render(<DemoResult {...defaultProps} />)

      expect(screen.getByText('Try Another Problem')).toBeInTheDocument()
    })

    it('shows Back to Problem Selection button', () => {
      render(<DemoResult {...defaultProps} />)

      expect(screen.getByText('Back to Problem Selection')).toBeInTheDocument()
    })

    it('calls onTryAnother when clicked', () => {
      const onTryAnother = vi.fn()
      render(<DemoResult {...defaultProps} onTryAnother={onTryAnother} />)

      fireEvent.click(screen.getByText('Try Another Problem'))
      expect(onTryAnother).toHaveBeenCalledTimes(1)
    })

    it('calls onStartOver when clicked', () => {
      const onStartOver = vi.fn()
      render(<DemoResult {...defaultProps} onStartOver={onStartOver} />)

      fireEvent.click(screen.getByText('Back to Problem Selection'))
      expect(onStartOver).toHaveBeenCalledTimes(1)
    })
  })

  describe('Sign Up CTA', () => {
    it('shows sign up call to action', () => {
      render(<DemoResult {...defaultProps} />)

      expect(screen.getByText('Want to track your progress?')).toBeInTheDocument()
      expect(screen.getByText('Get Started Free')).toBeInTheDocument()
    })

    it('has link to main app', () => {
      render(<DemoResult {...defaultProps} />)

      const link = screen.getByText('Get Started Free')
      expect(link.closest('a')).toHaveAttribute('href', '/')
    })
  })

  describe('Icons', () => {
    it('shows checkmark icon for correct answer', () => {
      const { container } = render(<DemoResult {...defaultProps} />)

      // Check for SVG with checkmark path
      const checkmarkSvg = container.querySelector('.text-green-600')
      expect(checkmarkSvg).toBeInTheDocument()
    })

    it('shows warning icon for incorrect answer', () => {
      const { container } = render(
        <DemoResult {...defaultProps} isCorrect={false} />
      )

      // Check for SVG with warning path
      const warningSvg = container.querySelector('.text-amber-600')
      expect(warningSvg).toBeInTheDocument()
    })
  })
})
