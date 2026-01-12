import { describe, it, expect } from 'vitest';
import {
  FOUNDATION_1_CRITERIA,
  FOUNDATION_2_CRITERIA,
  classifyContent,
  createFoundationClassification,
  checkTransitionEligibility,
  getSkillsForFoundation,
  getSkillDescription,
} from '../foundationClassification';
import { createDifficultyScores } from '../difficultyTaxonomy';

describe('foundationClassification', () => {
  describe('FOUNDATION_1_CRITERIA', () => {
    it('has correct focus', () => {
      expect(FOUNDATION_1_CRITERIA.focus.toLowerCase()).toContain('intuition');
      expect(FOUNDATION_1_CRITERIA.focus).toContain('FBD');
    });

    it('has five target skills', () => {
      expect(FOUNDATION_1_CRITERIA.targetSkills).toHaveLength(5);
      expect(FOUNDATION_1_CRITERIA.targetSkills).toContain('f1_qualitative_reasoning');
    });

    it('has appropriate difficulty constraints', () => {
      expect(FOUNDATION_1_CRITERIA.maxDifficulty).toBe(2);
      expect(FOUNDATION_1_CRITERIA.maxReasoningSteps).toBe(3);
      expect(FOUNDATION_1_CRITERIA.mathLevel).toBe('arithmetic_only');
    });

    it('has forbidden formats', () => {
      expect(FOUNDATION_1_CRITERIA.forbiddenFormats).toContain('numerical_calculation');
      expect(FOUNDATION_1_CRITERIA.forbiddenFormats).toContain('derivation');
    });
  });

  describe('FOUNDATION_2_CRITERIA', () => {
    it('has correct focus', () => {
      expect(FOUNDATION_2_CRITERIA.focus.toLowerCase()).toContain('non-obvious');
      expect(FOUNDATION_2_CRITERIA.focus.toLowerCase()).toContain('transfer');
    });

    it('has five target skills', () => {
      expect(FOUNDATION_2_CRITERIA.targetSkills).toHaveLength(5);
      expect(FOUNDATION_2_CRITERIA.targetSkills).toContain('f2_multi_step_reasoning');
    });

    it('has higher difficulty constraints', () => {
      expect(FOUNDATION_2_CRITERIA.maxDifficulty).toBe(4);
      expect(FOUNDATION_2_CRITERIA.maxReasoningSteps).toBe(5);
      expect(FOUNDATION_2_CRITERIA.mathLevel).toBe('basic_algebra');
    });
  });

  describe('classifyContent', () => {
    it('classifies intuition-based content as Foundation 1', () => {
      const difficulty = createDifficultyScores(
        { level: 'developing', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'developing', rationale: '' }
      );
      const result = classifyContent(difficulty, {
        requiresFBD: true,
        isIntuitionBased: true,
        hasNonObviousInteraction: false,
        reasoningSteps: 2,
        mathLevel: 'arithmetic',
      });
      expect(result.level).toBe('foundation1');
    });

    it('classifies non-obvious interaction content as Foundation 2', () => {
      const difficulty = createDifficultyScores(
        { level: 'proficient', rationale: '' },
        { level: 'proficient', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'proficient', rationale: '' }
      );
      const result = classifyContent(difficulty, {
        requiresFBD: false,
        isIntuitionBased: false,
        hasNonObviousInteraction: true,
        reasoningSteps: 4,
        mathLevel: 'algebra',
      });
      expect(result.level).toBe('foundation2');
    });

    it('flags violations for too-high difficulty', () => {
      const difficulty = createDifficultyScores(
        { level: 'expert', rationale: '' },
        { level: 'expert', rationale: '' },
        { level: 'advanced', rationale: '' },
        { level: 'advanced', rationale: '' },
        { level: 'expert', rationale: '' }
      );
      const result = classifyContent(difficulty, {
        requiresFBD: false,
        isIntuitionBased: false,
        hasNonObviousInteraction: false,
        reasoningSteps: 8,
        mathLevel: 'trigonometry',
      });
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('provides classification confidence', () => {
      const difficulty = createDifficultyScores(
        { level: 'developing', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'developing', rationale: '' }
      );
      const result = classifyContent(difficulty, {
        requiresFBD: true,
        isIntuitionBased: true,
        hasNonObviousInteraction: false,
        reasoningSteps: 2,
        mathLevel: 'arithmetic',
      });
      expect(['high', 'medium', 'low']).toContain(result.confidence);
    });
  });

  describe('createFoundationClassification', () => {
    it('creates Foundation 1 classification', () => {
      const classification = createFoundationClassification(
        'foundation1',
        ['f1_qualitative_reasoning', 'f1_representation', 'extra_skill'],
        ['force_concept']
      );
      expect(classification.level).toBe('foundation1');
      expect(classification.focus.toLowerCase()).toContain('intuition');
      // Only includes skills that are in the Foundation 1 list
      expect(classification.targetSkills).toContain('f1_qualitative_reasoning');
      expect(classification.targetSkills).toContain('f1_representation');
      expect(classification.targetSkills).not.toContain('extra_skill');
    });

    it('creates Foundation 2 classification', () => {
      const classification = createFoundationClassification(
        'foundation2',
        ['f2_vector_sense', 'f2_constraint_identification'],
        ['fbd_basics']
      );
      expect(classification.level).toBe('foundation2');
      expect(classification.focus.toLowerCase()).toContain('non-obvious');
    });
  });

  describe('checkTransitionEligibility', () => {
    it('checks Foundation 1 to Foundation 2 transition', () => {
      const result = checkTransitionEligibility('foundation1', {
        questionsCompleted: 15,
        averageScore: 0.8,
        skillsCovered: [
          'f1_qualitative_reasoning',
          'f1_representation',
          'f1_cause_effect',
          'f1_comparison',
          'f1_limiting_cases',
        ],
      });
      expect(result.eligible).toBe(true);
      expect(result.nextLevel).toBe('foundation2');
    });

    it('identifies missing requirements', () => {
      const result = checkTransitionEligibility('foundation1', {
        questionsCompleted: 5,
        averageScore: 0.5,
        skillsCovered: ['f1_qualitative_reasoning'],
      });
      expect(result.eligible).toBe(false);
      expect(result.missingRequirements.length).toBeGreaterThan(0);
    });

    it('identifies missing required skills', () => {
      const result = checkTransitionEligibility('foundation1', {
        questionsCompleted: 15,
        averageScore: 0.8,
        skillsCovered: ['f1_cause_effect', 'f1_comparison', 'f1_limiting_cases'],
      });
      expect(result.eligible).toBe(false);
      expect(result.missingRequirements.some(r => r.includes('skills'))).toBe(true);
    });
  });

  describe('getSkillsForFoundation', () => {
    it('returns Foundation 1 skills', () => {
      const skills = getSkillsForFoundation('foundation1');
      expect(skills).toHaveLength(5);
      expect(skills).toContain('f1_qualitative_reasoning');
    });

    it('returns Foundation 2 skills', () => {
      const skills = getSkillsForFoundation('foundation2');
      expect(skills).toHaveLength(5);
      expect(skills).toContain('f2_multi_step_reasoning');
    });
  });

  describe('getSkillDescription', () => {
    it('returns descriptions for Foundation 1 skills', () => {
      const desc = getSkillDescription('f1_qualitative_reasoning');
      expect(desc).toContain('intuition');
    });

    it('returns descriptions for Foundation 2 skills', () => {
      const desc = getSkillDescription('f2_vector_sense');
      expect(desc).toContain('vector');
    });

    it('returns skill ID for unknown skills', () => {
      const desc = getSkillDescription('unknown_skill');
      expect(desc).toBe('unknown_skill');
    });
  });
});
