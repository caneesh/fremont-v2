/**
 * Curriculum Module
 *
 * Provides tools for managing Socratic physics curriculum content:
 * - Atomic Learning Objects (Concept Cards, Misconception Cards, etc.)
 * - Content versioning and deprecation
 * - Multi-dimensional difficulty taxonomy
 * - RAG ingestion and annotation
 * - Foundation 1/2 classification
 * - Concept evolution mapping
 * - Curriculum auditing
 */

// Content versioning
export {
  createVersion,
  parseVersionString,
  versionToString,
  compareVersions,
  isNewerVersion,
  deprecateVersion,
  isDeprecated,
  getDeprecationAge,
  checkCompatibility,
  createCompatibilityRecord,
  diffSocraticTrees,
  suggestVersionBump,
  bumpVersion,
  canMigrateProgress,
  getProgressMigrationWarnings,
  buildVersionChain,
  getLatestVersion,
  getLatestNonDeprecatedVersion,
} from './contentVersioning';

// Difficulty taxonomy
export {
  DIFFICULTY_LEVELS,
  CONCEPTUAL_LOAD_RUBRIC,
  REASONING_DEPTH_RUBRIC,
  TRANSFER_DISTANCE_RUBRIC,
  REPRESENTATION_SWITCHING_RUBRIC,
  MISCONCEPTION_RISK_RUBRIC,
  ALL_RUBRICS,
  scoreToLevel,
  levelToScore,
  createDimensionScore,
  computeComposite,
  createDifficultyScores,
  matchContentToProfile,
  FOUNDATION_DIFFICULTY_CONSTRAINTS,
  validateDifficultyForFoundation,
  getDifficultyProfile,
  suggestPrerequisites,
} from './difficultyTaxonomy';

// RAG ingestion
export {
  CONTENT_TYPE_RULES,
  decideEmbedding,
  buildRetrievalContext,
  getFailureFallback,
  annotateConceptCard,
  annotateMisconceptionCard,
  annotateSocraticTree,
  createRAGMetadata,
  validateForIngestion,
} from './ragIngestion';

// Foundation classification
export {
  FOUNDATION_1_CRITERIA,
  FOUNDATION_2_CRITERIA,
  classifyContent,
  createFoundationClassification,
  classifyContentPack,
  FOUNDATION_TRANSITIONS,
  checkTransitionEligibility,
  getSkillsForFoundation,
  getSkillDescription,
} from './foundationClassification';

// Concept evolution
export {
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
  EVOLUTION_MAPS,
  getEvolutionMap,
} from './conceptEvolution';

// Curriculum audit
export {
  auditContentPack,
  auditConceptCard,
  auditSocraticTree,
  generateQualityChecklist,
  auditMultipleContentPacks,
} from './curriculumAudit';

// Re-export types for convenience
export type {
  ContentVersion,
  VersionCompatibility,
  DifficultyScores,
  DifficultyLevel,
  RAGMetadata,
  RAGContentType,
  RAGAnnotation,
  FoundationLevel,
  FoundationClassification,
  ConceptEvolutionMap,
  ConceptEvolutionStage,
  PayoffTag,
  PayoffType,
  CurriculumAuditResult,
  AuditRiskType,
  ContentPack,
  ConceptCard,
  MisconceptionCard,
  ProblemArchetype,
  SocraticTree,
  MasteryCheck,
  MasteryCheckSet,
} from '@/types/atomicLearning';
