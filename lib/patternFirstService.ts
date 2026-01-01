/**
 * Pattern-First Service
 *
 * Handles pattern selection validation and analytics for Pattern-First Mode.
 * This service is used to validate pattern selections, track performance,
 * and aggregate analytics data.
 */

import type {
  PatternOption,
  PatternSelectionState,
  PatternSelectionProgress,
  TimePressureConfig,
} from '@/types/patternFirst'
import { eventLogger } from '@/lib/storage'

// ============================================
// Configuration
// ============================================

/**
 * Default time pressure configuration
 */
export const defaultTimePressure: TimePressureConfig = {
  enablePatternFirst: false,
  lockSeconds: 12,
  showCountdown: true,
  allowTimeoutProceed: true,
}

// ============================================
// Selection Validation
// ============================================

/**
 * Validate a pattern selection against the correct answer
 */
export function validateSelection(
  selectedId: string,
  primaryId: string,
  secondaryIds?: string[]
): { isCorrect: boolean; isPrimary: boolean; isSecondary: boolean } {
  const isPrimary = selectedId === primaryId
  const isSecondary = secondaryIds?.includes(selectedId) ?? false

  return {
    isCorrect: isPrimary || isSecondary,
    isPrimary,
    isSecondary,
  }
}

/**
 * Check if pattern-first mode should be shown for this problem
 */
export function shouldShowPatternFirst(
  patterns: PatternOption[] | undefined,
  primaryPatternId: string | undefined,
  timePressure: TimePressureConfig | undefined,
  existingSelection: PatternSelectionProgress | undefined
): boolean {
  // Must have patterns and primary pattern defined
  if (!patterns?.length || !primaryPatternId) {
    return false
  }

  // Must have pattern-first enabled
  if (!timePressure?.enablePatternFirst) {
    return false
  }

  // Don't show if already selected (resuming problem)
  if (existingSelection?.selectedPatternId || existingSelection?.patternTimedOut) {
    return false
  }

  return true
}

// ============================================
// Analytics
// ============================================

/**
 * Log pattern-first modal shown event
 */
export function logPatternFirstShown(
  problemId: string,
  patternCount: number,
  lockSeconds: number
): void {
  eventLogger.log('pattern_first_shown', {
    problemId,
    patternOptionsCount: patternCount,
    lockSeconds,
  })
}

/**
 * Log pattern selection event
 */
export function logPatternSelected(
  problemId: string,
  selectedPatternId: string,
  primaryPatternId: string,
  isCorrect: boolean,
  decisionTimeMs: number
): void {
  eventLogger.log('pattern_selected', {
    problemId,
    selectedPatternId,
    primaryPatternId,
    isCorrect,
    duration: decisionTimeMs,
  })
}

/**
 * Log pattern timeout event
 */
export function logPatternTimeout(problemId: string, timeMs: number): void {
  eventLogger.log('pattern_first_timeout', {
    problemId,
    duration: timeMs,
  })
}

/**
 * Log scaffold unlock event
 */
export function logPatternFirstUnlock(
  problemId: string,
  hadSelection: boolean,
  wasCorrect: boolean | null
): void {
  eventLogger.log('pattern_first_unlock', {
    problemId,
    hadSelection,
    wasCorrect: wasCorrect ?? undefined,
  })
}

// ============================================
// State Management Helpers
// ============================================

/**
 * Create initial pattern selection state
 */
export function createInitialSelectionState(): PatternSelectionState {
  return {
    selectedPatternId: null,
    decisionTimeMs: 0,
    isCorrect: null,
    confidence: 'weak', // Default to weak until pattern is selected
    timedOut: false,
    timestamp: '',
  }
}

/**
 * Create selection state from a selection event
 */
export function createSelectionState(
  patternId: string,
  timeMs: number,
  isCorrect: boolean
): PatternSelectionState {
  return {
    selectedPatternId: patternId,
    decisionTimeMs: timeMs,
    isCorrect,
    confidence: isCorrect ? 'strong' : 'weak',
    timedOut: false,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Create selection state from a timeout event
 */
export function createTimeoutState(timeMs: number): PatternSelectionState {
  return {
    selectedPatternId: null,
    decisionTimeMs: timeMs,
    isCorrect: null,
    confidence: 'weak', // Timeout always results in weak confidence
    timedOut: true,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Convert selection state to progress format for storage
 */
export function toProgressFormat(state: PatternSelectionState): PatternSelectionProgress {
  return {
    selectedPatternId: state.selectedPatternId,
    patternDecisionTimeMs: state.decisionTimeMs,
    patternDecisionCorrect: state.isCorrect,
    patternTimedOut: state.timedOut,
  }
}

/**
 * Convert progress format to selection state
 */
export function fromProgressFormat(
  progress: PatternSelectionProgress
): PatternSelectionState {
  return {
    selectedPatternId: progress.selectedPatternId,
    decisionTimeMs: progress.patternDecisionTimeMs,
    isCorrect: progress.patternDecisionCorrect,
    confidence: progress.patternDecisionCorrect ? 'strong' : 'weak',
    timedOut: progress.patternTimedOut,
    timestamp: '', // Not stored in progress format
  }
}

// ============================================
// Performance Analytics
// ============================================

/**
 * Get pattern identification statistics for a user
 * (queries from localStorage events)
 */
export function getPatternStats(): {
  total: number
  correct: number
  accuracy: number
  averageTimeMs: number
  timedOutCount: number
} {
  // Query events from storage
  const result = eventLogger.getEventsByType(['pattern_selected', 'pattern_first_timeout'])

  // Handle case where storage query failed
  if (!result.success || !result.data) {
    return {
      total: 0,
      correct: 0,
      accuracy: 0,
      averageTimeMs: 0,
      timedOutCount: 0,
    }
  }

  const events = result.data
  const selectionEvents = events.filter((e) => e.type === 'pattern_selected')
  const timeoutEvents = events.filter((e) => e.type === 'pattern_first_timeout')

  const correctEvents = selectionEvents.filter((e) => e.metadata.isCorrect === true)
  const totalTime = selectionEvents.reduce(
    (sum, e) => sum + ((e.metadata.duration as number) || 0),
    0
  )

  return {
    total: selectionEvents.length,
    correct: correctEvents.length,
    accuracy: selectionEvents.length > 0
      ? correctEvents.length / selectionEvents.length
      : 0,
    averageTimeMs: selectionEvents.length > 0
      ? totalTime / selectionEvents.length
      : 0,
    timedOutCount: timeoutEvents.length,
  }
}
