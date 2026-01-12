import { describe, it, expect } from 'vitest';
import {
  createVersion,
  parseVersionString,
  versionToString,
  compareVersions,
  isNewerVersion,
  deprecateVersion,
  isDeprecated,
  getDeprecationAge,
  checkCompatibility,
  bumpVersion,
  suggestVersionBump,
  diffSocraticTrees,
  canMigrateProgress,
  getLatestVersion,
  buildVersionChain,
} from '../contentVersioning';
import type { ContentVersion, SocraticTree } from '@/types/atomicLearning';

describe('contentVersioning', () => {
  describe('createVersion', () => {
    it('creates a version with correct structure', () => {
      const version = createVersion(1, 2, 3, 'Test changelog', 'prev-id');
      expect(version.major).toBe(1);
      expect(version.minor).toBe(2);
      expect(version.patch).toBe(3);
      expect(version.changelog).toBe('Test changelog');
      expect(version.previousVersionId).toBe('prev-id');
      expect(version.createdAt).toBeDefined();
    });
  });

  describe('parseVersionString', () => {
    it('parses valid version strings', () => {
      const version = parseVersionString('1.2.3');
      expect(version).not.toBeNull();
      expect(version!.major).toBe(1);
      expect(version!.minor).toBe(2);
      expect(version!.patch).toBe(3);
    });

    it('returns null for invalid version strings', () => {
      expect(parseVersionString('1.2')).toBeNull();
      expect(parseVersionString('invalid')).toBeNull();
      expect(parseVersionString('1.2.3.4')).toBeNull();
    });
  });

  describe('versionToString', () => {
    it('converts version to string format', () => {
      const version = createVersion(1, 2, 3, 'test');
      expect(versionToString(version)).toBe('1.2.3');
    });
  });

  describe('compareVersions', () => {
    it('compares major versions correctly', () => {
      const v1 = createVersion(1, 0, 0, '');
      const v2 = createVersion(2, 0, 0, '');
      expect(compareVersions(v1, v2)).toBeLessThan(0);
      expect(compareVersions(v2, v1)).toBeGreaterThan(0);
    });

    it('compares minor versions correctly', () => {
      const v1 = createVersion(1, 1, 0, '');
      const v2 = createVersion(1, 2, 0, '');
      expect(compareVersions(v1, v2)).toBeLessThan(0);
    });

    it('compares patch versions correctly', () => {
      const v1 = createVersion(1, 1, 1, '');
      const v2 = createVersion(1, 1, 2, '');
      expect(compareVersions(v1, v2)).toBeLessThan(0);
    });

    it('returns 0 for equal versions', () => {
      const v1 = createVersion(1, 2, 3, '');
      const v2 = createVersion(1, 2, 3, '');
      expect(compareVersions(v1, v2)).toBe(0);
    });
  });

  describe('isNewerVersion', () => {
    it('correctly identifies newer versions', () => {
      const old = createVersion(1, 0, 0, '');
      const newer = createVersion(1, 1, 0, '');
      expect(isNewerVersion(newer, old)).toBe(true);
      expect(isNewerVersion(old, newer)).toBe(false);
    });
  });

  describe('deprecation', () => {
    it('deprecates a version', () => {
      const version = createVersion(1, 0, 0, '');
      const deprecated = deprecateVersion(version, 'Outdated', '2.0.0');
      expect(deprecated.deprecation?.deprecated).toBe(true);
      expect(deprecated.deprecation?.reason).toBe('Outdated');
      expect(deprecated.deprecation?.replacedBy).toBe('2.0.0');
    });

    it('checks if version is deprecated', () => {
      const version = createVersion(1, 0, 0, '');
      expect(isDeprecated(version)).toBe(false);
      const deprecated = deprecateVersion(version, 'test', '2.0.0');
      expect(isDeprecated(deprecated)).toBe(true);
    });

    it('calculates deprecation age', () => {
      const version = createVersion(1, 0, 0, '');
      expect(getDeprecationAge(version)).toBeNull();
      const deprecated = deprecateVersion(version, 'test', '2.0.0');
      expect(getDeprecationAge(deprecated)).toBe(0);
    });
  });

  describe('checkCompatibility', () => {
    it('returns breaking for major version change', () => {
      const old = createVersion(1, 0, 0, '');
      const newer = createVersion(2, 0, 0, '');
      expect(checkCompatibility(old, newer)).toBe('breaking');
    });

    it('returns partial for minor version change', () => {
      const old = createVersion(1, 0, 0, '');
      const newer = createVersion(1, 1, 0, '');
      expect(checkCompatibility(old, newer)).toBe('partial');
    });

    it('returns full for patch version change', () => {
      const old = createVersion(1, 0, 0, '');
      const newer = createVersion(1, 0, 1, '');
      expect(checkCompatibility(old, newer)).toBe('full');
    });
  });

  describe('bumpVersion', () => {
    it('bumps major version correctly', () => {
      const current = createVersion(1, 2, 3, '');
      const bumped = bumpVersion(current, 'major', 'Major change');
      expect(bumped.major).toBe(2);
      expect(bumped.minor).toBe(0);
      expect(bumped.patch).toBe(0);
    });

    it('bumps minor version correctly', () => {
      const current = createVersion(1, 2, 3, '');
      const bumped = bumpVersion(current, 'minor', 'Minor change');
      expect(bumped.major).toBe(1);
      expect(bumped.minor).toBe(3);
      expect(bumped.patch).toBe(0);
    });

    it('bumps patch version correctly', () => {
      const current = createVersion(1, 2, 3, '');
      const bumped = bumpVersion(current, 'patch', 'Patch change');
      expect(bumped.major).toBe(1);
      expect(bumped.minor).toBe(2);
      expect(bumped.patch).toBe(4);
    });
  });

  describe('diffSocraticTrees', () => {
    const baseTree: SocraticTree = {
      id: 'tree-1',
      version: createVersion(1, 0, 0, ''),
      conceptNode: 'test',
      targetProfile: 'high_confidence_wrong',
      rootNodeId: 'node-1',
      nodes: {
        'node-1': {
          id: 'node-1',
          type: 'entry_probe',
          question: 'Question 1',
          probeTarget: 'test',
          responsePatterns: [],
          fadingLevel: 'high',
        },
      },
      misconceptionBranches: [],
      fadingProgression: [],
      foundationClassification: {
        level: 'foundation1',
        focus: 'test',
        targetSkills: [],
        prerequisites: [],
      },
      ragMetadata: {
        contentType: 'socratic_prompt',
        embeddable: false,
        priority: 5,
        retrievalTags: [],
        exclusions: [],
        uncertainty: { confident: true },
      },
    };

    it('detects added nodes', () => {
      const newTree: SocraticTree = {
        ...baseTree,
        nodes: {
          ...baseTree.nodes,
          'node-2': {
            id: 'node-2',
            type: 'validation',
            question: 'Question 2',
            probeTarget: 'test',
            responsePatterns: [],
            fadingLevel: 'low',
          },
        },
      };
      const diff = diffSocraticTrees(baseTree, newTree);
      expect(diff.addedNodes).toContain('node-2');
      expect(diff.removedNodes).toHaveLength(0);
    });

    it('detects removed nodes', () => {
      const newTree: SocraticTree = {
        ...baseTree,
        nodes: {},
      };
      const diff = diffSocraticTrees(baseTree, newTree);
      expect(diff.removedNodes).toContain('node-1');
      expect(diff.branchingChanges).toBe(true);
    });

    it('detects modified questions', () => {
      const newTree: SocraticTree = {
        ...baseTree,
        nodes: {
          'node-1': {
            ...baseTree.nodes['node-1'],
            question: 'Modified question',
          },
        },
      };
      const diff = diffSocraticTrees(baseTree, newTree);
      expect(diff.modifiedQuestions).toContain('node-1');
    });
  });

  describe('suggestVersionBump', () => {
    it('suggests major for branching changes', () => {
      const diff = {
        addedNodes: [],
        removedNodes: ['node-1'],
        modifiedQuestions: [],
        modifiedPatterns: [],
        branchingChanges: true,
      };
      expect(suggestVersionBump(diff)).toBe('major');
    });

    it('suggests minor for added nodes', () => {
      const diff = {
        addedNodes: ['node-2'],
        removedNodes: [],
        modifiedQuestions: [],
        modifiedPatterns: [],
        branchingChanges: false,
      };
      expect(suggestVersionBump(diff)).toBe('minor');
    });

    it('suggests patch for question wording changes only', () => {
      const diff = {
        addedNodes: [],
        removedNodes: [],
        modifiedQuestions: ['node-1'],
        modifiedPatterns: [],
        branchingChanges: false,
      };
      expect(suggestVersionBump(diff)).toBe('patch');
    });
  });

  describe('canMigrateProgress', () => {
    it('returns true for non-breaking changes', () => {
      const old = createVersion(1, 0, 0, '');
      const newer = createVersion(1, 1, 0, '');
      expect(canMigrateProgress(old, newer)).toBe(true);
    });

    it('returns false for breaking changes', () => {
      const old = createVersion(1, 0, 0, '');
      const newer = createVersion(2, 0, 0, '');
      expect(canMigrateProgress(old, newer)).toBe(false);
    });
  });

  describe('getLatestVersion', () => {
    it('returns the latest version from array', () => {
      const versions = [
        createVersion(1, 0, 0, ''),
        createVersion(2, 0, 0, ''),
        createVersion(1, 5, 0, ''),
      ];
      const latest = getLatestVersion(versions);
      expect(latest?.major).toBe(2);
    });

    it('returns null for empty array', () => {
      expect(getLatestVersion([])).toBeNull();
    });
  });

  describe('buildVersionChain', () => {
    it('builds a version chain', () => {
      const v1 = createVersion(1, 0, 0, 'Initial');
      const v2 = createVersion(1, 1, 0, 'Minor update', '1.0.0');
      const versions = [v1, v2];
      const chain = buildVersionChain(versions);
      expect(chain).not.toBeNull();
      expect(chain!.version.major).toBe(1);
      expect(chain!.version.minor).toBe(0);
    });

    it('returns null for empty array', () => {
      expect(buildVersionChain([])).toBeNull();
    });
  });
});
