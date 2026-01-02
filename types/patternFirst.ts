/**
 * Pattern-First Mode Types
 *
 * Enables pattern identification as the first step in problem solving.
 * When a problem starts, users must identify the relevant physics pattern
 * before they can proceed to equation/solution steps.
 */

// ============================================
// Configuration Types
// ============================================

import type { TimePressureConfig } from './timePressure'
export type { TimePressureConfig } from './timePressure'

// ============================================
// Pattern Option Types
// ============================================

/**
 * A pattern option displayed in the modal
 * Simplified from full Pattern for display purposes
 */
export interface PatternOption {
  /** Unique identifier for the pattern */
  id: string
  /** Display label (e.g., "Conservation of Momentum") */
  label: string
  /** Legacy alias for label (kept for backwards compatibility) */
  name?: string
  /** Brief description for quick scanning */
  description?: string
  /** Optional recognition cues/triggers */
  triggers?: string[]
}

/**
 * Extended scaffold data with pattern information
 * These fields are added to ScaffoldData and MicroTaskScaffoldData
 */
export interface PatternScaffoldExtension {
  /** Available patterns for this problem (4-8 options) */
  patterns: PatternOption[]
  /** The canonical/correct primary pattern for this problem */
  primaryPatternId?: string
  /** Secondary patterns that also apply (optional) */
  secondaryPatternIds?: string[]
  /** Time pressure configuration */
  timePressure: TimePressureConfig
}

// ============================================
// Selection State Types
// ============================================

/**
 * Confidence level based on pattern gate performance
 */
export type PatternConfidence = 'strong' | 'weak'

/**
 * User's pattern selection state
 */
export interface PatternSelectionState {
  /** ID of selected pattern (null if none selected) */
  selectedPatternId: string | null
  /** Time taken to make decision in milliseconds */
  decisionTimeMs: number
  /** Whether selection matches primary pattern (null if not yet evaluated) */
  isCorrect: boolean | null
  /** Confidence level based on correctness (used for P0 gating) */
  confidence: PatternConfidence
  /** Whether user proceeded without selection (timeout) */
  timedOut: boolean
  /** Timestamp of selection/timeout */
  timestamp: string
}

/**
 * Initial selection state
 */
export const INITIAL_SELECTION_STATE: PatternSelectionState = {
  selectedPatternId: null,
  decisionTimeMs: 0,
  isCorrect: null,
  confidence: 'weak',
  timedOut: false,
  timestamp: '',
}

// ============================================
// Progress Tracking Types
// ============================================

/**
 * Pattern selection data stored in ProblemProgress
 */
export interface PatternSelectionProgress {
  selectedPatternId: string | null
  patternDecisionTimeMs: number
  patternDecisionCorrect: boolean | null
  patternTimedOut: boolean
}

// ============================================
// Modal Props Types
// ============================================

export interface PatternFirstModalProps {
  /** Available pattern options */
  patterns: PatternOption[]
  /** The correct pattern ID (for validation, optional) */
  primaryPatternId?: string
  /** Time limit in seconds */
  lockSeconds: number
  /** Show countdown timer */
  showCountdown: boolean
  /** Problem text for context */
  problemText: string
  /** Callback when pattern is selected */
  onSelect: (patternId: string, timeMs: number, isCorrect: boolean | null) => void
  /** Callback when timeout occurs */
  onTimeout: (timeMs: number) => void
  /** Callback to skip/close modal (only if allowTimeoutProceed is true) */
  onSkip?: () => void
  /** Whether modal can be dismissed without selection */
  canDismiss: boolean
}

// ============================================
// Analytics Types
// ============================================

export interface PatternFirstEventMetadata {
  problemId: string
  selectedPatternId?: string
  primaryPatternId?: string
  isCorrect?: boolean
  decisionTimeMs?: number
  timedOut?: boolean
  patternOptionsCount?: number
  lockSeconds?: number
  hadSelection?: boolean
  wasCorrect?: boolean
}
