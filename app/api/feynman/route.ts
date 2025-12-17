import { NextRequest, NextResponse } from 'next/server'
import { generateFeynmanScript } from '@/lib/feynmanScriptwriter'
import type { FeynmanRequest } from '@/types/feynman'

export async function POST(request: NextRequest) {
  try {
    const body: FeynmanRequest = await request.json()
    const { concept, context } = body

    if (!concept || !context) {
      return NextResponse.json(
        { error: 'Concept and context are required' },
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

    // Generate Feynman script
    const script = await generateFeynmanScript(body)

    return NextResponse.json(script)
  } catch (error) {
    console.error('Error generating Feynman script:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate Feynman script',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
