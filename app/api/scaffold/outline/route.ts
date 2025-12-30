/**
 * API Route: /api/scaffold/outline
 *
 * Phase A: Generate Outline Scaffold (fast, ~10-20s)
 * Returns step list with minimal info for immediate UI rendering
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateOutlineScaffold } from '@/lib/phasedScaffold'
import type { OutlineRequest, OutlineScaffoldResponse } from '@/types/phasedScaffold'

export interface OutlineAPIResponse {
  success: boolean
  data?: OutlineScaffoldResponse
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: OutlineRequest = await request.json()
    const { problem, diagram_image, options = {} } = body

    if (!problem || problem.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Problem text is required',
        } as OutlineAPIResponse,
        { status: 400 }
      )
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Anthropic API key not configured',
        } as OutlineAPIResponse,
        { status: 500 }
      )
    }

    // Generate outline scaffold
    const outline = await generateOutlineScaffold(problem, {
      density: options.density,
      include_fbd_hints: options.include_fbd_hints,
      diagram_image,
    })

    return NextResponse.json({
      success: true,
      data: outline,
    } as OutlineAPIResponse)
  } catch (error) {
    console.error('Error generating outline scaffold:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as OutlineAPIResponse,
      { status: 500 }
    )
  }
}
