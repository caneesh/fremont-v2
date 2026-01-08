/**
 * GET /api/warmup/drills/[blockId]
 *
 * Get drill items for a specific warm-up block.
 */

import { NextResponse } from 'next/server'
import { warmUpService } from '@/lib/warmUp/warm-up-service'

interface RouteContext {
  params: Promise<{ blockId: string }>
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  try {
    const { blockId } = await context.params

    if (!blockId) {
      return NextResponse.json(
        { success: false, error: 'blockId is required' },
        { status: 400 }
      )
    }

    const [block, drillItems] = await Promise.all([
      warmUpService.getBlock(blockId),
      warmUpService.getDrillItems(blockId),
    ])

    if (!block) {
      return NextResponse.json(
        { success: false, error: 'Block not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      block,
      drillItems,
    })
  } catch (error) {
    console.error('Error getting warm-up drills:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get warm-up drills',
      },
      { status: 500 }
    )
  }
}
