/**
 * Pattern Track Next-Action Resolver
 *
 * Determines the specific next action for continuing a pattern track.
 * Returns track ID, pattern ID, and step type for routing.
 */

import { studyPlanV2Service } from '@/lib/studyPlanV2/studyPlanV2Service'
import type { PatternTrack, UserPatternState, Pattern } from '@/types/studyPlanV2'

/**
 * Step types in the pattern learning flow
 */
export type PatternStepType = 'learn' | 'practice' | 'drill'

/**
 * Result of resolving the next action for a pattern track
 */
export interface PatternTrackNextAction {
  /** The track ID */
  trackId: string
  /** The track name */
  trackName: string
  /** The current pattern ID */
  patternId: string
  /** The current pattern name */
  patternName: string
  /** The step type to do next */
  stepType: PatternStepType
  /** The route to navigate to */
  route: string
  /** A description of what the user will do */
  description: string
  /** Progress info */
  progress: {
    /** Current pattern index (0-based) */
    currentPatternIndex: number
    /** Total patterns in the track */
    totalPatterns: number
    /** Overall track completion percentage (0-100) */
    trackCompletionPercent: number
  }
}

/**
 * Result when no action is available
 */
export interface NoNextAction {
  reason: 'no_tracks' | 'all_complete' | 'no_active_track'
  message: string
}

/**
 * Resolve the next action for the user's current pattern track
 */
export function resolveNextAction(userId: string): PatternTrackNextAction | NoNextAction {
  // Get all tracks
  const tracks = studyPlanV2Service.getAllPatternTracks()
  if (tracks.length === 0) {
    return {
      reason: 'no_tracks',
      message: 'No pattern tracks available',
    }
  }

  // Get current track or default to first
  const currentTrack = studyPlanV2Service.getCurrentTrack(userId)
  if (!currentTrack) {
    return {
      reason: 'no_active_track',
      message: 'No active pattern track',
    }
  }

  // Get progress for the current track
  const trackProgress = studyPlanV2Service.getPatternTrackProgress(userId, currentTrack.id)
  if (!trackProgress) {
    return {
      reason: 'no_active_track',
      message: 'Could not load track progress',
    }
  }

  // Check if all patterns are complete
  if (trackProgress.currentPatternIndex >= currentTrack.patternIds.length) {
    return {
      reason: 'all_complete',
      message: `You've completed all patterns in "${currentTrack.name}"!`,
    }
  }

  // Get the current pattern
  const currentPatternId = currentTrack.patternIds[trackProgress.currentPatternIndex]
  const currentPattern = studyPlanV2Service.getPatternById(currentPatternId)
  if (!currentPattern) {
    return {
      reason: 'no_active_track',
      message: 'Could not load current pattern',
    }
  }

  // Get the pattern state to determine what step is next
  const patternState = studyPlanV2Service.getPatternState(userId, currentPatternId)
  const stepType = determineNextStep(patternState)

  // Build the route
  const route = buildRoute(currentTrack.id, currentPatternId, stepType)

  // Build description
  const description = buildDescription(currentPattern.name, stepType)

  // Calculate completion percentage
  const trackCompletionPercent = Math.round(
    (trackProgress.completedPatterns / trackProgress.totalPatterns) * 100
  )

  return {
    trackId: currentTrack.id,
    trackName: currentTrack.name,
    patternId: currentPatternId,
    patternName: currentPattern.name,
    stepType,
    route,
    description,
    progress: {
      currentPatternIndex: trackProgress.currentPatternIndex,
      totalPatterns: trackProgress.totalPatterns,
      trackCompletionPercent,
    },
  }
}

/**
 * Determine the next step type based on pattern state
 */
function determineNextStep(state: UserPatternState): PatternStepType {
  if (!state.learnCompleted) {
    return 'learn'
  }
  if (!state.guidedPracticeCompleted) {
    return 'practice'
  }
  return 'drill'
}

/**
 * Build the route URL for the next step
 */
function buildRoute(trackId: string, patternId: string, stepType: PatternStepType): string {
  // Routes follow the pattern: /study-path/v2/track/[trackId]?pattern=[patternId]&step=[stepType]
  return `/study-path/v2/track/${trackId}?pattern=${patternId}&step=${stepType}`
}

/**
 * Build a human-readable description of the next action
 */
function buildDescription(patternName: string, stepType: PatternStepType): string {
  switch (stepType) {
    case 'learn':
      return `Learn the "${patternName}" pattern`
    case 'practice':
      return `Practice "${patternName}" with guided problems`
    case 'drill':
      return `Drill "${patternName}" to build speed`
    default:
      return `Continue with "${patternName}"`
  }
}

/**
 * Check if the result is a valid next action (not an error)
 */
export function isNextAction(result: PatternTrackNextAction | NoNextAction): result is PatternTrackNextAction {
  return 'trackId' in result
}

/**
 * Get all available pattern tracks with their progress
 */
export function getAllTracksWithProgress(userId: string): Array<{
  track: PatternTrack
  progress: {
    currentPatternIndex: number
    totalPatterns: number
    completedPatterns: number
    overallMastery: number
    isActive: boolean
  } | null
}> {
  const tracks = studyPlanV2Service.getAllPatternTracks()

  return tracks.map(track => {
    const progress = studyPlanV2Service.getPatternTrackProgress(userId, track.id)
    return {
      track,
      progress: progress ? {
        currentPatternIndex: progress.currentPatternIndex,
        totalPatterns: progress.totalPatterns,
        completedPatterns: progress.completedPatterns,
        overallMastery: progress.overallMastery,
        isActive: progress.isActive,
      } : null,
    }
  })
}

/**
 * Set the active track for a user
 */
export function setActiveTrack(userId: string, trackId: string): void {
  studyPlanV2Service.setCurrentTrack(userId, trackId)
}
