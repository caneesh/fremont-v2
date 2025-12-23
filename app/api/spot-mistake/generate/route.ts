import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateAuthHeader, unauthorizedResponse, quotaExceededResponse } from '@/lib/auth/apiAuth'
import { serverQuotaService } from '@/lib/auth/serverQuotaService'
import { DEFAULT_QUOTA_LIMITS } from '@/types/auth'
import type { GenerateMistakeSolutionRequest, StudentSolution } from '@/types/spotTheMistake'
import { storeMistakeLocation } from '@/lib/spotMistakeStorage'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authContext = validateAuthHeader(request)
    if (!authContext) {
      return unauthorizedResponse()
    }

    // Check quota (use problems quota for now)
    if (!serverQuotaService.checkQuota(authContext.userId, 'problems')) {
      return quotaExceededResponse('problem generations', DEFAULT_QUOTA_LIMITS.dailyProblems)
    }

    const body: GenerateMistakeSolutionRequest = await request.json()
    const { problemText, domain, subdomain, correctSolution } = body

    if (!problemText || typeof problemText !== 'string') {
      return NextResponse.json(
        { error: 'Problem text is required' },
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

    console.log(`[${authContext.userId}] Generating flawed student solution...`)
    const startTime = Date.now()

    const prompt = `You are an expert physics tutor and exam evaluator.

Your task is to generate a student-submitted solution to a physics problem that is mostly correct (≈90%), but contains exactly ONE deliberate conceptual mistake.

PROBLEM:
${problemText}

DOMAIN: ${domain || 'Classical Mechanics'}
SUBDOMAIN: ${subdomain || 'General'}

${correctSolution ? `CORRECT SOLUTION (for reference - DO NOT copy directly):\n${correctSolution}\n\n` : ''}

RULES:
1. The mistake must be a common student misconception, not a calculation typo.
2. The mistake must be fatal to the correctness of the final answer.
3. All other steps must be clear, well-structured, and correct.
4. Do NOT reveal or hint at the mistake in the solution.
5. Do NOT include multiple errors.
6. Use step-by-step reasoning, equations, and units where appropriate.
7. After the solution, end with a neutral submission-style conclusion, as if written by a student.
8. Do NOT add explanations, corrections, or commentary.

OUTPUT FORMAT:
Output ONLY valid JSON with this structure:

{
  "title": "Student Solution",
  "steps": [
    {
      "stepNumber": 1,
      "title": "Step title",
      "content": "Brief description of what this step does",
      "equations": ["$F = ma$", "$$E = \\\\frac{1}{2}mv^2$$"],
      "reasoning": "Detailed reasoning for this step"
    }
  ],
  "conclusion": "Final answer and submission statement (as student would write)",
  "mistakeLocation": {
    "stepIndex": 2,
    "mistakeType": "conservation_violation",
    "correctApproach": "Brief explanation of the correct approach"
  }
}

MISTAKE TYPES (choose one):
- "sign_convention": Wrong sign for forces/vectors
- "reference_frame": Wrong reference frame choice
- "conservation_violation": Incorrectly assumes conservation
- "force_identification": Missing or incorrect force
- "concept_confusion": Mixing up concepts (e.g., energy vs momentum)
- "coordinate_system": Wrong coordinate choice
- "initial_conditions": Wrong boundary/initial conditions
- "vector_scalar_confusion": Treating vector as scalar

CRITICAL: Make the solution look authentic - a capable student who made ONE conceptual error.

Respond with ONLY the JSON, no other text.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]+\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText

    try {
      const solutionData = JSON.parse(jsonStr)

      // Generate unique ID
      const solutionId = `mistake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      const studentSolution: StudentSolution = {
        id: solutionId,
        problemId: `problem-${Date.now()}`,
        title: solutionData.title || 'Student Solution',
        steps: solutionData.steps || [],
        conclusion: solutionData.conclusion || '',
        mistakeLocation: solutionData.mistakeLocation,
        createdAt: new Date().toISOString(),
      }

      const endTime = Date.now()
      console.log(`[${authContext.userId}] Flawed solution generated in ${(endTime - startTime) / 1000}s`)

      // Store mistake location server-side for later verification
      storeMistakeLocation(solutionId, studentSolution.mistakeLocation)

      // Increment quota
      serverQuotaService.incrementQuota(authContext.userId, 'problems')

      // Return solution WITHOUT mistake location (keep it server-side)
      const { mistakeLocation, ...publicSolution } = studentSolution

      return NextResponse.json({
        ...publicSolution,
        _quota: serverQuotaService.getRemainingQuota(authContext.userId),
      })
    } catch (parseError) {
      console.error('Failed to parse student solution JSON:', parseError)
      console.error('Raw JSON string (first 500 chars):', jsonStr.substring(0, 500))
      throw new Error('Failed to generate proper student solution structure')
    }
  } catch (error) {
    console.error('Error generating flawed solution:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate student solution',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
