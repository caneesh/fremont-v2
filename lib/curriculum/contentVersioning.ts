/**
 * Content Versioning System for Socratic Physics Curriculum
 *
 * Principles:
 * - Content objects are immutable once published
 * - New improvements create new versions, not overwrites
 * - Student progress remains valid across versions
 */

import type {
  ContentVersion,
  VersionCompatibility,
  ContentPack,
  SocraticTree,
} from '@/types/atomicLearning';

// =============================================================================
// VERSION NUMBERING
// =============================================================================

/**
 * Version numbering rules:
 * - MAJOR (X.0.0): Conceptual restructuring that invalidates prior understanding
 * - MINOR (0.X.0): Pedagogical changes (question order, scaffolding depth)
 * - PATCH (0.0.X): Wording fixes, typo corrections
 */

export function createVersion(
  major: number,
  minor: number,
  patch: number,
  changelog: string,
  previousVersionId?: string
): ContentVersion {
  return {
    major,
    minor,
    patch,
    createdAt: new Date().toISOString(),
    changelog,
    previousVersionId,
  };
}

export function parseVersionString(version: string): ContentVersion | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return null;

  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    createdAt: new Date().toISOString(),
    changelog: '',
  };
}

export function versionToString(version: ContentVersion): string {
  return `${version.major}.${version.minor}.${version.patch}`;
}

export function compareVersions(a: ContentVersion, b: ContentVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

export function isNewerVersion(current: ContentVersion, other: ContentVersion): boolean {
  return compareVersions(current, other) > 0;
}

// =============================================================================
// DEPRECATION RULES
// =============================================================================

export interface DeprecationPolicy {
  /** Grace period in days before full deprecation */
  gracePeriodDays: number;
  /** Whether to auto-migrate student progress */
  autoMigrate: boolean;
  /** Notification strategy */
  notifyStrategy: 'immediate' | 'on_access' | 'batch';
}

const DEFAULT_DEPRECATION_POLICY: DeprecationPolicy = {
  gracePeriodDays: 30,
  autoMigrate: true,
  notifyStrategy: 'on_access',
};

export function deprecateVersion(
  version: ContentVersion,
  reason: string,
  replacedBy: string
): ContentVersion {
  return {
    ...version,
    deprecation: {
      deprecated: true,
      reason,
      replacedBy,
      deprecatedAt: new Date().toISOString(),
    },
  };
}

export function isDeprecated(version: ContentVersion): boolean {
  return version.deprecation?.deprecated ?? false;
}

export function getDeprecationAge(version: ContentVersion): number | null {
  if (!version.deprecation?.deprecatedAt) return null;
  const deprecatedAt = new Date(version.deprecation.deprecatedAt);
  const now = new Date();
  return Math.floor((now.getTime() - deprecatedAt.getTime()) / (1000 * 60 * 60 * 24));
}

// =============================================================================
// COMPATIBILITY GUARANTEES
// =============================================================================

export type CompatibilityLevel =
  | 'full'              // All progress valid
  | 'partial'           // Some progress needs review
  | 'breaking';         // Progress invalidated

export function checkCompatibility(
  oldVersion: ContentVersion,
  newVersion: ContentVersion
): CompatibilityLevel {
  // Major version change = breaking
  if (newVersion.major > oldVersion.major) {
    return 'breaking';
  }

  // Minor version change = partial (pedagogical changes)
  if (newVersion.minor > oldVersion.minor) {
    return 'partial';
  }

  // Patch only = full compatibility
  return 'full';
}

export function createCompatibilityRecord(
  fromVersion: ContentVersion,
  toVersion: ContentVersion,
  breakingChanges: string[]
): VersionCompatibility {
  return {
    progressValidFrom: versionToString(fromVersion),
    breakingChanges: breakingChanges.map((description) => ({
      fromVersion: versionToString(fromVersion),
      description,
    })),
  };
}

// =============================================================================
// SOCRATIC TREE EVOLUTION
// =============================================================================

/**
 * Rules for safely evolving Socratic Trees:
 * 1. Node IDs must be stable across versions
 * 2. Adding branches = minor version bump
 * 3. Removing/reordering branches = major version bump
 * 4. Question wording changes = patch version bump
 * 5. Response pattern changes = minor version bump
 */

export interface SocraticTreeDiff {
  addedNodes: string[];
  removedNodes: string[];
  modifiedQuestions: string[];
  modifiedPatterns: string[];
  branchingChanges: boolean;
}

export function diffSocraticTrees(
  oldTree: SocraticTree,
  newTree: SocraticTree
): SocraticTreeDiff {
  const oldNodeIds = new Set(Object.keys(oldTree.nodes));
  const newNodeIds = new Set(Object.keys(newTree.nodes));

  const addedNodes = [...newNodeIds].filter((id) => !oldNodeIds.has(id));
  const removedNodes = [...oldNodeIds].filter((id) => !newNodeIds.has(id));

  const commonNodes = [...oldNodeIds].filter((id) => newNodeIds.has(id));

  const modifiedQuestions: string[] = [];
  const modifiedPatterns: string[] = [];

  for (const nodeId of commonNodes) {
    const oldNode = oldTree.nodes[nodeId];
    const newNode = newTree.nodes[nodeId];

    if (oldNode.question !== newNode.question) {
      modifiedQuestions.push(nodeId);
    }

    const oldPatterns = JSON.stringify(oldNode.responsePatterns);
    const newPatterns = JSON.stringify(newNode.responsePatterns);
    if (oldPatterns !== newPatterns) {
      modifiedPatterns.push(nodeId);
    }
  }

  const branchingChanges = removedNodes.length > 0 ||
    oldTree.rootNodeId !== newTree.rootNodeId;

  return {
    addedNodes,
    removedNodes,
    modifiedQuestions,
    modifiedPatterns,
    branchingChanges,
  };
}

export function suggestVersionBump(diff: SocraticTreeDiff): 'major' | 'minor' | 'patch' {
  // Branching or removal = major
  if (diff.branchingChanges || diff.removedNodes.length > 0) {
    return 'major';
  }

  // New nodes or pattern changes = minor
  if (diff.addedNodes.length > 0 || diff.modifiedPatterns.length > 0) {
    return 'minor';
  }

  // Question wording only = patch
  if (diff.modifiedQuestions.length > 0) {
    return 'patch';
  }

  // No changes
  return 'patch';
}

export function bumpVersion(
  current: ContentVersion,
  bumpType: 'major' | 'minor' | 'patch',
  changelog: string
): ContentVersion {
  const previousVersionId = `${current.major}.${current.minor}.${current.patch}`;

  switch (bumpType) {
    case 'major':
      return createVersion(current.major + 1, 0, 0, changelog, previousVersionId);
    case 'minor':
      return createVersion(current.major, current.minor + 1, 0, changelog, previousVersionId);
    case 'patch':
      return createVersion(current.major, current.minor, current.patch + 1, changelog, previousVersionId);
  }
}

// =============================================================================
// PROGRESS MIGRATION
// =============================================================================

export interface ProgressMigrationResult {
  success: boolean;
  migratedItems: number;
  invalidatedItems: number;
  warnings: string[];
}

export function canMigrateProgress(
  fromVersion: ContentVersion,
  toVersion: ContentVersion
): boolean {
  const compatibility = checkCompatibility(fromVersion, toVersion);
  return compatibility !== 'breaking';
}

export function getProgressMigrationWarnings(
  fromVersion: ContentVersion,
  toVersion: ContentVersion,
  diff?: SocraticTreeDiff
): string[] {
  const warnings: string[] = [];

  const compatibility = checkCompatibility(fromVersion, toVersion);

  if (compatibility === 'breaking') {
    warnings.push('Major version change: student progress will be reset');
  }

  if (compatibility === 'partial') {
    warnings.push('Minor version change: some progress may need review');
  }

  if (diff) {
    if (diff.removedNodes.length > 0) {
      warnings.push(`${diff.removedNodes.length} nodes removed: progress on these nodes will be lost`);
    }
    if (diff.modifiedPatterns.length > 0) {
      warnings.push(`${diff.modifiedPatterns.length} response patterns changed: some answers may be re-evaluated`);
    }
  }

  return warnings;
}

// =============================================================================
// VERSION CHAIN
// =============================================================================

export interface VersionChainNode {
  version: ContentVersion;
  contentId: string;
  children: VersionChainNode[];
}

export function buildVersionChain(versions: ContentVersion[]): VersionChainNode | null {
  if (versions.length === 0) return null;

  // Sort by version number
  const sorted = [...versions].sort(compareVersions);

  // Build chain starting from oldest
  const root: VersionChainNode = {
    version: sorted[0],
    contentId: versionToString(sorted[0]),
    children: [],
  };

  const nodeMap = new Map<string, VersionChainNode>();
  nodeMap.set(versionToString(sorted[0]), root);

  for (let i = 1; i < sorted.length; i++) {
    const version = sorted[i];
    const node: VersionChainNode = {
      version,
      contentId: versionToString(version),
      children: [],
    };

    if (version.previousVersionId) {
      const parent = nodeMap.get(version.previousVersionId);
      if (parent) {
        parent.children.push(node);
      }
    }

    nodeMap.set(versionToString(version), node);
  }

  return root;
}

export function getLatestVersion(versions: ContentVersion[]): ContentVersion | null {
  if (versions.length === 0) return null;

  return versions.reduce((latest, current) =>
    isNewerVersion(current, latest) ? current : latest
  );
}

export function getLatestNonDeprecatedVersion(versions: ContentVersion[]): ContentVersion | null {
  const nonDeprecated = versions.filter((v) => !isDeprecated(v));
  return getLatestVersion(nonDeprecated);
}
