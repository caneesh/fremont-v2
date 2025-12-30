/**
 * API Route: /api/solve/final
 *
 * Phase C: Generate Final Solve (optional)
 * Compact final answer, only when explicitly requested by the student
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateFinalSolve } from '@/lib/phasedScaffold'
import type { FinalSolveRequest, FinalSolveResponse } from '@/types/phasedScaffold'

export interface FinalSolveAPIResponse {
  success: boolean
  data?: FinalSolveResponse
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: FinalSolveRequest = await request.json()
    const { scaffold_id, problem, steps_completed = [] } = body

    // Validate required fields
    if (!scaffold_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'scaffold_id is required',
        } as FinalSolveAPIResponse,
        { status: 400 }
      )
    }

    if (!problem || problem.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'problem text is required',
        } as FinalSolveAPIResponse,
        { status: 400 }
      )
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Anthropic API key not configured',
        } as FinalSolveAPIResponse,
        { status: 500 }
      )
    }

    // Generate final solve
    const finalSolve = await generateFinalSolve(
      problem,
      scaffold_id,
      steps_completed
    )

    return NextResponse.json({
      success: true,
      data: finalSolve,
    } as FinalSolveAPIResponse)
  } catch (error) {
    console.error('Error generating final solve:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as FinalSolveAPIResponse,
      { status: 500 }
    )
  }
}
