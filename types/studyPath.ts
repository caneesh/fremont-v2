import type { PatternOption } from './patternFirst'
import type { TimePressureConfig } from './timePressure'

/**
 * Track/level types for question filtering
 */
export type QuestionTrack = 'foundation1' | 'foundation2' | 'intermediate' | 'competitive'

export interface Question {
  id: string
  title: string
  statement: string
  topic: string
  subtopic: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  track?: QuestionTrack // Optional - derived from difficulty if not set
  concepts: string[]
  expectedTime: number // in minutes
  source?: string
  year?: number
  // Time-pressure training (optional)
  patterns?: PatternOption[]
  primaryPatternId?: string
  timePressure?: TimePressureConfig
}

/**
 * Maps difficulty levels to tracks
 * Easy -> foundation1, foundation2
 * Medium -> intermediate
 * Hard -> competitive
 */
export function difficultyToTracks(difficulty: Question['difficulty']): QuestionTrack[] {
  switch (difficulty) {
    case 'Easy':
      return ['foundation1', 'foundation2']
    case 'Medium':
      return ['foundation2', 'intermediate']
    case 'Hard':
      return ['intermediate', 'competitive']
  }
}

/**
 * Check if a question matches a track
 */
export function questionMatchesTrack(question: Question, track: QuestionTrack): boolean {
  // If question has explicit track, use it
  if (question.track) {
    return question.track === track
  }
  // Otherwise derive from difficulty
  const matchingTracks = difficultyToTracks(question.difficulty)
  return matchingTracks.includes(track)
}

export interface Topic {
  id: string
  name: string
  description: string
  icon: string
  subtopics: Subtopic[]
  totalQuestions: number
  order: number
}

export interface Subtopic {
  id: string
  name: string
  description: string
  questions: string[] // question IDs
}

export interface StudyProgress {
  topicId: string
  questionsAttempted: string[]
  questionsSolved: string[]
  lastAccessedAt: string
  timeSpent: number // in minutes
}

export interface StudyStats {
  totalQuestionsAttempted: number
  totalQuestionsSolved: number
  totalTimeSpent: number
  topicProgress: Record<string, StudyProgress>
  strengthAreas: string[]
  weakAreas: string[]
}
