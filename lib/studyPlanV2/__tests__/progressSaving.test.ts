import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StudyPlanV2Service } from '../studyPlanV2Service'
import { createInitialPatternState } from '../scheduler'
import type { UserPatternState, StudyPlanV2Repository } from '@/types/studyPlanV2'

// Helper to create a mock repository
function createMockRepo(): StudyPlanV2Repository {
  return {
    user: {
      getUserPatternState: vi.fn(),
      saveUserPatternState: vi.fn(),
      getUserPatternStates: vi.fn(() => []),
      saveUserPatternStates: vi.fn(),
      getCurrentTrackId: vi.fn(),
      setCurrentTrackId: vi.fn(),
      getDailyPlan: vi.fn(),
      saveDailyPlan: vi.fn(),
      getUserMetaSkillStates: vi.fn(() => []),
      getUserMetaSkillState: vi.fn(),
      saveUserMetaSkillState: vi.fn(),
      getUserMistakeEvents: vi.fn(() => []),
      addMistakeEvent: vi.fn(),
      getStepAttempts: vi.fn(() => []),
      addStepAttempt: vi.fn(),
      getLastMetaSkillDate: vi.fn(),
      setLastMetaSkillDate: vi.fn(),
    },
    content: {
      getAllPatterns: vi.fn(() => []),
      getPatternById: vi.fn(),
      getAllPatternTracks: vi.fn(() => []),
      getPatternTrackById: vi.fn(),
      getAllMetaSkills: vi.fn(() => []),
      getMetaSkillById: vi.fn(),
      getAllMistakeTypes: vi.fn(() => []),
      getMistakeTypeById: vi.fn(),
      getAllProblems: vi.fn(() => []),
      getProblemById: vi.fn(),
      getProblemsByPattern: vi.fn(() => []),
      getProblemsByMistakeType: vi.fn(() => []),
    },
  } as unknown as StudyPlanV2Repository
}

describe('Progress Saving Logic', () => {
  let service: StudyPlanV2Service
  let mockRepo: StudyPlanV2Repository

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T10:00:00Z'))

    mockRepo = createMockRepo()
    service = new StudyPlanV2Service(mockRepo)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('markPatternSessionComplete', () => {
    describe('learn session', () => {
      it('sets learnCompleted to true for new pattern', () => {
        ;(mockRepo.user.getUserPatternState as any).mockReturnValue(null)

        service.markPatternSessionComplete('user-1', 'pat-1', 'learn')

        expect(mockRepo.user.saveUserPatternState).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-1',
            patternId: 'pat-1',
            learnCompleted: true,
            learnCompletedAt: expect.any(String),
          })
        )
      })

      it('sets learnCompleted on existing state', () => {
        const existingState: UserPatternState = {
          ...createInitialPatternState('user-1', 'pat-1'),
          mastery: 0.5,
        }
        ;(mockRepo.user.getUserPatternState as any).mockReturnValue(existingState)

        service.markPatternSessionComplete('user-1', 'pat-1', 'learn')

        expect(mockRepo.user.saveUserPatternState).toHaveBeenCalledWith(
          expect.objectContaining({
            learnCompleted: true,
            mastery: 0.5, // preserves existing mastery
          })
        )
      })

      it('does not re-set learnCompleted if already true', () => {
        const existingState: UserPatternState = {
          ...createInitialPatternState('user-1', 'pat-1'),
          learnCompleted: true,
          learnCompletedAt: '2024-01-10T10:00:00Z',
        }
        ;(mockRepo.user.getUserPatternState as any).mockReturnValue(existingState)

        service.markPatternSessionComplete('user-1', 'pat-1', 'learn')

        // Should still save but with original timestamp
        expect(mockRepo.user.saveUserPatternState).toHaveBeenCalledWith(
          expect.objectContaining({
            learnCompleted: true,
            learnCompletedAt: '2024-01-10T10:00:00Z', // original timestamp preserved
          })
        )
      })
    })

    describe('practice session', () => {
      it('sets guidedPracticeCompleted to true', () => {
        const existingState: UserPatternState = {
          ...createInitialPatternState('user-1', 'pat-1'),
          learnCompleted: true,
        }
        ;(mockRepo.user.getUserPatternState as any).mockReturnValue(existingState)

        service.markPatternSessionComplete('user-1', 'pat-1', 'practice')

        expect(mockRepo.user.saveUserPatternState).toHaveBeenCalledWith(
          expect.objectContaining({
            guidedPracticeCompleted: true,
            guidedPracticeCompletedAt: expect.any(String),
          })
        )
      })

      it('does not re-set guidedPracticeCompleted if already true', () => {
        const existingState: UserPatternState = {
          ...createInitialPatternState('user-1', 'pat-1'),
          learnCompleted: true,
          guidedPracticeCompleted: true,
          guidedPracticeCompletedAt: '2024-01-12T10:00:00Z',
        }
        ;(mockRepo.user.getUserPatternState as any).mockReturnValue(existingState)

        service.markPatternSessionComplete('user-1', 'pat-1', 'practice')

        expect(mockRepo.user.saveUserPatternState).toHaveBeenCalledWith(
          expect.objectContaining({
            guidedPracticeCompleted: true,
            guidedPracticeCompletedAt: '2024-01-12T10:00:00Z',
          })
        )
      })
    })

    describe('drill session', () => {
      it('increments drillsAttempted by 1', () => {
        const existingState: UserPatternState = {
          ...createInitialPatternState('user-1', 'pat-1'),
          learnCompleted: true,
          guidedPracticeCompleted: true,
          drillsAttempted: 3,
        }
        ;(mockRepo.user.getUserPatternState as any).mockReturnValue(existingState)

        service.markPatternSessionComplete('user-1', 'pat-1', 'drill')

        expect(mockRepo.user.saveUserPatternState).toHaveBeenCalledWith(
          expect.objectContaining({
            drillsAttempted: 4,
          })
        )
      })

      it('starts drillsAttempted at 1 for new state', () => {
        ;(mockRepo.user.getUserPatternState as any).mockReturnValue(null)

        service.markPatternSessionComplete('user-1', 'pat-1', 'drill')

        expect(mockRepo.user.saveUserPatternState).toHaveBeenCalledWith(
          expect.objectContaining({
            drillsAttempted: 1,
          })
        )
      })

      it('can increment drills multiple times', () => {
        const state: UserPatternState = {
          ...createInitialPatternState('user-1', 'pat-1'),
          drillsAttempted: 0,
        }

        // First drill
        ;(mockRepo.user.getUserPatternState as any).mockReturnValue({ ...state })
        service.markPatternSessionComplete('user-1', 'pat-1', 'drill')

        // Second drill
        ;(mockRepo.user.getUserPatternState as any).mockReturnValue({ ...state, drillsAttempted: 1 })
        service.markPatternSessionComplete('user-1', 'pat-1', 'drill')

        // Third drill
        ;(mockRepo.user.getUserPatternState as any).mockReturnValue({ ...state, drillsAttempted: 2 })
        service.markPatternSessionComplete('user-1', 'pat-1', 'drill')

        expect(mockRepo.user.saveUserPatternState).toHaveBeenLastCalledWith(
          expect.objectContaining({
            drillsAttempted: 3,
          })
        )
      })
    })

    describe('state persistence', () => {
      it('always calls saveUserPatternState', () => {
        ;(mockRepo.user.getUserPatternState as any).mockReturnValue(null)

        service.markPatternSessionComplete('user-1', 'pat-1', 'learn')

        expect(mockRepo.user.saveUserPatternState).toHaveBeenCalledTimes(1)
      })

      it('preserves other state fields when updating', () => {
        const existingState: UserPatternState = {
          ...createInitialPatternState('user-1', 'pat-1'),
          mastery: 0.75,
          recentFailCount: 2,
          lastSeenAt: '2024-01-14T10:00:00Z',
          reviewDueAt: '2024-01-20T10:00:00Z',
        }
        ;(mockRepo.user.getUserPatternState as any).mockReturnValue(existingState)

        service.markPatternSessionComplete('user-1', 'pat-1', 'learn')

        expect(mockRepo.user.saveUserPatternState).toHaveBeenCalledWith(
          expect.objectContaining({
            mastery: 0.75,
            recentFailCount: 2,
            lastSeenAt: '2024-01-14T10:00:00Z',
            reviewDueAt: '2024-01-20T10:00:00Z',
          })
        )
      })
    })
  })
})

describe('Telemetry Hook - Session Helpers', () => {
  let mockStorage: Record<string, string>

  beforeEach(() => {
    mockStorage = {}
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value }),
      removeItem: vi.fn((key: string) => { delete mockStorage[key] }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  describe('getV2SessionInfo', () => {
    it('returns null when no session exists', async () => {
      const { getV2SessionInfo } = await import('../telemetryHook')
      const result = getV2SessionInfo()
      expect(result).toBeNull()
    })

    it('returns parsed session data', async () => {
      const session = {
        patternId: 'pat-1',
        problemIds: ['prob-1', 'prob-2'],
        currentIndex: 0,
        type: 'drill',
      }
      mockStorage['v2_session'] = JSON.stringify(session)

      const { getV2SessionInfo } = await import('../telemetryHook')
      const result = getV2SessionInfo()

      expect(result).toEqual(session)
    })
  })

  describe('isInV2Session', () => {
    it('returns false when no session exists', async () => {
      const { isInV2Session } = await import('../telemetryHook')
      const result = isInV2Session()
      expect(result).toBe(false)
    })

    it('returns true when session exists', async () => {
      mockStorage['v2_session'] = '{"patternId": "pat-1"}'

      const { isInV2Session } = await import('../telemetryHook')
      const result = isInV2Session()

      expect(result).toBe(true)
    })
  })

  describe('clearV2Session', () => {
    it('removes session from storage', async () => {
      mockStorage['v2_session'] = '{"patternId": "pat-1"}'

      const { clearV2Session } = await import('../telemetryHook')
      clearV2Session()

      expect(sessionStorage.removeItem).toHaveBeenCalledWith('v2_session')
    })
  })
})
