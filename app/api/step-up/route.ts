import { NextRequest, NextResponse } from 'next/server'
import { generateStepUpProblem } from '@/lib/stepUpGenerator'
import type { StepUpRequest } from '@/types/stepUp'

export async function POST(request: NextRequest) {
  try {
    const body: StepUpRequest = await request.json()
    const { previousProblem, userPerformance, topicTags } = body

    if (!previousProblem || !userPerformance || !topicTags || topicTags.length === 0) {
      return NextResponse.json(
        { error: 'previousProblem, userPerformance, and topicTags are required' },
        { status: 400 }
      )
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }

    // Generate next problem
    const nextProblem = await generateStepUpProblem(body)

    return NextResponse.json(nextProblem)
  } catch (error) {
    console.error('Error generating step-up problem:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate step-up problem',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
