/**
 * Phased Scaffold Types
 *
 * Supports 3-phase scaffold generation for reduced latency:
 * - Phase A: Outline (fast, ~10-20s) - step list with minimal info
 * - Phase B: Step Expansion (on-demand) - deep content per step
 * - Phase C: Final Solve (optional) - only when explicitly requested
 */

import type { StepType } from './scaffold'
import type { DiagramStepData } from './diagram'
import type { FeynmanPromptConfig } from './feynman'
import type { PatternOption, TimePressureConfig } from './patternFirst'

// ============================================
// Phase A: Outline Types
// ============================================

/**
 * Step type classification for outline
 */
export type OutlineStepType = 'diagram' | 'concept' | 'equation' | 'compute' | 'check'

/**
 * Minimal step info in outline (fast generation)
 */
export interface OutlineStep {
  step_id: string           // Stable ID like "s1", "s2"
  title: string             // Step title
  goal: string              // 1-sentence goal
  minimal_task: string      // 1 question prompt (short)
  step_type: OutlineStepType
  requires_fbd?: boolean    // Hint that this step needs FBD (for UI skeleton)
}

/**
 * Topic/pattern tags for the problem
 */
export interface ProblemTags {
  domain: string            // e.g., "mechanics"
  subdomain: string         // e.g., "newton-laws"
  patterns: string[]        // e.g., ["inclined-plane", "friction"]
  difficulty: 'basic' | 'intermediate' | 'advanced'
}

/**
 * Outline scaffold response (Phase A)
 * Generated quickly to show user something immediately
 */
export interface OutlineScaffoldResponse {
  scaffold_id: string       // Hash of problem + flags + schema_version
  schema_version: string    // For compatibility checking
  problem: string           // Original problem text
  tags: ProblemTags
  concepts: Array<{         // Minimal concept list
    id: string
    name: string
  }>
  steps: OutlineStep[]      // 4-6 steps with minimal info
  estimated_time_mins: number // Rough estimate for user

  // Pattern-First Mode fields (optional for backwards compatibility)
  pattern_options?: PatternOption[]  // 4-6 pattern choices for recognition training
  primary_pattern_id?: string        // The correct pattern ID
  time_pressure?: TimePressureConfig // Timer configuration (defaults applied if missing)
}

// ============================================
// Phase B: Step Expansion Types
// ============================================

/**
 * Micro-task in expanded step
 */
export interface ExpandedMicroTask {
  task_id: string
  type: 'MCQ' | 'FILL_BLANK' | 'SHORT_ANSWER'
  question: string
  // For MCQ
  options?: string[]
  correct_index?: number
  // For FILL_BLANK
  sentence?: string
  correct_term?: string
  distractors?: string[]
  // For SHORT_ANSWER
  expected_keywords?: string[]
  // Common
  reasoning: string         // Brief explanation of why this is correct
  difficulty: 'easy' | 'medium' | 'hard'
}

/**
 * Common mistake/trap for this step
 */
export interface StepTrap {
  trap_id: string
  description: string       // What the mistake is
  why_wrong: string         // Why it's incorrect
  hint_to_avoid: string     // Non-spoiler hint
}

/**
 * Gating criteria for step completion
 */
export interface StepGating {
  min_correct_tasks: number // How many tasks must be correct
  pass_on_explanation: boolean // Can pass by explaining correctly
  allow_skip_after_attempts: number // Allow skip after N wrong attempts
}

/**
 * FBD metadata for diagram steps
 */
export interface StepFBDData {
  scenario_type: 'incline' | 'hanging' | 'pulley' | 'horizontal' | 'rotating'
  object_shape: 'block' | 'point' | 'sphere'
  surface_angle?: number
  required_forces: Array<{
    type: 'weight' | 'normal' | 'friction' | 'tension' | 'applied' | 'spring' | 'pseudo'
    direction: string
    label?: string
  }>
}

/**
 * Expanded step content (Phase B)
 * Deep content for a single step, generated on-demand
 */
export interface StepExpansionResponse {
  scaffold_id: string       // Must match outline's scaffold_id
  step_id: string           // Which step this expands
  micro_tasks: ExpandedMicroTask[]  // 2-4 tasks
  explanation: string       // Deeper explanation (150-250 words max)
  traps: StepTrap[]         // 3-6 common mistakes
  gating: StepGating        // Pass criteria
  fbd_data?: StepFBDData    // Only if step requires FBD
  feynman_prompt?: FeynmanPromptConfig  // Conceptual check if relevant
  hints: Array<{            // Progressive hints for this step
    level: number
    content: string
  }>
}

// ============================================
// Phase C: Final Solve Types
// ============================================

/**
 * Final solution response (Phase C)
 * Only generated when explicitly requested
 */
export interface FinalSolveResponse {
  scaffold_id: string
  final_answer: string      // The actual answer
  solution_outline: string  // Compact solution steps
  key_equations: string[]   // Important equations used
  verification: string      // How to verify the answer
}

// ============================================
// Cache Types
// ============================================

export interface CachedOutline {
  response: OutlineScaffoldResponse
  created_at: number
  expires_at: number
}

export interface CachedStepExpansion {
  response: StepExpansionResponse
  created_at: number
  expires_at: number
}

export interface CachedFinalSolve {
  response: FinalSolveResponse
  created_at: number
  expires_at: number
}

// ============================================
// Request Types
// ============================================

export interface OutlineRequest {
  problem: string
  questionId?: string       // Optional question ID for precomputed lookup
  diagram_image?: string    // Optional base64 image
  options?: {
    density?: 1 | 2 | 3 | 4 | 5
    include_fbd_hints?: boolean
  }
}

export interface StepExpansionRequest {
  scaffold_id: string
  step_id: string
  questionId?: string         // Optional question ID for precomputed lookup
  outline_steps: OutlineStep[]  // For consistency check
  problem: string           // Original problem for context
}

export interface FinalSolveRequest {
  scaffold_id: string
  problem: string
  steps_completed: string[] // Which steps user completed
}

// ============================================
// Adapter Types (for backwards compatibility)
// ============================================

/**
 * Convert phased scaffold to legacy MicroTaskScaffoldData format
 * for existing UI components
 */
export interface LegacyAdapterOptions {
  outline: OutlineScaffoldResponse
  expanded_steps: Map<string, StepExpansionResponse>
  final_solve?: FinalSolveResponse
}
