import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type {
  SocraticAnalyzeRequest,
  SocraticAnalyzeResponse,
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  ChatMessage,
} from '@/types/socraticTutor'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Generate initial comprehension questions for a step
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const problemText = searchParams.get('problemText') || ''
    const stepTitle = searchParams.get('stepTitle') || ''
    const stepContent = searchParams.get('stepContent') || ''
    const concepts = searchParams.get('concepts') || ''

    const prompt = `You are a Socratic physics tutor. Generate 1-2 short comprehension questions to check if a student truly understands a physics step they just completed.

## Problem
${problemText}

## Step: ${stepTitle}
${stepContent}

## Key Concepts
${concepts}

## Your Task
Generate 1-2 quick comprehension questions that:
1. Test understanding, not just recall
2. Focus on the "why" not just the "what"
3. Can be answered in 1-2 sentences
4. Reveal common misconceptions if answered incorrectly

### Respond with JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "Your first question here?",
      "hint": "A small hint if they struggle"
    }
  ]
}

Rules:
- Keep questions concise (under 25 words each)
- Make them specific to this step, not generic
- Respond with ONLY valid JSON`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      temperature: 0.3,
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

    const result: GenerateQuestionsResponse = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating questions:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}

// Analyze student answer and generate follow-up if needed
export async function POST(request: NextRequest) {
  try {
    const body: SocraticAnalyzeRequest = await request.json()
    const {
      problemText,
      stepTitle,
      stepContent,
      requiredConcepts,
      question,
      studentAnswer,
      chatHistory = [],
    } = body

    // Format chat history for context
    const historyText = chatHistory.length > 0
      ? `\n## Conversation History\n${chatHistory.map(m =>
          `${m.role === 'professor' ? 'Professor' : 'Student'}: ${m.content}`
        ).join('\n')}\n`
      : ''

    const prompt = `You are a warm, encouraging Socratic physics professor having a live tutoring conversation. Analyze the student's answer and guide them toward understanding.

## Problem
${problemText}

## Step: ${stepTitle}
${stepContent}

## Key Concepts
${requiredConcepts.join(', ')}
${historyText}
## Current Question
${question}

## Student's Answer
${studentAnswer}

## Your Task
1. Analyze if the student's answer shows genuine understanding
2. If correct: Celebrate briefly and confirm understanding
3. If incorrect/partial: Ask a gentle follow-up question to guide them

### Respond with JSON:
{
  "analysis": {
    "isCorrect": true/false,
    "understanding": "full" | "partial" | "misconception" | "unclear",
    "feedback": "Brief encouraging feedback",
    "followUpQuestion": "If not resolved, your next Socratic question",
    "conceptGaps": ["List any concepts they seem to misunderstand"]
  },
  "isResolved": true/false,
  "encouragement": "If resolved, a celebratory message"
}

## Personality Rules
- Be warm and encouraging, never condescending
- Use phrases like "Good thinking!", "You're on the right track!", "Almost there!"
- If wrong, never say "wrong" - instead say "Let's think about this..."
- Ask questions that lead to discovery, don't just give answers
- Keep follow-up questions short and focused
- After 2-3 successful exchanges, mark as resolved
- When resolved, be genuinely celebratory!

Respond with ONLY valid JSON.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      temperature: 0.4,
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

    const result: SocraticAnalyzeResponse = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error analyzing answer:', error)
    return NextResponse.json(
      { error: 'Failed to analyze answer' },
      { status: 500 }
    )
  }
}
