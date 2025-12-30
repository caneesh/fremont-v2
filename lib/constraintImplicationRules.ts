/**
 * Constraint Implication Rules
 * Predefined rules mapping physical conditions to their physics implications
 */

import type {
  ImplicationRule,
  ConstraintPattern,
  ConstraintPatternGroup,
} from '@/types/constraintCollision'

/**
 * Implication rules for physics constraint detection
 */
export const IMPLICATION_RULES: ImplicationRule[] = [
  // ============================================
  // Contact + Surface Property Rules
  // ============================================
  {
    id: 'IMP001',
    name: 'Rough Surface Implies Friction',
    description: 'When an object is in contact with a rough surface, friction force must be considered',
    condition: {
      type: 'interaction',
      interactionType: 'contact',
      attributeType: 'surface_property',
      attributeValue: 'rough',
    },
    implies: {
      category: 'force',
      description: 'Friction force exists between the objects',
      physicsRationale: 'Rough surfaces have microscopic irregularities that resist relative motion',
      normalizedForm: 'friction_present',
    },
    domain: ['Mechanics', 'Dynamics'],
    priority: 100,
  },
  {
    id: 'IMP002',
    name: 'Smooth Surface Implies No Friction',
    description: 'When surface is described as smooth/frictionless, friction can be neglected',
    condition: {
      type: 'interaction',
      interactionType: 'contact',
      attributeType: 'surface_property',
      attributeValue: ['smooth', 'frictionless'],
    },
    implies: {
      category: 'force',
      description: 'Friction force is zero or negligible',
      physicsRationale: 'Smooth surfaces are idealized to have no resistive forces',
      normalizedForm: 'frictionless',
    },
    domain: ['Mechanics', 'Dynamics'],
    priority: 100,
  },
  {
    id: 'IMP003',
    name: 'Friction Coefficient Implies Friction',
    description: 'When coefficient of friction is given, friction force must be included',
    condition: {
      type: 'interaction',
      interactionType: 'contact',
      attributeType: 'friction_coefficient',
    },
    implies: {
      category: 'force',
      description: 'Friction force = coefficient x normal force',
      physicsRationale: 'Given coefficient indicates friction is relevant to the solution',
      normalizedForm: 'friction_with_coefficient',
    },
    domain: ['Mechanics', 'Dynamics'],
    priority: 110,
  },

  // ============================================
  // String/Rope Rules
  // ============================================
  {
    id: 'IMP004',
    name: 'Taut String Implies Velocity Constraint',
    description: 'When string remains taut, connected objects have related velocities',
    condition: {
      type: 'interaction',
      interactionType: 'tension',
      attributeType: 'string_property',
      attributeValue: 'taut',
    },
    implies: {
      category: 'kinematic',
      description: 'Connected objects have constraint on relative motion',
      physicsRationale: 'Taut string maintains constant length, constraining motion',
      normalizedForm: 'taut_string_constraint',
    },
    domain: ['Mechanics', 'Constraints'],
    priority: 100,
  },
  {
    id: 'IMP005',
    name: 'Inextensible String Constraint',
    description: 'Inextensible string implies velocity and acceleration constraints',
    condition: {
      type: 'interaction',
      interactionType: 'tension',
      attributeType: 'string_property',
      attributeValue: 'inextensible',
    },
    implies: {
      category: 'kinematic',
      description: 'String length is constant, providing constraint equation',
      physicsRationale: 'dl/dt = 0 gives velocity constraint; d2l/dt2 = 0 gives acceleration constraint',
      normalizedForm: 'inextensible_constraint',
    },
    domain: ['Mechanics', 'Constraints'],
    priority: 100,
  },
  {
    id: 'IMP006',
    name: 'Massless String Implies Equal Tension',
    description: 'Massless string has same tension throughout its length',
    condition: {
      type: 'interaction',
      interactionType: 'tension',
      attributeType: 'string_property',
      attributeValue: 'massless',
    },
    implies: {
      category: 'force',
      description: 'Tension is uniform throughout the string',
      physicsRationale: 'F=ma on string segment: if m=0, net force must be zero',
      normalizedForm: 'uniform_tension',
    },
    domain: ['Mechanics', 'Statics', 'Dynamics'],
    priority: 100,
  },

  // ============================================
  // Pulley Rules
  // ============================================
  {
    id: 'IMP007',
    name: 'Massless Pulley Implies Equal Tensions',
    description: 'Massless pulley has equal tension on both sides',
    condition: {
      type: 'object_attribute',
      objectType: 'pulley',
      attributeType: 'mass',
      attributeValue: 'negligible',
    },
    implies: {
      category: 'force',
      description: 'Tension is same on both sides of the pulley',
      physicsRationale: 'Zero moment of inertia means net torque must be zero',
      normalizedForm: 'equal_tensions_pulley',
    },
    domain: ['Mechanics', 'Rotational Motion'],
    priority: 100,
  },
  {
    id: 'IMP008',
    name: 'Massive Pulley Implies Different Tensions',
    description: 'Pulley with mass has different tensions on each side',
    condition: {
      type: 'object_attribute',
      objectType: 'pulley',
      attributeType: 'mass',
    },
    implies: {
      category: 'force',
      description: 'Tension difference causes angular acceleration of pulley',
      physicsRationale: 'I*alpha = (T1 - T2)*R where I is moment of inertia',
      normalizedForm: 'different_tensions_pulley',
    },
    domain: ['Mechanics', 'Rotational Motion'],
    priority: 90,
  },

  // ============================================
  // Motion Constraint Rules
  // ============================================
  {
    id: 'IMP009',
    name: 'Rolling Without Slipping',
    description: 'Pure rolling implies v = omega*R at contact point',
    condition: {
      type: 'stated_constraint',
      rawTextContains: ['rolls without slipping', 'pure rolling', 'no slipping'],
    },
    implies: {
      category: 'kinematic',
      description: 'v_cm = omega * R and a_cm = alpha * R',
      physicsRationale: 'No relative motion at contact point means velocities match',
      normalizedForm: 'pure_rolling',
    },
    domain: ['Mechanics', 'Rotational Motion'],
    priority: 100,
  },
  {
    id: 'IMP010',
    name: 'Block Does Not Slip',
    description: 'Block on surface/wedge does not slip implies static friction',
    condition: {
      type: 'stated_constraint',
      rawTextContains: ['does not slip', 'remains stationary', 'no relative motion'],
    },
    implies: {
      category: 'kinematic',
      description: 'Objects move together with same acceleration',
      physicsRationale: 'Static friction prevents relative motion',
      normalizedForm: 'no_slip_constraint',
    },
    domain: ['Mechanics', 'Dynamics'],
    priority: 100,
  },

  // ============================================
  // Conservation Law Applicability
  // ============================================
  {
    id: 'IMP011',
    name: 'Rough Surface Breaks Energy Conservation',
    description: 'Friction means mechanical energy is not conserved',
    condition: {
      type: 'interaction',
      interactionType: 'contact',
      attributeType: 'surface_property',
      attributeValue: 'rough',
    },
    implies: {
      category: 'conservation',
      description: 'Mechanical energy is NOT conserved; work by friction must be included',
      physicsRationale: 'Friction is a non-conservative force that dissipates energy',
      normalizedForm: 'energy_not_conserved',
    },
    domain: ['Mechanics', 'Energy'],
    priority: 90,
  },
  {
    id: 'IMP012',
    name: 'Smooth Surface Allows Energy Conservation',
    description: 'Frictionless surface means mechanical energy can be conserved',
    condition: {
      type: 'interaction',
      interactionType: 'contact',
      attributeType: 'surface_property',
      attributeValue: ['smooth', 'frictionless'],
    },
    implies: {
      category: 'conservation',
      description: 'Mechanical energy may be conserved if other conditions met',
      physicsRationale: 'No energy dissipation from friction',
      normalizedForm: 'energy_may_be_conserved',
    },
    domain: ['Mechanics', 'Energy'],
    priority: 90,
  },

  // ============================================
  // Small Angle / Approximation Rules
  // ============================================
  {
    id: 'IMP013',
    name: 'Small Angle Approximation',
    description: 'Small oscillations allow sin(theta) approx theta',
    condition: {
      type: 'stated_constraint',
      rawTextContains: ['small angle', 'small oscillations', 'small displacement'],
    },
    implies: {
      category: 'approximation',
      description: 'sin(theta) ~ theta, cos(theta) ~ 1 - theta^2/2',
      physicsRationale: 'Taylor series truncation valid for theta << 1 radian',
      normalizedForm: 'small_angle_approximation',
    },
    domain: ['Mechanics', 'Oscillations', 'SHM'],
    priority: 80,
  },

  // ============================================
  // Wedge/Incline Rules
  // ============================================
  {
    id: 'IMP014',
    name: 'Fixed Wedge Constraint',
    description: 'Fixed wedge does not move, simplifying analysis',
    condition: {
      type: 'stated_constraint',
      rawTextContains: ['fixed wedge', 'fixed incline', 'wedge is fixed'],
    },
    implies: {
      category: 'boundary',
      description: 'Wedge acceleration is zero; analyze only the block',
      physicsRationale: 'Fixed boundary condition eliminates wedge dynamics',
      normalizedForm: 'fixed_incline',
    },
    domain: ['Mechanics', 'Dynamics'],
    priority: 100,
  },
  {
    id: 'IMP015',
    name: 'Movable Wedge Constraint',
    description: 'Movable wedge requires system analysis',
    condition: {
      type: 'stated_constraint',
      rawTextContains: ['wedge is free to move', 'movable wedge', 'wedge can slide'],
    },
    implies: {
      category: 'kinematic',
      description: 'Both block and wedge accelerations must be found',
      physicsRationale: 'System has multiple degrees of freedom',
      normalizedForm: 'movable_wedge',
    },
    domain: ['Mechanics', 'Dynamics'],
    priority: 100,
  },
]

/**
 * Regex patterns for detecting constraints in problem statements
 */
export const CONSTRAINT_PATTERNS: ConstraintPatternGroup = {
  surfaceProperties: [
    {
      pattern: /rough\s+(?:surface|plane|incline|floor|table)/i,
      implies: 'friction_present',
      category: 'force',
    },
    {
      pattern: /smooth\s+(?:surface|plane|incline|floor|table)/i,
      implies: 'frictionless',
      category: 'force',
    },
    {
      pattern: /frictionless/i,
      implies: 'frictionless',
      category: 'force',
    },
    {
      pattern: /coefficient\s+of\s+(?:static\s+)?friction\s*(?:=|is|:)?\s*([\d.]+)/i,
      implies: 'friction_coefficient',
      category: 'force',
      extractValue: true,
    },
    {
      pattern: /\b[μµ]\s*=\s*([\d.]+)/i,
      implies: 'friction_coefficient',
      category: 'force',
      extractValue: true,
    },
    {
      pattern: /(?:no|without|neglect(?:ing)?)\s+friction/i,
      implies: 'frictionless',
      category: 'force',
    },
  ],

  stringProperties: [
    {
      pattern: /(?:light|massless)\s+(?:inextensible\s+)?(?:string|rope|cord)/i,
      implies: 'massless_string',
      category: 'force',
    },
    {
      pattern: /(?:string|rope|cord)\s+(?:is\s+)?(?:light|massless)/i,
      implies: 'massless_string',
      category: 'force',
    },
    {
      pattern: /(?:string|rope)\s+remains?\s+taut/i,
      implies: 'taut_string',
      category: 'kinematic',
    },
    {
      pattern: /inextensible\s+(?:string|rope|cord)/i,
      implies: 'inextensible_string',
      category: 'kinematic',
    },
    {
      pattern: /(?:string|rope)\s+does\s+not\s+(?:slip|slide)/i,
      implies: 'no_string_slip',
      category: 'kinematic',
    },
  ],

  pulleyProperties: [
    {
      pattern: /(?:massless|light|frictionless)\s+pulley/i,
      implies: 'massless_pulley',
      category: 'force',
    },
    {
      pattern: /pulley\s+(?:is\s+)?(?:massless|light|frictionless)/i,
      implies: 'massless_pulley',
      category: 'force',
    },
    {
      pattern: /pulley\s+(?:of|with)\s+mass\s+([\d.]+)\s*(?:kg)?/i,
      implies: 'massive_pulley',
      category: 'force',
      extractValue: true,
    },
    {
      pattern: /smooth\s+pulley/i,
      implies: 'frictionless_pulley',
      category: 'force',
    },
  ],

  motionConstraints: [
    {
      pattern: /rolls?\s+without\s+slipping/i,
      implies: 'pure_rolling',
      category: 'kinematic',
    },
    {
      pattern: /pure\s+rolling/i,
      implies: 'pure_rolling',
      category: 'kinematic',
    },
    {
      pattern: /(?:block|object)\s+does\s+not\s+(?:slip|slide)/i,
      implies: 'no_slip',
      category: 'kinematic',
    },
    {
      pattern: /(?:moves?\s+together|same\s+acceleration)/i,
      implies: 'move_together',
      category: 'kinematic',
    },
    {
      pattern: /(?:wedge|incline)\s+is\s+fixed/i,
      implies: 'fixed_incline',
      category: 'boundary',
    },
    {
      pattern: /(?:wedge|incline)\s+(?:is\s+)?free\s+to\s+move/i,
      implies: 'movable_incline',
      category: 'kinematic',
    },
  ],

  approximations: [
    {
      pattern: /small\s+(?:angle|oscillation|displacement|amplitude)/i,
      implies: 'small_angle',
      category: 'approximation',
    },
    {
      pattern: /take\s+g\s*=\s*([\d.]+)/i,
      implies: 'gravity_value',
      category: 'approximation',
      extractValue: true,
    },
    {
      pattern: /neglect(?:ing)?\s+air\s+resistance/i,
      implies: 'no_air_resistance',
      category: 'approximation',
    },
    {
      pattern: /(?:assume|assuming)\s+(?:the\s+)?(?:system\s+)?(?:is\s+)?ideal/i,
      implies: 'ideal_system',
      category: 'approximation',
    },
  ],
}

/**
 * Get all constraint patterns as a flat array
 */
export function getAllPatterns(): ConstraintPattern[] {
  return [
    ...CONSTRAINT_PATTERNS.surfaceProperties,
    ...CONSTRAINT_PATTERNS.stringProperties,
    ...CONSTRAINT_PATTERNS.pulleyProperties,
    ...CONSTRAINT_PATTERNS.motionConstraints,
    ...CONSTRAINT_PATTERNS.approximations,
  ]
}

/**
 * Find matching implication rule for a constraint
 */
export function findImplicationRule(
  constraintType: string,
  normalizedForm: string
): ImplicationRule | undefined {
  return IMPLICATION_RULES.find(
    rule => rule.implies.normalizedForm === normalizedForm
  )
}

/**
 * Get rules by domain
 */
export function getRulesByDomain(domain: string): ImplicationRule[] {
  return IMPLICATION_RULES.filter(rule =>
    rule.domain.some(d => d.toLowerCase() === domain.toLowerCase())
  )
}

/**
 * Constraint implication descriptions for user-facing messages
 */
export const CONSTRAINT_DESCRIPTIONS: Record<string, string> = {
  friction_present: 'Friction force must be included in the analysis',
  frictionless: 'Surface is frictionless; no friction force',
  friction_coefficient: 'Friction coefficient is given; use f = μN',
  massless_string: 'String is massless; tension is uniform throughout',
  taut_string: 'String remains taut; constraint equation applies',
  inextensible_string: 'String length is constant; use constraint equations',
  massless_pulley: 'Pulley is massless; tensions are equal on both sides',
  massive_pulley: 'Pulley has mass; tensions differ, causing rotation',
  pure_rolling: 'Rolling without slipping; v = ωR, a = αR',
  no_slip: 'Objects move together; same acceleration',
  fixed_incline: 'Incline/wedge is fixed; does not move',
  movable_incline: 'Incline/wedge can move; system analysis required',
  small_angle: 'Small angle approximation applies; sin θ ≈ θ',
  energy_not_conserved: 'Mechanical energy NOT conserved due to friction',
  energy_may_be_conserved: 'Mechanical energy may be conserved',
}
