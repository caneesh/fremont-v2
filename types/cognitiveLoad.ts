/**
 * Cognitive Load Governor Types
 *
 * Defines types for the adaptive cognitive load management system that
 * dynamically reduces complexity for struggling students.
 *
 * Key inputs (already tracked in session state):
 * - timeSpentPerStep: Duration on each step in seconds
 * - wrongAttempts: Count of incorrect submissions per step
 * - hintEscalationSpeed: How fast hints are being unlocked (hints per minute)
 * - revealUsed: Whether level 5 (full solution) was revealed
 * - circuitBreakerState: Current state of the error circuit breaker
 *
 * Output: cognitiveLoadScore = 'low' | 'medium' | 'high'
 */

import type { CircuitBreakerState } from './circuitBreaker'

// ============================================
// Cognitive Load Score
// ============================================

/**
 * Cognitive load level determines UI simplification behavior:
 * - 'low': Normal UI, all features available
 * - 'medium': Transitional state, some warnings may show
 * - 'high': Simplified UI (single step, collapsed future, binary MCQs)
 */
export type CognitiveLoadScore = 'low' | 'medium' | 'high'

// ============================================
// Session Metrics for Load Calculation
// ============================================

/**
 * Per-step metrics tracked during the session
 */
export interface StepLoadMetrics {
  /** Step ID */
  stepId: number
  /** Time spent on this step in seconds */
  timeSpentSeconds: number
  /** Number of wrong attempts on this step */
  wrongAttempts: number
  /** Current hint level (0-5) */
  currentHintLevel: number
  /** Time when each hint was unlocked (for speed calculation) */
  hintUnlockTimestamps: number[]
  /** Whether level 5 (reveal) was used */
  revealUsed: boolean
  /** Whether step is completed */
  isCompleted: boolean
}

/**
 * Session-level metrics aggregated from step metrics
 */
export interface SessionLoadMetrics {
  /** Session start timestamp */
  sessionStartMs: number
  /** Total time spent in session so far (seconds) */
  totalTimeSpentSeconds: number
  /** Per-step metrics */
  stepMetrics: StepLoadMetrics[]
  /** Current circuit breaker state */
  circuitBreakerState: CircuitBreakerState
  /** Total wrong attempts across all steps */
  totalWrongAttempts: number
  /** Total hints unlocked */
  totalHintsUnlocked: number
  /** Number of steps where reveal was used */
  revealCount: number
  /** Steps that took >2 minutes */
  stuckStepCount: number
}

// ============================================
// Cognitive Load State
// ============================================

/**
 * Current cognitive load state for the session
 */
export interface CognitiveLoadState {
  /** Current computed load score */
  score: CognitiveLoadScore
  /** Previous score (for detecting transitions) */
  previousScore: CognitiveLoadScore | null
  /** When the score was last updated */
  lastUpdatedAt: string
  /** Number of consecutive high-load steps */
  consecutiveHighLoadSteps: number
  /** Number of steps completed since last high load */
  stepsSinceLowLoad: number
  /** Whether UI is currently in simplified mode */
  simplifiedModeActive: boolean
  /** History of recent score changes (for gradual recovery) */
  scoreHistory: {
    score: CognitiveLoadScore
    timestamp: string
  }[]
}

// ============================================
// Load Score Thresholds (Configurable)
// ============================================

/**
 * Thresholds for determining cognitive load level
 */
export interface CognitiveLoadThresholds {
  /** Average time per step (seconds) that triggers concern */
  highTimePerStepSeconds: number
  /** Wrong attempts per step that indicates struggle */
  highWrongAttemptsPerStep: number
  /** Hint escalation rate (hints per minute) that indicates rush */
  fastHintEscalationRate: number
  /** Minimum step count for meaningful metrics */
  minStepsForAssessment: number
  /** Consecutive stuck steps to trigger high load */
  stuckStepCountForHighLoad: number
  /** Steps needed at low load before recovering from high */
  recoveryStepCount: number
}

/**
 * Default thresholds tuned for typical struggling students
 */
export const DEFAULT_COGNITIVE_LOAD_THRESHOLDS: CognitiveLoadThresholds = {
  highTimePerStepSeconds: 180, // 3 minutes per step is concerning
  highWrongAttemptsPerStep: 2, // 2+ wrong attempts per step
  fastHintEscalationRate: 3, // 3+ hints per minute is rushing
  minStepsForAssessment: 2, // Need at least 2 steps to assess
  stuckStepCountForHighLoad: 2, // 2+ stuck steps triggers high load
  recoveryStepCount: 2, // 2 clean steps to recover from high
}

// ============================================
// UI Simplification Config
// ============================================

/**
 * UI behavior changes when cognitive load is high
 */
export interface HighLoadUIConfig {
  /** Show only one active step at a time */
  singleActiveStep: boolean
  /** Collapse future steps (show as read-only list) */
  collapseFutureSteps: boolean
  /** Reduce MCQs to binary choices where possible */
  reduceMCQToBinary: boolean
  /** Shorten hint text to first sentence only */
  shortenHintText: boolean
  /** Disable optional hints temporarily */
  disableOptionalHints: boolean
  /** Hide error watch-outs (too much info) */
  hideErrorWatchOuts: boolean
  /** Simplify progress indicators */
  simplifyProgressIndicators: boolean
}

/**
 * Default high-load UI configuration
 */
export const HIGH_LOAD_UI_CONFIG: HighLoadUIConfig = {
  singleActiveStep: true,
  collapseFutureSteps: true,
  reduceMCQToBinary: true,
  shortenHintText: true,
  disableOptionalHints: true,
  hideErrorWatchOuts: true,
  simplifyProgressIndicators: true,
}

/**
 * Medium-load UI configuration (partial simplification)
 */
export const MEDIUM_LOAD_UI_CONFIG: HighLoadUIConfig = {
  singleActiveStep: false,
  collapseFutureSteps: false,
  reduceMCQToBinary: false,
  shortenHintText: false,
  disableOptionalHints: false,
  hideErrorWatchOuts: false,
  simplifyProgressIndicators: false,
}

// ============================================
// Cognitive Load Events (for telemetry)
// ============================================

export type CognitiveLoadEventType =
  | 'cognitive_load_assessed'
  | 'cognitive_load_increased'
  | 'cognitive_load_decreased'
  | 'simplified_mode_activated'
  | 'simplified_mode_deactivated'

export interface CognitiveLoadEvent {
  type: CognitiveLoadEventType
  timestamp: string
  previousScore: CognitiveLoadScore | null
  newScore: CognitiveLoadScore
  triggerMetrics?: {
    avgTimePerStep?: number
    avgWrongAttempts?: number
    hintEscalationRate?: number
    stuckStepCount?: number
  }
}

// ============================================
// Initial State Factory
// ============================================

/**
 * Create initial cognitive load state
 */
export function createInitialCognitiveLoadState(): CognitiveLoadState {
  return {
    score: 'low',
    previousScore: null,
    lastUpdatedAt: new Date().toISOString(),
    consecutiveHighLoadSteps: 0,
    stepsSinceLowLoad: 0,
    simplifiedModeActive: false,
    scoreHistory: [],
  }
}

/**
 * Create empty session load metrics
 */
export function createInitialSessionLoadMetrics(): SessionLoadMetrics {
  return {
    sessionStartMs: Date.now(),
    totalTimeSpentSeconds: 0,
    stepMetrics: [],
    circuitBreakerState: 'MONITORING',
    totalWrongAttempts: 0,
    totalHintsUnlocked: 0,
    revealCount: 0,
    stuckStepCount: 0,
  }
}

/**
 * Create initial step load metrics
 */
export function createInitialStepLoadMetrics(stepId: number): StepLoadMetrics {
  return {
    stepId,
    timeSpentSeconds: 0,
    wrongAttempts: 0,
    currentHintLevel: 0,
    hintUnlockTimestamps: [],
    revealUsed: false,
    isCompleted: false,
  }
}

// ============================================
// Serialization Helpers
// ============================================

/**
 * Serialize cognitive load state for sessionStorage
 */
export function serializeCognitiveLoadState(state: CognitiveLoadState): string {
  return JSON.stringify(state)
}

/**
 * Deserialize cognitive load state from sessionStorage
 */
export function deserializeCognitiveLoadState(json: string): CognitiveLoadState {
  return JSON.parse(json) as CognitiveLoadState
}
