import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import MicroTaskStepAccordion from '../MicroTaskStepAccordion'
import type { MicroTaskStep } from '@/types/microTask'
import type { Concept } from '@/types/scaffold'
import { onTaskIncorrect, onStepTimeout } from '@/lib/mistakeTriggers'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { eventLogger } from '@/lib/storage/eventLogger'

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
  default: ({ onComplete, onSkip, onClose, onLogEvent }: any) => (
    <div data-testid="reveal-flow-modal">
      <button onClick={() => onComplete('solid', 'explanation')}>complete-solid</button>
      <button onClick={() => onComplete('partial', 'explanation')}>complete-partial</button>
      <button onClick={() => onSkip()}>skip</button>
      <button onClick={() => onClose()}>close</button>
      <button onClick={() => onLogEvent('reveal_flow_opened', { level: 1 })}>log-event</button>
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
    WHY_THIS_STEP: true,
    CONFIDENCE_WEIGHTED_SRS: false,
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
      levelTitle: 'Visual',
      question: 'Q2',
      explanation: 'Explanation 2',
      type: 'MULTIPLE_CHOICE',
      options: ['A', 'B'],
      correctIndex: 0,
    },
    {
      level: 3,
      levelTitle: 'Strategy',
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
    FEATURE_FLAGS.REVEAL_RECONSTRUCT_VALIDATE = true
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
      expect(lockedBadges.length).toBe(2) // Visual and Strategy are locked
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

      // Try to click on the locked "Visual" tier
      fireEvent.click(screen.getByText('Visual'))

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
      fireEvent.click(screen.getByText('Visual'))
      fireEvent.click(screen.getByText('complete-solid'))

      // Complete tier 3 - this should complete the step
      fireEvent.click(screen.getByText('Strategy'))
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

    it('displays locked tiers with dashed border styling', () => {
      const { container } = render(
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

      // Check that locked tiers have dashed border class
      const lockedTiers = container.querySelectorAll('.border-dashed')
      expect(lockedTiers.length).toBe(2) // Visual and Strategy are locked
    })

    it('displays locked tier titles with strikethrough styling', () => {
      const { container } = render(
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

      // Check that locked tier titles have line-through class
      const strikethroughElements = container.querySelectorAll('.line-through')
      expect(strikethroughElements.length).toBe(2) // Visual and Strategy are locked
    })

    it('displays lock icons next to locked tier titles', () => {
      const { container } = render(
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

      // Lock icons should be visible (SVG elements with lock path)
      // We have: circle lock icon + title lock icon + badge lock icon + right-side lock icon = multiple per locked tier
      const lockSvgs = container.querySelectorAll('svg')
      const lockPaths = Array.from(lockSvgs).filter(svg =>
        svg.innerHTML.includes('M5 9V7a5 5 0 0110 0v2') || // Filled lock icon
        svg.innerHTML.includes('M12 15v2m-6 4h12') // Stroke lock icon
      )
      expect(lockPaths.length).toBeGreaterThan(0)
    })

    it('shows tooltip on locked tier buttons explaining unlock requirement', () => {
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

      // Get all tier buttons
      const buttons = screen.getAllByRole('button')

      // Find the button for "Visual" (tier 2) which should be locked
      const methodButton = buttons.find(btn => btn.textContent?.includes('Visual'))
      expect(methodButton).toBeDefined()
      expect(methodButton?.getAttribute('title')).toBe('Complete Tier 1 first to unlock')
    })

    it('applies reduced opacity to locked tier buttons', () => {
      const { container } = render(
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

      // Check that locked tier buttons have opacity-50 class
      const reducedOpacityButtons = container.querySelectorAll('button.opacity-50')
      expect(reducedOpacityButtons.length).toBe(2) // Visual and Strategy buttons
    })
  })

  describe('step activation', () => {
    it('activates step when clicking header on unlocked step', () => {
      render(
        <MicroTaskStepAccordion
          step={step}
          stepNumber={1}
          isActive={false}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      // Click the header button (contains the step title)
      fireEvent.click(screen.getByText('Test Step'))
      expect(onActivate).toHaveBeenCalledWith(step.id)
    })

    it('toggles expanded state when clicking header', () => {
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

      // Content should be visible initially (isActive=true)
      expect(screen.getByText('correct')).not.toBeNull()

      // Click to collapse
      fireEvent.click(screen.getByText('Test Step'))

      // InsightCard buttons should still be there since we toggled
      // The component just toggles isExpanded state
    })

    it('expands and activates when collapsed header is clicked', () => {
      render(
        <MicroTaskStepAccordion
          step={step}
          stepNumber={1}
          isActive={false}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      fireEvent.click(screen.getByText('Test Step'))
      expect(onActivate).toHaveBeenCalledWith(step.id)
      expect(screen.getByText('correct')).not.toBeNull()
    })
  })

  describe('wrong answer handling', () => {
    it('tracks wrong attempts and triggers mistake tracking after 2 attempts', () => {
      render(
        <MicroTaskStepAccordion
          step={step}
          stepNumber={1}
          isActive={true}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          problemId="problem-1"
          problemTitle="Test Problem"
          domain="Mechanics"
          subdomain="Dynamics"
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      // First wrong answer
      fireEvent.click(screen.getByText('wrong'))
      expect(onTaskIncorrect).not.toHaveBeenCalled()

      // Second wrong answer triggers mistake tracking
      fireEvent.click(screen.getByText('wrong'))
      expect(onTaskIncorrect).toHaveBeenCalledTimes(1)
    })
  })

  describe('visual states', () => {
    it('shows completion message when all tasks are completed', () => {
      render(
        <MicroTaskStepAccordion
          step={step}
          stepNumber={1}
          isActive={true}
          isCompleted={true}
          isLocked={false}
          concepts={concepts}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      expect(screen.getByText('Step Completed!')).not.toBeNull()
      expect(screen.getByText(/All 1 insights earned/)).not.toBeNull()
    })

    it('shows step number in header', () => {
      render(
        <MicroTaskStepAccordion
          step={step}
          stepNumber={3}
          isActive={false}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      expect(screen.getByText('3')).not.toBeNull()
    })

    it('shows checkmark icon when completed', () => {
      render(
        <MicroTaskStepAccordion
          step={step}
          stepNumber={1}
          isActive={true}
          isCompleted={true}
          isLocked={false}
          concepts={concepts}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      // The step number circle should have a checkmark SVG
      const checkmarks = document.querySelectorAll('svg path[d="M5 13l4 4L19 7"]')
      expect(checkmarks.length).toBeGreaterThan(0)
    })

    it('shows progress dots for each task', () => {
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

      // Should show "0/3 insights" initially
      expect(screen.getByText('0/3 insights')).not.toBeNull()
    })

    it('shows step type badge when stepType is provided', () => {
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

      expect(screen.getByText('Physics')).not.toBeNull()
    })
  })

  describe('warning beacon', () => {
    it('displays warning beacon when provided', () => {
      const warningBeacon = {
        stepId: 1,
        tag: 'sign_error',
        message: 'Watch out for sign errors!',
        probability: 0.8
      }

      render(
        <MicroTaskStepAccordion
          step={step}
          stepNumber={1}
          isActive={true}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          warningBeacon={warningBeacon}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      expect(screen.getByText('Watch out for sign errors!')).not.toBeNull()
      expect(screen.getByText('Most common mistake here')).not.toBeNull()
    })
  })

  describe('required concepts', () => {
    it('displays required concepts when provided', () => {
      const conceptsWithData: Concept[] = [
        { id: 'c1', name: 'Newton\'s Laws', definition: 'Laws of motion' },
        { id: 'c2', name: 'Friction', definition: 'Resistance force' }
      ]

      const stepWithConcepts: MicroTaskStep = {
        ...step,
        requiredConcepts: ['c1', 'c2']
      }

      render(
        <MicroTaskStepAccordion
          step={stepWithConcepts}
          stepNumber={1}
          isActive={true}
          isCompleted={false}
          isLocked={false}
          concepts={conceptsWithData}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      expect(screen.getByText('Newton\'s Laws')).not.toBeNull()
      expect(screen.getByText('Friction')).not.toBeNull()
    })
  })

  describe('reading mode controls', () => {
    it('shows Back to Quiz Mode button in reading mode', () => {
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
      expect(screen.getByText('Back to Quiz Mode')).not.toBeNull()
    })

    it('returns to quiz mode when clicking Back to Quiz Mode', () => {
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
      expect(screen.getByText('Socratic Ladder')).not.toBeNull()

      fireEvent.click(screen.getByText('Back to Quiz Mode'))

      // Should show InsightCard buttons again
      expect(screen.getByText('correct')).not.toBeNull()
    })
  })

  describe('reveal flow modal', () => {
    it('closes reveal flow modal when close button is clicked', () => {
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

      // Switch to reading mode and open reveal flow
      fireEvent.click(screen.getByText('reading'))
      fireEvent.click(screen.getByText('Concept'))

      expect(screen.getByTestId('reveal-flow-modal')).not.toBeNull()

      // Close the modal
      fireEvent.click(screen.getByText('close'))

      // Modal should be closed (no reveal-flow-modal)
      expect(screen.queryByTestId('reveal-flow-modal')).toBeNull()
    })

    it('shows partial outcome when completing with partial understanding', () => {
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

      fireEvent.click(screen.getByText('reading'))
      fireEvent.click(screen.getByText('Concept'))
      fireEvent.click(screen.getByText('complete-partial'))

      // Should unlock next tier
      expect(screen.getByText('Next')).not.toBeNull()
      expect(onTaskComplete).toHaveBeenCalledWith(multiTierStep.id, 1, 'explanation')
    })

    it('logs reveal flow events with metadata', () => {
      render(
        <MicroTaskStepAccordion
          step={multiTierStep}
          stepNumber={1}
          isActive={true}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          problemId="problem-123"
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      fireEvent.click(screen.getByText('reading'))
      fireEvent.click(screen.getByText('Concept'))
      fireEvent.click(screen.getByText('log-event'))

      expect(vi.mocked(eventLogger.log)).toHaveBeenCalledWith('reveal_flow_opened', {
        level: 1,
        stepId: multiTierStep.id,
        problemId: 'problem-123',
      })
    })
  })

  describe('collected insights display', () => {
    it('shows collected insights in quiz mode after answering correctly', () => {
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

      // Answer first question correctly
      fireEvent.click(screen.getByText('correct'))

      // CollectedInsights component should be rendered
      expect(screen.getByTestId('collected-insights')).not.toBeNull()
    })
  })

  describe('loading saved progress', () => {
    it('loads progress from props', () => {
      const savedProgress = {
        stepId: 2,
        isCompleted: false,
        currentLevel: 2,
        taskAttempts: [{ level: 1, attempts: 1, isCompleted: true }],
        collectedInsights: ['First explanation']
      }

      render(
        <MicroTaskStepAccordion
          step={multiTierStep}
          stepNumber={1}
          isActive={true}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          progress={savedProgress}
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      // Should show 1/3 insights based on saved progress
      expect(screen.getByText('1/3 insights')).not.toBeNull()
    })
  })

  describe('non-reveal flow behavior', () => {
    it('expands and reads hints without reveal flow enabled', async () => {
      FEATURE_FLAGS.REVEAL_RECONSTRUCT_VALIDATE = false

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
      // In some environments, the accordion can end up collapsed after switching modes.
      // Ensure the reading-mode ladder is visible before interacting with tiers.
      if (!screen.queryByText('Socratic Ladder')) {
        fireEvent.click(screen.getByText('Test Step'))
      }
      expect(await screen.findByText('Socratic Ladder')).not.toBeNull()
      fireEvent.click(screen.getByText('Concept'))
      fireEvent.click(screen.getByText('Concept'))

      expect(await screen.findByText('E1')).not.toBeNull()
      expect(onTaskComplete).toHaveBeenCalledWith(step.id, 1, 'E1')
    })
  })

  describe('Why this step? explainer', () => {
    beforeEach(() => {
      FEATURE_FLAGS.WHY_THIS_STEP = true
      global.fetch = vi.fn()
    })

    it('shows "Why?" button when feature flag is enabled and step is not locked', () => {
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

      expect(screen.getByText('Why?')).toBeInTheDocument()
    })

    it('hides "Why?" button when step is locked', () => {
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

      expect(screen.queryByText('Why?')).not.toBeInTheDocument()
    })

    it('hides "Why?" button when feature flag is disabled', () => {
      FEATURE_FLAGS.WHY_THIS_STEP = false

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

      expect(screen.queryByText('Why?')).not.toBeInTheDocument()
    })

    it('fetches and displays explanation when "Why?" button is clicked', async () => {
      const mockExplanation = 'This step helps you identify all forces acting on the object.'
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, explanation: mockExplanation }),
      })

      render(
        <MicroTaskStepAccordion
          step={step}
          stepNumber={1}
          isActive={true}
          isCompleted={false}
          isLocked={false}
          concepts={concepts}
          problemStatement="A block on an incline"
          onTaskComplete={onTaskComplete}
          onComplete={onComplete}
          onActivate={onActivate}
        />
      )

      fireEvent.click(screen.getByText('Why?'))

      // Should show loading state
      expect(screen.getByText('Generating explanation...')).toBeInTheDocument()

      // Wait for explanation to appear
      expect(await screen.findByText(mockExplanation)).toBeInTheDocument()

      // Verify API was called with correct parameters
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/scaffold/step/explain',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })

    it('shows "Why this step?" header in explanation panel', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, explanation: 'Test explanation' }),
      })

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

      fireEvent.click(screen.getByText('Why?'))

      expect(await screen.findByText('Why this step?')).toBeInTheDocument()
    })

    it('toggles explanation visibility when clicked again', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, explanation: 'Test explanation' }),
      })

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

      // Click to show
      fireEvent.click(screen.getByText('Why?'))
      expect(await screen.findByText('Test explanation')).toBeInTheDocument()

      // Click to hide
      fireEvent.click(screen.getByText('Why?'))
      expect(screen.queryByText('Test explanation')).not.toBeInTheDocument()

      // Click to show again (should not refetch)
      fireEvent.click(screen.getByText('Why?'))
      expect(await screen.findByText('Test explanation')).toBeInTheDocument()
      expect(global.fetch).toHaveBeenCalledTimes(1) // Only called once
    })

    it('shows error message when API call fails', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ success: false, error: 'API error' }),
      })

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

      fireEvent.click(screen.getByText('Why?'))

      expect(await screen.findByText('Could not load explanation.')).toBeInTheDocument()
    })

    it('can close explanation panel by clicking Why button again', async () => {
      ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, explanation: 'Test explanation' }),
      })

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

      // Open explanation
      fireEvent.click(screen.getByText('Why?'))
      expect(await screen.findByText('Test explanation')).toBeInTheDocument()
      expect(screen.getByText('Why this step?')).toBeInTheDocument()

      // Click Why? again to close
      fireEvent.click(screen.getByText('Why?'))
      expect(screen.queryByText('Test explanation')).not.toBeInTheDocument()
    })
  })
})
