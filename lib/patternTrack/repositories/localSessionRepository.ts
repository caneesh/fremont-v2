/**
 * LocalStorage-based Session Repository Implementation
 *
 * Manages practice sessions in browser localStorage.
 */

import type { PracticeSession } from '../schema'
import type { ISessionRepository } from './interfaces'

const STORAGE_KEY = 'patterntrack_sessions'

/**
 * Safe localStorage access for SSR
 */
function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage
}

/**
 * Get all sessions from storage
 */
function getAllSessions(): Record<string, PracticeSession[]> {
  const storage = getStorage()
  if (!storage) return {}

  try {
    const data = storage.getItem(STORAGE_KEY)
    return data ? JSON.parse(data) : {}
  } catch {
    return {}
  }
}

/**
 * Save all sessions to storage
 */
function saveSessions(sessions: Record<string, PracticeSession[]>): void {
  const storage = getStorage()
  if (!storage) return

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch (error) {
    console.error('Failed to save sessions:', error)
  }
}

export class LocalSessionRepository implements ISessionRepository {
  async createSession(session: Omit<PracticeSession, 'id'>): Promise<PracticeSession> {
    const allSessions = getAllSessions()
    const userId = session.user_id

    if (!allSessions[userId]) {
      allSessions[userId] = []
    }

    const newSession: PracticeSession = {
      ...session,
      id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    }

    allSessions[userId].push(newSession)

    // Keep only last 50 sessions per user
    if (allSessions[userId].length > 50) {
      allSessions[userId] = allSessions[userId].slice(-50)
    }

    saveSessions(allSessions)
    return newSession
  }

  async getSession(id: string): Promise<PracticeSession | null> {
    const allSessions = getAllSessions()

    for (const sessions of Object.values(allSessions)) {
      const session = sessions.find(s => s.id === id)
      if (session) return session
    }

    return null
  }

  async updateSession(
    id: string,
    update: Partial<PracticeSession>
  ): Promise<PracticeSession | null> {
    const allSessions = getAllSessions()

    for (const [userId, sessions] of Object.entries(allSessions)) {
      const index = sessions.findIndex(s => s.id === id)
      if (index !== -1) {
        const updated: PracticeSession = {
          ...sessions[index],
          ...update,
        }
        allSessions[userId][index] = updated
        saveSessions(allSessions)
        return updated
      }
    }

    return null
  }

  async endSession(id: string): Promise<PracticeSession | null> {
    return this.updateSession(id, {
      ended_at: new Date().toISOString(),
    })
  }

  async getActiveSessions(userId: string): Promise<PracticeSession[]> {
    const allSessions = getAllSessions()
    const userSessions = allSessions[userId] || []

    return userSessions.filter(s => !s.ended_at)
  }

  async getRecentSessions(userId: string, limit: number = 10): Promise<PracticeSession[]> {
    const allSessions = getAllSessions()
    const userSessions = allSessions[userId] || []

    return userSessions
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, limit)
  }

  async getSessionsByMode(
    userId: string,
    mode: PracticeSession['mode']
  ): Promise<PracticeSession[]> {
    const allSessions = getAllSessions()
    const userSessions = allSessions[userId] || []

    return userSessions.filter(s => s.mode === mode)
  }

  async getSessionStats(userId: string): Promise<{
    totalSessions: number
    totalQuestions: number
    averageAccuracy: number
    averageTimePerQuestion: number
    sessionsByMode: Record<string, number>
  }> {
    const allSessions = getAllSessions()
    const userSessions = allSessions[userId] || []

    if (userSessions.length === 0) {
      return {
        totalSessions: 0,
        totalQuestions: 0,
        averageAccuracy: 0,
        averageTimePerQuestion: 0,
        sessionsByMode: {},
      }
    }

    let totalQuestions = 0
    let correctAnswers = 0
    let totalTime = 0
    const sessionsByMode: Record<string, number> = {}

    for (const session of userSessions) {
      sessionsByMode[session.mode] = (sessionsByMode[session.mode] || 0) + 1

      for (const result of session.results) {
        totalQuestions++
        if (result.is_correct) correctAnswers++
        totalTime += result.time_taken_seconds
      }
    }

    return {
      totalSessions: userSessions.length,
      totalQuestions,
      averageAccuracy: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
      averageTimePerQuestion: totalQuestions > 0 ? totalTime / totalQuestions : 0,
      sessionsByMode,
    }
  }
}
