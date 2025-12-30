/**
 * Constraint Dialogue Engine
 * Generates Socratic questions to guide students to discover constraint violations
 */

import type {
  ConstraintCollision,
  SocraticDialogue,
  DialogueStrategy,
  CollisionType,
  CollisionSeverity,
} from '@/types/constraintCollision'

/**
 * Dialogue template structure
 */
interface DialogueTemplate {
  strategy: DialogueStrategy
  question: string
  followUps: string[]
  problemHint: string
}

/**
 * Error pattern-specific dialogue templates
 * These override generic templates when a specific error pattern is detected
 */
const ERROR_PATTERN_TEMPLATES: Record<string, DialogueTemplate[]> = {
  // EP015: Spring kinematics error
  EP015: [
    {
      strategy: 'PHYSICAL_INTUITION',
      question:
        "I see you're using v² = u² + 2as. This equation assumes constant acceleration. In a spring system, is the acceleration constant?",
      followUps: [
        'What is the force from a spring? How does it depend on position?',
        'If F = -kx, and F = ma, what happens to acceleration as the object moves?',
        'When acceleration varies with position, what method should we use instead of kinematics?',
      ],
      problemHint:
        "Springs exert a force F = -kx that varies with position. This means acceleration isn't constant.",
    },
    {
      strategy: 'CONTRAST_PROMPT',
      question:
        "You've used a = g for the acceleration. But look at the problem - it gives you a spring constant k. What force does the spring exert?",
      followUps: [
        'The spring constant k tells us F = kx. Is gravity the relevant force here?',
        'What would be the correct way to find velocity when force varies with position?',
        'Have you considered using energy conservation: ½kx² = ½mv²?',
      ],
      problemHint:
        "When spring constant k is given, the problem expects you to use spring force F = kx, not gravity.",
    },
    {
      strategy: 'FORCE_ENUMERATION',
      question:
        "Let's identify the forces acting on the block. The problem mentions a spring with constant k. What force does this spring exert?",
      followUps: [
        'Write out F = kx. How does this force change as the block moves?',
        'Can we use constant acceleration equations when the force keeps changing?',
        'What physics principle works when force depends on position? (Hint: think energy)',
      ],
      problemHint:
        "The spring constant k is given for a reason - the spring force F = kx is the key force here.",
    },
    {
      strategy: 'REREAD_NUDGE',
      question:
        "The problem gives you spring constant k = {springConstant}. Why do you think this information was provided?",
      followUps: [
        'What can you calculate using the spring constant?',
        'Spring potential energy is ½kx². How does this help solve the problem?',
        'Energy methods are powerful when forces vary with position.',
      ],
      problemHint:
        "The given spring constant k points you toward using energy: PE = ½kx², KE = ½mv².",
    },
  ],

  // EP016: Collision conservation error
  EP016: [
    {
      strategy: 'CONTRAST_PROMPT',
      question:
        "You're conserving kinetic energy in this collision. But the problem says it's an {collisionType} collision. What does that tell us about energy?",
      followUps: [
        'In an inelastic collision, is kinetic energy conserved?',
        'What IS always conserved in collisions? (Hint: momentum)',
        'For perfectly inelastic collisions, the objects stick together. What equation can you write?',
      ],
      problemHint:
        "The word 'inelastic' is key - it means kinetic energy is NOT conserved, only momentum is.",
    },
    {
      strategy: 'PHYSICAL_INTUITION',
      question:
        'Think about what happens physically when two objects collide and stick together. Where does some of the kinetic energy go?',
      followUps: [
        'When objects deform or stick, energy is lost to heat, sound, and deformation.',
        'What quantity is always conserved regardless of collision type?',
        'Write the momentum conservation equation: m₁v₁ + m₂v₂ = (m₁+m₂)v_final',
      ],
      problemHint:
        'Inelastic collisions lose KE to deformation. Only momentum is conserved: Σp_before = Σp_after.',
    },
    {
      strategy: 'DIRECT_QUESTION',
      question:
        'The problem states this is an {collisionType} collision. Can you tell me what conservation laws apply to this type of collision?',
      followUps: [
        'Elastic collision: both momentum AND kinetic energy conserved.',
        'Inelastic collision: ONLY momentum conserved.',
        'Which type does the problem specify?',
      ],
      problemHint:
        "Check the problem for words like 'elastic', 'inelastic', 'stick together', or coefficient of restitution.",
    },
  ],

  // EP017: Circular motion error
  EP017: [
    {
      strategy: 'PHYSICAL_INTUITION',
      question:
        "You're using linear kinematics equations. But the object is moving in a circle. What's different about circular motion?",
      followUps: [
        "In circular motion, even at constant speed, there's an acceleration. What is it?",
        'What direction does centripetal acceleration point?',
        'The equation is a = v²/r. Have you used this in your analysis?',
      ],
      problemHint:
        'Circular motion requires centripetal acceleration a = v²/r pointing toward the center.',
    },
    {
      strategy: 'FORCE_ENUMERATION',
      question:
        "Let's think about forces. For an object moving in a circle, what net force is required to maintain the circular path?",
      followUps: [
        'Centripetal force = mv²/r. What provides this force in your problem?',
        "It could be tension, normal force, gravity, or friction - what's providing it here?",
        "Write Newton's second law in the radial direction: ΣF_radial = mv²/r",
      ],
      problemHint:
        "Something must provide the centripetal force mv²/r. Identify what force(s) point toward the center.",
    },
    {
      strategy: 'CONTRAST_PROMPT',
      question:
        "You've used v = u + at which assumes straight-line motion. But the problem describes motion in a circle. What equations apply to circular motion?",
      followUps: [
        'For circular motion: v = ωr, a_centripetal = v²/r = ω²r',
        'The tangential and radial directions need to be analyzed separately.',
        'What provides the centripetal acceleration in this problem?',
      ],
      problemHint:
        'Circular motion has centripetal acceleration even at constant speed. Use a = v²/r.',
    },
    {
      strategy: 'DIRECT_QUESTION',
      question:
        'For an object moving in a {motionType}, what is the centripetal acceleration? Have you included this in your analysis?',
      followUps: [
        'Centripetal acceleration = v²/r toward the center.',
        'At the top of a vertical circle, how do gravity and centripetal force relate?',
        "What's the minimum speed needed at the top for the object to complete the circle?",
      ],
      problemHint:
        "Don't forget: circular motion always has centripetal acceleration a = v²/r.",
    },
  ],
}

/**
 * Dialogue templates organized by collision type and severity
 */
const DIALOGUE_TEMPLATES: Record<CollisionType, Record<CollisionSeverity, DialogueTemplate[]>> = {
  OMISSION: {
    high: [
      {
        strategy: 'FORCE_ENUMERATION',
        question:
          "Before we proceed, let's list every force systematically. What forces act on {object}?",
        followUps: [
          'Is there any contact with another surface?',
          'What did the problem tell us about that surface?',
          "What force would be present if the surface isn't perfectly smooth?",
        ],
        problemHint: "Look for descriptive words like 'rough', 'friction', or 'coefficient'.",
      },
      {
        strategy: 'REREAD_NUDGE',
        question:
          "Let's take a step back. Can you re-read the problem and identify ALL the forces that should be acting on the object?",
        followUps: [
          'What does the problem say about the surface?',
          'Are there any key words that might indicate additional forces?',
          'Think about what happens physically when two surfaces are in contact.',
        ],
        problemHint: "The problem description contains important information about the surfaces.",
      },
      {
        strategy: 'PHYSICAL_INTUITION',
        question:
          "Imagine you're pushing this block yourself. What would you feel? What's resisting the motion?",
        followUps: [
          'In real life, what stops things from sliding indefinitely?',
          'The problem mentions something about the surface. What might that imply?',
          "What force would be present if the surface isn't perfectly smooth?",
        ],
        problemHint: 'Consider what the surface description tells us about forces.',
      },
    ],
    medium: [
      {
        strategy: 'DIRECT_QUESTION',
        question:
          'Looking at your force diagram, have you accounted for all contact forces mentioned in the problem?',
        followUps: [
          'The problem describes the surface a certain way. What does that imply?',
          'Is there a force you might have overlooked?',
        ],
        problemHint: 'Check the problem statement for surface descriptions.',
      },
    ],
    low: [
      {
        strategy: 'DIRECT_QUESTION',
        question: 'Double-check: does your analysis include all the constraints mentioned?',
        followUps: ['Take another look at the given conditions.'],
        problemHint: 'Review the given conditions in the problem.',
      },
    ],
  },

  ADDITION: {
    high: [
      {
        strategy: 'CONTRAST_PROMPT',
        question:
          "I notice you're assuming {wrongAssumption}. But what does the problem actually say about this?",
        followUps: [
          'Can you find where in the problem this assumption is justified?',
          'What if the opposite were true? How would that change your analysis?',
          'Read the problem statement again. Does it support this assumption?',
        ],
        problemHint: 'The problem may explicitly state the opposite of what you assumed.',
      },
      {
        strategy: 'REREAD_NUDGE',
        question:
          "You've made an assumption that might not match the problem. Let's verify: what exactly does the problem state about {topic}?",
        followUps: [
          'Quote the relevant part of the problem for me.',
          'Does the problem say this, or did you add this assumption?',
        ],
        problemHint: 'Check if your assumption contradicts any stated conditions.',
      },
    ],
    medium: [
      {
        strategy: 'DIRECT_QUESTION',
        question: 'Where in the problem does it say {wrongAssumption}?',
        followUps: [
          "If it doesn't say that, what does it actually say?",
          'How would your analysis change without this assumption?',
        ],
        problemHint: 'Verify each assumption against the problem text.',
      },
    ],
    low: [
      {
        strategy: 'DIRECT_QUESTION',
        question:
          "Is {wrongAssumption} stated in the problem, or is this an assumption you're making?",
        followUps: ["If it's an assumption, is it justified?"],
        problemHint: 'Distinguish between given information and assumptions.',
      },
    ],
  },

  REVERSAL: {
    high: [
      {
        strategy: 'CONTRAST_PROMPT',
        question:
          "You wrote {studentClaim}, but let's check the problem carefully. What does it actually state about {topic}?",
        followUps: [
          'Could you have the direction or sign reversed?',
          'What would change if it were the opposite?',
          'Read the exact wording in the problem again.',
        ],
        problemHint:
          "Pay attention to exact wording - 'rough' vs 'smooth', 'towards' vs 'away from'.",
      },
      {
        strategy: 'PHYSICAL_INTUITION',
        question:
          'Think about the physics: if {condition}, what would actually happen? Does your assumption match this?',
        followUps: [
          'Which direction would this force point?',
          'Is the surface helping or hindering motion?',
        ],
        problemHint: 'Verify the physical meaning of the stated conditions.',
      },
    ],
    medium: [
      {
        strategy: 'DIRECT_QUESTION',
        question:
          "Check your signs/directions: the problem says {correct}, but you've used {wrong}. Is this intentional?",
        followUps: ["What's the physical difference between these two cases?"],
        problemHint: 'Re-read the constraint carefully.',
      },
    ],
    low: [
      {
        strategy: 'DIRECT_QUESTION',
        question:
          'Just double-checking: you have {studentClaim}. Is this consistent with the problem statement?',
        followUps: [],
        problemHint: 'Verify against the given conditions.',
      },
    ],
  },

  SUBSTITUTION: {
    high: [
      {
        strategy: 'DIRECT_QUESTION',
        question:
          "You've used {wrongValue} for {quantity}. What value does the problem give for this?",
        followUps: ['Where did this value come from?', 'Look at the given data again.'],
        problemHint: 'Check the numerical values given in the problem.',
      },
    ],
    medium: [
      {
        strategy: 'DIRECT_QUESTION',
        question: "Verify the value you're using for {quantity}. Does it match the problem?",
        followUps: ['Double-check the units as well.'],
        problemHint: 'Confirm all numerical values from the problem.',
      },
    ],
    low: [
      {
        strategy: 'DIRECT_QUESTION',
        question: 'Check your value for {quantity} against the problem statement.',
        followUps: [],
        problemHint: 'Verify numerical values.',
      },
    ],
  },
}

/**
 * Context for interpolating dialogue templates
 */
interface DialogueContext {
  objectLabel?: string
  topicArea?: string
  wrongValue?: string
  wrongAssumption?: string
  correctValue?: string
  studentClaim?: string
  condition?: string
  quantity?: string
  // Spring-specific
  springConstant?: string
  // Collision-specific
  collisionType?: string
  // Circular motion-specific
  motionType?: string
}

/**
 * Generate Socratic dialogue for a constraint collision
 */
export function generateSocraticDialogue(
  collision: ConstraintCollision,
  context?: DialogueContext
): SocraticDialogue {
  // Check for error pattern-specific templates first
  const errorPatternTemplates = ERROR_PATTERN_TEMPLATES[collision.errorPatternId]

  let template: DialogueTemplate

  if (errorPatternTemplates && errorPatternTemplates.length > 0) {
    // Use error pattern-specific template
    const templateIndex = selectTemplateIndex(collision, errorPatternTemplates.length)
    template = errorPatternTemplates[templateIndex]
  } else {
    // Fall back to generic templates based on collision type and severity
    const templates = DIALOGUE_TEMPLATES[collision.collisionType][collision.severity]
    const templateIndex = selectTemplateIndex(collision, templates.length)
    template = templates[templateIndex]
  }

  // Build context from collision if not provided
  const fullContext = buildContext(collision, context)

  // Interpolate placeholders in template
  const question = interpolate(template.question, fullContext)
  const followUps = template.followUps.map(f => interpolate(f, fullContext))
  const problemHint = interpolate(template.problemHint, fullContext)

  return {
    question,
    strategy: template.strategy,
    followUpPrompts: followUps,
    problemReferenceHint: problemHint,
    relatedConceptIds: getRelatedConcepts(collision),
    highlightProblemText: getHighlightLocation(collision),
  }
}

/**
 * Select which template to use
 */
function selectTemplateIndex(collision: ConstraintCollision, templateCount: number): number {
  // For now, use first template. Could be randomized or based on student history
  return 0
}

/**
 * Build context from collision data
 */
function buildContext(
  collision: ConstraintCollision,
  provided?: DialogueContext
): DialogueContext {
  const context: DialogueContext = { ...provided }

  // Extract from collision if not provided
  if (!context.objectLabel) {
    context.objectLabel = 'the object'
  }

  if (!context.topicArea && collision.studentAssumption) {
    context.topicArea = extractTopic(collision.studentAssumption.description)
  }

  if (!context.studentClaim && collision.studentAssumption) {
    context.studentClaim = collision.studentAssumption.description
  }

  if (!context.condition) {
    context.condition =
      'description' in collision.problemConstraint
        ? collision.problemConstraint.description
        : collision.problemConstraint.rawText
  }

  // Default values
  context.wrongValue = context.wrongValue || 'this value'
  context.wrongAssumption = collision.studentAssumption?.description || 'this assumption'
  context.quantity = context.quantity || 'this quantity'

  return context
}

/**
 * Interpolate placeholders in text
 */
function interpolate(text: string, context: DialogueContext & { wrongAssumption?: string }): string {
  return text
    .replace(/{object}/g, context.objectLabel || 'the object')
    .replace(/{topic}/g, context.topicArea || 'this aspect')
    .replace(/{wrongAssumption}/g, context.wrongAssumption || 'this assumption')
    .replace(/{wrongValue}/g, context.wrongValue || 'this value')
    .replace(/{correct}/g, context.correctValue || 'the stated condition')
    .replace(/{wrong}/g, context.wrongValue || 'your assumption')
    .replace(/{studentClaim}/g, context.studentClaim || 'your statement')
    .replace(/{quantity}/g, context.quantity || 'this quantity')
    .replace(/{condition}/g, context.condition || 'this condition')
    // Spring-specific
    .replace(/{springConstant}/g, context.springConstant || 'k')
    // Collision-specific
    .replace(/{collisionType}/g, context.collisionType || 'inelastic')
    // Circular motion-specific
    .replace(/{motionType}/g, context.motionType || 'vertical circle')
}

/**
 * Extract topic from description
 */
function extractTopic(description: string): string {
  const lowerDesc = description.toLowerCase()

  if (lowerDesc.includes('friction')) return 'friction'
  if (lowerDesc.includes('surface')) return 'the surface properties'
  if (lowerDesc.includes('energy')) return 'energy conservation'
  if (lowerDesc.includes('tension')) return 'string tension'
  if (lowerDesc.includes('pulley')) return 'the pulley'
  if (lowerDesc.includes('rolling')) return 'the rolling condition'

  // Spring-related
  if (lowerDesc.includes('spring')) return 'spring force and energy'
  if (lowerDesc.includes('kinematics') && lowerDesc.includes('constant')) return 'constant vs variable acceleration'
  if (lowerDesc.includes('gravitational') && lowerDesc.includes('spring')) return 'spring force vs gravity'

  // Collision-related
  if (lowerDesc.includes('collision')) return 'collision type and conservation laws'
  if (lowerDesc.includes('kinetic energy') && lowerDesc.includes('inelastic')) return 'energy in inelastic collisions'
  if (lowerDesc.includes('momentum')) return 'momentum conservation'

  // Circular motion-related
  if (lowerDesc.includes('circular')) return 'circular motion dynamics'
  if (lowerDesc.includes('centripetal')) return 'centripetal force and acceleration'
  if (lowerDesc.includes('linear') && lowerDesc.includes('circular')) return 'linear vs circular motion equations'

  return 'this constraint'
}

/**
 * Get related concept IDs for a collision
 */
function getRelatedConcepts(collision: ConstraintCollision): string[] {
  const conceptMap: Record<string, string[]> = {
    // Friction-related
    friction_present: ['friction', 'normal-force', 'contact-forces'],
    frictionless: ['friction', 'normal-force'],
    friction_coefficient: ['friction', 'static-friction', 'kinetic-friction'],

    // String/Pulley-related
    taut_string: ['tension', 'constraint-equations', 'pulley-systems'],
    massless_string: ['tension', 'uniform-tension'],
    massless_pulley: ['tension', 'rotational-dynamics', 'moment-of-inertia'],
    inextensible_string: ['constraint-equations', 'velocity-constraints'],

    // Rolling-related
    pure_rolling: ['rolling-motion', 'angular-velocity', 'constraint-equations'],

    // Energy-related
    energy_not_conserved: ['work-energy-theorem', 'conservative-forces', 'mechanical-energy'],

    // Spring-related
    ideal_spring: ['spring-force', 'hookes-law', 'elastic-potential-energy', 'energy-methods'],
    spring_constant_given: ['spring-force', 'hookes-law', 'elastic-potential-energy'],
    spring_deformation_given: ['elastic-potential-energy', 'energy-conservation'],

    // Collision-related
    elastic_collision: ['momentum-conservation', 'kinetic-energy', 'elastic-collisions'],
    inelastic_collision: ['momentum-conservation', 'inelastic-collisions', 'energy-loss'],
    perfectly_inelastic: ['momentum-conservation', 'perfectly-inelastic', 'combined-mass'],
    restitution_given: ['coefficient-of-restitution', 'relative-velocity', 'collisions'],

    // Circular motion-related
    circular_motion: ['centripetal-force', 'centripetal-acceleration', 'circular-dynamics'],
    circular_path: ['centripetal-force', 'centripetal-acceleration', 'vertical-circles'],
    banked_curve: ['centripetal-force', 'normal-force', 'banking-angle'],
    conical_pendulum: ['centripetal-force', 'tension', 'horizontal-circles'],

    // Initial conditions
    initial_velocity_zero: ['initial-conditions', 'kinematics'],
    dropped_from_height: ['gravitational-potential-energy', 'free-fall'],
  }

  // Try to find concepts from the collision's constraint
  const normalizedForm =
    'normalizedForm' in collision.problemConstraint
      ? collision.problemConstraint.normalizedForm
      : ''

  return conceptMap[normalizedForm] || ['problem-constraints']
}

/**
 * Get highlight location for problem text
 */
function getHighlightLocation(
  collision: ConstraintCollision
): SocraticDialogue['highlightProblemText'] {
  if ('sourceLocation' in collision.problemConstraint) {
    return collision.problemConstraint.sourceLocation
  }
  return undefined
}

/**
 * Select dialogue strategy based on student history
 */
export function selectDialogueStrategy(
  collision: ConstraintCollision,
  studentHistory?: {
    previousCollisions: number
    hintsUsed: number
    attemptCount: number
  }
): DialogueStrategy {
  const history = studentHistory || { previousCollisions: 0, hintsUsed: 0, attemptCount: 0 }

  // If student has made this type of mistake before, be more direct
  if (history.previousCollisions > 2) {
    return 'DIRECT_QUESTION'
  }

  // If high severity and first time, use physical intuition
  if (collision.severity === 'high' && history.previousCollisions === 0) {
    return 'PHYSICAL_INTUITION'
  }

  // If student has used many hints, try a different approach
  if (history.hintsUsed > 3) {
    return 'REREAD_NUDGE'
  }

  // Default based on collision type
  const defaults: Record<CollisionType, DialogueStrategy> = {
    OMISSION: 'FORCE_ENUMERATION',
    ADDITION: 'CONTRAST_PROMPT',
    REVERSAL: 'CONTRAST_PROMPT',
    SUBSTITUTION: 'DIRECT_QUESTION',
  }

  return defaults[collision.collisionType]
}

/**
 * Generate escalating follow-up questions
 */
export function generateEscalatingFollowUps(
  collision: ConstraintCollision,
  attemptNumber: number
): string[] {
  const baseFollowUps = DIALOGUE_TEMPLATES[collision.collisionType][collision.severity][0].followUps

  // Add more direct hints as attempts increase
  if (attemptNumber >= 3) {
    return [
      ...baseFollowUps,
      'Look carefully at how the problem describes the surface or connection.',
      'The key information is in the problem setup - re-read the first few sentences.',
    ]
  }

  if (attemptNumber >= 2) {
    return [
      ...baseFollowUps,
      'Check the exact wording used in the problem statement.',
    ]
  }

  return baseFollowUps
}

/**
 * Get a summary of the dialogue for logging
 */
export function getDialogueSummary(dialogue: SocraticDialogue): string {
  return `Strategy: ${dialogue.strategy} | Question: "${dialogue.question.substring(0, 50)}..."`
}

/**
 * Check if dialogue should be shown based on collision confidence
 */
export function shouldShowDialogue(collision: ConstraintCollision): boolean {
  // Only show dialogue for high-confidence collisions
  return collision.confidence >= 0.7
}

/**
 * Format dialogue for display in UI
 */
export function formatDialogueForUI(dialogue: SocraticDialogue): {
  mainQuestion: string
  hint: string
  followUps: string[]
} {
  return {
    mainQuestion: dialogue.question,
    hint: dialogue.problemReferenceHint,
    followUps: dialogue.followUpPrompts,
  }
}
