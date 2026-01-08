/**
 * POST /api/pivot/check
 *
 * Check if a pivot should be triggered for the current step.
 */

import { NextResponse } from 'next/server'
import { pivotService } from '@/lib/pivot'
import type { PivotTrigger } from '@/types/pivot'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, trigger, stepDifficulty } = body as {
      sessionId: string
      trigger: PivotTrigger
      stepDifficulty?: 'easy' | 'medium' | 'hard'
    }

    if (!sessionId || !trigger) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: sessionId, trigger',
        },
        { status: 400 }
      )
    }

    const result = await pivotService.checkTrigger(
      sessionId,
      trigger,
      stepDifficulty || 'medium'
    )

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error checking pivot trigger:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check pivot trigger',
      },
      { status: 500 }
    )
  }
}
