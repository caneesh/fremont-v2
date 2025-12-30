import { NextRequest, NextResponse } from 'next/server'
import { getRepositories } from '@/lib/patternTrack'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/pattern-track/questions/[id]
 * Get a specific question with its patterns
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const repos = getRepositories()
    const question = await repos.questions.getByIdWithPatterns(id)

    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(question)
  } catch (error) {
    console.error('Error fetching question:', error)
    return NextResponse.json(
      { error: 'Failed to fetch question' },
      { status: 500 }
    )
  }
}
