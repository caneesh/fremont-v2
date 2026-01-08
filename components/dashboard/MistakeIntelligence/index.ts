/**
 * Mistake Intelligence Component
 *
 * Exports the main MistakeIntelligence component and sub-components.
 */

export { default as MistakeIntelligence } from './MistakeIntelligence'
export { default as MistakeCard } from './MistakeCard'

// Re-export types
export type {
  MistakeIntelligenceData,
  MistakeCategory,
  MistakeSeverityLevel,
} from '@/types/mistakeIntelligence'
