/**
 * Interview Repository Adapter
 * localStorage-based implementation for development
 */

import type {
  InterviewSession,
  InterviewStepAttempt,
  RubricResult,
} from '@/lib/core/entities/interview-session';
import type {
  InterviewRepository,
  InterviewAnalytics,
} from '@/lib/core/ports/interview-repository';

// =============================================================================
// STORAGE KEYS
// =============================================================================

const STORAGE_KEYS = {
  SESSIONS: 'interview_sessions',
  ATTEMPTS: 'interview_attempts',
  RESULTS: 'interview_results',
} as const;

// =============================================================================
// HELPERS
// =============================================================================

function getSessionKey(tenantId: string, sessionId: string): string {
  return `${tenantId}:${sessionId}`;
}

function loadFromStorage<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('[InterviewRepository] Failed to save to localStorage:', e);
  }
}

function loadSessions(): Record<string, InterviewSession> {
  return loadFromStorage<Record<string, InterviewSession>>(STORAGE_KEYS.SESSIONS) || {};
}

function saveSessions(sessions: Record<string, InterviewSession>): void {
  saveToStorage(STORAGE_KEYS.SESSIONS, sessions);
}

// =============================================================================
// REPOSITORY IMPLEMENTATION
// =============================================================================

export class LocalStorageInterviewRepository implements InterviewRepository {
  async create(session: InterviewSession): Promise<InterviewSession> {
    const sessions = loadSessions();
    const key = getSessionKey(session.tenantId, session.id);
    sessions[key] = session;
    saveSessions(sessions);
    return session;
  }

  async findById(tenantId: string, sessionId: string): Promise<InterviewSession | null> {
    const sessions = loadSessions();
    const key = getSessionKey(tenantId, sessionId);
    return sessions[key] || null;
  }

  async findActiveSession(
    tenantId: string,
    userId: string,
    questionId: string
  ): Promise<InterviewSession | null> {
    const sessions = loadSessions();

    for (const session of Object.values(sessions)) {
      if (
        session.tenantId === tenantId &&
        session.userId === userId &&
        session.questionId === questionId &&
        (session.status === 'in_progress' || session.status === 'not_started')
      ) {
        return session;
      }
    }

    return null;
  }

  async update(session: InterviewSession): Promise<InterviewSession> {
    const sessions = loadSessions();
    const key = getSessionKey(session.tenantId, session.id);
    sessions[key] = session;
    saveSessions(sessions);
    return session;
  }

  async recordAttempt(
    tenantId: string,
    sessionId: string,
    attempt: InterviewStepAttempt
  ): Promise<void> {
    // Attempts are stored inline in the session
    const session = await this.findById(tenantId, sessionId);
    if (!session) return;

    const updatedSession: InterviewSession = {
      ...session,
      stepAttempts: [...session.stepAttempts, attempt],
    };

    await this.update(updatedSession);
  }

  async saveRubricResult(
    tenantId: string,
    sessionId: string,
    result: RubricResult
  ): Promise<void> {
    const session = await this.findById(tenantId, sessionId);
    if (!session) return;

    const updatedSession: InterviewSession = {
      ...session,
      rubricResult: result,
    };

    await this.update(updatedSession);
  }

  async listCompletedSessions(
    tenantId: string,
    userId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<InterviewSession[]> {
    const sessions = loadSessions();
    const limit = options?.limit ?? 20;
    const offset = options?.offset ?? 0;

    const completed = Object.values(sessions)
      .filter(
        (s) =>
          s.tenantId === tenantId &&
          s.userId === userId &&
          (s.status === 'completed' || s.status === 'timed_out')
      )
      .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
      .slice(offset, offset + limit);

    return completed;
  }

  async getSessionStats(
    tenantId: string,
    userId: string
  ): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageScore: number;
    averageTimeSeconds: number;
  }> {
    const sessions = loadSessions();

    const userSessions = Object.values(sessions).filter(
      (s) => s.tenantId === tenantId && s.userId === userId
    );

    const completed = userSessions.filter(
      (s) => s.status === 'completed' || s.status === 'timed_out'
    );

    const totalScore = completed.reduce(
      (sum, s) => sum + (s.rubricResult?.percentageScore ?? 0),
      0
    );

    const totalTime = completed.reduce(
      (sum, s) => sum + (s.timerState?.elapsedSeconds ?? 0),
      0
    );

    return {
      totalSessions: userSessions.length,
      completedSessions: completed.length,
      averageScore: completed.length > 0 ? totalScore / completed.length : 0,
      averageTimeSeconds: completed.length > 0 ? totalTime / completed.length : 0,
    };
  }
}

// =============================================================================
// ANALYTICS IMPLEMENTATION (Console Logger)
// =============================================================================

export class ConsoleInterviewAnalytics implements InterviewAnalytics {
  private log(event: string, data: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[InterviewAnalytics] ${event}:`, data);
    }
  }

  trackSessionStarted(
    tenantId: string,
    userId: string,
    sessionId: string,
    questionId: string
  ): void {
    this.log('session_started', { tenantId, userId, sessionId, questionId });
  }

  trackSessionCompleted(
    tenantId: string,
    userId: string,
    sessionId: string,
    result: RubricResult
  ): void {
    this.log('session_completed', {
      tenantId,
      userId,
      sessionId,
      score: result.percentageScore,
      grade: result.totalScore,
    });
  }

  trackStepAttempted(
    tenantId: string,
    userId: string,
    sessionId: string,
    stepId: string,
    isCorrect: boolean,
    timeSpentSeconds: number
  ): void {
    this.log('step_attempted', {
      tenantId,
      userId,
      sessionId,
      stepId,
      isCorrect,
      timeSpentSeconds,
    });
  }

  trackHintRequested(
    tenantId: string,
    userId: string,
    sessionId: string,
    stepId: string
  ): void {
    this.log('hint_requested', { tenantId, userId, sessionId, stepId });
  }

  trackSessionAbandoned(
    tenantId: string,
    userId: string,
    sessionId: string,
    reason: string
  ): void {
    this.log('session_abandoned', { tenantId, userId, sessionId, reason });
  }
}

// =============================================================================
// SINGLETON INSTANCES
// =============================================================================

export const interviewRepository = new LocalStorageInterviewRepository();
export const interviewAnalytics = new ConsoleInterviewAnalytics();
