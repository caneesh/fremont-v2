/**
 * Law-to-Condition Mapping
 * Maps common physics laws to their strict pre-conditions
 *
 * This is the "truth table" for the Pre-Flight Check system.
 */

import type {
  LawPreConditionMap,
  PreCondition,
  PhysicsLaw,
  TrapOption,
  PreFlightCheckItem,
} from '@/types/preFlightCheck'

// ============================================
// Pre-Condition Definitions
// ============================================

const PRECONDITIONS: Record<string, PreCondition> = {
  // Kinematics conditions
  constant_acceleration: {
    id: 'constant_acceleration',
    description: 'Acceleration must be constant throughout the motion',
    formalStatement: 'a = constant (da/dt = 0)',
    severity: 'critical',
    checkQuestion: 'Is the acceleration constant throughout the motion?',
    hints: [
      'Look for forces that change with position or time',
      'Variable forces cause variable acceleration',
      'Gravity alone gives constant acceleration (near Earth surface)',
    ],
    problemTextIndicators: [
      'uniform acceleration',
      'constant acceleration',
      'freely falling',
      'projectile',
    ],
    physicsRationale:
      'Kinematic equations are derived by integrating a=constant. If a varies, the integrals change and these equations give wrong answers.',
  },

  straight_line_motion: {
    id: 'straight_line_motion',
    description: 'Motion must be along a straight line (1D) or decomposable into independent 1D motions',
    formalStatement: 'Motion along a fixed axis or separable x-y components',
    severity: 'important',
    checkQuestion: 'Is the motion along a straight line, or can it be separated into independent components?',
    hints: [
      'Projectile motion separates into independent x and y',
      'Circular motion is NOT straight-line motion',
      'Motion on an incline is along the incline direction',
    ],
    problemTextIndicators: ['horizontal', 'vertical', 'along the incline', 'projectile'],
    physicsRationale:
      'Kinematic equations are scalar equations for 1D motion. For 2D, we must treat each direction separately with independent accelerations.',
  },

  // Newton's Laws conditions
  inertial_frame: {
    id: 'inertial_frame',
    description: 'Analysis must be done in an inertial (non-accelerating) reference frame',
    formalStatement: 'Reference frame acceleration = 0',
    severity: 'critical',
    checkQuestion: 'Is your reference frame inertial (not accelerating)?',
    hints: [
      'Ground/Earth is approximately inertial for most problems',
      'A moving car, elevator, or rotating platform is non-inertial',
      'Non-inertial frames require pseudo-forces',
    ],
    problemTextIndicators: ['ground frame', 'lab frame', 'accelerating elevator', 'rotating'],
    physicsRationale:
      "Newton's 2nd Law (F=ma) only works directly in inertial frames. In non-inertial frames, you must add pseudo-forces.",
  },

  point_mass_or_rigid_body: {
    id: 'point_mass_or_rigid_body',
    description: 'Object must be treated as point mass or rigid body (no deformation)',
    formalStatement: 'Object dimensions negligible OR object maintains shape',
    severity: 'important',
    checkQuestion: 'Can the object be treated as a point mass or rigid body?',
    hints: [
      'Point mass: dimensions << other length scales in problem',
      'Rigid body: maintains shape, no internal deformation',
      'Springs and ropes are NOT rigid bodies',
    ],
    problemTextIndicators: ['small block', 'particle', 'point mass', 'rigid'],
    physicsRationale:
      'F=ma applies to the center of mass. For extended bodies with deformation, we need more complex analysis.',
  },

  net_force_identified: {
    id: 'net_force_identified',
    description: 'All forces acting on the system must be identified',
    formalStatement: 'ΣF includes all external forces on system',
    severity: 'critical',
    checkQuestion: 'Have you identified ALL forces acting on the object/system?',
    hints: [
      'Draw a free body diagram',
      'Check for: gravity, normal, tension, friction, applied forces',
      'Don\'t forget air resistance if mentioned!',
    ],
    problemTextIndicators: ['force', 'push', 'pull', 'weight', 'friction'],
    physicsRationale:
      'Missing any force makes F_net wrong, so the calculated acceleration will be incorrect.',
  },

  // Energy Conservation conditions
  no_nonconservative_work: {
    id: 'no_nonconservative_work',
    description: 'No non-conservative forces (friction, air resistance) do work',
    formalStatement: 'W_nc = 0',
    severity: 'critical',
    checkQuestion: 'Are there any non-conservative forces (friction, drag) doing work?',
    hints: [
      'Friction always dissipates energy',
      'Air resistance removes mechanical energy',
      '"Smooth surface" = no friction',
      'Look for the word "frictionless"',
    ],
    problemTextIndicators: ['frictionless', 'smooth', 'no friction', 'rough', 'friction coefficient'],
    physicsRationale:
      'Non-conservative forces convert mechanical energy to thermal energy. Total mechanical energy (KE + PE) is NOT conserved when they do work.',
  },

  closed_system_energy: {
    id: 'closed_system_energy',
    description: 'No external forces do work on the system (or account for their work)',
    formalStatement: 'W_external = 0 or W_external is included',
    severity: 'important',
    checkQuestion: 'Is the system isolated, or do external forces do work?',
    hints: [
      'An applied force doing work adds energy',
      'Define your system boundary carefully',
      'Earth should be included for gravitational PE',
    ],
    problemTextIndicators: ['applied force', 'pushed by', 'pulled by'],
    physicsRationale:
      'External work changes the total mechanical energy. We must use Work-Energy theorem instead, or expand system boundaries.',
  },

  conservative_forces_only: {
    id: 'conservative_forces_only',
    description: 'Only conservative forces (gravity, spring, electrostatic) do work',
    formalStatement: 'All forces have associated potential energy',
    severity: 'critical',
    checkQuestion: 'Can all forces doing work be associated with potential energy?',
    hints: [
      'Gravity → gravitational PE (mgh)',
      'Spring → elastic PE (½kx²)',
      'Friction has NO potential energy',
    ],
    problemTextIndicators: ['gravitational', 'spring', 'elastic', 'height'],
    physicsRationale:
      'Conservative forces have path-independent work, allowing us to define PE. For conservation, only conservative force work is converted between KE and PE.',
  },

  // Momentum Conservation conditions
  no_external_impulse: {
    id: 'no_external_impulse',
    description: 'No net external force acts on the system (or external forces act briefly)',
    formalStatement: 'ΣF_external = 0 or J_external ≈ 0 (collision)',
    severity: 'critical',
    checkQuestion: 'Is the net external force on the system zero (or negligible during the event)?',
    hints: [
      'For collisions: external forces act for very short time',
      'Choose system to include all colliding objects',
      'Gravity acts but may be negligible during short collision',
    ],
    problemTextIndicators: ['collision', 'explosion', 'isolated', 'no external'],
    physicsRationale:
      'Momentum changes due to external impulse (J = ∫F_ext dt). If external impulse is zero, momentum is conserved.',
  },

  defined_system_momentum: {
    id: 'defined_system_momentum',
    description: 'System boundary clearly defined to include all relevant objects',
    formalStatement: 'System = all objects exchanging momentum',
    severity: 'important',
    checkQuestion: 'Does your system include ALL objects involved in the interaction?',
    hints: [
      'Both colliding objects must be in system',
      "Earth is often excluded (it's effectively infinite mass)",
      'Include all fragments in an explosion',
    ],
    problemTextIndicators: ['system of', 'two blocks', 'collide with'],
    physicsRationale:
      'Momentum exchange between objects is internal to the system. Only by including all participants can we ignore their mutual forces.',
  },

  // Work-Energy Theorem conditions
  path_defined: {
    id: 'path_defined',
    description: 'The path of the object is known or definable',
    formalStatement: 'Path integral ∫F·ds is evaluable',
    severity: 'important',
    checkQuestion: 'Is the path of motion known or can it be determined?',
    hints: [
      'For straight paths: W = F·d',
      'For variable force: may need integration',
      'For friction: need to know distance traveled',
    ],
    problemTextIndicators: ['moves from A to B', 'travels a distance', 'along the path'],
    physicsRationale:
      'Work is defined as the path integral of force. Without knowing the path, we cannot compute work done by non-conservative forces.',
  },
}

// ============================================
// Trap Options Library
// ============================================

const TRAP_OPTIONS: Record<string, TrapOption[]> = {
  constant_acceleration: [
    {
      id: 'trap_acc_1',
      label: 'Acceleration is constant',
      isCorrect: true,
      studentReasoningPattern: 'Correctly identifies constant acceleration scenario',
      prevalence: 'common',
    },
    {
      id: 'trap_acc_2',
      label: 'Acceleration varies with position (like a spring)',
      isCorrect: false,
      trapType: 'condition_violation',
      misconceptionExplanation:
        'Spring force F=-kx creates acceleration a=-kx/m which depends on position. Kinematic equations assume constant a, so they fail here.',
      studentReasoningPattern: 'Ignores that spring restoring force varies with displacement',
      prevalence: 'common',
    },
    {
      id: 'trap_acc_3',
      label: 'Acceleration varies with velocity (like air drag)',
      isCorrect: false,
      trapType: 'condition_violation',
      misconceptionExplanation:
        'Drag force F=-bv creates velocity-dependent acceleration. The motion equations become differential equations, not simple kinematics.',
      studentReasoningPattern: 'Forgets that drag force increases with speed',
      prevalence: 'common',
    },
    {
      id: 'trap_acc_4',
      label: 'Object is at rest, so acceleration is zero (which is constant)',
      isCorrect: true,
      studentReasoningPattern: 'Zero is a constant! Static equilibrium has a=0=constant',
      prevalence: 'uncommon',
    },
  ],

  no_friction: [
    {
      id: 'trap_fric_1',
      label: 'Surface is described as "smooth" or "frictionless"',
      isCorrect: true,
      studentReasoningPattern: 'Correctly identifies no-friction condition',
      prevalence: 'common',
    },
    {
      id: 'trap_fric_2',
      label: 'Surface is described as "rough" but object is moving slowly',
      isCorrect: false,
      trapType: 'condition_violation',
      misconceptionExplanation:
        'Friction does work regardless of speed. Even slow motion on a rough surface dissipates energy. Kinetic friction force is independent of speed.',
      studentReasoningPattern: 'Thinks slow motion means negligible friction',
      prevalence: 'common',
    },
    {
      id: 'trap_fric_3',
      label: 'Friction exists but object is sliding at constant velocity',
      isCorrect: false,
      trapType: 'implicit_assumption',
      misconceptionExplanation:
        'Constant velocity means net force is zero (friction balanced by another force), but friction STILL does negative work and dissipates energy.',
      studentReasoningPattern: 'Confuses zero acceleration with zero work by friction',
      prevalence: 'common',
    },
    {
      id: 'trap_fric_4',
      label: 'Problem does not mention friction at all',
      isCorrect: true,
      studentReasoningPattern: 'If friction is relevant, problem would specify',
      prevalence: 'common',
    },
  ],

  inertial_frame: [
    {
      id: 'trap_frame_1',
      label: 'Analysis from ground/Earth reference frame',
      isCorrect: true,
      studentReasoningPattern: 'Earth frame is approximately inertial',
      prevalence: 'common',
    },
    {
      id: 'trap_frame_2',
      label: 'Analysis from inside an accelerating elevator',
      isCorrect: false,
      trapType: 'condition_violation',
      misconceptionExplanation:
        'An accelerating elevator is a non-inertial frame. You must add a pseudo-force (-ma_elevator) to use F=ma correctly.',
      studentReasoningPattern: 'Forgets that accelerating reference frames need pseudo-forces',
      prevalence: 'common',
    },
    {
      id: 'trap_frame_3',
      label: 'Analysis from a train moving at constant velocity',
      isCorrect: true,
      studentReasoningPattern: 'Constant velocity = zero acceleration = inertial frame',
      prevalence: 'uncommon',
    },
    {
      id: 'trap_frame_4',
      label: 'Analysis from a rotating platform',
      isCorrect: false,
      trapType: 'condition_violation',
      misconceptionExplanation:
        'Rotating frames have centripetal acceleration even if angular velocity is constant. Coriolis and centrifugal pseudo-forces are needed.',
      studentReasoningPattern: 'Forgets that rotation implies continuous acceleration change in direction',
      prevalence: 'common',
    },
  ],

  momentum_isolated: [
    {
      id: 'trap_mom_1',
      label: 'System includes all colliding objects and no external horizontal forces',
      isCorrect: true,
      studentReasoningPattern: 'Correctly identifies isolated system',
      prevalence: 'common',
    },
    {
      id: 'trap_mom_2',
      label: 'Collision happens on a rough surface',
      isCorrect: false,
      trapType: 'condition_violation',
      misconceptionExplanation:
        'Friction from the surface is an external force that provides impulse during the collision, changing total momentum.',
      studentReasoningPattern: 'Forgets that friction during collision affects momentum',
      prevalence: 'common',
    },
    {
      id: 'trap_mom_3',
      label: 'Gravity acts on the system during the collision',
      isCorrect: true, // Tricky - this is actually often OK!
      studentReasoningPattern:
        'For brief collisions, gravitational impulse (mg·Δt) is negligible compared to collision forces',
      prevalence: 'uncommon',
    },
    {
      id: 'trap_mom_4',
      label: 'An external force is applied to one object during collision',
      isCorrect: false,
      trapType: 'condition_violation',
      misconceptionExplanation:
        'External forces on any part of the system change the total momentum. Conservation fails.',
      studentReasoningPattern: 'Ignores that pushed object transfers external impulse to system',
      prevalence: 'uncommon',
    },
  ],
}

// ============================================
// Law-to-Condition Maps
// ============================================

export const LAW_CONDITION_MAPS: LawPreConditionMap[] = [
  // ----------------------------------------
  // Kinematic Equations
  // ----------------------------------------
  {
    law: 'kinematic_equations',
    category: 'kinematics',
    displayName: 'Kinematic Equations (SUVAT)',
    formula: 'v = v_0 + at,\\quad x = x_0 + v_0 t + \\frac{1}{2}at^2',
    preConditions: [PRECONDITIONS.constant_acceleration, PRECONDITIONS.straight_line_motion],
    commonViolations: [
      'Spring-mass systems (a ∝ -x)',
      'Motion with air drag (a depends on v)',
      'Circular motion (direction of a changes)',
      'Rocket propulsion (mass changes → a changes)',
    ],
  },

  // ----------------------------------------
  // Newton's Second Law
  // ----------------------------------------
  {
    law: 'newtons_second_law',
    category: 'newtons_laws',
    displayName: "Newton's Second Law",
    formula: '\\vec{F}_{net} = m\\vec{a}',
    preConditions: [
      PRECONDITIONS.inertial_frame,
      PRECONDITIONS.point_mass_or_rigid_body,
      PRECONDITIONS.net_force_identified,
    ],
    commonViolations: [
      'Analyzing from accelerating elevator without pseudo-force',
      'Analyzing from rotating frame without centrifugal/Coriolis forces',
      'Missing forces in free-body diagram',
      'Treating deformable bodies as rigid',
    ],
  },

  // ----------------------------------------
  // Conservation of Mechanical Energy
  // ----------------------------------------
  {
    law: 'conservation_mechanical_energy',
    category: 'energy_conservation',
    displayName: 'Conservation of Mechanical Energy',
    formula: 'KE_i + PE_i = KE_f + PE_f',
    preConditions: [
      PRECONDITIONS.no_nonconservative_work,
      PRECONDITIONS.conservative_forces_only,
      PRECONDITIONS.closed_system_energy,
    ],
    commonViolations: [
      'Sliding on rough surface (friction dissipates energy)',
      'Motion through air/fluid (drag dissipates energy)',
      'Inelastic collisions (KE lost to deformation/heat)',
      'External forces doing work (applied push/pull)',
    ],
  },

  // ----------------------------------------
  // Conservation of Momentum
  // ----------------------------------------
  {
    law: 'conservation_momentum',
    category: 'momentum_conservation',
    displayName: 'Conservation of Momentum',
    formula: '\\vec{p}_i = \\vec{p}_f \\quad (\\text{when } \\vec{F}_{ext} = 0)',
    preConditions: [PRECONDITIONS.no_external_impulse, PRECONDITIONS.defined_system_momentum],
    commonViolations: [
      'Collision on rough surface (friction provides impulse)',
      'Explosion with external forces acting',
      'System boundary excludes one participant',
      'Long-duration events where gravity matters',
    ],
  },

  // ----------------------------------------
  // Work-Energy Theorem
  // ----------------------------------------
  {
    law: 'work_energy_theorem',
    category: 'energy_conservation',
    displayName: 'Work-Energy Theorem',
    formula: 'W_{net} = \\Delta KE = \\frac{1}{2}mv_f^2 - \\frac{1}{2}mv_i^2',
    preConditions: [PRECONDITIONS.net_force_identified, PRECONDITIONS.path_defined],
    commonViolations: [
      'Unknown or complex path makes work calculation impossible',
      'Missing forces in work calculation',
      'Confusing this with energy conservation (they\'re different!)',
    ],
  },
]

// ============================================
// Helper Functions
// ============================================

/**
 * Get the condition map for a specific physics law
 */
export function getLawConditionMap(law: PhysicsLaw): LawPreConditionMap | undefined {
  return LAW_CONDITION_MAPS.find((map) => map.law === law)
}

/**
 * Get all pre-conditions for a law
 */
export function getPreConditionsForLaw(law: PhysicsLaw): PreCondition[] {
  const map = getLawConditionMap(law)
  return map?.preConditions ?? []
}

/**
 * Build a PreFlightCheckItem from a pre-condition and trap library
 */
export function buildCheckItem(
  preCondition: PreCondition,
  trapKey: string
): PreFlightCheckItem | null {
  const traps = TRAP_OPTIONS[trapKey]
  if (!traps) return null

  const correctIds = traps.filter((t) => t.isCorrect).map((t) => t.id)

  return {
    preCondition,
    options: traps,
    correctOptionIds: correctIds,
    multiSelect: correctIds.length > 1,
  }
}

/**
 * Get trap options for a given category
 */
export function getTrapOptions(category: string): TrapOption[] {
  return TRAP_OPTIONS[category] ?? []
}

/**
 * Find laws that might apply given problem characteristics
 */
export function suggestApplicableLaws(characteristics: {
  hasConstantAcceleration?: boolean
  hasFriction?: boolean
  isCollision?: boolean
  hasExternalForces?: boolean
}): PhysicsLaw[] {
  const suggestions: PhysicsLaw[] = []

  if (characteristics.hasConstantAcceleration) {
    suggestions.push('kinematic_equations')
  }

  if (!characteristics.hasFriction && !characteristics.hasExternalForces) {
    suggestions.push('conservation_mechanical_energy')
  }

  if (characteristics.isCollision && !characteristics.hasFriction) {
    suggestions.push('conservation_momentum')
  }

  // Newton's 2nd law is almost always applicable
  suggestions.push('newtons_second_law')

  return suggestions
}
