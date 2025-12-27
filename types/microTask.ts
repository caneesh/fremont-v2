/**
 * Micro-Task Types for Active Solver Interface
 *
 * Instead of passive "click-to-reveal" hints, users must complete
 * micro-tasks to earn each insight. This forces active engagement
 * and improves retention.
 */

import type { Concept, SanityCheck } from './scaffold'

// Supported micro-task types
export type MicroTaskType = 'MULTIPLE_CHOICE' | 'FILL_BLANK'

// Level titles matching the 5-level hint ladder
export type LevelTitle = 'Concept' | 'Visual' | 'Strategy' | 'Equation' | 'Solution'

// Base interface for all micro-tasks
interface BaseMicroTask {
  level: 1 | 2 | 3 | 4 | 5
  levelTitle: LevelTitle
  question: string
  explanation: string  // The "insight" earned after correct answer
}

/**
 * Multiple Choice Task
 * User selects one option from a list
 */
export interface MultipleChoiceTask extends BaseMicroTask {
  type: 'MULTIPLE_CHOICE'
  options: string[]
  correctIndex: number
  feedbackPerOption?: string[]  // Optional feedback for each wrong choice
}

/**
 * Fill-in-the-Blank Task
 * User completes a sentence by selecting/typing the correct term
 */
export interface FillBlankTask extends BaseMicroTask {
  type: 'FILL_BLANK'
  sentence: string  // Contains ____ placeholder for the blank
  correctTerm: string
  distractors: string[]  // Wrong options shown alongside correct
  caseSensitive?: boolean
}

// Union type for all micro-tasks
export type MicroTask = MultipleChoiceTask | FillBlankTask

/**
 * Step with micro-tasks instead of hints
 * Each step has 5 tasks (one per level)
 */
export interface MicroTaskStep {
  id: number
  title: string
  tasks: MicroTask[]  // 5 tasks, one per level (levels 1-3 pre-generated, 4-5 on-demand)
  requiredConcepts: string[]
  question?: string  // Optional additional Socratic question
}

/**
 * Scaffold data with micro-tasks
 */
export interface MicroTaskScaffoldData {
  problem: string
  domain: string
  subdomain: string
  concepts: Concept[]
  steps: MicroTaskStep[]
  sanityCheck: SanityCheck
}

/**
 * Track task attempt state
 */
export interface TaskAttempt {
  level: number
  isCompleted: boolean
  attempts: number  // Number of wrong attempts
  selectedAnswer?: string | number  // What user selected
  completedAt?: string  // ISO timestamp
}

/**
 * Progress tracking for a single step's micro-tasks
 */
export interface StepTaskProgress {
  stepId: number
  currentLevel: number  // Which level user is on (1-5)
  taskAttempts: TaskAttempt[]
  collectedInsights: string[]  // Explanations earned
  isCompleted: boolean
}

/**
 * Full micro-task progress for a problem
 */
export interface MicroTaskProblemProgress {
  problemId: string
  stepProgress: StepTaskProgress[]
  currentStep: number
  startedAt: string
  lastUpdatedAt: string
}

// Type guard helpers
export function isMultipleChoiceTask(task: MicroTask): task is MultipleChoiceTask {
  return task.type === 'MULTIPLE_CHOICE'
}

export function isFillBlankTask(task: MicroTask): task is FillBlankTask {
  return task.type === 'FILL_BLANK'
}

/**
 * Check if a step has micro-tasks (vs traditional hints)
 */
export function isMicroTaskStep(step: unknown): step is MicroTaskStep {
  return (
    typeof step === 'object' &&
    step !== null &&
    'tasks' in step &&
    Array.isArray((step as MicroTaskStep).tasks)
  )
}

/**
 * Check if scaffold data uses micro-tasks
 */
export function isMicroTaskScaffold(data: unknown): data is MicroTaskScaffoldData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'steps' in data &&
    Array.isArray((data as MicroTaskScaffoldData).steps) &&
    (data as MicroTaskScaffoldData).steps.length > 0 &&
    isMicroTaskStep((data as MicroTaskScaffoldData).steps[0])
  )
}
