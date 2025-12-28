import { NextRequest, NextResponse } from 'next/server'
import {
  generateScaffold,
  generateMicroTaskScaffold,
  solvePhysicsProblem,
  scaffoldSolution,
  anticipateErrors,
  ScaffoldDensity
} from '@/lib/anthropic'
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
    const { problem, diagramImage, useMicroTasks = false, enableErrorAnticipation = false, density = 3 } = body

    // Validate density (1-5)
    const validDensity: ScaffoldDensity = Math.min(5, Math.max(1, Math.round(density))) as ScaffoldDensity

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

    const mode = useMicroTasks ? 'micro-task' : 'hint'
    const startTime = Date.now()

    let scaffoldData

    if (enableErrorAnticipation) {
      // 3-PASS ARCHITECTURE WITH ERROR ANTICIPATION
      // Pass 1: Solve the problem (hidden)
      // Pass 1.5: Anticipate common errors
      // Pass 2: Generate scaffold
      console.log(`[${authContext.userId}] Using 3-pass architecture with Error Anticipator (density=${validDensity})...`)

      // Pass 1: Solve
      const solverResponse = await solvePhysicsProblem(problem)
      console.log(`[${authContext.userId}] Pass 1 (Solver) complete`)

      // Pass 2: Generate scaffold (we need step titles for error anticipation)
      // Note: Currently using single-pass for scaffold, then merging error data
      scaffoldData = useMicroTasks
        ? await generateMicroTaskScaffold(problem, diagramImage)
        : await generateScaffold(problem, diagramImage, validDensity)
      console.log(`[${authContext.userId}] Pass 2 (${mode} Scaffolder) complete`)

      // Pass 1.5: Anticipate errors (uses hidden solution + step titles)
      const stepTitles = scaffoldData.steps.map((s: { title: string }) => s.title)
      const errorData = await anticipateErrors(problem, solverResponse.solution, stepTitles)
      console.log(`[${authContext.userId}] Pass 1.5 (Error Anticipator) complete: ${errorData.commonTraps.length} traps, ${errorData.warningBeacons.length} beacons`)

      // Merge error anticipation data into scaffold
      scaffoldData = {
        ...scaffoldData,
        commonTraps: errorData.commonTraps,
        warningBeacons: errorData.warningBeacons,
      }
    } else {
      // OPTIMIZED SINGLE-PASS ARCHITECTURE (2x faster)
      // Combines solving + scaffolding into one API call
      // Supports both hint mode (default) and micro-task mode
      console.log(`[${authContext.userId}] Generating ${mode} scaffold (density=${validDensity})${diagramImage ? ' with diagram' : ''}...`)

      scaffoldData = useMicroTasks
        ? await generateMicroTaskScaffold(problem, diagramImage)
        : await generateScaffold(problem, diagramImage, validDensity)
    }

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
