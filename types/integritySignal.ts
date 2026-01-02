/**
 * Learning Integrity Signal Types
 *
 * Detects potential AI-assisted answering through behavioral signals.
 *
 * PHILOSOPHY:
 * - Silent detection, never accusation
 * - Accumulate patterns, not single incidents
 * - Gentle verification framed as learning opportunities
 * - High threshold before any intervention
 * - Always give benefit of the doubt
 *
 * INTERVENTIONS are framed positively:
 * - "Let's make sure this sticks!" (not "prove you know this")
 * - "Quick check to solidify understanding" (not "we don't trust you")
 * - "Teaching moment" (not "suspicious behavior detected")
 */

// ============================================
// Signal Types
// ============================================

/**
 * Types of behavioral signals we track
 */
export type SignalType =
  | 'fast_correct_answer'      // Answer submitted faster than expected for complexity
  | 'tab_blur_before_correct'  // Window lost focus, then correct answer
  | 'paste_detected'           // Content was pasted rather than typed
  | 'style_mismatch'           // Answer style doesn't match student's baseline
  | 'explanation_gap'          // Correct answer but poor/no explanation
  | 'performance_spike'        // Sudden jump from struggling to perfect
  | 'pattern_mismatch'         // Got answer right but failed pattern recognition

/**
 * Individual signal instance
 */
export interface IntegritySignal {
  type: SignalType
  timestamp: string
  stepId?: number
  problemId?: string
  /** Confidence in this signal (0-1) */
  confidence: number
  /** Additional context */
  metadata?: {
    expectedTimeMs?: number
    actualTimeMs?: number
    blurDurationMs?: number
    pasteLength?: number
    [key: string]: unknown
  }
}

/**
 * Accumulated signal scores per session
 */
export interface SignalAccumulator {
  /** Weighted sum of signals (decays over time) */
  score: number
  /** Count of each signal type */
  signalCounts: Record<SignalType, number>
  /** Recent signals (last 10) */
  recentSignals: IntegritySignal[]
  /** Session start time */
  sessionStartedAt: string
  /** Last signal time */
  lastSignalAt: string | null
  /** Number of verification checks triggered */
  verificationsTriggered: number
  /** Number of verifications passed */
  verificationsPassed: number
}

// ============================================
// Thresholds (Generous - Benefit of Doubt)
// ============================================

/**
 * Signal weights - how much each signal contributes to score
 * Lower = less suspicious, Higher = more suspicious
 */
export const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  fast_correct_answer: 0.15,      // Could just be fast thinker
  tab_blur_before_correct: 0.25,  // Could be checking notes
  paste_detected: 0.20,           // Could be pasting their own work
  style_mismatch: 0.10,           // Writing style varies naturally
  explanation_gap: 0.30,          // More concerning - can't explain
  performance_spike: 0.20,        // Could be "aha moment"
  pattern_mismatch: 0.25,         // Got answer but doesn't understand pattern
}

/**
 * Minimum time (ms) before an answer is considered "suspiciously fast"
 * Based on question complexity
 */
export const MIN_ANSWER_TIME_MS: Record<string, number> = {
  simple_mcq: 3000,       // 3 seconds minimum
  complex_mcq: 8000,      // 8 seconds for multi-step
  fill_in_blank: 5000,    // 5 seconds
  explanation: 15000,     // 15 seconds for free-form
  default: 5000,
}

/**
 * Score thresholds for interventions
 * HIGH thresholds = fewer false positives
 */
export const SCORE_THRESHOLDS = {
  /** Score to trigger a gentle comprehension check */
  GENTLE_CHECK: 1.5,
  /** Score to increase decision gate requirements */
  INCREASE_GATES: 2.5,
  /** Score to flag session for review (no user-facing action) */
  FLAG_FOR_REVIEW: 3.5,
}

/**
 * Decay rate - signals lose weight over time
 * After 30 minutes, signals contribute 50% less
 */
export const SIGNAL_DECAY_HALF_LIFE_MS = 30 * 60 * 1000 // 30 minutes

// ============================================
// Intervention Types (Gentle, Positive Framing)
// ============================================

/**
 * Types of gentle interventions
 */
export type InterventionType =
  | 'comprehension_check'  // Quick follow-up question
  | 'explain_to_friend'    // Feynman-style explanation
  | 'increased_gates'      // Require more decision gate answers
  | 'silent_flag'          // Log for review, no user action

/**
 * Gentle intervention configuration
 */
export interface GentleIntervention {
  type: InterventionType
  /** Positive framing - never accusatory */
  title: string
  /** Encouraging message */
  message: string
  /** Whether this blocks progress */
  blocking: boolean
}

/**
 * Predefined gentle interventions
 */
export const GENTLE_INTERVENTIONS: Record<InterventionType, GentleIntervention> = {
  comprehension_check: {
    type: 'comprehension_check',
    title: "Let's solidify this! ✨",
    message: "You're making great progress. Quick check to make sure this concept sticks:",
    blocking: false,
  },
  explain_to_friend: {
    type: 'explain_to_friend',
    title: 'Teaching moment 💡',
    message: "You've got this! Try explaining it in your own words - teaching is the best way to learn:",
    blocking: false,
  },
  increased_gates: {
    type: 'increased_gates',
    title: '', // Silent - no user-facing message
    message: '',
    blocking: false,
  },
  silent_flag: {
    type: 'silent_flag',
    title: '',
    message: '',
    blocking: false,
  },
}

// ============================================
// Comprehension Check Questions
// ============================================

/**
 * Quick comprehension check question
 */
export interface ComprehensionCheck {
  id: string
  /** The question to ask */
  question: string
  /** Expected elements in a good answer (for validation) */
  expectedElements: string[]
  /** Minimum word count for a thoughtful answer */
  minWords: number
  /** Encouraging feedback on pass */
  passFeedback: string
  /** Supportive feedback on struggle (no shame) */
  struggleFeedback: string
}

/**
 * Generic comprehension check templates
 */
export const COMPREHENSION_CHECK_TEMPLATES = {
  explain_why: {
    question: "In your own words, why does this approach work here?",
    minWords: 10,
    passFeedback: "Great explanation! You clearly understand this.",
    struggleFeedback: "No worries - let's review this concept together.",
  },
  predict_change: {
    question: "What would happen if we changed one of the given values?",
    minWords: 8,
    passFeedback: "Excellent reasoning! You've got a solid grasp.",
    struggleFeedback: "That's a tricky one. Let's think through it step by step.",
  },
  identify_key_step: {
    question: "What was the most important decision in solving this?",
    minWords: 5,
    passFeedback: "Spot on! That's exactly the key insight.",
    struggleFeedback: "Good thinking. There are a few ways to look at this.",
  },
}

// ============================================
// Session State
// ============================================

/**
 * Full integrity monitoring state for a session
 */
export interface IntegrityMonitorState {
  /** Signal accumulator */
  accumulator: SignalAccumulator
  /** Current intervention level (if any) */
  activeIntervention: InterventionType | null
  /** Pending comprehension check (if any) */
  pendingCheck: ComprehensionCheck | null
  /** Whether gates have been increased */
  gatesIncreased: boolean
  /** Student's baseline metrics (for comparison) */
  baseline: {
    averageAnswerTimeMs: number
    typicalWordCount: number
    sampleCount: number
  }
}

/**
 * Create initial integrity monitor state
 */
export function createInitialIntegrityState(): IntegrityMonitorState {
  return {
    accumulator: {
      score: 0,
      signalCounts: {
        fast_correct_answer: 0,
        tab_blur_before_correct: 0,
        paste_detected: 0,
        style_mismatch: 0,
        explanation_gap: 0,
        performance_spike: 0,
        pattern_mismatch: 0,
      },
      recentSignals: [],
      sessionStartedAt: new Date().toISOString(),
      lastSignalAt: null,
      verificationsTriggered: 0,
      verificationsPassed: 0,
    },
    activeIntervention: null,
    pendingCheck: null,
    gatesIncreased: false,
    baseline: {
      averageAnswerTimeMs: 0,
      typicalWordCount: 0,
      sampleCount: 0,
    },
  }
}

// ============================================
// Serialization (for sessionStorage)
// ============================================

export function serializeIntegrityState(state: IntegrityMonitorState): string {
  return JSON.stringify(state)
}

export function deserializeIntegrityState(json: string): IntegrityMonitorState {
  try {
    return JSON.parse(json) as IntegrityMonitorState
  } catch {
    return createInitialIntegrityState()
  }
}
