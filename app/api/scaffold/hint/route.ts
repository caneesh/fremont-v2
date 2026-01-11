import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getTrackFromQuery, logTrackUsage } from '@/lib/server/getTrackFromRequest'
import {
  buildTrackAwareHintPrompt,
  getEffectiveHintLevel,
  postProcessHint,
  getF1SafeFallbackHint,
} from '@/lib/server/trackAwarePrompts'

const anthropic = new Anthropic()

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stepContent = searchParams.get('stepContent') || ''
    const problemText = searchParams.get('problemText') || ''
    const concepts = searchParams.get('concepts') || ''
    const requestedLevel = parseInt(searchParams.get('level') || '1', 10)

    // Check if user explicitly requested higher level (e.g., "show equations")
    const explicitRequest = searchParams.get('explicit') === 'true'

    // Extract track from query params for track-specific behavior
    const track = getTrackFromQuery(request)
    logTrackUsage('/api/scaffold/hint', track, searchParams.has('track') ? 'query' : 'default')

    if (!stepContent && !problemText) {
      return NextResponse.json(
        { error: 'Missing stepContent or problemText' },
        { status: 400 }
      )
    }

    // Apply track restrictions to hint level
    const { level: effectiveLevel, wasRestricted } = getEffectiveHintLevel(
      track,
      requestedLevel,
      explicitRequest
    )

    // Build track-aware system prompt
    const systemPrompt = buildTrackAwareHintPrompt(track, requestedLevel, effectiveLevel)

    const userPrompt = `Problem: ${problemText}

Step being worked on: ${stepContent}

Key concepts: ${concepts}

Generate a level ${effectiveLevel} hint to help the student progress.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    let hint = response.content[0].type === 'text'
      ? response.content[0].text
      : 'Think about what physics principle applies to this situation.'

    // Post-process hint to ensure track compliance (especially for F1)
    const { hint: processedHint, wasModified, reason } = postProcessHint(track, effectiveLevel, hint)
    hint = processedHint

    // Log if hint was modified for debugging
    if (wasModified) {
      console.log(`[scaffold/hint] Track ${track}: Hint was modified. Reason: ${reason}`)
    }

    return NextResponse.json({
      hint,
      level: effectiveLevel,
      requestedLevel,
      wasRestricted,
      track,
    })
  } catch (error) {
    console.error('Error generating hint:', error)

    // Track-aware fallback hints
    const track = getTrackFromQuery(request)
    const level = parseInt(request.nextUrl.searchParams.get('level') || '1', 10)

    // For F1, use safe fallbacks that don't contain equations
    if (track === 'foundation1') {
      return NextResponse.json({
        hint: getF1SafeFallbackHint(level),
        level,
        track,
        fallback: true,
      })
    }

    // Generic fallbacks for other tracks
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
      track,
      fallback: true,
    })
  }
}
