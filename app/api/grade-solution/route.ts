import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateAuthHeader, unauthorizedResponse, quotaExceededResponse } from '@/lib/auth/apiAuth'
import { serverQuotaService } from '@/lib/auth/serverQuotaService'
import { DEFAULT_QUOTA_LIMITS } from '@/types/auth'
import type { GradeSolutionRequest, GradeSolutionResponse, GradeStatus } from '@/types/gradeSolution'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authContext = validateAuthHeader(request)
    if (!authContext) {
      return unauthorizedResponse()
    }

    // Quota check - using problems quota for solution grading
    if (!serverQuotaService.checkQuota(authContext.userId, 'problems')) {
      return quotaExceededResponse('solution gradings', DEFAULT_QUOTA_LIMITS.dailyProblems)
    }

    const body: GradeSolutionRequest = await request.json()
    const { solution, problemContext, submissionType } = body

    if (!solution || !problemContext) {
      return NextResponse.json(
        { error: 'Missing required fields: solution and problemContext' },
        { status: 400 }
      )
    }

    console.log(`[${authContext.userId}] Grading ${submissionType} solution...`)
    const startTime = Date.now()

    const systemPrompt = `You are an expert IIT-JEE Physics examiner and diagnostic grader. Your task is to evaluate a student's physics solution with precise, constructive feedback.

## GRADING PHILOSOPHY
You are NOT a simple "correct/incorrect" grader. You are a DIAGNOSTIC GRADER who identifies:
1. Whether the PHYSICS UNDERSTANDING is correct
2. Whether the MATHEMATICAL EXECUTION is correct
3. Whether the APPROACH/STRATEGY is optimal

## THE THREE BUCKETS (You MUST classify into exactly one)

### SUCCESS
- Physics principles are correctly identified and applied
- Mathematical steps are accurate
- Final answer is correct (or would be correct with trivial arithmetic)
- The approach is sound even if not the most elegant

### MINOR_SLIP
- Physics understanding is CORRECT
- Approach/strategy is CORRECT
- BUT there are mathematical errors: sign errors, algebra mistakes, arithmetic errors, unit conversion errors
- The student would get the right answer if they fixed the math
- Examples: Dropped a negative sign, factored incorrectly, made a calculation error

### CONCEPTUAL_GAP
- Wrong physics principle applied (e.g., used kinematics when energy conservation was needed)
- Fundamental misunderstanding of the physical situation
- Wrong free body diagram or force analysis
- Missing critical physical considerations (e.g., forgot friction, ignored rotation)
- Would NOT get the right answer even with perfect math because the physics is wrong

## RESPONSE FORMAT
You MUST respond with ONLY valid JSON in this exact format:
{
  "status": "SUCCESS" | "MINOR_SLIP" | "CONCEPTUAL_GAP",
  "feedback_markdown": "Your detailed feedback in markdown. Be specific. Praise what's correct. For errors, explain WHY it's wrong and hint at the correct approach without giving the full answer.",
  "highlight_location": "Quote the EXACT text from the student's solution that contains the error or deserves praise. Use null if not applicable.",
  "next_action": {
    "type": "OPTIMIZE" | "FIX_LINE" | "REVIEW_CONCEPT",
    "label": "Button text for the student (e.g., 'See the elegant shortcut', 'Fix the sign error', 'Review: Conservation Laws')"
  },
  "confidence": 0.95,
  "detailedAnalysis": {
    "physicsCorrect": true,
    "mathCorrect": false,
    "approachCorrect": true,
    "errors": [
      {
        "type": "sign",
        "description": "Negative sign dropped in step 3",
        "location": "F = ma instead of F = -ma"
      }
    ]
  }
}

## NEXT_ACTION MAPPING
- SUCCESS → type: "OPTIMIZE", label: "See the elegant shortcut" or "Compare with model solution"
- MINOR_SLIP → type: "FIX_LINE", label: "Fix the [specific] error" or "Check your algebra in step X"
- CONCEPTUAL_GAP → type: "REVIEW_CONCEPT", label: "Review: [Concept Name]" or "Rethink the approach"

## FEEDBACK STYLE
- Be encouraging but honest
- Use markdown formatting: **bold** for key points, \`code\` for equations
- For SUCCESS: Praise the approach, mention if there's a more elegant method
- For MINOR_SLIP: Identify the exact error, explain the fix without doing it for them
- For CONCEPTUAL_GAP: Gently redirect to correct physics, ask Socratic questions

## IMPORTANT
- Do NOT be overly lenient. Real JEE grading is strict.
- Do NOT mark MINOR_SLIP if the physics concept is wrong
- Do NOT mark SUCCESS if there are math errors (unless trivially minor)
- Always quote specific parts of the student's solution in highlight_location`

    const userPrompt = `## PROBLEM
${problemContext.problemText}

## DOMAIN
${problemContext.domain} > ${problemContext.subdomain}

${problemContext.expectedApproach ? `## EXPECTED APPROACH\n${problemContext.expectedApproach}\n` : ''}
${problemContext.keyEquations?.length ? `## KEY EQUATIONS\n${problemContext.keyEquations.join('\n')}\n` : ''}
${problemContext.concepts?.length ? `## RELEVANT CONCEPTS\n${problemContext.concepts.map(c => `- ${c.name}`).join('\n')}\n` : ''}

## STUDENT'S SOLUTION (${submissionType === 'handwriting' ? 'Transcribed from handwriting' : 'Typed'})
${solution}

---
Analyze this solution and provide your diagnostic grade in the specified JSON format.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for consistent grading
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const textContent = response.content[0]
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Claude response')
    }

    const gradeResponse: GradeSolutionResponse = JSON.parse(jsonMatch[0])

    // Validate status is one of the allowed values
    const validStatuses: GradeStatus[] = ['SUCCESS', 'MINOR_SLIP', 'CONCEPTUAL_GAP']
    if (!validStatuses.includes(gradeResponse.status)) {
      gradeResponse.status = 'CONCEPTUAL_GAP' // Default fallback
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[${authContext.userId}] Grading complete in ${duration}s - Status: ${gradeResponse.status}`)

    // Increment quota
    serverQuotaService.incrementQuota(authContext.userId, 'problems')

    return NextResponse.json(gradeResponse)
  } catch (error) {
    console.error('Error in grade-solution:', error)
    return NextResponse.json(
      {
        error: 'Failed to grade solution',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
