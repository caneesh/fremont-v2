/**
 * Pattern Identification Track
 *
 * Main entry point for the pattern-based learning system.
 * Exports all public APIs, types, and utilities.
 */

// Schema and types
export * from './schema'

// Repository layer
export {
  getRepositories,
  setRepositoryFactory,
  resetRepositoryFactory,
  type IPatternRepository,
  type ILessonRepository,
  type IQuestionRepository,
  type IProgressRepository,
  type ISessionRepository,
  type IRepositoryFactory,
} from './repositories'

// Service layer
export * from './services'
