import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { InterviewModeToggle } from '../InterviewModeToggle'
import { InterviewTimer } from '../InterviewTimer'
import { ExplanationForm } from '../ExplanationForm'
import { RubricResults } from '../RubricResults'
import type { RubricResult, RubricScore } from '@/lib/core/entities/interview-session'
import type { Grade } from '@/lib/core/policies/rubric-engine'

// =============================================================================
// InterviewModeToggle Tests
// =============================================================================

describe('InterviewModeToggle', () => {
  const defaultOnConfigChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with interview mode title', () => {
    render(<InterviewModeToggle onConfigChange={defaultOnConfigChange} />)

    expect(screen.getByText('Interview Mode')).toBeInTheDocument()
    expect(screen.getByText('Simulate real interview conditions')).toBeInTheDocument()
  })

  it('should render toggle switch', () => {
    render(<InterviewModeToggle onConfigChange={defaultOnConfigChange} />)

    const toggle = screen.getByRole('switch')
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('should toggle enabled state when clicked', () => {
    render(<InterviewModeToggle onConfigChange={defaultOnConfigChange} />)

    const toggle = screen.getByRole('switch')
    fireEvent.click(toggle)

    expect(defaultOnConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true })
    )
  })

  it('should show settings panel when enabled', () => {
    render(<InterviewModeToggle onConfigChange={defaultOnConfigChange} />)

    // Enable interview mode
    const toggle = screen.getByRole('switch')
    fireEvent.click(toggle)

    // Should show active indicator
    expect(screen.getByText(/min/)).toBeInTheDocument()
  })

  it('should show settings when expanded', () => {
    render(
      <InterviewModeToggle
        onConfigChange={defaultOnConfigChange}
        initialConfig={{ enabled: true }}
      />
    )

    // Click settings button
    const settingsButton = screen.getByText('Settings')
    fireEvent.click(settingsButton)

    // Should show setting options
    expect(screen.getByText('Timer Enabled')).toBeInTheDocument()
    expect(screen.getByText('Time Limit')).toBeInTheDocument()
    expect(screen.getByText('Hide Hints')).toBeInTheDocument()
    expect(screen.getByText('Require Explanations')).toBeInTheDocument()
  })

  it('should update time limit when changed', () => {
    render(
      <InterviewModeToggle
        onConfigChange={defaultOnConfigChange}
        initialConfig={{ enabled: true }}
      />
    )

    // Expand settings
    fireEvent.click(screen.getByText('Settings'))

    // Change time limit
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: '45' } })

    expect(defaultOnConfigChange).toHaveBeenCalledWith(
      expect.objectContaining({ timeLimitMinutes: 45 })
    )
  })

  it('should be disabled when disabled prop is true', () => {
    render(
      <InterviewModeToggle
        onConfigChange={defaultOnConfigChange}
        disabled={true}
      />
    )

    const toggle = screen.getByRole('switch')
    expect(toggle).toBeDisabled()
  })

  it('should use initial config values', () => {
    render(
      <InterviewModeToggle
        onConfigChange={defaultOnConfigChange}
        initialConfig={{
          enabled: true,
          timeLimitMinutes: 45,
          hintsHidden: false,
        }}
      />
    )

    // Should show as enabled with custom time
    expect(screen.getByText(/45 min/)).toBeInTheDocument()
    expect(screen.getByText(/Hints available/)).toBeInTheDocument()
  })
})

// =============================================================================
// InterviewTimer Tests
// =============================================================================

describe('InterviewTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should render formatted time', () => {
    const startedAt = Date.now()
    render(
      <InterviewTimer
        startedAt={startedAt}
        timeLimitSeconds={1800}
      />
    )

    expect(screen.getByText('30:00')).toBeInTheDocument()
    expect(screen.getByText('remaining')).toBeInTheDocument()
  })

  it('should update time every second', () => {
    const startedAt = Date.now()
    render(
      <InterviewTimer
        startedAt={startedAt}
        timeLimitSeconds={1800}
      />
    )

    expect(screen.getByText('30:00')).toBeInTheDocument()

    // Advance time by 1 second
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(screen.getByText('29:59')).toBeInTheDocument()
  })

  it('should call onTick with remaining seconds', () => {
    const onTick = vi.fn()
    const startedAt = Date.now()

    render(
      <InterviewTimer
        startedAt={startedAt}
        timeLimitSeconds={1800}
        onTick={onTick}
      />
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(onTick).toHaveBeenCalledWith(expect.any(Number))
  })

  it('should call onTimeUp when timer reaches zero', () => {
    const onTimeUp = vi.fn()
    const startedAt = Date.now() - (1800 * 1000) // Started 30 mins ago

    render(
      <InterviewTimer
        startedAt={startedAt}
        timeLimitSeconds={1800}
        onTimeUp={onTimeUp}
      />
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(onTimeUp).toHaveBeenCalled()
  })

  it('should show warning state when under 5 minutes', () => {
    const startedAt = Date.now() - (25 * 60 * 1000) // 25 mins elapsed

    const { container } = render(
      <InterviewTimer
        startedAt={startedAt}
        timeLimitSeconds={1800}
      />
    )

    // Advance time to trigger the interval callback that sets warning state
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Should have yellow/warning styling
    expect(container.querySelector('.bg-yellow-100')).toBeTruthy()
  })

  it('should show critical state when under 1 minute', () => {
    const startedAt = Date.now() - (29 * 60 * 1000 + 30 * 1000) // 29:30 elapsed

    const { container } = render(
      <InterviewTimer
        startedAt={startedAt}
        timeLimitSeconds={1800}
      />
    )

    // Advance time to trigger the interval callback that sets critical state
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Should have red/critical styling
    expect(container.querySelector('.bg-red-100')).toBeTruthy()
  })

  it('should show PAUSED indicator when paused', () => {
    render(
      <InterviewTimer
        startedAt={Date.now()}
        timeLimitSeconds={1800}
        paused={true}
      />
    )

    expect(screen.getByText('PAUSED')).toBeInTheDocument()
  })

  it('should not update when paused', () => {
    const onTick = vi.fn()

    render(
      <InterviewTimer
        startedAt={Date.now()}
        timeLimitSeconds={1800}
        paused={true}
        onTick={onTick}
      />
    )

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onTick).not.toHaveBeenCalled()
  })

  it('should show progress bar', () => {
    const { container } = render(
      <InterviewTimer
        startedAt={Date.now()}
        timeLimitSeconds={1800}
      />
    )

    const progressBar = container.querySelector('[style*="width"]')
    expect(progressBar).toBeInTheDocument()
  })
})

// =============================================================================
// ExplanationForm Tests
// =============================================================================

describe('ExplanationForm', () => {
  const defaultRequirements = {
    approachRequired: true,
    invariantRequired: true,
    complexityRequired: false,
  }
  const defaultOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render form title', () => {
    render(
      <ExplanationForm
        requirements={defaultRequirements}
        onSubmit={defaultOnSubmit}
      />
    )

    expect(screen.getByText('Explain Your Solution')).toBeInTheDocument()
  })

  it('should render all fields', () => {
    render(
      <ExplanationForm
        requirements={defaultRequirements}
        onSubmit={defaultOnSubmit}
      />
    )

    expect(screen.getByLabelText(/Approach/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Physical Invariant/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Complexity Analysis/)).toBeInTheDocument()
  })

  it('should show required indicator for required fields', () => {
    render(
      <ExplanationForm
        requirements={defaultRequirements}
        onSubmit={defaultOnSubmit}
      />
    )

    // Approach and Invariant should have asterisks
    const labels = screen.getAllByText('*')
    expect(labels.length).toBeGreaterThanOrEqual(2)
  })

  it('should call onSubmit with form data', () => {
    render(
      <ExplanationForm
        requirements={defaultRequirements}
        onSubmit={defaultOnSubmit}
      />
    )

    // Fill in the form
    fireEvent.change(
      screen.getByLabelText(/Approach/),
      { target: { value: 'I used Newton\'s second law to solve this problem' } }
    )
    fireEvent.change(
      screen.getByLabelText(/Physical Invariant/),
      { target: { value: 'Conservation of momentum applies here' } }
    )
    fireEvent.change(
      screen.getByLabelText(/Complexity Analysis/),
      { target: { value: 'O(1)' } }
    )

    // Submit
    fireEvent.click(screen.getByText('Submit Explanation'))

    expect(defaultOnSubmit).toHaveBeenCalledWith({
      approach: 'I used Newton\'s second law to solve this problem',
      invariant: 'Conservation of momentum applies here',
      complexity: 'O(1)',
    })
  })

  it('should show validation error for short required fields', () => {
    render(
      <ExplanationForm
        requirements={defaultRequirements}
        onSubmit={defaultOnSubmit}
      />
    )

    // Enter short text and blur
    const approachField = screen.getByLabelText(/Approach/)
    fireEvent.change(approachField, { target: { value: 'short' } })
    fireEvent.blur(approachField)

    expect(screen.getByText(/Please provide at least 10 characters/)).toBeInTheDocument()
  })

  it('should show skip button when onSkip is provided', () => {
    const onSkip = vi.fn()
    render(
      <ExplanationForm
        requirements={defaultRequirements}
        onSubmit={defaultOnSubmit}
        onSkip={onSkip}
      />
    )

    expect(screen.getByText('Skip')).toBeInTheDocument()
  })

  it('should call onSkip when skip button is clicked', () => {
    const onSkip = vi.fn()
    render(
      <ExplanationForm
        requirements={defaultRequirements}
        onSubmit={defaultOnSubmit}
        onSkip={onSkip}
      />
    )

    fireEvent.click(screen.getByText('Skip'))

    expect(onSkip).toHaveBeenCalled()
  })

  it('should not show skip button when onSkip is not provided', () => {
    render(
      <ExplanationForm
        requirements={defaultRequirements}
        onSubmit={defaultOnSubmit}
      />
    )

    expect(screen.queryByText('Skip')).not.toBeInTheDocument()
  })

  it('should disable form when disabled prop is true', () => {
    render(
      <ExplanationForm
        requirements={defaultRequirements}
        onSubmit={defaultOnSubmit}
        disabled={true}
      />
    )

    expect(screen.getByLabelText(/Approach/)).toBeDisabled()
    expect(screen.getByLabelText(/Physical Invariant/)).toBeDisabled()
    expect(screen.getByLabelText(/Complexity Analysis/)).toBeDisabled()
    expect(screen.getByText('Submit Explanation')).toBeDisabled()
  })

  it('should display validation errors from props', () => {
    render(
      <ExplanationForm
        requirements={defaultRequirements}
        onSubmit={defaultOnSubmit}
        validationErrors={['Error 1', 'Error 2']}
      />
    )

    expect(screen.getByText('Error 1')).toBeInTheDocument()
    expect(screen.getByText('Error 2')).toBeInTheDocument()
  })

  it('should use initial data when provided', () => {
    render(
      <ExplanationForm
        requirements={defaultRequirements}
        onSubmit={defaultOnSubmit}
        initialData={{
          approach: 'Initial approach',
          invariant: 'Initial invariant',
        }}
      />
    )

    expect(screen.getByLabelText(/Approach/)).toHaveValue('Initial approach')
    expect(screen.getByLabelText(/Physical Invariant/)).toHaveValue('Initial invariant')
  })
})

// =============================================================================
// RubricResults Tests
// =============================================================================

describe('RubricResults', () => {
  const createMockRubricResult = (overrides: Partial<RubricResult> = {}): RubricResult => ({
    scores: [
      { dimension: 'correctness', score: 90, maxScore: 100, feedback: 'Excellent accuracy' },
      { dimension: 'approach_clarity', score: 80, maxScore: 100, feedback: 'Clear explanation' },
      { dimension: 'time_efficiency', score: 70, maxScore: 100, feedback: 'Good pace' },
    ] as RubricScore[],
    totalScore: 80,
    maxPossibleScore: 100,
    percentageScore: 80,
    overallFeedback: 'Great job overall!',
    strengths: ['Strong problem solving', 'Clear communication'],
    improvements: ['Work on time management'],
    ...overrides,
  })

  const createMockSummary = () => ({
    totalSteps: 5,
    stepsCompleted: 4,
    correctOnFirstTry: 3,
    totalHintsUsed: 2,
    totalTimeSeconds: 1234,
  })

  it('should render interview results header', () => {
    render(
      <RubricResults
        result={createMockRubricResult()}
        grade={"B" as Grade}
        summary={createMockSummary()}
      />
    )

    expect(screen.getByText('Interview Results')).toBeInTheDocument()
    expect(screen.getByText('Your performance breakdown')).toBeInTheDocument()
  })

  it('should display the grade', () => {
    render(
      <RubricResults
        result={createMockRubricResult()}
        grade={"A" as Grade}
        summary={createMockSummary()}
      />
    )

    expect(screen.getByText('A')).toBeInTheDocument()
  })

  it('should display percentage score', () => {
    render(
      <RubricResults
        result={createMockRubricResult({ percentageScore: 85 })}
        grade={"B" as Grade}
        summary={createMockSummary()}
      />
    )

    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('should display summary stats', () => {
    render(
      <RubricResults
        result={createMockRubricResult()}
        grade={"B" as Grade}
        summary={createMockSummary()}
      />
    )

    expect(screen.getByText('4/5')).toBeInTheDocument() // Steps completed
    expect(screen.getByText('Steps Completed')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument() // First try correct
    expect(screen.getByText('First Try Correct')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // Hints used
    expect(screen.getByText('Hints Used')).toBeInTheDocument()
    expect(screen.getByText('20:34')).toBeInTheDocument() // Time (1234 seconds)
    expect(screen.getByText('Time Taken')).toBeInTheDocument()
  })

  it('should display overall feedback', () => {
    render(
      <RubricResults
        result={createMockRubricResult({ overallFeedback: 'You did great!' })}
        grade={"A" as Grade}
        summary={createMockSummary()}
      />
    )

    expect(screen.getByText('You did great!')).toBeInTheDocument()
  })

  it('should display dimension scores', () => {
    render(
      <RubricResults
        result={createMockRubricResult()}
        grade={"B" as Grade}
        summary={createMockSummary()}
      />
    )

    expect(screen.getByText('Correctness')).toBeInTheDocument()
    expect(screen.getByText('90/100')).toBeInTheDocument()
    expect(screen.getByText('Excellent accuracy')).toBeInTheDocument()

    expect(screen.getByText('Approach Clarity')).toBeInTheDocument()
    expect(screen.getByText('80/100')).toBeInTheDocument()

    expect(screen.getByText('Time Efficiency')).toBeInTheDocument()
    expect(screen.getByText('70/100')).toBeInTheDocument()
  })

  it('should display strengths', () => {
    render(
      <RubricResults
        result={createMockRubricResult({
          strengths: ['Great analysis', 'Fast thinking'],
        })}
        grade={"A" as Grade}
        summary={createMockSummary()}
      />
    )

    expect(screen.getByText('Strengths')).toBeInTheDocument()
    expect(screen.getByText('• Great analysis')).toBeInTheDocument()
    expect(screen.getByText('• Fast thinking')).toBeInTheDocument()
  })

  it('should display improvements', () => {
    render(
      <RubricResults
        result={createMockRubricResult({
          improvements: ['Practice more', 'Review concepts'],
        })}
        grade={"B" as Grade}
        summary={createMockSummary()}
      />
    )

    expect(screen.getByText('Areas to Improve')).toBeInTheDocument()
    expect(screen.getByText('• Practice more')).toBeInTheDocument()
    expect(screen.getByText('• Review concepts')).toBeInTheDocument()
  })

  it('should show fallback text when no strengths', () => {
    render(
      <RubricResults
        result={createMockRubricResult({ strengths: [] })}
        grade={"C" as Grade}
        summary={createMockSummary()}
      />
    )

    expect(screen.getByText('Keep practicing to develop strengths!')).toBeInTheDocument()
  })

  it('should show fallback text when no improvements', () => {
    render(
      <RubricResults
        result={createMockRubricResult({ improvements: [] })}
        grade={"A" as Grade}
        summary={createMockSummary()}
      />
    )

    expect(screen.getByText('Excellent work across all areas!')).toBeInTheDocument()
  })

  it('should apply correct grade color for A grade', () => {
    const { container } = render(
      <RubricResults
        result={createMockRubricResult()}
        grade={"A" as Grade}
        summary={createMockSummary()}
      />
    )

    const gradeElement = screen.getByText('A')
    expect(gradeElement.className).toContain('text-green')
  })

  it('should apply correct grade color for B grade', () => {
    render(
      <RubricResults
        result={createMockRubricResult()}
        grade={"B" as Grade}
        summary={createMockSummary()}
      />
    )

    const gradeElement = screen.getByText('B')
    expect(gradeElement.className).toContain('text-blue')
  })

  it('should apply correct grade color for F grade', () => {
    render(
      <RubricResults
        result={createMockRubricResult()}
        grade={"F" as Grade}
        summary={createMockSummary()}
      />
    )

    const gradeElement = screen.getByText('F')
    expect(gradeElement.className).toContain('text-red')
  })

  it('should format time correctly for various durations', () => {
    // Test with 90 seconds
    render(
      <RubricResults
        result={createMockRubricResult()}
        grade={"B" as Grade}
        summary={{ ...createMockSummary(), totalTimeSeconds: 90 }}
      />
    )

    expect(screen.getByText('1:30')).toBeInTheDocument()
  })
})
