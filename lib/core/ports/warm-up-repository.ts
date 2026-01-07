/**
 * Warm-Up Repository Port
 *
 * Interface contract for warm-up data persistence.
 * Implementations could use localStorage, IndexedDB, or server storage.
 */

import type {
  WarmUpSession,
  WarmUpBlock,
  WarmUpItemResult,
  WarmUpSkipRecord,
} from '@/types/warmUp'

/**
 * Repository interface for warm-up session persistence
 */
export interface WarmUpRepository {
  /**
   * Create a new warm-up session
   */
  createSession(session: WarmUpSession): Promise<WarmUpSession>

  /**
   * Find warm-up session by ID
   */
  findSessionById(
    tenantId: string,
    sessionId: string
  ): Promise<WarmUpSession | null>

  /**
   * Find today's warm-up session for a user
   */
  findTodaySession(
    tenantId: string,
    userId: string,
    date: string
  ): Promise<WarmUpSession | null>

  /**
   * Update warm-up session
   */
  updateSession(session: WarmUpSession): Promise<WarmUpSession>

  /**
   * Record item result within a session
   */
  recordItemResult(
    tenantId: string,
    sessionId: string,
    blockId: string,
    result: WarmUpItemResult
  ): Promise<void>

  /**
   * Get skip record for a user
   */
  getSkipRecord(
    tenantId: string,
    userId: string
  ): Promise<WarmUpSkipRecord | null>

  /**
   * Update skip record when user skips warm-up
   */
  updateSkipRecord(record: WarmUpSkipRecord): Promise<void>

  /**
   * Get user's warm-up history
   */
  getSessionHistory(
    tenantId: string,
    userId: string,
    options?: {
      limit?: number
      startDate?: string
      endDate?: string
    }
  ): Promise<WarmUpSession[]>

  /**
   * Get warm-up statistics for a user
   */
  getWarmUpStats(
    tenantId: string,
    userId: string
  ): Promise<WarmUpStats>
}

export interface WarmUpStats {
  totalSessions: number
  completedSessions: number
  skippedSessions: number
  averageScore: number
  currentStreak: number // Consecutive days with completed warm-ups
  longestStreak: number
  topicScores: Record<string, number> // Average score per topic
}

/**
 * Analytics interface for warm-up events
 */
export interface WarmUpAnalytics {
  /**
   * Track warm-up session assigned
   */
  trackSessionAssigned(
    tenantId: string,
    userId: string,
    sessionId: string,
    blockIds: string[]
  ): void

  /**
   * Track warm-up session started
   */
  trackSessionStarted(
    tenantId: string,
    userId: string,
    sessionId: string
  ): void

  /**
   * Track warm-up item completed
   */
  trackItemCompleted(
    tenantId: string,
    userId: string,
    sessionId: string,
    blockId: string,
    itemId: string,
    isCorrect: boolean,
    timeSpentSeconds: number
  ): void

  /**
   * Track warm-up block completed
   */
  trackBlockCompleted(
    tenantId: string,
    userId: string,
    sessionId: string,
    blockId: string,
    score: number
  ): void

  /**
   * Track warm-up session completed
   */
  trackSessionCompleted(
    tenantId: string,
    userId: string,
    sessionId: string,
    totalScore: number,
    durationSeconds: number
  ): void

  /**
   * Track warm-up session skipped
   */
  trackSessionSkipped(
    tenantId: string,
    userId: string,
    sessionId: string,
    reason?: string
  ): void
}

/**
 * Content provider interface for warm-up blocks
 */
export interface WarmUpContentProvider {
  /**
   * Get all available warm-up blocks
   */
  getAllBlocks(): Promise<WarmUpBlock[]>

  /**
   * Get warm-up block by ID
   */
  getBlockById(blockId: string): Promise<WarmUpBlock | null>

  /**
   * Get warm-up blocks for a topic
   */
  getBlocksByTopic(topicId: string): Promise<WarmUpBlock[]>

  /**
   * Get drill items for a block
   */
  getDrillItems(blockId: string): Promise<import('@/types/warmUp').WarmUpDrillItem[]>
}
