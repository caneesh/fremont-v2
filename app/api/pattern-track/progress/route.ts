import { NextRequest, NextResponse } from 'next/server'
import { getRepositories } from '@/lib/patternTrack'

/**
 * GET /api/pattern-track/progress
 * Get user's overall progress and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const repos = getRepositories()

    // Get overall track progress
    const trackProgress = await repos.progress.getTrackProgress(userId)

    // Get pattern-level progress
    const patternProgress = await repos.progress.getAllPatternProgress(userId)

    // Get weak and strong patterns
    const weakPatterns = await repos.progress.getWeakPatterns(userId, 5)
    const strongPatterns = await repos.progress.getStrongPatterns(userId, 5)

    // Get patterns needing review
    const needsReview = await repos.progress.getPatternsNeedingReview(userId)

    // Get lesson progress
    const lessonProgress = await repos.progress.getAllLessonProgress(userId)

    return NextResponse.json({
      trackProgress,
      patternProgress,
      weakPatterns,
      strongPatterns,
      needsReview,
      lessonProgress,
    })
  } catch (error) {
    console.error('Error fetching progress:', error)
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pattern-track/progress
 * Recalculate user's track progress
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { user_id } = body

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    const repos = getRepositories()
    const trackProgress = await repos.progress.recalculateTrackProgress(user_id)

    return NextResponse.json({
      success: true,
      trackProgress,
    })
  } catch (error) {
    console.error('Error recalculating progress:', error)
    return NextResponse.json(
      { error: 'Failed to recalculate progress' },
      { status: 500 }
    )
  }
}
