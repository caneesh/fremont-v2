/**
 * Question Scaffolding Engine v1 - Health Check Endpoint
 *
 * GET /api/question/health
 *
 * Returns the status of all dependencies (KV, Blob, Anthropic).
 */

import { NextResponse } from 'next/server'
import { getKVStatus } from '@/lib/question-engine/kv-store'

export const runtime = 'nodejs' // ioredis requires Node.js runtime
import { getBlobStatus } from '@/lib/question-engine/blob-store'
import { getAnthropicStatus } from '@/lib/question-engine/anthropic-adapter'
import { getAllTemplateIds } from '@/lib/question-engine/templates'
import { prisma } from '@/lib/db'

async function getDatabaseStatus(): Promise<{ available: boolean; message: string }> {
  try {
    // Simple query to test database connection
    await prisma.$queryRaw`SELECT 1`
    return { available: true, message: 'PostgreSQL (Neon) is connected' }
  } catch (error) {
    return { available: false, message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}` }
  }
}

export async function GET() {
  const kvStatus = await getKVStatus()
  const blobStatus = await getBlobStatus()
  const anthropicStatus = getAnthropicStatus()
  const dbStatus = await getDatabaseStatus()
  const templates = getAllTemplateIds()

  const allHealthy = kvStatus.available && blobStatus.available && anthropicStatus.available && dbStatus.available

  return NextResponse.json(
    {
      status: allHealthy ? 'healthy' : 'degraded',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        kv: kvStatus,
        blob: blobStatus,
        anthropic: anthropicStatus,
        database: dbStatus,
      },
      templates: {
        count: templates.length,
        ids: templates,
      },
    },
    { status: allHealthy ? 200 : 503 }
  )
}
