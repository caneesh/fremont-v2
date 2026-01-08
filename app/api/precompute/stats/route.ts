/**
 * API Route: /api/precompute/stats
 *
 * Returns precompute coverage statistics and job queue status.
 * Used by admin dashboard to monitor precompute health.
 */

import { NextResponse } from 'next/server'
import { precomputeService, getJobStats, getPendingJobCounts } from '@/lib/precompute'

export async function GET() {
  try {
    const [coverage, jobStats, pendingByType] = await Promise.all([
      precomputeService.getCoverageStats(),
      getJobStats(),
      getPendingJobCounts(),
    ])

    return NextResponse.json({
      coverage,
      jobs: {
        ...jobStats,
        pendingByType,
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching precompute stats:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch precompute statistics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
