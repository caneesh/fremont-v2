/**
 * Constraint Collision Engine
 * Detects when student work contradicts problem constraints
 */

import type {
  ProblemConstraintData,
  StudentAssumption,
  StudentWorkAnalysis,
  ConstraintCollision,
  CollisionType,
  CollisionSeverity,
  StatedConstraint,
  ImpliedConstraint,
} from '@/types/constraintCollision'
import { IMPLICATION_RULES, CONSTRAINT_DESCRIPTIONS } from './constraintImplicationRules'
import {
  problemHasFriction,
  problemIsFrictionless,
  problemHasSpring,
  problemHasSpringConstant,
  problemHasCollision,
  problemHasCircularMotion,
} from './constraintExtractor'

/**
 * Analyze student work to extract assumptions
 */
export function analyzeStudentWork(
  studentSolution: string,
  problemConstraints: ProblemConstraintData
): StudentWorkAnalysis {
  const assumptions = extractStudentAssumptions(studentSolution, problemConstraints)
  const forcesConsidered = extractForcesFromSolution(studentSolution)
  const forcesMissing = determineForcesMissing(forcesConsidered, problemConstraints)
  const equationsUsed = extractEquationsUsed(studentSolution)

  return {
    assumptions,
    forcesConsidered,
    forcesMissing,
    equationsUsed,
  }
}

/**
 * Extract assumptions made by student in their solution
 */
export function extractStudentAssumptions(
  studentSolution: string,
  problemConstraints: ProblemConstraintData
): StudentAssumption[] {
  const assumptions: StudentAssumption[] = []
  let assumptionId = 1

  // Check for explicit assumptions stated by student
  const explicitPatterns = [
    { pattern: /assum(?:e|ing)\s+(?:that\s+)?(.+?)(?:\.|,|$)/gi, type: 'explicit' as const },
    { pattern: /(?:taking|let(?:ting)?)\s+(.+?)(?:\.|,|$)/gi, type: 'explicit' as const },
    { pattern: /neglect(?:ing)?\s+(.+?)(?:\.|,|$)/gi, type: 'explicit' as const },
    { pattern: /ignor(?:e|ing)\s+(.+?)(?:\.|,|$)/gi, type: 'explicit' as const },
  ]

  for (const { pattern, type } of explicitPatterns) {
    const matches = studentSolution.matchAll(pattern)
    for (const match of matches) {
      assumptions.push({
        id: `SA${String(assumptionId++).padStart(3, '0')}`,
        type,
        description: match[1].trim(),
        evidence: match[0],
        category: categorizeAssumption(match[1]),
      })
    }
  }

  // Check for implicit assumptions based on what's missing

  // If problem has friction but student doesn't mention it
  if (problemHasFriction(problemConstraints)) {
    const mentionsFriction = /friction|f\s*=\s*[μµ]|[μµ]\s*[mM]?g/i.test(studentSolution)
    if (!mentionsFriction) {
      assumptions.push({
        id: `SA${String(assumptionId++).padStart(3, '0')}`,
        type: 'implicit',
        description: 'Friction force not considered in solution',
        evidence: 'No mention of friction force in equations or FBD',
        category: 'force',
        affectsForces: ['friction'],
      })
    }
  }

  // If student uses a = g sin θ on a rough surface (classic error)
  if (problemHasFriction(problemConstraints)) {
    const usesSimpleIncline = /a\s*=\s*g\s*sin\s*[θϑ]|a\s*=\s*g\s*sinθ/i.test(studentSolution)
    if (usesSimpleIncline) {
      assumptions.push({
        id: `SA${String(assumptionId++).padStart(3, '0')}`,
        type: 'implicit',
        description: 'Using frictionless incline equation on rough surface',
        evidence: 'a = g sin θ (missing friction term)',
        category: 'force',
        affectsEquations: ['acceleration equation'],
      })
    }
  }

  // If problem is frictionless but student includes friction
  if (problemIsFrictionless(problemConstraints)) {
    const includesFriction = /friction|f\s*=\s*[μµ]/i.test(studentSolution)
    if (includesFriction) {
      assumptions.push({
        id: `SA${String(assumptionId++).padStart(3, '0')}`,
        type: 'implicit',
        description: 'Including friction on frictionless surface',
        evidence: 'Friction mentioned despite frictionless condition',
        category: 'force',
        affectsForces: ['friction'],
      })
    }
  }

  // Check for energy conservation misuse
  if (problemHasFriction(problemConstraints)) {
    const usesEnergyConservation =
      /(?:conservation\s+of\s+(?:mechanical\s+)?energy|KE\s*\+\s*PE\s*=\s*const)/i.test(
        studentSolution
      )
    if (usesEnergyConservation && !studentSolution.toLowerCase().includes('work done by friction')) {
      assumptions.push({
        id: `SA${String(assumptionId++).padStart(3, '0')}`,
        type: 'implicit',
        description: 'Using energy conservation without accounting for friction work',
        evidence: 'Energy conservation applied on system with friction',
        category: 'conservation',
        affectsEquations: ['energy equation'],
      })
    }
  }

  // ============================================
  // Spring-specific assumption detection
  // ============================================

  // Check if student uses constant acceleration kinematics on spring problem
  if (problemHasSpring(problemConstraints)) {
    const usesConstantAccelKinematics = /v²\s*=\s*u²\s*\+\s*2as|v\s*=\s*u\s*\+\s*at|s\s*=\s*ut\s*\+\s*½at²/i.test(
      studentSolution
    )
    const usesSpringEnergy = /(?:spring\s+)?(?:PE|potential\s+energy)\s*=\s*½?\s*k\s*x²|½kx²|kx²\/2/i.test(
      studentSolution
    )

    if (usesConstantAccelKinematics && !usesSpringEnergy) {
      assumptions.push({
        id: `SA${String(assumptionId++).padStart(3, '0')}`,
        type: 'implicit',
        description: 'Using constant acceleration kinematics on spring problem',
        evidence: 'Kinematic equations (v² = u² + 2as) used where acceleration varies with position',
        category: 'kinematic',
        affectsEquations: ['kinematics'],
      })
    }
  }

  // Check if student uses gravity instead of spring force
  if (problemHasSpringConstant(problemConstraints)) {
    const usesGravityAccel = /a\s*=\s*g\s*=|a\s*=\s*10\s*m\/s²|a\s*=\s*9\.8/i.test(studentSolution)
    const usesSpringForce = /F\s*=\s*k\s*x|F\s*=\s*-?\s*kx|spring\s+force/i.test(studentSolution)

    if (usesGravityAccel && !usesSpringForce) {
      assumptions.push({
        id: `SA${String(assumptionId++).padStart(3, '0')}`,
        type: 'implicit',
        description: 'Using gravitational acceleration instead of spring force',
        evidence: 'a = g used when spring constant k is given',
        category: 'force',
        affectsForces: ['spring'],
        affectsEquations: ['F = ma'],
      })
    }
  }

  // Check if student ignores spring potential energy
  if (problemHasSpring(problemConstraints)) {
    const mentionsSpringEnergy = /spring\s+(?:PE|energy)|½\s*k\s*x²|kx²|elastic\s+(?:PE|potential)/i.test(
      studentSolution
    )
    const mentionsKineticEnergy = /KE|kinetic\s+energy|½\s*m\s*v²|mv²/i.test(studentSolution)

    // If they use KE but not spring PE, they might be missing spring energy
    if (mentionsKineticEnergy && !mentionsSpringEnergy) {
      assumptions.push({
        id: `SA${String(assumptionId++).padStart(3, '0')}`,
        type: 'implicit',
        description: 'Spring potential energy not considered in energy analysis',
        evidence: 'Kinetic energy used but spring PE (½kx²) not mentioned',
        category: 'conservation',
        affectsEquations: ['energy equation'],
      })
    }
  }

  // ============================================
  // Collision-specific assumption detection
  // ============================================

  if (problemHasCollision(problemConstraints)) {
    // Check if student conserves KE for inelastic collision
    const hasInelasticCollision =
      problemConstraints.statedConstraints.some(c =>
        c.normalizedForm === 'inelastic_collision' ||
        c.normalizedForm === 'perfectly_inelastic'
      )
    const conservesKE = /KE.*conserved|kinetic\s+energy.*conserved|½m₁v₁²\s*\+\s*½m₂v₂²\s*=/i.test(
      studentSolution
    )

    if (hasInelasticCollision && conservesKE) {
      assumptions.push({
        id: `SA${String(assumptionId++).padStart(3, '0')}`,
        type: 'implicit',
        description: 'Conserving kinetic energy in inelastic collision',
        evidence: 'KE conservation applied to inelastic collision (only momentum is conserved)',
        category: 'conservation',
        affectsEquations: ['energy equation'],
      })
    }
  }

  // ============================================
  // Circular motion-specific assumption detection
  // ============================================

  if (problemHasCircularMotion(problemConstraints)) {
    // Check if student forgets centripetal acceleration
    const mentionsCentripetalAccel = /v²\/r|ω²r|centripetal|a_c|a_r/i.test(studentSolution)
    const usesLinearKinematics = /v\s*=\s*u\s*\+\s*at|a\s*=.*constant/i.test(studentSolution)

    if (usesLinearKinematics && !mentionsCentripetalAccel) {
      assumptions.push({
        id: `SA${String(assumptionId++).padStart(3, '0')}`,
        type: 'implicit',
        description: 'Using linear kinematics instead of circular motion equations',
        evidence: 'Linear acceleration used when centripetal acceleration (v²/r) needed',
        category: 'kinematic',
        affectsEquations: ['kinematics'],
      })
    }
  }

  return assumptions
}

/**
 * Extract forces mentioned in student solution
 */
export function extractForcesFromSolution(studentSolution: string): string[] {
  const forces: string[] = []
  const forcePatterns = [
    { pattern: /(?:weight|gravity|mg)/i, force: 'weight' },
    { pattern: /normal\s*(?:force)?|N(?:\s*=)?/i, force: 'normal' },
    { pattern: /friction|f\s*=\s*[μµ]/i, force: 'friction' },
    { pattern: /tension|T(?:\s*=)?/i, force: 'tension' },
    { pattern: /applied\s*(?:force)?|F(?:_?a)?(?:\s*=)?/i, force: 'applied' },
    { pattern: /spring\s*(?:force)?|F\s*=\s*-?\s*k\s*x|k\s*x/i, force: 'spring' },
    { pattern: /centripetal|mv²\/r|mω²r/i, force: 'centripetal' },
    { pattern: /buoyant|buoyancy|ρVg/i, force: 'buoyant' },
  ]

  for (const { pattern, force } of forcePatterns) {
    if (pattern.test(studentSolution)) {
      forces.push(force)
    }
  }

  return forces
}

/**
 * Determine which forces should be present but are missing
 */
export function determineForcesMissing(
  forcesConsidered: string[],
  problemConstraints: ProblemConstraintData
): string[] {
  const missing: string[] = []

  // Check if friction should be present
  if (problemHasFriction(problemConstraints) && !forcesConsidered.includes('friction')) {
    missing.push('friction')
  }

  // Check if spring force should be present
  if (problemHasSpring(problemConstraints) && !forcesConsidered.includes('spring')) {
    missing.push('spring')
  }

  // Check if tension should be present (string/rope in problem)
  const hasString = problemConstraints.physicalObjects.some(
    o => o.type === 'string' || o.type === 'rope'
  )
  if (hasString && !forcesConsidered.includes('tension')) {
    missing.push('tension')
  }

  // Check if centripetal force should be present
  if (problemHasCircularMotion(problemConstraints) && !forcesConsidered.includes('centripetal')) {
    missing.push('centripetal')
  }

  return missing
}

/**
 * Extract equations used in student solution
 */
export function extractEquationsUsed(studentSolution: string): string[] {
  const equations: string[] = []

  if (/F\s*=\s*m\s*a/i.test(studentSolution)) {
    equations.push("Newton's second law")
  }
  if (/KE|kinetic\s+energy|½\s*m\s*v/i.test(studentSolution)) {
    equations.push('Kinetic energy')
  }
  if (/PE|potential\s+energy|m\s*g\s*h/i.test(studentSolution)) {
    equations.push('Potential energy')
  }
  if (/conservation/i.test(studentSolution)) {
    equations.push('Conservation law')
  }
  if (/τ|torque|I\s*α/i.test(studentSolution)) {
    equations.push('Rotational dynamics')
  }

  return equations
}

/**
 * Categorize an assumption
 */
function categorizeAssumption(assumptionText: string): StudentAssumption['category'] {
  const text = assumptionText.toLowerCase()

  if (text.includes('friction') || text.includes('force') || text.includes('tension')) {
    return 'force'
  }
  if (text.includes('velocity') || text.includes('acceleration') || text.includes('slip')) {
    return 'kinematic'
  }
  if (text.includes('energy') || text.includes('momentum') || text.includes('conserv')) {
    return 'conservation'
  }
  if (text.includes('small') || text.includes('neglect') || text.includes('approximate')) {
    return 'approximation'
  }

  return 'boundary'
}

/**
 * Detect collisions between problem constraints and student assumptions
 */
export function detectCollisions(
  problemConstraints: ProblemConstraintData,
  studentAnalysis: StudentWorkAnalysis
): ConstraintCollision[] {
  const collisions: ConstraintCollision[] = []
  let collisionId = 1

  // Check for OMISSION collisions (student missed required constraint)
  for (const implied of problemConstraints.impliedConstraints) {
    const rule = IMPLICATION_RULES.find(r => r.id === implied.implicationRule)
    if (!rule) continue

    // Check if this constraint was violated by student
    const violatingAssumption = findViolatingAssumption(
      rule.implies.normalizedForm,
      studentAnalysis
    )

    if (violatingAssumption) {
      collisions.push({
        id: `CC${String(collisionId++).padStart(3, '0')}`,
        problemConstraint: implied,
        studentAssumption: violatingAssumption,
        collisionType: determineCollisionType(rule.implies.normalizedForm, violatingAssumption),
        severity: determineSeverity(rule.implies.normalizedForm, violatingAssumption),
        errorPatternId: mapToErrorPattern(rule.implies.normalizedForm),
        affectedStepIds: [],
        explanation: generateCollisionExplanation(implied, violatingAssumption),
        confidence: 0.85,
      })
    }
  }

  // Check for OMISSION based on missing forces
  for (const missingForce of studentAnalysis.forcesMissing) {
    const relatedConstraint = findConstraintForForce(missingForce, problemConstraints)
    if (relatedConstraint) {
      collisions.push({
        id: `CC${String(collisionId++).padStart(3, '0')}`,
        problemConstraint: relatedConstraint,
        studentAssumption: null,
        collisionType: 'OMISSION',
        severity: 'high',
        errorPatternId: 'EP013',
        affectedStepIds: [],
        explanation: `Missing ${missingForce} force in analysis despite problem requiring it`,
        confidence: 0.9,
      })
    }
  }

  // Check for ADDITION collisions (student added invalid constraint)
  for (const assumption of studentAnalysis.assumptions) {
    if (assumption.type === 'implicit' && isInvalidAssumption(assumption, problemConstraints)) {
      const contradictedConstraint = findContradictedConstraint(assumption, problemConstraints)
      if (contradictedConstraint) {
        collisions.push({
          id: `CC${String(collisionId++).padStart(3, '0')}`,
          problemConstraint: contradictedConstraint,
          studentAssumption: assumption,
          collisionType: 'ADDITION',
          severity: 'high',
          errorPatternId: 'EP014',
          affectedStepIds: [],
          explanation: generateAdditionExplanation(assumption, contradictedConstraint),
          confidence: 0.8,
        })
      }
    }
  }

  return collisions
}

/**
 * Find assumption that violates a constraint
 */
function findViolatingAssumption(
  normalizedForm: string,
  studentAnalysis: StudentWorkAnalysis
): StudentAssumption | null {
  // Friction-related violations
  if (normalizedForm === 'friction_present') {
    return (
      studentAnalysis.assumptions.find(
        a =>
          a.description.toLowerCase().includes('friction not considered') ||
          a.description.toLowerCase().includes('frictionless') ||
          a.description.toLowerCase().includes('using frictionless')
      ) || null
    )
  }

  // Energy conservation violations
  if (normalizedForm === 'energy_not_conserved') {
    return (
      studentAnalysis.assumptions.find(a =>
        a.description.toLowerCase().includes('energy conservation without')
      ) || null
    )
  }

  // Spring-related violations
  if (normalizedForm === 'ideal_spring' || normalizedForm === 'spring_constant_given') {
    return (
      studentAnalysis.assumptions.find(
        a =>
          a.description.toLowerCase().includes('constant acceleration kinematics on spring') ||
          a.description.toLowerCase().includes('gravitational acceleration instead of spring') ||
          a.description.toLowerCase().includes('spring potential energy not considered')
      ) || null
    )
  }

  // Collision-related violations
  if (normalizedForm === 'inelastic_collision' || normalizedForm === 'perfectly_inelastic') {
    return (
      studentAnalysis.assumptions.find(a =>
        a.description.toLowerCase().includes('conserving kinetic energy in inelastic')
      ) || null
    )
  }

  // Circular motion violations
  if (normalizedForm === 'circular_motion' || normalizedForm === 'circular_path') {
    return (
      studentAnalysis.assumptions.find(a =>
        a.description.toLowerCase().includes('linear kinematics instead of circular')
      ) || null
    )
  }

  return null
}

/**
 * Determine collision type based on constraint and assumption
 */
function determineCollisionType(
  normalizedForm: string,
  assumption: StudentAssumption
): CollisionType {
  if (assumption.description.toLowerCase().includes('not considered')) {
    return 'OMISSION'
  }
  if (assumption.description.toLowerCase().includes('including')) {
    return 'ADDITION'
  }
  if (
    assumption.description.toLowerCase().includes('wrong') ||
    assumption.description.toLowerCase().includes('opposite')
  ) {
    return 'REVERSAL'
  }
  return 'OMISSION'
}

/**
 * Determine severity of collision
 */
function determineSeverity(
  normalizedForm: string,
  assumption: StudentAssumption
): CollisionSeverity {
  // High severity for force-related omissions (changes the answer)
  if (normalizedForm === 'friction_present' && assumption.category === 'force') {
    return 'high'
  }

  // High severity for conservation law misuse
  if (normalizedForm === 'energy_not_conserved' && assumption.category === 'conservation') {
    return 'high'
  }

  // High severity for spring-related errors (fundamentally wrong approach)
  if (
    (normalizedForm === 'ideal_spring' || normalizedForm === 'spring_constant_given') &&
    (assumption.category === 'kinematic' || assumption.category === 'force')
  ) {
    return 'high'
  }

  // High severity for collision type errors
  if (
    (normalizedForm === 'inelastic_collision' || normalizedForm === 'elastic_collision') &&
    assumption.category === 'conservation'
  ) {
    return 'high'
  }

  // High severity for circular motion errors
  if (
    (normalizedForm === 'circular_motion' || normalizedForm === 'circular_path') &&
    assumption.category === 'kinematic'
  ) {
    return 'high'
  }

  // Medium severity for kinematic constraints
  if (assumption.category === 'kinematic') {
    return 'medium'
  }

  return 'medium'
}

/**
 * Map constraint violation to existing error pattern
 */
function mapToErrorPattern(normalizedForm: string): string {
  const patternMap: Record<string, string> = {
    // Friction
    friction_present: 'EP013', // CONSTRAINT_OMISSION
    frictionless: 'EP014', // CONSTRAINT_CONTRADICTION

    // Energy/Conservation
    energy_not_conserved: 'EP002', // CONSERVATION_MISAPPLICATION

    // Rolling/String constraints
    pure_rolling: 'EP010', // BOUNDARY_CONDITIONS
    taut_string: 'EP010', // BOUNDARY_CONDITIONS

    // Spring-related
    ideal_spring: 'EP015', // SPRING_KINEMATICS_ERROR (new)
    spring_constant_given: 'EP015', // SPRING_KINEMATICS_ERROR
    spring_deformation_given: 'EP015', // SPRING_KINEMATICS_ERROR

    // Collision-related
    elastic_collision: 'EP016', // COLLISION_CONSERVATION_ERROR (new)
    inelastic_collision: 'EP016', // COLLISION_CONSERVATION_ERROR
    perfectly_inelastic: 'EP016', // COLLISION_CONSERVATION_ERROR

    // Circular motion
    circular_motion: 'EP017', // CIRCULAR_MOTION_ERROR (new)
    circular_path: 'EP017', // CIRCULAR_MOTION_ERROR
    banked_curve: 'EP017', // CIRCULAR_MOTION_ERROR
  }

  return patternMap[normalizedForm] || 'EP013'
}

/**
 * Generate explanation for collision
 */
function generateCollisionExplanation(
  constraint: StatedConstraint | ImpliedConstraint,
  assumption: StudentAssumption
): string {
  const constraintDesc =
    'description' in constraint ? constraint.description : constraint.rawText

  return `Problem indicates "${constraintDesc}" but student's work shows "${assumption.description}"`
}

/**
 * Check if student's assumption contradicts problem
 */
function isInvalidAssumption(
  assumption: StudentAssumption,
  problemConstraints: ProblemConstraintData
): boolean {
  // If student includes friction on frictionless surface
  if (assumption.description.toLowerCase().includes('including friction')) {
    return problemIsFrictionless(problemConstraints)
  }

  return false
}

/**
 * Find constraint that student's assumption contradicts
 */
function findContradictedConstraint(
  assumption: StudentAssumption,
  problemConstraints: ProblemConstraintData
): StatedConstraint | ImpliedConstraint | null {
  // If assumption is about friction on frictionless surface
  if (assumption.description.toLowerCase().includes('friction')) {
    return (
      problemConstraints.statedConstraints.find(c => c.normalizedForm === 'frictionless') ||
      null
    )
  }

  return null
}

/**
 * Generate explanation for ADDITION collision
 */
function generateAdditionExplanation(
  assumption: StudentAssumption,
  constraint: StatedConstraint | ImpliedConstraint
): string {
  const constraintDesc = 'rawText' in constraint ? constraint.rawText : constraint.description

  return `Student assumed "${assumption.description}" but problem states "${constraintDesc}"`
}

/**
 * Find constraint related to a missing force
 */
function findConstraintForForce(
  force: string,
  problemConstraints: ProblemConstraintData
): StatedConstraint | ImpliedConstraint | null {
  if (force === 'friction') {
    // Find friction-related constraint
    const stated = problemConstraints.statedConstraints.find(
      c => c.normalizedForm === 'friction_present' || c.normalizedForm === 'friction_coefficient'
    )
    if (stated) return stated

    return (
      problemConstraints.impliedConstraints.find(c => {
        const rule = IMPLICATION_RULES.find(r => r.id === c.implicationRule)
        return rule?.implies.normalizedForm === 'friction_present'
      }) || null
    )
  }

  if (force === 'spring') {
    // Find spring-related constraint
    const stated = problemConstraints.statedConstraints.find(
      c =>
        c.normalizedForm === 'ideal_spring' ||
        c.normalizedForm === 'spring_constant_given' ||
        c.normalizedForm === 'spring_deformation_given'
    )
    if (stated) return stated
  }

  if (force === 'centripetal') {
    // Find circular motion-related constraint
    const stated = problemConstraints.statedConstraints.find(
      c =>
        c.normalizedForm === 'circular_motion' ||
        c.normalizedForm === 'circular_path' ||
        c.normalizedForm === 'banked_curve' ||
        c.normalizedForm === 'conical_pendulum'
    )
    if (stated) return stated
  }

  if (force === 'tension') {
    // Find string-related constraint
    const stated = problemConstraints.statedConstraints.find(
      c =>
        c.normalizedForm === 'massless_string' ||
        c.normalizedForm === 'taut_string' ||
        c.normalizedForm === 'inextensible_string'
    )
    if (stated) return stated
  }

  return null
}

/**
 * Get collision summary for display
 */
export function getCollisionSummary(collisions: ConstraintCollision[]): string {
  if (collisions.length === 0) {
    return 'No constraint conflicts detected'
  }

  const highSeverity = collisions.filter(c => c.severity === 'high')
  const mediumSeverity = collisions.filter(c => c.severity === 'medium')

  let summary = ''
  if (highSeverity.length > 0) {
    summary += `${highSeverity.length} critical constraint conflict(s) found. `
  }
  if (mediumSeverity.length > 0) {
    summary += `${mediumSeverity.length} minor conflict(s) found.`
  }

  return summary.trim()
}
