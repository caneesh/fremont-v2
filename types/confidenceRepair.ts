/**
 * Confidence Repair System Types
 *
 * Detects frustrating sessions and auto-recovers students on next session start.
 *
 * Detection Criteria (any 2 triggers):
 * - Reveal used more than N times
 * - Circuit breaker tripped
 * - Average step time > threshold
 * - Session ended mid-problem
 *
 * Recovery Mode:
 * - Present 1 warm-up problem from previously mastered pattern
 * - Disable Reveal
 * - Enable extra micro-tasks for confidence
 * - Professor Check-In always supportive (no challenge tone)
 */

// ============================================
// Detection Trigger Types
// ============================================

/**
 * Individual trigger types that can indicate a bad session
 */
export type BadSessionTrigger =
  | 'reveal_overuse'        // Reveal used more than N times
  | 'circuit_breaker_trip'  // Circuit breaker was tripped
  | 'slow_step_time'        // Average step time > threshold
  | 'session_incomplete'    // Session ended mid-problem

/**
 * Configuration for detection thresholds
 */
export interface DetectionThresholds {
  /** Number of reveals before triggering (default: 2) */
  maxRevealCount: number
  /** Average step time threshold in ms (default: 300000 = 5 min) */
  stepTimeThresholdMs: number
  /** Minimum triggers required to flag bad session (default: 2) */
  minTriggersRequired: number
}

/**
 * Default detection thresholds
 */
export const DEFAULT_DETECTION_THRESHOLDS: DetectionThresholds = {
  maxRevealCount: 2,
  stepTimeThresholdMs: 300000, // 5 minutes
  minTriggersRequired: 2,
}

// ============================================
// Session Outcome Types
// ============================================

/**
 * Metrics collected during a session for outcome analysis
 */
export interface SessionMetrics {
  /** Total number of reveals (hint level 5) used */
  revealCount: number
  /** Whether circuit breaker was tripped at any point */
  circuitBreakerTripped: boolean
  /** Step completion times in ms (for calculating average) */
  stepTimesMs: number[]
  /** Whether session ended with an incomplete problem */
  endedMidProblem: boolean
  /** Total number of steps attempted */
  stepsAttempted: number
  /** Total number of steps completed successfully */
  stepsCompleted: number
  /** Problem ID if session ended mid-problem */
  incompleteProblemId?: string
  /** Total session duration in ms */
  totalDurationMs: number
}

/**
 * Initial session metrics
 */
export const INITIAL_SESSION_METRICS: SessionMetrics = {
  revealCount: 0,
  circuitBreakerTripped: false,
  stepTimesMs: [],
  endedMidProblem: false,
  stepsAttempted: 0,
  stepsCompleted: 0,
  totalDurationMs: 0,
}

/**
 * Outcome of a completed session
 */
export interface SessionOutcome {
  /** Session identifier */
  sessionId: string
  /** Timestamp when session ended */
  endedAt: string
  /** Collected session metrics */
  metrics: SessionMetrics
  /** Triggers that were activated */
  activatedTriggers: BadSessionTrigger[]
  /** Whether session qualifies as "bad" (2+ triggers) */
  isBadSession: boolean
}

// ============================================
// Recovery Mode Types
// ============================================

/**
 * Recovery mode state
 */
export type RecoveryModeStatus = 'inactive' | 'active' | 'completed'

/**
 * Recovery mode configuration applied during recovery
 */
export interface RecoveryModeConfig {
  /** Whether Reveal (hint level 5) is disabled */
  revealDisabled: boolean
  /** Whether extra micro-tasks are enabled */
  extraMicroTasksEnabled: boolean
  /** Whether professor check-in uses supportive tone only */
  supportiveToneOnly: boolean
  /** Number of warm-up problems required (default: 1) */
  warmUpProblemsRequired: number
}

/**
 * Default recovery mode configuration
 */
export const DEFAULT_RECOVERY_CONFIG: RecoveryModeConfig = {
  revealDisabled: true,
  extraMicroTasksEnabled: true,
  supportiveToneOnly: true,
  warmUpProblemsRequired: 1,
}

/**
 * Warm-up problem for recovery mode
 */
export interface WarmUpProblem {
  /** Problem ID */
  problemId: string
  /** Problem title */
  problemTitle: string
  /** Pattern ID this problem is from */
  patternId: string
  /** Pattern name for display */
  patternName: string
  /** Mastery level of this pattern (should be high) */
  masteryLevel: 'high' | 'medium'
  /** Problem difficulty (should be easy/medium for recovery) */
  difficulty: 'Easy' | 'Medium'
}

/**
 * Recovery mode session state
 */
export interface RecoveryModeState {
  /** Current recovery status */
  status: RecoveryModeStatus
  /** When recovery mode was activated */
  activatedAt?: string
  /** The session outcome that triggered recovery */
  triggeringOutcome?: SessionOutcome
  /** Selected warm-up problem */
  warmUpProblem?: WarmUpProblem
  /** Number of warm-up problems completed */
  warmUpsCompleted: number
  /** Recovery configuration */
  config: RecoveryModeConfig
  /** When recovery mode was completed (if applicable) */
  completedAt?: string
}

/**
 * Initial recovery mode state
 */
export const INITIAL_RECOVERY_STATE: RecoveryModeState = {
  status: 'inactive',
  warmUpsCompleted: 0,
  config: { ...DEFAULT_RECOVERY_CONFIG },
}

// ============================================
// Storage Types
// ============================================

/**
 * Persisted recovery data structure
 */
export interface RecoveryDataStorage {
  /** Storage version for migrations */
  version: number
  /** Last session outcome (for next session analysis) */
  lastSessionOutcome?: SessionOutcome
  /** Current recovery mode state */
  recoveryState: RecoveryModeState
  /** History of recovery sessions (for analytics) */
  recoveryHistory: RecoveryHistoryEntry[]
  /** Last updated timestamp */
  lastUpdatedAt: string
}

/**
 * Historical record of a recovery session
 */
export interface RecoveryHistoryEntry {
  /** Session ID where recovery was triggered */
  sessionId: string
  /** When recovery was activated */
  activatedAt: string
  /** Triggers that caused recovery */
  triggers: BadSessionTrigger[]
  /** Whether recovery was completed successfully */
  completedSuccessfully: boolean
  /** When recovery was completed (or abandoned) */
  endedAt: string
  /** Warm-up problem used */
  warmUpProblemId?: string
}

/**
 * Storage version for migrations
 */
export const RECOVERY_STORAGE_VERSION = 1

/**
 * Create initial recovery data storage
 */
export function createInitialRecoveryStorage(): RecoveryDataStorage {
  return {
    version: RECOVERY_STORAGE_VERSION,
    recoveryState: { ...INITIAL_RECOVERY_STATE },
    recoveryHistory: [],
    lastUpdatedAt: new Date().toISOString(),
  }
}

// ============================================
// Event Types (for telemetry)
// ============================================

export type ConfidenceRepairEventType =
  | 'bad_session_detected'
  | 'recovery_mode_activated'
  | 'recovery_warmup_started'
  | 'recovery_warmup_completed'
  | 'recovery_mode_completed'
  | 'recovery_mode_abandoned'

export interface ConfidenceRepairEventMetadata {
  sessionId: string
  triggers?: BadSessionTrigger[]
  warmUpProblemId?: string
  warmUpPatternId?: string
  recoveryDurationMs?: number
  wasSuccessful?: boolean
}
