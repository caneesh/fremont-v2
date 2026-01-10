import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

const push = vi.fn()

vi.mock('@/hooks/useStudyDashboardModel', () => ({
  useStudyDashboardModel: () => ({
    model: {
      userId: 'test-user',
      computedAt: new Date().toISOString(),
      needsOnboarding: false,
      plan: null,
      currentModule: null,
      emptyStates: {
        plan: null,
        currentModule: null,
        reviews: null,
        mistakes: null,
        newUser: null,
      },
      activityMetrics: {
        daysPracticed: 0,
        totalDays: 0,
        problemsSolved: 1,
        problemsSolvedChange: 0,
        avgHintLevel: 1,
        avgHintLevelChange: 0,
      },
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

vi.mock('@/hooks/useWarmUp', () => ({
  useWarmUp: () => ({
    phase: 'done',
    isLoading: false,
    error: null,
    session: null,
    canSkip: false,
    currentBlock: null,
    currentItems: [],
    currentItemIndex: 0,
    progress: null,
    start: vi.fn(),
    skipSession: vi.fn(),
    submitAnswer: vi.fn(),
    finishResults: vi.fn(),
    reset: vi.fn(),
  }),
}))

vi.mock('@/lib/featureFlags', async () => {
  const actual = await vi.importActual<any>('@/lib/featureFlags')
  return {
    ...actual,
    FEATURE_FLAGS: {
      ...actual.FEATURE_FLAGS,
      WARMUP_PROTOCOL: false,
    },
  }
})

// DashboardV3 composes many subcomponents; for feature coverage tests,
// keep the assertions focused on DashboardV3 layout and wiring.
vi.mock('../dashboard/DashboardTiles', () => ({ default: () => null }))
vi.mock('../dashboard/WinsCard', () => ({ default: () => null }))
vi.mock('../dashboard/DashboardHeroMetrics', () => ({ default: () => null }))
vi.mock('../dashboard/TodayPlanEditor', () => ({ default: () => null }))
vi.mock('../dashboard/TaskPickerModal', () => ({ default: () => null }))
vi.mock('../dashboard/CoverageSummary', () => ({ default: () => null }))
vi.mock('../dashboard/DashboardDevPanel', () => ({ default: () => null }))
vi.mock('../dashboard/DashboardEmptyState', () => ({ default: () => null }))
vi.mock('../dashboard/TodaysFocus', () => ({ TodaysFocus: () => null }))
vi.mock('../dashboard/ProgressOverview', () => ({ ProgressOverview: () => null }))
vi.mock('../dashboard/MistakeIntelligence', () => ({ MistakeIntelligence: () => null }))
vi.mock('../dashboard/ActiveProblems', () => ({ ActiveProblems: () => null }))
vi.mock('../dashboard/SystemSignals', () => ({ SystemSignals: () => null }))
vi.mock('@/components/warmup', () => ({
  WarmUpGate: () => null,
  WarmUpPlayer: () => null,
  WarmUpResults: () => null,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/study-path',
  useSearchParams: () => new URLSearchParams(),
}))

describe('DashboardV3', () => {
  beforeEach(() => {
    push.mockClear()
    localStorage.clear()
  })

  it('renders the main dashboard view when model is ready', async () => {
    const { default: DashboardV3 } = await import('../dashboard/DashboardV3')
    render(<DashboardV3 />)

    expect(await screen.findByRole('heading', { name: 'Your Dashboard' })).toBeInTheDocument()
  })

  it('calls onSwitchToV1 when View Topics is clicked', async () => {
    const onSwitchToV1 = vi.fn()
    const { default: DashboardV3 } = await import('../dashboard/DashboardV3')
    render(<DashboardV3 onSwitchToV1={onSwitchToV1} />)

    expect(await screen.findByRole('heading', { name: 'Your Dashboard' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'View Topics' }))
    expect(onSwitchToV1).toHaveBeenCalledTimes(1)
  })
})
