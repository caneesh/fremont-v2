/**
 * Active Problems Component
 *
 * Exports the main ActiveProblems component and sub-components.
 */

export { default as ActiveProblems } from './ActiveProblems'
export { default as ProblemCard } from './ProblemCard'
export { default as StatusBadge } from './StatusBadge'

// Re-export types
export type {
  ActiveProblemsData,
  ActiveProblemItem,
  ProblemDisplayStatus,
} from '@/types/activeProblems'
