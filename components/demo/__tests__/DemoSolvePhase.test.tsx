import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DemoSolvePhase from '../DemoSolvePhase'
import { DEMO_PROBLEMS } from '@/lib/demo/demoProblems'

describe('DemoSolvePhase', () => {
  const mockProblem = DEMO_PROBLEMS[0]
  const defaultProps = {
    problem: mockProblem,
    onSubmit: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders the problem statement', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      expect(screen.getByText('Problem')).toBeInTheDocument()
      expect(screen.getByText(mockProblem.statement)).toBeInTheDocument()
    })

    it('renders exam and topic badges', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      expect(screen.getByText(mockProblem.exam)).toBeInTheDocument()
      expect(screen.getByText(mockProblem.topic)).toBeInTheDocument()
    })

    it('renders hints section header', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      expect(screen.getByText('Progressive Hints')).toBeInTheDocument()
    })

    it('renders all hints as locked initially', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      const revealButtons = screen.getAllByText('Reveal')
      expect(revealButtons.length).toBeGreaterThanOrEqual(1)
    })

    it('renders answer input section', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      expect(screen.getByText('Your Answer')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('e.g., 4 or 2.5')).toBeInTheDocument()
    })

    it('renders Submit Answer button', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      expect(screen.getByText('Submit Answer')).toBeInTheDocument()
    })

    it('renders tips section', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      expect(screen.getByText('Tips')).toBeInTheDocument()
    })
  })

  describe('Hint Revealing', () => {
    it('reveals first hint when Reveal is clicked', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      const revealButtons = screen.getAllByText('Reveal')
      fireEvent.click(revealButtons[0])

      expect(screen.getByText(mockProblem.hints[0])).toBeInTheDocument()
    })

    it('shows Revealed indicator after revealing', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      const revealButtons = screen.getAllByText('Reveal')
      fireEvent.click(revealButtons[0])

      expect(screen.getByText('Revealed')).toBeInTheDocument()
    })

    it('enables second hint after first is revealed', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      // Reveal first hint
      const revealButtons = screen.getAllByText('Reveal')
      fireEvent.click(revealButtons[0])

      // Second hint should now be revealable
      const newRevealButtons = screen.getAllByText('Reveal')
      expect(newRevealButtons.length).toBeGreaterThanOrEqual(1)

      // Click the new reveal button
      fireEvent.click(newRevealButtons[0])

      // Should show second hint content
      if (mockProblem.hints.length > 1) {
        expect(screen.getByText(mockProblem.hints[1])).toBeInTheDocument()
      }
    })

    it('shows message for locked hints', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      // If there are multiple hints, later ones should show locked message
      if (mockProblem.hints.length > 1) {
        expect(screen.getByText('Reveal previous hint first')).toBeInTheDocument()
      }
    })
  })

  describe('Answer Submission', () => {
    it('disables Submit button when answer is empty', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      const submitButton = screen.getByText('Submit Answer')
      expect(submitButton).toBeDisabled()
    })

    it('enables Submit button when answer is entered', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      const input = screen.getByPlaceholderText('e.g., 4 or 2.5')
      fireEvent.change(input, { target: { value: '4' } })

      const submitButton = screen.getByText('Submit Answer')
      expect(submitButton).not.toBeDisabled()
    })

    it('calls onSubmit with correct answer validation', async () => {
      const onSubmit = vi.fn()
      render(<DemoSolvePhase {...defaultProps} onSubmit={onSubmit} />)

      const input = screen.getByPlaceholderText('e.g., 4 or 2.5')
      fireEvent.change(input, { target: { value: mockProblem.expectedAnswer } })

      const submitButton = screen.getByText('Submit Answer')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(mockProblem.expectedAnswer, true)
      }, { timeout: 1000 })
    })

    it('calls onSubmit with incorrect answer validation', async () => {
      const onSubmit = vi.fn()
      render(<DemoSolvePhase {...defaultProps} onSubmit={onSubmit} />)

      const input = screen.getByPlaceholderText('e.g., 4 or 2.5')
      fireEvent.change(input, { target: { value: '999' } })

      const submitButton = screen.getByText('Submit Answer')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith('999', false)
      }, { timeout: 1000 })
    })

    it('shows loading state while submitting', async () => {
      render(<DemoSolvePhase {...defaultProps} />)

      const input = screen.getByPlaceholderText('e.g., 4 or 2.5')
      fireEvent.change(input, { target: { value: '4' } })

      const submitButton = screen.getByText('Submit Answer')
      fireEvent.click(submitButton)

      expect(screen.getByText('Checking...')).toBeInTheDocument()
    })

    it('handles answer with whitespace', async () => {
      const onSubmit = vi.fn()
      render(<DemoSolvePhase {...defaultProps} onSubmit={onSubmit} />)

      const input = screen.getByPlaceholderText('e.g., 4 or 2.5')
      fireEvent.change(input, { target: { value: `  ${mockProblem.expectedAnswer}  ` } })

      const submitButton = screen.getByText('Submit Answer')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          `  ${mockProblem.expectedAnswer}  `,
          true
        )
      }, { timeout: 1000 })
    })
  })

  describe('Hint Labels', () => {
    it('shows correct labels for hints', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      expect(screen.getByText('Hint 1: Reasoning Approach')).toBeInTheDocument()
      if (mockProblem.hints.length > 1) {
        expect(screen.getByText('Hint 2: Setup & Formula')).toBeInTheDocument()
      }
    })
  })

  describe('Answer Input', () => {
    it('allows typing in the input field', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      const input = screen.getByPlaceholderText('e.g., 4 or 2.5') as HTMLInputElement
      fireEvent.change(input, { target: { value: 'test' } })

      expect(input.value).toBe('test')
    })

    it('shows helper text about entering numbers', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      expect(screen.getByText('Enter just the number without units')).toBeInTheDocument()
    })
  })

  describe('Tips Section', () => {
    it('displays helpful tips', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      expect(screen.getByText(/Double-check your arithmetic/)).toBeInTheDocument()
      expect(screen.getByText(/what the question asks/)).toBeInTheDocument()
      expect(screen.getByText(/hints only if you.*stuck/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper label for answer input', () => {
      render(<DemoSolvePhase {...defaultProps} />)

      const input = screen.getByPlaceholderText('e.g., 4 or 2.5')
      expect(input).toHaveAttribute('id', 'answer')

      const label = screen.getByText('Enter your final answer (numerical value only)')
      expect(label).toHaveAttribute('for', 'answer')
    })
  })
})
