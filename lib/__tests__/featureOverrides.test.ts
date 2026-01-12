import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import {
  clearFeatureOverrides,
  getFeatureOverrides,
  getFeatureValue,
  setFeatureOverride,
  useFeatureOverride,
  useFeatureOverrideControl,
} from '../featureOverrides'

const OVERRIDE_STORAGE_KEY = 'physiscaffold_feature_overrides'

const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

describe('featureOverrides', () => {
  let originalWindow: any
  let originalLocalStorage: Storage

  beforeEach(() => {
    originalWindow = global.window
    originalLocalStorage = global.localStorage

    // @ts-ignore
    global.localStorage = localStorageMock
    localStorageMock.clear()
    clearFeatureOverrides()
  })

  afterEach(() => {
    localStorageMock.clear()
    global.window = originalWindow
    global.localStorage = originalLocalStorage
  })

  describe('getFeatureOverrides', () => {
    it('returns empty object on server (no window)', () => {
      // @ts-ignore
      global.window = undefined
      expect(getFeatureOverrides()).toEqual({})
    })

    it('returns empty object when nothing stored', () => {
      expect(getFeatureOverrides()).toEqual({})
    })

    it('returns empty object when JSON is invalid', () => {
      localStorage.setItem(OVERRIDE_STORAGE_KEY, '{not valid json')
      expect(getFeatureOverrides()).toEqual({})
    })

    it('parses stored overrides', () => {
      localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify({ FBD_CANVAS: true }))
      expect(getFeatureOverrides()).toEqual({ FBD_CANVAS: true })
    })
  })

  describe('setFeatureOverride / clearFeatureOverrides', () => {
    it('sets and clears a single flag override', () => {
      setFeatureOverride('FBD_CANVAS', true)
      expect(getFeatureOverrides()).toEqual({ FBD_CANVAS: true })

      setFeatureOverride('FBD_CANVAS', null)
      expect(getFeatureOverrides()).toEqual({})
    })

    it('clears all overrides', () => {
      setFeatureOverride('FBD_CANVAS', true)
      setFeatureOverride('MICRO_TASKS', false)
      expect(Object.keys(getFeatureOverrides()).sort()).toEqual(['FBD_CANVAS', 'MICRO_TASKS'])

      clearFeatureOverrides()
      expect(getFeatureOverrides()).toEqual({})
    })
  })

  describe('getFeatureValue', () => {
    it('prefers override when present', () => {
      expect(getFeatureValue('FBD_CANVAS')).toBe(false)
      setFeatureOverride('FBD_CANVAS', true)
      expect(getFeatureValue('FBD_CANVAS')).toBe(true)
    })
  })

  describe('useFeatureOverride', () => {
    it('applies override after mount', async () => {
      setFeatureOverride('FBD_CANVAS', true)

      const { result } = renderHook(() => useFeatureOverride('FBD_CANVAS'))

      await waitFor(() => {
        expect(result.current).toBe(true)
      })
    })

    it('updates when a storage event is received', async () => {
      const { result } = renderHook(() => useFeatureOverride('FBD_CANVAS'))

      await waitFor(() => {
        expect(result.current).toBe(false)
      })

      act(() => {
        setFeatureOverride('FBD_CANVAS', true)
        const e = new Event('storage') as any
        e.key = OVERRIDE_STORAGE_KEY
        window.dispatchEvent(e)
      })

      await waitFor(() => {
        expect(result.current).toBe(true)
      })
    })
  })

  describe('useFeatureOverrideControl', () => {
    it('returns override state and setter', async () => {
      const { result } = renderHook(() => useFeatureOverrideControl('FBD_CANVAS'))

      await waitFor(() => {
        expect(result.current.override).toBeNull()
        expect(result.current.value).toBe(false)
      })

      act(() => {
        result.current.setOverride(true)
      })

      expect(result.current.override).toBe(true)
      expect(result.current.value).toBe(true)
      expect(getFeatureOverrides()).toEqual({ FBD_CANVAS: true })

      act(() => {
        result.current.setOverride(null)
      })

      expect(result.current.override).toBeNull()
      expect(result.current.value).toBe(false)
      expect(getFeatureOverrides()).toEqual({})
    })
  })
})

