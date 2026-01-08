/**
 * POST /api/warmup/assign
 *
 * Assign warm-up blocks for today based on pattern decay scores.
 */

import { NextResponse } from 'next/server'
import { warmUpService } from '@/lib/warmUp/warm-up-service'
import type { PatternDecayScore } from '@/types/warmUp'

interface AssignRequest {
  userId?: string
  patternStates?: PatternDecayScore[]
  recentMistakeTypes?: string[]
}

export async function POST(request: Request) {
  try {
    const body: AssignRequest = await request.json()
    const {
      userId = 'anonymous',
      patternStates = [],
      recentMistakeTypes = [],
    } = body

    const result = await warmUpService.assignWarmUp(
      patternStates,
      recentMistakeTypes,
      userId
    )

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Error assigning warm-up:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign warm-up',
      },
      { status: 500 }
    )
  }
}
