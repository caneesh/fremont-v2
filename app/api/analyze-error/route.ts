import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateAuthHeader, unauthorizedResponse, quotaExceededResponse } from '@/lib/auth/apiAuth'
import { serverQuotaService } from '@/lib/auth/serverQuotaService'
import { DEFAULT_QUOTA_LIMITS } from '@/types/auth'
import type { ErrorAnalysisRequest, ErrorAnalysisResponse } from '@/types/errorPatterns'
import { COMMON_ERROR_PATTERNS } from '@/types/errorPatterns'

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

    // Quota check - using a small quota for error analysis
    if (!serverQuotaService.checkQuota(authContext.userId, 'reflections')) {
      return quotaExceededResponse('error analyses', DEFAULT_QUOTA_LIMITS.dailyReflections)
    }

    const body: ErrorAnalysisRequest = await request.json()
    const { problemText, studentAttempt, correctApproach, topic, hintsUsed } = body

    console.log(`[${authContext.userId}] Analyzing error pattern...`)
    const startTime = Date.now()

    // Build context about known error patterns
    const patternDescriptions = COMMON_ERROR_PATTERNS.map((p, idx) =>
      `${idx + 1}. **${p.id}**: ${p.title}\n   - ${p.description}`
    ).join('\n\n')

    const prompt = `You are an expert IIT-JEE Physics teacher analyzing a student's mistake to identify recurring error patterns.

## Problem
${problemText}

## Student's Attempt
${studentAttempt}

## Correct Approach
${correctApproach}

## Context
- Topic: ${topic}
- Hints Used: ${hintsUsed}

## Known Error Patterns
${patternDescriptions}

## Your Task
1. Analyze what fundamental mistake(s) the student made
2. Match the mistake to one or more error patterns from the list above
3. Provide confidence (0-1) for each pattern match
4. Give specific, actionable recommendations

## Response Format (JSON)
{
  "patterns": [
    {
      "patternId": "EP001",
      "confidence": 0.85,
      "reasoning": "Student attempted energy approach but problem requires instantaneous force..."
    }
  ],
  "summary": "Brief description of the core mistake",
  "recommendations": [
    "Specific actionable advice 1",
    "Specific actionable advice 2"
  ]
}

Analyze the student's error and respond with ONLY valid JSON.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3, // Lower temperature for more consistent classification
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

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Claude response')
    }

    const analysis: ErrorAnalysisResponse = JSON.parse(jsonMatch[0])

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[${authContext.userId}] Error analysis complete in ${duration}s`)
    console.log(`[${authContext.userId}] Identified patterns:`, analysis.patterns.map(p => p.patternId))

    // Increment quota
    serverQuotaService.incrementQuota(authContext.userId, 'reflections')

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Error in analyze-error:', error)
    return NextResponse.json(
      {
        error: 'Failed to analyze error pattern',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
