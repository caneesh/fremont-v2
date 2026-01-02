/**
 * Question Scaffolding Engine v1 - Status Endpoint
 *
 * GET /api/question/status?id={statusId}
 *
 * Polling endpoint to check generation status.
 * Returns current status, message, and progress percentage.
 *
 * For real-time updates, use the SSE endpoint at:
 * GET /api/question/status/stream?id={statusId}
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStatus } from '@/lib/question-engine/kv-store'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const statusId = searchParams.get('id')

  if (!statusId) {
    return NextResponse.json(
      { error: 'Missing required parameter: id' },
      { status: 400 }
    )
  }

  const status = await getStatus(statusId)

  if (!status) {
    return NextResponse.json(
      { error: 'Status not found or expired' },
      { status: 404 }
    )
  }

  return NextResponse.json(status, { status: 200 })
}
