/**
 * Concept Evolution Map for Physics Curriculum
 *
 * Maps how concepts evolve across grade levels:
 * - Class 9
 * - Class 10
 * - JEE Main
 * - JEE Advanced
 */

import type {
  ConceptEvolutionMap,
  ConceptEvolutionStage,
  PayoffTag,
  PayoffType,
} from '@/types/atomicLearning';

// =============================================================================
// GRADE LEVELS
// =============================================================================

export type GradeLevel = 'class9' | 'class10' | 'jee_main' | 'jee_advanced';

export const GRADE_ORDER: GradeLevel[] = ['class9', 'class10', 'jee_main', 'jee_advanced'];

export function getGradeIndex(level: GradeLevel): number {
  return GRADE_ORDER.indexOf(level);
}

export function getNextGrade(level: GradeLevel): GradeLevel | null {
  const index = getGradeIndex(level);
  if (index < GRADE_ORDER.length - 1) {
    return GRADE_ORDER[index + 1];
  }
  return null;
}

// =============================================================================
// EVOLUTION STAGE CREATION
// =============================================================================

export function createEvolutionStage(
  level: GradeLevel,
  newAbstraction: string,
  relaxedAssumptions: string[],
  unlockedArchetypes: string[],
  resurfacingMisconceptions: string[],
  thinkingShift: string
): ConceptEvolutionStage {
  return {
    level,
    newAbstraction,
    relaxedAssumptions,
    unlockedArchetypes,
    resurfacingMisconceptions,
    thinkingShift,
  };
}

export function createEvolutionMap(
  id: string,
  conceptFamily: string,
  stages: ConceptEvolutionStage[],
  themes: string[]
): ConceptEvolutionMap {
  return {
    id,
    conceptFamily,
    stages,
    themes,
  };
}

// =============================================================================
// NEWTON'S LAWS EVOLUTION MAP
// =============================================================================

export const NEWTONS_LAWS_EVOLUTION: ConceptEvolutionMap = {
  id: 'evolution-newtons-laws',
  conceptFamily: "Newton's Laws",
  stages: [
    {
      level: 'class9',
      newAbstraction: 'Force as cause of change in motion; action-reaction as interaction',
      relaxedAssumptions: [],
      unlockedArchetypes: [
        'Two-body horizontal push',
        'Object on surface (normal force)',
        'Simple friction problems',
      ],
      resurfacingMisconceptions: [
        'Force needed to maintain motion',
        'Heavier objects fall faster',
        'Action-reaction forces cancel',
      ],
      thinkingShift: 'From motion requires force → force changes motion',
    },
    {
      level: 'class10',
      newAbstraction: 'Inertial frames; friction as velocity-dependent in some cases',
      relaxedAssumptions: [
        'Simple friction model (static vs kinetic only)',
      ],
      unlockedArchetypes: [
        'Circular motion (qualitative)',
        'Connected bodies',
        'Inclined plane with friction',
      ],
      resurfacingMisconceptions: [
        'Centrifugal force is real',
        'Objects stop when force is removed',
        'Friction always opposes motion',
      ],
      thinkingShift: 'From absolute motion → relative motion matters',
    },
    {
      level: 'jee_main',
      newAbstraction: 'Constraint equations; pseudo-forces in accelerating frames',
      relaxedAssumptions: [
        'Only inertial frames',
        'Simple connected body systems',
      ],
      unlockedArchetypes: [
        'Wedge problems with constraint',
        'Pulley systems',
        'Non-inertial frame analysis',
        'Banking of roads',
      ],
      resurfacingMisconceptions: [
        'Constraint force is externally applied',
        'Pseudo-force is a real force',
        'Tension is same throughout bent rope',
      ],
      thinkingShift: 'From single-body analysis → system-level constraint thinking',
    },
    {
      level: 'jee_advanced',
      newAbstraction: 'Variable mass systems; rotating frames with Coriolis',
      relaxedAssumptions: [
        'Constant mass',
        'Simple non-inertial effects',
      ],
      unlockedArchetypes: [
        'Rocket propulsion',
        'Chain sliding off table',
        'Rotating platform problems',
        'Coriolis effect in geophysics',
      ],
      resurfacingMisconceptions: [
        'Momentum is just mv (forgetting dm/dt)',
        'Coriolis is a real deflecting force',
        'Centrifugal and centripetal are action-reaction',
      ],
      thinkingShift: 'From rigid body → deformable/variable mass systems',
    },
  ],
  themes: [
    'Progressively relaxing idealizations',
    'From intuitive to formal reasoning',
    'From single body to system perspective',
    'From inertial to general frames',
  ],
};

// =============================================================================
// PAYOFF TAG GENERATION
// =============================================================================

export function generatePayoffTags(
  currentLevel: GradeLevel,
  conceptNode: string,
  evolutionMap: ConceptEvolutionMap
): PayoffTag[] {
  const tags: PayoffTag[] = [];
  const currentIndex = getGradeIndex(currentLevel);

  // Look at each future stage
  for (let i = currentIndex + 1; i < evolutionMap.stages.length; i++) {
    const futureStage = evolutionMap.stages[i];

    // Determine payoff type
    let payoffType: PayoffType;
    if (futureStage.level === 'class10') {
      payoffType = 'enables_class10';
    } else if (futureStage.level === 'jee_main' || futureStage.level === 'jee_advanced') {
      payoffType = 'enables_jee_intuition';
    } else {
      continue;
    }

    // Check if current concept enables future archetypes
    const enabledArchetypes = futureStage.unlockedArchetypes.filter((archetype) =>
      // This is a simplified check; in practice, you'd have explicit prerequisite mapping
      archetype.toLowerCase().includes(conceptNode.toLowerCase().split('_')[0])
    );

    if (enabledArchetypes.length > 0 || futureStage.thinkingShift) {
      tags.push({
        type: payoffType,
        specificPayoff: `Enables ${futureStage.thinkingShift || 'advanced problem types'}`,
        prerequisiteFor: enabledArchetypes,
      });
    }
  }

  // Check for Olympiad reasoning (advanced transfer)
  const currentStage = evolutionMap.stages[currentIndex];
  if (currentStage.thinkingShift.includes('system') || currentStage.thinkingShift.includes('abstract')) {
    tags.push({
      type: 'enables_olympiad_reasoning',
      specificPayoff: 'Develops systematic problem decomposition for novel scenarios',
      prerequisiteFor: ['open_ended_analysis'],
    });
  }

  return tags;
}

// =============================================================================
// CONCEPT PREREQUISITES ACROSS LEVELS
// =============================================================================

export interface CrossLevelPrerequisite {
  targetLevel: GradeLevel;
  targetConcept: string;
  requiredFromLevel: GradeLevel;
  requiredConcepts: string[];
  rationale: string;
}

export function getCrossLevelPrerequisites(
  evolutionMap: ConceptEvolutionMap
): CrossLevelPrerequisite[] {
  const prerequisites: CrossLevelPrerequisite[] = [];

  // For each stage after the first
  for (let i = 1; i < evolutionMap.stages.length; i++) {
    const current = evolutionMap.stages[i];
    const previous = evolutionMap.stages[i - 1];

    // Each new archetype requires understanding from previous level
    for (const archetype of current.unlockedArchetypes) {
      prerequisites.push({
        targetLevel: current.level,
        targetConcept: archetype,
        requiredFromLevel: previous.level,
        requiredConcepts: previous.unlockedArchetypes.slice(0, 2), // First two as foundation
        rationale: `${archetype} builds on ${previous.level} understanding`,
      });
    }

    // Resurfacing misconceptions need explicit handling
    for (const misconception of current.resurfacingMisconceptions) {
      prerequisites.push({
        targetLevel: current.level,
        targetConcept: `misconception_handling_${misconception.replace(/\s+/g, '_').toLowerCase()}`,
        requiredFromLevel: previous.level,
        requiredConcepts: [`corrected_${misconception.replace(/\s+/g, '_').toLowerCase()}`],
        rationale: `Misconception "${misconception}" resurfaces at ${current.level}`,
      });
    }
  }

  return prerequisites;
}

// =============================================================================
// EVOLUTION ANALYSIS
// =============================================================================

export interface EvolutionAnalysis {
  conceptFamily: string;
  totalStages: number;
  abstractionProgression: string[];
  criticalTransitions: { from: GradeLevel; to: GradeLevel; shift: string }[];
  persistentMisconceptions: string[];
}

export function analyzeEvolution(map: ConceptEvolutionMap): EvolutionAnalysis {
  // Track abstraction progression
  const abstractionProgression = map.stages.map((s) => s.newAbstraction);

  // Identify critical transitions (where thinking shift is most significant)
  const criticalTransitions: EvolutionAnalysis['criticalTransitions'] = [];
  for (let i = 0; i < map.stages.length - 1; i++) {
    const from = map.stages[i];
    const to = map.stages[i + 1];
    if (to.thinkingShift.length > 30) {
      // Heuristic for significant shift
      criticalTransitions.push({
        from: from.level,
        to: to.level,
        shift: to.thinkingShift,
      });
    }
  }

  // Find misconceptions that appear multiple times
  const allMisconceptions = map.stages.flatMap((s) => s.resurfacingMisconceptions);
  const misconceptionCounts = new Map<string, number>();
  for (const m of allMisconceptions) {
    const normalized = m.toLowerCase();
    misconceptionCounts.set(normalized, (misconceptionCounts.get(normalized) || 0) + 1);
  }
  const persistentMisconceptions = Array.from(misconceptionCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([misconception]) => misconception);

  return {
    conceptFamily: map.conceptFamily,
    totalStages: map.stages.length,
    abstractionProgression,
    criticalTransitions,
    persistentMisconceptions,
  };
}

// =============================================================================
// READINESS CHECK
// =============================================================================

export function checkLevelReadiness(
  studentProgress: {
    masteredConcepts: string[];
    resolvedMisconceptions: string[];
    completedArchetypes: string[];
  },
  targetLevel: GradeLevel,
  evolutionMap: ConceptEvolutionMap
): { ready: boolean; gaps: string[]; recommendations: string[] } {
  const targetIndex = getGradeIndex(targetLevel);
  const gaps: string[] = [];
  const recommendations: string[] = [];

  if (targetIndex === 0) {
    // First level, no prerequisites
    return { ready: true, gaps: [], recommendations: [] };
  }

  // Check all previous levels
  for (let i = 0; i < targetIndex; i++) {
    const stage = evolutionMap.stages[i];

    // Check archetypes
    const uncompletedArchetypes = stage.unlockedArchetypes.filter(
      (a) => !studentProgress.completedArchetypes.includes(a)
    );
    if (uncompletedArchetypes.length > 0) {
      gaps.push(`Missing ${stage.level} archetypes: ${uncompletedArchetypes.join(', ')}`);
      recommendations.push(`Complete practice problems for: ${uncompletedArchetypes[0]}`);
    }

    // Check misconceptions
    const unresolvedMisconceptions = stage.resurfacingMisconceptions.filter(
      (m) => !studentProgress.resolvedMisconceptions.includes(m)
    );
    if (unresolvedMisconceptions.length > 0) {
      gaps.push(`Unresolved misconceptions: ${unresolvedMisconceptions.join(', ')}`);
      recommendations.push(`Review misconception: ${unresolvedMisconceptions[0]}`);
    }
  }

  return {
    ready: gaps.length === 0,
    gaps,
    recommendations,
  };
}

// =============================================================================
// EXPORT ALL EVOLUTION MAPS
// =============================================================================

export const EVOLUTION_MAPS: Record<string, ConceptEvolutionMap> = {
  newtons_laws: NEWTONS_LAWS_EVOLUTION,
};

export function getEvolutionMap(conceptFamily: string): ConceptEvolutionMap | null {
  const key = conceptFamily.toLowerCase().replace(/['\s]+/g, '_');
  return EVOLUTION_MAPS[key] || null;
}
