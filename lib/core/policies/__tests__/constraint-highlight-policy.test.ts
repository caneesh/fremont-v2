/**
 * Constraint Highlight Policy Tests
 *
 * Tests for deterministic constraint detection and highlighting.
 */

import { describe, it, expect } from 'vitest'
import {
  detectConstraints,
  shouldHighlightConstraint,
  getConstraintById,
  getConstraintsByCategory,
  rankConstraintsByRelevance,
  generateConstraintHint,
  DEFAULT_CONSTRAINTS,
} from '../constraint-highlight-policy'
import {
  createConstraintSessionState,
  addConstraintsToStep,
  highlightConstraint,
  acknowledgeConstraint,
} from '../../entities/constraint-highlight'

describe('detectConstraints', () => {
  it('should detect frictionless constraint', () => {
    const result = detectConstraints(
      'A block slides down a frictionless inclined plane.'
    )

    expect(result.found).toBe(true)
    expect(result.constraints.length).toBeGreaterThanOrEqual(1)
    expect(result.constraints.some(c => c.constraintId === 'frictionless')).toBe(true)
  })

  it('should detect constant velocity constraint', () => {
    const result = detectConstraints(
      'A car moves with constant velocity along a road.'
    )

    expect(result.found).toBe(true)
    expect(result.constraints.some(c => c.constraintId === 'constant-velocity')).toBe(
      true
    )
  })

  it('should detect multiple constraints', () => {
    const result = detectConstraints(
      'Two identical blocks connected by a massless rope slide on a frictionless surface.'
    )

    expect(result.found).toBe(true)
    expect(result.constraints.length).toBeGreaterThanOrEqual(3)

    const constraintIds = result.constraints.map(c => c.constraintId)
    expect(constraintIds).toContain('frictionless')
    expect(constraintIds).toContain('massless-rope')
    expect(constraintIds).toContain('identical-objects')
  })

  it('should detect synonyms', () => {
    const result = detectConstraints(
      'A particle moves on a smooth surface.' // "smooth" is synonym for frictionless
    )

    expect(result.found).toBe(true)
    expect(result.constraints.some(c => c.constraintId === 'frictionless')).toBe(true)
  })

  it('should detect constraints in step prompt', () => {
    const result = detectConstraints(
      'A ball is thrown upward.',
      'Find the velocity at maximum height.'
    )

    expect(result.found).toBe(true)
    expect(result.constraints.some(c => c.constraintId === 'maximum-height')).toBe(true)
  })

  it('should return empty for text without constraints', () => {
    const result = detectConstraints('What is the capital of France?')

    expect(result.found).toBe(false)
    expect(result.constraints.length).toBe(0)
  })

  it('should be deterministic (same input = same output)', () => {
    const text = 'A frictionless pulley with a massless rope.'

    const result1 = detectConstraints(text)
    const result2 = detectConstraints(text)

    expect(result1.constraints.length).toBe(result2.constraints.length)
    expect(result1.constraints.map(c => c.constraintId)).toEqual(
      result2.constraints.map(c => c.constraintId)
    )
  })

  it('should record text positions', () => {
    const text = 'The surface is frictionless.'
    const result = detectConstraints(text)

    expect(result.found).toBe(true)
    const frictionless = result.constraints.find(
      c => c.constraintId === 'frictionless'
    )
    expect(frictionless).toBeDefined()
    expect(frictionless!.position.start).toBeGreaterThanOrEqual(0)
    expect(frictionless!.position.end).toBeGreaterThan(frictionless!.position.start)
  })
})

describe('shouldHighlightConstraint', () => {
  it('should highlight after wrong answer threshold', () => {
    let sessionState = createConstraintSessionState('test', 5)

    // Add constraints to step 0
    const constraints = detectConstraints(
      'A block slides on a frictionless surface.'
    ).constraints
    sessionState = addConstraintsToStep(sessionState, 0, [...constraints])

    const result = shouldHighlightConstraint(
      sessionState,
      0,
      1 // 1 wrong attempt
    )

    expect(result.shouldHighlight).toBe(true)
    expect(result.constraintId).toBeDefined()
    expect(result.reason).toBe('wrong_answer_constraint_likely')
  })

  it('should not highlight before threshold', () => {
    let sessionState = createConstraintSessionState('test', 5)

    const constraints = detectConstraints(
      'A block slides on a frictionless surface.'
    ).constraints
    sessionState = addConstraintsToStep(sessionState, 0, [...constraints])

    const result = shouldHighlightConstraint(
      sessionState,
      0,
      0 // 0 wrong attempts
    )

    expect(result.shouldHighlight).toBe(false)
  })

  it('should not highlight if all constraints acknowledged', () => {
    let sessionState = createConstraintSessionState('test', 5)

    const constraints = detectConstraints(
      'A block slides on a frictionless surface.'
    ).constraints
    sessionState = addConstraintsToStep(sessionState, 0, [...constraints])

    // Acknowledge all constraints
    for (const constraint of constraints) {
      sessionState = highlightConstraint(sessionState, 0, constraint.constraintId)
      sessionState = acknowledgeConstraint(sessionState, 0, constraint.constraintId)
    }

    const result = shouldHighlightConstraint(sessionState, 0, 5)

    expect(result.shouldHighlight).toBe(false)
    expect(result.reason).toBe('all_constraints_acknowledged')
  })

  it('should respect max highlights per step', () => {
    let sessionState = createConstraintSessionState('test', 5)

    const constraints = detectConstraints(
      'Two identical blocks connected by a massless rope slide on a frictionless surface.'
    ).constraints
    sessionState = addConstraintsToStep(sessionState, 0, [...constraints])

    // Highlight max number of constraints
    const maxHighlights = 2
    for (let i = 0; i < maxHighlights; i++) {
      const nextConstraint = constraints[i]
      if (nextConstraint) {
        sessionState = highlightConstraint(sessionState, 0, nextConstraint.constraintId)
      }
    }

    const result = shouldHighlightConstraint(sessionState, 0, 10)

    expect(result.shouldHighlight).toBe(false)
    expect(result.reason).toBe('already_highlighted')
  })
})

describe('getConstraintById', () => {
  it('should return constraint for valid ID', () => {
    const constraint = getConstraintById('frictionless')

    expect(constraint).toBeDefined()
    expect(constraint!.id).toBe('frictionless')
    expect(constraint!.keyword).toBe('frictionless')
  })

  it('should return null for invalid ID', () => {
    const constraint = getConstraintById('nonexistent')

    expect(constraint).toBeNull()
  })
})

describe('getConstraintsByCategory', () => {
  it('should return constraints for surface category', () => {
    const constraints = getConstraintsByCategory('surface')

    expect(constraints.length).toBeGreaterThan(0)
    expect(constraints.every(c => c.category === 'surface')).toBe(true)
  })

  it('should return constraints for energy category', () => {
    const constraints = getConstraintsByCategory('energy')

    expect(constraints.length).toBeGreaterThan(0)
    expect(constraints.every(c => c.category === 'energy')).toBe(true)
  })

  it('should return different constraints for different categories', () => {
    const surfaceConstraints = getConstraintsByCategory('surface')
    const energyConstraints = getConstraintsByCategory('energy')

    const surfaceIds = surfaceConstraints.map(c => c.id)
    const energyIds = energyConstraints.map(c => c.id)

    // No overlap
    expect(surfaceIds.some(id => energyIds.includes(id))).toBe(false)
  })
})

describe('rankConstraintsByRelevance', () => {
  it('should rank unacknowledged constraints higher', () => {
    const constraints = detectConstraints(
      'A block slides on a frictionless surface with constant velocity.'
    ).constraints

    // Mark one as acknowledged
    const modifiedConstraints = constraints.map((c, i) =>
      i === 0 ? { ...c, isAcknowledged: true } : c
    )

    const ranked = rankConstraintsByRelevance(modifiedConstraints, 'kinematics')

    // Unacknowledged should come first
    const firstUnacknowledgedIndex = ranked.findIndex(c => !c.isAcknowledged)
    const firstAcknowledgedIndex = ranked.findIndex(c => c.isAcknowledged)

    if (firstUnacknowledgedIndex >= 0 && firstAcknowledgedIndex >= 0) {
      expect(firstUnacknowledgedIndex).toBeLessThan(firstAcknowledgedIndex)
    }
  })

  it('should prioritize constraints matching error tags', () => {
    const constraints = detectConstraints(
      'Two blocks connected by a massless rope on a frictionless surface.'
    ).constraints

    const ranked = rankConstraintsByRelevance(
      constraints,
      'kinematics',
      ['connection'] // Error tag matching massless rope
    )

    // Connection-related constraint should be first or near first
    const connectionIndex = ranked.findIndex(c =>
      getConstraintById(c.constraintId)?.category === 'connection'
    )
    expect(connectionIndex).toBeLessThanOrEqual(1) // In top 2
  })
})

describe('generateConstraintHint', () => {
  it('should return basic hint', () => {
    const constraint = getConstraintById('frictionless')!
    const hint = generateConstraintHint(constraint)

    expect(hint).toBe(constraint.hint)
  })

  it('should include implication when user answer provided', () => {
    const constraint = getConstraintById('frictionless')!
    const hint = generateConstraintHint(constraint, { userAnswer: 'wrong' })

    expect(hint).toContain(constraint.hint)
    expect(hint).toContain(constraint.implication)
  })
})

describe('DEFAULT_CONSTRAINTS', () => {
  it('should have constraints for all categories', () => {
    const categories = [
      'surface',
      'motion',
      'connection',
      'force',
      'energy',
      'symmetry',
      'approximation',
    ]

    categories.forEach(category => {
      const constraints = DEFAULT_CONSTRAINTS.filter(c => c.category === category)
      expect(constraints.length).toBeGreaterThan(0)
    })
  })

  it('should have valid structure for all constraints', () => {
    DEFAULT_CONSTRAINTS.forEach(constraint => {
      expect(constraint.id).toBeDefined()
      expect(constraint.keyword.length).toBeGreaterThan(0)
      expect(constraint.displayText.length).toBeGreaterThan(0)
      expect(constraint.hint.length).toBeGreaterThan(0)
      expect(constraint.implication.length).toBeGreaterThan(0)
      expect(Array.isArray(constraint.synonyms)).toBe(true)
    })
  })

  it('should have unique IDs', () => {
    const ids = DEFAULT_CONSTRAINTS.map(c => c.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })
})
