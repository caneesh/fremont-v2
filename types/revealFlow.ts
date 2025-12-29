/**
 * Types for the Reveal-Reconstruct-Validate Learning Flow
 *
 * This flow provides a structured approach to "reading mode" that ensures
 * comprehension, not just exposure. When a student switches to reading mode,
 * they go through 3 stages:
 * 1. REVEAL: Structured explanation
 * 2. RECONSTRUCT: Comprehension check questions
 * 3. VALIDATE: Confidence-weighted feedback
 */

/**
 * Step learning status for tracking reveal flow progress
 */
export type StepLearningStatus =
  | 'not_started'
  | 'in_progress'
  | 'revealed_not_validated' // User saw explanation but didn't pass comprehension check
  | 'conceptually_validated' // User passed comprehension check
  | 'completed' // Step fully completed (existing meaning)

/**
 * A section in the structured reveal explanation
 */
export interface RevealSection {
  title: string
  content: string
}

/**
 * The structured reveal explanation bundle
 */
export interface RevealBundle {
  /**
   * Exactly 3 sections:
   * 1. Frame/Approach choice (or setup idea)
   * 2. Key principle / correction / constraint
   * 3. Simplifying consequence / takeaway
   */
  sections: RevealSection[]

  /**
   * Optional expanded detail (collapsed by default)
   */
  moreDetail?: string
}

/**
 * A comprehension check question
 */
export interface ReconstructQuestion {
  id: string
  type: 'single_choice' | 'yes_no'
  prompt: string
  options: Array<{
    id: string
    text: string
  }>
  correctOptionId: string
  explainCorrect: string // 1 sentence max
  explainWrong: string // 1 sentence max
}

/**
 * The reconstruct (comprehension check) bundle
 */
export interface ReconstructBundle {
  /**
   * 1-2 questions that check understanding of the revealed concept
   */
  questions: ReconstructQuestion[]
}

/**
 * Validation outcome after answering reconstruct questions
 */
export type ValidationOutcome = 'solid' | 'partial' | 'mismatch'

/**
 * Result of answering a reconstruct question
 */
export interface QuestionResult {
  questionId: string
  selectedOptionId: string
  isCorrect: boolean
}

/**
 * Full validation result after completing the reconstruct phase
 */
export interface ValidationResult {
  outcome: ValidationOutcome
  questionResults: QuestionResult[]
  feedback: string
}

/**
 * The complete reveal flow data for a step level
 */
export interface RevealFlowData {
  reveal: RevealBundle
  reconstruct: ReconstructBundle
}

/**
 * Persisted state for reveal flow per step
 */
export interface RevealFlowState {
  stepId: number
  levelId: number
  status: StepLearningStatus
  revealViewedAt?: string // ISO timestamp
  reconstructAttempts: number
  lastValidationOutcome?: ValidationOutcome
  questionResults?: QuestionResult[]
}

/**
 * Event types for reveal flow telemetry
 */
export type RevealFlowEventType =
  | 'reveal_opened'
  | 'reveal_explanation_shown'
  | 'reconstruct_question_answered'
  | 'reconstruct_completed'
  | 'reveal_closed'
  | 'concept_confusion_detected'

/**
 * Event metadata for reveal flow events
 */
export interface RevealFlowEventMetadata {
  stepId: number
  levelId: number
  questionId?: string
  selectedOptionId?: string
  isCorrect?: boolean
  outcome?: ValidationOutcome
  conceptTag?: string
}

/**
 * Helper to generate a RevealBundle from existing task explanation
 * This transforms the one-liner explanation into a structured format
 */
export function generateRevealBundleFromTask(
  levelTitle: string,
  explanation: string,
  stepTitle: string
): RevealBundle {
  // Parse or structure the explanation into 3 sections
  // For now, we create a sensible default structure
  const sections: RevealSection[] = [
    {
      title: '1. Approach',
      content: `For "${stepTitle}", we use the ${levelTitle.toLowerCase()} approach.`
    },
    {
      title: '2. Key Insight',
      content: explanation
    },
    {
      title: '3. Takeaway',
      content: `Remember this ${levelTitle.toLowerCase()} when solving similar problems.`
    }
  ]

  return {
    sections,
    moreDetail: explanation // Full explanation as expandable detail
  }
}

/**
 * Helper to generate a ReconstructQuestion from existing task
 * This converts the task's MCQ/fill-blank into a comprehension check
 */
export function generateReconstructFromTask(
  taskId: string,
  taskType: 'MULTIPLE_CHOICE' | 'FILL_BLANK',
  question: string,
  options: Array<{ id: string; text: string }>,
  correctOptionId: string,
  explanation: string
): ReconstructQuestion {
  return {
    id: `reconstruct-${taskId}`,
    type: taskType === 'FILL_BLANK' ? 'single_choice' : 'single_choice',
    prompt: `Quick check: ${question}`,
    options: options.slice(0, 4), // Limit to 4 options max
    correctOptionId,
    explainCorrect: explanation.split('.')[0] + '.', // First sentence
    explainWrong: 'Review the explanation above and try again.'
  }
}

/**
 * Determine validation outcome based on question results
 */
export function determineValidationOutcome(
  results: QuestionResult[]
): ValidationOutcome {
  const correctCount = results.filter(r => r.isCorrect).length
  const totalCount = results.length

  if (correctCount === totalCount) {
    return 'solid'
  } else if (correctCount > 0) {
    return 'partial'
  } else {
    return 'mismatch'
  }
}

/**
 * Generate feedback message based on validation outcome
 */
export function generateValidationFeedback(
  outcome: ValidationOutcome,
  explainCorrect: string,
  explainWrong: string
): string {
  switch (outcome) {
    case 'solid':
      return `Great understanding! ${explainCorrect}`
    case 'partial':
      return `You're on the right track. ${explainWrong} Consider what makes this specific case work.`
    case 'mismatch':
      return `Let's clarify: ${explainWrong} Take another look at the key insight above.`
    default:
      return ''
  }
}
