/**
 * Constraint Highlight Policy
 *
 * Deterministic detection and highlighting of physics constraints.
 */

import type {
  ConstraintHighlight,
  ConstraintCategory,
  ProblemConstraint,
  TextPosition,
  ConstraintDetectionResult,
  ConstraintHighlightDecision,
  HighlightDecisionReason,
  ConstraintSessionState,
} from '@/types/constraintHighlight'
import {
  CONSTRAINT_POLICY_CONSTANTS,
  getUnacknowledgedConstraints,
  getNextConstraintToHighlight,
} from '../entities/constraint-highlight'

/**
 * Default constraint definitions - physics-specific
 */
export const DEFAULT_CONSTRAINTS: ConstraintHighlight[] = [
  // Surface constraints
  {
    id: 'frictionless',
    keyword: 'frictionless',
    displayText: 'Frictionless surface',
    hint: 'No friction means no energy loss to heat. The normal force acts perpendicular to the surface.',
    category: 'surface',
    synonyms: ['smooth surface', 'no friction', 'ideal surface'],
    implication: 'The friction coefficient μ = 0. Only normal force and gravity act on the object.',
  },
  {
    id: 'rough-surface',
    keyword: 'rough',
    displayText: 'Rough surface',
    hint: 'Friction is present. Consider both static and kinetic friction.',
    category: 'surface',
    synonyms: ['with friction', 'coefficient of friction'],
    implication: 'You need to consider friction force f = μN in your analysis.',
  },

  // Motion constraints
  {
    id: 'constant-velocity',
    keyword: 'constant velocity',
    displayText: 'Constant velocity',
    hint: 'If velocity is constant, acceleration is zero. Net force must be zero!',
    category: 'motion',
    synonyms: ['uniform motion', 'no acceleration', 'moving at constant speed'],
    implication: 'Σ F = 0. This is an equilibrium problem.',
  },
  {
    id: 'at-rest',
    keyword: 'at rest',
    displayText: 'Object at rest',
    hint: 'At rest means v = 0 and a = 0. Forces must be balanced.',
    category: 'motion',
    synonyms: ['stationary', 'equilibrium', 'not moving', 'remains at rest'],
    implication: 'Σ F = 0. Draw a free body diagram and balance all forces.',
  },
  {
    id: 'maximum-height',
    keyword: 'maximum height',
    displayText: 'Maximum height reached',
    hint: 'At maximum height, vertical velocity is zero momentarily.',
    category: 'motion',
    synonyms: ['highest point', 'peak', 'top of trajectory'],
    implication: 'At this instant, v_y = 0. Use this condition to solve.',
  },

  // Connection constraints
  {
    id: 'massless-rope',
    keyword: 'massless',
    displayText: 'Massless rope/string',
    hint: 'Tension is the same throughout a massless rope.',
    category: 'connection',
    synonyms: ['light rope', 'negligible mass rope', 'ideal string'],
    implication: 'Tension is uniform: T₁ = T₂. No force needed to accelerate the rope itself.',
  },
  {
    id: 'inextensible',
    keyword: 'inextensible',
    displayText: 'Inextensible rope',
    hint: 'The rope does not stretch. Connected objects have related accelerations.',
    category: 'connection',
    synonyms: ['does not stretch', 'rigid connection', 'fixed length'],
    implication: 'Constraint: a₁ = a₂ (or related by pulley geometry).',
  },

  // Force constraints
  {
    id: 'no-air-resistance',
    keyword: 'air resistance',
    displayText: 'Neglect air resistance',
    hint: 'Only gravity acts on the projectile. Use standard kinematic equations.',
    category: 'force',
    synonyms: ['ignore air drag', 'negligible air friction', 'in vacuum'],
    implication: 'The only force is gravity. a = g = 9.8 m/s² downward.',
  },
  {
    id: 'no-external-forces',
    keyword: 'no external force',
    displayText: 'No external forces',
    hint: 'This is an isolated system. Momentum is conserved!',
    category: 'force',
    synonyms: ['isolated system', 'closed system', 'internal forces only'],
    implication: 'Total momentum before = total momentum after.',
  },

  // Energy constraints
  {
    id: 'elastic-collision',
    keyword: 'elastic',
    displayText: 'Elastic collision',
    hint: 'Both momentum AND kinetic energy are conserved.',
    category: 'energy',
    synonyms: ['perfectly elastic', 'no energy loss'],
    implication: 'Use both: Σp_before = Σp_after AND KE_before = KE_after.',
  },
  {
    id: 'inelastic-collision',
    keyword: 'inelastic',
    displayText: 'Inelastic collision',
    hint: 'Only momentum is conserved. Kinetic energy is lost.',
    category: 'energy',
    synonyms: ['perfectly inelastic', 'stick together'],
    implication: 'Only use: Σp_before = Σp_after. Energy is NOT conserved.',
  },

  // Symmetry constraints
  {
    id: 'identical-objects',
    keyword: 'identical',
    displayText: 'Identical objects',
    hint: 'Same mass and properties simplifies the math. Look for symmetry!',
    category: 'symmetry',
    synonyms: ['equal masses', 'same mass', 'uniform objects'],
    implication: 'm₁ = m₂. The problem may have symmetric solutions.',
  },

  // Approximation constraints
  {
    id: 'small-angle',
    keyword: 'small angle',
    displayText: 'Small angle approximation',
    hint: 'For small θ: sin θ ≈ θ and cos θ ≈ 1 (in radians).',
    category: 'approximation',
    synonyms: ['small oscillation', 'small displacement'],
    implication: 'Use sin θ ≈ θ, cos θ ≈ 1, tan θ ≈ θ for simplification.',
  },
  {
    id: 'point-mass',
    keyword: 'point mass',
    displayText: 'Point mass/particle',
    hint: 'Treat the object as having no size. Ignore rotational effects.',
    category: 'approximation',
    synonyms: ['particle', 'negligible size', 'treat as point'],
    implication: 'No rotation or moment of inertia. Only translational motion.',
  },
]

/**
 * Detect constraints in problem text - DETERMINISTIC
 */
export function detectConstraints(
  problemText: string,
  stepPrompt?: string
): ConstraintDetectionResult {
  const textToSearch = `${problemText} ${stepPrompt || ''}`.toLowerCase()
  const foundConstraints: ProblemConstraint[] = []

  for (const constraint of DEFAULT_CONSTRAINTS) {
    // Check main keyword
    let position = findKeywordPosition(textToSearch, constraint.keyword)

    // Check synonyms if main keyword not found
    if (position === null && constraint.synonyms.length > 0) {
      for (const synonym of constraint.synonyms) {
        position = findKeywordPosition(textToSearch, synonym)
        if (position) break
      }
    }

    if (position) {
      foundConstraints.push({
        constraintId: constraint.id,
        keyword: constraint.keyword,
        position,
        isAcknowledged: false,
        wasHighlighted: false,
      })
    }
  }

  return {
    found: foundConstraints.length > 0,
    constraints: foundConstraints,
    totalFound: foundConstraints.length,
  }
}

/**
 * Find keyword position in text
 */
function findKeywordPosition(text: string, keyword: string): TextPosition | null {
  const keywordLower = keyword.toLowerCase()
  const index = text.indexOf(keywordLower)

  if (index === -1) {
    return null
  }

  return {
    start: index,
    end: index + keyword.length,
  }
}

/**
 * Decide whether to highlight a constraint - DETERMINISTIC
 */
export function shouldHighlightConstraint(
  sessionState: ConstraintSessionState,
  stepIndex: number,
  wrongAttemptCount: number
): ConstraintHighlightDecision {
  const unacknowledged = getUnacknowledgedConstraints(sessionState, stepIndex)

  // No constraints to highlight
  if (unacknowledged.length === 0) {
    return {
      shouldHighlight: false,
      reason: 'all_constraints_acknowledged',
    }
  }

  // Check if we've already highlighted too many
  const stepState = sessionState.stepStates[stepIndex]
  if (
    stepState &&
    stepState.highlightedConstraints.length >=
      CONSTRAINT_POLICY_CONSTANTS.MAX_CONSTRAINTS_TO_HIGHLIGHT
  ) {
    return {
      shouldHighlight: false,
      reason: 'already_highlighted',
    }
  }

  // Check wrong attempt threshold
  if (wrongAttemptCount >= CONSTRAINT_POLICY_CONSTANTS.WRONG_ATTEMPTS_BEFORE_HIGHLIGHT) {
    const nextConstraint = getNextConstraintToHighlight(sessionState, stepIndex)
    if (nextConstraint) {
      return {
        shouldHighlight: true,
        constraintId: nextConstraint.constraintId,
        reason: 'wrong_answer_constraint_likely',
      }
    }
  }

  return {
    shouldHighlight: false,
    reason: 'constraint_not_acknowledged',
  }
}

/**
 * Get constraint by ID
 */
export function getConstraintById(id: string): ConstraintHighlight | null {
  return DEFAULT_CONSTRAINTS.find(c => c.id === id) ?? null
}

/**
 * Get constraints by category
 */
export function getConstraintsByCategory(
  category: ConstraintCategory
): readonly ConstraintHighlight[] {
  return DEFAULT_CONSTRAINTS.filter(c => c.category === category)
}

/**
 * Check if a specific constraint is likely relevant to a wrong answer
 */
export function isConstraintRelevantToError(
  constraint: ConstraintHighlight,
  userAnswer: string,
  correctAnswer: string
): boolean {
  // This is a simplified check - in production would use more sophisticated analysis
  const userLower = userAnswer.toLowerCase()
  const correctLower = correctAnswer.toLowerCase()

  // Check if user's answer suggests they missed the constraint
  // For now, just check if answers are different
  if (userLower === correctLower) {
    return false
  }

  // Could add more sophisticated checks here based on constraint type
  // For example, if constraint is "frictionless" and user included friction...
  return true
}

/**
 * Rank constraints by relevance to the current step
 */
export function rankConstraintsByRelevance(
  constraints: readonly ProblemConstraint[],
  stepType: string,
  errorTags?: string[]
): readonly ProblemConstraint[] {
  // Create scoring function
  const scoreConstraint = (c: ProblemConstraint): number => {
    const constraint = getConstraintById(c.constraintId)
    if (!constraint) return 0

    let score = 0

    // Higher score for constraints matching error tags
    if (errorTags) {
      const matchesError = errorTags.some(tag =>
        constraint.category.includes(tag) ||
        constraint.keyword.includes(tag)
      )
      if (matchesError) score += 10
    }

    // Higher score for unacknowledged constraints
    if (!c.isAcknowledged) score += 5

    // Higher score for unhighlighted constraints
    if (!c.wasHighlighted) score += 3

    return score
  }

  // Sort by score descending
  return [...constraints].sort(
    (a, b) => scoreConstraint(b) - scoreConstraint(a)
  )
}

/**
 * Generate hint text for a constraint
 */
export function generateConstraintHint(
  constraint: ConstraintHighlight,
  context?: { stepPrompt?: string; userAnswer?: string }
): string {
  let hint = constraint.hint

  // Add implication if context suggests it would help
  if (context?.userAnswer) {
    hint += `\n\nRemember: ${constraint.implication}`
  }

  return hint
}

/**
 * Get all constraints that could affect a step's answer
 */
export function getRelevantConstraintsForStep(
  problemConstraints: readonly ProblemConstraint[],
  stepType: string
): readonly ProblemConstraint[] {
  // For now, return all constraints
  // In production, would filter based on step type and physics domain
  return problemConstraints
}
