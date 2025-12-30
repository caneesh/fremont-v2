export interface DialogueLine {
  speaker: 'Alex' | 'Prof'
  text: string
}

export interface FeynmanScript {
  title: string
  dialogue: DialogueLine[]
  concept: string
  analogy?: string
}

export interface FeynmanRequest {
  concept: string
  context: string
  stepTitle?: string
  problemStatement?: string
}

export interface AudioSegment {
  speaker: 'Alex' | 'Prof'
  text: string
  audioUrl?: string
  duration?: number
}

// ============================================
// Feynman Micro-Prompt Validator Types
// ============================================

/**
 * Classification categories for student explanations
 */
export type ExplanationCategory =
  | 'VALID_MECHANISM'       // Explains WHY with cause-effect chain
  | 'PARTIAL_UNDERSTANDING' // Right direction, missing depth
  | 'VAGUE_INTUITION'       // Hand-wavy, no specific mechanism
  | 'MEMORIZED_PHRASE'      // Textbook regurgitation without understanding
  | 'CIRCULAR_LOGIC'        // "It conserves because it's conserved"
  | 'INCORRECT_MECHANISM'   // Confidently wrong reasoning

/**
 * Clarity score (1-5 scale)
 */
export type ClarityScore = 1 | 2 | 3 | 4 | 5

/**
 * Keyword analysis results from pre-check
 */
export interface KeywordAnalysis {
  hasRequiredKeywords: boolean
  hasForbiddenKeywords: boolean
  hasMechanismWords: boolean
  matchedRequired: string[]
  matchedForbidden: string[]
  matchedMechanism: string[]
}

/**
 * Result from the Feynman semantic validator
 */
export interface FeynmanValidationResult {
  category: ExplanationCategory
  clarityScore: ClarityScore
  feedback: string
  followUpQuestion?: string  // Only if score < 4
  detectedPatterns: KeywordAnalysis
  reasoning?: string  // Internal analysis for logging
}

/**
 * Topic-specific keyword configuration
 */
export interface TopicKeywords {
  topic: string
  description: string
  requiredConcepts: string[]      // Must mention at least one
  mechanismWords: string[]        // Indicate causal reasoning
  forbiddenPatterns: string[]     // Red flags for shallow understanding
  exampleGoodExplanation: string
  exampleBadExplanations: string[]
}

/**
 * Feynman prompt configuration for a step
 */
export interface FeynmanPromptConfig {
  question: string           // "Before calculating, explain WHY..."
  topic: string              // Maps to keyword rules
  context?: string           // Additional context about the problem
  requiredBefore?: boolean   // Must pass before proceeding? (default: true)
  minScore?: ClarityScore    // Minimum score to pass (default: 4)
  maxAttempts?: number       // Max attempts before allowing skip (default: 3)
}

/**
 * Request payload for the validation API
 */
export interface FeynmanValidateRequest {
  explanation: string
  topic: string
  context?: string
  problemStatement?: string
}

/**
 * Response from the validation API
 */
export interface FeynmanValidateResponse {
  success: boolean
  result?: FeynmanValidationResult
  error?: string
}
