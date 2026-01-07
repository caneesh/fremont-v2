/**
 * Constraint Highlight Entity
 *
 * Pure TypeScript domain entity for constraint highlighting.
 * No framework dependencies, no side effects.
 */

import type {
  ConstraintHighlight,
  ConstraintCategory,
  ProblemConstraint,
  TextPosition,
  ConstraintHighlightState,
  ConstraintHighlightStatus,
  ConstraintSessionState,
  CONSTRAINT_HIGHLIGHT_POLICY,
} from '@/types/constraintHighlight'

// Re-export policy constants
export const CONSTRAINT_POLICY_CONSTANTS = {
  WRONG_ATTEMPTS_BEFORE_HIGHLIGHT: 1,
  MAX_CONSTRAINTS_TO_HIGHLIGHT: 2,
  HIGHLIGHT_DURATION_MS: 5000,
  ACKNOWLEDGE_REQUIRED: true,
  ACKNOWLEDGE_BONUS_POINTS: 5,
  MISSED_CONSTRAINT_PENALTY: 0,
} as const

/**
 * Create a constraint highlight definition
 */
export function createConstraintHighlight(params: {
  id: string
  keyword: string
  displayText: string
  hint: string
  category: ConstraintCategory
  synonyms?: string[]
  implication: string
}): ConstraintHighlight {
  return {
    id: params.id,
    keyword: params.keyword,
    displayText: params.displayText,
    hint: params.hint,
    category: params.category,
    synonyms: params.synonyms ? [...params.synonyms] : [],
    implication: params.implication,
  }
}

/**
 * Create a problem constraint instance
 */
export function createProblemConstraint(params: {
  constraintId: string
  keyword: string
  position: TextPosition
}): ProblemConstraint {
  return {
    constraintId: params.constraintId,
    keyword: params.keyword,
    position: params.position,
    isAcknowledged: false,
    wasHighlighted: false,
  }
}

/**
 * Create initial constraint highlight state for a step
 */
export function createConstraintHighlightState(
  stepId: string,
  stepIndex: number,
  constraints: ProblemConstraint[] = []
): ConstraintHighlightState {
  return {
    stepId,
    stepIndex,
    problemConstraints: [...constraints],
    highlightedConstraints: [],
    acknowledgedConstraints: [],
    status: constraints.length > 0 ? 'pending' : 'none',
  }
}

/**
 * Create session-level constraint tracking state
 */
export function createConstraintSessionState(
  sessionId: string,
  stepCount: number
): ConstraintSessionState {
  const stepStates: ConstraintHighlightState[] = []

  for (let i = 0; i < stepCount; i++) {
    stepStates.push(createConstraintHighlightState(`step_${i}`, i))
  }

  return {
    sessionId,
    stepStates,
    totalConstraintsHighlighted: 0,
    totalConstraintsAcknowledged: 0,
    constraintMissPatterns: [],
  }
}

/**
 * Add detected constraints to a step
 */
export function addConstraintsToStep(
  state: ConstraintSessionState,
  stepIndex: number,
  constraints: ProblemConstraint[]
): ConstraintSessionState {
  const stepState = state.stepStates[stepIndex]
  if (!stepState) {
    return state
  }

  const updatedStepState: ConstraintHighlightState = {
    ...stepState,
    problemConstraints: [...constraints],
    status: constraints.length > 0 ? 'pending' : 'none',
  }

  const updatedStepStates = [...state.stepStates]
  updatedStepStates[stepIndex] = updatedStepState

  return {
    ...state,
    stepStates: updatedStepStates,
  }
}

/**
 * Highlight a constraint for a step
 */
export function highlightConstraint(
  state: ConstraintSessionState,
  stepIndex: number,
  constraintId: string
): ConstraintSessionState {
  const stepState = state.stepStates[stepIndex]
  if (!stepState) {
    return state
  }

  // Check if constraint exists
  const constraint = stepState.problemConstraints.find(
    c => c.constraintId === constraintId
  )
  if (!constraint) {
    return state
  }

  // Update constraint as highlighted
  const updatedConstraints = stepState.problemConstraints.map(c =>
    c.constraintId === constraintId ? { ...c, wasHighlighted: true } : c
  )

  const updatedStepState: ConstraintHighlightState = {
    ...stepState,
    problemConstraints: updatedConstraints,
    highlightedConstraints: [...stepState.highlightedConstraints, constraintId],
    highlightTriggeredAt: new Date().toISOString(),
    status: 'highlighting',
  }

  const updatedStepStates = [...state.stepStates]
  updatedStepStates[stepIndex] = updatedStepState

  return {
    ...state,
    stepStates: updatedStepStates,
    totalConstraintsHighlighted: state.totalConstraintsHighlighted + 1,
  }
}

/**
 * Acknowledge a highlighted constraint
 */
export function acknowledgeConstraint(
  state: ConstraintSessionState,
  stepIndex: number,
  constraintId: string
): ConstraintSessionState {
  const stepState = state.stepStates[stepIndex]
  if (!stepState) {
    return state
  }

  // Update constraint as acknowledged
  const updatedConstraints = stepState.problemConstraints.map(c =>
    c.constraintId === constraintId ? { ...c, isAcknowledged: true } : c
  )

  const updatedStepState: ConstraintHighlightState = {
    ...stepState,
    problemConstraints: updatedConstraints,
    acknowledgedConstraints: [...stepState.acknowledgedConstraints, constraintId],
    status: 'acknowledged',
  }

  const updatedStepStates = [...state.stepStates]
  updatedStepStates[stepIndex] = updatedStepState

  return {
    ...state,
    stepStates: updatedStepStates,
    totalConstraintsAcknowledged: state.totalConstraintsAcknowledged + 1,
  }
}

/**
 * Dismiss a highlighted constraint without acknowledging
 */
export function dismissConstraint(
  state: ConstraintSessionState,
  stepIndex: number
): ConstraintSessionState {
  const stepState = state.stepStates[stepIndex]
  if (!stepState) {
    return state
  }

  const updatedStepState: ConstraintHighlightState = {
    ...stepState,
    status: 'dismissed',
  }

  const updatedStepStates = [...state.stepStates]
  updatedStepStates[stepIndex] = updatedStepState

  return {
    ...state,
    stepStates: updatedStepStates,
  }
}

/**
 * Get step constraint state
 */
export function getStepConstraintState(
  state: ConstraintSessionState,
  stepIndex: number
): ConstraintHighlightState | null {
  return state.stepStates[stepIndex] ?? null
}

/**
 * Get unacknowledged constraints for a step
 */
export function getUnacknowledgedConstraints(
  state: ConstraintSessionState,
  stepIndex: number
): readonly ProblemConstraint[] {
  const stepState = state.stepStates[stepIndex]
  if (!stepState) {
    return []
  }

  return stepState.problemConstraints.filter(c => !c.isAcknowledged)
}

/**
 * Get next constraint to highlight for a step
 */
export function getNextConstraintToHighlight(
  state: ConstraintSessionState,
  stepIndex: number
): ProblemConstraint | null {
  const stepState = state.stepStates[stepIndex]
  if (!stepState) {
    return null
  }

  // Find first unacknowledged, unhighlighted constraint
  return (
    stepState.problemConstraints.find(
      c => !c.isAcknowledged && !c.wasHighlighted
    ) ?? null
  )
}

/**
 * Check if all constraints are acknowledged for a step
 */
export function allConstraintsAcknowledged(
  state: ConstraintSessionState,
  stepIndex: number
): boolean {
  const stepState = state.stepStates[stepIndex]
  if (!stepState || stepState.problemConstraints.length === 0) {
    return true
  }

  return stepState.problemConstraints.every(c => c.isAcknowledged)
}

/**
 * Record a constraint miss pattern
 */
export function recordConstraintMissPattern(
  state: ConstraintSessionState,
  constraintKeyword: string
): ConstraintSessionState {
  return {
    ...state,
    constraintMissPatterns: [...state.constraintMissPatterns, constraintKeyword],
  }
}

/**
 * Get constraint effectiveness statistics
 */
export function getConstraintEffectiveness(state: ConstraintSessionState): {
  totalHighlighted: number
  totalAcknowledged: number
  acknowledgementRate: number
  mostMissedConstraints: string[]
} {
  const acknowledgementRate =
    state.totalConstraintsHighlighted > 0
      ? (state.totalConstraintsAcknowledged / state.totalConstraintsHighlighted) * 100
      : 0

  // Count constraint miss frequency
  const missCount: Record<string, number> = {}
  for (const keyword of state.constraintMissPatterns) {
    missCount[keyword] = (missCount[keyword] || 0) + 1
  }

  const mostMissedConstraints = Object.entries(missCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([keyword]) => keyword)

  return {
    totalHighlighted: state.totalConstraintsHighlighted,
    totalAcknowledged: state.totalConstraintsAcknowledged,
    acknowledgementRate: Math.round(acknowledgementRate),
    mostMissedConstraints,
  }
}
