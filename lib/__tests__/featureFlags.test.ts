import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('featureFlags', () => {
  const ENV_KEY = 'NEXT_PUBLIC_FEATURE_REVEAL_RECONSTRUCT_VALIDATE'
  let originalValue: string | undefined

  beforeEach(() => {
    originalValue = process.env[ENV_KEY]
  })

  afterEach(() => {
    process.env[ENV_KEY] = originalValue
    vi.resetModules()
  })

  it('defaults to enabled when env var is unset', async () => {
    delete process.env[ENV_KEY]
    vi.resetModules()

    const { FEATURE_FLAGS } = await import('../featureFlags')
    expect(FEATURE_FLAGS.REVEAL_RECONSTRUCT_VALIDATE).toBe(true)
  })

  it('disables when env var is "false"', async () => {
    process.env[ENV_KEY] = 'false'
    vi.resetModules()

    const { FEATURE_FLAGS } = await import('../featureFlags')
    expect(FEATURE_FLAGS.REVEAL_RECONSTRUCT_VALIDATE).toBe(false)
  })

  it('isFeatureEnabled returns false for unknown keys at runtime', async () => {
    vi.resetModules()

    const { isFeatureEnabled } = await import('../featureFlags')
    expect(isFeatureEnabled('NOT_A_REAL_FLAG' as any)).toBe(false)
  })
})

