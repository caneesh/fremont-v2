import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createInitialSRS,
  calculateNextReview,
  getDueCards,
  getOverdueCards,
  getCardsByStatus,
  getReviewForecast,
  estimateReviewTime,
  formatInterval,
  getStatusDisplay,
  applyReview,
  suspendCard,
  unsuspendCard,
  resetCard,
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

  describe('calculateNextReview - learning phase', () => {
    it('handles new card with good quality', () => {
      const srs: SRSData = {
        status: 'new',
        interval: 0,
        easeFactor: 2.5,
        dueDate: '2024-01-01',
        step: 0,
      }

      const next = calculateNextReview(srs, 4)
      expect(next.status).toBe('learning')
      expect(next.step).toBe(1)
    })

    it('handles hard quality by repeating current step', () => {
      const srs: SRSData = {
        status: 'learning',
        interval: 0,
        easeFactor: 2.5,
        dueDate: '2024-01-01',
        step: 0,
      }

      const next = calculateNextReview(srs, 3)
      expect(next.status).toBe('learning')
      expect(next.step).toBe(0) // Same step
      expect(next.dueDate).toBe('2024-01-01')
    })

    it('handles easy quality by graduating immediately with bonus', () => {
      const srs: SRSData = {
        status: 'learning',
        interval: 0,
        easeFactor: 2.5,
        dueDate: '2024-01-01',
        step: 0,
      }

      const next = calculateNextReview(srs, 5)
      expect(next.status).toBe('review')
      expect(next.interval).toBe(4) // Easy bonus
      expect(next.dueDate).toBe('2024-01-05')
    })

    it('uses last step when step is beyond array bounds', () => {
      const srs: SRSData = {
        status: 'learning',
        interval: 0,
        easeFactor: 2.5,
        dueDate: '2024-01-01',
        step: 10, // Beyond bounds
      }

      const next = calculateNextReview(srs, 3)
      expect(next.step).toBe(10)
    })
  })

  describe('calculateNextReview - review phase', () => {
    it('handles hard quality with reduced interval growth', () => {
      const srs: SRSData = {
        status: 'review',
        interval: 10,
        easeFactor: 2.5,
        dueDate: '2024-01-01',
        step: 0,
      }

      const next = calculateNextReview(srs, 3)
      expect(next.interval).toBe(12) // 10 * 1.2
      expect(next.easeFactor).toBeCloseTo(2.35, 2) // Reduced by 0.15
    })

    it('handles good quality with normal progression', () => {
      const srs: SRSData = {
        status: 'review',
        interval: 10,
        easeFactor: 2.5,
        dueDate: '2024-01-01',
        step: 0,
      }

      const next = calculateNextReview(srs, 4)
      expect(next.interval).toBe(25) // 10 * 2.5
      expect(next.easeFactor).toBe(2.5) // Unchanged
    })

    it('graduates card when interval reaches 21 days with prior 14+ day interval', () => {
      const srs: SRSData = {
        status: 'review',
        interval: 14,
        easeFactor: 2.5,
        dueDate: '2024-01-01',
        step: 0,
      }

      const next = calculateNextReview(srs, 4)
      expect(next.status).toBe('graduated')
      expect(next.interval).toBe(35) // 14 * 2.5
    })

    it('does not graduate if prior interval was less than 14 days', () => {
      const srs: SRSData = {
        status: 'review',
        interval: 10,
        easeFactor: 2.5,
        dueDate: '2024-01-01',
        step: 0,
      }

      const next = calculateNextReview(srs, 4)
      expect(next.status).toBe('review')
      expect(next.interval).toBe(25)
    })

    it('caps interval at 180 days', () => {
      const srs: SRSData = {
        status: 'review',
        interval: 100,
        easeFactor: 2.5,
        dueDate: '2024-01-01',
        step: 0,
      }

      const next = calculateNextReview(srs, 5) // Easy gives extra bonus
      expect(next.interval).toBe(180) // Capped at max
    })

    it('does not let ease factor drop below minimum', () => {
      const srs: SRSData = {
        status: 'review',
        interval: 10,
        easeFactor: 1.3, // Already at minimum
        dueDate: '2024-01-01',
        step: 0,
      }

      const next = calculateNextReview(srs, 1) // Fail
      expect(next.easeFactor).toBe(1.3) // Cannot go lower
    })

    it('handles interval of 0 in review phase', () => {
      const srs: SRSData = {
        status: 'review',
        interval: 0,
        easeFactor: 2.5,
        dueDate: '2024-01-01',
        step: 0,
      }

      const next = calculateNextReview(srs, 4)
      expect(next.interval).toBe(1)
    })

    it('handles interval of 1 in review phase', () => {
      const srs: SRSData = {
        status: 'review',
        interval: 1,
        easeFactor: 2.5,
        dueDate: '2024-01-01',
        step: 0,
      }

      const next = calculateNextReview(srs, 4)
      expect(next.interval).toBe(3)
    })
  })

  describe('calculateNextReview - suspended cards', () => {
    it('does not modify suspended cards', () => {
      const srs: SRSData = {
        status: 'suspended',
        interval: 10,
        easeFactor: 2.5,
        dueDate: '2024-01-01',
        step: 0,
      }

      const next = calculateNextReview(srs, 4)
      expect(next).toEqual(srs)
    })
  })

  describe('getOverdueCards', () => {
    it('returns only overdue non-suspended cards', () => {
      const cards = [
        baseCard({
          id: 'overdue',
          srs: { ...createInitialSRS(), status: 'review', dueDate: '2023-12-31', interval: 3 },
        }),
        baseCard({
          id: 'due-today',
          srs: { ...createInitialSRS(), status: 'review', dueDate: '2024-01-01', interval: 1 },
        }),
        baseCard({
          id: 'suspended-overdue',
          srs: { ...createInitialSRS(), status: 'suspended', dueDate: '2023-12-31', interval: 3 },
        }),
      ]

      const overdue = getOverdueCards(cards)
      expect(overdue.length).toBe(1)
      expect(overdue[0].id).toBe('overdue')
    })
  })

  describe('getCardsByStatus', () => {
    it('filters cards by status', () => {
      const cards = [
        baseCard({ id: 'new', srs: { ...createInitialSRS(), status: 'new' } }),
        baseCard({ id: 'learning', srs: { ...createInitialSRS(), status: 'learning' } }),
        baseCard({ id: 'review', srs: { ...createInitialSRS(), status: 'review', interval: 1 } }),
      ]

      expect(getCardsByStatus(cards, 'new').length).toBe(1)
      expect(getCardsByStatus(cards, 'learning').length).toBe(1)
      expect(getCardsByStatus(cards, 'review').length).toBe(1)
      expect(getCardsByStatus(cards, 'graduated').length).toBe(0)
    })
  })

  describe('estimateReviewTime', () => {
    it('estimates 30 seconds per card', () => {
      expect(estimateReviewTime(0)).toBe(0)
      expect(estimateReviewTime(2)).toBe(1) // 2 * 0.5 = 1 minute
      expect(estimateReviewTime(10)).toBe(5) // 10 * 0.5 = 5 minutes
      expect(estimateReviewTime(1)).toBe(1) // ceil(0.5) = 1
    })
  })

  describe('resetCard', () => {
    it('resets card to initial state', () => {
      const card = baseCard({
        srs: { ...createInitialSRS(), status: 'review', interval: 10 },
        reviewCount: 5,
        correctStreak: 3,
        lastReviewedAt: '2024-01-01T10:00:00Z',
      })

      const reset = resetCard(card)
      expect(reset.srs.status).toBe('new')
      expect(reset.srs.interval).toBe(0)
      expect(reset.reviewCount).toBe(0)
      expect(reset.correctStreak).toBe(0)
      expect(reset.lastReviewedAt).toBeUndefined()
    })
  })

  describe('formatInterval - extended', () => {
    it('formats weeks correctly', () => {
      expect(formatInterval(7)).toBe('1 week')
      expect(formatInterval(14)).toBe('2 weeks')
      expect(formatInterval(21)).toBe('3 weeks')
    })

    it('formats months correctly', () => {
      expect(formatInterval(30)).toBe('1 month')
      expect(formatInterval(60)).toBe('2 months')
      expect(formatInterval(90)).toBe('3 months')
    })

    it('formats years correctly', () => {
      expect(formatInterval(365)).toBe('1 year')
      expect(formatInterval(730)).toBe('2 years')
    })
  })

  describe('getStatusDisplay', () => {
    it('returns correct display for new status', () => {
      const display = getStatusDisplay('new')
      expect(display.label).toBe('New')
      expect(display.color).toContain('blue')
      expect(display.bgClass).toContain('blue')
    })

    it('returns correct display for learning status', () => {
      const display = getStatusDisplay('learning')
      expect(display.label).toBe('Learning')
      expect(display.color).toContain('amber')
      expect(display.bgClass).toContain('amber')
    })

    it('returns correct display for review status', () => {
      const display = getStatusDisplay('review')
      expect(display.label).toBe('Review')
      expect(display.color).toContain('green')
      expect(display.bgClass).toContain('green')
    })

    it('returns correct display for graduated status', () => {
      const display = getStatusDisplay('graduated')
      expect(display.label).toBe('Mastered')
      expect(display.color).toContain('purple')
      expect(display.bgClass).toContain('purple')
    })

    it('returns correct display for suspended status', () => {
      const display = getStatusDisplay('suspended')
      expect(display.label).toBe('Suspended')
      expect(display.color).toContain('gray')
      expect(display.bgClass).toContain('gray')
    })
  })

  describe('unsuspendCard - learning status', () => {
    it('returns to learning status if interval is 0', () => {
      const card = baseCard({
        srs: { ...createInitialSRS(), status: 'suspended', interval: 0 },
      })

      const unsuspended = unsuspendCard(card)
      expect(unsuspended.srs.status).toBe('learning')
    })
  })

  describe('applyReview - streak handling', () => {
    it('resets streak on failed review', () => {
      const card = baseCard({
        correctStreak: 5,
      })

      const updated = applyReview(card, 2) // Failed
      expect(updated.correctStreak).toBe(0)
    })

    it('increments streak on passed review', () => {
      const card = baseCard({
        correctStreak: 5,
      })

      const updated = applyReview(card, 3) // Passed (hard)
      expect(updated.correctStreak).toBe(6)
    })
  })
})
