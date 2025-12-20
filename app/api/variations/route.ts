import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { problemText, coreConcept } = body

    if (!problemText) {
      return NextResponse.json(
        { error: 'Problem text is required' },
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

    const variationPrompt = `You are an expert IIT-JEE Physics teacher with 20+ years of experience.
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

You generate new problems that test the SAME concept
without repeating surface structure.
No solutions, only problem statements.

Original Problem:
${problemText}
${coreConcept ? `\nCore Concept Being Tested: ${coreConcept}` : ''}

YOUR TASK:
Generate EXACTLY 2 new problems that:
- Test the same core physics concept as the original
- Change conditions, constraints, or setup (different scenario/context)
- Are appropriate for IIT-JEE level difficulty
- Are completely solvable and well-defined
- Use different numerical values or geometric configurations

CRITICAL RULES:
- Do NOT include solutions or answers
- Do NOT include hints or guidance
- Only provide the problem statement itself
- Make each variation test the concept from a different angle
- Ensure problems are realistic and physically meaningful
- Use proper physics notation and units

For each variation, also provide a brief 1-sentence explanation of what changed.

Examples of GOOD variations (if original is "Block on incline"):
- "A wedge accelerating horizontally" (changed reference frame)
- "Multiple blocks connected by strings on incline" (increased complexity)
- "Block on incline with applied force at angle" (added external force)

Examples of BAD variations:
- "Block on incline with angle 45° instead of 30°" (only changed numbers - too similar)
- "Same block problem but solve for tension" (same setup, just different question)

Output your response as valid JSON with this EXACT structure:
{
  "variations": [
    {
      "problemStatement": "Full problem statement here with all necessary information.",
      "whyDifferent": "One sentence explaining what changed from the original."
    },
    {
      "problemStatement": "Second variation problem statement here.",
      "whyDifferent": "One sentence explaining what changed from the original."
    }
  ]
}

Respond with ONLY the JSON, no other text.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: variationPrompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]+\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText

    try {
      const variationData = JSON.parse(jsonStr)
      return NextResponse.json(variationData)
    } catch (error) {
      console.error('Failed to parse variation JSON:', error)
      return NextResponse.json(
        { error: 'Failed to generate proper problem variations' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error generating variations:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate problem variations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
