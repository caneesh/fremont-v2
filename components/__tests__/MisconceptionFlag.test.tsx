import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MisconceptionFlag from '../MisconceptionFlag'
import type { DetectedMisconception } from '@/types/misconception'

const misconceptionHigh: DetectedMisconception = {
  id: 'misc-1',
  type: 'force_nature',
  description: 'Treating centripetal force as a separate force.',
  evidence: 'centripetal force is added',
  confidence: 0.9,
  clarificationQuestion: 'Is centripetal force a separate force or the net inward effect?',
  correctUnderstanding: 'Centripetal is the net inward force from real forces.',
  relatedConcept: 'Centripetal Force',
  severity: 'high',
}

const misconceptionLow: DetectedMisconception = {
  id: 'misc-2',
  type: 'sign_convention',
  description: 'Mixed sign conventions in vector components.',
  evidence: 'took down as positive then used up',
  confidence: 0.72,
  clarificationQuestion: 'What direction did you choose as positive?',
  correctUnderstanding: 'Use one consistent positive direction for all components.',
  relatedConcept: 'Sign Convention',
  severity: 'low',
}

describe('MisconceptionFlag', () => {
  it('renders a list with header and clarification questions', () => {
    render(
      <MisconceptionFlag misconceptions={[misconceptionHigh, misconceptionLow]} />
    )

    expect(screen.getByText('Conceptual Check')).toBeInTheDocument()
    expect(screen.getByText('2 points to consider')).toBeInTheDocument()
    expect(screen.getByText(misconceptionHigh.clarificationQuestion)).toBeInTheDocument()
    expect(screen.getByText(misconceptionLow.clarificationQuestion)).toBeInTheDocument()
  })

  it('expands to show evidence and hides when acknowledged', () => {
    render(<MisconceptionFlag misconceptions={[misconceptionHigh]} />)

    fireEvent.click(screen.getByRole('button', { name: /Why am I seeing this\?/i }))
    expect(screen.getByText(/From your solution/i)).toBeInTheDocument()
    expect(screen.getByText(/centripetal force is added/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Got it/i }))
    expect(screen.queryByText(misconceptionHigh.clarificationQuestion)).not.toBeInTheDocument()
  })
})
