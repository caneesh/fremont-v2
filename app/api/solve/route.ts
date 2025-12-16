import { NextRequest, NextResponse } from 'next/server'
import { solvePhysicsProblem, scaffoldSolution } from '@/lib/anthropic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { problem } = body

    if (!problem || typeof problem !== 'string') {
      return NextResponse.json(
        { error: 'Problem text is required' },
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

    // TWO-PASS ARCHITECTURE

    // Pass 1: Solve the problem completely (hidden from user)
    console.log('Pass 1: Solving problem...')
    const solverResponse = await solvePhysicsProblem(problem)

    // Pass 2: Generate the scaffold based on the solution
    console.log('Pass 2: Generating scaffold...')
    const scaffoldData = await scaffoldSolution(problem, solverResponse)

    return NextResponse.json(scaffoldData)
  } catch (error) {
    console.error('Error processing problem:', error)
    return NextResponse.json(
      {
        error: 'Failed to process problem',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
