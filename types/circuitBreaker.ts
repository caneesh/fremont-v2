/**
 * Error-Pattern Circuit Breaker Types
 *
 * Defines the state machine and intervention logic for detecting
 * recurring errors and triggering remedial drills.
 */

import type { ErrorCategory } from './errorPatterns'
import type { MicroTask } from './microTask'

// ============================================
// Error Tags
// ============================================

/**
 * Granular error tags for tracking specific error types within a session.
 * These map to underlying math/physics gaps that cause repeated mistakes.
 */
export type ErrorTag =
  | 'vector_component'      // Incorrect vector resolution (Fx = F cos θ vs sin θ)
  | 'sign_convention'       // Inconsistent +/- direction handling
  | 'trig_identity'         // Misapplying sin/cos/tan relationships
  | 'unit_conversion'       // Forgetting to convert units
  | 'algebra_manipulation'  // Errors in algebraic simplification
  | 'conservation_scope'    // Misidentifying system boundaries for conservation laws
  | 'reference_frame'       // Mixing inertial/non-inertial frames
  | 'force_enumeration'     // Missing forces in free body diagram

/**
 * Maps ErrorTag to human-readable labels
 */
export const ERROR_TAG_LABELS: Record<ErrorTag, string> = {
  vector_component: 'Vector Components',
  sign_convention: 'Sign Convention',
  trig_identity: 'Trigonometry',
  unit_conversion: 'Unit Conversion',
  algebra_manipulation: 'Algebra',
  conservation_scope: 'Conservation Laws',
  reference_frame: 'Reference Frames',
  force_enumeration: 'Force Analysis',
}

/**
 * Maps ErrorTag to ErrorCategory for linking to broader pattern system
 */
export const ERROR_TAG_TO_CATEGORY: Record<ErrorTag, ErrorCategory> = {
  vector_component: 'VECTOR_SCALAR_CONFUSION',
  sign_convention: 'SIGN_CONVENTION',
  trig_identity: 'ALGEBRA_MANIPULATION',
  unit_conversion: 'UNIT_CONVERSION',
  algebra_manipulation: 'ALGEBRA_MANIPULATION',
  conservation_scope: 'CONSERVATION_MISAPPLICATION',
  reference_frame: 'REFERENCE_FRAME',
  force_enumeration: 'BOUNDARY_CONDITIONS',
}

// ============================================
// Session Error Tracking
// ============================================

/**
 * Individual error occurrence within a session
 */
export interface SessionError {
  id: string
  errorTag: ErrorTag
  stepId: number
  timestamp: string // ISO timestamp
  source: 'grading' | 'task_incorrect' | 'constraint_collision'
  problemId: string
  context?: string // Additional context about the error
}

/**
 * Aggregated count of errors by tag within a session
 */
export interface ErrorTagCount {
  errorTag: ErrorTag
  count: number
  stepIds: number[] // Steps where this error occurred
  firstOccurrence: string // ISO timestamp
  lastOccurrence: string // ISO timestamp
}

// ============================================
// Circuit Breaker State Machine
// ============================================

/**
 * Circuit Breaker State Machine States
 *
 * State transitions:
 * MONITORING -> WARNING (on warningCount reached)
 * WARNING -> TRIPPED (on tripCount reached)
 * TRIPPED -> DRILLING (when drill starts)
 * DRILLING -> RECOVERED (when drill completes)
 * RECOVERED -> MONITORING (automatic, error count reset)
 */
export type CircuitBreakerState =
  | 'MONITORING' // Normal operation, counting errors
  | 'WARNING' // Threshold approaching, show subtle warning
  | 'TRIPPED' // Threshold exceeded, main problem locked
  | 'DRILLING' // Student is completing remedial drill
  | 'RECOVERED' // Drill completed, resuming main problem

/**
 * Active intervention tracking
 */
export interface ActiveIntervention {
  triggeredBy: ErrorTag
  drillId: string
  startedAt: string // ISO timestamp
  attemptCount: number
}

/**
 * Completed intervention record
 */
export interface CompletedIntervention {
  errorTag: ErrorTag
  drillId: string
  startedAt: string
  completedAt: string // ISO timestamp
  success: boolean
  attemptsUsed: number
}

/**
 * Full session state for the Circuit Breaker
 */
export interface CircuitBreakerSessionState {
  sessionId: string
  problemId: string
  state: CircuitBreakerState

  // Error tracking
  errors: SessionError[]
  errorCounts: ErrorTagCount[]

  // Intervention tracking
  currentIntervention?: ActiveIntervention
  interventionHistory: CompletedIntervention[]

  // Cooldown tracking (prevents re-triggering same tag too quickly)
  cooldowns: {
    errorTag: ErrorTag
    expiresAt: string // ISO timestamp
  }[]

  // Timestamps
  startedAt: string
  lastUpdatedAt: string
}

// ============================================
// Threshold Configuration
// ============================================

/**
 * Threshold configuration for a specific error tag
 */
export interface InterventionThreshold {
  errorTag: ErrorTag
  warningCount: number // Show warning at this count
  tripCount: number // Lock problem at this count
  cooldownMinutes: number // Minimum time before re-triggering for same tag
}

/**
 * Default thresholds - can be overridden per student or problem type
 */
export const DEFAULT_THRESHOLDS: InterventionThreshold[] = [
  // High-impact errors: trip faster (conceptual gaps)
  { errorTag: 'vector_component', warningCount: 2, tripCount: 3, cooldownMinutes: 30 },
  { errorTag: 'sign_convention', warningCount: 2, tripCount: 3, cooldownMinutes: 30 },
  { errorTag: 'conservation_scope', warningCount: 1, tripCount: 2, cooldownMinutes: 45 },
  { errorTag: 'reference_frame', warningCount: 1, tripCount: 2, cooldownMinutes: 45 },
  { errorTag: 'force_enumeration', warningCount: 2, tripCount: 3, cooldownMinutes: 30 },

  // Medium-impact errors: more lenient (procedural slips)
  { errorTag: 'trig_identity', warningCount: 3, tripCount: 4, cooldownMinutes: 20 },
  { errorTag: 'algebra_manipulation', warningCount: 3, tripCount: 4, cooldownMinutes: 20 },
  { errorTag: 'unit_conversion', warningCount: 3, tripCount: 4, cooldownMinutes: 15 },
]

// ============================================
// Threshold Evaluation Result
// ============================================

/**
 * Result of evaluating error counts against thresholds
 */
export interface ThresholdEvaluation {
  shouldIntervene: boolean
  state: CircuitBreakerState
  triggeringTag?: ErrorTag
  message?: string // User-facing message
  suggestedDrillId?: string
}

// ============================================
// Drill Task Schema
// ============================================

/**
 * Remedial Drill - 10-second targeted practice
 * Links to specific error tag for intervention
 */
export interface DrillTask {
  id: string
  linkedErrorTag: ErrorTag
  linkedCategory: ErrorCategory

  // Timing expectations
  expectedDurationSeconds: number // Target: 10 seconds
  maxAttempts: number // Max wrong attempts before showing answer

  // The actual task (reuses existing MicroTask types)
  task: MicroTask

  // Metadata
  difficulty: 'foundation' | 'reinforcement'
  prerequisiteKnowledge: string[]

  // Post-drill feedback
  successMessage: string // Shown on correct answer
  conceptReinforcement: string // Brief concept reminder
}

/**
 * Drill bank organized by error tag
 */
export interface DrillBank {
  errorTag: ErrorTag
  drills: DrillTask[]
}

// ============================================
// Type Guards
// ============================================

/**
 * Check if a string is a valid ErrorTag
 */
export function isErrorTag(tag: string): tag is ErrorTag {
  return tag in ERROR_TAG_LABELS
}

/**
 * Check if session state indicates problem is locked
 */
export function isProblemLocked(state: CircuitBreakerState): boolean {
  return state === 'TRIPPED' || state === 'DRILLING'
}

/**
 * Check if session has an active intervention
 */
export function hasActiveIntervention(
  session: CircuitBreakerSessionState
): session is CircuitBreakerSessionState & { currentIntervention: ActiveIntervention } {
  return session.currentIntervention !== undefined
}
