/**
 * Phase 2: Completion Definition & Gating Rules
 *
 * Defines what constitutes "completion" and how gating works
 * for the Competitive and Intermediate tracks.
 */

import { AttemptOutcome } from '@prisma/client'

// =============================================================================
// COMPLETION DEFINITION
// =============================================================================

export interface CompletionCheckpoint {
  /** Unique identifier for the checkpoint */
  id: string
  /** Human-readable name */
  name: string
  /** Whether this checkpoint is required for completion */
  required: boolean
  /** Order in the scaffold flow */
  order: number
}

/**
 * Standard scaffold checkpoints for Competitive/Intermediate tracks
 */
export const STANDARD_CHECKPOINTS: CompletionCheckpoint[] = [
  { id: 'problem_understanding', name: 'Problem Understanding', required: true, order: 1 },
  { id: 'known_unknowns', name: 'Known/Unknown Identification', required: true, order: 2 },
  { id: 'fbd_setup', name: 'Free Body Diagram', required: false, order: 3 },
  { id: 'strategy_selection', name: 'Strategy Selection', required: true, order: 4 },
  { id: 'equation_setup', name: 'Equation Setup', required: true, order: 5 },
  { id: 'calculation', name: 'Calculation', required: true, order: 6 },
  { id: 'sanity_check', name: 'Sanity Check', required: true, order: 7 },
]

/**
 * Minimum required checkpoints for a question to be considered "completed"
 */
export const COMPLETION_REQUIREMENTS = {
  /** Minimum percentage of required checkpoints that must be passed */
  minRequiredCheckpointsPercent: 100,
  /** Sanity check must always be passed */
  requireSanityCheck: true,
  /** Maximum hints allowed before marking as "struggled" */
  maxHintsBeforeStruggle: 3,
  /** Time threshold (seconds) for "quick solve" badge */
  quickSolveThresholdSec: 300,
}

// =============================================================================
// COMPLETION STATUS
// =============================================================================

export type CompletionStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'struggled'    // Completed but with many hints
  | 'revealed'     // User chose to reveal solution
  | 'skipped'      // User explicitly skipped
  | 'abandoned'    // User left without completing

export interface CompletionResult {
  status: CompletionStatus
  checkpointsCompleted: string[]
  checkpointsTotal: number
  hintsUsed: number
  durationSec: number
  score: number          // 0-100
  isQuickSolve: boolean
  canProceedToHarder: boolean
  canProceedToSame: boolean
  suggestedNextAction: 'harder' | 'same' | 'easier' | 'review'
}

/**
 * Evaluate completion status from attempt data
 */
export function evaluateCompletion(params: {
  stepsCompleted: number
  stepsTotal: number
  hintsUsed: number
  durationSec: number
  outcome: AttemptOutcome
  sanityCheckPassed: boolean
}): CompletionResult {
  const {
    stepsCompleted,
    stepsTotal,
    hintsUsed,
    durationSec,
    outcome,
    sanityCheckPassed,
  } = params

  // Calculate base score (0-100)
  const completionRatio = stepsTotal > 0 ? stepsCompleted / stepsTotal : 0
  const hintPenalty = Math.min(hintsUsed * 5, 30) // Max 30% penalty for hints
  const baseScore = Math.round(completionRatio * 100 - hintPenalty)
  const score = Math.max(0, Math.min(100, baseScore))

  // Determine completion status
  let status: CompletionStatus = 'not_started'

  switch (outcome) {
    case 'completed':
      if (hintsUsed > COMPLETION_REQUIREMENTS.maxHintsBeforeStruggle) {
        status = 'struggled'
      } else {
        status = 'completed'
      }
      break
    case 'revealed':
      status = 'revealed'
      break
    case 'skipped':
      status = 'skipped'
      break
    case 'abandoned':
      status = stepsCompleted > 0 ? 'abandoned' : 'not_started'
      break
  }

  // Check for quick solve
  const isQuickSolve =
    status === 'completed' &&
    durationSec <= COMPLETION_REQUIREMENTS.quickSolveThresholdSec &&
    hintsUsed === 0

  // Determine progression eligibility
  const canProceedToHarder =
    (status === 'completed' || status === 'struggled') &&
    sanityCheckPassed &&
    score >= 70

  const canProceedToSame =
    status === 'completed' ||
    status === 'struggled' ||
    status === 'revealed'

  // Suggest next action
  let suggestedNextAction: 'harder' | 'same' | 'easier' | 'review' = 'same'

  if (isQuickSolve && score >= 90) {
    suggestedNextAction = 'harder'
  } else if (status === 'struggled' || status === 'revealed') {
    suggestedNextAction = 'same' // Practice more at this level
  } else if (status === 'abandoned' || status === 'skipped') {
    suggestedNextAction = 'easier'
  } else if (canProceedToHarder) {
    suggestedNextAction = 'harder'
  }

  return {
    status,
    checkpointsCompleted: [], // Would be filled from actual checkpoint data
    checkpointsTotal: stepsTotal,
    hintsUsed,
    durationSec,
    score,
    isQuickSolve,
    canProceedToHarder,
    canProceedToSame,
    suggestedNextAction,
  }
}

// =============================================================================
// GATING RULES
// =============================================================================

export interface GatingRule {
  /** Rule identifier */
  id: string
  /** Human description */
  description: string
  /** Check if the rule is satisfied */
  check: (userStats: UserTrackStats) => boolean
}

export interface UserTrackStats {
  track: string
  questionsCompleted: number
  questionsStruggled: number
  questionsSkipped: number
  averageScore: number
  totalHintsUsed: number
  currentStreak: number
  bestStreak: number
}

/**
 * Gating rules for track progression
 */
export const GATING_RULES: GatingRule[] = [
  {
    id: 'min_completed',
    description: 'Must complete at least 3 questions in current difficulty',
    check: (stats) => stats.questionsCompleted >= 3,
  },
  {
    id: 'min_avg_score',
    description: 'Must have average score >= 60%',
    check: (stats) => stats.averageScore >= 60,
  },
  {
    id: 'no_excessive_skips',
    description: 'Skip ratio must be < 30%',
    check: (stats) => {
      const total = stats.questionsCompleted + stats.questionsSkipped
      return total === 0 || stats.questionsSkipped / total < 0.3
    },
  },
  {
    id: 'recent_success',
    description: 'Must have completed last question successfully',
    check: (stats) => stats.currentStreak >= 1,
  },
]

/**
 * Check if user can proceed to harder difficulty
 */
export function canProceedToHarder(stats: UserTrackStats): {
  allowed: boolean
  failedRules: string[]
  passedRules: string[]
} {
  const failedRules: string[] = []
  const passedRules: string[] = []

  for (const rule of GATING_RULES) {
    if (rule.check(stats)) {
      passedRules.push(rule.id)
    } else {
      failedRules.push(rule.id)
    }
  }

  return {
    allowed: failedRules.length === 0,
    failedRules,
    passedRules,
  }
}

// =============================================================================
// UX STATES
// =============================================================================

export type UXState =
  | 'success'           // Clean completion
  | 'success_struggled' // Completed with hints
  | 'revealed'          // Chose to see answer
  | 'skip_confirmed'    // Explicitly skipped
  | 'timeout_warning'   // Taking too long
  | 'stuck_detected'    // Appears to be stuck

export interface UXStateTransition {
  from: UXState | 'solving'
  to: UXState
  trigger: string
  actions: string[]
}

/**
 * UX state transitions for question solving
 */
export const UX_TRANSITIONS: UXStateTransition[] = [
  {
    from: 'solving',
    to: 'success',
    trigger: 'sanity_check_passed',
    actions: ['show_celebration', 'enable_harder_button', 'enable_another_button'],
  },
  {
    from: 'solving',
    to: 'success_struggled',
    trigger: 'sanity_check_passed_with_hints',
    actions: ['show_encouragement', 'suggest_practice', 'enable_another_button'],
  },
  {
    from: 'solving',
    to: 'revealed',
    trigger: 'reveal_clicked',
    actions: ['show_solution', 'suggest_similar', 'disable_harder_button'],
  },
  {
    from: 'solving',
    to: 'skip_confirmed',
    trigger: 'skip_confirmed',
    actions: ['record_skip', 'suggest_easier', 'move_to_next'],
  },
  {
    from: 'solving',
    to: 'timeout_warning',
    trigger: 'time_exceeded_threshold',
    actions: ['show_hint_prompt', 'offer_skip_option'],
  },
  {
    from: 'solving',
    to: 'stuck_detected',
    trigger: 'no_progress_5min',
    actions: ['show_hint_prompt', 'show_encouragement', 'offer_easier_option'],
  },
]

/**
 * Get available actions based on current UX state
 */
export function getAvailableActions(state: UXState): string[] {
  switch (state) {
    case 'success':
      return ['try_harder', 'try_another', 'review_solution', 'go_to_dashboard']
    case 'success_struggled':
      return ['try_another', 'review_solution', 'try_easier', 'go_to_dashboard']
    case 'revealed':
      return ['try_similar', 'try_easier', 'go_to_dashboard']
    case 'skip_confirmed':
      return ['try_easier', 'try_another', 'go_to_dashboard']
    case 'timeout_warning':
      return ['continue', 'get_hint', 'skip']
    case 'stuck_detected':
      return ['get_hint', 'try_easier', 'skip']
    default:
      return []
  }
}
