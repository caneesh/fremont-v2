/**
 * Boundary-Case Builder Types
 *
 * Used for teaching students to "stress test" their equations
 * by examining limiting/boundary cases where physical intuition
 * can validate mathematical results.
 */

/**
 * Types of limiting cases commonly used in physics
 */
export type LimitCaseType =
  | 'angle_limiting'       // θ → 0°, θ → 90°, etc.
  | 'mass_limiting'        // m → 0, m → ∞
  | 'velocity_limiting'    // v → 0, v → ∞
  | 'friction_limiting'    // μ → 0, μ → 1
  | 'time_limiting'        // t → 0, t → ∞
  | 'distance_limiting'    // x → 0, x → ∞
  | 'spring_limiting'      // k → 0, k → ∞
  | 'gravity_limiting'     // g → 0, g → ∞

/**
 * The direction of the limit
 */
export type LimitDirection =
  | 'approaches_zero'
  | 'approaches_infinity'
  | 'approaches_max'        // e.g., angle → 90°
  | 'approaches_min'        // e.g., angle → 0°
  | 'specific_value'

/**
 * A single boundary case for an equation
 */
export interface BoundaryCase {
  id: string
  type: LimitCaseType
  variable: string                    // The variable being limited (e.g., "θ", "m")
  variableDisplay: string             // Display name (e.g., "angle θ", "mass m")
  direction: LimitDirection
  limitValue: string                  // Human-readable limit (e.g., "0°", "∞")
  equation: string                    // The equation being analyzed
  promptQuestion: string              // Question to ask student (e.g., "What happens to Range when θ → 0?")
  expectedPhysicalOutcome: string     // What should happen physically
  expectedMathOutcome: string         // What the equation gives
  physicalReasoning: string           // Why this makes physical sense
  commonMistakes: string[]            // Typical wrong predictions
}

/**
 * Student's prediction for a boundary case
 */
export interface StudentPrediction {
  caseId: string
  physicalPrediction: string          // What they think happens physically
  confidence: 'low' | 'medium' | 'high'
  timestamp: string
}

/**
 * Validation result for a student's prediction
 */
export interface PredictionValidation {
  isCorrect: boolean
  feedbackType: 'correct' | 'partial' | 'misconception'
  feedback: string
  mathVerification?: string           // Show how math confirms the intuition
}

/**
 * Session state for the Boundary-Case Builder
 */
export interface BoundaryCaseSession {
  problemId: string
  equation: string
  availableCases: BoundaryCase[]
  selectedCase: BoundaryCase | null
  studentPredictions: Map<string, StudentPrediction>
  validationResults: Map<string, PredictionValidation>
  phase: BoundaryCasePhase
  completedCases: string[]
}

/**
 * Phases of the boundary case exploration
 */
export type BoundaryCasePhase =
  | 'select_variable'      // Student picks which variable to examine
  | 'predict_outcome'      // Student predicts physical outcome (no math)
  | 'verify_with_math'     // Show how equation confirms/contradicts prediction
  | 'reflect'              // Student reflects on the insight gained
  | 'completed'

/**
 * Detection result for available boundary cases in a problem
 */
export interface BoundaryCaseDetection {
  hasBoundaryCases: boolean
  detectedEquation?: string
  cases: BoundaryCase[]
}
