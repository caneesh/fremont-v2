/**
 * Precompute Module Types
 *
 * TypeScript interfaces for the precomputation system.
 */

import type { OutlineScaffoldResponse, StepExpansionResponse } from '@/types/phasedScaffold'

// Content types that can be precomputed
export type PrecomputeContentType =
  | 'scaffold_outline'
  | 'scaffold_step'
  | 'scaffold_final'
  | 'hint_l4'
  | 'hint_l5'
  | 'concept_contrast'
  | 'problem_variation'
  | 'simulation_params'

// Version information for a piece of precomputed content
export interface ContentVersion {
  promptVersion: string
  modelVersion: string
  schemaVersion: string
}

// Result of looking up precomputed content
export interface PrecomputeLookupResult<T> {
  found: boolean
  data?: T
  source: 'precomputed' | 'live' | 'fallback' | 'cache'
  meta?: {
    promptVersion: string
    modelVersion: string
    generatedAt: Date
    inputTokens?: number
    outputTokens?: number
  }
}

// Scaffold outline lookup result
export type ScaffoldOutlineLookupResult = PrecomputeLookupResult<OutlineScaffoldResponse>

// Step expansion lookup result
export type StepExpansionLookupResult = PrecomputeLookupResult<StepExpansionResponse>

// Concept contrast data structure
export interface ConceptContrastData {
  distractors: Array<{
    id: string
    name: string
    whyPlausible: string
    criticalFlaw: string
    problemConditionViolated: string
    commonMisconception: string
    rejectionHint: string
  }>
  challengePrompt: string
}

// Problem variation data
export interface VariationData {
  variationType: 'easier' | 'harder' | 'same'
  problemStatement: string
  whyDifferent: string
}

// Simulation parameters
export interface SimulationParamsData {
  type: 'projectile' | 'incline' | 'unsupported'
  params: {
    // Projectile params
    initialVelocity?: number
    launchAngle?: number
    initialHeight?: number
    gravity?: number
    // Incline params
    mass?: number
    angle?: number
    frictionCoeff?: number
    inclineLength?: number
  }
}

// Options for precompute lookup
export interface PrecomputeLookupOptions {
  acceptOlderVersion?: boolean
  minPromptVersion?: string
}

// Job status for background precomputation
export type PrecomputeJobStatus = 'pending' | 'running' | 'completed' | 'failed'

// Job creation request
export interface CreatePrecomputeJobRequest {
  jobType: PrecomputeContentType
  questionId: string
  contentKey?: string
  priority?: number
}

// Generation result with metadata
export interface GenerationResult<T> {
  data: T
  inputTokens: number
  outputTokens: number
  latencyMs: number
  costUsd: number
}

// Batch generation options
export interface BatchGenerationOptions {
  batchSize: number
  maxConcurrency: number
  rateLimitPerMin: number
  dryRun: boolean
  skipExisting: boolean
  questionIds?: string[]
  pattern?: string
}

// Generation stats
export interface GenerationStats {
  processed: number
  generated: number
  skipped: number
  failed: number
  totalTokens: number
  totalCostUsd: number
}
