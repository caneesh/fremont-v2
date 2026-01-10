import { NextRequest, NextResponse } from 'next/server'
import questionsData from '@/data/questions.json'
import type { Question, QuestionTrack } from '@/types/studyPath'
import { questionMatchesTrack } from '@/types/studyPath'

const VALID_TRACKS: QuestionTrack[] = ['foundation1', 'foundation2', 'intermediate', 'competitive']

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const trackParam = searchParams.get('track')

    let questions = questionsData.questions as Question[]

    // Filter by track if specified
    if (trackParam && VALID_TRACKS.includes(trackParam as QuestionTrack)) {
      const track = trackParam as QuestionTrack
      questions = questions.filter(q => questionMatchesTrack(q, track))
    }

    return NextResponse.json({ questions })
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}
