/**
 * Pivot Injection Entity
 *
 * Pure TypeScript domain entity for pivot questions.
 * No framework dependencies, no side effects.
 */

import type {
  PivotQuestion,
  PivotCategory,
  PivotSessionState,
  StepPivotState,
  PivotStatus,
  PivotAnswerSubmission,
  PIVOT_POLICY,
} from '@/types/pivot'

// Re-export policy constants
export const PIVOT_POLICY_CONSTANTS = {
  MIN_TIME_BEFORE_TRIGGER: 60,
  DEFAULT_TIME_THRESHOLD: 120,
  HARD_STEP_TIME_THRESHOLD: 180,
  WRONG_ATTEMPT_TRIGGER: 3,
  MIN_TIME_BETWEEN_PIVOTS: 120,
  MAX_PIVOTS_PER_STEP: 2,
  MAX_PIVOTS_PER_SESSION: 5,
  CORRECT_PIVOT_TIME_BONUS_SECONDS: 30,
} as const

/**
 * Create a pivot question
 */
export function createPivotQuestion(params: {
  id: string
  questionText: string
  type: 'mcq' | 'short' | 'reflection'
  choices?: string[]
  correctAnswer?: string
  explanation: string
  category: PivotCategory
  triggerPatterns: string[]
}): PivotQuestion {
  return {
    id: params.id,
    questionText: params.questionText,
    type: params.type,
    choices: params.choices ? [...params.choices] : undefined,
    correctAnswer: params.correctAnswer,
    explanation: params.explanation,
    category: params.category,
    triggerPatterns: [...params.triggerPatterns],
  }
}

/**
 * Create initial pivot session state
 */
export function createPivotSessionState(params: {
  sessionId: string
  userId: string
  stepCount: number
}): PivotSessionState {
  const stepPivotStates: StepPivotState[] = []

  for (let i = 0; i < params.stepCount; i++) {
    stepPivotStates.push({
      stepId: `step_${i}`,
      stepIndex: i,
      status: 'not_triggered',
    })
  }

  return {
    sessionId: params.sessionId,
    userId: params.userId,
    stepPivotStates,
    totalPivotsShown: 0,
    totalPivotsAnswered: 0,
  }
}

/**
 * Trigger a pivot for a step
 */
export function triggerPivot(
  state: PivotSessionState,
  stepIndex: number,
  pivotQuestion: PivotQuestion,
  timeSpentSeconds: number
): PivotSessionState {
  const stepState = state.stepPivotStates[stepIndex]
  if (!stepState) {
    return state
  }

  const updatedStepState: StepPivotState = {
    ...stepState,
    status: 'showing',
    triggeredAt: new Date().toISOString(),
    timeToTriggerSeconds: timeSpentSeconds,
    pivotQuestionId: pivotQuestion.id,
  }

  const updatedStepStates = [...state.stepPivotStates]
  updatedStepStates[stepIndex] = updatedStepState

  return {
    ...state,
    stepPivotStates: updatedStepStates,
    totalPivotsShown: state.totalPivotsShown + 1,
  }
}

/**
 * Record pivot answer
 */
export function recordPivotAnswer(
  state: PivotSessionState,
  stepIndex: number,
  answer: PivotAnswerSubmission
): PivotSessionState {
  const stepState = state.stepPivotStates[stepIndex]
  if (!stepState || stepState.status !== 'showing') {
    return state
  }

  const updatedStepState: StepPivotState = {
    ...stepState,
    status: 'answered',
    answeredAt: new Date().toISOString(),
    userAnswer: answer.userAnswer,
    wasHelpful: answer.wasHelpful,
  }

  const updatedStepStates = [...state.stepPivotStates]
  updatedStepStates[stepIndex] = updatedStepState

  return {
    ...state,
    stepPivotStates: updatedStepStates,
    totalPivotsAnswered: state.totalPivotsAnswered + 1,
  }
}

/**
 * Skip pivot for a step
 */
export function skipPivot(
  state: PivotSessionState,
  stepIndex: number
): PivotSessionState {
  const stepState = state.stepPivotStates[stepIndex]
  if (!stepState || stepState.status !== 'showing') {
    return state
  }

  const updatedStepState: StepPivotState = {
    ...stepState,
    status: 'skipped',
  }

  const updatedStepStates = [...state.stepPivotStates]
  updatedStepStates[stepIndex] = updatedStepState

  return {
    ...state,
    stepPivotStates: updatedStepStates,
  }
}

/**
 * Disable pivots for a step
 */
export function disablePivotForStep(
  state: PivotSessionState,
  stepIndex: number
): PivotSessionState {
  const stepState = state.stepPivotStates[stepIndex]
  if (!stepState) {
    return state
  }

  const updatedStepState: StepPivotState = {
    ...stepState,
    status: 'disabled',
  }

  const updatedStepStates = [...state.stepPivotStates]
  updatedStepStates[stepIndex] = updatedStepState

  return {
    ...state,
    stepPivotStates: updatedStepStates,
  }
}

/**
 * Get pivot state for a step
 */
export function getStepPivotState(
  state: PivotSessionState,
  stepIndex: number
): StepPivotState | null {
  return state.stepPivotStates[stepIndex] ?? null
}

/**
 * Check if pivot is currently showing for any step
 */
export function hasActivePivot(state: PivotSessionState): boolean {
  return state.stepPivotStates.some(s => s.status === 'showing')
}

/**
 * Get count of pivots shown for a step
 */
export function getPivotsShownForStep(
  state: PivotSessionState,
  stepIndex: number
): number {
  const stepState = state.stepPivotStates[stepIndex]
  if (!stepState) return 0

  // Count how many times a pivot was triggered for this step
  // In current model, each step can have at most one pivot state
  // For MVP, we track this as 1 if ever triggered
  return stepState.status === 'not_triggered' ? 0 : 1
}

/**
 * Get total pivots shown in session
 */
export function getTotalPivotsShown(state: PivotSessionState): number {
  return state.totalPivotsShown
}

/**
 * Calculate pivot effectiveness
 */
export function calculatePivotEffectiveness(state: PivotSessionState): {
  totalShown: number
  totalAnswered: number
  totalSkipped: number
  helpfulCount: number
  effectivenessRate: number
} {
  let totalShown = 0
  let totalAnswered = 0
  let totalSkipped = 0
  let helpfulCount = 0

  for (const stepState of state.stepPivotStates) {
    if (stepState.status === 'answered') {
      totalShown++
      totalAnswered++
      if (stepState.wasHelpful) {
        helpfulCount++
      }
    } else if (stepState.status === 'skipped') {
      totalShown++
      totalSkipped++
    } else if (stepState.status === 'showing') {
      totalShown++
    }
  }

  const effectivenessRate =
    totalAnswered > 0 ? (helpfulCount / totalAnswered) * 100 : 0

  return {
    totalShown,
    totalAnswered,
    totalSkipped,
    helpfulCount,
    effectivenessRate: Math.round(effectivenessRate),
  }
}

/**
 * Validate pivot question
 */
export function validatePivotQuestion(question: PivotQuestion): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!question.id) {
    errors.push('Pivot ID is required')
  }

  if (!question.questionText || question.questionText.length < 10) {
    errors.push('Question text must be at least 10 characters')
  }

  if (question.type === 'mcq' && (!question.choices || question.choices.length < 2)) {
    errors.push('MCQ questions must have at least 2 choices')
  }

  if (question.type === 'mcq' && !question.correctAnswer) {
    errors.push('MCQ questions must have a correct answer')
  }

  if (!question.explanation || question.explanation.length < 10) {
    errors.push('Explanation must be at least 10 characters')
  }

  if (question.triggerPatterns.length === 0) {
    errors.push('At least one trigger pattern is required')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
