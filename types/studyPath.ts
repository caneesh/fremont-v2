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

/**
 * Track fallback chain - defines which tracks to try if preferred track has no questions
 *
 * foundation1 -> foundation2 -> intermediate
 * foundation2 -> intermediate -> foundation1
 * intermediate -> foundation2 -> competitive
 * competitive -> intermediate -> foundation2
 */
export function getTrackFallbackChain(track: QuestionTrack): QuestionTrack[] {
  switch (track) {
    case 'foundation1':
      return ['foundation1', 'foundation2', 'intermediate']
    case 'foundation2':
      return ['foundation2', 'intermediate', 'foundation1']
    case 'intermediate':
      return ['intermediate', 'foundation2', 'competitive']
    case 'competitive':
      return ['competitive', 'intermediate', 'foundation2']
  }
}

/**
 * Get fallback track name for display
 */
export function getTrackDisplayName(track: QuestionTrack): string {
  switch (track) {
    case 'foundation1':
      return 'Foundation 1'
    case 'foundation2':
      return 'Foundation 2'
    case 'intermediate':
      return 'Intermediate'
    case 'competitive':
      return 'Competitive'
  }
}

/**
 * Result of track-aware question selection
 */
export interface TrackSelectionResult<T> {
  items: T[]
  requestedTrack: QuestionTrack
  actualTrack: QuestionTrack
  usedFallback: boolean
  fallbackMessage?: string
}

/**
 * Select items with track fallback
 * Returns items from first non-empty track in fallback chain
 */
export function selectWithTrackFallback<T>(
  items: T[],
  requestedTrack: QuestionTrack,
  matchFn: (item: T, track: QuestionTrack) => boolean
): TrackSelectionResult<T> {
  const fallbackChain = getTrackFallbackChain(requestedTrack)

  for (const track of fallbackChain) {
    const matchingItems = items.filter(item => matchFn(item, track))
    if (matchingItems.length > 0) {
      const usedFallback = track !== requestedTrack
      return {
        items: matchingItems,
        requestedTrack,
        actualTrack: track,
        usedFallback,
        fallbackMessage: usedFallback
          ? `No ${getTrackDisplayName(requestedTrack)} questions found; showing ${getTrackDisplayName(track)} instead`
          : undefined,
      }
    }
  }

  // No items found in any track
  return {
    items: [],
    requestedTrack,
    actualTrack: requestedTrack,
    usedFallback: false,
    fallbackMessage: `No questions available for ${getTrackDisplayName(requestedTrack)} or fallback tracks`,
  }
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
