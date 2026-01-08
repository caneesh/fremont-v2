/**
 * POST /api/pivot/show
 *
 * Show a pivot question for a step.
 */

import { NextResponse } from 'next/server'
import { pivotService } from '@/lib/pivot'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, stepIndex, timeSpentSeconds, patternId } = body

    if (!sessionId || stepIndex === undefined || timeSpentSeconds === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: sessionId, stepIndex, timeSpentSeconds',
        },
        { status: 400 }
      )
    }

    const result = await pivotService.showPivot(
      sessionId,
      stepIndex,
      timeSpentSeconds,
      patternId
    )

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error showing pivot:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to show pivot',
      },
      { status: 500 }
    )
  }
}
