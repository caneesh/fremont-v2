/**
 * API Route: /api/simulation/params
 *
 * Returns precomputed simulation parameters for a question.
 * Falls back to live extraction if precomputed params not available.
 */

import { NextRequest, NextResponse } from 'next/server'
import { precomputeService } from '@/lib/precompute'
import { detectSimulationType, extractParameters } from '@/lib/simulationService'
import { prisma } from '@/lib/db'
import type { SimulationType } from '@/types/simulation'

export interface SimulationParamsAPIResponse {
  success: boolean
  data?: {
    type: SimulationType
    params: Record<string, number | undefined>
    isVerified?: boolean
  }
  error?: string
  source?: 'precomputed' | 'live'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('questionId')

    if (!questionId) {
      return NextResponse.json(
        {
          success: false,
          error: 'questionId is required',
        } as SimulationParamsAPIResponse,
        { status: 400 }
      )
    }

    // 1. Check precomputed content first
    const precomputed = await precomputeService.getSimulationParams(questionId)

    if (precomputed.found && precomputed.data) {
      return NextResponse.json({
        success: true,
        data: {
          type: precomputed.data.type,
          params: precomputed.data.params,
        },
        source: 'precomputed',
      } as SimulationParamsAPIResponse)
    }

    // 2. Fall back to live extraction
    // Get the question to extract problem text
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        payload: true,
      },
    })

    if (!question) {
      return NextResponse.json(
        {
          success: false,
          error: 'Question not found',
        } as SimulationParamsAPIResponse,
        { status: 404 }
      )
    }

    const payload = question.payload as { prompt?: { text?: string }; tags?: { subdomain?: string } }
    const problemText = payload?.prompt?.text

    if (!problemText) {
      return NextResponse.json(
        {
          success: false,
          error: 'Question has no problem text',
        } as SimulationParamsAPIResponse,
        { status: 400 }
      )
    }

    // Extract using regex
    const simInput = {
      problem: problemText,
      subdomain: payload?.tags?.subdomain,
    }

    const simType = detectSimulationType(simInput as never)
    const extracted = extractParameters(simInput as never)

    return NextResponse.json({
      success: true,
      data: {
        type: simType,
        params: extracted.params,
      },
      source: 'live',
    } as SimulationParamsAPIResponse)
  } catch (error) {
    console.error('Error getting simulation params:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as SimulationParamsAPIResponse,
      { status: 500 }
    )
  }
}
