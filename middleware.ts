/**
 * Question Scaffolding Engine v1 - Rate Limiting Middleware
 *
 * Implements IP-based rate limiting for /api/question/resolve.
 * Uses Vercel KV for distributed rate limiting with TTL.
 *
 * Configuration:
 * - 20 requests per minute for unauthenticated users
 * - 100 requests per minute for authenticated users
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { kv } from '@vercel/kv'

// =============================================================================
// Configuration
// =============================================================================

const RATE_LIMIT_WINDOW_SECONDS = 60
const RATE_LIMIT_MAX_UNAUTHENTICATED = 20
const RATE_LIMIT_MAX_AUTHENTICATED = 100

// Routes to apply rate limiting
const RATE_LIMITED_ROUTES = ['/api/question/resolve']

// =============================================================================
// Rate Limiting Logic
// =============================================================================

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

async function checkRateLimit(ip: string, limit: number): Promise<RateLimitResult> {
  const key = `rl:ip:${ip}`
  const now = Math.floor(Date.now() / 1000)

  try {
    // Increment counter atomically
    const pipeline = kv.pipeline()
    pipeline.incr(key)
    pipeline.ttl(key)
    const results = await pipeline.exec()

    const count = results[0] as number
    const ttl = results[1] as number

    // Set TTL if new key
    if (ttl === -1) {
      await kv.expire(key, RATE_LIMIT_WINDOW_SECONDS)
    }

    const allowed = count <= limit
    const remaining = Math.max(0, limit - count)
    const resetAt = now + (ttl > 0 ? ttl : RATE_LIMIT_WINDOW_SECONDS)

    return { allowed, remaining, resetAt }
  } catch (error) {
    console.error('[Middleware] Rate limit check failed:', error)
    // Fail open - allow request if KV is unavailable
    return { allowed: true, remaining: limit, resetAt: now + RATE_LIMIT_WINDOW_SECONDS }
  }
}

function getClientIP(request: NextRequest): string {
  // Try various headers for IP (in order of preference)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback - in some environments request.ip is not available
  return 'unknown'
}

function isAuthenticated(request: NextRequest): boolean {
  // Check for auth header or cookie
  // This is a simple check - real auth would use JWT validation
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return true
  }

  // Check for session cookie (customize based on your auth system)
  const sessionCookie = request.cookies.get('session')
  if (sessionCookie?.value) {
    return true
  }

  return false
}

// =============================================================================
// Middleware Handler
// =============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only apply rate limiting to specific routes
  const shouldRateLimit = RATE_LIMITED_ROUTES.some(route => pathname.startsWith(route))

  if (!shouldRateLimit) {
    return NextResponse.next()
  }

  // Get client IP
  const clientIP = getClientIP(request)

  // Check if authenticated (authenticated users get higher limits)
  const authenticated = isAuthenticated(request)
  const limit = authenticated ? RATE_LIMIT_MAX_AUTHENTICATED : RATE_LIMIT_MAX_UNAUTHENTICATED

  // Check rate limit
  const rateLimitResult = await checkRateLimit(clientIP, limit)

  // Add rate limit headers to response
  const response = rateLimitResult.allowed
    ? NextResponse.next()
    : NextResponse.json(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please try again later.',
          },
        },
        { status: 429 }
      )

  // Add rate limit headers
  response.headers.set('X-RateLimit-Limit', String(limit))
  response.headers.set('X-RateLimit-Remaining', String(rateLimitResult.remaining))
  response.headers.set('X-RateLimit-Reset', String(rateLimitResult.resetAt))

  if (!rateLimitResult.allowed) {
    response.headers.set('Retry-After', String(RATE_LIMIT_WINDOW_SECONDS))
  }

  return response
}

// =============================================================================
// Matcher Configuration
// =============================================================================

export const config = {
  matcher: [
    // Match all /api/question routes
    '/api/question/:path*',
  ],
}
