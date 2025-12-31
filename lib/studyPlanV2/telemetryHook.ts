/**
 * Study Plan v2 Telemetry Hook
 *
 * Integration point for recording step attempts from the existing
 * problem solver into the Study Plan v2 system.
 */

import { studyPlanV2Service } from './studyPlanV2Service'
import { authService } from '@/lib/auth/authService'
import { FEATURE_FLAGS } from '@/lib/featureFlags'

/**
 * Record a step completion event for Study Plan v2 tracking.
 *
 * Call this after a step is completed (correct or incorrect) to update
 * mastery scores and track mistakes for error recycling.
 */
export function recordStepCompletionV2(params: {
  problemId: string
  stepIndex: number
  isCorrect: boolean
  hintCount: number
  usedReveal: boolean
  timeSpentSeconds: number
  confidenceRating?: 'low' | 'medium' | 'high'
}): void {
  // Only record if feature is enabled
  if (!FEATURE_FLAGS.STUDY_PLAN_V2) {
    return
  }

  try {
    const userId = authService.getUserId() || 'default-user'

    studyPlanV2Service.recordStepAttempt(
      userId,
      params.problemId,
      params.stepIndex,
      params.isCorrect,
      params.hintCount,
      params.usedReveal,
      params.timeSpentSeconds,
      params.confidenceRating
    )

    if (process.env.NODE_ENV === 'development') {
      console.log('[StudyPlanV2] Step attempt recorded:', {
        problemId: params.problemId,
        stepIndex: params.stepIndex,
        isCorrect: params.isCorrect,
        hintCount: params.hintCount,
      })
    }
  } catch (error) {
    console.error('[StudyPlanV2] Failed to record step attempt:', error)
  }
}

/**
 * Check if we're currently in a v2 session.
 *
 * Used to determine whether to show v2-specific UI elements
 * and track data accordingly.
 */
export function isInV2Session(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const sessionData = sessionStorage.getItem('v2_session')
    return sessionData !== null
  } catch {
    return false
  }
}

/**
 * Get current v2 session info if available.
 */
export function getV2SessionInfo(): {
  patternId?: string
  problemIds: string[]
  currentIndex: number
  type: string
  itemId?: string
  mistakeTypeId?: string
} | null {
  if (typeof window === 'undefined') return null

  try {
    const sessionData = sessionStorage.getItem('v2_session')
    if (!sessionData) return null

    return JSON.parse(sessionData)
  } catch {
    return null
  }
}

/**
 * Advance to the next problem in a v2 session.
 *
 * Returns the next problem ID, or null if session is complete.
 */
export function advanceV2Session(): string | null {
  const session = getV2SessionInfo()
  if (!session) return null

  const nextIndex = session.currentIndex + 1
  if (nextIndex >= session.problemIds.length) {
    const userId = authService.getUserId() || 'default-user'

    // Session complete - mark plan item as completed (if from daily plan)
    if (session.itemId) {
      studyPlanV2Service.completePlanItem(userId, session.itemId)
    }

    // Mark pattern session as complete (learn/practice/drill)
    if (session.patternId && session.type) {
      const sessionType = session.type as 'learn' | 'practice' | 'drill'
      studyPlanV2Service.markPatternSessionComplete(userId, session.patternId, sessionType)
    }

    // Clear session
    sessionStorage.removeItem('v2_session')
    return null
  }

  // Update session with new index
  session.currentIndex = nextIndex
  sessionStorage.setItem('v2_session', JSON.stringify(session))

  return session.problemIds[nextIndex]
}

/**
 * Clear the current v2 session.
 */
export function clearV2Session(): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('v2_session')
  }
}

/**
 * Mark the current v2 session as completed successfully.
 */
export function completeV2Session(): void {
  const session = getV2SessionInfo()
  if (!session) return

  const userId = authService.getUserId() || 'default-user'

  // Mark plan item as completed if we have an item ID
  if (session.itemId) {
    studyPlanV2Service.completePlanItem(userId, session.itemId)
  }

  // Mark pattern session as complete (learn/practice/drill)
  if (session.patternId && session.type) {
    const sessionType = session.type as 'learn' | 'practice' | 'drill'
    studyPlanV2Service.markPatternSessionComplete(userId, session.patternId, sessionType)
  }

  clearV2Session()
}
