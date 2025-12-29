import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  simpleHash,
  generateProblemId,
  generateProblemTitle,
  checkLocalStorageAvailable,
  getLocalStorageSize,
  hasLocalStorageSpace,
} from '../utils'

describe('utils', () => {
  describe('simpleHash', () => {
    it('produces a stable hash for the same input', () => {
      expect(simpleHash('hello world')).toBe('to5x38')
      expect(simpleHash('hello world')).toBe(simpleHash('hello world'))
    })
  })

  describe('generateProblemId', () => {
    it('prefixes the hash with problem_', () => {
      const id = generateProblemId('A block slides down an incline.')
      expect(id.startsWith('problem_')).toBe(true)
    })
  })

  describe('generateProblemTitle', () => {
    it('truncates long titles and adds ellipsis', () => {
      const longText = 'a'.repeat(120)
      const title = generateProblemTitle(longText)
      expect(title.length).toBe(103)
      expect(title.endsWith('...')).toBe(true)
    })

    it('keeps short titles unchanged', () => {
      const title = generateProblemTitle('Short prompt')
      expect(title).toBe('Short prompt')
    })
  })

  describe('localStorage helpers', () => {
    let originalWindow: any
    let originalLocalStorage: Storage

    beforeEach(() => {
      originalWindow = global.window
      originalLocalStorage = global.localStorage
    })

    afterEach(() => {
      global.window = originalWindow
      global.localStorage = originalLocalStorage
    })

    it('reports unavailable when window is undefined', () => {
      // @ts-ignore
      global.window = undefined
      const result = checkLocalStorageAvailable()
      expect(result.available).toBe(false)
      expect(result.error).toBe('Not in browser environment')
    })

    it('reports available when localStorage works', () => {
      const result = checkLocalStorageAvailable()
      expect(result.available).toBe(true)
    })

    it('reports unavailable when localStorage throws', () => {
      const failingStorage = {
        setItem: () => {
          throw new Error('Denied')
        },
        removeItem: () => undefined,
      } as unknown as Storage

      global.localStorage = failingStorage

      const result = checkLocalStorageAvailable()
      expect(result.available).toBe(false)
      expect(result.error).toContain('Denied')
    })

    it('estimates localStorage size from stored keys', () => {
      localStorage.clear()
      localStorage.setItem('alpha', '12345')
      localStorage.setItem('beta', 'xyz')

      const size = getLocalStorageSize()
      expect(size).toBeGreaterThan(0)
      expect(size).toBeGreaterThanOrEqual(
        'alpha'.length + '12345'.length + 'beta'.length + 'xyz'.length
      )
    })

    it('checks against the warning threshold', () => {
      localStorage.clear()
      expect(hasLocalStorageSpace()).toBe(true)
    })
  })
})
