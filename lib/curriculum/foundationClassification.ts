/**
 * Foundation 1/2 Classification Service
 *
 * Rules:
 * - Foundation 1: Focus on intuition and FBD separation
 * - Foundation 2: Include non-obvious interaction scenarios
 */

import type {
  FoundationLevel,
  FoundationClassification,
  ContentPack,
  ConceptCard,
  ProblemArchetype,
  SocraticTree,
  MasteryCheck,
  DifficultyScores,
} from '@/types/atomicLearning';
import { validateDifficultyForFoundation, levelToScore } from './difficultyTaxonomy';

// =============================================================================
// FOUNDATION 1 CRITERIA
// =============================================================================

export const FOUNDATION_1_CRITERIA = {
  focus: 'Intuition building and FBD separation',
  targetSkills: [
    'f1_qualitative_reasoning',
    'f1_representation',
    'f1_cause_effect',
    'f1_comparison',
    'f1_limiting_cases',
  ],
  maxDifficulty: 2,
  maxReasoningSteps: 3,
  allowedFormats: ['mcq_qualitative', 'diagram_interpretation', 'comparison', 'true_false'],
  forbiddenFormats: ['numerical_calculation', 'derivation', 'multi_part_numerical'],
  mathLevel: 'arithmetic_only',
};

// =============================================================================
// FOUNDATION 2 CRITERIA
// =============================================================================

export const FOUNDATION_2_CRITERIA = {
  focus: 'Non-obvious interaction scenarios and analytical transfer',
  targetSkills: [
    'f2_vector_sense',
    'f2_constraint_identification',
    'f2_multi_step_reasoning',
    'f2_equation_sense',
    'f2_unit_consistency',
  ],
  maxDifficulty: 4,
  maxReasoningSteps: 5,
  allowedFormats: ['mcq_quantitative', 'simple_numerical', 'diagram_analysis', 'fill_in_blank'],
  forbiddenFormats: ['complex_derivation', 'multi_variable_optimization'],
  mathLevel: 'basic_algebra',
};

// =============================================================================
// CLASSIFICATION FUNCTIONS
// =============================================================================

export interface ClassificationResult {
  level: FoundationLevel;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  violations: string[];
}

export function classifyContent(
  difficulty: DifficultyScores,
  characteristics: {
    requiresFBD: boolean;
    isIntuitionBased: boolean;
    hasNonObviousInteraction: boolean;
    reasoningSteps: number;
    mathLevel: 'arithmetic' | 'algebra' | 'trigonometry';
  }
): ClassificationResult {
  const reasons: string[] = [];
  const violations: string[] = [];

  // Check Foundation 1 fit
  let f1Score = 0;
  let f2Score = 0;

  // Difficulty check
  const overallScore = levelToScore(difficulty.composite.overall);
  if (overallScore <= 2) {
    f1Score += 2;
    reasons.push('Difficulty level suitable for Foundation 1');
  } else if (overallScore <= 4) {
    f2Score += 2;
    reasons.push('Difficulty level suitable for Foundation 2');
  } else {
    violations.push('Difficulty too high for Foundation levels');
  }

  // FBD check
  if (characteristics.requiresFBD) {
    f1Score += 1;
    reasons.push('Requires FBD (Foundation 1 core skill)');
  }

  // Intuition check
  if (characteristics.isIntuitionBased) {
    f1Score += 2;
    reasons.push('Intuition-based problem solving');
  } else {
    f2Score += 1;
  }

  // Non-obvious interaction
  if (characteristics.hasNonObviousInteraction) {
    f2Score += 2;
    reasons.push('Contains non-obvious interaction (Foundation 2 focus)');
  }

  // Reasoning steps
  if (characteristics.reasoningSteps <= 3) {
    f1Score += 1;
  } else if (characteristics.reasoningSteps <= 5) {
    f2Score += 1;
  } else {
    violations.push(`Too many reasoning steps (${characteristics.reasoningSteps}) for Foundation levels`);
  }

  // Math level
  if (characteristics.mathLevel === 'arithmetic') {
    f1Score += 1;
  } else if (characteristics.mathLevel === 'algebra') {
    f2Score += 1;
  } else {
    violations.push('Trigonometry required - beyond Foundation 2');
  }

  // Determine level
  const level: FoundationLevel = f1Score > f2Score ? 'foundation1' : 'foundation2';

  // Determine confidence
  const scoreDiff = Math.abs(f1Score - f2Score);
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (scoreDiff <= 1) {
    confidence = 'low';
  } else if (scoreDiff <= 3) {
    confidence = 'medium';
  }

  // Validate against difficulty constraints
  const validation = validateDifficultyForFoundation(difficulty, level);
  if (!validation.valid) {
    violations.push(...validation.violations);
  }

  return { level, confidence, reasons, violations };
}

// =============================================================================
// CREATE CLASSIFICATION
// =============================================================================

export function createFoundationClassification(
  level: FoundationLevel,
  targetSkills: string[],
  prerequisites: string[]
): FoundationClassification {
  const criteria = level === 'foundation1' ? FOUNDATION_1_CRITERIA : FOUNDATION_2_CRITERIA;

  return {
    level,
    focus: criteria.focus,
    targetSkills: targetSkills.filter((s) => criteria.targetSkills.includes(s)),
    prerequisites,
  };
}

// =============================================================================
// CONTENT PACK CLASSIFICATION
// =============================================================================

export function classifyContentPack(pack: ContentPack): {
  conceptCard: ClassificationResult;
  archetypes: Map<string, ClassificationResult>;
  overallLevel: FoundationLevel;
} {
  // Classify concept card
  const ccResult = classifyContent(pack.conceptCard.difficulty, {
    requiresFBD: pack.conceptCard.mentalModel.anchors.some((a) =>
      a.toLowerCase().includes('fbd') || a.toLowerCase().includes('free body')
    ),
    isIntuitionBased: !pack.conceptCard.targetInsight.includes('calculate'),
    hasNonObviousInteraction: pack.conceptCard.targetInsight.includes('interact') ||
      pack.conceptCard.targetInsight.includes('different bodies'),
    reasoningSteps: 2,  // Default for concept cards
    mathLevel: 'arithmetic',
  });

  // Classify each archetype
  const archetypes = new Map<string, ClassificationResult>();
  for (const pa of pack.problemArchetypes) {
    const result = classifyContent(pa.difficulty, {
      requiresFBD: pa.surfaceFeatures.diagramType === 'fbd',
      isIntuitionBased: pa.deepStructure.metaSkillsTested.includes('qualitative_reasoning'),
      hasNonObviousInteraction: pa.triggerCues.some((c) =>
        c.includes('interact') || c.includes('non-obvious')
      ),
      reasoningSteps: pa.stepStrategy.length,
      mathLevel: pa.deepStructure.requiredPatterns.includes('vector_algebra') ? 'algebra' : 'arithmetic',
    });
    archetypes.set(pa.id, result);
  }

  // Determine overall level (most restrictive)
  const allLevels = [ccResult.level, ...Array.from(archetypes.values()).map((r) => r.level)];
  const hasF1 = allLevels.includes('foundation1');
  const hasF2 = allLevels.includes('foundation2');

  // If mixed, use the lower level (Foundation 1) for safety
  const overallLevel: FoundationLevel = hasF1 && !hasF2 ? 'foundation1' : 'foundation2';

  return { conceptCard: ccResult, archetypes, overallLevel };
}

// =============================================================================
// FOUNDATION TRANSITION RULES
// =============================================================================

export interface TransitionRequirement {
  fromLevel: FoundationLevel;
  toLevel: 'foundation2' | 'intermediate' | 'competitive';
  requirements: {
    minQuestions: number;
    minAverageScore: number;
    minSkillsCovered: number;
    requiredSkills: string[];
  };
}

export const FOUNDATION_TRANSITIONS: TransitionRequirement[] = [
  {
    fromLevel: 'foundation1',
    toLevel: 'foundation2',
    requirements: {
      minQuestions: 10,
      minAverageScore: 0.7,
      minSkillsCovered: 4,
      requiredSkills: ['f1_qualitative_reasoning', 'f1_representation'],
    },
  },
  {
    fromLevel: 'foundation2',
    toLevel: 'intermediate',
    requirements: {
      minQuestions: 15,
      minAverageScore: 0.65,
      minSkillsCovered: 4,
      requiredSkills: ['f2_multi_step_reasoning', 'f2_constraint_identification'],
    },
  },
];

export function checkTransitionEligibility(
  currentLevel: FoundationLevel,
  stats: {
    questionsCompleted: number;
    averageScore: number;
    skillsCovered: string[];
  }
): { eligible: boolean; nextLevel: string | null; missingRequirements: string[] } {
  const transition = FOUNDATION_TRANSITIONS.find((t) => t.fromLevel === currentLevel);

  if (!transition) {
    return { eligible: false, nextLevel: null, missingRequirements: ['No transition defined'] };
  }

  const missing: string[] = [];

  if (stats.questionsCompleted < transition.requirements.minQuestions) {
    missing.push(`Need ${transition.requirements.minQuestions - stats.questionsCompleted} more questions`);
  }

  if (stats.averageScore < transition.requirements.minAverageScore) {
    missing.push(`Score ${(stats.averageScore * 100).toFixed(0)}% below required ${(transition.requirements.minAverageScore * 100).toFixed(0)}%`);
  }

  const coveredCount = stats.skillsCovered.filter((s) =>
    (currentLevel === 'foundation1' ? FOUNDATION_1_CRITERIA : FOUNDATION_2_CRITERIA).targetSkills.includes(s)
  ).length;

  if (coveredCount < transition.requirements.minSkillsCovered) {
    missing.push(`Need ${transition.requirements.minSkillsCovered - coveredCount} more skills covered`);
  }

  const missingRequired = transition.requirements.requiredSkills.filter(
    (s) => !stats.skillsCovered.includes(s)
  );
  if (missingRequired.length > 0) {
    missing.push(`Missing required skills: ${missingRequired.join(', ')}`);
  }

  return {
    eligible: missing.length === 0,
    nextLevel: missing.length === 0 ? transition.toLevel : null,
    missingRequirements: missing,
  };
}

// =============================================================================
// SKILL MAPPING
// =============================================================================

export function getSkillsForFoundation(level: FoundationLevel): string[] {
  return level === 'foundation1'
    ? FOUNDATION_1_CRITERIA.targetSkills
    : FOUNDATION_2_CRITERIA.targetSkills;
}

export function getSkillDescription(skillId: string): string {
  const descriptions: Record<string, string> = {
    // Foundation 1
    f1_qualitative_reasoning: 'Predict outcomes without calculation using physical intuition',
    f1_representation: 'Translate between verbal, pictorial, and diagrammatic representations',
    f1_cause_effect: 'Identify causal relationships between physical quantities',
    f1_comparison: 'Compare scenarios to determine relative magnitudes',
    f1_limiting_cases: 'Use extreme values to verify or derive relationships',
    // Foundation 2
    f2_vector_sense: 'Understand direction and magnitude of vector quantities',
    f2_constraint_identification: 'Recognize physical constraints that limit motion',
    f2_multi_step_reasoning: 'Chain 2-3 logical steps to reach conclusion',
    f2_equation_sense: 'Understand what equations tell us physically',
    f2_unit_consistency: 'Use dimensional analysis to check relationships',
  };

  return descriptions[skillId] || skillId;
}
