/**
 * Event Logger Service
 *
 * High-level API for logging learning events.
 * Uses StorageProvider under the hood.
 */

import { localStorageProvider } from './LocalStorageProvider'
import type { StorageProvider } from './StorageProvider'
import type { EventType, EventMetadata, StoredEvent, StorageResult } from './types'

class EventLoggerService {
  private provider: StorageProvider
  private initialized = false
  private pendingEvents: Array<{ type: EventType; metadata?: EventMetadata }> = []

  constructor(provider: StorageProvider = localStorageProvider) {
    this.provider = provider
  }

  /**
   * Initialize the event logger
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    await this.provider.initialize({
      maxEventsToStore: 1000,
      eventRetentionDays: 30,
      debugMode: process.env.NODE_ENV === 'development'
    })

    // Flush any pending events
    for (const { type, metadata } of this.pendingEvents) {
      this.provider.logEvent(type, metadata)
    }
    this.pendingEvents = []

    this.initialized = true
  }

  /**
   * Log a generic event
   */
  log(type: EventType, metadata?: EventMetadata): StorageResult<StoredEvent> {
    if (!this.initialized) {
      // Queue event for later if not initialized
      this.pendingEvents.push({ type, metadata })
      return { success: true, data: undefined }
    }

    return this.provider.logEvent(type, metadata)
  }

  // ============================================
  // Problem Events
  // ============================================

  /**
   * Log when a problem is started
   */
  problemStarted(problemId: string, problemTitle?: string): StorageResult<StoredEvent> {
    return this.log('problem_started', { problemId, problemTitle })
  }

  /**
   * Log when a draft is saved
   */
  draftSaved(problemId: string): StorageResult<StoredEvent> {
    return this.log('problem_saved_draft', { problemId })
  }

  /**
   * Log when a problem is marked as solved
   */
  problemSolved(problemId: string, duration?: number): StorageResult<StoredEvent> {
    return this.log('problem_marked_solved', { problemId, duration })
  }

  /**
   * Log when a problem is deleted
   */
  problemDeleted(problemId: string): StorageResult<StoredEvent> {
    return this.log('problem_deleted', { problemId })
  }

  // ============================================
  // Step Events
  // ============================================

  /**
   * Log when a step is activated
   */
  stepActivated(problemId: string, stepId: number): StorageResult<StoredEvent> {
    return this.log('step_activated', { problemId, stepId })
  }

  /**
   * Log when a step is completed
   */
  stepCompleted(problemId: string, stepId: number, duration?: number): StorageResult<StoredEvent> {
    return this.log('step_completed', { problemId, stepId, duration })
  }

  /**
   * Log when a step attempt fails
   */
  stepFailed(problemId: string, stepId: number, attemptNumber: number): StorageResult<StoredEvent> {
    return this.log('step_failed', { problemId, stepId, attemptNumber })
  }

  // ============================================
  // Hint Events
  // ============================================

  /**
   * Log when a hint is unlocked
   */
  hintUnlocked(problemId: string, stepId: number, level: number): StorageResult<StoredEvent> {
    return this.log('hint_unlocked', { problemId, stepId, level })
  }

  /**
   * Log when a hint is viewed
   */
  hintViewed(problemId: string, stepId: number, level: number): StorageResult<StoredEvent> {
    return this.log('hint_viewed', { problemId, stepId, level })
  }

  // ============================================
  // Micro-Task Events
  // ============================================

  /**
   * Log when a task is attempted
   */
  taskAttempted(
    problemId: string,
    stepId: number,
    level: number,
    taskType: string,
    attemptNumber: number
  ): StorageResult<StoredEvent> {
    return this.log('task_attempted', {
      problemId,
      stepId,
      level,
      taskType,
      attemptNumber
    })
  }

  /**
   * Log when a task is answered correctly
   */
  taskCorrect(
    problemId: string,
    stepId: number,
    level: number,
    taskType: string,
    attemptNumber: number
  ): StorageResult<StoredEvent> {
    return this.log('task_correct', {
      problemId,
      stepId,
      level,
      taskType,
      attemptNumber,
      isCorrect: true
    })
  }

  /**
   * Log when a task is answered incorrectly
   */
  taskIncorrect(
    problemId: string,
    stepId: number,
    level: number,
    taskType: string,
    attemptNumber: number
  ): StorageResult<StoredEvent> {
    return this.log('task_incorrect', {
      problemId,
      stepId,
      level,
      taskType,
      attemptNumber,
      isCorrect: false
    })
  }

  /**
   * Log when reading mode is activated
   */
  readingModeActivated(problemId: string, stepId: number): StorageResult<StoredEvent> {
    return this.log('reading_mode_activated', { problemId, stepId })
  }

  // ============================================
  // Sanity Check Events
  // ============================================

  /**
   * Log when sanity check is completed
   */
  sanityCheckCompleted(problemId: string, passed: boolean): StorageResult<StoredEvent> {
    return this.log('sanity_check_completed', { problemId, isCorrect: passed })
  }

  // ============================================
  // Reflection Events
  // ============================================

  /**
   * Log when reflection is started
   */
  reflectionStarted(problemId: string): StorageResult<StoredEvent> {
    return this.log('reflection_started', { problemId })
  }

  /**
   * Log when reflection is completed
   */
  reflectionCompleted(problemId: string): StorageResult<StoredEvent> {
    return this.log('reflection_completed', { problemId })
  }

  // ============================================
  // Preference Events
  // ============================================

  /**
   * Log when a preference is changed
   */
  preferenceChanged(key: string, value: unknown): StorageResult<StoredEvent> {
    return this.log('preference_changed', {
      preferenceKey: key,
      preferenceValue: value
    })
  }

  // ============================================
  // Error Events
  // ============================================

  /**
   * Log an error
   */
  error(message: string, context?: Record<string, unknown>): StorageResult<StoredEvent> {
    return this.log('error_occurred', {
      errorMessage: message,
      ...context
    })
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): StorageResult<StoredEvent[]> {
    return this.provider.getRecentEvents(limit)
  }

  /**
   * Get events for a specific problem
   */
  getProblemEvents(problemId: string): StorageResult<StoredEvent[]> {
    return this.provider.getEvents({ problemId })
  }

  /**
   * Get events by type
   */
  getEventsByType(types: EventType[]): StorageResult<StoredEvent[]> {
    return this.provider.getEvents({ types })
  }

  /**
   * Get events in date range
   */
  getEventsInRange(startDate: string, endDate: string): StorageResult<StoredEvent[]> {
    return this.provider.getEvents({ startDate, endDate })
  }

  /**
   * Clear all events
   */
  clearEvents(): StorageResult<boolean> {
    return this.provider.clearEvents()
  }

  /**
   * Prune old events
   */
  pruneEvents(): StorageResult<number> {
    return this.provider.pruneEvents()
  }

  // ============================================
  // Analytics Helpers
  // ============================================

  /**
   * Get event counts by type
   */
  getEventCounts(): Record<EventType, number> {
    const result = this.provider.getEvents({})
    const counts: Partial<Record<EventType, number>> = {}

    if (result.success && result.data) {
      for (const event of result.data) {
        counts[event.type] = (counts[event.type] || 0) + 1
      }
    }

    return counts as Record<EventType, number>
  }

  /**
   * Get problem statistics
   */
  getProblemStats(problemId: string): {
    totalEvents: number
    stepAttempts: number
    hintsUsed: number
    tasksCompleted: number
    startedAt?: string
    solvedAt?: string
  } {
    const result = this.provider.getEvents({ problemId })
    const stats = {
      totalEvents: 0,
      stepAttempts: 0,
      hintsUsed: 0,
      tasksCompleted: 0,
      startedAt: undefined as string | undefined,
      solvedAt: undefined as string | undefined
    }

    if (result.success && result.data) {
      stats.totalEvents = result.data.length

      for (const event of result.data) {
        if (event.type === 'problem_started') {
          stats.startedAt = event.timestamp
        }
        if (event.type === 'problem_marked_solved') {
          stats.solvedAt = event.timestamp
        }
        if (event.type === 'step_failed') {
          stats.stepAttempts++
        }
        if (event.type === 'hint_unlocked' || event.type === 'hint_viewed') {
          stats.hintsUsed++
        }
        if (event.type === 'task_correct') {
          stats.tasksCompleted++
        }
      }
    }

    return stats
  }
}

// Export singleton instance
export const eventLogger = new EventLoggerService()

// Initialize on import (client-side only)
if (typeof window !== 'undefined') {
  eventLogger.initialize()
}
