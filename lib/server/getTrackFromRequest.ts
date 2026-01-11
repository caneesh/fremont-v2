/**
 * Server-side Track Extraction Helper
 *
 * Extracts and validates user track from API requests.
 * Used by all tutor-related endpoints to get the user's current track.
 */

import { NextRequest } from 'next/server'
import type { Track } from '@prisma/client'

/**
 * Valid track values
 */
const VALID_TRACKS: Track[] = ['foundation1', 'foundation2', 'intermediate', 'competitive']

/**
 * Default track if none provided or invalid
 * Foundation 2 is a safe default - not too easy, not too hard
 */
const DEFAULT_TRACK: Track = 'foundation2'

/**
 * Check if a value is a valid Track
 */
export function isValidTrack(value: unknown): value is Track {
  return typeof value === 'string' && VALID_TRACKS.includes(value as Track)
}

/**
 * Extract track from query parameters
 *
 * @param request - NextRequest object
 * @returns Valid Track value (defaults to foundation2 if missing/invalid)
 */
export function getTrackFromQuery(request: NextRequest): Track {
  const { searchParams } = new URL(request.url)
  const trackParam = searchParams.get('track')

  if (trackParam && isValidTrack(trackParam)) {
    return trackParam
  }

  return DEFAULT_TRACK
}

/**
 * Extract track from JSON body
 *
 * @param body - Parsed JSON body object
 * @returns Valid Track value (defaults to foundation2 if missing/invalid)
 */
export function getTrackFromBody(body: Record<string, unknown>): Track {
  const track = body?.track

  if (track && isValidTrack(track)) {
    return track
  }

  return DEFAULT_TRACK
}

/**
 * Extract track from either query params or JSON body
 * Prefers query param if both are present.
 *
 * @param request - NextRequest object
 * @param body - Optional parsed JSON body
 * @returns Valid Track value (defaults to foundation2 if missing/invalid)
 */
export function getTrackFromRequest(
  request: NextRequest,
  body?: Record<string, unknown>
): Track {
  // First try query param
  const { searchParams } = new URL(request.url)
  const trackParam = searchParams.get('track')

  if (trackParam && isValidTrack(trackParam)) {
    return trackParam
  }

  // Then try body
  if (body) {
    const trackBody = body.track
    if (trackBody && isValidTrack(trackBody)) {
      return trackBody as Track
    }
  }

  return DEFAULT_TRACK
}

/**
 * Log track usage for debugging (dev-only)
 * Call this in API routes to verify track is being received.
 */
export function logTrackUsage(endpoint: string, track: Track, source: 'query' | 'body' | 'default'): void {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Track] ${endpoint}: track=${track} (from ${source})`)
  }
}

/**
 * Determine source of track value for logging
 */
export function getTrackSource(
  request: NextRequest,
  body?: Record<string, unknown>
): 'query' | 'body' | 'default' {
  const { searchParams } = new URL(request.url)
  const trackParam = searchParams.get('track')

  if (trackParam && isValidTrack(trackParam)) {
    return 'query'
  }

  if (body?.track && isValidTrack(body.track)) {
    return 'body'
  }

  return 'default'
}
