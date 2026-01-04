import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateAuthHeader, unauthorizedResponse, quotaExceededResponse } from '@/lib/auth/apiAuth'
import { serverQuotaService } from '@/lib/auth/serverQuotaService'
import { DEFAULT_QUOTA_LIMITS } from '@/types/auth'
import type { ExplainToFriendRequest, ExplainToFriendResponse } from '@/types/explainToFriend'

// Create client lazily to ensure env vars are available in serverless context
function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    // Auth check - optional in development
    const authContext = validateAuthHeader(request)
    const userId = authContext?.userId || 'anonymous'

    // Quota check - skip if no auth context (development mode)
    if (authContext && !serverQuotaService.checkQuota(authContext.userId, 'reflections')) {
      return quotaExceededResponse('explanation assessments', DEFAULT_QUOTA_LIMITS.dailyReflections)
    }

    const body: ExplainToFriendRequest = await request.json()
    const { problemText, explanation, steps, topic } = body

    console.log(`[${userId}] Assessing Feynman explanation...`)
    const startTime = Date.now()

    // Build assessment prompt
    const stepsText = steps.map((s, i) => `${i + 1}. ${s}`).join('\n')

    const prompt = `You are an expert IIT-JEE Physics teacher assessing a student's explanation of a physics problem solution.

## Problem
${problemText}

## Solution Steps
${stepsText}

## Topic
${topic}

## Student's Explanation (3 lines)
${explanation}

## Your Task
Assess if the student truly understands the solution by evaluating their 3-line explanation.

### Quality Criteria:
- **Excellent**: Clear, accurate, demonstrates deep understanding. Uses correct terminology. Could teach a peer.
- **Good**: Mostly correct, minor gaps. Adequate for basic understanding.
- **Needs Work**: Missing key concepts, unclear, or shows misconceptions.

### Respond with JSON:
{
  "quality": "excellent" | "good" | "needs_work",
  "feedback": "2-3 sentence assessment of their understanding",
  "suggestions": ["Specific improvement 1", "Specific improvement 2"] (optional, if needs_work),
  "canProceed": true/false
}

Rules:
- "excellent" and "good" → canProceed: true
- "needs_work" → canProceed: false (they should try again)
- Be encouraging but honest
- Focus on conceptual understanding, not writing style
- Check if they mention the key physical principles

Respond with ONLY valid JSON.`

    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const textContent = response.content[0]
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse JSON response with fallback
    let assessment: ExplainToFriendResponse
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)

    if (jsonMatch) {
      try {
        assessment = JSON.parse(jsonMatch[0])
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Raw text:', textContent.text.substring(0, 500))
        // Fallback response
        assessment = {
          quality: 'good',
          feedback: 'Your explanation shows understanding of the key concepts. Keep practicing to refine your explanations further.',
          canProceed: true,
        }
      }
    } else {
      console.error('No JSON found in response:', textContent.text.substring(0, 500))
      // Fallback response
      assessment = {
        quality: 'good',
        feedback: 'Your explanation shows understanding of the key concepts. Keep practicing to refine your explanations further.',
        canProceed: true,
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[${userId}] Explanation assessed as "${assessment.quality}" in ${duration}s`)

    // Increment quota if authenticated
    if (authContext) {
      serverQuotaService.incrementQuota(authContext.userId, 'reflections')
    }

    return NextResponse.json(assessment)
  } catch (error) {
    console.error('Error in explain-to-friend:', error)
    return NextResponse.json(
      {
        error: 'Failed to assess explanation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
