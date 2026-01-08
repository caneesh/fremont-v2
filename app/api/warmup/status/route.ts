/**
 * GET /api/warmup/status
 *
 * Get today's warm-up status for the current user.
 */

import { NextResponse } from 'next/server'
import { warmUpService } from '@/lib/warmUp/warm-up-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') || 'anonymous'

    const status = await warmUpService.getStatus(userId)

    return NextResponse.json({
      success: true,
      ...status,
    })
  } catch (error) {
    console.error('Error getting warm-up status:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get warm-up status',
      },
      { status: 500 }
    )
  }
}
