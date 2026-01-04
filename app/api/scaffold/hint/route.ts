import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

const HINT_LEVEL_DESCRIPTIONS: Record<number, { focus: string; style: string }> = {
  1: {
    focus: 'concept identification',
    style: 'Ask what physics principle or concept applies here. Don\'t give the answer, just point to the relevant concept.',
  },
  2: {
    focus: 'visualization',
    style: 'Help the student picture the physical setup. Describe what to visualize or draw.',
  },
  3: {
    focus: 'strategy',
    style: 'Outline the general approach without giving specific equations. What steps should they take?',
  },
  4: {
    focus: 'key equations',
    style: 'Provide the main equation(s) needed, with brief explanation of each term.',
  },
  5: {
    focus: 'full solution walkthrough',
    style: 'Give a complete step-by-step solution with explanations.',
  },
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stepContent = searchParams.get('stepContent') || ''
    const problemText = searchParams.get('problemText') || ''
    const concepts = searchParams.get('concepts') || ''
    const level = parseInt(searchParams.get('level') || '1', 10)

    if (!stepContent && !problemText) {
      return NextResponse.json(
        { error: 'Missing stepContent or problemText' },
        { status: 400 }
      )
    }

    const levelConfig = HINT_LEVEL_DESCRIPTIONS[level] || HINT_LEVEL_DESCRIPTIONS[1]

    const systemPrompt = `You are a warm, encouraging physics tutor helping a student who is stuck.
Generate a hint at level ${level} (${levelConfig.focus}).

Style guidelines:
- ${levelConfig.style}
- Be concise but helpful
- Use LaTeX for any math (wrap in $ or $$)
- Never be condescending
- Encourage the student

The hint should be 1-3 sentences for levels 1-3, more detailed for levels 4-5.`

    const userPrompt = `Problem: ${problemText}

Step being worked on: ${stepContent}

Key concepts: ${concepts}

Generate a level ${level} hint to help the student progress.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const hint = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Think about what physics principle applies to this situation.'

    return NextResponse.json({ hint, level })
  } catch (error) {
    console.error('Error generating hint:', error)

    // Fallback hints
    const level = parseInt(request.nextUrl.searchParams.get('level') || '1', 10)
    const fallbackHints: Record<number, string> = {
      1: 'What physics concept or principle applies to this situation?',
      2: 'Try drawing a diagram of the physical setup. What forces or quantities are involved?',
      3: 'Think about the sequence of steps: What do you know? What are you solving for? What connects them?',
      4: 'Consider the fundamental equations that relate the quantities in this problem.',
      5: 'Let\'s work through this step by step together.',
    }

    return NextResponse.json({
      hint: fallbackHints[level] || fallbackHints[1],
      level,
    })
  }
}
