import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConceptContrastModal from '../ConceptContrastModal'
import type { ConceptContrastChallenge, RejectionValidation } from '@/types/conceptContrast'

vi.mock('../MathRenderer', () => ({
  default: ({ text }: { text: string }) => <div data-testid="math-renderer">{text}</div>,
}))

const challenge: ConceptContrastChallenge = {
  id: 'cc-1',
  selectedConcept: {
    id: 'momentum',
    name: 'Conservation of Momentum',
    formula: 'p_1 + p_2 = constant',
  },
  distractors: [
    {
      id: 'energy',
      name: 'Conservation of Energy',
      whyPlausible: 'Looks like an isolated system.',
      criticalFlaw: 'Non-conservative work present.',
      problemConditionViolated: 'Friction is present.',
      commonMisconception: 'Energy is always conserved.',
      rejectionHint: 'Look for non-conservative forces.',
    },
  ],
  problemContext: {
    problemText: 'A block slides with friction.',
    domain: 'Mechanics',
    subdomain: 'Friction',
  },
  challengePrompt: 'Why did you throw these out?',
  requiredCorrectRejections: 1,
  maxAttempts: 2,
}

describe('ConceptContrastModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    global.fetch = vi.fn()
  })

  it('walks through a passing explanation flow and calls onComplete', async () => {
    const onComplete = vi.fn()
    const onClose = vi.fn()

    const validation: RejectionValidation = {
      distractorId: 'energy',
      isAccepted: true,
      quality: 'excellent',
      feedback: 'Correct rejection.',
      targetCondition: 'Friction is present.',
    }

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ validation }),
    })

    render(
      <ConceptContrastModal
        challenge={challenge}
        problemText={challenge.problemContext.problemText}
        onComplete={onComplete}
        onClose={onClose}
      />
    )

    expect(screen.getByText('Concept Contrast Challenge')).toBeInTheDocument()
    expect(screen.getByText('Conservation of Momentum')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Explain My Reasoning/i }))

    const textarea = screen.getByPlaceholderText(/Because in this problem/i)
    fireEvent.change(textarea, { target: { value: 'Friction breaks energy conservation.' } })

    fireEvent.click(screen.getByRole('button', { name: /Submit Explanation/i }))

    await waitFor(() => {
      expect(screen.getByText('Contrast Challenge Passed!')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }))

    expect(onComplete).toHaveBeenCalledWith(true, expect.objectContaining({
      challengeId: 'cc-1',
      passed: true,
    }))
  })

  it('toggles the hint panel in explain view', () => {
    const onComplete = vi.fn()
    const onClose = vi.fn()

    render(
      <ConceptContrastModal
        challenge={challenge}
        problemText={challenge.problemContext.problemText}
        onComplete={onComplete}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Explain My Reasoning/i }))
    fireEvent.click(screen.getByRole('button', { name: /Need a hint\?/i }))

    expect(screen.getByText('Look for non-conservative forces.')).toBeInTheDocument()
  })

  it('shows failure feedback and allows retry after a rejected explanation', async () => {
    const onComplete = vi.fn()
    const onClose = vi.fn()

    const validation: RejectionValidation = {
      distractorId: 'energy',
      isAccepted: false,
      quality: 'partial',
      feedback: 'You did not mention the friction condition.',
      missingInsight: 'Friction breaks energy conservation.',
      targetCondition: 'Friction is present.',
    }

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ validation }),
    })

    render(
      <ConceptContrastModal
        challenge={challenge}
        problemText={challenge.problemContext.problemText}
        onComplete={onComplete}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Explain My Reasoning/i }))

    const textarea = screen.getByPlaceholderText(/Because in this problem/i)
    fireEvent.change(textarea, { target: { value: 'It does not apply.' } })

    fireEvent.click(screen.getByRole('button', { name: /Submit Explanation/i }))

    await waitFor(() => {
      expect(screen.getByText('Keep Thinking...')).toBeInTheDocument()
    })

    expect(onComplete).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /Try Again/i }))
    expect(screen.getByRole('button', { name: /Explain My Reasoning/i })).toBeInTheDocument()
  })

  it('shows skip after max attempts and calls onSkip', async () => {
    const onComplete = vi.fn()
    const onClose = vi.fn()
    const onSkip = vi.fn()

    const validation: RejectionValidation = {
      distractorId: 'energy',
      isAccepted: false,
      quality: 'incorrect',
      feedback: 'The reasoning does not cite any conditions.',
      targetCondition: 'Friction is present.',
    }

    const maxAttemptChallenge = {
      ...challenge,
      maxAttempts: 1,
    }

    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ validation }),
    })

    render(
      <ConceptContrastModal
        challenge={maxAttemptChallenge}
        problemText={maxAttemptChallenge.problemContext.problemText}
        onComplete={onComplete}
        onSkip={onSkip}
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /Explain My Reasoning/i }))
    const textarea = screen.getByPlaceholderText(/Because in this problem/i)
    fireEvent.change(textarea, { target: { value: 'Not applicable.' } })
    fireEvent.click(screen.getByRole('button', { name: /Submit Explanation/i }))

    await waitFor(() => {
      expect(screen.getByText('Keep Thinking...')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Skip for Now/i }))
    expect(onSkip).toHaveBeenCalledTimes(1)
  })
})
