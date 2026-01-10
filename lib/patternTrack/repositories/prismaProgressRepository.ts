/**
 * Prisma-based Progress Repository Implementation
 *
 * Stores user progress in PostgreSQL via Prisma.
 * Replaces LocalProgressRepository for server-side persistence.
 */

import { prisma } from '@/lib/db'
import type {
  PatternProgress,
  LessonProgress,
  TrackProgress,
  PatternWithProgress,
  PatternPracticeEntry,
} from '../schema'
import type { IProgressRepository } from './interfaces'
import { PrismaPatternRepository } from './prismaPatternRepository'

/**
 * Calculate mastery level from progress stats
 * Applies penalties for hint usage in recent attempts
 */
function calculateMasteryLevel(
  totalAttempts: number,
  successfulIdentifications: number,
  falsePositives: number,
  currentStreak: number,
  practiceHistory: PatternPracticeEntry[]
): number {
  if (totalAttempts === 0) return 0

  const successRate = successfulIdentifications / totalAttempts
  const streakBonus = Math.min(currentStreak * 2, 20) // Up to 20 bonus points
  const falsePositivePenalty = Math.min(falsePositives * 5, 30) // Up to 30 penalty

  // Calculate hint penalty from recent attempts (last 10)
  const recentAttempts = practiceHistory.slice(-10)
  let totalHintsUsed = 0
  for (const attempt of recentAttempts) {
    if (attempt.hints_used && attempt.hints_used > 0) {
      totalHintsUsed += attempt.hints_used
    }
  }
  // Penalty: -5 per hint used in recent attempts, up to -25
  const hintPenalty = Math.min(totalHintsUsed * 5, 25)

  let mastery = (successRate * 80) + streakBonus - falsePositivePenalty - hintPenalty
  mastery = Math.max(0, Math.min(100, mastery))

  return Math.round(mastery)
}

/**
 * Calculate next review date using SM-2-like algorithm
 */
function calculateNextReview(masteryLevel: number, currentStreak: number): Date {
  const now = new Date()
  let intervalDays: number

  if (masteryLevel >= 90) {
    intervalDays = 14 // 2 weeks for mastered patterns
  } else if (masteryLevel >= 70) {
    intervalDays = 7 // 1 week
  } else if (masteryLevel >= 50) {
    intervalDays = 3 // 3 days
  } else if (masteryLevel >= 30) {
    intervalDays = 1 // 1 day
  } else {
    intervalDays = 0 // Same day
  }

  // Adjust based on streak
  if (currentStreak >= 5) {
    intervalDays = Math.round(intervalDays * 1.5)
  }

  return new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000)
}

/**
 * Transform Prisma PatternProgress to schema PatternProgress
 */
function transformPatternProgress(dbProgress: {
  userId: string
  patternId: string
  masteryLevel: number
  totalAttempts: number
  successfulIdentifications: number
  missedIdentifications: number
  falsePositives: number
  currentStreak: number
  bestStreak: number
  lastPracticedAt: Date | null
  nextReviewAt: Date | null
  practiceHistory: unknown
  createdAt: Date
  updatedAt: Date
}): PatternProgress {
  return {
    user_id: dbProgress.userId,
    pattern_id: dbProgress.patternId,
    mastery_level: dbProgress.masteryLevel,
    total_attempts: dbProgress.totalAttempts,
    successful_identifications: dbProgress.successfulIdentifications,
    missed_identifications: dbProgress.missedIdentifications,
    false_positives: dbProgress.falsePositives,
    current_streak: dbProgress.currentStreak,
    best_streak: dbProgress.bestStreak,
    last_practiced_at: dbProgress.lastPracticedAt?.toISOString() || new Date().toISOString(),
    next_review_at: dbProgress.nextReviewAt?.toISOString() || new Date().toISOString(),
    practice_history: (dbProgress.practiceHistory as PatternPracticeEntry[]) || [],
    created_at: dbProgress.createdAt.toISOString(),
    updated_at: dbProgress.updatedAt.toISOString(),
  }
}

export class PrismaProgressRepository implements IProgressRepository {
  private patternRepo = new PrismaPatternRepository()

  // =========================================================================
  // Pattern Progress
  // =========================================================================

  async getPatternProgress(userId: string, patternId: string): Promise<PatternProgress | null> {
    const dbProgress = await prisma.patternProgress.findUnique({
      where: {
        userId_patternId: { userId, patternId },
      },
    })

    if (!dbProgress) return null
    return transformPatternProgress(dbProgress)
  }

  async getAllPatternProgress(userId: string): Promise<PatternProgress[]> {
    const dbProgressList = await prisma.patternProgress.findMany({
      where: { userId },
    })

    return dbProgressList.map(transformPatternProgress)
  }

  async getPatternProgressByIds(userId: string, patternIds: string[]): Promise<PatternProgress[]> {
    const dbProgressList = await prisma.patternProgress.findMany({
      where: {
        userId,
        patternId: { in: patternIds },
      },
    })

    return dbProgressList.map(transformPatternProgress)
  }

  async updatePatternProgress(
    userId: string,
    patternId: string,
    update: Partial<PatternProgress>
  ): Promise<PatternProgress> {
    const now = new Date()

    // Get existing or create new
    const existing = await prisma.patternProgress.findUnique({
      where: { userId_patternId: { userId, patternId } },
    })

    const practiceHistory = update.practice_history ||
      (existing?.practiceHistory as unknown as PatternPracticeEntry[]) ||
      []

    const totalAttempts = update.total_attempts ?? existing?.totalAttempts ?? 0
    const successfulIdentifications = update.successful_identifications ?? existing?.successfulIdentifications ?? 0
    const falsePositives = update.false_positives ?? existing?.falsePositives ?? 0
    const currentStreak = update.current_streak ?? existing?.currentStreak ?? 0

    // Recalculate mastery and next review
    const masteryLevel = calculateMasteryLevel(
      totalAttempts,
      successfulIdentifications,
      falsePositives,
      currentStreak,
      practiceHistory
    )
    const nextReviewAt = calculateNextReview(masteryLevel, currentStreak)

    const dbProgress = await prisma.patternProgress.upsert({
      where: { userId_patternId: { userId, patternId } },
      create: {
        userId,
        patternId,
        masteryLevel,
        totalAttempts,
        successfulIdentifications,
        missedIdentifications: update.missed_identifications ?? 0,
        falsePositives,
        currentStreak,
        bestStreak: update.best_streak ?? 0,
        lastPracticedAt: now,
        nextReviewAt,
        practiceHistory: JSON.parse(JSON.stringify(practiceHistory)),
      },
      update: {
        masteryLevel,
        totalAttempts,
        successfulIdentifications,
        missedIdentifications: update.missed_identifications,
        falsePositives,
        currentStreak,
        bestStreak: update.best_streak,
        lastPracticedAt: now,
        nextReviewAt,
        practiceHistory: JSON.parse(JSON.stringify(practiceHistory)),
      },
    })

    return transformPatternProgress(dbProgress)
  }

  async recordPatternAttempt(
    userId: string,
    patternId: string,
    questionId: string,
    identified: boolean,
    timeTaken: number,
    confidence?: 'low' | 'medium' | 'high',
    hintsUsed?: number
  ): Promise<PatternProgress> {
    const existing = await this.getPatternProgress(userId, patternId)
    const now = new Date().toISOString()

    const entry: PatternPracticeEntry = {
      timestamp: now,
      question_id: questionId,
      identified_correctly: identified,
      time_taken_seconds: timeTaken,
      confidence,
      hints_used: hintsUsed,
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
    const dbProgress = await prisma.lessonProgressRecord.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    })

    if (!dbProgress) return null

    return {
      user_id: dbProgress.userId,
      lesson_id: dbProgress.lessonId,
      status: dbProgress.status as 'not_started' | 'in_progress' | 'completed',
      current_content_index: dbProgress.currentContentIndex,
      checkpoint_scores: dbProgress.checkpointScores as Record<number, number>,
      time_spent_seconds: dbProgress.timeSpentSeconds,
      completed_at: dbProgress.completedAt?.toISOString(),
      created_at: dbProgress.createdAt.toISOString(),
      updated_at: dbProgress.updatedAt.toISOString(),
    }
  }

  async getAllLessonProgress(userId: string): Promise<LessonProgress[]> {
    const dbProgressList = await prisma.lessonProgressRecord.findMany({
      where: { userId },
    })

    return dbProgressList.map(dbProgress => ({
      user_id: dbProgress.userId,
      lesson_id: dbProgress.lessonId,
      status: dbProgress.status as 'not_started' | 'in_progress' | 'completed',
      current_content_index: dbProgress.currentContentIndex,
      checkpoint_scores: dbProgress.checkpointScores as Record<number, number>,
      time_spent_seconds: dbProgress.timeSpentSeconds,
      completed_at: dbProgress.completedAt?.toISOString(),
      created_at: dbProgress.createdAt.toISOString(),
      updated_at: dbProgress.updatedAt.toISOString(),
    }))
  }

  async updateLessonProgress(
    userId: string,
    lessonId: string,
    update: Partial<LessonProgress>
  ): Promise<LessonProgress> {
    const dbProgress = await prisma.lessonProgressRecord.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        status: update.status || 'not_started',
        currentContentIndex: update.current_content_index || 0,
        checkpointScores: JSON.parse(JSON.stringify(update.checkpoint_scores || {})),
        timeSpentSeconds: update.time_spent_seconds || 0,
        completedAt: update.completed_at ? new Date(update.completed_at) : null,
      },
      update: {
        status: update.status,
        currentContentIndex: update.current_content_index,
        checkpointScores: update.checkpoint_scores ? JSON.parse(JSON.stringify(update.checkpoint_scores)) : undefined,
        timeSpentSeconds: update.time_spent_seconds,
        completedAt: update.completed_at ? new Date(update.completed_at) : undefined,
      },
    })

    return {
      user_id: dbProgress.userId,
      lesson_id: dbProgress.lessonId,
      status: dbProgress.status as 'not_started' | 'in_progress' | 'completed',
      current_content_index: dbProgress.currentContentIndex,
      checkpoint_scores: dbProgress.checkpointScores as Record<number, number>,
      time_spent_seconds: dbProgress.timeSpentSeconds,
      completed_at: dbProgress.completedAt?.toISOString(),
      created_at: dbProgress.createdAt.toISOString(),
      updated_at: dbProgress.updatedAt.toISOString(),
    }
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
    const dbProgress = await prisma.trackProgressRecord.findUnique({
      where: { userId },
    })

    if (!dbProgress) return null

    return {
      user_id: dbProgress.userId,
      overall_mastery: dbProgress.overallMastery,
      patterns_mastered: dbProgress.patternsMastered,
      total_patterns: dbProgress.totalPatterns,
      lessons_completed: dbProgress.lessonsCompleted,
      total_lessons: dbProgress.totalLessons,
      questions_attempted: dbProgress.questionsAttempted,
      questions_correct: dbProgress.questionsCorrect,
      daily_streak: dbProgress.dailyStreak,
      last_active_at: dbProgress.lastActiveAt?.toISOString() || new Date().toISOString(),
      weak_pattern_ids: dbProgress.weakPatternIds,
      strong_pattern_ids: dbProgress.strongPatternIds,
      created_at: dbProgress.createdAt.toISOString(),
      updated_at: dbProgress.updatedAt.toISOString(),
    }
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

    const now = new Date()

    const dbProgress = await prisma.trackProgressRecord.upsert({
      where: { userId },
      create: {
        userId,
        overallMastery,
        patternsMastered,
        totalPatterns: patterns.length,
        lessonsCompleted,
        totalLessons: 0,
        questionsAttempted,
        questionsCorrect,
        dailyStreak,
        lastActiveAt: now,
        weakPatternIds: weakPatternIds.slice(0, 5),
        strongPatternIds: strongPatternIds.slice(0, 10),
      },
      update: {
        overallMastery,
        patternsMastered,
        totalPatterns: patterns.length,
        lessonsCompleted,
        questionsAttempted,
        questionsCorrect,
        dailyStreak,
        lastActiveAt: now,
        weakPatternIds: weakPatternIds.slice(0, 5),
        strongPatternIds: strongPatternIds.slice(0, 10),
      },
    })

    return {
      user_id: dbProgress.userId,
      overall_mastery: dbProgress.overallMastery,
      patterns_mastered: dbProgress.patternsMastered,
      total_patterns: dbProgress.totalPatterns,
      lessons_completed: dbProgress.lessonsCompleted,
      total_lessons: dbProgress.totalLessons,
      questions_attempted: dbProgress.questionsAttempted,
      questions_correct: dbProgress.questionsCorrect,
      daily_streak: dbProgress.dailyStreak,
      last_active_at: dbProgress.lastActiveAt?.toISOString() || now.toISOString(),
      weak_pattern_ids: dbProgress.weakPatternIds,
      strong_pattern_ids: dbProgress.strongPatternIds,
      created_at: dbProgress.createdAt.toISOString(),
      updated_at: dbProgress.updatedAt.toISOString(),
    }
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
      .filter(p => p.id)
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
