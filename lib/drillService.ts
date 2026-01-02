/**
 * Drill Service
 *
 * Handles drill session management, progress tracking, and analytics
 * for the Micro-Pattern Drills feature.
 */

import type {
  Drill,
  DrillItem,
  DrillItemResult,
  DrillSessionState,
  DrillSessionSummary,
  DrillProgress,
  DrillOverallProgress,
  DEFAULT_ITEM_TIME_LIMIT,
  WEAK_ACCURACY_THRESHOLD,
  STRONG_ACCURACY_THRESHOLD,
} from '@/types/drill'
import { eventLogger } from '@/lib/storage'

// ============================================
// Storage Keys
// ============================================

const STORAGE_KEYS = {
  DRILL_PROGRESS: 'physiscaffold_drill_progress',
  ACTIVE_SESSION: 'physiscaffold_drill_active_session',
} as const

// ============================================
// Session Management
// ============================================

/**
 * Create a new drill session
 */
export function createDrillSession(drill: Drill): DrillSessionState {
  const session: DrillSessionState = {
    drillId: drill.id,
    patternId: drill.patternId,
    currentIndex: 0,
    totalItems: drill.items.length,
    results: [],
    startedAt: new Date().toISOString(),
    isComplete: false,
  }

  // Save to storage
  saveActiveSession(session)

  // Log analytics event
  logDrillStarted(drill.id, drill.patternId, drill.items.length)

  return session
}

/**
 * Record an item result and advance session
 */
export function recordItemResult(
  session: DrillSessionState,
  result: DrillItemResult
): DrillSessionState {
  const updatedSession: DrillSessionState = {
    ...session,
    currentIndex: session.currentIndex + 1,
    results: [...session.results, result],
    isComplete: session.currentIndex + 1 >= session.totalItems,
  }

  // Save to storage
  saveActiveSession(updatedSession)

  // Log analytics event
  logDrillItemCompleted(
    session.drillId,
    session.patternId,
    result.itemId,
    session.currentIndex,
    session.totalItems,
    result.correct,
    result.timeMs,
    result.timedOut
  )

  return updatedSession
}

/**
 * Calculate session summary from results
 */
export function calculateSessionSummary(
  session: DrillSessionState
): DrillSessionSummary {
  const results = session.results
  const correctCount = results.filter((r) => r.correct).length
  const timedOutCount = results.filter((r) => r.timedOut).length
  const totalTimeMs = results.reduce((sum, r) => sum + r.timeMs, 0)
  const averageTimeMs = results.length > 0 ? totalTimeMs / results.length : 0

  // Get wrong item IDs for redo
  const wrongItemIds = results
    .filter((r) => !r.correct)
    .map((r) => r.itemId)

  // Get slowest items
  const sortedByTime = [...results].sort((a, b) => b.timeMs - a.timeMs)
  const slowestItems = sortedByTime.slice(0, 3).map((r) => ({
    itemId: r.itemId,
    timeMs: r.timeMs,
  }))

  const summary: DrillSessionSummary = {
    drillId: session.drillId,
    patternId: session.patternId,
    correctCount,
    totalItems: session.totalItems,
    accuracy: session.totalItems > 0 ? (correctCount / session.totalItems) * 100 : 0,
    averageTimeMs: Math.round(averageTimeMs),
    totalTimeMs,
    timedOutCount,
    wrongItemIds,
    slowestItems,
    completedAt: new Date().toISOString(),
  }

  return summary
}

/**
 * Complete a drill session and save progress
 */
export function completeDrillSession(
  session: DrillSessionState
): DrillSessionSummary {
  const summary = calculateSessionSummary(session)

  // Update progress
  updateDrillProgress(summary)

  // Clear active session
  clearActiveSession()

  // Log analytics event
  logDrillCompleted(
    session.drillId,
    session.patternId,
    summary.accuracy,
    summary.averageTimeMs,
    summary.totalTimeMs
  )

  return summary
}

/**
 * Abandon current drill session
 */
export function abandonDrillSession(session: DrillSessionState): void {
  clearActiveSession()

  // Log analytics event
  logDrillAbandoned(
    session.drillId,
    session.patternId,
    session.currentIndex,
    session.totalItems
  )
}

// ============================================
// Progress Tracking
// ============================================

/**
 * Get drill progress from storage
 */
export function getDrillProgress(): DrillOverallProgress {
  if (typeof window === 'undefined') {
    return createEmptyProgress()
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.DRILL_PROGRESS)
    if (!stored) {
      return createEmptyProgress()
    }
    return JSON.parse(stored) as DrillOverallProgress
  } catch {
    return createEmptyProgress()
  }
}

/**
 * Update progress after completing a drill
 */
export function updateDrillProgress(summary: DrillSessionSummary): void {
  if (typeof window === 'undefined') return

  const progress = getDrillProgress()

  // Update or create pattern progress
  const patternProgress = progress.byPattern[summary.patternId] || {
    drillId: summary.drillId,
    patternId: summary.patternId,
    completionCount: 0,
    bestAccuracy: 0,
    bestAverageTimeMs: Infinity,
    lastAttemptAt: '',
    recentSessions: [],
  }

  patternProgress.completionCount += 1
  patternProgress.bestAccuracy = Math.max(patternProgress.bestAccuracy, summary.accuracy)
  patternProgress.bestAverageTimeMs = Math.min(
    patternProgress.bestAverageTimeMs === Infinity ? summary.averageTimeMs : patternProgress.bestAverageTimeMs,
    summary.averageTimeMs
  )
  patternProgress.lastAttemptAt = summary.completedAt
  patternProgress.recentSessions = [summary, ...patternProgress.recentSessions].slice(0, 5)

  progress.byPattern[summary.patternId] = patternProgress

  // Update overall stats
  progress.totalDrillsCompleted += 1
  progress.totalItemsAnswered += summary.totalItems

  // Recalculate overall accuracy and average time
  const allSessions = Object.values(progress.byPattern).flatMap((p) => p.recentSessions)
  if (allSessions.length > 0) {
    const totalCorrect = allSessions.reduce((sum, s) => sum + s.correctCount, 0)
    const totalItems = allSessions.reduce((sum, s) => sum + s.totalItems, 0)
    progress.overallAccuracy = totalItems > 0 ? (totalCorrect / totalItems) * 100 : 0

    const totalTime = allSessions.reduce((sum, s) => sum + s.averageTimeMs * s.totalItems, 0)
    progress.overallAverageTimeMs = totalItems > 0 ? totalTime / totalItems : 0
  }

  // Update weak/strong patterns
  progress.weakPatternIds = Object.entries(progress.byPattern)
    .filter(([, p]) => p.bestAccuracy < 70)
    .map(([id]) => id)

  progress.strongPatternIds = Object.entries(progress.byPattern)
    .filter(([, p]) => p.bestAccuracy >= 90)
    .map(([id]) => id)

  // Save to storage
  try {
    localStorage.setItem(STORAGE_KEYS.DRILL_PROGRESS, JSON.stringify(progress))
  } catch (e) {
    console.error('Failed to save drill progress:', e)
  }
}

/**
 * Create empty progress object
 */
function createEmptyProgress(): DrillOverallProgress {
  return {
    totalDrillsCompleted: 0,
    totalItemsAnswered: 0,
    overallAccuracy: 0,
    overallAverageTimeMs: 0,
    byPattern: {},
    weakPatternIds: [],
    strongPatternIds: [],
  }
}

// ============================================
// Session Storage
// ============================================

/**
 * Save active session to storage
 */
function saveActiveSession(session: DrillSessionState): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, JSON.stringify(session))
  } catch (e) {
    console.error('Failed to save active session:', e)
  }
}

/**
 * Get active session from storage
 */
export function getActiveSession(): DrillSessionState | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION)
    if (!stored) return null
    return JSON.parse(stored) as DrillSessionState
  } catch {
    return null
  }
}

/**
 * Clear active session from storage
 */
function clearActiveSession(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION)
  } catch (e) {
    console.error('Failed to clear active session:', e)
  }
}

// ============================================
// Answer Validation
// ============================================

/**
 * Check if an answer is correct
 */
export function checkAnswer(
  item: DrillItem,
  userAnswer: string
): boolean {
  const normalizedAnswer = userAnswer.trim().toLowerCase()
  const normalizedCorrect = item.correctAnswer.trim().toLowerCase()

  if (item.type === 'mcq') {
    // For MCQ, check exact match with correct choice
    return normalizedAnswer === normalizedCorrect
  }

  // For short answer, try various matching strategies
  // Exact match
  if (normalizedAnswer === normalizedCorrect) {
    return true
  }

  // Try numeric comparison for numeric answers
  const userNum = parseFloat(normalizedAnswer)
  const correctNum = parseFloat(normalizedCorrect)
  if (!isNaN(userNum) && !isNaN(correctNum)) {
    // Allow 1% tolerance for numeric answers
    return Math.abs(userNum - correctNum) / Math.abs(correctNum) < 0.01
  }

  return false
}

// ============================================
// Analytics
// ============================================

/**
 * Log drill started event
 */
function logDrillStarted(drillId: string, patternId: string, itemCount: number): void {
  eventLogger.log('drill_started', {
    drillId,
    patternId,
    totalItems: itemCount,
  })
}

/**
 * Log drill item completed event
 */
function logDrillItemCompleted(
  drillId: string,
  patternId: string,
  itemId: string,
  itemIndex: number,
  totalItems: number,
  correct: boolean,
  timeMs: number,
  timedOut: boolean
): void {
  eventLogger.log('drill_item_completed', {
    drillId,
    patternId,
    itemId,
    itemIndex,
    totalItems,
    correct,
    duration: timeMs,
    timedOut,
  })
}

/**
 * Log drill completed event
 */
function logDrillCompleted(
  drillId: string,
  patternId: string,
  accuracy: number,
  averageTimeMs: number,
  totalTimeMs: number
): void {
  eventLogger.log('drill_completed', {
    drillId,
    patternId,
    accuracy: Math.round(accuracy),
    averageTimeMs: Math.round(averageTimeMs),
    duration: totalTimeMs,
  })
}

/**
 * Log drill abandoned event
 */
function logDrillAbandoned(
  drillId: string,
  patternId: string,
  completedItems: number,
  totalItems: number
): void {
  eventLogger.log('drill_abandoned', {
    drillId,
    patternId,
    completedItems,
    totalItems,
  })
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get time limit for an item
 */
export function getItemTimeLimit(item: DrillItem): number {
  return item.timeLimitSeconds || 20
}

/**
 * Format time in seconds for display
 */
export function formatTimeDisplay(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  return `${seconds}s`
}

/**
 * Get performance label based on accuracy
 */
export function getPerformanceLabel(accuracy: number): {
  label: string
  color: string
} {
  if (accuracy >= 90) {
    return { label: 'Excellent', color: 'text-green-600' }
  }
  if (accuracy >= 70) {
    return { label: 'Good', color: 'text-blue-600' }
  }
  if (accuracy >= 50) {
    return { label: 'Needs Practice', color: 'text-amber-600' }
  }
  return { label: 'Keep Practicing', color: 'text-red-600' }
}
