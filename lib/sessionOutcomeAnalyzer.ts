/**
 * Session Outcome Analyzer
 *
 * Tracks session metrics and detects "bad" sessions that require recovery.
 *
 * Detection Criteria (any 2 triggers):
 * - Reveal used more than N times (default: 2)
 * - Circuit breaker tripped
 * - Average step time > threshold (default: 5 min)
 * - Session ended mid-problem
 */

import {
  type SessionMetrics,
  type SessionOutcome,
  type BadSessionTrigger,
  type DetectionThresholds,
  type RecoveryDataStorage,
  INITIAL_SESSION_METRICS,
  DEFAULT_DETECTION_THRESHOLDS,
  RECOVERY_STORAGE_VERSION,
  createInitialRecoveryStorage,
} from '@/types/confidenceRepair'
import { STORAGE_KEYS } from '@/lib/storage/types'
import { getSessionStartedAtMs } from '@/lib/session'

const METRICS_KEY = STORAGE_KEYS.SESSION_METRICS
const RECOVERY_DATA_KEY = STORAGE_KEYS.RECOVERY_DATA

// ============================================
// Session Metrics Storage
// ============================================

/**
 * Get current session metrics from sessionStorage
 */
export function getSessionMetrics(): SessionMetrics {
  if (typeof window === 'undefined') return { ...INITIAL_SESSION_METRICS }

  try {
    const stored = sessionStorage.getItem(METRICS_KEY)
    if (!stored) return { ...INITIAL_SESSION_METRICS }
    return JSON.parse(stored) as SessionMetrics
  } catch (error) {
    console.error('[SessionOutcome] Failed to load metrics:', error)
    return { ...INITIAL_SESSION_METRICS }
  }
}

/**
 * Save session metrics to sessionStorage
 */
function saveSessionMetrics(metrics: SessionMetrics): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(METRICS_KEY, JSON.stringify(metrics))
  } catch (error) {
    console.error('[SessionOutcome] Failed to save metrics:', error)
  }
}

/**
 * Clear session metrics (new session)
 */
export function clearSessionMetrics(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(METRICS_KEY)
}

// ============================================
// Metric Recording Functions
// ============================================

/**
 * Record that a reveal (hint level 5) was used
 */
export function recordRevealUsed(): SessionMetrics {
  const metrics = getSessionMetrics()
  metrics.revealCount += 1
  saveSessionMetrics(metrics)
  return metrics
}

/**
 * Record that the circuit breaker was tripped
 */
export function recordCircuitBreakerTripped(): SessionMetrics {
  const metrics = getSessionMetrics()
  metrics.circuitBreakerTripped = true
  saveSessionMetrics(metrics)
  return metrics
}

/**
 * Record a step completion with its duration
 */
export function recordStepCompletion(durationMs: number): SessionMetrics {
  const metrics = getSessionMetrics()
  metrics.stepTimesMs.push(durationMs)
  metrics.stepsCompleted += 1
  saveSessionMetrics(metrics)
  return metrics
}

/**
 * Record that a step was attempted (but not necessarily completed)
 */
export function recordStepAttempted(): SessionMetrics {
  const metrics = getSessionMetrics()
  metrics.stepsAttempted += 1
  saveSessionMetrics(metrics)
  return metrics
}

/**
 * Record that session ended mid-problem
 */
export function recordSessionEndedMidProblem(problemId: string): SessionMetrics {
  const metrics = getSessionMetrics()
  metrics.endedMidProblem = true
  metrics.incompleteProblemId = problemId
  saveSessionMetrics(metrics)
  return metrics
}

/**
 * Update total session duration
 */
export function updateSessionDuration(): SessionMetrics {
  const metrics = getSessionMetrics()
  const sessionStartMs = getSessionStartedAtMs()
  metrics.totalDurationMs = Date.now() - sessionStartMs
  saveSessionMetrics(metrics)
  return metrics
}

// ============================================
// Detection Logic
// ============================================

/**
 * Calculate average step time in milliseconds
 */
export function calculateAverageStepTime(stepTimesMs: number[]): number {
  if (stepTimesMs.length === 0) return 0
  const sum = stepTimesMs.reduce((acc, time) => acc + time, 0)
  return sum / stepTimesMs.length
}

/**
 * Evaluate which triggers are activated based on metrics
 */
export function evaluateTriggers(
  metrics: SessionMetrics,
  thresholds: DetectionThresholds = DEFAULT_DETECTION_THRESHOLDS
): BadSessionTrigger[] {
  const triggers: BadSessionTrigger[] = []

  // Check reveal overuse
  if (metrics.revealCount > thresholds.maxRevealCount) {
    triggers.push('reveal_overuse')
  }

  // Check circuit breaker trip
  if (metrics.circuitBreakerTripped) {
    triggers.push('circuit_breaker_trip')
  }

  // Check slow step time
  const avgStepTime = calculateAverageStepTime(metrics.stepTimesMs)
  if (avgStepTime > thresholds.stepTimeThresholdMs && metrics.stepTimesMs.length > 0) {
    triggers.push('slow_step_time')
  }

  // Check session incomplete
  if (metrics.endedMidProblem) {
    triggers.push('session_incomplete')
  }

  return triggers
}

/**
 * Determine if session qualifies as "bad" based on trigger count
 */
export function isBadSession(
  triggers: BadSessionTrigger[],
  minTriggersRequired: number = DEFAULT_DETECTION_THRESHOLDS.minTriggersRequired
): boolean {
  return triggers.length >= minTriggersRequired
}

// ============================================
// Session Outcome Analysis
// ============================================

/**
 * Generate a unique session ID based on session start time
 */
function generateSessionId(): string {
  const sessionStartMs = getSessionStartedAtMs()
  return `session_${sessionStartMs}_${Math.random().toString(36).substr(2, 6)}`
}

/**
 * Analyze current session and generate outcome
 */
export function analyzeSession(
  thresholds: DetectionThresholds = DEFAULT_DETECTION_THRESHOLDS
): SessionOutcome {
  const metrics = updateSessionDuration()
  const triggers = evaluateTriggers(metrics, thresholds)
  const bad = isBadSession(triggers, thresholds.minTriggersRequired)

  return {
    sessionId: generateSessionId(),
    endedAt: new Date().toISOString(),
    metrics,
    activatedTriggers: triggers,
    isBadSession: bad,
  }
}

// ============================================
// Recovery Data Persistence (localStorage)
// ============================================

/**
 * Load recovery data from localStorage
 */
export function loadRecoveryData(): RecoveryDataStorage {
  if (typeof window === 'undefined') return createInitialRecoveryStorage()

  try {
    const stored = localStorage.getItem(RECOVERY_DATA_KEY)
    if (!stored) return createInitialRecoveryStorage()

    const data = JSON.parse(stored) as RecoveryDataStorage
    if (data.version !== RECOVERY_STORAGE_VERSION) {
      // Version mismatch - migrate or reset
      return createInitialRecoveryStorage()
    }

    return data
  } catch (error) {
    console.error('[SessionOutcome] Failed to load recovery data:', error)
    return createInitialRecoveryStorage()
  }
}

/**
 * Save recovery data to localStorage
 */
export function saveRecoveryData(data: RecoveryDataStorage): void {
  if (typeof window === 'undefined') return

  try {
    data.lastUpdatedAt = new Date().toISOString()
    localStorage.setItem(RECOVERY_DATA_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('[SessionOutcome] Failed to save recovery data:', error)
  }
}

/**
 * Persist session outcome at session end
 * Called when user navigates away or closes tab
 */
export function persistSessionOutcome(outcome: SessionOutcome): void {
  const data = loadRecoveryData()
  data.lastSessionOutcome = outcome
  saveRecoveryData(data)
}

/**
 * Get the last session outcome (for next session analysis)
 */
export function getLastSessionOutcome(): SessionOutcome | undefined {
  const data = loadRecoveryData()
  return data.lastSessionOutcome
}

/**
 * Clear the last session outcome (after recovery is handled)
 */
export function clearLastSessionOutcome(): void {
  const data = loadRecoveryData()
  data.lastSessionOutcome = undefined
  saveRecoveryData(data)
}

// ============================================
// Session End Handling
// ============================================

/**
 * Finalize session and persist outcome
 * Should be called before session ends (beforeunload, navigation, etc.)
 */
export function finalizeSession(
  incompleteProblemId?: string,
  thresholds: DetectionThresholds = DEFAULT_DETECTION_THRESHOLDS
): SessionOutcome {
  // Record incomplete problem if provided
  if (incompleteProblemId) {
    recordSessionEndedMidProblem(incompleteProblemId)
  }

  // Analyze and persist
  const outcome = analyzeSession(thresholds)
  persistSessionOutcome(outcome)

  // Clear session metrics for next session
  clearSessionMetrics()

  return outcome
}

/**
 * Get summary for telemetry/debugging
 */
export function getSessionOutcomeSummary(): {
  metrics: SessionMetrics
  triggers: BadSessionTrigger[]
  isBad: boolean
  avgStepTimeMs: number
} {
  const metrics = getSessionMetrics()
  const triggers = evaluateTriggers(metrics)
  const avgStepTimeMs = calculateAverageStepTime(metrics.stepTimesMs)

  return {
    metrics,
    triggers,
    isBad: isBadSession(triggers),
    avgStepTimeMs,
  }
}

/**
 * Check if current session is trending towards bad
 * (useful for early intervention before session ends)
 */
export function isSessionTrendingBad(): { trending: boolean; triggersActive: number } {
  const summary = getSessionOutcomeSummary()
  return {
    trending: summary.triggers.length >= 1,
    triggersActive: summary.triggers.length,
  }
}
