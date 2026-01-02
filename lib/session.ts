/**
 * Session helpers (client-side)
 *
 * Defines a "session" as the lifetime of the current browser tab (sessionStorage).
 */

const SESSION_STARTED_AT_KEY = 'physiscaffold_session_started_at'

export function getSessionStartedAtMs(): number {
  if (typeof window === 'undefined') return Date.now()

  const existing = window.sessionStorage.getItem(SESSION_STARTED_AT_KEY)
  if (existing) {
    const parsed = Number(existing)
    if (Number.isFinite(parsed) && parsed > 0) return parsed
  }

  const now = Date.now()
  window.sessionStorage.setItem(SESSION_STARTED_AT_KEY, String(now))
  return now
}

