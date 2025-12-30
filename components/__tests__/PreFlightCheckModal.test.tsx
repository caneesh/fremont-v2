import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PreFlightCheckModal from '../PreFlightCheckModal'
import type { PreFlightCheck, PreFlightValidation } from '@/types/preFlightCheck'

// Mock the authenticatedFetch
vi.mock('@/lib/api/apiClient', () => ({
  authenticatedFetch: vi.fn(),
}))

// Mock MathRenderer
vi.mock('../MathRenderer', () => ({
  default: ({ text }: { text: string }) => <span data-testid="math-renderer">{text}</span>,
}))

describe('PreFlightCheckModal', () => {
  const mockCheck: PreFlightCheck = {
    id: 'test-check-1',
    targetStepId: 1,
    law: 'kinematic_equations',
    displayName: 'Kinematic Equations',
    formula: 'v = v_0 + at',
    checkItems: [
      {
        preCondition: {
          id: 'constant_acceleration',
          description: 'Acceleration must be constant',
          formalStatement: 'a = constant',
          severity: 'critical',
          checkQuestion: 'Is the acceleration constant?',
          hints: ['Check if forces are constant'],
          problemTextIndicators: ['constant acceleration'],
          physicsRationale: 'Kinematic equations are derived assuming constant a.',
        },
        options: [
          {
            id: 'opt-1',
            label: 'Yes, acceleration is constant',
            isCorrect: true,
            studentReasoningPattern: 'Correctly identifies constant acceleration',
            prevalence: 'common',
          },
          {
            id: 'opt-2',
            label: 'No, acceleration varies with position',
            isCorrect: false,
            trapType: 'condition_violation',
            misconceptionExplanation: 'This would mean kinematics equations do not apply.',
            studentReasoningPattern: 'Misidentifies the scenario',
            prevalence: 'common',
          },
        ],
        correctOptionIds: ['opt-1'],
        multiSelect: false,
      },
    ],
    problemContext: {
      relevantText: 'A ball is thrown upward with initial velocity 10 m/s.',
    },
    requiredToPass: 1,
    maxAttempts: 3,
  }

  const mockOnComplete = vi.fn()
  const mockOnSkip = vi.fn()
  const mockOnClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the modal with correct header', () => {
    render(
      <PreFlightCheckModal
        check={mockCheck}
        problemText="A ball is thrown upward..."
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Pre-Flight Check')).toBeInTheDocument()
    expect(screen.getByText('Verify conditions before using this formula')).toBeInTheDocument()
  })

  it('displays the formula being checked', () => {
    render(
      <PreFlightCheckModal
        check={mockCheck}
        problemText="A ball is thrown upward..."
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Kinematic Equations')).toBeInTheDocument()
    expect(screen.getByTestId('math-renderer')).toBeInTheDocument()
  })

  it('shows the pre-condition check question', () => {
    render(
      <PreFlightCheckModal
        check={mockCheck}
        problemText="A ball is thrown upward..."
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Is the acceleration constant?')).toBeInTheDocument()
    expect(screen.getByText('Acceleration must be constant')).toBeInTheDocument()
  })

  it('displays all options for the check item', () => {
    render(
      <PreFlightCheckModal
        check={mockCheck}
        problemText="A ball is thrown upward..."
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    )

    expect(screen.getByText('Yes, acceleration is constant')).toBeInTheDocument()
    expect(screen.getByText('No, acceleration varies with position')).toBeInTheDocument()
  })

  it('allows selecting an option', () => {
    render(
      <PreFlightCheckModal
        check={mockCheck}
        problemText="A ball is thrown upward..."
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    )

    const option = screen.getByText('Yes, acceleration is constant')
    fireEvent.click(option)

    // Check Answer button should now be enabled
    const checkButton = screen.getByText('Check Answer')
    expect(checkButton).not.toBeDisabled()
  })

  it('submits and validates the answer', async () => {
    render(
      <PreFlightCheckModal
        check={mockCheck}
        problemText="A ball is thrown upward..."
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    )

    // Select correct answer
    const option = screen.getByText('Yes, acceleration is constant')
    fireEvent.click(option)

    // Submit
    const checkButton = screen.getByText('Check Answer')
    fireEvent.click(checkButton)

    // Wait for validation - with single item, goes straight to result view
    await waitFor(() => {
      expect(screen.getByText('Pre-Flight Check Passed!')).toBeInTheDocument()
    })
  })

  it('shows guidance when wrong option is selected', async () => {
    render(
      <PreFlightCheckModal
        check={mockCheck}
        problemText="A ball is thrown upward..."
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    )

    // Select wrong answer (trap)
    const trapOption = screen.getByText('No, acceleration varies with position')
    fireEvent.click(trapOption)

    // Submit
    const checkButton = screen.getByText('Check Answer')
    fireEvent.click(checkButton)

    // Wait for guidance view - single item check goes to guidance on failure
    await waitFor(() => {
      expect(screen.getByText("Let's Think Through This")).toBeInTheDocument()
    })

    // Guidance should show the check question
    expect(screen.getByText(/Is the acceleration constant/)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    render(
      <PreFlightCheckModal
        check={mockCheck}
        problemText="A ball is thrown upward..."
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    )

    // Find close button by its SVG path (X icon)
    const closeButton = screen.getByRole('button', { name: '' }) // The X button has no text
    const buttons = screen.getAllByRole('button')
    const closeBtn = buttons.find(btn => btn.querySelector('svg path[d*="M6 18L18 6"]'))

    if (closeBtn) {
      fireEvent.click(closeBtn)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })

  it('shows progress indicator for multiple check items', () => {
    const multiItemCheck: PreFlightCheck = {
      ...mockCheck,
      checkItems: [
        mockCheck.checkItems[0],
        {
          ...mockCheck.checkItems[0],
          preCondition: {
            ...mockCheck.checkItems[0].preCondition,
            id: 'straight_line',
            description: 'Motion must be along a straight line',
            checkQuestion: 'Is the motion along a straight line?',
          },
        },
      ],
      requiredToPass: 2,
    }

    render(
      <PreFlightCheckModal
        check={multiItemCheck}
        problemText="A ball is thrown upward..."
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    )

    // Should show progress (0/2 and 2 indicator dots)
    expect(screen.getByText('0/2 conditions verified')).toBeInTheDocument()
    expect(screen.getByText('Required to pass: 2/2')).toBeInTheDocument()
  })

  it('displays severity indicator for critical conditions', () => {
    render(
      <PreFlightCheckModal
        check={mockCheck}
        problemText="A ball is thrown upward..."
        onComplete={mockOnComplete}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    )

    // Critical severity should show the label
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })
})

describe('PreFlightCheckModal - Multi-select behavior', () => {
  const multiSelectCheck: PreFlightCheck = {
    id: 'multi-select-check',
    targetStepId: 1,
    law: 'conservation_mechanical_energy',
    displayName: 'Conservation of Mechanical Energy',
    formula: 'KE_i + PE_i = KE_f + PE_f',
    checkItems: [
      {
        preCondition: {
          id: 'no_friction',
          description: 'No non-conservative forces do work',
          formalStatement: 'W_nc = 0',
          severity: 'critical',
          checkQuestion: 'Which conditions are satisfied?',
          hints: ['Look for friction mentions'],
          problemTextIndicators: ['frictionless'],
          physicsRationale: 'Friction dissipates mechanical energy.',
        },
        options: [
          { id: 'opt-1', label: 'Surface is frictionless', isCorrect: true, studentReasoningPattern: 'Correct', prevalence: 'common' },
          { id: 'opt-2', label: 'No air resistance', isCorrect: true, studentReasoningPattern: 'Correct', prevalence: 'common' },
          { id: 'opt-3', label: 'Object is moving slowly', isCorrect: false, trapType: 'condition_violation', misconceptionExplanation: 'Speed does not affect energy conservation conditions.', studentReasoningPattern: 'Misconception', prevalence: 'common' },
        ],
        correctOptionIds: ['opt-1', 'opt-2'],
        multiSelect: true,
      },
    ],
    problemContext: { relevantText: 'A block slides down a frictionless incline.' },
    requiredToPass: 1,
    maxAttempts: 3,
  }

  it('allows multiple selections when multiSelect is true', () => {
    render(
      <PreFlightCheckModal
        check={multiSelectCheck}
        problemText="A block slides..."
        onComplete={vi.fn()}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('Select all that apply to this problem:')).toBeInTheDocument()

    // Select multiple options
    fireEvent.click(screen.getByText('Surface is frictionless'))
    fireEvent.click(screen.getByText('No air resistance'))

    // Both should be selectable (button should remain enabled for submission)
    const checkButton = screen.getByText('Check Answer')
    expect(checkButton).not.toBeDisabled()
  })
})
