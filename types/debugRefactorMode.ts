/**
 * Debug + Refactor Mode Types (PhaseB_02)
 *
 * Teach debugging and refactoring with structured problem types.
 */

/**
 * Problem types extended with debug and refactor modes
 */
export type ProblemMode = 'solve' | 'debug' | 'refactor'

/**
 * Debug problem configuration
 */
export interface DebugProblem {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly buggyCode: string
  readonly language: string
  readonly testCases: readonly TestCase[]
  readonly expectedFixTags: readonly string[] // Bug categories to identify
  readonly hints: readonly DebugHint[]
  readonly difficulty: 'easy' | 'medium' | 'hard'
}

/**
 * Test case for debug/refactor problems
 */
export interface TestCase {
  readonly id: string
  readonly input: string
  readonly expectedOutput: string
  readonly isHidden: boolean // Hidden test cases revealed after submission
}

/**
 * Debug hint
 */
export interface DebugHint {
  readonly level: number
  readonly text: string
  readonly lineHint?: number // Hint about which line
}

/**
 * Refactor problem configuration
 */
export interface RefactorProblem {
  readonly id: string
  readonly title: string
  readonly description: string
  readonly messyCode: string // Working but messy code
  readonly language: string
  readonly testCases: readonly TestCase[]
  readonly styleGoals: readonly StyleGoal[]
  readonly codeSmells: readonly CodeSmell[]
  readonly difficulty: 'easy' | 'medium' | 'hard'
}

/**
 * Style goal for refactoring
 */
export interface StyleGoal {
  readonly id: string
  readonly description: string
  readonly checkFunction?: string // Name of check function
  readonly weight: number
}

/**
 * Code smell to identify and fix
 */
export interface CodeSmell {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly lineRange?: { start: number; end: number }
  readonly severity: 'minor' | 'moderate' | 'major'
}

/**
 * Stepper flow for debug mode
 */
export type DebugStep =
  | 'understand' // Understand the problem
  | 'hypothesis' // Form hypothesis about bug
  | 'fix' // Apply fix
  | 'test' // Run tests
  | 'reflection' // Reflect on learning

/**
 * Stepper flow for refactor mode
 */
export type RefactorStep =
  | 'read' // Read and understand code
  | 'identify' // Identify code smells
  | 'refactor' // Apply refactoring
  | 'test' // Run tests
  | 'reflection' // Reflect on improvements

/**
 * Submission result for debug/refactor
 */
export interface ModeSubmissionResult {
  readonly passed: boolean
  readonly testsPassed: number
  readonly totalTests: number
  readonly rubricScore: number
  readonly feedback: string
  readonly bugTagsIdentified?: readonly string[]
  readonly smellsFixed?: readonly string[]
}

// Policy constants
export const DEBUG_REFACTOR_POLICY = {
  MIN_TESTS_PASS_RATIO: 0.8, // 80% of tests must pass
  MAX_ATTEMPTS: 5,
  HINT_PENALTY_PER_LEVEL: 5, // Score reduction per hint
  PERFECT_SCORE_BONUS: 10,
} as const

// Event types
export type DebugRefactorEventType =
  | 'debug_problem_started'
  | 'debug_hypothesis_submitted'
  | 'debug_fix_submitted'
  | 'debug_completed'
  | 'refactor_problem_started'
  | 'refactor_smell_identified'
  | 'refactor_submitted'
  | 'refactor_completed'
  | 'tests_executed'
