import { describe, it, expect } from 'vitest'
import {
  INITIAL_PATTERN_FIRST_GATE_STATE,
  patternFirstGateReducer,
} from '../patternFirstGateMachine'

describe('patternFirstGateMachine', () => {
  it('starts unlocked', () => {
    expect(INITIAL_PATTERN_FIRST_GATE_STATE).toEqual({
      status: 'unlocked',
      unlockedBy: null,
    })
  })

  it('transitions locked → unlocked (selection)', () => {
    const locked = patternFirstGateReducer(INITIAL_PATTERN_FIRST_GATE_STATE, { type: 'LOCK' })
    expect(locked.status).toBe('locked')

    const unlocked = patternFirstGateReducer(locked, { type: 'UNLOCK_SELECTION' })
    expect(unlocked).toEqual({ status: 'unlocked', unlockedBy: 'selection' })
  })

  it('transitions locked → unlocked (timeout)', () => {
    const locked = patternFirstGateReducer(INITIAL_PATTERN_FIRST_GATE_STATE, { type: 'LOCK' })
    const unlocked = patternFirstGateReducer(locked, { type: 'UNLOCK_TIMEOUT' })
    expect(unlocked).toEqual({ status: 'unlocked', unlockedBy: 'timeout' })
  })

  it('is idempotent when already unlocked', () => {
    const unlocked1 = patternFirstGateReducer(INITIAL_PATTERN_FIRST_GATE_STATE, { type: 'UNLOCK_TIMEOUT' })
    const unlocked2 = patternFirstGateReducer(unlocked1, { type: 'UNLOCK_SELECTION' })
    expect(unlocked2).toBe(unlocked1)
  })
})

