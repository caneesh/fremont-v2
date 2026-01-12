import { describe, it, expect } from 'vitest';
import {
  scoreToLevel,
  levelToScore,
  createDimensionScore,
  computeComposite,
  createDifficultyScores,
  matchContentToProfile,
  validateDifficultyForFoundation,
  getDifficultyProfile,
  suggestPrerequisites,
  DIFFICULTY_LEVELS,
} from '../difficultyTaxonomy';
import type { DifficultyScores, StudentProfile } from '@/types/atomicLearning';

describe('difficultyTaxonomy', () => {
  describe('scoreToLevel', () => {
    it('converts scores to correct levels', () => {
      expect(scoreToLevel(1)).toBe('novice');
      expect(scoreToLevel(2)).toBe('developing');
      expect(scoreToLevel(3)).toBe('proficient');
      expect(scoreToLevel(4)).toBe('advanced');
      expect(scoreToLevel(5)).toBe('expert');
    });

    it('handles edge cases', () => {
      expect(scoreToLevel(0)).toBe('novice');
      expect(scoreToLevel(1.5)).toBe('developing');
      expect(scoreToLevel(10)).toBe('expert');
    });
  });

  describe('levelToScore', () => {
    it('converts levels to correct scores', () => {
      expect(levelToScore('novice')).toBe(1);
      expect(levelToScore('developing')).toBe(2);
      expect(levelToScore('proficient')).toBe(3);
      expect(levelToScore('advanced')).toBe(4);
      expect(levelToScore('expert')).toBe(5);
    });
  });

  describe('createDimensionScore', () => {
    it('creates dimension score with correct structure', () => {
      const score = createDimensionScore('developing', 'Test rationale');
      expect(score.level).toBe('developing');
      expect(score.score).toBe(2);
      expect(score.rationale).toBe('Test rationale');
    });
  });

  describe('computeComposite', () => {
    it('computes composite from dimension scores', () => {
      const scores = {
        conceptualLoad: { level: 'developing' as const, score: 2, rationale: '' },
        reasoningDepth: { level: 'developing' as const, score: 2, rationale: '' },
        transferDistance: { level: 'novice' as const, score: 1, rationale: '' },
        representationSwitching: { level: 'developing' as const, score: 2, rationale: '' },
        misconceptionRisk: { level: 'proficient' as const, score: 3, rationale: '' },
      };
      const composite = computeComposite(scores);
      expect(composite.overall).toBeDefined();
      expect(composite.primaryChallenge).toBeDefined();
    });

    it('identifies primary challenge correctly', () => {
      const scores = {
        conceptualLoad: { level: 'novice' as const, score: 1, rationale: '' },
        reasoningDepth: { level: 'novice' as const, score: 1, rationale: '' },
        transferDistance: { level: 'novice' as const, score: 1, rationale: '' },
        representationSwitching: { level: 'novice' as const, score: 1, rationale: '' },
        misconceptionRisk: { level: 'expert' as const, score: 5, rationale: '' },
      };
      const composite = computeComposite(scores);
      expect(composite.primaryChallenge).toBe('misconceptionRisk');
    });
  });

  describe('createDifficultyScores', () => {
    it('creates complete difficulty scores', () => {
      const scores = createDifficultyScores(
        { level: 'developing', rationale: 'test1' },
        { level: 'proficient', rationale: 'test2' },
        { level: 'novice', rationale: 'test3' },
        { level: 'developing', rationale: 'test4' },
        { level: 'advanced', rationale: 'test5' }
      );

      expect(scores.conceptualLoad.level).toBe('developing');
      expect(scores.reasoningDepth.level).toBe('proficient');
      expect(scores.transferDistance.level).toBe('novice');
      expect(scores.representationSwitching.level).toBe('developing');
      expect(scores.misconceptionRisk.level).toBe('advanced');
      expect(scores.composite).toBeDefined();
    });
  });

  describe('matchContentToProfile', () => {
    const baseDifficulty: DifficultyScores = createDifficultyScores(
      { level: 'developing', rationale: '' },
      { level: 'developing', rationale: '' },
      { level: 'novice', rationale: '' },
      { level: 'developing', rationale: '' },
      { level: 'developing', rationale: '' }
    );

    const baseProfile: StudentProfile = {
      foundationLevel: 'foundation1',
      conceptualStrength: 'developing',
      reasoningStrength: 'developing',
      transferStrength: 'novice',
      toleratesAmbiguity: true,
    };

    it('identifies ideal match', () => {
      const result = matchContentToProfile(baseDifficulty, baseProfile);
      expect(result.match).toBe('ideal');
    });

    it('identifies stretch content', () => {
      const harderDifficulty = createDifficultyScores(
        { level: 'proficient', rationale: '' },
        { level: 'proficient', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'developing', rationale: '' }
      );
      const result = matchContentToProfile(harderDifficulty, baseProfile);
      expect(result.match).toBe('stretch');
    });

    it('identifies too hard content', () => {
      const expertDifficulty = createDifficultyScores(
        { level: 'expert', rationale: '' },
        { level: 'expert', rationale: '' },
        { level: 'advanced', rationale: '' },
        { level: 'advanced', rationale: '' },
        { level: 'expert', rationale: '' }
      );
      const result = matchContentToProfile(expertDifficulty, baseProfile);
      expect(result.match).toBe('too_hard');
    });

    it('identifies too easy content', () => {
      const easyDifficulty = createDifficultyScores(
        { level: 'novice', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'novice', rationale: '' }
      );
      const advancedProfile: StudentProfile = {
        ...baseProfile,
        conceptualStrength: 'advanced',
        reasoningStrength: 'advanced',
        transferStrength: 'proficient',
      };
      const result = matchContentToProfile(easyDifficulty, advancedProfile);
      expect(result.match).toBe('too_easy');
    });

    it('considers ambiguity tolerance', () => {
      const ambiguousDifficulty = createDifficultyScores(
        { level: 'developing', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'advanced', rationale: '' }
      );
      const lowToleranceProfile: StudentProfile = {
        ...baseProfile,
        toleratesAmbiguity: false,
      };
      const result = matchContentToProfile(ambiguousDifficulty, lowToleranceProfile);
      expect(result.reasons.some(r => r.includes('misconception'))).toBe(true);
    });
  });

  describe('validateDifficultyForFoundation', () => {
    it('validates Foundation 1 content', () => {
      const validF1 = createDifficultyScores(
        { level: 'developing', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'developing', rationale: '' }
      );
      const result = validateDifficultyForFoundation(validF1, 'foundation1');
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('rejects too difficult content for Foundation 1', () => {
      const invalidF1 = createDifficultyScores(
        { level: 'advanced', rationale: '' },
        { level: 'advanced', rationale: '' },
        { level: 'proficient', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'advanced', rationale: '' }
      );
      const result = validateDifficultyForFoundation(invalidF1, 'foundation1');
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });

    it('validates Foundation 2 content', () => {
      const validF2 = createDifficultyScores(
        { level: 'proficient', rationale: '' },
        { level: 'proficient', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'proficient', rationale: '' }
      );
      const result = validateDifficultyForFoundation(validF2, 'foundation2');
      expect(result.valid).toBe(true);
    });
  });

  describe('getDifficultyProfile', () => {
    it('generates human-readable profile', () => {
      const scores = createDifficultyScores(
        { level: 'developing', rationale: '' },
        { level: 'proficient', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'advanced', rationale: '' }
      );
      const profile = getDifficultyProfile(scores);
      expect(profile).toContain('Primary challenge');
      expect(profile).toContain('Strength area');
      expect(profile).toContain('Overall');
    });
  });

  describe('suggestPrerequisites', () => {
    it('suggests prerequisites for high conceptual load', () => {
      const scores = createDifficultyScores(
        { level: 'proficient', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'developing', rationale: '' }
      );
      const suggestions = suggestPrerequisites(scores);
      expect(suggestions.some(s => s.includes('foundational'))).toBe(true);
    });

    it('suggests prerequisites for high misconception risk', () => {
      const scores = createDifficultyScores(
        { level: 'developing', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'developing', rationale: '' },
        { level: 'advanced', rationale: '' }
      );
      const suggestions = suggestPrerequisites(scores);
      expect(suggestions.some(s => s.includes('misconception'))).toBe(true);
    });

    it('returns empty for easy content', () => {
      const scores = createDifficultyScores(
        { level: 'novice', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'novice', rationale: '' },
        { level: 'novice', rationale: '' }
      );
      const suggestions = suggestPrerequisites(scores);
      expect(suggestions).toHaveLength(0);
    });
  });

  describe('DIFFICULTY_LEVELS', () => {
    it('has all required levels', () => {
      expect(DIFFICULTY_LEVELS.novice).toBeDefined();
      expect(DIFFICULTY_LEVELS.developing).toBeDefined();
      expect(DIFFICULTY_LEVELS.proficient).toBeDefined();
      expect(DIFFICULTY_LEVELS.advanced).toBeDefined();
      expect(DIFFICULTY_LEVELS.expert).toBeDefined();
    });

    it('has correct score progression', () => {
      expect(DIFFICULTY_LEVELS.novice.score).toBe(1);
      expect(DIFFICULTY_LEVELS.developing.score).toBe(2);
      expect(DIFFICULTY_LEVELS.proficient.score).toBe(3);
      expect(DIFFICULTY_LEVELS.advanced.score).toBe(4);
      expect(DIFFICULTY_LEVELS.expert.score).toBe(5);
    });
  });
});
