/**
 * Unit tests for Question Engine KV Store
 *
 * These tests mock @vercel/kv to test the KV store logic without
 * requiring a real Redis connection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @vercel/kv before importing the module
vi.mock('@vercel/kv', () => {
  const mockPipeline = {
    incr: vi.fn().mockReturnThis(),
    ttl: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    sadd: vi.fn().mockReturnThis(),
    exec: vi.fn().mockResolvedValue([1, 60]),
  }

  return {
    kv: {
      get: vi.fn(),
      set: vi.fn(),
      expire: vi.fn(),
      incr: vi.fn(),
      ttl: vi.fn(),
      sadd: vi.fn(),
      smembers: vi.fn(),
      mget: vi.fn(),
      pipeline: vi.fn(() => mockPipeline),
    },
  }
})

import { kv } from '@vercel/kv'
import {
  hasQuestion,
  getQuestionBlobUrl,
  saveQuestionIndex,
  getTopicHashes,
  getSubtopicHashes,
  getQuestionSummaries,
  checkRateLimit,
  checkQuota,
  getQuotaRemaining,
  updateStatus,
  getStatus,
  type QuestionSummary,
} from '../kv-store'
import type { Fingerprint } from '../schemas'

// =============================================================================
// Test Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.resetAllMocks()
})

// =============================================================================
// hasQuestion Tests
// =============================================================================

describe('hasQuestion', () => {
  it('returns true when hash exists', async () => {
    vi.mocked(kv.get).mockResolvedValue('https://blob.vercel.com/question.json')

    const result = await hasQuestion('abc123')

    expect(result).toBe(true)
    expect(kv.get).toHaveBeenCalledWith('q:hash:abc123')
  })

  it('returns false when hash does not exist', async () => {
    vi.mocked(kv.get).mockResolvedValue(null)

    const result = await hasQuestion('nonexistent')

    expect(result).toBe(false)
  })

  it('returns false on error', async () => {
    vi.mocked(kv.get).mockRejectedValue(new Error('Connection failed'))

    const result = await hasQuestion('abc123')

    expect(result).toBe(false)
  })
})

// =============================================================================
// getQuestionBlobUrl Tests
// =============================================================================

describe('getQuestionBlobUrl', () => {
  it('returns blob URL when hash exists', async () => {
    const expectedUrl = 'https://blob.vercel.com/question.json'
    vi.mocked(kv.get).mockResolvedValue(expectedUrl)

    const result = await getQuestionBlobUrl('abc123')

    expect(result).toBe(expectedUrl)
    expect(kv.get).toHaveBeenCalledWith('q:hash:abc123')
  })

  it('returns null when hash does not exist', async () => {
    vi.mocked(kv.get).mockResolvedValue(null)

    const result = await getQuestionBlobUrl('nonexistent')

    expect(result).toBeNull()
  })

  it('returns null on error', async () => {
    vi.mocked(kv.get).mockRejectedValue(new Error('Connection failed'))

    const result = await getQuestionBlobUrl('abc123')

    expect(result).toBeNull()
  })
})

// =============================================================================
// saveQuestionIndex Tests
// =============================================================================

describe('saveQuestionIndex', () => {
  const mockSummary: QuestionSummary = {
    hash: 'abc123',
    statement: 'A block slides down...',
    fingerprint: {
      topic: 'mechanics',
      subtopic: 'inclined_plane',
      asked: ['acceleration'],
      keywords: ['block', 'incline'],
    },
    createdAt: '2025-01-01T00:00:00.000Z',
  }

  it('saves index to KV with correct keys', async () => {
    const mockPipeline = kv.pipeline()
    vi.mocked(mockPipeline.exec).mockResolvedValue([])

    const result = await saveQuestionIndex(
      'abc123',
      'https://blob.vercel.com/q.json',
      'mechanics',
      'inclined_plane',
      mockSummary
    )

    expect(result).toBe(true)
    expect(kv.pipeline).toHaveBeenCalled()
  })

  it('returns false on error', async () => {
    const mockPipeline = kv.pipeline()
    vi.mocked(mockPipeline.exec).mockRejectedValue(new Error('Pipeline failed'))

    const result = await saveQuestionIndex(
      'abc123',
      'https://blob.vercel.com/q.json',
      'mechanics',
      'inclined_plane',
      mockSummary
    )

    expect(result).toBe(false)
  })
})

// =============================================================================
// getTopicHashes Tests
// =============================================================================

describe('getTopicHashes', () => {
  it('returns array of hashes for topic', async () => {
    const expectedHashes = ['hash1', 'hash2', 'hash3']
    vi.mocked(kv.smembers).mockResolvedValue(expectedHashes)

    const result = await getTopicHashes('mechanics')

    expect(result).toEqual(expectedHashes)
    expect(kv.smembers).toHaveBeenCalledWith('q:topic:mechanics')
  })

  it('returns empty array when no hashes exist', async () => {
    vi.mocked(kv.smembers).mockResolvedValue(null)

    const result = await getTopicHashes('mechanics')

    expect(result).toEqual([])
  })

  it('returns empty array on error', async () => {
    vi.mocked(kv.smembers).mockRejectedValue(new Error('Connection failed'))

    const result = await getTopicHashes('mechanics')

    expect(result).toEqual([])
  })
})

// =============================================================================
// getSubtopicHashes Tests
// =============================================================================

describe('getSubtopicHashes', () => {
  it('returns array of hashes for topic/subtopic', async () => {
    const expectedHashes = ['hash1', 'hash2']
    vi.mocked(kv.smembers).mockResolvedValue(expectedHashes)

    const result = await getSubtopicHashes('mechanics', 'inclined_plane')

    expect(result).toEqual(expectedHashes)
    expect(kv.smembers).toHaveBeenCalledWith('q:topic:mechanics:sub:inclined_plane')
  })

  it('returns empty array when no hashes exist', async () => {
    vi.mocked(kv.smembers).mockResolvedValue(null)

    const result = await getSubtopicHashes('mechanics', 'inclined_plane')

    expect(result).toEqual([])
  })
})

// =============================================================================
// getQuestionSummaries Tests
// =============================================================================

describe('getQuestionSummaries', () => {
  it('returns empty array for empty input', async () => {
    const result = await getQuestionSummaries([])

    expect(result).toEqual([])
    expect(kv.mget).not.toHaveBeenCalled()
  })

  it('returns parsed summaries', async () => {
    const summary1: QuestionSummary = {
      hash: 'hash1',
      statement: 'Problem 1',
      fingerprint: {
        topic: 'mechanics',
        subtopic: 'incline',
        asked: ['acceleration'],
        keywords: ['block'],
      },
      createdAt: '2025-01-01T00:00:00.000Z',
    }
    const summary2: QuestionSummary = {
      hash: 'hash2',
      statement: 'Problem 2',
      fingerprint: {
        topic: 'mechanics',
        subtopic: 'projectile',
        asked: ['range'],
        keywords: ['ball'],
      },
      createdAt: '2025-01-01T00:00:00.000Z',
    }

    vi.mocked(kv.mget).mockResolvedValue([
      JSON.stringify(summary1),
      JSON.stringify(summary2),
    ])

    const result = await getQuestionSummaries(['hash1', 'hash2'])

    expect(result).toHaveLength(2)
    expect(result[0].hash).toBe('hash1')
    expect(result[1].hash).toBe('hash2')
  })

  it('skips invalid JSON entries', async () => {
    vi.mocked(kv.mget).mockResolvedValue([
      'invalid json',
      JSON.stringify({
        hash: 'valid',
        statement: 'Valid',
        fingerprint: { topic: 't', subtopic: 's', asked: [], keywords: [] },
        createdAt: '2025-01-01T00:00:00.000Z',
      }),
    ])

    const result = await getQuestionSummaries(['hash1', 'hash2'])

    expect(result).toHaveLength(1)
    expect(result[0].hash).toBe('valid')
  })

  it('returns empty array on error', async () => {
    vi.mocked(kv.mget).mockRejectedValue(new Error('Connection failed'))

    const result = await getQuestionSummaries(['hash1'])

    expect(result).toEqual([])
  })
})

// =============================================================================
// checkRateLimit Tests
// =============================================================================

describe('checkRateLimit', () => {
  it('allows request when under limit', async () => {
    const mockPipeline = kv.pipeline()
    vi.mocked(mockPipeline.exec).mockResolvedValue([5, 30]) // count=5, ttl=30

    const result = await checkRateLimit('192.168.1.1')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(15) // 20 - 5
    expect(result.resetAt).toBeGreaterThan(Date.now() / 1000)
  })

  it('denies request when at limit', async () => {
    const mockPipeline = kv.pipeline()
    vi.mocked(mockPipeline.exec).mockResolvedValue([21, 30]) // count=21, over limit

    const result = await checkRateLimit('192.168.1.1')

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('sets TTL for new keys', async () => {
    const mockPipeline = kv.pipeline()
    vi.mocked(mockPipeline.exec).mockResolvedValue([1, -1]) // count=1, no TTL (new key)

    await checkRateLimit('192.168.1.1')

    expect(kv.expire).toHaveBeenCalled()
  })

  it('fails open on error (allows request)', async () => {
    const mockPipeline = kv.pipeline()
    vi.mocked(mockPipeline.exec).mockRejectedValue(new Error('Connection failed'))

    const result = await checkRateLimit('192.168.1.1')

    expect(result.allowed).toBe(true)
  })
})

// =============================================================================
// checkQuota Tests
// =============================================================================

describe('checkQuota', () => {
  it('allows request for unauthenticated user under limit', async () => {
    vi.mocked(kv.get).mockResolvedValue(1) // 1 generation used

    const mockPipeline = kv.pipeline()
    vi.mocked(mockPipeline.exec).mockResolvedValue([2, 3600])

    const result = await checkQuota(null)

    expect(result.allowed).toBe(true)
    expect(result.isAuthenticated).toBe(false)
    expect(result.remaining).toBe(1) // 3 - 1 - 1 = 1
  })

  it('denies unauthenticated user at limit', async () => {
    vi.mocked(kv.get).mockResolvedValue(3) // 3 generations used (at limit)

    const result = await checkQuota(null)

    expect(result.allowed).toBe(false)
    expect(result.isAuthenticated).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('allows higher limit for authenticated user', async () => {
    vi.mocked(kv.get).mockResolvedValue(10) // 10 generations used

    const mockPipeline = kv.pipeline()
    vi.mocked(mockPipeline.exec).mockResolvedValue([11, 3600])

    const result = await checkQuota('user-123')

    expect(result.allowed).toBe(true)
    expect(result.isAuthenticated).toBe(true)
    expect(result.remaining).toBe(39) // 50 - 10 - 1 = 39
  })

  it('denies authenticated user at limit', async () => {
    vi.mocked(kv.get).mockResolvedValue(50) // at limit

    const result = await checkQuota('user-123')

    expect(result.allowed).toBe(false)
    expect(result.isAuthenticated).toBe(true)
  })

  it('fails closed on error (denies request)', async () => {
    vi.mocked(kv.get).mockRejectedValue(new Error('Connection failed'))

    const result = await checkQuota('user-123')

    expect(result.allowed).toBe(false)
  })
})

// =============================================================================
// getQuotaRemaining Tests
// =============================================================================

describe('getQuotaRemaining', () => {
  it('returns remaining quota for unauthenticated user', async () => {
    vi.mocked(kv.get).mockResolvedValue(1)

    const result = await getQuotaRemaining(null)

    expect(result).toBe(2) // 3 - 1 = 2
  })

  it('returns remaining quota for authenticated user', async () => {
    vi.mocked(kv.get).mockResolvedValue(10)

    const result = await getQuotaRemaining('user-123')

    expect(result).toBe(40) // 50 - 10 = 40
  })

  it('returns 0 when over quota', async () => {
    vi.mocked(kv.get).mockResolvedValue(100)

    const result = await getQuotaRemaining(null)

    expect(result).toBe(0)
  })

  it('returns 0 on error', async () => {
    vi.mocked(kv.get).mockRejectedValue(new Error('Connection failed'))

    const result = await getQuotaRemaining('user-123')

    expect(result).toBe(0)
  })
})

// =============================================================================
// updateStatus Tests
// =============================================================================

describe('updateStatus', () => {
  it('saves status to KV with TTL', async () => {
    vi.mocked(kv.set).mockResolvedValue('OK')

    const result = await updateStatus('status-123', 'generating', 'Generating...', 50)

    expect(result).toBe(true)
    expect(kv.set).toHaveBeenCalledWith(
      'status:status-123',
      expect.any(String),
      { ex: 300 }
    )
  })

  it('includes all status fields in saved data', async () => {
    vi.mocked(kv.set).mockResolvedValue('OK')

    await updateStatus('status-123', 'completed', 'Done!', 100)

    const savedData = JSON.parse(vi.mocked(kv.set).mock.calls[0][1] as string)
    expect(savedData.statusId).toBe('status-123')
    expect(savedData.status).toBe('completed')
    expect(savedData.message).toBe('Done!')
    expect(savedData.progress).toBe(100)
    expect(savedData.timestamp).toBeDefined()
  })

  it('returns false on error', async () => {
    vi.mocked(kv.set).mockRejectedValue(new Error('Connection failed'))

    const result = await updateStatus('status-123', 'error', 'Failed', 0)

    expect(result).toBe(false)
  })
})

// =============================================================================
// getStatus Tests
// =============================================================================

describe('getStatus', () => {
  it('returns parsed status when exists', async () => {
    const status = {
      statusId: 'status-123',
      status: 'generating',
      message: 'Generating...',
      progress: 50,
      timestamp: '2025-01-01T00:00:00.000Z',
    }
    vi.mocked(kv.get).mockResolvedValue(JSON.stringify(status))

    const result = await getStatus('status-123')

    expect(result).toEqual(status)
    expect(kv.get).toHaveBeenCalledWith('status:status-123')
  })

  it('returns null when status does not exist', async () => {
    vi.mocked(kv.get).mockResolvedValue(null)

    const result = await getStatus('nonexistent')

    expect(result).toBeNull()
  })

  it('returns null on error', async () => {
    vi.mocked(kv.get).mockRejectedValue(new Error('Connection failed'))

    const result = await getStatus('status-123')

    expect(result).toBeNull()
  })
})
