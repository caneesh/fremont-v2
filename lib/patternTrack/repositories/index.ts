/**
 * Pattern Track - Repository Factory
 *
 * Provides a single point of access to all repositories.
 * V1: Uses JSON files + localStorage
 * V2: Can be swapped for Prisma/Postgres implementations
 */

import type { IRepositoryFactory } from './interfaces'
import { JsonPatternRepository } from './jsonPatternRepository'
import { JsonLessonRepository } from './jsonLessonRepository'
import { JsonQuestionRepository } from './jsonQuestionRepository'
import { LocalProgressRepository } from './localProgressRepository'
import { LocalSessionRepository } from './localSessionRepository'

// Export interfaces for external use
export * from './interfaces'

// Export individual repositories for direct use if needed
export { JsonPatternRepository } from './jsonPatternRepository'
export { JsonLessonRepository } from './jsonLessonRepository'
export { JsonQuestionRepository } from './jsonQuestionRepository'
export { LocalProgressRepository } from './localProgressRepository'
export { LocalSessionRepository } from './localSessionRepository'

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

// Singleton instance
let repositoryFactory: IRepositoryFactory | null = null

/**
 * Get the repository factory instance
 */
export function getRepositories(): IRepositoryFactory {
  if (!repositoryFactory) {
    repositoryFactory = new JsonRepositoryFactory()
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
