/**
 * Unified Time Pressure Configuration
 *
 * Per-problem configuration for time-pressure training features:
 * - Pattern-First Mode (lock early steps for fast pattern recognition)
 * - Skip-or-Commit Gate (force a triage decision at a fixed time)
 */

export interface TimePressureConfig {
  // Pattern-First Mode
  enablePatternFirst?: boolean
  lockSeconds?: number
  showCountdown?: boolean
  allowTimeoutProceed?: boolean

  // Skip-or-Commit Gate
  enableSkipCommit?: boolean
  gateSeconds?: number
  autoCommitSeconds?: number

  // Optional metadata (analytics / heuristics)
  expectedSolveTimeSeconds?: number
}

export const DEFAULT_PATTERN_FIRST_TIME_PRESSURE: Required<
  Pick<TimePressureConfig, 'enablePatternFirst' | 'lockSeconds' | 'showCountdown' | 'allowTimeoutProceed'>
> = {
  enablePatternFirst: false,
  lockSeconds: 12,
  showCountdown: true,
  allowTimeoutProceed: true,
}

export const DEFAULT_SKIP_COMMIT_TIME_PRESSURE: Required<
  Pick<TimePressureConfig, 'enableSkipCommit' | 'gateSeconds' | 'autoCommitSeconds'>
> = {
  enableSkipCommit: false,
  gateSeconds: 25,
  autoCommitSeconds: 8,
}

export function getPatternFirstTimePressure(
  timePressure?: TimePressureConfig
): Required<Pick<TimePressureConfig, 'enablePatternFirst' | 'lockSeconds' | 'showCountdown' | 'allowTimeoutProceed'>> {
  return {
    enablePatternFirst: timePressure?.enablePatternFirst ?? DEFAULT_PATTERN_FIRST_TIME_PRESSURE.enablePatternFirst,
    lockSeconds: timePressure?.lockSeconds ?? DEFAULT_PATTERN_FIRST_TIME_PRESSURE.lockSeconds,
    showCountdown: timePressure?.showCountdown ?? DEFAULT_PATTERN_FIRST_TIME_PRESSURE.showCountdown,
    allowTimeoutProceed: timePressure?.allowTimeoutProceed ?? DEFAULT_PATTERN_FIRST_TIME_PRESSURE.allowTimeoutProceed,
  }
}

export function getSkipCommitTimePressure(
  timePressure?: TimePressureConfig
): Required<Pick<TimePressureConfig, 'enableSkipCommit' | 'gateSeconds' | 'autoCommitSeconds'>> {
  return {
    enableSkipCommit: timePressure?.enableSkipCommit ?? DEFAULT_SKIP_COMMIT_TIME_PRESSURE.enableSkipCommit,
    gateSeconds: timePressure?.gateSeconds ?? DEFAULT_SKIP_COMMIT_TIME_PRESSURE.gateSeconds,
    autoCommitSeconds: timePressure?.autoCommitSeconds ?? DEFAULT_SKIP_COMMIT_TIME_PRESSURE.autoCommitSeconds,
  }
}

