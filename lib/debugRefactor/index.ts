/**
 * Debug/Refactor Module
 *
 * Exports service and types for debug and refactor problem modes.
 */

export {
  debugRefactorService,
  DEBUG_STEP_ORDER,
  REFACTOR_STEP_ORDER,
} from './debug-refactor-service'

export type {
  DebugRefactorService,
  DebugSession,
  RefactorSession,
  TestResult,
} from './debug-refactor-service'

// Re-export types from types module
export type {
  ProblemMode,
  DebugProblem,
  RefactorProblem,
  TestCase,
  DebugStep,
  RefactorStep,
  CodeSmell,
  StyleGoal,
  DebugHint,
  ModeSubmissionResult,
} from '@/types/debugRefactorMode'

// Re-export policy constants
export {
  EXTENDED_POLICY,
  getDebugStepDescription,
  getRefactorStepDescription,
} from '@/lib/core/policies/debug-refactor-policy'
