/**
 * Socratic-First Step Interaction Types
 *
 * Transforms step interaction from hint-reveal to Socratic questioning.
 * Students are guided through discovery via Q&A before falling back to hints.
 *
 * Key features:
 * - Hybrid entry: "thinking prompt" first, then Socratic guidance
 * - Self-report + AI verify: User rates confidence, AI verifies understanding
 * - Stuck mode: Free choice with embedded Socratic questions per hint
 * - Warm tone: Never condescending or rude
 */

import type { ChatMessage } from './socraticTutor'

/**
 * Self-reported confidence levels
 */
export type SelfReportConfidence = 'guess' | 'okay' | 'solid'

/**
 * AI verification of answer quality
 */
export type AnswerQuality = 'excellent' | 'good' | 'partial' | 'misconception'

/**
 * Calibration comparison between self-report and actual performance
 */
export type CalibrationAdjustment = 'overconfident' | 'underconfident' | 'calibrated'

/**
 * Final understanding assessment for mastery tracking
 */
export type FinalUnderstanding = 'mastered' | 'partial' | 'needs_review'

/**
 * Dialogue phase in the Socratic step interaction
 */
export type SocraticDialoguePhase =
  | 'thinking_prompt'     // Initial "What's your approach?"
  | 'socratic_exchange'   // Active Q&A
  | 'confidence_check'    // User rates confidence
  | 'ai_verification'     // AI verifies answer
  | 'stuck_mode'          // User clicked "I'm stuck"
  | 'hint_socratic'       // Socratic Q after viewing hint
  | 'complete'            // Step mastered

/**
 * Result of AI verification of student answer
 */
export interface VerificationResult {
  /** Quality assessment of the answer */
  answerQuality: AnswerQuality
  /** Whether self-report matches actual performance */
  matchesSelfReport: boolean
  /** Calibration assessment for learning */
  calibrationAdjustment: CalibrationAdjustment
  /** Warm, encouraging feedback */
  feedback: string
  /** Detailed explanation of the correct approach (always provided) */
  explanation?: string
  /** Follow-up question if understanding is incomplete */
  followUpQuestion?: string
  /** Specific concept gaps identified */
  conceptGaps?: string[]
}

/**
 * Record of a single Socratic exchange
 */
export interface SocraticExchangeRecord {
  /** Unique identifier */
  id: string
  /** The question asked by the system */
  question: string
  /** Student's answer */
  studentAnswer: string
  /** Student's self-reported confidence */
  selfReport: SelfReportConfidence
  /** AI verification result */
  aiVerification: VerificationResult
  /** When this exchange occurred */
  timestamp: number
}

/**
 * Mastery result from Socratic step interaction
 */
export interface SocraticMasteryResult {
  /** Which step this result is for */
  stepId: number
  /** Number of Socratic exchanges in this step */
  socraticExchanges: number
  /** Highest hint level reached (0 = no hints, 5 = full solution) */
  hintLevelReached: number
  /** Overall calibration pattern for this step */
  calibrationPattern: CalibrationAdjustment | 'well_calibrated'
  /** List of misconceptions detected during exchanges */
  misconceptionsDetected: string[]
  /** Final understanding assessment */
  finalUnderstanding: FinalUnderstanding
  /** Time spent in seconds */
  timeSpentSeconds: number
}

/**
 * State for the SocraticStepDialogue component
 */
export interface SocraticDialogueState {
  /** Current phase in the dialogue */
  phase: SocraticDialoguePhase
  /** All exchanges in this step */
  exchanges: SocraticExchangeRecord[]
  /** Current question being asked */
  currentQuestion: string | null
  /** Current input from student */
  currentInput: string
  /** Selected confidence level */
  selectedConfidence: SelfReportConfidence | null
  /** Whether AI is processing */
  isProcessing: boolean
  /** Current hint level if in stuck mode */
  hintLevel: number
  /** Whether hint was just viewed (triggers Socratic verification) */
  hintJustViewed: boolean
  /** Error message if any */
  error: string | null
}

/**
 * Question type for Socratic dialogue
 */
export type SocraticQuestionType = 'open_ended' | 'multiple_choice' | 'fill_blank'

/**
 * Multiple choice option
 */
export interface MCQOption {
  id: string
  text: string
  isCorrect?: boolean
}

/**
 * Socratic question with type
 */
export interface SocraticQuestion {
  type: SocraticQuestionType
  question: string
  options?: MCQOption[] // For multiple_choice
  blankAnswer?: string // For fill_blank (the correct answer)
  hint?: string // Optional hint for the question
}

/**
 * Props for SocraticStepDialogue component
 */
export interface SocraticStepDialogueProps {
  /** Step index (0-based) */
  stepIndex: number
  /** Step title */
  stepTitle: string
  /** Step content/goal */
  stepContent: string
  /** Problem statement */
  problemStatement: string
  /** Key concepts for this step */
  concepts: string[]
  /** Callback when step is completed via Socratic path */
  onComplete: (result: SocraticMasteryResult) => void
  /** Callback when user explicitly switches to hints */
  onSwitchToHints: () => void
  /** Optional: existing chat history for context */
  chatHistory?: ChatMessage[]
  /** Optional: callback for Professor Explains */
  onProfessorExplains?: () => void
  /** Optional: whether Professor Explains is loading */
  isProfessorLoading?: boolean
}

/**
 * Props for SocraticExchange component
 */
export interface SocraticExchangeProps {
  /** The question being asked */
  question: string
  /** Previous exchanges for context */
  exchanges: SocraticExchangeRecord[]
  /** Whether AI is processing */
  isProcessing: boolean
  /** Callback when student submits answer with confidence */
  onSubmit: (answer: string, confidence: SelfReportConfidence) => void
  /** Optional: warm placeholder text */
  placeholder?: string
}

/**
 * Props for StuckModePanel component
 */
export interface StuckModePanelProps {
  /** Current hint level (1-5) */
  hintLevel: number
  /** Step content for hint generation */
  stepContent: string
  /** Problem statement */
  problemStatement: string
  /** Key concepts */
  concepts: string[]
  /** Callback when hint level changes */
  onHintLevelChange: (level: number) => void
  /** Callback when user wants to return to exploration */
  onReturnToExploration: () => void
  /** Callback when Socratic verification after hint is complete */
  onHintVerificationComplete: (understood: boolean) => void
  /** Whether Socratic verification is in progress */
  isVerifying: boolean
  /** Current verification question */
  verificationQuestion: string | null
}

/**
 * API request for Socratic mode
 */
export interface SocraticModeRequest {
  /** Mode of operation */
  mode: 'discovery' | 'verification' | 'hint_check'
  /** Problem text */
  problemText: string
  /** Step title */
  stepTitle: string
  /** Step content */
  stepContent: string
  /** Key concepts */
  concepts: string[]
  /** Current question (for verification mode) */
  question?: string
  /** Student's answer */
  studentAnswer?: string
  /** Self-reported confidence */
  selfReportedConfidence?: SelfReportConfidence
  /** Previous exchanges for context */
  previousExchanges?: SocraticExchangeRecord[]
  /** Hint level just viewed (for hint_check mode) */
  hintLevelJustViewed?: number
}

/**
 * API response for Socratic mode
 */
export interface SocraticModeResponse {
  /** Initial thinking prompt (for discovery mode) */
  thinkingPrompt?: string
  /** Verification result (for verification mode) */
  verification?: VerificationResult
  /** Misconception details if detected */
  misconceptionDetails?: Array<{
    conceptId: string
    description: string
    severity: 'minor' | 'moderate' | 'major'
  }>
  /** Follow-up question if needed */
  followUpQuestion?: string
  /** Whether step is complete */
  isComplete: boolean
  /** Encouragement message on completion */
  encouragement?: string
}

/**
 * Data for recording Socratic attempt to mastery service
 */
export interface SocraticAttemptData {
  /** Number of Socratic exchanges */
  exchangeCount: number
  /** Self-report accuracy (0-1, how often self-report matched reality) */
  selfReportAccuracy: number
  /** AI-verified final understanding */
  aiVerifiedUnderstanding: FinalUnderstanding
  /** Number of hints used (0 if pure Socratic path) */
  hintsUsed: number
}

/**
 * Trigger types for mistake notebook from Socratic interactions
 */
export type SocraticMistakeTrigger =
  | 'socratic_misconception'  // AI detected misconception
  | 'overconfident_answer'    // Said "solid" but AI found gaps
  | 'repeated_struggle'       // Multiple exchanges without progress

/**
 * Data for recording Socratic error to error pattern service
 */
export interface SocraticErrorData {
  /** Student's answer that showed error */
  studentAnswer: string
  /** Correct approach that should have been used */
  correctApproach: string
  /** Self-reported confidence when error was made */
  selfReportedConfidence: SelfReportConfidence
  /** Specific concept gaps identified */
  conceptGaps: string[]
}
