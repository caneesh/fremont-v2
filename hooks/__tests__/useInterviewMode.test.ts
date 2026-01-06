import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useInterviewMode, DEFAULT_INTERVIEW_CONFIG } from '../useInterviewMode'

// Mock localStorage
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

// Setup global mocks
beforeEach(() => {
  // @ts-ignore
  global.localStorage = localStorageMock
  localStorageMock.clear()
})

afterEach(() => {
  localStorageMock.clear()
})

describe('useInterviewMode', () => {
  describe('Initialization', () => {
    it('should initialize with default config', () => {
      const { result } = renderHook(() => useInterviewMode())

      expect(result.current.config).toEqual(DEFAULT_INTERVIEW_CONFIG)
      expect(result.current.isEnabled).toBe(false)
    })

    it('should have correct default values', () => {
      const { result } = renderHook(() => useInterviewMode())

      expect(result.current.config.enabled).toBe(false)
      expect(result.current.config.timerEnabled).toBe(true)
      expect(result.current.config.timeLimitMinutes).toBe(30)
      expect(result.current.config.hintsHidden).toBe(true)
      expect(result.current.config.explanationsRequired).toBe(true)
    })

    it('should load config from localStorage on mount', () => {
      // Pre-set localStorage
      const savedConfig = {
        enabled: true,
        timerEnabled: false,
        timeLimitMinutes: 45,
        hintsHidden: false,
        explanationsRequired: true,
      }
      localStorageMock.setItem('interview_mode_config', JSON.stringify(savedConfig))

      const { result } = renderHook(() => useInterviewMode())

      // After hydration, should have saved config
      expect(result.current.config.enabled).toBe(true)
      expect(result.current.config.timerEnabled).toBe(false)
      expect(result.current.config.timeLimitMinutes).toBe(45)
      expect(result.current.config.hintsHidden).toBe(false)
    })

    it('should handle corrupted localStorage gracefully', () => {
      localStorageMock.setItem('interview_mode_config', 'invalid-json')

      const { result } = renderHook(() => useInterviewMode())

      // Should fall back to defaults
      expect(result.current.config).toEqual(DEFAULT_INTERVIEW_CONFIG)
    })

    it('should merge partial saved config with defaults', () => {
      // Only save some fields
      const partialConfig = {
        enabled: true,
        timeLimitMinutes: 60,
      }
      localStorageMock.setItem('interview_mode_config', JSON.stringify(partialConfig))

      const { result } = renderHook(() => useInterviewMode())

      expect(result.current.config.enabled).toBe(true)
      expect(result.current.config.timeLimitMinutes).toBe(60)
      // Should have defaults for other fields
      expect(result.current.config.timerEnabled).toBe(true)
      expect(result.current.config.hintsHidden).toBe(true)
    })
  })

  describe('updateConfig', () => {
    it('should update single config field', () => {
      const { result } = renderHook(() => useInterviewMode())

      act(() => {
        result.current.updateConfig({ timeLimitMinutes: 45 })
      })

      expect(result.current.config.timeLimitMinutes).toBe(45)
      // Other fields unchanged
      expect(result.current.config.enabled).toBe(false)
      expect(result.current.config.timerEnabled).toBe(true)
    })

    it('should update multiple config fields', () => {
      const { result } = renderHook(() => useInterviewMode())

      act(() => {
        result.current.updateConfig({
          enabled: true,
          timeLimitMinutes: 60,
          hintsHidden: false,
        })
      })

      expect(result.current.config.enabled).toBe(true)
      expect(result.current.config.timeLimitMinutes).toBe(60)
      expect(result.current.config.hintsHidden).toBe(false)
    })

    it('should persist changes to localStorage', () => {
      const { result } = renderHook(() => useInterviewMode())

      act(() => {
        result.current.updateConfig({ enabled: true })
      })

      const saved = JSON.parse(localStorageMock.getItem('interview_mode_config') || '{}')
      expect(saved.enabled).toBe(true)
    })

    it('should update isEnabled when enabled changes', () => {
      const { result } = renderHook(() => useInterviewMode())

      expect(result.current.isEnabled).toBe(false)

      act(() => {
        result.current.updateConfig({ enabled: true })
      })

      expect(result.current.isEnabled).toBe(true)
    })
  })

  describe('toggleEnabled', () => {
    it('should toggle enabled from false to true', () => {
      const { result } = renderHook(() => useInterviewMode())

      expect(result.current.config.enabled).toBe(false)

      act(() => {
        result.current.toggleEnabled()
      })

      expect(result.current.config.enabled).toBe(true)
      expect(result.current.isEnabled).toBe(true)
    })

    it('should toggle enabled from true to false', () => {
      const { result } = renderHook(() => useInterviewMode())

      act(() => {
        result.current.updateConfig({ enabled: true })
      })

      expect(result.current.config.enabled).toBe(true)

      act(() => {
        result.current.toggleEnabled()
      })

      expect(result.current.config.enabled).toBe(false)
      expect(result.current.isEnabled).toBe(false)
    })

    it('should persist toggle to localStorage', () => {
      const { result } = renderHook(() => useInterviewMode())

      act(() => {
        result.current.toggleEnabled()
      })

      const saved = JSON.parse(localStorageMock.getItem('interview_mode_config') || '{}')
      expect(saved.enabled).toBe(true)
    })
  })

  describe('reset', () => {
    it('should reset config to defaults', () => {
      const { result } = renderHook(() => useInterviewMode())

      // Modify config
      act(() => {
        result.current.updateConfig({
          enabled: true,
          timeLimitMinutes: 60,
          hintsHidden: false,
          explanationsRequired: false,
        })
      })

      expect(result.current.config.enabled).toBe(true)
      expect(result.current.config.timeLimitMinutes).toBe(60)

      // Reset
      act(() => {
        result.current.reset()
      })

      expect(result.current.config).toEqual(DEFAULT_INTERVIEW_CONFIG)
    })

    it('should persist reset to localStorage', () => {
      const { result } = renderHook(() => useInterviewMode())

      act(() => {
        result.current.updateConfig({ enabled: true })
      })

      act(() => {
        result.current.reset()
      })

      const saved = JSON.parse(localStorageMock.getItem('interview_mode_config') || '{}')
      expect(saved.enabled).toBe(false)
    })
  })

  describe('toInterviewConfig', () => {
    it('should convert to InterviewConfig format', () => {
      const { result } = renderHook(() => useInterviewMode())

      act(() => {
        result.current.updateConfig({
          timerEnabled: true,
          timeLimitMinutes: 30,
          hintsHidden: true,
          explanationsRequired: true,
        })
      })

      const interviewConfig = result.current.toInterviewConfig()

      expect(interviewConfig.timerEnabled).toBe(true)
      expect(interviewConfig.timeLimitSeconds).toBe(1800) // 30 * 60
      expect(interviewConfig.hintsHidden).toBe(true)
      expect(interviewConfig.explanationsRequired).toBe(true)
      expect(interviewConfig.rubricScoringEnabled).toBe(true)
    })

    it('should convert time limit correctly', () => {
      const { result } = renderHook(() => useInterviewMode())

      act(() => {
        result.current.updateConfig({ timeLimitMinutes: 45 })
      })

      const interviewConfig = result.current.toInterviewConfig()
      expect(interviewConfig.timeLimitSeconds).toBe(2700) // 45 * 60
    })

    it('should always enable rubric scoring', () => {
      const { result } = renderHook(() => useInterviewMode())

      const interviewConfig = result.current.toInterviewConfig()
      expect(interviewConfig.rubricScoringEnabled).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid updates', () => {
      const { result } = renderHook(() => useInterviewMode())

      act(() => {
        result.current.updateConfig({ timeLimitMinutes: 10 })
        result.current.updateConfig({ timeLimitMinutes: 20 })
        result.current.updateConfig({ timeLimitMinutes: 30 })
      })

      expect(result.current.config.timeLimitMinutes).toBe(30)
    })

    it('should handle toggle followed by update', () => {
      const { result } = renderHook(() => useInterviewMode())

      act(() => {
        result.current.toggleEnabled()
        result.current.updateConfig({ timeLimitMinutes: 45 })
      })

      expect(result.current.config.enabled).toBe(true)
      expect(result.current.config.timeLimitMinutes).toBe(45)
    })

    it('should preserve other fields when updating one field', () => {
      const { result } = renderHook(() => useInterviewMode())

      act(() => {
        result.current.updateConfig({
          enabled: true,
          timeLimitMinutes: 60,
          hintsHidden: false,
        })
      })

      act(() => {
        result.current.updateConfig({ timerEnabled: false })
      })

      // Original changes preserved
      expect(result.current.config.enabled).toBe(true)
      expect(result.current.config.timeLimitMinutes).toBe(60)
      expect(result.current.config.hintsHidden).toBe(false)
      // New change applied
      expect(result.current.config.timerEnabled).toBe(false)
    })
  })
})
