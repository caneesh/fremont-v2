import { NextRequest, NextResponse } from 'next/server'
import { getRepositories } from '@/lib/patternTrack'

/**
 * GET /api/pattern-track/practice
 * Get random questions for a practice session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const mode = searchParams.get('mode') || 'mixed'
    const count = parseInt(searchParams.get('count') || '10', 10)
    const patternIds = searchParams.get('pattern_ids')?.split(',').filter(Boolean)
    const excludeIds = searchParams.get('exclude_ids')?.split(',').filter(Boolean)

    const repos = getRepositories()
    let questions

    if (mode === 'focused' && patternIds && patternIds.length > 0) {
      // Focused practice on specific patterns
      questions = await repos.questions.getRandomForPatterns(
        patternIds,
        count,
        excludeIds
      )
    } else {
      // Mixed practice
      questions = await repos.questions.getRandomMixed(count, {
        exclude_ids: excludeIds,
      })
    }

    // Get patterns for each question
    const allPatternIds = new Set<string>()
    for (const q of questions) {
      for (const ref of q.pattern_refs) {
        allPatternIds.add(ref.pattern_id)
      }
    }
    const patterns = await repos.patterns.getByIds(Array.from(allPatternIds))
    const patternMap = new Map(patterns.map(p => [p.id, p]))

    // Enrich questions with pattern details
    const enrichedQuestions = questions.map(q => ({
      ...q,
      patterns: q.pattern_refs.map(ref => patternMap.get(ref.pattern_id)).filter(Boolean),
    }))

    return NextResponse.json({
      questions: enrichedQuestions,
      total: enrichedQuestions.length,
      mode,
    })
  } catch (error) {
    console.error('Error fetching practice questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch practice questions' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/pattern-track/practice
 * Record practice attempt results
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      user_id,
      question_id,
      identified_pattern_ids,
      is_correct,
      time_taken_seconds,
      confidence,
      hints_used,
    } = body

    if (!user_id || !question_id) {
      return NextResponse.json(
        { error: 'user_id and question_id are required' },
        { status: 400 }
      )
    }

    const repos = getRepositories()

    // Get the question to know its patterns
    const question = await repos.questions.getById(question_id)
    if (!question) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      )
    }

    // Record progress for each pattern in the question
    const progressUpdates = []
    for (const ref of question.pattern_refs) {
      const identified = identified_pattern_ids?.includes(ref.pattern_id) || false
      const progress = await repos.progress.recordPatternAttempt(
        user_id,
        ref.pattern_id,
        question_id,
        identified,
        time_taken_seconds || 0,
        confidence,
        hints_used
      )
      progressUpdates.push(progress)
    }

    // Update track progress
    const trackProgress = await repos.progress.updateTrackProgress(user_id)

    return NextResponse.json({
      success: true,
      patternProgress: progressUpdates,
      trackProgress,
    })
  } catch (error) {
    console.error('Error recording practice attempt:', error)
    return NextResponse.json(
      { error: 'Failed to record practice attempt' },
      { status: 500 }
    )
  }
}
