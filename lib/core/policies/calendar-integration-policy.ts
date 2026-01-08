/**
 * Calendar Integration Policy
 *
 * Deterministic compression algorithm for missed sessions and
 * calendar-aware scheduling that respects daily budget constraints.
 */

import type {
  AvailableSlot,
  CalendarSyncStatus,
  DailyBudget,
  ScheduledSession,
  SessionItem,
  MissedSession,
  CompressionPlan,
  CompressionResult,
} from '@/types/calendarIntegration'
import { CALENDAR_POLICY } from '@/types/calendarIntegration'

// Re-export policy constants
export { CALENDAR_POLICY }

/**
 * Extended policy constants
 */
export const EXTENDED_CALENDAR_POLICY = {
  // Sync settings
  SYNC_INTERVAL_HOURS: 1,
  SYNC_RETRY_DELAY_MINUTES: 5,
  MAX_SYNC_RETRIES: 3,
  // Slot filtering
  MIN_SLOT_DURATION_MINUTES: 15,
  PREFERRED_SLOT_DURATION_MINUTES: 30,
  MAX_SLOTS_PER_DAY: 5,
  // Compression settings
  MAX_COMPRESSION_RATIO: 0.5, // Can compress to at most 50% of original
  MIN_ITEMS_AFTER_COMPRESSION: 1,
  // Priority weights for sorting
  PRIORITY_WEIGHTS: {
    high: 3,
    medium: 2,
    low: 1,
  },
  // Type weights for removal order (lower = remove first)
  TYPE_REMOVAL_ORDER: {
    drill: 1,
    review: 2,
    problem: 3,
  },
} as const

/**
 * Create initial calendar sync status - DETERMINISTIC
 */
export function createSyncStatus(userId: string): CalendarSyncStatus {
  return {
    userId,
    connected: false,
  }
}

/**
 * Update sync status on connection - DETERMINISTIC
 */
export function connectCalendar(
  status: CalendarSyncStatus,
  provider: 'google' | 'outlook'
): CalendarSyncStatus {
  return {
    ...status,
    connected: true,
    provider,
    lastSyncAt: new Date().toISOString(),
    syncError: undefined,
  }
}

/**
 * Update sync status on disconnect - DETERMINISTIC
 */
export function disconnectCalendar(status: CalendarSyncStatus): CalendarSyncStatus {
  return {
    ...status,
    connected: false,
    provider: undefined,
    syncError: undefined,
  }
}

/**
 * Record sync success - DETERMINISTIC
 */
export function recordSyncSuccess(status: CalendarSyncStatus): CalendarSyncStatus {
  return {
    ...status,
    lastSyncAt: new Date().toISOString(),
    syncError: undefined,
  }
}

/**
 * Record sync error - DETERMINISTIC
 */
export function recordSyncError(
  status: CalendarSyncStatus,
  error: string
): CalendarSyncStatus {
  return {
    ...status,
    syncError: error,
  }
}

/**
 * Check if sync is needed - DETERMINISTIC
 */
export function needsSync(status: CalendarSyncStatus, now: Date = new Date()): boolean {
  if (!status.connected) return false
  if (!status.lastSyncAt) return true

  const lastSync = new Date(status.lastSyncAt)
  const hoursSinceSync = (now.getTime() - lastSync.getTime()) / (1000 * 60 * 60)

  return hoursSinceSync >= EXTENDED_CALENDAR_POLICY.SYNC_INTERVAL_HOURS
}

/**
 * Validate available slot - DETERMINISTIC
 */
export function validateSlot(slot: AvailableSlot): { valid: boolean; error?: string } {
  const start = new Date(slot.start)
  const end = new Date(slot.end)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format' }
  }

  if (end <= start) {
    return { valid: false, error: 'End time must be after start time' }
  }

  if (slot.durationMinutes < EXTENDED_CALENDAR_POLICY.MIN_SLOT_DURATION_MINUTES) {
    return { valid: false, error: `Slot must be at least ${EXTENDED_CALENDAR_POLICY.MIN_SLOT_DURATION_MINUTES} minutes` }
  }

  return { valid: true }
}

/**
 * Filter slots that meet minimum duration - DETERMINISTIC
 */
export function filterValidSlots(slots: readonly AvailableSlot[]): AvailableSlot[] {
  return slots.filter(slot => {
    const validation = validateSlot(slot)
    return validation.valid && slot.durationMinutes >= CALENDAR_POLICY.MIN_SESSION_DURATION_MINUTES
  })
}

/**
 * Sort slots by start time - DETERMINISTIC
 */
export function sortSlotsByTime(slots: readonly AvailableSlot[]): AvailableSlot[] {
  return [...slots].sort((a, b) => {
    return new Date(a.start).getTime() - new Date(b.start).getTime()
  })
}

/**
 * Get best slots for day - DETERMINISTIC
 */
export function getBestSlotsForDay(
  slots: readonly AvailableSlot[],
  targetMinutes: number
): AvailableSlot[] {
  const validSlots = filterValidSlots(slots)
  const sortedSlots = sortSlotsByTime(validSlots)

  // Prefer slots close to target duration
  const scoredSlots = sortedSlots.map(slot => ({
    slot,
    score: Math.abs(slot.durationMinutes - targetMinutes),
  }))

  scoredSlots.sort((a, b) => a.score - b.score)

  return scoredSlots
    .slice(0, EXTENDED_CALENDAR_POLICY.MAX_SLOTS_PER_DAY)
    .map(s => s.slot)
}

/**
 * Create daily budget - DETERMINISTIC
 */
export function createDailyBudget(
  userId: string,
  date: string,
  totalMinutes: number = CALENDAR_POLICY.DEFAULT_DAILY_BUDGET_MINUTES
): DailyBudget {
  const cappedMinutes = Math.min(totalMinutes, CALENDAR_POLICY.MAX_DAILY_BUDGET_MINUTES)

  return {
    userId,
    date,
    totalMinutes: cappedMinutes,
    usedMinutes: 0,
    remainingMinutes: cappedMinutes,
    sessions: [],
  }
}

/**
 * Check if can schedule session - DETERMINISTIC
 */
export function canScheduleSession(
  budget: DailyBudget,
  durationMinutes: number
): { canSchedule: boolean; reason?: string } {
  if (durationMinutes < CALENDAR_POLICY.MIN_SESSION_DURATION_MINUTES) {
    return {
      canSchedule: false,
      reason: `Session must be at least ${CALENDAR_POLICY.MIN_SESSION_DURATION_MINUTES} minutes`,
    }
  }

  if (durationMinutes > budget.remainingMinutes) {
    return {
      canSchedule: false,
      reason: `Not enough budget remaining (${budget.remainingMinutes} minutes available)`,
    }
  }

  return { canSchedule: true }
}

/**
 * Schedule session in budget - DETERMINISTIC
 */
export function scheduleSession(
  budget: DailyBudget,
  session: ScheduledSession
): DailyBudget {
  const newUsedMinutes = budget.usedMinutes + session.durationMinutes

  return {
    ...budget,
    usedMinutes: newUsedMinutes,
    remainingMinutes: budget.totalMinutes - newUsedMinutes,
    sessions: [...budget.sessions, session],
  }
}

/**
 * Mark session as completed - DETERMINISTIC
 */
export function completeSession(
  budget: DailyBudget,
  sessionId: string
): DailyBudget {
  return {
    ...budget,
    sessions: budget.sessions.map(s =>
      s.id === sessionId ? { ...s, status: 'completed' as const } : s
    ),
  }
}

/**
 * Detect missed sessions - DETERMINISTIC
 */
export function detectMissedSessions(
  budget: DailyBudget,
  currentTime: Date = new Date()
): MissedSession[] {
  const missed: MissedSession[] = []

  for (const session of budget.sessions) {
    if (session.status !== 'scheduled') continue

    // Session is in the past and not completed
    const sessionEnd = new Date(`${session.date}T${session.startTime}`)
    sessionEnd.setMinutes(sessionEnd.getMinutes() + session.durationMinutes)

    if (sessionEnd < currentTime) {
      const itemsNotCompleted = session.items.filter(item => !item.completed)
      const totalMinutesMissed = itemsNotCompleted.reduce(
        (sum, item) => sum + item.estimatedMinutes,
        0
      )

      missed.push({
        sessionId: session.id,
        originalDate: session.date,
        itemsNotCompleted,
        totalMinutesMissed,
      })
    }
  }

  return missed
}

/**
 * Calculate item priority score for compression - DETERMINISTIC
 * Higher score = keep, lower score = remove first
 */
export function calculateItemPriorityScore(item: SessionItem): number {
  const priorityWeight = EXTENDED_CALENDAR_POLICY.PRIORITY_WEIGHTS[item.priority]
  const typeWeight = EXTENDED_CALENDAR_POLICY.TYPE_REMOVAL_ORDER[item.type]

  // Problems have highest type weight, drills lowest
  // High priority items have highest priority weight

  return priorityWeight * typeWeight
}

/**
 * Sort items by removal priority - DETERMINISTIC
 * Items at the beginning should be removed first
 */
export function sortItemsForRemoval(items: readonly SessionItem[]): SessionItem[] {
  return [...items].sort((a, b) => {
    const scoreA = calculateItemPriorityScore(a)
    const scoreB = calculateItemPriorityScore(b)
    return scoreA - scoreB // Lower scores removed first
  })
}

/**
 * Compress session to fit budget - DETERMINISTIC
 *
 * Algorithm:
 * 1. Sort items by keep priority (high priority problems first)
 * 2. Add items until we hit budget limit
 * 3. Always keep at least one main task (problem) if present
 * 4. Never compress below MAX_COMPRESSION_RATIO
 */
export function compressSession(
  missedSession: MissedSession,
  availableBudget: number
): CompressionPlan {
  const items = [...missedSession.itemsNotCompleted]
  const originalMinutes = missedSession.totalMinutesMissed

  // If already fits, no compression needed
  if (originalMinutes <= availableBudget) {
    return {
      missedSessionId: missedSession.sessionId,
      originalMinutes,
      compressedMinutes: originalMinutes,
      removedItems: [],
      keptItems: items,
      explanation: 'No compression needed - fits in available budget',
    }
  }

  // Minimum compressed size
  const minCompressedMinutes = Math.ceil(
    originalMinutes * EXTENDED_CALENDAR_POLICY.MAX_COMPRESSION_RATIO
  )
  const targetMinutes = Math.max(availableBudget, minCompressedMinutes)

  // Sort items by KEEP priority (highest priority first - problems before drills, high before low)
  const sortedByKeepPriority = [...items].sort((a, b) => {
    return calculateItemPriorityScore(b) - calculateItemPriorityScore(a)
  })

  const keptItems: SessionItem[] = []
  const removedItems: SessionItem[] = []
  let currentMinutes = 0

  // First pass: add items in priority order until we hit budget
  for (const item of sortedByKeepPriority) {
    if (currentMinutes + item.estimatedMinutes <= targetMinutes) {
      keptItems.push(item)
      currentMinutes += item.estimatedMinutes
    } else {
      removedItems.push(item)
    }
  }

  // Second pass: ensure we keep at least one problem if present
  if (
    CALENDAR_POLICY.MAIN_TASK_ALWAYS_KEPT &&
    !keptItems.some(k => k.type === 'problem') &&
    removedItems.some(r => r.type === 'problem')
  ) {
    const problem = removedItems.find(r => r.type === 'problem')!
    removedItems.splice(removedItems.indexOf(problem), 1)
    keptItems.push(problem)
    currentMinutes += problem.estimatedMinutes
  }

  // Ensure we have at least MIN_ITEMS_AFTER_COMPRESSION
  if (keptItems.length < EXTENDED_CALENDAR_POLICY.MIN_ITEMS_AFTER_COMPRESSION && removedItems.length > 0) {
    // Move highest priority removed item back
    const sortedRemoved = [...removedItems].sort(
      (a, b) => calculateItemPriorityScore(b) - calculateItemPriorityScore(a)
    )
    const toKeep = sortedRemoved[0]
    keptItems.push(toKeep)
    removedItems.splice(removedItems.indexOf(toKeep), 1)
    currentMinutes += toKeep.estimatedMinutes
  }

  // Generate explanation
  let explanation: string
  if (removedItems.length === 0) {
    explanation = 'Kept all items within budget'
  } else {
    const removedTypes = removedItems.map(i => i.type)
    const drillsRemoved = removedTypes.filter(t => t === 'drill').length
    const reviewsRemoved = removedTypes.filter(t => t === 'review').length

    const parts: string[] = []
    if (drillsRemoved > 0) parts.push(`${drillsRemoved} drill(s)`)
    if (reviewsRemoved > 0) parts.push(`${reviewsRemoved} review(s)`)

    explanation = `Removed ${parts.join(' and ')} to fit ${targetMinutes} minute budget`
  }

  return {
    missedSessionId: missedSession.sessionId,
    originalMinutes,
    compressedMinutes: currentMinutes,
    removedItems,
    keptItems,
    explanation,
  }
}

/**
 * Apply compression to budget - DETERMINISTIC
 */
export function applyCompression(
  budget: DailyBudget,
  plan: CompressionPlan
): CompressionResult {
  const fitsInBudget = plan.compressedMinutes <= budget.remainingMinutes

  return {
    plan,
    fitsInBudget,
    budgetUsed: fitsInBudget ? plan.compressedMinutes : 0,
    budgetRemaining: fitsInBudget
      ? budget.remainingMinutes - plan.compressedMinutes
      : budget.remainingMinutes,
  }
}

/**
 * Create catch-up session from compression plan - DETERMINISTIC
 */
export function createCatchupSession(
  sessionId: string,
  date: string,
  startTime: string,
  plan: CompressionPlan
): ScheduledSession {
  return {
    id: sessionId,
    date,
    startTime,
    durationMinutes: plan.compressedMinutes,
    type: 'catchup',
    status: 'scheduled',
    items: plan.keptItems,
  }
}

/**
 * Suggest catch-up slots - DETERMINISTIC
 */
export function suggestCatchupSlots(
  availableSlots: readonly AvailableSlot[],
  requiredMinutes: number
): AvailableSlot[] {
  const validSlots = filterValidSlots(availableSlots)

  // Filter slots that can fit the required time
  const suitableSlots = validSlots.filter(
    slot => slot.durationMinutes >= requiredMinutes
  )

  // Sort by start time (prefer earlier slots)
  return sortSlotsByTime(suitableSlots).slice(0, 3)
}

/**
 * Calculate compression summary - DETERMINISTIC
 */
export function getCompressionSummary(plan: CompressionPlan): {
  compressionRatio: number
  itemsRemoved: number
  itemsKept: number
  minutesSaved: number
  prioritiesRemoved: Record<string, number>
} {
  const compressionRatio = plan.compressedMinutes / plan.originalMinutes
  const minutesSaved = plan.originalMinutes - plan.compressedMinutes

  const prioritiesRemoved: Record<string, number> = { high: 0, medium: 0, low: 0 }
  for (const item of plan.removedItems) {
    prioritiesRemoved[item.priority]++
  }

  return {
    compressionRatio,
    itemsRemoved: plan.removedItems.length,
    itemsKept: plan.keptItems.length,
    minutesSaved,
    prioritiesRemoved,
  }
}

/**
 * Validate budget allocation - DETERMINISTIC
 */
export function validateBudgetAllocation(budget: DailyBudget): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (budget.totalMinutes > CALENDAR_POLICY.MAX_DAILY_BUDGET_MINUTES) {
    errors.push(`Total budget exceeds maximum of ${CALENDAR_POLICY.MAX_DAILY_BUDGET_MINUTES} minutes`)
  }

  if (budget.usedMinutes > budget.totalMinutes) {
    errors.push('Used minutes exceeds total budget')
  }

  if (budget.remainingMinutes !== budget.totalMinutes - budget.usedMinutes) {
    errors.push('Remaining minutes calculation is incorrect')
  }

  // Validate sessions total matches used minutes
  const sessionTotal = budget.sessions.reduce((sum, s) => sum + s.durationMinutes, 0)
  if (sessionTotal !== budget.usedMinutes) {
    errors.push('Session durations do not match used minutes')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Get budget utilization - DETERMINISTIC
 */
export function getBudgetUtilization(budget: DailyBudget): {
  utilizationPercent: number
  sessionsCount: number
  completedCount: number
  missedCount: number
  averageSessionLength: number
} {
  const utilizationPercent = budget.totalMinutes > 0
    ? Math.round((budget.usedMinutes / budget.totalMinutes) * 100)
    : 0

  const completedCount = budget.sessions.filter(s => s.status === 'completed').length
  const missedCount = budget.sessions.filter(s => s.status === 'missed').length

  const averageSessionLength = budget.sessions.length > 0
    ? Math.round(budget.usedMinutes / budget.sessions.length)
    : 0

  return {
    utilizationPercent,
    sessionsCount: budget.sessions.length,
    completedCount,
    missedCount,
    averageSessionLength,
  }
}

/**
 * Create session item - DETERMINISTIC
 */
export function createSessionItem(
  id: string,
  type: 'problem' | 'drill' | 'review',
  priority: 'high' | 'medium' | 'low',
  estimatedMinutes: number
): SessionItem {
  return {
    id,
    type,
    priority,
    estimatedMinutes,
    completed: false,
  }
}

/**
 * Create scheduled session - DETERMINISTIC
 */
export function createScheduledSession(
  id: string,
  date: string,
  startTime: string,
  durationMinutes: number,
  type: 'main' | 'drill' | 'review' | 'catchup',
  items: readonly SessionItem[]
): ScheduledSession {
  return {
    id,
    date,
    startTime,
    durationMinutes,
    type,
    status: 'scheduled',
    items,
  }
}

/**
 * Check for scheduling conflicts - DETERMINISTIC
 */
export function hasSchedulingConflict(
  existingSessions: readonly ScheduledSession[],
  newStartTime: string,
  newDurationMinutes: number,
  date: string
): boolean {
  const newStart = new Date(`${date}T${newStartTime}`)
  const newEnd = new Date(newStart.getTime() + newDurationMinutes * 60 * 1000)

  for (const session of existingSessions) {
    if (session.date !== date) continue

    const existingStart = new Date(`${session.date}T${session.startTime}`)
    const existingEnd = new Date(existingStart.getTime() + session.durationMinutes * 60 * 1000)

    // Check for overlap
    if (newStart < existingEnd && newEnd > existingStart) {
      return true
    }
  }

  return false
}

/**
 * Get next available time slot - DETERMINISTIC
 */
export function getNextAvailableTime(
  existingSessions: readonly ScheduledSession[],
  date: string,
  preferredStartTime: string,
  durationMinutes: number
): string | null {
  const sortedSessions = [...existingSessions]
    .filter(s => s.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  let currentTime = preferredStartTime

  // Try to find a gap
  for (const session of sortedSessions) {
    if (currentTime < session.startTime) {
      // Check if gap is big enough
      const gapStart = new Date(`${date}T${currentTime}`)
      const sessionStart = new Date(`${date}T${session.startTime}`)
      const gapMinutes = (sessionStart.getTime() - gapStart.getTime()) / (60 * 1000)

      if (gapMinutes >= durationMinutes) {
        return currentTime
      }
    }

    // Move current time to after this session
    const sessionEnd = new Date(`${date}T${session.startTime}`)
    sessionEnd.setMinutes(sessionEnd.getMinutes() + session.durationMinutes)
    currentTime = sessionEnd.toTimeString().slice(0, 5)
  }

  // Check if there's time after all sessions (before end of day)
  if (currentTime < '23:59') {
    return currentTime
  }

  return null
}
