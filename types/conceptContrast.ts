/**
 * Concept Contrast Types
 *
 * Forces students to verify deep understanding by ruling out "neighboring" concepts.
 * When a student selects a principle, they must explain why they REJECTED
 * related but inapplicable alternatives (distractors).
 */

import type { PhysicsLaw, PhysicsLawCategory } from './preFlightCheck'

// ============================================
// Core Concept Contrast Types
// ============================================

/**
 * A distractor concept - a related but inapplicable law/principle
 */
export interface DistractorConcept {
  id: string
  name: string                           // Display name (e.g., "Conservation of Kinetic Energy")
  law?: PhysicsLaw                       // Optional: maps to known physics law
  category?: PhysicsLawCategory          // Category for grouping

  // Why this is a plausible alternative
  whyPlausible: string                   // Why students might think this applies

  // The key reason it doesn't apply here
  criticalFlaw: string                   // What makes this inapplicable
  problemConditionViolated: string       // Specific condition in problem that rules it out

  // Common student reasoning patterns
  commonMisconception: string            // The misconception that leads to picking this

  // Hint to guide toward rejection
  rejectionHint: string                  // A Socratic hint to help student see why it's wrong
}

/**
 * The student's selected concept/principle
 */
export interface SelectedConcept {
  id: string
  name: string                           // e.g., "Conservation of Momentum"
  law?: PhysicsLaw
  formula?: string                       // LaTeX formula if applicable
}

/**
 * Problem context for generating distractors
 */
export interface ConceptContrastProblemContext {
  problemText: string
  domain: string
  subdomain: string

  // Key conditions that affect which laws apply
  keyConditions?: string[]               // e.g., ["friction present", "inelastic collision"]

  // Systems/objects involved
  systemDescription?: string             // e.g., "Two cars colliding"
}

// ============================================
// Concept Contrast Challenge
// ============================================

/**
 * A complete Concept Contrast challenge
 */
export interface ConceptContrastChallenge {
  id: string

  // The student's choice
  selectedConcept: SelectedConcept

  // The distractors to challenge with
  distractors: DistractorConcept[]       // Usually 2 distractors

  // Problem context
  problemContext: ConceptContrastProblemContext

  // Target step (which step this challenge gates)
  targetStepId?: number

  // The initial challenge prompt
  challengePrompt: string                // "Why did you throw these out?"

  // Required: minimum distractors student must correctly explain
  requiredCorrectRejections: number      // Usually 1 or 2

  // Maximum attempts before showing guidance
  maxAttempts: number
}

// ============================================
// Student Response Types
// ============================================

/**
 * Quality rating for a rejection explanation
 */
export type RejectionQuality =
  | 'excellent'      // Identifies the exact condition violated
  | 'acceptable'     // Correct reasoning but imprecise
  | 'partial'        // Partially correct, missing key insight
  | 'incorrect'      // Fundamental misunderstanding
  | 'vague'          // Too vague to evaluate

/**
 * Student's rejection explanation for a single distractor
 */
export interface DistractorRejection {
  distractorId: string
  explanation: string                    // Student's free-text explanation
  timeSpentMs: number
}

/**
 * Validation result for a single rejection
 */
export interface RejectionValidation {
  distractorId: string
  isAccepted: boolean                    // Did the explanation pass?
  quality: RejectionQuality
  feedback: string                       // Feedback for the student

  // If rejected, what was missing
  missingInsight?: string

  // The key condition they should have identified
  targetCondition: string
}

/**
 * Student's complete response to a Concept Contrast challenge
 */
export interface ConceptContrastResponse {
  challengeId: string
  rejections: DistractorRejection[]
  attemptNumber: number
  totalTimeSpentMs: number
  timestamp: string
}

/**
 * Overall validation result
 */
export interface ConceptContrastValidation {
  challengeId: string
  passed: boolean
  score: {
    accepted: number
    required: number
    total: number
  }
  rejectionValidations: RejectionValidation[]
  overallFeedback: string

  // If failed, guidance to help
  guidancePrompt?: string

  // Should we let them proceed anyway after max attempts?
  canProceedAnyway: boolean
}

// ============================================
// Modal State Types
// ============================================

/**
 * Status of the Concept Contrast challenge
 */
export type ConceptContrastStatus =
  | 'pending'        // Not yet started
  | 'in_progress'    // Student is working on it
  | 'passed'         // Successfully explained rejections
  | 'failed'         // Could not explain, shown guidance
  | 'skipped'        // Allowed to skip after max attempts

/**
 * Which distractor is currently being challenged
 */
export interface CurrentChallenge {
  distractorIndex: number
  distractor: DistractorConcept
}

/**
 * State for the Concept Contrast modal
 */
export interface ConceptContrastModalState {
  isOpen: boolean
  challenge: ConceptContrastChallenge | null
  status: ConceptContrastStatus
  currentChallenge: CurrentChallenge | null

  // User's current input
  currentExplanation: string

  // Completed rejections
  completedRejections: DistractorRejection[]

  // Validation results
  validations: RejectionValidation[]

  // Attempt tracking
  attemptCount: number

  // Guidance state (if showing guidance)
  showingGuidance: boolean
  guidanceMessage?: string
}

// ============================================
// API Request/Response Types
// ============================================

/**
 * Request to generate a Concept Contrast challenge
 */
export interface GenerateConceptContrastRequest {
  selectedConcept: {
    id: string
    name: string
    formula?: string
  }
  problemContext: ConceptContrastProblemContext

  // Optional: preferred number of distractors (default: 2)
  numDistractors?: number

  // Optional: specific step being worked on
  targetStepId?: number
}

/**
 * Response with generated challenge
 */
export interface GenerateConceptContrastResponse {
  success: boolean
  challenge?: ConceptContrastChallenge
  error?: string
}

/**
 * Request to validate student's rejection explanation
 */
export interface ValidateRejectionRequest {
  challengeId: string
  distractorId: string
  explanation: string
  problemContext: ConceptContrastProblemContext
}

/**
 * Response from rejection validation
 */
export interface ValidateRejectionResponse {
  success: boolean
  validation?: RejectionValidation
  error?: string
}

/**
 * Request to get overall validation
 */
export interface ValidateContrastChallengeRequest {
  challengeId: string
  response: ConceptContrastResponse
}

/**
 * Response with overall validation
 */
export interface ValidateContrastChallengeResponse {
  success: boolean
  validation?: ConceptContrastValidation
  error?: string
}

// ============================================
// Type Guards
// ============================================

/**
 * Check if a rejection quality is acceptable for passing
 */
export function isAcceptableQuality(quality: RejectionQuality): boolean {
  return quality === 'excellent' || quality === 'acceptable'
}

/**
 * Check if challenge was passed
 */
export function isContrastChallengePassed(validation: ConceptContrastValidation): boolean {
  return validation.passed
}

/**
 * Check if student can proceed (either passed or allowed after max attempts)
 */
export function canProceedFromContrast(validation: ConceptContrastValidation): boolean {
  return validation.passed || validation.canProceedAnyway
}
