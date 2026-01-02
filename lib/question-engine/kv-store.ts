/**
 * Question Scaffolding Engine v1 - KV Store
 *
 * Handles all Vercel KV (Redis) operations with atomic guarantees.
 * Uses @vercel/kv for Edge runtime compatibility.
 *
 * KV Key Design (documented here as required):
 * ============================================
 *
 * Question Storage:
 *   q:hash:{sha256}              -> blobUrl (string)
 *                                   Maps content hash to Blob URL for immutable storage
 *
 * Topic Indexing:
 *   q:topic:{topic}              -> Set of sha256 hashes
 *                                   Allows lookup of all questions for a topic
 *
 *   q:topic:{topic}:sub:{subtopic} -> Set of sha256 hashes
 *                                     More granular lookup by subtopic
 *
 * Question Summaries (for similarity without fetching Blob):
 *   q:summary:{sha256}           -> JSON string with fingerprint, statement preview
 *                                   Small payload for fast similarity comparison
 *
 * Rate Limiting:
 *   rl:ip:{ip}                   -> counter with 60s TTL
 *                                   Tracks requests per IP for rate limiting
 *
 * Quota Tracking:
 *   quota:user:{userId}          -> counter with 24h TTL (86400s)
 *                                   Daily generation quota per user
 *
 * Generation Status:
 *   status:{statusId}            -> JSON status object with 5min TTL (300s)
 *                                   Tracks generation progress for UI polling
 */

import { kv } from '@vercel/kv'
import type { Fingerprint, StatusUpdate, GenerationStatus } from './schemas'

// =============================================================================
// Configuration
// =============================================================================

const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX_REQUESTS = 20
const QUOTA_WINDOW_SECONDS = 86400 // 24 hours
const MAX_DAILY_GENERATIONS_UNAUTH = 3
const MAX_DAILY_GENERATIONS_AUTH = 50
const STATUS_TTL_SECONDS = 300 // 5 minutes

// Check if KV is configured
const isKvConfigured = () =>
  Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)

// Development mode allows bypass when KV is not configured
const isDevelopment = process.env.NODE_ENV === 'development'

// =============================================================================
// Types
// =============================================================================

export interface QuestionSummary {
  hash: string
  statement: string // First 200 chars
  fingerprint: Fingerprint
  createdAt: string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export interface QuotaResult {
  allowed: boolean
  remaining: number
  isAuthenticated: boolean
}

// =============================================================================
// Key Helpers
// =============================================================================

const keys = {
  questionHash: (hash: string) => `q:hash:${hash}`,
  topicSet: (topic: string) => `q:topic:${topic}`,
  subtopicSet: (topic: string, subtopic: string) => `q:topic:${topic}:sub:${subtopic}`,
  summary: (hash: string) => `q:summary:${hash}`,
  rateLimit: (ip: string) => `rl:ip:${ip}`,
  quota: (userId: string) => `quota:user:${userId}`,
  status: (statusId: string) => `status:${statusId}`,
}

// =============================================================================
// Question Storage
// =============================================================================

/**
 * Check if a question exists by hash
 */
export async function hasQuestion(hash: string): Promise<boolean> {
  try {
    const blobUrl = await kv.get<string>(keys.questionHash(hash))
    return blobUrl !== null
  } catch (error) {
    console.error('[KV] hasQuestion error:', error)
    return false
  }
}

/**
 * Get the blob URL for a question hash
 */
export async function getQuestionBlobUrl(hash: string): Promise<string | null> {
  try {
    return await kv.get<string>(keys.questionHash(hash))
  } catch (error) {
    console.error('[KV] getQuestionBlobUrl error:', error)
    return null
  }
}

/**
 * Save question hash -> blob URL mapping
 * Also updates topic indexes atomically
 */
export async function saveQuestionIndex(
  hash: string,
  blobUrl: string,
  topic: string,
  subtopic: string,
  summary: QuestionSummary
): Promise<boolean> {
  try {
    // Use pipeline for atomic operations
    const pipeline = kv.pipeline()

    // Save hash -> blobUrl
    pipeline.set(keys.questionHash(hash), blobUrl)

    // Add to topic set
    pipeline.sadd(keys.topicSet(topic), hash)

    // Add to subtopic set
    pipeline.sadd(keys.subtopicSet(topic, subtopic), hash)

    // Save summary for fast similarity lookup
    pipeline.set(keys.summary(hash), JSON.stringify(summary))

    await pipeline.exec()
    return true
  } catch (error) {
    console.error('[KV] saveQuestionIndex error:', error)
    return false
  }
}

/**
 * Get all question hashes for a topic
 */
export async function getTopicHashes(topic: string): Promise<string[]> {
  try {
    const hashes = await kv.smembers(keys.topicSet(topic))
    return hashes ?? []
  } catch (error) {
    console.error('[KV] getTopicHashes error:', error)
    return []
  }
}

/**
 * Get all question hashes for a topic/subtopic combination
 */
export async function getSubtopicHashes(topic: string, subtopic: string): Promise<string[]> {
  try {
    const hashes = await kv.smembers(keys.subtopicSet(topic, subtopic))
    return hashes ?? []
  } catch (error) {
    console.error('[KV] getSubtopicHashes error:', error)
    return []
  }
}

/**
 * Get question summaries for similarity matching
 */
export async function getQuestionSummaries(hashes: string[]): Promise<QuestionSummary[]> {
  if (hashes.length === 0) return []

  try {
    // Batch get summaries
    const keysToFetch = hashes.map(h => keys.summary(h))
    const results = await kv.mget<string[]>(...keysToFetch)

    const summaries: QuestionSummary[] = []
    for (const result of results) {
      if (result) {
        try {
          summaries.push(JSON.parse(result))
        } catch {
          // Skip invalid JSON
        }
      }
    }
    return summaries
  } catch (error) {
    console.error('[KV] getQuestionSummaries error:', error)
    return []
  }
}

// =============================================================================
// Rate Limiting
// =============================================================================

/**
 * Check and increment rate limit for an IP
 * Returns whether the request is allowed
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const key = keys.rateLimit(ip)
  const now = Math.floor(Date.now() / 1000)

  try {
    // Increment counter atomically
    const pipeline = kv.pipeline()
    pipeline.incr(key)
    pipeline.ttl(key)
    const results = await pipeline.exec()

    const count = (results[0] as number) ?? 1
    const ttl = (results[1] as number) ?? -1

    // If this is a new key, set TTL
    if (ttl === -1) {
      await kv.expire(key, RATE_LIMIT_WINDOW_SECONDS)
    }

    const allowed = count <= RATE_LIMIT_MAX_REQUESTS
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - count)
    const resetAt = now + (ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS)

    return { allowed, remaining, resetAt }
  } catch (error) {
    console.error('[KV] checkRateLimit error:', error)
    // Fail open - allow request if KV is unavailable
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS, resetAt: now + RATE_LIMIT_WINDOW_SECONDS }
  }
}

// =============================================================================
// Quota Tracking
// =============================================================================

/**
 * Check and increment generation quota for a user
 * Unauthenticated users have lower limits
 */
export async function checkQuota(userId: string | null): Promise<QuotaResult> {
  const isAuthenticated = userId !== null && userId !== ''
  const effectiveUserId = userId ?? 'anonymous'
  const key = keys.quota(effectiveUserId)
  const maxGenerations = isAuthenticated ? MAX_DAILY_GENERATIONS_AUTH : MAX_DAILY_GENERATIONS_UNAUTH

  // Development bypass when KV is not configured
  if (isDevelopment && !isKvConfigured()) {
    console.warn('[KV] Development mode: quota check bypassed (KV not configured)')
    return { allowed: true, remaining: 999, isAuthenticated }
  }

  try {
    // Get current count
    const currentCount = await kv.get<number>(key) ?? 0

    if (currentCount >= maxGenerations) {
      return {
        allowed: false,
        remaining: 0,
        isAuthenticated,
      }
    }

    // Increment and set TTL
    const pipeline = kv.pipeline()
    pipeline.incr(key)
    pipeline.ttl(key)
    const [_, ttl] = await pipeline.exec() as [number, number]

    if (ttl === -1) {
      await kv.expire(key, QUOTA_WINDOW_SECONDS)
    }

    return {
      allowed: true,
      remaining: maxGenerations - currentCount - 1,
      isAuthenticated,
    }
  } catch (error) {
    console.error('[KV] checkQuota error:', error)
    // Fail closed for quota - don't allow free generations if KV fails
    return { allowed: false, remaining: 0, isAuthenticated }
  }
}

/**
 * Get remaining quota without incrementing
 */
export async function getQuotaRemaining(userId: string | null): Promise<number> {
  const isAuthenticated = userId !== null && userId !== ''
  const effectiveUserId = userId ?? 'anonymous'
  const key = keys.quota(effectiveUserId)
  const maxGenerations = isAuthenticated ? MAX_DAILY_GENERATIONS_AUTH : MAX_DAILY_GENERATIONS_UNAUTH

  // Development bypass when KV is not configured
  if (isDevelopment && !isKvConfigured()) {
    return 999
  }

  try {
    const currentCount = await kv.get<number>(key) ?? 0
    return Math.max(0, maxGenerations - currentCount)
  } catch (error) {
    console.error('[KV] getQuotaRemaining error:', error)
    return 0
  }
}

// =============================================================================
// Status Tracking
// =============================================================================

/**
 * Update generation status for a request
 */
export async function updateStatus(
  statusId: string,
  status: GenerationStatus,
  message: string,
  progress: number
): Promise<boolean> {
  const update: StatusUpdate = {
    statusId,
    status,
    message,
    progress,
    timestamp: new Date().toISOString(),
  }

  try {
    await kv.set(keys.status(statusId), JSON.stringify(update), {
      ex: STATUS_TTL_SECONDS,
    })
    return true
  } catch (error) {
    console.error('[KV] updateStatus error:', error)
    return false
  }
}

/**
 * Get current status for a request
 */
export async function getStatus(statusId: string): Promise<StatusUpdate | null> {
  try {
    const data = await kv.get<string>(keys.status(statusId))
    if (!data) return null
    return JSON.parse(data)
  } catch (error) {
    console.error('[KV] getStatus error:', error)
    return null
  }
}

// =============================================================================
// KV Health Check
// =============================================================================

/**
 * Check if KV is available and working
 */
export async function isKVAvailable(): Promise<boolean> {
  if (!isKvConfigured()) return false

  try {
    const testKey = 'health:check'
    await kv.set(testKey, 'ok', { ex: 10 })
    const result = await kv.get<string>(testKey)
    return result === 'ok'
  } catch (error) {
    console.error('[KV] Health check failed:', error)
    return false
  }
}

/**
 * Get KV connection status message
 */
export async function getKVStatus(): Promise<{ available: boolean; message: string }> {
  if (!isKvConfigured()) {
    return {
      available: false,
      message: 'Vercel KV not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.',
    }
  }

  const available = await isKVAvailable()
  if (available) {
    return { available: true, message: 'Vercel KV is connected and operational' }
  }

  return {
    available: false,
    message: 'Vercel KV is configured but connection failed. Check credentials.',
  }
}
