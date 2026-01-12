/**
 * Atomic Learning Objects for Socratic-style Physics Curriculum
 *
 * Based on the curriculum design principles:
 * - Never give final answers upfront
 * - Prioritize mental models over formulas
 * - Every concept includes misconceptions and error-driven learning
 * - Every problem supports Socratic questioning and fading
 * - Content bridges school physics → JEE-style thinking without calculus
 */

// =============================================================================
// FOUNDATION LEVEL CLASSIFICATION
// =============================================================================

export type FoundationLevel = 'foundation1' | 'foundation2';

export interface FoundationClassification {
  level: FoundationLevel;
  /** Foundation 1: intuition and FBD separation */
  /** Foundation 2: non-obvious interaction scenarios */
  focus: string;
  /** Skills this content develops */
  targetSkills: string[];
  /** Prerequisites from prior level */
  prerequisites: string[];
}

// =============================================================================
// CONCEPT CARD (CC)
// =============================================================================

export interface ConceptCard {
  id: string;
  version: ContentVersion;
  conceptNode: string;
  grade: 'class9' | 'class10' | 'jee_main' | 'jee_advanced';
  module: string;

  /** Core insight the student must achieve */
  targetInsight: string;

  /** Mental model (not formula-first) */
  mentalModel: {
    description: string;
    /** Visual/diagrammatic anchors */
    anchors: string[];
    /** Everyday analogies (marked as non-authoritative) */
    analogies: string[];
  };

  /** Prerequisite concept nodes */
  prerequisites: string[];

  /** Links to related content */
  relatedNodes: string[];

  /** Foundation level classification */
  foundationClassification: FoundationClassification;

  /** RAG metadata */
  ragMetadata: RAGMetadata;

  /** Difficulty scores */
  difficulty: DifficultyScores;

  /** Future payoff tags */
  payoffTags: PayoffTag[];
}

// =============================================================================
// MISCONCEPTION CARD (MC)
// =============================================================================

export interface MisconceptionCard {
  id: string;
  version: ContentVersion;
  conceptNode: string;

  /** The misconception statement */
  misconception: string;

  /** Why students believe this */
  origin: string;

  /** The correct understanding */
  correctUnderstanding: string;

  /** Trigger situations where this misconception surfaces */
  triggerSituations: string[];

  /** Socratic questions to expose the misconception */
  exposureQuestions: string[];

  /** Refutation strategy (questions only, no answers) */
  refutationStrategy: {
    /** Initial probe to detect the misconception */
    probe: string;
    /** Follow-up to create cognitive conflict */
    conflict: string;
    /** Reconstruction prompt */
    reconstruction: string;
  };

  /** Common traps this misconception creates */
  commonTraps: string[];

  /** Severity: how much this blocks progress */
  severity: 'low' | 'medium' | 'high' | 'critical';

  /** Foundation level classification */
  foundationClassification: FoundationClassification;

  /** RAG metadata */
  ragMetadata: RAGMetadata;
}

// =============================================================================
// PROBLEM ARCHETYPE (PA)
// =============================================================================

export interface ProblemArchetype {
  id: string;
  version: ContentVersion;
  conceptNode: string;

  /** Surface appearance of the problem */
  surfaceFeatures: {
    context: string;
    givenItems: string[];
    askedItems: string[];
    diagramType?: string;
  };

  /** Deep structure (the insight being tested) */
  deepStructure: {
    coreInsight: string;
    requiredPatterns: string[];
    metaSkillsTested: string[];
  };

  /** What makes students recognize this archetype */
  triggerCues: string[];

  /** Strategy (no formulas, reasoning steps only) */
  stepStrategy: {
    step: number;
    reasoning: string;
    /** What the student should realize */
    insight: string;
  }[];

  /** Common errors students make */
  commonTraps: {
    trapId: string;
    description: string;
    /** Why students fall into this trap */
    cause: string;
    /** Socratic question to prevent/recover */
    recovery: string;
  }[];

  /** Variant for transfer testing */
  transferVariant: {
    description: string;
    surfaceChange: string;
    deepStructurePreserved: string;
  };

  /** Foundation level classification */
  foundationClassification: FoundationClassification;

  /** Difficulty scores */
  difficulty: DifficultyScores;

  /** RAG metadata */
  ragMetadata: RAGMetadata;
}

// =============================================================================
// SOCRATIC TREE (ST)
// =============================================================================

export type SocraticNodeType =
  | 'entry_probe'
  | 'error_detection'
  | 'refutation'
  | 'reconstruction'
  | 'validation'
  | 'misconception_branch'
  | 'fading_scaffold';

export type FadingLevel = 'high' | 'medium' | 'low';

export interface SocraticNode {
  id: string;
  type: SocraticNodeType;

  /** The question (never an answer) */
  question: string;

  /** What this node is probing for */
  probeTarget: string;

  /** Expected response patterns (for branching) */
  responsePatterns: {
    pattern: string;
    interpretation: 'correct' | 'partial' | 'misconception' | 'no_response';
    nextNodeId: string;
  }[];

  /** Fading level (how much support) */
  fadingLevel: FadingLevel;

  /** UI hints for canvas rendering */
  canvasMetadata?: SocraticCanvasMetadata;
}

export interface SocraticTree {
  id: string;
  version: ContentVersion;
  conceptNode: string;

  /** What understanding level this tree targets */
  targetProfile: 'high_confidence_wrong' | 'partial_understanding' | 'complete_novice';

  /** Root node */
  rootNodeId: string;

  /** All nodes */
  nodes: Record<string, SocraticNode>;

  /** Misconception side-branches */
  misconceptionBranches: {
    triggeredBy: string;
    branchRootId: string;
    targetMisconception: string;
  }[];

  /** Fading progression (high → medium → low) */
  fadingProgression: {
    phase: number;
    fadingLevel: FadingLevel;
    nodeIds: string[];
  }[];

  /** Foundation level classification */
  foundationClassification: FoundationClassification;

  /** RAG metadata */
  ragMetadata: RAGMetadata;
}

// =============================================================================
// MASTERY CHECK (MK)
// =============================================================================

export type MasteryCheckType =
  | 'conceptual'      // Pure concept understanding
  | 'qualitative'     // Qualitative reasoning
  | 'transfer';       // New context application

export interface MasteryCheck {
  id: string;
  version: ContentVersion;
  conceptNode: string;
  type: MasteryCheckType;

  /** The check prompt (no numerical answers) */
  prompt: string;

  /** What correct reasoning looks like */
  correctReasoning: {
    keyElements: string[];
    /** How to recognize correct understanding */
    indicators: string[];
  };

  /** What incorrect reasoning usually looks like */
  incorrectReasoning: {
    patterns: string[];
    /** What misconception each pattern indicates */
    indicatedMisconceptions: string[];
  };

  /** Foundation level classification */
  foundationClassification: FoundationClassification;

  /** Difficulty scores */
  difficulty: DifficultyScores;

  /** RAG metadata */
  ragMetadata: RAGMetadata;
}

export interface MasteryCheckSet {
  id: string;
  version: ContentVersion;
  conceptNode: string;

  /** One of each type */
  checks: {
    conceptual: MasteryCheck;
    qualitative: MasteryCheck;
    transfer: MasteryCheck;
  };

  /** Passing criteria */
  passingCriteria: {
    minimumCorrect: number;
    requiredTypes: MasteryCheckType[];
  };
}

// =============================================================================
// CONTENT VERSIONING
// =============================================================================

export interface ContentVersion {
  major: number;  // Conceptual restructuring
  minor: number;  // Pedagogical changes (question order, scaffolding)
  patch: number;  // Minor edits (wording)

  /** ISO timestamp */
  createdAt: string;

  /** What changed */
  changelog: string;

  /** Previous version ID (for chain) */
  previousVersionId?: string;

  /** Deprecation info */
  deprecation?: {
    deprecated: boolean;
    reason?: string;
    replacedBy?: string;
    deprecatedAt?: string;
  };
}

export interface VersionCompatibility {
  /** Minimum version that student progress is valid from */
  progressValidFrom: string;

  /** Breaking changes that invalidate progress */
  breakingChanges: {
    fromVersion: string;
    description: string;
    migrationPath?: string;
  }[];
}

// =============================================================================
// MULTI-DIMENSIONAL DIFFICULTY
// =============================================================================

export type DifficultyLevel =
  | 'novice'           // First exposure
  | 'developing'       // Building understanding
  | 'proficient'       // Solid grasp
  | 'advanced'         // Deep understanding
  | 'expert';          // Transfer mastery

export interface DifficultyScores {
  /** Number of concepts involved */
  conceptualLoad: {
    level: DifficultyLevel;
    score: number;  // 1-5
    rationale: string;
  };

  /** Depth of logical chain required */
  reasoningDepth: {
    level: DifficultyLevel;
    score: number;
    rationale: string;
  };

  /** How far from learned context */
  transferDistance: {
    level: DifficultyLevel;
    score: number;
    rationale: string;
  };

  /** Switching between representations */
  representationSwitching: {
    level: DifficultyLevel;
    score: number;
    rationale: string;
  };

  /** Likelihood of triggering misconceptions */
  misconceptionRisk: {
    level: DifficultyLevel;
    score: number;
    rationale: string;
  };

  /** Composite for AI orchestration */
  composite: {
    overall: DifficultyLevel;
    primaryChallenge: keyof Omit<DifficultyScores, 'composite'>;
  };
}

// =============================================================================
// RAG INGESTION METADATA
// =============================================================================

export type RAGContentType =
  | 'authoritative_fact'    // Physics laws, definitions (embed)
  | 'socratic_prompt'       // Questions only (do not embed as facts)
  | 'analogy'               // Non-authoritative illustration (embed with caution)
  | 'misconception_trap'    // Known wrong thinking (embed with warning)
  | 'procedure'             // Step sequences (embed)
  | 'example';              // Worked examples (embed)

export interface RAGMetadata {
  /** What type of content for RAG */
  contentType: RAGContentType;

  /** Should this be embedded? */
  embeddable: boolean;

  /** Embedding priority (1-10) */
  priority: number;

  /** Tags for retrieval filtering */
  retrievalTags: string[];

  /** What must NOT be in retrieval context */
  exclusions: string[];

  /** Uncertainty handling */
  uncertainty: {
    /** Can this be stated with confidence? */
    confident: boolean;
    /** Fallback if uncertain */
    fallback?: string;
  };
}

export interface RAGAnnotation {
  contentId: string;

  /** Segment-level annotations */
  segments: {
    text: string;
    type: RAGContentType;
    embeddable: boolean;
    confidence: 'high' | 'medium' | 'low';
  }[];
}

// =============================================================================
// CONCEPT EVOLUTION MAP
// =============================================================================

export interface ConceptEvolutionStage {
  level: 'class9' | 'class10' | 'jee_main' | 'jee_advanced';

  /** New abstraction introduced at this level */
  newAbstraction: string;

  /** Assumptions relaxed from previous level */
  relaxedAssumptions: string[];

  /** New problem archetypes unlocked */
  unlockedArchetypes: string[];

  /** Misconceptions that resurface */
  resurfacingMisconceptions: string[];

  /** Key thinking shift required */
  thinkingShift: string;
}

export interface ConceptEvolutionMap {
  id: string;
  conceptFamily: string;  // e.g., "Newton's Laws"

  /** Progression stages */
  stages: ConceptEvolutionStage[];

  /** Cross-cutting themes */
  themes: string[];
}

// =============================================================================
// PAYOFF TAGS
// =============================================================================

export type PayoffType =
  | 'enables_class10'
  | 'enables_jee_intuition'
  | 'enables_olympiad_reasoning';

export interface PayoffTag {
  type: PayoffType;
  specificPayoff: string;  // Not generic
  prerequisiteFor: string[];
}

// =============================================================================
// SOCRATIC CANVAS METADATA
// =============================================================================

export interface SocraticCanvasMetadata {
  /** Node type for visual styling */
  nodeVisualType: 'main' | 'branch' | 'leaf' | 'misconception';

  /** Can this branch be collapsed? */
  collapsible: boolean;

  /** Default expanded state */
  defaultExpanded: boolean;

  /** Visual anchoring to diagram */
  diagramAnchor?: {
    diagramId: string;
    elementId: string;
  };

  /** Fading indicator */
  fadingIndicator: {
    show: boolean;
    level: FadingLevel;
  };

  /** Side-thread indicator */
  isSideThread: boolean;
}

// =============================================================================
// COMPLETE CONTENT PACK
// =============================================================================

export interface ContentPack {
  id: string;
  version: ContentVersion;
  conceptNode: string;
  grade: 'class9' | 'class10' | 'jee_main' | 'jee_advanced';
  module: string;

  /** Target insight for this pack */
  targetInsight: string;

  /** All content pieces */
  conceptCard: ConceptCard;
  misconceptionCards: MisconceptionCard[];
  problemArchetypes: ProblemArchetype[];
  socraticTrees: SocraticTree[];
  masteryCheckSet: MasteryCheckSet;

  /** Evolution context */
  evolutionMap?: ConceptEvolutionMap;

  /** Quality assurance */
  qualityFlags: {
    reviewed: boolean;
    reviewedAt?: string;
    approvalStatus: 'pending' | 'approved' | 'rejected';
    violations?: string[];
  };
}

// =============================================================================
// CURRICULUM AUDIT
// =============================================================================

export type AuditRiskType =
  | 'explanation_over_inquiry'
  | 'over_scaffolding'
  | 'hint_dependency'
  | 'formula_leakage'
  | 'transfer_loss';

export interface CurriculumAuditResult {
  contentId: string;

  /** Overall risk level */
  riskLevel: 'low' | 'medium' | 'high' | 'critical';

  /** Specific risks found */
  risks: {
    type: AuditRiskType;
    severity: 'low' | 'medium' | 'high';
    location: string;
    description: string;
  }[];

  /** Recommendations (no rewrites) */
  recommendations: string[];

  /** Pass/fail */
  approved: boolean;
}
