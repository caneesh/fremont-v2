/**
 * Question Scaffolding Engine v1 - Blob Store
 *
 * Handles Vercel Blob storage for immutable Question JSON objects.
 * Blobs are addressed by content hash (SHA-256) for deduplication.
 *
 * Key principle: Blob storage is IMMUTABLE.
 * - Once written, a blob is never modified
 * - Content-addressed storage ensures deduplication
 * - All metadata/indexing lives in KV, not Blob
 */

import { put, del, head } from '@vercel/blob'
import type { QuestionDoc } from './schemas'

// =============================================================================
// Configuration
// =============================================================================

const BLOB_PATH_PREFIX = 'questions'

// =============================================================================
// Blob Operations
// =============================================================================

/**
 * Save a QuestionDoc to Blob storage
 * Returns the blob URL on success, null on failure
 */
export async function saveQuestionToBlob(
  hash: string,
  question: QuestionDoc
): Promise<string | null> {
  try {
    const blob = await put(
      `${BLOB_PATH_PREFIX}/${hash}.json`,
      JSON.stringify(question, null, 2),
      {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false, // Use exact path for content-addressed storage
      }
    )
    return blob.url
  } catch (error) {
    console.error('[Blob] saveQuestionToBlob error:', error)
    return null
  }
}

/**
 * Fetch a QuestionDoc from Blob storage by URL
 */
export async function fetchQuestionFromBlob(blobUrl: string): Promise<QuestionDoc | null> {
  try {
    const response = await fetch(blobUrl)
    if (!response.ok) {
      console.error(`[Blob] Fetch failed with status ${response.status}`)
      return null
    }
    const data = await response.json()
    return data as QuestionDoc
  } catch (error) {
    console.error('[Blob] fetchQuestionFromBlob error:', error)
    return null
  }
}

/**
 * Check if a blob exists by hash
 */
export async function blobExists(hash: string): Promise<boolean> {
  try {
    const path = `${BLOB_PATH_PREFIX}/${hash}.json`
    const info = await head(path)
    return info !== null
  } catch {
    return false
  }
}

/**
 * Delete a blob (should rarely be used - blobs are immutable)
 * Only for cleanup of orphaned/invalid entries
 */
export async function deleteBlob(blobUrl: string): Promise<boolean> {
  try {
    await del(blobUrl)
    return true
  } catch (error) {
    console.error('[Blob] deleteBlob error:', error)
    return false
  }
}

// =============================================================================
// Blob Health Check
// =============================================================================

/**
 * Check if Blob storage is available
 */
export async function isBlobAvailable(): Promise<boolean> {
  try {
    // Try to put a small test blob
    const testContent = JSON.stringify({ test: true, timestamp: Date.now() })
    const blob = await put(
      'health/check.json',
      testContent,
      {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
      }
    )

    // Clean up test blob
    await del(blob.url)
    return true
  } catch (error) {
    console.error('[Blob] Health check failed:', error)
    return false
  }
}

/**
 * Get Blob storage status message
 */
export async function getBlobStatus(): Promise<{ available: boolean; message: string }> {
  // Check if env var is set
  const hasToken = !!process.env.BLOB_READ_WRITE_TOKEN

  if (!hasToken) {
    return {
      available: false,
      message: 'Vercel Blob not configured. Set BLOB_READ_WRITE_TOKEN environment variable.',
    }
  }

  const available = await isBlobAvailable()
  if (available) {
    return { available: true, message: 'Vercel Blob is connected and operational' }
  }

  return {
    available: false,
    message: 'Vercel Blob is configured but connection failed. Check token and permissions.',
  }
}
