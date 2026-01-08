/**
 * Precompute Module
 *
 * Provides precomputed content delivery for PhysiScaffold.
 * Reduces AI API costs and latency by storing pre-generated content.
 */

// Types
export type {
  PrecomputeContentType,
  ContentVersion,
  PrecomputeLookupResult,
  PrecomputeLookupOptions,
  ConceptContrastData,
  VariationData,
  SimulationParamsData,
  CreatePrecomputeJobRequest,
  BatchGenerationOptions,
  GenerationStats,
} from './types'

// Versioning utilities
export {
  PRECOMPUTE_SCHEMA_VERSION,
  CURRENT_VERSIONS,
  getCurrentVersion,
  generateInputHash,
  generateScaffoldId,
  isVersionCurrent,
  isVersionAcceptable,
  parseVersion,
  compareVersions,
  estimateCost,
} from './versioning'

// Service
export { precomputeService } from './precomputeService'
