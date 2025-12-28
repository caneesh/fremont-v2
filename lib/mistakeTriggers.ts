/**
 * Mistake Detection Triggers
 *
 * Helper functions to detect and record mistakes from various
 * learning events. Integrates with the MistakeNotebook service.
 */

import { createCardIfNotExists } from './mistakeNotebook'
import type { CreateCardInput } from './mistakeNotebook'
import type { MistakeTrigger } from '@/types/mistakeNotebook'
import type { StepType } from '@/types/scaffold'

// ============================================
// Context Types
// ============================================

export interface ProblemContext {
  problemId: string
  problemTitle: string
  domain: string
  subdomain: string
}

export interface StepContext {
  stepId: number
  stepTitle: string
  stepType: StepType
  requiredConcepts: string[]
}

// ============================================
// Trigger Functions
// ============================================

/**
 * Trigger: User requested a hint
 * Creates a card when user unlocks hint level 2+ (indicates struggle)
 */
export function onHintRequested(
  problem: ProblemContext,
  step: StepContext,
  hintLevel: number
): void {
  // Only create card if they needed hint level 2 or higher
  if (hintLevel < 2) return

  const input: CreateCardInput = {
    problemId: problem.problemId,
    problemTitle: problem.problemTitle,
    stepId: step.stepId,
    stepTitle: step.stepTitle,
    conceptTags: step.requiredConcepts,
    stepType: step.stepType,
    domain: problem.domain,
    subdomain: problem.subdomain,
    trigger: 'hint_requested',
    hintLevelReached: hintLevel
  }

  createCardIfNotExists(input)
}

/**
 * Trigger: User failed step validation
 * Creates a card when validation fails
 */
export function onStepFailed(
  problem: ProblemContext,
  step: StepContext,
  attemptCount: number,
  hintLevelReached: number = 0
): void {
  const input: CreateCardInput = {
    problemId: problem.problemId,
    problemTitle: problem.problemTitle,
    stepId: step.stepId,
    stepTitle: step.stepTitle,
    conceptTags: step.requiredConcepts,
    stepType: step.stepType,
    domain: problem.domain,
    subdomain: problem.subdomain,
    trigger: 'step_failed',
    hintLevelReached,
    attemptCount
  }

  createCardIfNotExists(input)
}

/**
 * Trigger: User answered micro-task incorrectly
 * Creates a card after 2+ incorrect attempts
 */
export function onTaskIncorrect(
  problem: ProblemContext,
  step: StepContext,
  taskLevel: number,
  attemptCount: number
): void {
  // Only create card after 2+ incorrect attempts
  if (attemptCount < 2) return

  const input: CreateCardInput = {
    problemId: problem.problemId,
    problemTitle: problem.problemTitle,
    stepId: step.stepId,
    stepTitle: step.stepTitle,
    conceptTags: step.requiredConcepts,
    stepType: step.stepType,
    domain: problem.domain,
    subdomain: problem.subdomain,
    trigger: 'task_incorrect',
    hintLevelReached: taskLevel,
    attemptCount
  }

  createCardIfNotExists(input)
}

/**
 * Trigger: User took too long (timeout)
 * Creates a card when step duration exceeds threshold
 */
export function onStepTimeout(
  problem: ProblemContext,
  step: StepContext,
  durationMs: number,
  thresholdMs: number = 5 * 60 * 1000 // 5 minutes default
): void {
  if (durationMs < thresholdMs) return

  const input: CreateCardInput = {
    problemId: problem.problemId,
    problemTitle: problem.problemTitle,
    stepId: step.stepId,
    stepTitle: step.stepTitle,
    conceptTags: step.requiredConcepts,
    stepType: step.stepType,
    domain: problem.domain,
    subdomain: problem.subdomain,
    trigger: 'timeout',
    hintLevelReached: 0
  }

  createCardIfNotExists(input)
}

/**
 * Trigger: User required multiple attempts
 * Creates a card when user needed 3+ attempts to complete a step
 */
export function onMultipleAttempts(
  problem: ProblemContext,
  step: StepContext,
  attemptCount: number,
  hintLevelReached: number = 0
): void {
  if (attemptCount < 3) return

  const input: CreateCardInput = {
    problemId: problem.problemId,
    problemTitle: problem.problemTitle,
    stepId: step.stepId,
    stepTitle: step.stepTitle,
    conceptTags: step.requiredConcepts,
    stepType: step.stepType,
    domain: problem.domain,
    subdomain: problem.subdomain,
    trigger: 'multiple_attempts',
    hintLevelReached,
    attemptCount
  }

  createCardIfNotExists(input)
}

// ============================================
// React Hook for Easy Integration
// ============================================

/**
 * Creates trigger functions bound to a specific problem context
 */
export function createMistakeTriggers(problem: ProblemContext) {
  return {
    onHintRequested: (step: StepContext, hintLevel: number) =>
      onHintRequested(problem, step, hintLevel),

    onStepFailed: (step: StepContext, attemptCount: number, hintLevelReached?: number) =>
      onStepFailed(problem, step, attemptCount, hintLevelReached),

    onTaskIncorrect: (step: StepContext, taskLevel: number, attemptCount: number) =>
      onTaskIncorrect(problem, step, taskLevel, attemptCount),

    onStepTimeout: (step: StepContext, durationMs: number, thresholdMs?: number) =>
      onStepTimeout(problem, step, durationMs, thresholdMs),

    onMultipleAttempts: (step: StepContext, attemptCount: number, hintLevelReached?: number) =>
      onMultipleAttempts(problem, step, attemptCount, hintLevelReached)
  }
}

/**
 * Extract step context from scaffold step data
 */
export function extractStepContext(
  step: {
    id: number
    title: string
    stepType?: StepType
    requiredConcepts?: string[]
  }
): StepContext {
  return {
    stepId: step.id,
    stepTitle: step.title,
    stepType: step.stepType || 'physics_concept',
    requiredConcepts: step.requiredConcepts || []
  }
}
