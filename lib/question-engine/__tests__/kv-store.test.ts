/**
 * Unit tests for Question Engine KV Store
 *
 * These tests mock ioredis to test the KV store logic without
 * requiring a real Redis connection.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Create mock functions for Redis methods
const mockGet = vi.fn()
const mockSet = vi.fn()
const mockExpire = vi.fn()
const mockIncr = vi.fn()
const mockSmembers = vi.fn()
const mockMget = vi.fn()
const mockSadd = vi.fn()
const mockTtl = vi.fn()
const mockQuit = vi.fn()

// Create mock pipeline
const mockPipelineExec = vi.fn()
const mockPipeline = {
  set: vi.fn().mockReturnThis(),
  sadd: vi.fn().mockReturnThis(),
  incr: vi.fn().mockReturnThis(),
  ttl: vi.fn().mockReturnThis(),
  exec: mockPipelineExec,
}

// Mock ioredis with a proper class before importing the module
vi.mock('ioredis', () => {
  // Create a mock Redis class
  class MockRedis {
    get = mockGet
    set = mockSet
    expire = mockExpire
    incr = mockIncr
    smembers = mockSmembers
    mget = mockMget
    sadd = mockSadd
    ttl = mockTtl
    quit = mockQuit
    pipeline = vi.fn(() => mockPipeline)
  }
  return {
    default: MockRedis,
  }
})

// Set REDIS_URL before importing to avoid the error
process.env.REDIS_URL = 'redis://localhost:6379'

// Dynamic import to ensure mock is applied first
let hasQuestion: typeof import('../kv-store').hasQuestion
let getQuestionBlobUrl: typeof import('../kv-store').getQuestionBlobUrl
let saveQuestionIndex: typeof import('../kv-store').saveQuestionIndex
let getTopicHashes: typeof import('../kv-store').getTopicHashes
let getSubtopicHashes: typeof import('../kv-store').getSubtopicHashes
let getQuestionSummaries: typeof import('../kv-store').getQuestionSummaries
let checkRateLimit: typeof import('../kv-store').checkRateLimit
let checkQuota: typeof import('../kv-store').checkQuota
let getQuotaRemaining: typeof import('../kv-store').getQuotaRemaining
let updateStatus: typeof import('../kv-store').updateStatus
let getStatus: typeof import('../kv-store').getStatus
let closeRedisConnection: typeof import('../kv-store').closeRedisConnection
type QuestionSummary = import('../kv-store').QuestionSummary

beforeAll(async () => {
  const module = await import('../kv-store')
  hasQuestion = module.hasQuestion
  getQuestionBlobUrl = module.getQuestionBlobUrl
  saveQuestionIndex = module.saveQuestionIndex
  getTopicHashes = module.getTopicHashes
  getSubtopicHashes = module.getSubtopicHashes
  getQuestionSummaries = module.getQuestionSummaries
  checkRateLimit = module.checkRateLimit
  checkQuota = module.checkQuota
  getQuotaRemaining = module.getQuotaRemaining
  updateStatus = module.updateStatus
  getStatus = module.getStatus
  closeRedisConnection = module.closeRedisConnection
})

// =============================================================================
// Test Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks()
  // Reset all mock implementations
  mockGet.mockReset()
  mockSet.mockReset()
  mockExpire.mockReset()
  mockIncr.mockReset()
  mockSmembers.mockReset()
  mockMget.mockReset()
  mockSadd.mockReset()
  mockTtl.mockReset()
  mockPipelineExec.mockReset()
  mockPipeline.set.mockReturnThis()
  mockPipeline.sadd.mockReturnThis()
  mockPipeline.incr.mockReturnThis()
  mockPipeline.ttl.mockReturnThis()
})

afterEach(() => {
  vi.resetAllMocks()
})

// =============================================================================
// hasQuestion Tests
// =============================================================================

describe('hasQuestion', () => {
  it('returns true when hash exists', async () => {
    mockGet.mockResolvedValue('https://blob.vercel.com/question.json')

    const result = await hasQuestion('abc123')

    expect(result).toBe(true)
    expect(mockGet).toHaveBeenCalledWith('q:hash:abc123')
  })

  it('returns false when hash does not exist', async () => {
    mockGet.mockResolvedValue(null)

    const result = await hasQuestion('nonexistent')

    expect(result).toBe(false)
  })

  it('returns false on error', async () => {
    mockGet.mockRejectedValue(new Error('Connection failed'))

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
    mockGet.mockResolvedValue(expectedUrl)

    const result = await getQuestionBlobUrl('abc123')

    expect(result).toBe(expectedUrl)
    expect(mockGet).toHaveBeenCalledWith('q:hash:abc123')
  })

  it('returns null when hash does not exist', async () => {
    mockGet.mockResolvedValue(null)

    const result = await getQuestionBlobUrl('nonexistent')

    expect(result).toBeNull()
  })

  it('returns null on error', async () => {
    mockGet.mockRejectedValue(new Error('Connection failed'))

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
    mockPipelineExec.mockResolvedValue([
      [null, 'OK'],
      [null, 1],
      [null, 1],
      [null, 'OK'],
    ])

    const result = await saveQuestionIndex(
      'abc123',
      'https://blob.vercel.com/q.json',
      'mechanics',
      'inclined_plane',
      mockSummary
    )

    expect(result).toBe(true)
    expect(mockPipeline.set).toHaveBeenCalled()
    expect(mockPipeline.sadd).toHaveBeenCalled()
  })

  it('returns false on error', async () => {
    mockPipelineExec.mockRejectedValue(new Error('Pipeline failed'))

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
    mockSmembers.mockResolvedValue(expectedHashes)

    const result = await getTopicHashes('mechanics')

    expect(result).toEqual(expectedHashes)
    expect(mockSmembers).toHaveBeenCalledWith('q:topic:mechanics')
  })

  it('returns empty array when no hashes exist', async () => {
    mockSmembers.mockResolvedValue(null)

    const result = await getTopicHashes('mechanics')

    expect(result).toEqual([])
  })

  it('returns empty array on error', async () => {
    mockSmembers.mockRejectedValue(new Error('Connection failed'))

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
    mockSmembers.mockResolvedValue(expectedHashes)

    const result = await getSubtopicHashes('mechanics', 'inclined_plane')

    expect(result).toEqual(expectedHashes)
    expect(mockSmembers).toHaveBeenCalledWith('q:topic:mechanics:sub:inclined_plane')
  })

  it('returns empty array when no hashes exist', async () => {
    mockSmembers.mockResolvedValue(null)

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
    expect(mockMget).not.toHaveBeenCalled()
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

    mockMget.mockResolvedValue([
      JSON.stringify(summary1),
      JSON.stringify(summary2),
    ])

    const result = await getQuestionSummaries(['hash1', 'hash2'])

    expect(result).toHaveLength(2)
    expect(result[0].hash).toBe('hash1')
    expect(result[1].hash).toBe('hash2')
  })

  it('skips invalid JSON entries', async () => {
    mockMget.mockResolvedValue([
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
    mockMget.mockRejectedValue(new Error('Connection failed'))

    const result = await getQuestionSummaries(['hash1'])

    expect(result).toEqual([])
  })
})

// =============================================================================
// checkRateLimit Tests
// =============================================================================

describe('checkRateLimit', () => {
  it('allows request when under limit', async () => {
    // Pipeline returns [error, result] tuples
    mockPipelineExec.mockResolvedValue([
      [null, 5],  // count=5
      [null, 30], // ttl=30
    ])

    const result = await checkRateLimit('192.168.1.1')

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(15) // 20 - 5
    expect(result.resetAt).toBeGreaterThan(Date.now() / 1000)
  })

  it('denies request when at limit', async () => {
    mockPipelineExec.mockResolvedValue([
      [null, 21], // count=21, over limit
      [null, 30],
    ])

    const result = await checkRateLimit('192.168.1.1')

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('sets TTL for new keys', async () => {
    mockPipelineExec.mockResolvedValue([
      [null, 1],  // count=1
      [null, -1], // no TTL (new key)
    ])
    mockExpire.mockResolvedValue(1)

    await checkRateLimit('192.168.1.1')

    expect(mockExpire).toHaveBeenCalled()
  })

  it('fails open on error (allows request)', async () => {
    mockPipelineExec.mockRejectedValue(new Error('Connection failed'))

    const result = await checkRateLimit('192.168.1.1')

    expect(result.allowed).toBe(true)
  })
})

// =============================================================================
// checkQuota Tests
// =============================================================================

describe('checkQuota', () => {
  it('allows request for unauthenticated user under limit', async () => {
    mockGet.mockResolvedValue('1') // 1 generation used (string from Redis)
    mockPipelineExec.mockResolvedValue([
      [null, 2],
      [null, 3600],
    ])

    const result = await checkQuota(null)

    expect(result.allowed).toBe(true)
    expect(result.isAuthenticated).toBe(false)
    expect(result.remaining).toBe(48) // 50 - 1 - 1 = 48
  })

  it('denies unauthenticated user at limit', async () => {
    mockGet.mockResolvedValue('50') // 50 generations used (at limit)

    const result = await checkQuota(null)

    expect(result.allowed).toBe(false)
    expect(result.isAuthenticated).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('allows higher limit for authenticated user', async () => {
    mockGet.mockResolvedValue('10') // 10 generations used
    mockPipelineExec.mockResolvedValue([
      [null, 11],
      [null, 3600],
    ])

    const result = await checkQuota('user-123')

    expect(result.allowed).toBe(true)
    expect(result.isAuthenticated).toBe(true)
    expect(result.remaining).toBe(189) // 200 - 10 - 1 = 189
  })

  it('denies authenticated user at limit', async () => {
    mockGet.mockResolvedValue('200') // at limit

    const result = await checkQuota('user-123')

    expect(result.allowed).toBe(false)
    expect(result.isAuthenticated).toBe(true)
  })

  it('fails closed on error (denies request)', async () => {
    mockGet.mockRejectedValue(new Error('Connection failed'))

    const result = await checkQuota('user-123')

    expect(result.allowed).toBe(false)
  })
})

// =============================================================================
// getQuotaRemaining Tests
// =============================================================================

describe('getQuotaRemaining', () => {
  it('returns remaining quota for unauthenticated user', async () => {
    mockGet.mockResolvedValue('1')

    const result = await getQuotaRemaining(null)

    expect(result).toBe(49) // 50 - 1 = 49
  })

  it('returns remaining quota for authenticated user', async () => {
    mockGet.mockResolvedValue('10')

    const result = await getQuotaRemaining('user-123')

    expect(result).toBe(190) // 200 - 10 = 190
  })

  it('returns 0 when over quota', async () => {
    mockGet.mockResolvedValue('100')

    const result = await getQuotaRemaining(null)

    expect(result).toBe(0)
  })

  it('returns 0 on error', async () => {
    mockGet.mockRejectedValue(new Error('Connection failed'))

    const result = await getQuotaRemaining('user-123')

    expect(result).toBe(0)
  })
})

// =============================================================================
// updateStatus Tests
// =============================================================================

describe('updateStatus', () => {
  it('saves status to KV with TTL', async () => {
    mockSet.mockResolvedValue('OK')

    const result = await updateStatus('status-123', 'generating', 'Generating...', 50)

    expect(result).toBe(true)
    expect(mockSet).toHaveBeenCalledWith(
      'status:status-123',
      expect.any(String),
      'EX',
      300
    )
  })

  it('includes all status fields in saved data', async () => {
    mockSet.mockResolvedValue('OK')

    await updateStatus('status-123', 'completed', 'Done!', 100)

    const savedData = JSON.parse(mockSet.mock.calls[0][1] as string)
    expect(savedData.statusId).toBe('status-123')
    expect(savedData.status).toBe('completed')
    expect(savedData.message).toBe('Done!')
    expect(savedData.progress).toBe(100)
    expect(savedData.timestamp).toBeDefined()
  })

  it('returns false on error', async () => {
    mockSet.mockRejectedValue(new Error('Connection failed'))

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
    mockGet.mockResolvedValue(JSON.stringify(status))

    const result = await getStatus('status-123')

    expect(result).toEqual(status)
    expect(mockGet).toHaveBeenCalledWith('status:status-123')
  })

  it('returns null when status does not exist', async () => {
    mockGet.mockResolvedValue(null)

    const result = await getStatus('nonexistent')

    expect(result).toBeNull()
  })

  it('returns null on error', async () => {
    mockGet.mockRejectedValue(new Error('Connection failed'))

    const result = await getStatus('status-123')

    expect(result).toBeNull()
  })
})
