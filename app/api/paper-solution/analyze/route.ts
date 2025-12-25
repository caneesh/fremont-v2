import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateAuthHeader, unauthorizedResponse, quotaExceededResponse } from '@/lib/auth/apiAuth'
import { serverQuotaService } from '@/lib/auth/serverQuotaService'
import { v4 as uuidv4 } from 'uuid'
import type { AnalyzeSolutionRequest, AnalyzeSolutionResponse, AnalysisStatus } from '@/types/paperSolution'

const anthropic = new Anthropic()

// Daily analysis limit (shares with reflections quota)
const DAILY_ANALYSIS_LIMIT = 30

/**
 * Socratic Feedback Analysis Prompt
 *
 * This prompt is carefully designed to:
 * 1. Focus on ONE issue at a time (cognitive load management)
 * 2. Use questions rather than direct answers (Socratic method)
 * 3. Acknowledge what's correct first (positive reinforcement)
 * 4. Connect mistakes to deeper conceptual understanding
 * 5. Handle OCR uncertainty gracefully
 */
const ANALYSIS_SYSTEM_PROMPT = `You are a Socratic physics tutor analyzing a student's handwritten solution. Your goal is to provide focused, constructive feedback that helps the student discover their own errors and deepen understanding.

CORE PRINCIPLES:
1. ONE ISSUE FOCUS: Identify only the FIRST significant issue. Don't overwhelm with multiple problems.
2. SOCRATIC METHOD: Ask guiding questions rather than giving direct answers.
3. POSITIVE FIRST: Always acknowledge what the student did correctly before addressing issues.
4. CONCEPTUAL DEPTH: Connect errors to underlying physics concepts, not just procedural fixes.
5. OCR AWARENESS: If the extracted text seems unclear or possibly misread, ask for clarification rather than assuming.

ANALYSIS FRAMEWORK:
1. Compare the student's work against the step objective and rubric
2. Check for:
   - Correct identification of relevant physics principles
   - Proper setup of equations/relationships
   - Logical flow of reasoning
   - Correct use of given information
   - Appropriate assumptions and approximations
3. Distinguish between:
   - Conceptual errors (wrong principle, misunderstanding)
   - Procedural errors (wrong formula application)
   - Calculation errors (arithmetic mistakes)
   - Notation/clarity issues

OUTPUT FORMAT (JSON):
{
  "status": "pass|partial|fail|unclear",
  "summary": "1-2 sentence overall assessment",
  "correctElements": ["What they did right - 2-4 bullet points"],
  "firstIssue": {
    "title": "Short label for the issue",
    "description": "What specifically is wrong",
    "whyItMatters": "Why this is important conceptually"
  } | null,
  "socraticNudge": "A question that guides the student to discover the fix themselves",
  "suggestedAction": "Concrete next step the student should take",
  "analysisConfidence": 0.85,
  "clarificationNeeded": false,
  "clarifications": [
    {"question": "Could you confirm if you wrote X or Y?", "options": ["X", "Y"]}
  ]
}`

function buildAnalysisPrompt(req: AnalyzeSolutionRequest): string {
  const { finalText, stepRubric, problemContext, previousFeedback } = req

  let prompt = `## PROBLEM CONTEXT
**Problem:** ${problemContext.problemText}
**Domain:** ${problemContext.domain} - ${problemContext.subdomain}
**Relevant Concepts:** ${problemContext.relevantConcepts.join(', ')}

## CURRENT STEP
**Step ${stepRubric.stepId + 1}:** ${stepRubric.stepTitle}
**Objective:** ${stepRubric.objective}
**Required Elements:** ${stepRubric.requiredElements.join(', ')}
**Common Mistakes to Watch For:** ${stepRubric.commonMistakes.join(', ')}
**Acceptance Criteria:** ${stepRubric.acceptanceCriteria}

## STUDENT'S HANDWRITTEN SOLUTION (OCR-extracted)
\`\`\`
${finalText}
\`\`\`
`

  if (previousFeedback) {
    prompt += `
## PREVIOUS FEEDBACK (student is revising)
${previousFeedback}

Note: The student has attempted to revise their work based on this feedback. Look for improvements and any remaining issues.
`
  }

  prompt += `
## YOUR TASK
Analyze this student's work for Step ${stepRubric.stepId + 1}. Provide Socratic feedback following the framework described.

Remember:
- Focus on ONE issue only (the most important one)
- Use questions to guide discovery
- Acknowledge what's correct
- If OCR seems wrong, ask for clarification
- Be encouraging but honest`

  return prompt
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authContext = validateAuthHeader(request)
    if (!authContext) {
      return unauthorizedResponse()
    }

    // Check quota (shares with reflections)
    if (!serverQuotaService.checkQuota(authContext.userId, 'reflections')) {
      return quotaExceededResponse('solution analyses', DAILY_ANALYSIS_LIMIT)
    }

    const body: AnalyzeSolutionRequest = await request.json()
    const { extractionId, finalText, stepId, stepRubric, problemContext, previousFeedback } = body

    // Validation
    if (!extractionId) {
      return NextResponse.json(
        { error: 'Extraction ID is required' },
        { status: 400 }
      )
    }

    if (!finalText || typeof finalText !== 'string' || finalText.trim().length < 10) {
      return NextResponse.json(
        { error: 'Extracted text is too short or missing' },
        { status: 400 }
      )
    }

    if (!stepRubric || !problemContext) {
      return NextResponse.json(
        { error: 'Step rubric and problem context are required' },
        { status: 400 }
      )
    }

    const startTime = Date.now()

    // Build the analysis prompt
    const userPrompt = buildAnalysisPrompt(body)

    // Call Claude for analysis
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      system: ANALYSIS_SYSTEM_PROMPT,
    })

    // Parse the response
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Extract JSON from response
    let analysisResult
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      // Fallback: construct a basic response
      console.error('Failed to parse analysis response:', parseError)
      analysisResult = {
        status: 'unclear' as AnalysisStatus,
        summary: 'Unable to fully analyze the solution. Please try again or provide clearer images.',
        correctElements: ['Your solution was received'],
        firstIssue: null,
        socraticNudge: 'Could you walk me through your approach step by step?',
        suggestedAction: 'Try rewriting your solution more clearly',
        analysisConfidence: 0.3,
        clarificationNeeded: true,
        clarifications: [
          {
            question: 'The extracted text may have errors. Could you verify your work is correctly captured?',
            options: ['Yes, it looks correct', 'No, there are errors'],
          },
        ],
      }
    }

    // Validate and sanitize the response
    const status: AnalysisStatus = ['pass', 'partial', 'fail', 'unclear'].includes(analysisResult.status)
      ? analysisResult.status
      : 'unclear'

    const analysisId = uuidv4()
    const processingTimeMs = Date.now() - startTime

    // Increment quota
    serverQuotaService.incrementQuota(authContext.userId, 'reflections')

    const apiResponse: AnalyzeSolutionResponse = {
      analysisId,
      status,
      summary: analysisResult.summary || 'Analysis complete',
      correctElements: Array.isArray(analysisResult.correctElements)
        ? analysisResult.correctElements
        : [],
      firstIssue: analysisResult.firstIssue || null,
      socraticNudge: analysisResult.socraticNudge || 'What do you think about your approach?',
      suggestedAction: analysisResult.suggestedAction || 'Review your work and try again',
      analysisConfidence: typeof analysisResult.analysisConfidence === 'number'
        ? analysisResult.analysisConfidence
        : 0.7,
      clarificationNeeded: Boolean(analysisResult.clarificationNeeded),
      clarifications: analysisResult.clarifications,
    }

    console.log(
      `[${authContext.userId}] Solution analyzed: ${analysisId} ` +
      `(status: ${status}, confidence: ${(apiResponse.analysisConfidence * 100).toFixed(1)}%, ${processingTimeMs}ms)`
    )

    return NextResponse.json(apiResponse)
  } catch (error) {
    console.error('Error analyzing solution:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze solution',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
