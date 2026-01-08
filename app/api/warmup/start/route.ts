/**
 * POST /api/warmup/start
 *
 * Start an assigned warm-up session.
 */

import { NextResponse } from 'next/server'
import { warmUpService } from '@/lib/warmUp/warm-up-service'

interface StartRequest {
  sessionId: string
  userId?: string
}

export async function POST(request: Request) {
  try {
    const body: StartRequest = await request.json()
    const { sessionId, userId = 'anonymous' } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const result = await warmUpService.startWarmUp(sessionId, userId)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error starting warm-up:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start warm-up',
      },
      { status: 500 }
    )
  }
}
