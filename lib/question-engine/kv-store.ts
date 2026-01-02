/**
 * Question Scaffolding Engine v1 - KV Store
 *
 * Handles all Redis operations with atomic guarantees.
 * Uses ioredis for TCP connection to Redis Labs.
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

import Redis from 'ioredis'
import type { Fingerprint, StatusUpdate, GenerationStatus } from './schemas'

// =============================================================================
// Redis Client Setup
// =============================================================================

let redis: Redis | null = null

function getRedisClient(): Redis {
  if (!redis) {
    const redisUrl = process.env.REDIS_URL
    if (!redisUrl) {
      throw new Error('REDIS_URL environment variable is not set')
    }
    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      lazyConnect: true,
    })
  }
  return redis
}

// Check if Redis is configured
const isRedisConfigured = () => Boolean(process.env.REDIS_URL)

// Development mode allows bypass when Redis is not configured
const isDevelopment = process.env.NODE_ENV === 'development'

// =============================================================================
// Configuration
// =============================================================================

const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX_REQUESTS = 20
const QUOTA_WINDOW_SECONDS = 86400 // 24 hours
const MAX_DAILY_GENERATIONS_UNAUTH = 3
const MAX_DAILY_GENERATIONS_AUTH = 50
const STATUS_TTL_SECONDS = 300 // 5 minutes

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
    const client = getRedisClient()
    const blobUrl = await client.get(keys.questionHash(hash))
    return blobUrl !== null
  } catch (error) {
    console.error('[Redis] hasQuestion error:', error)
    return false
  }
}

/**
 * Get the blob URL for a question hash
 */
export async function getQuestionBlobUrl(hash: string): Promise<string | null> {
  try {
    const client = getRedisClient()
    return await client.get(keys.questionHash(hash))
  } catch (error) {
    console.error('[Redis] getQuestionBlobUrl error:', error)
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
    const client = getRedisClient()
    // Use pipeline for atomic operations
    const pipeline = client.pipeline()

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
    console.error('[Redis] saveQuestionIndex error:', error)
    return false
  }
}

/**
 * Get all question hashes for a topic
 */
export async function getTopicHashes(topic: string): Promise<string[]> {
  try {
    const client = getRedisClient()
    const hashes = await client.smembers(keys.topicSet(topic))
    return hashes ?? []
  } catch (error) {
    console.error('[Redis] getTopicHashes error:', error)
    return []
  }
}

/**
 * Get all question hashes for a topic/subtopic combination
 */
export async function getSubtopicHashes(topic: string, subtopic: string): Promise<string[]> {
  try {
    const client = getRedisClient()
    const hashes = await client.smembers(keys.subtopicSet(topic, subtopic))
    return hashes ?? []
  } catch (error) {
    console.error('[Redis] getSubtopicHashes error:', error)
    return []
  }
}

/**
 * Get question summaries for similarity matching
 */
export async function getQuestionSummaries(hashes: string[]): Promise<QuestionSummary[]> {
  if (hashes.length === 0) return []

  try {
    const client = getRedisClient()
    // Batch get summaries
    const keysToFetch = hashes.map(h => keys.summary(h))
    const results = await client.mget(...keysToFetch)

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
    console.error('[Redis] getQuestionSummaries error:', error)
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
    const client = getRedisClient()
    // Increment counter and get TTL atomically
    const pipeline = client.pipeline()
    pipeline.incr(key)
    pipeline.ttl(key)
    const results = await pipeline.exec()

    const count = results?.[0]?.[1] as number ?? 1
    const ttl = results?.[1]?.[1] as number ?? -1

    // If this is a new key, set TTL
    if (ttl === -1) {
      await client.expire(key, RATE_LIMIT_WINDOW_SECONDS)
    }

    const allowed = count <= RATE_LIMIT_MAX_REQUESTS
    const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - count)
    const resetAt = now + (ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS)

    return { allowed, remaining, resetAt }
  } catch (error) {
    console.error('[Redis] checkRateLimit error:', error)
    // Fail open - allow request if Redis is unavailable
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

  // Development bypass when Redis is not configured
  if (isDevelopment && !isRedisConfigured()) {
    console.warn('[Redis] Development mode: quota check bypassed (Redis not configured)')
    return { allowed: true, remaining: 999, isAuthenticated }
  }

  try {
    const client = getRedisClient()
    // Get current count
    const currentCountStr = await client.get(key)
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0

    if (currentCount >= maxGenerations) {
      return {
        allowed: false,
        remaining: 0,
        isAuthenticated,
      }
    }

    // Increment and get TTL
    const pipeline = client.pipeline()
    pipeline.incr(key)
    pipeline.ttl(key)
    const results = await pipeline.exec()
    const ttl = results?.[1]?.[1] as number ?? -1

    if (ttl === -1) {
      await client.expire(key, QUOTA_WINDOW_SECONDS)
    }

    return {
      allowed: true,
      remaining: maxGenerations - currentCount - 1,
      isAuthenticated,
    }
  } catch (error) {
    console.error('[Redis] checkQuota error:', error)
    // Fail closed for quota - don't allow free generations if Redis fails
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

  // Development bypass when Redis is not configured
  if (isDevelopment && !isRedisConfigured()) {
    return 999
  }

  try {
    const client = getRedisClient()
    const currentCountStr = await client.get(key)
    const currentCount = currentCountStr ? parseInt(currentCountStr, 10) : 0
    return Math.max(0, maxGenerations - currentCount)
  } catch (error) {
    console.error('[Redis] getQuotaRemaining error:', error)
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
    const client = getRedisClient()
    await client.set(keys.status(statusId), JSON.stringify(update), 'EX', STATUS_TTL_SECONDS)
    return true
  } catch (error) {
    console.error('[Redis] updateStatus error:', error)
    return false
  }
}

/**
 * Get current status for a request
 */
export async function getStatus(statusId: string): Promise<StatusUpdate | null> {
  try {
    const client = getRedisClient()
    const data = await client.get(keys.status(statusId))
    if (!data) return null
    return JSON.parse(data)
  } catch (error) {
    console.error('[Redis] getStatus error:', error)
    return null
  }
}

// =============================================================================
// Redis Health Check
// =============================================================================

/**
 * Check if Redis is available and working
 */
export async function isKVAvailable(): Promise<boolean> {
  try {
    const client = getRedisClient()
    const testKey = 'health:check'
    await client.set(testKey, 'ok', 'EX', 10)
    const result = await client.get(testKey)
    return result === 'ok'
  } catch (error) {
    console.error('[Redis] Health check failed:', error)
    return false
  }
}

/**
 * Get Redis connection status message
 */
export async function getKVStatus(): Promise<{ available: boolean; message: string }> {
  const available = await isKVAvailable()
  if (available) {
    return { available: true, message: 'Redis is connected and operational' }
  }

  // Check if env var is set
  const hasUrl = !!process.env.REDIS_URL

  if (!hasUrl) {
    return {
      available: false,
      message: 'Redis not configured. Set REDIS_URL environment variable.',
    }
  }

  return {
    available: false,
    message: 'Redis is configured but connection failed. Check credentials and network.',
  }
}

/**
 * Gracefully close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
  }
}
