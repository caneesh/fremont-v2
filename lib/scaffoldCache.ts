/**
 * Scaffold Cache Module
 *
 * In-memory cache for phased scaffold responses.
 * TTL: 15 minutes
 *
 * Caches:
 * - Outline responses (keyed by scaffold_id)
 * - Step expansion responses (keyed by scaffold_id + step_id)
 * - Final solve responses (keyed by scaffold_id)
 */

import crypto from 'crypto'
import type {
  OutlineScaffoldResponse,
  StepExpansionResponse,
  FinalSolveResponse,
  CachedOutline,
  CachedStepExpansion,
  CachedFinalSolve,
} from '@/types/phasedScaffold'

// Cache TTL: 15 minutes in milliseconds
const CACHE_TTL_MS = 15 * 60 * 1000

// Schema version for compatibility
export const SCHEMA_VERSION = 'v1.0.0'

// Module-level caches (server-side, persists across requests)
const outlineCache = new Map<string, CachedOutline>()
const stepExpansionCache = new Map<string, CachedStepExpansion>()
const finalSolveCache = new Map<string, CachedFinalSolve>()

/**
 * Generate a stable scaffold_id from problem text and options
 * This ensures the same problem gets the same ID
 */
export function generateScaffoldId(
  problem: string,
  options?: {
    density?: number
    include_fbd?: boolean
  }
): string {
  const normalizedProblem = problem.trim().toLowerCase().replace(/\s+/g, ' ')
  const optionsStr = JSON.stringify(options || {})
  const input = `${SCHEMA_VERSION}:${normalizedProblem}:${optionsStr}`

  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16)
}

/**
 * Generate a cache key for step expansion
 */
function getStepCacheKey(scaffoldId: string, stepId: string): string {
  return `${scaffoldId}:${stepId}`
}

/**
 * Check if a cached item is still valid (not expired)
 */
function isValid(expiresAt: number): boolean {
  return Date.now() < expiresAt
}

/**
 * Clean up expired entries from all caches
 * Called periodically to prevent memory bloat
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now()

  for (const [key, value] of outlineCache) {
    if (!isValid(value.expires_at)) {
      outlineCache.delete(key)
    }
  }

  for (const [key, value] of stepExpansionCache) {
    if (!isValid(value.expires_at)) {
      stepExpansionCache.delete(key)
    }
  }

  for (const [key, value] of finalSolveCache) {
    if (!isValid(value.expires_at)) {
      finalSolveCache.delete(key)
    }
  }
}

// ============================================
// Outline Cache Operations
// ============================================

export function getCachedOutline(scaffoldId: string): OutlineScaffoldResponse | null {
  const cached = outlineCache.get(scaffoldId)

  if (!cached) return null
  if (!isValid(cached.expires_at)) {
    outlineCache.delete(scaffoldId)
    return null
  }

  return cached.response
}

export function setCachedOutline(scaffoldId: string, response: OutlineScaffoldResponse): void {
  const now = Date.now()
  outlineCache.set(scaffoldId, {
    response,
    created_at: now,
    expires_at: now + CACHE_TTL_MS,
  })
}

// ============================================
// Step Expansion Cache Operations
// ============================================

export function getCachedStepExpansion(
  scaffoldId: string,
  stepId: string
): StepExpansionResponse | null {
  const key = getStepCacheKey(scaffoldId, stepId)
  const cached = stepExpansionCache.get(key)

  if (!cached) return null
  if (!isValid(cached.expires_at)) {
    stepExpansionCache.delete(key)
    return null
  }

  return cached.response
}

export function setCachedStepExpansion(
  scaffoldId: string,
  stepId: string,
  response: StepExpansionResponse
): void {
  const key = getStepCacheKey(scaffoldId, stepId)
  const now = Date.now()
  stepExpansionCache.set(key, {
    response,
    created_at: now,
    expires_at: now + CACHE_TTL_MS,
  })
}

/**
 * Get all cached step expansions for a scaffold
 */
export function getAllCachedStepExpansions(
  scaffoldId: string
): Map<string, StepExpansionResponse> {
  const result = new Map<string, StepExpansionResponse>()

  for (const [key, value] of stepExpansionCache) {
    if (key.startsWith(`${scaffoldId}:`)) {
      if (isValid(value.expires_at)) {
        const stepId = key.substring(scaffoldId.length + 1)
        result.set(stepId, value.response)
      }
    }
  }

  return result
}

// ============================================
// Final Solve Cache Operations
// ============================================

export function getCachedFinalSolve(scaffoldId: string): FinalSolveResponse | null {
  const cached = finalSolveCache.get(scaffoldId)

  if (!cached) return null
  if (!isValid(cached.expires_at)) {
    finalSolveCache.delete(scaffoldId)
    return null
  }

  return cached.response
}

export function setCachedFinalSolve(scaffoldId: string, response: FinalSolveResponse): void {
  const now = Date.now()
  finalSolveCache.set(scaffoldId, {
    response,
    created_at: now,
    expires_at: now + CACHE_TTL_MS,
  })
}

// ============================================
// Cache Stats (for debugging)
// ============================================

export function getCacheStats(): {
  outlines: number
  stepExpansions: number
  finalSolves: number
  totalSize: number
} {
  return {
    outlines: outlineCache.size,
    stepExpansions: stepExpansionCache.size,
    finalSolves: finalSolveCache.size,
    totalSize: outlineCache.size + stepExpansionCache.size + finalSolveCache.size,
  }
}

/**
 * Clear all caches (for testing)
 */
export function clearAllCaches(): void {
  outlineCache.clear()
  stepExpansionCache.clear()
  finalSolveCache.clear()
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredEntries, 5 * 60 * 1000)
}
