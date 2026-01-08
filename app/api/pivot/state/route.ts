/**
 * GET /api/pivot/state
 *
 * Get current pivot state for a session.
 */

import { NextResponse } from 'next/server'
import { pivotService } from '@/lib/pivot'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const stepIndexStr = searchParams.get('stepIndex')

    if (!sessionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: sessionId',
        },
        { status: 400 }
      )
    }

    const stepIndex = stepIndexStr ? parseInt(stepIndexStr, 10) : undefined

    const result = await pivotService.getState(sessionId, stepIndex)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error getting pivot state:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get pivot state',
      },
      { status: 500 }
    )
  }
}
