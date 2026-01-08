/**
 * Pivot Service
 *
 * Wires pivot use cases with dependencies.
 * Provides a clean API for React hooks and API routes.
 */

import type {
  PivotQuestion,
  PivotTrigger,
  PivotDecision,
  PivotSessionState,
  PivotAnswerSubmission,
} from '@/types/pivot'

import {
  initializePivotSession,
  checkPivotTrigger,
  showPivot,
  answerPivot,
  skipPivotQuestion,
  getPivotState,
  type CheckPivotTriggerOutput,
  type ShowPivotOutput,
  type AnswerPivotOutput,
  type SkipPivotOutput,
  type GetPivotStateOutput,
} from '@/lib/core/use-cases/pivot'

import { DEFAULT_PIVOT_QUESTIONS } from '@/lib/core/policies/pivot-policy'
import { pivotRepository, pivotAnalytics } from './pivot-repository'

// ============================================================================
// PIVOT LOOKUP
// ============================================================================

const pivotMap = new Map<string, PivotQuestion>()
for (const pivot of DEFAULT_PIVOT_QUESTIONS) {
  pivotMap.set(pivot.id, pivot)
}

function getPivotById(id: string): PivotQuestion | null {
  return pivotMap.get(id) ?? null
}

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

export interface PivotService {
  /**
   * Initialize pivot tracking for a scaffold session
   */
  initializeSession(
    sessionId: string,
    userId: string,
    stepCount: number
  ): Promise<PivotSessionState>

  /**
   * Check if pivot should be triggered for current step
   */
  checkTrigger(
    sessionId: string,
    trigger: PivotTrigger,
    stepDifficulty?: 'easy' | 'medium' | 'hard'
  ): Promise<CheckPivotTriggerOutput>

  /**
   * Show pivot question for a step
   */
  showPivot(
    sessionId: string,
    stepIndex: number,
    timeSpentSeconds: number,
    patternId?: string
  ): Promise<ShowPivotOutput>

  /**
   * Submit answer for a pivot question
   */
  answerPivot(
    sessionId: string,
    stepIndex: number,
    answer: PivotAnswerSubmission
  ): Promise<AnswerPivotOutput>

  /**
   * Skip the current pivot question
   */
  skipPivot(sessionId: string, stepIndex: number): Promise<SkipPivotOutput>

  /**
   * Get current pivot state
   */
  getState(sessionId: string, stepIndex?: number): Promise<GetPivotStateOutput>

  /**
   * Get pivot question by ID
   */
  getPivotQuestion(pivotId: string): PivotQuestion | null

  /**
   * Get all available pivot questions
   */
  getAllPivotQuestions(): readonly PivotQuestion[]
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export function createPivotService(): PivotService {
  return {
    async initializeSession(sessionId, userId, stepCount) {
      return initializePivotSession(
        { sessionId, userId, stepCount },
        { repository: pivotRepository }
      )
    },

    async checkTrigger(sessionId, trigger, stepDifficulty = 'medium') {
      return checkPivotTrigger(
        { sessionId, trigger, stepDifficulty },
        { repository: pivotRepository }
      )
    },

    async showPivot(sessionId, stepIndex, timeSpentSeconds, patternId) {
      return showPivot(
        { sessionId, stepIndex, timeSpentSeconds, patternId },
        { repository: pivotRepository, analytics: pivotAnalytics }
      )
    },

    async answerPivot(sessionId, stepIndex, answer) {
      return answerPivot(
        { sessionId, stepIndex, answer },
        { repository: pivotRepository, analytics: pivotAnalytics, getPivotById }
      )
    },

    async skipPivot(sessionId, stepIndex) {
      return skipPivotQuestion(
        { sessionId, stepIndex },
        { repository: pivotRepository, analytics: pivotAnalytics }
      )
    },

    async getState(sessionId, stepIndex) {
      return getPivotState(
        { sessionId, stepIndex },
        { repository: pivotRepository }
      )
    },

    getPivotQuestion(pivotId) {
      return getPivotById(pivotId)
    },

    getAllPivotQuestions() {
      return DEFAULT_PIVOT_QUESTIONS
    },
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const pivotService = createPivotService()

// ============================================================================
// RE-EXPORTS
// ============================================================================

export type {
  PivotQuestion,
  PivotTrigger,
  PivotDecision,
  PivotSessionState,
  PivotAnswerSubmission,
}

export { DEFAULT_PIVOT_QUESTIONS }
