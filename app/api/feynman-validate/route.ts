import { NextRequest, NextResponse } from 'next/server'
import { validateFeynmanExplanation } from '@/lib/feynmanValidator'
import type { FeynmanValidateRequest, FeynmanValidateResponse } from '@/types/feynman'

export async function POST(request: NextRequest) {
  try {
    const body: FeynmanValidateRequest = await request.json()
    const { explanation, topic, context, problemStatement } = body

    if (!explanation || !topic) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Explanation and topic are required' 
        } as FeynmanValidateResponse,
        { status: 400 }
      )
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Anthropic API key not configured' 
        } as FeynmanValidateResponse,
        { status: 500 }
      )
    }

    // Validate the explanation
    const result = await validateFeynmanExplanation(
      explanation,
      topic,
      context,
      problemStatement
    )

    return NextResponse.json({
      success: true,
      result
    } as FeynmanValidateResponse)

  } catch (error) {
    console.error('Error validating Feynman explanation:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } as FeynmanValidateResponse,
      { status: 500 }
    )
  }
}
