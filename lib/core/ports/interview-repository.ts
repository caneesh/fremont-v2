/**
 * Interview Repository Port
 * Interface for persistence adapter - no implementation details
 */

import type { InterviewSession, InterviewStepAttempt, RubricResult } from '../entities/interview-session';

// =============================================================================
// REPOSITORY PORT
// =============================================================================

export interface InterviewRepository {
  /**
   * Create a new interview session
   */
  create(session: InterviewSession): Promise<InterviewSession>;

  /**
   * Find session by ID
   */
  findById(tenantId: string, sessionId: string): Promise<InterviewSession | null>;

  /**
   * Find active session for user and question
   */
  findActiveSession(
    tenantId: string,
    userId: string,
    questionId: string
  ): Promise<InterviewSession | null>;

  /**
   * Update session state
   */
  update(session: InterviewSession): Promise<InterviewSession>;

  /**
   * Record a step attempt
   */
  recordAttempt(
    tenantId: string,
    sessionId: string,
    attempt: InterviewStepAttempt
  ): Promise<void>;

  /**
   * Save rubric result
   */
  saveRubricResult(
    tenantId: string,
    sessionId: string,
    result: RubricResult
  ): Promise<void>;

  /**
   * List completed sessions for user
   */
  listCompletedSessions(
    tenantId: string,
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
    }
  ): Promise<InterviewSession[]>;

  /**
   * Get session statistics for user
   */
  getSessionStats(
    tenantId: string,
    userId: string
  ): Promise<{
    totalSessions: number;
    completedSessions: number;
    averageScore: number;
    averageTimeSeconds: number;
  }>;
}

// =============================================================================
// ANALYTICS PORT
// =============================================================================

export interface InterviewAnalytics {
  /**
   * Track session started
   */
  trackSessionStarted(
    tenantId: string,
    userId: string,
    sessionId: string,
    questionId: string
  ): void;

  /**
   * Track session completed
   */
  trackSessionCompleted(
    tenantId: string,
    userId: string,
    sessionId: string,
    result: RubricResult
  ): void;

  /**
   * Track step attempted
   */
  trackStepAttempted(
    tenantId: string,
    userId: string,
    sessionId: string,
    stepId: string,
    isCorrect: boolean,
    timeSpentSeconds: number
  ): void;

  /**
   * Track hint requested
   */
  trackHintRequested(
    tenantId: string,
    userId: string,
    sessionId: string,
    stepId: string
  ): void;

  /**
   * Track session abandoned
   */
  trackSessionAbandoned(
    tenantId: string,
    userId: string,
    sessionId: string,
    reason: string
  ): void;
}
