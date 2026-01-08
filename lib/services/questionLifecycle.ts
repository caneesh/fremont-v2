/**
 * Question Lifecycle Service
 *
 * Handles question state transitions with side effects.
 * Triggers precompute jobs when questions are approved.
 */

import { prisma } from '@/lib/db'
import { QuestionLifecycleState } from '@prisma/client'
import { queueAllJobsForQuestion } from '@/lib/precompute'

export interface StateTransitionResult {
  success: boolean
  questionId: string
  previousState: QuestionLifecycleState
  newState: QuestionLifecycleState
  precomputeJobsQueued?: string[]
  error?: string
}

/**
 * Valid state transitions per ARCHITECTURE.md:
 * draft → review → approved → retired
 * Questions CANNOT skip states
 */
const VALID_TRANSITIONS: Record<QuestionLifecycleState, QuestionLifecycleState[]> = {
  draft: ['review'],
  review: ['approved', 'draft'], // Can go back to draft for revisions
  approved: ['retired'],
  retired: [], // Terminal state
}

/**
 * Check if a state transition is valid
 */
export function isValidTransition(
  from: QuestionLifecycleState,
  to: QuestionLifecycleState
): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

/**
 * Transition a question to a new lifecycle state
 *
 * Automatically triggers side effects:
 * - On approved: Queue precompute jobs
 */
export async function transitionQuestionState(
  questionId: string,
  targetState: QuestionLifecycleState,
  options: { force?: boolean } = {}
): Promise<StateTransitionResult> {
  try {
    // Get current question state
    const question = await prisma.question.findUnique({
      where: { questionId },
      select: { lifecycleState: true },
    })

    if (!question) {
      return {
        success: false,
        questionId,
        previousState: 'draft' as QuestionLifecycleState,
        newState: targetState,
        error: 'Question not found',
      }
    }

    const previousState = question.lifecycleState

    // Validate transition (unless forced)
    if (!options.force && !isValidTransition(previousState, targetState)) {
      return {
        success: false,
        questionId,
        previousState,
        newState: targetState,
        error: `Invalid transition: ${previousState} → ${targetState}`,
      }
    }

    // Perform the state update
    await prisma.question.update({
      where: { questionId },
      data: { lifecycleState: targetState },
    })

    const result: StateTransitionResult = {
      success: true,
      questionId,
      previousState,
      newState: targetState,
    }

    // Trigger side effects based on the new state
    if (targetState === 'approved') {
      const precomputeResult = await queueAllJobsForQuestion(questionId, 10) // High priority
      result.precomputeJobsQueued = precomputeResult.queued
    }

    return result
  } catch (error) {
    return {
      success: false,
      questionId,
      previousState: 'draft' as QuestionLifecycleState,
      newState: targetState,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Convenience function to approve a question
 * (transition from review → approved)
 */
export async function approveQuestion(
  questionId: string
): Promise<StateTransitionResult> {
  return transitionQuestionState(questionId, 'approved')
}

/**
 * Convenience function to submit a question for review
 * (transition from draft → review)
 */
export async function submitForReview(
  questionId: string
): Promise<StateTransitionResult> {
  return transitionQuestionState(questionId, 'review')
}

/**
 * Convenience function to retire a question
 * (transition from approved → retired)
 */
export async function retireQuestion(
  questionId: string
): Promise<StateTransitionResult> {
  return transitionQuestionState(questionId, 'retired')
}

/**
 * Batch approve multiple questions
 */
export async function batchApproveQuestions(
  questionIds: string[]
): Promise<StateTransitionResult[]> {
  const results: StateTransitionResult[] = []

  for (const questionId of questionIds) {
    const result = await approveQuestion(questionId)
    results.push(result)
  }

  return results
}
