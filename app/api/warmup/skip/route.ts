/**
 * POST /api/warmup/skip
 *
 * Skip today's warm-up session (once per day limit).
 */

import { NextResponse } from 'next/server'
import { warmUpService } from '@/lib/warmUp/warm-up-service'

interface SkipRequest {
  sessionId: string
  reason?: string
  userId?: string
}

export async function POST(request: Request) {
  try {
    const body: SkipRequest = await request.json()
    const { sessionId, reason, userId = 'anonymous' } = body

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const result = await warmUpService.skipWarmUp(sessionId, reason, userId)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error skipping warm-up:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to skip warm-up',
      },
      { status: 500 }
    )
  }
}
