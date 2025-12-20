/**
 * Generates a simple hash from a string
 * This is a basic implementation for creating unique IDs from problem text
 */
export function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Generates a unique problem ID from problem text
 */
export function generateProblemId(problemText: string): string {
  const hash = simpleHash(problemText)
  return `problem_${hash}`
}

/**
 * Generates a display title from problem text
 */
export function generateProblemTitle(problemText: string): string {
  return problemText.slice(0, 100) + (problemText.length > 100 ? '...' : '')
}

/**
 * Checks if localStorage is available and has space
 */
export function checkLocalStorageAvailable(): { available: boolean; error?: string } {
  if (typeof window === 'undefined') {
    return { available: false, error: 'Not in browser environment' }
  }

  try {
    const testKey = '__localStorage_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return { available: true }
  } catch (e) {
    return {
      available: false,
      error: e instanceof Error ? e.message : 'localStorage not available'
    }
  }
}

/**
 * Estimates localStorage usage
 */
export function getLocalStorageSize(): number {
  if (typeof window === 'undefined') return 0

  let total = 0
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length
    }
  }
  return total
}

/**
 * Checks if there's enough space in localStorage
 * Typical quota is 5-10MB, we'll warn at 4MB
 */
export function hasLocalStorageSpace(): boolean {
  const WARNING_THRESHOLD = 4 * 1024 * 1024 // 4MB in bytes
  return getLocalStorageSize() < WARNING_THRESHOLD
}
