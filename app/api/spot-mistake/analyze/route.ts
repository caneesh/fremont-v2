import { NextRequest, NextResponse } from 'next/server'
import { validateAuthHeader, unauthorizedResponse } from '@/lib/auth/apiAuth'
import type { AnalyzeMistakeRequest, AnalyzeMistakeResponse } from '@/types/spotTheMistake'

// In-memory storage for mistake locations (in production, use a database)
const mistakeStorage = new Map<string, {
  stepIndex: number
  mistakeType: string
  correctApproach: string
}>()

// Function to store mistake location (called from generate endpoint)
export function storeMistakeLocation(solutionId: string, location: {
  stepIndex: number
  mistakeType: string
  correctApproach: string
}) {
  mistakeStorage.set(solutionId, location)
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authContext = validateAuthHeader(request)
    if (!authContext) {
      return unauthorizedResponse()
    }

    const body: AnalyzeMistakeRequest = await request.json()
    const { solutionId, identifiedStepIndex, explanation } = body

    if (!solutionId || identifiedStepIndex === undefined || !explanation) {
      return NextResponse.json(
        { error: 'Solution ID, step index, and explanation are required' },
        { status: 400 }
      )
    }

    // Retrieve the actual mistake location
    const actualMistake = mistakeStorage.get(solutionId)

    if (!actualMistake) {
      return NextResponse.json(
        { error: 'Solution not found or expired' },
        { status: 404 }
      )
    }

    const isCorrect = identifiedStepIndex === actualMistake.stepIndex

    // Generate feedback based on correctness
    let feedback: string
    let encouragement: string

    if (isCorrect) {
      feedback = `Excellent! You correctly identified the mistake in Step ${actualMistake.stepIndex + 1}. The error was a ${actualMistake.mistakeType.replace(/_/g, ' ')}.`
      encouragement = "Great job! Your ability to spot conceptual errors shows strong understanding. This skill is crucial for IIT-JEE success."
    } else if (identifiedStepIndex === null) {
      feedback = `The solution actually contains a mistake in Step ${actualMistake.stepIndex + 1}. The error is a ${actualMistake.mistakeType.replace(/_/g, ' ')}.`
      encouragement = "Don't worry! Spotting subtle errors takes practice. Review the solution again with this hint."
    } else {
      feedback = `Not quite. You identified Step ${identifiedStepIndex + 1}, but the actual mistake is in Step ${actualMistake.stepIndex + 1}. The error is a ${actualMistake.mistakeType.replace(/_/g, ' ')}.`
      encouragement = "Good effort! You're thinking critically about the solution. Try to focus on conceptual consistency rather than calculation details."
    }

    const response: AnalyzeMistakeResponse = {
      isCorrect,
      feedback,
      actualMistakeLocation: {
        stepIndex: actualMistake.stepIndex,
        mistakeType: actualMistake.mistakeType as any,
      },
      correctApproach: actualMistake.correctApproach,
      encouragement,
    }

    // Clean up old entries (simple cleanup - in production use TTL)
    if (mistakeStorage.size > 1000) {
      const entries = Array.from(mistakeStorage.entries())
      entries.slice(0, 500).forEach(([key]) => mistakeStorage.delete(key))
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error analyzing mistake identification:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze identification',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Export for use in generate route
export { mistakeStorage }
