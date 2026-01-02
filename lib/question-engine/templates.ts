/**
 * Question Scaffolding Engine v1 - Pattern Templates
 *
 * Hardcoded templates for physics problem types.
 * These define the fixed structure that LLM must follow.
 * LLM can ONLY fill template slots (variables, text, hints, numeric values).
 * LLM can NEVER add, remove, or reorder steps.
 */

import type { PatternTemplate } from './schemas'

// =============================================================================
// Template: Inclined Plane (Frictionless)
// =============================================================================

export const TEMPLATE_INCLINE_FRICTIONLESS: PatternTemplate = {
  templateId: 'mechanics/incline_frictionless',
  topic: 'mechanics',
  subtopic: 'inclined_plane',
  description: 'Block sliding down a frictionless inclined plane',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'mass',
    'angle',
    'initial_velocity',
    'distance',
    'height',
    'gravity',
    'acceleration',
    'final_velocity',
    'time',
  ],
  stepBlueprints: [
    {
      id: 'step-1-fbd',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Draw the free body diagram for the {{mass}} kg block on the {{angle}}° incline.',
      description: 'Student draws FBD identifying weight (mg) and normal force (N)',
    },
    {
      id: 'step-2-decompose',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Decompose the weight into components parallel and perpendicular to the incline.',
      description: 'Student decomposes mg into mg·sin(θ) and mg·cos(θ)',
    },
    {
      id: 'step-3-newton',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply Newton\'s second law along the incline to find the acceleration.',
      description: 'Student applies F=ma to get a = g·sin(θ)',
    },
    {
      id: 'step-4-kinematics',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Use kinematics to find the {{asked_quantity}}.',
      description: 'Student uses appropriate kinematic equation based on what is asked',
    },
    {
      id: 'step-5-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: What happens to the acceleration as the angle approaches 0°? As it approaches 90°?',
      description: 'Student checks limiting cases for physical reasonableness',
    },
  ],
}

// =============================================================================
// Template: Inclined Plane (With Friction)
// =============================================================================

export const TEMPLATE_INCLINE_WITH_FRICTION: PatternTemplate = {
  templateId: 'mechanics/incline_with_friction',
  topic: 'mechanics',
  subtopic: 'inclined_plane_friction',
  description: 'Block sliding on an inclined plane with friction',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'mass',
    'angle',
    'coefficient_static',
    'coefficient_kinetic',
    'initial_velocity',
    'distance',
    'gravity',
    'acceleration',
    'friction_force',
    'normal_force',
  ],
  stepBlueprints: [
    {
      id: 'step-1-fbd',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Draw the free body diagram showing all forces on the {{mass}} kg block.',
      description: 'Student draws FBD with weight, normal force, AND friction force',
    },
    {
      id: 'step-2-normal',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Find the normal force using equilibrium perpendicular to the incline.',
      description: 'Student finds N = mg·cos(θ)',
    },
    {
      id: 'step-3-friction',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the friction force using f = μN.',
      description: 'Student calculates friction f = μ·mg·cos(θ)',
    },
    {
      id: 'step-4-motion-check',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Determine if the block will slide: compare mg·sin(θ) with maximum static friction.',
      description: 'Student determines motion condition',
    },
    {
      id: 'step-5-newton',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply Newton\'s second law to find the acceleration.',
      description: 'Student applies F=ma with friction: a = g(sin(θ) - μcos(θ))',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student uses kinematics or energy to find final answer',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: What happens when μ = tan(θ)? What does this mean physically?',
      description: 'Student checks critical angle condition',
    },
  ],
}

// =============================================================================
// Template: Newton's Laws 2D Block System
// =============================================================================

export const TEMPLATE_NEWTON_2D_BLOCK: PatternTemplate = {
  templateId: 'mechanics/newton_2d_block',
  topic: 'mechanics',
  subtopic: 'newton_laws_2d',
  description: 'Generic 2D block system with multiple forces (FBD + equations approach)',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'mass',
    'force_applied',
    'force_angle',
    'friction_coefficient',
    'tension',
    'acceleration',
    'normal_force',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'List all forces acting on the {{mass}} kg block.',
      description: 'Student identifies all forces: weight, normal, applied, friction, etc.',
    },
    {
      id: 'step-2-fbd',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Draw a complete free body diagram with labeled forces.',
      description: 'Student draws FBD with all forces at correct angles',
    },
    {
      id: 'step-3-axes',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Choose the optimal coordinate system orientation.',
      description: 'Student selects axes to minimize component decomposition',
    },
    {
      id: 'step-4-x-equation',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write Newton\'s second law equation for the x-direction.',
      description: 'Student writes ΣFₓ = maₓ with all x-components',
    },
    {
      id: 'step-5-y-equation',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write Newton\'s second law equation for the y-direction.',
      description: 'Student writes ΣFᵧ = maᵧ (often = 0 for constrained motion)',
    },
    {
      id: 'step-6-solve-system',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve the system of equations for {{asked_quantity}}.',
      description: 'Student solves simultaneous equations',
    },
    {
      id: 'step-7-substitute',
      type: 'fill',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Substitute numerical values and compute the final answer.',
      description: 'Student plugs in numbers and calculates',
    },
    {
      id: 'step-8-verify',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Check your answer using dimensional analysis and limiting cases.',
      description: 'Student verifies answer is physically reasonable',
    },
  ],
}

// =============================================================================
// Template: Projectile Motion
// =============================================================================

export const TEMPLATE_PROJECTILE_MOTION: PatternTemplate = {
  templateId: 'mechanics/projectile_motion',
  topic: 'mechanics',
  subtopic: 'projectile',
  description: 'Projectile motion with initial velocity at an angle',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'initial_velocity',
    'launch_angle',
    'height',
    'range',
    'time_of_flight',
    'max_height',
    'gravity',
    'velocity_x',
    'velocity_y',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the given quantities and what you need to find.',
      description: 'Student lists knowns and unknowns',
    },
    {
      id: 'step-2-decompose',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Decompose the initial velocity into horizontal and vertical components.',
      description: 'Student finds v₀ₓ = v₀cos(θ) and v₀ᵧ = v₀sin(θ)',
    },
    {
      id: 'step-3-horizontal',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the equation for horizontal motion (no acceleration).',
      description: 'Student writes x = v₀ₓ·t',
    },
    {
      id: 'step-4-vertical',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the equation for vertical motion (constant acceleration g).',
      description: 'Student writes y = v₀ᵧ·t - ½gt²',
    },
    {
      id: 'step-5-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student applies appropriate equation to find answer',
    },
    {
      id: 'step-6-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: At what angle is the range maximum? Does your answer make physical sense?',
      description: 'Student checks limiting cases (θ=45° for max range)',
    },
  ],
}

// =============================================================================
// Template: Circular Motion
// =============================================================================

export const TEMPLATE_CIRCULAR_MOTION: PatternTemplate = {
  templateId: 'mechanics/circular_motion',
  topic: 'mechanics',
  subtopic: 'circular_motion',
  description: 'Uniform circular motion with centripetal acceleration',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'mass',
    'radius',
    'velocity',
    'angular_velocity',
    'period',
    'frequency',
    'centripetal_acceleration',
    'centripetal_force',
    'tension',
    'normal_force',
  ],
  stepBlueprints: [
    {
      id: 'step-1-fbd',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Draw the free body diagram showing all forces and the direction of acceleration.',
      description: 'Student draws FBD with centripetal acceleration pointing toward center',
    },
    {
      id: 'step-2-identify-centripetal',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Which force(s) provide the centripetal force in this problem?',
      description: 'Student identifies the force providing centripetal acceleration',
    },
    {
      id: 'step-3-centripetal-equation',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the centripetal force equation: F_c = mv²/r.',
      description: 'Student applies F = mv²/r or F = mω²r',
    },
    {
      id: 'step-4-newton',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply Newton\'s second law toward the center of the circle.',
      description: 'Student sets ΣF_radial = mv²/r',
    },
    {
      id: 'step-5-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student solves for the unknown',
    },
    {
      id: 'step-6-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: What happens to the centripetal force if velocity doubles? If radius halves?',
      description: 'Student checks proportionality relationships',
    },
  ],
}

// =============================================================================
// Template: Work-Energy Theorem
// =============================================================================

export const TEMPLATE_WORK_ENERGY: PatternTemplate = {
  templateId: 'mechanics/work_energy',
  topic: 'mechanics',
  subtopic: 'work_energy',
  description: 'Work-energy theorem and conservation of mechanical energy',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'mass',
    'height',
    'velocity_initial',
    'velocity_final',
    'kinetic_energy',
    'potential_energy',
    'work',
    'friction_work',
    'spring_constant',
    'displacement',
  ],
  stepBlueprints: [
    {
      id: 'step-1-system',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Define the system and identify all forms of energy involved.',
      description: 'Student identifies KE, gravitational PE, spring PE, etc.',
    },
    {
      id: 'step-2-reference',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Choose a reference point for potential energy (where PE = 0).',
      description: 'Student selects appropriate reference level',
    },
    {
      id: 'step-3-initial-energy',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the total mechanical energy at the initial position.',
      description: 'Student computes E_i = KE_i + PE_i',
    },
    {
      id: 'step-4-final-energy',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the expression for total mechanical energy at the final position.',
      description: 'Student writes E_f = KE_f + PE_f',
    },
    {
      id: 'step-5-conservation',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply conservation of energy (or work-energy theorem if non-conservative forces exist).',
      description: 'Student applies E_i = E_f or W_nc = ΔE',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student solves the energy equation',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Is energy conserved? Does the final velocity depend on the path taken?',
      description: 'Student verifies energy conservation principle',
    },
  ],
}

// =============================================================================
// Template: Momentum and Collision
// =============================================================================

export const TEMPLATE_MOMENTUM_COLLISION: PatternTemplate = {
  templateId: 'mechanics/momentum_collision',
  topic: 'mechanics',
  subtopic: 'momentum_collision',
  description: 'Conservation of momentum in collisions (elastic and inelastic)',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'mass_1',
    'mass_2',
    'velocity_1_initial',
    'velocity_2_initial',
    'velocity_1_final',
    'velocity_2_final',
    'velocity_combined',
    'momentum',
    'kinetic_energy_loss',
    'coefficient_restitution',
  ],
  stepBlueprints: [
    {
      id: 'step-1-type',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the type of collision: perfectly elastic, perfectly inelastic, or partially inelastic.',
      description: 'Student classifies the collision type',
    },
    {
      id: 'step-2-momentum-before',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the total momentum before the collision.',
      description: 'Student computes p_i = m₁v₁ᵢ + m₂v₂ᵢ',
    },
    {
      id: 'step-3-momentum-after',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the expression for total momentum after the collision.',
      description: 'Student writes p_f = m₁v₁_f + m₂v₂_f (or combined mass for inelastic)',
    },
    {
      id: 'step-4-conservation',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply conservation of momentum: p_before = p_after.',
      description: 'Student sets up momentum conservation equation',
    },
    {
      id: 'step-5-energy',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'If elastic, apply conservation of kinetic energy. If inelastic, note KE is not conserved.',
      description: 'Student applies KE conservation for elastic or calculates KE loss',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student solves the system of equations',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Is momentum conserved? For elastic collision, is KE conserved?',
      description: 'Student verifies conservation laws',
    },
  ],
}

// =============================================================================
// Template: Pulley / Atwood Machine
// =============================================================================

export const TEMPLATE_PULLEY_SYSTEM: PatternTemplate = {
  templateId: 'mechanics/pulley_system',
  topic: 'mechanics',
  subtopic: 'pulley',
  description: 'Pulley systems including Atwood machine and block-pulley combinations',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'mass_1',
    'mass_2',
    'tension',
    'acceleration',
    'gravity',
    'pulley_mass',
    'pulley_radius',
    'moment_of_inertia',
  ],
  stepBlueprints: [
    {
      id: 'step-1-fbd-mass1',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Draw the free body diagram for mass m₁.',
      description: 'Student draws FBD for first mass showing tension and weight',
    },
    {
      id: 'step-2-fbd-mass2',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Draw the free body diagram for mass m₂.',
      description: 'Student draws FBD for second mass',
    },
    {
      id: 'step-3-constraint',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'What is the constraint relating the accelerations of the two masses?',
      description: 'Student identifies that accelerations are equal in magnitude (for ideal rope)',
    },
    {
      id: 'step-4-newton-mass1',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply Newton\'s second law to mass m₁.',
      description: 'Student writes equation for m₁',
    },
    {
      id: 'step-5-newton-mass2',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply Newton\'s second law to mass m₂.',
      description: 'Student writes equation for m₂',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve the system of equations for {{asked_quantity}}.',
      description: 'Student eliminates tension to find acceleration or vice versa',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: What happens when m₁ = m₂? When one mass is much larger?',
      description: 'Student checks limiting cases',
    },
  ],
}

// =============================================================================
// Template: Simple Harmonic Motion
// =============================================================================

export const TEMPLATE_SHM: PatternTemplate = {
  templateId: 'mechanics/simple_harmonic_motion',
  topic: 'mechanics',
  subtopic: 'simple_harmonic_motion',
  description: 'Simple harmonic motion (spring-mass or pendulum systems)',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'mass',
    'spring_constant',
    'amplitude',
    'frequency',
    'angular_frequency',
    'period',
    'displacement',
    'velocity',
    'acceleration',
    'phase',
    'pendulum_length',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the type of oscillator: spring-mass or simple pendulum.',
      description: 'Student identifies the oscillating system',
    },
    {
      id: 'step-2-restoring-force',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the restoring force equation (F = -kx for spring, or derive for pendulum).',
      description: 'Student identifies the restoring force',
    },
    {
      id: 'step-3-angular-frequency',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the angular frequency ω.',
      description: 'Student computes ω = √(k/m) for spring or ω = √(g/L) for pendulum',
    },
    {
      id: 'step-4-period',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Find the period T = 2π/ω.',
      description: 'Student calculates the period',
    },
    {
      id: 'step-5-displacement',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the displacement as a function of time: x(t) = A·cos(ωt + φ).',
      description: 'Student writes the equation of motion',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student applies equations to find answer',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Does the period depend on amplitude? What happens if mass doubles?',
      description: 'Student checks independence from amplitude',
    },
  ],
}

// =============================================================================
// THERMODYNAMICS TEMPLATES
// =============================================================================

// =============================================================================
// Template: Ideal Gas Law
// =============================================================================

export const TEMPLATE_IDEAL_GAS: PatternTemplate = {
  templateId: 'thermodynamics/ideal_gas',
  topic: 'thermodynamics',
  subtopic: 'ideal_gas',
  description: 'Ideal gas law problems (PV = nRT)',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'pressure',
    'volume',
    'temperature',
    'moles',
    'gas_constant',
    'molecular_mass',
    'density',
    'pressure_initial',
    'pressure_final',
    'volume_initial',
    'volume_final',
    'temperature_initial',
    'temperature_final',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'List the given quantities and convert all units to SI.',
      description: 'Student identifies knowns and ensures consistent units',
    },
    {
      id: 'step-2-process',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the type of process: isothermal, isobaric, isochoric, or adiabatic.',
      description: 'Student classifies the thermodynamic process',
    },
    {
      id: 'step-3-equation',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the appropriate form of the ideal gas law or process equation.',
      description: 'Student writes PV = nRT or P₁V₁/T₁ = P₂V₂/T₂',
    },
    {
      id: 'step-4-substitute',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Substitute the known values into the equation.',
      description: 'Student plugs in numerical values',
    },
    {
      id: 'step-5-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student algebraically solves for unknown',
    },
    {
      id: 'step-6-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Is the answer physically reasonable? Check dimensions.',
      description: 'Student checks answer makes physical sense',
    },
  ],
}

// =============================================================================
// Template: First Law of Thermodynamics
// =============================================================================

export const TEMPLATE_FIRST_LAW: PatternTemplate = {
  templateId: 'thermodynamics/first_law',
  topic: 'thermodynamics',
  subtopic: 'first_law',
  description: 'First law of thermodynamics (ΔU = Q - W)',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'heat',
    'work',
    'internal_energy_change',
    'temperature_change',
    'pressure',
    'volume_change',
    'specific_heat',
    'degrees_of_freedom',
    'moles',
  ],
  stepBlueprints: [
    {
      id: 'step-1-process',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the thermodynamic process type.',
      description: 'Student identifies isothermal, isobaric, isochoric, or adiabatic',
    },
    {
      id: 'step-2-first-law',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the first law of thermodynamics: ΔU = Q - W.',
      description: 'Student states the first law',
    },
    {
      id: 'step-3-internal-energy',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Express the change in internal energy in terms of temperature change.',
      description: 'Student writes ΔU = nCᵥΔT',
    },
    {
      id: 'step-4-work',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the work done by the gas.',
      description: 'Student calculates W = ∫PdV or applies process-specific formula',
    },
    {
      id: 'step-5-heat',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply the first law to find the {{asked_quantity}}.',
      description: 'Student solves for Q, W, or ΔU',
    },
    {
      id: 'step-6-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Is energy conserved? Check signs of Q and W.',
      description: 'Student verifies sign conventions and conservation',
    },
  ],
}

// =============================================================================
// Template: Heat Engine / Carnot Cycle
// =============================================================================

export const TEMPLATE_HEAT_ENGINE: PatternTemplate = {
  templateId: 'thermodynamics/heat_engine',
  topic: 'thermodynamics',
  subtopic: 'heat_engine',
  description: 'Heat engines and Carnot cycle efficiency',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'temperature_hot',
    'temperature_cold',
    'heat_absorbed',
    'heat_rejected',
    'work_output',
    'efficiency',
    'carnot_efficiency',
    'coefficient_of_performance',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the hot and cold reservoir temperatures (convert to Kelvin).',
      description: 'Student identifies T_H and T_C in Kelvin',
    },
    {
      id: 'step-2-energy-flow',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Draw the energy flow diagram showing Q_H, W, and Q_C.',
      description: 'Student draws heat engine schematic',
    },
    {
      id: 'step-3-first-law',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply energy conservation: Q_H = W + Q_C.',
      description: 'Student writes first law for cyclic process',
    },
    {
      id: 'step-4-efficiency',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the efficiency formula: η = W/Q_H = 1 - Q_C/Q_H.',
      description: 'Student expresses efficiency',
    },
    {
      id: 'step-5-carnot',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'If Carnot engine, use η_carnot = 1 - T_C/T_H.',
      description: 'Student applies Carnot efficiency formula',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student calculates the required quantity',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Is the efficiency less than Carnot efficiency? Is η < 1?',
      description: 'Student verifies second law constraints',
    },
  ],
}

// =============================================================================
// Template: Calorimetry / Heat Transfer
// =============================================================================

export const TEMPLATE_CALORIMETRY: PatternTemplate = {
  templateId: 'thermodynamics/calorimetry',
  topic: 'thermodynamics',
  subtopic: 'calorimetry',
  description: 'Calorimetry and heat transfer problems',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'mass',
    'specific_heat',
    'temperature_initial',
    'temperature_final',
    'temperature_equilibrium',
    'heat_gained',
    'heat_lost',
    'latent_heat',
    'phase_change',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'List all substances and their initial temperatures.',
      description: 'Student identifies all components in the system',
    },
    {
      id: 'step-2-heat-equation',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the heat transfer equation: Q = mcΔT.',
      description: 'Student writes calorimetry equation',
    },
    {
      id: 'step-3-phase-check',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Are there any phase changes? If so, account for latent heat.',
      description: 'Student checks for phase transitions',
    },
    {
      id: 'step-4-conservation',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply conservation of energy: heat lost = heat gained.',
      description: 'Student sets up energy conservation equation',
    },
    {
      id: 'step-5-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student solves for equilibrium temperature or mass',
    },
    {
      id: 'step-6-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Is the final temperature between the initial temperatures?',
      description: 'Student checks physical reasonableness',
    },
  ],
}

// =============================================================================
// ELECTROMAGNETISM TEMPLATES
// =============================================================================

// =============================================================================
// Template: Coulomb's Law / Electric Field
// =============================================================================

export const TEMPLATE_COULOMB_FIELD: PatternTemplate = {
  templateId: 'electromagnetism/coulomb_field',
  topic: 'electromagnetism',
  subtopic: 'coulomb_field',
  description: 'Electric force and field from point charges',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'charge_1',
    'charge_2',
    'distance',
    'force',
    'electric_field',
    'coulomb_constant',
    'potential',
    'position_x',
    'position_y',
  ],
  stepBlueprints: [
    {
      id: 'step-1-diagram',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Draw a diagram showing the charge configuration and the point of interest.',
      description: 'Student sketches the charge arrangement',
    },
    {
      id: 'step-2-coulomb',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write Coulomb\'s law: F = kq₁q₂/r².',
      description: 'Student states Coulomb\'s law',
    },
    {
      id: 'step-3-field-definition',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the electric field due to a point charge: E = kq/r².',
      description: 'Student writes field equation',
    },
    {
      id: 'step-4-superposition',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'If multiple charges, apply superposition to find the net field/force.',
      description: 'Student adds vector contributions from each charge',
    },
    {
      id: 'step-5-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the {{asked_quantity}}.',
      description: 'Student computes final answer',
    },
    {
      id: 'step-6-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Does the direction make sense? Check the sign of force (attractive/repulsive).',
      description: 'Student verifies direction and sign',
    },
  ],
}

// =============================================================================
// Template: Gauss's Law
// =============================================================================

export const TEMPLATE_GAUSS_LAW: PatternTemplate = {
  templateId: 'electromagnetism/gauss_law',
  topic: 'electromagnetism',
  subtopic: 'gauss_law',
  description: 'Applying Gauss\'s law to find electric field from symmetric charge distributions',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'charge',
    'charge_density',
    'electric_field',
    'radius',
    'length',
    'area',
    'flux',
    'permittivity',
  ],
  stepBlueprints: [
    {
      id: 'step-1-symmetry',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the symmetry of the charge distribution.',
      description: 'Student identifies spherical, cylindrical, or planar symmetry',
    },
    {
      id: 'step-2-gaussian-surface',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Choose and draw an appropriate Gaussian surface.',
      description: 'Student selects surface matching the symmetry',
    },
    {
      id: 'step-3-flux',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the flux integral: Φ = ∮E·dA.',
      description: 'Student expresses flux using symmetry',
    },
    {
      id: 'step-4-enclosed-charge',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the charge enclosed by the Gaussian surface.',
      description: 'Student finds Q_enc',
    },
    {
      id: 'step-5-gauss',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply Gauss\'s law: Φ = Q_enc/ε₀.',
      description: 'Student applies Gauss\'s law',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the electric field.',
      description: 'Student solves for E',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Does E follow the expected r-dependence? Check dimensions.',
      description: 'Student verifies field behavior',
    },
  ],
}

// =============================================================================
// Template: Capacitors
// =============================================================================

export const TEMPLATE_CAPACITORS: PatternTemplate = {
  templateId: 'electromagnetism/capacitors',
  topic: 'electromagnetism',
  subtopic: 'capacitors',
  description: 'Capacitance, energy storage, and capacitor combinations',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'capacitance',
    'charge',
    'voltage',
    'energy',
    'plate_area',
    'plate_separation',
    'dielectric_constant',
    'capacitance_equivalent',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the capacitor configuration (parallel plate, series, parallel combination).',
      description: 'Student identifies the circuit topology',
    },
    {
      id: 'step-2-capacitance',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the capacitance formula: C = ε₀A/d or C = Q/V.',
      description: 'Student writes capacitance definition',
    },
    {
      id: 'step-3-combination',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'If combined capacitors, find the equivalent capacitance.',
      description: 'Student applies series (1/C_eq) or parallel (C_eq = ΣC) rules',
    },
    {
      id: 'step-4-charge-voltage',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Use Q = CV to relate charge and voltage.',
      description: 'Student applies fundamental capacitor relation',
    },
    {
      id: 'step-5-energy',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'If needed, calculate stored energy: U = ½CV² = ½QV = Q²/2C.',
      description: 'Student computes energy stored',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student calculates final answer',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: For series, is C_eq < smallest C? For parallel, is C_eq > largest C?',
      description: 'Student checks combination rules',
    },
  ],
}

// =============================================================================
// Template: DC Circuits (Kirchhoff's Laws)
// =============================================================================

export const TEMPLATE_DC_CIRCUITS: PatternTemplate = {
  templateId: 'electromagnetism/dc_circuits',
  topic: 'electromagnetism',
  subtopic: 'dc_circuits',
  description: 'DC circuit analysis using Ohm\'s law and Kirchhoff\'s laws',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'voltage',
    'current',
    'resistance',
    'power',
    'emf',
    'internal_resistance',
    'resistance_equivalent',
    'current_1',
    'current_2',
  ],
  stepBlueprints: [
    {
      id: 'step-1-diagram',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Draw the circuit diagram and label all currents with directions.',
      description: 'Student draws circuit with current directions',
    },
    {
      id: 'step-2-identify',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify which resistors are in series and which are in parallel.',
      description: 'Student identifies circuit topology',
    },
    {
      id: 'step-3-kcl',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply Kirchhoff\'s current law at each junction.',
      description: 'Student writes ΣI_in = ΣI_out',
    },
    {
      id: 'step-4-kvl',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply Kirchhoff\'s voltage law around each loop.',
      description: 'Student writes ΣV = 0 around loops',
    },
    {
      id: 'step-5-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve the system of equations for the unknown currents.',
      description: 'Student solves simultaneous equations',
    },
    {
      id: 'step-6-power',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'If needed, calculate power: P = IV = I²R = V²/R.',
      description: 'Student computes power dissipated',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Is KCL satisfied at all junctions? Is KVL satisfied around all loops?',
      description: 'Student verifies Kirchhoff\'s laws',
    },
  ],
}

// =============================================================================
// Template: Magnetic Force
// =============================================================================

export const TEMPLATE_MAGNETIC_FORCE: PatternTemplate = {
  templateId: 'electromagnetism/magnetic_force',
  topic: 'electromagnetism',
  subtopic: 'magnetic_force',
  description: 'Magnetic force on moving charges and current-carrying wires',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'charge',
    'velocity',
    'magnetic_field',
    'force',
    'current',
    'wire_length',
    'angle',
    'radius',
    'period',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Is this a moving charge or a current-carrying wire?',
      description: 'Student identifies the source of magnetic force',
    },
    {
      id: 'step-2-formula',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the magnetic force formula: F = qv×B or F = IL×B.',
      description: 'Student writes Lorentz force equation',
    },
    {
      id: 'step-3-direction',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Use the right-hand rule to find the direction of the force.',
      description: 'Student applies right-hand rule',
    },
    {
      id: 'step-4-magnitude',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the magnitude: F = qvBsinθ or F = BILsinθ.',
      description: 'Student computes force magnitude',
    },
    {
      id: 'step-5-motion',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'If circular motion, relate F = qvB to centripetal force.',
      description: 'Student connects to circular motion if applicable',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student calculates final answer',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Is the force perpendicular to both v and B? Does the magnetic force do work?',
      description: 'Student verifies magnetic force properties',
    },
  ],
}

// =============================================================================
// Template: Electromagnetic Induction
// =============================================================================

export const TEMPLATE_EM_INDUCTION: PatternTemplate = {
  templateId: 'electromagnetism/em_induction',
  topic: 'electromagnetism',
  subtopic: 'em_induction',
  description: 'Faraday\'s law and electromagnetic induction',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'magnetic_flux',
    'magnetic_field',
    'area',
    'angle',
    'emf',
    'current',
    'resistance',
    'velocity',
    'number_of_turns',
    'time',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'What is causing the change in magnetic flux (B changing, A changing, or θ changing)?',
      description: 'Student identifies source of flux change',
    },
    {
      id: 'step-2-flux',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the magnetic flux: Φ = BA·cosθ.',
      description: 'Student writes flux definition',
    },
    {
      id: 'step-3-faraday',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply Faraday\'s law: ε = -N·dΦ/dt.',
      description: 'Student writes Faraday\'s law',
    },
    {
      id: 'step-4-lenz',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Use Lenz\'s law to determine the direction of induced current.',
      description: 'Student applies Lenz\'s law for direction',
    },
    {
      id: 'step-5-calculate',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the induced EMF by evaluating dΦ/dt.',
      description: 'Student computes rate of flux change',
    },
    {
      id: 'step-6-current',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'If needed, find the induced current: I = ε/R.',
      description: 'Student applies Ohm\'s law to find current',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Does the induced current oppose the change in flux (Lenz\'s law)?',
      description: 'Student verifies Lenz\'s law',
    },
  ],
}

// =============================================================================
// OPTICS TEMPLATES
// =============================================================================

// =============================================================================
// Template: Mirrors (Reflection)
// =============================================================================

export const TEMPLATE_MIRRORS: PatternTemplate = {
  templateId: 'optics/mirrors',
  topic: 'optics',
  subtopic: 'mirrors',
  description: 'Image formation by plane and spherical mirrors',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'object_distance',
    'image_distance',
    'focal_length',
    'radius_of_curvature',
    'magnification',
    'object_height',
    'image_height',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the type of mirror: plane, concave, or convex.',
      description: 'Student classifies the mirror type',
    },
    {
      id: 'step-2-sign-convention',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'State the sign convention: which directions are positive for u, v, and f?',
      description: 'Student recalls sign conventions',
    },
    {
      id: 'step-3-ray-diagram',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Draw a ray diagram showing at least two principal rays.',
      description: 'Student draws ray diagram to locate image',
    },
    {
      id: 'step-4-mirror-equation',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply the mirror equation: 1/f = 1/v + 1/u.',
      description: 'Student writes mirror equation',
    },
    {
      id: 'step-5-magnification',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Find the magnification: m = -v/u = h_i/h_o.',
      description: 'Student calculates magnification',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student computes final answer',
    },
    {
      id: 'step-7-characterize',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Characterize the image: real/virtual, upright/inverted, magnified/diminished.',
      description: 'Student describes image properties',
    },
  ],
}

// =============================================================================
// Template: Lenses (Refraction)
// =============================================================================

export const TEMPLATE_LENSES: PatternTemplate = {
  templateId: 'optics/lenses',
  topic: 'optics',
  subtopic: 'lenses',
  description: 'Image formation by thin lenses',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'object_distance',
    'image_distance',
    'focal_length',
    'magnification',
    'object_height',
    'image_height',
    'refractive_index',
    'radius_1',
    'radius_2',
    'power',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the type of lens: converging (convex) or diverging (concave).',
      description: 'Student classifies the lens type',
    },
    {
      id: 'step-2-sign-convention',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'State the sign convention for lenses.',
      description: 'Student recalls lens sign conventions',
    },
    {
      id: 'step-3-ray-diagram',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Draw a ray diagram showing the principal rays.',
      description: 'Student draws ray diagram',
    },
    {
      id: 'step-4-lens-equation',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply the thin lens equation: 1/f = 1/v - 1/u.',
      description: 'Student writes lens equation',
    },
    {
      id: 'step-5-magnification',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the magnification: m = v/u = h_i/h_o.',
      description: 'Student computes magnification',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student finds final answer',
    },
    {
      id: 'step-7-characterize',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Characterize the image: real/virtual, upright/inverted, magnified/diminished.',
      description: 'Student describes image characteristics',
    },
  ],
}

// =============================================================================
// Template: Interference (Young's Double Slit)
// =============================================================================

export const TEMPLATE_INTERFERENCE: PatternTemplate = {
  templateId: 'optics/interference',
  topic: 'optics',
  subtopic: 'interference',
  description: 'Young\'s double slit and thin film interference',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'wavelength',
    'slit_separation',
    'screen_distance',
    'fringe_width',
    'path_difference',
    'order',
    'angle',
    'intensity',
    'film_thickness',
    'refractive_index',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the type of interference: double slit, thin film, or single slit diffraction.',
      description: 'Student classifies the interference type',
    },
    {
      id: 'step-2-path-difference',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the expression for path difference between interfering waves.',
      description: 'Student writes Δ = d·sinθ or geometric path difference',
    },
    {
      id: 'step-3-constructive',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'For constructive interference (bright fringe): path difference = nλ.',
      description: 'Student writes condition for bright fringes',
    },
    {
      id: 'step-4-destructive',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'For destructive interference (dark fringe): path difference = (n+½)λ.',
      description: 'Student writes condition for dark fringes',
    },
    {
      id: 'step-5-fringe-width',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'For double slit, find fringe width: β = λD/d.',
      description: 'Student calculates fringe separation',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student computes final answer',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: How does fringe width change if wavelength increases? If slit separation increases?',
      description: 'Student checks proportionality relationships',
    },
  ],
}

// =============================================================================
// WAVES TEMPLATES
// =============================================================================

// =============================================================================
// Template: Standing Waves
// =============================================================================

export const TEMPLATE_STANDING_WAVES: PatternTemplate = {
  templateId: 'waves/standing_waves',
  topic: 'waves',
  subtopic: 'standing_waves',
  description: 'Standing waves in strings and pipes',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'length',
    'frequency',
    'wavelength',
    'wave_speed',
    'tension',
    'linear_density',
    'harmonic_number',
    'node_count',
    'antinode_count',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the boundary conditions: fixed-fixed, open-open, or fixed-open.',
      description: 'Student classifies boundary conditions',
    },
    {
      id: 'step-2-diagram',
      type: 'diagram',
      requiredFields: ['prompt', 'hint', 'trap', 'solution'],
      promptTemplate: 'Draw the standing wave pattern for the given harmonic.',
      description: 'Student sketches nodes and antinodes',
    },
    {
      id: 'step-3-wavelength',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the relationship between length L and wavelength λ for this harmonic.',
      description: 'Student writes L = nλ/2 or similar',
    },
    {
      id: 'step-4-wave-speed',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the wave speed equation: v = fλ or v = √(T/μ) for strings.',
      description: 'Student relates frequency, wavelength, and speed',
    },
    {
      id: 'step-5-frequency',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Find the frequency for the given harmonic.',
      description: 'Student calculates resonant frequency',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student computes final answer',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: How many nodes and antinodes are there? Is the frequency ratio correct?',
      description: 'Student verifies standing wave pattern',
    },
  ],
}

// =============================================================================
// Template: Doppler Effect
// =============================================================================

export const TEMPLATE_DOPPLER: PatternTemplate = {
  templateId: 'waves/doppler',
  topic: 'waves',
  subtopic: 'doppler',
  description: 'Doppler effect for sound and light',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'source_frequency',
    'observed_frequency',
    'wave_speed',
    'source_velocity',
    'observer_velocity',
    'wavelength',
    'beat_frequency',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Is the source moving, the observer moving, or both? In which directions?',
      description: 'Student identifies relative motion',
    },
    {
      id: 'step-2-approach-recede',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Are source and observer approaching or receding from each other?',
      description: 'Student determines if frequency increases or decreases',
    },
    {
      id: 'step-3-formula',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the Doppler formula: f\' = f(v ± v_o)/(v ∓ v_s).',
      description: 'Student writes Doppler equation with correct signs',
    },
    {
      id: 'step-4-signs',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply the sign convention: + in numerator if observer approaches, - in denominator if source approaches.',
      description: 'Student correctly applies sign conventions',
    },
    {
      id: 'step-5-calculate',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the observed frequency.',
      description: 'Student computes f\'',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student finds final answer',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Does approaching give higher frequency? Does receding give lower frequency?',
      description: 'Student checks physical intuition',
    },
  ],
}

// =============================================================================
// MODERN PHYSICS TEMPLATES
// =============================================================================

// =============================================================================
// Template: Photoelectric Effect
// =============================================================================

export const TEMPLATE_PHOTOELECTRIC: PatternTemplate = {
  templateId: 'modern/photoelectric',
  topic: 'modern',
  subtopic: 'photoelectric',
  description: 'Photoelectric effect and photon energy',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'frequency',
    'wavelength',
    'photon_energy',
    'work_function',
    'kinetic_energy_max',
    'stopping_potential',
    'threshold_frequency',
    'planck_constant',
  ],
  stepBlueprints: [
    {
      id: 'step-1-photon-energy',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the energy of incident photons: E = hf = hc/λ.',
      description: 'Student computes photon energy',
    },
    {
      id: 'step-2-work-function',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the work function in terms of threshold frequency: φ = hf₀.',
      description: 'Student expresses work function',
    },
    {
      id: 'step-3-emission-check',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Is the photon energy greater than the work function? Will electrons be emitted?',
      description: 'Student checks if emission occurs',
    },
    {
      id: 'step-4-einstein',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Apply Einstein\'s photoelectric equation: hf = φ + KE_max.',
      description: 'Student writes Einstein\'s equation',
    },
    {
      id: 'step-5-stopping-potential',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Relate maximum KE to stopping potential: KE_max = eV_s.',
      description: 'Student connects KE to stopping potential',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student calculates final answer',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: Does KE_max increase with frequency? Is it independent of intensity?',
      description: 'Student verifies photoelectric properties',
    },
  ],
}

// =============================================================================
// Template: Bohr Model
// =============================================================================

export const TEMPLATE_BOHR_MODEL: PatternTemplate = {
  templateId: 'modern/bohr_model',
  topic: 'modern',
  subtopic: 'bohr_model',
  description: 'Bohr model of hydrogen atom',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'principal_quantum_number',
    'energy_level',
    'radius',
    'velocity',
    'wavelength_emitted',
    'frequency_emitted',
    'ionization_energy',
    'rydberg_constant',
  ],
  stepBlueprints: [
    {
      id: 'step-1-identify',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the initial and final energy levels (n₁ and n₂).',
      description: 'Student identifies quantum numbers',
    },
    {
      id: 'step-2-energy-levels',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the energy level formula: E_n = -13.6 eV / n².',
      description: 'Student writes Bohr energy formula',
    },
    {
      id: 'step-3-energy-difference',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Calculate the energy difference: ΔE = E_final - E_initial.',
      description: 'Student computes transition energy',
    },
    {
      id: 'step-4-photon',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Relate photon energy to transition: |ΔE| = hf = hc/λ.',
      description: 'Student connects to photon properties',
    },
    {
      id: 'step-5-radius',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'If needed, use orbit radius: r_n = n² × a₀ (a₀ = 0.529 Å).',
      description: 'Student calculates orbit radius',
    },
    {
      id: 'step-6-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student computes final answer',
    },
    {
      id: 'step-7-series',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the spectral series: Lyman (n_f=1), Balmer (n_f=2), Paschen (n_f=3).',
      description: 'Student classifies the spectral series',
    },
  ],
}

// =============================================================================
// Template: Nuclear Decay
// =============================================================================

export const TEMPLATE_NUCLEAR_DECAY: PatternTemplate = {
  templateId: 'modern/nuclear_decay',
  topic: 'modern',
  subtopic: 'nuclear_decay',
  description: 'Radioactive decay and half-life calculations',
  rules: 'no add/remove/reorder',
  allowedVariables: [
    'initial_amount',
    'final_amount',
    'half_life',
    'decay_constant',
    'time',
    'activity',
    'mass_number',
    'atomic_number',
  ],
  stepBlueprints: [
    {
      id: 'step-1-decay-type',
      type: 'mcq',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Identify the type of decay: alpha (α), beta (β), or gamma (γ).',
      description: 'Student classifies decay type',
    },
    {
      id: 'step-2-half-life',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Relate decay constant to half-life: λ = ln(2)/t₁/₂.',
      description: 'Student writes decay constant relation',
    },
    {
      id: 'step-3-decay-law',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the exponential decay law: N = N₀·e^(-λt) or N = N₀·(1/2)^(t/t₁/₂).',
      description: 'Student writes decay equation',
    },
    {
      id: 'step-4-activity',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'If needed, write activity: A = λN = A₀·e^(-λt).',
      description: 'Student relates activity to decay',
    },
    {
      id: 'step-5-solve',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Solve for the {{asked_quantity}}.',
      description: 'Student calculates final answer',
    },
    {
      id: 'step-6-products',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Write the decay products: verify conservation of mass number and charge.',
      description: 'Student checks conservation laws',
    },
    {
      id: 'step-7-sanity',
      type: 'short',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      promptTemplate: 'Verify: After one half-life, does half remain? After two half-lives, does 1/4 remain?',
      description: 'Student verifies decay pattern',
    },
  ],
}

// =============================================================================
// Template Registry
// =============================================================================

export const TEMPLATE_REGISTRY: Record<string, PatternTemplate> = {
  // Mechanics
  'mechanics/incline_frictionless': TEMPLATE_INCLINE_FRICTIONLESS,
  'mechanics/incline_with_friction': TEMPLATE_INCLINE_WITH_FRICTION,
  'mechanics/newton_2d_block': TEMPLATE_NEWTON_2D_BLOCK,
  'mechanics/projectile_motion': TEMPLATE_PROJECTILE_MOTION,
  'mechanics/circular_motion': TEMPLATE_CIRCULAR_MOTION,
  'mechanics/work_energy': TEMPLATE_WORK_ENERGY,
  'mechanics/momentum_collision': TEMPLATE_MOMENTUM_COLLISION,
  'mechanics/pulley_system': TEMPLATE_PULLEY_SYSTEM,
  'mechanics/simple_harmonic_motion': TEMPLATE_SHM,

  // Thermodynamics
  'thermodynamics/ideal_gas': TEMPLATE_IDEAL_GAS,
  'thermodynamics/first_law': TEMPLATE_FIRST_LAW,
  'thermodynamics/heat_engine': TEMPLATE_HEAT_ENGINE,
  'thermodynamics/calorimetry': TEMPLATE_CALORIMETRY,

  // Electromagnetism
  'electromagnetism/coulomb_field': TEMPLATE_COULOMB_FIELD,
  'electromagnetism/gauss_law': TEMPLATE_GAUSS_LAW,
  'electromagnetism/capacitors': TEMPLATE_CAPACITORS,
  'electromagnetism/dc_circuits': TEMPLATE_DC_CIRCUITS,
  'electromagnetism/magnetic_force': TEMPLATE_MAGNETIC_FORCE,
  'electromagnetism/em_induction': TEMPLATE_EM_INDUCTION,

  // Optics
  'optics/mirrors': TEMPLATE_MIRRORS,
  'optics/lenses': TEMPLATE_LENSES,
  'optics/interference': TEMPLATE_INTERFERENCE,

  // Waves
  'waves/standing_waves': TEMPLATE_STANDING_WAVES,
  'waves/doppler': TEMPLATE_DOPPLER,

  // Modern Physics
  'modern/photoelectric': TEMPLATE_PHOTOELECTRIC,
  'modern/bohr_model': TEMPLATE_BOHR_MODEL,
  'modern/nuclear_decay': TEMPLATE_NUCLEAR_DECAY,
}

/**
 * Get a template by ID
 */
export function getTemplate(templateId: string): PatternTemplate | null {
  return TEMPLATE_REGISTRY[templateId] ?? null
}

/**
 * Find the best template for a given topic/subtopic
 * Returns null if no matching template found
 */
export function findBestTemplate(topic: string, subtopic: string): PatternTemplate | null {
  // First, try exact match
  const exactKey = `${topic}/${subtopic}`
  if (TEMPLATE_REGISTRY[exactKey]) {
    return TEMPLATE_REGISTRY[exactKey]
  }

  // Look for templates with matching topic
  const matchingTemplates = Object.values(TEMPLATE_REGISTRY).filter(
    t => t.topic === topic
  )

  if (matchingTemplates.length === 0) {
    return null
  }

  // Score by subtopic similarity
  const scored = matchingTemplates.map(t => ({
    template: t,
    score: subtopicSimilarity(t.subtopic, subtopic),
  }))

  scored.sort((a, b) => b.score - a.score)

  // Return best match if score is above threshold
  if (scored[0].score > 0.3) {
    return scored[0].template
  }

  // Fallback to first matching topic template
  return matchingTemplates[0]
}

/**
 * Simple keyword-based subtopic similarity
 */
function subtopicSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().replace(/[_-]/g, ' ').split(/\s+/))
  const wordsB = new Set(b.toLowerCase().replace(/[_-]/g, ' ').split(/\s+/))

  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)))
  const union = new Set([...wordsA, ...wordsB])

  return intersection.size / union.size
}

/**
 * Get all available template IDs
 */
export function getAllTemplateIds(): string[] {
  return Object.keys(TEMPLATE_REGISTRY)
}
