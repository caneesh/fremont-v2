import { describe, it, expect } from 'vitest';
import {
  calculateRubricResult,
  calculateGrade,
  DEFAULT_RUBRIC_CRITERIA,
  SCORING_THRESHOLDS,
} from '../policies/rubric-engine';
import {
  createInterviewSession,
  startSession,
  recordStepAttempt,
  type InterviewStepAttempt,
} from '../entities/interview-session';

// =============================================================================
// HELPERS
// =============================================================================

function createTestSession(overrides?: {
  stepAttempts?: InterviewStepAttempt[];
  timerElapsed?: number;
  timerLimit?: number;
  totalSteps?: number;
}) {
  const session = createInterviewSession({
    id: 'test-session',
    tenantId: 'test-tenant',
    userId: 'test-user',
    questionId: 'test-question',
    totalSteps: overrides?.totalSteps ?? 5,
    config: {
      timerEnabled: true,
      timeLimitSeconds: overrides?.timerLimit ?? 1800,
      hintsHidden: false,
      explanationsRequired: true,
      rubricScoringEnabled: true,
    },
  });

  let started = startSession(session, Date.now() - (overrides?.timerElapsed ?? 0) * 1000);

  // Manually set timer state for testing
  started = {
    ...started,
    timerState: {
      ...started.timerState,
      elapsedSeconds: overrides?.timerElapsed ?? 0,
      remainingSeconds: (overrides?.timerLimit ?? 1800) - (overrides?.timerElapsed ?? 0),
    },
    stepAttempts: overrides?.stepAttempts ?? [],
  };

  return started;
}

function createAttempt(overrides: Partial<InterviewStepAttempt> = {}): InterviewStepAttempt {
  return {
    stepId: overrides.stepId ?? 's1',
    attemptNumber: overrides.attemptNumber ?? 1,
    answer: overrides.answer ?? 'correct',
    isCorrect: overrides.isCorrect ?? true,
    timeSpentSeconds: overrides.timeSpentSeconds ?? 60,
    hintsRequested: overrides.hintsRequested ?? 0,
    explanation: overrides.explanation ?? {
      // Must be >= 100 chars for excellent score
      approach: 'I approached this problem by first drawing a free body diagram to identify all forces acting on the block. Then I applied Newton\'s second law F=ma in the direction parallel to the incline surface.',
      // Must be >= 100 chars + contain key terms like "conserv" for excellent score
      invariant: 'The key principle here is the conservation of mechanical energy. Since there is no friction, the total mechanical energy (kinetic plus potential) remains constant throughout the motion of the system.',
      // Must contain 3+ keywords: O(, time:, space:, linear, quadratic, logarithmic, constant, exponential
      complexity: 'O(1) constant time: direct calculation with O(1) constant space: only storing fixed variables',
      submittedAt: Date.now(),
    },
    submittedAt: overrides.submittedAt ?? Date.now(),
  };
}

// =============================================================================
// TESTS
// =============================================================================

describe('Rubric Engine', () => {
  describe('calculateRubricResult', () => {
    it('returns perfect score for ideal session', () => {
      const attempts = [
        createAttempt({ stepId: 's1', isCorrect: true }),
        createAttempt({ stepId: 's2', isCorrect: true }),
        createAttempt({ stepId: 's3', isCorrect: true }),
        createAttempt({ stepId: 's4', isCorrect: true }),
        createAttempt({ stepId: 's5', isCorrect: true }),
      ];

      const session = createTestSession({
        stepAttempts: attempts,
        timerElapsed: 600, // 10 minutes, well under limit
        totalSteps: 5,
      });

      const result = calculateRubricResult(session);

      expect(result.percentageScore).toBeGreaterThanOrEqual(90);
      expect(result.strengths.length).toBeGreaterThan(0);
      expect(result.improvements.length).toBe(0);
    });

    it('penalizes incorrect attempts', () => {
      const attempts = [
        createAttempt({ stepId: 's1', attemptNumber: 1, isCorrect: false }),
        createAttempt({ stepId: 's1', attemptNumber: 2, isCorrect: true }),
        createAttempt({ stepId: 's2', isCorrect: true }),
        createAttempt({ stepId: 's3', isCorrect: true }),
        createAttempt({ stepId: 's4', isCorrect: true }),
        createAttempt({ stepId: 's5', isCorrect: true }),
      ];

      const session = createTestSession({
        stepAttempts: attempts,
        totalSteps: 5,
      });

      const result = calculateRubricResult(session);

      // Should be lower than perfect due to retry
      expect(result.percentageScore).toBeLessThan(100);
    });

    it('penalizes hint usage', () => {
      const attemptsWithHints = [
        createAttempt({ stepId: 's1', hintsRequested: 2 }),
        createAttempt({ stepId: 's2', hintsRequested: 1 }),
        createAttempt({ stepId: 's3', hintsRequested: 0 }),
        createAttempt({ stepId: 's4', hintsRequested: 0 }),
        createAttempt({ stepId: 's5', hintsRequested: 0 }),
      ];

      const attemptsWithoutHints = [
        createAttempt({ stepId: 's1', hintsRequested: 0 }),
        createAttempt({ stepId: 's2', hintsRequested: 0 }),
        createAttempt({ stepId: 's3', hintsRequested: 0 }),
        createAttempt({ stepId: 's4', hintsRequested: 0 }),
        createAttempt({ stepId: 's5', hintsRequested: 0 }),
      ];

      const sessionWithHints = createTestSession({ stepAttempts: attemptsWithHints, totalSteps: 5 });
      const sessionWithoutHints = createTestSession({ stepAttempts: attemptsWithoutHints, totalSteps: 5 });

      const resultWithHints = calculateRubricResult(sessionWithHints);
      const resultWithoutHints = calculateRubricResult(sessionWithoutHints);

      expect(resultWithHints.percentageScore).toBeLessThan(resultWithoutHints.percentageScore);
    });

    it('scores time efficiency based on elapsed time', () => {
      const attempts = [
        createAttempt({ stepId: 's1' }),
        createAttempt({ stepId: 's2' }),
        createAttempt({ stepId: 's3' }),
      ];

      // Fast completion (under 50% of limit)
      const fastSession = createTestSession({
        stepAttempts: attempts,
        timerElapsed: 600, // 10 min of 30 min
        timerLimit: 1800,
        totalSteps: 3,
      });

      // Slow completion (near limit)
      const slowSession = createTestSession({
        stepAttempts: attempts,
        timerElapsed: 1700, // 28 min of 30 min
        timerLimit: 1800,
        totalSteps: 3,
      });

      const fastResult = calculateRubricResult(fastSession);
      const slowResult = calculateRubricResult(slowSession);

      expect(fastResult.percentageScore).toBeGreaterThan(slowResult.percentageScore);
    });

    it('rewards detailed explanations', () => {
      const shortExplanation = {
        approach: 'Used physics.',
        invariant: 'Energy.',
        complexity: 'O(1)',
        submittedAt: Date.now(),
      };

      const detailedExplanation = {
        approach: 'I approached this problem by first drawing a free body diagram to identify all forces acting on the block. Then I applied Newton\'s second law in the direction parallel to the incline.',
        invariant: 'The key principle is the conservation of mechanical energy. Since there is no friction, the total mechanical energy (kinetic + potential) remains constant throughout the motion.',
        complexity: 'O(1) time complexity for direct calculation, O(1) space complexity as we only store a fixed number of variables.',
        submittedAt: Date.now(),
      };

      const shortAttempts = [
        createAttempt({ stepId: 's1', explanation: shortExplanation }),
        createAttempt({ stepId: 's2', explanation: shortExplanation }),
        createAttempt({ stepId: 's3', explanation: shortExplanation }),
      ];

      const detailedAttempts = [
        createAttempt({ stepId: 's1', explanation: detailedExplanation }),
        createAttempt({ stepId: 's2', explanation: detailedExplanation }),
        createAttempt({ stepId: 's3', explanation: detailedExplanation }),
      ];

      const shortSession = createTestSession({ stepAttempts: shortAttempts, totalSteps: 3 });
      const detailedSession = createTestSession({ stepAttempts: detailedAttempts, totalSteps: 3 });

      const shortResult = calculateRubricResult(shortSession);
      const detailedResult = calculateRubricResult(detailedSession);

      expect(detailedResult.percentageScore).toBeGreaterThan(shortResult.percentageScore);
    });

    it('returns zero for no attempts', () => {
      const session = createTestSession({ stepAttempts: [], totalSteps: 5 });
      const result = calculateRubricResult(session);

      expect(result.totalScore).toBe(0);
      expect(result.improvements.length).toBeGreaterThan(0);
    });

    it('handles timed out sessions', () => {
      const session = createTestSession({
        stepAttempts: [createAttempt({ stepId: 's1' })],
        timerElapsed: 1800,
        timerLimit: 1800,
        totalSteps: 5,
      });

      // Manually set expired
      const expiredSession = {
        ...session,
        timerState: {
          ...session.timerState,
          isExpired: true,
          remainingSeconds: 0,
        },
      };

      const result = calculateRubricResult(expiredSession);

      // Time efficiency should be 0
      const timeScore = result.scores.find((s) => s.dimension === 'time_efficiency');
      expect(timeScore?.score).toBe(0);
    });
  });

  describe('calculateGrade', () => {
    it('returns A+ for 97+', () => {
      expect(calculateGrade(97)).toBe('A+');
      expect(calculateGrade(100)).toBe('A+');
    });

    it('returns A for 93-96', () => {
      expect(calculateGrade(93)).toBe('A');
      expect(calculateGrade(96)).toBe('A');
    });

    it('returns A- for 90-92', () => {
      expect(calculateGrade(90)).toBe('A-');
      expect(calculateGrade(92)).toBe('A-');
    });

    it('returns B grades for 80-89', () => {
      expect(calculateGrade(87)).toBe('B+');
      expect(calculateGrade(83)).toBe('B');
      expect(calculateGrade(80)).toBe('B-');
    });

    it('returns C grades for 70-79', () => {
      expect(calculateGrade(77)).toBe('C+');
      expect(calculateGrade(73)).toBe('C');
      expect(calculateGrade(70)).toBe('C-');
    });

    it('returns D for 60-69', () => {
      expect(calculateGrade(60)).toBe('D');
      expect(calculateGrade(69)).toBe('D');
    });

    it('returns F for below 60', () => {
      expect(calculateGrade(59)).toBe('F');
      expect(calculateGrade(0)).toBe('F');
    });
  });

  describe('SCORING_THRESHOLDS', () => {
    it('has consistent hint penalty values', () => {
      expect(SCORING_THRESHOLDS.HINT_PENALTY_PER_USE).toBe(15);
      expect(SCORING_THRESHOLDS.MAX_HINT_PENALTY).toBe(60);
      // Max hints before capped = 60 / 15 = 4
      expect(SCORING_THRESHOLDS.MAX_HINT_PENALTY / SCORING_THRESHOLDS.HINT_PENALTY_PER_USE).toBe(4);
    });

    it('has valid time thresholds', () => {
      expect(SCORING_THRESHOLDS.TIME_EXCELLENT_RATIO).toBeLessThan(SCORING_THRESHOLDS.TIME_GOOD_RATIO);
      expect(SCORING_THRESHOLDS.TIME_GOOD_RATIO).toBeLessThan(SCORING_THRESHOLDS.TIME_ACCEPTABLE_RATIO);
    });
  });

  describe('DEFAULT_RUBRIC_CRITERIA', () => {
    it('weights sum to 1.0', () => {
      const totalWeight = DEFAULT_RUBRIC_CRITERIA.reduce((sum, c) => sum + c.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 5);
    });

    it('has all required dimensions', () => {
      const dimensions = DEFAULT_RUBRIC_CRITERIA.map((c) => c.dimension);
      expect(dimensions).toContain('correctness');
      expect(dimensions).toContain('approach_clarity');
      expect(dimensions).toContain('invariant_identification');
      expect(dimensions).toContain('complexity_analysis');
      expect(dimensions).toContain('time_efficiency');
      expect(dimensions).toContain('hint_independence');
    });

    it('correctness has highest weight', () => {
      const correctness = DEFAULT_RUBRIC_CRITERIA.find((c) => c.dimension === 'correctness');
      const others = DEFAULT_RUBRIC_CRITERIA.filter((c) => c.dimension !== 'correctness');

      expect(correctness).toBeDefined();
      for (const criterion of others) {
        expect(correctness!.weight).toBeGreaterThanOrEqual(criterion.weight);
      }
    });
  });
});
