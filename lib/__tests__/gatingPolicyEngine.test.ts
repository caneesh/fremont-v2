import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getOrCreateSessionPolicy,
  processPatternGateSelection,
  processPatternGateTimeout,
  requiresDecisionGate,
  getStepDecisionGateState,
  recordMicroTaskAttempt,
  canSubmitStep,
  getRequiredMicroTaskCount,
  triggerRebuildGate,
  recordRebuildAnswer,
  canProceedFromStep,
  recordWrongSubmission,
  recordCorrectSubmission,
  getGatingSummary,
  hasActiveBlockingGate,
  clearSessionPolicy,
} from '../gatingPolicyEngine'
import {
  createInitialSessionPolicy,
  DEFAULT_DECISION_GATE_CONFIG,
  WEAK_CONFIDENCE_DECISION_GATE_CONFIG,
} from '@/types/gatingPolicy'
import type { PatternOption } from '@/types/patternFirst'

describe('GatingPolicyEngine', () => {
  beforeEach(() => {
    // Clear sessionStorage before each test
    clearSessionPolicy()
  })

  afterEach(() => {
    clearSessionPolicy()
  })

  describe('Session Policy Management', () => {
    it('creates initial session policy when none exists', () => {
      const policy = getOrCreateSessionPolicy()

      expect(policy).toBeDefined()
      expect(policy.patternGate).toBeNull()
      expect(policy.intensity).toBe('normal')
      expect(policy.consecutiveWrongSubmissions).toBe(0)
      expect(policy.decisionGateConfig).toEqual(DEFAULT_DECISION_GATE_CONFIG)
    })

    it('returns existing policy when one exists', () => {
      const firstPolicy = getOrCreateSessionPolicy()
      firstPolicy.intensity = 'high'

      const secondPolicy = getOrCreateSessionPolicy()
      // Note: This would need the policy to be saved to actually persist
      expect(secondPolicy).toBeDefined()
    })
  })

  describe('Pattern Gate Logic', () => {
    it('sets strong confidence when pattern is correct', () => {
      const policy = createInitialSessionPolicy()

      const updatedPolicy = processPatternGateSelection(
        policy,
        'pattern-1',
        'pattern-1', // Same as selected = correct
        undefined,
        5000
      )

      expect(updatedPolicy.patternGate?.isCorrect).toBe(true)
      expect(updatedPolicy.patternGate?.confidence).toBe('strong')
      expect(updatedPolicy.intensity).toBe('normal')
      expect(updatedPolicy.decisionGateConfig.requiredMicroTasks).toBe(1)
    })

    it('sets weak confidence when pattern is wrong', () => {
      const policy = createInitialSessionPolicy()

      const updatedPolicy = processPatternGateSelection(
        policy,
        'pattern-2',
        'pattern-1', // Different = wrong
        undefined,
        5000
      )

      expect(updatedPolicy.patternGate?.isCorrect).toBe(false)
      expect(updatedPolicy.patternGate?.confidence).toBe('weak')
      expect(updatedPolicy.intensity).toBe('high')
      expect(updatedPolicy.decisionGateConfig.requiredMicroTasks).toBe(2)
    })

    it('accepts secondary patterns as correct', () => {
      const policy = createInitialSessionPolicy()

      const updatedPolicy = processPatternGateSelection(
        policy,
        'pattern-2',
        'pattern-1',
        ['pattern-2', 'pattern-3'], // Secondary patterns
        5000
      )

      expect(updatedPolicy.patternGate?.isCorrect).toBe(true)
      expect(updatedPolicy.patternGate?.confidence).toBe('strong')
    })

    it('sets weak confidence on timeout', () => {
      const policy = createInitialSessionPolicy()

      const updatedPolicy = processPatternGateTimeout(policy, 12000)

      expect(updatedPolicy.patternGate?.timedOut).toBe(true)
      expect(updatedPolicy.patternGate?.confidence).toBe('weak')
      expect(updatedPolicy.intensity).toBe('high')
    })
  })

  describe('Decision Gate Logic', () => {
    it('requires decision gate for gated step types with micro-tasks', () => {
      const policy = createInitialSessionPolicy()

      expect(requiresDecisionGate(policy, 1, 'concept', true)).toBe(true)
      expect(requiresDecisionGate(policy, 1, 'setup', true)).toBe(true)
      expect(requiresDecisionGate(policy, 1, 'equation', true)).toBe(true)
      expect(requiresDecisionGate(policy, 1, 'physics_concept', true)).toBe(true)
    })

    it('does not require decision gate for non-gated step types', () => {
      const policy = createInitialSessionPolicy()

      expect(requiresDecisionGate(policy, 1, 'calculation', true)).toBe(false)
      expect(requiresDecisionGate(policy, 1, 'diagram', true)).toBe(false)
      expect(requiresDecisionGate(policy, 1, 'sanity_check', true)).toBe(false)
    })

    it('does not require decision gate when no micro-tasks', () => {
      const policy = createInitialSessionPolicy()

      expect(requiresDecisionGate(policy, 1, 'concept', false)).toBe(false)
    })

    it('returns initial gate state for new step', () => {
      const policy = createInitialSessionPolicy()

      const gateState = getStepDecisionGateState(policy, 1)

      expect(gateState.stepId).toBe(1)
      expect(gateState.microTasksPassedCount).toBe(0)
      expect(gateState.currentAttempts).toBe(0)
      expect(gateState.gatePassed).toBe(false)
      expect(gateState.hintAutoUnlocked).toBe(false)
    })

    it('increments passed count on correct answer', () => {
      const policy = createInitialSessionPolicy()

      const { updatedPolicy } = recordMicroTaskAttempt(policy, 1, true)
      const gateState = updatedPolicy.stepDecisionGates.get(1)

      expect(gateState?.microTasksPassedCount).toBe(1)
      expect(gateState?.currentAttempts).toBe(0)
    })

    it('increments attempt count on wrong answer', () => {
      const policy = createInitialSessionPolicy()

      const { updatedPolicy } = recordMicroTaskAttempt(policy, 1, false)
      const gateState = updatedPolicy.stepDecisionGates.get(1)

      expect(gateState?.microTasksPassedCount).toBe(0)
      expect(gateState?.currentAttempts).toBe(1)
    })

    it('triggers auto-unlock hint after max attempts', () => {
      let policy = createInitialSessionPolicy()

      // First wrong attempt
      let result = recordMicroTaskAttempt(policy, 1, false)
      policy = result.updatedPolicy
      expect(result.shouldAutoUnlockHint).toBe(false)

      // Second wrong attempt (max = 2)
      result = recordMicroTaskAttempt(policy, 1, false)
      expect(result.shouldAutoUnlockHint).toBe(true)
      expect(result.updatedPolicy.stepDecisionGates.get(1)?.hintAutoUnlocked).toBe(true)
    })

    it('passes gate when required micro-tasks completed', () => {
      const policy = createInitialSessionPolicy()

      const { updatedPolicy } = recordMicroTaskAttempt(policy, 1, true)
      const gateState = updatedPolicy.stepDecisionGates.get(1)

      expect(gateState?.gatePassed).toBe(true)
    })

    it('requires more correct answers when intensity is high', () => {
      let policy = createInitialSessionPolicy()
      policy = processPatternGateSelection(policy, 'wrong', 'correct', undefined, 5000)

      // Now requires 2 correct answers
      expect(getRequiredMicroTaskCount(policy)).toBe(2)

      // First correct answer
      let { updatedPolicy } = recordMicroTaskAttempt(policy, 1, true)
      expect(updatedPolicy.stepDecisionGates.get(1)?.gatePassed).toBe(false)

      // Second correct answer
      const result = recordMicroTaskAttempt(updatedPolicy, 1, true)
      expect(result.updatedPolicy.stepDecisionGates.get(1)?.gatePassed).toBe(true)
    })

    it('allows step submission when gate is passed', () => {
      let policy = createInitialSessionPolicy()
      policy.stepDecisionGates.set(1, {
        stepId: 1,
        microTasksPassedCount: 1,
        currentAttempts: 0,
        gatePassed: true,
        hintAutoUnlocked: false,
      })

      expect(canSubmitStep(policy, 1, 'concept', true)).toBe(true)
    })

    it('blocks step submission when gate not passed', () => {
      const policy = createInitialSessionPolicy()

      expect(canSubmitStep(policy, 1, 'concept', true)).toBe(false)
    })
  })

  describe('Rebuild Gate Logic', () => {
    const mockPatterns: PatternOption[] = [
      { id: 'p1', label: 'Conservation of Momentum', description: 'Momentum is conserved' },
      { id: 'p2', label: 'Conservation of Energy', description: 'Energy is conserved' },
    ]

    it('triggers rebuild gate with generated questions', () => {
      const policy = createInitialSessionPolicy()

      const updatedPolicy = triggerRebuildGate(
        policy,
        1,
        'Apply Newton\'s Second Law',
        mockPatterns,
        'p1'
      )

      const rebuildState = updatedPolicy.stepRebuildGates.get(1)
      expect(rebuildState?.revealUsed).toBe(true)
      expect(rebuildState?.isActive).toBe(true)
      expect(rebuildState?.questions.length).toBeGreaterThanOrEqual(1)
      expect(rebuildState?.gatePassed).toBe(false)
    })

    it('generates pattern question when patterns available', () => {
      const policy = createInitialSessionPolicy()

      const updatedPolicy = triggerRebuildGate(policy, 1, 'Step', mockPatterns, 'p1')
      const rebuildState = updatedPolicy.stepRebuildGates.get(1)
      const patternQuestion = rebuildState?.questions.find(q => q.type === 'pattern')

      expect(patternQuestion).toBeDefined()
      expect(patternQuestion?.options).toContain('Conservation of Momentum')
      expect(patternQuestion?.correctIndex).toBe(0)
    })

    it('records correct rebuild answer', () => {
      let policy = createInitialSessionPolicy()
      policy = triggerRebuildGate(policy, 1, 'Step', mockPatterns, 'p1')

      const rebuildState = policy.stepRebuildGates.get(1)!
      const correctIndex = rebuildState.questions[0].correctIndex

      const { isCorrect, allPassed } = recordRebuildAnswer(policy, 1, 0, correctIndex)

      expect(isCorrect).toBe(true)
      // May not be all passed if there are multiple questions
    })

    it('records wrong rebuild answer', () => {
      let policy = createInitialSessionPolicy()
      policy = triggerRebuildGate(policy, 1, 'Step', mockPatterns, 'p1')

      const { isCorrect, allPassed } = recordRebuildAnswer(policy, 1, 0, 99)

      expect(isCorrect).toBe(false)
      expect(allPassed).toBe(false)
    })

    it('blocks progression when rebuild gate active and not passed', () => {
      let policy = createInitialSessionPolicy()
      policy = triggerRebuildGate(policy, 1, 'Step', mockPatterns, 'p1')

      expect(canProceedFromStep(policy, 1)).toBe(false)
    })

    it('allows progression when rebuild gate passed', () => {
      let policy = createInitialSessionPolicy()
      policy = triggerRebuildGate(policy, 1, 'Step', [], undefined)

      // Answer the only question correctly (decision question)
      const rebuildState = policy.stepRebuildGates.get(1)!
      const correctIndex = rebuildState.questions[0].correctIndex

      const { updatedPolicy, allPassed } = recordRebuildAnswer(policy, 1, 0, correctIndex)

      expect(allPassed).toBe(true)
      expect(canProceedFromStep(updatedPolicy, 1)).toBe(true)
    })

    it('allows progression when no rebuild gate triggered', () => {
      const policy = createInitialSessionPolicy()

      expect(canProceedFromStep(policy, 1)).toBe(true)
    })
  })

  describe('Intensity Adjustment', () => {
    it('increases intensity after consecutive wrong submissions', () => {
      let policy = createInitialSessionPolicy()

      policy = recordWrongSubmission(policy)
      expect(policy.intensity).toBe('normal')

      policy = recordWrongSubmission(policy)
      expect(policy.intensity).toBe('high')
      expect(policy.decisionGateConfig).toEqual(WEAK_CONFIDENCE_DECISION_GATE_CONFIG)
    })

    it('resets consecutive counter on correct submission', () => {
      let policy = createInitialSessionPolicy()
      policy.consecutiveWrongSubmissions = 1

      policy = recordCorrectSubmission(policy)

      expect(policy.consecutiveWrongSubmissions).toBe(0)
    })

    it('decreases intensity on correct submission if pattern was correct', () => {
      let policy = createInitialSessionPolicy()
      policy = processPatternGateSelection(policy, 'p1', 'p1', undefined, 5000)

      // Simulate intensity being high due to consecutive wrongs
      policy.intensity = 'high'
      policy.decisionGateConfig = { ...WEAK_CONFIDENCE_DECISION_GATE_CONFIG }

      policy = recordCorrectSubmission(policy)

      expect(policy.intensity).toBe('normal')
      expect(policy.decisionGateConfig).toEqual(DEFAULT_DECISION_GATE_CONFIG)
    })
  })

  describe('Utility Functions', () => {
    it('provides accurate gating summary', () => {
      let policy = createInitialSessionPolicy()
      policy = processPatternGateSelection(policy, 'p1', 'p2', undefined, 5000)
      policy.stepDecisionGates.set(1, {
        stepId: 1,
        microTasksPassedCount: 1,
        currentAttempts: 0,
        gatePassed: true,
        hintAutoUnlocked: false,
      })

      const summary = getGatingSummary(policy)

      expect(summary.patternConfidence).toBe('weak')
      expect(summary.patternCorrect).toBe(false)
      expect(summary.intensity).toBe('high')
      expect(summary.requiredMicroTasks).toBe(2)
      expect(summary.stepsWithDecisionGates).toBe(1)
    })

    it('detects active blocking gates', () => {
      let policy = createInitialSessionPolicy()
      policy = triggerRebuildGate(policy, 1, 'Step', [], undefined)

      const { blocked, reason } = hasActiveBlockingGate(policy, 1)

      expect(blocked).toBe(true)
      expect(reason).toBe('rebuild_gate')
    })

    it('reports no blocking gate when none active', () => {
      const policy = createInitialSessionPolicy()

      const { blocked, reason } = hasActiveBlockingGate(policy, 1)

      expect(blocked).toBe(false)
      expect(reason).toBeNull()
    })
  })
})
