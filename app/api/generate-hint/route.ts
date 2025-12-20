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
    if (!serverQuotaService.checkQuota(authContext.userId, 'hints')) {
      return quotaExceededResponse('hint generations', DEFAULT_QUOTA_LIMITS.dailyHints)
    }

    const body = await request.json()
    const { problemText, stepTitle, stepHints, level } = body

    if (!problemText || !stepTitle || level < 4 || level > 5) {
      return NextResponse.json(
        { error: 'Invalid parameters' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      )
    }

    const hintPrompt = `You are an expert IIT-JEE Physics teacher generating a hint for a problem-solving step.

PROBLEM: ${problemText}

STEP: ${stepTitle}

PREVIOUS HINTS PROVIDED:
${stepHints.map((h: any) => `Level ${h.level} (${h.title}): ${h.content}`).join('\n')}

YOUR TASK:
Generate Level ${level} hint for this step.

${level === 4 ? `Level 4 - Structural Equation:
• Show the governing equation(s) symbolically WITHOUT numbers
• Use LaTeX notation: $$\\sum F = ma$$
• Provide the mathematical framework but let student fill in specifics
• Keep it concise (1-2 sentences max)` : `Level 5 - Full Solution:
• Provide complete step-by-step solution for this milestone
• Include all mathematical steps and reasoning
• Be thorough but concise (3-4 sentences max)
• This is the "last resort" hint`}

RULES:
- Single line JSON string (no newlines within content)
- Use \\n for line breaks if needed
- Escape quotes with \\"
- Be concise and clear

Output ONLY valid JSON:
{
  "level": ${level},
  "title": "${level === 4 ? 'Structural Equation' : 'Full Solution'}",
  "content": "Your hint content here"
}

Respond with ONLY the JSON, no other text.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: hintPrompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]+\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText

    try {
      const hint = JSON.parse(jsonStr)

      // Increment quota after successful generation
      serverQuotaService.incrementQuota(authContext.userId, 'hints')

      return NextResponse.json(hint)
    } catch (error) {
      console.error('Failed to parse hint JSON:', error)
      return NextResponse.json(
        { error: 'Failed to generate hint' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error generating hint:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate hint',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
