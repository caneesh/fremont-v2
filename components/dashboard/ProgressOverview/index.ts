/**
 * Progress Overview Component
 *
 * Exports the main ProgressOverview component and sub-components.
 */

export { default as ProgressOverview } from './ProgressOverview'
export { default as PatternMasteryList } from './PatternMasteryList'
export { default as ConfidenceDistribution } from './ConfidenceDistribution'
export { default as SanityCheckRate } from './SanityCheckRate'

// Re-export types
export type {
  ProgressOverviewData,
  PatternMasteryItem,
  PatternState,
  ConfidenceDistribution as ConfidenceDistributionType,
  SanityCheckStats,
} from '@/types/progressOverview'
