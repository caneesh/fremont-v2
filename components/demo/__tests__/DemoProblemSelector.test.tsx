import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DemoProblemSelector from '../DemoProblemSelector'
import { DEMO_PROBLEMS } from '@/lib/demo/demoProblems'

describe('DemoProblemSelector', () => {
  const defaultProps = {
    problems: DEMO_PROBLEMS,
    onSelect: vi.fn(),
  }

  describe('Rendering', () => {
    it('renders welcome header', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      expect(screen.getByText('Welcome to PhysiScaffold Demo')).toBeInTheDocument()
    })

    it('renders introduction text', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      expect(
        screen.getByText(/Experience how we guide students through physics problems/)
      ).toBeInTheDocument()
    })

    it('renders How It Works section', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      expect(screen.getByText('How It Works')).toBeInTheDocument()
      expect(screen.getByText('1. Think First')).toBeInTheDocument()
      expect(screen.getByText('2. Guided Solving')).toBeInTheDocument()
      expect(screen.getByText('3. Learn From Mistakes')).toBeInTheDocument()
    })

    it('renders all problem cards', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      // Each problem should have a card - check that the correct number of cards exist
      const problemCards = screen.getAllByRole('button')
      expect(problemCards.length).toBe(DEMO_PROBLEMS.length)
    })

    it('renders Choose a Problem header', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      expect(screen.getByText('Choose a Problem')).toBeInTheDocument()
    })

    it('renders footer note about demo isolation', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      expect(screen.getByText(/demo is completely isolated/)).toBeInTheDocument()
    })
  })

  describe('Problem Cards', () => {
    it('displays problem statement preview', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      // Each problem should have its statement visible (truncated)
      DEMO_PROBLEMS.forEach((problem) => {
        // Check for at least the first part of the statement
        const truncatedText = problem.statement.slice(0, 40)
        expect(
          screen.getByText(new RegExp(truncatedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 30)))
        ).toBeInTheDocument()
      })
    })

    it('displays thinking gate count', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      // All problems have 4 thinking questions, so there should be multiple
      const thinkingTexts = screen.getAllByText(/\d+ thinking questions/)
      expect(thinkingTexts.length).toBe(DEMO_PROBLEMS.length)
    })

    it('displays exam badge with correct color', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      const jeeBadges = screen.getAllByText('JEE')
      jeeBadges.forEach((badge) => {
        expect(badge.className).toContain('bg-blue-100')
      })
    })

    it('displays topic badges', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      // Check that at least one topic is displayed
      const firstProblemTopic = screen.getByText(DEMO_PROBLEMS[0].topic)
      expect(firstProblemTopic).toBeInTheDocument()
    })
  })

  describe('Interaction', () => {
    it('calls onSelect when a problem card is clicked', () => {
      const onSelect = vi.fn()
      render(<DemoProblemSelector {...defaultProps} onSelect={onSelect} />)

      // Click the first problem card
      const problemCards = screen.getAllByRole('button')
      fireEvent.click(problemCards[0])

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect).toHaveBeenCalledWith(DEMO_PROBLEMS[0])
    })

    it('calls onSelect with the correct problem', () => {
      const onSelect = vi.fn()
      render(<DemoProblemSelector {...defaultProps} onSelect={onSelect} />)

      // Find and click each problem card
      DEMO_PROBLEMS.forEach((problem, index) => {
        const problemCards = screen.getAllByRole('button')
        fireEvent.click(problemCards[index])
        expect(onSelect).toHaveBeenLastCalledWith(problem)
      })
    })
  })

  describe('Empty State', () => {
    it('renders nothing when no problems provided', () => {
      const { container } = render(
        <DemoProblemSelector {...defaultProps} problems={[]} />
      )

      // Should still render headers but no problem cards
      expect(screen.getByText('Welcome to PhysiScaffold Demo')).toBeInTheDocument()
      expect(screen.getByText('Choose a Problem')).toBeInTheDocument()

      // No problem cards should exist
      const buttons = container.querySelectorAll('button')
      expect(buttons.length).toBe(0)
    })
  })

  describe('How It Works Section', () => {
    it('describes the thinking phase', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      expect(
        screen.getByText(/Answer conceptual questions before calculating/)
      ).toBeInTheDocument()
    })

    it('describes the solving phase', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      expect(
        screen.getByText(/Progressive hints available if you get stuck/)
      ).toBeInTheDocument()
    })

    it('describes the learning phase', () => {
      render(<DemoProblemSelector {...defaultProps} />)

      expect(
        screen.getByText(/See common mistakes and why they happen/)
      ).toBeInTheDocument()
    })
  })
})
