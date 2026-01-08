/**
 * Debug + Refactor Mode Policy Tests
 *
 * Tests for deterministic scoring and progression in debug/refactor modes.
 */

import { describe, it, expect } from 'vitest'
import {
  // Debug functions
  createDebugSession,
  getNextDebugStep,
  canCompleteDebugStep,
  advanceDebugStep,
  recordFixAttempt,
  recordHintUsage,
  calculateDebugScore,
  evaluateDebugSubmission,
  getDebugProgress,
  isDebugSessionComplete,
  getAvailableHints,
  getDebugStepDescription,
  // Refactor functions
  createRefactorSession,
  getNextRefactorStep,
  canCompleteRefactorStep,
  advanceRefactorStep,
  recordRefactorAttempt,
  evaluateSmellIdentification,
  evaluateStyleGoals,
  calculateRefactorScore,
  evaluateRefactorSubmission,
  getRefactorProgress,
  isRefactorSessionComplete,
  getRefactorStepDescription,
  // Shared functions
  getRemainingAttempts,
  getGradeFromScore,
  // Constants
  DEBUG_STEP_ORDER,
  REFACTOR_STEP_ORDER,
  EXTENDED_POLICY,
  DEBUG_REFACTOR_POLICY,
} from '../debug-refactor-policy'
import type {
  DebugProblem,
  RefactorProblem,
  CodeSmell,
  StyleGoal,
} from '@/types/debugRefactorMode'
import type { DebugSession, RefactorSession, TestResult } from '../debug-refactor-policy'

// Helper to create debug problem
function createDebugProblem(overrides?: Partial<DebugProblem>): DebugProblem {
  return {
    id: 'debug-1',
    title: 'Fix the Loop',
    description: 'Fix the off-by-one error',
    buggyCode: 'for (let i = 0; i <= arr.length; i++)',
    language: 'javascript',
    testCases: [
      { id: 'tc1', input: '[1,2,3]', expectedOutput: '6', isHidden: false },
      { id: 'tc2', input: '[]', expectedOutput: '0', isHidden: true },
    ],
    expectedFixTags: ['off-by-one', 'loop-boundary'],
    hints: [
      { level: 1, text: 'Check the loop condition' },
      { level: 2, text: 'Look at the comparison operator', lineHint: 1 },
    ],
    difficulty: 'easy',
    ...overrides,
  }
}

// Helper to create refactor problem
function createRefactorProblem(overrides?: Partial<RefactorProblem>): RefactorProblem {
  return {
    id: 'refactor-1',
    title: 'Clean Up the Function',
    description: 'Refactor to improve readability',
    messyCode: 'function f(x){if(x>0){return x*2}else{return x*-1}}',
    language: 'javascript',
    testCases: [
      { id: 'tc1', input: '5', expectedOutput: '10', isHidden: false },
      { id: 'tc2', input: '-3', expectedOutput: '3', isHidden: false },
    ],
    styleGoals: [
      { id: 'sg1', description: 'Use descriptive names', weight: 0.3 },
      { id: 'sg2', description: 'Add whitespace', weight: 0.2 },
      { id: 'sg3', description: 'Simplify conditionals', weight: 0.5 },
    ],
    codeSmells: [
      { id: 'cs1', name: 'Poor naming', description: 'Single letter names', severity: 'moderate' },
      { id: 'cs2', name: 'No spacing', description: 'Missing whitespace', severity: 'minor' },
    ],
    difficulty: 'easy',
    ...overrides,
  }
}

// Helper to create test results
function createTestResults(passed: number, total: number): TestResult[] {
  return Array(total).fill(null).map((_, i) => ({
    testId: `tc${i + 1}`,
    passed: i < passed,
    actualOutput: i < passed ? 'expected' : 'wrong',
  }))
}

// ============= DEBUG MODE TESTS =============

describe('createDebugSession', () => {
  it('should create session with initial values', () => {
    const session = createDebugSession('problem-1')

    expect(session.problemId).toBe('problem-1')
    expect(session.currentStep).toBe('understand')
    expect(session.stepsCompleted).toHaveLength(0)
    expect(session.hypothesis).toBeNull()
    expect(session.fixAttempts).toBe(0)
    expect(session.hintsUsed).toBe(0)
  })

  it('should set startedAt timestamp', () => {
    const session = createDebugSession('problem-1')
    expect(session.startedAt).toBeDefined()
    expect(new Date(session.startedAt).getTime()).toBeLessThanOrEqual(Date.now())
  })

  it('should not be completed initially', () => {
    const session = createDebugSession('problem-1')
    expect(session.completedAt).toBeNull()
  })
})

describe('getNextDebugStep', () => {
  it('should return hypothesis after understand', () => {
    expect(getNextDebugStep('understand')).toBe('hypothesis')
  })

  it('should return fix after hypothesis', () => {
    expect(getNextDebugStep('hypothesis')).toBe('fix')
  })

  it('should return test after fix', () => {
    expect(getNextDebugStep('fix')).toBe('test')
  })

  it('should return reflection after test', () => {
    expect(getNextDebugStep('test')).toBe('reflection')
  })

  it('should return null after reflection', () => {
    expect(getNextDebugStep('reflection')).toBeNull()
  })
})

describe('canCompleteDebugStep', () => {
  it('should allow completing understand step', () => {
    const session = createDebugSession('p1')
    const result = canCompleteDebugStep(session, 'understand')

    expect(result.canComplete).toBe(true)
  })

  it('should require hypothesis text for hypothesis step', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      currentStep: 'hypothesis',
      stepsCompleted: ['understand'],
    }

    const withoutHypothesis = canCompleteDebugStep(session, 'hypothesis')
    expect(withoutHypothesis.canComplete).toBe(false)

    const withShortHypothesis = canCompleteDebugStep(session, 'hypothesis', {
      hypothesis: 'short',
    })
    expect(withShortHypothesis.canComplete).toBe(false)

    const withValidHypothesis = canCompleteDebugStep(session, 'hypothesis', {
      hypothesis: 'I think the bug is an off-by-one error in the loop',
    })
    expect(withValidHypothesis.canComplete).toBe(true)
  })

  it('should not allow skipping steps', () => {
    const session = createDebugSession('p1')
    const result = canCompleteDebugStep(session, 'fix')

    expect(result.canComplete).toBe(false)
    expect(result.reason).toContain('previous steps')
  })

  it('should not allow re-completing steps', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      currentStep: 'hypothesis',
      stepsCompleted: ['understand'],
    }
    const result = canCompleteDebugStep(session, 'understand')

    expect(result.canComplete).toBe(false)
    expect(result.reason).toContain('already completed')
  })

  it('should require hypothesis before fix', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      currentStep: 'fix',
      stepsCompleted: ['understand', 'hypothesis'],
      hypothesis: null,
    }
    const result = canCompleteDebugStep(session, 'fix')

    expect(result.canComplete).toBe(false)
  })

  it('should require fix attempt before test', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      currentStep: 'test',
      stepsCompleted: ['understand', 'hypothesis', 'fix'],
      hypothesis: 'my hypothesis',
      fixAttempts: 0,
    }
    const result = canCompleteDebugStep(session, 'test')

    expect(result.canComplete).toBe(false)
  })
})

describe('advanceDebugStep', () => {
  it('should advance to next step when valid', () => {
    const session = createDebugSession('p1')
    const advanced = advanceDebugStep(session)

    expect(advanced.currentStep).toBe('hypothesis')
    expect(advanced.stepsCompleted).toContain('understand')
  })

  it('should save hypothesis when provided', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      currentStep: 'hypothesis',
      stepsCompleted: ['understand'],
    }
    const advanced = advanceDebugStep(session, {
      hypothesis: 'The bug is in the loop boundary',
    })

    expect(advanced.hypothesis).toBe('The bug is in the loop boundary')
  })

  it('should not advance if requirements not met', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      currentStep: 'hypothesis',
      stepsCompleted: ['understand'],
    }
    const advanced = advanceDebugStep(session) // No hypothesis provided

    expect(advanced.currentStep).toBe('hypothesis')
    expect(advanced.stepsCompleted).not.toContain('hypothesis')
  })

  it('should set completedAt on final step', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      currentStep: 'reflection',
      stepsCompleted: ['understand', 'hypothesis', 'fix', 'test'],
      hypothesis: 'test',
      fixAttempts: 1,
      testResults: [{ testId: 'tc1', passed: true }],
    }
    const advanced = advanceDebugStep(session, {
      reflection: 'I learned about off-by-one errors and how to debug them systematically.',
    })

    expect(advanced.completedAt).not.toBeNull()
  })
})

describe('recordFixAttempt', () => {
  it('should increment fix attempts', () => {
    const session = createDebugSession('p1')
    const updated = recordFixAttempt(session, [], [])

    expect(updated.fixAttempts).toBe(1)
  })

  it('should record test results', () => {
    const session = createDebugSession('p1')
    const testResults: TestResult[] = [
      { testId: 'tc1', passed: true },
      { testId: 'tc2', passed: false },
    ]
    const updated = recordFixAttempt(session, testResults, [])

    expect(updated.testResults).toHaveLength(2)
    expect(updated.testResults[0].passed).toBe(true)
  })

  it('should accumulate bug tags identified', () => {
    let session = createDebugSession('p1')
    session = recordFixAttempt(session, [], ['off-by-one'])
    session = recordFixAttempt(session, [], ['loop-boundary'])

    expect(session.bugTagsIdentified).toContain('off-by-one')
    expect(session.bugTagsIdentified).toContain('loop-boundary')
  })

  it('should not duplicate bug tags', () => {
    let session = createDebugSession('p1')
    session = recordFixAttempt(session, [], ['off-by-one'])
    session = recordFixAttempt(session, [], ['off-by-one'])

    expect(session.bugTagsIdentified.filter(t => t === 'off-by-one')).toHaveLength(1)
  })

  it('should respect max attempts', () => {
    let session = createDebugSession('p1')
    for (let i = 0; i < 10; i++) {
      session = recordFixAttempt(session, [], [])
    }

    expect(session.fixAttempts).toBe(DEBUG_REFACTOR_POLICY.MAX_ATTEMPTS)
  })
})

describe('recordHintUsage', () => {
  it('should increment hints used', () => {
    const session = createDebugSession('p1')
    const updated = recordHintUsage(session)

    expect(updated.hintsUsed).toBe(1)
  })

  it('should allow multiple hint usages', () => {
    let session = createDebugSession('p1')
    session = recordHintUsage(session)
    session = recordHintUsage(session)
    session = recordHintUsage(session)

    expect(session.hintsUsed).toBe(3)
  })
})

describe('calculateDebugScore', () => {
  it('should calculate score based on test results', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      testResults: createTestResults(4, 5),
      bugTagsIdentified: ['off-by-one'],
      hypothesis: 'The loop has an off-by-one error',
      reflection: 'I learned to check loop boundaries carefully',
    }
    const problem = createDebugProblem()
    const { totalScore, breakdown } = calculateDebugScore(session, problem)

    expect(breakdown.testsScore).toBe(80) // 4/5
    expect(totalScore).toBeGreaterThan(0)
  })

  it('should apply hint penalty', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      testResults: createTestResults(5, 5),
      bugTagsIdentified: ['off-by-one', 'loop-boundary'],
      hypothesis: 'The loop has an off-by-one error',
      reflection: 'I learned to check loop boundaries carefully',
      hintsUsed: 2,
    }
    const problem = createDebugProblem()
    const { hintPenalty } = calculateDebugScore(session, problem)

    expect(hintPenalty).toBe(2 * DEBUG_REFACTOR_POLICY.HINT_PENALTY_PER_LEVEL)
  })

  it('should reward correct bug identification', () => {
    const sessionCorrect: DebugSession = {
      ...createDebugSession('p1'),
      testResults: createTestResults(5, 5),
      bugTagsIdentified: ['off-by-one', 'loop-boundary'],
      hypothesis: 'test hypothesis here',
      reflection: 'test reflection here',
    }
    const sessionWrong: DebugSession = {
      ...createDebugSession('p1'),
      testResults: createTestResults(5, 5),
      bugTagsIdentified: ['wrong-tag'],
      hypothesis: 'test hypothesis here',
      reflection: 'test reflection here',
    }
    const problem = createDebugProblem()

    const correctScore = calculateDebugScore(sessionCorrect, problem)
    const wrongScore = calculateDebugScore(sessionWrong, problem)

    expect(correctScore.breakdown.bugIdScore).toBeGreaterThan(wrongScore.breakdown.bugIdScore)
  })

  it('should be deterministic', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      testResults: createTestResults(3, 5),
      bugTagsIdentified: ['off-by-one'],
      hypothesis: 'test',
      reflection: 'reflection',
    }
    const problem = createDebugProblem()

    const score1 = calculateDebugScore(session, problem)
    const score2 = calculateDebugScore(session, problem)

    expect(score1.totalScore).toBe(score2.totalScore)
  })
})

describe('evaluateDebugSubmission', () => {
  it('should pass when tests pass ratio met', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      testResults: createTestResults(8, 10),
      bugTagsIdentified: ['off-by-one'],
      hypothesis: 'test',
      reflection: 'reflection',
    }
    const problem = createDebugProblem()
    const result = evaluateDebugSubmission(session, problem)

    expect(result.passed).toBe(true)
    expect(result.testsPassed).toBe(8)
    expect(result.totalTests).toBe(10)
  })

  it('should fail when tests pass ratio not met', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      testResults: createTestResults(5, 10),
      bugTagsIdentified: ['off-by-one'],
      hypothesis: 'test',
      reflection: 'reflection',
    }
    const problem = createDebugProblem()
    const result = evaluateDebugSubmission(session, problem)

    expect(result.passed).toBe(false)
  })

  it('should provide appropriate feedback', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      testResults: createTestResults(10, 10),
      bugTagsIdentified: ['off-by-one', 'loop-boundary'],
      hypothesis: 'A very detailed hypothesis about the bug and its cause',
      reflection: 'A thoughtful reflection on debugging process and learnings',
    }
    const problem = createDebugProblem()
    const result = evaluateDebugSubmission(session, problem)

    expect(result.feedback.length).toBeGreaterThan(0)
    expect(result.bugTagsIdentified).toContain('off-by-one')
  })
})

// ============= REFACTOR MODE TESTS =============

describe('createRefactorSession', () => {
  it('should create session with initial values', () => {
    const session = createRefactorSession('problem-1')

    expect(session.problemId).toBe('problem-1')
    expect(session.currentStep).toBe('read')
    expect(session.stepsCompleted).toHaveLength(0)
    expect(session.smellsIdentified).toHaveLength(0)
    expect(session.refactorAttempts).toBe(0)
  })
})

describe('getNextRefactorStep', () => {
  it('should return correct step sequence', () => {
    expect(getNextRefactorStep('read')).toBe('identify')
    expect(getNextRefactorStep('identify')).toBe('refactor')
    expect(getNextRefactorStep('refactor')).toBe('test')
    expect(getNextRefactorStep('test')).toBe('reflection')
    expect(getNextRefactorStep('reflection')).toBeNull()
  })
})

describe('canCompleteRefactorStep', () => {
  it('should allow completing read step', () => {
    const session = createRefactorSession('p1')
    const result = canCompleteRefactorStep(session, 'read')

    expect(result.canComplete).toBe(true)
  })

  it('should require smells for identify step', () => {
    const session: RefactorSession = {
      ...createRefactorSession('p1'),
      currentStep: 'identify',
      stepsCompleted: ['read'],
    }

    const withoutSmells = canCompleteRefactorStep(session, 'identify')
    expect(withoutSmells.canComplete).toBe(false)

    const withSmells = canCompleteRefactorStep(session, 'identify', {
      smells: ['cs1'],
    })
    expect(withSmells.canComplete).toBe(true)
  })

  it('should require smells identified before refactor', () => {
    const session: RefactorSession = {
      ...createRefactorSession('p1'),
      currentStep: 'refactor',
      stepsCompleted: ['read', 'identify'],
      smellsIdentified: [],
    }
    const result = canCompleteRefactorStep(session, 'refactor')

    expect(result.canComplete).toBe(false)
  })
})

describe('advanceRefactorStep', () => {
  it('should advance to next step', () => {
    const session = createRefactorSession('p1')
    const advanced = advanceRefactorStep(session)

    expect(advanced.currentStep).toBe('identify')
    expect(advanced.stepsCompleted).toContain('read')
  })

  it('should record smells when provided', () => {
    const session: RefactorSession = {
      ...createRefactorSession('p1'),
      currentStep: 'identify',
      stepsCompleted: ['read'],
    }
    const advanced = advanceRefactorStep(session, { smells: ['cs1', 'cs2'] })

    expect(advanced.smellsIdentified).toContain('cs1')
    expect(advanced.smellsIdentified).toContain('cs2')
  })
})

describe('recordRefactorAttempt', () => {
  it('should increment refactor attempts', () => {
    const session = createRefactorSession('p1')
    const updated = recordRefactorAttempt(session, [], [])

    expect(updated.refactorAttempts).toBe(1)
  })

  it('should record style goals met', () => {
    const session = createRefactorSession('p1')
    const updated = recordRefactorAttempt(session, [], ['sg1', 'sg2'])

    expect(updated.styleGoalsMet).toContain('sg1')
    expect(updated.styleGoalsMet).toContain('sg2')
  })

  it('should respect max attempts', () => {
    let session = createRefactorSession('p1')
    for (let i = 0; i < 10; i++) {
      session = recordRefactorAttempt(session, [], [])
    }

    expect(session.refactorAttempts).toBe(DEBUG_REFACTOR_POLICY.MAX_ATTEMPTS)
  })
})

describe('evaluateSmellIdentification', () => {
  it('should score correct identifications', () => {
    const smells: CodeSmell[] = [
      { id: 'cs1', name: 'Smell 1', description: 'desc', severity: 'minor' },
      { id: 'cs2', name: 'Smell 2', description: 'desc', severity: 'moderate' },
    ]
    const result = evaluateSmellIdentification(['cs1', 'cs2'], smells)

    expect(result.correct).toBe(2)
    expect(result.missed).toBe(0)
    expect(result.score).toBe(100)
  })

  it('should penalize false positives', () => {
    const smells: CodeSmell[] = [
      { id: 'cs1', name: 'Smell 1', description: 'desc', severity: 'minor' },
    ]
    const result = evaluateSmellIdentification(['cs1', 'wrong'], smells)

    expect(result.falsePositives).toBe(1)
    expect(result.score).toBeLessThan(100)
  })

  it('should count missed smells', () => {
    const smells: CodeSmell[] = [
      { id: 'cs1', name: 'Smell 1', description: 'desc', severity: 'minor' },
      { id: 'cs2', name: 'Smell 2', description: 'desc', severity: 'moderate' },
    ]
    const result = evaluateSmellIdentification(['cs1'], smells)

    expect(result.missed).toBe(1)
  })

  it('should handle empty inputs', () => {
    const result = evaluateSmellIdentification([], [])
    expect(result.score).toBe(100)
  })
})

describe('evaluateStyleGoals', () => {
  it('should calculate weighted score', () => {
    const goals: StyleGoal[] = [
      { id: 'sg1', description: 'Goal 1', weight: 0.5 },
      { id: 'sg2', description: 'Goal 2', weight: 0.5 },
    ]
    const result = evaluateStyleGoals(['sg1'], goals)

    expect(result.metCount).toBe(1)
    expect(result.totalCount).toBe(2)
    expect(result.weightedScore).toBe(50)
  })

  it('should weight goals correctly', () => {
    const goals: StyleGoal[] = [
      { id: 'sg1', description: 'Goal 1', weight: 0.8 },
      { id: 'sg2', description: 'Goal 2', weight: 0.2 },
    ]

    const metHigh = evaluateStyleGoals(['sg1'], goals)
    const metLow = evaluateStyleGoals(['sg2'], goals)

    expect(metHigh.weightedScore).toBeGreaterThan(metLow.weightedScore)
  })

  it('should return 100 for all goals met', () => {
    const goals: StyleGoal[] = [
      { id: 'sg1', description: 'Goal 1', weight: 0.5 },
      { id: 'sg2', description: 'Goal 2', weight: 0.5 },
    ]
    const result = evaluateStyleGoals(['sg1', 'sg2'], goals)

    expect(result.weightedScore).toBe(100)
  })
})

describe('calculateRefactorScore', () => {
  it('should calculate score based on all factors', () => {
    const session: RefactorSession = {
      ...createRefactorSession('p1'),
      testResults: createTestResults(5, 5),
      smellsIdentified: ['cs1', 'cs2'],
      styleGoalsMet: ['sg1', 'sg2'],
      reflection: 'A good reflection on the refactoring process',
    }
    const problem = createRefactorProblem()
    const { totalScore, breakdown } = calculateRefactorScore(session, problem)

    expect(breakdown.testsScore).toBe(100)
    expect(totalScore).toBeGreaterThan(0)
  })

  it('should be deterministic', () => {
    const session: RefactorSession = {
      ...createRefactorSession('p1'),
      testResults: createTestResults(4, 5),
      smellsIdentified: ['cs1'],
      styleGoalsMet: ['sg1'],
      reflection: 'reflection',
    }
    const problem = createRefactorProblem()

    const score1 = calculateRefactorScore(session, problem)
    const score2 = calculateRefactorScore(session, problem)

    expect(score1.totalScore).toBe(score2.totalScore)
  })
})

describe('evaluateRefactorSubmission', () => {
  it('should pass when tests pass and score sufficient', () => {
    const session: RefactorSession = {
      ...createRefactorSession('p1'),
      testResults: createTestResults(8, 10),
      smellsIdentified: ['cs1', 'cs2'],
      styleGoalsMet: ['sg1', 'sg2', 'sg3'],
      reflection: 'A thoughtful reflection on refactoring improvements made',
    }
    const problem = createRefactorProblem()
    const result = evaluateRefactorSubmission(session, problem)

    expect(result.passed).toBe(true)
  })

  it('should fail when tests broken', () => {
    const session: RefactorSession = {
      ...createRefactorSession('p1'),
      testResults: createTestResults(3, 10),
      smellsIdentified: ['cs1', 'cs2'],
      styleGoalsMet: ['sg1', 'sg2'],
      reflection: 'reflection',
    }
    const problem = createRefactorProblem()
    const result = evaluateRefactorSubmission(session, problem)

    expect(result.passed).toBe(false)
    expect(result.feedback).toContain('broke')
  })

  it('should include smells fixed in result', () => {
    const session: RefactorSession = {
      ...createRefactorSession('p1'),
      testResults: createTestResults(10, 10),
      smellsIdentified: ['cs1', 'cs2'],
      styleGoalsMet: ['sg1'],
      reflection: 'reflection',
    }
    const problem = createRefactorProblem()
    const result = evaluateRefactorSubmission(session, problem)

    expect(result.smellsFixed).toContain('cs1')
    expect(result.smellsFixed).toContain('cs2')
  })
})

// ============= SHARED UTILITY TESTS =============

describe('getDebugProgress', () => {
  it('should return 0 for new session', () => {
    const session = createDebugSession('p1')
    expect(getDebugProgress(session)).toBe(0)
  })

  it('should return correct percentage', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      stepsCompleted: ['understand', 'hypothesis'],
    }
    expect(getDebugProgress(session)).toBe(40) // 2/5 = 40%
  })

  it('should return 100 for completed session', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      stepsCompleted: ['understand', 'hypothesis', 'fix', 'test', 'reflection'],
    }
    expect(getDebugProgress(session)).toBe(100)
  })
})

describe('getRefactorProgress', () => {
  it('should return correct percentage', () => {
    const session: RefactorSession = {
      ...createRefactorSession('p1'),
      stepsCompleted: ['read', 'identify'],
    }
    expect(getRefactorProgress(session)).toBe(40)
  })
})

describe('isDebugSessionComplete', () => {
  it('should return false for incomplete session', () => {
    const session = createDebugSession('p1')
    expect(isDebugSessionComplete(session)).toBe(false)
  })

  it('should return true when reflection completed', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      stepsCompleted: ['understand', 'hypothesis', 'fix', 'test', 'reflection'],
    }
    expect(isDebugSessionComplete(session)).toBe(true)
  })

  it('should return true when completedAt set', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      completedAt: new Date().toISOString(),
    }
    expect(isDebugSessionComplete(session)).toBe(true)
  })
})

describe('getAvailableHints', () => {
  it('should return hints up to current level', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      hintsUsed: 1,
    }
    const problem = createDebugProblem()
    const hints = getAvailableHints(session, problem)

    expect(hints.length).toBe(2) // Level 1 and 2
  })

  it('should return only level 1 hint initially', () => {
    const session = createDebugSession('p1')
    const problem = createDebugProblem()
    const hints = getAvailableHints(session, problem)

    expect(hints.length).toBe(1)
    expect(hints[0].level).toBe(1)
  })
})

describe('getRemainingAttempts', () => {
  it('should return max attempts for new session', () => {
    const session = createDebugSession('p1')
    expect(getRemainingAttempts(session)).toBe(DEBUG_REFACTOR_POLICY.MAX_ATTEMPTS)
  })

  it('should decrease with attempts', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      fixAttempts: 2,
    }
    expect(getRemainingAttempts(session)).toBe(DEBUG_REFACTOR_POLICY.MAX_ATTEMPTS - 2)
  })

  it('should not go below 0', () => {
    const session: DebugSession = {
      ...createDebugSession('p1'),
      fixAttempts: 100,
    }
    expect(getRemainingAttempts(session)).toBe(0)
  })
})

describe('getGradeFromScore', () => {
  it('should return A for 90+', () => {
    expect(getGradeFromScore(90)).toBe('A')
    expect(getGradeFromScore(100)).toBe('A')
  })

  it('should return B for 80-89', () => {
    expect(getGradeFromScore(80)).toBe('B')
    expect(getGradeFromScore(89)).toBe('B')
  })

  it('should return C for 70-79', () => {
    expect(getGradeFromScore(70)).toBe('C')
    expect(getGradeFromScore(79)).toBe('C')
  })

  it('should return D for 60-69', () => {
    expect(getGradeFromScore(60)).toBe('D')
    expect(getGradeFromScore(69)).toBe('D')
  })

  it('should return F for below 60', () => {
    expect(getGradeFromScore(59)).toBe('F')
    expect(getGradeFromScore(0)).toBe('F')
  })
})

describe('getDebugStepDescription', () => {
  it('should return description for each step', () => {
    for (const step of DEBUG_STEP_ORDER) {
      const desc = getDebugStepDescription(step)
      expect(desc.length).toBeGreaterThan(0)
    }
  })
})

describe('getRefactorStepDescription', () => {
  it('should return description for each step', () => {
    for (const step of REFACTOR_STEP_ORDER) {
      const desc = getRefactorStepDescription(step)
      expect(desc.length).toBeGreaterThan(0)
    }
  })
})

// ============= CONSTANTS TESTS =============

describe('DEBUG_STEP_ORDER', () => {
  it('should have all 5 steps', () => {
    expect(DEBUG_STEP_ORDER).toHaveLength(5)
  })

  it('should start with understand', () => {
    expect(DEBUG_STEP_ORDER[0]).toBe('understand')
  })

  it('should end with reflection', () => {
    expect(DEBUG_STEP_ORDER[4]).toBe('reflection')
  })
})

describe('REFACTOR_STEP_ORDER', () => {
  it('should have all 5 steps', () => {
    expect(REFACTOR_STEP_ORDER).toHaveLength(5)
  })

  it('should start with read', () => {
    expect(REFACTOR_STEP_ORDER[0]).toBe('read')
  })

  it('should end with reflection', () => {
    expect(REFACTOR_STEP_ORDER[4]).toBe('reflection')
  })
})

describe('EXTENDED_POLICY', () => {
  it('should have debug weights summing to 1', () => {
    const weights = EXTENDED_POLICY.DEBUG_WEIGHTS
    const sum = weights.testsPass + weights.bugIdentification +
      weights.hypothesis + weights.reflection
    expect(sum).toBeCloseTo(1, 5)
  })

  it('should have refactor weights summing to 1', () => {
    const weights = EXTENDED_POLICY.REFACTOR_WEIGHTS
    const sum = weights.testsPass + weights.smellsFixed +
      weights.styleGoals + weights.codeQuality
    expect(sum).toBeCloseTo(1, 5)
  })

  it('should have valid thresholds', () => {
    expect(EXTENDED_POLICY.EXCELLENT_THRESHOLD).toBeGreaterThan(
      EXTENDED_POLICY.GOOD_THRESHOLD
    )
    expect(EXTENDED_POLICY.GOOD_THRESHOLD).toBeGreaterThan(
      EXTENDED_POLICY.PASSING_THRESHOLD
    )
  })
})
