import { NextRequest, NextResponse } from 'next/server'
import { generateStepUpProblem } from '@/lib/stepUpGenerator'
import type { StepUpRequest } from '@/types/stepUp'
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

    // Check quota (reuse problems quota since this generates a new problem)
    if (!serverQuotaService.checkQuota(authContext.userId, 'problems')) {
      return quotaExceededResponse('problem generations', DEFAULT_QUOTA_LIMITS.dailyProblems)
    }

    const body: StepUpRequest = await request.json()
    const { previousProblem, userPerformance, topicTags } = body

    if (!previousProblem || !userPerformance || !topicTags || topicTags.length === 0) {
      return NextResponse.json(
        { error: 'previousProblem, userPerformance, and topicTags are required' },
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

    // Generate next problem
    const nextProblem = await generateStepUpProblem(body)

    // Increment quota after successful generation
    serverQuotaService.incrementQuota(authContext.userId, 'problems')

    return NextResponse.json(nextProblem)
  } catch (error) {
    console.error('Error generating step-up problem:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate step-up problem',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
