import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Create client lazily to ensure env vars are available in serverless context
function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

interface MCQOption {
  id: string
  text: string
  isCorrect: boolean
}

interface Question {
  type: 'multiple_choice' | 'fill_blank' | 'open_ended'
  question: string
  options?: MCQOption[]
  blankAnswer?: string
}

/**
 * Generate multiple questions for Socratic-first step interaction
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const stepTitle = searchParams.get('stepTitle') || ''
    const stepContent = searchParams.get('stepContent') || ''
    const problemText = searchParams.get('problemText') || ''
    const concepts = searchParams.get('concepts') || ''

    const prompt = `You are a warm, encouraging Socratic guide helping a physics student. Generate 3 questions to guide them through understanding this step.

## Problem
${problemText}

## Current Step: ${stepTitle}
${stepContent}

## Key Concepts
${concepts}

## Your Task
Generate exactly 3 questions in this order:
1. **MCQ (multiple_choice)**: A conceptual question with 4 options (a, b, c, d). Exactly one should be correct.
2. **Fill-in-the-blank (fill_blank)**: An equation or short answer question. Use LaTeX for math (e.g., $F = ma$).
3. **Open-ended (open_ended)**: A warm thinking prompt that encourages reflection.

Guidelines:
- Be warm and encouraging, never intimidating
- MCQ options should test understanding, not just memory
- Fill-blank should focus on a key relationship or value
- Open-ended should invite genuine exploration
- Use LaTeX for math: $...$ for inline, $$...$$ for display

### Respond with JSON:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Which principle best describes...?",
      "options": [
        {"id": "a", "text": "Option A", "isCorrect": false},
        {"id": "b", "text": "Option B", "isCorrect": true},
        {"id": "c", "text": "Option C", "isCorrect": false},
        {"id": "d", "text": "Option D", "isCorrect": false}
      ]
    },
    {
      "type": "fill_blank",
      "question": "If the mass is $m$ and acceleration is $a$, the force is F = ___",
      "blankAnswer": "$ma$"
    },
    {
      "type": "open_ended",
      "question": "What's your approach to this step?"
    }
  ]
}

Respond with ONLY valid JSON.`

    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 0.6,
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

    // Validate and ensure we have questions array
    if (!result.questions || !Array.isArray(result.questions)) {
      throw new Error('Invalid response format')
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating questions:', error)
    // Return sensible fallback questions
    return NextResponse.json({
      questions: [
        {
          type: 'multiple_choice',
          question: 'Which approach would be most helpful for this step?',
          options: [
            { id: 'a', text: 'Apply the relevant physics principle directly', isCorrect: true },
            { id: 'b', text: 'Skip to the final answer', isCorrect: false },
            { id: 'c', text: 'Ignore the given information', isCorrect: false },
            { id: 'd', text: 'Use trial and error', isCorrect: false },
          ],
        },
        {
          type: 'fill_blank',
          question: 'Think about the key relationship in this step. What connects the given quantities?',
          blankAnswer: 'equation',
        },
        {
          type: 'open_ended',
          question: "What's your approach to this step? Take a moment to think through how you'd tackle it.",
        },
      ],
    })
  }
}
