/**
 * Debug + Refactor Mode Policy
 *
 * Deterministic scoring and progression for debug and refactor problem modes.
 * Teaches systematic debugging and code improvement skills.
 */

import type {
  DebugProblem,
  RefactorProblem,
  TestCase,
  DebugStep,
  RefactorStep,
  ModeSubmissionResult,
  CodeSmell,
  StyleGoal,
  DebugHint,
} from '@/types/debugRefactorMode'
import { DEBUG_REFACTOR_POLICY } from '@/types/debugRefactorMode'

// Re-export policy constants
export { DEBUG_REFACTOR_POLICY }

/**
 * Extended policy constants
 */
export const EXTENDED_POLICY = {
  // Debug scoring weights
  DEBUG_WEIGHTS: {
    testsPass: 0.4,
    bugIdentification: 0.3,
    hypothesis: 0.15,
    reflection: 0.15,
  },
  // Refactor scoring weights
  REFACTOR_WEIGHTS: {
    testsPass: 0.3,
    smellsFixed: 0.35,
    styleGoals: 0.2,
    codeQuality: 0.15,
  },
  // Step requirements
  REQUIRED_HYPOTHESIS_LENGTH: 20,
  REQUIRED_REFLECTION_LENGTH: 30,
  // Scoring thresholds
  EXCELLENT_THRESHOLD: 90,
  GOOD_THRESHOLD: 70,
  PASSING_THRESHOLD: 50,
} as const

/**
 * Debug step order - DETERMINISTIC
 */
export const DEBUG_STEP_ORDER: readonly DebugStep[] = [
  'understand',
  'hypothesis',
  'fix',
  'test',
  'reflection',
]

/**
 * Refactor step order - DETERMINISTIC
 */
export const REFACTOR_STEP_ORDER: readonly RefactorStep[] = [
  'read',
  'identify',
  'refactor',
  'test',
  'reflection',
]

/**
 * Session state for debug mode
 */
export interface DebugSession {
  readonly problemId: string
  readonly currentStep: DebugStep
  readonly stepsCompleted: readonly DebugStep[]
  readonly hypothesis: string | null
  readonly fixAttempts: number
  readonly hintsUsed: number
  readonly testResults: readonly TestResult[]
  readonly bugTagsIdentified: readonly string[]
  readonly reflection: string | null
  readonly startedAt: string
  readonly completedAt: string | null
}

/**
 * Session state for refactor mode
 */
export interface RefactorSession {
  readonly problemId: string
  readonly currentStep: RefactorStep
  readonly stepsCompleted: readonly RefactorStep[]
  readonly smellsIdentified: readonly string[]
  readonly refactorAttempts: number
  readonly testResults: readonly TestResult[]
  readonly styleGoalsMet: readonly string[]
  readonly reflection: string | null
  readonly startedAt: string
  readonly completedAt: string | null
}

/**
 * Test execution result
 */
export interface TestResult {
  readonly testId: string
  readonly passed: boolean
  readonly actualOutput?: string
  readonly error?: string
}

// ============= DEBUG MODE FUNCTIONS =============

/**
 * Create initial debug session - DETERMINISTIC
 */
export function createDebugSession(problemId: string): DebugSession {
  return {
    problemId,
    currentStep: 'understand',
    stepsCompleted: [],
    hypothesis: null,
    fixAttempts: 0,
    hintsUsed: 0,
    testResults: [],
    bugTagsIdentified: [],
    reflection: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  }
}

/**
 * Get next debug step - DETERMINISTIC
 */
export function getNextDebugStep(currentStep: DebugStep): DebugStep | null {
  const currentIndex = DEBUG_STEP_ORDER.indexOf(currentStep)
  if (currentIndex === -1 || currentIndex >= DEBUG_STEP_ORDER.length - 1) {
    return null
  }
  return DEBUG_STEP_ORDER[currentIndex + 1]
}

/**
 * Check if step can be completed - DETERMINISTIC
 */
export function canCompleteDebugStep(
  session: DebugSession,
  step: DebugStep,
  input?: { hypothesis?: string; reflection?: string }
): { canComplete: boolean; reason?: string } {
  // Must complete steps in order
  const stepIndex = DEBUG_STEP_ORDER.indexOf(step)
  const currentIndex = DEBUG_STEP_ORDER.indexOf(session.currentStep)

  if (stepIndex > currentIndex) {
    return { canComplete: false, reason: 'Complete previous steps first' }
  }

  if (stepIndex < currentIndex) {
    return { canComplete: false, reason: 'Step already completed' }
  }

  // Step-specific requirements
  switch (step) {
    case 'understand':
      return { canComplete: true }

    case 'hypothesis':
      if (!input?.hypothesis || input.hypothesis.length < EXTENDED_POLICY.REQUIRED_HYPOTHESIS_LENGTH) {
        return {
          canComplete: false,
          reason: `Hypothesis must be at least ${EXTENDED_POLICY.REQUIRED_HYPOTHESIS_LENGTH} characters`,
        }
      }
      return { canComplete: true }

    case 'fix':
      // Fix step requires hypothesis to be set
      if (!session.hypothesis) {
        return { canComplete: false, reason: 'Submit hypothesis first' }
      }
      return { canComplete: true }

    case 'test':
      // Test step requires at least one fix attempt
      if (session.fixAttempts === 0) {
        return { canComplete: false, reason: 'Submit a fix first' }
      }
      return { canComplete: true }

    case 'reflection':
      if (!input?.reflection || input.reflection.length < EXTENDED_POLICY.REQUIRED_REFLECTION_LENGTH) {
        return {
          canComplete: false,
          reason: `Reflection must be at least ${EXTENDED_POLICY.REQUIRED_REFLECTION_LENGTH} characters`,
        }
      }
      return { canComplete: true }
  }
}

/**
 * Advance debug session to next step - DETERMINISTIC
 */
export function advanceDebugStep(
  session: DebugSession,
  input?: { hypothesis?: string; reflection?: string }
): DebugSession {
  const check = canCompleteDebugStep(session, session.currentStep, input)
  if (!check.canComplete) {
    return session // Can't advance
  }

  const nextStep = getNextDebugStep(session.currentStep)

  return {
    ...session,
    currentStep: nextStep ?? session.currentStep,
    stepsCompleted: [...session.stepsCompleted, session.currentStep],
    hypothesis: input?.hypothesis ?? session.hypothesis,
    reflection: input?.reflection ?? session.reflection,
    completedAt: nextStep === null ? new Date().toISOString() : null,
  }
}

/**
 * Record fix attempt - DETERMINISTIC
 */
export function recordFixAttempt(
  session: DebugSession,
  testResults: readonly TestResult[],
  bugTagsFound: readonly string[]
): DebugSession {
  if (session.fixAttempts >= DEBUG_REFACTOR_POLICY.MAX_ATTEMPTS) {
    return session // Max attempts reached
  }

  return {
    ...session,
    fixAttempts: session.fixAttempts + 1,
    testResults: [...testResults],
    bugTagsIdentified: [
      ...new Set([...session.bugTagsIdentified, ...bugTagsFound]),
    ],
  }
}

/**
 * Record hint usage - DETERMINISTIC
 */
export function recordHintUsage(session: DebugSession): DebugSession {
  return {
    ...session,
    hintsUsed: session.hintsUsed + 1,
  }
}

/**
 * Calculate debug score - DETERMINISTIC
 */
export function calculateDebugScore(
  session: DebugSession,
  problem: DebugProblem
): {
  totalScore: number
  breakdown: {
    testsScore: number
    bugIdScore: number
    hypothesisScore: number
    reflectionScore: number
  }
  hintPenalty: number
} {
  const weights = EXTENDED_POLICY.DEBUG_WEIGHTS

  // Tests score (0-100)
  const passedTests = session.testResults.filter(t => t.passed).length
  const totalTests = session.testResults.length
  const testsScore = totalTests > 0
    ? Math.round((passedTests / totalTests) * 100)
    : 0

  // Bug identification score (0-100)
  const expectedTags = problem.expectedFixTags.length
  const identifiedTags = session.bugTagsIdentified.filter(tag =>
    problem.expectedFixTags.includes(tag)
  ).length
  const bugIdScore = expectedTags > 0
    ? Math.round((identifiedTags / expectedTags) * 100)
    : 100

  // Hypothesis score (0-100)
  const hypothesisScore = session.hypothesis
    ? Math.min(100, Math.round((session.hypothesis.length / 100) * 100))
    : 0

  // Reflection score (0-100)
  const reflectionScore = session.reflection
    ? Math.min(100, Math.round((session.reflection.length / 150) * 100))
    : 0

  // Calculate weighted score
  const rawScore =
    testsScore * weights.testsPass +
    bugIdScore * weights.bugIdentification +
    hypothesisScore * weights.hypothesis +
    reflectionScore * weights.reflection

  // Apply hint penalty
  const hintPenalty = session.hintsUsed * DEBUG_REFACTOR_POLICY.HINT_PENALTY_PER_LEVEL
  const totalScore = Math.max(0, Math.round(rawScore - hintPenalty))

  return {
    totalScore,
    breakdown: {
      testsScore,
      bugIdScore,
      hypothesisScore,
      reflectionScore,
    },
    hintPenalty,
  }
}

/**
 * Evaluate debug submission - DETERMINISTIC
 */
export function evaluateDebugSubmission(
  session: DebugSession,
  problem: DebugProblem
): ModeSubmissionResult {
  const { totalScore, breakdown } = calculateDebugScore(session, problem)

  const passedTests = session.testResults.filter(t => t.passed).length
  const totalTests = session.testResults.length
  const passRatio = totalTests > 0 ? passedTests / totalTests : 0

  const passed = passRatio >= DEBUG_REFACTOR_POLICY.MIN_TESTS_PASS_RATIO

  let feedback: string
  if (totalScore >= EXTENDED_POLICY.EXCELLENT_THRESHOLD) {
    feedback = 'Excellent debugging! You systematically identified and fixed the bug.'
  } else if (totalScore >= EXTENDED_POLICY.GOOD_THRESHOLD) {
    feedback = 'Good job! You found the bug but there\'s room for improvement in your process.'
  } else if (passed) {
    feedback = 'You fixed the bug. Focus on forming clearer hypotheses next time.'
  } else {
    feedback = 'Keep practicing. Try to understand the code flow before making changes.'
  }

  return {
    passed,
    testsPassed: passedTests,
    totalTests,
    rubricScore: totalScore,
    feedback,
    bugTagsIdentified: session.bugTagsIdentified,
  }
}

// ============= REFACTOR MODE FUNCTIONS =============

/**
 * Create initial refactor session - DETERMINISTIC
 */
export function createRefactorSession(problemId: string): RefactorSession {
  return {
    problemId,
    currentStep: 'read',
    stepsCompleted: [],
    smellsIdentified: [],
    refactorAttempts: 0,
    testResults: [],
    styleGoalsMet: [],
    reflection: null,
    startedAt: new Date().toISOString(),
    completedAt: null,
  }
}

/**
 * Get next refactor step - DETERMINISTIC
 */
export function getNextRefactorStep(currentStep: RefactorStep): RefactorStep | null {
  const currentIndex = REFACTOR_STEP_ORDER.indexOf(currentStep)
  if (currentIndex === -1 || currentIndex >= REFACTOR_STEP_ORDER.length - 1) {
    return null
  }
  return REFACTOR_STEP_ORDER[currentIndex + 1]
}

/**
 * Check if refactor step can be completed - DETERMINISTIC
 */
export function canCompleteRefactorStep(
  session: RefactorSession,
  step: RefactorStep,
  input?: { smells?: readonly string[]; reflection?: string }
): { canComplete: boolean; reason?: string } {
  const stepIndex = REFACTOR_STEP_ORDER.indexOf(step)
  const currentIndex = REFACTOR_STEP_ORDER.indexOf(session.currentStep)

  if (stepIndex > currentIndex) {
    return { canComplete: false, reason: 'Complete previous steps first' }
  }

  if (stepIndex < currentIndex) {
    return { canComplete: false, reason: 'Step already completed' }
  }

  switch (step) {
    case 'read':
      return { canComplete: true }

    case 'identify':
      if (!input?.smells || input.smells.length === 0) {
        return { canComplete: false, reason: 'Identify at least one code smell' }
      }
      return { canComplete: true }

    case 'refactor':
      if (session.smellsIdentified.length === 0) {
        return { canComplete: false, reason: 'Identify code smells first' }
      }
      return { canComplete: true }

    case 'test':
      if (session.refactorAttempts === 0) {
        return { canComplete: false, reason: 'Submit refactored code first' }
      }
      return { canComplete: true }

    case 'reflection':
      if (!input?.reflection || input.reflection.length < EXTENDED_POLICY.REQUIRED_REFLECTION_LENGTH) {
        return {
          canComplete: false,
          reason: `Reflection must be at least ${EXTENDED_POLICY.REQUIRED_REFLECTION_LENGTH} characters`,
        }
      }
      return { canComplete: true }
  }
}

/**
 * Advance refactor session to next step - DETERMINISTIC
 */
export function advanceRefactorStep(
  session: RefactorSession,
  input?: { smells?: readonly string[]; reflection?: string }
): RefactorSession {
  const check = canCompleteRefactorStep(session, session.currentStep, input)
  if (!check.canComplete) {
    return session
  }

  const nextStep = getNextRefactorStep(session.currentStep)

  return {
    ...session,
    currentStep: nextStep ?? session.currentStep,
    stepsCompleted: [...session.stepsCompleted, session.currentStep],
    smellsIdentified: input?.smells
      ? [...new Set([...session.smellsIdentified, ...input.smells])]
      : session.smellsIdentified,
    reflection: input?.reflection ?? session.reflection,
    completedAt: nextStep === null ? new Date().toISOString() : null,
  }
}

/**
 * Record refactor attempt - DETERMINISTIC
 */
export function recordRefactorAttempt(
  session: RefactorSession,
  testResults: readonly TestResult[],
  styleGoalsMet: readonly string[]
): RefactorSession {
  if (session.refactorAttempts >= DEBUG_REFACTOR_POLICY.MAX_ATTEMPTS) {
    return session
  }

  return {
    ...session,
    refactorAttempts: session.refactorAttempts + 1,
    testResults: [...testResults],
    styleGoalsMet: [...new Set([...session.styleGoalsMet, ...styleGoalsMet])],
  }
}

/**
 * Evaluate code smell identification - DETERMINISTIC
 */
export function evaluateSmellIdentification(
  identifiedSmells: readonly string[],
  actualSmells: readonly CodeSmell[]
): {
  correct: number
  missed: number
  falsePositives: number
  score: number
} {
  const actualIds = actualSmells.map(s => s.id)

  const correct = identifiedSmells.filter(id => actualIds.includes(id)).length
  const missed = actualIds.filter(id => !identifiedSmells.includes(id)).length
  const falsePositives = identifiedSmells.filter(id => !actualIds.includes(id)).length

  // Score: reward correct, penalize false positives
  const maxScore = actualSmells.length
  const rawScore = correct - (falsePositives * 0.5)
  const score = maxScore > 0
    ? Math.max(0, Math.round((rawScore / maxScore) * 100))
    : 100

  return { correct, missed, falsePositives, score }
}

/**
 * Evaluate style goals - DETERMINISTIC
 */
export function evaluateStyleGoals(
  goalsMet: readonly string[],
  allGoals: readonly StyleGoal[]
): {
  metCount: number
  totalCount: number
  weightedScore: number
} {
  const totalWeight = allGoals.reduce((sum, g) => sum + g.weight, 0)
  const metWeight = allGoals
    .filter(g => goalsMet.includes(g.id))
    .reduce((sum, g) => sum + g.weight, 0)

  const weightedScore = totalWeight > 0
    ? Math.round((metWeight / totalWeight) * 100)
    : 100

  return {
    metCount: goalsMet.length,
    totalCount: allGoals.length,
    weightedScore,
  }
}

/**
 * Calculate refactor score - DETERMINISTIC
 */
export function calculateRefactorScore(
  session: RefactorSession,
  problem: RefactorProblem
): {
  totalScore: number
  breakdown: {
    testsScore: number
    smellsScore: number
    styleScore: number
    qualityScore: number
  }
} {
  const weights = EXTENDED_POLICY.REFACTOR_WEIGHTS

  // Tests score (must not break functionality)
  const passedTests = session.testResults.filter(t => t.passed).length
  const totalTests = session.testResults.length
  const testsScore = totalTests > 0
    ? Math.round((passedTests / totalTests) * 100)
    : 0

  // Smells identification score
  const smellEval = evaluateSmellIdentification(
    session.smellsIdentified,
    problem.codeSmells
  )
  const smellsScore = smellEval.score

  // Style goals score
  const styleEval = evaluateStyleGoals(session.styleGoalsMet, problem.styleGoals)
  const styleScore = styleEval.weightedScore

  // Code quality score (based on reflection quality)
  const qualityScore = session.reflection
    ? Math.min(100, Math.round((session.reflection.length / 150) * 100))
    : 0

  // Calculate weighted score
  const totalScore = Math.round(
    testsScore * weights.testsPass +
    smellsScore * weights.smellsFixed +
    styleScore * weights.styleGoals +
    qualityScore * weights.codeQuality
  )

  return {
    totalScore,
    breakdown: {
      testsScore,
      smellsScore,
      styleScore,
      qualityScore,
    },
  }
}

/**
 * Evaluate refactor submission - DETERMINISTIC
 */
export function evaluateRefactorSubmission(
  session: RefactorSession,
  problem: RefactorProblem
): ModeSubmissionResult {
  const { totalScore, breakdown } = calculateRefactorScore(session, problem)

  const passedTests = session.testResults.filter(t => t.passed).length
  const totalTests = session.testResults.length
  const passRatio = totalTests > 0 ? passedTests / totalTests : 0

  // Must pass tests AND have minimum score
  const passed = passRatio >= DEBUG_REFACTOR_POLICY.MIN_TESTS_PASS_RATIO &&
    totalScore >= EXTENDED_POLICY.PASSING_THRESHOLD

  let feedback: string
  if (breakdown.testsScore < 80) {
    feedback = 'Your refactoring broke some functionality. Ensure tests pass before refactoring further.'
  } else if (totalScore >= EXTENDED_POLICY.EXCELLENT_THRESHOLD) {
    feedback = 'Excellent refactoring! You improved code quality while maintaining functionality.'
  } else if (totalScore >= EXTENDED_POLICY.GOOD_THRESHOLD) {
    feedback = 'Good refactoring. Consider addressing more code smells next time.'
  } else if (passed) {
    feedback = 'Basic refactoring complete. Look for more improvement opportunities.'
  } else {
    feedback = 'Keep practicing. Focus on identifying code smells systematically.'
  }

  return {
    passed,
    testsPassed: passedTests,
    totalTests,
    rubricScore: totalScore,
    feedback,
    smellsFixed: session.smellsIdentified,
  }
}

// ============= SHARED UTILITY FUNCTIONS =============

/**
 * Get step progress percentage - DETERMINISTIC
 */
export function getDebugProgress(session: DebugSession): number {
  const totalSteps = DEBUG_STEP_ORDER.length
  const completedSteps = session.stepsCompleted.length
  return Math.round((completedSteps / totalSteps) * 100)
}

/**
 * Get refactor progress percentage - DETERMINISTIC
 */
export function getRefactorProgress(session: RefactorSession): number {
  const totalSteps = REFACTOR_STEP_ORDER.length
  const completedSteps = session.stepsCompleted.length
  return Math.round((completedSteps / totalSteps) * 100)
}

/**
 * Check if session is complete - DETERMINISTIC
 */
export function isDebugSessionComplete(session: DebugSession): boolean {
  return session.completedAt !== null ||
    session.stepsCompleted.includes('reflection')
}

/**
 * Check if refactor session is complete - DETERMINISTIC
 */
export function isRefactorSessionComplete(session: RefactorSession): boolean {
  return session.completedAt !== null ||
    session.stepsCompleted.includes('reflection')
}

/**
 * Get available hints for debug session - DETERMINISTIC
 */
export function getAvailableHints(
  session: DebugSession,
  problem: DebugProblem
): readonly DebugHint[] {
  // Only show hints up to level used + 1
  const maxLevel = session.hintsUsed + 1
  return problem.hints.filter(h => h.level <= maxLevel)
}

/**
 * Calculate remaining attempts - DETERMINISTIC
 */
export function getRemainingAttempts(
  session: DebugSession | RefactorSession
): number {
  const attempts = 'fixAttempts' in session
    ? session.fixAttempts
    : session.refactorAttempts
  return Math.max(0, DEBUG_REFACTOR_POLICY.MAX_ATTEMPTS - attempts)
}

/**
 * Get grade from score - DETERMINISTIC
 */
export function getGradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

/**
 * Get step description - DETERMINISTIC
 */
export function getDebugStepDescription(step: DebugStep): string {
  const descriptions: Record<DebugStep, string> = {
    understand: 'Read the code and understand what it should do',
    hypothesis: 'Form a hypothesis about what the bug might be',
    fix: 'Apply your fix to correct the bug',
    test: 'Run tests to verify your fix',
    reflection: 'Reflect on what you learned',
  }
  return descriptions[step]
}

/**
 * Get refactor step description - DETERMINISTIC
 */
export function getRefactorStepDescription(step: RefactorStep): string {
  const descriptions: Record<RefactorStep, string> = {
    read: 'Read and understand the existing code',
    identify: 'Identify code smells and areas for improvement',
    refactor: 'Apply refactoring to improve code quality',
    test: 'Run tests to ensure functionality is preserved',
    reflection: 'Reflect on the improvements made',
  }
  return descriptions[step]
}
