/**
 * Circuit Breaker Service
 *
 * Implements the state machine for detecting recurring errors
 * and triggering remedial drill interventions.
 */

import type {
  ErrorTag,
  SessionError,
  ErrorTagCount,
  CircuitBreakerState,
  CircuitBreakerSessionState,
  InterventionThreshold,
  ThresholdEvaluation,
  CompletedIntervention,
  DrillTask,
} from '@/types/circuitBreaker'
import { DEFAULT_THRESHOLDS, ERROR_TAG_LABELS } from '@/types/circuitBreaker'
import { getDrillsForTag } from './drillBank'

const STORAGE_KEY = 'physiscaffold_circuit_breaker'
const STORAGE_VERSION = 1

interface CircuitBreakerStorage {
  version: number
  sessions: CircuitBreakerSessionState[]
}

class CircuitBreakerService {
  private thresholds: InterventionThreshold[] = DEFAULT_THRESHOLDS

  // ============================================
  // Storage Operations
  // ============================================

  private getStorage(): CircuitBreakerStorage {
    if (typeof window === 'undefined') {
      return { version: STORAGE_VERSION, sessions: [] }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return { version: STORAGE_VERSION, sessions: [] }
      }

      const data = JSON.parse(stored)
      if (data.version !== STORAGE_VERSION) {
        return { version: STORAGE_VERSION, sessions: [] }
      }

      return data
    } catch (error) {
      console.error('Error reading circuit breaker state:', error)
      return { version: STORAGE_VERSION, sessions: [] }
    }
  }

  private saveStorage(storage: CircuitBreakerStorage): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
    } catch (error) {
      console.error('Error saving circuit breaker state:', error)
    }
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Get or create a session for a problem
   */
  getOrCreateSession(sessionId: string, problemId: string): CircuitBreakerSessionState {
    const storage = this.getStorage()
    let session = storage.sessions.find(
      (s) => s.sessionId === sessionId && s.problemId === problemId
    )

    if (!session) {
      session = {
        sessionId,
        problemId,
        state: 'MONITORING',
        errors: [],
        errorCounts: [],
        interventionHistory: [],
        cooldowns: [],
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
      }
      storage.sessions.push(session)
      this.saveStorage(storage)
    }

    return session
  }

  /**
   * Get current session state
   */
  getSession(sessionId: string, problemId: string): CircuitBreakerSessionState | null {
    const storage = this.getStorage()
    return (
      storage.sessions.find((s) => s.sessionId === sessionId && s.problemId === problemId) || null
    )
  }

  /**
   * Update and persist session state
   */
  private updateSession(session: CircuitBreakerSessionState): void {
    const storage = this.getStorage()
    const index = storage.sessions.findIndex(
      (s) => s.sessionId === session.sessionId && s.problemId === session.problemId
    )

    session.lastUpdatedAt = new Date().toISOString()

    if (index >= 0) {
      storage.sessions[index] = session
    } else {
      storage.sessions.push(session)
    }

    this.saveStorage(storage)
  }

  // ============================================
  // Error Recording
  // ============================================

  /**
   * Record an error occurrence and evaluate thresholds
   */
  recordError(
    sessionId: string,
    problemId: string,
    errorTag: ErrorTag,
    stepId: number,
    source: SessionError['source'],
    context?: string
  ): ThresholdEvaluation {
    const session = this.getOrCreateSession(sessionId, problemId)

    // If currently drilling, don't record new errors
    if (session.state === 'DRILLING') {
      return {
        shouldIntervene: false,
        state: session.state,
        message: 'Complete the current drill first.',
      }
    }

    // Create error record
    const error: SessionError = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      errorTag,
      stepId,
      timestamp: new Date().toISOString(),
      source,
      problemId,
      context,
    }

    session.errors.push(error)

    // Update error count
    this.updateErrorCount(session, error)

    // Clean expired cooldowns
    this.cleanExpiredCooldowns(session)

    // Evaluate thresholds
    const evaluation = this.evaluateThresholds(session)

    // Update session state based on evaluation
    if (evaluation.state !== session.state) {
      session.state = evaluation.state
    }

    this.updateSession(session)

    return evaluation
  }

  /**
   * Update error count for a specific tag
   */
  private updateErrorCount(session: CircuitBreakerSessionState, error: SessionError): void {
    let tagCount = session.errorCounts.find((ec) => ec.errorTag === error.errorTag)

    if (tagCount) {
      tagCount.count++
      tagCount.lastOccurrence = error.timestamp
      if (!tagCount.stepIds.includes(error.stepId)) {
        tagCount.stepIds.push(error.stepId)
      }
    } else {
      session.errorCounts.push({
        errorTag: error.errorTag,
        count: 1,
        stepIds: [error.stepId],
        firstOccurrence: error.timestamp,
        lastOccurrence: error.timestamp,
      })
    }
  }

  // ============================================
  // Threshold Evaluation
  // ============================================

  /**
   * Get threshold configuration for a specific error tag
   */
  private getThreshold(errorTag: ErrorTag): InterventionThreshold {
    const threshold = this.thresholds.find((t) => t.errorTag === errorTag)
    // Default fallback if tag not configured
    return threshold || { errorTag, warningCount: 3, tripCount: 4, cooldownMinutes: 30 }
  }

  /**
   * Check if a tag is currently in cooldown
   */
  private isInCooldown(session: CircuitBreakerSessionState, errorTag: ErrorTag): boolean {
    const cooldown = session.cooldowns.find((c) => c.errorTag === errorTag)
    if (!cooldown) return false

    return new Date(cooldown.expiresAt).getTime() > Date.now()
  }

  /**
   * Clean expired cooldowns from session
   */
  private cleanExpiredCooldowns(session: CircuitBreakerSessionState): void {
    const now = Date.now()
    session.cooldowns = session.cooldowns.filter(
      (c) => new Date(c.expiresAt).getTime() > now
    )
  }

  /**
   * Evaluate all error counts against thresholds
   */
  private evaluateThresholds(session: CircuitBreakerSessionState): ThresholdEvaluation {
    // Sort by count descending to find most problematic tag first
    const sortedCounts = [...session.errorCounts].sort((a, b) => b.count - a.count)

    for (const errorCount of sortedCounts) {
      const threshold = this.getThreshold(errorCount.errorTag)

      // Skip if in cooldown
      if (this.isInCooldown(session, errorCount.errorTag)) {
        continue
      }

      // TRIP: Count >= tripCount
      if (errorCount.count >= threshold.tripCount) {
        const drill = this.selectDrill(errorCount.errorTag)

        return {
          shouldIntervene: true,
          state: 'TRIPPED',
          triggeringTag: errorCount.errorTag,
          message: this.generateTripMessage(errorCount.errorTag, errorCount.count),
          suggestedDrillId: drill?.id,
        }
      }

      // WARNING: Count >= warningCount
      if (errorCount.count >= threshold.warningCount) {
        return {
          shouldIntervene: false,
          state: 'WARNING',
          triggeringTag: errorCount.errorTag,
          message: this.generateWarningMessage(errorCount.errorTag, errorCount.count, threshold),
        }
      }
    }

    // No thresholds crossed
    return {
      shouldIntervene: false,
      state: 'MONITORING',
    }
  }

  /**
   * Generate user-facing message for WARNING state
   */
  private generateWarningMessage(
    errorTag: ErrorTag,
    count: number,
    threshold: InterventionThreshold
  ): string {
    const label = ERROR_TAG_LABELS[errorTag]
    const remaining = threshold.tripCount - count

    if (remaining === 1) {
      return `Heads up: One more ${label} error will trigger a quick practice drill.`
    }
    return `Watch out: ${label} errors appearing (${count}/${threshold.tripCount}). A drill may help.`
  }

  /**
   * Generate user-facing message for TRIPPED state
   */
  private generateTripMessage(errorTag: ErrorTag, count: number): string {
    const label = ERROR_TAG_LABELS[errorTag]
    return `Let's pause and strengthen your ${label} skills. Complete this quick drill to continue.`
  }

  // ============================================
  // Drill Selection
  // ============================================

  /**
   * Select an appropriate drill for the error tag
   */
  selectDrill(errorTag: ErrorTag): DrillTask | null {
    const drills = getDrillsForTag(errorTag)
    if (drills.length === 0) return null

    // For now, select randomly. Future: consider student history, difficulty progression
    const randomIndex = Math.floor(Math.random() * drills.length)
    return drills[randomIndex]
  }

  /**
   * Get a specific drill by ID
   */
  getDrillById(drillId: string): DrillTask | null {
    // Import all drills and search
    const allTags: ErrorTag[] = [
      'vector_component',
      'sign_convention',
      'trig_identity',
      'unit_conversion',
      'algebra_manipulation',
      'conservation_scope',
      'reference_frame',
      'force_enumeration',
    ]

    for (const tag of allTags) {
      const drills = getDrillsForTag(tag)
      const drill = drills.find((d) => d.id === drillId)
      if (drill) return drill
    }

    return null
  }

  // ============================================
  // Drill Lifecycle
  // ============================================

  /**
   * Start a drill intervention
   */
  startDrill(sessionId: string, problemId: string, drill: DrillTask): boolean {
    const session = this.getSession(sessionId, problemId)
    if (!session) return false

    if (session.state !== 'TRIPPED') {
      console.warn('Cannot start drill: session not in TRIPPED state')
      return false
    }

    session.state = 'DRILLING'
    session.currentIntervention = {
      triggeredBy: drill.linkedErrorTag,
      drillId: drill.id,
      startedAt: new Date().toISOString(),
      attemptCount: 0,
    }

    this.updateSession(session)
    return true
  }

  /**
   * Record a drill attempt
   */
  recordDrillAttempt(sessionId: string, problemId: string, isCorrect: boolean): boolean {
    const session = this.getSession(sessionId, problemId)
    if (!session || !session.currentIntervention) return false

    session.currentIntervention.attemptCount++

    this.updateSession(session)
    return true
  }

  /**
   * Complete a drill and return to problem
   */
  completeDrill(sessionId: string, problemId: string, success: boolean): CircuitBreakerSessionState | null {
    const session = this.getSession(sessionId, problemId)
    if (!session || !session.currentIntervention) return null

    const intervention = session.currentIntervention

    // Record in history
    const completed: CompletedIntervention = {
      errorTag: intervention.triggeredBy,
      drillId: intervention.drillId,
      startedAt: intervention.startedAt,
      completedAt: new Date().toISOString(),
      success,
      attemptsUsed: intervention.attemptCount,
    }
    session.interventionHistory.push(completed)

    // Add cooldown for this tag
    const threshold = this.getThreshold(intervention.triggeredBy)
    session.cooldowns.push({
      errorTag: intervention.triggeredBy,
      expiresAt: new Date(Date.now() + threshold.cooldownMinutes * 60 * 1000).toISOString(),
    })

    // Reset error count for this tag (fresh start)
    const tagCount = session.errorCounts.find((ec) => ec.errorTag === intervention.triggeredBy)
    if (tagCount) {
      tagCount.count = 0
      tagCount.stepIds = []
    }

    // Clear intervention and transition to RECOVERED
    session.currentIntervention = undefined
    session.state = 'RECOVERED'

    this.updateSession(session)

    // Auto-transition to MONITORING after a tick
    setTimeout(() => {
      const s = this.getSession(sessionId, problemId)
      if (s && s.state === 'RECOVERED') {
        s.state = 'MONITORING'
        this.updateSession(s)
      }
    }, 100)

    return session
  }

  /**
   * Force recover from a drill (e.g., user skips)
   */
  skipDrill(sessionId: string, problemId: string): boolean {
    const session = this.getSession(sessionId, problemId)
    if (!session || !session.currentIntervention) return false

    // Record as failed
    return this.completeDrill(sessionId, problemId, false) !== null
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get the current state for a session
   */
  getCurrentState(sessionId: string, problemId: string): CircuitBreakerState {
    const session = this.getSession(sessionId, problemId)
    return session?.state || 'MONITORING'
  }

  /**
   * Check if problem is currently locked
   */
  isProblemLocked(sessionId: string, problemId: string): boolean {
    const state = this.getCurrentState(sessionId, problemId)
    return state === 'TRIPPED' || state === 'DRILLING'
  }

  /**
   * Get error summary for a session
   */
  getErrorSummary(
    sessionId: string,
    problemId: string
  ): { tag: ErrorTag; count: number; label: string }[] {
    const session = this.getSession(sessionId, problemId)
    if (!session) return []

    return session.errorCounts.map((ec) => ({
      tag: ec.errorTag,
      count: ec.count,
      label: ERROR_TAG_LABELS[ec.errorTag],
    }))
  }

  /**
   * Get intervention history for a session
   */
  getInterventionHistory(sessionId: string, problemId: string): CompletedIntervention[] {
    const session = this.getSession(sessionId, problemId)
    return session?.interventionHistory || []
  }

  /**
   * Get overall statistics across all sessions
   */
  getStatistics(): {
    totalInterventions: number
    successRate: number
    mostCommonTag: ErrorTag | null
    tagBreakdown: { tag: ErrorTag; count: number }[]
  } {
    const storage = this.getStorage()

    const allInterventions = storage.sessions.flatMap((s) => s.interventionHistory)
    const totalInterventions = allInterventions.length
    const successCount = allInterventions.filter((i) => i.success).length
    const successRate = totalInterventions > 0 ? successCount / totalInterventions : 0

    // Count by tag
    const tagCounts = new Map<ErrorTag, number>()
    allInterventions.forEach((i) => {
      tagCounts.set(i.errorTag, (tagCounts.get(i.errorTag) || 0) + 1)
    })

    const tagBreakdown = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)

    return {
      totalInterventions,
      successRate,
      mostCommonTag: tagBreakdown[0]?.tag || null,
      tagBreakdown,
    }
  }

  // ============================================
  // Configuration
  // ============================================

  /**
   * Override default thresholds
   */
  setThresholds(thresholds: InterventionThreshold[]): void {
    this.thresholds = thresholds
  }

  /**
   * Reset thresholds to defaults
   */
  resetThresholds(): void {
    this.thresholds = DEFAULT_THRESHOLDS
  }

  /**
   * Clear all session data (for testing/reset)
   */
  clearAllSessions(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const circuitBreakerService = new CircuitBreakerService()
