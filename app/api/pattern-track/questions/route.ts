import { NextRequest, NextResponse } from 'next/server'
import { getRepositories } from '@/lib/patternTrack'
import type { QuestionFilter } from '@/lib/patternTrack'

/**
 * GET /api/pattern-track/questions
 * Get questions with optional filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse filter parameters
    const filter: QuestionFilter = {}

    const patternIds = searchParams.get('pattern_ids')
    if (patternIds) {
      filter.pattern_ids = patternIds.split(',')
    }

    const categories = searchParams.get('categories')
    if (categories) {
      filter.categories = categories.split(',')
    }

    const diffMin = searchParams.get('difficulty_min')
    if (diffMin) {
      filter.difficulty_min = parseInt(diffMin, 10)
    }

    const diffMax = searchParams.get('difficulty_max')
    if (diffMax) {
      filter.difficulty_max = parseInt(diffMax, 10)
    }

    const tags = searchParams.get('tags')
    if (tags) {
      filter.tags = tags.split(',')
    }

    const excludeIds = searchParams.get('exclude_ids')
    if (excludeIds) {
      filter.exclude_ids = excludeIds.split(',')
    }

    // Parse pagination
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('page_size') || '20', 10)

    const repos = getRepositories()
    const result = await repos.questions.getFiltered(filter, { page, page_size: pageSize })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}
