/**
 * Rubric Engine Policy
 * Pure scoring logic - no external dependencies
 */

import type {
  InterviewSession,
  InterviewStepAttempt,
  RubricCriterion,
  RubricDimension,
  RubricResult,
  RubricScore,
  ExplanationSubmission,
} from '../entities/interview-session';

// =============================================================================
// RUBRIC CONFIGURATION (Data-driven, no hidden logic)
// =============================================================================

export const DEFAULT_RUBRIC_CRITERIA: readonly RubricCriterion[] = [
  { dimension: 'correctness', weight: 0.30, maxScore: 100 },
  { dimension: 'approach_clarity', weight: 0.20, maxScore: 100 },
  { dimension: 'invariant_identification', weight: 0.15, maxScore: 100 },
  { dimension: 'complexity_analysis', weight: 0.15, maxScore: 100 },
  { dimension: 'time_efficiency', weight: 0.10, maxScore: 100 },
  { dimension: 'hint_independence', weight: 0.10, maxScore: 100 },
] as const;

// =============================================================================
// SCORING THRESHOLDS (Explicit constants)
// =============================================================================

export const SCORING_THRESHOLDS = {
  // Time efficiency
  TIME_EXCELLENT_RATIO: 0.5,    // Completed in <50% of time limit
  TIME_GOOD_RATIO: 0.75,        // Completed in <75% of time limit
  TIME_ACCEPTABLE_RATIO: 1.0,   // Completed within time limit

  // Hint penalties
  HINT_PENALTY_PER_USE: 15,     // Points deducted per hint
  MAX_HINT_PENALTY: 60,         // Maximum penalty for hints

  // Attempt penalties
  ATTEMPT_PENALTY_FIRST_WRONG: 10,
  ATTEMPT_PENALTY_SUBSEQUENT: 5,
  MAX_ATTEMPT_PENALTY: 30,

  // Explanation scoring
  EXPLANATION_MIN_LENGTH: 20,
  EXPLANATION_GOOD_LENGTH: 50,
  EXPLANATION_EXCELLENT_LENGTH: 100,

  // Complexity analysis
  COMPLEXITY_KEYWORDS: ['O(', 'time:', 'space:', 'linear', 'quadratic', 'logarithmic', 'constant', 'exponential'],
} as const;

// =============================================================================
// DIMENSION SCORERS
// =============================================================================

function scoreCorrectness(
  attempts: readonly InterviewStepAttempt[],
  totalSteps: number
): RubricScore {
  if (attempts.length === 0) {
    return {
      dimension: 'correctness',
      score: 0,
      maxScore: 100,
      feedback: 'No steps attempted.',
    };
  }

  // Group attempts by step
  const stepResults = new Map<string, { correct: boolean; attempts: number }>();

  for (const attempt of attempts) {
    const existing = stepResults.get(attempt.stepId);
    if (!existing || attempt.isCorrect) {
      stepResults.set(attempt.stepId, {
        correct: attempt.isCorrect || existing?.correct || false,
        attempts: (existing?.attempts || 0) + 1,
      });
    }
  }

  const correctSteps = Array.from(stepResults.values()).filter((r) => r.correct).length;
  const completionRatio = correctSteps / totalSteps;

  // Calculate base score
  let score = Math.round(completionRatio * 100);

  // Apply attempt penalties
  for (const result of stepResults.values()) {
    if (result.correct && result.attempts > 1) {
      const penalty = Math.min(
        SCORING_THRESHOLDS.ATTEMPT_PENALTY_FIRST_WRONG +
          (result.attempts - 2) * SCORING_THRESHOLDS.ATTEMPT_PENALTY_SUBSEQUENT,
        SCORING_THRESHOLDS.MAX_ATTEMPT_PENALTY
      );
      score = Math.max(0, score - penalty);
    }
  }

  let feedback: string;
  if (score >= 90) {
    feedback = 'Excellent accuracy with minimal errors.';
  } else if (score >= 70) {
    feedback = 'Good accuracy. Some steps required multiple attempts.';
  } else if (score >= 50) {
    feedback = 'Moderate accuracy. Several steps needed correction.';
  } else {
    feedback = 'Accuracy needs improvement. Focus on understanding core concepts.';
  }

  return {
    dimension: 'correctness',
    score,
    maxScore: 100,
    feedback,
  };
}

function scoreApproachClarity(
  attempts: readonly InterviewStepAttempt[]
): RubricScore {
  const explanations = attempts
    .map((a) => a.explanation)
    .filter((e): e is ExplanationSubmission => e !== null);

  if (explanations.length === 0) {
    return {
      dimension: 'approach_clarity',
      score: 0,
      maxScore: 100,
      feedback: 'No approach explanations provided.',
    };
  }

  let totalScore = 0;

  for (const exp of explanations) {
    const approach = exp.approach || '';
    const length = approach.trim().length;

    if (length >= SCORING_THRESHOLDS.EXPLANATION_EXCELLENT_LENGTH) {
      totalScore += 100;
    } else if (length >= SCORING_THRESHOLDS.EXPLANATION_GOOD_LENGTH) {
      totalScore += 75;
    } else if (length >= SCORING_THRESHOLDS.EXPLANATION_MIN_LENGTH) {
      totalScore += 50;
    } else if (length > 0) {
      totalScore += 25;
    }
  }

  const score = Math.round(totalScore / explanations.length);

  let feedback: string;
  if (score >= 90) {
    feedback = 'Clear and detailed approach explanations.';
  } else if (score >= 70) {
    feedback = 'Good approach clarity. Could add more detail in some areas.';
  } else if (score >= 50) {
    feedback = 'Approach explanations are brief. Expand on your reasoning.';
  } else {
    feedback = 'Approach explanations need significant improvement.';
  }

  return {
    dimension: 'approach_clarity',
    score,
    maxScore: 100,
    feedback,
  };
}

function scoreInvariantIdentification(
  attempts: readonly InterviewStepAttempt[]
): RubricScore {
  const explanations = attempts
    .map((a) => a.explanation)
    .filter((e): e is ExplanationSubmission => e !== null);

  if (explanations.length === 0) {
    return {
      dimension: 'invariant_identification',
      score: 0,
      maxScore: 100,
      feedback: 'No invariant explanations provided.',
    };
  }

  let totalScore = 0;

  for (const exp of explanations) {
    const invariant = exp.invariant || '';
    const length = invariant.trim().length;

    // Check for quality indicators
    const hasKeyTerms = /conserv|constant|maintain|preserve|equal|balanc/i.test(invariant);

    if (length >= SCORING_THRESHOLDS.EXPLANATION_EXCELLENT_LENGTH && hasKeyTerms) {
      totalScore += 100;
    } else if (length >= SCORING_THRESHOLDS.EXPLANATION_GOOD_LENGTH) {
      totalScore += hasKeyTerms ? 85 : 70;
    } else if (length >= SCORING_THRESHOLDS.EXPLANATION_MIN_LENGTH) {
      totalScore += hasKeyTerms ? 60 : 45;
    } else if (length > 0) {
      totalScore += 20;
    }
  }

  const score = Math.round(totalScore / explanations.length);

  let feedback: string;
  if (score >= 90) {
    feedback = 'Excellent identification of physical invariants and conservation laws.';
  } else if (score >= 70) {
    feedback = 'Good invariant identification. Consider deeper physical principles.';
  } else if (score >= 50) {
    feedback = 'Invariant identification needs more depth. Focus on what quantities are conserved.';
  } else {
    feedback = 'Work on identifying the underlying physical principles and conserved quantities.';
  }

  return {
    dimension: 'invariant_identification',
    score,
    maxScore: 100,
    feedback,
  };
}

function scoreComplexityAnalysis(
  attempts: readonly InterviewStepAttempt[]
): RubricScore {
  const explanations = attempts
    .map((a) => a.explanation)
    .filter((e): e is ExplanationSubmission => e !== null);

  if (explanations.length === 0) {
    return {
      dimension: 'complexity_analysis',
      score: 0,
      maxScore: 100,
      feedback: 'No complexity analysis provided.',
    };
  }

  let totalScore = 0;

  for (const exp of explanations) {
    const complexity = exp.complexity || '';
    const lowerComplexity = complexity.toLowerCase();

    // Check for complexity keywords
    const keywordMatches = SCORING_THRESHOLDS.COMPLEXITY_KEYWORDS.filter((kw) =>
      lowerComplexity.includes(kw.toLowerCase())
    ).length;

    if (keywordMatches >= 3) {
      totalScore += 100;
    } else if (keywordMatches >= 2) {
      totalScore += 80;
    } else if (keywordMatches >= 1) {
      totalScore += 60;
    } else if (complexity.trim().length >= 10) {
      totalScore += 30;
    }
  }

  const score = Math.round(totalScore / explanations.length);

  let feedback: string;
  if (score >= 90) {
    feedback = 'Thorough complexity analysis with proper notation.';
  } else if (score >= 70) {
    feedback = 'Good complexity awareness. Use Big-O notation for precision.';
  } else if (score >= 50) {
    feedback = 'Basic complexity understanding. Include time and space analysis.';
  } else {
    feedback = 'Develop complexity analysis skills. Practice identifying time/space requirements.';
  }

  return {
    dimension: 'complexity_analysis',
    score,
    maxScore: 100,
    feedback,
  };
}

function scoreTimeEfficiency(
  session: InterviewSession
): RubricScore {
  // No attempts = no time efficiency score
  if (session.stepAttempts.length === 0) {
    return {
      dimension: 'time_efficiency',
      score: 0,
      maxScore: 100,
      feedback: 'No steps attempted.',
    };
  }

  if (!session.config.timerEnabled || session.timerState.elapsedSeconds === 0) {
    return {
      dimension: 'time_efficiency',
      score: 100,
      maxScore: 100,
      feedback: 'Timer not applicable.',
    };
  }

  const timeRatio = session.timerState.elapsedSeconds / session.config.timeLimitSeconds;

  let score: number;
  let feedback: string;

  if (session.timerState.isExpired) {
    score = 0;
    feedback = 'Time limit exceeded. Practice solving problems faster.';
  } else if (timeRatio <= SCORING_THRESHOLDS.TIME_EXCELLENT_RATIO) {
    score = 100;
    feedback = 'Excellent time management. Solved well within the limit.';
  } else if (timeRatio <= SCORING_THRESHOLDS.TIME_GOOD_RATIO) {
    score = 80;
    feedback = 'Good pace. Completed with comfortable time remaining.';
  } else if (timeRatio <= SCORING_THRESHOLDS.TIME_ACCEPTABLE_RATIO) {
    score = 60;
    feedback = 'Acceptable timing. Consider improving speed for interviews.';
  } else {
    score = 40;
    feedback = 'Close to time limit. Practice time management.';
  }

  return {
    dimension: 'time_efficiency',
    score,
    maxScore: 100,
    feedback,
  };
}

function scoreHintIndependence(
  attempts: readonly InterviewStepAttempt[]
): RubricScore {
  // No attempts = no hint independence score
  if (attempts.length === 0) {
    return {
      dimension: 'hint_independence',
      score: 0,
      maxScore: 100,
      feedback: 'No steps attempted.',
    };
  }

  const totalHints = attempts.reduce((sum, a) => sum + a.hintsRequested, 0);

  const penalty = Math.min(
    totalHints * SCORING_THRESHOLDS.HINT_PENALTY_PER_USE,
    SCORING_THRESHOLDS.MAX_HINT_PENALTY
  );

  const score = Math.max(0, 100 - penalty);

  let feedback: string;
  if (totalHints === 0) {
    feedback = 'Excellent independence. No hints used.';
  } else if (totalHints <= 2) {
    feedback = 'Good independence with minimal hint usage.';
  } else if (totalHints <= 4) {
    feedback = 'Moderate hint usage. Try to solve more independently.';
  } else {
    feedback = 'High hint dependency. Practice solving without assistance.';
  }

  return {
    dimension: 'hint_independence',
    score,
    maxScore: 100,
    feedback,
  };
}

// =============================================================================
// MAIN SCORING FUNCTION
// =============================================================================

export function calculateRubricResult(
  session: InterviewSession,
  criteria: readonly RubricCriterion[] = DEFAULT_RUBRIC_CRITERIA
): RubricResult {
  // Calculate individual dimension scores
  const dimensionScorers: Record<RubricDimension, () => RubricScore> = {
    correctness: () => scoreCorrectness(session.stepAttempts, session.totalSteps),
    approach_clarity: () => scoreApproachClarity(session.stepAttempts),
    invariant_identification: () => scoreInvariantIdentification(session.stepAttempts),
    complexity_analysis: () => scoreComplexityAnalysis(session.stepAttempts),
    time_efficiency: () => scoreTimeEfficiency(session),
    hint_independence: () => scoreHintIndependence(session.stepAttempts),
  };

  const scores: RubricScore[] = [];
  let weightedTotal = 0;
  let totalWeight = 0;

  for (const criterion of criteria) {
    const scorer = dimensionScorers[criterion.dimension];
    if (scorer) {
      const score = scorer();
      scores.push(score);
      weightedTotal += score.score * criterion.weight;
      totalWeight += criterion.weight;
    }
  }

  const totalScore = Math.round(weightedTotal / totalWeight);
  const maxPossibleScore = 100;
  const percentageScore = totalScore;

  // Generate strengths and improvements
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);
  const strengths = sortedScores
    .filter((s) => s.score >= 70)
    .slice(0, 3)
    .map((s) => formatDimensionName(s.dimension));

  const improvements = sortedScores
    .filter((s) => s.score < 70)
    .slice(-3)
    .map((s) => formatDimensionName(s.dimension));

  // Generate overall feedback
  let overallFeedback: string;
  if (totalScore >= 90) {
    overallFeedback = 'Outstanding performance! You demonstrated strong problem-solving skills across all dimensions.';
  } else if (totalScore >= 80) {
    overallFeedback = 'Great job! You showed solid understanding with room for minor improvements.';
  } else if (totalScore >= 70) {
    overallFeedback = 'Good effort. Focus on the areas for improvement to strengthen your interview performance.';
  } else if (totalScore >= 60) {
    overallFeedback = 'Acceptable performance. Dedicated practice in weak areas will help significantly.';
  } else {
    overallFeedback = 'More practice needed. Review the fundamentals and work on explaining your thought process.';
  }

  return {
    scores,
    totalScore,
    maxPossibleScore,
    percentageScore,
    overallFeedback,
    strengths,
    improvements,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDimensionName(dimension: RubricDimension): string {
  const names: Record<RubricDimension, string> = {
    correctness: 'Correctness',
    approach_clarity: 'Approach Clarity',
    invariant_identification: 'Invariant Identification',
    complexity_analysis: 'Complexity Analysis',
    time_efficiency: 'Time Efficiency',
    hint_independence: 'Hint Independence',
  };
  return names[dimension];
}

// =============================================================================
// GRADE CALCULATION
// =============================================================================

export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D' | 'F';

export const GRADE_THRESHOLDS: readonly { min: number; grade: Grade }[] = [
  { min: 97, grade: 'A+' },
  { min: 93, grade: 'A' },
  { min: 90, grade: 'A-' },
  { min: 87, grade: 'B+' },
  { min: 83, grade: 'B' },
  { min: 80, grade: 'B-' },
  { min: 77, grade: 'C+' },
  { min: 73, grade: 'C' },
  { min: 70, grade: 'C-' },
  { min: 60, grade: 'D' },
  { min: 0, grade: 'F' },
] as const;

export function calculateGrade(percentageScore: number): Grade {
  for (const threshold of GRADE_THRESHOLDS) {
    if (percentageScore >= threshold.min) {
      return threshold.grade;
    }
  }
  return 'F';
}
