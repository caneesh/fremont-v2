import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DecisionGate from '../DecisionGate'
import type { StepDecisionGateState } from '@/types/gatingPolicy'
import type { MultipleChoiceTask, FillBlankTask } from '@/types/microTask'

// Mock Math.random for consistent fill-blank option ordering
const originalRandom = Math.random
beforeEach(() => {
  Math.random = () => 0.5
})

afterEach(() => {
  Math.random = originalRandom
})

describe('DecisionGate', () => {
  // Test fixtures
  const mockMCQTask: MultipleChoiceTask = {
    type: 'MULTIPLE_CHOICE',
    level: 2,
    levelTitle: 'Visual',
    question: 'What force acts on the block parallel to the incline?',
    explanation: 'The component of gravity along the incline is mg sin θ.',
    options: [
      'mg cos θ',
      'mg sin θ',
      'mg tan θ',
      'mg',
    ],
    correctIndex: 1,
    feedbackPerOption: [
      'That is the normal component perpendicular to the incline.',
      'Correct! This is the parallel component.',
      'tan θ is not a force component.',
      'mg is the total weight, not the parallel component.',
    ],
  }

  const mockFillBlankTask: FillBlankTask = {
    type: 'FILL_BLANK',
    level: 1,
    levelTitle: 'Concept',
    question: 'Complete the sentence:',
    explanation: 'Newton\'s Second Law states F = ma.',
    sentence: 'According to Newton\'s Second Law, F = ____.',
    correctTerm: 'ma',
    distractors: ['mv', 'mg', 'mv²'],
    caseSensitive: false,
  }

  const createGateState = (overrides: Partial<StepDecisionGateState> = {}): StepDecisionGateState => ({
    stepId: 1,
    microTasksPassedCount: 0,
    currentAttempts: 0,
    gatePassed: false,
    hintAutoUnlocked: false,
    ...overrides,
  })

  const defaultProps = {
    gateState: createGateState(),
    task: mockMCQTask,
    requiredCount: 1,
    maxAttempts: 2,
    onAnswer: vi.fn(),
    onAutoUnlockHint: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders decision gate header', () => {
      render(<DecisionGate {...defaultProps} />)

      expect(screen.getByText('Decision Check')).toBeInTheDocument()
      expect(screen.getByText('Answer correctly to unlock step completion')).toBeInTheDocument()
    })

    it('renders MCQ task with all options', () => {
      render(<DecisionGate {...defaultProps} />)

      expect(screen.getByText(mockMCQTask.question)).toBeInTheDocument()
      mockMCQTask.options.forEach(option => {
        expect(screen.getByText(option)).toBeInTheDocument()
      })
    })

    it('renders fill-in-blank task with sentence and options', () => {
      render(<DecisionGate {...defaultProps} task={mockFillBlankTask} />)

      expect(screen.getByText(mockFillBlankTask.question)).toBeInTheDocument()
      expect(screen.getByText(/According to Newton's Second Law, F = ______/)).toBeInTheDocument()
      // Options should be rendered (correct + distractors)
      expect(screen.getByText('ma')).toBeInTheDocument()
      expect(screen.getByText('mv')).toBeInTheDocument()
      expect(screen.getByText('mg')).toBeInTheDocument()
    })

    it('renders progress indicators based on requiredCount', () => {
      render(<DecisionGate {...defaultProps} requiredCount={3} />)

      // Should have 3 progress dots
      const progressDots = document.querySelectorAll('.rounded-full.w-2.h-2')
      expect(progressDots.length).toBe(3)
    })

    it('shows filled progress indicators for completed tasks', () => {
      render(
        <DecisionGate
          {...defaultProps}
          requiredCount={3}
          gateState={createGateState({ microTasksPassedCount: 2 })}
        />
      )

      const greenDots = document.querySelectorAll('.bg-green-500')
      expect(greenDots.length).toBe(2)
    })

    it('renders gate status with level info', () => {
      render(<DecisionGate {...defaultProps} />)

      expect(screen.getByText('0/1 correct')).toBeInTheDocument()
      expect(screen.getByText('Level 2: Visual')).toBeInTheDocument()
    })

    it('renders Check Answer button initially', () => {
      render(<DecisionGate {...defaultProps} />)

      expect(screen.getByText('Check Answer')).toBeInTheDocument()
    })
  })

  describe('MCQ Selection', () => {
    it('allows selecting an option', () => {
      render(<DecisionGate {...defaultProps} />)

      const option = screen.getByText('mg sin θ')
      fireEvent.click(option)

      // Check Answer button should be enabled
      const submitButton = screen.getByText('Check Answer')
      expect(submitButton).not.toBeDisabled()
    })

    it('disables Check Answer button when no option selected', () => {
      render(<DecisionGate {...defaultProps} />)

      const submitButton = screen.getByText('Check Answer')
      expect(submitButton).toBeDisabled()
    })

    it('calls onAnswer with correct=true when correct option selected', () => {
      const onAnswer = vi.fn()
      render(<DecisionGate {...defaultProps} onAnswer={onAnswer} />)

      // Select correct option (index 1)
      fireEvent.click(screen.getByText('mg sin θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      expect(onAnswer).toHaveBeenCalledWith(true, mockMCQTask.explanation)
    })

    it('calls onAnswer with correct=false when wrong option selected', () => {
      const onAnswer = vi.fn()
      render(<DecisionGate {...defaultProps} onAnswer={onAnswer} />)

      // Select wrong option (index 0)
      fireEvent.click(screen.getByText('mg cos θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      expect(onAnswer).toHaveBeenCalledWith(false, mockMCQTask.explanation)
    })
  })

  describe('Fill-in-Blank Selection', () => {
    it('allows selecting a fill-blank option', () => {
      render(<DecisionGate {...defaultProps} task={mockFillBlankTask} />)

      fireEvent.click(screen.getByText('ma'))

      const submitButton = screen.getByText('Check Answer')
      expect(submitButton).not.toBeDisabled()
    })

    it('calls onAnswer with correct=true for correct fill-blank answer', () => {
      const onAnswer = vi.fn()
      render(<DecisionGate {...defaultProps} task={mockFillBlankTask} onAnswer={onAnswer} />)

      fireEvent.click(screen.getByText('ma'))
      fireEvent.click(screen.getByText('Check Answer'))

      expect(onAnswer).toHaveBeenCalledWith(true, mockFillBlankTask.explanation)
    })

    it('calls onAnswer with correct=false for wrong fill-blank answer', () => {
      const onAnswer = vi.fn()
      render(<DecisionGate {...defaultProps} task={mockFillBlankTask} onAnswer={onAnswer} />)

      fireEvent.click(screen.getByText('mv'))
      fireEvent.click(screen.getByText('Check Answer'))

      expect(onAnswer).toHaveBeenCalledWith(false, mockFillBlankTask.explanation)
    })

    it('handles case-insensitive fill-blank matching', () => {
      const caseInsensitiveTask: FillBlankTask = {
        ...mockFillBlankTask,
        correctTerm: 'MA',
        caseSensitive: false,
      }
      const onAnswer = vi.fn()
      render(<DecisionGate {...defaultProps} task={caseInsensitiveTask} onAnswer={onAnswer} />)

      // Click on lowercase option
      fireEvent.click(screen.getByText('MA'))
      fireEvent.click(screen.getByText('Check Answer'))

      expect(onAnswer).toHaveBeenCalledWith(true, caseInsensitiveTask.explanation)
    })
  })

  describe('Feedback Display', () => {
    it('shows correct feedback when answer is correct', () => {
      render(<DecisionGate {...defaultProps} />)

      fireEvent.click(screen.getByText('mg sin θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      expect(screen.getByText('Correct!')).toBeInTheDocument()
      expect(screen.getByText(mockMCQTask.explanation)).toBeInTheDocument()
    })

    it('shows incorrect feedback when answer is wrong', () => {
      render(<DecisionGate {...defaultProps} />)

      fireEvent.click(screen.getByText('mg cos θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      expect(screen.getByText('Not quite right.')).toBeInTheDocument()
    })

    it('shows specific feedback per option when available', () => {
      render(<DecisionGate {...defaultProps} />)

      fireEvent.click(screen.getByText('mg cos θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      expect(screen.getByText(mockMCQTask.feedbackPerOption![0])).toBeInTheDocument()
    })

    it('shows Continue button after correct answer', () => {
      render(<DecisionGate {...defaultProps} />)

      fireEvent.click(screen.getByText('mg sin θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      expect(screen.getByText('Continue')).toBeInTheDocument()
    })

    it('shows Try Again button after wrong answer', () => {
      render(<DecisionGate {...defaultProps} />)

      fireEvent.click(screen.getByText('mg cos θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      expect(screen.getByText('Try Again')).toBeInTheDocument()
    })

    it('resets state when Try Again is clicked', () => {
      render(<DecisionGate {...defaultProps} />)

      // Submit wrong answer
      fireEvent.click(screen.getByText('mg cos θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      // Click Try Again
      fireEvent.click(screen.getByText('Try Again'))

      // Should be back to Check Answer state
      expect(screen.getByText('Check Answer')).toBeInTheDocument()
      expect(screen.queryByText('Not quite right.')).not.toBeInTheDocument()
    })
  })

  describe('Attempts Warning', () => {
    it('does not show warning when no previous attempts', () => {
      render(<DecisionGate {...defaultProps} />)

      expect(screen.queryByText(/attempts remaining/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Last attempt/)).not.toBeInTheDocument()
    })

    it('shows attempts remaining after one wrong attempt', () => {
      render(
        <DecisionGate
          {...defaultProps}
          gateState={createGateState({ currentAttempts: 1 })}
          maxAttempts={3}
        />
      )

      expect(screen.getByText('2 attempts remaining')).toBeInTheDocument()
    })

    it('shows last attempt warning when one attempt remaining', () => {
      render(
        <DecisionGate
          {...defaultProps}
          gateState={createGateState({ currentAttempts: 1 })}
          maxAttempts={2}
        />
      )

      expect(screen.getByText('Last attempt! A hint will be shown if incorrect.')).toBeInTheDocument()
    })
  })

  describe('Auto-Unlock Hint', () => {
    it('calls onAutoUnlockHint when max attempts reached', () => {
      const onAutoUnlockHint = vi.fn()
      render(
        <DecisionGate
          {...defaultProps}
          gateState={createGateState({ currentAttempts: 2 })}
          maxAttempts={2}
          onAutoUnlockHint={onAutoUnlockHint}
        />
      )

      // Submit wrong answer when already at max attempts
      fireEvent.click(screen.getByText('mg cos θ'))
      fireEvent.click(screen.getByText('Check Answer'))
      fireEvent.click(screen.getByText('Try Again'))

      expect(onAutoUnlockHint).toHaveBeenCalled()
    })

    it('does not call onAutoUnlockHint for correct answer', () => {
      const onAutoUnlockHint = vi.fn()
      render(
        <DecisionGate
          {...defaultProps}
          gateState={createGateState({ currentAttempts: 1 })}
          maxAttempts={2}
          onAutoUnlockHint={onAutoUnlockHint}
        />
      )

      fireEvent.click(screen.getByText('mg sin θ'))
      fireEvent.click(screen.getByText('Check Answer'))
      fireEvent.click(screen.getByText('Continue'))

      expect(onAutoUnlockHint).not.toHaveBeenCalled()
    })
  })

  describe('Disabled State', () => {
    it('prevents option selection when feedback is shown', () => {
      const onAnswer = vi.fn()
      render(<DecisionGate {...defaultProps} onAnswer={onAnswer} />)

      // Submit correct answer
      fireEvent.click(screen.getByText('mg sin θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      // Try to select another option
      fireEvent.click(screen.getByText('mg cos θ'))

      // onAnswer should only have been called once
      expect(onAnswer).toHaveBeenCalledTimes(1)
    })

    it('disables option buttons when feedback is shown', () => {
      render(<DecisionGate {...defaultProps} />)

      fireEvent.click(screen.getByText('mg sin θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      const buttons = screen.getAllByRole('button').filter(
        btn => mockMCQTask.options.some(opt => btn.textContent?.includes(opt))
      )

      buttons.forEach(btn => {
        expect(btn).toBeDisabled()
      })
    })
  })

  describe('Visual Feedback Styling', () => {
    it('highlights selected option before submission', () => {
      const { container } = render(<DecisionGate {...defaultProps} />)

      fireEvent.click(screen.getByText('mg sin θ'))

      // Check for selection styling
      const selectedButton = screen.getByText('mg sin θ').closest('button')
      expect(selectedButton?.className).toContain('border-indigo-500')
    })

    it('shows green styling for correct answer after submission', () => {
      render(<DecisionGate {...defaultProps} />)

      fireEvent.click(screen.getByText('mg sin θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      const correctButton = screen.getByText('mg sin θ').closest('button')
      expect(correctButton?.className).toContain('border-green-500')
    })

    it('shows red styling for wrong answer after submission', () => {
      render(<DecisionGate {...defaultProps} />)

      fireEvent.click(screen.getByText('mg cos θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      const wrongButton = screen.getByText('mg cos θ').closest('button')
      expect(wrongButton?.className).toContain('border-red-500')
    })

    it('highlights correct option even when wrong answer selected', () => {
      render(<DecisionGate {...defaultProps} />)

      fireEvent.click(screen.getByText('mg cos θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      // Correct option should be highlighted green
      const correctButton = screen.getByText('mg sin θ').closest('button')
      expect(correctButton?.className).toContain('border-green-500')
    })
  })

  describe('Fill-in-Blank Feedback', () => {
    it('shows correct answer in feedback for wrong fill-blank answer', () => {
      render(<DecisionGate {...defaultProps} task={mockFillBlankTask} />)

      fireEvent.click(screen.getByText('mv'))
      fireEvent.click(screen.getByText('Check Answer'))

      expect(screen.getByText(/The correct answer is "ma"/)).toBeInTheDocument()
    })
  })

  describe('Integration', () => {
    it('handles complete correct flow', () => {
      const onAnswer = vi.fn()
      render(<DecisionGate {...defaultProps} onAnswer={onAnswer} />)

      // Select correct answer
      fireEvent.click(screen.getByText('mg sin θ'))
      expect(screen.getByText('Check Answer')).not.toBeDisabled()

      // Submit
      fireEvent.click(screen.getByText('Check Answer'))
      expect(onAnswer).toHaveBeenCalledWith(true, mockMCQTask.explanation)
      expect(screen.getByText('Correct!')).toBeInTheDocument()
      expect(screen.getByText('Continue')).toBeInTheDocument()
    })

    it('handles complete incorrect flow with retry', () => {
      const onAnswer = vi.fn()
      render(<DecisionGate {...defaultProps} onAnswer={onAnswer} />)

      // Select wrong answer
      fireEvent.click(screen.getByText('mg cos θ'))
      fireEvent.click(screen.getByText('Check Answer'))

      expect(onAnswer).toHaveBeenCalledWith(false, mockMCQTask.explanation)
      expect(screen.getByText('Not quite right.')).toBeInTheDocument()
      expect(screen.getByText('Try Again')).toBeInTheDocument()

      // Click Try Again
      fireEvent.click(screen.getByText('Try Again'))

      // Should be ready for another attempt
      expect(screen.getByText('Check Answer')).toBeDisabled()
      expect(screen.queryByText('Not quite right.')).not.toBeInTheDocument()
    })
  })
})
