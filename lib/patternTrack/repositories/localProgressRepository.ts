/**
 * LocalStorage-based Progress Repository Implementation
 *
 * Stores user progress in browser localStorage.
 * Suitable for V1; can be replaced with API calls to Postgres in V2.
 */

import type {
  PatternProgress,
  LessonProgress,
  TrackProgress,
  PatternWithProgress,
  PatternPracticeEntry,
} from '../schema'
import type { IProgressRepository } from './interfaces'
import { JsonPatternRepository } from './jsonPatternRepository'

const STORAGE_KEYS = {
  PATTERN_PROGRESS: 'patterntrack_pattern_progress',
  LESSON_PROGRESS: 'patterntrack_lesson_progress',
  TRACK_PROGRESS: 'patterntrack_track_progress',
} as const

/**
 * Safe localStorage access for SSR
 */
function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

/**
 * Get data from localStorage with type safety
 */
function getStoredData<T>(key: string): T | null {
  const storage = getStorage()
  if (!storage) return null

  try {
    const data = storage.getItem(key)
    return data ? JSON.parse(data) : null
  } catch {
    return null
  }
}

/**
 * Set data in localStorage
 */
function setStoredData<T>(key: string, data: T): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
  }
}

/**
 * Calculate mastery level from progress stats
 */
function calculateMasteryLevel(progress: PatternProgress): number {
  if (progress.total_attempts === 0) return 0

  const successRate = progress.successful_identifications / progress.total_attempts
  const streakBonus = Math.min(progress.current_streak * 2, 20) // Up to 20 bonus points
  const falsePositivePenalty = Math.min(progress.false_positives * 5, 30) // Up to 30 penalty

  let mastery = (successRate * 80) + streakBonus - falsePositivePenalty
  mastery = Math.max(0, Math.min(100, mastery))

  return Math.round(mastery)
}

/**
 * Calculate next review date using SM-2-like algorithm
 */
function calculateNextReview(progress: PatternProgress): string {
  const now = new Date()
  let intervalDays: number

  if (progress.mastery_level >= 90) {
    intervalDays = 14 // 2 weeks for mastered patterns
  } else if (progress.mastery_level >= 70) {
    intervalDays = 7 // 1 week
  } else if (progress.mastery_level >= 50) {
    intervalDays = 3 // 3 days
  } else if (progress.mastery_level >= 30) {
    intervalDays = 1 // 1 day
  } else {
    intervalDays = 0 // Same day
  }

  // Adjust based on streak
  if (progress.current_streak >= 5) {
    intervalDays = Math.round(intervalDays * 1.5)
  }

  const nextReview = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)
  return nextReview.toISOString()
}

export class LocalProgressRepository implements IProgressRepository {
  private patternRepo = new JsonPatternRepository()

  // =========================================================================
  // Pattern Progress
  // =========================================================================

  async getPatternProgress(userId: string, patternId: string): Promise<PatternProgress | null> {
    const allProgress = getStoredData<Record<string, Record<string, PatternProgress>>>(
      STORAGE_KEYS.PATTERN_PROGRESS
    ) || {}

    return allProgress[userId]?.[patternId] || null
  }

  async getAllPatternProgress(userId: string): Promise<PatternProgress[]> {
    const allProgress = getStoredData<Record<string, Record<string, PatternProgress>>>(
      STORAGE_KEYS.PATTERN_PROGRESS
    ) || {}

    const userProgress = allProgress[userId] || {}
    return Object.values(userProgress)
  }

  async getPatternProgressByIds(userId: string, patternIds: string[]): Promise<PatternProgress[]> {
    const allProgress = getStoredData<Record<string, Record<string, PatternProgress>>>(
      STORAGE_KEYS.PATTERN_PROGRESS
    ) || {}

    const userProgress = allProgress[userId] || {}
    return patternIds
      .map(id => userProgress[id])
      .filter((p): p is PatternProgress => p !== undefined)
  }

  async updatePatternProgress(
    userId: string,
    patternId: string,
    update: Partial<PatternProgress>
  ): Promise<PatternProgress> {
    const allProgress = getStoredData<Record<string, Record<string, PatternProgress>>>(
      STORAGE_KEYS.PATTERN_PROGRESS
    ) || {}

    if (!allProgress[userId]) {
      allProgress[userId] = {}
    }

    const now = new Date().toISOString()
    const existing = allProgress[userId][patternId]

    const defaults: PatternProgress = {
      user_id: userId,
      pattern_id: patternId,
      mastery_level: 0,
      total_attempts: 0,
      successful_identifications: 0,
      missed_identifications: 0,
      false_positives: 0,
      current_streak: 0,
      best_streak: 0,
      last_practiced_at: now,
      next_review_at: now,
      practice_history: [],
      created_at: existing?.created_at || now,
      updated_at: now,
    }

    const updated: PatternProgress = Object.assign(
      {},
      defaults,
      existing,
      update,
      { user_id: userId, pattern_id: patternId, updated_at: now }
    )

    // Recalculate mastery and next review
    updated.mastery_level = calculateMasteryLevel(updated)
    updated.next_review_at = calculateNextReview(updated)

    allProgress[userId][patternId] = updated
    setStoredData(STORAGE_KEYS.PATTERN_PROGRESS, allProgress)

    return updated
  }

  async recordPatternAttempt(
    userId: string,
    patternId: string,
    questionId: string,
    identified: boolean,
    timeTaken: number,
    confidence?: 'low' | 'medium' | 'high'
  ): Promise<PatternProgress> {
    const existing = await this.getPatternProgress(userId, patternId)
    const now = new Date().toISOString()

    const entry: PatternPracticeEntry = {
      timestamp: now,
      question_id: questionId,
      identified_correctly: identified,
      time_taken_seconds: timeTaken,
      confidence,
    }

    const history = [...(existing?.practice_history || []), entry].slice(-100) // Keep last 100

    const update: Partial<PatternProgress> = {
      total_attempts: (existing?.total_attempts || 0) + 1,
      successful_identifications: (existing?.successful_identifications || 0) + (identified ? 1 : 0),
      missed_identifications: (existing?.missed_identifications || 0) + (identified ? 0 : 1),
      current_streak: identified ? (existing?.current_streak || 0) + 1 : 0,
      best_streak: identified
        ? Math.max((existing?.best_streak || 0), (existing?.current_streak || 0) + 1)
        : (existing?.best_streak || 0),
      last_practiced_at: now,
      practice_history: history,
    }

    return this.updatePatternProgress(userId, patternId, update)
  }

  // =========================================================================
  // Lesson Progress
  // =========================================================================

  async getLessonProgress(userId: string, lessonId: string): Promise<LessonProgress | null> {
    const allProgress = getStoredData<Record<string, Record<string, LessonProgress>>>(
      STORAGE_KEYS.LESSON_PROGRESS
    ) || {}

    return allProgress[userId]?.[lessonId] || null
  }

  async getAllLessonProgress(userId: string): Promise<LessonProgress[]> {
    const allProgress = getStoredData<Record<string, Record<string, LessonProgress>>>(
      STORAGE_KEYS.LESSON_PROGRESS
    ) || {}

    const userProgress = allProgress[userId] || {}
    return Object.values(userProgress)
  }

  async updateLessonProgress(
    userId: string,
    lessonId: string,
    update: Partial<LessonProgress>
  ): Promise<LessonProgress> {
    const allProgress = getStoredData<Record<string, Record<string, LessonProgress>>>(
      STORAGE_KEYS.LESSON_PROGRESS
    ) || {}

    if (!allProgress[userId]) {
      allProgress[userId] = {}
    }

    const now = new Date().toISOString()
    const existing = allProgress[userId][lessonId]

    const defaults: LessonProgress = {
      user_id: userId,
      lesson_id: lessonId,
      status: 'not_started',
      current_content_index: 0,
      checkpoint_scores: {},
      time_spent_seconds: 0,
      created_at: existing?.created_at || now,
      updated_at: now,
    }

    const updated: LessonProgress = Object.assign(
      {},
      defaults,
      existing,
      update,
      { user_id: userId, lesson_id: lessonId, updated_at: now }
    )

    allProgress[userId][lessonId] = updated
    setStoredData(STORAGE_KEYS.LESSON_PROGRESS, allProgress)

    return updated
  }

  async markLessonComplete(userId: string, lessonId: string): Promise<LessonProgress> {
    return this.updateLessonProgress(userId, lessonId, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
  }

  // =========================================================================
  // Track Progress
  // =========================================================================

  async getTrackProgress(userId: string): Promise<TrackProgress | null> {
    const allProgress = getStoredData<Record<string, TrackProgress>>(
      STORAGE_KEYS.TRACK_PROGRESS
    ) || {}

    return allProgress[userId] || null
  }

  async updateTrackProgress(userId: string): Promise<TrackProgress> {
    return this.recalculateTrackProgress(userId)
  }

  async recalculateTrackProgress(userId: string): Promise<TrackProgress> {
    const patterns = await this.patternRepo.getAll()
    const patternProgress = await this.getAllPatternProgress(userId)
    const lessonProgress = await this.getAllLessonProgress(userId)

    const progressMap = new Map(patternProgress.map(p => [p.pattern_id, p]))

    // Calculate stats
    let totalMastery = 0
    let patternsMastered = 0
    let questionsAttempted = 0
    let questionsCorrect = 0
    const weakPatternIds: string[] = []
    const strongPatternIds: string[] = []

    for (const pattern of patterns) {
      const progress = progressMap.get(pattern.id)
      if (progress) {
        totalMastery += progress.mastery_level
        if (progress.mastery_level >= 80) {
          patternsMastered++
          strongPatternIds.push(pattern.id)
        } else if (progress.mastery_level < 50 && progress.total_attempts > 0) {
          weakPatternIds.push(pattern.id)
        }
        questionsAttempted += progress.total_attempts
        questionsCorrect += progress.successful_identifications
      }
    }

    const overallMastery = patterns.length > 0
      ? Math.round(totalMastery / patterns.length)
      : 0

    const lessonsCompleted = lessonProgress.filter(l => l.status === 'completed').length

    // Calculate daily streak
    const lastActive = await this.getTrackProgress(userId)
    let dailyStreak = lastActive?.daily_streak || 0
    const today = new Date().toDateString()
    const lastActiveDate = lastActive?.last_active_at
      ? new Date(lastActive.last_active_at).toDateString()
      : null

    if (lastActiveDate !== today) {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      if (lastActiveDate === yesterday.toDateString()) {
        dailyStreak += 1
      } else {
        dailyStreak = 1
      }
    }

    const now = new Date().toISOString()
    const trackProgress: TrackProgress = {
      user_id: userId,
      overall_mastery: overallMastery,
      patterns_mastered: patternsMastered,
      total_patterns: patterns.length,
      lessons_completed: lessonsCompleted,
      total_lessons: 0, // Will be set when lessons are loaded
      questions_attempted: questionsAttempted,
      questions_correct: questionsCorrect,
      daily_streak: dailyStreak,
      last_active_at: now,
      weak_pattern_ids: weakPatternIds.slice(0, 5),
      strong_pattern_ids: strongPatternIds.slice(0, 10),
      created_at: lastActive?.created_at || now,
      updated_at: now,
    }

    const allProgress = getStoredData<Record<string, TrackProgress>>(
      STORAGE_KEYS.TRACK_PROGRESS
    ) || {}
    allProgress[userId] = trackProgress
    setStoredData(STORAGE_KEYS.TRACK_PROGRESS, allProgress)

    return trackProgress
  }

  // =========================================================================
  // Analytics
  // =========================================================================

  async getWeakPatterns(userId: string, limit: number = 5): Promise<PatternWithProgress[]> {
    const progress = await this.getAllPatternProgress(userId)
    const patterns = await this.patternRepo.getAll()
    const patternMap = new Map(patterns.map(p => [p.id, p]))

    return progress
      .filter(p => p.mastery_level < 50 && p.total_attempts > 0)
      .sort((a, b) => a.mastery_level - b.mastery_level)
      .slice(0, limit)
      .map(p => ({
        ...patternMap.get(p.pattern_id)!,
        progress: p,
      }))
      .filter(p => p.id) // Filter out any with missing pattern data
  }

  async getStrongPatterns(userId: string, limit: number = 10): Promise<PatternWithProgress[]> {
    const progress = await this.getAllPatternProgress(userId)
    const patterns = await this.patternRepo.getAll()
    const patternMap = new Map(patterns.map(p => [p.id, p]))

    return progress
      .filter(p => p.mastery_level >= 80)
      .sort((a, b) => b.mastery_level - a.mastery_level)
      .slice(0, limit)
      .map(p => ({
        ...patternMap.get(p.pattern_id)!,
        progress: p,
      }))
      .filter(p => p.id)
  }

  async getPatternsNeedingReview(userId: string): Promise<PatternWithProgress[]> {
    const progress = await this.getAllPatternProgress(userId)
    const patterns = await this.patternRepo.getAll()
    const patternMap = new Map(patterns.map(p => [p.id, p]))
    const now = new Date()

    return progress
      .filter(p => new Date(p.next_review_at) <= now)
      .sort((a, b) => new Date(a.next_review_at).getTime() - new Date(b.next_review_at).getTime())
      .map(p => ({
        ...patternMap.get(p.pattern_id)!,
        progress: p,
      }))
      .filter(p => p.id)
  }
}
