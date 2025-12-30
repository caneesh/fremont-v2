import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MicroTaskStepAccordion from '../MicroTaskStepAccordion'
import type { MicroTaskStep } from '@/types/microTask'
import type { Concept } from '@/types/scaffold'
import { onTaskIncorrect, onStepTimeout } from '@/lib/mistakeTriggers'

vi.mock('../micro-tasks/InsightCard', () => ({
  default: ({ onCorrectAnswer, onWrongAnswer, onSwitchToReadingMode, attempts }: any) => (
    <div>
      <button onClick={() => onCorrectAnswer('Because')}>correct</button>
      <button onClick={() => onWrongAnswer(attempts + 1)}>wrong</button>
      <button onClick={() => onSwitchToReadingMode()}>reading</button>
    </div>
  ),
}))

vi.mock('../micro-tasks/CollectedInsights', () => ({
  default: () => <div data-testid="collected-insights" />,
}))

vi.mock('../micro-tasks/RevealReconstructValidate', () => ({
  default: ({ onComplete, onSkip, onClose }: any) => (
    <div data-testid="reveal-flow-modal">
      <button onClick={() => onComplete('solid', 'explanation')}>complete-solid</button>
      <button onClick={() => onComplete('partial', 'explanation')}>complete-partial</button>
      <button onClick={() => onSkip()}>skip</button>
      <button onClick={() => onClose()}>close</button>
    </div>
  ),
}))

vi.mock('../MathRenderer', () => ({
  default: ({ text }: { text: string }) => <span>{text}</span>,
}))

vi.mock('@/lib/mistakeTriggers', () => ({
  onTaskIncorrect: vi.fn(),
  onStepTimeout: vi.fn(),
}))

vi.mock('@/lib/featureFlags', () => ({
  FEATURE_FLAGS: {
    REVEAL_RECONSTRUCT_VALIDATE: true,
  },
}))

vi.mock('@/lib/storage/eventLogger', () => ({
  eventLogger: {
    log: vi.fn(),
  },
}))

const step: MicroTaskStep = {
  id: 1,
  title: 'Test Step',
  stepType: 'physics_concept',
  requiredConcepts: [],
  tasks: [
    {
      level: 1,
      levelTitle: 'Concept',
      question: 'Q1',
      explanation: 'E1',
      type: 'MULTIPLE_CHOICE',
      options: ['A'],
      correctIndex: 0,
    },
  ],
}

// Multi-tier step for testing Socratic Ladder tier locking
const multiTierStep: MicroTaskStep = {
  id: 2,
  title: 'Multi-Tier Step',
  stepType: 'physics_concept',
  requiredConcepts: [],
  tasks: [
    {
      level: 1,
      levelTitle: 'Concept',
      question: 'Q1',
      explanation: 'Explanation 1',
      type: 'MULTIPLE_CHOICE',
      options: ['A', 'B'],
      correctIndex: 0,
    },
    {
      level: 2,
      levelTitle: 'Method',
      question: 'Q2',
      explanation: 'Explanation 2',
      type: 'MULTIPLE_CHOICE',
      options: ['A', 'B'],
      correctIndex: 0,
    },
    {
      level: 3,
      levelTitle: 'Setup',
      question: 'Q3',
      explanation: 'Explanation 3',
      type: 'MULTIPLE_CHOICE',
      options: ['A', 'B'],
      correctIndex: 0,
    },
  ],
}

const concepts: Concept[] = []

describe('MicroTaskStepAccordion', () => {
  const onTaskComplete = vi.fn()
  const onComplete = vi.fn()
  const onActivate = vi.fn()

  beforeEach(() => {
    onTaskComplete.mockClear()
    onComplete.mockClear()
    onActivate.mockClear()
    vi.mocked(onTaskIncorrect).mockClear()
    vi.mocked(onStepTimeout).mockClear()
  })

  it('does not activate when locked', () => {
    render(
      <MicroTaskStepAccordion
        step={step}
        stepNumber={1}
        isActive={false}
        isCompleted={false}
        isLocked={true}
        concepts={concepts}
        onTaskComplete={onTaskComplete}
        onComplete={onComplete}
        onActivate={onActivate}
      />
    )

    fireEvent.click(screen.getByRole('button'))
    expect(onActivate).not.toHaveBeenCalled()
  })

  it('switches to reading mode and records a task incorrect', () => {
    render(
      <MicroTaskStepAccordion
        step={step}
        stepNumber={1}
        isActive={true}
        isCompleted={false}
        isLocked={false}
        concepts={concepts}
        problemId="problem-1"
        onTaskComplete={onTaskComplete}
        onComplete={onComplete}
        onActivate={onActivate}
      />
    )

    fireEvent.click(screen.getByText('reading'))
    expect(screen.getByText('Socratic Ladder')).not.toBeNull()
    expect(onTaskIncorrect).toHaveBeenCalledTimes(1)
  })

  it('marks a hint as read and completes the step on the final level', () => {
    render(
      <MicroTaskStepAccordion
        step={step}
        stepNumber={1}
        isActive={true}
        isCompleted={false}
        isLocked={false}
        concepts={concepts}
        onTaskComplete={onTaskComplete}
        onComplete={onComplete}
        onActivate={onActivate}
      />
    )

    fireEvent.click(screen.getByText('reading'))
    fireEvent.click(screen.getByText('Concept'))

    // With reveal flow enabled, complete the modal
    // The mock passes 'explanation' as the explanation parameter
    fireEvent.click(screen.getByText('complete-solid'))

    expect(onTaskComplete).toHaveBeenCalledWith(step.id, 1, 'explanation')
    expect(onComplete).toHaveBeenCalledWith(step.id)
  })

  it('records a timeout when the final task is completed', () => {
    render(
      <MicroTaskStepAccordion
        step={step}
        stepNumber={1}
        isActive={true}
        isCompleted={false}
        isLocked={false}
        concepts={concepts}
        problemId="problem-1"
        problemTitle="Problem"
        domain="Mechanics"
        subdomain="Dynamics"
        onTaskComplete={onTaskComplete}
        onComplete={onComplete}
        onActivate={onActivate}
      />
    )

    fireEvent.click(screen.getByText('correct'))

    expect(onStepTimeout).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith(step.id)
  })

  describe('Socratic Ladder tier locking', () => {
    it('shows first tier as next available and later tiers as locked', () => {
      render(
        <MicroTaskStepAccordion
          step={multiTierStep}
          stepNumber={1}
          isActive={true}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      // Switch to reading mode
      fireEvent.click(screen.getByText('reading'))

      // First tier should have "Next" badge and be clickable
      expect(screen.getByText('Next')).not.toBeNull()

      // Later tiers should be locked
      const lockedBadges = screen.getAllByText('Locked')
      expect(lockedBadges.length).toBe(2) // Method and Setup are locked
    })

    it('prevents clicking on locked tiers', () => {
      render(
        <MicroTaskStepAccordion
          step={multiTierStep}
          stepNumber={1}
          isActive={true}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      // Switch to reading mode
      fireEvent.click(screen.getByText('reading'))

      // Try to click on the locked "Method" tier
      fireEvent.click(screen.getByText('Method'))

      // onTaskComplete should not be called for the locked tier
      // It should only be called once from the initial switch to reading mode
      // which marks the first tier as complete via handleHintRead
      expect(onTaskComplete).not.toHaveBeenCalledWith(multiTierStep.id, 2, expect.anything())
    })

    it('unlocks next tier after completing current tier via reveal flow', () => {
      render(
        <MicroTaskStepAccordion
          step={multiTierStep}
          stepNumber={1}
          isActive={true}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      // Switch to reading mode
      fireEvent.click(screen.getByText('reading'))

      // Click on first tier to open reveal flow
      fireEvent.click(screen.getByText('Concept'))

      // Complete the reveal flow for tier 1
      expect(screen.getByTestId('reveal-flow-modal')).not.toBeNull()
      fireEvent.click(screen.getByText('complete-solid'))

      // Now tier 2 should be unlocked (have "Next" badge instead of "Locked")
      expect(screen.getByText('Next')).not.toBeNull()

      // Only one tier should be locked now (tier 3)
      const lockedBadges = screen.getAllByText('Locked')
      expect(lockedBadges.length).toBe(1)
    })

    it('shows collected indicator for completed tiers', () => {
      render(
        <MicroTaskStepAccordion
          step={multiTierStep}
          stepNumber={1}
          isActive={true}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      // Switch to reading mode
      fireEvent.click(screen.getByText('reading'))

      // Complete tier 1
      fireEvent.click(screen.getByText('Concept'))
      fireEvent.click(screen.getByText('complete-solid'))

      // Complete tier 2
      fireEvent.click(screen.getByText('Method'))
      fireEvent.click(screen.getByText('complete-solid'))

      // Complete tier 3 - this should complete the step
      fireEvent.click(screen.getByText('Setup'))
      fireEvent.click(screen.getByText('complete-solid'))

      // Step should be complete
      expect(onComplete).toHaveBeenCalledWith(multiTierStep.id)
    })

    it('allows skipping comprehension check but still unlocks next tier', () => {
      render(
        <MicroTaskStepAccordion
          step={multiTierStep}
          stepNumber={1}
          isActive={true}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      // Switch to reading mode
      fireEvent.click(screen.getByText('reading'))

      // Click first tier and skip the comprehension check
      fireEvent.click(screen.getByText('Concept'))
      fireEvent.click(screen.getByText('skip'))

      // Tier 2 should now be unlocked
      expect(screen.getByText('Next')).not.toBeNull()
      expect(onTaskComplete).toHaveBeenCalledWith(multiTierStep.id, 1, 'Explanation 1')
    })
  })
})
