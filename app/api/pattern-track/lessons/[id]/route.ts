import { NextRequest, NextResponse } from 'next/server'
import { getRepositories } from '@/lib/patternTrack'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/pattern-track/lessons/[id]
 * Get a specific lesson with its patterns
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const repos = getRepositories()
    const lesson = await repos.lessons.getByIdWithPatterns(id)

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      )
    }

    // Also get prerequisites and next lessons
    const prerequisites = await repos.lessons.getPrerequisites(id)
    const nextLessons = await repos.lessons.getNextLessons(id)

    return NextResponse.json({
      lesson,
      prerequisites,
      nextLessons,
    })
  } catch (error) {
    console.error('Error fetching lesson:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lesson' },
      { status: 500 }
    )
  }
}
