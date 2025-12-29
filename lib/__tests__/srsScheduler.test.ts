import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createInitialSRS,
  calculateNextReview,
  getDueCards,
  getReviewForecast,
  formatInterval,
  applyReview,
  suspendCard,
  unsuspendCard,
} from '../srsScheduler'
import type { MistakeCard, SRSData } from '@/types/mistakeNotebook'

const baseCard = (overrides: Partial<MistakeCard> = {}): MistakeCard => ({
  id: 'card-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  problemId: 'problem-1',
  problemTitle: 'Test problem',
  stepId: 1,
  stepTitle: 'Step 1',
  conceptTags: ['concept'],
  stepType: 'physics_concept',
  domain: 'Mechanics',
  subdomain: 'Kinematics',
  trigger: 'step_failed',
  severity: 'major',
  misconceptionNote: 'Note',
  hintLevelReached: 0,
  srs: createInitialSRS(),
  reviewCount: 0,
  correctStreak: 0,
  ...overrides,
})

describe('srsScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates initial SRS data with today as due date', () => {
    const srs = createInitialSRS()
    expect(srs.status).toBe('new')
    expect(srs.interval).toBe(0)
    expect(srs.easeFactor).toBe(2.5)
    expect(srs.dueDate).toBe('2024-01-01')
  })

  it('handles learning failures by resetting to the first step', () => {
    const srs: SRSData = {
      status: 'learning',
      interval: 0,
      easeFactor: 2.5,
      dueDate: '2023-12-31',
      step: 1,
    }

    const next = calculateNextReview(srs, 2)
    expect(next.status).toBe('learning')
    expect(next.step).toBe(0)
    expect(next.interval).toBe(0)
    expect(next.dueDate).toBe('2024-01-01')
  })

  it('advances learning steps on a good response', () => {
    const srs: SRSData = {
      status: 'learning',
      interval: 0,
      easeFactor: 2.5,
      dueDate: '2023-12-31',
      step: 0,
    }

    const next = calculateNextReview(srs, 4)
    expect(next.status).toBe('learning')
    expect(next.step).toBe(1)
    expect(next.dueDate).toBe('2024-01-01')
  })

  it('graduates learning cards to review when steps are complete', () => {
    const srs: SRSData = {
      status: 'learning',
      interval: 0,
      easeFactor: 2.5,
      dueDate: '2023-12-31',
      step: 1,
    }

    const next = calculateNextReview(srs, 4)
    expect(next.status).toBe('review')
    expect(next.interval).toBe(1)
    expect(next.dueDate).toBe('2024-01-02')
  })

  it('applies easy bonus intervals in review phase', () => {
    const srs: SRSData = {
      status: 'review',
      interval: 10,
      easeFactor: 2.5,
      dueDate: '2023-12-31',
      step: 0,
    }

    const next = calculateNextReview(srs, 5)
    expect(next.interval).toBe(33)
    expect(next.easeFactor).toBeCloseTo(2.65, 2)
    expect(next.dueDate).toBe('2024-02-03')
  })

  it('resets review cards on failed quality', () => {
    const srs: SRSData = {
      status: 'review',
      interval: 7,
      easeFactor: 2.0,
      dueDate: '2023-12-31',
      step: 0,
    }

    const next = calculateNextReview(srs, 1)
    expect(next.status).toBe('learning')
    expect(next.interval).toBe(0)
    expect(next.step).toBe(0)
    expect(next.easeFactor).toBeCloseTo(1.8, 2)
  })

  it('sorts due cards by overdue status, due date, then severity', () => {
    const cards = [
      baseCard({
        id: 'overdue',
        severity: 'minor',
        srs: { ...createInitialSRS(), status: 'review', dueDate: '2023-12-31', interval: 3 },
      }),
      baseCard({
        id: 'due-major',
        severity: 'major',
        srs: { ...createInitialSRS(), status: 'review', dueDate: '2024-01-01', interval: 1 },
      }),
      baseCard({
        id: 'due-minor',
        severity: 'minor',
        srs: { ...createInitialSRS(), status: 'review', dueDate: '2024-01-01', interval: 1 },
      }),
      baseCard({
        id: 'suspended',
        severity: 'major',
        srs: { ...createInitialSRS(), status: 'suspended', dueDate: '2023-12-31', interval: 3 },
      }),
    ]

    const due = getDueCards(cards)
    expect(due.map(card => card.id)).toEqual(['overdue', 'due-major', 'due-minor'])
  })

  it('builds a review forecast for upcoming days', () => {
    const cards = [
      baseCard({
        id: 'today',
        srs: { ...createInitialSRS(), status: 'review', dueDate: '2024-01-01', interval: 1 },
      }),
      baseCard({
        id: 'tomorrow',
        srs: { ...createInitialSRS(), status: 'review', dueDate: '2024-01-02', interval: 1 },
      }),
      baseCard({
        id: 'suspended',
        srs: { ...createInitialSRS(), status: 'suspended', dueDate: '2024-01-01', interval: 1 },
      }),
    ]

    const forecast = getReviewForecast(cards, 3)
    expect(forecast['2024-01-01']).toBe(1)
    expect(forecast['2024-01-02']).toBe(1)
  })

  it('formats intervals for display', () => {
    expect(formatInterval(0)).toBe('Now')
    expect(formatInterval(1)).toBe('1 day')
    expect(formatInterval(5)).toBe('5 days')
    expect(formatInterval(10)).toBe('1 week')
  })

  it('updates card stats when applying a review', () => {
    const card = baseCard()
    const updated = applyReview(card, 4)

    expect(updated.reviewCount).toBe(1)
    expect(updated.correctStreak).toBe(1)
    expect(updated.lastReviewedAt).toBeTruthy()
  })

  it('suspends and unsuspends cards', () => {
    const card = baseCard({
      srs: { ...createInitialSRS(), status: 'review', interval: 3 },
    })

    const suspended = suspendCard(card)
    expect(suspended.srs.status).toBe('suspended')

    const unsuspended = unsuspendCard(suspended)
    expect(unsuspended.srs.status).toBe('review')
    expect(unsuspended.srs.dueDate).toBe('2024-01-01')
  })
})
