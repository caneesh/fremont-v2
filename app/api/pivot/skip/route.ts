/**
 * POST /api/pivot/skip
 *
 * Skip the current pivot question.
 */

import { NextResponse } from 'next/server'
import { pivotService } from '@/lib/pivot'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { sessionId, stepIndex } = body

    if (!sessionId || stepIndex === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: sessionId, stepIndex',
        },
        { status: 400 }
      )
    }

    const result = await pivotService.skipPivot(sessionId, stepIndex)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error skipping pivot:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to skip pivot',
      },
      { status: 500 }
    )
  }
}
