/**
 * P0 Gating Policy Types
 *
 * Defines types for the P0 gating system that enforces:
 * 1. Pattern Gate - Pattern identification at session start
 * 2. Decision Gates - Required micro-task completion before step submission
 * 3. Rebuild Gates - Understanding verification after using Hint Level 5 (Reveal)
 */

// ============================================
// Pattern Gate Types
// ============================================

/**
 * Confidence level based on pattern gate performance
 * - 'strong': User correctly identified the pattern
 * - 'weak': User selected wrong pattern or timed out
 */
export type PatternConfidence = 'strong' | 'weak'

/**
 * Extended pattern selection state with confidence tracking
 */
export interface PatternGateState {
  /** ID of the pattern the user selected */
  selectedPatternId: string | null
  /** Whether selection matches the primary pattern */
  isCorrect: boolean
  /** Confidence level based on correctness */
  confidence: PatternConfidence
  /** Time taken to make decision in milliseconds */
  decisionTimeMs: number
  /** Whether user timed out without selecting */
  timedOut: boolean
  /** Timestamp of selection/timeout */
  timestamp: string
}

/**
 * Initial pattern gate state
 */
export const INITIAL_PATTERN_GATE_STATE: PatternGateState = {
  selectedPatternId: null,
  isCorrect: false,
  confidence: 'weak',
  decisionTimeMs: 0,
  timedOut: false,
  timestamp: '',
}

// ============================================
// Decision Gate Types
// ============================================

/**
 * Step types that require decision gates
 */
export type GatedStepType = 'concept' | 'setup' | 'equation' | 'physics_concept'

/**
 * Check if a step type requires decision gating
 */
export function isGatedStepType(stepType: string | undefined): stepType is GatedStepType {
  const gatedTypes: GatedStepType[] = ['concept', 'setup', 'equation', 'physics_concept']
  return stepType !== undefined && gatedTypes.includes(stepType as GatedStepType)
}

/**
 * Configuration for decision gates
 */
export interface DecisionGateConfig {
  /** Minimum number of correct micro-tasks required to unlock step submission */
  requiredMicroTasks: number
  /** Maximum retry attempts before auto-unlocking hint level 2 */
  maxAttempts: number
  /** Whether to show targeted feedback on wrong answers */
  showFeedback: boolean
  /** Step types that require gating (empty = all steps) */
  gatedStepTypes: GatedStepType[]
}

/**
 * Default decision gate configuration
 */
export const DEFAULT_DECISION_GATE_CONFIG: DecisionGateConfig = {
  requiredMicroTasks: 1,
  maxAttempts: 2,
  showFeedback: true,
  gatedStepTypes: ['concept', 'setup', 'equation', 'physics_concept'],
}

/**
 * Weak confidence decision gate configuration (more restrictive)
 */
export const WEAK_CONFIDENCE_DECISION_GATE_CONFIG: DecisionGateConfig = {
  requiredMicroTasks: 2,
  maxAttempts: 2,
  showFeedback: true,
  gatedStepTypes: ['concept', 'setup', 'equation', 'physics_concept'],
}

/**
 * State for a single step's decision gate
 */
export interface StepDecisionGateState {
  /** Step ID */
  stepId: number
  /** Number of micro-tasks passed for this step */
  microTasksPassedCount: number
  /** Number of wrong attempts on current micro-task */
  currentAttempts: number
  /** Whether the decision gate is passed (can submit step) */
  gatePassed: boolean
  /** Whether hint level 2 was auto-unlocked due to failed attempts */
  hintAutoUnlocked: boolean
}

// ============================================
// Rebuild Gate Types
// ============================================

/**
 * Rebuild gate question structure
 */
export interface RebuildQuestion {
  /** Question ID */
  id: string
  /** Question type */
  type: 'pattern' | 'decision'
  /** Question text */
  question: string
  /** Available options */
  options: string[]
  /** Index of correct answer */
  correctIndex: number
  /** Explanation shown after answering */
  explanation: string
}

/**
 * State for a step's rebuild gate
 */
export interface StepRebuildGateState {
  /** Step ID */
  stepId: number
  /** Whether Hint Level 5 (Reveal) was used */
  revealUsed: boolean
  /** Whether rebuild gate is currently active/shown */
  isActive: boolean
  /** Questions for the rebuild gate */
  questions: RebuildQuestion[]
  /** User's answers (index in options array) */
  userAnswers: (number | null)[]
  /** Which questions were answered correctly */
  correctAnswers: boolean[]
  /** Whether all rebuild questions passed */
  gatePassed: boolean
  /** Number of attempts on current question */
  attempts: number
}

/**
 * Initial rebuild gate state for a step
 */
export function createInitialRebuildGateState(stepId: number): StepRebuildGateState {
  return {
    stepId,
    revealUsed: false,
    isActive: false,
    questions: [],
    userAnswers: [],
    correctAnswers: [],
    gatePassed: false,
    attempts: 0,
  }
}

// ============================================
// Session Policy Types
// ============================================

/**
 * Gating intensity level based on session performance
 */
export type GatingIntensity = 'low' | 'normal' | 'high'

/**
 * Cognitive load level for UI simplification
 */
export type CognitiveLoadLevel = 'low' | 'medium' | 'high'

/**
 * Session-level gating policy state
 */
export interface SessionGatingPolicy {
  /** Pattern gate result */
  patternGate: PatternGateState | null
  /** Current gating intensity */
  intensity: GatingIntensity
  /** Number of consecutive wrong step submissions */
  consecutiveWrongSubmissions: number
  /** Decision gate config (adjusted based on intensity) */
  decisionGateConfig: DecisionGateConfig
  /** Per-step decision gate states */
  stepDecisionGates: Map<number, StepDecisionGateState>
  /** Per-step rebuild gate states */
  stepRebuildGates: Map<number, StepRebuildGateState>
  /** Cognitive load level for UI simplification (optional for backward compat) */
  cognitiveLoadLevel?: CognitiveLoadLevel
}

/**
 * Create initial session gating policy
 */
export function createInitialSessionPolicy(): SessionGatingPolicy {
  return {
    patternGate: null,
    intensity: 'normal',
    consecutiveWrongSubmissions: 0,
    decisionGateConfig: { ...DEFAULT_DECISION_GATE_CONFIG },
    stepDecisionGates: new Map(),
    stepRebuildGates: new Map(),
  }
}

// ============================================
// Gating Event Types (for telemetry)
// ============================================

export type GatingEventType =
  | 'pattern_gate_shown'
  | 'pattern_gate_selected'
  | 'pattern_gate_timeout'
  | 'decision_gate_shown'
  | 'decision_gate_attempt'
  | 'decision_gate_passed'
  | 'decision_gate_failed_max_attempts'
  | 'decision_gate_hint_auto_unlocked'
  | 'rebuild_gate_triggered'
  | 'rebuild_gate_shown'
  | 'rebuild_gate_attempt'
  | 'rebuild_gate_passed'
  | 'rebuild_gate_failed'
  | 'gating_intensity_changed'

export interface GatingEvent {
  type: GatingEventType
  timestamp: string
  problemId: string
  stepId?: number
  metadata?: Record<string, unknown>
}

// ============================================
// Step Gating Configuration (scaffold extension)
// ============================================

/**
 * Gating configuration that can be added to scaffold steps
 */
export interface StepGatingConfig {
  /** Override required micro-tasks for this step */
  requiredMicroTasks?: number
  /** Override max attempts for this step */
  maxAttempts?: number
  /** Whether to require rebuild gate after reveal */
  rebuildAfterReveal?: boolean
  /** Custom rebuild questions (if not auto-generated) */
  rebuildQuestions?: RebuildQuestion[]
}

// ============================================
// Serialization helpers
// ============================================

/**
 * Convert session policy to JSON-serializable format
 */
export function serializeSessionPolicy(policy: SessionGatingPolicy): string {
  return JSON.stringify({
    ...policy,
    stepDecisionGates: Array.from(policy.stepDecisionGates.entries()),
    stepRebuildGates: Array.from(policy.stepRebuildGates.entries()),
  })
}

/**
 * Parse session policy from JSON string
 */
export function deserializeSessionPolicy(json: string): SessionGatingPolicy {
  const parsed = JSON.parse(json)
  return {
    ...parsed,
    stepDecisionGates: new Map(parsed.stepDecisionGates || []),
    stepRebuildGates: new Map(parsed.stepRebuildGates || []),
  }
}
