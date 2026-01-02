import { describe, it, expect } from 'vitest'
import {
  computeNextSessionMode,
  getModePresentationConfig,
  getVisibleStepIndexes,
} from '../sessionModePolicyEngine'
import { DEFAULT_SESSION_MODE_POLICY_CONFIG } from '@/types/sessionMode'

describe('SessionModePolicyEngine', () => {
  it('promotes guided to assisted at mastery threshold', () => {
    const nextMode = computeNextSessionMode(
      { currentMode: 'guided', masteryScore: 0.6, recentErrorCount: 0 },
      DEFAULT_SESSION_MODE_POLICY_CONFIG
    )

    expect(nextMode).toBe('assisted')
  })

  it('keeps guided below mastery threshold', () => {
    const nextMode = computeNextSessionMode(
      { currentMode: 'guided', masteryScore: 0.59, recentErrorCount: 0 },
      DEFAULT_SESSION_MODE_POLICY_CONFIG
    )

    expect(nextMode).toBe('guided')
  })

  it('promotes assisted to exam when mastery and errors allow', () => {
    const nextMode = computeNextSessionMode(
      { currentMode: 'assisted', masteryScore: 0.75, recentErrorCount: 1 },
      DEFAULT_SESSION_MODE_POLICY_CONFIG
    )

    expect(nextMode).toBe('exam')
  })

  it('blocks exam promotion when recent errors are too high', () => {
    const nextMode = computeNextSessionMode(
      { currentMode: 'assisted', masteryScore: 0.9, recentErrorCount: 2 },
      DEFAULT_SESSION_MODE_POLICY_CONFIG
    )

    expect(nextMode).toBe('assisted')
  })

  it('regresses exam to assisted when errors spike', () => {
    const nextMode = computeNextSessionMode(
      { currentMode: 'exam', masteryScore: 0.9, recentErrorCount: 2 },
      DEFAULT_SESSION_MODE_POLICY_CONFIG
    )

    expect(nextMode).toBe('assisted')
  })

  it('regresses assisted to guided when errors spike', () => {
    const nextMode = computeNextSessionMode(
      { currentMode: 'assisted', masteryScore: 0.9, recentErrorCount: 3 },
      DEFAULT_SESSION_MODE_POLICY_CONFIG
    )

    expect(nextMode).toBe('guided')
  })

  it('does not jump directly from guided to exam', () => {
    const nextMode = computeNextSessionMode(
      { currentMode: 'guided', masteryScore: 0.95, recentErrorCount: 0 },
      DEFAULT_SESSION_MODE_POLICY_CONFIG
    )

    expect(nextMode).toBe('assisted')
  })

  it('exposes per-mode presentation caps', () => {
    const guidedConfig = getModePresentationConfig('guided')
    const assistedConfig = getModePresentationConfig('assisted')
    const examConfig = getModePresentationConfig('exam')

    expect(guidedConfig.maxHintLevel).toBe(4)
    expect(assistedConfig.maxHintLevel).toBe(3)
    expect(examConfig.maxHintLevel).toBe(0)
    expect(guidedConfig.professorVisibility).toBe('always')
    expect(assistedConfig.professorVisibility).toBe('on_error')
    expect(examConfig.professorVisibility).toBe('never')
  })

  it('limits visible steps for assisted mode windowing', () => {
    const assistedVisibility = getModePresentationConfig('assisted').stepVisibility
    const visible = getVisibleStepIndexes(assistedVisibility, 2, 5)

    expect(visible).toEqual([1, 2])
  })

  it('shows all steps in guided mode', () => {
    const guidedVisibility = getModePresentationConfig('guided').stepVisibility
    const visible = getVisibleStepIndexes(guidedVisibility, 1, 3)

    expect(visible).toEqual([0, 1, 2])
  })

  it('shows no steps in exam mode', () => {
    const examVisibility = getModePresentationConfig('exam').stepVisibility
    const visible = getVisibleStepIndexes(examVisibility, 1, 3)

    expect(visible).toEqual([])
  })
})
