/**
 * Interview Session Entity
 * Pure domain entity - no framework dependencies
 */

// =============================================================================
// VALUE OBJECTS
// =============================================================================

export interface InterviewConfig {
  readonly timerEnabled: boolean;
  readonly timeLimitSeconds: number;
  readonly hintsHidden: boolean;
  readonly explanationsRequired: boolean;
  readonly rubricScoringEnabled: boolean;
}

export interface ExplanationRequirements {
  readonly approachRequired: boolean;
  readonly invariantRequired: boolean;
  readonly complexityRequired: boolean;
}

export interface TimerState {
  readonly startedAt: number;
  readonly pausedAt: number | null;
  readonly elapsedSeconds: number;
  readonly remainingSeconds: number;
  readonly isExpired: boolean;
}

export interface ExplanationSubmission {
  readonly approach: string | null;
  readonly invariant: string | null;
  readonly complexity: string | null;
  readonly submittedAt: number;
}

// =============================================================================
// RUBRIC TYPES
// =============================================================================

export type RubricDimension =
  | 'correctness'
  | 'approach_clarity'
  | 'invariant_identification'
  | 'complexity_analysis'
  | 'time_efficiency'
  | 'hint_independence';

export interface RubricCriterion {
  readonly dimension: RubricDimension;
  readonly weight: number;
  readonly maxScore: number;
}

export interface RubricScore {
  readonly dimension: RubricDimension;
  readonly score: number;
  readonly maxScore: number;
  readonly feedback: string;
}

export interface RubricResult {
  readonly scores: readonly RubricScore[];
  readonly totalScore: number;
  readonly maxPossibleScore: number;
  readonly percentageScore: number;
  readonly overallFeedback: string;
  readonly strengths: readonly string[];
  readonly improvements: readonly string[];
}

// =============================================================================
// STEP ATTEMPT
// =============================================================================

export interface InterviewStepAttempt {
  readonly stepId: string;
  readonly attemptNumber: number;
  readonly answer: string | number | string[];
  readonly isCorrect: boolean;
  readonly timeSpentSeconds: number;
  readonly hintsRequested: number;
  readonly explanation: ExplanationSubmission | null;
  readonly submittedAt: number;
}

// =============================================================================
// INTERVIEW SESSION ENTITY
// =============================================================================

export type InterviewStatus =
  | 'not_started'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'timed_out'
  | 'abandoned';

export interface InterviewSession {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly questionId: string;
  readonly config: InterviewConfig;
  readonly explanationRequirements: ExplanationRequirements;
  readonly status: InterviewStatus;
  readonly timerState: TimerState;
  readonly stepAttempts: readonly InterviewStepAttempt[];
  readonly currentStepIndex: number;
  readonly totalSteps: number;
  readonly rubricResult: RubricResult | null;
  readonly startedAt: number | null;
  readonly completedAt: number | null;
  readonly createdAt: number;
}

// =============================================================================
// FACTORY
// =============================================================================

export function createInterviewSession(params: {
  id: string;
  tenantId: string;
  userId: string;
  questionId: string;
  totalSteps: number;
  config?: Partial<InterviewConfig>;
  explanationRequirements?: Partial<ExplanationRequirements>;
}): InterviewSession {
  const defaultConfig: InterviewConfig = {
    timerEnabled: true,
    timeLimitSeconds: 1800, // 30 minutes
    hintsHidden: true,
    explanationsRequired: true,
    rubricScoringEnabled: true,
  };

  const defaultExplanationRequirements: ExplanationRequirements = {
    approachRequired: true,
    invariantRequired: true,
    complexityRequired: true,
  };

  const config = { ...defaultConfig, ...params.config };

  return {
    id: params.id,
    tenantId: params.tenantId,
    userId: params.userId,
    questionId: params.questionId,
    config,
    explanationRequirements: {
      ...defaultExplanationRequirements,
      ...params.explanationRequirements,
    },
    status: 'not_started',
    timerState: {
      startedAt: 0,
      pausedAt: null,
      elapsedSeconds: 0,
      remainingSeconds: config.timeLimitSeconds,
      isExpired: false,
    },
    stepAttempts: [],
    currentStepIndex: 0,
    totalSteps: params.totalSteps,
    rubricResult: null,
    startedAt: null,
    completedAt: null,
    createdAt: Date.now(),
  };
}

// =============================================================================
// ENTITY OPERATIONS (Pure Functions)
// =============================================================================

export function startSession(
  session: InterviewSession,
  now: number = Date.now()
): InterviewSession {
  if (session.status !== 'not_started') {
    return session;
  }

  return {
    ...session,
    status: 'in_progress',
    startedAt: now,
    timerState: {
      ...session.timerState,
      startedAt: now,
    },
  };
}

export function updateTimerState(
  session: InterviewSession,
  now: number = Date.now()
): InterviewSession {
  if (session.status !== 'in_progress' || !session.config.timerEnabled) {
    return session;
  }

  const elapsed = Math.floor((now - session.timerState.startedAt) / 1000);
  const remaining = Math.max(0, session.config.timeLimitSeconds - elapsed);
  const isExpired = remaining === 0;

  return {
    ...session,
    status: isExpired ? 'timed_out' : session.status,
    timerState: {
      ...session.timerState,
      elapsedSeconds: elapsed,
      remainingSeconds: remaining,
      isExpired,
    },
    completedAt: isExpired ? now : session.completedAt,
  };
}

export function recordStepAttempt(
  session: InterviewSession,
  attempt: InterviewStepAttempt
): InterviewSession {
  if (session.status !== 'in_progress') {
    return session;
  }

  const newAttempts = [...session.stepAttempts, attempt];
  const isLastStep = session.currentStepIndex >= session.totalSteps - 1;
  const allCorrect = attempt.isCorrect;

  return {
    ...session,
    stepAttempts: newAttempts,
    currentStepIndex: allCorrect && !isLastStep
      ? session.currentStepIndex + 1
      : session.currentStepIndex,
  };
}

export function completeSession(
  session: InterviewSession,
  rubricResult: RubricResult,
  now: number = Date.now()
): InterviewSession {
  if (session.status !== 'in_progress') {
    return session;
  }

  return {
    ...session,
    status: 'completed',
    rubricResult,
    completedAt: now,
  };
}

export function abandonSession(
  session: InterviewSession,
  now: number = Date.now()
): InterviewSession {
  if (session.status === 'completed' || session.status === 'timed_out') {
    return session;
  }

  return {
    ...session,
    status: 'abandoned',
    completedAt: now,
  };
}

// =============================================================================
// VALIDATION
// =============================================================================

export function validateExplanation(
  explanation: ExplanationSubmission,
  requirements: ExplanationRequirements
): { valid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  if (requirements.approachRequired && (!explanation.approach || explanation.approach.trim().length < 10)) {
    missingFields.push('approach');
  }

  if (requirements.invariantRequired && (!explanation.invariant || explanation.invariant.trim().length < 10)) {
    missingFields.push('invariant');
  }

  if (requirements.complexityRequired && (!explanation.complexity || explanation.complexity.trim().length < 5)) {
    missingFields.push('complexity');
  }

  return {
    valid: missingFields.length === 0,
    missingFields,
  };
}
