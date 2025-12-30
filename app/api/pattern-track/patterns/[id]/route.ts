import { NextRequest, NextResponse } from 'next/server'
import { getRepositories } from '@/lib/patternTrack'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/pattern-track/patterns/[id]
 * Get a specific pattern by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const repos = getRepositories()
    const pattern = await repos.patterns.getById(id)

    if (!pattern) {
      return NextResponse.json(
        { error: 'Pattern not found' },
        { status: 404 }
      )
    }

    // Also fetch related patterns
    const related = await repos.patterns.getRelated(id)

    return NextResponse.json({
      pattern,
      related,
    })
  } catch (error) {
    console.error('Error fetching pattern:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pattern' },
      { status: 500 }
    )
  }
}
