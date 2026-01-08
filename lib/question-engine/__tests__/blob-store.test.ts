/**
 * Unit tests for Question Engine Blob Store
 *
 * These tests mock @vercel/blob to test the Blob store logic without
 * requiring real blob storage.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @vercel/blob before importing the module
vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  del: vi.fn(),
  head: vi.fn(),
}))

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

import { put, del, head } from '@vercel/blob'
import {
  saveQuestionToBlob,
  fetchQuestionFromBlob,
  blobExists,
  deleteBlob,
} from '../blob-store'
import type { QuestionDoc } from '../schemas'

// =============================================================================
// Test Fixtures
// =============================================================================

const mockQuestion: QuestionDoc = {
  id: 'q-123',
  statement: 'A block slides down an incline.',
  topic: 'mechanics',
  subtopic: 'inclined_plane',
  fingerprint: {
    topic: 'mechanics',
    subtopic: 'inclined_plane',
    asked: ['acceleration'],
    keywords: ['block', 'incline'],
  },
  templateId: 'mechanics/incline_frictionless',
  steps: [
    {
      id: 'step-1',
      type: 'equation',
      prompt: 'Find the acceleration',
      expected: { type: 'exact', value: '5 m/s²' },
      hint: 'Use Newton\'s second law',
      trap: 'Watch for sign errors',
      solution: 'a = g sin(θ)',
    },
  ],
  finalAnswer: '5 m/s²',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00.000Z',
  source: 'generated',
}

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
// saveQuestionToBlob Tests
// =============================================================================

describe('saveQuestionToBlob', () => {
  it('saves question to blob and returns URL', async () => {
    const expectedUrl = 'https://blob.vercel.com/questions/abc123.json'
    vi.mocked(put).mockResolvedValue({
      url: expectedUrl,
      pathname: 'questions/abc123.json',
      contentType: 'application/json',
      contentDisposition: 'inline',
      downloadUrl: expectedUrl,
    })

    const result = await saveQuestionToBlob('abc123', mockQuestion)

    expect(result).toBe(expectedUrl)
    expect(put).toHaveBeenCalledWith(
      'questions/abc123.json',
      expect.any(String),
      expect.objectContaining({
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      })
    )
  })

  it('saves question as formatted JSON', async () => {
    vi.mocked(put).mockResolvedValue({
      url: 'https://blob.vercel.com/test.json',
      pathname: 'test.json',
      contentType: 'application/json',
      contentDisposition: 'inline',
      downloadUrl: 'https://blob.vercel.com/test.json',
    })

    await saveQuestionToBlob('abc123', mockQuestion)

    const savedContent = vi.mocked(put).mock.calls[0][1] as string
    expect(() => JSON.parse(savedContent)).not.toThrow()
    expect(savedContent).toContain('\n') // Formatted with indentation
  })

  it('returns null on error', async () => {
    vi.mocked(put).mockRejectedValue(new Error('Upload failed'))

    const result = await saveQuestionToBlob('abc123', mockQuestion)

    expect(result).toBeNull()
  })

  it('uses content-addressed path', async () => {
    vi.mocked(put).mockResolvedValue({
      url: 'https://blob.vercel.com/questions/myhash.json',
      pathname: 'questions/myhash.json',
      contentType: 'application/json',
      contentDisposition: 'inline',
      downloadUrl: 'https://blob.vercel.com/questions/myhash.json',
    })

    await saveQuestionToBlob('myhash', mockQuestion)

    expect(put).toHaveBeenCalledWith(
      'questions/myhash.json',
      expect.any(String),
      expect.any(Object)
    )
  })
})

// =============================================================================
// fetchQuestionFromBlob Tests
// =============================================================================

describe('fetchQuestionFromBlob', () => {
  it('fetches and parses question from blob URL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockQuestion),
    })

    const result = await fetchQuestionFromBlob('https://blob.vercel.com/q.json')

    expect(result).toEqual(mockQuestion)
    expect(mockFetch).toHaveBeenCalledWith('https://blob.vercel.com/q.json')
  })

  it('returns null when fetch fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
    })

    const result = await fetchQuestionFromBlob('https://blob.vercel.com/q.json')

    expect(result).toBeNull()
  })

  it('returns null when JSON parsing fails', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    })

    const result = await fetchQuestionFromBlob('https://blob.vercel.com/q.json')

    expect(result).toBeNull()
  })

  it('returns null on network error', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'))

    const result = await fetchQuestionFromBlob('https://blob.vercel.com/q.json')

    expect(result).toBeNull()
  })
})

// =============================================================================
// blobExists Tests
// =============================================================================

describe('blobExists', () => {
  it('returns true when blob exists', async () => {
    vi.mocked(head).mockResolvedValue({
      url: 'https://blob.vercel.com/q.json',
      pathname: 'questions/abc123.json',
      contentType: 'application/json',
      contentDisposition: 'inline',
      downloadUrl: 'https://blob.vercel.com/q.json',
      size: 1024,
      uploadedAt: new Date(),
      cacheControl: 'public, max-age=31536000',
    })

    const result = await blobExists('abc123')

    expect(result).toBe(true)
    expect(head).toHaveBeenCalledWith('questions/abc123.json')
  })

  it('returns false when blob does not exist', async () => {
    vi.mocked(head).mockRejectedValue(new Error('Not found'))

    const result = await blobExists('nonexistent')

    expect(result).toBe(false)
  })
})

// =============================================================================
// deleteBlob Tests
// =============================================================================

describe('deleteBlob', () => {
  it('deletes blob and returns true', async () => {
    vi.mocked(del).mockResolvedValue(undefined)

    const result = await deleteBlob('https://blob.vercel.com/q.json')

    expect(result).toBe(true)
    expect(del).toHaveBeenCalledWith('https://blob.vercel.com/q.json')
  })

  it('returns false on error', async () => {
    vi.mocked(del).mockRejectedValue(new Error('Delete failed'))

    const result = await deleteBlob('https://blob.vercel.com/q.json')

    expect(result).toBe(false)
  })
})

// =============================================================================
// Integration-style Tests
// =============================================================================

describe('Blob Store Integration', () => {
  it('round-trips a question correctly', async () => {
    const blobUrl = 'https://blob.vercel.com/questions/test.json'

    // Save
    vi.mocked(put).mockResolvedValue({
      url: blobUrl,
      pathname: 'questions/test.json',
      contentType: 'application/json',
      contentDisposition: 'inline',
      downloadUrl: blobUrl,
    })

    const savedUrl = await saveQuestionToBlob('test', mockQuestion)
    expect(savedUrl).toBe(blobUrl)

    // Fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(mockQuestion),
    })

    const fetched = await fetchQuestionFromBlob(savedUrl!)
    expect(fetched).toEqual(mockQuestion)
  })

  it('handles concurrent saves correctly', async () => {
    vi.mocked(put).mockImplementation(async (path) => ({
      url: `https://blob.vercel.com/${path}`,
      pathname: path,
      contentType: 'application/json',
      contentDisposition: 'inline',
      downloadUrl: `https://blob.vercel.com/${path}`,
    }))

    // Simulate concurrent saves
    const results = await Promise.all([
      saveQuestionToBlob('hash1', { ...mockQuestion, id: 'q-1' }),
      saveQuestionToBlob('hash2', { ...mockQuestion, id: 'q-2' }),
      saveQuestionToBlob('hash3', { ...mockQuestion, id: 'q-3' }),
    ])

    expect(results).toHaveLength(3)
    expect(results.every(url => url !== null)).toBe(true)
    expect(put).toHaveBeenCalledTimes(3)
  })
})
