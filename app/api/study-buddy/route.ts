import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateAuthHeader, unauthorizedResponse, quotaExceededResponse } from '@/lib/auth/apiAuth'
import { serverQuotaService } from '@/lib/auth/serverQuotaService'
import { DEFAULT_QUOTA_LIMITS } from '@/types/auth'
import type { StudyBuddyRequest, StudyBuddyResponse } from '@/types/explainToFriend'

// Create client lazily to ensure env vars are available in serverless context
function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

export async function POST(request: NextRequest) {
  try {
    const authContext = validateAuthHeader(request)
    if (!authContext) {
      return unauthorizedResponse()
    }

    if (!serverQuotaService.checkQuota(authContext.userId, 'reflections')) {
      return quotaExceededResponse('study buddy questions', DEFAULT_QUOTA_LIMITS.dailyReflections)
    }

    const body: StudyBuddyRequest = await request.json()
    const { problemText, explanation, steps, topic } = body

    console.log(`[${authContext.userId}] Generating study buddy questions...`)
    const startTime = Date.now()

    const stepsText = steps.map((s, i) => `${i + 1}. ${s}`).join('\n')

    const prompt = `You are a curious peer with beginner-level physics knowledge. Your job is to ask naive, clarifying questions about a student's explanation so they are forced to explain the solution more clearly.

## Problem
${problemText}

## Solution Steps
${stepsText}

## Topic
${topic}

## Student's Explanation (3 lines)
${explanation}

## Your Task
Ask 3-5 short, naive questions that probe gaps or unclear reasoning. Focus on definitions, why steps work, and missing assumptions.

### Respond with JSON:
{
  "questions": ["Question 1", "Question 2", "Question 3"]
}

Rules:
- Do not answer the questions
- Keep each question under 20 words
- Make sure questions are concrete, not generic
- Respond with ONLY valid JSON.`

    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      temperature: 0.4,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const textContent = response.content[0]
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Claude response')
    }

    const buddyResponse: StudyBuddyResponse = JSON.parse(jsonMatch[0])

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[${authContext.userId}] Study buddy questions generated in ${duration}s`)

    serverQuotaService.incrementQuota(authContext.userId, 'reflections')

    return NextResponse.json(buddyResponse)
  } catch (error) {
    console.error('Error in study-buddy:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate study buddy questions',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
