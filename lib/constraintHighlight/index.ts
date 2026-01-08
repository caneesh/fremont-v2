/**
 * Constraint Highlight Module
 *
 * Exports service and types for constraint highlighting feature.
 */

export { constraintHighlightService } from './constraint-highlight-service'
export type { ConstraintHighlightService } from './constraint-highlight-service'

// Re-export types
export type {
  ConstraintHighlight,
  ConstraintCategory,
  ProblemConstraint,
  TextPosition,
  ConstraintHighlightState,
  ConstraintHighlightStatus,
  ConstraintSessionState,
  ConstraintDetectionResult,
  ConstraintHighlightDecision,
  HighlightDecisionReason,
} from '@/types/constraintHighlight'

// Re-export policy
export { DEFAULT_CONSTRAINTS } from '@/lib/core/policies/constraint-highlight-policy'
