import { NextRequest, NextResponse } from 'next/server'
import questionsData from '@/data/questions.json'
import type { Question, QuestionTrack } from '@/types/studyPath'
import { questionMatchesTrack, selectWithTrackFallback } from '@/types/studyPath'

const VALID_TRACKS: QuestionTrack[] = ['foundation1', 'foundation2', 'intermediate', 'competitive']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackParam = searchParams.get('track')
    const useFallback = searchParams.get('fallback') !== 'false' // Default to true

    const allQuestions = questionsData.questions as Question[]

    // Filter by track if specified
    if (trackParam && VALID_TRACKS.includes(trackParam as QuestionTrack)) {
      const track = trackParam as QuestionTrack

      if (useFallback) {
        // Use fallback chain if no questions found for requested track
        const result = selectWithTrackFallback(allQuestions, track, questionMatchesTrack)
        return NextResponse.json({
          questions: result.items,
          requestedTrack: result.requestedTrack,
          actualTrack: result.actualTrack,
          usedFallback: result.usedFallback,
          fallbackMessage: result.fallbackMessage,
        })
      } else {
        // Strict filtering without fallback
        const questions = allQuestions.filter(q => questionMatchesTrack(q, track))
        return NextResponse.json({
          questions,
          requestedTrack: track,
          actualTrack: track,
          usedFallback: false,
        })
      }
    }

    // No track filter - return all questions
    return NextResponse.json({ questions: allQuestions })
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}
