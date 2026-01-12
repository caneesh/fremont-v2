import { describe, it, expect } from 'vitest';
import {
  auditConceptCard,
  auditSocraticTree,
  generateQualityChecklist,
} from '../curriculumAudit';
import { createVersion } from '../contentVersioning';
import { createDifficultyScores } from '../difficultyTaxonomy';
import { createRAGMetadata } from '../ragIngestion';
import type {
  ConceptCard,
  SocraticTree,
  ContentPack,
  MisconceptionCard,
  ProblemArchetype,
  MasteryCheckSet,
} from '@/types/atomicLearning';

describe('curriculumAudit', () => {
  const mockVersion = createVersion(1, 0, 0, 'test');
  const mockDifficulty = createDifficultyScores(
    { level: 'developing', rationale: '' },
    { level: 'developing', rationale: '' },
    { level: 'novice', rationale: '' },
    { level: 'developing', rationale: '' },
    { level: 'developing', rationale: '' }
  );
  const mockRagMetadata = createRAGMetadata('authoritative_fact', ['test']);
  const mockFoundationClassification = {
    level: 'foundation1' as const,
    focus: 'test',
    targetSkills: [],
    prerequisites: [],
  };

  describe('auditConceptCard', () => {
    it('passes valid concept card', () => {
      const card: ConceptCard = {
        id: 'cc-1',
        version: mockVersion,
        conceptNode: 'test',
        grade: 'class9',
        module: 'test',
        targetInsight: 'Test insight',
        mentalModel: {
          description: 'A valid description without explanatory patterns',
          anchors: ['anchor1'],
          analogies: ['Like something simple'],
        },
        prerequisites: [],
        relatedNodes: [],
        foundationClassification: mockFoundationClassification,
        ragMetadata: mockRagMetadata,
        difficulty: mockDifficulty,
        payoffTags: [],
      };

      const risks = auditConceptCard(card);
      expect(risks.filter(r => r.severity === 'high')).toHaveLength(0);
    });

    it('flags explanation-over-inquiry', () => {
      const card: ConceptCard = {
        id: 'cc-1',
        version: mockVersion,
        conceptNode: 'test',
        grade: 'class9',
        module: 'test',
        targetInsight: 'Test insight',
        mentalModel: {
          description: 'The answer is that force causes motion',
          anchors: [],
          analogies: [],
        },
        prerequisites: [],
        relatedNodes: [],
        foundationClassification: mockFoundationClassification,
        ragMetadata: mockRagMetadata,
        difficulty: mockDifficulty,
        payoffTags: [],
      };

      const risks = auditConceptCard(card);
      expect(risks.some(r => r.type === 'explanation_over_inquiry')).toBe(true);
    });

    it('flags formula leakage in analogies', () => {
      const card: ConceptCard = {
        id: 'cc-1',
        version: mockVersion,
        conceptNode: 'test',
        grade: 'class9',
        module: 'test',
        targetInsight: 'Test insight',
        mentalModel: {
          description: 'Valid description',
          anchors: [],
          analogies: ['F = ma is like'],
        },
        prerequisites: [],
        relatedNodes: [],
        foundationClassification: mockFoundationClassification,
        ragMetadata: mockRagMetadata,
        difficulty: mockDifficulty,
        payoffTags: [],
      };

      const risks = auditConceptCard(card);
      expect(risks.some(r => r.type === 'formula_leakage')).toBe(true);
    });
  });

  describe('auditSocraticTree', () => {
    const validTree: SocraticTree = {
      id: 'st-1',
      version: mockVersion,
      conceptNode: 'test',
      targetProfile: 'high_confidence_wrong',
      rootNodeId: 'node-1',
      nodes: {
        'node-1': {
          id: 'node-1',
          type: 'entry_probe',
          question: 'What happens when...?',
          probeTarget: 'test',
          responsePatterns: [],
          fadingLevel: 'high',
        },
        'node-2': {
          id: 'node-2',
          type: 'validation',
          question: 'Can you explain why?',
          probeTarget: 'test',
          responsePatterns: [],
          fadingLevel: 'low',
        },
      },
      misconceptionBranches: [],
      fadingProgression: [
        { phase: 1, fadingLevel: 'high', nodeIds: ['node-1'] },
        { phase: 2, fadingLevel: 'low', nodeIds: ['node-2'] },
      ],
      foundationClassification: mockFoundationClassification,
      ragMetadata: createRAGMetadata('socratic_prompt', []),
    };

    it('passes valid Socratic tree', () => {
      const risks = auditSocraticTree(validTree);
      const highRisks = risks.filter(r => r.severity === 'high');
      expect(highRisks).toHaveLength(0);
    });

    it('flags hint dependency without fading', () => {
      const noFadingTree: SocraticTree = {
        ...validTree,
        fadingProgression: [],
      };
      const risks = auditSocraticTree(noFadingTree);
      expect(risks.some(r => r.type === 'hint_dependency')).toBe(true);
    });

    it('flags all-high fading progression', () => {
      const allHighTree: SocraticTree = {
        ...validTree,
        fadingProgression: [
          { phase: 1, fadingLevel: 'high', nodeIds: ['node-1'] },
          { phase: 2, fadingLevel: 'high', nodeIds: ['node-2'] },
        ],
      };
      const risks = auditSocraticTree(allHighTree);
      expect(risks.some(r => r.type === 'hint_dependency')).toBe(true);
    });

    it('flags explanation in Socratic node', () => {
      const explanationTree: SocraticTree = {
        ...validTree,
        nodes: {
          ...validTree.nodes,
          'node-3': {
            id: 'node-3',
            type: 'entry_probe',
            question: 'The answer is that the force is greater',
            probeTarget: 'test',
            responsePatterns: [],
            fadingLevel: 'high',
          },
        },
      };
      const risks = auditSocraticTree(explanationTree);
      expect(risks.some(r => r.type === 'explanation_over_inquiry')).toBe(true);
    });
  });

  describe('generateQualityChecklist', () => {
    const mockMisconceptionCard: MisconceptionCard = {
      id: 'mc-1',
      version: mockVersion,
      conceptNode: 'test',
      misconception: 'Test misconception',
      origin: 'Test origin',
      correctUnderstanding: 'Valid understanding without formulas',
      triggerSituations: [],
      exposureQuestions: ['What if...?'],
      refutationStrategy: {
        probe: 'What happens?',
        conflict: 'But what about?',
        reconstruction: 'How would you?',
      },
      commonTraps: [],
      severity: 'medium',
      foundationClassification: mockFoundationClassification,
      ragMetadata: mockRagMetadata,
    };

    const mockArchetype: ProblemArchetype = {
      id: 'pa-1',
      version: mockVersion,
      conceptNode: 'test',
      surfaceFeatures: {
        context: 'Test context',
        givenItems: [],
        askedItems: [],
      },
      deepStructure: {
        coreInsight: 'Test insight',
        requiredPatterns: [],
        metaSkillsTested: [],
      },
      triggerCues: [],
      stepStrategy: [
        { step: 1, reasoning: 'Test reasoning', insight: 'Test insight' },
      ],
      commonTraps: [],
      transferVariant: {
        description: 'Test variant',
        surfaceChange: 'Changed surface',
        deepStructurePreserved: 'Same structure',
      },
      foundationClassification: mockFoundationClassification,
      difficulty: mockDifficulty,
      ragMetadata: mockRagMetadata,
    };

    const mockSocraticTree: SocraticTree = {
      id: 'st-1',
      version: mockVersion,
      conceptNode: 'test',
      targetProfile: 'high_confidence_wrong',
      rootNodeId: 'node-1',
      nodes: {
        'node-1': {
          id: 'node-1',
          type: 'entry_probe',
          question: 'What if?',
          probeTarget: 'test',
          responsePatterns: [],
          fadingLevel: 'high',
        },
      },
      misconceptionBranches: [],
      fadingProgression: [
        { phase: 1, fadingLevel: 'high', nodeIds: [] },
        { phase: 2, fadingLevel: 'low', nodeIds: [] },
      ],
      foundationClassification: mockFoundationClassification,
      ragMetadata: createRAGMetadata('socratic_prompt', []),
    };

    const mockMasteryCheck = {
      id: 'mk-1',
      version: mockVersion,
      conceptNode: 'test',
      type: 'conceptual' as const,
      prompt: 'Explain concept',
      correctReasoning: { keyElements: [], indicators: [] },
      incorrectReasoning: { patterns: [], indicatedMisconceptions: [] },
      foundationClassification: mockFoundationClassification,
      difficulty: mockDifficulty,
      ragMetadata: mockRagMetadata,
    };

    const mockMasteryCheckSet: MasteryCheckSet = {
      id: 'mks-1',
      version: mockVersion,
      conceptNode: 'test',
      checks: {
        conceptual: mockMasteryCheck,
        qualitative: { ...mockMasteryCheck, id: 'mk-2', type: 'qualitative' },
        transfer: { ...mockMasteryCheck, id: 'mk-3', type: 'transfer' },
      },
      passingCriteria: {
        minimumCorrect: 2,
        requiredTypes: ['conceptual'],
      },
    };

    const mockContentPack: ContentPack = {
      id: 'pack-1',
      version: mockVersion,
      conceptNode: 'test',
      grade: 'class9',
      module: 'test',
      targetInsight: 'A sufficiently long target insight for testing',
      conceptCard: {
        id: 'cc-1',
        version: mockVersion,
        conceptNode: 'test',
        grade: 'class9',
        module: 'test',
        targetInsight: 'Test insight',
        mentalModel: {
          description: 'Valid description',
          anchors: [],
          analogies: [],
        },
        prerequisites: [],
        relatedNodes: [],
        foundationClassification: mockFoundationClassification,
        ragMetadata: mockRagMetadata,
        difficulty: mockDifficulty,
        payoffTags: [],
      },
      misconceptionCards: [mockMisconceptionCard, { ...mockMisconceptionCard, id: 'mc-2' }],
      problemArchetypes: [mockArchetype],
      socraticTrees: [mockSocraticTree],
      masteryCheckSet: mockMasteryCheckSet,
      qualityFlags: {
        reviewed: false,
        approvalStatus: 'pending',
      },
    };

    it('generates comprehensive checklist', () => {
      const checklist = generateQualityChecklist(mockContentPack);
      expect(checklist.length).toBeGreaterThan(0);
    });

    it('includes pedagogy checks', () => {
      const checklist = generateQualityChecklist(mockContentPack);
      const pedagogyChecks = checklist.filter(c => c.category === 'Pedagogy');
      expect(pedagogyChecks.length).toBeGreaterThan(0);
    });

    it('includes content checks', () => {
      const checklist = generateQualityChecklist(mockContentPack);
      const contentChecks = checklist.filter(c => c.category === 'Content');
      expect(contentChecks.length).toBeGreaterThan(0);
    });

    it('includes structure checks', () => {
      const checklist = generateQualityChecklist(mockContentPack);
      const structureChecks = checklist.filter(c => c.category === 'Structure');
      expect(structureChecks.length).toBeGreaterThan(0);
    });

    it('checks for transfer variants', () => {
      const checklist = generateQualityChecklist(mockContentPack);
      const transferCheck = checklist.find(c => c.check.includes('Transfer'));
      expect(transferCheck).toBeDefined();
      expect(transferCheck?.passed).toBe(true);
    });

    it('checks for minimum misconception cards', () => {
      const checklist = generateQualityChecklist(mockContentPack);
      const mcCheck = checklist.find(c => c.check.includes('misconception'));
      expect(mcCheck).toBeDefined();
      expect(mcCheck?.passed).toBe(true);
    });
  });
});
