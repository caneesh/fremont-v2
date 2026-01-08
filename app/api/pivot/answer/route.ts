/**
 * POST /api/pivot/answer
 *
 * Submit an answer for a pivot question.
 */

import { NextResponse } from 'next/server'
import { pivotService } from '@/lib/pivot'
import type { PivotAnswerSubmission } from '@/types/pivot'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, stepIndex, answer } = body as {
      sessionId: string
      stepIndex: number
      answer: PivotAnswerSubmission
    }

    if (!sessionId || stepIndex === undefined || !answer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: sessionId, stepIndex, answer',
        },
        { status: 400 }
      )
    }

    const result = await pivotService.answerPivot(sessionId, stepIndex, answer)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error answering pivot:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to answer pivot',
      },
      { status: 500 }
    )
  }
}
