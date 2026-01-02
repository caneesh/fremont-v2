/**
 * Question Scaffolding Engine v1 - SSE Stream Endpoint
 *
 * GET /api/question/status/stream?id={statusId}
 *
 * Server-Sent Events endpoint for real-time status updates.
 * Polls KV every 500ms and streams updates to client.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStatus } from '@/lib/question-engine/kv-store'

export const runtime = 'nodejs' // ioredis requires Node.js runtime

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const statusId = searchParams.get('id')

  if (!statusId) {
    return NextResponse.json(
      { error: 'Missing required parameter: id' },
      { status: 400 }
    )
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let lastTimestamp = ''
      let pollCount = 0
      const maxPolls = 120 // 60 seconds at 500ms intervals

      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const poll = async () => {
        pollCount++

        if (pollCount > maxPolls) {
          sendEvent({ status: 'timeout', message: 'Status polling timed out', progress: 0 })
          controller.close()
          return
        }

        try {
          const status = await getStatus(statusId)

          if (!status) {
            // Status might not be created yet, keep polling
            if (pollCount > 20) {
              sendEvent({ status: 'not_found', message: 'Status not found or expired', progress: 0 })
              controller.close()
              return
            }
          } else {
            // Only send if timestamp changed
            if (status.timestamp !== lastTimestamp) {
              lastTimestamp = status.timestamp
              sendEvent(status)

              // Close stream on completion or error
              if (status.status === 'completed' || status.status === 'error') {
                controller.close()
                return
              }
            }
          }

          // Continue polling
          setTimeout(poll, 500)
        } catch (error) {
          console.error('[SSE] Poll error:', error)
          sendEvent({ status: 'error', message: 'Server error during polling', progress: 0 })
          controller.close()
        }
      }

      // Initial connection event
      sendEvent({ status: 'connected', message: 'Connected to status stream', progress: 0 })

      // Start polling
      poll()
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}
