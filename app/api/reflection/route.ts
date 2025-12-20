import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateAuthHeader, unauthorizedResponse, quotaExceededResponse } from '@/lib/auth/apiAuth'
import { serverQuotaService } from '@/lib/auth/serverQuotaService'
import { DEFAULT_QUOTA_LIMITS } from '@/types/auth'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authContext = validateAuthHeader(request)
    if (!authContext) {
      return unauthorizedResponse()
    }

    // Check quota
    if (!serverQuotaService.checkQuota(authContext.userId, 'reflections')) {
      return quotaExceededResponse('reflections', DEFAULT_QUOTA_LIMITS.dailyReflections)
    }

    const body = await request.json()
    const { problemText, studentOutcome, hintsUsed } = body

    if (!problemText || !studentOutcome) {
      return NextResponse.json(
        { error: 'Problem text and student outcome are required' },
        { status: 400 }
      )
    }

    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }

    // Determine the context based on student outcome and hint usage
    const maxHintLevel = hintsUsed?.length > 0 ? Math.max(...hintsUsed) : 0
    let outcomeDescription = ''

    if (studentOutcome === 'struggled' || maxHintLevel === 5) {
      outcomeDescription = 'The student needed the full solution (Level 5 hints) to complete this problem.'
    } else if (studentOutcome === 'assisted' || maxHintLevel >= 3) {
      outcomeDescription = 'The student needed strategic hints (Level 3-4) to complete this problem.'
    } else {
      outcomeDescription = 'The student solved this with minimal hints, using primarily conceptual guidance.'
    }

    const reflectionPrompt = `You are an expert IIT-JEE Physics teacher with 20+ years of experience.
Your goal is NOT to solve problems for the student, but to train their
thinking, intuition, and exam problem-solving ability.

Rules you MUST follow:
- Never jump directly to the final solution.
- Force the student to think before revealing help.
- Prefer conceptual prompts over calculations.
- Use simple, calm, teacher-like language.
- Explicitly warn about common mistakes when relevant.
- Treat struggle as productive; guide, don't replace thinking.
- Assume the real exam will never repeat the same question.

Tone:
- Calm, patient, authoritative
- No cheerleading, no emojis, no slang
- Sound like a senior physics teacher, not a chatbot

You are guiding the student to reflect on their thinking.
Reflection is mandatory and short.

Problem:
${problemText}

Student Outcome:
${outcomeDescription}

YOUR TASK:
Generate EXACTLY 2 short reflection questions that help the student:
1. Identify what they learned (conceptual understanding or problem-solving strategy)
2. Recognize their mistake, hesitation, or where they got stuck

CRITICAL RULES:
- Questions must be SHORT (1 sentence each)
- Focus on THINKING and LEARNING, not calculation
- Do NOT repeat the solution
- Do NOT ask about specific numbers or calculations
- Ask about concepts, intuition, approach, or mental blocks
- Make questions feel like a teacher checking understanding

Examples of GOOD questions:
- "What was the key concept you were missing before you understood this problem?"
- "If you saw a similar problem on the exam, what would you look for first?"
- "What made you hesitate when choosing your approach?"
- "Which step challenged your intuition the most, and why?"

Examples of BAD questions (too mechanical):
- "What was the acceleration you calculated?" (too specific)
- "Did you enjoy this problem?" (not learning-focused)
- "Can you solve it again?" (not reflective)

Output your response as valid JSON with this EXACT structure:
{
  "questions": [
    "First reflection question?",
    "Second reflection question?"
  ]
}

Respond with ONLY the JSON, no other text.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: reflectionPrompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]+\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText

    try {
      const reflectionData = JSON.parse(jsonStr)

      // Increment quota after successful generation
      serverQuotaService.incrementQuota(authContext.userId, 'reflections')

      return NextResponse.json(reflectionData)
    } catch (error) {
      console.error('Failed to parse reflection JSON:', error)
      return NextResponse.json(
        { error: 'Failed to generate proper reflection questions' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error generating reflection:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate reflection questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
