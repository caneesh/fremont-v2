/**
 * API Route: /api/question/lifecycle
 *
 * Manage question lifecycle state transitions.
 * Triggers precompute jobs when questions are approved.
 */

import { NextRequest, NextResponse } from 'next/server'
import { QuestionLifecycleState } from '@prisma/client'
import {
  transitionQuestionState,
  approveQuestion,
  submitForReview,
  retireQuestion,
  batchApproveQuestions,
  isValidTransition,
} from '@/lib/services/questionLifecycle'

interface LifecycleRequest {
  action: 'transition' | 'approve' | 'submit_review' | 'retire' | 'batch_approve'
  questionId?: string
  questionIds?: string[]
  targetState?: QuestionLifecycleState
  force?: boolean
}

export async function POST(request: NextRequest) {
  try {
    const body: LifecycleRequest = await request.json()
    const { action, questionId, questionIds, targetState, force } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'transition': {
        if (!questionId || !targetState) {
          return NextResponse.json(
            { error: 'questionId and targetState are required for transition' },
            { status: 400 }
          )
        }

        const result = await transitionQuestionState(questionId, targetState, { force })
        return NextResponse.json(result, { status: result.success ? 200 : 400 })
      }

      case 'approve': {
        if (!questionId) {
          return NextResponse.json(
            { error: 'questionId is required for approve' },
            { status: 400 }
          )
        }

        const result = await approveQuestion(questionId)
        return NextResponse.json(result, { status: result.success ? 200 : 400 })
      }

      case 'submit_review': {
        if (!questionId) {
          return NextResponse.json(
            { error: 'questionId is required for submit_review' },
            { status: 400 }
          )
        }

        const result = await submitForReview(questionId)
        return NextResponse.json(result, { status: result.success ? 200 : 400 })
      }

      case 'retire': {
        if (!questionId) {
          return NextResponse.json(
            { error: 'questionId is required for retire' },
            { status: 400 }
          )
        }

        const result = await retireQuestion(questionId)
        return NextResponse.json(result, { status: result.success ? 200 : 400 })
      }

      case 'batch_approve': {
        if (!questionIds || questionIds.length === 0) {
          return NextResponse.json(
            { error: 'questionIds array is required for batch_approve' },
            { status: 400 }
          )
        }

        const results = await batchApproveQuestions(questionIds)
        const successCount = results.filter((r) => r.success).length
        return NextResponse.json({
          success: successCount === results.length,
          totalProcessed: results.length,
          successCount,
          failureCount: results.length - successCount,
          results,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in lifecycle endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to process lifecycle request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint to check valid transitions for a question
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const currentState = searchParams.get('currentState') as QuestionLifecycleState | null

  if (!currentState) {
    return NextResponse.json(
      { error: 'currentState query parameter is required' },
      { status: 400 }
    )
  }

  const validTransitions: QuestionLifecycleState[] = ['draft', 'review', 'approved', 'retired']
    .filter((state) => isValidTransition(currentState, state as QuestionLifecycleState)) as QuestionLifecycleState[]

  return NextResponse.json({
    currentState,
    validTransitions,
  })
}
