import { PrismaClient, QuestionLifecycleState, QuestionProvenance, Prisma } from '@prisma/client'

const prisma = new PrismaClient()

// Topics hierarchy
const topics = [
  // Top-level topics
  { topicId: 'mechanics', label: 'Mechanics', description: 'Study of motion and forces', level: 0, path: [] },
  { topicId: 'thermodynamics', label: 'Thermodynamics', description: 'Study of heat and energy transfer', level: 0, path: [] },
  { topicId: 'electromagnetism', label: 'Electromagnetism', description: 'Study of electric and magnetic phenomena', level: 0, path: [] },
  { topicId: 'optics', label: 'Optics', description: 'Study of light and its behavior', level: 0, path: [] },
  { topicId: 'waves', label: 'Waves', description: 'Study of wave phenomena', level: 0, path: [] },
  { topicId: 'modern', label: 'Modern Physics', description: 'Quantum mechanics, relativity, and nuclear physics', level: 0, path: [] },

  // Mechanics subtopics
  { topicId: 'mechanics/kinematics', label: 'Kinematics', description: 'Motion without considering forces', level: 1, path: ['mechanics'], parentTopicId: 'mechanics' },
  { topicId: 'mechanics/dynamics', label: 'Dynamics', description: 'Motion with forces (Newton\'s laws)', level: 1, path: ['mechanics'], parentTopicId: 'mechanics' },
  { topicId: 'mechanics/energy', label: 'Energy & Work', description: 'Work, energy, and power', level: 1, path: ['mechanics'], parentTopicId: 'mechanics' },
  { topicId: 'mechanics/momentum', label: 'Momentum', description: 'Linear and angular momentum', level: 1, path: ['mechanics'], parentTopicId: 'mechanics' },
  { topicId: 'mechanics/rotation', label: 'Rotational Motion', description: 'Circular and rotational dynamics', level: 1, path: ['mechanics'], parentTopicId: 'mechanics' },
  { topicId: 'mechanics/oscillations', label: 'Oscillations', description: 'Simple harmonic motion and oscillations', level: 1, path: ['mechanics'], parentTopicId: 'mechanics' },

  // Thermodynamics subtopics
  { topicId: 'thermodynamics/laws', label: 'Laws of Thermodynamics', description: 'First, second, and third laws', level: 1, path: ['thermodynamics'], parentTopicId: 'thermodynamics' },
  { topicId: 'thermodynamics/gases', label: 'Ideal Gases', description: 'Ideal gas law and kinetic theory', level: 1, path: ['thermodynamics'], parentTopicId: 'thermodynamics' },
  { topicId: 'thermodynamics/heat', label: 'Heat Transfer', description: 'Conduction, convection, radiation', level: 1, path: ['thermodynamics'], parentTopicId: 'thermodynamics' },

  // Electromagnetism subtopics
  { topicId: 'electromagnetism/electrostatics', label: 'Electrostatics', description: 'Static electric charges and fields', level: 1, path: ['electromagnetism'], parentTopicId: 'electromagnetism' },
  { topicId: 'electromagnetism/circuits', label: 'Circuits', description: 'DC and AC circuits', level: 1, path: ['electromagnetism'], parentTopicId: 'electromagnetism' },
  { topicId: 'electromagnetism/magnetism', label: 'Magnetism', description: 'Magnetic fields and forces', level: 1, path: ['electromagnetism'], parentTopicId: 'electromagnetism' },
  { topicId: 'electromagnetism/induction', label: 'Electromagnetic Induction', description: 'Faraday\'s law and inductance', level: 1, path: ['electromagnetism'], parentTopicId: 'electromagnetism' },

  // Optics subtopics
  { topicId: 'optics/geometric', label: 'Geometric Optics', description: 'Reflection and refraction', level: 1, path: ['optics'], parentTopicId: 'optics' },
  { topicId: 'optics/wave', label: 'Wave Optics', description: 'Interference and diffraction', level: 1, path: ['optics'], parentTopicId: 'optics' },

  // Waves subtopics
  { topicId: 'waves/mechanical', label: 'Mechanical Waves', description: 'Sound and other mechanical waves', level: 1, path: ['waves'], parentTopicId: 'waves' },
  { topicId: 'waves/sound', label: 'Sound', description: 'Acoustics and sound waves', level: 1, path: ['waves'], parentTopicId: 'waves' },

  // Modern physics subtopics
  { topicId: 'modern/quantum', label: 'Quantum Physics', description: 'Photoelectric effect, wave-particle duality', level: 1, path: ['modern'], parentTopicId: 'modern' },
  { topicId: 'modern/atomic', label: 'Atomic Physics', description: 'Atomic structure and spectra', level: 1, path: ['modern'], parentTopicId: 'modern' },
  { topicId: 'modern/nuclear', label: 'Nuclear Physics', description: 'Radioactivity and nuclear reactions', level: 1, path: ['modern'], parentTopicId: 'modern' },
]

// Patterns (problem types) - matching the template IDs
const patterns = [
  // Mechanics patterns
  { patternId: 'mechanics/incline_frictionless', label: 'Frictionless Inclined Plane', description: 'Block sliding on a frictionless inclined surface', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/incline_with_friction', label: 'Inclined Plane with Friction', description: 'Block on inclined surface with friction', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/newton_2d_block', label: 'Newton\'s Laws 2D Block', description: '2D force analysis on a block', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/projectile_motion', label: 'Projectile Motion', description: 'Motion of projectiles under gravity', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/circular_motion', label: 'Circular Motion', description: 'Uniform and non-uniform circular motion', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/work_energy', label: 'Work-Energy Theorem', description: 'Problems using work-energy principles', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/momentum_collision', label: 'Momentum & Collisions', description: 'Conservation of momentum in collisions', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/pulley_system', label: 'Pulley Systems', description: 'Systems with pulleys and connected masses', level: 1, path: ['mechanics'] },
  { patternId: 'mechanics/simple_harmonic_motion', label: 'Simple Harmonic Motion', description: 'Springs, pendulums, and oscillators', level: 1, path: ['mechanics'] },

  // Thermodynamics patterns
  { patternId: 'thermodynamics/ideal_gas', label: 'Ideal Gas Law', description: 'PV = nRT applications', level: 1, path: ['thermodynamics'] },
  { patternId: 'thermodynamics/first_law', label: 'First Law of Thermodynamics', description: 'Heat, work, and internal energy', level: 1, path: ['thermodynamics'] },
  { patternId: 'thermodynamics/heat_engine', label: 'Heat Engines', description: 'Carnot cycle and engine efficiency', level: 1, path: ['thermodynamics'] },
  { patternId: 'thermodynamics/calorimetry', label: 'Calorimetry', description: 'Heat transfer and specific heat', level: 1, path: ['thermodynamics'] },

  // Electromagnetism patterns
  { patternId: 'electromagnetism/coulomb_field', label: 'Coulomb\'s Law & Electric Field', description: 'Point charges and electric fields', level: 1, path: ['electromagnetism'] },
  { patternId: 'electromagnetism/gauss_law', label: 'Gauss\'s Law', description: 'Electric flux and symmetric charge distributions', level: 1, path: ['electromagnetism'] },
  { patternId: 'electromagnetism/capacitors', label: 'Capacitors', description: 'Capacitance and energy storage', level: 1, path: ['electromagnetism'] },
  { patternId: 'electromagnetism/dc_circuits', label: 'DC Circuits', description: 'Resistor networks, Kirchhoff\'s laws', level: 1, path: ['electromagnetism'] },
  { patternId: 'electromagnetism/magnetic_force', label: 'Magnetic Force', description: 'Force on charges and currents in magnetic fields', level: 1, path: ['electromagnetism'] },
  { patternId: 'electromagnetism/em_induction', label: 'Electromagnetic Induction', description: 'Faraday\'s law and Lenz\'s law', level: 1, path: ['electromagnetism'] },

  // Optics patterns
  { patternId: 'optics/mirrors', label: 'Mirrors', description: 'Plane and curved mirror problems', level: 1, path: ['optics'] },
  { patternId: 'optics/lenses', label: 'Lenses', description: 'Thin lens equation and magnification', level: 1, path: ['optics'] },
  { patternId: 'optics/interference', label: 'Interference', description: 'Double-slit and thin film interference', level: 1, path: ['optics'] },

  // Waves patterns
  { patternId: 'waves/standing_waves', label: 'Standing Waves', description: 'Resonance in strings and pipes', level: 1, path: ['waves'] },
  { patternId: 'waves/doppler', label: 'Doppler Effect', description: 'Frequency shift due to relative motion', level: 1, path: ['waves'] },

  // Modern physics patterns
  { patternId: 'modern/photoelectric', label: 'Photoelectric Effect', description: 'Light-matter interaction and work function', level: 1, path: ['modern'] },
  { patternId: 'modern/bohr_model', label: 'Bohr Model', description: 'Hydrogen atom energy levels and spectra', level: 1, path: ['modern'] },
  { patternId: 'modern/nuclear_decay', label: 'Nuclear Decay', description: 'Radioactive decay and half-life', level: 1, path: ['modern'] },
]

// Sample questions with full v2 payloads
const questions = [
  // Mechanics - Inclined Plane (Easy)
  {
    questionId: 'mech-incline-001',
    primaryPatternId: 'mechanics/incline_frictionless',
    difficulty: 2,
    topicTags: ['mechanics', 'dynamics', 'inclined-plane'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-incline-001',
      metadata: {
        title: 'Block on Frictionless Incline',
        difficulty: 2,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'dynamics', 'inclined-plane'],
        patternTags: ['incline-frictionless', 'newton-second-law'],
        metaSkillTags: ['fbd-drawing', 'vector-decomposition'],
      },
      prompt: {
        text: 'A 5 kg block is placed on a frictionless inclined plane that makes an angle of 30° with the horizontal. Find the acceleration of the block down the incline.',
        given: [
          { label: 'Mass', value: '5', unit: 'kg' },
          { label: 'Angle', value: '30', unit: '°' },
          { label: 'Friction', value: '0 (frictionless)' },
        ],
        asked: [
          { label: 'Acceleration', expectedForm: 'a = g sin(θ)' },
        ],
      },
      primaryPatternId: 'mechanics/incline_frictionless',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'What forces act on the block?',
          choices: [
            { key: 'A', text: 'Weight (mg) and Normal force (N)', isDistractor: false },
            { key: 'B', text: 'Weight, Normal force, and Friction', isDistractor: true },
            { key: 'C', text: 'Only Weight', isDistractor: true },
            { key: 'D', text: 'Weight, Normal force, and Applied force', isDistractor: true },
          ],
          correct: 'A',
          explanations: {
            micro: 'On a frictionless incline, only gravitational force (weight) and normal force act on the block.',
            hint: 'Think about what surfaces are in contact with the block.',
          },
        },
        {
          stepId: 'step-2',
          type: 'MCQ_SINGLE',
          prompt: 'What is the component of weight along the incline?',
          choices: [
            { key: 'A', text: '$mg \\sin\\theta$', isDistractor: false },
            { key: 'B', text: '$mg \\cos\\theta$', isDistractor: true },
            { key: 'C', text: '$mg \\tan\\theta$', isDistractor: true },
            { key: 'D', text: '$mg$', isDistractor: true },
          ],
          correct: 'A',
          explanations: {
            micro: 'The component of weight parallel to the incline is mg sin(θ).',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the acceleration (in m/s²). Take g = 10 m/s².',
          correctNumeric: 5,
          validation: { numericTolerance: 0.1, units: 'm/s²' },
          explanations: {
            micro: 'a = g sin(30°) = 10 × 0.5 = 5 m/s²',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 5, units: 'm/s²' },
        synthesis: [
          'Draw FBD showing weight and normal force',
          'Decompose weight into components parallel and perpendicular to incline',
          'Apply Newton\'s second law along the incline: ma = mg sin(θ)',
          'Solve for a = g sin(θ) = 10 × sin(30°) = 5 m/s²',
        ],
        limitingCases: [
          { condition: 'θ → 0', expected: 'a → 0', why: 'Horizontal surface, no acceleration' },
          { condition: 'θ → 90°', expected: 'a → g', why: 'Vertical free fall' },
        ],
      },
    },
  },

  // Mechanics - Projectile Motion (Medium)
  {
    questionId: 'mech-proj-001',
    primaryPatternId: 'mechanics/projectile_motion',
    difficulty: 3,
    topicTags: ['mechanics', 'kinematics', 'projectile'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-proj-001',
      metadata: {
        title: 'Projectile Range Calculation',
        difficulty: 3,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'kinematics', 'projectile'],
        patternTags: ['projectile-motion', 'range-formula'],
      },
      prompt: {
        text: 'A ball is thrown from ground level at an angle of 45° with an initial speed of 20 m/s. Find the horizontal range of the projectile. (Take g = 10 m/s²)',
        given: [
          { label: 'Initial speed', value: '20', unit: 'm/s' },
          { label: 'Launch angle', value: '45', unit: '°' },
          { label: 'Initial height', value: '0', unit: 'm' },
        ],
        asked: [
          { label: 'Horizontal range', expectedForm: 'R = v²sin(2θ)/g' },
        ],
      },
      primaryPatternId: 'mechanics/projectile_motion',
      steps: [
        {
          stepId: 'step-1',
          type: 'FILL_BLANK',
          prompt: 'What is the horizontal component of initial velocity (in m/s)?',
          correct: '14.14',
          validation: { numericTolerance: 0.5 },
          explanations: {
            micro: 'vₓ = v cos(45°) = 20 × (√2/2) ≈ 14.14 m/s',
          },
        },
        {
          stepId: 'step-2',
          type: 'MCQ_SINGLE',
          prompt: 'The range formula R = v²sin(2θ)/g gives maximum range when θ equals:',
          choices: [
            { key: 'A', text: '45°', isDistractor: false },
            { key: 'B', text: '30°', isDistractor: true },
            { key: 'C', text: '60°', isDistractor: true },
            { key: 'D', text: '90°', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the range (in meters).',
          correctNumeric: 40,
          validation: { numericTolerance: 0.5, units: 'm' },
          explanations: {
            micro: 'R = v²sin(2×45°)/g = (20)²×1/10 = 400/10 = 40 m',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 40, units: 'm' },
        synthesis: [
          'Identify this as a projectile motion problem starting and ending at ground level',
          'Use the range formula: R = v²sin(2θ)/g',
          'Substitute values: R = (20)²sin(90°)/10 = 400×1/10 = 40 m',
        ],
      },
    },
  },

  // Thermodynamics - Ideal Gas (Easy)
  {
    questionId: 'thermo-gas-001',
    primaryPatternId: 'thermodynamics/ideal_gas',
    difficulty: 2,
    topicTags: ['thermodynamics', 'ideal-gas', 'pv-nrt'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'thermo-gas-001',
      metadata: {
        title: 'Ideal Gas Law - Volume Change',
        difficulty: 2,
        estimatedTimeSec: 240,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['thermodynamics', 'ideal-gas'],
        patternTags: ['ideal-gas-law', 'isothermal-process'],
      },
      prompt: {
        text: 'An ideal gas at 300 K occupies a volume of 2 L at 1 atm pressure. If the pressure is doubled while keeping the temperature constant, what is the new volume?',
        given: [
          { label: 'Initial volume', value: '2', unit: 'L' },
          { label: 'Initial pressure', value: '1', unit: 'atm' },
          { label: 'Final pressure', value: '2', unit: 'atm' },
          { label: 'Temperature', value: '300', unit: 'K (constant)' },
        ],
        asked: [
          { label: 'Final volume', expectedForm: 'V₂ = P₁V₁/P₂' },
        ],
      },
      primaryPatternId: 'thermodynamics/ideal_gas',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'For an isothermal process (constant T), which law applies?',
          choices: [
            { key: 'A', text: 'Boyle\'s Law: P₁V₁ = P₂V₂', isDistractor: false },
            { key: 'B', text: 'Charles\'s Law: V₁/T₁ = V₂/T₂', isDistractor: true },
            { key: 'C', text: 'Gay-Lussac\'s Law: P₁/T₁ = P₂/T₂', isDistractor: true },
            { key: 'D', text: 'Avogadro\'s Law', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the final volume (in L).',
          correctNumeric: 1,
          validation: { numericTolerance: 0.05, units: 'L' },
          explanations: {
            micro: 'V₂ = P₁V₁/P₂ = (1)(2)/(2) = 1 L',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 1, units: 'L' },
        synthesis: [
          'Recognize isothermal process (constant temperature)',
          'Apply Boyle\'s Law: P₁V₁ = P₂V₂',
          'Solve: V₂ = P₁V₁/P₂ = (1 atm)(2 L)/(2 atm) = 1 L',
        ],
      },
    },
  },

  // Electromagnetism - DC Circuits (Medium)
  {
    questionId: 'em-circuit-001',
    primaryPatternId: 'electromagnetism/dc_circuits',
    difficulty: 3,
    topicTags: ['electromagnetism', 'circuits', 'resistors'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'em-circuit-001',
      metadata: {
        title: 'Series-Parallel Resistor Network',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['electromagnetism', 'circuits', 'resistors'],
        patternTags: ['dc-circuits', 'ohms-law', 'series-parallel'],
      },
      prompt: {
        text: 'Two resistors of 4Ω each are connected in parallel, and this combination is connected in series with a 2Ω resistor. If a 12V battery is connected across the circuit, find the current through the 2Ω resistor.',
        given: [
          { label: 'R₁', value: '4', unit: 'Ω' },
          { label: 'R₂', value: '4', unit: 'Ω' },
          { label: 'R₃', value: '2', unit: 'Ω' },
          { label: 'Voltage', value: '12', unit: 'V' },
        ],
        asked: [
          { label: 'Current through 2Ω resistor' },
        ],
      },
      primaryPatternId: 'electromagnetism/dc_circuits',
      steps: [
        {
          stepId: 'step-1',
          type: 'NUMERIC',
          prompt: 'Calculate the equivalent resistance of the two 4Ω resistors in parallel (in Ω).',
          correctNumeric: 2,
          validation: { numericTolerance: 0.1, units: 'Ω' },
          explanations: {
            micro: '1/R_parallel = 1/4 + 1/4 = 1/2, so R_parallel = 2Ω',
          },
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the total equivalent resistance of the circuit (in Ω).',
          correctNumeric: 4,
          validation: { numericTolerance: 0.1, units: 'Ω' },
          explanations: {
            micro: 'R_total = R_parallel + R₃ = 2 + 2 = 4Ω',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the current through the 2Ω resistor (in A).',
          correctNumeric: 3,
          validation: { numericTolerance: 0.1, units: 'A' },
          explanations: {
            micro: 'I = V/R_total = 12/4 = 3 A. Since the 2Ω resistor is in series, all current flows through it.',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 3, units: 'A' },
        synthesis: [
          'Calculate parallel combination: 1/R_p = 1/4 + 1/4 = 1/2 → R_p = 2Ω',
          'Add series resistance: R_total = 2 + 2 = 4Ω',
          'Apply Ohm\'s Law: I = V/R = 12/4 = 3 A',
        ],
      },
    },
  },

  // Modern Physics - Photoelectric Effect (Medium)
  {
    questionId: 'modern-photo-001',
    primaryPatternId: 'modern/photoelectric',
    difficulty: 3,
    topicTags: ['modern-physics', 'quantum', 'photoelectric'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'modern-photo-001',
      metadata: {
        title: 'Photoelectric Effect - Maximum KE',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['modern-physics', 'quantum', 'photoelectric'],
        patternTags: ['photoelectric-effect', 'work-function'],
      },
      prompt: {
        text: 'Light of wavelength 400 nm is incident on a metal surface with work function 2.0 eV. Calculate the maximum kinetic energy of the emitted photoelectrons. (h = 6.63 × 10⁻³⁴ J·s, c = 3 × 10⁸ m/s, 1 eV = 1.6 × 10⁻¹⁹ J)',
        given: [
          { label: 'Wavelength', value: '400', unit: 'nm' },
          { label: 'Work function', value: '2.0', unit: 'eV' },
        ],
        asked: [
          { label: 'Maximum KE of photoelectrons', expectedForm: 'KE_max = hf - φ' },
        ],
      },
      primaryPatternId: 'modern/photoelectric',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The photoelectric equation is:',
          choices: [
            { key: 'A', text: '$KE_{max} = hf - \\phi$', isDistractor: false },
            { key: 'B', text: '$KE_{max} = hf + \\phi$', isDistractor: true },
            { key: 'C', text: '$KE_{max} = \\phi - hf$', isDistractor: true },
            { key: 'D', text: '$KE_{max} = hf \\times \\phi$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the photon energy in eV. (Use E = hc/λ)',
          correctNumeric: 3.1,
          validation: { numericTolerance: 0.1, units: 'eV' },
          explanations: {
            micro: 'E = hc/λ = (6.63×10⁻³⁴)(3×10⁸)/(400×10⁻⁹) = 4.97×10⁻¹⁹ J ≈ 3.1 eV',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the maximum kinetic energy (in eV).',
          correctNumeric: 1.1,
          validation: { numericTolerance: 0.1, units: 'eV' },
          explanations: {
            micro: 'KE_max = E_photon - φ = 3.1 - 2.0 = 1.1 eV',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 1.1, units: 'eV' },
        synthesis: [
          'Calculate photon energy: E = hc/λ = 1240 eV·nm / 400 nm ≈ 3.1 eV',
          'Apply photoelectric equation: KE_max = hf - φ',
          'Calculate: KE_max = 3.1 - 2.0 = 1.1 eV',
        ],
      },
    },
  },

  // Mechanics - Work Energy (Medium)
  {
    questionId: 'mech-energy-001',
    primaryPatternId: 'mechanics/work_energy',
    difficulty: 3,
    topicTags: ['mechanics', 'energy', 'work-energy-theorem'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-energy-001',
      metadata: {
        title: 'Work-Energy Theorem - Spring Compression',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'energy', 'springs'],
        patternTags: ['work-energy', 'spring-potential-energy'],
      },
      prompt: {
        text: 'A 2 kg block sliding on a frictionless surface with velocity 6 m/s hits a spring (k = 200 N/m). Find the maximum compression of the spring.',
        given: [
          { label: 'Mass', value: '2', unit: 'kg' },
          { label: 'Initial velocity', value: '6', unit: 'm/s' },
          { label: 'Spring constant', value: '200', unit: 'N/m' },
        ],
        asked: [
          { label: 'Maximum compression' },
        ],
      },
      primaryPatternId: 'mechanics/work_energy',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'At maximum compression, what is the velocity of the block?',
          choices: [
            { key: 'A', text: 'Zero', isDistractor: false },
            { key: 'B', text: '6 m/s', isDistractor: true },
            { key: 'C', text: '3 m/s', isDistractor: true },
            { key: 'D', text: 'Cannot be determined', isDistractor: true },
          ],
          correct: 'A',
          explanations: {
            micro: 'At maximum compression, all kinetic energy is converted to spring potential energy, so velocity is zero.',
          },
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the initial kinetic energy (in J).',
          correctNumeric: 36,
          validation: { numericTolerance: 0.5, units: 'J' },
          explanations: {
            micro: 'KE = ½mv² = ½(2)(6)² = 36 J',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the maximum compression (in m).',
          correctNumeric: 0.6,
          validation: { numericTolerance: 0.02, units: 'm' },
          explanations: {
            micro: '½kx² = KE → x = √(2KE/k) = √(72/200) = √0.36 = 0.6 m',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 0.6, units: 'm' },
        synthesis: [
          'Use energy conservation: ½mv² = ½kx²',
          'Calculate initial KE = ½(2)(6)² = 36 J',
          'Solve for x: x = √(2×36/200) = 0.6 m',
        ],
      },
    },
  },

  // Optics - Lenses (Easy)
  {
    questionId: 'optics-lens-001',
    primaryPatternId: 'optics/lenses',
    difficulty: 2,
    topicTags: ['optics', 'lenses', 'geometric-optics'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'optics-lens-001',
      metadata: {
        title: 'Convex Lens Image Formation',
        difficulty: 2,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['optics', 'lenses'],
        patternTags: ['thin-lens-equation', 'magnification'],
      },
      prompt: {
        text: 'An object is placed 30 cm from a convex lens of focal length 20 cm. Find the position of the image.',
        given: [
          { label: 'Object distance (u)', value: '-30', unit: 'cm' },
          { label: 'Focal length (f)', value: '20', unit: 'cm' },
        ],
        asked: [
          { label: 'Image distance (v)' },
        ],
      },
      primaryPatternId: 'optics/lenses',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The thin lens equation is:',
          choices: [
            { key: 'A', text: '$\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u}$', isDistractor: false },
            { key: 'B', text: '$\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}$', isDistractor: true },
            { key: 'C', text: '$f = u + v$', isDistractor: true },
            { key: 'D', text: '$f = uv$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the image distance v (in cm). Use sign convention: real object u is negative.',
          correctNumeric: 60,
          validation: { numericTolerance: 1, units: 'cm' },
          explanations: {
            micro: '1/v = 1/f + 1/u = 1/20 + 1/(-30) = 3/60 - 2/60 = 1/60 → v = 60 cm',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 60, units: 'cm' },
        synthesis: [
          'Apply thin lens equation: 1/f = 1/v - 1/u',
          'Substitute: 1/20 = 1/v - 1/(-30)',
          'Solve: 1/v = 1/20 - 1/30 = 1/60 → v = 60 cm (real image)',
        ],
      },
    },
  },

  // Waves - Doppler Effect (Medium)
  {
    questionId: 'waves-doppler-001',
    primaryPatternId: 'waves/doppler',
    difficulty: 3,
    topicTags: ['waves', 'sound', 'doppler-effect'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'waves-doppler-001',
      metadata: {
        title: 'Doppler Effect - Moving Source',
        difficulty: 3,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['waves', 'sound', 'doppler'],
        patternTags: ['doppler-effect', 'frequency-shift'],
      },
      prompt: {
        text: 'A car horn emits a sound of frequency 500 Hz. If the car is moving towards a stationary observer at 34 m/s, what frequency does the observer hear? (Speed of sound = 340 m/s)',
        given: [
          { label: 'Source frequency', value: '500', unit: 'Hz' },
          { label: 'Source velocity', value: '34', unit: 'm/s (towards observer)' },
          { label: 'Speed of sound', value: '340', unit: 'm/s' },
        ],
        asked: [
          { label: 'Observed frequency' },
        ],
      },
      primaryPatternId: 'waves/doppler',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'When the source moves towards the observer, the observed frequency:',
          choices: [
            { key: 'A', text: 'Increases', isDistractor: false },
            { key: 'B', text: 'Decreases', isDistractor: true },
            { key: 'C', text: 'Stays the same', isDistractor: true },
            { key: 'D', text: 'Becomes zero', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the observed frequency (in Hz). Use: f\' = f × v/(v - vₛ)',
          correctNumeric: 556,
          validation: { numericTolerance: 5, units: 'Hz' },
          explanations: {
            micro: 'f\' = 500 × 340/(340-34) = 500 × 340/306 ≈ 556 Hz',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 556, units: 'Hz' },
        synthesis: [
          'Identify: source moving towards stationary observer',
          'Apply Doppler formula: f\' = f × v/(v - vₛ)',
          'Calculate: f\' = 500 × 340/(340-34) = 500 × 1.111 ≈ 556 Hz',
        ],
      },
    },
  },
]

async function main() {
  console.log('🌱 Seeding database...')

  // Seed topics
  console.log('📚 Seeding topics...')
  for (const topic of topics) {
    await prisma.topic.upsert({
      where: { topicId: topic.topicId },
      update: {
        label: topic.label,
        description: topic.description,
        level: topic.level,
        path: topic.path,
        parentTopicId: topic.parentTopicId,
      },
      create: topic,
    })
  }
  console.log(`   ✅ Seeded ${topics.length} topics`)

  // Seed patterns
  console.log('🧩 Seeding patterns...')
  for (const pattern of patterns) {
    await prisma.pattern.upsert({
      where: { patternId: pattern.patternId },
      update: {
        label: pattern.label,
        description: pattern.description,
        level: pattern.level,
        path: pattern.path,
      },
      create: pattern,
    })
  }
  console.log(`   ✅ Seeded ${patterns.length} patterns`)

  // Seed questions
  console.log('❓ Seeding questions...')
  for (const question of questions) {
    await prisma.question.upsert({
      where: { questionId: question.questionId },
      update: {
        primaryPatternId: question.primaryPatternId,
        difficulty: question.difficulty,
        topicTags: question.topicTags,
        lifecycleState: question.lifecycleState,
        provenance: question.provenance,
        payload: question.payload as Prisma.InputJsonValue,
      },
      create: {
        questionId: question.questionId,
        primaryPatternId: question.primaryPatternId,
        difficulty: question.difficulty,
        topicTags: question.topicTags,
        lifecycleState: question.lifecycleState,
        provenance: question.provenance,
        payload: question.payload as Prisma.InputJsonValue,
      },
    })

    // Create question tags
    const tags = [
      ...question.topicTags.map(t => ({ tagType: 'topic', tagValue: t })),
      { tagType: 'pattern', tagValue: question.primaryPatternId },
    ]

    for (const tag of tags) {
      const existingQuestion = await prisma.question.findUnique({
        where: { questionId: question.questionId },
      })
      if (existingQuestion) {
        await prisma.questionTag.upsert({
          where: {
            questionId_tagType_tagValue: {
              questionId: existingQuestion.id,
              tagType: tag.tagType,
              tagValue: tag.tagValue,
            },
          },
          update: {},
          create: {
            questionId: existingQuestion.id,
            tagType: tag.tagType,
            tagValue: tag.tagValue,
          },
        })
      }
    }
  }
  console.log(`   ✅ Seeded ${questions.length} questions`)

  // Update pattern question counts
  console.log('📊 Updating pattern question counts...')
  const patternCounts = await prisma.question.groupBy({
    by: ['primaryPatternId'],
    _count: { id: true },
    where: { primaryPatternId: { not: null } },
  })
  for (const pc of patternCounts) {
    if (pc.primaryPatternId) {
      await prisma.pattern.update({
        where: { patternId: pc.primaryPatternId },
        data: { questionCount: pc._count.id },
      })
    }
  }
  console.log('   ✅ Updated pattern counts')

  console.log('✨ Seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
