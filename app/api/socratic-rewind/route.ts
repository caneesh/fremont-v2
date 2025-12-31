import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { SocraticRewindContext, SocraticRewindResponse } from '@/types/socraticRewind'

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

/**
 * Socratic Rewind API
 *
 * Generates AI-enhanced Socratic Rewind responses following the algorithm:
 * 1. The Stop - Pause for calibration
 * 2. The Rewind - Reference previous valid step
 * 3. The Comparison - Compare valid step to error
 * 4. The Bridge Question - Highlight contradiction with targeted question
 *
 * GUARDRAILS (enforced by the AI):
 * - NEVER give the correct equation or numerical answer
 * - NEVER explicitly state the mistake (e.g., "You forgot the negative sign")
 * - Instead, ask guiding questions (e.g., "What direction is the force acting in?")
 * - Keep tone encouraging but rigorous (Socratic method)
 */

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint only accepts POST requests. Use POST with SocraticRewindContext.' },
    { status: 405 }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { context } = body as { context: SocraticRewindContext }

    if (!context) {
      return NextResponse.json(
        { error: 'SocraticRewindContext is required in the request body' },
        { status: 400 }
      )
    }

    // Build the prompt for Claude
    const prompt = buildSocraticRewindPrompt(context)

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse the JSON response
    const jsonMatch = responseText.match(/\{[\s\S]+\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText

    try {
      const rewindResponse: SocraticRewindResponse = JSON.parse(jsonStr)
      return NextResponse.json(rewindResponse, { status: 200 })
    } catch (parseError) {
      console.error('Failed to parse Socratic Rewind JSON:', parseError)
      console.error('Raw response:', responseText)

      // Return a fallback response
      return NextResponse.json(
        generateFallbackResponse(context),
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('Error in socratic-rewind endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate Socratic Rewind response',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Build the system prompt for generating Socratic Rewind responses
 */
function buildSocraticRewindPrompt(context: SocraticRewindContext): string {
  return `You are the "Socratic Rewind" agent for PhysiScaffold, an advanced physics tutor for IITJEE students. Your goal is NOT to give answers, but to fix broken mental models.

### INPUT CONTEXT
1. **PREVIOUS_VALID_STEP** (The Anchor):
   - Step ID: ${context.previousValidStep.stepId}
   - Step Title: ${context.previousValidStep.stepTitle}
   - Step Content: ${context.previousValidStep.stepContent}
   ${context.previousValidStep.userAnswer ? `- Student's Answer: ${context.previousValidStep.userAnswer}` : ''}

2. **CURRENT_ERROR**:
   - Error Type: ${context.currentError.errorType}
   - Description: ${context.currentError.description}
   ${context.currentError.studentInput ? `- Student's Input: ${context.currentError.studentInput}` : ''}

3. **VIOLATED_PRINCIPLE**:
   - Name: ${context.violatedPrinciple.name}
   - Description: ${context.violatedPrinciple.description}
   - Category: ${context.violatedPrinciple.category}

4. **PROBLEM CONTEXT**:
   - Domain: ${context.problemContext.domain}
   - Subdomain: ${context.problemContext.subdomain}
   - Problem: ${context.problemContext.problemText.substring(0, 500)}${context.problemContext.problemText.length > 500 ? '...' : ''}

### THE ALGORITHM
Follow these strict execution rules:

1. **The Stop:** Do not say "Wrong" or "Incorrect." Frame it as a "Pause for calibration." Make the student feel this is a natural part of problem-solving, not a failure.

2. **The Rewind:** Explicitly reference the PREVIOUS_VALID_STEP. Quote what the student agreed to or calculated in that step.

3. **The Comparison:** Ask the student to look at both steps and compare them.

4. **The Bridge Question:** Ask a SINGLE, targeted question that highlights the contradiction between the valid step and the current error. This question should guide the student to discover the mistake themselves.

### GUARDRAILS (CRITICAL)
- NEVER give the correct equation or numerical answer
- NEVER explicitly state "You forgot the negative sign" or similar direct corrections
- Instead, ask guiding questions like "What direction is the force acting in?"
- Use LaTeX formatting for all math expressions (e.g., $F = ma$, $g = 9.8 \\text{ m/s}^2$)
- Keep the tone encouraging but rigorous

### OUTPUT FORMAT
Respond with ONLY valid JSON in this exact structure:
{
  "stopMessage": "A short, encouraging message that pauses the student. Do NOT say 'wrong'. Frame it as a calibration pause.",
  "rewindReference": {
    "stepLabel": "Step X" or descriptive label like "Your FBD" or "Your coordinate setup",
    "quotedContent": "Quote or paraphrase what the student established in the previous valid step. Be specific."
  },
  "comparisonPrompt": "A short prompt asking the student to compare the two steps.",
  "bridgeQuestion": "A single, targeted Socratic question that highlights the contradiction WITHOUT revealing the answer. Use LaTeX for math.",
  "gentleNudge": "An optional hint that gives direction without spoiling. Should reference the violated principle indirectly.",
  "relatedConcepts": ["concept-1", "concept-2"],
  "highlightStepId": ${context.previousValidStep.stepId}
}

Respond with ONLY the JSON, no other text.`
}

/**
 * Generate a fallback response if AI fails
 */
function generateFallbackResponse(context: SocraticRewindContext): SocraticRewindResponse {
  const stepLabel = `Step ${context.previousValidStep.stepId + 1}`

  return {
    stopMessage: "Hold on. Let's pause for a moment to calibrate our approach.",
    rewindReference: {
      stepLabel,
      quotedContent: context.previousValidStep.userAnswer
        ? `You wrote: "${context.previousValidStep.userAnswer}"`
        : `In ${context.previousValidStep.stepTitle}, you established: ${context.previousValidStep.stepContent}`,
    },
    comparisonPrompt: `Now, look at your current input and compare it to what you did in ${stepLabel}.`,
    bridgeQuestion: `Based on what you established in ${stepLabel}, does your current approach follow logically? What might be different?`,
    gentleNudge: `Hint: Consider the ${context.violatedPrinciple.name} and how it applies here.`,
    relatedConcepts: [context.violatedPrinciple.category],
    highlightStepId: context.previousValidStep.stepId,
  }
}
