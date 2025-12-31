/**
 * FBD (Free Body Diagram) Types
 *
 * Data model for interactive diagram canvas and validation.
 * Supports mechanics problems with point mass/block FBDs.
 */

// ============================================
// Force Types
// ============================================

export type ForceType =
  | 'weight'      // mg, always downward
  | 'normal'      // N, perpendicular to surface
  | 'friction'    // f, parallel to surface, opposes motion
  | 'tension'     // T, along rope/string
  | 'applied'     // F, any direction
  | 'spring'      // kx, along spring axis
  | 'pseudo'      // ma, opposite to acceleration (non-inertial frame)

export type ForceDirection =
  | 'up' | 'down' | 'left' | 'right'
  | 'up-left' | 'up-right' | 'down-left' | 'down-right'
  | 'perpendicular-surface'  // For normal force on incline
  | 'along-surface'          // For friction on incline

// ============================================
// Placed Force (User's Diagram)
// ============================================

export interface PlacedForce {
  id: string
  type: ForceType
  label: string           // User's label (e.g., "mg", "N", "T₁")
  x: number               // Position on canvas (0-100 normalized)
  y: number
  angle: number           // Rotation in degrees (0 = right, 90 = up, etc.)
}

// ============================================
// Diagram Step Schema (from AI)
// ============================================

export type ScenarioType = 'incline' | 'hanging' | 'pulley' | 'horizontal' | 'rotating' | 'wedge' | 'block-on-wedge'
export type ObjectShape = 'block' | 'point' | 'sphere'

export interface RequiredForce {
  type: ForceType
  label?: string                   // Expected label (optional, for strict validation)
  direction: ForceDirection
  tolerance?: number               // Angle tolerance in degrees (default 15)
}

export interface DiagramStepData {
  scenarioType: ScenarioType
  objectShape: ObjectShape
  surfaceAngle?: number            // For inclined planes (degrees from horizontal)
  requiredForces: RequiredForce[]  // Forces that must be present
  hints?: string[]                 // Progressive hints if user struggles
}

// ============================================
// Validation Result
// ============================================

export interface DirectionError {
  force: ForceType
  expected: ForceDirection
  got: ForceDirection
}

export interface FBDValidationResult {
  isValid: boolean
  missingForces: ForceType[]
  incorrectDirections: DirectionError[]
  extraForces: ForceType[]         // Forces that shouldn't be there (warning only)
  feedback: string                 // Human-readable feedback message
}

// ============================================
// Force Metadata (for UI)
// ============================================

export interface ForceMetadata {
  type: ForceType
  name: string
  symbol: string
  defaultLabel: string
  color: string
  description: string
}

export const FORCE_METADATA: Record<ForceType, ForceMetadata> = {
  weight: {
    type: 'weight',
    name: 'Weight',
    symbol: 'W',
    defaultLabel: 'mg',
    color: '#ef4444', // red
    description: 'Gravitational force, always points downward'
  },
  normal: {
    type: 'normal',
    name: 'Normal',
    symbol: 'N',
    defaultLabel: 'N',
    color: '#3b82f6', // blue
    description: 'Contact force perpendicular to surface'
  },
  friction: {
    type: 'friction',
    name: 'Friction',
    symbol: 'f',
    defaultLabel: 'f',
    color: '#f59e0b', // amber
    description: 'Resistive force parallel to surface'
  },
  tension: {
    type: 'tension',
    name: 'Tension',
    symbol: 'T',
    defaultLabel: 'T',
    color: '#8b5cf6', // purple
    description: 'Force transmitted through rope/string'
  },
  applied: {
    type: 'applied',
    name: 'Applied',
    symbol: 'F',
    defaultLabel: 'F',
    color: '#10b981', // green
    description: 'External applied force'
  },
  spring: {
    type: 'spring',
    name: 'Spring',
    symbol: 'Fs',
    defaultLabel: 'kx',
    color: '#06b6d4', // cyan
    description: 'Elastic restoring force'
  },
  pseudo: {
    type: 'pseudo',
    name: 'Pseudo',
    symbol: 'Fp',
    defaultLabel: 'ma',
    color: '#ec4899', // pink
    description: 'Fictitious force in non-inertial frame'
  }
}

// ============================================
// Direction Utilities
// ============================================

export const DIRECTION_ANGLES: Record<Exclude<ForceDirection, 'perpendicular-surface' | 'along-surface'>, number> = {
  'right': 0,
  'up-right': 45,
  'up': 90,
  'up-left': 135,
  'left': 180,
  'down-left': 225,
  'down': 270,
  'down-right': 315
}

export const SNAP_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315]

/**
 * Snap angle to nearest 45-degree increment
 */
export function snapToDirection(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360
  const closest = SNAP_ANGLES.reduce((prev, curr) =>
    Math.abs(curr - normalized) < Math.abs(prev - normalized) ? curr : prev
  )
  return closest
}

/**
 * Infer direction from angle
 */
export function angleToDirection(angle: number): ForceDirection {
  const snapped = snapToDirection(angle)
  const entry = Object.entries(DIRECTION_ANGLES).find(([, a]) => a === snapped)
  return (entry?.[0] as ForceDirection) || 'right'
}

/**
 * Normalize angle to 0-360 range
 */
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360
}
