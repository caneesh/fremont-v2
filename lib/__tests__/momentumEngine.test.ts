import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  getOrCreateMomentumState,
  clearMomentumState,
  recordWin,
  recordFailure,
  recordDecisionWin,
  recordDecisionFailure,
  recordHintFreeWin,
  recordRebuildWin,
  recordRebuildFailure,
  consumePendingEvent,
  hasPendingEvent,
  getMomentumSummary,
  getPatternMomentumSummary,
  getMomentumTelemetry,
} from '../momentumEngine'
import {
  createInitialMomentumState,
  STREAK_FEEDBACK_THRESHOLDS,
  CONSECUTIVE_FAILURES_TO_RESET,
} from '@/types/momentum'

describe('MomentumEngine', () => {
  beforeEach(() => {
    clearMomentumState()
  })

  afterEach(() => {
    clearMomentumState()
  })

  describe('Session State Management', () => {
    it('creates initial momentum state when none exists', () => {
      const state = getOrCreateMomentumState()

      expect(state).toBeDefined()
      expect(state.session.decision.current).toBe(0)
      expect(state.session.hintFree.current).toBe(0)
      expect(state.session.rebuild.current).toBe(0)
      expect(state.patternStreaks.size).toBe(0)
      expect(state.pendingEvent).toBeNull()
      expect(state.eventHistory).toEqual([])
    })

    it('returns existing state when one exists', () => {
      const state1 = getOrCreateMomentumState()
      recordWin(state1, 'decision')

      const state2 = getOrCreateMomentumState()
      expect(state2.session.decision.current).toBe(1)
    })
  })

  describe('Streak Win Recording', () => {
    it('increments streak count on win', () => {
      const state = createInitialMomentumState()

      const { updatedState } = recordWin(state, 'decision')

      expect(updatedState.session.decision.current).toBe(1)
      expect(updatedState.session.decision.totalWins).toBe(1)
      expect(updatedState.session.decision.best).toBe(1)
    })

    it('tracks best streak across wins and resets', () => {
      let state = createInitialMomentumState()

      // Build a streak of 3
      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'decision').updatedState
      expect(state.session.decision.best).toBe(3)

      // Two failures to reset
      state = recordFailure(state, 'decision').updatedState
      state = recordFailure(state, 'decision').updatedState
      expect(state.session.decision.current).toBe(0)

      // New streak of 2
      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'decision').updatedState

      // Best should still be 3
      expect(state.session.decision.best).toBe(3)
      expect(state.session.decision.current).toBe(2)
    })

    it('resets consecutive failures on win', () => {
      let state = createInitialMomentumState()

      // One failure (streak preserved)
      state = recordFailure(state, 'decision').updatedState
      expect(state.session.decision.consecutiveFailures).toBe(1)

      // Win resets consecutive failures
      state = recordWin(state, 'decision').updatedState
      expect(state.session.decision.consecutiveFailures).toBe(0)
    })

    it('updates lastWinAt timestamp on win', () => {
      const state = createInitialMomentumState()

      const { updatedState } = recordWin(state, 'decision')

      expect(updatedState.session.decision.lastWinAt).not.toBeNull()
    })
  })

  describe('Streak Failure & Reset Logic', () => {
    it('does NOT reset streak on single failure', () => {
      let state = createInitialMomentumState()

      // Build streak of 3
      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'decision').updatedState
      expect(state.session.decision.current).toBe(3)

      // Single failure - streak preserved
      const { updatedState, streakReset } = recordFailure(state, 'decision')
      expect(streakReset).toBe(false)
      expect(updatedState.session.decision.current).toBe(3)
      expect(updatedState.session.decision.consecutiveFailures).toBe(1)
    })

    it('resets streak after CONSECUTIVE_FAILURES_TO_RESET failures', () => {
      let state = createInitialMomentumState()

      // Build streak of 3
      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'decision').updatedState

      // First failure
      state = recordFailure(state, 'decision').updatedState

      // Second failure - should reset
      const { updatedState, streakReset } = recordFailure(state, 'decision')

      expect(streakReset).toBe(true)
      expect(updatedState.session.decision.current).toBe(0)
      expect(updatedState.session.decision.consecutiveFailures).toBe(0) // Reset after reset
    })

    it('respects CONSECUTIVE_FAILURES_TO_RESET constant', () => {
      expect(CONSECUTIVE_FAILURES_TO_RESET).toBe(2)
    })
  })

  describe('Pattern-Level Streaks', () => {
    it('tracks streaks per pattern independently', () => {
      let state = createInitialMomentumState()

      // Win for pattern A
      state = recordWin(state, 'decision', { patternId: 'kinematics' }).updatedState
      state = recordWin(state, 'decision', { patternId: 'kinematics' }).updatedState

      // Win for pattern B
      state = recordWin(state, 'decision', { patternId: 'energy' }).updatedState

      // Check pattern A
      const kinematicsStreaks = state.patternStreaks.get('kinematics')
      expect(kinematicsStreaks?.decision.current).toBe(2)

      // Check pattern B
      const energyStreaks = state.patternStreaks.get('energy')
      expect(energyStreaks?.decision.current).toBe(1)

      // Session streak is combined
      expect(state.session.decision.current).toBe(3)
    })

    it('resets pattern streak independently', () => {
      let state = createInitialMomentumState()

      // Build streaks
      state = recordWin(state, 'decision', { patternId: 'kinematics' }).updatedState
      state = recordWin(state, 'decision', { patternId: 'kinematics' }).updatedState

      // Fail on pattern A twice
      state = recordFailure(state, 'decision', { patternId: 'kinematics' }).updatedState
      state = recordFailure(state, 'decision', { patternId: 'kinematics' }).updatedState

      const kinematicsStreaks = state.patternStreaks.get('kinematics')
      expect(kinematicsStreaks?.decision.current).toBe(0)
    })
  })

  describe('Decision Win Convenience Functions', () => {
    it('records decision win on first attempt', () => {
      const state = createInitialMomentumState()

      const { updatedState, event } = recordDecisionWin(state, {
        isFirstAttempt: true,
        stepId: 1,
        problemId: 'p1',
      })

      expect(updatedState.session.decision.current).toBe(1)
    })

    it('does NOT record decision win on retry', () => {
      const state = createInitialMomentumState()

      const { updatedState, event } = recordDecisionWin(state, {
        isFirstAttempt: false,
        stepId: 1,
      })

      expect(updatedState.session.decision.current).toBe(0)
      expect(event).toBeNull()
    })

    it('clears consecutive failures on correct retry', () => {
      let state = createInitialMomentumState()

      // One failure
      state = recordDecisionFailure(state).updatedState
      expect(state.session.decision.consecutiveFailures).toBe(1)

      // Correct on retry
      state = recordDecisionWin(state, { isFirstAttempt: false }).updatedState
      expect(state.session.decision.consecutiveFailures).toBe(0)
    })
  })

  describe('Hint-Free Win Logic', () => {
    it('records hint-free win when no hints used', () => {
      const state = createInitialMomentumState()

      const { updatedState, event } = recordHintFreeWin(state, {
        maxHintLevelUsed: 0,
        stepId: 1,
      })

      expect(updatedState.session.hintFree.current).toBe(1)
      // Hint-free has threshold of 1, so should trigger event
      expect(event).not.toBeNull()
    })

    it('records failure when hints used', () => {
      const state = createInitialMomentumState()

      const { updatedState, event } = recordHintFreeWin(state, {
        maxHintLevelUsed: 2,
        stepId: 1,
      })

      expect(updatedState.session.hintFree.current).toBe(0)
      expect(updatedState.session.hintFree.consecutiveFailures).toBe(1)
      expect(event).toBeNull()
    })
  })

  describe('Rebuild Win Logic', () => {
    it('records rebuild win', () => {
      const state = createInitialMomentumState()

      const { updatedState, event } = recordRebuildWin(state, {
        stepId: 1,
        patternId: 'momentum',
      })

      expect(updatedState.session.rebuild.current).toBe(1)
      expect(event).not.toBeNull()
      expect(event?.message).toContain('Rebuilt understanding')
    })

    it('records rebuild failure', () => {
      const state = createInitialMomentumState()

      const { updatedState, streakReset } = recordRebuildFailure(state, {
        stepId: 1,
      })

      expect(updatedState.session.rebuild.consecutiveFailures).toBe(1)
      expect(streakReset).toBe(false)
    })
  })

  describe('Momentum Event Generation', () => {
    it('generates event when threshold met for decision (threshold = 2)', () => {
      let state = createInitialMomentumState()

      // First win - below threshold
      const result1 = recordWin(state, 'decision')
      expect(result1.event).toBeNull()

      // Second win - meets threshold
      const result2 = recordWin(result1.updatedState, 'decision')
      expect(result2.event).not.toBeNull()
      expect(result2.event?.streakCount).toBe(2)
      expect(result2.event?.message).toContain('2 correct decisions')
    })

    it('generates event at threshold 1 for hint-free', () => {
      const state = createInitialMomentumState()

      const { event } = recordWin(state, 'hintFree')

      expect(event).not.toBeNull()
      expect(event?.streakCount).toBe(1)
      expect(event?.message).toContain('Solved without hints')
    })

    it('generates recovery event after failure followed by win', () => {
      let state = createInitialMomentumState()

      // One failure
      state = recordFailure(state, 'decision').updatedState
      expect(state.session.decision.consecutiveFailures).toBe(1)

      // Win after failure = recovery
      const { event } = recordWin(state, 'decision')

      expect(event).not.toBeNull()
      expect(event?.isRecovery).toBe(true)
      expect(event?.message).toContain('Recovered after mistake')
    })

    it('stores event in pending and history', () => {
      let state = createInitialMomentumState()

      state = recordWin(state, 'decision').updatedState
      const { updatedState, event } = recordWin(state, 'decision')

      expect(updatedState.pendingEvent).toEqual(event)
      expect(updatedState.eventHistory).toContain(event)
    })
  })

  describe('Event Consumption', () => {
    it('consumes pending event', () => {
      let state = createInitialMomentumState()
      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'decision').updatedState

      expect(hasPendingEvent(state)).toBe(true)

      const { updatedState, event } = consumePendingEvent(state)

      expect(event).not.toBeNull()
      expect(hasPendingEvent(updatedState)).toBe(false)
      expect(updatedState.pendingEvent).toBeNull()
    })

    it('returns null when no pending event', () => {
      const state = createInitialMomentumState()

      const { event } = consumePendingEvent(state)

      expect(event).toBeNull()
    })
  })

  describe('Analytics & Summary', () => {
    it('provides accurate momentum summary', () => {
      let state = createInitialMomentumState()

      // Build some streaks
      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'hintFree').updatedState
      state = recordWin(state, 'rebuild').updatedState

      const summary = getMomentumSummary(state)

      expect(summary.session.decisionStreak).toBe(3)
      expect(summary.session.decisionTotal).toBe(3)
      expect(summary.session.hintFreeStreak).toBe(1)
      expect(summary.session.hintFreeTotal).toBe(1)
      expect(summary.session.rebuildStreak).toBe(1)
      expect(summary.session.rebuildTotal).toBe(1)
    })

    it('counts recovery events', () => {
      let state = createInitialMomentumState()

      // Create a recovery scenario
      state = recordFailure(state, 'decision').updatedState
      state = recordWin(state, 'decision').updatedState

      const summary = getMomentumSummary(state)

      expect(summary.recoveryCount).toBe(1)
    })

    it('provides pattern-specific summary', () => {
      let state = createInitialMomentumState()

      state = recordWin(state, 'decision', { patternId: 'kinematics' }).updatedState
      state = recordWin(state, 'decision', { patternId: 'kinematics' }).updatedState

      const patternSummary = getPatternMomentumSummary(state, 'kinematics')

      expect(patternSummary).not.toBeNull()
      expect(patternSummary?.decisionStreak).toBe(2)
      expect(patternSummary?.decisionTotal).toBe(2)
    })

    it('returns null for unknown pattern', () => {
      const state = createInitialMomentumState()

      const patternSummary = getPatternMomentumSummary(state, 'unknown')

      expect(patternSummary).toBeNull()
    })

    it('provides telemetry-ready data', () => {
      let state = createInitialMomentumState()
      state = recordWin(state, 'decision', { patternId: 'energy' }).updatedState

      const telemetry = getMomentumTelemetry(state)

      expect(telemetry.patternsTracked).toBe(1)
      expect(telemetry.sessionStartedAt).toBeDefined()
    })
  })

  describe('Threshold Constants', () => {
    it('has correct default thresholds', () => {
      expect(STREAK_FEEDBACK_THRESHOLDS.decision).toBe(2)
      expect(STREAK_FEEDBACK_THRESHOLDS.hintFree).toBe(1)
      expect(STREAK_FEEDBACK_THRESHOLDS.rebuild).toBe(1)
    })
  })

  describe('Edge Cases', () => {
    it('handles multiple streak types simultaneously', () => {
      let state = createInitialMomentumState()

      // Build different streaks
      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'hintFree').updatedState
      state = recordWin(state, 'rebuild').updatedState

      expect(state.session.decision.current).toBe(1)
      expect(state.session.hintFree.current).toBe(1)
      expect(state.session.rebuild.current).toBe(1)
    })

    it('handles rapid sequential wins', () => {
      let state = createInitialMomentumState()

      for (let i = 0; i < 10; i++) {
        state = recordWin(state, 'decision').updatedState
      }

      expect(state.session.decision.current).toBe(10)
      expect(state.session.decision.best).toBe(10)
      expect(state.session.decision.totalWins).toBe(10)
    })

    it('maintains streak through interleaved wins and single failures', () => {
      let state = createInitialMomentumState()

      state = recordWin(state, 'decision').updatedState
      state = recordWin(state, 'decision').updatedState
      state = recordFailure(state, 'decision').updatedState // Single failure
      state = recordWin(state, 'decision').updatedState     // Continues streak

      expect(state.session.decision.current).toBe(3)
    })
  })
})
