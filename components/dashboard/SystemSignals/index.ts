/**
 * System Signals Component
 *
 * Exports the main SystemSignals component and sub-components.
 */

export { default as SystemSignals } from './SystemSignals'
export { default as FeatureFlagChip, ModeIndicator } from './FeatureFlagChip'

// Re-export types
export type {
  SystemSignalsData,
  DisplayableFeatureFlag,
  LearningModeSummary,
} from '@/types/systemSignals'
