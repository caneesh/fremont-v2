import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SubmissionCanvas from '../SubmissionCanvas'
import type { GradeSolutionResponse } from '@/types/gradeSolution'
import type { ConstraintCollision, SocraticDialogue } from '@/types/constraintCollision'

// Mock the dependencies
vi.mock('@/lib/api/apiClient', () => ({
  authenticatedFetch: vi.fn(),
  handleQuotaExceeded: vi.fn().mockResolvedValue(false),
}))

vi.mock('../MathRenderer', () => ({
  default: ({ text }: { text: string }) => <div data-testid="math-renderer">{text}</div>,
}))

vi.mock('../ConstraintFeedback', () => ({
  default: ({ collisions, dialogue }: { collisions: ConstraintCollision[], dialogue?: SocraticDialogue }) => (
    <div data-testid="constraint-feedback">
      <span data-testid="collision-count">{collisions.length} collision(s)</span>
      {dialogue && <span data-testid="dialogue-question">{dialogue.question}</span>}
    </div>
  ),
}))

// Import the mocked module to access the mock function
import { authenticatedFetch } from '@/lib/api/apiClient'
const mockAuthenticatedFetch = authenticatedFetch as ReturnType<typeof vi.fn>

const defaultProps = {
  problemText: 'A block slides down a rough incline at 30°.',
  domain: 'Mechanics',
  subdomain: 'Friction',
}

const mockCollision: ConstraintCollision = {
  id: 'CC001',
  problemConstraint: {
    id: 'SC001',
    category: 'force',
    rawText: 'rough incline',
    normalizedForm: 'friction_present',
    sourceLocation: { startIndex: 25, endIndex: 38 },
  },
  studentAssumption: {
    id: 'SA001',
    type: 'implicit',
    description: 'Friction force not considered',
    evidence: 'Used a = g sin θ without friction',
    category: 'force',
  },
  collisionType: 'OMISSION',
  severity: 'high',
  errorPatternId: 'EP013',
  affectedStepIds: [],
  explanation: 'Problem says rough incline but friction was ignored',
  confidence: 0.9,
}

const mockDialogue: SocraticDialogue = {
  question: 'What forces act on the block on the incline?',
  strategy: 'FORCE_ENUMERATION',
  followUpPrompts: ['Is there any contact with another surface?'],
  problemReferenceHint: "Look for words like 'rough'",
  relatedConceptIds: ['friction'],
  highlightProblemText: { startIndex: 25, endIndex: 38 },
}

const mockGradeResultWithCollisions: GradeSolutionResponse = {
  status: 'CONCEPTUAL_GAP',
  feedback_markdown: 'You missed an important force.',
  highlight_location: 'a = g sin θ',
  next_action: {
    type: 'CHECK_CONSTRAINTS',
    label: 'Review problem constraints',
  },
  confidence: 0.85,
  constraintCollisions: [mockCollision],
  constraintDialogue: mockDialogue,
}

const mockGradeResultWithoutCollisions: GradeSolutionResponse = {
  status: 'SUCCESS',
  feedback_markdown: 'Great job!',
  highlight_location: null,
  next_action: {
    type: 'OPTIMIZE',
    label: 'See the elegant shortcut',
  },
  confidence: 0.95,
}

const mockGradeResultMinorSlip: GradeSolutionResponse = {
  status: 'MINOR_SLIP',
  feedback_markdown: 'Small sign error in step 3.',
  highlight_location: '-ma instead of ma',
  next_action: {
    type: 'FIX_LINE',
    label: 'Fix the sign error',
  },
  confidence: 0.9,
}

const mockGradeResultConceptual: GradeSolutionResponse = {
  status: 'CONCEPTUAL_GAP',
  feedback_markdown: 'Review energy conservation.',
  highlight_location: null,
  next_action: {
    type: 'REVIEW_CONCEPT',
    label: 'Review: Conservation Laws',
  },
  confidence: 0.88,
}

describe('SubmissionCanvas - ConstraintFeedback Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering ConstraintFeedback', () => {
    it('displays ConstraintFeedback when grade result has collisions', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGradeResultWithCollisions),
      })

      render(<SubmissionCanvas {...defaultProps} />)

      // Enter solution text
      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'a = g sin θ' } })

      // Submit
      const submitButton = screen.getByRole('button', { name: /Grade My Solution/i })
      fireEvent.click(submitButton)

      // Wait for result
      await waitFor(() => {
        expect(screen.getByTestId('constraint-feedback')).toBeInTheDocument()
      })

      expect(screen.getByTestId('collision-count')).toHaveTextContent('1 collision(s)')
      expect(screen.getByTestId('dialogue-question')).toHaveTextContent(
        'What forces act on the block on the incline?'
      )
    })

    it('does not display ConstraintFeedback when grade result has no collisions', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGradeResultWithoutCollisions),
      })

      render(<SubmissionCanvas {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'F = ma, solved correctly' } })

      const submitButton = screen.getByRole('button', { name: /Grade My Solution/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Great job!')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('constraint-feedback')).not.toBeInTheDocument()
    })

    it('does not display ConstraintFeedback when collisions array is empty', async () => {
      const resultWithEmptyCollisions: GradeSolutionResponse = {
        ...mockGradeResultWithoutCollisions,
        constraintCollisions: [],
      }

      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(resultWithEmptyCollisions),
      })

      render(<SubmissionCanvas {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'Solution text' } })

      const submitButton = screen.getByRole('button', { name: /Grade My Solution/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Great job!')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('constraint-feedback')).not.toBeInTheDocument()
    })

    it('displays multiple collisions correctly', async () => {
      const secondCollision: ConstraintCollision = {
        ...mockCollision,
        id: 'CC002',
        collisionType: 'ADDITION',
        severity: 'medium',
      }

      const resultWithMultipleCollisions: GradeSolutionResponse = {
        ...mockGradeResultWithCollisions,
        constraintCollisions: [mockCollision, secondCollision],
      }

      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(resultWithMultipleCollisions),
      })

      render(<SubmissionCanvas {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'Incorrect solution' } })

      const submitButton = screen.getByRole('button', { name: /Grade My Solution/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('constraint-feedback')).toBeInTheDocument()
      })

      expect(screen.getByTestId('collision-count')).toHaveTextContent('2 collision(s)')
    })
  })

  describe('next action button icons', () => {
    it('shows CHECK_CONSTRAINTS icon for constraint-focused next action', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGradeResultWithCollisions),
      })

      render(<SubmissionCanvas {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'a = g sin θ' } })

      const submitButton = screen.getByRole('button', { name: /Grade My Solution/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Review problem constraints/i })).toBeInTheDocument()
      })

      // The button should contain an SVG icon
      const actionButton = screen.getByRole('button', { name: /Review problem constraints/i })
      expect(actionButton.querySelector('svg')).toBeInTheDocument()
    })

    it('shows OPTIMIZE icon for successful solutions', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGradeResultWithoutCollisions),
      })

      render(<SubmissionCanvas {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'Correct solution' } })

      const submitButton = screen.getByRole('button', { name: /Grade My Solution/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /See the elegant shortcut/i })).toBeInTheDocument()
      })

      const actionButton = screen.getByRole('button', { name: /See the elegant shortcut/i })
      expect(actionButton.querySelector('svg')).toBeInTheDocument()
    })

    it('shows FIX_LINE icon for minor slips', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGradeResultMinorSlip),
      })

      render(<SubmissionCanvas {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'Solution with sign error' } })

      const submitButton = screen.getByRole('button', { name: /Grade My Solution/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Fix the sign error/i })).toBeInTheDocument()
      })

      const actionButton = screen.getByRole('button', { name: /Fix the sign error/i })
      expect(actionButton.querySelector('svg')).toBeInTheDocument()
    })

    it('shows REVIEW_CONCEPT icon for conceptual gaps', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGradeResultConceptual),
      })

      render(<SubmissionCanvas {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'Wrong concept solution' } })

      const submitButton = screen.getByRole('button', { name: /Grade My Solution/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Review: Conservation Laws/i })).toBeInTheDocument()
      })

      const actionButton = screen.getByRole('button', { name: /Review: Conservation Laws/i })
      expect(actionButton.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('grade result display order', () => {
    it('displays ConstraintFeedback before general feedback', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGradeResultWithCollisions),
      })

      const { container } = render(<SubmissionCanvas {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'a = g sin θ' } })

      const submitButton = screen.getByRole('button', { name: /Grade My Solution/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('constraint-feedback')).toBeInTheDocument()
      })

      // Get the constraint feedback and feedback elements
      const constraintFeedback = screen.getByTestId('constraint-feedback')
      const feedbackSection = screen.getByText('Feedback').closest('div')

      // Verify constraint feedback comes before general feedback in DOM order
      expect(constraintFeedback.compareDocumentPosition(feedbackSection!)).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING
      )
    })
  })

  describe('interaction with grading flow', () => {
    it('clears ConstraintFeedback when user clicks modify and resubmit', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGradeResultWithCollisions),
      })

      render(<SubmissionCanvas {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'a = g sin θ' } })

      const submitButton = screen.getByRole('button', { name: /Grade My Solution/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByTestId('constraint-feedback')).toBeInTheDocument()
      })

      // Click "Modify and resubmit"
      const resubmitButton = screen.getByRole('button', { name: /Modify and resubmit/i })
      fireEvent.click(resubmitButton)

      // ConstraintFeedback should be gone
      expect(screen.queryByTestId('constraint-feedback')).not.toBeInTheDocument()
    })

    it('calls onGradeComplete with constraint data', async () => {
      const onGradeComplete = vi.fn()

      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGradeResultWithCollisions),
      })

      render(<SubmissionCanvas {...defaultProps} onGradeComplete={onGradeComplete} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'a = g sin θ' } })

      const submitButton = screen.getByRole('button', { name: /Grade My Solution/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(onGradeComplete).toHaveBeenCalledTimes(1)
      })

      const callArg = onGradeComplete.mock.calls[0][0]
      expect(callArg.constraintCollisions).toHaveLength(1)
      expect(callArg.constraintDialogue).toBeDefined()
      expect(callArg.constraintDialogue.question).toBe('What forces act on the block on the incline?')
    })
  })

  describe('status-specific styling', () => {
    it('applies correct styling for SUCCESS status', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGradeResultWithoutCollisions),
      })

      render(<SubmissionCanvas {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'Correct' } })

      fireEvent.click(screen.getByRole('button', { name: /Grade My Solution/i }))

      await waitFor(() => {
        expect(screen.getByText('Correct Solution')).toBeInTheDocument()
      })
    })

    it('applies correct styling for MINOR_SLIP status', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGradeResultMinorSlip),
      })

      render(<SubmissionCanvas {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'Almost correct' } })

      fireEvent.click(screen.getByRole('button', { name: /Grade My Solution/i }))

      await waitFor(() => {
        expect(screen.getByText('Minor Error')).toBeInTheDocument()
      })
    })

    it('applies correct styling for CONCEPTUAL_GAP status', async () => {
      mockAuthenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGradeResultWithCollisions),
      })

      render(<SubmissionCanvas {...defaultProps} />)

      const textarea = screen.getByPlaceholderText(/Enter your solution here/i)
      fireEvent.change(textarea, { target: { value: 'Wrong concept' } })

      fireEvent.click(screen.getByRole('button', { name: /Grade My Solution/i }))

      await waitFor(() => {
        expect(screen.getByText('Conceptual Issue')).toBeInTheDocument()
      })
    })
  })
})
