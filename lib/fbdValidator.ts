/**
 * FBD (Free Body Diagram) Validator
 *
 * Validates user-placed forces against required forces for a scenario.
 * Checks for presence, direction, and provides feedback.
 */

import type {
  PlacedForce,
  RequiredForce,
  DiagramStepData,
  FBDValidationResult,
  ForceType,
  ForceDirection
} from '@/types/diagram'
import {
  FORCE_METADATA,
  DIRECTION_ANGLES,
  normalizeAngle,
  angleToDirection
} from '@/types/diagram'

// ============================================
// Direction Validation
// ============================================

/**
 * Check if a placed force's direction matches the required direction
 */
function isDirectionCorrect(
  placed: PlacedForce,
  required: RequiredForce,
  scenario: DiagramStepData
): boolean {
  const tolerance = required.tolerance ?? 15 // degrees

  // Handle surface-relative directions
  if (required.direction === 'perpendicular-surface') {
    // Normal force must be perpendicular to surface
    const surfaceAngle = scenario.surfaceAngle ?? 0
    // Perpendicular means +90° from surface
    const expectedAngle = normalizeAngle(surfaceAngle + 90)
    const placedAngle = normalizeAngle(placed.angle)
    const diff = Math.abs(normalizeAngle(placedAngle - expectedAngle))
    return diff <= tolerance || diff >= 360 - tolerance
  }

  if (required.direction === 'along-surface') {
    // Friction force along surface (either direction)
    const surfaceAngle = scenario.surfaceAngle ?? 0
    const placedAngle = normalizeAngle(placed.angle)
    const alongAngle = normalizeAngle(surfaceAngle)
    const oppositeAngle = normalizeAngle(surfaceAngle + 180)

    const diffAlong = Math.abs(normalizeAngle(placedAngle - alongAngle))
    const diffOpposite = Math.abs(normalizeAngle(placedAngle - oppositeAngle))

    return (diffAlong <= tolerance || diffAlong >= 360 - tolerance) ||
           (diffOpposite <= tolerance || diffOpposite >= 360 - tolerance)
  }

  // Standard 8-direction check
  const expectedAngle = DIRECTION_ANGLES[required.direction as keyof typeof DIRECTION_ANGLES]
  if (expectedAngle === undefined) return true // Unknown direction, accept

  const placedAngle = normalizeAngle(placed.angle)
  const diff = Math.abs(normalizeAngle(placedAngle - expectedAngle))
  return diff <= tolerance || diff >= 360 - tolerance
}

/**
 * Infer direction name from an angle for feedback
 */
function inferDirectionName(angle: number): string {
  const dir = angleToDirection(angle)
  const directionNames: Record<ForceDirection, string> = {
    'up': 'upward',
    'down': 'downward',
    'left': 'leftward',
    'right': 'rightward',
    'up-left': 'up-left',
    'up-right': 'up-right',
    'down-left': 'down-left',
    'down-right': 'down-right',
    'perpendicular-surface': 'perpendicular to surface',
    'along-surface': 'along surface'
  }
  return directionNames[dir] || 'unknown'
}

// ============================================
// Feedback Generation
// ============================================

/**
 * Generate human-readable feedback from validation result
 */
function generateFeedback(result: FBDValidationResult): string {
  const parts: string[] = []

  if (result.missingForces.length > 0) {
    const forceNames = result.missingForces.map(t => FORCE_METADATA[t].name)
    if (forceNames.length === 1) {
      parts.push(`Missing: ${forceNames[0]} force`)
    } else {
      parts.push(`Missing forces: ${forceNames.join(', ')}`)
    }
  }

  if (result.incorrectDirections.length > 0) {
    for (const error of result.incorrectDirections) {
      const forceName = FORCE_METADATA[error.force].name
      parts.push(`${forceName} force direction is incorrect`)
    }
  }

  if (result.extraForces.length > 0 && result.isValid) {
    // Only mention extra forces as a note if diagram is otherwise valid
    const forceNames = result.extraForces.map(t => FORCE_METADATA[t].name)
    parts.push(`Note: ${forceNames.join(', ')} may not be needed here`)
  }

  if (parts.length === 0) {
    return result.isValid ? 'Correct! All forces are properly placed.' : 'Check your diagram.'
  }

  return parts.join('. ') + '.'
}

// ============================================
// Main Validation
// ============================================

/**
 * Validate a user's FBD against requirements
 */
export function validateFBD(
  placed: PlacedForce[],
  required: RequiredForce[],
  scenario: DiagramStepData
): FBDValidationResult {
  const result: FBDValidationResult = {
    isValid: true,
    missingForces: [],
    incorrectDirections: [],
    extraForces: [],
    feedback: ''
  }

  // If there are no required forces, the step data hasn't loaded yet
  // Don't allow validation to pass with empty requirements
  if (required.length === 0) {
    result.isValid = false
    result.feedback = 'Loading diagram requirements... Please wait.'
    return result
  }

  // Track which required forces have been matched
  const matchedRequiredTypes = new Set<ForceType>()

  // 1. Check all required forces are present and correctly oriented
  for (const req of required) {
    // Find placed forces of this type
    const matches = placed.filter(p => p.type === req.type)

    if (matches.length === 0) {
      result.missingForces.push(req.type)
      result.isValid = false
      continue
    }

    // Check if any match has correct direction
    const hasCorrectDirection = matches.some(m => isDirectionCorrect(m, req, scenario))

    if (!hasCorrectDirection) {
      const bestMatch = matches[0]
      result.incorrectDirections.push({
        force: req.type,
        expected: req.direction,
        got: angleToDirection(bestMatch.angle)
      })
      result.isValid = false
    }

    matchedRequiredTypes.add(req.type)
  }

  // 2. Check for extra forces (not required)
  const requiredTypes = new Set(required.map(r => r.type))
  for (const p of placed) {
    if (!requiredTypes.has(p.type)) {
      if (!result.extraForces.includes(p.type)) {
        result.extraForces.push(p.type)
      }
    }
  }

  // 3. Generate feedback
  result.feedback = generateFeedback(result)

  return result
}

// ============================================
// Hint Generation
// ============================================

/**
 * Generate progressive hints based on what's wrong
 */
export function generateHint(
  result: FBDValidationResult,
  attemptCount: number,
  scenario: DiagramStepData
): string {
  // First hint: general guidance
  if (attemptCount === 1) {
    if (result.missingForces.length > 0) {
      return "Think about all the forces acting on the object. What's touching it? What's pulling on it?"
    }
    if (result.incorrectDirections.length > 0) {
      return 'Check the directions of your forces. Remember: Normal forces are perpendicular to surfaces.'
    }
  }

  // Second hint: more specific
  if (attemptCount === 2) {
    if (result.missingForces.length > 0) {
      const missing = result.missingForces[0]
      switch (missing) {
        case 'weight':
          return 'Every object with mass has weight. Which direction does gravity pull?'
        case 'normal':
          return 'When an object touches a surface, the surface pushes back. This is the normal force.'
        case 'friction':
          return 'If the object is on a surface and tends to slide, what opposes that motion?'
        case 'tension':
          return 'Is there a rope or string? What force does it exert on the object?'
        default:
          return `You're missing the ${FORCE_METADATA[missing].name} force.`
      }
    }
    if (result.incorrectDirections.length > 0) {
      const error = result.incorrectDirections[0]
      switch (error.force) {
        case 'weight':
          return "Weight (gravity) always points straight down toward Earth's center."
        case 'normal':
          if (scenario.scenarioType === 'incline') {
            return `On an incline, the normal force is perpendicular to the surface, not straight up.`
          }
          return 'The normal force points away from the surface, perpendicular to it.'
        case 'friction':
          return 'Friction acts parallel to the surface, opposing the direction of (potential) motion.'
        default:
          return `Check the direction of the ${FORCE_METADATA[error.force].name} force.`
      }
    }
  }

  // Third+ hint: very specific
  if (result.missingForces.length > 0) {
    const missing = result.missingForces[0]
    return `Add the ${FORCE_METADATA[missing].name} (${FORCE_METADATA[missing].defaultLabel}) force to your diagram.`
  }

  if (result.incorrectDirections.length > 0) {
    const error = result.incorrectDirections[0]
    const expectedDir = error.expected === 'perpendicular-surface'
      ? `perpendicular to the ${scenario.surfaceAngle}° incline`
      : error.expected === 'along-surface'
      ? 'parallel to the surface'
      : error.expected
    return `The ${FORCE_METADATA[error.force].name} force should point ${expectedDir}.`
  }

  return 'Check all forces are correctly placed and oriented.'
}
