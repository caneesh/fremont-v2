/**
 * Interview Service
 * Wires use cases with dependencies - ready for consumption by React hooks
 */

import {
  startInterview,
  submitStepAnswer,
  requestHint,
  getTimerState,
  abandonInterviewSession,
  getSessionResults,
  type StartInterviewInput,
  type StartInterviewOutput,
  type SubmitStepInput,
  type SubmitStepOutput,
  type RequestHintInput,
  type RequestHintOutput,
  type GetTimerStateInput,
  type GetTimerStateOutput,
  type AbandonSessionInput,
  type AbandonSessionOutput,
  type GetSessionResultsInput,
  type GetSessionResultsOutput,
} from '@/lib/core/use-cases/interview-mode';

import type { InterviewSession } from '@/lib/core/entities/interview-session';
import { interviewRepository, interviewAnalytics } from './interview-repository';

// =============================================================================
// ID GENERATION
// =============================================================================

function generateId(): string {
  return crypto.randomUUID();
}

// =============================================================================
// ANSWER VALIDATION ADAPTER
// =============================================================================

/**
 * Default answer validator - always returns true.
 * In real usage, this would be replaced with actual validation logic.
 */
async function defaultValidateAnswer(_stepId: string, _answer: unknown): Promise<boolean> {
  // In a real implementation, this would call the scaffold validation API
  // For now, we return true and let the UI handle validation
  return true;
}

/**
 * Check if the current step is the last step
 */
function isLastStep(session: InterviewSession): boolean {
  return session.currentStepIndex >= session.totalSteps - 1;
}

/**
 * Default hint provider - returns null (no hints in interview mode by default)
 */
async function defaultGetHint(_stepId: string, _hintIndex: number): Promise<string | null> {
  return null;
}

// =============================================================================
// SERVICE INTERFACE
// =============================================================================

export interface InterviewService {
  startInterview(input: Omit<StartInterviewInput, 'tenantId'>): Promise<StartInterviewOutput>;

  submitStepAnswer(
    input: Omit<SubmitStepInput, 'tenantId'>,
    validateAnswer?: (stepId: string, answer: unknown) => Promise<boolean>
  ): Promise<SubmitStepOutput>;

  requestHint(input: Omit<RequestHintInput, 'tenantId'>): Promise<RequestHintOutput>;

  getTimerState(input: Omit<GetTimerStateInput, 'tenantId'>): Promise<GetTimerStateOutput>;

  abandonSession(input: Omit<AbandonSessionInput, 'tenantId'>): Promise<AbandonSessionOutput>;

  getSessionResults(input: Omit<GetSessionResultsInput, 'tenantId'>): Promise<GetSessionResultsOutput>;

  findActiveSession(userId: string, questionId: string): Promise<InterviewSession | null>;
}

// =============================================================================
// SERVICE IMPLEMENTATION
// =============================================================================

const DEFAULT_TENANT_ID = 'default';

export function createInterviewService(): InterviewService {
  return {
    async startInterview(input) {
      return startInterview(
        { ...input, tenantId: DEFAULT_TENANT_ID },
        {
          repository: interviewRepository,
          analytics: interviewAnalytics,
          generateId,
        }
      );
    },

    async submitStepAnswer(input, validateAnswer = defaultValidateAnswer) {
      return submitStepAnswer(
        { ...input, tenantId: DEFAULT_TENANT_ID },
        {
          repository: interviewRepository,
          analytics: interviewAnalytics,
          validateAnswer,
          isLastStep,
        }
      );
    },

    async requestHint(input) {
      return requestHint(
        { ...input, tenantId: DEFAULT_TENANT_ID },
        {
          repository: interviewRepository,
          analytics: interviewAnalytics,
          getHintForStep: defaultGetHint,
        }
      );
    },

    async getTimerState(input) {
      return getTimerState(
        { ...input, tenantId: DEFAULT_TENANT_ID },
        { repository: interviewRepository }
      );
    },

    async abandonSession(input) {
      return abandonInterviewSession(
        { ...input, tenantId: DEFAULT_TENANT_ID },
        {
          repository: interviewRepository,
          analytics: interviewAnalytics,
        }
      );
    },

    async getSessionResults(input) {
      return getSessionResults(
        { ...input, tenantId: DEFAULT_TENANT_ID },
        { repository: interviewRepository }
      );
    },

    async findActiveSession(userId: string, questionId: string) {
      return interviewRepository.findActiveSession(DEFAULT_TENANT_ID, userId, questionId);
    },
  };
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const interviewService = createInterviewService();

// =============================================================================
// RE-EXPORTS FOR CONVENIENCE
// =============================================================================

export type {
  StartInterviewInput,
  StartInterviewOutput,
  SubmitStepInput,
  SubmitStepOutput,
  RequestHintInput,
  RequestHintOutput,
  GetTimerStateInput,
  GetTimerStateOutput,
  AbandonSessionInput,
  AbandonSessionOutput,
  GetSessionResultsInput,
  GetSessionResultsOutput,
};
