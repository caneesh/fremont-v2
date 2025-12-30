import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createCardIfNotExists } from '../mistakeNotebook'
import {
  onHintRequested,
  onStepFailed,
  onTaskIncorrect,
  onStepTimeout,
  onMultipleAttempts,
  createMistakeTriggers,
  extractStepContext,
  type ProblemContext,
  type StepContext,
} from '../mistakeTriggers'

vi.mock('../mistakeNotebook', () => ({
  createCardIfNotExists: vi.fn(),
}))

const problem: ProblemContext = {
  problemId: 'problem-123',
  problemTitle: 'Test problem',
  domain: 'Mechanics',
  subdomain: 'Dynamics',
}

const step: StepContext = {
  stepId: 2,
  stepTitle: 'Find net force',
  stepType: 'physics_concept',
  requiredConcepts: ['newton_laws'],
}

describe('mistakeTriggers', () => {
  const createCardIfNotExistsMock = vi.mocked(createCardIfNotExists)

  beforeEach(() => {
    createCardIfNotExistsMock.mockClear()
  })

  it('creates a card when hint level reaches 2', () => {
    onHintRequested(problem, step, 2)
    expect(createCardIfNotExistsMock).toHaveBeenCalledTimes(1)
    expect(createCardIfNotExistsMock.mock.calls[0][0]).toMatchObject({
      trigger: 'hint_requested',
      hintLevelReached: 2,
      problemId: problem.problemId,
      stepId: step.stepId,
    })
  })

  it('does not create a card for low hint levels', () => {
    onHintRequested(problem, step, 1)
    expect(createCardIfNotExistsMock).not.toHaveBeenCalled()
  })

  it('creates a card when a step fails', () => {
    onStepFailed(problem, step, 1, 0)
    expect(createCardIfNotExistsMock).toHaveBeenCalledTimes(1)
    expect(createCardIfNotExistsMock.mock.calls[0][0]).toMatchObject({
      trigger: 'step_failed',
      attemptCount: 1,
    })
  })

  it('passes hint level reached when a step fails', () => {
    onStepFailed(problem, step, 2, 3)
    expect(createCardIfNotExistsMock).toHaveBeenCalledTimes(1)
    expect(createCardIfNotExistsMock.mock.calls[0][0]).toMatchObject({
      trigger: 'step_failed',
      attemptCount: 2,
      hintLevelReached: 3,
    })
  })

  it('creates a card after multiple incorrect tasks', () => {
    onTaskIncorrect(problem, step, 1, 2)
    expect(createCardIfNotExistsMock).toHaveBeenCalledTimes(1)
    expect(createCardIfNotExistsMock.mock.calls[0][0]).toMatchObject({
      trigger: 'task_incorrect',
      attemptCount: 2,
    })
  })

  it('stores the task level as hint level reached', () => {
    onTaskIncorrect(problem, step, 4, 2)
    expect(createCardIfNotExistsMock).toHaveBeenCalledTimes(1)
    expect(createCardIfNotExistsMock.mock.calls[0][0]).toMatchObject({
      trigger: 'task_incorrect',
      hintLevelReached: 4,
    })
  })

  it('does not create a card on first incorrect task attempt', () => {
    onTaskIncorrect(problem, step, 1, 1)
    expect(createCardIfNotExistsMock).not.toHaveBeenCalled()
  })

  it('creates a card when a step times out', () => {
    onStepTimeout(problem, step, 6 * 60 * 1000)
    expect(createCardIfNotExistsMock).toHaveBeenCalledTimes(1)
    expect(createCardIfNotExistsMock.mock.calls[0][0]).toMatchObject({
      trigger: 'timeout',
    })
  })

  it('respects a custom timeout threshold', () => {
    onStepTimeout(problem, step, 1500, 1000)
    expect(createCardIfNotExistsMock).toHaveBeenCalledTimes(1)
    expect(createCardIfNotExistsMock.mock.calls[0][0]).toMatchObject({
      trigger: 'timeout',
    })
  })

  it('does not create a card for short durations', () => {
    onStepTimeout(problem, step, 60 * 1000)
    expect(createCardIfNotExistsMock).not.toHaveBeenCalled()
  })

  it('creates a card after multiple attempts', () => {
    onMultipleAttempts(problem, step, 3, 1)
    expect(createCardIfNotExistsMock).toHaveBeenCalledTimes(1)
    expect(createCardIfNotExistsMock.mock.calls[0][0]).toMatchObject({
      trigger: 'multiple_attempts',
      attemptCount: 3,
    })
  })

  it('does not create a card when attempts are below the threshold', () => {
    onMultipleAttempts(problem, step, 2, 0)
    expect(createCardIfNotExistsMock).not.toHaveBeenCalled()
  })

  it('binds problem context in createMistakeTriggers', () => {
    const triggers = createMistakeTriggers(problem)
    triggers.onStepFailed(step, 2, 1)
    expect(createCardIfNotExistsMock).toHaveBeenCalledTimes(1)
    expect(createCardIfNotExistsMock.mock.calls[0][0]).toMatchObject({
      problemId: problem.problemId,
      trigger: 'step_failed',
    })
  })

  it('binds all trigger helpers in createMistakeTriggers', () => {
    const triggers = createMistakeTriggers(problem)
    triggers.onHintRequested(step, 2)
    triggers.onTaskIncorrect(step, 1, 2)
    triggers.onStepTimeout(step, 6000, 1000)
    triggers.onMultipleAttempts(step, 3, 1)

    expect(createCardIfNotExistsMock).toHaveBeenCalledTimes(4)
  })

  it('extracts step context with defaults', () => {
    const context = extractStepContext({ id: 5, title: 'Check units' })
    expect(context.stepId).toBe(5)
    expect(context.stepTitle).toBe('Check units')
    expect(context.stepType).toBe('physics_concept')
    expect(context.requiredConcepts).toEqual([])
  })

  it('extracts step context with provided values', () => {
    const context = extractStepContext({
      id: 7,
      title: 'Draw a diagram',
      stepType: 'diagram',
      requiredConcepts: ['forces'],
    })
    expect(context.stepId).toBe(7)
    expect(context.stepTitle).toBe('Draw a diagram')
    expect(context.stepType).toBe('diagram')
    expect(context.requiredConcepts).toEqual(['forces'])
  })
})
