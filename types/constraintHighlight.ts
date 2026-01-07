/**
 * Constraint Highlight Intervention Types
 *
 * After a wrong answer, highlight the specific constraint the student
 * may have missed before revealing the full solution.
 */

/**
 * A constraint that can be highlighted
 */
export interface ConstraintHighlight {
  readonly id: string
  readonly keyword: string // e.g., "frictionless", "massless rope", "constant velocity"
  readonly displayText: string // Human-readable description
  readonly hint: string // Help text when highlighted
  readonly category: ConstraintCategory
  readonly synonyms: readonly string[] // Alternative phrasings
  readonly implication: string // What this constraint means for the solution
}

/**
 * Category of constraint
 */
export type ConstraintCategory =
  | 'surface' // frictionless, rough, smooth
  | 'motion' // constant velocity, at rest, maximum height
  | 'connection' // massless rope, inextensible, rigid
  | 'force' // negligible air resistance, no external forces
  | 'energy' // elastic collision, perfectly inelastic
  | 'symmetry' // identical objects, equal masses
  | 'reference' // ground frame, moving frame
  | 'approximation' // small angle, point mass

/**
 * A constraint found in a problem statement
 */
export interface ProblemConstraint {
  readonly constraintId: string
  readonly keyword: string
  readonly position: TextPosition // Where in the problem statement
  readonly isAcknowledged: boolean // User has confirmed understanding
  readonly wasHighlighted: boolean // Was highlighted after wrong answer
}

/**
 * Position in text
 */
export interface TextPosition {
  readonly start: number
  readonly end: number
  readonly line?: number
}

/**
 * State of constraint highlighting for a step
 */
export interface ConstraintHighlightState {
  readonly stepId: string
  readonly stepIndex: number
  readonly problemConstraints: readonly ProblemConstraint[]
  readonly highlightedConstraints: readonly string[] // constraintIds
  readonly acknowledgedConstraints: readonly string[] // constraintIds
  readonly highlightTriggeredAt?: string
  readonly status: ConstraintHighlightStatus
}

export type ConstraintHighlightStatus =
  | 'none' // No constraints to highlight
  | 'pending' // Constraints identified but not yet shown
  | 'highlighting' // Currently showing highlighted constraint
  | 'acknowledged' // User acknowledged the constraint
  | 'dismissed' // User dismissed without acknowledging

/**
 * Session-level constraint tracking
 */
export interface ConstraintSessionState {
  readonly sessionId: string
  readonly stepStates: readonly ConstraintHighlightState[]
  readonly totalConstraintsHighlighted: number
  readonly totalConstraintsAcknowledged: number
  readonly constraintMissPatterns: readonly string[] // Pattern of which constraints often missed
}

/**
 * Result of constraint detection
 */
export interface ConstraintDetectionResult {
  readonly found: boolean
  readonly constraints: readonly ProblemConstraint[]
  readonly totalFound: number
}

/**
 * Highlight trigger decision
 */
export interface ConstraintHighlightDecision {
  readonly shouldHighlight: boolean
  readonly constraintId?: string
  readonly reason: HighlightDecisionReason
}

export type HighlightDecisionReason =
  | 'wrong_answer_constraint_likely'
  | 'multiple_wrong_attempts'
  | 'constraint_not_acknowledged'
  | 'no_constraints_found'
  | 'all_constraints_acknowledged'
  | 'already_highlighted'

// Policy constants
export const CONSTRAINT_HIGHLIGHT_POLICY = {
  // Trigger thresholds
  WRONG_ATTEMPTS_BEFORE_HIGHLIGHT: 1, // Highlight after first wrong answer
  MAX_CONSTRAINTS_TO_HIGHLIGHT: 2, // Don't overwhelm with too many

  // UI timing (milliseconds)
  HIGHLIGHT_DURATION_MS: 5000, // How long to show highlight
  ACKNOWLEDGE_REQUIRED: true, // Must acknowledge before continuing

  // Scoring impact
  ACKNOWLEDGE_BONUS_POINTS: 5, // Small bonus for acknowledging
  MISSED_CONSTRAINT_PENALTY: 0, // No penalty, just educational
} as const

// Event types
export type ConstraintHighlightEventType =
  | 'constraint_detected'
  | 'constraint_highlighted'
  | 'constraint_acknowledged'
  | 'constraint_dismissed'
  | 'constraint_missed'

export interface ConstraintHighlightEventMetadata {
  constraintId?: string
  keyword?: string
  category?: ConstraintCategory
  stepId?: string
  stepIndex?: number
  attemptNumber?: number
  wasAcknowledged?: boolean
}
