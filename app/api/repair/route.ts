import { NextRequest, NextResponse } from 'next/server'
import { MOCK_CURRICULA } from '@/lib/mockData/repairCurricula'

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint only accepts POST requests. Use POST with conceptId and conceptName.' },
    { status: 405 }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conceptId, conceptName } = body

    if (!conceptId || !conceptName) {
      return NextResponse.json(
        { error: 'conceptId and conceptName are required' },
        { status: 400 }
      )
    }

    // Look up curriculum in mock data
    const curriculum = MOCK_CURRICULA[conceptId]

    if (!curriculum) {
      // Return a generic "not available" curriculum if no mock data exists
      return NextResponse.json(
        {
          conceptClarification: `Repair curriculum for ${conceptName} is not yet available. This concept is still being developed. In the meantime, try reviewing your physics textbook or asking your instructor for help with ${conceptName}.`,
          diagnosticQuestion: `Practice problems for ${conceptName} will be available soon.`,
          diagnosticAnswer: 'Coming soon!',
          practiceProblems: [
            {
              problemText: `Practice problem 1 for ${conceptName} - Coming soon!`,
              difficulty: 'easy' as const,
              hints: ['This feature is under development'],
              solution: 'Practice problems will be added in a future update.',
            },
            {
              problemText: `Practice problem 2 for ${conceptName} - Coming soon!`,
              difficulty: 'medium' as const,
              hints: ['This feature is under development'],
              solution: 'Practice problems will be added in a future update.',
            },
          ],
        },
        { status: 200 }
      )
    }

    return NextResponse.json(curriculum, { status: 200 })
  } catch (error) {
    console.error('Error in repair endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to load repair curriculum',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
