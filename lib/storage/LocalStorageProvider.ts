/**
 * LocalStorage Provider Implementation
 *
 * Wraps browser localStorage with the StorageProvider interface.
 * Maintains backwards compatibility with existing storage keys.
 */

import { BaseStorageProvider } from './StorageProvider'
import type {
  StoredEvent,
  EventType,
  EventMetadata,
  UserPreferences,
  StorageResult,
  PaginatedResult,
  StorageProviderConfig,
  ProblemAttempt,
  ProblemProgress,
  HistoryFilters,
  STORAGE_KEYS
} from './types'

const KEYS = {
  PROBLEM_ATTEMPTS: 'physiscaffold_problem_attempts',
  EVENTS: 'physiscaffold_events',
  USER_PREFERENCES: 'physiscaffold_user_preferences',
  USER_ID: 'physiscaffold_user',
  SESSION_ID: 'physiscaffold_session',
} as const

export class LocalStorageProvider extends BaseStorageProvider {
  private initialized = false

  async initialize(config?: StorageProviderConfig): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config }
    }

    // Generate or restore session ID
    if (typeof window !== 'undefined') {
      const existingSession = sessionStorage.getItem(KEYS.SESSION_ID)
      if (existingSession) {
        this.sessionId = existingSession
      } else {
        this.sessionId = this.generateId('session')
        sessionStorage.setItem(KEYS.SESSION_ID, this.sessionId)
      }
    }

    this.initialized = true
    this.debug('LocalStorageProvider initialized', this.config)
  }

  isAvailable(): boolean {
    if (typeof window === 'undefined') return false

    try {
      const testKey = '__storage_test__'
      localStorage.setItem(testKey, testKey)
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  }

  // ============================================
  // Problem Attempts
  // ============================================

  private getAllAttempts(): ProblemAttempt[] {
    if (!this.isAvailable()) return []

    try {
      const data = localStorage.getItem(KEYS.PROBLEM_ATTEMPTS)
      return data ? JSON.parse(data) : []
    } catch (error) {
      this.debug('Failed to load attempts', error)
      return []
    }
  }

  private saveAllAttempts(attempts: ProblemAttempt[]): boolean {
    if (!this.isAvailable()) return false

    try {
      localStorage.setItem(KEYS.PROBLEM_ATTEMPTS, JSON.stringify(attempts))
      return true
    } catch (error) {
      this.debug('Failed to save attempts', error)
      return false
    }
  }

  getAttempt(problemId: string): StorageResult<ProblemAttempt> {
    const attempts = this.getAllAttempts()
    const attempt = attempts.find(a => a.problemId === problemId)

    if (attempt) {
      return { success: true, data: attempt }
    }
    return { success: false, error: 'Attempt not found' }
  }

  getAttempts(filters?: HistoryFilters): StorageResult<PaginatedResult<ProblemAttempt>> {
    let attempts = this.getAllAttempts()

    // Apply filters
    if (filters?.status) {
      attempts = attempts.filter(a => a.status === filters.status)
    }
    if (filters?.review !== undefined) {
      attempts = attempts.filter(a => a.reviewFlag === filters.review)
    }
    if (filters?.query) {
      const query = filters.query.toLowerCase()
      attempts = attempts.filter(a =>
        a.problemTitle.toLowerCase().includes(query) ||
        a.problemId.toLowerCase().includes(query)
      )
    }

    // Sort by last updated (most recent first)
    attempts.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    // Pagination
    const page = filters?.page || 1
    const pageSize = filters?.limit || 10
    const total = attempts.length
    const totalPages = Math.ceil(total / pageSize)
    const startIndex = (page - 1) * pageSize
    const items = attempts.slice(startIndex, startIndex + pageSize)

    return {
      success: true,
      data: { items, total, page, pageSize, totalPages }
    }
  }

  saveAttempt(attempt: ProblemAttempt): StorageResult<ProblemAttempt> {
    const attempts = this.getAllAttempts()
    const existingIndex = attempts.findIndex(a => a.problemId === attempt.problemId)

    if (existingIndex >= 0) {
      attempts[existingIndex] = attempt
    } else {
      attempts.push(attempt)
    }

    if (this.saveAllAttempts(attempts)) {
      return { success: true, data: attempt }
    }
    return { success: false, error: 'Failed to save attempt' }
  }

  deleteAttempt(problemId: string): StorageResult<boolean> {
    const attempts = this.getAllAttempts()
    const filtered = attempts.filter(a => a.problemId !== problemId)

    if (filtered.length === attempts.length) {
      return { success: false, error: 'Attempt not found' }
    }

    if (this.saveAllAttempts(filtered)) {
      return { success: true, data: true }
    }
    return { success: false, error: 'Failed to delete attempt' }
  }

  saveDraft(problemId: string, problemTitle: string, progress: ProblemProgress): StorageResult<ProblemAttempt> {
    const attempts = this.getAllAttempts()
    const existingIndex = attempts.findIndex(a => a.problemId === problemId)
    const now = this.now()

    const attempt: ProblemAttempt = existingIndex >= 0
      ? {
          ...attempts[existingIndex],
          draftSolution: JSON.stringify(progress),
          updatedAt: now,
          lastOpenedAt: now,
        }
      : {
          id: this.generateId('attempt'),
          problemId,
          problemTitle,
          status: 'IN_PROGRESS',
          reviewFlag: false,
          draftSolution: JSON.stringify(progress),
          createdAt: now,
          updatedAt: now,
          lastOpenedAt: now,
        }

    if (existingIndex >= 0) {
      attempts[existingIndex] = attempt
    } else {
      attempts.push(attempt)
    }

    if (this.saveAllAttempts(attempts)) {
      return { success: true, data: attempt }
    }
    return { success: false, error: 'Failed to save draft' }
  }

  loadDraft(problemId: string): StorageResult<ProblemProgress> {
    const result = this.getAttempt(problemId)
    if (!result.success || !result.data?.draftSolution) {
      return { success: false, error: 'No draft found' }
    }

    try {
      const progress = JSON.parse(result.data.draftSolution)
      return { success: true, data: progress }
    } catch {
      return { success: false, error: 'Failed to parse draft' }
    }
  }

  markSolved(problemId: string, problemTitle: string, progress: ProblemProgress): StorageResult<ProblemAttempt> {
    const attempts = this.getAllAttempts()
    const existingIndex = attempts.findIndex(a => a.problemId === problemId)
    const now = this.now()

    const attempt: ProblemAttempt = existingIndex >= 0
      ? {
          ...attempts[existingIndex],
          status: 'SOLVED',
          finalSolution: JSON.stringify(progress),
          draftSolution: undefined,
          updatedAt: now,
        }
      : {
          id: this.generateId('attempt'),
          problemId,
          problemTitle,
          status: 'SOLVED',
          reviewFlag: false,
          finalSolution: JSON.stringify(progress),
          createdAt: now,
          updatedAt: now,
        }

    if (existingIndex >= 0) {
      attempts[existingIndex] = attempt
    } else {
      attempts.push(attempt)
    }

    if (this.saveAllAttempts(attempts)) {
      return { success: true, data: attempt }
    }
    return { success: false, error: 'Failed to mark solved' }
  }

  // ============================================
  // Events
  // ============================================

  private getAllEvents(): StoredEvent[] {
    if (!this.isAvailable()) return []

    try {
      const data = localStorage.getItem(KEYS.EVENTS)
      return data ? JSON.parse(data) : []
    } catch {
      return []
    }
  }

  private saveAllEvents(events: StoredEvent[]): boolean {
    if (!this.isAvailable()) return false

    try {
      // Enforce max events limit
      const maxEvents = this.config.maxEventsToStore || 1000
      if (events.length > maxEvents) {
        events = events.slice(-maxEvents) // Keep most recent
      }

      localStorage.setItem(KEYS.EVENTS, JSON.stringify(events))
      return true
    } catch {
      return false
    }
  }

  logEvent(type: EventType, metadata?: EventMetadata): StorageResult<StoredEvent> {
    const event: StoredEvent = {
      id: this.generateId('evt'),
      type,
      timestamp: this.now(),
      sessionId: this.sessionId,
      userId: this.getUserId() || undefined,
      metadata: metadata || {}
    }

    const events = this.getAllEvents()
    events.push(event)

    if (this.saveAllEvents(events)) {
      this.debug(`Event logged: ${type}`, event)
      return { success: true, data: event }
    }
    return { success: false, error: 'Failed to log event' }
  }

  getEvents(options?: {
    types?: EventType[]
    problemId?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): StorageResult<StoredEvent[]> {
    let events = this.getAllEvents()

    if (options?.types?.length) {
      events = events.filter(e => options.types!.includes(e.type))
    }
    if (options?.problemId) {
      events = events.filter(e => e.metadata.problemId === options.problemId)
    }
    if (options?.startDate) {
      const start = new Date(options.startDate).getTime()
      events = events.filter(e => new Date(e.timestamp).getTime() >= start)
    }
    if (options?.endDate) {
      const end = new Date(options.endDate).getTime()
      events = events.filter(e => new Date(e.timestamp).getTime() <= end)
    }

    // Sort by timestamp (most recent first)
    events.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    // Apply pagination
    const offset = options?.offset || 0
    const limit = options?.limit || events.length
    events = events.slice(offset, offset + limit)

    return { success: true, data: events }
  }

  getRecentEvents(limit: number = 50): StorageResult<StoredEvent[]> {
    return this.getEvents({ limit })
  }

  pruneEvents(): StorageResult<number> {
    const retentionDays = this.config.eventRetentionDays || 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)
    const cutoffTime = cutoffDate.getTime()

    const events = this.getAllEvents()
    const prunedEvents = events.filter(e =>
      new Date(e.timestamp).getTime() >= cutoffTime
    )

    const removedCount = events.length - prunedEvents.length

    if (this.saveAllEvents(prunedEvents)) {
      this.debug(`Pruned ${removedCount} events`)
      return { success: true, data: removedCount }
    }
    return { success: false, error: 'Failed to prune events' }
  }

  clearEvents(): StorageResult<boolean> {
    if (this.saveAllEvents([])) {
      return { success: true, data: true }
    }
    return { success: false, error: 'Failed to clear events' }
  }

  // ============================================
  // User Preferences
  // ============================================

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'system',
      showHintsAutomatically: false,
      enableAnimations: true,
      enableSoundEffects: false,
      defaultHintLevel: 1,
      studyReminders: false,
    }
  }

  getPreferences(): StorageResult<UserPreferences> {
    if (!this.isAvailable()) {
      return { success: true, data: this.getDefaultPreferences() }
    }

    try {
      const data = localStorage.getItem(KEYS.USER_PREFERENCES)
      const prefs = data ? JSON.parse(data) : {}
      return {
        success: true,
        data: { ...this.getDefaultPreferences(), ...prefs }
      }
    } catch {
      return { success: true, data: this.getDefaultPreferences() }
    }
  }

  updatePreferences(prefs: Partial<UserPreferences>): StorageResult<UserPreferences> {
    const current = this.getPreferences()
    const updated = { ...current.data, ...prefs, lastVisitedAt: this.now() }

    try {
      localStorage.setItem(KEYS.USER_PREFERENCES, JSON.stringify(updated))
      return { success: true, data: updated }
    } catch {
      return { success: false, error: 'Failed to save preferences' }
    }
  }

  resetPreferences(): StorageResult<UserPreferences> {
    const defaults = this.getDefaultPreferences()
    try {
      localStorage.setItem(KEYS.USER_PREFERENCES, JSON.stringify(defaults))
      return { success: true, data: defaults }
    } catch {
      return { success: false, error: 'Failed to reset preferences' }
    }
  }

  // ============================================
  // Session Management
  // ============================================

  getSessionId(): string {
    return this.sessionId
  }

  getUserId(): string | null {
    if (!this.isAvailable()) return null
    return localStorage.getItem(KEYS.USER_ID)
  }

  setUserId(userId: string): void {
    if (this.isAvailable()) {
      localStorage.setItem(KEYS.USER_ID, userId)
    }
  }

  // ============================================
  // Generic Storage
  // ============================================

  getRaw<T>(key: string): StorageResult<T> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Storage not available' }
    }

    try {
      const data = localStorage.getItem(key)
      if (data === null) {
        return { success: false, error: 'Key not found' }
      }
      return { success: true, data: JSON.parse(data) }
    } catch {
      return { success: false, error: 'Failed to parse data' }
    }
  }

  setRaw<T>(key: string, data: T): StorageResult<T> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Storage not available' }
    }

    try {
      localStorage.setItem(key, JSON.stringify(data))
      return { success: true, data }
    } catch {
      return { success: false, error: 'Failed to save data' }
    }
  }

  deleteRaw(key: string): StorageResult<boolean> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Storage not available' }
    }

    localStorage.removeItem(key)
    return { success: true, data: true }
  }

  hasKey(key: string): boolean {
    if (!this.isAvailable()) return false
    return localStorage.getItem(key) !== null
  }

  // ============================================
  // Utilities
  // ============================================

  getStorageInfo(): StorageResult<{ usedBytes: number; availableBytes: number; percentUsed: number }> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Storage not available' }
    }

    let usedBytes = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        usedBytes += (localStorage.getItem(key) || '').length * 2 // UTF-16 = 2 bytes per char
      }
    }

    // Estimate 5MB max for localStorage
    const maxBytes = 5 * 1024 * 1024
    const availableBytes = maxBytes - usedBytes
    const percentUsed = (usedBytes / maxBytes) * 100

    return {
      success: true,
      data: { usedBytes, availableBytes, percentUsed }
    }
  }

  exportAll(): StorageResult<Record<string, unknown>> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Storage not available' }
    }

    const data: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('physiscaffold_')) {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) || 'null')
        } catch {
          data[key] = localStorage.getItem(key)
        }
      }
    }

    return { success: true, data }
  }

  importAll(data: Record<string, unknown>): StorageResult<boolean> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Storage not available' }
    }

    try {
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('physiscaffold_')) {
          localStorage.setItem(key, JSON.stringify(value))
        }
      }
      return { success: true, data: true }
    } catch {
      return { success: false, error: 'Failed to import data' }
    }
  }

  clearAll(): StorageResult<boolean> {
    if (!this.isAvailable()) {
      return { success: false, error: 'Storage not available' }
    }

    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('physiscaffold_')) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key))
    return { success: true, data: true }
  }
}

// Export singleton instance
export const localStorageProvider = new LocalStorageProvider()
