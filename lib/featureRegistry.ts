/**
 * Feature Registry - Single Source of Truth
 *
 * This registry defines ALL features in the app with their:
 * - Implementation status
 * - Routes and navigation visibility
 * - Feature flag dependencies
 * - Documentation links
 *
 * Navigation components should derive from this registry.
 */

import { FEATURE_FLAGS } from './featureFlags'

export type FeatureStatus = 'IMPLEMENTED' | 'PARTIAL' | 'STUB' | 'DISABLED' | 'DEV_ONLY'

export type FeatureCategory =
  | 'core'           // Core learning features
  | 'adaptive'       // Adaptive learning features
  | 'exam_strategy'  // Exam strategy training
  | 'interactive'    // Interactive tools
  | 'analytics'      // Analytics and tracking
  | 'navigation'     // Navigation and layout
  | 'dev'            // Development/testing only

export interface FeatureDefinition {
  id: string
  name: string
  description: string
  category: FeatureCategory
  status: FeatureStatus

  // Route information
  route?: string
  hasRoute: boolean

  // Navigation
  showInPrimaryNav: boolean
  showInSecondaryNav: boolean
  showInMobileNav: boolean
  navIcon?: string

  // Feature flags that gate this feature
  requiredFlags: (keyof typeof FEATURE_FLAGS)[]

  // Documentation
  docsPath?: string

  // Components that implement this feature
  components: string[]

  // API routes used by this feature
  apiRoutes: string[]

  // Additional metadata
  isBeta?: boolean
  isNew?: boolean
  lastUpdated?: string
}

/**
 * Complete Feature Registry
 */
export const FEATURE_REGISTRY: FeatureDefinition[] = [
  // ===== CORE FEATURES =====
  {
    id: 'problem-solver',
    name: 'Problem Solver',
    description: 'Main problem-solving interface with AI-generated scaffolds',
    category: 'core',
    status: 'IMPLEMENTED',
    route: '/solve',
    hasRoute: true,
    showInPrimaryNav: true,
    showInSecondaryNav: false,
    showInMobileNav: true,
    navIcon: 'pencil',
    requiredFlags: [],
    docsPath: '/docs/FEATURES.md#2-problem-input--scaffold-generation',
    components: ['components/solve/SolvePage.tsx', 'components/solve/SolutionScaffold.tsx'],
    apiRoutes: ['/api/scaffold/outline', '/api/scaffold/step', '/api/scaffold/hint'],
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Study path dashboard with progress tracking and recommendations',
    category: 'navigation',
    status: 'IMPLEMENTED',
    route: '/study-path',
    hasRoute: true,
    showInPrimaryNav: true,
    showInSecondaryNav: false,
    showInMobileNav: true,
    navIcon: 'dashboard',
    requiredFlags: ['DASHBOARD_V3'],
    docsPath: '/docs/FEATURES.md#33-dashboard-v3',
    components: ['components/dashboard/DashboardV3.tsx', 'components/StudyPlanV2Dashboard.tsx'],
    apiRoutes: ['/api/study-path/topics', '/api/study-path/questions'],
  },
  {
    id: 'mistake-notebook',
    name: 'Mistake Notebook',
    description: 'Spaced repetition review of learning gaps and mistakes',
    category: 'adaptive',
    status: 'IMPLEMENTED',
    route: '/mistake-notebook',
    hasRoute: true,
    showInPrimaryNav: true,
    showInSecondaryNav: false,
    showInMobileNav: true,
    navIcon: 'book',
    requiredFlags: ['MISTAKE_NOTEBOOK'],
    docsPath: '/docs/FEATURES.md#13-mistake-notebook',
    components: ['components/MistakeCardDisplay.tsx', 'components/ReviewSession.tsx'],
    apiRoutes: [],
  },
  {
    id: 'history',
    name: 'Problem History',
    description: 'Track all problem attempts with status and resume capability',
    category: 'core',
    status: 'IMPLEMENTED',
    route: '/history',
    hasRoute: true,
    showInPrimaryNav: true,
    showInSecondaryNav: false,
    showInMobileNav: true,
    navIcon: 'clock',
    requiredFlags: [],
    docsPath: '/docs/FEATURES.md#11-problem-history--progress-tracking',
    components: ['components/ProblemReplay.tsx'],
    apiRoutes: [],
  },
  {
    id: 'concept-network',
    name: 'Concept Network',
    description: 'Visual concept mastery map with repair mode for weak concepts',
    category: 'interactive',
    status: 'IMPLEMENTED',
    route: '/concept-network',
    hasRoute: true,
    showInPrimaryNav: false,
    showInSecondaryNav: true,
    showInMobileNav: false,
    navIcon: 'globe',
    requiredFlags: [],
    docsPath: '/docs/USER_GUIDE.md#using-the-concept-inventory-panel',
    components: ['components/ConceptMapVisualization.tsx', 'components/RepairModeModal.tsx'],
    apiRoutes: [],
  },
  {
    id: 'pattern-track',
    name: 'Pattern Track',
    description: 'Pattern identification training with lessons and practice',
    category: 'exam_strategy',
    status: 'IMPLEMENTED',
    route: '/pattern-track',
    hasRoute: true,
    showInPrimaryNav: false,
    showInSecondaryNav: true,
    showInMobileNav: false,
    navIcon: 'layers',
    requiredFlags: ['STUDY_PLAN_V2'],
    docsPath: '/docs/FEATURES.md#17-study-plan-v2-pattern-first-learning',
    components: ['components/PatternTrackDetail.tsx'],
    apiRoutes: ['/api/pattern-track/patterns', '/api/pattern-track/progress'],
  },
  {
    id: 'spot-mistake',
    name: 'Spot the Mistake',
    description: 'Critical thinking exercises - find errors in student solutions',
    category: 'interactive',
    status: 'IMPLEMENTED',
    route: '/spot-mistake',
    hasRoute: true,
    showInPrimaryNav: false,
    showInSecondaryNav: true,
    showInMobileNav: false,
    navIcon: 'warning',
    requiredFlags: [],
    docsPath: '/docs/FEATURES.md#35-spot-the-mistake-mode',
    components: ['components/SpotTheMistake.tsx', 'components/MistakeFeedback.tsx'],
    apiRoutes: ['/api/spot-mistake/generate', '/api/spot-mistake/analyze'],
  },
  {
    id: 'error-patterns',
    name: 'Error Patterns',
    description: 'Analytics on recurring error patterns and remediation',
    category: 'analytics',
    status: 'IMPLEMENTED',
    route: '/error-patterns',
    hasRoute: true,
    showInPrimaryNav: false,
    showInSecondaryNav: true,
    showInMobileNav: false,
    navIcon: 'chart',
    requiredFlags: ['ERROR_ANTICIPATOR'],
    docsPath: '/docs/FEATURES.md#15-error-anticipator',
    components: ['components/ErrorPatternAnalytics.tsx', 'components/ErrorPatternInsights.tsx'],
    apiRoutes: [],
  },
  {
    id: 'drills',
    name: 'Micro-Pattern Drills',
    description: 'Rapid-fire pattern recognition practice with timed questions',
    category: 'exam_strategy',
    status: 'IMPLEMENTED',
    route: '/drills',
    hasRoute: true,
    showInPrimaryNav: false,
    showInSecondaryNav: false, // Hidden but accessible
    showInMobileNav: false,
    navIcon: 'lightning',
    requiredFlags: [],
    docsPath: '/docs/USER_GUIDE.md#step-7-warm-up-protocol-if-enabled',
    components: ['components/DrillModal.tsx', 'components/DrillResults.tsx'],
    apiRoutes: [],
  },

  // ===== EMBEDDED FEATURES (no standalone route) =====
  {
    id: 'socratic-tutor',
    name: 'Socratic Tutor Chat',
    description: 'AI professor check-in after completing steps',
    category: 'core',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['SOCRATIC_TUTOR_CHAT'],
    docsPath: '/docs/FEATURES.md#6-socratic-tutor-chat-professor-check-in',
    components: ['components/SocraticTutorChat.tsx'],
    apiRoutes: ['/api/socratic-tutor'],
  },
  {
    id: 'micro-tasks',
    name: 'Micro-Task Mode',
    description: 'MCQs and fill-in-blanks for active learning within steps',
    category: 'core',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['MICRO_TASKS'],
    docsPath: '/docs/FEATURES.md#4-micro-task-mode',
    components: ['components/micro-tasks/MultipleChoiceRenderer.tsx', 'components/micro-tasks/FillBlankRenderer.tsx'],
    apiRoutes: [],
  },
  {
    id: 'hint-system',
    name: '5-Level Hint System',
    description: 'Progressive hints from conceptual to full solution',
    category: 'core',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: [],
    docsPath: '/docs/FEATURES.md#5-5-level-hint-system',
    components: [],
    apiRoutes: ['/api/scaffold/hint'],
  },
  {
    id: 'pattern-first',
    name: 'Pattern-First Mode',
    description: 'Timed pattern identification before solving (12s gate)',
    category: 'exam_strategy',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['PATTERN_FIRST_MODE'],
    docsPath: '/docs/FEATURES.md#9-pattern-first-mode',
    components: ['components/PatternFirstModal.tsx'],
    apiRoutes: [],
  },
  {
    id: 'skip-commit',
    name: 'Skip-or-Commit Gate',
    description: 'Triage decision at T=25s to train exam strategy',
    category: 'exam_strategy',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['SKIP_COMMIT_GATE'],
    docsPath: '/docs/FEATURES.md#10-skip-or-commit-gate',
    components: ['components/SkipCommitGateModal.tsx'],
    apiRoutes: [],
  },
  {
    id: 'warmup-protocol',
    name: 'Warm-Up Protocol',
    description: '2-5 minute micro-drills before study sessions',
    category: 'exam_strategy',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['WARMUP_PROTOCOL'],
    docsPath: '/docs/FEATURES.md#18-warm-up-protocol',
    components: ['components/warmup/'],
    apiRoutes: ['/api/warmup/'],
  },
  {
    id: 'pivot-injection',
    name: 'Pivot Injection',
    description: 'Dynamic help questions when stuck on a step',
    category: 'adaptive',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['PIVOT_INJECTION'],
    docsPath: '/docs/FEATURES.md#19-pivot-injection',
    components: [],
    apiRoutes: ['/api/pivot/'],
  },
  {
    id: 'boundary-case',
    name: 'Boundary Case Builder',
    description: 'Interactive equation stress-testing with limiting cases',
    category: 'interactive',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['BOUNDARY_CASE_BUILDER'],
    docsPath: '/docs/FEATURES.md#23-boundary-case-builder',
    components: ['components/BoundaryCaseBuilder.tsx'],
    apiRoutes: [],
  },
  {
    id: 'concept-contrast',
    name: 'Concept Contrast Challenge',
    description: 'Explain why similar concepts do not apply',
    category: 'interactive',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['CONCEPT_CONTRAST'],
    docsPath: '/docs/FEATURES.md#24-concept-contrast-challenge',
    components: ['components/ConceptContrastModal.tsx'],
    apiRoutes: [],
  },
  {
    id: 'constraint-collision',
    name: 'Constraint Collision Detection',
    description: 'Real-time physics law violation detection',
    category: 'adaptive',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['CONSTRAINT_COLLISION'],
    docsPath: '/docs/FEATURES.md#20-constraint-collision-detection',
    components: ['components/ConstraintFeedback.tsx'],
    apiRoutes: [],
  },
  {
    id: 'constraint-highlight',
    name: 'Constraint Highlight',
    description: 'Highlight missed constraint keywords after wrong answers',
    category: 'adaptive',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['CONSTRAINT_HIGHLIGHT'],
    docsPath: '/docs/FEATURES.md#21-constraint-highlight',
    components: ['components/ConstraintHighlightModal.tsx'],
    apiRoutes: [],
  },
  {
    id: 'paper-solution',
    name: 'Paper Solution Upload',
    description: 'Upload photos of handwritten solutions for OCR analysis',
    category: 'interactive',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['PAPER_SOLUTION_UPLOAD'],
    docsPath: '/docs/FEATURES.md#22-paper-solution-upload',
    components: ['components/paper-solution/PaperSolutionUploader.tsx'],
    apiRoutes: ['/api/paper-solution/'],
  },
  {
    id: 'confidence-srs',
    name: 'Confidence-Weighted SRS',
    description: 'Spaced repetition adjusted by self-reported confidence',
    category: 'adaptive',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['CONFIDENCE_WEIGHTED_SRS'],
    docsPath: '/docs/FEATURES.md#14-confidence-weighted-srs',
    components: ['components/ConfidenceRating.tsx'],
    apiRoutes: [],
  },
  {
    id: 'adaptive-preflight',
    name: 'Adaptive Preflight Gating',
    description: 'Auto-inserts checks on high-risk steps',
    category: 'adaptive',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['ADAPTIVE_PREFLIGHT'],
    docsPath: '/docs/FEATURES.md#16-adaptive-preflight-gating',
    components: ['components/AdaptivePreflightModal.tsx'],
    apiRoutes: [],
  },
  {
    id: 'cognitive-load',
    name: 'Cognitive Load Governor',
    description: 'Reduces UI complexity for struggling students',
    category: 'adaptive',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['COGNITIVE_LOAD_GOVERNOR'],
    docsPath: '/docs/FEATURES.md#29-cognitive-load-governor',
    components: [],
    apiRoutes: [],
  },
  {
    id: 'confidence-repair',
    name: 'Confidence Repair System',
    description: 'Detects frustrating sessions and auto-recovers students',
    category: 'adaptive',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['CONFIDENCE_REPAIR'],
    docsPath: '/docs/FEATURES.md#30-confidence-repair-system',
    components: ['components/RepairModeModal.tsx'],
    apiRoutes: [],
  },
  {
    id: 'learning-integrity',
    name: 'Learning Integrity Monitor',
    description: 'Silent tracking of behavioral signals for integrity',
    category: 'analytics',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['LEARNING_INTEGRITY'],
    docsPath: '/docs/FEATURES.md#31-learning-integrity-monitor',
    components: [],
    apiRoutes: [],
  },
  {
    id: 'decision-gates',
    name: 'P0 Decision Gates',
    description: 'Requires correct micro-task completion before step submission',
    category: 'core',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['P0_DECISION_GATES'],
    docsPath: '/docs/FEATURES.md#27-p0-decision-gates',
    components: ['components/DecisionGate.tsx'],
    apiRoutes: [],
  },
  {
    id: 'rebuild-gates',
    name: 'P0 Rebuild Gates',
    description: 'Forces understanding demonstration after reveal',
    category: 'core',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['P0_REBUILD_GATES'],
    docsPath: '/docs/FEATURES.md#28-p0-rebuild-gates',
    components: ['components/RebuildGate.tsx'],
    apiRoutes: [],
  },
  {
    id: 'question-engine',
    name: 'Question Engine',
    description: 'Template-based question resolution for faster scaffolds',
    category: 'core',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['QUESTION_ENGINE'],
    docsPath: '/docs/FEATURES.md#32-question-engine',
    components: [],
    apiRoutes: ['/api/question/resolve'],
  },
  {
    id: 'reveal-reconstruct',
    name: 'Reveal-Reconstruct-Validate',
    description: '3-stage structured learning flow for reading mode',
    category: 'core',
    status: 'IMPLEMENTED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['REVEAL_RECONSTRUCT_VALIDATE'],
    docsPath: '/docs/FEATURES.md#36-reveal-reconstruct-validate-flow',
    components: ['components/micro-tasks/RevealReconstructValidate.tsx'],
    apiRoutes: [],
  },

  // ===== DISABLED FEATURES =====
  {
    id: 'fbd-canvas',
    name: 'Free Body Diagram Canvas',
    description: 'Interactive force diagram drawing tool',
    category: 'interactive',
    status: 'DISABLED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['FBD_CANVAS'],
    docsPath: '/docs/FEATURES.md#free-body-diagram-canvas',
    components: ['components/diagram/FBDCanvas.tsx'],
    apiRoutes: [],
  },
  {
    id: 'phased-scaffold',
    name: 'Phased Scaffold Loading',
    description: '3-phase scaffold generation for reduced latency',
    category: 'core',
    status: 'DISABLED',
    hasRoute: false,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: ['PHASED_SCAFFOLD'],
    docsPath: '/docs/FEATURES.md#phased-scaffold-loading',
    components: [],
    apiRoutes: [],
  },

  // ===== DEV-ONLY FEATURES =====
  {
    id: 'latex-demo',
    name: 'LaTeX Demo',
    description: 'Development page for testing LaTeX rendering',
    category: 'dev',
    status: 'DEV_ONLY',
    route: '/latex-demo',
    hasRoute: true,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: [],
    components: ['components/LatexRenderer.tsx'],
    apiRoutes: [],
  },
  {
    id: 'time-pressure-dev',
    name: 'Time Pressure Testing',
    description: 'Development page for time pressure UI testing',
    category: 'dev',
    status: 'DEV_ONLY',
    route: '/dev/time-pressure',
    hasRoute: true,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: [],
    components: [],
    apiRoutes: [],
  },
  {
    id: 'events-dev',
    name: 'Events Testing',
    description: 'Development page for event system testing',
    category: 'dev',
    status: 'DEV_ONLY',
    route: '/dev/events',
    hasRoute: true,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: [],
    components: [],
    apiRoutes: [],
  },
  {
    id: 'progress-test-dev',
    name: 'Progress Testing',
    description: 'Development page for progress overview testing',
    category: 'dev',
    status: 'DEV_ONLY',
    route: '/dev/progress-test',
    hasRoute: true,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: [],
    components: [],
    apiRoutes: [],
  },
  {
    id: 'question-engine-demo',
    name: 'Question Engine Demo',
    description: 'Development page for Question Engine testing',
    category: 'dev',
    status: 'DEV_ONLY',
    route: '/demo/question-engine',
    hasRoute: true,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: [],
    components: [],
    apiRoutes: [],
  },

  // ===== FEATURE EXPLORER (META) =====
  {
    id: 'feature-explorer',
    name: 'Feature Explorer',
    description: 'Browse all features with status badges and documentation links',
    category: 'navigation',
    status: 'IMPLEMENTED',
    route: '/features',
    hasRoute: true,
    showInPrimaryNav: false,
    showInSecondaryNav: true,
    showInMobileNav: false,
    navIcon: 'grid',
    requiredFlags: [],
    components: [],
    apiRoutes: [],
    isNew: true,
  },
  {
    id: 'feature-flags',
    name: 'Feature Flags Dashboard',
    description: 'View effective feature flag values and why features are hidden',
    category: 'navigation',
    status: 'IMPLEMENTED',
    route: '/features/flags',
    hasRoute: true,
    showInPrimaryNav: false,
    showInSecondaryNav: false,
    showInMobileNav: false,
    requiredFlags: [],
    components: [],
    apiRoutes: [],
    isNew: true,
  },
]

// ===== UTILITY FUNCTIONS =====

/**
 * Get all features
 */
export function getAllFeatures(): FeatureDefinition[] {
  return FEATURE_REGISTRY
}

/**
 * Get features by category
 */
export function getFeaturesByCategory(category: FeatureCategory): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter(f => f.category === category)
}

/**
 * Get features by status
 */
export function getFeaturesByStatus(status: FeatureStatus): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter(f => f.status === status)
}

/**
 * Get features that have routes
 */
export function getRoutableFeatures(): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter(f => f.hasRoute)
}

/**
 * Get primary navigation items
 */
export function getPrimaryNavFeatures(): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter(f => f.showInPrimaryNav && isFeatureActive(f))
}

/**
 * Get secondary navigation items
 */
export function getSecondaryNavFeatures(): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter(f => f.showInSecondaryNav && isFeatureActive(f))
}

/**
 * Get mobile navigation items
 */
export function getMobileNavFeatures(): FeatureDefinition[] {
  return FEATURE_REGISTRY.filter(f => f.showInMobileNav && isFeatureActive(f))
}

/**
 * Check if a feature is active (all required flags are enabled)
 */
export function isFeatureActive(feature: FeatureDefinition): boolean {
  if (feature.status === 'DISABLED') return false
  if (feature.status === 'DEV_ONLY' && process.env.NODE_ENV !== 'development') return false

  for (const flag of feature.requiredFlags) {
    if (!FEATURE_FLAGS[flag]) return false
  }

  return true
}

/**
 * Get a feature by ID
 */
export function getFeatureById(id: string): FeatureDefinition | undefined {
  return FEATURE_REGISTRY.find(f => f.id === id)
}

/**
 * Get a feature by route
 */
export function getFeatureByRoute(route: string): FeatureDefinition | undefined {
  return FEATURE_REGISTRY.find(f => f.route === route)
}

/**
 * Get effective flag values with source information
 */
export function getEffectiveFlagValues(): Array<{
  name: string
  value: boolean
  source: 'hardcoded' | 'env' | 'default'
  envVar?: string
}> {
  const results: Array<{
    name: string
    value: boolean
    source: 'hardcoded' | 'env' | 'default'
    envVar?: string
  }> = []

  // Hardcoded flags
  const hardcoded = ['FBD_CANVAS', 'MICRO_TASKS', 'MISTAKE_NOTEBOOK', 'ERROR_ANTICIPATOR', 'DASHBOARD_V3', 'SOCRATIC_FIRST_MODE', 'PHASED_SCAFFOLD']

  // Environment-configurable flags with their env var names
  const envConfigurable: Record<string, string> = {
    REVEAL_RECONSTRUCT_VALIDATE: 'NEXT_PUBLIC_FEATURE_REVEAL_RECONSTRUCT_VALIDATE',
    CONFIDENCE_WEIGHTED_SRS: 'NEXT_PUBLIC_FEATURE_CONFIDENCE_SRS',
    BOUNDARY_CASE_BUILDER: 'NEXT_PUBLIC_FEATURE_BOUNDARY_CASE',
    EQUATIONLESS_PATH: 'NEXT_PUBLIC_FEATURE_EQUATIONLESS_PATH',
    CONCEPT_CONTRAST: 'NEXT_PUBLIC_FEATURE_CONCEPT_CONTRAST',
    FEYNMAN_HINT_PROMPTS: 'NEXT_PUBLIC_FEATURE_FEYNMAN_HINT_PROMPTS',
    CONSTRAINT_COLLISION: 'NEXT_PUBLIC_FEATURE_CONSTRAINT_COLLISION',
    PAPER_SOLUTION_UPLOAD: 'NEXT_PUBLIC_FEATURE_PAPER_SOLUTION',
    SOCRATIC_TUTOR_CHAT: 'NEXT_PUBLIC_FEATURE_SOCRATIC_TUTOR',
    STUDY_PLAN_V2: 'NEXT_PUBLIC_FEATURE_STUDY_PLAN_V2',
    ADAPTIVE_PREFLIGHT: 'NEXT_PUBLIC_FEATURE_ADAPTIVE_PREFLIGHT',
    WHY_THIS_STEP: 'NEXT_PUBLIC_FEATURE_WHY_THIS_STEP',
    STEP_HEATMAP: 'NEXT_PUBLIC_FEATURE_STEP_HEATMAP',
    PATTERN_FIRST_MODE: 'NEXT_PUBLIC_FEATURE_PATTERN_FIRST',
    SKIP_COMMIT_GATE: 'NEXT_PUBLIC_FEATURE_SKIP_COMMIT',
    P0_DECISION_GATES: 'NEXT_PUBLIC_FEATURE_P0_DECISION_GATES',
    P0_REBUILD_GATES: 'NEXT_PUBLIC_FEATURE_P0_REBUILD_GATES',
    COGNITIVE_LOAD_GOVERNOR: 'NEXT_PUBLIC_FEATURE_COGNITIVE_LOAD_GOVERNOR',
    CONFIDENCE_REPAIR: 'NEXT_PUBLIC_FEATURE_CONFIDENCE_REPAIR',
    LEARNING_INTEGRITY: 'NEXT_PUBLIC_FEATURE_LEARNING_INTEGRITY',
    QUESTION_ENGINE: 'NEXT_PUBLIC_FEATURE_QUESTION_ENGINE',
    USE_DATABASE_QUESTIONS: 'NEXT_PUBLIC_FEATURE_DATABASE_QUESTIONS',
    WARMUP_PROTOCOL: 'NEXT_PUBLIC_FEATURE_WARMUP_PROTOCOL',
    PIVOT_INJECTION: 'NEXT_PUBLIC_FEATURE_PIVOT_INJECTION',
    CONSTRAINT_HIGHLIGHT: 'NEXT_PUBLIC_FEATURE_CONSTRAINT_HIGHLIGHT',
    DEBUG_REFACTOR_MODE: 'NEXT_PUBLIC_FEATURE_DEBUG_REFACTOR',
  }

  for (const [name, value] of Object.entries(FEATURE_FLAGS)) {
    if (hardcoded.includes(name)) {
      results.push({ name, value, source: 'hardcoded' })
    } else if (envConfigurable[name]) {
      const envValue = typeof window !== 'undefined'
        ? undefined
        : process.env[envConfigurable[name]]

      results.push({
        name,
        value,
        source: envValue !== undefined ? 'env' : 'default',
        envVar: envConfigurable[name],
      })
    } else {
      results.push({ name, value, source: 'default' })
    }
  }

  return results
}

/**
 * Category display names
 */
export const CATEGORY_LABELS: Record<FeatureCategory, string> = {
  core: 'Core Learning',
  adaptive: 'Adaptive Learning',
  exam_strategy: 'Exam Strategy',
  interactive: 'Interactive Tools',
  analytics: 'Analytics',
  navigation: 'Navigation',
  dev: 'Development',
}

/**
 * Status display configurations
 */
export const STATUS_CONFIG: Record<FeatureStatus, { label: string; color: string; bgColor: string }> = {
  IMPLEMENTED: { label: 'Implemented', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  PARTIAL: { label: 'Partial', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  STUB: { label: 'Stub', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  DISABLED: { label: 'Disabled', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  DEV_ONLY: { label: 'Dev Only', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
}
