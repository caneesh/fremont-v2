/**
 * POST /api/warmup/submit
 *
 * Submit an answer for a warm-up drill item.
 */

import { NextResponse } from 'next/server'
import { warmUpService } from '@/lib/warmUp/warm-up-service'

interface SubmitRequest {
  sessionId: string
  blockId: string
  itemId: string
  userAnswer: string
  correctAnswer: string
  timeSpentSeconds: number
  userId?: string
}

export async function POST(request: Request) {
  try {
    const body: SubmitRequest = await request.json()
    const {
      sessionId,
      blockId,
      itemId,
      userAnswer,
      correctAnswer,
      timeSpentSeconds,
      userId = 'anonymous',
    } = body

    if (!sessionId || !blockId || !itemId) {
      return NextResponse.json(
        { success: false, error: 'sessionId, blockId, and itemId are required' },
        { status: 400 }
      )
    }

    const result = await warmUpService.submitItem(
      sessionId,
      blockId,
      itemId,
      userAnswer,
      correctAnswer,
      timeSpentSeconds,
      userId
    )

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error submitting warm-up item:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit warm-up item',
      },
      { status: 500 }
    )
  }
}
