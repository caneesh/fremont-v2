import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Create client lazily to ensure env vars are available in serverless context
function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

interface HintVerificationRequest {
  stepContent: string
  problemText: string
  concepts: string[]
  hintLevel: number
  hintContent?: string
}

const HINT_LEVEL_NAMES: Record<number, string> = {
  1: 'Concept',
  2: 'Visual',
  3: 'Strategy',
  4: 'Equation',
  5: 'Solution',
}

/**
 * Generate a Socratic question to verify understanding after viewing a hint
 */
export async function POST(request: NextRequest) {
  try {
    const body: HintVerificationRequest = await request.json()
    const {
      stepContent,
      problemText,
      concepts,
      hintLevel,
      hintContent,
    } = body

    const levelName = HINT_LEVEL_NAMES[hintLevel] || 'hint'

    const prompt = `You are a warm, encouraging Socratic guide. Generate a quick verification question after a student viewed a hint.

## Problem
${problemText}

## Step Content
${stepContent}

## Key Concepts
${concepts.join(', ')}

## Hint Level: ${hintLevel} (${levelName})
${hintContent ? `Hint content: ${hintContent}` : ''}

## Your Task
Generate a brief, friendly question that checks if the student understood the hint.

The question should:
1. Be quick to answer (1-2 sentences)
2. Test understanding, not just recall
3. Use warm, non-threatening language
4. Feel like a natural conversation, not a test

Good examples:
- "Now that you've seen this hint, can you explain in your own words why this approach works?"
- "Got it! Quick check - what's the key insight from this hint that helps us move forward?"
- "Nice! Can you tell me how this applies to our specific problem?"

Bad examples (too formal/intimidating):
- "State the principle shown in the hint."
- "List the steps required."
- "Define the concept."

### Respond with JSON:
{
  "question": "Your verification question"
}

Keep it conversational and encouraging. 1 sentence max.

Respond with ONLY valid JSON.`

    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 200,
      temperature: 0.5,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content[0]
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON')
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating verification question:', error)
    // Return a sensible fallback
    return NextResponse.json({
      question: "Can you explain in your own words what this hint is telling you?",
    })
  }
}
