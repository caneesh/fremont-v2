import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConstraintFeedback from '../ConstraintFeedback'
import type { ConstraintCollision, SocraticDialogue } from '@/types/constraintCollision'

const mockCollision: ConstraintCollision = {
  id: 'CC001',
  problemConstraint: {
    id: 'SC001',
    category: 'force',
    rawText: 'rough surface',
    normalizedForm: 'friction_present',
    sourceLocation: { startIndex: 10, endIndex: 23 },
  },
  studentAssumption: {
    id: 'SA001',
    type: 'implicit',
    description: 'Friction force not considered in solution',
    evidence: 'No friction in FBD',
    category: 'force',
  },
  collisionType: 'OMISSION',
  severity: 'high',
  errorPatternId: 'EP013',
  affectedStepIds: [],
  explanation: 'Problem indicates friction but student ignored it',
  confidence: 0.85,
}

const mockDialogue: SocraticDialogue = {
  question: 'What forces act on the block sliding down the incline?',
  strategy: 'FORCE_ENUMERATION',
  followUpPrompts: [
    'Is there any contact with a surface?',
    'What did the problem tell us about that surface?',
  ],
  problemReferenceHint: "Look for words like 'rough' or 'friction'",
  relatedConceptIds: ['friction', 'normal-force'],
  highlightProblemText: { startIndex: 10, endIndex: 23 },
}

describe('ConstraintFeedback', () => {
  describe('rendering', () => {
    it('renders nothing when no collisions', () => {
      const { container } = render(<ConstraintFeedback collisions={[]} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders constraint check header', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} />)
      expect(screen.getByText('Constraint Check')).toBeInTheDocument()
    })

    it('shows collision count for single collision', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} />)
      expect(screen.getByText('1 constraint conflict detected')).toBeInTheDocument()
    })

    it('shows collision count for multiple collisions', () => {
      const secondCollision = { ...mockCollision, id: 'CC002', severity: 'medium' as const }
      render(<ConstraintFeedback collisions={[mockCollision, secondCollision]} />)
      expect(screen.getByText('2 constraint conflicts detected')).toBeInTheDocument()
    })

    it('displays severity label correctly for high severity', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} />)
      expect(screen.getByText('Critical')).toBeInTheDocument()
    })

    it('displays severity label for medium severity', () => {
      const mediumCollision = { ...mockCollision, severity: 'medium' as const }
      render(<ConstraintFeedback collisions={[mediumCollision]} />)
      expect(screen.getByText('Warning')).toBeInTheDocument()
    })

    it('displays severity label for low severity', () => {
      const lowCollision = { ...mockCollision, severity: 'low' as const }
      render(<ConstraintFeedback collisions={[lowCollision]} />)
      expect(screen.getByText('Note')).toBeInTheDocument()
    })

    it('shows collision type label', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} />)
      expect(screen.getByText('Missing Constraint')).toBeInTheDocument()
    })
  })

  describe('Socratic dialogue', () => {
    it('displays the Socratic question', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} dialogue={mockDialogue} />)
      expect(screen.getByText(mockDialogue.question)).toBeInTheDocument()
    })

    it('shows follow-up hints toggle button', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} dialogue={mockDialogue} />)
      expect(screen.getByText('Need more hints?')).toBeInTheDocument()
    })

    it('toggles follow-up prompts visibility', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} dialogue={mockDialogue} />)

      // Initially hidden
      expect(screen.queryByText('Is there any contact with a surface?')).not.toBeInTheDocument()

      // Click to show
      fireEvent.click(screen.getByText('Need more hints?'))
      expect(screen.getByText('Is there any contact with a surface?')).toBeInTheDocument()
      expect(screen.getByText('What did the problem tell us about that surface?')).toBeInTheDocument()

      // Button text changes
      expect(screen.getByText('Hide hints')).toBeInTheDocument()

      // Click to hide
      fireEvent.click(screen.getByText('Hide hints'))
      expect(screen.queryByText('Is there any contact with a surface?')).not.toBeInTheDocument()
    })

    it('displays problem reference hint', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} dialogue={mockDialogue} />)
      expect(screen.getByText(/Look for words like 'rough' or 'friction'/)).toBeInTheDocument()
    })

    it('displays related concepts as tags', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} dialogue={mockDialogue} />)
      expect(screen.getByText('friction')).toBeInTheDocument()
      expect(screen.getByText('normal force')).toBeInTheDocument()
    })
  })

  describe('collision details', () => {
    it('expands collision to show explanation', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} />)

      // Click to expand
      fireEvent.click(screen.getByText('Missing Constraint'))

      // Explanation should be visible
      expect(screen.getByText('Problem indicates friction but student ignored it')).toBeInTheDocument()
    })

    it('shows student assumption when expanded', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} />)

      // Expand
      fireEvent.click(screen.getByText('Missing Constraint'))

      // Student assumption should be visible
      expect(screen.getByText(/Friction force not considered in solution/)).toBeInTheDocument()
    })

    it('collapses collision on second click', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} />)

      // Expand
      fireEvent.click(screen.getByText('Missing Constraint'))
      expect(screen.getByText('Problem indicates friction but student ignored it')).toBeInTheDocument()

      // Collapse
      fireEvent.click(screen.getByText('Missing Constraint'))
      expect(screen.queryByText('Problem indicates friction but student ignored it')).not.toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onDismiss when dismiss button clicked', () => {
      const onDismiss = vi.fn()
      render(<ConstraintFeedback collisions={[mockCollision]} onDismiss={onDismiss} />)

      fireEvent.click(screen.getByLabelText('Dismiss'))
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('does not show dismiss button when onDismiss not provided', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} />)
      expect(screen.queryByLabelText('Dismiss')).not.toBeInTheDocument()
    })

    it('calls onHighlightProblem when hint clicked', () => {
      const onHighlight = vi.fn()
      render(
        <ConstraintFeedback
          collisions={[mockCollision]}
          dialogue={mockDialogue}
          onHighlightProblem={onHighlight}
        />
      )

      // Click on the hint box
      fireEvent.click(screen.getByText(/Look for words like 'rough'/))
      expect(onHighlight).toHaveBeenCalledWith(10, 23)
    })

    it('calls onHighlightProblem on keyboard enter', () => {
      const onHighlight = vi.fn()
      render(
        <ConstraintFeedback
          collisions={[mockCollision]}
          dialogue={mockDialogue}
          onHighlightProblem={onHighlight}
        />
      )

      // Press Enter on the hint box
      const hintBox = screen.getByText(/Look for words like 'rough'/).closest('[role="button"]')
      fireEvent.keyDown(hintBox!, { key: 'Enter' })
      expect(onHighlight).toHaveBeenCalledWith(10, 23)
    })
  })

  describe('multiple collisions', () => {
    it('shows highest severity styling', () => {
      const mediumCollision: ConstraintCollision = {
        ...mockCollision,
        id: 'CC002',
        severity: 'medium',
        collisionType: 'ADDITION',
      }

      const { container } = render(
        <ConstraintFeedback collisions={[mediumCollision, mockCollision]} />
      )

      // Should use high severity styling (red) since that's the highest
      expect(container.querySelector('.border-red-300')).toBeInTheDocument()
    })

    it('lists all collisions', () => {
      const secondCollision: ConstraintCollision = {
        ...mockCollision,
        id: 'CC002',
        collisionType: 'ADDITION',
        severity: 'medium',
      }

      render(<ConstraintFeedback collisions={[mockCollision, secondCollision]} />)

      expect(screen.getByText('Missing Constraint')).toBeInTheDocument()
      expect(screen.getByText('Invalid Assumption')).toBeInTheDocument()
    })
  })

  describe('collision types', () => {
    it('shows correct label for OMISSION', () => {
      render(<ConstraintFeedback collisions={[mockCollision]} />)
      expect(screen.getByText('Missing Constraint')).toBeInTheDocument()
    })

    it('shows correct label for ADDITION', () => {
      const additionCollision = { ...mockCollision, collisionType: 'ADDITION' as const }
      render(<ConstraintFeedback collisions={[additionCollision]} />)
      expect(screen.getByText('Invalid Assumption')).toBeInTheDocument()
    })

    it('shows correct label for REVERSAL', () => {
      const reversalCollision = { ...mockCollision, collisionType: 'REVERSAL' as const }
      render(<ConstraintFeedback collisions={[reversalCollision]} />)
      expect(screen.getByText('Reversed Constraint')).toBeInTheDocument()
    })

    it('shows correct label for SUBSTITUTION', () => {
      const substitutionCollision = { ...mockCollision, collisionType: 'SUBSTITUTION' as const }
      render(<ConstraintFeedback collisions={[substitutionCollision]} />)
      expect(screen.getByText('Wrong Value')).toBeInTheDocument()
    })
  })
})
