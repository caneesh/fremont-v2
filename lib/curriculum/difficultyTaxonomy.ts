/**
 * Multi-Dimensional Difficulty Taxonomy for Physics Learning Objects
 *
 * Difficulty is NOT a single number. It reflects:
 * - Conceptual load
 * - Reasoning depth
 * - Transfer distance
 * - Representation switching
 * - Misconception risk
 */

import type {
  DifficultyScores,
  DifficultyLevel,
  ProblemArchetype,
  ConceptCard,
  MasteryCheck,
  FoundationLevel,
} from '@/types/atomicLearning';

// =============================================================================
// DIFFICULTY LEVEL DEFINITIONS
// =============================================================================

export const DIFFICULTY_LEVELS: Record<DifficultyLevel, { score: number; description: string }> = {
  novice: {
    score: 1,
    description: 'First exposure, single concept, direct application',
  },
  developing: {
    score: 2,
    description: 'Building understanding, 2 concepts, guided reasoning',
  },
  proficient: {
    score: 3,
    description: 'Solid grasp, multi-concept, independent reasoning',
  },
  advanced: {
    score: 4,
    description: 'Deep understanding, concept synthesis, novel contexts',
  },
  expert: {
    score: 5,
    description: 'Transfer mastery, abstraction, teaching-level clarity',
  },
};

// =============================================================================
// DIMENSION RUBRICS
// =============================================================================

export interface DimensionRubric {
  dimension: keyof Omit<DifficultyScores, 'composite'>;
  levels: Record<DifficultyLevel, string>;
}

export const CONCEPTUAL_LOAD_RUBRIC: DimensionRubric = {
  dimension: 'conceptualLoad',
  levels: {
    novice: 'Single concept, no prerequisites beyond basic definitions',
    developing: 'Two concepts, one direct relationship',
    proficient: 'Three concepts, interconnected relationships',
    advanced: 'Four+ concepts, hierarchical dependencies',
    expert: 'Concept network with emergent properties',
  },
};

export const REASONING_DEPTH_RUBRIC: DimensionRubric = {
  dimension: 'reasoningDepth',
  levels: {
    novice: 'One logical step, direct recall or application',
    developing: 'Two logical steps, simple inference chain',
    proficient: 'Three logical steps, conditional branching',
    advanced: 'Four+ steps, hypothesis testing required',
    expert: 'Multi-path reasoning with synthesis',
  },
};

export const TRANSFER_DISTANCE_RUBRIC: DimensionRubric = {
  dimension: 'transferDistance',
  levels: {
    novice: 'Same context as learning, identical surface features',
    developing: 'Similar context, minor surface variation',
    proficient: 'Related domain, significant surface change',
    advanced: 'New domain, preserved deep structure only',
    expert: 'Cross-domain, analogical transfer required',
  },
};

export const REPRESENTATION_SWITCHING_RUBRIC: DimensionRubric = {
  dimension: 'representationSwitching',
  levels: {
    novice: 'Single representation (verbal only or diagram only)',
    developing: 'Two representations, explicit mapping provided',
    proficient: 'Two representations, self-directed mapping',
    advanced: 'Three+ representations, fluid switching',
    expert: 'Novel representation construction',
  },
};

export const MISCONCEPTION_RISK_RUBRIC: DimensionRubric = {
  dimension: 'misconceptionRisk',
  levels: {
    novice: 'Low risk, no common misconceptions apply',
    developing: 'One common misconception possible, easily corrected',
    proficient: 'Two misconceptions, requires active monitoring',
    advanced: 'Multiple misconceptions, subtle triggers',
    expert: 'Deep-seated misconceptions, paradigm shift needed',
  },
};

export const ALL_RUBRICS: DimensionRubric[] = [
  CONCEPTUAL_LOAD_RUBRIC,
  REASONING_DEPTH_RUBRIC,
  TRANSFER_DISTANCE_RUBRIC,
  REPRESENTATION_SWITCHING_RUBRIC,
  MISCONCEPTION_RISK_RUBRIC,
];

// =============================================================================
// DIFFICULTY SCORING
// =============================================================================

export function scoreToLevel(score: number): DifficultyLevel {
  if (score <= 1) return 'novice';
  if (score <= 2) return 'developing';
  if (score <= 3) return 'proficient';
  if (score <= 4) return 'advanced';
  return 'expert';
}

export function levelToScore(level: DifficultyLevel): number {
  return DIFFICULTY_LEVELS[level].score;
}

export function createDimensionScore(
  level: DifficultyLevel,
  rationale: string
): { level: DifficultyLevel; score: number; rationale: string } {
  return {
    level,
    score: levelToScore(level),
    rationale,
  };
}

export function computeComposite(scores: Omit<DifficultyScores, 'composite'>): DifficultyScores['composite'] {
  const dimensions = [
    { key: 'conceptualLoad' as const, score: scores.conceptualLoad.score },
    { key: 'reasoningDepth' as const, score: scores.reasoningDepth.score },
    { key: 'transferDistance' as const, score: scores.transferDistance.score },
    { key: 'representationSwitching' as const, score: scores.representationSwitching.score },
    { key: 'misconceptionRisk' as const, score: scores.misconceptionRisk.score },
  ];

  // Overall is weighted average (reasoning depth and misconception risk weighted higher)
  const weights = {
    conceptualLoad: 1,
    reasoningDepth: 1.5,
    transferDistance: 1,
    representationSwitching: 1,
    misconceptionRisk: 1.5,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const dim of dimensions) {
    const weight = weights[dim.key];
    weightedSum += dim.score * weight;
    totalWeight += weight;
  }

  const averageScore = weightedSum / totalWeight;
  const overall = scoreToLevel(averageScore);

  // Primary challenge is the highest-scoring dimension
  const primaryChallenge = dimensions.reduce((max, dim) =>
    dim.score > max.score ? dim : max
  ).key;

  return { overall, primaryChallenge };
}

export function createDifficultyScores(
  conceptualLoad: { level: DifficultyLevel; rationale: string },
  reasoningDepth: { level: DifficultyLevel; rationale: string },
  transferDistance: { level: DifficultyLevel; rationale: string },
  representationSwitching: { level: DifficultyLevel; rationale: string },
  misconceptionRisk: { level: DifficultyLevel; rationale: string }
): DifficultyScores {
  const scores = {
    conceptualLoad: createDimensionScore(conceptualLoad.level, conceptualLoad.rationale),
    reasoningDepth: createDimensionScore(reasoningDepth.level, reasoningDepth.rationale),
    transferDistance: createDimensionScore(transferDistance.level, transferDistance.rationale),
    representationSwitching: createDimensionScore(representationSwitching.level, representationSwitching.rationale),
    misconceptionRisk: createDimensionScore(misconceptionRisk.level, misconceptionRisk.rationale),
  };

  return {
    ...scores,
    composite: computeComposite(scores),
  };
}

// =============================================================================
// STUDENT PROFILE MATCHING
// =============================================================================

export interface StudentProfile {
  foundationLevel: FoundationLevel;
  conceptualStrength: DifficultyLevel;
  reasoningStrength: DifficultyLevel;
  transferStrength: DifficultyLevel;
  toleratesAmbiguity: boolean;
}

export function matchContentToProfile(
  difficulty: DifficultyScores,
  profile: StudentProfile
): { match: 'ideal' | 'stretch' | 'too_hard' | 'too_easy'; reasons: string[] } {
  const reasons: string[] = [];
  let stretchCount = 0;
  let tooHardCount = 0;
  let tooEasyCount = 0;

  // Check conceptual load
  const conceptDiff = difficulty.conceptualLoad.score - levelToScore(profile.conceptualStrength);
  if (conceptDiff > 1) {
    tooHardCount++;
    reasons.push('Conceptual load exceeds current strength');
  } else if (conceptDiff > 0) {
    stretchCount++;
    reasons.push('Conceptual load is a healthy stretch');
  } else if (conceptDiff < -1) {
    tooEasyCount++;
    reasons.push('Conceptual load is below current level');
  }

  // Check reasoning depth
  const reasoningDiff = difficulty.reasoningDepth.score - levelToScore(profile.reasoningStrength);
  if (reasoningDiff > 1) {
    tooHardCount++;
    reasons.push('Reasoning depth exceeds current ability');
  } else if (reasoningDiff > 0) {
    stretchCount++;
    reasons.push('Reasoning depth provides good challenge');
  } else if (reasoningDiff < -1) {
    tooEasyCount++;
    reasons.push('Reasoning depth is routine');
  }

  // Check transfer distance
  const transferDiff = difficulty.transferDistance.score - levelToScore(profile.transferStrength);
  if (transferDiff > 1) {
    tooHardCount++;
    reasons.push('Transfer distance too far from learned context');
  } else if (transferDiff > 0) {
    stretchCount++;
    reasons.push('Transfer distance encourages generalization');
  } else if (transferDiff < -1) {
    tooEasyCount++;
    reasons.push('Transfer distance is trivial for this student');
  }

  // Check misconception risk for students who don't tolerate ambiguity
  if (!profile.toleratesAmbiguity && difficulty.misconceptionRisk.score >= 4) {
    tooHardCount++;
    reasons.push('High misconception risk for student who prefers clarity');
  }

  // Determine overall match
  if (tooHardCount >= 2) {
    return { match: 'too_hard', reasons };
  }
  if (tooEasyCount >= 3) {
    return { match: 'too_easy', reasons };
  }
  if (stretchCount >= 1 && tooHardCount === 0) {
    return { match: 'stretch', reasons };
  }

  return { match: 'ideal', reasons };
}

// =============================================================================
// FOUNDATION LEVEL CONSTRAINTS
// =============================================================================

export const FOUNDATION_DIFFICULTY_CONSTRAINTS: Record<FoundationLevel, {
  maxOverall: DifficultyLevel;
  maxReasoningDepth: DifficultyLevel;
  maxTransferDistance: DifficultyLevel;
}> = {
  foundation1: {
    maxOverall: 'developing',
    maxReasoningDepth: 'developing',
    maxTransferDistance: 'novice',
  },
  foundation2: {
    maxOverall: 'proficient',
    maxReasoningDepth: 'proficient',
    maxTransferDistance: 'developing',
  },
};

export function validateDifficultyForFoundation(
  difficulty: DifficultyScores,
  foundationLevel: FoundationLevel
): { valid: boolean; violations: string[] } {
  const constraints = FOUNDATION_DIFFICULTY_CONSTRAINTS[foundationLevel];
  const violations: string[] = [];

  if (levelToScore(difficulty.composite.overall) > levelToScore(constraints.maxOverall)) {
    violations.push(
      `Overall difficulty (${difficulty.composite.overall}) exceeds max for ${foundationLevel} (${constraints.maxOverall})`
    );
  }

  if (levelToScore(difficulty.reasoningDepth.level) > levelToScore(constraints.maxReasoningDepth)) {
    violations.push(
      `Reasoning depth (${difficulty.reasoningDepth.level}) exceeds max for ${foundationLevel} (${constraints.maxReasoningDepth})`
    );
  }

  if (levelToScore(difficulty.transferDistance.level) > levelToScore(constraints.maxTransferDistance)) {
    violations.push(
      `Transfer distance (${difficulty.transferDistance.level}) exceeds max for ${foundationLevel} (${constraints.maxTransferDistance})`
    );
  }

  return { valid: violations.length === 0, violations };
}

// =============================================================================
// DIFFICULTY ANALYSIS HELPERS
// =============================================================================

export function getDifficultyProfile(scores: DifficultyScores): string {
  const dims = [
    { name: 'Conceptual', score: scores.conceptualLoad.score },
    { name: 'Reasoning', score: scores.reasoningDepth.score },
    { name: 'Transfer', score: scores.transferDistance.score },
    { name: 'Representation', score: scores.representationSwitching.score },
    { name: 'Misconception', score: scores.misconceptionRisk.score },
  ];

  const highest = dims.reduce((max, d) => (d.score > max.score ? d : max));
  const lowest = dims.reduce((min, d) => (d.score < min.score ? d : min));

  return `Primary challenge: ${highest.name} (${scoreToLevel(highest.score)}). ` +
    `Strength area: ${lowest.name} (${scoreToLevel(lowest.score)}). ` +
    `Overall: ${scores.composite.overall}.`;
}

export function suggestPrerequisites(scores: DifficultyScores): string[] {
  const suggestions: string[] = [];

  if (scores.conceptualLoad.score >= 3) {
    suggestions.push('Ensure foundational concepts are mastered before attempting');
  }

  if (scores.reasoningDepth.score >= 4) {
    suggestions.push('Practice simpler multi-step problems first');
  }

  if (scores.transferDistance.score >= 3) {
    suggestions.push('Review the original context where this was learned');
  }

  if (scores.representationSwitching.score >= 3) {
    suggestions.push('Practice translating between verbal and diagrammatic forms');
  }

  if (scores.misconceptionRisk.score >= 3) {
    suggestions.push('Address common misconceptions explicitly before attempting');
  }

  return suggestions;
}
