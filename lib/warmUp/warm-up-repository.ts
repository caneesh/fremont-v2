/**
 * Warm-Up Repository Implementation
 *
 * localStorage-based persistence for warm-up sessions.
 */

import type {
  WarmUpSession,
  WarmUpItemResult,
  WarmUpSkipRecord,
} from '@/types/warmUp'
import type { WarmUpRepository, WarmUpStats } from '@/lib/core/ports/warm-up-repository'

const STORAGE_KEYS = {
  SESSIONS: 'warmup_sessions',
  SKIP_RECORDS: 'warmup_skip_records',
} as const

/**
 * localStorage-based implementation of WarmUpRepository
 */
export class LocalStorageWarmUpRepository implements WarmUpRepository {
  private getSessionsMap(): Map<string, WarmUpSession> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SESSIONS)
      if (!data) return new Map()
      const parsed = JSON.parse(data) as [string, WarmUpSession][]
      return new Map(parsed)
    } catch {
      return new Map()
    }
  }

  private saveSessionsMap(sessions: Map<string, WarmUpSession>): void {
    const data = JSON.stringify([...sessions.entries()])
    localStorage.setItem(STORAGE_KEYS.SESSIONS, data)
  }

  private getSkipRecordsMap(): Map<string, WarmUpSkipRecord> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SKIP_RECORDS)
      if (!data) return new Map()
      const parsed = JSON.parse(data) as [string, WarmUpSkipRecord][]
      return new Map(parsed)
    } catch {
      return new Map()
    }
  }

  private saveSkipRecordsMap(records: Map<string, WarmUpSkipRecord>): void {
    const data = JSON.stringify([...records.entries()])
    localStorage.setItem(STORAGE_KEYS.SKIP_RECORDS, data)
  }

  private getKey(tenantId: string, sessionId: string): string {
    return `${tenantId}:${sessionId}`
  }

  private getUserKey(tenantId: string, userId: string): string {
    return `${tenantId}:${userId}`
  }

  async createSession(session: WarmUpSession): Promise<WarmUpSession> {
    const sessions = this.getSessionsMap()
    const key = this.getKey(session.tenantId, session.id)
    sessions.set(key, session)
    this.saveSessionsMap(sessions)
    return session
  }

  async findSessionById(
    tenantId: string,
    sessionId: string
  ): Promise<WarmUpSession | null> {
    const sessions = this.getSessionsMap()
    const key = this.getKey(tenantId, sessionId)
    return sessions.get(key) ?? null
  }

  async findTodaySession(
    tenantId: string,
    userId: string,
    date: string
  ): Promise<WarmUpSession | null> {
    const sessions = this.getSessionsMap()

    for (const session of sessions.values()) {
      if (
        session.tenantId === tenantId &&
        session.userId === userId &&
        session.date === date
      ) {
        return session
      }
    }

    return null
  }

  async updateSession(session: WarmUpSession): Promise<WarmUpSession> {
    const sessions = this.getSessionsMap()
    const key = this.getKey(session.tenantId, session.id)
    sessions.set(key, session)
    this.saveSessionsMap(sessions)
    return session
  }

  async recordItemResult(
    tenantId: string,
    sessionId: string,
    blockId: string,
    result: WarmUpItemResult
  ): Promise<void> {
    // Item results are stored as part of the session
    // This is a no-op in localStorage implementation
    // since updateSession handles it
  }

  async getSkipRecord(
    tenantId: string,
    userId: string
  ): Promise<WarmUpSkipRecord | null> {
    const records = this.getSkipRecordsMap()
    const key = this.getUserKey(tenantId, userId)
    return records.get(key) ?? null
  }

  async updateSkipRecord(record: WarmUpSkipRecord): Promise<void> {
    const records = this.getSkipRecordsMap()
    const key = this.getUserKey(record.tenantId, record.userId)
    records.set(key, record)
    this.saveSkipRecordsMap(records)
  }

  async getSessionHistory(
    tenantId: string,
    userId: string,
    options?: {
      limit?: number
      startDate?: string
      endDate?: string
    }
  ): Promise<WarmUpSession[]> {
    const sessions = this.getSessionsMap()
    let results: WarmUpSession[] = []

    for (const session of sessions.values()) {
      if (session.tenantId === tenantId && session.userId === userId) {
        // Apply date filters if provided
        if (options?.startDate && session.date < options.startDate) continue
        if (options?.endDate && session.date > options.endDate) continue
        results.push(session)
      }
    }

    // Sort by date descending
    results.sort((a, b) => b.date.localeCompare(a.date))

    // Apply limit
    if (options?.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  async getWarmUpStats(tenantId: string, userId: string): Promise<WarmUpStats> {
    const history = await this.getSessionHistory(tenantId, userId)

    const completedSessions = history.filter(s => s.status === 'completed')
    const skippedSessions = history.filter(s => s.status === 'skipped')

    // Calculate average score
    const scores = completedSessions
      .map(s => {
        const blocks = s.assignedBlocks.filter(b => b.score !== undefined)
        if (blocks.length === 0) return 0
        return blocks.reduce((sum, b) => sum + (b.score || 0), 0) / blocks.length
      })
      .filter(s => s > 0)

    const averageScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0

    // Calculate streak
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    // Sort by date ascending for streak calculation
    const sortedHistory = [...history].sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    for (const session of sortedHistory) {
      if (session.status === 'completed') {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    // Current streak is from the end
    for (let i = sortedHistory.length - 1; i >= 0; i--) {
      if (sortedHistory[i].status === 'completed') {
        currentStreak++
      } else {
        break
      }
    }

    // Calculate topic scores
    const topicScores: Record<string, { total: number; count: number }> = {}

    for (const session of completedSessions) {
      for (const block of session.assignedBlocks) {
        if (block.score !== undefined) {
          if (!topicScores[block.blockId]) {
            topicScores[block.blockId] = { total: 0, count: 0 }
          }
          topicScores[block.blockId].total += block.score
          topicScores[block.blockId].count++
        }
      }
    }

    const topicAverages: Record<string, number> = {}
    for (const [topic, data] of Object.entries(topicScores)) {
      topicAverages[topic] = Math.round(data.total / data.count)
    }

    return {
      totalSessions: history.length,
      completedSessions: completedSessions.length,
      skippedSessions: skippedSessions.length,
      averageScore,
      currentStreak,
      longestStreak,
      topicScores: topicAverages,
    }
  }
}

/**
 * In-memory implementation of WarmUpRepository for server-side use
 */
export class InMemoryWarmUpRepository implements WarmUpRepository {
  private sessions = new Map<string, WarmUpSession>()
  private skipRecords = new Map<string, WarmUpSkipRecord>()

  private getKey(tenantId: string, sessionId: string): string {
    return `${tenantId}:${sessionId}`
  }

  private getUserKey(tenantId: string, userId: string): string {
    return `${tenantId}:${userId}`
  }

  async createSession(session: WarmUpSession): Promise<WarmUpSession> {
    const key = this.getKey(session.tenantId, session.id)
    this.sessions.set(key, session)
    return session
  }

  async findSessionById(
    tenantId: string,
    sessionId: string
  ): Promise<WarmUpSession | null> {
    const key = this.getKey(tenantId, sessionId)
    return this.sessions.get(key) ?? null
  }

  async findTodaySession(
    tenantId: string,
    userId: string,
    date: string
  ): Promise<WarmUpSession | null> {
    for (const session of this.sessions.values()) {
      if (
        session.tenantId === tenantId &&
        session.userId === userId &&
        session.date === date
      ) {
        return session
      }
    }
    return null
  }

  async updateSession(session: WarmUpSession): Promise<WarmUpSession> {
    const key = this.getKey(session.tenantId, session.id)
    this.sessions.set(key, session)
    return session
  }

  async recordItemResult(
    tenantId: string,
    sessionId: string,
    blockId: string,
    result: WarmUpItemResult
  ): Promise<void> {
    // No-op - item results stored in session
  }

  async getSkipRecord(
    tenantId: string,
    userId: string
  ): Promise<WarmUpSkipRecord | null> {
    const key = this.getUserKey(tenantId, userId)
    return this.skipRecords.get(key) ?? null
  }

  async updateSkipRecord(record: WarmUpSkipRecord): Promise<void> {
    const key = this.getUserKey(record.tenantId, record.userId)
    this.skipRecords.set(key, record)
  }

  async getSessionHistory(
    tenantId: string,
    userId: string,
    options?: {
      limit?: number
      startDate?: string
      endDate?: string
    }
  ): Promise<WarmUpSession[]> {
    let results: WarmUpSession[] = []

    for (const session of this.sessions.values()) {
      if (session.tenantId === tenantId && session.userId === userId) {
        if (options?.startDate && session.date < options.startDate) continue
        if (options?.endDate && session.date > options.endDate) continue
        results.push(session)
      }
    }

    results.sort((a, b) => b.date.localeCompare(a.date))

    if (options?.limit) {
      results = results.slice(0, options.limit)
    }

    return results
  }

  async getWarmUpStats(tenantId: string, userId: string): Promise<WarmUpStats> {
    const history = await this.getSessionHistory(tenantId, userId)
    const completedSessions = history.filter(s => s.status === 'completed')
    const skippedSessions = history.filter(s => s.status === 'skipped')

    const scores = completedSessions
      .map(s => {
        const blocks = s.assignedBlocks.filter(b => b.score !== undefined)
        if (blocks.length === 0) return 0
        return blocks.reduce((sum, b) => sum + (b.score || 0), 0) / blocks.length
      })
      .filter(s => s > 0)

    const averageScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0

    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    const sortedHistory = [...history].sort((a, b) =>
      a.date.localeCompare(b.date)
    )

    for (const session of sortedHistory) {
      if (session.status === 'completed') {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    for (let i = sortedHistory.length - 1; i >= 0; i--) {
      if (sortedHistory[i].status === 'completed') {
        currentStreak++
      } else {
        break
      }
    }

    const topicScores: Record<string, { total: number; count: number }> = {}

    for (const session of completedSessions) {
      for (const block of session.assignedBlocks) {
        if (block.score !== undefined) {
          if (!topicScores[block.blockId]) {
            topicScores[block.blockId] = { total: 0, count: 0 }
          }
          topicScores[block.blockId].total += block.score
          topicScores[block.blockId].count++
        }
      }
    }

    const topicAverages: Record<string, number> = {}
    for (const [topic, data] of Object.entries(topicScores)) {
      topicAverages[topic] = Math.round(data.total / data.count)
    }

    return {
      totalSessions: history.length,
      completedSessions: completedSessions.length,
      skippedSessions: skippedSessions.length,
      averageScore,
      currentStreak,
      longestStreak,
      topicScores: topicAverages,
    }
  }
}

// Global singleton for server-side to persist across Next.js module reloads
const globalForWarmUp = globalThis as unknown as {
  warmUpRepository: InMemoryWarmUpRepository | undefined
}

/**
 * Create a new instance of the appropriate repository
 * Uses in-memory on server (with global cache), localStorage in browser
 */
export function createWarmUpRepository(): WarmUpRepository {
  if (typeof window === 'undefined') {
    // Use global singleton to persist across module reloads in dev
    if (!globalForWarmUp.warmUpRepository) {
      globalForWarmUp.warmUpRepository = new InMemoryWarmUpRepository()
    }
    return globalForWarmUp.warmUpRepository
  }
  return new LocalStorageWarmUpRepository()
}
