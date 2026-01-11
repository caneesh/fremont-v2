/**
 * Cognitive Mode Definitions
 *
 * Maps track levels to cognitive learning modes that guide tutor behavior.
 *
 * Modes:
 * - intuition: Build physical intuition without math. Qualitative reasoning,
 *   diagrams, cause-effect chains. No equations.
 * - modeling: Bridge from intuition to quantitative reasoning. Equations
 *   allowed AFTER student demonstrates conceptual understanding.
 * - advanced: Full mathematical treatment. Time pressure, minimal scaffolding,
 *   competition-level rigor.
 */

import type { Track } from '@prisma/client'

/**
 * Cognitive learning mode derived from user's track
 *
 * - intuition: F1 = intuition-first, no equations
 * - modeling: F2/Int = model-first, equations after reasoning
 * - advanced: Comp = full rigor, minimal hand-holding
 */
export type CognitiveMode = 'intuition' | 'modeling' | 'advanced'

/**
 * Track to cognitive mode mapping
 */
const TRACK_TO_MODE: Record<Track, CognitiveMode> = {
  foundation1: 'intuition',
  foundation2: 'modeling',
  intermediate: 'modeling',
  competitive: 'advanced',
}

/**
 * Get the cognitive mode for a given track
 *
 * @param track - User's current track level
 * @returns The cognitive mode that should guide tutor behavior
 *
 * @example
 * getCognitiveMode('foundation1') // => 'intuition'
 * getCognitiveMode('foundation2') // => 'modeling'
 * getCognitiveMode('competitive') // => 'advanced'
 */
export function getCognitiveMode(track: Track): CognitiveMode {
  return TRACK_TO_MODE[track]
}

/**
 * Get description of a cognitive mode for UI/debugging
 */
export function getCognitiveModeDescription(mode: CognitiveMode): string {
  switch (mode) {
    case 'intuition':
      return 'Build physical intuition through qualitative reasoning. No equations yet.'
    case 'modeling':
      return 'Bridge to quantitative reasoning. Equations after conceptual understanding.'
    case 'advanced':
      return 'Full mathematical treatment with competition-level rigor.'
  }
}
