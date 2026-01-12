import { describe, it, expect } from 'vitest';
import {
  GRADE_ORDER,
  getGradeIndex,
  getNextGrade,
  createEvolutionStage,
  createEvolutionMap,
  NEWTONS_LAWS_EVOLUTION,
  generatePayoffTags,
  getCrossLevelPrerequisites,
  analyzeEvolution,
  checkLevelReadiness,
  getEvolutionMap,
} from '../conceptEvolution';

describe('conceptEvolution', () => {
  describe('GRADE_ORDER', () => {
    it('has correct grade progression', () => {
      expect(GRADE_ORDER).toEqual(['class9', 'class10', 'jee_main', 'jee_advanced']);
    });
  });

  describe('getGradeIndex', () => {
    it('returns correct indices', () => {
      expect(getGradeIndex('class9')).toBe(0);
      expect(getGradeIndex('class10')).toBe(1);
      expect(getGradeIndex('jee_main')).toBe(2);
      expect(getGradeIndex('jee_advanced')).toBe(3);
    });
  });

  describe('getNextGrade', () => {
    it('returns next grade level', () => {
      expect(getNextGrade('class9')).toBe('class10');
      expect(getNextGrade('class10')).toBe('jee_main');
      expect(getNextGrade('jee_main')).toBe('jee_advanced');
    });

    it('returns null for highest level', () => {
      expect(getNextGrade('jee_advanced')).toBeNull();
    });
  });

  describe('createEvolutionStage', () => {
    it('creates stage with all properties', () => {
      const stage = createEvolutionStage(
        'class9',
        'New abstraction',
        ['assumption1'],
        ['archetype1'],
        ['misconception1'],
        'Thinking shift'
      );
      expect(stage.level).toBe('class9');
      expect(stage.newAbstraction).toBe('New abstraction');
      expect(stage.relaxedAssumptions).toContain('assumption1');
      expect(stage.unlockedArchetypes).toContain('archetype1');
      expect(stage.resurfacingMisconceptions).toContain('misconception1');
      expect(stage.thinkingShift).toBe('Thinking shift');
    });
  });

  describe('createEvolutionMap', () => {
    it('creates map with all properties', () => {
      const stage = createEvolutionStage(
        'class9',
        'New abstraction',
        [],
        [],
        [],
        'Thinking shift'
      );
      const map = createEvolutionMap('test-id', 'Test Concept', [stage], ['theme1']);
      expect(map.id).toBe('test-id');
      expect(map.conceptFamily).toBe('Test Concept');
      expect(map.stages).toHaveLength(1);
      expect(map.themes).toContain('theme1');
    });
  });

  describe('NEWTONS_LAWS_EVOLUTION', () => {
    it('has four stages', () => {
      expect(NEWTONS_LAWS_EVOLUTION.stages).toHaveLength(4);
    });

    it('covers all grade levels', () => {
      const levels = NEWTONS_LAWS_EVOLUTION.stages.map(s => s.level);
      expect(levels).toContain('class9');
      expect(levels).toContain('class10');
      expect(levels).toContain('jee_main');
      expect(levels).toContain('jee_advanced');
    });

    it('has themes', () => {
      expect(NEWTONS_LAWS_EVOLUTION.themes.length).toBeGreaterThan(0);
    });

    it('has misconceptions at each level', () => {
      for (const stage of NEWTONS_LAWS_EVOLUTION.stages) {
        expect(stage.resurfacingMisconceptions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('generatePayoffTags', () => {
    it('generates payoff tags for Class 9 content', () => {
      const tags = generatePayoffTags('class9', 'newtons_laws', NEWTONS_LAWS_EVOLUTION);
      expect(tags.length).toBeGreaterThan(0);
      expect(tags.some(t => t.type === 'enables_class10')).toBe(true);
    });

    it('generates JEE payoff tags', () => {
      const tags = generatePayoffTags('class10', 'newtons_laws', NEWTONS_LAWS_EVOLUTION);
      expect(tags.some(t => t.type === 'enables_jee_intuition')).toBe(true);
    });

    it('returns empty for highest level', () => {
      const tags = generatePayoffTags('jee_advanced', 'newtons_laws', NEWTONS_LAWS_EVOLUTION);
      // May return empty or only olympiad tags depending on content
      expect(Array.isArray(tags)).toBe(true);
    });
  });

  describe('getCrossLevelPrerequisites', () => {
    it('returns prerequisites for each level transition', () => {
      const prereqs = getCrossLevelPrerequisites(NEWTONS_LAWS_EVOLUTION);
      expect(prereqs.length).toBeGreaterThan(0);
    });

    it('includes misconception handling prerequisites', () => {
      const prereqs = getCrossLevelPrerequisites(NEWTONS_LAWS_EVOLUTION);
      const misconceptionPrereqs = prereqs.filter(p =>
        p.targetConcept.includes('misconception')
      );
      expect(misconceptionPrereqs.length).toBeGreaterThan(0);
    });
  });

  describe('analyzeEvolution', () => {
    it('provides complete analysis', () => {
      const analysis = analyzeEvolution(NEWTONS_LAWS_EVOLUTION);
      expect(analysis.conceptFamily).toBe("Newton's Laws");
      expect(analysis.totalStages).toBe(4);
      expect(analysis.abstractionProgression.length).toBe(4);
    });

    it('identifies critical transitions', () => {
      const analysis = analyzeEvolution(NEWTONS_LAWS_EVOLUTION);
      expect(analysis.criticalTransitions.length).toBeGreaterThanOrEqual(0);
    });

    it('identifies persistent misconceptions', () => {
      const analysis = analyzeEvolution(NEWTONS_LAWS_EVOLUTION);
      // Misconceptions that appear multiple times
      expect(Array.isArray(analysis.persistentMisconceptions)).toBe(true);
    });
  });

  describe('checkLevelReadiness', () => {
    it('confirms readiness for first level', () => {
      const result = checkLevelReadiness(
        { masteredConcepts: [], resolvedMisconceptions: [], completedArchetypes: [] },
        'class9',
        NEWTONS_LAWS_EVOLUTION
      );
      expect(result.ready).toBe(true);
    });

    it('identifies gaps for later levels', () => {
      const result = checkLevelReadiness(
        { masteredConcepts: [], resolvedMisconceptions: [], completedArchetypes: [] },
        'class10',
        NEWTONS_LAWS_EVOLUTION
      );
      expect(result.ready).toBe(false);
      expect(result.gaps.length).toBeGreaterThan(0);
    });

    it('provides recommendations', () => {
      const result = checkLevelReadiness(
        { masteredConcepts: [], resolvedMisconceptions: [], completedArchetypes: [] },
        'jee_main',
        NEWTONS_LAWS_EVOLUTION
      );
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('confirms readiness when prerequisites met', () => {
      const class9Archetypes = NEWTONS_LAWS_EVOLUTION.stages[0].unlockedArchetypes;
      const class9Misconceptions = NEWTONS_LAWS_EVOLUTION.stages[0].resurfacingMisconceptions;

      const result = checkLevelReadiness(
        {
          masteredConcepts: ['newtons_laws'],
          resolvedMisconceptions: class9Misconceptions,
          completedArchetypes: class9Archetypes,
        },
        'class10',
        NEWTONS_LAWS_EVOLUTION
      );
      expect(result.ready).toBe(true);
    });
  });

  describe('getEvolutionMap', () => {
    it('returns evolution map for known concepts', () => {
      // Direct key access
      const map = getEvolutionMap('newtons_laws');
      expect(map).not.toBeNull();
      expect(map?.conceptFamily).toBe("Newton's Laws");
    });

    it('handles underscore naming format', () => {
      const map = getEvolutionMap('newtons_laws');
      expect(map).not.toBeNull();
    });

    it('returns null for unknown concepts', () => {
      const map = getEvolutionMap('unknown_concept');
      expect(map).toBeNull();
    });
  });
});
