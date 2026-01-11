/**
 * Track-Based Gates
 *
 * Defines prerequisite gates that must be completed before equation-heavy steps
 * based on user's learning track (Foundation 1, Foundation 2, etc.)
 */

import type { Track } from '@prisma/client'

/**
 * F1 Gate: Explain the situation in words
 */
export interface SituationExplanationGate {
  type: 'situation_explanation'
  isComplete: boolean
  explanation: string
  minLength: number // Minimum character requirement
  completedAt?: number
}

/**
 * F1 Gate: Describe/draw the diagram
 */
export interface DiagramDescriptionGate {
  type: 'diagram_description'
  isComplete: boolean
  description: string
  minLength: number
  completedAt?: number
}

/**
 * F2 Gate: Model selection
 */
export interface ModelSelectionGate {
  type: 'model_selection'
  isComplete: boolean
  principle: string | null // Newton, Energy, Momentum, etc.
  knowns: string[]
  unknowns: string[]
  completedAt?: number
}

/**
 * Combined track gate state for a problem
 */
export interface TrackGateState {
  track: Track
  // F1 gates
  situationExplanation?: SituationExplanationGate
  diagramDescription?: DiagramDescriptionGate
  // F2 gate
  modelSelection?: ModelSelectionGate
}

/**
 * Physics principles for model selection
 */
export const PHYSICS_PRINCIPLES = [
  { id: 'newton', label: "Newton's Laws", description: 'Force, acceleration, motion' },
  { id: 'energy', label: 'Energy Conservation', description: 'KE, PE, work-energy theorem' },
  { id: 'momentum', label: 'Momentum', description: 'Conservation of momentum, impulse' },
  { id: 'kinematics', label: 'Kinematics', description: 'Motion equations, projectile motion' },
  { id: 'circular', label: 'Circular Motion', description: 'Centripetal force, rotation' },
  { id: 'waves', label: 'Waves & Oscillations', description: 'SHM, wave properties' },
  { id: 'thermo', label: 'Thermodynamics', description: 'Heat, temperature, gas laws' },
  { id: 'electro', label: 'Electromagnetism', description: 'Electric/magnetic fields, circuits' },
  { id: 'optics', label: 'Optics', description: 'Reflection, refraction, lenses' },
  { id: 'other', label: 'Other', description: 'Other physics principle' },
] as const

export type PhysicsPrinciple = typeof PHYSICS_PRINCIPLES[number]['id']

/**
 * Default gate configuration by track
 */
export function getDefaultTrackGateState(track: Track): TrackGateState {
  switch (track) {
    case 'foundation1':
      return {
        track,
        situationExplanation: {
          type: 'situation_explanation',
          isComplete: false,
          explanation: '',
          minLength: 50, // At least 50 characters
        },
        diagramDescription: {
          type: 'diagram_description',
          isComplete: false,
          description: '',
          minLength: 30, // At least 30 characters
        },
      }
    case 'foundation2':
      return {
        track,
        modelSelection: {
          type: 'model_selection',
          isComplete: false,
          principle: null,
          knowns: [],
          unknowns: [],
        },
      }
    case 'intermediate':
    case 'competitive':
      // No gates for advanced tracks
      return { track }
  }
}

/**
 * Check if all required gates are complete for a track
 */
export function areTrackGatesComplete(state: TrackGateState): boolean {
  switch (state.track) {
    case 'foundation1':
      return (
        (state.situationExplanation?.isComplete ?? true) &&
        (state.diagramDescription?.isComplete ?? true)
      )
    case 'foundation2':
      return state.modelSelection?.isComplete ?? true
    case 'intermediate':
    case 'competitive':
      return true // No gates
  }
}

/**
 * Get human-readable message about what gates are incomplete
 */
export function getIncompleteGateMessage(state: TrackGateState): string | null {
  if (areTrackGatesComplete(state)) return null

  switch (state.track) {
    case 'foundation1':
      if (!state.situationExplanation?.isComplete) {
        return 'Please explain the situation in your own words before moving to equations.'
      }
      if (!state.diagramDescription?.isComplete) {
        return 'Please describe or sketch the physical setup before solving.'
      }
      return null
    case 'foundation2':
      if (!state.modelSelection?.isComplete) {
        return 'Please identify the physics principle and knowns/unknowns before solving.'
      }
      return null
    default:
      return null
  }
}

/**
 * Determine if a step index is "equation-heavy" and requires gates
 * For F1/F2, equation steps are typically step 2+ (after setup steps)
 */
export function isEquationStep(stepIndex: number, totalSteps: number): boolean {
  // First step (index 0) is usually conceptual/setup
  // Steps 1+ typically involve equations
  return stepIndex >= 1 && totalSteps > 1
}

/**
 * Check if track gates block access to a specific step
 */
export function isStepBlockedByTrackGates(
  stepIndex: number,
  totalSteps: number,
  gateState: TrackGateState | null
): boolean {
  if (!gateState) return false

  // Only block equation-heavy steps
  if (!isEquationStep(stepIndex, totalSteps)) return false

  return !areTrackGatesComplete(gateState)
}
