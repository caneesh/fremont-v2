import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RevealReconstructValidate from '../RevealReconstructValidate'
import type { MultipleChoiceTask } from '@/types/microTask'

vi.mock('../../MathRenderer', () => ({
  default: ({ text }: { text: string }) => <span data-testid="math-renderer">{text}</span>,
}))

const mockTask: MultipleChoiceTask = {
  level: 1,
  levelTitle: 'Concept',
  question: 'What is the correct approach?',
  explanation: 'The correct approach uses Newton\'s second law. This is fundamental.',
  type: 'MULTIPLE_CHOICE',
  options: ['F = ma', 'F = mv', 'F = m/a', 'F = m + a'],
  correctIndex: 0,
}

describe('RevealReconstructValidate', () => {
  const onComplete = vi.fn()
  const onSkip = vi.fn()
  const onClose = vi.fn()
  const onLogEvent = vi.fn()

  beforeEach(() => {
    onComplete.mockClear()
    onSkip.mockClear()
    onClose.mockClear()
    onLogEvent.mockClear()
  })

  describe('Reveal Stage', () => {
    it('renders the reveal stage initially', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
          onLogEvent={onLogEvent}
        />
      )

      expect(screen.getByText('Level 1: Concept')).not.toBeNull()
      expect(screen.getByText('Understanding the concept')).not.toBeNull()
      expect(screen.getByText('I understand, continue')).not.toBeNull()
    })

    it('shows three structured sections', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
        />
      )

      expect(screen.getByText('1. Approach')).not.toBeNull()
      expect(screen.getByText('2. Key Insight')).not.toBeNull()
      expect(screen.getByText('3. Takeaway')).not.toBeNull()
    })

    it('toggles more detail section', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
        />
      )

      const showMoreButton = screen.getByText('Show full explanation')
      fireEvent.click(showMoreButton)

      expect(screen.getByText('Hide full explanation')).not.toBeNull()
    })

    it('logs reveal_opened event on mount', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
          onLogEvent={onLogEvent}
        />
      )

      expect(onLogEvent).toHaveBeenCalledWith('reveal_opened', {
        stepId: 0,
        levelId: 1,
      })
    })
  })

  describe('Reconstruct Stage', () => {
    it('proceeds to reconstruct stage when clicking continue', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
          onLogEvent={onLogEvent}
        />
      )

      fireEvent.click(screen.getByText('I understand, continue'))

      expect(screen.getByText('Quick comprehension check')).not.toBeNull()
      expect(screen.getByText('Quick Check')).not.toBeNull()
      expect(onLogEvent).toHaveBeenCalledWith('reveal_explanation_shown', {
        stepId: 0,
        levelId: 1,
      })
    })

    it('shows the question and options', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
        />
      )

      fireEvent.click(screen.getByText('I understand, continue'))

      // Question should be visible (wrapped in MathRenderer)
      expect(screen.getByText(/What is the correct approach/)).not.toBeNull()

      // Options should be visible
      expect(screen.getByText('F = ma')).not.toBeNull()
      expect(screen.getByText('F = mv')).not.toBeNull()
    })

    it('allows selecting an option', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
        />
      )

      fireEvent.click(screen.getByText('I understand, continue'))
      fireEvent.click(screen.getByText('F = ma'))

      // Check answer button should be enabled
      const checkButton = screen.getByText('Check answer')
      expect(checkButton).not.toBeNull()
    })

    it('disables check answer button when no option selected', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
        />
      )

      fireEvent.click(screen.getByText('I understand, continue'))

      const checkButton = screen.getByText('Check answer')
      expect(checkButton.closest('button')?.disabled).toBe(true)
    })
  })

  describe('Validate Stage - Correct Answer', () => {
    it('shows solid understanding for correct answer', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
          onLogEvent={onLogEvent}
        />
      )

      // Go through the flow
      fireEvent.click(screen.getByText('I understand, continue'))
      fireEvent.click(screen.getByText('F = ma'))
      fireEvent.click(screen.getByText('Check answer'))

      expect(screen.getByText('Solid Understanding')).not.toBeNull()
      expect(screen.getByText('Continue')).not.toBeNull()
    })

    it('logs correct answer events', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
          onLogEvent={onLogEvent}
        />
      )

      fireEvent.click(screen.getByText('I understand, continue'))
      fireEvent.click(screen.getByText('F = ma'))
      fireEvent.click(screen.getByText('Check answer'))

      expect(onLogEvent).toHaveBeenCalledWith('reconstruct_question_answered', expect.objectContaining({
        stepId: 0,
        levelId: 1,
        isCorrect: true,
      }))

      expect(onLogEvent).toHaveBeenCalledWith('reconstruct_completed', expect.objectContaining({
        outcome: 'solid',
      }))
    })

    it('calls onComplete with solid outcome when clicking continue', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
        />
      )

      fireEvent.click(screen.getByText('I understand, continue'))
      fireEvent.click(screen.getByText('F = ma'))
      fireEvent.click(screen.getByText('Check answer'))
      fireEvent.click(screen.getByText('Continue'))

      expect(onComplete).toHaveBeenCalledWith('solid', mockTask.explanation)
    })
  })

  describe('Validate Stage - Incorrect Answer', () => {
    it('shows mismatch for incorrect answer', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
        />
      )

      fireEvent.click(screen.getByText('I understand, continue'))
      fireEvent.click(screen.getByText('F = mv')) // Wrong answer
      fireEvent.click(screen.getByText('Check answer'))

      expect(screen.getByText('Needs Review')).not.toBeNull()
      expect(screen.getByText('The correct answer was:')).not.toBeNull()
    })

    it('shows try again button for incorrect answer', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
        />
      )

      fireEvent.click(screen.getByText('I understand, continue'))
      fireEvent.click(screen.getByText('F = mv'))
      fireEvent.click(screen.getByText('Check answer'))

      expect(screen.getByText('Try again')).not.toBeNull()
    })

    it('resets to reconstruct stage when clicking try again', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
        />
      )

      fireEvent.click(screen.getByText('I understand, continue'))
      fireEvent.click(screen.getByText('F = mv'))
      fireEvent.click(screen.getByText('Check answer'))
      fireEvent.click(screen.getByText('Try again'))

      expect(screen.getByText('Quick comprehension check')).not.toBeNull()
      expect(screen.getByText('Check answer')).not.toBeNull()
    })

    it('logs concept confusion for incorrect answer', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
          onLogEvent={onLogEvent}
        />
      )

      fireEvent.click(screen.getByText('I understand, continue'))
      fireEvent.click(screen.getByText('F = mv'))
      fireEvent.click(screen.getByText('Check answer'))

      expect(onLogEvent).toHaveBeenCalledWith('concept_confusion_detected', {
        stepId: 0,
        levelId: 1,
        conceptTag: 'Concept',
      })
    })

    it('calls onComplete with mismatch outcome when closing', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
        />
      )

      fireEvent.click(screen.getByText('I understand, continue'))
      fireEvent.click(screen.getByText('F = mv'))
      fireEvent.click(screen.getByText('Check answer'))
      fireEvent.click(screen.getByText('Close'))

      expect(onComplete).toHaveBeenCalledWith('mismatch', mockTask.explanation)
    })
  })

  describe('Skip Confirmation', () => {
    it('requires two clicks to skip', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
        />
      )

      const skipButton = screen.getByText('Skip checkpoint')
      fireEvent.click(skipButton)

      expect(screen.getByText('Click again to confirm skip')).not.toBeNull()
      expect(onSkip).not.toHaveBeenCalled()
    })

    it('calls onSkip after second click', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
          onLogEvent={onLogEvent}
        />
      )

      fireEvent.click(screen.getByText('Skip checkpoint'))
      fireEvent.click(screen.getByText('Click again to confirm skip'))

      expect(onSkip).toHaveBeenCalledTimes(1)
      expect(onLogEvent).toHaveBeenCalledWith('reveal_closed', {
        stepId: 0,
        levelId: 1,
      })
    })
  })

  describe('Close Modal', () => {
    it('calls onClose when clicking close button', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
          onLogEvent={onLogEvent}
        />
      )

      // Find the close button (X) in the header
      const closeButtons = screen.getAllByRole('button')
      const closeButton = closeButtons.find(btn => btn.querySelector('svg path[d="M6 18L18 6M6 6l12 12"]'))
      fireEvent.click(closeButton!)

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(onLogEvent).toHaveBeenCalledWith('reveal_closed', {
        stepId: 0,
        levelId: 1,
      })
    })
  })

  describe('Progress Indicator', () => {
    it('shows progress steps', () => {
      render(
        <RevealReconstructValidate
          task={mockTask}
          stepTitle="Calculate Force"
          onComplete={onComplete}
          onSkip={onSkip}
          onClose={onClose}
        />
      )

      expect(screen.getByText('Reveal')).not.toBeNull()
      expect(screen.getByText('Reconstruct')).not.toBeNull()
      expect(screen.getByText('Validate')).not.toBeNull()
    })
  })
})
