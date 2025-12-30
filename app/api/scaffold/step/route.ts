/**
 * API Route: /api/scaffold/step
 *
 * Phase B: Generate Step Expansion (on-demand)
 * Deep content generation for a single step when user clicks on it
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateStepExpansion } from '@/lib/phasedScaffold'
import type { StepExpansionRequest, StepExpansionResponse } from '@/types/phasedScaffold'

export interface StepExpansionAPIResponse {
  success: boolean
  data?: StepExpansionResponse
  error?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: StepExpansionRequest = await request.json()
    const { scaffold_id, step_id, outline_steps, problem } = body

    // Validate required fields
    if (!scaffold_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'scaffold_id is required',
        } as StepExpansionAPIResponse,
        { status: 400 }
      )
    }

    if (!step_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'step_id is required',
        } as StepExpansionAPIResponse,
        { status: 400 }
      )
    }

    if (!outline_steps || outline_steps.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'outline_steps are required for context',
        } as StepExpansionAPIResponse,
        { status: 400 }
      )
    }

    if (!problem || problem.trim().length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'problem text is required',
        } as StepExpansionAPIResponse,
        { status: 400 }
      )
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'Anthropic API key not configured',
        } as StepExpansionAPIResponse,
        { status: 500 }
      )
    }

    // Generate step expansion
    const expansion = await generateStepExpansion(
      problem,
      scaffold_id,
      outline_steps,
      step_id
    )

    return NextResponse.json({
      success: true,
      data: expansion,
    } as StepExpansionAPIResponse)
  } catch (error) {
    console.error('Error generating step expansion:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as StepExpansionAPIResponse,
      { status: 500 }
    )
  }
}
