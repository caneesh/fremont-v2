import type { PilotUser, UserSession } from '@/types/auth'

// Pilot access codes (in production, store in database or environment variables)
const PILOT_CODES: Record<string, PilotUser> = {
  'PILOT-ALPHA-001': {
    code: 'PILOT-ALPHA-001',
    userId: 'user-001',
    name: 'Pilot User 1',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  'PILOT-ALPHA-002': {
    code: 'PILOT-ALPHA-002',
    userId: 'user-002',
    name: 'Pilot User 2',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  'PILOT-ALPHA-003': {
    code: 'PILOT-ALPHA-003',
    userId: 'user-003',
    name: 'Pilot User 3',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  'PILOT-ALPHA-004': {
    code: 'PILOT-ALPHA-004',
    userId: 'user-004',
    name: 'Pilot User 4',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  'PILOT-ALPHA-005': {
    code: 'PILOT-ALPHA-005',
    userId: 'user-005',
    name: 'Pilot User 5',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  'PILOT-ALPHA-006': {
    code: 'PILOT-ALPHA-006',
    userId: 'user-006',
    name: 'Pilot User 6',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  'PILOT-ALPHA-007': {
    code: 'PILOT-ALPHA-007',
    userId: 'user-007',
    name: 'Pilot User 7',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  'PILOT-ALPHA-008': {
    code: 'PILOT-ALPHA-008',
    userId: 'user-008',
    name: 'Pilot User 8',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  'PILOT-ALPHA-009': {
    code: 'PILOT-ALPHA-009',
    userId: 'user-009',
    name: 'Pilot User 9',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
  'PILOT-ALPHA-010': {
    code: 'PILOT-ALPHA-010',
    userId: 'user-010',
    name: 'Pilot User 10',
    isActive: true,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
}

class AuthService {
  private readonly SESSION_KEY = 'physiscaffold_session'

  validateCode(code: string): PilotUser | null {
    const normalizedCode = code.trim().toUpperCase()
    const user = PILOT_CODES[normalizedCode]

    if (!user || !user.isActive) {
      return null
    }

    return user
  }

  createSession(code: string): UserSession | null {
    const user = this.validateCode(code)
    if (!user) return null

    const session: UserSession = {
      userId: user.userId,
      code: user.code,
      authenticatedAt: new Date().toISOString(),
    }

    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session))
    }

    return session
  }

  getSession(): UserSession | null {
    if (typeof window === 'undefined') return null

    const sessionData = localStorage.getItem(this.SESSION_KEY)
    if (!sessionData) return null

    try {
      const session = JSON.parse(sessionData) as UserSession

      // Validate session is still valid (check if code still exists and is active)
      const user = this.validateCode(session.code)
      if (!user) {
        this.clearSession()
        return null
      }

      return session
    } catch {
      return null
    }
  }

  clearSession(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.SESSION_KEY)
    }
  }

  isAuthenticated(): boolean {
    return this.getSession() !== null
  }

  getUserId(): string | null {
    const session = this.getSession()
    return session?.userId || null
  }

  getUserCode(): string | null {
    const session = this.getSession()
    return session?.code || null
  }

  getUser(): PilotUser | null {
    const session = this.getSession()
    if (!session) return null

    return this.validateCode(session.code)
  }
}

export const authService = new AuthService()
export { PILOT_CODES }
