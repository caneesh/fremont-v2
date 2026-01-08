/**
 * POST /api/pivot/init
 *
 * Initialize pivot tracking for a scaffold session.
 */

import { NextResponse } from 'next/server'
import { pivotService } from '@/lib/pivot'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, userId, stepCount } = body

    if (!sessionId || !userId || !stepCount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: sessionId, userId, stepCount',
        },
        { status: 400 }
      )
    }

    const state = await pivotService.initializeSession(sessionId, userId, stepCount)

    return NextResponse.json({
      success: true,
      state,
    })
  } catch (error) {
    console.error('Error initializing pivot session:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize pivot session',
      },
      { status: 500 }
    )
  }
}
