import { NextRequest, NextResponse } from 'next/server'
import { getRepositories } from '@/lib/patternTrack'

/**
 * GET /api/pattern-track/lessons
 * Get all lessons, optionally with user progress
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    const repos = getRepositories()

    let lessons
    if (userId) {
      lessons = await repos.lessons.getAllWithProgress(userId)
    } else {
      lessons = await repos.lessons.getAll()
    }

    return NextResponse.json({
      lessons,
      total: lessons.length,
    })
  } catch (error) {
    console.error('Error fetching lessons:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    )
  }
}
