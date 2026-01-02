/**
 * Cognitive Load Governor Service
 *
 * Provides adaptive cognitive load management by:
 * 1. Computing load scores from session metrics (pure function)
 * 2. Managing state persistence in sessionStorage
 * 3. Providing UI configuration based on load level
 *
 * Key principle: Same inputs always produce same outputs (deterministic)
 */

import {
  type CognitiveLoadScore,
  type CognitiveLoadState,
  type SessionLoadMetrics,
  type StepLoadMetrics,
  type CognitiveLoadThresholds,
  type HighLoadUIConfig,
  type CognitiveLoadEvent,
  createInitialCognitiveLoadState,
  createInitialSessionLoadMetrics,
  createInitialStepLoadMetrics,
  serializeCognitiveLoadState,
  deserializeCognitiveLoadState,
  DEFAULT_COGNITIVE_LOAD_THRESHOLDS,
  HIGH_LOAD_UI_CONFIG,
  MEDIUM_LOAD_UI_CONFIG,
} from '@/types/cognitiveLoad'
import type { CircuitBreakerState } from '@/types/circuitBreaker'

const SESSION_COGNITIVE_LOAD_KEY = 'v2_cognitive_load'
const SESSION_LOAD_METRICS_KEY = 'v2_load_metrics'

// ============================================
// Pure Computation Function
// ============================================

/**
 * Compute cognitive load score from session metrics
 *
 * This is a PURE FUNCTION - same inputs always produce same outputs.
 * All state is passed in, nothing is read from storage.
 *
 * @param metrics - Current session load metrics
 * @param currentState - Current cognitive load state (for transition logic)
 * @param thresholds - Configurable thresholds (optional, uses defaults)
 * @returns New cognitive load score
 */
export function computeCognitiveLoadScore(
  metrics: SessionLoadMetrics,
  currentState: CognitiveLoadState,
  thresholds: CognitiveLoadThresholds = DEFAULT_COGNITIVE_LOAD_THRESHOLDS
): CognitiveLoadScore {
  // Not enough data to assess - stay at current score
  if (metrics.stepMetrics.length < thresholds.minStepsForAssessment) {
    return currentState.score
  }

  // Calculate aggregate metrics
  const completedSteps = metrics.stepMetrics.filter(s => s.isCompleted)
  const activeSteps = metrics.stepMetrics.filter(s => s.timeSpentSeconds > 0)

  if (activeSteps.length === 0) {
    return currentState.score
  }

  // Average time per step
  const avgTimePerStep = metrics.totalTimeSpentSeconds / activeSteps.length

  // Average wrong attempts per step
  const avgWrongAttempts = metrics.totalWrongAttempts / activeSteps.length

  // Hint escalation rate (hints per minute)
  const sessionDurationMinutes = metrics.totalTimeSpentSeconds / 60
  const hintEscalationRate = sessionDurationMinutes > 0
    ? metrics.totalHintsUnlocked / sessionDurationMinutes
    : 0

  // Calculate struggle indicators
  const isHighTime = avgTimePerStep > thresholds.highTimePerStepSeconds
  const isHighWrongAttempts = avgWrongAttempts > thresholds.highWrongAttemptsPerStep
  const isFastHintEscalation = hintEscalationRate > thresholds.fastHintEscalationRate
  const hasMultipleStuckSteps = metrics.stuckStepCount >= thresholds.stuckStepCountForHighLoad
  const hasUsedReveal = metrics.revealCount > 0
  const isCircuitBreakerActive = metrics.circuitBreakerState === 'TRIPPED' ||
    metrics.circuitBreakerState === 'WARNING' ||
    metrics.circuitBreakerState === 'DRILLING'

  // Count struggle signals
  let struggleSignals = 0
  if (isHighTime) struggleSignals++
  if (isHighWrongAttempts) struggleSignals++
  if (isFastHintEscalation) struggleSignals++
  if (hasMultipleStuckSteps) struggleSignals++
  if (hasUsedReveal) struggleSignals++
  if (isCircuitBreakerActive) struggleSignals += 2 // Circuit breaker is a strong signal

  // Determine score based on struggle signals
  // HIGH: 3+ signals or circuit breaker active
  // MEDIUM: 2 signals
  // LOW: 0-1 signals
  if (struggleSignals >= 3 || isCircuitBreakerActive) {
    return 'high'
  } else if (struggleSignals >= 2) {
    return 'medium'
  }

  // Check for recovery from high load
  if (currentState.score === 'high') {
    // Need clean steps to recover
    if (currentState.stepsSinceLowLoad >= thresholds.recoveryStepCount) {
      return 'medium' // Gradual recovery
    }
    return 'high' // Stay at high until recovery threshold met
  }

  // Check for recovery from medium load
  if (currentState.score === 'medium') {
    if (struggleSignals === 0 && currentState.stepsSinceLowLoad >= 1) {
      return 'low'
    }
    return 'medium'
  }

  return 'low'
}

// ============================================
// State Management
// ============================================

/**
 * Load cognitive load state from sessionStorage
 */
export function loadCognitiveLoadState(): CognitiveLoadState | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = sessionStorage.getItem(SESSION_COGNITIVE_LOAD_KEY)
    if (!stored) return null
    return deserializeCognitiveLoadState(stored)
  } catch (error) {
    console.error('[CognitiveLoad] Failed to load state:', error)
    return null
  }
}

/**
 * Save cognitive load state to sessionStorage
 */
export function saveCognitiveLoadState(state: CognitiveLoadState): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(SESSION_COGNITIVE_LOAD_KEY, serializeCognitiveLoadState(state))
  } catch (error) {
    console.error('[CognitiveLoad] Failed to save state:', error)
  }
}

/**
 * Get or create cognitive load state
 */
export function getOrCreateCognitiveLoadState(): CognitiveLoadState {
  const existing = loadCognitiveLoadState()
  if (existing) return existing

  const newState = createInitialCognitiveLoadState()
  saveCognitiveLoadState(newState)
  return newState
}

/**
 * Clear cognitive load state
 */
export function clearCognitiveLoadState(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_COGNITIVE_LOAD_KEY)
  sessionStorage.removeItem(SESSION_LOAD_METRICS_KEY)
}

// ============================================
// Metrics Management
// ============================================

/**
 * Load session load metrics from sessionStorage
 */
export function loadSessionLoadMetrics(): SessionLoadMetrics | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = sessionStorage.getItem(SESSION_LOAD_METRICS_KEY)
    if (!stored) return null
    return JSON.parse(stored) as SessionLoadMetrics
  } catch (error) {
    console.error('[CognitiveLoad] Failed to load metrics:', error)
    return null
  }
}

/**
 * Save session load metrics to sessionStorage
 */
export function saveSessionLoadMetrics(metrics: SessionLoadMetrics): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(SESSION_LOAD_METRICS_KEY, JSON.stringify(metrics))
  } catch (error) {
    console.error('[CognitiveLoad] Failed to save metrics:', error)
  }
}

/**
 * Get or create session load metrics
 */
export function getOrCreateSessionLoadMetrics(): SessionLoadMetrics {
  const existing = loadSessionLoadMetrics()
  if (existing) return existing

  const newMetrics = createInitialSessionLoadMetrics()
  saveSessionLoadMetrics(newMetrics)
  return newMetrics
}

// ============================================
// Metrics Update Functions
// ============================================

/**
 * Record step activation time
 */
export function recordStepActivation(
  metrics: SessionLoadMetrics,
  stepId: number
): SessionLoadMetrics {
  let stepMetrics = metrics.stepMetrics.find(s => s.stepId === stepId)
  if (!stepMetrics) {
    stepMetrics = createInitialStepLoadMetrics(stepId)
    metrics.stepMetrics.push(stepMetrics)
  }
  return { ...metrics }
}

/**
 * Update time spent on a step
 */
export function recordStepTimeSpent(
  metrics: SessionLoadMetrics,
  stepId: number,
  timeSpentSeconds: number
): SessionLoadMetrics {
  const stepMetrics = metrics.stepMetrics.find(s => s.stepId === stepId)
  if (stepMetrics) {
    stepMetrics.timeSpentSeconds = timeSpentSeconds

    // Check if step is "stuck" (>2 minutes)
    const wasStuck = stepMetrics.timeSpentSeconds > 120
    const nowStuck = timeSpentSeconds > 120
    if (!wasStuck && nowStuck) {
      metrics.stuckStepCount++
    }
  }

  // Update total time
  metrics.totalTimeSpentSeconds = metrics.stepMetrics.reduce(
    (sum, s) => sum + s.timeSpentSeconds,
    0
  )

  return { ...metrics }
}

/**
 * Record a wrong attempt on a step
 */
export function recordWrongAttempt(
  metrics: SessionLoadMetrics,
  stepId: number
): SessionLoadMetrics {
  let stepMetrics = metrics.stepMetrics.find(s => s.stepId === stepId)
  if (!stepMetrics) {
    stepMetrics = createInitialStepLoadMetrics(stepId)
    metrics.stepMetrics.push(stepMetrics)
  }

  stepMetrics.wrongAttempts++
  metrics.totalWrongAttempts++

  return { ...metrics }
}

/**
 * Record hint unlock
 */
export function recordHintUnlock(
  metrics: SessionLoadMetrics,
  stepId: number,
  hintLevel: number
): SessionLoadMetrics {
  let stepMetrics = metrics.stepMetrics.find(s => s.stepId === stepId)
  if (!stepMetrics) {
    stepMetrics = createInitialStepLoadMetrics(stepId)
    metrics.stepMetrics.push(stepMetrics)
  }

  stepMetrics.currentHintLevel = hintLevel
  stepMetrics.hintUnlockTimestamps.push(Date.now())
  metrics.totalHintsUnlocked++

  // Track reveal usage
  if (hintLevel === 5) {
    stepMetrics.revealUsed = true
    metrics.revealCount++
  }

  return { ...metrics }
}

/**
 * Record step completion
 */
export function recordStepCompletion(
  metrics: SessionLoadMetrics,
  stepId: number
): SessionLoadMetrics {
  const stepMetrics = metrics.stepMetrics.find(s => s.stepId === stepId)
  if (stepMetrics) {
    stepMetrics.isCompleted = true
  }

  return { ...metrics }
}

/**
 * Update circuit breaker state
 */
export function updateCircuitBreakerState(
  metrics: SessionLoadMetrics,
  state: CircuitBreakerState
): SessionLoadMetrics {
  return {
    ...metrics,
    circuitBreakerState: state,
  }
}

// ============================================
// State Transition Logic
// ============================================

/**
 * Update cognitive load state after step submission
 *
 * This function:
 * 1. Computes new score from metrics
 * 2. Handles transitions between states
 * 3. Tracks recovery progress
 */
export function updateCognitiveLoadAfterStep(
  currentState: CognitiveLoadState,
  metrics: SessionLoadMetrics,
  thresholds: CognitiveLoadThresholds = DEFAULT_COGNITIVE_LOAD_THRESHOLDS
): { state: CognitiveLoadState; event: CognitiveLoadEvent | null } {
  const previousScore = currentState.score
  const newScore = computeCognitiveLoadScore(metrics, currentState, thresholds)

  // No change
  if (newScore === previousScore) {
    // Track recovery progress if in high/medium load
    if (previousScore === 'high' || previousScore === 'medium') {
      currentState.stepsSinceLowLoad++
    }
    saveCognitiveLoadState(currentState)
    return { state: currentState, event: null }
  }

  // Score changed - create new state
  const newState: CognitiveLoadState = {
    score: newScore,
    previousScore,
    lastUpdatedAt: new Date().toISOString(),
    consecutiveHighLoadSteps: newScore === 'high' ? currentState.consecutiveHighLoadSteps + 1 : 0,
    stepsSinceLowLoad: newScore === 'low' ? 0 : currentState.stepsSinceLowLoad + 1,
    simplifiedModeActive: newScore === 'high',
    scoreHistory: [
      ...currentState.scoreHistory.slice(-9), // Keep last 10
      { score: newScore, timestamp: new Date().toISOString() },
    ],
  }

  saveCognitiveLoadState(newState)

  // Create event for telemetry
  const event: CognitiveLoadEvent = {
    type: newScore > previousScore ? 'cognitive_load_increased' :
          newScore < previousScore ? 'cognitive_load_decreased' :
          'cognitive_load_assessed',
    timestamp: new Date().toISOString(),
    previousScore,
    newScore,
    triggerMetrics: {
      avgTimePerStep: metrics.totalTimeSpentSeconds / Math.max(1, metrics.stepMetrics.length),
      avgWrongAttempts: metrics.totalWrongAttempts / Math.max(1, metrics.stepMetrics.length),
      hintEscalationRate: metrics.totalHintsUnlocked / Math.max(1, metrics.totalTimeSpentSeconds / 60),
      stuckStepCount: metrics.stuckStepCount,
    },
  }

  return { state: newState, event }
}

// ============================================
// UI Configuration
// ============================================

/**
 * Get UI configuration based on cognitive load score
 */
export function getUIConfigForLoadScore(score: CognitiveLoadScore): HighLoadUIConfig {
  switch (score) {
    case 'high':
      return HIGH_LOAD_UI_CONFIG
    case 'medium':
      return MEDIUM_LOAD_UI_CONFIG
    default:
      return {
        singleActiveStep: false,
        collapseFutureSteps: false,
        reduceMCQToBinary: false,
        shortenHintText: false,
        disableOptionalHints: false,
        hideErrorWatchOuts: false,
        simplifyProgressIndicators: false,
      }
  }
}

/**
 * Shorten hint text to first sentence for high load mode
 */
export function shortenHintForHighLoad(hintContent: string): string {
  // Find first sentence (ends with period, question mark, or exclamation)
  const sentenceMatch = hintContent.match(/^[^.!?]+[.!?]/)
  if (sentenceMatch) {
    return sentenceMatch[0]
  }
  // If no sentence found, return first 100 characters with ellipsis
  return hintContent.length > 100 ? hintContent.slice(0, 100) + '...' : hintContent
}

/**
 * Reduce MCQ options to binary for high load mode
 * Returns the 2 most relevant options (correct + most plausible distractor)
 */
export function reduceMCQToBinary<T extends { isCorrect?: boolean }>(
  options: T[]
): T[] {
  if (options.length <= 2) return options

  // Find the correct option
  const correctOption = options.find(o => o.isCorrect)
  if (!correctOption) return options.slice(0, 2)

  // Find the best distractor (first incorrect option)
  const distractor = options.find(o => !o.isCorrect)
  if (!distractor) return [correctOption]

  // Randomize order to avoid position bias
  return Math.random() > 0.5
    ? [correctOption, distractor]
    : [distractor, correctOption]
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if simplified mode should be active
 */
export function isSimplifiedModeActive(state: CognitiveLoadState | null): boolean {
  return state?.simplifiedModeActive ?? false
}

/**
 * Get human-readable label for load score
 */
export function getLoadScoreLabel(score: CognitiveLoadScore): string {
  switch (score) {
    case 'high':
      return 'High Cognitive Load'
    case 'medium':
      return 'Moderate Cognitive Load'
    case 'low':
      return 'Low Cognitive Load'
  }
}

/**
 * Compare load scores for ordering
 */
function scoreOrder(score: CognitiveLoadScore): number {
  switch (score) {
    case 'low': return 0
    case 'medium': return 1
    case 'high': return 2
  }
}

// Re-export types for convenience
export type { CognitiveLoadScore, CognitiveLoadState, SessionLoadMetrics, StepLoadMetrics }
