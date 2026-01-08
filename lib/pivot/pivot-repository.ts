/**
 * Pivot Repository
 *
 * localStorage-based implementation for pivot session state.
 * Implements PivotRepository interface from use-cases.
 */

import type { PivotSessionState } from '@/types/pivot'
import type { PivotRepository, PivotAnalytics } from '@/lib/core/use-cases/pivot'

const STORAGE_PREFIX = 'pivot_session_'

/**
 * In-memory cache for server-side rendering
 */
const memoryCache = new Map<string, PivotSessionState>()
const lastPivotTimes = new Map<string, string>()

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * LocalStorage-based pivot repository
 */
export class LocalStoragePivotRepository implements PivotRepository {
  async getSessionState(sessionId: string): Promise<PivotSessionState | null> {
    // Try memory cache first
    if (memoryCache.has(sessionId)) {
      return memoryCache.get(sessionId)!
    }

    if (!isLocalStorageAvailable()) {
      return null
    }

    const key = `${STORAGE_PREFIX}${sessionId}`
    const stored = localStorage.getItem(key)

    if (!stored) {
      return null
    }

    try {
      const state = JSON.parse(stored) as PivotSessionState
      memoryCache.set(sessionId, state)
      return state
    } catch {
      return null
    }
  }

  async saveSessionState(state: PivotSessionState): Promise<PivotSessionState> {
    // Update memory cache
    memoryCache.set(state.sessionId, state)

    // Update last pivot time if showing
    const showingStep = state.stepPivotStates.find(s => s.status === 'showing')
    if (showingStep?.triggeredAt) {
      lastPivotTimes.set(state.sessionId, showingStep.triggeredAt)
    }

    if (isLocalStorageAvailable()) {
      const key = `${STORAGE_PREFIX}${state.sessionId}`
      localStorage.setItem(key, JSON.stringify(state))
    }

    return state
  }

  async getLastPivotTime(sessionId: string): Promise<string | null> {
    // Check memory first
    if (lastPivotTimes.has(sessionId)) {
      return lastPivotTimes.get(sessionId)!
    }

    // Check stored state
    const state = await this.getSessionState(sessionId)
    if (!state) return null

    // Find most recent triggered pivot
    let latestTime: string | null = null
    for (const stepState of state.stepPivotStates) {
      if (stepState.triggeredAt) {
        if (!latestTime || stepState.triggeredAt > latestTime) {
          latestTime = stepState.triggeredAt
        }
      }
    }

    if (latestTime) {
      lastPivotTimes.set(sessionId, latestTime)
    }

    return latestTime
  }

  /**
   * Clear session state (for testing/reset)
   */
  async clearSessionState(sessionId: string): Promise<void> {
    memoryCache.delete(sessionId)
    lastPivotTimes.delete(sessionId)

    if (isLocalStorageAvailable()) {
      const key = `${STORAGE_PREFIX}${sessionId}`
      localStorage.removeItem(key)
    }
  }
}

/**
 * Console-based analytics for development
 */
export class ConsolePivotAnalytics implements PivotAnalytics {
  trackPivotTriggered(
    sessionId: string,
    stepIndex: number,
    pivotId: string,
    reason: string
  ): void {
    console.log('[Pivot Analytics] Triggered:', {
      sessionId,
      stepIndex,
      pivotId,
      reason,
      timestamp: new Date().toISOString(),
    })
  }

  trackPivotAnswered(
    sessionId: string,
    stepIndex: number,
    pivotId: string,
    wasHelpful: boolean
  ): void {
    console.log('[Pivot Analytics] Answered:', {
      sessionId,
      stepIndex,
      pivotId,
      wasHelpful,
      timestamp: new Date().toISOString(),
    })
  }

  trackPivotSkipped(
    sessionId: string,
    stepIndex: number,
    pivotId: string
  ): void {
    console.log('[Pivot Analytics] Skipped:', {
      sessionId,
      stepIndex,
      pivotId,
      timestamp: new Date().toISOString(),
    })
  }
}

// Singleton instances
export const pivotRepository = new LocalStoragePivotRepository()
export const pivotAnalytics = new ConsolePivotAnalytics()
