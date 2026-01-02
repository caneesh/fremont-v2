/**
 * Warm-up Problem Selector
 *
 * Selects a warm-up problem from previously mastered patterns for recovery mode.
 * The goal is to give the student an "achievable win" to rebuild confidence.
 *
 * Selection criteria:
 * 1. Pattern/concept with high mastery (>= 0.75)
 * 2. Problem that was previously solved successfully
 * 3. Prefer Easy/Medium difficulty
 * 4. Must come from existing content (no new problems)
 */

import { type WarmUpProblem } from '@/types/confidenceRepair'
import { type MasteryLevel } from '@/types/conceptMastery'
import { type ProblemAttempt, type ProblemProgress } from '@/types/history'
import { conceptMasteryService } from '@/lib/conceptMasteryService'
import { localStorageProvider } from '@/lib/storage/LocalStorageProvider'

// ============================================
// Types
// ============================================

interface CandidateProblem {
  problemId: string
  problemTitle: string
  patternId: string
  patternName: string
  masteryScore: number
  masteryLevel: MasteryLevel
  difficulty?: 'Easy' | 'Medium' | 'Hard'
  solvedAt: string
}

interface SelectionCriteria {
  /** Minimum mastery score required (default: 0.75) */
  minMastery: number
  /** Preferred difficulties (default: ['Easy', 'Medium']) */
  preferredDifficulties: Array<'Easy' | 'Medium' | 'Hard'>
  /** Exclude problems solved in the last N hours (default: 24) */
  recentHoursExclude: number
}

const DEFAULT_SELECTION_CRITERIA: SelectionCriteria = {
  minMastery: 0.75,
  preferredDifficulties: ['Easy', 'Medium'],
  recentHoursExclude: 24,
}

// ============================================
// Problem Discovery
// ============================================

/**
 * Get all solved problem attempts
 */
function getSolvedProblems(): ProblemAttempt[] {
  const result = localStorageProvider.getAttempts({ status: 'SOLVED' })
  if (!result.success || !result.data) return []
  return result.data.items
}

/**
 * Parse problem progress to extract pattern information
 */
function extractPatternInfo(attempt: ProblemAttempt): { patternId: string; patternName: string } | null {
  if (!attempt.finalSolution) return null

  try {
    const progress = JSON.parse(attempt.finalSolution) as ProblemProgress
    const patternSelection = progress.patternSelection

    if (patternSelection?.selectedPatternId) {
      return {
        patternId: patternSelection.selectedPatternId,
        patternName: patternSelection.selectedPatternId, // Will be enhanced with actual name
      }
    }
  } catch {
    // Failed to parse progress
  }

  return null
}

/**
 * Get mastery level classification
 */
function getMasteryLevel(score: number): MasteryLevel {
  if (score >= 0.75) return 'high'
  if (score >= 0.4) return 'medium'
  if (score > 0) return 'low'
  return 'none'
}

// ============================================
// Candidate Selection
// ============================================

/**
 * Build list of candidate warm-up problems
 */
function buildCandidateList(
  studentId: string,
  criteria: SelectionCriteria = DEFAULT_SELECTION_CRITERIA
): CandidateProblem[] {
  const candidates: CandidateProblem[] = []

  // Get high-mastery concepts
  const strongConcepts = conceptMasteryService.getStrongConcepts(studentId)
  const conceptMasteryMap = new Map<string, { score: number; name: string }>(
    strongConcepts.map((c) => [c.conceptId, { score: c.masteryScore, name: c.conceptName }])
  )

  // Get all solved problems
  const solvedProblems = getSolvedProblems()

  // Recent time cutoff
  const recentCutoff = new Date()
  recentCutoff.setHours(recentCutoff.getHours() - criteria.recentHoursExclude)
  const recentCutoffTime = recentCutoff.getTime()

  for (const attempt of solvedProblems) {
    // Skip very recently solved problems
    const solvedTime = new Date(attempt.updatedAt).getTime()
    if (solvedTime > recentCutoffTime) continue

    // Try to extract pattern info from the progress
    const patternInfo = extractPatternInfo(attempt)

    if (patternInfo) {
      // Check if this pattern has high mastery
      const conceptMastery = conceptMasteryMap.get(patternInfo.patternId)

      if (conceptMastery && conceptMastery.score >= criteria.minMastery) {
        candidates.push({
          problemId: attempt.problemId,
          problemTitle: attempt.problemTitle,
          patternId: patternInfo.patternId,
          patternName: conceptMastery.name || patternInfo.patternName,
          masteryScore: conceptMastery.score,
          masteryLevel: getMasteryLevel(conceptMastery.score),
          solvedAt: attempt.updatedAt,
        })
      }
    }
  }

  return candidates
}

/**
 * Score and rank candidates
 */
function rankCandidates(candidates: CandidateProblem[]): CandidateProblem[] {
  return [...candidates].sort((a, b) => {
    // Prefer higher mastery (more confident in this pattern)
    if (b.masteryScore !== a.masteryScore) {
      return b.masteryScore - a.masteryScore
    }

    // Prefer easier difficulty
    const difficultyOrder = { Easy: 0, Medium: 1, Hard: 2 }
    const aDiff = difficultyOrder[a.difficulty ?? 'Medium']
    const bDiff = difficultyOrder[b.difficulty ?? 'Medium']
    if (aDiff !== bDiff) {
      return aDiff - bDiff
    }

    // Prefer problems solved longer ago (more spaced repetition value)
    return new Date(a.solvedAt).getTime() - new Date(b.solvedAt).getTime()
  })
}

// ============================================
// Public API
// ============================================

/**
 * Select a warm-up problem for recovery mode
 */
export function selectWarmUpProblem(
  studentId: string,
  criteria: Partial<SelectionCriteria> = {}
): WarmUpProblem | null {
  const fullCriteria = { ...DEFAULT_SELECTION_CRITERIA, ...criteria }

  // Build and rank candidates
  const candidates = buildCandidateList(studentId, fullCriteria)

  if (candidates.length === 0) {
    console.log('[WarmupSelector] No candidate problems found for recovery mode')
    return null
  }

  const ranked = rankCandidates(candidates)
  const selected = ranked[0]

  console.log(
    `[WarmupSelector] Selected warm-up: ${selected.problemTitle} (pattern: ${selected.patternName}, mastery: ${selected.masteryScore.toFixed(2)})`
  )

  // Selection criteria guarantees minMastery >= 0.75, so masteryLevel will be 'high' or 'medium'
  const warmUpMasteryLevel = selected.masteryLevel === 'high' ? 'high' : 'medium'

  // Warm-up problems prefer Easy/Medium; if Hard was selected, treat as Medium
  const warmUpDifficulty: 'Easy' | 'Medium' =
    selected.difficulty === 'Easy' ? 'Easy' : 'Medium'

  return {
    problemId: selected.problemId,
    problemTitle: selected.problemTitle,
    patternId: selected.patternId,
    patternName: selected.patternName,
    masteryLevel: warmUpMasteryLevel,
    difficulty: warmUpDifficulty,
  }
}

/**
 * Get all available warm-up candidates (for debugging/UI)
 */
export function getWarmUpCandidates(
  studentId: string,
  criteria: Partial<SelectionCriteria> = {}
): CandidateProblem[] {
  const fullCriteria = { ...DEFAULT_SELECTION_CRITERIA, ...criteria }
  const candidates = buildCandidateList(studentId, fullCriteria)
  return rankCandidates(candidates)
}

/**
 * Check if warm-up problems are available
 */
export function hasWarmUpProblems(studentId: string): boolean {
  const candidates = buildCandidateList(studentId)
  return candidates.length > 0
}

/**
 * Get fallback warm-up when no mastered problems available
 * Returns the easiest solved problem as a fallback
 */
export function getFallbackWarmUp(studentId: string): WarmUpProblem | null {
  const solvedProblems = getSolvedProblems()

  if (solvedProblems.length === 0) {
    console.log('[WarmupSelector] No solved problems available for fallback')
    return null
  }

  // Sort by most recent solved
  const sorted = [...solvedProblems].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  // Try to find one with pattern info
  for (const attempt of sorted) {
    const patternInfo = extractPatternInfo(attempt)

    if (patternInfo) {
      return {
        problemId: attempt.problemId,
        problemTitle: attempt.problemTitle,
        patternId: patternInfo.patternId,
        patternName: patternInfo.patternName,
        masteryLevel: 'medium',
        difficulty: 'Medium',
      }
    }
  }

  // Last resort: return the most recent solved problem without pattern info
  const recent = sorted[0]
  return {
    problemId: recent.problemId,
    problemTitle: recent.problemTitle,
    patternId: 'unknown',
    patternName: 'Previous Problem',
    masteryLevel: 'medium',
    difficulty: 'Medium',
  }
}

/**
 * Select warm-up problem with fallback
 * If no high-mastery problems available, falls back to any solved problem
 */
export function selectWarmUpProblemWithFallback(
  studentId: string,
  criteria: Partial<SelectionCriteria> = {}
): WarmUpProblem | null {
  // Try to find high-mastery problem first
  const primary = selectWarmUpProblem(studentId, criteria)
  if (primary) return primary

  // Try with lower mastery threshold
  const loweredCriteria = { ...criteria, minMastery: 0.4 }
  const secondary = selectWarmUpProblem(studentId, loweredCriteria)
  if (secondary) return secondary

  // Fall back to any solved problem
  return getFallbackWarmUp(studentId)
}

// ============================================
// Integration with Recovery Mode
// ============================================

/**
 * Prepare warm-up for recovery mode initialization
 * This is the main entry point for the recovery system
 */
export function prepareRecoveryWarmUp(studentId: string): {
  available: boolean
  warmUp: WarmUpProblem | null
  candidateCount: number
  message: string
} {
  const candidates = buildCandidateList(studentId)
  const warmUp = selectWarmUpProblemWithFallback(studentId)

  if (!warmUp) {
    return {
      available: false,
      warmUp: null,
      candidateCount: 0,
      message: 'No previous problems available for warm-up. Start with any problem to begin.',
    }
  }

  const isHighMastery = candidates.some((c) => c.problemId === warmUp.problemId)

  return {
    available: true,
    warmUp,
    candidateCount: candidates.length,
    message: isHighMastery
      ? `Let's rebuild confidence with "${warmUp.problemTitle}" - a pattern you've mastered.`
      : `Let's rebuild confidence with "${warmUp.problemTitle}" - a problem you've solved before.`,
  }
}
