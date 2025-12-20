import { NextResponse } from 'next/server'
import questionsData from '@/data/questions.json'

export async function GET() {
  try {
    return NextResponse.json(questionsData)
  } catch (error) {
    console.error('Error fetching questions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    )
  }
}
