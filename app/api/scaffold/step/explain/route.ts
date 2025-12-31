/**
 * API Route: /api/scaffold/step/explain
 *
 * Generates an on-demand explanation of why a specific step is important
 * in the problem-solving process.
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export interface StepExplainRequest {
  stepTitle: string
  stepType?: string
  problemText: string
  stepPosition: number  // 1-indexed position in the solution
  totalSteps: number
  requiredConcepts?: string[]
  previousStepTitle?: string
  nextStepTitle?: string
}

export interface StepExplainResponse {
  success: boolean
  explanation?: string
  error?: string
}

const EXPLAIN_PROMPT = `You are helping a physics student understand WHY a particular step matters in solving a problem.

Given the context below, provide a brief (2-3 sentence) explanation of:
1. Why this step is important at this point in the solution
2. What understanding it builds or what it sets up for later steps

Be encouraging and connect to the student's learning. Focus on the "why" not the "how".

Problem:
{problemText}

Step being explained: "{stepTitle}" (Step {stepPosition} of {totalSteps})
Step type: {stepType}
Concepts involved: {concepts}
{contextInfo}

Provide ONLY the explanation, no preamble or labels. Write directly to the student using "you".`

export async function POST(request: NextRequest) {
  try {
    const body: StepExplainRequest = await request.json()
    const {
      stepTitle,
      stepType = 'physics_concept',
      problemText,
      stepPosition,
      totalSteps,
      requiredConcepts = [],
      previousStepTitle,
      nextStepTitle
    } = body

    // Validate required fields
    if (!stepTitle || !problemText) {
      return NextResponse.json(
        { success: false, error: 'stepTitle and problemText are required' } as StepExplainResponse,
        { status: 400 }
      )
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Anthropic API key not configured' } as StepExplainResponse,
        { status: 500 }
      )
    }

    // Build context info
    let contextInfo = ''
    if (previousStepTitle) {
      contextInfo += `Previous step: "${previousStepTitle}"\n`
    }
    if (nextStepTitle) {
      contextInfo += `Next step: "${nextStepTitle}"`
    }

    const prompt = EXPLAIN_PROMPT
      .replace('{problemText}', problemText.substring(0, 500)) // Limit problem length
      .replace('{stepTitle}', stepTitle)
      .replace('{stepPosition}', String(stepPosition))
      .replace('{totalSteps}', String(totalSteps))
      .replace('{stepType}', stepType.replace(/_/g, ' '))
      .replace('{concepts}', requiredConcepts.length > 0 ? requiredConcepts.join(', ') : 'general physics')
      .replace('{contextInfo}', contextInfo || 'No adjacent step context available')

    const client = new Anthropic()

    const response = await client.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 200,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    const explanation = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : ''

    return NextResponse.json({
      success: true,
      explanation
    } as StepExplainResponse)
  } catch (error) {
    console.error('Error generating step explanation:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as StepExplainResponse,
      { status: 500 }
    )
  }
}
