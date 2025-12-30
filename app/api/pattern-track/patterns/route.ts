import { NextRequest, NextResponse } from 'next/server'
import { getRepositories } from '@/lib/patternTrack'

/**
 * GET /api/pattern-track/patterns
 * Get all patterns or filter by category
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    const repos = getRepositories()

    let patterns
    if (search) {
      patterns = await repos.patterns.search(search)
    } else if (category) {
      patterns = await repos.patterns.getByCategory(category)
    } else {
      patterns = await repos.patterns.getAll()
    }

    return NextResponse.json({
      patterns,
      total: patterns.length,
    })
  } catch (error) {
    console.error('Error fetching patterns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch patterns' },
      { status: 500 }
    )
  }
}
