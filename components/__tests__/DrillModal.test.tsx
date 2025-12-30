import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import DrillModal from '../DrillModal'
import type { DrillTask } from '@/types/circuitBreaker'

// Mock MathRenderer
vi.mock('../MathRenderer', () => ({
  default: ({ text }: { text: string }) => <span data-testid="math-renderer">{text}</span>,
}))

describe('DrillModal', () => {
  const mockOnComplete = vi.fn()
  const mockOnSkip = vi.fn()

  // Multiple choice drill
  const multipleChoiceDrill: DrillTask = {
    id: 'drill_vec_001',
    linkedErrorTag: 'vector_component',
    linkedCategory: 'VECTOR_SCALAR_CONFUSION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 1,
      levelTitle: 'Concept',
      question: 'A force F acts at angle θ above the horizontal. Which gives the horizontal component?',
      options: ['F sin(θ)', 'F cos(θ)', 'F tan(θ)', 'F / cos(θ)'],
      correctIndex: 1,
      explanation: 'The horizontal component uses cosine: Fₓ = F cos(θ)',
      feedbackPerOption: [
        'sin(θ) gives the vertical component, not horizontal',
        'Correct! cos(θ) projects onto the horizontal axis',
        'tan(θ) is the ratio of components, not a component itself',
        'Division by cos is used for resolving along an inclined plane',
      ],
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Vector resolution', 'Trigonometry basics'],
    successMessage: 'Remember: Fₓ = F cos(θ), Fᵧ = F sin(θ)',
    conceptReinforcement: 'The angle is always measured from the axis you want the component along.',
  }

  // Fill-in-the-blank drill
  const fillBlankDrill: DrillTask = {
    id: 'drill_sign_001',
    linkedErrorTag: 'sign_convention',
    linkedCategory: 'SIGN_CONVENTION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'FILL_BLANK',
      level: 1,
      levelTitle: 'Concept',
      question: 'Complete the sign convention rule:',
      sentence: 'If upward is positive, then the acceleration due to gravity g is ____.',
      correctTerm: 'negative',
      distractors: ['positive', 'zero', '9.8'],
      explanation: 'Gravity points downward, opposite to the positive direction.',
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Coordinate systems', 'Vectors'],
    successMessage: 'g direction depends on your chosen convention!',
    conceptReinforcement: 'Always define your positive direction first, then assign signs consistently.',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('renders the modal with header', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      expect(screen.getByText('Quick Drill')).toBeInTheDocument()
      expect(screen.getByText('Vector Components')).toBeInTheDocument()
    })

    it('renders the question', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      expect(screen.getByText(multipleChoiceDrill.task.question)).toBeInTheDocument()
    })

    it('renders multiple choice options', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      const task = multipleChoiceDrill.task
      if (task.type === 'MULTIPLE_CHOICE') {
        task.options.forEach(option => {
          expect(screen.getByText(option)).toBeInTheDocument()
        })
      }
    })

    it('renders fill-blank sentence', () => {
      render(
        <DrillModal
          drill={fillBlankDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      const task = fillBlankDrill.task
      if (task.type === 'FILL_BLANK') {
        expect(screen.getByText(task.sentence)).toBeInTheDocument()
      }
    })

    it('renders fill-blank options including correct term and distractors', () => {
      render(
        <DrillModal
          drill={fillBlankDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      const task = fillBlankDrill.task
      if (task.type === 'FILL_BLANK') {
        expect(screen.getByText(task.correctTerm)).toBeInTheDocument()
        task.distractors.forEach(distractor => {
          expect(screen.getByText(distractor)).toBeInTheDocument()
        })
      }
    })

    it('renders Check Answer button initially disabled', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      const button = screen.getByRole('button', { name: /check answer/i })
      expect(button).toBeDisabled()
    })

    it('renders skip button', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      expect(screen.getByTitle('Skip drill')).toBeInTheDocument()
    })

    it('renders attempt counter', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      expect(screen.getByText('Attempt 0/2')).toBeInTheDocument()
    })
  })

  describe('Multiple Choice Interaction', () => {
    it('enables Check Answer button when option is selected', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      const optionButton = screen.getByText('F sin(θ)').closest('button')
      fireEvent.click(optionButton!)

      const checkButton = screen.getByRole('button', { name: /check answer/i })
      expect(checkButton).not.toBeDisabled()
    })

    it('shows correct feedback when right answer is selected', async () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Select correct answer (index 1 = F cos(θ))
      const optionButton = screen.getByText('F cos(θ)').closest('button')
      fireEvent.click(optionButton!)

      const checkButton = screen.getByRole('button', { name: /check answer/i })
      fireEvent.click(checkButton)

      expect(screen.getByText('Correct!')).toBeInTheDocument()
      expect(screen.getByText(multipleChoiceDrill.successMessage)).toBeInTheDocument()
    })

    it('calls onComplete with true after correct answer', async () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Select correct answer
      const optionButton = screen.getByText('F cos(θ)').closest('button')
      fireEvent.click(optionButton!)

      const checkButton = screen.getByRole('button', { name: /check answer/i })
      fireEvent.click(checkButton)

      // Fast-forward past the 2000ms delay
      vi.advanceTimersByTime(2000)

      expect(mockOnComplete).toHaveBeenCalledWith(true)
    })

    it('shows incorrect feedback when wrong answer is selected', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Select wrong answer (index 0 = F sin(θ))
      const optionButton = screen.getByText('F sin(θ)').closest('button')
      fireEvent.click(optionButton!)

      const checkButton = screen.getByRole('button', { name: /check answer/i })
      fireEvent.click(checkButton)

      expect(screen.getByText('Not quite')).toBeInTheDocument()
      expect(screen.getByText('sin(θ) gives the vertical component, not horizontal')).toBeInTheDocument()
    })

    it('shows remaining attempts after wrong answer', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Select wrong answer
      const optionButton = screen.getByText('F sin(θ)').closest('button')
      fireEvent.click(optionButton!)

      const checkButton = screen.getByRole('button', { name: /check answer/i })
      fireEvent.click(checkButton)

      expect(screen.getByText('1 attempt remaining')).toBeInTheDocument()
    })

    it('shows Try Again button after wrong answer with attempts remaining', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Select wrong answer
      const optionButton = screen.getByText('F sin(θ)').closest('button')
      fireEvent.click(optionButton!)

      const checkButton = screen.getByRole('button', { name: /check answer/i })
      fireEvent.click(checkButton)

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    })

    it('resets selection when Try Again is clicked', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Select wrong answer
      const optionButton = screen.getByText('F sin(θ)').closest('button')
      fireEvent.click(optionButton!)

      const checkButton = screen.getByRole('button', { name: /check answer/i })
      fireEvent.click(checkButton)

      // Click Try Again
      const tryAgainButton = screen.getByRole('button', { name: /try again/i })
      fireEvent.click(tryAgainButton)

      // Check Answer button should be disabled again
      const newCheckButton = screen.getByRole('button', { name: /check answer/i })
      expect(newCheckButton).toBeDisabled()
    })
  })

  describe('Max Attempts', () => {
    it('shows answer after max attempts reached', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // First wrong attempt
      let optionButton = screen.getByText('F sin(θ)').closest('button')
      fireEvent.click(optionButton!)
      fireEvent.click(screen.getByRole('button', { name: /check answer/i }))

      // Try again
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))

      // Second wrong attempt (max attempts = 2)
      optionButton = screen.getByText('F tan(θ)').closest('button')
      fireEvent.click(optionButton!)
      fireEvent.click(screen.getByRole('button', { name: /check answer/i }))

      expect(screen.getByText("Here's the answer")).toBeInTheDocument()
      expect(screen.getByText(multipleChoiceDrill.conceptReinforcement)).toBeInTheDocument()
    })

    it('shows Got it, continue button after max attempts', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // First wrong attempt
      let optionButton = screen.getByText('F sin(θ)').closest('button')
      fireEvent.click(optionButton!)
      fireEvent.click(screen.getByRole('button', { name: /check answer/i }))

      // Try again
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))

      // Second wrong attempt
      optionButton = screen.getByText('F tan(θ)').closest('button')
      fireEvent.click(optionButton!)
      fireEvent.click(screen.getByRole('button', { name: /check answer/i }))

      expect(screen.getByRole('button', { name: /got it, continue/i })).toBeInTheDocument()
    })

    it('calls onComplete with false when Got it is clicked', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Use up all attempts
      let optionButton = screen.getByText('F sin(θ)').closest('button')
      fireEvent.click(optionButton!)
      fireEvent.click(screen.getByRole('button', { name: /check answer/i }))
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))

      optionButton = screen.getByText('F tan(θ)').closest('button')
      fireEvent.click(optionButton!)
      fireEvent.click(screen.getByRole('button', { name: /check answer/i }))

      // Click Got it
      fireEvent.click(screen.getByRole('button', { name: /got it, continue/i }))

      expect(mockOnComplete).toHaveBeenCalledWith(false)
    })
  })

  describe('Fill-in-the-Blank Interaction', () => {
    it('enables Check Answer button when term is selected', () => {
      render(
        <DrillModal
          drill={fillBlankDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      const termButton = screen.getByText('negative').closest('button')
      fireEvent.click(termButton!)

      const checkButton = screen.getByRole('button', { name: /check answer/i })
      expect(checkButton).not.toBeDisabled()
    })

    it('shows correct feedback for right fill-blank answer', async () => {
      render(
        <DrillModal
          drill={fillBlankDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Select correct answer
      const termButton = screen.getByText('negative').closest('button')
      fireEvent.click(termButton!)

      const checkButton = screen.getByRole('button', { name: /check answer/i })
      fireEvent.click(checkButton)

      expect(screen.getByText('Correct!')).toBeInTheDocument()
      expect(screen.getByText(fillBlankDrill.successMessage)).toBeInTheDocument()
    })

    it('shows incorrect feedback for wrong fill-blank answer', () => {
      render(
        <DrillModal
          drill={fillBlankDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Select wrong answer
      const termButton = screen.getByText('positive').closest('button')
      fireEvent.click(termButton!)

      const checkButton = screen.getByRole('button', { name: /check answer/i })
      fireEvent.click(checkButton)

      expect(screen.getByText('Not quite')).toBeInTheDocument()
    })
  })

  describe('Skip Functionality', () => {
    it('calls onSkip when skip button is clicked', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      const skipButton = screen.getByTitle('Skip drill')
      fireEvent.click(skipButton)

      expect(mockOnSkip).toHaveBeenCalled()
    })
  })

  describe('Keyboard Shortcuts', () => {
    it('submits on Enter when answer is selected', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Select an answer
      const optionButton = screen.getByText('F cos(θ)').closest('button')
      fireEvent.click(optionButton!)

      // Press Enter
      fireEvent.keyDown(window, { key: 'Enter' })

      expect(screen.getByText('Correct!')).toBeInTheDocument()
    })

    it('does not submit on Enter when no answer is selected', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Press Enter without selecting
      fireEvent.keyDown(window, { key: 'Enter' })

      // Should not show feedback
      expect(screen.queryByText('Correct!')).not.toBeInTheDocument()
      expect(screen.queryByText('Not quite')).not.toBeInTheDocument()
    })

    it('does not submit on Enter when feedback is showing', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Select wrong answer and submit
      const optionButton = screen.getByText('F sin(θ)').closest('button')
      fireEvent.click(optionButton!)
      fireEvent.click(screen.getByRole('button', { name: /check answer/i }))

      // Feedback is showing, pressing Enter should not affect state
      const attemptsBefore = screen.getByText('1 attempt remaining')
      fireEvent.keyDown(window, { key: 'Enter' })

      // Should still show same feedback (no new attempt)
      expect(screen.getByText('1 attempt remaining')).toBe(attemptsBefore)
    })
  })

  describe('Disabled State', () => {
    it('disables options after feedback is shown', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Select and submit
      const optionButton = screen.getByText('F sin(θ)').closest('button')
      fireEvent.click(optionButton!)
      fireEvent.click(screen.getByRole('button', { name: /check answer/i }))

      // All options should be disabled
      const allOptions = screen.getAllByRole('button').filter(
        btn => btn.textContent?.includes('F ')
      )
      allOptions.forEach(option => {
        expect(option).toBeDisabled()
      })
    })
  })

  describe('Different Error Tags', () => {
    const signDrill: DrillTask = {
      ...multipleChoiceDrill,
      id: 'drill_sign_002',
      linkedErrorTag: 'sign_convention',
    }

    it('displays correct tag label for sign_convention', () => {
      render(
        <DrillModal
          drill={signDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      expect(screen.getByText('Sign Convention')).toBeInTheDocument()
    })

    const trigDrill: DrillTask = {
      ...multipleChoiceDrill,
      id: 'drill_trig_001',
      linkedErrorTag: 'trig_identity',
    }

    it('displays correct tag label for trig_identity', () => {
      render(
        <DrillModal
          drill={trigDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      expect(screen.getByText('Trigonometry')).toBeInTheDocument()
    })
  })

  describe('Attempt Counter', () => {
    it('increments attempt counter on each submission', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      expect(screen.getByText('Attempt 0/2')).toBeInTheDocument()

      // First attempt
      let optionButton = screen.getByText('F sin(θ)').closest('button')
      fireEvent.click(optionButton!)
      fireEvent.click(screen.getByRole('button', { name: /check answer/i }))

      expect(screen.getByText('Attempt 1/2')).toBeInTheDocument()

      // Try again and second attempt
      fireEvent.click(screen.getByRole('button', { name: /try again/i }))
      optionButton = screen.getByText('F tan(θ)').closest('button')
      fireEvent.click(optionButton!)
      fireEvent.click(screen.getByRole('button', { name: /check answer/i }))

      expect(screen.getByText('Attempt 2/2')).toBeInTheDocument()
    })
  })

  describe('Continuing State', () => {
    it('shows Continuing... text after correct answer', () => {
      render(
        <DrillModal
          drill={multipleChoiceDrill}
          onComplete={mockOnComplete}
          onSkip={mockOnSkip}
        />
      )

      // Select correct answer
      const optionButton = screen.getByText('F cos(θ)').closest('button')
      fireEvent.click(optionButton!)
      fireEvent.click(screen.getByRole('button', { name: /check answer/i }))

      expect(screen.getByText('Continuing...')).toBeInTheDocument()
    })
  })
})
