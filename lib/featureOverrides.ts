/**
 * Feature Overrides
 *
 * Provides localStorage-based feature flag overrides for development testing.
 * These overrides only affect client-side flag checks.
 */

import { useState, useEffect } from 'react'
import { FEATURE_FLAGS, isFeatureEnabled } from './featureFlags'

const OVERRIDE_STORAGE_KEY = 'physiscaffold_feature_overrides'

export type FlagName = keyof typeof FEATURE_FLAGS

interface FlagOverrides {
  [key: string]: boolean
}

/**
 * Get all stored feature overrides from localStorage
 */
export function getFeatureOverrides(): FlagOverrides {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(OVERRIDE_STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

/**
 * Set a feature override in localStorage
 */
export function setFeatureOverride(flagName: string, value: boolean | null): void {
  if (typeof window === 'undefined') return
  try {
    const overrides = getFeatureOverrides()
    if (value === null) {
      delete overrides[flagName]
    } else {
      overrides[flagName] = value
    }
    localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(overrides))
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear all feature overrides
 */
export function clearFeatureOverrides(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(OVERRIDE_STORAGE_KEY)
  } catch {
    // Ignore storage errors
  }
}

/**
 * Get the effective value of a feature flag, considering any localStorage override.
 * This is the main function to use in components.
 */
export function getFeatureValue(flagName: FlagName): boolean {
  const overrides = getFeatureOverrides()
  if (flagName in overrides) {
    return overrides[flagName]
  }
  return isFeatureEnabled(flagName)
}

/**
 * React hook for using feature flags with override support.
 * Returns the effective value (override if set, otherwise actual flag value).
 *
 * @example
 * function MyComponent() {
 *   const isEnabled = useFeatureOverride('DASHBOARD_V3')
 *   if (!isEnabled) return null
 *   return <Dashboard />
 * }
 */
export function useFeatureOverride(flagName: FlagName): boolean {
  const [value, setValue] = useState<boolean>(() => isFeatureEnabled(flagName))

  useEffect(() => {
    // Check for override on client side
    setValue(getFeatureValue(flagName))

    // Listen for storage changes from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === OVERRIDE_STORAGE_KEY) {
        setValue(getFeatureValue(flagName))
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [flagName])

  return value
}

/**
 * React hook that returns override state and setter.
 * Use this when you need to both read and modify override state.
 */
export function useFeatureOverrideControl(flagName: FlagName): {
  value: boolean
  override: boolean | null
  setOverride: (value: boolean | null) => void
} {
  const [override, setOverrideState] = useState<boolean | null>(null)
  const [actualValue, setActualValue] = useState<boolean>(() => isFeatureEnabled(flagName))

  useEffect(() => {
    const overrides = getFeatureOverrides()
    setOverrideState(overrides[flagName] ?? null)
    setActualValue(isFeatureEnabled(flagName))
  }, [flagName])

  const setOverride = (value: boolean | null) => {
    setFeatureOverride(flagName, value)
    setOverrideState(value)
  }

  const effectiveValue = override ?? actualValue

  return { value: effectiveValue, override, setOverride }
}
