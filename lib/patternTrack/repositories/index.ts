/**
 * Pattern Track - Repository Factory
 *
 * Provides a single point of access to all repositories.
 * V1: Uses JSON files + localStorage
 * V2: Uses Prisma/Postgres for patterns and questions
 */

import type { IRepositoryFactory, IPatternRepository, IQuestionRepository, IProgressRepository } from './interfaces'
import { JsonPatternRepository } from './jsonPatternRepository'
import { JsonLessonRepository } from './jsonLessonRepository'
import { JsonQuestionRepository } from './jsonQuestionRepository'
import { LocalProgressRepository } from './localProgressRepository'
import { LocalSessionRepository } from './localSessionRepository'
import { PrismaPatternRepository } from './prismaPatternRepository'
import { PrismaQuestionRepository } from './prismaQuestionRepository'
import { PrismaProgressRepository } from './prismaProgressRepository'
import { FEATURE_FLAGS } from '@/lib/featureFlags'

// Export interfaces for external use
export * from './interfaces'

// Export individual repositories for direct use if needed
export { JsonPatternRepository } from './jsonPatternRepository'
export { JsonLessonRepository } from './jsonLessonRepository'
export { JsonQuestionRepository } from './jsonQuestionRepository'
export { LocalProgressRepository } from './localProgressRepository'
export { LocalSessionRepository } from './localSessionRepository'
export { PrismaPatternRepository } from './prismaPatternRepository'
export { PrismaQuestionRepository } from './prismaQuestionRepository'
export { PrismaProgressRepository } from './prismaProgressRepository'

/**
 * Default repository factory using JSON + localStorage
 */
class JsonRepositoryFactory implements IRepositoryFactory {
  private _patterns: JsonPatternRepository | null = null
  private _lessons: JsonLessonRepository | null = null
  private _questions: JsonQuestionRepository | null = null
  private _progress: LocalProgressRepository | null = null
  private _sessions: LocalSessionRepository | null = null

  get patterns(): JsonPatternRepository {
    if (!this._patterns) {
      this._patterns = new JsonPatternRepository()
    }
    return this._patterns
  }

  get lessons(): JsonLessonRepository {
    if (!this._lessons) {
      this._lessons = new JsonLessonRepository()
    }
    return this._lessons
  }

  get questions(): JsonQuestionRepository {
    if (!this._questions) {
      this._questions = new JsonQuestionRepository()
    }
    return this._questions
  }

  get progress(): LocalProgressRepository {
    if (!this._progress) {
      this._progress = new LocalProgressRepository()
    }
    return this._progress
  }

  get sessions(): LocalSessionRepository {
    if (!this._sessions) {
      this._sessions = new LocalSessionRepository()
    }
    return this._sessions
  }
}

/**
 * Hybrid repository factory using Prisma for patterns/questions/progress
 */
class PrismaRepositoryFactory implements IRepositoryFactory {
  private _patterns: PrismaPatternRepository | null = null
  private _lessons: JsonLessonRepository | null = null
  private _questions: PrismaQuestionRepository | null = null
  private _progress: PrismaProgressRepository | null = null
  private _sessions: LocalSessionRepository | null = null

  get patterns(): IPatternRepository {
    if (!this._patterns) {
      this._patterns = new PrismaPatternRepository()
    }
    return this._patterns
  }

  get lessons(): JsonLessonRepository {
    // Still use JSON for lessons (not migrated to database yet)
    if (!this._lessons) {
      this._lessons = new JsonLessonRepository()
    }
    return this._lessons
  }

  get questions(): IQuestionRepository {
    if (!this._questions) {
      this._questions = new PrismaQuestionRepository()
    }
    return this._questions
  }

  get progress(): IProgressRepository {
    if (!this._progress) {
      this._progress = new PrismaProgressRepository()
    }
    return this._progress
  }

  get sessions(): LocalSessionRepository {
    if (!this._sessions) {
      this._sessions = new LocalSessionRepository()
    }
    return this._sessions
  }
}

// Singleton instance
let repositoryFactory: IRepositoryFactory | null = null

/**
 * Get the repository factory instance
 * Uses Prisma repositories when USE_DATABASE_QUESTIONS flag is enabled
 */
export function getRepositories(): IRepositoryFactory {
  if (!repositoryFactory) {
    if (FEATURE_FLAGS.USE_DATABASE_QUESTIONS) {
      repositoryFactory = new PrismaRepositoryFactory()
    } else {
      repositoryFactory = new JsonRepositoryFactory()
    }
  }
  return repositoryFactory
}

/**
 * Set a custom repository factory (for testing or V2 migration)
 */
export function setRepositoryFactory(factory: IRepositoryFactory): void {
  repositoryFactory = factory
}

/**
 * Reset the repository factory (for testing)
 */
export function resetRepositoryFactory(): void {
  repositoryFactory = null
}
