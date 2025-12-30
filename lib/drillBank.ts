/**
 * Drill Bank
 *
 * Pre-defined remedial drills organized by error tag.
 * Each drill is a 10-second targeted practice question.
 */

import type { ErrorTag, DrillTask } from '@/types/circuitBreaker'

// ============================================
// Vector Component Drills
// ============================================

const VECTOR_COMPONENT_DRILLS: DrillTask[] = [
  {
    id: 'drill_vec_001',
    linkedErrorTag: 'vector_component',
    linkedCategory: 'VECTOR_SCALAR_CONFUSION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 1,
      levelTitle: 'Concept',
      question:
        'A force F acts at angle θ above the horizontal. Which gives the horizontal component?',
      options: ['F sin(θ)', 'F cos(θ)', 'F tan(θ)', 'F / cos(θ)'],
      correctIndex: 1,
      explanation: 'The horizontal component uses cosine: Fₓ = F cos(θ)',
      feedbackPerOption: [
        'sin(θ) gives the vertical component, not horizontal',
        'Correct! cos(θ) projects onto the horizontal axis',
        'tan(θ) is the ratio of components, not a component itself',
        'Division by cos is used for resolving along an inclined plane',
      ],
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Vector resolution', 'Trigonometry basics'],
    successMessage: 'Remember: Fₓ = F cos(θ), Fᵧ = F sin(θ)',
    conceptReinforcement:
      'The angle is always measured from the axis you want the component along.',
  },
  {
    id: 'drill_vec_002',
    linkedErrorTag: 'vector_component',
    linkedCategory: 'VECTOR_SCALAR_CONFUSION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'FILL_BLANK',
      level: 1,
      levelTitle: 'Concept',
      question: 'Complete the vector component formula:',
      sentence: 'If a velocity v makes angle θ with the x-axis, then vᵧ = v × ____',
      correctTerm: 'sin(θ)',
      distractors: ['cos(θ)', 'tan(θ)', 'θ'],
      explanation: 'The y-component (perpendicular to reference) uses sine.',
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Vector resolution'],
    successMessage: 'vₓ = v cos(θ), vᵧ = v sin(θ) — memorize this pattern!',
    conceptReinforcement: 'Sine for the perpendicular component, cosine for the parallel.',
  },
  {
    id: 'drill_vec_003',
    linkedErrorTag: 'vector_component',
    linkedCategory: 'VECTOR_SCALAR_CONFUSION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 2,
      levelTitle: 'Visual',
      question:
        'A block slides down a 30° incline. Which component of weight acts along the incline?',
      options: ['mg cos(30°)', 'mg sin(30°)', 'mg tan(30°)', 'mg'],
      correctIndex: 1,
      explanation: 'The component along the incline uses sin of the incline angle.',
      feedbackPerOption: [
        'cos(30°) gives the component perpendicular to the incline',
        'Correct! sin(θ) gives the component along the incline',
        'tan is not used for component resolution',
        'mg is the full weight, not a component',
      ],
    },
    difficulty: 'reinforcement',
    prerequisiteKnowledge: ['Inclined plane geometry', 'Weight components'],
    successMessage: 'On inclines: mg sin(θ) along, mg cos(θ) perpendicular',
    conceptReinforcement: 'Draw the weight vector from the center of mass pointing straight down.',
  },
]

// ============================================
// Sign Convention Drills
// ============================================

const SIGN_CONVENTION_DRILLS: DrillTask[] = [
  {
    id: 'drill_sign_001',
    linkedErrorTag: 'sign_convention',
    linkedCategory: 'SIGN_CONVENTION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'FILL_BLANK',
      level: 1,
      levelTitle: 'Concept',
      question: 'Complete the sign convention rule:',
      sentence: 'If upward is positive, then the acceleration due to gravity g is ____.',
      correctTerm: 'negative',
      distractors: ['positive', 'zero', '9.8'],
      explanation: 'Gravity points downward, opposite to the positive direction.',
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Coordinate systems', 'Vectors'],
    successMessage: 'g direction depends on your chosen convention!',
    conceptReinforcement:
      'Always define your positive direction first, then assign signs consistently.',
  },
  {
    id: 'drill_sign_002',
    linkedErrorTag: 'sign_convention',
    linkedCategory: 'SIGN_CONVENTION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 1,
      levelTitle: 'Concept',
      question:
        'A ball is thrown upward with initial velocity +20 m/s. After 3 seconds, its velocity is:',
      options: ['+20 - 9.8(3)', '+20 + 9.8(3)', '-20 - 9.8(3)', '9.8(3) - 20'],
      correctIndex: 0,
      explanation: 'v = v₀ + at, with a = -g when up is positive.',
      feedbackPerOption: [
        'Correct! Gravity decelerates upward motion',
        'This would mean gravity accelerates the ball upward',
        'Initial velocity is positive (upward)',
        'Order matters: start with initial velocity',
      ],
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Kinematics', '1D motion'],
    successMessage: 'v = v₀ + at — keep signs consistent throughout!',
    conceptReinforcement:
      'If up is +, then g points down, so use -g in equations.',
  },
  {
    id: 'drill_sign_003',
    linkedErrorTag: 'sign_convention',
    linkedCategory: 'SIGN_CONVENTION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 2,
      levelTitle: 'Visual',
      question:
        'Two blocks connected by a string over a pulley. If block A moves up as positive, block B moving down is:',
      options: ['Positive', 'Negative', 'Zero', 'Undefined'],
      correctIndex: 0,
      explanation:
        'Connected objects have coupled motion: if A goes up, B goes down, but both displacements are positive in a coupled coordinate system.',
      feedbackPerOption: [
        'Correct! In a coupled system, positive means in the direction of motion',
        'Only if you use separate coordinate systems',
        'Zero means no motion',
        'It is well-defined once you set convention',
      ],
    },
    difficulty: 'reinforcement',
    prerequisiteKnowledge: ['Pulleys', 'Constraint equations'],
    successMessage: 'In pulley systems, define positive as the direction of expected motion.',
    conceptReinforcement:
      'One consistent convention for the whole system prevents sign errors.',
  },
]

// ============================================
// Trigonometry Identity Drills
// ============================================

const TRIG_IDENTITY_DRILLS: DrillTask[] = [
  {
    id: 'drill_trig_001',
    linkedErrorTag: 'trig_identity',
    linkedCategory: 'ALGEBRA_MANIPULATION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 1,
      levelTitle: 'Concept',
      question: 'Which identity is correct?',
      options: [
        'sin²θ + cos²θ = 1',
        'sin²θ - cos²θ = 1',
        'sinθ + cosθ = 1',
        'sin²θ × cos²θ = 1',
      ],
      correctIndex: 0,
      explanation: 'The Pythagorean identity: sin²θ + cos²θ = 1',
      feedbackPerOption: [
        'Correct! This is the fundamental Pythagorean identity',
        'This equals cos(2θ), not 1',
        'sin + cos only equals 1 at specific angles',
        'Product of squares is not 1',
      ],
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Trigonometry'],
    successMessage: 'sin²θ + cos²θ = 1 — the most useful trig identity!',
    conceptReinforcement: 'Derived from the Pythagorean theorem on a unit circle.',
  },
  {
    id: 'drill_trig_002',
    linkedErrorTag: 'trig_identity',
    linkedCategory: 'ALGEBRA_MANIPULATION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'FILL_BLANK',
      level: 1,
      levelTitle: 'Concept',
      question: 'Complete the identity:',
      sentence: 'tan(θ) = sin(θ) / ____',
      correctTerm: 'cos(θ)',
      distractors: ['sin(θ)', 'tan(θ)', '1'],
      explanation: 'Tangent is defined as the ratio of sine to cosine.',
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Trigonometry definitions'],
    successMessage: 'tan = sin/cos, cot = cos/sin',
    conceptReinforcement: 'SOH-CAH-TOA: Tangent = Opposite/Adjacent = sin/cos',
  },
  {
    id: 'drill_trig_003',
    linkedErrorTag: 'trig_identity',
    linkedCategory: 'ALGEBRA_MANIPULATION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 2,
      levelTitle: 'Visual',
      question: 'sin(90° - θ) equals:',
      options: ['cos(θ)', 'sin(θ)', '-sin(θ)', '-cos(θ)'],
      correctIndex: 0,
      explanation: 'Complementary angle identity: sin(90° - θ) = cos(θ)',
      feedbackPerOption: [
        'Correct! This is the co-function identity',
        'sin(90° - θ) ≠ sin(θ) in general',
        'No negative sign here',
        'Wrong sign and wrong function',
      ],
    },
    difficulty: 'reinforcement',
    prerequisiteKnowledge: ['Complementary angles'],
    successMessage: 'sin(90° - θ) = cos(θ) and cos(90° - θ) = sin(θ)',
    conceptReinforcement:
      'In a right triangle, the two acute angles are complementary.',
  },
]

// ============================================
// Unit Conversion Drills
// ============================================

const UNIT_CONVERSION_DRILLS: DrillTask[] = [
  {
    id: 'drill_unit_001',
    linkedErrorTag: 'unit_conversion',
    linkedCategory: 'UNIT_CONVERSION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 1,
      levelTitle: 'Concept',
      question: '72 km/h equals how many m/s?',
      options: ['20 m/s', '72 m/s', '7.2 m/s', '200 m/s'],
      correctIndex: 0,
      explanation: '72 × (1000/3600) = 72 × (5/18) = 20 m/s',
      feedbackPerOption: [
        'Correct! Multiply by 5/18 to convert km/h to m/s',
        'You need to convert, not just change units',
        'You divided by 10 instead of multiplying by 5/18',
        'You multiplied by 1000/3600 incorrectly',
      ],
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Unit conversion'],
    successMessage: 'km/h to m/s: multiply by 5/18 (or divide by 3.6)',
    conceptReinforcement: '1 km = 1000 m, 1 hour = 3600 s',
  },
  {
    id: 'drill_unit_002',
    linkedErrorTag: 'unit_conversion',
    linkedCategory: 'UNIT_CONVERSION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'FILL_BLANK',
      level: 1,
      levelTitle: 'Concept',
      question: 'Convert 500 g to kg:',
      sentence: '500 g = ____ kg',
      correctTerm: '0.5',
      distractors: ['5', '50', '5000'],
      explanation: '1 kg = 1000 g, so 500 g = 0.5 kg',
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Metric prefixes'],
    successMessage: 'Remember: kilo = 1000, so divide by 1000',
    conceptReinforcement: 'Always convert to SI units (kg, m, s) before calculating.',
  },
  {
    id: 'drill_unit_003',
    linkedErrorTag: 'unit_conversion',
    linkedCategory: 'UNIT_CONVERSION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 2,
      levelTitle: 'Visual',
      question: '1 cm² equals how many m²?',
      options: ['10⁻⁴ m²', '10⁻² m²', '10² m²', '10⁻¹ m²'],
      correctIndex: 0,
      explanation: '1 cm = 10⁻² m, so 1 cm² = (10⁻²)² = 10⁻⁴ m²',
      feedbackPerOption: [
        'Correct! Square the conversion factor',
        'You forgot to square the conversion',
        'This would make cm² larger than m²',
        'Not the right power',
      ],
    },
    difficulty: 'reinforcement',
    prerequisiteKnowledge: ['Area units'],
    successMessage: 'For area: square the linear conversion factor!',
    conceptReinforcement: 'cm² to m²: (10⁻²)² = 10⁻⁴. For volume: cube it.',
  },
]

// ============================================
// Algebra Manipulation Drills
// ============================================

const ALGEBRA_MANIPULATION_DRILLS: DrillTask[] = [
  {
    id: 'drill_alg_001',
    linkedErrorTag: 'algebra_manipulation',
    linkedCategory: 'ALGEBRA_MANIPULATION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 1,
      levelTitle: 'Concept',
      question: '(a + b)² equals:',
      options: ['a² + 2ab + b²', 'a² + b²', 'a² - b²', '2a² + 2b²'],
      correctIndex: 0,
      explanation: 'The binomial expansion: (a + b)² = a² + 2ab + b²',
      feedbackPerOption: [
        'Correct! Don\'t forget the middle term 2ab',
        'Missing the cross term 2ab',
        'This is (a+b)(a-b), not (a+b)²',
        'This is 2(a² + b²), not the same',
      ],
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Algebra basics'],
    successMessage: '(a + b)² = a² + 2ab + b² — never forget the 2ab!',
    conceptReinforcement: 'Use FOIL: First, Outer, Inner, Last.',
  },
  {
    id: 'drill_alg_002',
    linkedErrorTag: 'algebra_manipulation',
    linkedCategory: 'ALGEBRA_MANIPULATION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'FILL_BLANK',
      level: 1,
      levelTitle: 'Concept',
      question: 'Simplify the square root:',
      sentence: '√(a²) = ____',
      correctTerm: '|a|',
      distractors: ['a', '-a', 'a²'],
      explanation: '√(a²) = |a|, the absolute value (always positive).',
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Square roots'],
    successMessage: '√(x²) = |x|, not just x (what if x is negative?)',
    conceptReinforcement:
      'Square root gives the positive root. Use ± when solving equations.',
  },
  {
    id: 'drill_alg_003',
    linkedErrorTag: 'algebra_manipulation',
    linkedCategory: 'ALGEBRA_MANIPULATION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 2,
      levelTitle: 'Visual',
      question: 'If v² = u² + 2as, solve for s:',
      options: ['s = (v² - u²)/(2a)', 's = (v² + u²)/(2a)', 's = 2a(v² - u²)', 's = v² - u² - 2a'],
      correctIndex: 0,
      explanation: 'Rearrange: 2as = v² - u², so s = (v² - u²)/(2a)',
      feedbackPerOption: [
        'Correct! Subtract u², then divide by 2a',
        'Should subtract u², not add',
        'You multiplied instead of dividing',
        'Incorrect rearrangement',
      ],
    },
    difficulty: 'reinforcement',
    prerequisiteKnowledge: ['Equation solving'],
    successMessage: 'Isolate the variable step by step: subtract, then divide.',
    conceptReinforcement:
      'What you do to one side, do to the other. Keep equations balanced.',
  },
]

// ============================================
// Conservation Scope Drills
// ============================================

const CONSERVATION_SCOPE_DRILLS: DrillTask[] = [
  {
    id: 'drill_cons_001',
    linkedErrorTag: 'conservation_scope',
    linkedCategory: 'CONSERVATION_MISAPPLICATION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 1,
      levelTitle: 'Concept',
      question:
        'A ball falls and hits the ground (not bouncing). Is mechanical energy conserved?',
      options: [
        'No — energy lost to deformation/heat',
        'Yes — gravity is conservative',
        'Yes — momentum is conserved',
        'Cannot determine',
      ],
      correctIndex: 0,
      explanation: 'Non-elastic collision: kinetic energy converts to heat/sound.',
      feedbackPerOption: [
        'Correct! Inelastic processes dissipate mechanical energy',
        'Gravity is conservative, but impact is not elastic',
        'Momentum conservation is separate from energy conservation',
        'We can determine from the physics of the collision',
      ],
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Energy conservation', 'Collisions'],
    successMessage:
      'Mechanical energy is only conserved when ALL forces are conservative AND no dissipation occurs.',
    conceptReinforcement:
      'Check: Is there friction? Is there an inelastic collision? If yes, mechanical energy is NOT conserved.',
  },
  {
    id: 'drill_cons_002',
    linkedErrorTag: 'conservation_scope',
    linkedCategory: 'CONSERVATION_MISAPPLICATION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'FILL_BLANK',
      level: 1,
      levelTitle: 'Concept',
      question: 'Complete the conservation check:',
      sentence: 'Momentum is conserved when there is no net ____ force on the system.',
      correctTerm: 'external',
      distractors: ['internal', 'gravitational', 'friction'],
      explanation:
        'Only external forces can change total system momentum. Internal forces cancel.',
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Momentum conservation'],
    successMessage: 'Draw a system boundary. Only external forces matter for momentum.',
    conceptReinforcement:
      'Internal forces (like collision forces between objects) cancel in pairs (Newton 3rd law).',
  },
  {
    id: 'drill_cons_003',
    linkedErrorTag: 'conservation_scope',
    linkedCategory: 'CONSERVATION_MISAPPLICATION',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 2,
      levelTitle: 'Visual',
      question:
        'A person pushes a box with friction present. Can you use Work-Energy theorem?',
      options: [
        'Yes — include work by friction',
        'No — friction means no energy conservation',
        'Yes — friction is an internal force',
        'No — only conservative forces allowed',
      ],
      correctIndex: 0,
      explanation:
        'Work-Energy theorem works always: W_net = ΔKE. Include ALL forces.',
      feedbackPerOption: [
        'Correct! W_net includes work by ALL forces, including friction',
        'Work-Energy theorem always works; energy "conservation" is different',
        'Friction is external to the box',
        'That restriction applies to mechanical energy conservation, not Work-Energy theorem',
      ],
    },
    difficulty: 'reinforcement',
    prerequisiteKnowledge: ['Work-Energy theorem'],
    successMessage:
      'Work-Energy theorem (W_net = ΔKE) always works. Conservation of mechanical energy has restrictions.',
    conceptReinforcement:
      'Conservation = special case with no non-conservative work. Work-Energy = always valid.',
  },
]

// ============================================
// Reference Frame Drills
// ============================================

const REFERENCE_FRAME_DRILLS: DrillTask[] = [
  {
    id: 'drill_ref_001',
    linkedErrorTag: 'reference_frame',
    linkedCategory: 'REFERENCE_FRAME',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 1,
      levelTitle: 'Concept',
      question:
        'In a non-inertial frame (like an accelerating car), what must you add?',
      options: ['Pseudo force', 'Extra mass', 'Friction', 'Normal force'],
      correctIndex: 0,
      explanation:
        'In non-inertial frames, add pseudo force = -ma (opposite to frame acceleration).',
      feedbackPerOption: [
        'Correct! Pseudo force accounts for the frame\'s acceleration',
        'Mass doesn\'t change with reference frame',
        'Friction is a real force, present in all frames',
        'Normal force is real, not frame-dependent',
      ],
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Reference frames', 'Newton\'s laws'],
    successMessage: 'Non-inertial frame → Add pseudo force F = -ma_frame',
    conceptReinforcement:
      'Pseudo forces are "fictitious" — they only appear because the frame is accelerating.',
  },
  {
    id: 'drill_ref_002',
    linkedErrorTag: 'reference_frame',
    linkedCategory: 'REFERENCE_FRAME',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'FILL_BLANK',
      level: 1,
      levelTitle: 'Concept',
      question: 'Relative velocity formula:',
      sentence: 'Velocity of A relative to B: v_AB = v_A - ____',
      correctTerm: 'v_B',
      distractors: ['v_A', 'v_AB', '0'],
      explanation: 'Relative velocity: v_AB = v_A - v_B (subtract the observer\'s velocity).',
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Relative motion'],
    successMessage: 'v_AB = v_A - v_B. "A relative to B" means B is the observer.',
    conceptReinforcement:
      'To find motion relative to B, subtract B\'s velocity from everything.',
  },
  {
    id: 'drill_ref_003',
    linkedErrorTag: 'reference_frame',
    linkedCategory: 'REFERENCE_FRAME',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 2,
      levelTitle: 'Visual',
      question:
        'A person in a rotating merry-go-round feels pushed outward. This is called:',
      options: [
        'Centrifugal force (pseudo)',
        'Centripetal force',
        'Gravitational force',
        'Normal force',
      ],
      correctIndex: 0,
      explanation:
        'In the rotating frame, centrifugal force (pseudo) points outward. In ground frame, centripetal force points inward.',
      feedbackPerOption: [
        'Correct! Centrifugal is the pseudo force in the rotating frame',
        'Centripetal points inward and is seen from ground frame',
        'Gravity points down, not outward',
        'Normal force is from contact, not rotation',
      ],
    },
    difficulty: 'reinforcement',
    prerequisiteKnowledge: ['Circular motion', 'Rotating frames'],
    successMessage:
      'Centrifugal (outward, pseudo) vs Centripetal (inward, real) — know your frame!',
    conceptReinforcement:
      'Ground frame: centripetal. Rotating frame: add centrifugal (and Coriolis if moving).',
  },
]

// ============================================
// Force Enumeration Drills
// ============================================

const FORCE_ENUMERATION_DRILLS: DrillTask[] = [
  {
    id: 'drill_force_001',
    linkedErrorTag: 'force_enumeration',
    linkedCategory: 'BOUNDARY_CONDITIONS',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 1,
      levelTitle: 'Concept',
      question:
        'A book rests on a table. How many forces act on the book?',
      options: ['2', '1', '3', '0'],
      correctIndex: 0,
      explanation: 'Weight (down) and Normal force (up). Two forces in equilibrium.',
      feedbackPerOption: [
        'Correct! Weight and Normal force',
        'You\'re missing either weight or normal force',
        'Only weight and normal — no other contacts',
        'Objects always have weight due to gravity',
      ],
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Free body diagrams'],
    successMessage:
      'Systematic check: Weight (always), Normal (if contact), Friction (if sliding/tendency), Tension (if string), Applied (if pushed).',
    conceptReinforcement:
      'Draw FBD: isolate the object, draw ALL forces acting ON it.',
  },
  {
    id: 'drill_force_002',
    linkedErrorTag: 'force_enumeration',
    linkedCategory: 'BOUNDARY_CONDITIONS',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'FILL_BLANK',
      level: 1,
      levelTitle: 'Concept',
      question: 'Force checklist:',
      sentence:
        'When drawing a free body diagram, the first force to draw is always ____.',
      correctTerm: 'weight',
      distractors: ['friction', 'normal', 'tension'],
      explanation: 'Weight (mg) acts on every object near Earth. Draw it first, pointing down.',
    },
    difficulty: 'foundation',
    prerequisiteKnowledge: ['Free body diagrams'],
    successMessage: 'Start with weight, then add contact forces based on the situation.',
    conceptReinforcement:
      'Weight always points toward Earth\'s center (straight down for most problems).',
  },
  {
    id: 'drill_force_003',
    linkedErrorTag: 'force_enumeration',
    linkedCategory: 'BOUNDARY_CONDITIONS',
    expectedDurationSeconds: 10,
    maxAttempts: 2,
    task: {
      type: 'MULTIPLE_CHOICE',
      level: 2,
      levelTitle: 'Visual',
      question:
        'A block on a rough incline is stationary. Which forces act on it?',
      options: [
        'Weight, Normal, Static Friction',
        'Weight, Normal only',
        'Weight, Normal, Kinetic Friction',
        'Weight, Normal, Friction, Applied',
      ],
      correctIndex: 0,
      explanation:
        'Block is stationary on rough surface: static friction prevents sliding.',
      feedbackPerOption: [
        'Correct! Static friction opposes the tendency to slide',
        'Rough surface means friction exists',
        'Kinetic friction is for moving objects; this is stationary',
        'No applied force mentioned in the problem',
      ],
    },
    difficulty: 'reinforcement',
    prerequisiteKnowledge: ['Friction types', 'Inclined planes'],
    successMessage:
      'Stationary on rough surface → Static friction. Moving → Kinetic friction.',
    conceptReinforcement:
      'Static friction adjusts to prevent motion (up to μₛN). Kinetic is constant (μₖN).',
  },
]

// ============================================
// Drill Bank Registry
// ============================================

const DRILL_BANK: Record<ErrorTag, DrillTask[]> = {
  vector_component: VECTOR_COMPONENT_DRILLS,
  sign_convention: SIGN_CONVENTION_DRILLS,
  trig_identity: TRIG_IDENTITY_DRILLS,
  unit_conversion: UNIT_CONVERSION_DRILLS,
  algebra_manipulation: ALGEBRA_MANIPULATION_DRILLS,
  conservation_scope: CONSERVATION_SCOPE_DRILLS,
  reference_frame: REFERENCE_FRAME_DRILLS,
  force_enumeration: FORCE_ENUMERATION_DRILLS,
}

// ============================================
// Export Functions
// ============================================

/**
 * Get all drills for a specific error tag
 */
export function getDrillsForTag(errorTag: ErrorTag): DrillTask[] {
  return DRILL_BANK[errorTag] || []
}

/**
 * Get a specific drill by ID
 */
export function getDrillById(drillId: string): DrillTask | null {
  for (const drills of Object.values(DRILL_BANK)) {
    const drill = drills.find((d) => d.id === drillId)
    if (drill) return drill
  }
  return null
}

/**
 * Get all available drills
 */
export function getAllDrills(): DrillTask[] {
  return Object.values(DRILL_BANK).flat()
}

/**
 * Get drill count by tag
 */
export function getDrillCountByTag(): Record<ErrorTag, number> {
  const counts: Record<ErrorTag, number> = {
    vector_component: 0,
    sign_convention: 0,
    trig_identity: 0,
    unit_conversion: 0,
    algebra_manipulation: 0,
    conservation_scope: 0,
    reference_frame: 0,
    force_enumeration: 0,
  }

  for (const [tag, drills] of Object.entries(DRILL_BANK)) {
    counts[tag as ErrorTag] = drills.length
  }

  return counts
}
