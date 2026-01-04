/**
 * Interview Mode Use Cases
 * Business logic orchestration - uses ports, no direct dependencies
 */

import {
  type InterviewSession,
  type InterviewStepAttempt,
  type ExplanationSubmission,
  type InterviewConfig,
  type ExplanationRequirements,
  createInterviewSession,
  startSession,
  updateTimerState,
  recordStepAttempt,
  completeSession,
  abandonSession,
  validateExplanation,
} from '../entities/interview-session';

import { calculateRubricResult, calculateGrade, type Grade } from '../policies/rubric-engine';
import type { InterviewRepository, InterviewAnalytics } from '../ports/interview-repository';

// =============================================================================
// USE CASE: Start Interview Session
// =============================================================================

export interface StartInterviewInput {
  tenantId: string;
  userId: string;
  questionId: string;
  totalSteps: number;
  config?: Partial<InterviewConfig>;
  explanationRequirements?: Partial<ExplanationRequirements>;
}

export interface StartInterviewOutput {
  session: InterviewSession;
}

export async function startInterview(
  input: StartInterviewInput,
  deps: {
    repository: InterviewRepository;
    analytics: InterviewAnalytics;
    generateId: () => string;
  }
): Promise<StartInterviewOutput> {
  // Check for existing active session
  const existingSession = await deps.repository.findActiveSession(
    input.tenantId,
    input.userId,
    input.questionId
  );

  if (existingSession && existingSession.status === 'in_progress') {
    // Return existing session
    return { session: existingSession };
  }

  // Create new session
  const session = createInterviewSession({
    id: deps.generateId(),
    tenantId: input.tenantId,
    userId: input.userId,
    questionId: input.questionId,
    totalSteps: input.totalSteps,
    config: input.config,
    explanationRequirements: input.explanationRequirements,
  });

  // Start the session
  const startedSession = startSession(session);

  // Persist
  await deps.repository.create(startedSession);

  // Track analytics
  deps.analytics.trackSessionStarted(
    input.tenantId,
    input.userId,
    startedSession.id,
    input.questionId
  );

  return { session: startedSession };
}

// =============================================================================
// USE CASE: Submit Step Answer
// =============================================================================

export interface SubmitStepInput {
  tenantId: string;
  sessionId: string;
  stepId: string;
  answer: string | number | string[];
  explanation?: {
    approach?: string;
    invariant?: string;
    complexity?: string;
  };
}

export interface SubmitStepOutput {
  session: InterviewSession;
  attempt: InterviewStepAttempt;
  isCorrect: boolean;
  explanationValidation: {
    valid: boolean;
    missingFields: string[];
  } | null;
  sessionCompleted: boolean;
  rubricResult: ReturnType<typeof calculateRubricResult> | null;
  grade: Grade | null;
}

export async function submitStepAnswer(
  input: SubmitStepInput,
  deps: {
    repository: InterviewRepository;
    analytics: InterviewAnalytics;
    validateAnswer: (stepId: string, answer: unknown) => Promise<boolean>;
    isLastStep: (session: InterviewSession) => boolean;
  }
): Promise<SubmitStepOutput> {
  // Load session
  const session = await deps.repository.findById(input.tenantId, input.sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  if (session.status !== 'in_progress') {
    throw new Error(`Session is ${session.status}, cannot submit answer`);
  }

  // Update timer state
  const updatedSession = updateTimerState(session);

  if (updatedSession.status === 'timed_out') {
    await deps.repository.update(updatedSession);
    return {
      session: updatedSession,
      attempt: null as unknown as InterviewStepAttempt,
      isCorrect: false,
      explanationValidation: null,
      sessionCompleted: true,
      rubricResult: calculateRubricResult(updatedSession),
      grade: calculateGrade(0),
    };
  }

  // Validate answer
  const isCorrect = await deps.validateAnswer(input.stepId, input.answer);

  // Build explanation submission
  let explanation: ExplanationSubmission | null = null;
  let explanationValidation: { valid: boolean; missingFields: string[] } | null = null;

  if (updatedSession.config.explanationsRequired && input.explanation) {
    explanation = {
      approach: input.explanation.approach || null,
      invariant: input.explanation.invariant || null,
      complexity: input.explanation.complexity || null,
      submittedAt: Date.now(),
    };

    explanationValidation = validateExplanation(
      explanation,
      updatedSession.explanationRequirements
    );
  }

  // Calculate time spent on this step
  const previousAttempts = updatedSession.stepAttempts.filter(
    (a) => a.stepId === input.stepId
  );
  const stepStartTime = previousAttempts.length > 0
    ? previousAttempts[previousAttempts.length - 1].submittedAt
    : updatedSession.startedAt || Date.now();

  const timeSpentSeconds = Math.floor((Date.now() - stepStartTime) / 1000);

  // Create attempt record
  const attempt: InterviewStepAttempt = {
    stepId: input.stepId,
    attemptNumber: previousAttempts.length + 1,
    answer: input.answer,
    isCorrect,
    timeSpentSeconds,
    hintsRequested: 0, // Updated via separate use case
    explanation,
    submittedAt: Date.now(),
  };

  // Record attempt
  const sessionWithAttempt = recordStepAttempt(updatedSession, attempt);
  await deps.repository.recordAttempt(input.tenantId, input.sessionId, attempt);

  // Track analytics
  deps.analytics.trackStepAttempted(
    input.tenantId,
    session.userId,
    input.sessionId,
    input.stepId,
    isCorrect,
    timeSpentSeconds
  );

  // Check if session is complete
  const isLastStep = deps.isLastStep(sessionWithAttempt);
  const allStepsCorrect = isCorrect && isLastStep;

  let finalSession = sessionWithAttempt;
  let rubricResult = null;
  let grade = null;

  if (allStepsCorrect) {
    // Calculate rubric and complete session
    rubricResult = calculateRubricResult(sessionWithAttempt);
    grade = calculateGrade(rubricResult.percentageScore);
    finalSession = completeSession(sessionWithAttempt, rubricResult);

    await deps.repository.saveRubricResult(input.tenantId, input.sessionId, rubricResult);
    await deps.repository.update(finalSession);

    deps.analytics.trackSessionCompleted(
      input.tenantId,
      session.userId,
      input.sessionId,
      rubricResult
    );
  } else {
    await deps.repository.update(sessionWithAttempt);
  }

  return {
    session: finalSession,
    attempt,
    isCorrect,
    explanationValidation,
    sessionCompleted: allStepsCorrect,
    rubricResult,
    grade,
  };
}

// =============================================================================
// USE CASE: Request Hint
// =============================================================================

export interface RequestHintInput {
  tenantId: string;
  sessionId: string;
  stepId: string;
}

export interface RequestHintOutput {
  allowed: boolean;
  hint: string | null;
  hintsUsedOnStep: number;
  penaltyApplied: number;
}

export async function requestHint(
  input: RequestHintInput,
  deps: {
    repository: InterviewRepository;
    analytics: InterviewAnalytics;
    getHintForStep: (stepId: string, hintIndex: number) => Promise<string | null>;
  }
): Promise<RequestHintOutput> {
  const session = await deps.repository.findById(input.tenantId, input.sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  // Check if hints are allowed
  if (session.config.hintsHidden) {
    return {
      allowed: false,
      hint: null,
      hintsUsedOnStep: 0,
      penaltyApplied: 0,
    };
  }

  // Count hints used on this step
  const hintsOnStep = session.stepAttempts
    .filter((a) => a.stepId === input.stepId)
    .reduce((sum, a) => sum + a.hintsRequested, 0);

  // Get hint
  const hint = await deps.getHintForStep(input.stepId, hintsOnStep);

  if (!hint) {
    return {
      allowed: true,
      hint: null,
      hintsUsedOnStep: hintsOnStep,
      penaltyApplied: 0,
    };
  }

  // Track analytics
  deps.analytics.trackHintRequested(
    input.tenantId,
    session.userId,
    input.sessionId,
    input.stepId
  );

  return {
    allowed: true,
    hint,
    hintsUsedOnStep: hintsOnStep + 1,
    penaltyApplied: 15, // SCORING_THRESHOLDS.HINT_PENALTY_PER_USE
  };
}

// =============================================================================
// USE CASE: Get Timer State
// =============================================================================

export interface GetTimerStateInput {
  tenantId: string;
  sessionId: string;
}

export interface GetTimerStateOutput {
  elapsedSeconds: number;
  remainingSeconds: number;
  isExpired: boolean;
  formattedRemaining: string;
}

export async function getTimerState(
  input: GetTimerStateInput,
  deps: {
    repository: InterviewRepository;
  }
): Promise<GetTimerStateOutput> {
  const session = await deps.repository.findById(input.tenantId, input.sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  const updated = updateTimerState(session);

  // Format remaining time
  const minutes = Math.floor(updated.timerState.remainingSeconds / 60);
  const seconds = updated.timerState.remainingSeconds % 60;
  const formattedRemaining = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return {
    elapsedSeconds: updated.timerState.elapsedSeconds,
    remainingSeconds: updated.timerState.remainingSeconds,
    isExpired: updated.timerState.isExpired,
    formattedRemaining,
  };
}

// =============================================================================
// USE CASE: Abandon Session
// =============================================================================

export interface AbandonSessionInput {
  tenantId: string;
  sessionId: string;
  reason: string;
}

export interface AbandonSessionOutput {
  session: InterviewSession;
}

export async function abandonInterviewSession(
  input: AbandonSessionInput,
  deps: {
    repository: InterviewRepository;
    analytics: InterviewAnalytics;
  }
): Promise<AbandonSessionOutput> {
  const session = await deps.repository.findById(input.tenantId, input.sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  const abandonedSession = abandonSession(session);
  await deps.repository.update(abandonedSession);

  deps.analytics.trackSessionAbandoned(
    input.tenantId,
    session.userId,
    input.sessionId,
    input.reason
  );

  return { session: abandonedSession };
}

// =============================================================================
// USE CASE: Get Session Results
// =============================================================================

export interface GetSessionResultsInput {
  tenantId: string;
  sessionId: string;
}

export interface GetSessionResultsOutput {
  session: InterviewSession;
  rubricResult: ReturnType<typeof calculateRubricResult> | null;
  grade: Grade | null;
  summary: {
    totalSteps: number;
    stepsCompleted: number;
    correctOnFirstTry: number;
    totalHintsUsed: number;
    totalTimeSeconds: number;
  };
}

export async function getSessionResults(
  input: GetSessionResultsInput,
  deps: {
    repository: InterviewRepository;
  }
): Promise<GetSessionResultsOutput> {
  const session = await deps.repository.findById(input.tenantId, input.sessionId);

  if (!session) {
    throw new Error('Session not found');
  }

  // Calculate summary
  const stepResults = new Map<string, { correct: boolean; attempts: number; hints: number }>();

  for (const attempt of session.stepAttempts) {
    const existing = stepResults.get(attempt.stepId);
    if (!existing) {
      stepResults.set(attempt.stepId, {
        correct: attempt.isCorrect,
        attempts: 1,
        hints: attempt.hintsRequested,
      });
    } else {
      stepResults.set(attempt.stepId, {
        correct: existing.correct || attempt.isCorrect,
        attempts: existing.attempts + 1,
        hints: existing.hints + attempt.hintsRequested,
      });
    }
  }

  const stepsCompleted = Array.from(stepResults.values()).filter((r) => r.correct).length;
  const correctOnFirstTry = Array.from(stepResults.values()).filter(
    (r) => r.correct && r.attempts === 1
  ).length;
  const totalHintsUsed = Array.from(stepResults.values()).reduce((sum, r) => sum + r.hints, 0);

  const rubricResult = session.rubricResult || (
    session.status === 'completed' || session.status === 'timed_out'
      ? calculateRubricResult(session)
      : null
  );

  const grade = rubricResult ? calculateGrade(rubricResult.percentageScore) : null;

  return {
    session,
    rubricResult,
    grade,
    summary: {
      totalSteps: session.totalSteps,
      stepsCompleted,
      correctOnFirstTry,
      totalHintsUsed,
      totalTimeSeconds: session.timerState.elapsedSeconds,
    },
  };
}
