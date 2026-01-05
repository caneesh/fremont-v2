/**
 * Interview Module
 * Public API for interview mode functionality
 */

// Service
export {
  interviewService,
  createInterviewService,
  type InterviewService,
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
} from './interview-service';

// Repository (for testing/custom implementations)
export {
  interviewRepository,
  interviewAnalytics,
  LocalStorageInterviewRepository,
  ConsoleInterviewAnalytics,
} from './interview-repository';

// Re-export core types for convenience
export type {
  InterviewSession,
  InterviewConfig,
  InterviewStatus,
  InterviewStepAttempt,
  ExplanationSubmission,
  ExplanationRequirements,
  TimerState,
  RubricResult,
  RubricScore,
  RubricDimension,
  RubricCriterion,
} from '@/lib/core/entities/interview-session';

export {
  createInterviewSession,
  startSession,
  updateTimerState,
  recordStepAttempt,
  completeSession,
  abandonSession,
  validateExplanation,
} from '@/lib/core/entities/interview-session';

export { calculateRubricResult, calculateGrade, type Grade } from '@/lib/core/policies/rubric-engine';
