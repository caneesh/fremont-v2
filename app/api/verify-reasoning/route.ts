import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateAuthHeader, unauthorizedResponse, quotaExceededResponse } from '@/lib/auth/apiAuth'
import { serverQuotaService } from '@/lib/auth/serverQuotaService'
import { DEFAULT_QUOTA_LIMITS } from '@/types/auth'
import type { SanityCheckVariant } from '@/types/scaffold'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

interface VerifyReasoningRequest {
  checkType: 'limit' | 'symmetry' | 'dimension'
  studentPrediction: string
  studentReasoning: string
  variant: SanityCheckVariant
  problemContext: {
    problemText: string
    domain: string
    subdomain: string
    steps: Array<{ id: number; title: string }>
    concepts: Array<{ id: string; name: string }>
  }
}

interface VerifyReasoningResponse {
  reasoningValid: boolean
  feedbackType: 'correct' | 'partial' | 'misconception'
  feedback: string
  misconceptionIdentified?: string
  targetStepId?: number
}

const CHECK_TYPE_DESCRIPTIONS = {
  limit: 'Extreme Case / Limiting Behavior Analysis',
  symmetry: 'Physical Symmetry Arguments',
  dimension: 'Dimensional Analysis Verification',
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authContext = validateAuthHeader(request)
    if (!authContext) {
      return unauthorizedResponse()
    }

    // Quota check - using hints quota for verification
    if (!serverQuotaService.checkQuota(authContext.userId, 'hints')) {
      return quotaExceededResponse('reasoning checks', DEFAULT_QUOTA_LIMITS.dailyHints)
    }

    const body: VerifyReasoningRequest = await request.json()
    const { checkType, studentPrediction, studentReasoning, variant, problemContext } = body

    if (!checkType || !studentPrediction || !studentReasoning || !variant || !problemContext) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`[${authContext.userId}] Verify reasoning request - Type: ${checkType}`)
    const startTime = Date.now()

    // Build the system prompt for reasoning validation
    const systemPrompt = `You are an expert physics tutor evaluating a student's PHYSICAL REASONING, not their mathematical calculation.

## Your Task
Evaluate whether the student's reasoning demonstrates genuine physical understanding of the ${CHECK_TYPE_DESCRIPTIONS[checkType]}.

## The Physics Problem
${problemContext.problemText}

## Domain
${problemContext.domain} > ${problemContext.subdomain}

## The Verification Check
Type: ${checkType.toUpperCase()}
Question: "${variant.question}"
Setup: "${variant.setupPrompt}"

## What Correct Reasoning Looks Like
${variant.expectedReasoning}

## Common Mistakes to Watch For
${variant.commonMistakes.map((m, i) => `${i + 1}. ${m}`).join('\n')}

## Student's Response
Prediction: "${studentPrediction}"
Reasoning: "${studentReasoning}"

## Evaluation Guidelines
1. FOCUS ON REASONING, NOT WORDING: A student who captures the physical essence is correct even if their wording differs from the expected answer.

2. BE GENEROUS WITH CORRECT PHYSICAL INTUITION: If they understand the physics, mark as correct. For example:
   - "It falls freely" = "acceleration equals g" ✓
   - "They balance out" = "acceleration is zero by symmetry" ✓
   - "Units work out to m/s²" = dimensional analysis correct ✓

3. IDENTIFY SPECIFIC MISCONCEPTIONS: If wrong, identify which common mistake they made (if any).

4. PARTIAL CREDIT: Use "partial" when they're on the right track but missing a key insight.

5. SOCRATIC GUIDANCE: If incorrect, provide a guiding question rather than the answer.

## Response Format
Return ONLY a JSON object (no markdown, no explanation outside JSON):
{
  "reasoningValid": boolean,
  "feedbackType": "correct" | "partial" | "misconception",
  "feedback": "Your feedback message (1-2 sentences)",
  "misconceptionIdentified": "specific misconception if feedbackType is misconception, null otherwise",
  "targetStepId": number or null (if their reasoning suggests they should review a specific step)
}`

    const userMessage = `Please evaluate the student's reasoning for this ${checkType} check.

Student's Prediction: "${studentPrediction}"
Student's Reasoning: "${studentReasoning}"

Is their physical reasoning sound?`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    // Increment quota
    serverQuotaService.incrementQuota(authContext.userId, 'hints')

    // Parse response
    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    let result: VerifyReasoningResponse
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        result = {
          reasoningValid: Boolean(parsed.reasoningValid),
          feedbackType: parsed.feedbackType || (parsed.reasoningValid ? 'correct' : 'misconception'),
          feedback: parsed.feedback || 'Your reasoning has been evaluated.',
          misconceptionIdentified: parsed.misconceptionIdentified || undefined,
          targetStepId: parsed.targetStepId || undefined,
        }
      } else {
        // Fallback: if no JSON, assume incorrect
        result = {
          reasoningValid: false,
          feedbackType: 'partial',
          feedback: content.text.slice(0, 200),
        }
      }
    } catch (parseError) {
      console.error('Error parsing Claude response:', parseError)
      result = {
        reasoningValid: false,
        feedbackType: 'partial',
        feedback: 'Could not evaluate your reasoning. Please try rephrasing.',
      }
    }

    const duration = Date.now() - startTime
    console.log(`[${authContext.userId}] Reasoning verified in ${duration}ms - Valid: ${result.reasoningValid}`)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in verify-reasoning:', error)
    return NextResponse.json(
      { error: 'Failed to verify reasoning' },
      { status: 500 }
    )
  }
}
