/**
 * Calendar Integration + Catch-up Compression Types (PhaseC_02)
 *
 * Connect calendar availability and compress missed sessions
 * without exceeding daily budget.
 */

/**
 * Available time slot from calendar
 */
export interface AvailableSlot {
  readonly start: string // ISO datetime
  readonly end: string
  readonly durationMinutes: number
  readonly source: 'google' | 'outlook' | 'manual'
}

/**
 * Calendar sync status
 */
export interface CalendarSyncStatus {
  readonly userId: string
  readonly connected: boolean
  readonly provider?: 'google' | 'outlook'
  readonly lastSyncAt?: string
  readonly syncError?: string
}

/**
 * Daily study budget
 */
export interface DailyBudget {
  readonly userId: string
  readonly date: string
  readonly totalMinutes: number
  readonly usedMinutes: number
  readonly remainingMinutes: number
  readonly sessions: readonly ScheduledSession[]
}

/**
 * Scheduled study session
 */
export interface ScheduledSession {
  readonly id: string
  readonly date: string
  readonly startTime: string
  readonly durationMinutes: number
  readonly type: 'main' | 'drill' | 'review' | 'catchup'
  readonly status: 'scheduled' | 'completed' | 'missed' | 'compressed'
  readonly items: readonly SessionItem[]
}

/**
 * Item within a session
 */
export interface SessionItem {
  readonly id: string
  readonly type: 'problem' | 'drill' | 'review'
  readonly priority: 'high' | 'medium' | 'low'
  readonly estimatedMinutes: number
  readonly completed: boolean
}

/**
 * Missed session detection
 */
export interface MissedSession {
  readonly sessionId: string
  readonly originalDate: string
  readonly itemsNotCompleted: readonly SessionItem[]
  readonly totalMinutesMissed: number
}

/**
 * Compression plan for missed session
 */
export interface CompressionPlan {
  readonly missedSessionId: string
  readonly originalMinutes: number
  readonly compressedMinutes: number
  readonly removedItems: readonly SessionItem[]
  readonly keptItems: readonly SessionItem[]
  readonly explanation: string
}

/**
 * Compression algorithm result
 */
export interface CompressionResult {
  readonly plan: CompressionPlan
  readonly fitsInBudget: boolean
  readonly budgetUsed: number
  readonly budgetRemaining: number
}

// Policy constants
export const CALENDAR_POLICY = {
  DEFAULT_DAILY_BUDGET_MINUTES: 60,
  MAX_DAILY_BUDGET_MINUTES: 180,
  MIN_SESSION_DURATION_MINUTES: 15,
  COMPRESSION_PRIORITY_ORDER: ['drill', 'review', 'problem'] as const,
  HIGH_DECAY_TOPIC_PRIORITY: 1.5,
  MAIN_TASK_ALWAYS_KEPT: true,
} as const

// Event types
export type CalendarEventType =
  | 'calendar_connected'
  | 'calendar_synced'
  | 'calendar_disconnected'
  | 'session_scheduled'
  | 'session_missed_detected'
  | 'session_compressed'
  | 'catchup_plan_created'
