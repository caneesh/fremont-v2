/**
 * Calendar Integration Policy Tests
 *
 * Tests for deterministic compression algorithm and calendar-aware scheduling.
 */

import { describe, it, expect } from 'vitest'
import {
  createSyncStatus,
  connectCalendar,
  disconnectCalendar,
  recordSyncSuccess,
  recordSyncError,
  needsSync,
  validateSlot,
  filterValidSlots,
  sortSlotsByTime,
  getBestSlotsForDay,
  createDailyBudget,
  canScheduleSession,
  scheduleSession,
  completeSession,
  detectMissedSessions,
  calculateItemPriorityScore,
  sortItemsForRemoval,
  compressSession,
  applyCompression,
  createCatchupSession,
  suggestCatchupSlots,
  getCompressionSummary,
  validateBudgetAllocation,
  getBudgetUtilization,
  createSessionItem,
  createScheduledSession,
  hasSchedulingConflict,
  getNextAvailableTime,
  CALENDAR_POLICY,
  EXTENDED_CALENDAR_POLICY,
} from '../calendar-integration-policy'
import type {
  AvailableSlot,
  DailyBudget,
  ScheduledSession,
  SessionItem,
  MissedSession,
} from '@/types/calendarIntegration'

// Helper to create slot
function createSlot(overrides?: Partial<AvailableSlot>): AvailableSlot {
  return {
    start: '2025-01-15T09:00:00Z',
    end: '2025-01-15T10:00:00Z',
    durationMinutes: 60,
    source: 'google',
    ...overrides,
  }
}

// Helper to create session item
function createItem(overrides?: Partial<SessionItem>): SessionItem {
  return {
    id: 'item-1',
    type: 'drill',
    priority: 'medium',
    estimatedMinutes: 10,
    completed: false,
    ...overrides,
  }
}

// Helper to create scheduled session
function createSession(overrides?: Partial<ScheduledSession>): ScheduledSession {
  return {
    id: 'session-1',
    date: '2025-01-15',
    startTime: '09:00',
    durationMinutes: 30,
    type: 'main',
    status: 'scheduled',
    items: [],
    ...overrides,
  }
}

// Helper to create daily budget
function createBudget(overrides?: Partial<DailyBudget>): DailyBudget {
  return {
    userId: 'user-1',
    date: '2025-01-15',
    totalMinutes: 60,
    usedMinutes: 0,
    remainingMinutes: 60,
    sessions: [],
    ...overrides,
  }
}

describe('createSyncStatus', () => {
  it('should create disconnected status', () => {
    const status = createSyncStatus('user-1')

    expect(status.userId).toBe('user-1')
    expect(status.connected).toBe(false)
    expect(status.provider).toBeUndefined()
  })
})

describe('connectCalendar', () => {
  it('should connect with provider', () => {
    const status = createSyncStatus('user-1')
    const connected = connectCalendar(status, 'google')

    expect(connected.connected).toBe(true)
    expect(connected.provider).toBe('google')
    expect(connected.lastSyncAt).toBeDefined()
    expect(connected.syncError).toBeUndefined()
  })
})

describe('disconnectCalendar', () => {
  it('should disconnect and clear provider', () => {
    const status = connectCalendar(createSyncStatus('user-1'), 'google')
    const disconnected = disconnectCalendar(status)

    expect(disconnected.connected).toBe(false)
    expect(disconnected.provider).toBeUndefined()
  })
})

describe('recordSyncSuccess', () => {
  it('should update lastSyncAt and clear error', () => {
    let status = connectCalendar(createSyncStatus('user-1'), 'google')
    status = recordSyncError(status, 'Previous error')
    const synced = recordSyncSuccess(status)

    expect(synced.lastSyncAt).toBeDefined()
    expect(synced.syncError).toBeUndefined()
  })
})

describe('recordSyncError', () => {
  it('should record error message', () => {
    const status = connectCalendar(createSyncStatus('user-1'), 'google')
    const errored = recordSyncError(status, 'Connection failed')

    expect(errored.syncError).toBe('Connection failed')
  })
})

describe('needsSync', () => {
  it('should return false if not connected', () => {
    const status = createSyncStatus('user-1')
    expect(needsSync(status)).toBe(false)
  })

  it('should return true if never synced', () => {
    const status = { ...createSyncStatus('user-1'), connected: true }
    expect(needsSync(status)).toBe(true)
  })

  it('should return true if sync is stale', () => {
    const oldTime = new Date()
    oldTime.setHours(oldTime.getHours() - 2)

    const status = {
      ...createSyncStatus('user-1'),
      connected: true,
      lastSyncAt: oldTime.toISOString(),
    }
    expect(needsSync(status)).toBe(true)
  })

  it('should return false if recently synced', () => {
    const status = connectCalendar(createSyncStatus('user-1'), 'google')
    expect(needsSync(status)).toBe(false)
  })
})

describe('validateSlot', () => {
  it('should accept valid slot', () => {
    const result = validateSlot(createSlot())
    expect(result.valid).toBe(true)
  })

  it('should reject invalid date format', () => {
    const result = validateSlot(createSlot({ start: 'invalid' }))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Invalid')
  })

  it('should reject end before start', () => {
    const result = validateSlot(createSlot({
      start: '2025-01-15T10:00:00Z',
      end: '2025-01-15T09:00:00Z',
    }))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('after')
  })

  it('should reject too short slot', () => {
    const result = validateSlot(createSlot({ durationMinutes: 5 }))
    expect(result.valid).toBe(false)
    expect(result.error).toContain('at least')
  })
})

describe('filterValidSlots', () => {
  it('should filter out invalid slots', () => {
    const slots = [
      createSlot({ durationMinutes: 30 }),
      createSlot({ durationMinutes: 5 }), // Too short
      createSlot({ durationMinutes: 60 }),
    ]

    const valid = filterValidSlots(slots)

    expect(valid).toHaveLength(2)
  })
})

describe('sortSlotsByTime', () => {
  it('should sort by start time', () => {
    const slots = [
      createSlot({ start: '2025-01-15T14:00:00Z' }),
      createSlot({ start: '2025-01-15T09:00:00Z' }),
      createSlot({ start: '2025-01-15T11:00:00Z' }),
    ]

    const sorted = sortSlotsByTime(slots)

    // Verify sorted order by comparing timestamps
    expect(new Date(sorted[0].start).getTime()).toBeLessThan(new Date(sorted[1].start).getTime())
    expect(new Date(sorted[1].start).getTime()).toBeLessThan(new Date(sorted[2].start).getTime())
    // Verify the correct slots are in order
    expect(sorted[0].start).toBe('2025-01-15T09:00:00Z')
    expect(sorted[1].start).toBe('2025-01-15T11:00:00Z')
    expect(sorted[2].start).toBe('2025-01-15T14:00:00Z')
  })
})

describe('getBestSlotsForDay', () => {
  it('should prefer slots close to target duration', () => {
    const slots = [
      createSlot({ durationMinutes: 60 }),
      createSlot({ durationMinutes: 30 }),
      createSlot({ durationMinutes: 45 }),
    ]

    const best = getBestSlotsForDay(slots, 30)

    expect(best[0].durationMinutes).toBe(30)
  })

  it('should limit results', () => {
    const slots = Array(10).fill(null).map((_, i) =>
      createSlot({ durationMinutes: 30 + i })
    )

    const best = getBestSlotsForDay(slots, 30)

    expect(best.length).toBeLessThanOrEqual(EXTENDED_CALENDAR_POLICY.MAX_SLOTS_PER_DAY)
  })
})

describe('createDailyBudget', () => {
  it('should create budget with default minutes', () => {
    const budget = createDailyBudget('user-1', '2025-01-15')

    expect(budget.totalMinutes).toBe(CALENDAR_POLICY.DEFAULT_DAILY_BUDGET_MINUTES)
    expect(budget.usedMinutes).toBe(0)
    expect(budget.remainingMinutes).toBe(budget.totalMinutes)
  })

  it('should cap at max budget', () => {
    const budget = createDailyBudget('user-1', '2025-01-15', 500)

    expect(budget.totalMinutes).toBe(CALENDAR_POLICY.MAX_DAILY_BUDGET_MINUTES)
  })
})

describe('canScheduleSession', () => {
  it('should allow valid session', () => {
    const budget = createBudget()
    const result = canScheduleSession(budget, 30)

    expect(result.canSchedule).toBe(true)
  })

  it('should reject too short session', () => {
    const budget = createBudget()
    const result = canScheduleSession(budget, 5)

    expect(result.canSchedule).toBe(false)
    expect(result.reason).toContain('at least')
  })

  it('should reject when exceeds budget', () => {
    const budget = createBudget({ remainingMinutes: 20 })
    const result = canScheduleSession(budget, 30)

    expect(result.canSchedule).toBe(false)
    expect(result.reason).toContain('budget')
  })
})

describe('scheduleSession', () => {
  it('should add session and update budget', () => {
    const budget = createBudget()
    const session = createSession({ durationMinutes: 30 })

    const updated = scheduleSession(budget, session)

    expect(updated.sessions).toHaveLength(1)
    expect(updated.usedMinutes).toBe(30)
    expect(updated.remainingMinutes).toBe(30)
  })
})

describe('completeSession', () => {
  it('should mark session as completed', () => {
    const budget = createBudget({
      sessions: [createSession({ id: 'sess-1' })],
    })

    const updated = completeSession(budget, 'sess-1')

    expect(updated.sessions[0].status).toBe('completed')
  })
})

describe('detectMissedSessions', () => {
  it('should detect past uncompleted sessions', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    const dateStr = pastDate.toISOString().split('T')[0]

    const budget = createBudget({
      date: dateStr,
      sessions: [
        createSession({
          date: dateStr,
          startTime: '09:00',
          items: [createItem()],
        }),
      ],
    })

    const missed = detectMissedSessions(budget)

    expect(missed).toHaveLength(1)
  })

  it('should not detect completed sessions', () => {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 1)
    const dateStr = pastDate.toISOString().split('T')[0]

    const budget = createBudget({
      date: dateStr,
      sessions: [
        createSession({
          date: dateStr,
          startTime: '09:00',
          status: 'completed',
          items: [createItem()],
        }),
      ],
    })

    const missed = detectMissedSessions(budget)

    expect(missed).toHaveLength(0)
  })
})

describe('calculateItemPriorityScore', () => {
  it('should give higher score to problems', () => {
    const problem = createItem({ type: 'problem', priority: 'high' })
    const drill = createItem({ type: 'drill', priority: 'high' })

    expect(calculateItemPriorityScore(problem)).toBeGreaterThan(
      calculateItemPriorityScore(drill)
    )
  })

  it('should give higher score to high priority', () => {
    const highPriority = createItem({ priority: 'high' })
    const lowPriority = createItem({ priority: 'low' })

    expect(calculateItemPriorityScore(highPriority)).toBeGreaterThan(
      calculateItemPriorityScore(lowPriority)
    )
  })
})

describe('sortItemsForRemoval', () => {
  it('should put low priority drills first', () => {
    const items = [
      createItem({ id: 'problem', type: 'problem', priority: 'high' }),
      createItem({ id: 'drill-low', type: 'drill', priority: 'low' }),
      createItem({ id: 'review', type: 'review', priority: 'medium' }),
    ]

    const sorted = sortItemsForRemoval(items)

    expect(sorted[0].id).toBe('drill-low')
    expect(sorted[sorted.length - 1].id).toBe('problem')
  })
})

describe('compressSession', () => {
  it('should not compress if fits in budget', () => {
    const missed: MissedSession = {
      sessionId: 'sess-1',
      originalDate: '2025-01-15',
      itemsNotCompleted: [createItem({ estimatedMinutes: 20 })],
      totalMinutesMissed: 20,
    }

    const plan = compressSession(missed, 30)

    expect(plan.compressedMinutes).toBe(20)
    expect(plan.removedItems).toHaveLength(0)
  })

  it('should remove low priority items first', () => {
    const missed: MissedSession = {
      sessionId: 'sess-1',
      originalDate: '2025-01-15',
      itemsNotCompleted: [
        createItem({ id: 'drill-low', type: 'drill', priority: 'low', estimatedMinutes: 10 }),
        createItem({ id: 'problem', type: 'problem', priority: 'high', estimatedMinutes: 20 }),
      ],
      totalMinutesMissed: 30,
    }

    const plan = compressSession(missed, 20)

    expect(plan.removedItems.some(i => i.id === 'drill-low')).toBe(true)
    expect(plan.keptItems.some(i => i.id === 'problem')).toBe(true)
  })

  it('should always keep main problem task', () => {
    const missed: MissedSession = {
      sessionId: 'sess-1',
      originalDate: '2025-01-15',
      itemsNotCompleted: [
        createItem({ id: 'drill', type: 'drill', estimatedMinutes: 10 }),
        createItem({ id: 'problem', type: 'problem', estimatedMinutes: 30 }),
      ],
      totalMinutesMissed: 40,
    }

    const plan = compressSession(missed, 15) // Very tight budget

    expect(plan.keptItems.some(i => i.type === 'problem')).toBe(true)
  })

  it('should generate explanation', () => {
    const missed: MissedSession = {
      sessionId: 'sess-1',
      originalDate: '2025-01-15',
      itemsNotCompleted: [
        createItem({ type: 'drill', estimatedMinutes: 15 }),
        createItem({ type: 'drill', estimatedMinutes: 15 }),
      ],
      totalMinutesMissed: 30,
    }

    const plan = compressSession(missed, 15)

    expect(plan.explanation.length).toBeGreaterThan(0)
  })
})

describe('applyCompression', () => {
  it('should check if fits in budget', () => {
    const budget = createBudget({ remainingMinutes: 30 })
    const plan = {
      missedSessionId: 'sess-1',
      originalMinutes: 60,
      compressedMinutes: 25,
      removedItems: [],
      keptItems: [],
      explanation: '',
    }

    const result = applyCompression(budget, plan)

    expect(result.fitsInBudget).toBe(true)
    expect(result.budgetUsed).toBe(25)
    expect(result.budgetRemaining).toBe(5)
  })

  it('should report when does not fit', () => {
    const budget = createBudget({ remainingMinutes: 10 })
    const plan = {
      missedSessionId: 'sess-1',
      originalMinutes: 60,
      compressedMinutes: 25,
      removedItems: [],
      keptItems: [],
      explanation: '',
    }

    const result = applyCompression(budget, plan)

    expect(result.fitsInBudget).toBe(false)
    expect(result.budgetUsed).toBe(0)
  })
})

describe('createCatchupSession', () => {
  it('should create catchup type session', () => {
    const plan = {
      missedSessionId: 'original-1',
      originalMinutes: 60,
      compressedMinutes: 30,
      removedItems: [],
      keptItems: [createItem()],
      explanation: '',
    }

    const session = createCatchupSession('catchup-1', '2025-01-16', '10:00', plan)

    expect(session.type).toBe('catchup')
    expect(session.durationMinutes).toBe(30)
    expect(session.items).toHaveLength(1)
  })
})

describe('suggestCatchupSlots', () => {
  it('should filter slots by required duration', () => {
    const slots = [
      createSlot({ durationMinutes: 20 }),
      createSlot({ durationMinutes: 40 }),
      createSlot({ durationMinutes: 60 }),
    ]

    const suggestions = suggestCatchupSlots(slots, 30)

    expect(suggestions.every(s => s.durationMinutes >= 30)).toBe(true)
  })

  it('should limit suggestions to 3', () => {
    const slots = Array(10).fill(null).map(() => createSlot({ durationMinutes: 60 }))

    const suggestions = suggestCatchupSlots(slots, 30)

    expect(suggestions.length).toBeLessThanOrEqual(3)
  })
})

describe('getCompressionSummary', () => {
  it('should calculate compression statistics', () => {
    const plan = {
      missedSessionId: 'sess-1',
      originalMinutes: 60,
      compressedMinutes: 30,
      removedItems: [
        createItem({ priority: 'low' }),
        createItem({ priority: 'low' }),
        createItem({ priority: 'medium' }),
      ],
      keptItems: [createItem({ priority: 'high' })],
      explanation: '',
    }

    const summary = getCompressionSummary(plan)

    expect(summary.compressionRatio).toBe(0.5)
    expect(summary.itemsRemoved).toBe(3)
    expect(summary.itemsKept).toBe(1)
    expect(summary.minutesSaved).toBe(30)
    expect(summary.prioritiesRemoved.low).toBe(2)
    expect(summary.prioritiesRemoved.medium).toBe(1)
  })
})

describe('validateBudgetAllocation', () => {
  it('should accept valid budget', () => {
    const budget = createBudget({
      totalMinutes: 60,
      usedMinutes: 30,
      remainingMinutes: 30,
      sessions: [createSession({ durationMinutes: 30 })],
    })

    const result = validateBudgetAllocation(budget)

    expect(result.valid).toBe(true)
  })

  it('should reject exceeded budget', () => {
    const budget = createBudget({
      totalMinutes: 60,
      usedMinutes: 70,
      remainingMinutes: -10,
    })

    const result = validateBudgetAllocation(budget)

    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.includes('exceeds'))).toBe(true)
  })

  it('should reject mismatched session totals', () => {
    const budget = createBudget({
      totalMinutes: 60,
      usedMinutes: 30,
      remainingMinutes: 30,
      sessions: [createSession({ durationMinutes: 20 })], // Doesn't match usedMinutes
    })

    const result = validateBudgetAllocation(budget)

    expect(result.valid).toBe(false)
  })
})

describe('getBudgetUtilization', () => {
  it('should calculate utilization statistics', () => {
    const budget = createBudget({
      totalMinutes: 60,
      usedMinutes: 45,
      sessions: [
        createSession({ durationMinutes: 30, status: 'completed' }),
        createSession({ durationMinutes: 15, status: 'missed' }),
      ],
    })

    const util = getBudgetUtilization(budget)

    expect(util.utilizationPercent).toBe(75)
    expect(util.sessionsCount).toBe(2)
    expect(util.completedCount).toBe(1)
    expect(util.missedCount).toBe(1)
  })

  it('should handle empty budget', () => {
    const budget = createBudget()
    const util = getBudgetUtilization(budget)

    expect(util.utilizationPercent).toBe(0)
    expect(util.averageSessionLength).toBe(0)
  })
})

describe('createSessionItem', () => {
  it('should create item with given properties', () => {
    const item = createSessionItem('item-1', 'problem', 'high', 30)

    expect(item.id).toBe('item-1')
    expect(item.type).toBe('problem')
    expect(item.priority).toBe('high')
    expect(item.estimatedMinutes).toBe(30)
    expect(item.completed).toBe(false)
  })
})

describe('createScheduledSession', () => {
  it('should create scheduled session', () => {
    const items = [createItem()]
    const session = createScheduledSession(
      'sess-1',
      '2025-01-15',
      '09:00',
      30,
      'main',
      items
    )

    expect(session.id).toBe('sess-1')
    expect(session.status).toBe('scheduled')
    expect(session.type).toBe('main')
    expect(session.items).toHaveLength(1)
  })
})

describe('hasSchedulingConflict', () => {
  it('should detect overlapping sessions', () => {
    const existing = [
      createSession({ startTime: '09:00', durationMinutes: 60 }),
    ]

    const conflict = hasSchedulingConflict(existing, '09:30', 30, '2025-01-15')

    expect(conflict).toBe(true)
  })

  it('should allow non-overlapping sessions', () => {
    const existing = [
      createSession({ startTime: '09:00', durationMinutes: 60 }),
    ]

    const conflict = hasSchedulingConflict(existing, '10:30', 30, '2025-01-15')

    expect(conflict).toBe(false)
  })

  it('should allow adjacent sessions', () => {
    const existing = [
      createSession({ startTime: '09:00', durationMinutes: 60 }),
    ]

    const conflict = hasSchedulingConflict(existing, '10:00', 30, '2025-01-15')

    expect(conflict).toBe(false)
  })
})

describe('getNextAvailableTime', () => {
  it('should find gap between sessions', () => {
    const existing = [
      createSession({ startTime: '09:00', durationMinutes: 30 }),
      createSession({ startTime: '11:00', durationMinutes: 30 }),
    ]

    // Start at 09:00 so it has to look for gap after first session
    const nextTime = getNextAvailableTime(existing, '2025-01-15', '09:00', 60)

    expect(nextTime).toBe('09:30')
  })

  it('should return preferred time if available', () => {
    const existing: ScheduledSession[] = []

    const nextTime = getNextAvailableTime(existing, '2025-01-15', '09:00', 30)

    expect(nextTime).toBe('09:00')
  })

  it('should return preferred time if before first session with enough time', () => {
    const existing = [
      createSession({ startTime: '10:00', durationMinutes: 30 }),
    ]

    const nextTime = getNextAvailableTime(existing, '2025-01-15', '08:00', 60)

    expect(nextTime).toBe('08:00')
  })
})

describe('CALENDAR_POLICY', () => {
  it('should have valid budget limits', () => {
    expect(CALENDAR_POLICY.DEFAULT_DAILY_BUDGET_MINUTES).toBeGreaterThan(0)
    expect(CALENDAR_POLICY.MAX_DAILY_BUDGET_MINUTES).toBeGreaterThan(
      CALENDAR_POLICY.DEFAULT_DAILY_BUDGET_MINUTES
    )
  })

  it('should have valid session duration', () => {
    expect(CALENDAR_POLICY.MIN_SESSION_DURATION_MINUTES).toBeGreaterThan(0)
  })

  it('should have valid compression priority order', () => {
    expect(CALENDAR_POLICY.COMPRESSION_PRIORITY_ORDER).toContain('drill')
    expect(CALENDAR_POLICY.COMPRESSION_PRIORITY_ORDER).toContain('review')
    expect(CALENDAR_POLICY.COMPRESSION_PRIORITY_ORDER).toContain('problem')
  })
})

describe('EXTENDED_CALENDAR_POLICY', () => {
  it('should have valid priority weights', () => {
    expect(EXTENDED_CALENDAR_POLICY.PRIORITY_WEIGHTS.high).toBeGreaterThan(
      EXTENDED_CALENDAR_POLICY.PRIORITY_WEIGHTS.low
    )
  })

  it('should have valid compression ratio', () => {
    expect(EXTENDED_CALENDAR_POLICY.MAX_COMPRESSION_RATIO).toBeGreaterThan(0)
    expect(EXTENDED_CALENDAR_POLICY.MAX_COMPRESSION_RATIO).toBeLessThanOrEqual(1)
  })

  it('should have valid type removal order', () => {
    // Drills removed first, problems last
    expect(EXTENDED_CALENDAR_POLICY.TYPE_REMOVAL_ORDER.drill).toBeLessThan(
      EXTENDED_CALENDAR_POLICY.TYPE_REMOVAL_ORDER.problem
    )
  })
})
