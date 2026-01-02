export type PatternFirstGateUnlockReason = 'selection' | 'timeout'

export interface PatternFirstGateState {
  status: 'locked' | 'unlocked'
  unlockedBy: PatternFirstGateUnlockReason | null
}

export type PatternFirstGateAction =
  | { type: 'LOCK' }
  | { type: 'UNLOCK_SELECTION' }
  | { type: 'UNLOCK_TIMEOUT' }

export const INITIAL_PATTERN_FIRST_GATE_STATE: PatternFirstGateState = {
  status: 'unlocked',
  unlockedBy: null,
}

export function patternFirstGateReducer(
  state: PatternFirstGateState,
  action: PatternFirstGateAction
): PatternFirstGateState {
  switch (action.type) {
    case 'LOCK':
      return { status: 'locked', unlockedBy: null }
    case 'UNLOCK_SELECTION':
      if (state.status === 'unlocked') return state
      return { status: 'unlocked', unlockedBy: 'selection' }
    case 'UNLOCK_TIMEOUT':
      if (state.status === 'unlocked') return state
      return { status: 'unlocked', unlockedBy: 'timeout' }
    default:
      return state
  }
}

