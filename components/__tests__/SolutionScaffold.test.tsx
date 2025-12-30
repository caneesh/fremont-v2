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
  },
}))

vi.mock('@/lib/conceptMappingService', () => ({
  conceptMappingService: {
    mapConcepts: vi.fn(() => new Map()),
  },
}))

vi.mock('../StepAccordion', () => ({
  default: ({ onComplete }: { onComplete: () => void }) => (
    <div>
      <div data-testid="step-accordion" />
      <button onClick={onComplete}>complete-step</button>
    </div>
  ),
}))

vi.mock('../MicroTaskStepAccordion', () => ({
  default: () => <div data-testid="microtask-accordion" />,
}))

vi.mock('../diagram/DiagramStep', () => ({
  default: () => <div data-testid="diagram-step" />,
}))

vi.mock('../ConceptPanel', () => ({
  default: () => <div data-testid="concept-panel" />,
}))

vi.mock('../SanityCheckStep', () => ({
  default: () => <div data-testid="sanity-check" />,
}))

vi.mock('../NextChallenge', () => ({
  default: () => <div data-testid="next-challenge" />,
}))

vi.mock('../ReflectionStep', () => ({
  default: ({
    onReflectionComplete,
  }: {
    onReflectionComplete: (answers: Array<{ question: string; answer: string }>) => void
  }) => (
    <div>
      <div data-testid="reflection-step" />
      <button onClick={() => onReflectionComplete([{ question: 'q', answer: 'a' }])}>
        finish-reflection
      </button>
    </div>
  ),
}))

vi.mock('../ProblemVariations', () => ({
  default: () => <div data-testid="problem-variations" />,
}))

vi.mock('../MistakeWarning', () => ({
  default: () => <div data-testid="mistake-warning" />,
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
  default: () => <div data-testid="post-solve-activity" />,
}))

vi.mock('../Celebration', () => ({
  default: ({ show }: { show: boolean }) => (
    <div data-testid="celebration" data-show={show ? 'true' : 'false'} />
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
    </div>
  ),
}))

vi.mock('../simulation', () => ({
  WhatIfSimulation: () => <div data-testid="what-if-simulation" />,
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
  })
})
