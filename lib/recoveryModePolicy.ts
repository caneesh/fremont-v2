/**
 * Recovery Mode Policy
 *
 * Manages Recovery Mode state and transitions.
 * Activated automatically when previous session was "bad".
 *
 * Recovery Mode:
 * - Present 1 warm-up problem from previously mastered pattern
 * - Disable Reveal (hint level 5)
 * - Enable extra micro-tasks for confidence
 * - Professor Check-In uses supportive tone only
 *
 * Exits deterministically after 1 successful warm-up.
 */

import {
  type RecoveryModeState,
  type RecoveryModeConfig,
  type RecoveryModeStatus,
  type SessionOutcome,
  type WarmUpProblem,
  type RecoveryHistoryEntry,
  INITIAL_RECOVERY_STATE,
  DEFAULT_RECOVERY_CONFIG,
} from '@/types/confidenceRepair'
import {
  loadRecoveryData,
  saveRecoveryData,
  getLastSessionOutcome,
  clearLastSessionOutcome,
} from '@/lib/sessionOutcomeAnalyzer'
import { isFeatureEnabled } from '@/lib/featureFlags'

// ============================================
// Recovery State Management
// ============================================

/**
 * Get current recovery mode state
 */
export function getRecoveryModeState(): RecoveryModeState {
  const data = loadRecoveryData()
  return data.recoveryState
}

/**
 * Save recovery mode state
 */
function saveRecoveryModeState(state: RecoveryModeState): void {
  const data = loadRecoveryData()
  data.recoveryState = state
  saveRecoveryData(data)
}

/**
 * Check if recovery mode is currently active
 */
export function isRecoveryModeActive(): boolean {
  if (!isFeatureEnabled('CONFIDENCE_REPAIR')) return false
  const state = getRecoveryModeState()
  return state.status === 'active'
}

/**
 * Get recovery mode configuration (for UI components)
 */
export function getRecoveryModeConfig(): RecoveryModeConfig | null {
  if (!isRecoveryModeActive()) return null
  const state = getRecoveryModeState()
  return state.config
}

// ============================================
// Recovery Mode Activation
// ============================================

/**
 * Check if recovery mode should be activated on session start
 * Returns the triggering outcome if recovery is needed
 */
export function shouldActivateRecoveryMode(): {
  shouldActivate: boolean
  triggeringOutcome?: SessionOutcome
} {
  if (!isFeatureEnabled('CONFIDENCE_REPAIR')) {
    return { shouldActivate: false }
  }

  // Check if already in recovery mode
  const currentState = getRecoveryModeState()
  if (currentState.status === 'active') {
    return { shouldActivate: false } // Already active
  }

  // Check if previous session was bad
  const lastOutcome = getLastSessionOutcome()
  if (!lastOutcome) {
    return { shouldActivate: false }
  }

  if (lastOutcome.isBadSession) {
    return {
      shouldActivate: true,
      triggeringOutcome: lastOutcome,
    }
  }

  return { shouldActivate: false }
}

/**
 * Activate recovery mode with a warm-up problem
 */
export function activateRecoveryMode(
  triggeringOutcome: SessionOutcome,
  warmUpProblem: WarmUpProblem
): RecoveryModeState {
  const state: RecoveryModeState = {
    status: 'active',
    activatedAt: new Date().toISOString(),
    triggeringOutcome,
    warmUpProblem,
    warmUpsCompleted: 0,
    config: { ...DEFAULT_RECOVERY_CONFIG },
  }

  saveRecoveryModeState(state)

  // Clear the triggering outcome (don't re-trigger next session)
  clearLastSessionOutcome()

  return state
}

// ============================================
// Recovery Mode Completion
// ============================================

/**
 * Record a successful warm-up completion
 */
export function recordWarmUpCompletion(): {
  recoveryCompleted: boolean
  updatedState: RecoveryModeState
} {
  const state = getRecoveryModeState()

  if (state.status !== 'active') {
    return { recoveryCompleted: false, updatedState: state }
  }

  state.warmUpsCompleted += 1

  // Check if recovery is complete
  const recoveryCompleted = state.warmUpsCompleted >= state.config.warmUpProblemsRequired

  if (recoveryCompleted) {
    state.status = 'completed'
    state.completedAt = new Date().toISOString()

    // Record in history
    recordRecoveryHistory(state, true)
  }

  saveRecoveryModeState(state)

  return { recoveryCompleted, updatedState: state }
}

/**
 * Abandon recovery mode (user navigates away, etc.)
 */
export function abandonRecoveryMode(): RecoveryModeState {
  const state = getRecoveryModeState()

  if (state.status !== 'active') {
    return state
  }

  // Record in history as not completed
  recordRecoveryHistory(state, false)

  // Reset to inactive
  const resetState: RecoveryModeState = {
    ...INITIAL_RECOVERY_STATE,
  }

  saveRecoveryModeState(resetState)

  return resetState
}

/**
 * Reset recovery mode to inactive (after completion or for new session)
 */
export function resetRecoveryMode(): void {
  saveRecoveryModeState({ ...INITIAL_RECOVERY_STATE })
}

// ============================================
// Recovery History
// ============================================

/**
 * Record recovery session in history
 */
function recordRecoveryHistory(state: RecoveryModeState, completedSuccessfully: boolean): void {
  const data = loadRecoveryData()

  const entry: RecoveryHistoryEntry = {
    sessionId: state.triggeringOutcome?.sessionId ?? 'unknown',
    activatedAt: state.activatedAt ?? new Date().toISOString(),
    triggers: state.triggeringOutcome?.activatedTriggers ?? [],
    completedSuccessfully,
    endedAt: new Date().toISOString(),
    warmUpProblemId: state.warmUpProblem?.problemId,
  }

  data.recoveryHistory.push(entry)

  // Keep only last 50 entries
  if (data.recoveryHistory.length > 50) {
    data.recoveryHistory = data.recoveryHistory.slice(-50)
  }

  saveRecoveryData(data)
}

/**
 * Get recovery history for analytics
 */
export function getRecoveryHistory(): RecoveryHistoryEntry[] {
  const data = loadRecoveryData()
  return data.recoveryHistory
}

/**
 * Get recovery statistics
 */
export function getRecoveryStats(): {
  totalRecoveries: number
  successRate: number
  mostCommonTrigger: string | null
} {
  const history = getRecoveryHistory()

  if (history.length === 0) {
    return { totalRecoveries: 0, successRate: 0, mostCommonTrigger: null }
  }

  const successCount = history.filter((h) => h.completedSuccessfully).length
  const successRate = successCount / history.length

  // Count trigger frequency
  const triggerCounts = new Map<string, number>()
  history.forEach((h) => {
    h.triggers.forEach((t) => {
      triggerCounts.set(t, (triggerCounts.get(t) ?? 0) + 1)
    })
  })

  let mostCommonTrigger: string | null = null
  let maxCount = 0
  triggerCounts.forEach((count, trigger) => {
    if (count > maxCount) {
      maxCount = count
      mostCommonTrigger = trigger
    }
  })

  return {
    totalRecoveries: history.length,
    successRate,
    mostCommonTrigger,
  }
}

// ============================================
// UI Helper Functions
// ============================================

/**
 * Check if reveal should be disabled
 */
export function isRevealDisabled(): boolean {
  const config = getRecoveryModeConfig()
  return config?.revealDisabled ?? false
}

/**
 * Check if extra micro-tasks should be enabled
 */
export function shouldEnableExtraMicroTasks(): boolean {
  const config = getRecoveryModeConfig()
  return config?.extraMicroTasksEnabled ?? false
}

/**
 * Check if supportive tone should be used (professor check-in)
 */
export function shouldUseSupportiveTone(): boolean {
  const config = getRecoveryModeConfig()
  return config?.supportiveToneOnly ?? false
}

/**
 * Get the current warm-up problem (if in recovery mode)
 */
export function getCurrentWarmUpProblem(): WarmUpProblem | null {
  if (!isRecoveryModeActive()) return null
  const state = getRecoveryModeState()
  return state.warmUpProblem ?? null
}

/**
 * Get recovery mode message for user
 */
export function getRecoveryModeMessage(): string {
  return "Let's rebuild confidence first."
}

/**
 * Get detailed recovery status for UI
 */
export function getRecoveryUIStatus(): {
  active: boolean
  message: string
  warmUpProblem: WarmUpProblem | null
  warmUpsCompleted: number
  warmUpsRequired: number
  config: RecoveryModeConfig
} {
  const state = getRecoveryModeState()
  const active = state.status === 'active'

  return {
    active,
    message: active ? getRecoveryModeMessage() : '',
    warmUpProblem: state.warmUpProblem ?? null,
    warmUpsCompleted: state.warmUpsCompleted,
    warmUpsRequired: state.config.warmUpProblemsRequired,
    config: state.config,
  }
}

// ============================================
// Session Start Integration
// ============================================

/**
 * Initialize recovery mode check on session start
 * Returns recovery mode state and warm-up problem selector callback
 */
export function initializeRecoveryCheck(): {
  needsRecovery: boolean
  triggeringOutcome?: SessionOutcome
  activate: (warmUpProblem: WarmUpProblem) => RecoveryModeState
} {
  const { shouldActivate, triggeringOutcome } = shouldActivateRecoveryMode()

  return {
    needsRecovery: shouldActivate,
    triggeringOutcome,
    activate: (warmUpProblem: WarmUpProblem) => {
      if (!triggeringOutcome) {
        throw new Error('Cannot activate recovery without triggering outcome')
      }
      return activateRecoveryMode(triggeringOutcome, warmUpProblem)
    },
  }
}
