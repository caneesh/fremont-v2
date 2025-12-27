import { NextRequest, NextResponse } from 'next/server'
import { generateScaffold, generateMicroTaskScaffold } from '@/lib/anthropic'
import { validateAuthHeader, unauthorizedResponse, quotaExceededResponse } from '@/lib/auth/apiAuth'
import { serverQuotaService } from '@/lib/auth/serverQuotaService'
import { DEFAULT_QUOTA_LIMITS } from '@/types/auth'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authContext = validateAuthHeader(request)
    if (!authContext) {
      return unauthorizedResponse()
    }

    // Check quota
    if (!serverQuotaService.checkQuota(authContext.userId, 'problems')) {
      return quotaExceededResponse('problem generations', DEFAULT_QUOTA_LIMITS.dailyProblems)
    }

    const body = await request.json()
    const { problem, diagramImage, useMicroTasks = false } = body

    if (!problem || typeof problem !== 'string') {
      return NextResponse.json(
        { error: 'Problem text is required' },
        { status: 400 }
      )
    }

    // Validate diagram image if provided
    if (diagramImage && typeof diagramImage !== 'string') {
      return NextResponse.json(
        { error: 'Diagram image must be a base64 string' },
        { status: 400 }
      )
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }

    // OPTIMIZED SINGLE-PASS ARCHITECTURE (2x faster)
    // Combines solving + scaffolding into one API call
    // Supports both hint mode (default) and micro-task mode
    const mode = useMicroTasks ? 'micro-task' : 'hint'
    console.log(`[${authContext.userId}] Generating ${mode} scaffold${diagramImage ? ' with diagram' : ''}...`)
    const startTime = Date.now()

    const scaffoldData = useMicroTasks
      ? await generateMicroTaskScaffold(problem, diagramImage)
      : await generateScaffold(problem, diagramImage)

    const endTime = Date.now()
    console.log(`[${authContext.userId}] ${mode} scaffold generated in ${(endTime - startTime) / 1000}s`)

    // Increment quota after successful generation
    serverQuotaService.incrementQuota(authContext.userId, 'problems')

    // Add remaining quota to response
    const remaining = serverQuotaService.getRemainingQuota(authContext.userId)

    return NextResponse.json({
      ...scaffoldData,
      _quota: remaining,
    })
  } catch (error) {
    console.error('Error processing problem:', error)
    return NextResponse.json(
      {
        error: 'Failed to process problem',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
