/**
 * Pattern Track - Repository Interfaces
 *
 * Defines abstract interfaces for data access.
 * V1: Implemented with JSON files
 * V2: Can be implemented with Prisma/Postgres
 */

import type {
  Pattern,
  Lesson,
  Question,
  PatternProgress,
  LessonProgress,
  TrackProgress,
  PracticeSession,
  QuestionFilter,
  PaginationOptions,
  PaginatedResult,
  CreatePattern,
  UpdatePattern,
  CreateLesson,
  UpdateLesson,
  CreateQuestion,
  UpdateQuestion,
  PatternWithProgress,
  LessonWithProgress,
  QuestionWithPatterns,
} from '../schema'

// ============================================================================
// Pattern Repository
// ============================================================================

export interface IPatternRepository {
  // Read operations
  getById(id: string): Promise<Pattern | null>
  getByIds(ids: string[]): Promise<Pattern[]>
  getAll(): Promise<Pattern[]>
  getByCategory(category: string): Promise<Pattern[]>
  getRelated(patternId: string): Promise<Pattern[]>
  search(query: string): Promise<Pattern[]>

  // Write operations (for admin/seeding)
  create(data: CreatePattern): Promise<Pattern>
  update(id: string, data: UpdatePattern): Promise<Pattern | null>
  delete(id: string): Promise<boolean>

  // Aggregations
  getCategories(): Promise<string[]>
  getCount(): Promise<number>
}

// ============================================================================
// Lesson Repository
// ============================================================================

export interface ILessonRepository {
  // Read operations
  getById(id: string): Promise<Lesson | null>
  getAll(): Promise<Lesson[]>
  getByPatternId(patternId: string): Promise<Lesson[]>
  getPrerequisites(lessonId: string): Promise<Lesson[]>
  getNextLessons(lessonId: string): Promise<Lesson[]>

  // With joined data
  getByIdWithPatterns(id: string): Promise<LessonWithProgress | null>
  getAllWithProgress(userId: string): Promise<LessonWithProgress[]>

  // Write operations
  create(data: CreateLesson): Promise<Lesson>
  update(id: string, data: UpdateLesson): Promise<Lesson | null>
  delete(id: string): Promise<boolean>

  // Aggregations
  getCount(): Promise<number>
}

// ============================================================================
// Question Repository
// ============================================================================

export interface IQuestionRepository {
  // Read operations
  getById(id: string): Promise<Question | null>
  getByIds(ids: string[]): Promise<Question[]>
  getByPatternId(patternId: string): Promise<Question[]>
  getByCategory(category: string): Promise<Question[]>

  // Filtered queries (for practice sessions)
  getFiltered(
    filter: QuestionFilter,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Question>>

  // Random selection for practice
  getRandomForPatterns(
    patternIds: string[],
    count: number,
    excludeIds?: string[]
  ): Promise<Question[]>

  getRandomMixed(
    count: number,
    filter?: QuestionFilter
  ): Promise<Question[]>

  // With joined data
  getByIdWithPatterns(id: string): Promise<QuestionWithPatterns | null>

  // Write operations
  create(data: CreateQuestion): Promise<Question>
  update(id: string, data: UpdateQuestion): Promise<Question | null>
  delete(id: string): Promise<boolean>

  // Aggregations
  getCount(filter?: QuestionFilter): Promise<number>
  getCategories(): Promise<string[]>
  getTags(): Promise<string[]>
}

// ============================================================================
// Progress Repository
// ============================================================================

export interface IProgressRepository {
  // Pattern Progress
  getPatternProgress(userId: string, patternId: string): Promise<PatternProgress | null>
  getAllPatternProgress(userId: string): Promise<PatternProgress[]>
  getPatternProgressByIds(userId: string, patternIds: string[]): Promise<PatternProgress[]>
  updatePatternProgress(
    userId: string,
    patternId: string,
    update: Partial<PatternProgress>
  ): Promise<PatternProgress>
  recordPatternAttempt(
    userId: string,
    patternId: string,
    questionId: string,
    identified: boolean,
    timeTaken: number,
    confidence?: 'low' | 'medium' | 'high'
  ): Promise<PatternProgress>

  // Lesson Progress
  getLessonProgress(userId: string, lessonId: string): Promise<LessonProgress | null>
  getAllLessonProgress(userId: string): Promise<LessonProgress[]>
  updateLessonProgress(
    userId: string,
    lessonId: string,
    update: Partial<LessonProgress>
  ): Promise<LessonProgress>
  markLessonComplete(userId: string, lessonId: string): Promise<LessonProgress>

  // Track Progress
  getTrackProgress(userId: string): Promise<TrackProgress | null>
  updateTrackProgress(userId: string): Promise<TrackProgress>
  recalculateTrackProgress(userId: string): Promise<TrackProgress>

  // Analytics
  getWeakPatterns(userId: string, limit?: number): Promise<PatternWithProgress[]>
  getStrongPatterns(userId: string, limit?: number): Promise<PatternWithProgress[]>
  getPatternsNeedingReview(userId: string): Promise<PatternWithProgress[]>
}

// ============================================================================
// Session Repository
// ============================================================================

export interface ISessionRepository {
  // Session management
  createSession(session: Omit<PracticeSession, 'id'>): Promise<PracticeSession>
  getSession(id: string): Promise<PracticeSession | null>
  updateSession(id: string, update: Partial<PracticeSession>): Promise<PracticeSession | null>
  endSession(id: string): Promise<PracticeSession | null>

  // Session queries
  getActiveSessions(userId: string): Promise<PracticeSession[]>
  getRecentSessions(userId: string, limit?: number): Promise<PracticeSession[]>
  getSessionsByMode(userId: string, mode: PracticeSession['mode']): Promise<PracticeSession[]>

  // Analytics
  getSessionStats(userId: string): Promise<{
    totalSessions: number
    totalQuestions: number
    averageAccuracy: number
    averageTimePerQuestion: number
    sessionsByMode: Record<string, number>
  }>
}

// ============================================================================
// Repository Factory (for dependency injection)
// ============================================================================

export interface IRepositoryFactory {
  patterns: IPatternRepository
  lessons: ILessonRepository
  questions: IQuestionRepository
  progress: IProgressRepository
  sessions: ISessionRepository
}
