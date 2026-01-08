/**
 * POST /api/warmup/complete-block
 *
 * Complete the current warm-up block and advance to the next.
 */

import { NextResponse } from 'next/server'
import { warmUpService } from '@/lib/warmUp/warm-up-service'

interface CompleteBlockRequest {
  sessionId: string
  blockId: string
  userId?: string
}

export async function POST(request: Request) {
  try {
    const body: CompleteBlockRequest = await request.json()
    const { sessionId, blockId, userId = 'anonymous' } = body

    if (!sessionId || !blockId) {
      return NextResponse.json(
        { success: false, error: 'sessionId and blockId are required' },
        { status: 400 }
      )
    }

    const result = await warmUpService.completeBlock(sessionId, blockId, userId)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error completing warm-up block:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to complete warm-up block',
      },
      { status: 500 }
    )
  }
}
