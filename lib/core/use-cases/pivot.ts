/**
 * Pivot Injection Use Cases
 *
 * Business logic for pivot question injection.
 * Pure functions with dependency injection for testability.
 */

import type {
  PivotQuestion,
  PivotTrigger,
  PivotDecision,
  PivotSessionState,
  PivotAnswerSubmission,
} from '@/types/pivot'
import {
  createPivotSessionState,
  triggerPivot,
  recordPivotAnswer,
  skipPivot,
  getStepPivotState,
  hasActivePivot,
} from '../entities/pivot'
import {
  shouldTriggerPivot,
  selectPivotQuestion,
  calculatePivotTimeBonus,
} from '../policies/pivot-policy'

// ============================================================================
// TYPES
// ============================================================================

export interface PivotRepository {
  getSessionState(sessionId: string): Promise<PivotSessionState | null>
  saveSessionState(state: PivotSessionState): Promise<PivotSessionState>
  getLastPivotTime(sessionId: string): Promise<string | null>
}

export interface PivotAnalytics {
  trackPivotTriggered(
    sessionId: string,
    stepIndex: number,
    pivotId: string,
    reason: string
  ): void
  trackPivotAnswered(
    sessionId: string,
    stepIndex: number,
    pivotId: string,
    wasHelpful: boolean
  ): void
  trackPivotSkipped(sessionId: string, stepIndex: number, pivotId: string): void
}

// ============================================================================
// INITIALIZE PIVOT SESSION
// ============================================================================

export interface InitializePivotSessionInput {
  sessionId: string
  userId: string
  stepCount: number
}

/**
 * Initialize pivot tracking for a session
 */
export async function initializePivotSession(
  input: InitializePivotSessionInput,
  deps: {
    repository: PivotRepository
  }
): Promise<PivotSessionState> {
  const { sessionId, userId, stepCount } = input
  const { repository } = deps

  // Check for existing state
  const existing = await repository.getSessionState(sessionId)
  if (existing) {
    return existing
  }

  // Create new state
  const state = createPivotSessionState({
    sessionId,
    userId,
    stepCount,
  })

  return repository.saveSessionState(state)
}

// ============================================================================
// CHECK PIVOT TRIGGER
// ============================================================================

export interface CheckPivotTriggerInput {
  sessionId: string
  trigger: PivotTrigger
  stepDifficulty?: 'easy' | 'medium' | 'hard'
}

export interface CheckPivotTriggerOutput {
  decision: PivotDecision
  sessionState: PivotSessionState | null
}

/**
 * Check if pivot should be triggered for current step
 */
export async function checkPivotTrigger(
  input: CheckPivotTriggerInput,
  deps: {
    repository: PivotRepository
  }
): Promise<CheckPivotTriggerOutput> {
  const { sessionId, trigger, stepDifficulty = 'medium' } = input
  const { repository } = deps

  // Get session state
  const sessionState = await repository.getSessionState(sessionId)
  if (!sessionState) {
    return {
      decision: { shouldTrigger: false, reason: 'disabled' },
      sessionState: null,
    }
  }

  // Check if already has active pivot
  if (hasActivePivot(sessionState)) {
    return {
      decision: { shouldTrigger: false, reason: 'recently_triggered' },
      sessionState,
    }
  }

  // Get last pivot time for cooldown
  const lastPivotTime = await repository.getLastPivotTime(sessionId)

  // Make deterministic decision
  const decision = shouldTriggerPivot(
    trigger,
    sessionState,
    stepDifficulty,
    lastPivotTime ?? undefined
  )

  return {
    decision,
    sessionState,
  }
}

// ============================================================================
// SHOW PIVOT
// ============================================================================

export interface ShowPivotInput {
  sessionId: string
  stepIndex: number
  timeSpentSeconds: number
  patternId?: string
}

export interface ShowPivotOutput {
  pivot: PivotQuestion
  sessionState: PivotSessionState
}

/**
 * Show pivot question for a step
 */
export async function showPivot(
  input: ShowPivotInput,
  deps: {
    repository: PivotRepository
    analytics: PivotAnalytics
  }
): Promise<ShowPivotOutput> {
  const { sessionId, stepIndex, timeSpentSeconds, patternId } = input
  const { repository, analytics } = deps

  // Get session state
  let sessionState = await repository.getSessionState(sessionId)
  if (!sessionState) {
    throw new Error(`Pivot session not found: ${sessionId}`)
  }

  // Select pivot question
  const pivot = selectPivotQuestion(patternId)

  // Update state
  sessionState = triggerPivot(sessionState, stepIndex, pivot, timeSpentSeconds)
  sessionState = await repository.saveSessionState(sessionState)

  // Track analytics
  analytics.trackPivotTriggered(
    sessionId,
    stepIndex,
    pivot.id,
    'time_threshold_exceeded'
  )

  return {
    pivot,
    sessionState,
  }
}

// ============================================================================
// ANSWER PIVOT
// ============================================================================

export interface AnswerPivotInput {
  sessionId: string
  stepIndex: number
  answer: PivotAnswerSubmission
}

export interface AnswerPivotOutput {
  sessionState: PivotSessionState
  timeBonus: number
  explanation: string
}

/**
 * Submit answer for a pivot question
 */
export async function answerPivot(
  input: AnswerPivotInput,
  deps: {
    repository: PivotRepository
    analytics: PivotAnalytics
    getPivotById: (id: string) => PivotQuestion | null
  }
): Promise<AnswerPivotOutput> {
  const { sessionId, stepIndex, answer } = input
  const { repository, analytics, getPivotById } = deps

  // Get session state
  let sessionState = await repository.getSessionState(sessionId)
  if (!sessionState) {
    throw new Error(`Pivot session not found: ${sessionId}`)
  }

  // Get step state
  const stepState = getStepPivotState(sessionState, stepIndex)
  if (!stepState || stepState.status !== 'showing') {
    throw new Error(`No active pivot for step ${stepIndex}`)
  }

  // Get pivot question
  const pivot = getPivotById(answer.pivotQuestionId)
  if (!pivot) {
    throw new Error(`Pivot question not found: ${answer.pivotQuestionId}`)
  }

  // Record answer
  sessionState = recordPivotAnswer(sessionState, stepIndex, answer)
  sessionState = await repository.saveSessionState(sessionState)

  // Calculate time bonus
  const timeBonus = calculatePivotTimeBonus(
    pivot,
    answer.userAnswer,
    answer.wasHelpful ?? false
  )

  // Track analytics
  analytics.trackPivotAnswered(
    sessionId,
    stepIndex,
    pivot.id,
    answer.wasHelpful ?? false
  )

  return {
    sessionState,
    timeBonus,
    explanation: pivot.explanation,
  }
}

// ============================================================================
// SKIP PIVOT
// ============================================================================

export interface SkipPivotInput {
  sessionId: string
  stepIndex: number
}

export interface SkipPivotOutput {
  sessionState: PivotSessionState
}

/**
 * Skip the current pivot question
 */
export async function skipPivotQuestion(
  input: SkipPivotInput,
  deps: {
    repository: PivotRepository
    analytics: PivotAnalytics
  }
): Promise<SkipPivotOutput> {
  const { sessionId, stepIndex } = input
  const { repository, analytics } = deps

  // Get session state
  let sessionState = await repository.getSessionState(sessionId)
  if (!sessionState) {
    throw new Error(`Pivot session not found: ${sessionId}`)
  }

  // Get step state for analytics
  const stepState = getStepPivotState(sessionState, stepIndex)
  const pivotId = stepState?.pivotQuestionId ?? 'unknown'

  // Skip pivot
  sessionState = skipPivot(sessionState, stepIndex)
  sessionState = await repository.saveSessionState(sessionState)

  // Track analytics
  analytics.trackPivotSkipped(sessionId, stepIndex, pivotId)

  return {
    sessionState,
  }
}

// ============================================================================
// GET PIVOT STATE
// ============================================================================

export interface GetPivotStateInput {
  sessionId: string
  stepIndex?: number
}

export interface GetPivotStateOutput {
  sessionState: PivotSessionState | null
  stepState: {
    status: string
    pivotQuestionId?: string
    wasHelpful?: boolean
  } | null
  hasActivePivot: boolean
}

/**
 * Get current pivot state for a session
 */
export async function getPivotState(
  input: GetPivotStateInput,
  deps: {
    repository: PivotRepository
  }
): Promise<GetPivotStateOutput> {
  const { sessionId, stepIndex } = input
  const { repository } = deps

  const sessionState = await repository.getSessionState(sessionId)

  if (!sessionState) {
    return {
      sessionState: null,
      stepState: null,
      hasActivePivot: false,
    }
  }

  let stepState = null
  if (stepIndex !== undefined) {
    const state = getStepPivotState(sessionState, stepIndex)
    if (state) {
      stepState = {
        status: state.status,
        pivotQuestionId: state.pivotQuestionId,
        wasHelpful: state.wasHelpful,
      }
    }
  }

  return {
    sessionState,
    stepState,
    hasActivePivot: hasActivePivot(sessionState),
  }
}
