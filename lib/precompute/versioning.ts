/**
 * Precompute Versioning Module
 *
 * Tracks prompt and model versions for precomputed content.
 * Used for cache invalidation when prompts or models change.
 */

import crypto from 'crypto'
import type { ContentVersion, PrecomputeContentType } from './types'

// Schema version for precomputed content storage
export const PRECOMPUTE_SCHEMA_VERSION = 'precompute.v1'

// Current versions for each content type
// UPDATE THESE when prompts or models change to trigger re-generation
export const CURRENT_VERSIONS: Record<PrecomputeContentType, ContentVersion> = {
  scaffold_outline: {
    promptVersion: 'outline.v1.0',
    modelVersion: 'claude-sonnet-4-5-20250929',
    schemaVersion: PRECOMPUTE_SCHEMA_VERSION,
  },
  scaffold_step: {
    promptVersion: 'step.v1.0',
    modelVersion: 'claude-sonnet-4-5-20250929',
    schemaVersion: PRECOMPUTE_SCHEMA_VERSION,
  },
  scaffold_final: {
    promptVersion: 'final.v1.0',
    modelVersion: 'claude-sonnet-4-5-20250929',
    schemaVersion: PRECOMPUTE_SCHEMA_VERSION,
  },
  hint_l4: {
    promptVersion: 'hint.v1.0',
    modelVersion: 'claude-sonnet-4-20250514',
    schemaVersion: PRECOMPUTE_SCHEMA_VERSION,
  },
  hint_l5: {
    promptVersion: 'hint.v1.0',
    modelVersion: 'claude-sonnet-4-20250514',
    schemaVersion: PRECOMPUTE_SCHEMA_VERSION,
  },
  concept_contrast: {
    promptVersion: 'contrast.v1.0',
    modelVersion: 'claude-sonnet-4-20250514',
    schemaVersion: PRECOMPUTE_SCHEMA_VERSION,
  },
  problem_variation: {
    promptVersion: 'variation.v1.0',
    modelVersion: 'claude-sonnet-4-20250514',
    schemaVersion: PRECOMPUTE_SCHEMA_VERSION,
  },
  simulation_params: {
    // No AI needed - uses regex extraction
    promptVersion: 'regex.v1.0',
    modelVersion: 'n/a',
    schemaVersion: PRECOMPUTE_SCHEMA_VERSION,
  },
}

/**
 * Get the current version for a content type
 */
export function getCurrentVersion(contentType: PrecomputeContentType): ContentVersion {
  return CURRENT_VERSIONS[contentType]
}

/**
 * Generate a stable hash for cache key / deduplication
 * Based on the problem text and generation options
 */
export function generateInputHash(
  problemText: string,
  contentType: PrecomputeContentType,
  contentKey: string = 'default',
  additionalInput?: Record<string, unknown>
): string {
  const version = CURRENT_VERSIONS[contentType]
  const input = JSON.stringify({
    problemText: problemText.trim().toLowerCase().replace(/\s+/g, ' '),
    contentType,
    contentKey,
    promptVersion: version.promptVersion,
    modelVersion: version.modelVersion,
    ...(additionalInput || {}),
  })
  return crypto.createHash('sha256').update(input).digest('hex')
}

/**
 * Generate a scaffold ID from problem text
 * Used as a stable identifier for caching
 */
export function generateScaffoldId(
  problemText: string,
  options: { density?: number; include_fbd?: boolean } = {}
): string {
  const normalized = problemText.trim().toLowerCase().replace(/\s+/g, ' ')
  const input = JSON.stringify({
    problem: normalized,
    density: options.density ?? 3,
    include_fbd: options.include_fbd ?? true,
  })
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16)
}

/**
 * Check if a version is current (matches latest prompt and model)
 */
export function isVersionCurrent(
  contentType: PrecomputeContentType,
  promptVersion: string,
  modelVersion: string
): boolean {
  const current = CURRENT_VERSIONS[contentType]
  return (
    current.promptVersion === promptVersion &&
    current.modelVersion === modelVersion
  )
}

/**
 * Check if a version is acceptable (current or optionally older)
 */
export function isVersionAcceptable(
  contentType: PrecomputeContentType,
  promptVersion: string,
  modelVersion: string,
  acceptOlderVersion: boolean = false
): boolean {
  if (isVersionCurrent(contentType, promptVersion, modelVersion)) {
    return true
  }
  // If accepting older versions, just check that it's not completely different
  // In practice, you might want more sophisticated version comparison
  if (acceptOlderVersion) {
    const current = CURRENT_VERSIONS[contentType]
    // Accept same major version (e.g., outline.v1.x is compatible with outline.v1.y)
    const currentMajor = current.promptVersion.split('.').slice(0, 2).join('.')
    const checkMajor = promptVersion.split('.').slice(0, 2).join('.')
    return currentMajor === checkMajor
  }
  return false
}

/**
 * Parse a version string into components
 */
export function parseVersion(version: string): { name: string; major: number; minor: number } | null {
  const match = version.match(/^([a-z_]+)\.v(\d+)\.(\d+)$/)
  if (!match) return null
  return {
    name: match[1],
    major: parseInt(match[2], 10),
    minor: parseInt(match[3], 10),
  }
}

/**
 * Compare two versions
 * Returns: -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareVersions(a: string, b: string): number {
  const parsedA = parseVersion(a)
  const parsedB = parseVersion(b)

  if (!parsedA || !parsedB) return 0

  if (parsedA.major !== parsedB.major) {
    return parsedA.major > parsedB.major ? 1 : -1
  }
  if (parsedA.minor !== parsedB.minor) {
    return parsedA.minor > parsedB.minor ? 1 : -1
  }
  return 0
}

/**
 * Estimate the cost for a generation based on token counts
 * Uses Anthropic pricing as of 2024
 */
export function estimateCost(inputTokens: number, outputTokens: number, model: string): number {
  // Claude Sonnet 4 pricing
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-5-20250929': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    'claude-sonnet-4-20250514': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
    'claude-haiku-3-5-20241022': { input: 0.25 / 1_000_000, output: 1.25 / 1_000_000 },
  }

  const modelPricing = pricing[model] || pricing['claude-sonnet-4-20250514']
  return inputTokens * modelPricing.input + outputTokens * modelPricing.output
}
