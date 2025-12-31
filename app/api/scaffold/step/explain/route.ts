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
  detailed?: boolean  // Request structured detailed explanation
}

export interface StructuredExplanation {
  purpose: string           // Why this step exists
  connection: string        // How it connects to previous/next steps
  conceptImportance: string // Why these concepts matter here
  commonMistakes: string    // What students often miss
  insight: string           // Key insight to take away
}

export interface StepExplainResponse {
  success: boolean
  explanation?: string              // Simple text explanation (default)
  structured?: StructuredExplanation  // Detailed structured explanation
  quickSummary?: string             // One-line summary
  error?: string
}

const SIMPLE_PROMPT = `You are helping a physics student understand WHY a particular step matters in solving a problem.

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

const DETAILED_PROMPT = `You are an expert physics tutor explaining WHY a particular step matters in solving a problem.

Your goal is to help students understand the PEDAGOGICAL PURPOSE of each step - not just what to do, but why it's important in the problem-solving process.

Problem: {problemText}

Step being explained: "{stepTitle}" (Step {stepPosition} of {totalSteps})
Step type: {stepType}
Concepts involved: {concepts}
{contextInfo}

Provide a structured explanation in JSON format:
{
  "purpose": "1-2 sentences on why this step exists in the solution",
  "connection": "1-2 sentences on how it connects to previous work and sets up what follows",
  "conceptImportance": "1-2 sentences on why the concepts used here are crucial",
  "commonMistakes": "1 sentence on what students often overlook or get wrong here",
  "insight": "1 sentence - the key takeaway or 'aha' moment",
  "quickSummary": "One short sentence summarizing why this step matters"
}

Be encouraging, use "you" to address the student, and focus on building intuition.`

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
      nextStepTitle,
      detailed = false
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

    const promptTemplate = detailed ? DETAILED_PROMPT : SIMPLE_PROMPT
    const prompt = promptTemplate
      .replace('{problemText}', problemText.substring(0, 500)) // Limit problem length
      .replace('{stepTitle}', stepTitle)
      .replace('{stepPosition}', String(stepPosition))
      .replace('{totalSteps}', String(totalSteps))
      .replace('{stepType}', stepType.replace(/_/g, ' '))
      .replace('{concepts}', requiredConcepts.length > 0 ? requiredConcepts.join(', ') : 'general physics')
      .replace('{contextInfo}', contextInfo || 'No adjacent step context available')

    const client = new Anthropic()

    const response = await client.messages.create({
      model: detailed ? 'claude-sonnet-4-20250514' : 'claude-3-5-haiku-20241022',
      max_tokens: detailed ? 600 : 200,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : ''

    if (detailed) {
      // Parse JSON response for detailed mode
      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0])
          return NextResponse.json({
            success: true,
            structured: {
              purpose: parsed.purpose || '',
              connection: parsed.connection || '',
              conceptImportance: parsed.conceptImportance || '',
              commonMistakes: parsed.commonMistakes || '',
              insight: parsed.insight || '',
            },
            quickSummary: parsed.quickSummary || '',
            explanation: parsed.purpose // Fallback for simple mode consumers
          } as StepExplainResponse)
        }
      } catch {
        // Fall back to simple mode if JSON parsing fails
      }
    }

    return NextResponse.json({
      success: true,
      explanation: responseText
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
