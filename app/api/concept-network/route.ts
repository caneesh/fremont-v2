import { NextRequest, NextResponse } from 'next/server'
import { CONCEPT_NETWORK_DATA } from '@/lib/conceptNetworkData'

export async function GET(request: NextRequest) {
  try {
    // Return static concept network data
    // Benefits:
    // - Instant response (no API call)
    // - No cost (was causing expensive + failing API calls)
    // - Reliable (no JSON parsing errors)
    // - Same data for all users
    console.log('Serving static concept network (30 nodes, 40 edges)')
    return NextResponse.json(CONCEPT_NETWORK_DATA)
  } catch (error) {
    console.error('Error serving concept network:', error)
    return NextResponse.json(
      {
        error: 'Failed to load concept network',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
