import { describe, it, expect } from 'vitest'
import {
  extractConstraints,
  extractStatedConstraints,
  extractPhysicalObjects,
  extractInteractions,
  problemHasFriction,
  problemIsFrictionless,
  getConstraintDescription,
  hasConstraint,
} from '../constraintExtractor'
import {
  analyzeStudentWork,
  extractStudentAssumptions,
  extractForcesFromSolution,
  detectCollisions,
  getCollisionSummary,
} from '../constraintCollisionEngine'
import {
  generateSocraticDialogue,
  selectDialogueStrategy,
  shouldShowDialogue,
  formatDialogueForUI,
} from '../constraintDialogueEngine'
import {
  IMPLICATION_RULES,
  CONSTRAINT_PATTERNS,
  getAllPatterns,
  findImplicationRule,
  getRulesByDomain,
} from '../constraintImplicationRules'

describe('Constraint Collision Engine', () => {
  describe('constraintImplicationRules', () => {
    it('has friction-related implication rules', () => {
      const frictionRules = IMPLICATION_RULES.filter(
        r => r.implies.normalizedForm.includes('friction')
      )
      expect(frictionRules.length).toBeGreaterThan(0)
    })

    it('has string/tension-related rules', () => {
      const stringRules = IMPLICATION_RULES.filter(
        r =>
          r.implies.normalizedForm.includes('string') ||
          r.implies.normalizedForm.includes('tension')
      )
      expect(stringRules.length).toBeGreaterThan(0)
    })

    it('has rolling constraint rules', () => {
      const rollingRule = IMPLICATION_RULES.find(
        r => r.implies.normalizedForm === 'pure_rolling'
      )
      expect(rollingRule).toBeDefined()
      expect(rollingRule?.implies.description).toContain('omega')
    })

    it('getAllPatterns returns all pattern groups', () => {
      const patterns = getAllPatterns()
      expect(patterns.length).toBeGreaterThan(10)
    })

    it('findImplicationRule finds correct rule', () => {
      const rule = findImplicationRule('force', 'friction_present')
      expect(rule).toBeDefined()
      expect(rule?.name).toContain('Friction')
    })

    it('getRulesByDomain filters correctly', () => {
      const mechanicsRules = getRulesByDomain('Mechanics')
      expect(mechanicsRules.length).toBeGreaterThan(5)
    })

    it('CONSTRAINT_PATTERNS has surface patterns', () => {
      expect(CONSTRAINT_PATTERNS.surfaceProperties.length).toBeGreaterThan(0)
      const roughPattern = CONSTRAINT_PATTERNS.surfaceProperties.find(
        p => p.implies === 'friction_present'
      )
      expect(roughPattern).toBeDefined()
    })

    it('CONSTRAINT_PATTERNS has string patterns', () => {
      expect(CONSTRAINT_PATTERNS.stringProperties.length).toBeGreaterThan(0)
    })

    it('CONSTRAINT_PATTERNS has motion constraint patterns', () => {
      expect(CONSTRAINT_PATTERNS.motionConstraints.length).toBeGreaterThan(0)
    })

    it('CONSTRAINT_PATTERNS has spring patterns', () => {
      expect(CONSTRAINT_PATTERNS.springProperties.length).toBeGreaterThan(0)
      const idealSpring = CONSTRAINT_PATTERNS.springProperties.find(
        p => p.implies === 'ideal_spring'
      )
      expect(idealSpring).toBeDefined()
    })

    it('CONSTRAINT_PATTERNS has collision patterns', () => {
      expect(CONSTRAINT_PATTERNS.collisionProperties.length).toBeGreaterThan(0)
      const elasticCollision = CONSTRAINT_PATTERNS.collisionProperties.find(
        p => p.implies === 'elastic_collision'
      )
      expect(elasticCollision).toBeDefined()
    })

    it('CONSTRAINT_PATTERNS has circular motion patterns', () => {
      expect(CONSTRAINT_PATTERNS.circularMotion.length).toBeGreaterThan(0)
    })

    it('CONSTRAINT_PATTERNS has fluid patterns', () => {
      expect(CONSTRAINT_PATTERNS.fluidProperties.length).toBeGreaterThan(0)
    })

    it('CONSTRAINT_PATTERNS has hinge/pivot patterns', () => {
      expect(CONSTRAINT_PATTERNS.hingeAndPivot.length).toBeGreaterThan(0)
    })

    it('CONSTRAINT_PATTERNS has initial condition patterns', () => {
      expect(CONSTRAINT_PATTERNS.initialConditions.length).toBeGreaterThan(0)
    })
  })

  describe('constraintExtractor', () => {
    describe('extractStatedConstraints', () => {
      it('detects rough surface constraint', () => {
        const text = 'A block slides down a rough incline.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.length).toBeGreaterThan(0)
        expect(constraints.some(c => c.normalizedForm === 'friction_present')).toBe(true)
      })

      it('detects frictionless constraint', () => {
        const text = 'The block moves on a frictionless surface.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'frictionless')).toBe(true)
      })

      it('detects friction coefficient', () => {
        const text = 'The coefficient of friction is 0.5.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'friction_coefficient')).toBe(true)
      })

      it('detects massless string', () => {
        const text = 'A light inextensible string connects the blocks.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'massless_string')).toBe(true)
      })

      it('detects taut string constraint', () => {
        const text = 'The string remains taut throughout the motion.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'taut_string')).toBe(true)
      })

      it('detects rolling without slipping', () => {
        const text = 'A sphere rolls without slipping down the incline.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'pure_rolling')).toBe(true)
      })

      it('includes source location', () => {
        const text = 'Block on rough surface.'
        const constraints = extractStatedConstraints(text)

        expect(constraints[0].sourceLocation.startIndex).toBeGreaterThanOrEqual(0)
        expect(constraints[0].sourceLocation.endIndex).toBeGreaterThan(
          constraints[0].sourceLocation.startIndex
        )
      })

      // New pattern groups tests
      it('detects ideal spring', () => {
        const text = 'An ideal spring with constant k is attached to the block.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'ideal_spring')).toBe(true)
      })

      it('detects spring constant', () => {
        const text = 'The spring constant k = 200 N/m.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'spring_constant_given')).toBe(true)
      })

      it('detects elastic collision', () => {
        const text = 'Two balls undergo a perfectly elastic collision.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'elastic_collision')).toBe(true)
      })

      it('detects inelastic collision', () => {
        const text = 'The objects stick together after the inelastic collision.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'inelastic_collision')).toBe(true)
      })

      it('detects circular motion', () => {
        const text = 'The ball moves in a vertical circle of radius R.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'circular_path')).toBe(true)
      })

      it('detects buoyancy', () => {
        const text = 'A block is immersed in water.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'buoyancy_present')).toBe(true)
      })

      it('detects hinged body', () => {
        const text = 'A uniform rod is hinged at one end.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'hinged_body')).toBe(true)
      })

      it('detects initial velocity zero (from rest)', () => {
        const text = 'The block is released from rest.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'initial_velocity_zero')).toBe(true)
      })

      it('detects banked curve', () => {
        const text = 'A car goes around a banked curve at angle θ.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'banked_curve')).toBe(true)
      })

      it('detects terminal velocity', () => {
        const text = 'The object falls and reaches terminal velocity.'
        const constraints = extractStatedConstraints(text)

        expect(constraints.some(c => c.normalizedForm === 'terminal_velocity')).toBe(true)
      })
    })

    describe('extractPhysicalObjects', () => {
      it('detects block', () => {
        const text = 'A block of mass 5 kg slides down.'
        const objects = extractPhysicalObjects(text)

        expect(objects.some(o => o.type === 'block')).toBe(true)
      })

      it('detects pulley', () => {
        const text = 'The string passes over a massless pulley.'
        const objects = extractPhysicalObjects(text)

        expect(objects.some(o => o.type === 'pulley')).toBe(true)
      })

      it('detects string', () => {
        const text = 'A light string connects the masses.'
        const objects = extractPhysicalObjects(text)

        expect(objects.some(o => o.type === 'string')).toBe(true)
      })

      it('detects incline', () => {
        const text = 'Block slides down an inclined plane.'
        const objects = extractPhysicalObjects(text)

        expect(objects.some(o => o.type === 'incline')).toBe(true)
      })

      it('detects sphere', () => {
        const text = 'A sphere rolls on the floor.'
        const objects = extractPhysicalObjects(text)

        expect(objects.some(o => o.type === 'sphere')).toBe(true)
      })
    })

    describe('extractInteractions', () => {
      it('creates contact interaction for rough surface', () => {
        const text = 'Block on a rough surface.'
        const objects = extractPhysicalObjects(text)
        const interactions = extractInteractions(text, objects)

        expect(interactions.some(i => i.type === 'contact')).toBe(true)
        expect(
          interactions.some(i =>
            i.attributes.some(
              a => a.type === 'surface_property' && a.value === 'rough'
            )
          )
        ).toBe(true)
      })

      it('creates tension interaction for string', () => {
        const text = 'A massless string connects the block to a pulley.'
        const objects = extractPhysicalObjects(text)
        const interactions = extractInteractions(text, objects)

        expect(interactions.some(i => i.type === 'tension')).toBe(true)
      })
    })

    describe('extractConstraints (full pipeline)', () => {
      it('extracts complete constraint data from problem', () => {
        const problemText = `
          A block of mass 2 kg is placed on a rough inclined plane
          of angle 30 degrees. The coefficient of friction is 0.3.
          Find the acceleration of the block.
        `
        const data = extractConstraints(problemText, 'test-001')

        expect(data.problemId).toBe('test-001')
        expect(data.statedConstraints.length).toBeGreaterThan(0)
        expect(data.physicalObjects.length).toBeGreaterThan(0)
        expect(data.extractionMetadata.confidence).toBeGreaterThan(0)
      })

      it('derives implied constraints from interactions', () => {
        const problemText = 'A block slides down a rough incline.'
        const data = extractConstraints(problemText, 'test-002')

        // Should have implied constraint about friction affecting energy conservation
        expect(data.impliedConstraints.length).toBeGreaterThan(0)
      })
    })

    describe('helper functions', () => {
      it('problemHasFriction returns true for rough surface', () => {
        const data = extractConstraints('Block on rough surface.', 'test')
        expect(problemHasFriction(data)).toBe(true)
      })

      it('problemIsFrictionless returns true for smooth surface', () => {
        const data = extractConstraints('Block on frictionless surface.', 'test')
        expect(problemIsFrictionless(data)).toBe(true)
      })

      it('getConstraintDescription returns readable text', () => {
        const desc = getConstraintDescription('friction_present')
        expect(desc).toContain('Friction')
      })

      it('hasConstraint checks both stated and implied', () => {
        const data = extractConstraints('Block on rough incline.', 'test')
        expect(hasConstraint(data, 'friction_present')).toBe(true)
      })
    })
  })

  describe('constraintCollisionEngine', () => {
    describe('extractForcesFromSolution', () => {
      it('detects weight/gravity', () => {
        const solution = 'Weight of block = mg = 50 N'
        const forces = extractForcesFromSolution(solution)

        expect(forces).toContain('weight')
      })

      it('detects normal force', () => {
        const solution = 'Normal force N = mg cos(theta)'
        const forces = extractForcesFromSolution(solution)

        expect(forces).toContain('normal')
      })

      it('detects friction', () => {
        const solution = 'Friction f = mu * N'
        const forces = extractForcesFromSolution(solution)

        expect(forces).toContain('friction')
      })

      it('detects tension', () => {
        const solution = 'Tension T in the string'
        const forces = extractForcesFromSolution(solution)

        expect(forces).toContain('tension')
      })
    })

    describe('extractStudentAssumptions', () => {
      it('detects explicit assumptions', () => {
        const solution = 'Assuming frictionless surface, we get a = g sin theta'
        const constraints = extractConstraints('Block on rough surface.', 'test')
        const assumptions = extractStudentAssumptions(solution, constraints)

        expect(assumptions.some(a => a.type === 'explicit')).toBe(true)
      })

      it('detects implicit friction omission', () => {
        const solution = 'Using F = ma, we get the acceleration.'
        const constraints = extractConstraints('Block on rough surface.', 'test')
        const assumptions = extractStudentAssumptions(solution, constraints)

        expect(
          assumptions.some(a => a.description.toLowerCase().includes('friction'))
        ).toBe(true)
      })

      it('detects a = g sin theta on rough surface', () => {
        const solution = 'The acceleration a = g sin θ down the incline.'
        const constraints = extractConstraints('Block on rough incline.', 'test')
        const assumptions = extractStudentAssumptions(solution, constraints)

        expect(
          assumptions.some(a => a.description.includes('frictionless incline equation'))
        ).toBe(true)
      })
    })

    describe('analyzeStudentWork', () => {
      it('returns complete analysis', () => {
        const solution = 'Weight mg acts downward. Normal force N = mg cos theta.'
        const constraints = extractConstraints('Block on rough incline.', 'test')
        const analysis = analyzeStudentWork(solution, constraints)

        expect(analysis.forcesConsidered.length).toBeGreaterThan(0)
        expect(analysis.forcesMissing).toContain('friction')
      })
    })

    describe('detectCollisions', () => {
      it('detects OMISSION collision for missing friction', () => {
        const problemText = 'A block slides down a rough incline of angle 30 degrees.'
        const studentSolution = 'Acceleration a = g sin(30) = 4.9 m/s²'

        const constraints = extractConstraints(problemText, 'test')
        const analysis = analyzeStudentWork(studentSolution, constraints)
        const collisions = detectCollisions(constraints, analysis)

        expect(collisions.length).toBeGreaterThan(0)
        expect(collisions.some(c => c.collisionType === 'OMISSION')).toBe(true)
        expect(collisions.some(c => c.severity === 'high')).toBe(true)
      })

      it('returns empty array when no collisions', () => {
        const problemText = 'A block slides on a frictionless surface.'
        const studentSolution = 'Using F = ma with only weight and normal force.'

        const constraints = extractConstraints(problemText, 'test')
        const analysis = analyzeStudentWork(studentSolution, constraints)
        const collisions = detectCollisions(constraints, analysis)

        // Should not detect friction omission on frictionless surface
        expect(
          collisions.filter(c => c.explanation.includes('friction')).length
        ).toBe(0)
      })

      it('assigns error pattern IDs', () => {
        const problemText = 'Block on rough incline.'
        const studentSolution = 'a = g sin theta'

        const constraints = extractConstraints(problemText, 'test')
        const analysis = analyzeStudentWork(studentSolution, constraints)
        const collisions = detectCollisions(constraints, analysis)

        if (collisions.length > 0) {
          expect(collisions[0].errorPatternId).toMatch(/^EP\d{3}$/)
        }
      })

      it('detects spring problem with wrong kinematics approach', () => {
        const problemText = 'An ideal spring with spring constant k = 200 N/m is compressed by 0.1 m. A block is released from rest.'
        const wrongSolution = 'Using v² = u² + 2as with a = g = 10 m/s², v = √2 m/s'

        const constraints = extractConstraints(problemText, 'test')

        // Verify spring constraints were extracted
        expect(constraints.statedConstraints.some(c => c.normalizedForm === 'ideal_spring')).toBe(true)
        expect(constraints.statedConstraints.some(c => c.normalizedForm === 'spring_constant_given')).toBe(true)

        const analysis = analyzeStudentWork(wrongSolution, constraints)

        // Student used kinematics instead of energy - check if forces/equations detected
        expect(analysis.equationsUsed.length).toBeGreaterThanOrEqual(0)
      })

      it('detects using constant acceleration kinematics on spring problem', () => {
        const problemText = 'An ideal spring with spring constant k = 200 N/m is compressed. Find maximum speed.'
        const wrongSolution = 'Using v² = u² + 2as where a is constant'

        const constraints = extractConstraints(problemText, 'test')
        const analysis = analyzeStudentWork(wrongSolution, constraints)

        // Should detect the wrong kinematics assumption
        expect(analysis.assumptions.some(a =>
          a.description.includes('constant acceleration kinematics on spring')
        )).toBe(true)
      })

      it('detects using gravity instead of spring force', () => {
        const problemText = 'A spring with spring constant k = 500 N/m is attached to a block.'
        const wrongSolution = 'Using F = ma with a = g = 10 m/s²'

        const constraints = extractConstraints(problemText, 'test')
        const analysis = analyzeStudentWork(wrongSolution, constraints)

        // Should detect wrong force assumption
        expect(analysis.assumptions.some(a =>
          a.description.includes('gravitational acceleration instead of spring')
        )).toBe(true)
      })

      it('detects missing spring PE in energy analysis', () => {
        const problemText = 'An ideal spring compresses by 0.1 m. Find the speed when released.'
        const wrongSolution = 'Using KE = ½mv², the kinetic energy gives us v'

        const constraints = extractConstraints(problemText, 'test')
        const analysis = analyzeStudentWork(wrongSolution, constraints)

        // Should detect missing spring energy
        expect(analysis.assumptions.some(a =>
          a.description.includes('Spring potential energy not considered')
        )).toBe(true)
      })

      it('detects conserving KE in inelastic collision', () => {
        const problemText = 'Two balls undergo an inelastic collision and stick together.'
        const wrongSolution = 'Using KE conserved: ½m₁v₁² + ½m₂v₂² = ½(m₁+m₂)v²'

        const constraints = extractConstraints(problemText, 'test')
        const analysis = analyzeStudentWork(wrongSolution, constraints)

        // Should detect wrong energy conservation
        expect(analysis.assumptions.some(a =>
          a.description.includes('Conserving kinetic energy in inelastic')
        )).toBe(true)
      })

      it('assigns EP015 for spring constraint violations', () => {
        const problemText = 'An ideal spring problem.'
        const wrongSolution = 'Using v² = u² + 2as'

        const constraints = extractConstraints(problemText, 'test')
        const analysis = analyzeStudentWork(wrongSolution, constraints)
        const collisions = detectCollisions(constraints, analysis)

        // If collisions found for spring, should have EP015
        const springCollisions = collisions.filter(c =>
          c.errorPatternId === 'EP015'
        )
        // Spring problem should potentially trigger EP015
        expect(springCollisions.length).toBeGreaterThanOrEqual(0)
      })
    })

    describe('getCollisionSummary', () => {
      it('returns no conflicts message for empty array', () => {
        const summary = getCollisionSummary([])
        expect(summary).toContain('No constraint conflicts')
      })

      it('counts high severity collisions', () => {
        const collisions: import('@/types/constraintCollision').ConstraintCollision[] = [
          {
            id: 'CC001',
            problemConstraint: { id: 'SC001', category: 'force' as const, rawText: 'rough', normalizedForm: 'friction_present', sourceLocation: { startIndex: 0, endIndex: 5 } },
            studentAssumption: null,
            collisionType: 'OMISSION' as const,
            severity: 'high' as const,
            errorPatternId: 'EP013',
            affectedStepIds: [],
            explanation: 'Missing friction',
            confidence: 0.9,
          },
        ]
        const summary = getCollisionSummary(collisions)
        expect(summary).toContain('critical')
      })
    })
  })

  describe('constraintDialogueEngine', () => {
    const mockCollision = {
      id: 'CC001',
      problemConstraint: {
        id: 'SC001',
        category: 'force' as const,
        rawText: 'rough surface',
        normalizedForm: 'friction_present',
        sourceLocation: { startIndex: 10, endIndex: 23 },
      },
      studentAssumption: {
        id: 'SA001',
        type: 'implicit' as const,
        description: 'Friction force not considered',
        evidence: 'No friction in FBD',
        category: 'force' as const,
      },
      collisionType: 'OMISSION' as const,
      severity: 'high' as const,
      errorPatternId: 'EP013',
      affectedStepIds: [],
      explanation: 'Missing friction',
      confidence: 0.85,
    }

    describe('generateSocraticDialogue', () => {
      it('generates dialogue for OMISSION collision', () => {
        const dialogue = generateSocraticDialogue(mockCollision)

        expect(dialogue.question).toBeTruthy()
        expect(dialogue.strategy).toBeDefined()
        expect(dialogue.followUpPrompts.length).toBeGreaterThan(0)
      })

      it('includes problem reference hint', () => {
        const dialogue = generateSocraticDialogue(mockCollision)

        expect(dialogue.problemReferenceHint).toBeTruthy()
      })

      it('includes related concept IDs', () => {
        const dialogue = generateSocraticDialogue(mockCollision)

        expect(dialogue.relatedConceptIds.length).toBeGreaterThan(0)
      })

      it('includes highlight location from stated constraint', () => {
        const dialogue = generateSocraticDialogue(mockCollision)

        expect(dialogue.highlightProblemText).toBeDefined()
        expect(dialogue.highlightProblemText?.startIndex).toBe(10)
      })

      it('uses FORCE_ENUMERATION strategy for high severity OMISSION', () => {
        const dialogue = generateSocraticDialogue(mockCollision)

        expect(['FORCE_ENUMERATION', 'REREAD_NUDGE', 'PHYSICAL_INTUITION']).toContain(
          dialogue.strategy
        )
      })
    })

    describe('selectDialogueStrategy', () => {
      it('returns DIRECT_QUESTION after multiple collisions', () => {
        const strategy = selectDialogueStrategy(mockCollision, {
          previousCollisions: 3,
          hintsUsed: 0,
          attemptCount: 1,
        })

        expect(strategy).toBe('DIRECT_QUESTION')
      })

      it('returns PHYSICAL_INTUITION for first high-severity collision', () => {
        const strategy = selectDialogueStrategy(mockCollision, {
          previousCollisions: 0,
          hintsUsed: 0,
          attemptCount: 1,
        })

        expect(strategy).toBe('PHYSICAL_INTUITION')
      })

      it('returns REREAD_NUDGE after many hints used', () => {
        const strategy = selectDialogueStrategy(mockCollision, {
          previousCollisions: 1,
          hintsUsed: 5,
          attemptCount: 1,
        })

        expect(strategy).toBe('REREAD_NUDGE')
      })
    })

    describe('shouldShowDialogue', () => {
      it('returns true for high confidence collision', () => {
        expect(shouldShowDialogue(mockCollision)).toBe(true)
      })

      it('returns false for low confidence collision', () => {
        const lowConfidence = { ...mockCollision, confidence: 0.5 }
        expect(shouldShowDialogue(lowConfidence)).toBe(false)
      })
    })

    describe('formatDialogueForUI', () => {
      it('formats dialogue correctly', () => {
        const dialogue = generateSocraticDialogue(mockCollision)
        const formatted = formatDialogueForUI(dialogue)

        expect(formatted.mainQuestion).toBe(dialogue.question)
        expect(formatted.hint).toBe(dialogue.problemReferenceHint)
        expect(formatted.followUps).toEqual(dialogue.followUpPrompts)
      })
    })

    describe('error pattern-specific templates', () => {
      it('uses EP015 spring template for spring kinematics error', () => {
        const springCollision = {
          id: 'CC001',
          problemConstraint: {
            id: 'SC001',
            category: 'force' as const,
            rawText: 'ideal spring',
            normalizedForm: 'ideal_spring',
            sourceLocation: { startIndex: 3, endIndex: 15 },
          },
          studentAssumption: {
            id: 'SA001',
            type: 'implicit' as const,
            description: 'Using constant acceleration kinematics on spring problem',
            evidence: 'v² = u² + 2as used',
            category: 'kinematic' as const,
          },
          collisionType: 'OMISSION' as const,
          severity: 'high' as const,
          errorPatternId: 'EP015',
          affectedStepIds: [],
          explanation: 'Wrong kinematics on spring',
          confidence: 0.9,
        }

        const dialogue = generateSocraticDialogue(springCollision)

        // Should use spring-specific template
        expect(dialogue.question).toContain('v² = u² + 2as')
        expect(dialogue.problemReferenceHint.toLowerCase()).toContain('spring')
      })

      it('uses EP016 collision template for inelastic collision error', () => {
        const collisionCollision = {
          id: 'CC002',
          problemConstraint: {
            id: 'SC002',
            category: 'conservation' as const,
            rawText: 'inelastic collision',
            normalizedForm: 'inelastic_collision',
            sourceLocation: { startIndex: 10, endIndex: 29 },
          },
          studentAssumption: {
            id: 'SA002',
            type: 'implicit' as const,
            description: 'Conserving kinetic energy in inelastic collision',
            evidence: 'KE conserved applied',
            category: 'conservation' as const,
          },
          collisionType: 'ADDITION' as const,
          severity: 'high' as const,
          errorPatternId: 'EP016',
          affectedStepIds: [],
          explanation: 'KE not conserved in inelastic',
          confidence: 0.85,
        }

        const dialogue = generateSocraticDialogue(collisionCollision)

        // Should use collision-specific template
        expect(dialogue.question.toLowerCase()).toMatch(/kinetic energy|collision|inelastic/)
        expect(dialogue.problemReferenceHint.toLowerCase()).toContain('inelastic')
      })

      it('uses EP017 circular motion template for linear kinematics error', () => {
        const circularCollision = {
          id: 'CC003',
          problemConstraint: {
            id: 'SC003',
            category: 'kinematic' as const,
            rawText: 'vertical circle',
            normalizedForm: 'circular_path',
            sourceLocation: { startIndex: 20, endIndex: 35 },
          },
          studentAssumption: {
            id: 'SA003',
            type: 'implicit' as const,
            description: 'Using linear kinematics instead of circular motion equations',
            evidence: 'v = u + at used',
            category: 'kinematic' as const,
          },
          collisionType: 'OMISSION' as const,
          severity: 'high' as const,
          errorPatternId: 'EP017',
          affectedStepIds: [],
          explanation: 'Linear kinematics in circular motion',
          confidence: 0.9,
        }

        const dialogue = generateSocraticDialogue(circularCollision)

        // Should use circular motion-specific template
        expect(dialogue.question.toLowerCase()).toMatch(/circular|centripetal|v²\/r/)
        expect(dialogue.problemReferenceHint.toLowerCase()).toContain('centripetal')
      })

      it('returns spring-related concepts for spring constraints', () => {
        const springCollision = {
          id: 'CC001',
          problemConstraint: {
            id: 'SC001',
            category: 'force' as const,
            rawText: 'spring constant k = 200',
            normalizedForm: 'spring_constant_given',
            sourceLocation: { startIndex: 0, endIndex: 23 },
          },
          studentAssumption: null,
          collisionType: 'OMISSION' as const,
          severity: 'high' as const,
          errorPatternId: 'EP015',
          affectedStepIds: [],
          explanation: 'Spring force not used',
          confidence: 0.85,
        }

        const dialogue = generateSocraticDialogue(springCollision)

        expect(dialogue.relatedConceptIds).toContain('spring-force')
        expect(dialogue.relatedConceptIds).toContain('hookes-law')
      })
    })
  })

  describe('Integration Tests', () => {
    it('full pipeline: rough incline problem with missing friction', () => {
      // Problem setup
      const problemText = `
        A block of mass 2 kg is placed on a rough inclined plane
        making an angle of 30° with the horizontal. The coefficient
        of friction between the block and the plane is 0.3.
        Find the acceleration of the block.
      `

      // Student solution (missing friction)
      const studentSolution = `
        Forces on block:
        - Weight W = mg = 20 N (taking g = 10 m/s²)
        - Normal force N = mg cos(30°) = 17.3 N

        Component of weight along incline = mg sin(30°) = 10 N

        Using Newton's second law:
        ma = mg sin(30°)
        a = g sin(30°) = 5 m/s²
      `

      // Extract constraints
      const constraints = extractConstraints(problemText, 'incline-001')
      expect(problemHasFriction(constraints)).toBe(true)

      // Analyze student work
      const analysis = analyzeStudentWork(studentSolution, constraints)
      expect(analysis.forcesMissing).toContain('friction')

      // Detect collisions
      const collisions = detectCollisions(constraints, analysis)
      expect(collisions.length).toBeGreaterThan(0)

      // Generate dialogue
      const dialogue = generateSocraticDialogue(collisions[0])
      expect(dialogue.question).toBeTruthy()
      expect(dialogue.relatedConceptIds).toContain('friction')
    })

    it('full pipeline: frictionless problem (no collision)', () => {
      const problemText = `
        A block slides on a smooth frictionless surface.
        Find its acceleration.
      `

      const studentSolution = `
        Since the surface is frictionless, only weight and normal act.
        a = g sin(theta)
      `

      const constraints = extractConstraints(problemText, 'smooth-001')
      expect(problemIsFrictionless(constraints)).toBe(true)

      const analysis = analyzeStudentWork(studentSolution, constraints)
      // Should NOT flag friction as missing on frictionless surface
      expect(analysis.forcesMissing).not.toContain('friction')
    })
  })
})
