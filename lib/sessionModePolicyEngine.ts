import {
  DEFAULT_SESSION_MODE_POLICY_CONFIG,
  type SessionMode,
  type SessionModePolicyConfig,
  type SessionModeState,
  type StepVisibilityConfig,
  type SessionModePresentationConfig,
} from '@/types/sessionMode'

const SESSION_MODE_STORAGE_KEY = 'v2_session_mode'

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value))

export function createInitialSessionModeState(initialMode: SessionMode = 'guided'): SessionModeState {
  return {
    mode: initialMode,
    recentErrorTimestamps: [],
    lastUpdatedAt: Date.now(),
  }
}

export function loadSessionModeState(): SessionModeState | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = sessionStorage.getItem(SESSION_MODE_STORAGE_KEY)
    if (!stored) return null
    return JSON.parse(stored) as SessionModeState
  } catch (error) {
    console.error('[SessionMode] Failed to load state:', error)
    return null
  }
}

export function saveSessionModeState(state: SessionModeState): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(SESSION_MODE_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('[SessionMode] Failed to save state:', error)
  }
}

export function clearSessionModeState(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_MODE_STORAGE_KEY)
}

export function getOrCreateSessionModeState(seedMode: SessionMode = 'guided'): SessionModeState {
  const existing = loadSessionModeState()
  if (existing) return existing

  const state = createInitialSessionModeState(seedMode)
  saveSessionModeState(state)
  return state
}

export function pruneRecentErrors(
  timestamps: number[],
  nowMs: number,
  windowMs: number
): number[] {
  return timestamps.filter((ts) => nowMs - ts <= windowMs)
}

export function computeNextSessionMode(
  input: {
    currentMode: SessionMode
    masteryScore: number
    recentErrorCount: number
  },
  config: SessionModePolicyConfig = DEFAULT_SESSION_MODE_POLICY_CONFIG
): SessionMode {
  const mastery = clamp01(input.masteryScore)
  const { transitions } = config

  if (input.currentMode === 'exam') {
    if (input.recentErrorCount >= transitions.examRegressionErrorThreshold) {
      return 'assisted'
    }
    return 'exam'
  }

  if (input.currentMode === 'assisted') {
    if (input.recentErrorCount >= transitions.assistedRegressionErrorThreshold) {
      return 'guided'
    }
    if (
      mastery >= transitions.assistedToExamMastery &&
      input.recentErrorCount < transitions.examEntryMaxRecentErrors
    ) {
      return 'exam'
    }
    return 'assisted'
  }

  if (mastery >= transitions.guidedToAssistedMastery) {
    return 'assisted'
  }

  return 'guided'
}

export function evaluateSessionMode(
  state: SessionModeState,
  masteryScore: number,
  nowMs: number = Date.now(),
  config: SessionModePolicyConfig = DEFAULT_SESSION_MODE_POLICY_CONFIG
): { state: SessionModeState; recentErrorCount: number } {
  const prunedErrors = pruneRecentErrors(
    state.recentErrorTimestamps,
    nowMs,
    config.recentErrorWindow.windowMs
  )
  const recentErrorCount = prunedErrors.length
  const nextMode = computeNextSessionMode(
    { currentMode: state.mode, masteryScore, recentErrorCount },
    config
  )

  const updatedState: SessionModeState = {
    ...state,
    mode: nextMode,
    recentErrorTimestamps: prunedErrors,
    lastUpdatedAt: nowMs,
  }

  saveSessionModeState(updatedState)

  return { state: updatedState, recentErrorCount }
}

export function recordSessionModeError(
  state: SessionModeState,
  masteryScore: number,
  nowMs: number = Date.now(),
  config: SessionModePolicyConfig = DEFAULT_SESSION_MODE_POLICY_CONFIG
): { state: SessionModeState; recentErrorCount: number } {
  const updatedErrors = [...state.recentErrorTimestamps, nowMs]
  const prunedErrors = pruneRecentErrors(
    updatedErrors,
    nowMs,
    config.recentErrorWindow.windowMs
  )
  const recentErrorCount = prunedErrors.length
  const nextMode = computeNextSessionMode(
    { currentMode: state.mode, masteryScore, recentErrorCount },
    config
  )

  const updatedState: SessionModeState = {
    ...state,
    mode: nextMode,
    recentErrorTimestamps: prunedErrors,
    lastUpdatedAt: nowMs,
  }

  saveSessionModeState(updatedState)

  return { state: updatedState, recentErrorCount }
}

export function getModePresentationConfig(
  mode: SessionMode,
  config: SessionModePolicyConfig = DEFAULT_SESSION_MODE_POLICY_CONFIG
): SessionModePresentationConfig {
  return config.presentation[mode]
}

export function getVisibleStepIndexes(
  visibility: StepVisibilityConfig,
  currentStep: number,
  totalSteps: number
): number[] {
  if (totalSteps <= 0) return []

  if (visibility.mode === 'none') return []

  const normalizedCurrent = Math.min(Math.max(currentStep, 0), totalSteps - 1)

  if (visibility.mode === 'all') {
    return Array.from({ length: totalSteps }, (_, idx) => idx)
  }

  const windowConfig = visibility.window || { previous: 0, next: 0 }
  const startIndex = Math.max(0, normalizedCurrent - windowConfig.previous)
  const endIndex = Math.min(totalSteps - 1, normalizedCurrent + windowConfig.next)

  return Array.from({ length: endIndex - startIndex + 1 }, (_, idx) => startIndex + idx)
}
