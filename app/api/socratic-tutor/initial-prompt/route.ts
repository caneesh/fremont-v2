import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getTrackFromQuery, logTrackUsage } from '@/lib/server/getTrackFromRequest'
import {
  buildSocraticQuestionPrompt,
  containsEquationsForF1,
  adaptQuestionsForF1,
} from '@/lib/server/trackAwarePrompts'

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

    // Extract track from query params for track-specific behavior
    const track = getTrackFromQuery(request)
    logTrackUsage('/api/socratic-tutor/initial-prompt', track, searchParams.has('track') ? 'query' : 'default')

    // Build track-aware system prompt
    const trackPrompt = buildSocraticQuestionPrompt(track)

    // Track-specific question format instructions
    const questionFormatInstructions = track === 'foundation1'
      ? `Generate exactly 3 questions in this order:
1. **MCQ (multiple_choice)**: A conceptual question with 4 options. NO equations. Focus on "what happens when" or "which is greater".
2. **Conceptual completion (fill_blank)**: A word or phrase completion (NOT an equation). E.g., "The force that opposes motion is called ___".
3. **Open-ended (open_ended)**: A warm thinking prompt that encourages physical intuition.

CRITICAL: NO equations, NO LaTeX, NO mathematical notation.`
      : `Generate exactly 3 questions in this order:
1. **MCQ (multiple_choice)**: A conceptual question with 4 options (a, b, c, d). Exactly one should be correct.
2. **Fill-in-the-blank (fill_blank)**: An equation or short answer question. Use LaTeX for math (e.g., $F = ma$).
3. **Open-ended (open_ended)**: A warm thinking prompt that encourages reflection.

Guidelines:
- Use LaTeX for math: $...$ for inline, $$...$$ for display`

    const prompt = `${trackPrompt}

## Problem
${problemText}

## Current Step: ${stepTitle}
${stepContent}

## Key Concepts
${concepts}

## Your Task
${questionFormatInstructions}

General guidelines:
- Be warm and encouraging, never intimidating
- MCQ options should test understanding, not just memory
- Open-ended should invite genuine exploration

### Respond with JSON:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Your question here?",
      "options": [
        {"id": "a", "text": "Option A", "isCorrect": false},
        {"id": "b", "text": "Option B", "isCorrect": true},
        {"id": "c", "text": "Option C", "isCorrect": false},
        {"id": "d", "text": "Option D", "isCorrect": false}
      ]
    },
    {
      "type": "fill_blank",
      "question": "Your fill-in question here ___",
      "blankAnswer": "answer"
    },
    {
      "type": "open_ended",
      "question": "Your open-ended question?"
    }
  ]
}

Respond with ONLY valid JSON.`

    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500, // Increased from 1000 to avoid truncation
      temperature: 0.6,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content[0]
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Check if response was truncated
    if (response.stop_reason === 'max_tokens') {
      console.warn('Socratic initial-prompt: Response was truncated due to max_tokens')
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response')
    }

    // Wrap JSON.parse in try-catch to handle malformed/truncated JSON
    let result
    try {
      result = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse JSON response:', jsonMatch[0].substring(0, 200))
      throw new Error('Failed to parse JSON response from AI')
    }

    // Validate and ensure we have questions array
    if (!result.questions || !Array.isArray(result.questions)) {
      throw new Error('Invalid response format')
    }

    // Post-process for F1: ensure no equations slipped through
    if (track === 'foundation1') {
      result.questions = adaptQuestionsForF1(result.questions)
    }

    return NextResponse.json({ ...result, track })
  } catch (error) {
    console.error('Error generating questions:', error)

    const track = getTrackFromQuery(request)

    // Track-aware fallback questions
    if (track === 'foundation1') {
      return NextResponse.json({
        questions: [
          {
            type: 'multiple_choice',
            question: 'What physical concept is most relevant to this step?',
            options: [
              { id: 'a', text: 'Understanding the forces and their directions', isCorrect: true },
              { id: 'b', text: 'Memorizing formulas', isCorrect: false },
              { id: 'c', text: 'Guessing based on numbers', isCorrect: false },
              { id: 'd', text: 'Skipping to the answer', isCorrect: false },
            ],
          },
          {
            type: 'fill_blank',
            question: 'The physical principle that connects these quantities is called ___',
            blankAnswer: 'conservation of energy (or similar)',
          },
          {
            type: 'open_ended',
            question: "What's your intuition about this step? Describe in words what you think is happening physically.",
          },
        ],
        track,
        fallback: true,
      })
    }

    // Default fallback for other tracks
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
      track,
      fallback: true,
    })
  }
}
