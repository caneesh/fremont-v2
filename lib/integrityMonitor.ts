/**
 * Learning Integrity Monitor
 *
 * Silently tracks behavioral signals that may indicate AI-assisted answering.
 * When patterns accumulate, triggers gentle verification - never accusation.
 *
 * CORE PRINCIPLES:
 * 1. Silent detection - no "we caught you" messages
 * 2. Pattern accumulation - never act on single incidents
 * 3. Generous thresholds - benefit of the doubt
 * 4. Positive framing - "let's solidify this" not "prove yourself"
 * 5. Learning opportunity - extra checks help learning regardless
 */

import {
  type IntegrityMonitorState,
  type IntegritySignal,
  type SignalType,
  type InterventionType,
  type ComprehensionCheck,
  type GentleIntervention,
  createInitialIntegrityState,
  serializeIntegrityState,
  deserializeIntegrityState,
  SIGNAL_WEIGHTS,
  MIN_ANSWER_TIME_MS,
  SCORE_THRESHOLDS,
  SIGNAL_DECAY_HALF_LIFE_MS,
  GENTLE_INTERVENTIONS,
  COMPREHENSION_CHECK_TEMPLATES,
} from '@/types/integritySignal'
import { eventLogger } from '@/lib/storage/eventLogger'

const INTEGRITY_STATE_KEY = 'physiscaffold_integrity_monitor'
const MAX_RECENT_SIGNALS = 10

// ============================================
// Session State Management
// ============================================

/**
 * Load integrity state from sessionStorage
 */
export function loadIntegrityState(): IntegrityMonitorState | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = sessionStorage.getItem(INTEGRITY_STATE_KEY)
    if (!stored) return null
    return deserializeIntegrityState(stored)
  } catch (error) {
    console.error('[IntegrityMonitor] Failed to load state:', error)
    return null
  }
}

/**
 * Save integrity state to sessionStorage
 */
export function saveIntegrityState(state: IntegrityMonitorState): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(INTEGRITY_STATE_KEY, serializeIntegrityState(state))
  } catch (error) {
    console.error('[IntegrityMonitor] Failed to save state:', error)
  }
}

/**
 * Clear integrity state
 */
export function clearIntegrityState(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(INTEGRITY_STATE_KEY)
}

/**
 * Get or create integrity state
 */
export function getOrCreateIntegrityState(): IntegrityMonitorState {
  const existing = loadIntegrityState()
  if (existing) return existing

  const newState = createInitialIntegrityState()
  saveIntegrityState(newState)
  return newState
}

// ============================================
// Signal Detection
// ============================================

/**
 * Check if answer time is suspiciously fast
 */
export function detectFastAnswer(
  answerTimeMs: number,
  questionType: string = 'default'
): { detected: boolean; confidence: number } {
  const minTime = MIN_ANSWER_TIME_MS[questionType] || MIN_ANSWER_TIME_MS.default

  if (answerTimeMs >= minTime) {
    return { detected: false, confidence: 0 }
  }

  // Confidence scales with how much faster than minimum
  const ratio = answerTimeMs / minTime
  const confidence = Math.min(1, (1 - ratio) * 1.5)

  return { detected: true, confidence }
}

/**
 * Check for paste event
 */
export function detectPaste(
  inputEvent: { inputType?: string } | null
): { detected: boolean; confidence: number } {
  if (!inputEvent) return { detected: false, confidence: 0 }

  const isPaste = inputEvent.inputType === 'insertFromPaste'
  return { detected: isPaste, confidence: isPaste ? 0.7 : 0 }
}

/**
 * Check for tab blur before correct answer
 * @param blurDurationMs - How long the tab was unfocused
 * @param answerTimeMs - Total time to answer
 */
export function detectTabBlur(
  blurDurationMs: number,
  answerTimeMs: number
): { detected: boolean; confidence: number } {
  // Only suspicious if blur was significant portion of answer time
  const blurRatio = blurDurationMs / answerTimeMs

  if (blurRatio < 0.3) {
    return { detected: false, confidence: 0 }
  }

  // Higher confidence if blur was majority of time
  const confidence = Math.min(1, blurRatio)
  return { detected: true, confidence }
}

/**
 * Check for explanation gap (correct answer but can't explain)
 */
export function detectExplanationGap(
  answerCorrect: boolean,
  explanationWordCount: number,
  minExpectedWords: number = 5
): { detected: boolean; confidence: number } {
  if (!answerCorrect) {
    return { detected: false, confidence: 0 }
  }

  if (explanationWordCount >= minExpectedWords) {
    return { detected: false, confidence: 0 }
  }

  // Higher confidence if explanation is very sparse
  const ratio = explanationWordCount / minExpectedWords
  const confidence = Math.min(1, (1 - ratio) * 1.2)

  return { detected: true, confidence }
}

/**
 * Check for performance spike (sudden improvement)
 */
export function detectPerformanceSpike(
  recentCorrectRate: number,
  overallCorrectRate: number,
  sampleSize: number
): { detected: boolean; confidence: number } {
  // Need enough data to compare
  if (sampleSize < 5) {
    return { detected: false, confidence: 0 }
  }

  const improvement = recentCorrectRate - overallCorrectRate

  // Only flag dramatic improvements (>40% jump)
  if (improvement < 0.4) {
    return { detected: false, confidence: 0 }
  }

  const confidence = Math.min(1, (improvement - 0.4) * 2)
  return { detected: true, confidence }
}

// ============================================
// Signal Recording
// ============================================

/**
 * Record a detected signal
 */
export function recordSignal(
  state: IntegrityMonitorState,
  signal: IntegritySignal
): IntegrityMonitorState {
  const now = new Date().toISOString()

  // Add to recent signals (capped)
  state.accumulator.recentSignals.push(signal)
  if (state.accumulator.recentSignals.length > MAX_RECENT_SIGNALS) {
    state.accumulator.recentSignals = state.accumulator.recentSignals.slice(-MAX_RECENT_SIGNALS)
  }

  // Increment count
  state.accumulator.signalCounts[signal.type]++
  state.accumulator.lastSignalAt = now

  // Recalculate score with decay
  state.accumulator.score = calculateDecayedScore(state)

  // Log for analytics (silent)
  eventLogger.log('integrity_signal_detected' as Parameters<typeof eventLogger.log>[0], {
    signalType: signal.type,
    signalConfidence: signal.confidence,
    currentScore: state.accumulator.score,
    problemId: signal.problemId,
    stepId: signal.stepId,
  })

  saveIntegrityState(state)
  return state
}

/**
 * Calculate score with time decay
 */
function calculateDecayedScore(state: IntegrityMonitorState): number {
  const now = Date.now()
  let totalScore = 0

  for (const signal of state.accumulator.recentSignals) {
    const signalTime = new Date(signal.timestamp).getTime()
    const ageMs = now - signalTime

    // Apply exponential decay
    const decayFactor = Math.pow(0.5, ageMs / SIGNAL_DECAY_HALF_LIFE_MS)
    const weight = SIGNAL_WEIGHTS[signal.type]
    const contribution = weight * signal.confidence * decayFactor

    totalScore += contribution
  }

  return totalScore
}

// ============================================
// Baseline Tracking
// ============================================

/**
 * Update student's baseline metrics
 * Used to detect deviations from their normal behavior
 */
export function updateBaseline(
  state: IntegrityMonitorState,
  answerTimeMs: number,
  wordCount: number
): IntegrityMonitorState {
  const { baseline } = state
  const n = baseline.sampleCount

  // Running average
  baseline.averageAnswerTimeMs =
    (baseline.averageAnswerTimeMs * n + answerTimeMs) / (n + 1)
  baseline.typicalWordCount =
    (baseline.typicalWordCount * n + wordCount) / (n + 1)
  baseline.sampleCount = n + 1

  saveIntegrityState(state)
  return state
}

// ============================================
// Intervention Logic
// ============================================

/**
 * Check if an intervention should be triggered
 * Returns the appropriate gentle intervention (if any)
 */
export function checkForIntervention(
  state: IntegrityMonitorState
): GentleIntervention | null {
  const { score } = state.accumulator

  // Already has active intervention? Don't pile on
  if (state.activeIntervention) {
    return null
  }

  // Flag for review (silent, no user action)
  if (score >= SCORE_THRESHOLDS.FLAG_FOR_REVIEW) {
    eventLogger.log('integrity_session_flagged' as Parameters<typeof eventLogger.log>[0], {
      score,
      signalCounts: state.accumulator.signalCounts,
    })
    state.activeIntervention = 'silent_flag'
    saveIntegrityState(state)
    return GENTLE_INTERVENTIONS.silent_flag
  }

  // Increase decision gates (silent)
  if (score >= SCORE_THRESHOLDS.INCREASE_GATES && !state.gatesIncreased) {
    state.gatesIncreased = true
    state.activeIntervention = 'increased_gates'
    saveIntegrityState(state)
    return GENTLE_INTERVENTIONS.increased_gates
  }

  // Gentle comprehension check
  if (score >= SCORE_THRESHOLDS.GENTLE_CHECK) {
    // Don't trigger too frequently - max once per 3 steps
    if (state.accumulator.verificationsTriggered > 0) {
      const recentSignals = state.accumulator.recentSignals.slice(-3)
      const hasRecentVerification = recentSignals.some(
        s => s.type === 'explanation_gap' // proxy for recent check
      )
      if (hasRecentVerification) {
        return null
      }
    }

    state.activeIntervention = 'comprehension_check'
    state.accumulator.verificationsTriggered++
    saveIntegrityState(state)
    return GENTLE_INTERVENTIONS.comprehension_check
  }

  return null
}

/**
 * Generate a comprehension check question for a step
 */
export function generateComprehensionCheck(
  stepTitle: string,
  stepConcepts: string[],
  problemContext: string
): ComprehensionCheck {
  // Pick a random template
  const templates = Object.values(COMPREHENSION_CHECK_TEMPLATES)
  const template = templates[Math.floor(Math.random() * templates.length)]

  // Customize question based on context
  let question = template.question
  if (stepConcepts.length > 0) {
    question = question.replace(
      'this approach',
      `using ${stepConcepts[0]}`
    )
  }

  return {
    id: `check_${Date.now()}`,
    question,
    expectedElements: stepConcepts,
    minWords: template.minWords,
    passFeedback: template.passFeedback,
    struggleFeedback: template.struggleFeedback,
  }
}

/**
 * Validate a comprehension check response
 */
export function validateComprehensionResponse(
  response: string,
  check: ComprehensionCheck
): { passed: boolean; feedback: string } {
  const wordCount = response.trim().split(/\s+/).filter(Boolean).length

  // Check minimum word count
  if (wordCount < check.minWords) {
    return {
      passed: false,
      feedback: check.struggleFeedback,
    }
  }

  // Check for expected elements (at least one)
  const responseLower = response.toLowerCase()
  const hasExpectedContent = check.expectedElements.length === 0 ||
    check.expectedElements.some(el => responseLower.includes(el.toLowerCase()))

  if (!hasExpectedContent && check.expectedElements.length > 0) {
    return {
      passed: false,
      feedback: check.struggleFeedback,
    }
  }

  return {
    passed: true,
    feedback: check.passFeedback,
  }
}

/**
 * Record comprehension check result
 */
export function recordComprehensionResult(
  state: IntegrityMonitorState,
  passed: boolean
): IntegrityMonitorState {
  if (passed) {
    state.accumulator.verificationsPassed++
    // Reduce score on pass (reward honest engagement)
    state.accumulator.score = Math.max(0, state.accumulator.score - 0.5)
  }

  // Clear active intervention
  state.activeIntervention = null
  state.pendingCheck = null

  saveIntegrityState(state)
  return state
}

// ============================================
// Query Functions
// ============================================

/**
 * Check if gates should be increased
 */
export function shouldIncreaseGates(state: IntegrityMonitorState): boolean {
  return state.gatesIncreased
}

/**
 * Get current integrity score (for debugging)
 */
export function getIntegrityScore(state: IntegrityMonitorState): number {
  return state.accumulator.score
}

/**
 * Get integrity summary for telemetry
 */
export function getIntegritySummary(state: IntegrityMonitorState): Record<string, unknown> {
  return {
    score: state.accumulator.score,
    signalCounts: state.accumulator.signalCounts,
    verificationsTriggered: state.accumulator.verificationsTriggered,
    verificationsPassed: state.accumulator.verificationsPassed,
    gatesIncreased: state.gatesIncreased,
    baselineSamples: state.baseline.sampleCount,
  }
}

// ============================================
// Convenience: Record Common Patterns
// ============================================

/**
 * Record an answer submission with timing and paste detection
 */
export function recordAnswerSubmission(
  isCorrect: boolean,
  answerTimeMs: number,
  questionType: string,
  options: {
    wasPasted?: boolean
    blurDurationMs?: number
    explanationWordCount?: number
    stepId?: number
    problemId?: string
  } = {}
): { state: IntegrityMonitorState; intervention: GentleIntervention | null } {
  const state = getOrCreateIntegrityState()
  const now = new Date().toISOString()

  // Only track if answer was correct (suspicious patterns)
  if (!isCorrect) {
    return { state, intervention: null }
  }

  // Check fast answer
  const fastCheck = detectFastAnswer(answerTimeMs, questionType)
  if (fastCheck.detected) {
    recordSignal(state, {
      type: 'fast_correct_answer',
      timestamp: now,
      confidence: fastCheck.confidence,
      stepId: options.stepId,
      problemId: options.problemId,
      metadata: {
        expectedTimeMs: MIN_ANSWER_TIME_MS[questionType] || MIN_ANSWER_TIME_MS.default,
        actualTimeMs: answerTimeMs,
      },
    })
  }

  // Check paste
  if (options.wasPasted) {
    recordSignal(state, {
      type: 'paste_detected',
      timestamp: now,
      confidence: 0.7,
      stepId: options.stepId,
      problemId: options.problemId,
    })
  }

  // Check tab blur
  if (options.blurDurationMs && options.blurDurationMs > 0) {
    const blurCheck = detectTabBlur(options.blurDurationMs, answerTimeMs)
    if (blurCheck.detected) {
      recordSignal(state, {
        type: 'tab_blur_before_correct',
        timestamp: now,
        confidence: blurCheck.confidence,
        stepId: options.stepId,
        problemId: options.problemId,
        metadata: {
          blurDurationMs: options.blurDurationMs,
          actualTimeMs: answerTimeMs,
        },
      })
    }
  }

  // Check explanation gap
  if (options.explanationWordCount !== undefined) {
    const gapCheck = detectExplanationGap(true, options.explanationWordCount)
    if (gapCheck.detected) {
      recordSignal(state, {
        type: 'explanation_gap',
        timestamp: now,
        confidence: gapCheck.confidence,
        stepId: options.stepId,
        problemId: options.problemId,
      })
    }
  }

  // Update baseline
  updateBaseline(state, answerTimeMs, options.explanationWordCount || 0)

  // Check for intervention
  const intervention = checkForIntervention(state)

  return { state, intervention }
}
