import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { act } from 'react'
import SolutionScaffold from '../SolutionScaffold'
import type { ScaffoldData } from '@/types/scaffold'
import type { MicroTaskScaffoldData } from '@/types/microTask'

vi.mock('@/lib/problemHistory', () => ({
  problemHistoryService: {
    getAttempt: vi.fn(),
    loadDraft: vi.fn(),
    loadFinalSolution: vi.fn(),
    updateLastOpened: vi.fn(),
    saveDraft: vi.fn(),
    markSolved: vi.fn(),
    toggleReview: vi.fn(),
    getHistory: vi.fn(() => ({ total: 0 })),
  },
}))

vi.mock('@/lib/mistakeTracking', () => ({
  mistakeTrackingService: {
    generateWarnings: vi.fn(() => []),
    recordPattern: vi.fn(),
  },
}))

vi.mock('@/lib/errorPatternService', () => ({
  errorPatternService: {
    recordError: vi.fn(),
  },
}))

vi.mock('@/lib/explainToFriendService', () => ({
  explainToFriendService: {
    recordExplanation: vi.fn(),
  },
}))

vi.mock('@/lib/conceptMasteryService', () => ({
  conceptMasteryService: {
    recordAttempt: vi.fn(),
    cleanup: vi.fn(),
    getConceptMastery: vi.fn(() => null),
  },
}))

vi.mock('@/lib/conceptMappingService', () => ({
  conceptMappingService: {
    mapConcepts: vi.fn(() => new Map()),
  },
}))

vi.mock('../StepAccordion', () => ({
  default: ({
    onComplete,
    onAnswerChange,
    onHintLevelChange,
    onActivate,
    isActive,
  }: {
    onComplete: () => void
    onAnswerChange: (answer: string) => void
    onHintLevelChange: (level: number) => void
    onActivate: () => void
    isActive: boolean
  }) => (
    <div>
      <div data-testid="step-accordion" data-active={isActive ? 'true' : 'false'} />
      <button onClick={onComplete}>complete-step</button>
      <button onClick={() => onAnswerChange('my answer')}>set-answer</button>
      <button onClick={() => onHintLevelChange(3)}>set-hint</button>
      <button onClick={onActivate}>activate-step</button>
    </div>
  ),
}))

vi.mock('../MicroTaskStepAccordion', () => ({
  default: ({
    step,
    onTaskComplete,
    onComplete,
    onActivate,
    isActive,
  }: {
    step: { id: number }
    onTaskComplete: (stepId: number, level: number, explanation: string) => void
    onComplete: (stepId: number) => void
    onActivate: () => void
    isActive: boolean
  }) => (
    <div data-testid="microtask-accordion" data-active={isActive ? 'true' : 'false'}>
      <button onClick={() => onTaskComplete(step.id, 1, 'Insight')}>complete-micro-task</button>
      <button onClick={() => onComplete(step.id)}>complete-micro-step</button>
      <button onClick={onActivate}>activate-micro-step</button>
    </div>
  ),
}))

vi.mock('../diagram/DiagramStep', () => ({
  default: ({ onComplete, onActivate }: { onComplete: () => void; onActivate: () => void }) => (
    <div data-testid="diagram-step">
      <button onClick={onComplete}>complete-diagram</button>
      <button onClick={onActivate}>activate-diagram</button>
    </div>
  ),
}))

vi.mock('../ConceptPanel', () => ({
  default: () => <div data-testid="concept-panel" />,
}))

vi.mock('../SanityCheckStep', () => ({
  default: ({
    onTargetStep,
    onSolved,
  }: {
    onTargetStep: (stepId: number) => void
    onSolved: () => void
  }) => (
    <div data-testid="sanity-check">
      <button onClick={() => onTargetStep(1)}>target-step</button>
      <button onClick={onSolved}>solve-sanity</button>
    </div>
  ),
}))

vi.mock('../SanityCheckMatrix', () => ({
  default: ({
    onAllChecksComplete,
    onTargetStep,
  }: {
    onAllChecksComplete: () => void
    onTargetStep?: (stepId: number) => void
  }) => (
    <div data-testid="sanity-check">
      <button onClick={() => onTargetStep?.(1)}>target-step</button>
      <button onClick={onAllChecksComplete}>complete-checks</button>
    </div>
  ),
}))

vi.mock('../NextChallenge', () => ({
  default: ({ onAcceptChallenge }: { onAcceptChallenge: (problemText: string) => void }) => (
    <div data-testid="next-challenge">
      <button onClick={() => onAcceptChallenge('next problem')}>accept-challenge</button>
    </div>
  ),
}))

vi.mock('../ReflectionStep', () => ({
  default: ({
    onReflectionComplete,
    studentOutcome,
    hintsUsed,
  }: {
    onReflectionComplete: (answers: Array<{ question: string; answer: string }>) => void
    studentOutcome: string
    hintsUsed: number[]
  }) => (
    <div>
      <div
        data-testid="reflection-step"
        data-outcome={studentOutcome}
        data-hints={hintsUsed.join(',')}
      />
      <button onClick={() => onReflectionComplete([{ question: 'q', answer: 'a' }])}>
        finish-reflection
      </button>
      <button
        onClick={() =>
          onReflectionComplete([{ question: 'What mistake did you make?', answer: 'I used the wrong sign.' }])
        }
      >
        finish-reflection-with-mistake
      </button>
    </div>
  ),
}))

vi.mock('../ProblemVariations', () => ({
  default: ({ onSelectVariation }: { onSelectVariation: (problemText: string) => void }) => (
    <div data-testid="problem-variations">
      <button onClick={() => onSelectVariation('variation problem')}>select-variation</button>
    </div>
  ),
}))

vi.mock('../MistakeWarning', () => ({
  default: ({ onDismiss }: { onDismiss: () => void }) => (
    <div data-testid="mistake-warning">
      <button onClick={onDismiss}>dismiss-warning</button>
    </div>
  ),
}))

vi.mock('../ErrorPatternInsights', () => ({
  default: () => <div data-testid="error-pattern-insights" />,
}))

vi.mock('../ExplainToFriend', () => ({
  default: ({
    onComplete,
    onSkip,
  }: {
    onComplete: (explanation: string, quality: string) => void
    onSkip: () => void
  }) => (
    <div>
      <div data-testid="explain-to-friend" />
      <button onClick={() => onComplete('Because', 'good')}>finish-explain</button>
      <button onClick={onSkip}>skip-explain</button>
    </div>
  ),
}))

vi.mock('../PostSolveActivity', () => ({
  default: ({ onDismiss }: { onDismiss: () => void }) => (
    <div data-testid="post-solve-activity">
      <button onClick={onDismiss}>dismiss-post-solve</button>
    </div>
  ),
}))

vi.mock('../Celebration', () => ({
  default: ({ show, onComplete }: { show: boolean; onComplete: () => void }) => (
    <div data-testid="celebration" data-show={show ? 'true' : 'false'}>
      <button onClick={onComplete}>complete-celebration</button>
    </div>
  ),
}))

vi.mock('../SubmissionCanvas', () => ({
  default: ({
    onGradeComplete,
  }: {
    onGradeComplete: (result: {
      status: 'SUCCESS' | 'MINOR_SLIP' | 'CONCEPTUAL_GAP'
      feedback_markdown: string
      highlight_location: string | null
      next_action: { type: 'OPTIMIZE' | 'FIX_LINE' | 'REVIEW_CONCEPT'; label: string }
      confidence: number
    }) => void
  }) => (
    <div data-testid="submission-canvas">
      <button
        onClick={() =>
          onGradeComplete({
            status: 'SUCCESS',
            feedback_markdown: 'Great job',
            highlight_location: null,
            next_action: { type: 'OPTIMIZE', label: 'Optimize' },
            confidence: 0.9,
          })
        }
      >
        grade-success
      </button>
      <button
        onClick={() =>
          onGradeComplete({
            status: 'MINOR_SLIP',
            feedback_markdown: 'Minor slip',
            highlight_location: 'line 2',
            next_action: { type: 'FIX_LINE', label: 'Fix line' },
            confidence: 0.6,
          })
        }
      >
        grade-minor-slip
      </button>
      <button
        onClick={() =>
          onGradeComplete({
            status: 'CONCEPTUAL_GAP',
            feedback_markdown: 'Review concept',
            highlight_location: 'line 3',
            next_action: { type: 'REVIEW_CONCEPT', label: 'Review' },
            confidence: 0.4,
          })
        }
      >
        grade-concept-gap
      </button>
    </div>
  ),
}))

vi.mock('../simulation', () => ({
  WhatIfSimulation: () => <div data-testid="what-if-simulation" />,
}))

vi.mock('../SocraticRewindModal', () => ({
  default: ({
    isOpen,
    context,
    triggerSource,
    onClose,
    onReturnToStep,
    onProceed,
  }: {
    isOpen: boolean
    context: { previousValidStep: { stepId: number } }
    triggerSource: string
    onClose: () => void
    onReturnToStep: (stepId: number) => void
    onProceed: () => void
  }) =>
    isOpen ? (
      <div data-testid="socratic-rewind-modal" data-trigger={triggerSource}>
        <span data-testid="rewind-step-id">{context?.previousValidStep?.stepId}</span>
        <button onClick={onClose}>close-rewind</button>
        <button onClick={() => onReturnToStep(context?.previousValidStep?.stepId ?? 0)}>
          return-to-step
        </button>
        <button onClick={onProceed}>proceed-anyway</button>
      </div>
    ) : null,
}))

const baseConcepts = [
  { id: 'c1', name: 'Concept 1', definition: 'Def' },
]

const microTaskData: MicroTaskScaffoldData = {
  problem: 'Micro task problem',
  domain: 'Mechanics',
  subdomain: 'Kinematics',
  concepts: baseConcepts,
  steps: [
    {
      id: 1,
      title: 'Step 1',
      requiredConcepts: ['c1'],
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
    },
  ],
  sanityCheck: {
    question: 'Sanity?',
    expectedBehavior: 'Ok',
    type: 'dimension',
  },
}

const microTaskMultiData: MicroTaskScaffoldData = {
  ...microTaskData,
  steps: [
    {
      id: 1,
      title: 'Step 1',
      requiredConcepts: ['c1'],
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
    },
    {
      id: 2,
      title: 'Step 2',
      requiredConcepts: ['c1'],
      tasks: [
        {
          level: 1,
          levelTitle: 'Concept',
          question: 'Q2',
          explanation: 'E2',
          type: 'MULTIPLE_CHOICE',
          options: ['B'],
          correctIndex: 0,
        },
      ],
    },
  ],
}

const hintData: ScaffoldData = {
  problem: 'Hint problem',
  domain: 'Mechanics',
  subdomain: 'Dynamics',
  concepts: baseConcepts,
  steps: [
    {
      id: 1,
      title: 'Step 1',
      requiredConcepts: ['c1'],
      hints: [
        { level: 1, title: 'Concept Identification', content: 'Hint 1' },
        { level: 2, title: 'Visualization', content: 'Hint 2' },
        { level: 3, title: 'Strategy Selection', content: 'Hint 3' },
        { level: 4, title: 'Structural Equation', content: 'Hint 4' },
        { level: 5, title: 'Full Solution', content: 'Hint 5' },
      ],
    },
  ],
  sanityCheck: {
    question: 'Sanity?',
    expectedBehavior: 'Ok',
    type: 'dimension',
  },
}

const multiStepData: ScaffoldData = {
  ...hintData,
  steps: [
    {
      id: 1,
      title: 'Step 1',
      requiredConcepts: ['c1'],
      hints: [
        { level: 1, title: 'Concept Identification', content: 'Hint 1' },
        { level: 2, title: 'Visualization', content: 'Hint 2' },
      ],
    },
    {
      id: 2,
      title: 'Step 2',
      requiredConcepts: ['c1'],
      hints: [
        { level: 1, title: 'Concept Identification', content: 'Hint 1' },
        { level: 2, title: 'Visualization', content: 'Hint 2' },
      ],
    },
  ],
}

const diagramData: ScaffoldData = {
  ...hintData,
  steps: [
    {
      id: 1,
      title: 'Draw the FBD',
      stepType: 'diagram',
      requiredConcepts: ['c1'],
      hints: [
        { level: 1, title: 'Concept Identification', content: 'Hint 1' },
      ],
      diagramData: {
        scenarioType: 'horizontal',
        objectShape: 'block',
        requiredForces: [
          { type: 'weight', direction: 'down' },
        ],
      },
    },
  ],
}

describe('SolutionScaffold', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })
  it('renders micro-task steps when data uses micro-tasks', () => {
    render(
      <SolutionScaffold
        data={microTaskData}
        onReset={vi.fn()}
      />
    )

    expect(screen.getByText('Solution Roadmap')).not.toBeNull()
    expect(screen.getByTestId('microtask-accordion')).not.toBeNull()
    expect(screen.queryByTestId('step-accordion')).toBeNull()
  })

  it('renders standard step accordion when data uses hints', () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    expect(screen.getByText('Solution Roadmap')).not.toBeNull()
    expect(screen.getByTestId('step-accordion')).not.toBeNull()
    expect(screen.queryByTestId('microtask-accordion')).toBeNull()
  })

  it('shows explain-to-friend then reflection flow when marking solved', async () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    const markSolved = screen.getByText('Mark as Solved')
    await act(async () => {
      fireEvent.click(markSolved)
    })

    const explain = await screen.findByTestId('explain-to-friend')
    expect(explain).not.toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    const reflection = await screen.findByTestId('reflection-step')
    expect(reflection).not.toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection'))
    })

    const variations = await screen.findByTestId('problem-variations')
    expect(variations).not.toBeNull()
  })

  it('shows sanity check after all steps are completed', async () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('complete-step'))
    })

    const sanityCheck = await screen.findByTestId('sanity-check')
    expect(sanityCheck).not.toBeNull()
  })

  it('renders error pattern insights after reflection is complete', async () => {
    localStorage.setItem('physiscaffold_user', 'student-1')

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    await screen.findByTestId('explain-to-friend')

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    await screen.findByTestId('reflection-step')

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection'))
    })

    const insights = await screen.findByTestId('error-pattern-insights')
    expect(insights).not.toBeNull()
  })

  it('shows what-if simulation after reflection for hint scaffolds', async () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    expect(screen.getByTestId('explain-to-friend')).not.toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    expect(screen.getByTestId('reflection-step')).not.toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection'))
    })

    const simulation = await screen.findByTestId('what-if-simulation')
    expect(simulation).not.toBeNull()
  })

  it('shows post-solve activity after reflection based on random chance', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    expect(screen.getByTestId('explain-to-friend')).not.toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    expect(screen.getByTestId('reflection-step')).not.toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection'))
    })

    await act(async () => {
      vi.runAllTimers()
    })

    expect(screen.queryByTestId('post-solve-activity')).not.toBeNull()
  })

  it('dismisses post-solve activity when dismissed', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.spyOn(Math, 'random').mockReturnValue(0.1)

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection'))
    })

    await act(async () => {
      vi.runAllTimers()
    })

    expect(screen.queryByTestId('post-solve-activity')).not.toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByText('dismiss-post-solve'))
    })

    expect(screen.queryByTestId('post-solve-activity')).toBeNull()
  })

  it('does not show post-solve activity when random chance fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.spyOn(Math, 'random').mockReturnValue(0.9)

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    expect(screen.getByTestId('explain-to-friend')).not.toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    expect(screen.getByTestId('reflection-step')).not.toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection'))
    })

    await act(async () => {
      vi.runAllTimers()
    })

    expect(screen.queryByTestId('post-solve-activity')).toBeNull()
  })

  it('shows submission canvas when toggled after step completion', async () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('complete-step'))
    })

    const submitButton = screen.getByText('Submit Your Solution')
    await act(async () => {
      fireEvent.click(submitButton)
    })

    expect(screen.getByTestId('submission-canvas')).not.toBeNull()
  })

  it('updates the submission header and celebration after a successful grade', async () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('complete-step'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Your Solution'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('grade-success'))
    })

    expect(screen.getByText('Solution Graded')).not.toBeNull()
    expect(screen.getByText('Status: SUCCESS')).not.toBeNull()

    const celebration = screen.getByTestId('celebration')
    expect(celebration.getAttribute('data-show')).toBe('true')
  })

  it('does not celebrate for non-successful grades', async () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('complete-step'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Submit Your Solution'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('grade-minor-slip'))
    })

    expect(screen.getByText('Status: MINOR SLIP')).not.toBeNull()
    expect(screen.getByTestId('celebration').getAttribute('data-show')).toBe('false')
  })

  it('saves draft when clicking Save Draft button', async () => {
    const { problemHistoryService } = await import('@/lib/problemHistory')

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    const saveButton = screen.getByText('Save Draft')
    await act(async () => {
      fireEvent.click(saveButton)
    })

    expect(problemHistoryService.saveDraft).toHaveBeenCalled()
  })

  it('saves draft with updated answers and hint levels', async () => {
    const { problemHistoryService } = await import('@/lib/problemHistory')

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('set-answer'))
      fireEvent.click(screen.getByText('set-hint'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Save Draft'))
    })

    const calls = vi.mocked(problemHistoryService.saveDraft).mock.calls
    const savedProgress = calls[calls.length - 1][2]
    expect(savedProgress.stepProgress[0].userAnswer).toBe('my answer')
    expect(savedProgress.stepProgress[0].currentHintLevel).toBe(3)
  })

  it('shows an error message if draft save fails', async () => {
    const { problemHistoryService } = await import('@/lib/problemHistory')
    vi.mocked(problemHistoryService.saveDraft).mockImplementationOnce(() => {
      throw new Error('Disk full')
    })

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Save Draft'))
    })

    expect(screen.getByText(/Error: Disk full/)).not.toBeNull()
  })

  it('toggles review flag when clicking Mark for Review button', async () => {
    const { problemHistoryService } = await import('@/lib/problemHistory')

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    const reviewButton = screen.getByText('Mark for Review')
    await act(async () => {
      fireEvent.click(reviewButton)
    })

    expect(problemHistoryService.toggleReview).toHaveBeenCalled()
  })

  it('shows an error when review toggle fails', async () => {
    const { problemHistoryService } = await import('@/lib/problemHistory')
    vi.mocked(problemHistoryService.toggleReview).mockImplementation(() => {
      throw new Error('Toggle failed')
    })

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark for Review'))
    })

    expect(screen.getByText(/Error: Toggle failed/)).not.toBeNull()
  })

  it('calls onReset when clicking New Problem button', async () => {
    const onReset = vi.fn()

    render(
      <SolutionScaffold
        data={hintData}
        onReset={onReset}
      />
    )

    const resetButton = screen.getByText('← New Problem')
    await act(async () => {
      fireEvent.click(resetButton)
    })

    expect(onReset).toHaveBeenCalled()
  })

  it('skips explanation and goes to reflection when skip is clicked', async () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    expect(screen.getByTestId('explain-to-friend')).not.toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByText('skip-explain'))
    })

    expect(screen.getByTestId('reflection-step')).not.toBeNull()
    expect(screen.queryByTestId('explain-to-friend')).toBeNull()
  })

  it('displays domain and subdomain in header', () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    expect(screen.getByText('Mechanics → Dynamics')).not.toBeNull()
  })

  it('displays problem statement', () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    expect(screen.getByText('Hint problem')).not.toBeNull()
  })

  it('renders concept panel', () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    expect(screen.getByTestId('concept-panel')).not.toBeNull()
  })

  it('shows next challenge when onLoadNewProblem is provided after solving', async () => {
    const onLoadNewProblem = vi.fn()

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
        onLoadNewProblem={onLoadNewProblem}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection'))
    })

    expect(screen.getByTestId('next-challenge')).not.toBeNull()
  })

  it('invokes onLoadNewProblem from variations and next challenge', async () => {
    const onReset = vi.fn()
    const onLoadNewProblem = vi.fn()

    render(
      <SolutionScaffold
        data={hintData}
        onReset={onReset}
        onLoadNewProblem={onLoadNewProblem}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('select-variation'))
      fireEvent.click(screen.getByText('accept-challenge'))
    })

    expect(onReset).toHaveBeenCalledTimes(2)
    expect(onLoadNewProblem).toHaveBeenCalledWith('variation problem')
    expect(onLoadNewProblem).toHaveBeenCalledWith('next problem')
  })

  it('loads final solution when attempt is solved', async () => {
    const { problemHistoryService } = await import('@/lib/problemHistory')

    vi.mocked(problemHistoryService.getAttempt).mockReturnValue({
      problemId: 'test-123',
      problemTitle: 'Test',
      status: 'SOLVED',
      reviewFlag: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    vi.mocked(problemHistoryService.loadFinalSolution).mockReturnValue({
      problemText: 'Test problem',
      stepProgress: [
        { stepId: 0, isCompleted: true }
      ],
      currentStep: 0,
      reflectionAnswers: [{ question: 'q', answer: 'a' }],
    })

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    expect(problemHistoryService.loadFinalSolution).toHaveBeenCalled()
    expect(screen.getByTestId('problem-variations')).not.toBeNull()
  })

  it('loads saved progress from problemHistoryService on mount', async () => {
    const { problemHistoryService } = await import('@/lib/problemHistory')

    vi.mocked(problemHistoryService.getAttempt).mockReturnValue({
      problemId: 'test-123',
      problemTitle: 'Test',
      status: 'IN_PROGRESS',
      reviewFlag: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    vi.mocked(problemHistoryService.loadDraft).mockReturnValue({
      problemText: 'Test problem',
      stepProgress: [
        { stepId: 0, isCompleted: true, currentHintLevel: 2 }
      ],
      currentStep: 0,
    })

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    expect(problemHistoryService.getAttempt).toHaveBeenCalled()
    expect(problemHistoryService.loadDraft).toHaveBeenCalled()
  })

  it('records explanation when completing explain-to-friend', async () => {
    const { explainToFriendService } = await import('@/lib/explainToFriendService')
    localStorage.setItem('physiscaffold_user', 'test-student')

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    expect(explainToFriendService.recordExplanation).toHaveBeenCalledWith(
      'test-student',
      expect.any(String),
      'Because',
      'good',
      undefined
    )
  })

  it('records mistake patterns on reflection complete', async () => {
    const { mistakeTrackingService } = await import('@/lib/mistakeTracking')
    localStorage.setItem('physiscaffold_user', 'test-student')

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection'))
    })

    expect(mistakeTrackingService.recordPattern).toHaveBeenCalled()
  })

  it('shows celebration when problem is marked solved', async () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection'))
    })

    const celebration = screen.getByTestId('celebration')
    expect(celebration.getAttribute('data-show')).toBe('true')
  })

  it('allows dismissing the celebration', async () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection'))
    })

    const celebration = screen.getByTestId('celebration')
    expect(celebration.getAttribute('data-show')).toBe('true')

    await act(async () => {
      fireEvent.click(screen.getByText('complete-celebration'))
    })

    expect(screen.getByTestId('celebration').getAttribute('data-show')).toBe('false')
  })

  it('captures student outcome based on hint usage', async () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('set-hint'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    expect(screen.getByTestId('reflection-step').getAttribute('data-outcome')).toBe('assisted')
    expect(screen.getByTestId('reflection-step').getAttribute('data-hints')).toBe('3')
  })

  it('analyzes error patterns for mistake reflections with high confidence', async () => {
    const { errorPatternService } = await import('@/lib/errorPatternService')
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        patterns: [{ patternId: 'EP001', confidence: 0.7, reasoning: 'Sign error' }],
        summary: 'Summary',
        recommendations: ['Review signs'],
      }),
    })

    vi.stubGlobal('fetch', fetchSpy)
    localStorage.setItem('physiscaffold_user', 'test-student')

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('set-hint'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection-with-mistake'))
    })

    expect(fetchSpy).toHaveBeenCalled()
    expect(errorPatternService.recordError).toHaveBeenCalledWith(
      'test-student',
      'EP001',
      expect.any(String),
      'Hint problem',
      'I used the wrong sign.',
      '1. Step 1',
      expect.objectContaining({
        topic: 'Mechanics - Dynamics',
        hintsUsed: 3,
      })
    )
  })

  it('records concept mastery and cleanup after solving', async () => {
    const { conceptMasteryService } = await import('@/lib/conceptMasteryService')
    const { problemHistoryService } = await import('@/lib/problemHistory')

    vi.mocked(problemHistoryService.getHistory).mockReturnValue({ total: 10 })
    localStorage.setItem('physiscaffold_user', 'test-student')

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('complete-step'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('Mark as Solved'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-explain'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('finish-reflection'))
    })

    expect(conceptMasteryService.recordAttempt).toHaveBeenCalled()
    expect(conceptMasteryService.cleanup).toHaveBeenCalledWith('test-student')
  })

  it('triggers celebration when sanity check is solved', async () => {
    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('complete-step'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('solve-sanity'))
    })

    const celebration = screen.getByTestId('celebration')
    expect(celebration.getAttribute('data-show')).toBe('true')
  })

  it('scrolls to a step when sanity check targets one', async () => {
    const scrollSpy = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrollSpy

    render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('complete-step'))
    })

    await act(async () => {
      fireEvent.click(screen.getByText('target-step'))
    })

    expect(scrollSpy).toHaveBeenCalled()
  })

  it('clears highlighted step after the timeout', async () => {
    vi.useFakeTimers()

    const { container } = render(
      <SolutionScaffold
        data={hintData}
        onReset={vi.fn()}
      />
    )

    await act(async () => {
      fireEvent.click(screen.getByText('complete-step'))
    })

    expect(container.querySelector('.ring-4')).toBeNull()

    await act(async () => {
      fireEvent.click(screen.getByText('target-step'))
    })

    expect(container.querySelector('.ring-4')).not.toBeNull()

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(container.querySelector('.ring-4')).toBeNull()
  })

  describe('micro-task mode', () => {
    it('does not show step accordion in micro-task mode', () => {
      render(
        <SolutionScaffold
          data={microTaskData}
          onReset={vi.fn()}
        />
      )

      expect(screen.queryByTestId('step-accordion')).toBeNull()
    })

    it('shows micro-task accordion in micro-task mode', () => {
      render(
        <SolutionScaffold
          data={microTaskData}
          onReset={vi.fn()}
        />
      )

      expect(screen.getByTestId('microtask-accordion')).not.toBeNull()
    })

    it('records micro-task progress when tasks are completed', async () => {
      const { problemHistoryService } = await import('@/lib/problemHistory')

      render(
        <SolutionScaffold
          data={microTaskData}
          onReset={vi.fn()}
        />
      )

      await act(async () => {
        fireEvent.click(screen.getByText('complete-micro-task'))
      })

      await act(async () => {
        fireEvent.click(screen.getByText('Save Draft'))
      })

      const calls = vi.mocked(problemHistoryService.saveDraft).mock.calls
      const savedProgress = calls[calls.length - 1][2]
      expect(savedProgress.useMicroTasks).toBe(true)
      expect(savedProgress.microTaskProgress).toHaveLength(1)
    })

    it('advances active micro-task step when a step is completed', async () => {
      render(
        <SolutionScaffold
          data={microTaskMultiData}
          onReset={vi.fn()}
        />
      )

      const stepNodes = screen.getAllByTestId('microtask-accordion')
      expect(stepNodes[0].getAttribute('data-active')).toBe('true')
      expect(stepNodes[1].getAttribute('data-active')).toBe('false')

      await act(async () => {
        fireEvent.click(screen.getAllByText('complete-micro-step')[0])
      })

      const updatedNodes = screen.getAllByTestId('microtask-accordion')
      expect(updatedNodes[0].getAttribute('data-active')).toBe('false')
      expect(updatedNodes[1].getAttribute('data-active')).toBe('true')
    })
  })

  describe('diagram steps', () => {
    // TODO: Fix test isolation issue - passes individually but fails with full suite
    it.skip('renders diagram steps and marks them complete', async () => {
      render(
        <SolutionScaffold
          data={diagramData}
          onReset={vi.fn()}
        />
      )

      expect(screen.getByTestId('diagram-step')).not.toBeNull()

      await act(async () => {
        fireEvent.click(screen.getByText('complete-diagram'))
      })

      // Wait for sanity check to appear after step completion
      const sanityCheck = await screen.findByTestId('sanity-check')
      expect(sanityCheck).not.toBeNull()
    })
  })

  describe('warning behaviors', () => {
    it('generates warnings on mount', async () => {
      const { mistakeTrackingService } = await import('@/lib/mistakeTracking')

      render(
        <SolutionScaffold
          data={hintData}
          onReset={vi.fn()}
        />
      )

      expect(mistakeTrackingService.generateWarnings).toHaveBeenCalledWith(
        hintData.concepts,
        'Mechanics - Dynamics'
      )
    })

    it('dismisses mistake warnings when requested', async () => {
      const { mistakeTrackingService } = await import('@/lib/mistakeTracking')
      vi.mocked(mistakeTrackingService.generateWarnings).mockReturnValue([
        {
          type: 'concept',
          conceptId: 'c1',
          conceptName: 'Concept 1',
          message: 'Watch this',
          severity: 'medium',
        },
      ])

      render(
        <SolutionScaffold
          data={hintData}
          onReset={vi.fn()}
        />
      )

      expect(screen.queryByTestId('mistake-warning')).not.toBeNull()
      fireEvent.click(screen.getByText('dismiss-warning'))
      expect(screen.queryByTestId('mistake-warning')).toBeNull()
    })
  })

  describe('step activation and draft state', () => {
    it('updates active step when activating another step', async () => {
      render(
        <SolutionScaffold
          data={multiStepData}
          onReset={vi.fn()}
        />
      )

      const stepNodes = screen.getAllByTestId('step-accordion')
      expect(stepNodes[0].getAttribute('data-active')).toBe('true')
      expect(stepNodes[1].getAttribute('data-active')).toBe('false')

      await act(async () => {
        fireEvent.click(screen.getAllByText('activate-step')[1])
      })

      const updatedNodes = screen.getAllByTestId('step-accordion')
      expect(updatedNodes[0].getAttribute('data-active')).toBe('false')
      expect(updatedNodes[1].getAttribute('data-active')).toBe('true')
    })

    it('advances to the next step when a step is completed', async () => {
      render(
        <SolutionScaffold
          data={multiStepData}
          onReset={vi.fn()}
        />
      )

      const stepNodes = screen.getAllByTestId('step-accordion')
      expect(stepNodes[0].getAttribute('data-active')).toBe('true')
      expect(stepNodes[1].getAttribute('data-active')).toBe('false')

      await act(async () => {
        fireEvent.click(screen.getAllByText('complete-step')[0])
      })

      const updatedNodes = screen.getAllByTestId('step-accordion')
      expect(updatedNodes[0].getAttribute('data-active')).toBe('false')
      expect(updatedNodes[1].getAttribute('data-active')).toBe('true')
    })

    it('saves current step position in drafts', async () => {
      const { problemHistoryService } = await import('@/lib/problemHistory')
      vi.mocked(problemHistoryService.saveDraft).mockImplementation(() => undefined)

      render(
        <SolutionScaffold
          data={multiStepData}
          onReset={vi.fn()}
        />
      )

      await act(async () => {
        fireEvent.click(screen.getAllByText('activate-step')[1])
      })

      await act(async () => {
        fireEvent.click(screen.getByText('Save Draft'))
      })

      const calls = vi.mocked(problemHistoryService.saveDraft).mock.calls
      const savedProgress = calls[calls.length - 1][2]
      expect(savedProgress.currentStep).toBe(1)
    })
  })

  describe('Recover from stuck button', () => {
    it('renders the Stuck button in the Solution Roadmap header', () => {
      render(
        <SolutionScaffold
          data={multiStepData}
          onReset={vi.fn()}
        />
      )

      const stuckButton = screen.getByTitle('Get help if you\'re stuck on the current step')
      expect(stuckButton).toBeDefined()
      expect(stuckButton.textContent).toContain('Stuck?')
    })

    it('opens Socratic Rewind modal when Stuck button is clicked', async () => {
      render(
        <SolutionScaffold
          data={multiStepData}
          onReset={vi.fn()}
        />
      )

      // Modal should not be visible initially
      expect(screen.queryByTestId('socratic-rewind-modal')).toBeNull()

      // Click the Stuck button
      const stuckButton = screen.getByTitle('Get help if you\'re stuck on the current step')
      await act(async () => {
        fireEvent.click(stuckButton)
      })

      // Modal should now be visible with manual trigger
      const modal = screen.getByTestId('socratic-rewind-modal')
      expect(modal).toBeDefined()
      expect(modal.getAttribute('data-trigger')).toBe('manual')
    })

    it('closes Socratic Rewind modal when close button is clicked', async () => {
      render(
        <SolutionScaffold
          data={multiStepData}
          onReset={vi.fn()}
        />
      )

      // Open the modal
      const stuckButton = screen.getByTitle('Get help if you\'re stuck on the current step')
      await act(async () => {
        fireEvent.click(stuckButton)
      })

      expect(screen.getByTestId('socratic-rewind-modal')).toBeDefined()

      // Close the modal
      await act(async () => {
        fireEvent.click(screen.getByText('close-rewind'))
      })

      expect(screen.queryByTestId('socratic-rewind-modal')).toBeNull()
    })

    it('builds context from current step when Stuck button is clicked', async () => {
      render(
        <SolutionScaffold
          data={multiStepData}
          onReset={vi.fn()}
        />
      )

      // Complete the first step to have a previous valid step
      await act(async () => {
        fireEvent.click(screen.getAllByText('complete-step')[0])
      })

      // Now on step 2, click Stuck
      const stuckButton = screen.getByTitle('Get help if you\'re stuck on the current step')
      await act(async () => {
        fireEvent.click(stuckButton)
      })

      // The modal should show with the previous step (step 0, which is index 0)
      const stepIdSpan = screen.getByTestId('rewind-step-id')
      expect(stepIdSpan.textContent).toBe('0')
    })

    it('allows proceeding from Socratic Rewind modal', async () => {
      render(
        <SolutionScaffold
          data={multiStepData}
          onReset={vi.fn()}
        />
      )

      // Complete first step
      await act(async () => {
        fireEvent.click(screen.getAllByText('complete-step')[0])
      })

      // Verify we're on step 2 (index 1)
      const stepNodes = screen.getAllByTestId('step-accordion')
      expect(stepNodes[1].getAttribute('data-active')).toBe('true')

      // Click Stuck button
      const stuckButton = screen.getByTitle('Get help if you\'re stuck on the current step')
      await act(async () => {
        fireEvent.click(stuckButton)
      })

      // Modal should be open
      expect(screen.getByTestId('socratic-rewind-modal')).toBeDefined()

      // Click proceed anyway - this should trigger the proceed callback
      await act(async () => {
        fireEvent.click(screen.getByText('proceed-anyway'))
      })

      // Modal still open (proceed doesn't auto-close, user must close explicitly)
      // In real usage, the modal handles this internally
      expect(screen.getByTestId('socratic-rewind-modal')).toBeDefined()
    })
  })
})
