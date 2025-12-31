import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import MiniProblemSuggestion from '../MiniProblemSuggestion'
import type { MiniProblem, ConceptBridgeResult } from '@/lib/patternTrack'

// Mock the patternTrack module
vi.mock('@/lib/patternTrack', () => ({
  findMiniProblemsForWeakConcepts: vi.fn(),
}))

import { findMiniProblemsForWeakConcepts } from '@/lib/patternTrack'

const mockFindMiniProblems = findMiniProblemsForWeakConcepts as ReturnType<typeof vi.fn>

// Sample test data
const mockMiniProblem1: MiniProblem = {
  question: {
    id: 'q_mech_001',
    problem_text: 'A 5 kg block rests on a horizontal frictionless surface. A horizontal force of 20 N is applied to the block. What is the acceleration of the block?',
    pattern_refs: [{ pattern_id: 'pattern_newton_2', relevance: 'primary' }],
    difficulty: 2,
    category: 'mechanics',
    hints: [],
    answer: { type: 'numeric', value: 4, unit: 'm/s²' },
    solution_explanation: 'Using F = ma: 20 N = (5 kg)(a), so a = 4 m/s².',
    tags: ['newton_2', 'basic'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  pattern: {
    id: 'pattern_newton_2',
    name: "Newton's Second Law Application",
    description: 'Applying F = ma to analyze forces and acceleration',
    category: 'mechanics',
    difficulty: 2,
    recognition_cues: ['Object accelerating'],
    common_pitfalls: ['Wrong sign convention'],
    related_pattern_ids: [],
    display_order: 1,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  reason: "Reinforces your understanding of Newton's Second Law",
}

const mockMiniProblem2: MiniProblem = {
  question: {
    id: 'q_mech_002',
    problem_text: 'A 10 kg block is pushed across a rough horizontal surface with a horizontal force of 50 N. If the coefficient of kinetic friction is 0.3, what is the acceleration?',
    pattern_refs: [{ pattern_id: 'pattern_friction', relevance: 'primary' }],
    difficulty: 3,
    category: 'mechanics',
    hints: [],
    answer: { type: 'numeric', value: 2, unit: 'm/s²' },
    solution_explanation: 'Net force = 50 - 30 = 20 N. a = 20/10 = 2 m/s².',
    tags: ['friction'],
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  pattern: {
    id: 'pattern_friction',
    name: 'Friction Force Analysis',
    description: 'Analyzing static and kinetic friction forces',
    category: 'mechanics',
    difficulty: 2,
    recognition_cues: ['Rough surface'],
    common_pitfalls: ['Wrong friction type'],
    related_pattern_ids: [],
    display_order: 3,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  reason: 'Reinforces your understanding of friction',
}

const mockResult: ConceptBridgeResult = {
  weakConcepts: ["Newton's Second Law", 'friction'],
  matchedPatterns: [mockMiniProblem1.pattern, mockMiniProblem2.pattern],
  miniProblems: [mockMiniProblem1, mockMiniProblem2],
}

describe('MiniProblemSuggestion', () => {
  const mockOnSelectProblem = vi.fn()
  const mockOnSkip = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockFindMiniProblems.mockResolvedValue(mockResult)
  })

  describe('Loading State', () => {
    it('shows loading state while fetching problems', () => {
      // Make the promise never resolve during this test
      mockFindMiniProblems.mockImplementation(() => new Promise(() => {}))

      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      expect(screen.getByText('Finding practice problems...')).toBeInTheDocument()
    })

    it('shows compact loading state when compact prop is true', () => {
      mockFindMiniProblems.mockImplementation(() => new Promise(() => {}))

      const { container } = render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
          compact={true}
        />
      )

      // Compact mode has smaller padding
      expect(container.querySelector('.p-3')).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('renders nothing when weakConcepts is empty', async () => {
      const { container } = render(
        <MiniProblemSuggestion
          weakConcepts={[]}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })

    it('renders nothing when no matching problems are found', async () => {
      mockFindMiniProblems.mockResolvedValue({
        weakConcepts: ['unknown concept'],
        matchedPatterns: [],
        miniProblems: [],
      })

      const { container } = render(
        <MiniProblemSuggestion
          weakConcepts={['unknown concept']}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })

    it('renders nothing when service throws an error', async () => {
      mockFindMiniProblems.mockRejectedValue(new Error('Service unavailable'))

      const { container } = render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })
  })

  describe('Full Mode Rendering', () => {
    it('renders the title', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Strengthen These Concepts')).toBeInTheDocument()
      })
    })

    it('renders custom title when provided', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
          title="Quick Practice Before You Continue"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Quick Practice Before You Continue')).toBeInTheDocument()
      })
    })

    it('renders weak concepts as tags', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law", 'friction']}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(screen.getByText("Newton's Second Law")).toBeInTheDocument()
        expect(screen.getByText('friction')).toBeInTheDocument()
      })
    })

    it('renders mini-problems with pattern names', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law", 'friction']}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(screen.getByText("Newton's Second Law Application")).toBeInTheDocument()
        expect(screen.getByText('Friction Force Analysis')).toBeInTheDocument()
      })
    })

    it('renders difficulty badges for each problem', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law", 'friction']}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Difficulty 2/5')).toBeInTheDocument()
        expect(screen.getByText('Difficulty 3/5')).toBeInTheDocument()
      })
    })

    it('renders problem preview text', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/A 5 kg block rests on a horizontal/)).toBeInTheDocument()
      })
    })

    it('renders reason for each problem', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(screen.getByText("Reinforces your understanding of Newton's Second Law")).toBeInTheDocument()
      })
    })

    it('renders "Try This" buttons for each problem', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law", 'friction']}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        const tryButtons = screen.getAllByText('Try This')
        expect(tryButtons).toHaveLength(2)
      })
    })

    it('renders skip button when onSkip is provided', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
          onSkip={mockOnSkip}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Skip practice for now')).toBeInTheDocument()
      })
    })

    it('does not render skip button when onSkip is not provided', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(screen.queryByText('Skip practice for now')).not.toBeInTheDocument()
      })
    })
  })

  describe('Compact Mode Rendering', () => {
    it('renders compact layout when compact prop is true', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law", 'friction']}
          onSelectProblem={mockOnSelectProblem}
          compact={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/Quick practice to reinforce/)).toBeInTheDocument()
      })
    })

    it('renders problem buttons with pattern names in compact mode', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law", 'friction']}
          onSelectProblem={mockOnSelectProblem}
          compact={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText("Problem 1: Newton's Second Law Application")).toBeInTheDocument()
        expect(screen.getByText('Problem 2: Friction Force Analysis')).toBeInTheDocument()
      })
    })

    it('renders Skip button in compact mode when onSkip provided', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
          onSkip={mockOnSkip}
          compact={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Skip')).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    it('calls onSelectProblem when "Try This" button is clicked', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law", 'friction']}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(screen.getAllByText('Try This')).toHaveLength(2)
      })

      // Click the first "Try This" button
      fireEvent.click(screen.getAllByText('Try This')[0])
      expect(mockOnSelectProblem).toHaveBeenCalledWith(mockMiniProblem1)

      // Click the second "Try This" button
      fireEvent.click(screen.getAllByText('Try This')[1])
      expect(mockOnSelectProblem).toHaveBeenCalledWith(mockMiniProblem2)
    })

    it('calls onSelectProblem with correct problem in compact mode', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law", 'friction']}
          onSelectProblem={mockOnSelectProblem}
          compact={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText("Problem 1: Newton's Second Law Application")).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText("Problem 1: Newton's Second Law Application"))
      expect(mockOnSelectProblem).toHaveBeenCalledWith(mockMiniProblem1)

      fireEvent.click(screen.getByText('Problem 2: Friction Force Analysis'))
      expect(mockOnSelectProblem).toHaveBeenCalledWith(mockMiniProblem2)
    })

    it('calls onSkip when skip button is clicked in full mode', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
          onSkip={mockOnSkip}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Skip practice for now')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Skip practice for now'))
      expect(mockOnSkip).toHaveBeenCalled()
    })

    it('calls onSkip when skip button is clicked in compact mode', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
          onSkip={mockOnSkip}
          compact={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Skip')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Skip'))
      expect(mockOnSkip).toHaveBeenCalled()
    })
  })

  describe('Service Integration', () => {
    it('calls findMiniProblemsForWeakConcepts with correct arguments', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law", 'friction']}
          onSelectProblem={mockOnSelectProblem}
          maxProblems={2}
        />
      )

      await waitFor(() => {
        expect(mockFindMiniProblems).toHaveBeenCalledWith(
          ["Newton's Second Law", 'friction'],
          2
        )
      })
    })

    it('respects maxProblems prop', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={["Newton's Second Law"]}
          onSelectProblem={mockOnSelectProblem}
          maxProblems={1}
        />
      )

      await waitFor(() => {
        expect(mockFindMiniProblems).toHaveBeenCalledWith(
          ["Newton's Second Law"],
          1
        )
      })
    })

    it('does not call service when weakConcepts is empty', async () => {
      render(
        <MiniProblemSuggestion
          weakConcepts={[]}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(mockFindMiniProblems).not.toHaveBeenCalled()
      })
    })
  })

  describe('Problem Text Truncation', () => {
    it('truncates long problem text with ellipsis', async () => {
      const longProblemResult: ConceptBridgeResult = {
        weakConcepts: ['test'],
        matchedPatterns: [mockMiniProblem1.pattern],
        miniProblems: [{
          ...mockMiniProblem1,
          question: {
            ...mockMiniProblem1.question,
            problem_text: 'A'.repeat(200), // Very long text
          },
        }],
      }
      mockFindMiniProblems.mockResolvedValue(longProblemResult)

      render(
        <MiniProblemSuggestion
          weakConcepts={['test']}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        // Should show truncated text with ellipsis
        const textElement = screen.getByText(/A+\.\.\./)
        expect(textElement).toBeInTheDocument()
      })
    })

    it('does not add ellipsis for short problem text', async () => {
      const shortProblemResult: ConceptBridgeResult = {
        weakConcepts: ['test'],
        matchedPatterns: [mockMiniProblem1.pattern],
        miniProblems: [{
          ...mockMiniProblem1,
          question: {
            ...mockMiniProblem1.question,
            problem_text: 'Short problem text',
          },
        }],
      }
      mockFindMiniProblems.mockResolvedValue(shortProblemResult)

      render(
        <MiniProblemSuggestion
          weakConcepts={['test']}
          onSelectProblem={mockOnSelectProblem}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Short problem text')).toBeInTheDocument()
        expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument()
      })
    })
  })
})
