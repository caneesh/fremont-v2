/**
 * Storage Provider Interface
 *
 * Defines the contract for storage implementations.
 * Currently implemented by LocalStorageProvider.
 * Can be extended to support IndexedDB, server-side storage, etc.
 */

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
  HistoryFilters
} from './types'

export interface StorageProvider {
  // ============================================
  // Configuration
  // ============================================

  /**
   * Initialize the storage provider
   */
  initialize(config?: StorageProviderConfig): Promise<void>

  /**
   * Check if storage is available and working
   */
  isAvailable(): boolean

  /**
   * Get current configuration
   */
  getConfig(): StorageProviderConfig

  // ============================================
  // Problem Attempts
  // ============================================

  /**
   * Get a problem attempt by ID
   */
  getAttempt(problemId: string): StorageResult<ProblemAttempt>

  /**
   * Get all attempts with optional filters
   */
  getAttempts(filters?: HistoryFilters): StorageResult<PaginatedResult<ProblemAttempt>>

  /**
   * Save or update a problem attempt
   */
  saveAttempt(attempt: ProblemAttempt): StorageResult<ProblemAttempt>

  /**
   * Delete a problem attempt
   */
  deleteAttempt(problemId: string): StorageResult<boolean>

  /**
   * Save draft progress for a problem
   */
  saveDraft(problemId: string, problemTitle: string, progress: ProblemProgress): StorageResult<ProblemAttempt>

  /**
   * Load draft progress for a problem
   */
  loadDraft(problemId: string): StorageResult<ProblemProgress>

  /**
   * Mark a problem as solved
   */
  markSolved(problemId: string, problemTitle: string, progress: ProblemProgress): StorageResult<ProblemAttempt>

  // ============================================
  // Events
  // ============================================

  /**
   * Log an event
   */
  logEvent(type: EventType, metadata?: EventMetadata): StorageResult<StoredEvent>

  /**
   * Get events with optional filters
   */
  getEvents(options?: {
    types?: EventType[]
    problemId?: string
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): StorageResult<StoredEvent[]>

  /**
   * Get recent events (convenience method)
   */
  getRecentEvents(limit?: number): StorageResult<StoredEvent[]>

  /**
   * Clear old events based on retention policy
   */
  pruneEvents(): StorageResult<number>

  /**
   * Clear all events
   */
  clearEvents(): StorageResult<boolean>

  // ============================================
  // User Preferences
  // ============================================

  /**
   * Get user preferences
   */
  getPreferences(): StorageResult<UserPreferences>

  /**
   * Update user preferences (partial update)
   */
  updatePreferences(prefs: Partial<UserPreferences>): StorageResult<UserPreferences>

  /**
   * Reset preferences to defaults
   */
  resetPreferences(): StorageResult<UserPreferences>

  // ============================================
  // Session Management
  // ============================================

  /**
   * Get or create session ID
   */
  getSessionId(): string

  /**
   * Get user ID (if set)
   */
  getUserId(): string | null

  /**
   * Set user ID
   */
  setUserId(userId: string): void

  // ============================================
  // Generic Storage
  // ============================================

  /**
   * Get raw data by key
   */
  getRaw<T>(key: string): StorageResult<T>

  /**
   * Set raw data by key
   */
  setRaw<T>(key: string, data: T): StorageResult<T>

  /**
   * Delete data by key
   */
  deleteRaw(key: string): StorageResult<boolean>

  /**
   * Check if key exists
   */
  hasKey(key: string): boolean

  // ============================================
  // Utilities
  // ============================================

  /**
   * Get storage usage info
   */
  getStorageInfo(): StorageResult<{
    usedBytes: number
    availableBytes: number
    percentUsed: number
  }>

  /**
   * Export all data (for backup/migration)
   */
  exportAll(): StorageResult<Record<string, unknown>>

  /**
   * Import data (for restore/migration)
   */
  importAll(data: Record<string, unknown>): StorageResult<boolean>

  /**
   * Clear all storage
   */
  clearAll(): StorageResult<boolean>
}

/**
 * Abstract base class for storage providers
 * Provides common functionality
 */
export abstract class BaseStorageProvider implements StorageProvider {
  protected config: StorageProviderConfig = {
    maxEventsToStore: 1000,
    eventRetentionDays: 30,
    enableCompression: false,
    debugMode: false
  }

  protected sessionId: string = ''

  abstract initialize(config?: StorageProviderConfig): Promise<void>
  abstract isAvailable(): boolean
  abstract getAttempt(problemId: string): StorageResult<ProblemAttempt>
  abstract getAttempts(filters?: HistoryFilters): StorageResult<PaginatedResult<ProblemAttempt>>
  abstract saveAttempt(attempt: ProblemAttempt): StorageResult<ProblemAttempt>
  abstract deleteAttempt(problemId: string): StorageResult<boolean>
  abstract saveDraft(problemId: string, problemTitle: string, progress: ProblemProgress): StorageResult<ProblemAttempt>
  abstract loadDraft(problemId: string): StorageResult<ProblemProgress>
  abstract markSolved(problemId: string, problemTitle: string, progress: ProblemProgress): StorageResult<ProblemAttempt>
  abstract logEvent(type: EventType, metadata?: EventMetadata): StorageResult<StoredEvent>
  abstract getEvents(options?: { types?: EventType[]; problemId?: string; startDate?: string; endDate?: string; limit?: number; offset?: number }): StorageResult<StoredEvent[]>
  abstract getRecentEvents(limit?: number): StorageResult<StoredEvent[]>
  abstract pruneEvents(): StorageResult<number>
  abstract clearEvents(): StorageResult<boolean>
  abstract getPreferences(): StorageResult<UserPreferences>
  abstract updatePreferences(prefs: Partial<UserPreferences>): StorageResult<UserPreferences>
  abstract resetPreferences(): StorageResult<UserPreferences>
  abstract getSessionId(): string
  abstract getUserId(): string | null
  abstract setUserId(userId: string): void
  abstract getRaw<T>(key: string): StorageResult<T>
  abstract setRaw<T>(key: string, data: T): StorageResult<T>
  abstract deleteRaw(key: string): StorageResult<boolean>
  abstract hasKey(key: string): boolean
  abstract getStorageInfo(): StorageResult<{ usedBytes: number; availableBytes: number; percentUsed: number }>
  abstract exportAll(): StorageResult<Record<string, unknown>>
  abstract importAll(data: Record<string, unknown>): StorageResult<boolean>
  abstract clearAll(): StorageResult<boolean>

  getConfig(): StorageProviderConfig {
    return { ...this.config }
  }

  /**
   * Generate a unique ID
   */
  protected generateId(prefix: string = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get current timestamp in ISO format
   */
  protected now(): string {
    return new Date().toISOString()
  }

  /**
   * Log debug message if debug mode is enabled
   */
  protected debug(message: string, data?: unknown): void {
    if (this.config.debugMode) {
      console.log(`[Storage] ${message}`, data || '')
    }
  }
}
