/**
 * Debug/Refactor Service
 *
 * Wires the debug/refactor policy with storage and provides
 * a clean API for the UI layer.
 */

import type {
  DebugProblem,
  RefactorProblem,
  ModeSubmissionResult,
} from '@/types/debugRefactorMode'

import {
  type DebugSession,
  type RefactorSession,
  type TestResult,
  createDebugSession,
  createRefactorSession,
  advanceDebugStep,
  advanceRefactorStep,
  recordFixAttempt,
  recordRefactorAttempt,
  recordHintUsage,
  evaluateDebugSubmission,
  evaluateRefactorSubmission,
  calculateDebugScore,
  calculateRefactorScore,
  getDebugProgress,
  getRefactorProgress,
  isDebugSessionComplete,
  isRefactorSessionComplete,
  getAvailableHints,
  getRemainingAttempts,
  getGradeFromScore,
  canCompleteDebugStep,
  canCompleteRefactorStep,
  DEBUG_STEP_ORDER,
  REFACTOR_STEP_ORDER,
} from '@/lib/core/policies/debug-refactor-policy'

// =============================================================================
// STORAGE (localStorage-based)
// =============================================================================

const DEBUG_STORAGE_PREFIX = 'debug_session_'
const REFACTOR_STORAGE_PREFIX = 'refactor_session_'

function getDebugStorageKey(sessionId: string): string {
  return `${DEBUG_STORAGE_PREFIX}${sessionId}`
}

function getRefactorStorageKey(sessionId: string): string {
  return `${REFACTOR_STORAGE_PREFIX}${sessionId}`
}

function loadDebugSession(sessionId: string): DebugSession | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(getDebugStorageKey(sessionId))
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('[DebugRefactor] Failed to load debug session:', error)
  }

  return null
}

function loadRefactorSession(sessionId: string): RefactorSession | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(getRefactorStorageKey(sessionId))
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('[DebugRefactor] Failed to load refactor session:', error)
  }

  return null
}

function saveDebugSession(sessionId: string, session: DebugSession): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(getDebugStorageKey(sessionId), JSON.stringify(session))
  } catch (error) {
    console.error('[DebugRefactor] Failed to save debug session:', error)
  }
}

function saveRefactorSession(sessionId: string, session: RefactorSession): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(getRefactorStorageKey(sessionId), JSON.stringify(session))
  } catch (error) {
    console.error('[DebugRefactor] Failed to save refactor session:', error)
  }
}

function clearDebugSession(sessionId: string): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(getDebugStorageKey(sessionId))
  } catch (error) {
    console.error('[DebugRefactor] Failed to clear debug session:', error)
  }
}

function clearRefactorSession(sessionId: string): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(getRefactorStorageKey(sessionId))
  } catch (error) {
    console.error('[DebugRefactor] Failed to clear refactor session:', error)
  }
}

// =============================================================================
// SERVICE INTERFACE
// =============================================================================

export interface DebugRefactorService {
  // Debug Mode
  startDebugSession(sessionId: string, problemId: string): DebugSession
  getDebugSession(sessionId: string): DebugSession | null
  advanceDebug(
    sessionId: string,
    input?: { hypothesis?: string; reflection?: string }
  ): DebugSession | null
  submitDebugFix(
    sessionId: string,
    testResults: readonly TestResult[],
    bugTagsFound: readonly string[]
  ): DebugSession | null
  useDebugHint(sessionId: string): DebugSession | null
  evaluateDebug(sessionId: string, problem: DebugProblem): ModeSubmissionResult | null
  getDebugScore(
    sessionId: string,
    problem: DebugProblem
  ): ReturnType<typeof calculateDebugScore> | null

  // Refactor Mode
  startRefactorSession(sessionId: string, problemId: string): RefactorSession
  getRefactorSession(sessionId: string): RefactorSession | null
  advanceRefactor(
    sessionId: string,
    input?: { smells?: readonly string[]; reflection?: string }
  ): RefactorSession | null
  submitRefactor(
    sessionId: string,
    testResults: readonly TestResult[],
    styleGoalsMet: readonly string[]
  ): RefactorSession | null
  evaluateRefactor(
    sessionId: string,
    problem: RefactorProblem
  ): ModeSubmissionResult | null
  getRefactorScore(
    sessionId: string,
    problem: RefactorProblem
  ): ReturnType<typeof calculateRefactorScore> | null

  // Shared utilities
  getProgress(sessionId: string, mode: 'debug' | 'refactor'): number
  isComplete(sessionId: string, mode: 'debug' | 'refactor'): boolean
  getRemainingAttempts(sessionId: string, mode: 'debug' | 'refactor'): number
  getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F'
  canAdvance(
    sessionId: string,
    mode: 'debug' | 'refactor',
    input?: { hypothesis?: string; smells?: readonly string[]; reflection?: string }
  ): { canComplete: boolean; reason?: string }
  clearSession(sessionId: string, mode: 'debug' | 'refactor'): void
  getHints(sessionId: string, problem: DebugProblem): ReturnType<typeof getAvailableHints>
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

function createDebugRefactorService(): DebugRefactorService {
  // In-memory cache for SSR
  const debugCache = new Map<string, DebugSession>()
  const refactorCache = new Map<string, RefactorSession>()

  const getDebug = (sessionId: string): DebugSession | null => {
    if (debugCache.has(sessionId)) {
      return debugCache.get(sessionId)!
    }

    const stored = loadDebugSession(sessionId)
    if (stored) {
      debugCache.set(sessionId, stored)
      return stored
    }

    return null
  }

  const setDebug = (sessionId: string, session: DebugSession): void => {
    debugCache.set(sessionId, session)
    saveDebugSession(sessionId, session)
  }

  const getRefactor = (sessionId: string): RefactorSession | null => {
    if (refactorCache.has(sessionId)) {
      return refactorCache.get(sessionId)!
    }

    const stored = loadRefactorSession(sessionId)
    if (stored) {
      refactorCache.set(sessionId, stored)
      return stored
    }

    return null
  }

  const setRefactor = (sessionId: string, session: RefactorSession): void => {
    refactorCache.set(sessionId, session)
    saveRefactorSession(sessionId, session)
  }

  return {
    // ========== DEBUG MODE ==========

    startDebugSession(sessionId: string, problemId: string): DebugSession {
      const existing = getDebug(sessionId)
      if (existing && existing.problemId === problemId) {
        return existing
      }

      const session = createDebugSession(problemId)
      setDebug(sessionId, session)
      return session
    },

    getDebugSession(sessionId: string): DebugSession | null {
      return getDebug(sessionId)
    },

    advanceDebug(
      sessionId: string,
      input?: { hypothesis?: string; reflection?: string }
    ): DebugSession | null {
      const session = getDebug(sessionId)
      if (!session) return null

      const updatedSession = advanceDebugStep(session, input)
      setDebug(sessionId, updatedSession)
      return updatedSession
    },

    submitDebugFix(
      sessionId: string,
      testResults: readonly TestResult[],
      bugTagsFound: readonly string[]
    ): DebugSession | null {
      const session = getDebug(sessionId)
      if (!session) return null

      const updatedSession = recordFixAttempt(session, testResults, bugTagsFound)
      setDebug(sessionId, updatedSession)
      return updatedSession
    },

    useDebugHint(sessionId: string): DebugSession | null {
      const session = getDebug(sessionId)
      if (!session) return null

      const updatedSession = recordHintUsage(session)
      setDebug(sessionId, updatedSession)
      return updatedSession
    },

    evaluateDebug(
      sessionId: string,
      problem: DebugProblem
    ): ModeSubmissionResult | null {
      const session = getDebug(sessionId)
      if (!session) return null

      return evaluateDebugSubmission(session, problem)
    },

    getDebugScore(
      sessionId: string,
      problem: DebugProblem
    ): ReturnType<typeof calculateDebugScore> | null {
      const session = getDebug(sessionId)
      if (!session) return null

      return calculateDebugScore(session, problem)
    },

    // ========== REFACTOR MODE ==========

    startRefactorSession(sessionId: string, problemId: string): RefactorSession {
      const existing = getRefactor(sessionId)
      if (existing && existing.problemId === problemId) {
        return existing
      }

      const session = createRefactorSession(problemId)
      setRefactor(sessionId, session)
      return session
    },

    getRefactorSession(sessionId: string): RefactorSession | null {
      return getRefactor(sessionId)
    },

    advanceRefactor(
      sessionId: string,
      input?: { smells?: readonly string[]; reflection?: string }
    ): RefactorSession | null {
      const session = getRefactor(sessionId)
      if (!session) return null

      const updatedSession = advanceRefactorStep(session, input)
      setRefactor(sessionId, updatedSession)
      return updatedSession
    },

    submitRefactor(
      sessionId: string,
      testResults: readonly TestResult[],
      styleGoalsMet: readonly string[]
    ): RefactorSession | null {
      const session = getRefactor(sessionId)
      if (!session) return null

      const updatedSession = recordRefactorAttempt(session, testResults, styleGoalsMet)
      setRefactor(sessionId, updatedSession)
      return updatedSession
    },

    evaluateRefactor(
      sessionId: string,
      problem: RefactorProblem
    ): ModeSubmissionResult | null {
      const session = getRefactor(sessionId)
      if (!session) return null

      return evaluateRefactorSubmission(session, problem)
    },

    getRefactorScore(
      sessionId: string,
      problem: RefactorProblem
    ): ReturnType<typeof calculateRefactorScore> | null {
      const session = getRefactor(sessionId)
      if (!session) return null

      return calculateRefactorScore(session, problem)
    },

    // ========== SHARED UTILITIES ==========

    getProgress(sessionId: string, mode: 'debug' | 'refactor'): number {
      if (mode === 'debug') {
        const session = getDebug(sessionId)
        return session ? getDebugProgress(session) : 0
      } else {
        const session = getRefactor(sessionId)
        return session ? getRefactorProgress(session) : 0
      }
    },

    isComplete(sessionId: string, mode: 'debug' | 'refactor'): boolean {
      if (mode === 'debug') {
        const session = getDebug(sessionId)
        return session ? isDebugSessionComplete(session) : false
      } else {
        const session = getRefactor(sessionId)
        return session ? isRefactorSessionComplete(session) : false
      }
    },

    getRemainingAttempts(sessionId: string, mode: 'debug' | 'refactor'): number {
      if (mode === 'debug') {
        const session = getDebug(sessionId)
        return session ? getRemainingAttempts(session) : 0
      } else {
        const session = getRefactor(sessionId)
        return session ? getRemainingAttempts(session) : 0
      }
    },

    getGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
      return getGradeFromScore(score)
    },

    canAdvance(
      sessionId: string,
      mode: 'debug' | 'refactor',
      input?: { hypothesis?: string; smells?: readonly string[]; reflection?: string }
    ): { canComplete: boolean; reason?: string } {
      if (mode === 'debug') {
        const session = getDebug(sessionId)
        if (!session) return { canComplete: false, reason: 'No session found' }
        return canCompleteDebugStep(session, session.currentStep, input)
      } else {
        const session = getRefactor(sessionId)
        if (!session) return { canComplete: false, reason: 'No session found' }
        return canCompleteRefactorStep(session, session.currentStep, input)
      }
    },

    clearSession(sessionId: string, mode: 'debug' | 'refactor'): void {
      if (mode === 'debug') {
        debugCache.delete(sessionId)
        clearDebugSession(sessionId)
      } else {
        refactorCache.delete(sessionId)
        clearRefactorSession(sessionId)
      }
    },

    getHints(
      sessionId: string,
      problem: DebugProblem
    ): ReturnType<typeof getAvailableHints> {
      const session = getDebug(sessionId)
      if (!session) return []
      return getAvailableHints(session, problem)
    },
  }
}

// Export singleton instance
export const debugRefactorService = createDebugRefactorService()

// Re-export types and constants
export type { DebugSession, RefactorSession, TestResult }
export { DEBUG_STEP_ORDER, REFACTOR_STEP_ORDER }
