/**
 * Pre-Flight Check Types
 * "Why This Law?" validation before formula usage
 *
 * Prevents students from using formulas blindly by requiring
 * them to verify pre-conditions are met before applying physics laws.
 */

// ============================================
// Physics Law Taxonomy
// ============================================

/**
 * Major physics law categories that require pre-condition validation
 */
export type PhysicsLawCategory =
  | 'kinematics'
  | 'newtons_laws'
  | 'energy_conservation'
  | 'momentum_conservation'
  | 'rotational_dynamics'
  | 'fluid_statics'
  | 'thermodynamics'
  | 'electrostatics'

/**
 * Specific physics laws/formulas with their identifiers
 */
export type PhysicsLaw =
  // Kinematics
  | 'kinematic_equations'          // v = v₀ + at, etc.
  | 'projectile_motion'            // 2D kinematics with gravity
  | 'relative_motion'              // Relative velocity equations
  // Newton's Laws
  | 'newtons_first_law'            // Equilibrium conditions
  | 'newtons_second_law'           // F = ma
  | 'newtons_third_law'            // Action-reaction pairs
  // Conservation Laws
  | 'conservation_mechanical_energy'  // KE + PE = constant
  | 'conservation_momentum'           // p_initial = p_final
  | 'conservation_angular_momentum'   // L_initial = L_final
  | 'work_energy_theorem'             // W_net = ΔKE
  // Rotational
  | 'rotational_kinematics'        // ω = ω₀ + αt, etc.
  | 'torque_equilibrium'           // Στ = 0
  | 'moment_of_inertia'            // I = Σmr²
  // Other domains
  | 'bernoullis_equation'          // Fluid dynamics
  | 'ideal_gas_law'                // PV = nRT
  | 'coulombs_law'                 // Electrostatic force

// ============================================
// Pre-Condition Types
// ============================================

/**
 * Severity of a pre-condition requirement
 * - critical: Law CANNOT be applied if violated
 * - important: Law may give wrong results if violated
 * - advisory: Should be aware, but may still work approximately
 */
export type PreConditionSeverity = 'critical' | 'important' | 'advisory'

/**
 * A single pre-condition that must be verified
 */
export interface PreCondition {
  id: string
  description: string                    // Human-readable condition
  formalStatement: string                // Mathematical/precise statement
  severity: PreConditionSeverity
  checkQuestion: string                  // Question to ask student
  hints: string[]                        // Progressive hints if struggling
  problemTextIndicators: string[]        // Keywords that indicate condition in problem
  physicsRationale: string              // WHY this condition is required
}

/**
 * Maps a physics law to its required pre-conditions
 */
export interface LawPreConditionMap {
  law: PhysicsLaw
  category: PhysicsLawCategory
  displayName: string                    // e.g., "Kinematic Equations"
  formula: string                        // LaTeX representation
  preConditions: PreCondition[]
  commonViolations: string[]             // Typical problem scenarios where law fails
}

// ============================================
// Trap (Misconception) Types
// ============================================

/**
 * Type of misconception trap
 */
export type TrapType =
  | 'condition_violation'    // Thinks law applies when it doesn't
  | 'scope_confusion'        // Applies law to wrong scope (system vs object)
  | 'approximation_error'    // Forgets approximation limits
  | 'implicit_assumption'    // Misses hidden assumption in formula
  | 'sign_convention'        // Wrong sign or direction convention

/**
 * A "trap" option representing a common misconception
 * Presented alongside correct options in the Pre-Flight Check modal
 */
export interface TrapOption {
  id: string
  label: string                          // What student sees as option
  isCorrect: boolean                     // true = valid condition, false = trap
  trapType?: TrapType                    // Only if isCorrect = false
  misconceptionExplanation?: string      // Why this is wrong (shown after selection)
  studentReasoningPattern: string        // Why students might pick this
  prevalence: 'common' | 'uncommon'      // How often students fall for this
}

/**
 * A check item within the Pre-Flight modal
 * Student must correctly identify which conditions are met
 */
export interface PreFlightCheckItem {
  preCondition: PreCondition
  options: TrapOption[]                  // Mix of correct and trap options
  correctOptionIds: string[]             // IDs of correct options
  multiSelect: boolean                   // Can multiple options be correct?
}

// ============================================
// Pre-Flight Check Definition
// ============================================

/**
 * Status of a Pre-Flight Check
 */
export type PreFlightStatus = 'locked' | 'available' | 'in_progress' | 'passed' | 'failed'

/**
 * Complete Pre-Flight Check for a formula/law in a problem
 */
export interface PreFlightCheck {
  id: string
  targetStepId: number                   // Which scaffold step this gates
  law: PhysicsLaw
  displayName: string
  formula: string                        // LaTeX formula being checked

  // The actual checks
  checkItems: PreFlightCheckItem[]

  // Problem-specific context
  problemContext: {
    relevantText: string                 // Excerpt from problem indicating conditions
    highlightRanges?: Array<{            // Highlight key phrases in problem
      start: number
      end: number
    }>
  }

  // Configuration
  requiredToPass: number                 // Min correct checks to proceed (e.g., 2/3)
  maxAttempts: number                    // Attempts before showing guidance
  allowSkipAfterAttempts?: number        // Optional: allow skip after N failed attempts
}

// ============================================
// Student Response & Validation
// ============================================

/**
 * Student's response to a single check item
 */
export interface CheckItemResponse {
  checkItemId: string
  selectedOptionIds: string[]
  reasoning?: string                     // Optional: student's reasoning
  timeSpentMs: number
}

/**
 * Student's complete response to a Pre-Flight Check
 */
export interface PreFlightResponse {
  preFlightCheckId: string
  attemptNumber: number
  responses: CheckItemResponse[]
  totalTimeSpentMs: number
  timestamp: string
}

/**
 * Result of validating a single check item
 */
export interface CheckItemValidation {
  checkItemId: string
  isCorrect: boolean
  selectedTrapIds: string[]              // Which traps student fell for
  missedCorrectIds: string[]             // Correct options student didn't select
  feedback: string
  misconceptionDetected?: TrapType
}

/**
 * Overall result of Pre-Flight Check validation
 */
export interface PreFlightValidation {
  preFlightCheckId: string
  passed: boolean
  score: {
    correct: number
    total: number
    percentage: number
  }
  itemValidations: CheckItemValidation[]
  overallFeedback: string

  // Guidance if failed
  guidanceScript?: GuidanceScript
  suggestedAlternativeLaw?: PhysicsLaw   // If this law doesn't apply, which might?
}

// ============================================
// Feedback & Guidance Types
// ============================================

/**
 * Strategy for guiding student after failed check
 */
export type GuidanceStrategy =
  | 'REREAD_PROBLEM'         // Direct back to problem text
  | 'CONTRAST_LAWS'          // Compare applicable vs non-applicable laws
  | 'CONDITION_WALKTHROUGH'  // Step through each condition
  | 'COUNTEREXAMPLE'         // Show why law fails in this case
  | 'PHYSICAL_INTUITION'     // Appeal to physical intuition

/**
 * A single step in the guidance dialogue
 */
export interface GuidanceStep {
  type: 'question' | 'explanation' | 'highlight' | 'reveal'
  content: string

  // For 'highlight' type - point to problem text
  highlightRange?: { start: number; end: number }

  // For 'question' type - expected insight
  expectedInsight?: string

  // For 'reveal' type - what concept to reveal
  conceptToReveal?: string
}

/**
 * Complete guidance script for failed Pre-Flight Check
 * Leads student to correct understanding without giving answer
 */
export interface GuidanceScript {
  strategy: GuidanceStrategy
  steps: GuidanceStep[]

  // The key insight student should reach
  targetInsight: string

  // Condition that was violated
  violatedCondition: PreCondition

  // Why this matters
  physicsRationale: string

  // Correct law to use instead (if applicable)
  alternativeLaw?: {
    law: PhysicsLaw
    displayName: string
    whyItApplies: string
  }
}

// ============================================
// Modal State & UI Types
// ============================================

/**
 * State of the Pre-Flight Check modal
 */
export interface PreFlightModalState {
  isOpen: boolean
  currentCheck: PreFlightCheck | null
  currentItemIndex: number
  status: PreFlightStatus
  attemptCount: number
  responses: CheckItemResponse[]
  validation: PreFlightValidation | null
  showingGuidance: boolean
  guidanceStep: number
}

/**
 * Props for the PreFlightCheckModal component
 */
export interface PreFlightCheckModalProps {
  check: PreFlightCheck
  problemText: string
  onComplete: (passed: boolean, validation: PreFlightValidation) => void
  onSkip?: () => void                    // Only if allowSkipAfterAttempts is set
  onClose: () => void
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Request to generate Pre-Flight Checks for a scaffold
 */
export interface GeneratePreFlightRequest {
  problemStatement: string
  scaffoldSteps: Array<{
    id: number
    title: string
    formula?: string
  }>
  domain: string
}

/**
 * Response with generated Pre-Flight Checks
 */
export interface GeneratePreFlightResponse {
  success: boolean
  preFlightChecks: PreFlightCheck[]
  error?: string
}

/**
 * Request to validate student's Pre-Flight response
 */
export interface ValidatePreFlightRequest {
  preFlightCheckId: string
  response: PreFlightResponse
  problemStatement: string
}

/**
 * Response from Pre-Flight validation
 */
export interface ValidatePreFlightResponse {
  success: boolean
  validation: PreFlightValidation
  error?: string
}

// ============================================
// Type Guards
// ============================================

/**
 * Check if a physics law requires Pre-Flight validation
 */
export function requiresPreFlightCheck(law: PhysicsLaw): boolean {
  const lawsRequiringCheck: PhysicsLaw[] = [
    'kinematic_equations',
    'conservation_mechanical_energy',
    'conservation_momentum',
    'newtons_second_law',
    'work_energy_theorem',
  ]
  return lawsRequiringCheck.includes(law)
}

/**
 * Check if a trap option is actually a trap (not correct)
 */
export function isTrap(option: TrapOption): boolean {
  return !option.isCorrect
}

/**
 * Check if Pre-Flight Check was passed
 */
export function isPreFlightPassed(validation: PreFlightValidation): boolean {
  return validation.passed
}
