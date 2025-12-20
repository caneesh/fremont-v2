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
    if (!serverQuotaService.checkQuota(authContext.userId, 'prerequisites')) {
      return quotaExceededResponse('prerequisite checks', DEFAULT_QUOTA_LIMITS.dailyPrerequisites)
    }

    const body = await request.json()
    const { concepts } = body

    if (!concepts || !Array.isArray(concepts) || concepts.length === 0) {
      return NextResponse.json(
        { error: 'Concepts array is required' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }

    const conceptList = concepts.map(c => `- ${c.name}: ${c.definition}`).join('\n')

    const prerequisitePrompt = `You are an expert IIT-JEE Physics teacher with 20+ years of experience.

CONTEXT: Before a student tackles a challenging physics problem, you need to verify they understand the prerequisite concepts. If they don't grasp the fundamentals, they'll struggle unnecessarily.

CONCEPTS FOR UPCOMING PROBLEM:
${conceptList}

YOUR TASK:
Generate EXACTLY ${Math.min(concepts.length, 3)} quick prerequisite questions to verify conceptual understanding.

RULES FOR QUESTIONS:
- Focus on CONCEPTUAL understanding, NOT calculations
- Questions should be answerable in 10-20 seconds each
- Test whether student knows WHAT the concept means, not HOW to calculate
- Use simple, clear language (teacher-like, not chatbot-like)
- No cheerleading or emojis
- Make questions practical and exam-relevant

QUESTION TYPES:
1. Multiple-choice (4 options, one correct)
2. True-False with reasoning check
3. Short conceptual answer (one sentence expected)

For each question:
- Focus on a single concept
- Test core understanding or common misconception
- Include brief explanation of why it matters
- Keep it quick - this is a checkpoint, not a full test

Output ONLY valid JSON with this EXACT structure:
{
  "questions": [
    {
      "conceptId": "concept-id",
      "conceptName": "Concept Name",
      "question": "Clear, concise question testing core understanding?",
      "type": "multiple-choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "expectedAnswer": "Option B",
      "explanation": "This tests whether you understand that..."
    }
  ],
  "passingScore": ${Math.ceil(Math.min(concepts.length, 3) * 0.67)}
}

IMPORTANT:
- Generate ${Math.min(concepts.length, 3)} questions total
- Passing score should be 2 out of 3 (67%)
- All strings on single line (no newlines within strings)
- Use \\n for line breaks if needed in explanation
- For short-answer type, expectedAnswer is a brief phrase (not full sentence)

Respond with ONLY the JSON, no other text.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prerequisitePrompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    const jsonMatch = responseText.match(/\{[\s\S]+\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText

    try {
      const prerequisiteData = JSON.parse(jsonStr)

      // Increment quota after successful generation
      serverQuotaService.incrementQuota(authContext.userId, 'prerequisites')

      return NextResponse.json(prerequisiteData)
    } catch (error) {
      console.error('Failed to parse prerequisites JSON:', error)
      return NextResponse.json(
        { error: 'Failed to generate prerequisite questions' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error generating prerequisites:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate prerequisite questions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
