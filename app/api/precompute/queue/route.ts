/**
 * API Route: /api/precompute/queue
 *
 * Queue precompute jobs for a question.
 * Called when questions are approved or manually triggered.
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  queuePrecomputeJob,
  queueAllJobsForQuestion,
  retryFailedJobs,
} from '@/lib/precompute'
import type { PrecomputeJobType } from '@/lib/precompute'

interface QueueRequest {
  action: 'queue' | 'queue_all' | 'retry_failed'
  questionId?: string
  jobType?: PrecomputeJobType
  contentKey?: string
  priority?: number
}

export async function POST(request: NextRequest) {
  try {
    const body: QueueRequest = await request.json()
    const { action, questionId, jobType, contentKey, priority = 10 } = body

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required: queue, queue_all, or retry_failed' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'queue': {
        if (!jobType || !questionId) {
          return NextResponse.json(
            { error: 'jobType and questionId are required for queue action' },
            { status: 400 }
          )
        }

        const result = await queuePrecomputeJob(jobType, questionId, { priority, contentKey })
        return NextResponse.json({
          success: result.queued,
          ...result,
        })
      }

      case 'queue_all': {
        if (!questionId) {
          return NextResponse.json(
            { error: 'questionId is required for queue_all action' },
            { status: 400 }
          )
        }

        const result = await queueAllJobsForQuestion(questionId, priority)
        return NextResponse.json({
          success: result.errors.length === 0,
          ...result,
        })
      }

      case 'retry_failed': {
        const count = await retryFailedJobs(jobType)
        return NextResponse.json({
          success: true,
          retriedCount: count,
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error in precompute queue endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to process queue request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
