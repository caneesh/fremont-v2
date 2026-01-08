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
      hints: [
        { order: 1, text: 'Start by drawing a free body diagram. What forces act on the block?' },
        { order: 2, text: 'Decompose the weight into components parallel and perpendicular to the incline. Which trigonometric function gives the parallel component?' },
        { order: 3, text: 'Apply Newton\'s second law along the incline direction: ΣF = ma. The only force along the incline is the weight component.' },
      ],
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
      hints: [
        { order: 1, text: 'This is a projectile motion problem. What are the horizontal and vertical components of the initial velocity?' },
        { order: 2, text: 'For a projectile landing at the same height it was launched, you can use the range formula: R = v²sin(2θ)/g' },
        { order: 3, text: 'sin(2×45°) = sin(90°) = 1, which gives maximum range for a given speed.' },
      ],
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
      hints: [
        { order: 1, text: 'What type of process is this? Look at what quantity is held constant.' },
        { order: 2, text: 'For an isothermal (constant T) process, use Boyle\'s Law: P₁V₁ = P₂V₂' },
        { order: 3, text: 'Rearrange to find V₂: V₂ = P₁V₁/P₂. When pressure doubles, volume halves.' },
      ],
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

  // Mechanics - Momentum Collision (Medium)
  {
    questionId: 'mech-momentum-001',
    primaryPatternId: 'mechanics/momentum_collision',
    difficulty: 3,
    topicTags: ['mechanics', 'momentum', 'collision'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-momentum-001',
      metadata: {
        title: 'Inelastic Collision',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'momentum', 'collision'],
        patternTags: ['momentum-conservation', 'inelastic-collision'],
      },
      prompt: {
        text: 'A 3 kg ball moving at 4 m/s collides head-on with a 1 kg ball at rest. If they stick together after collision, find their common velocity.',
        given: [
          { label: 'Mass 1', value: '3', unit: 'kg' },
          { label: 'Velocity 1', value: '4', unit: 'm/s' },
          { label: 'Mass 2', value: '1', unit: 'kg' },
          { label: 'Velocity 2', value: '0', unit: 'm/s' },
        ],
        asked: [
          { label: 'Common velocity after collision' },
        ],
      },
      primaryPatternId: 'mechanics/momentum_collision',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'What type of collision is this?',
          choices: [
            { key: 'A', text: 'Perfectly inelastic (objects stick together)', isDistractor: false },
            { key: 'B', text: 'Perfectly elastic', isDistractor: true },
            { key: 'C', text: 'Partially elastic', isDistractor: true },
            { key: 'D', text: 'Explosive collision', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the initial momentum of the system (in kg·m/s).',
          correctNumeric: 12,
          validation: { numericTolerance: 0.1, units: 'kg·m/s' },
          explanations: {
            micro: 'p_initial = m₁v₁ + m₂v₂ = 3(4) + 1(0) = 12 kg·m/s',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the common velocity after collision (in m/s).',
          correctNumeric: 3,
          validation: { numericTolerance: 0.1, units: 'm/s' },
          explanations: {
            micro: 'By conservation of momentum: (m₁+m₂)v = m₁v₁ → v = 12/4 = 3 m/s',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 3, units: 'm/s' },
        synthesis: [
          'Identify as perfectly inelastic collision (objects stick)',
          'Apply momentum conservation: m₁v₁ + m₂v₂ = (m₁+m₂)v',
          'Solve: v = (3×4 + 1×0)/(3+1) = 12/4 = 3 m/s',
        ],
      },
    },
  },

  // Mechanics - Circular Motion (Medium)
  {
    questionId: 'mech-circular-001',
    primaryPatternId: 'mechanics/circular_motion',
    difficulty: 3,
    topicTags: ['mechanics', 'circular-motion', 'centripetal'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-circular-001',
      metadata: {
        title: 'Car on Banked Curve',
        difficulty: 3,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'circular-motion'],
        patternTags: ['circular-motion', 'centripetal-force'],
      },
      prompt: {
        text: 'A car travels around a flat circular track of radius 50 m. If the coefficient of static friction is 0.5, what is the maximum speed the car can have without skidding? (g = 10 m/s²)',
        given: [
          { label: 'Radius', value: '50', unit: 'm' },
          { label: 'Coefficient of friction', value: '0.5', unit: '' },
          { label: 'g', value: '10', unit: 'm/s²' },
        ],
        asked: [
          { label: 'Maximum speed without skidding' },
        ],
      },
      primaryPatternId: 'mechanics/circular_motion',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'What provides the centripetal force for the car?',
          choices: [
            { key: 'A', text: 'Static friction', isDistractor: false },
            { key: 'B', text: 'Kinetic friction', isDistractor: true },
            { key: 'C', text: 'Normal force', isDistractor: true },
            { key: 'D', text: 'Weight of the car', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'MCQ_SINGLE',
          prompt: 'The maximum friction force equals:',
          choices: [
            { key: 'A', text: '$\\mu_s mg$', isDistractor: false },
            { key: 'B', text: '$\\mu_s N / m$', isDistractor: true },
            { key: 'C', text: '$mg / \\mu_s$', isDistractor: true },
            { key: 'D', text: '$\\mu_s g$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the maximum speed (in m/s). Use: μₛmg = mv²/r',
          correctNumeric: 15.81,
          validation: { numericTolerance: 0.5, units: 'm/s' },
          explanations: {
            micro: 'v = √(μₛgr) = √(0.5 × 10 × 50) = √250 ≈ 15.81 m/s',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 15.81, units: 'm/s' },
        synthesis: [
          'Friction provides centripetal force: f = mv²/r',
          'Maximum friction: f_max = μₛmg',
          'At maximum speed: μₛmg = mv²/r → v = √(μₛgr)',
          'Calculate: v = √(0.5 × 10 × 50) = √250 ≈ 15.81 m/s',
        ],
      },
    },
  },

  // Mechanics - Simple Harmonic Motion (Medium)
  {
    questionId: 'mech-shm-001',
    primaryPatternId: 'mechanics/simple_harmonic_motion',
    difficulty: 3,
    topicTags: ['mechanics', 'oscillations', 'shm'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-shm-001',
      metadata: {
        title: 'Simple Pendulum Period',
        difficulty: 3,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'oscillations'],
        patternTags: ['simple-harmonic-motion', 'pendulum'],
      },
      prompt: {
        text: 'A simple pendulum has a period of 2 seconds on Earth (g = 10 m/s²). What is the length of the pendulum?',
        given: [
          { label: 'Period', value: '2', unit: 's' },
          { label: 'g', value: '10', unit: 'm/s²' },
        ],
        asked: [
          { label: 'Length of pendulum' },
        ],
      },
      primaryPatternId: 'mechanics/simple_harmonic_motion',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The period of a simple pendulum is given by:',
          choices: [
            { key: 'A', text: '$T = 2\\pi\\sqrt{L/g}$', isDistractor: false },
            { key: 'B', text: '$T = 2\\pi\\sqrt{g/L}$', isDistractor: true },
            { key: 'C', text: '$T = 2\\pi\\sqrt{m/k}$', isDistractor: true },
            { key: 'D', text: '$T = 2\\pi L/g$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Rearranging for L, calculate the length (in m). Use T = 2π√(L/g)',
          correctNumeric: 1.01,
          validation: { numericTolerance: 0.05, units: 'm' },
          explanations: {
            micro: 'L = gT²/(4π²) = 10(2)²/(4π²) = 40/39.48 ≈ 1.01 m',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 1.01, units: 'm' },
        synthesis: [
          'Use pendulum period formula: T = 2π√(L/g)',
          'Rearrange: L = gT²/(4π²)',
          'Calculate: L = 10(4)/(4×9.87) ≈ 1.01 m',
        ],
      },
    },
  },

  // Mechanics - Pulley System (Hard)
  {
    questionId: 'mech-pulley-001',
    primaryPatternId: 'mechanics/pulley_system',
    difficulty: 4,
    topicTags: ['mechanics', 'dynamics', 'pulley'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-pulley-001',
      metadata: {
        title: 'Atwood Machine',
        difficulty: 4,
        estimatedTimeSec: 480,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'dynamics', 'pulley'],
        patternTags: ['pulley-system', 'newton-laws', 'constraint-equations'],
      },
      prompt: {
        text: 'Two masses m₁ = 5 kg and m₂ = 3 kg are connected by a light string over a frictionless pulley. Find the acceleration of the system and the tension in the string. (g = 10 m/s²)',
        given: [
          { label: 'm₁', value: '5', unit: 'kg' },
          { label: 'm₂', value: '3', unit: 'kg' },
          { label: 'g', value: '10', unit: 'm/s²' },
        ],
        asked: [
          { label: 'Acceleration of the system' },
          { label: 'Tension in the string' },
        ],
      },
      primaryPatternId: 'mechanics/pulley_system',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'For an Atwood machine, the acceleration formula is:',
          choices: [
            { key: 'A', text: '$a = \\frac{(m_1 - m_2)g}{m_1 + m_2}$', isDistractor: false },
            { key: 'B', text: '$a = \\frac{(m_1 + m_2)g}{m_1 - m_2}$', isDistractor: true },
            { key: 'C', text: '$a = \\frac{m_1 g}{m_2}$', isDistractor: true },
            { key: 'D', text: '$a = g$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the acceleration (in m/s²).',
          correctNumeric: 2.5,
          validation: { numericTolerance: 0.1, units: 'm/s²' },
          explanations: {
            micro: 'a = (m₁-m₂)g/(m₁+m₂) = (5-3)(10)/(5+3) = 20/8 = 2.5 m/s²',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the tension in the string (in N). Use T = m₂(g+a) or T = m₁(g-a)',
          correctNumeric: 37.5,
          validation: { numericTolerance: 0.5, units: 'N' },
          explanations: {
            micro: 'T = m₂(g+a) = 3(10+2.5) = 3(12.5) = 37.5 N',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 2.5, units: 'm/s²' },
        synthesis: [
          'Draw FBD for each mass',
          'For m₁: m₁g - T = m₁a',
          'For m₂: T - m₂g = m₂a',
          'Add equations: (m₁-m₂)g = (m₁+m₂)a',
          'a = 2.5 m/s², T = 37.5 N',
        ],
      },
    },
  },

  // Thermodynamics - First Law (Medium)
  {
    questionId: 'thermo-first-001',
    primaryPatternId: 'thermodynamics/first_law',
    difficulty: 3,
    topicTags: ['thermodynamics', 'first-law', 'heat-work'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'thermo-first-001',
      metadata: {
        title: 'First Law - Isobaric Process',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['thermodynamics', 'first-law'],
        patternTags: ['first-law', 'isobaric-process'],
      },
      prompt: {
        text: 'In an isobaric process, 500 J of heat is added to an ideal gas. If the gas does 200 J of work on its surroundings, find the change in internal energy.',
        given: [
          { label: 'Heat added', value: '500', unit: 'J' },
          { label: 'Work done by gas', value: '200', unit: 'J' },
        ],
        asked: [
          { label: 'Change in internal energy' },
        ],
      },
      primaryPatternId: 'thermodynamics/first_law',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The first law of thermodynamics states:',
          choices: [
            { key: 'A', text: '$\\Delta U = Q - W$', isDistractor: false },
            { key: 'B', text: '$\\Delta U = Q + W$', isDistractor: true },
            { key: 'C', text: '$\\Delta U = W - Q$', isDistractor: true },
            { key: 'D', text: '$Q = W$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the change in internal energy (in J).',
          correctNumeric: 300,
          validation: { numericTolerance: 5, units: 'J' },
          explanations: {
            micro: 'ΔU = Q - W = 500 - 200 = 300 J',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 300, units: 'J' },
        synthesis: [
          'Apply first law: ΔU = Q - W',
          'Q = 500 J (heat added), W = 200 J (work done by gas)',
          'ΔU = 500 - 200 = 300 J',
        ],
      },
    },
  },

  // Electromagnetism - Coulomb's Law (Easy)
  {
    questionId: 'em-coulomb-001',
    primaryPatternId: 'electromagnetism/coulomb_field',
    difficulty: 2,
    topicTags: ['electromagnetism', 'electrostatics', 'coulomb'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'em-coulomb-001',
      metadata: {
        title: 'Coulomb Force Between Charges',
        difficulty: 2,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['electromagnetism', 'electrostatics'],
        patternTags: ['coulomb-law', 'electric-force'],
      },
      prompt: {
        text: 'Two point charges of +2 μC and +8 μC are placed 30 cm apart in air. Find the magnitude of the force between them. (k = 9 × 10⁹ N·m²/C²)',
        given: [
          { label: 'q₁', value: '2', unit: 'μC' },
          { label: 'q₂', value: '8', unit: 'μC' },
          { label: 'Distance', value: '30', unit: 'cm' },
          { label: 'k', value: '9 × 10⁹', unit: 'N·m²/C²' },
        ],
        asked: [
          { label: 'Force between charges' },
        ],
      },
      primaryPatternId: 'electromagnetism/coulomb_field',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'Since both charges are positive, the force between them is:',
          choices: [
            { key: 'A', text: 'Repulsive', isDistractor: false },
            { key: 'B', text: 'Attractive', isDistractor: true },
            { key: 'C', text: 'Zero', isDistractor: true },
            { key: 'D', text: 'Cannot be determined', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the force (in N). Use F = kq₁q₂/r²',
          correctNumeric: 1.6,
          validation: { numericTolerance: 0.1, units: 'N' },
          explanations: {
            micro: 'F = (9×10⁹)(2×10⁻⁶)(8×10⁻⁶)/(0.3)² = 144×10⁻³/0.09 = 1.6 N',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 1.6, units: 'N' },
        synthesis: [
          'Convert units: q₁ = 2×10⁻⁶ C, q₂ = 8×10⁻⁶ C, r = 0.3 m',
          'Apply Coulomb\'s law: F = kq₁q₂/r²',
          'F = (9×10⁹)(2×10⁻⁶)(8×10⁻⁶)/(0.09) = 1.6 N (repulsive)',
        ],
      },
    },
  },

  // Electromagnetism - Capacitors (Medium)
  {
    questionId: 'em-capacitor-001',
    primaryPatternId: 'electromagnetism/capacitors',
    difficulty: 3,
    topicTags: ['electromagnetism', 'capacitors', 'energy'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'em-capacitor-001',
      metadata: {
        title: 'Energy Stored in Capacitor',
        difficulty: 3,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['electromagnetism', 'capacitors'],
        patternTags: ['capacitor-energy', 'parallel-plate'],
      },
      prompt: {
        text: 'A 10 μF capacitor is charged to 100 V. Calculate the energy stored in the capacitor.',
        given: [
          { label: 'Capacitance', value: '10', unit: 'μF' },
          { label: 'Voltage', value: '100', unit: 'V' },
        ],
        asked: [
          { label: 'Energy stored' },
        ],
      },
      primaryPatternId: 'electromagnetism/capacitors',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The energy stored in a capacitor is given by:',
          choices: [
            { key: 'A', text: '$U = \\frac{1}{2}CV^2$', isDistractor: false },
            { key: 'B', text: '$U = CV^2$', isDistractor: true },
            { key: 'C', text: '$U = \\frac{1}{2}CV$', isDistractor: true },
            { key: 'D', text: '$U = CV$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the energy stored (in J).',
          correctNumeric: 0.05,
          validation: { numericTolerance: 0.002, units: 'J' },
          explanations: {
            micro: 'U = ½CV² = ½(10×10⁻⁶)(100)² = ½(10⁻⁵)(10⁴) = 0.05 J = 50 mJ',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 0.05, units: 'J' },
        synthesis: [
          'Use energy formula: U = ½CV²',
          'Convert: C = 10 μF = 10×10⁻⁶ F',
          'Calculate: U = ½(10×10⁻⁶)(100)² = 0.05 J',
        ],
      },
    },
  },

  // Electromagnetism - Magnetic Force (Medium)
  {
    questionId: 'em-magforce-001',
    primaryPatternId: 'electromagnetism/magnetic_force',
    difficulty: 3,
    topicTags: ['electromagnetism', 'magnetism', 'lorentz-force'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'em-magforce-001',
      metadata: {
        title: 'Force on Moving Charge in Magnetic Field',
        difficulty: 3,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['electromagnetism', 'magnetism'],
        patternTags: ['magnetic-force', 'lorentz-force'],
      },
      prompt: {
        text: 'A proton (q = 1.6 × 10⁻¹⁹ C) moves at 2 × 10⁶ m/s perpendicular to a magnetic field of 0.5 T. Find the magnetic force on the proton.',
        given: [
          { label: 'Charge', value: '1.6 × 10⁻¹⁹', unit: 'C' },
          { label: 'Velocity', value: '2 × 10⁶', unit: 'm/s' },
          { label: 'Magnetic field', value: '0.5', unit: 'T' },
          { label: 'Angle', value: '90', unit: '° (perpendicular)' },
        ],
        asked: [
          { label: 'Magnetic force on proton' },
        ],
      },
      primaryPatternId: 'electromagnetism/magnetic_force',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The magnetic force on a moving charge is given by:',
          choices: [
            { key: 'A', text: '$F = qvB\\sin\\theta$', isDistractor: false },
            { key: 'B', text: '$F = qvB\\cos\\theta$', isDistractor: true },
            { key: 'C', text: '$F = qB/v$', isDistractor: true },
            { key: 'D', text: '$F = qv/B$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the magnetic force (in N). Express in scientific notation as X × 10⁻¹³, give X.',
          correctNumeric: 1.6,
          validation: { numericTolerance: 0.1 },
          explanations: {
            micro: 'F = qvB sin(90°) = (1.6×10⁻¹⁹)(2×10⁶)(0.5)(1) = 1.6×10⁻¹³ N',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 1.6e-13, units: 'N' },
        synthesis: [
          'Use Lorentz force: F = qvB sin(θ)',
          'Since θ = 90°, sin(90°) = 1',
          'F = (1.6×10⁻¹⁹)(2×10⁶)(0.5) = 1.6×10⁻¹³ N',
        ],
      },
    },
  },

  // Electromagnetism - EM Induction (Hard)
  {
    questionId: 'em-induction-001',
    primaryPatternId: 'electromagnetism/em_induction',
    difficulty: 4,
    topicTags: ['electromagnetism', 'induction', 'faraday'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'em-induction-001',
      metadata: {
        title: 'Faraday\'s Law - Changing Flux',
        difficulty: 4,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['electromagnetism', 'induction'],
        patternTags: ['faraday-law', 'induced-emf'],
      },
      prompt: {
        text: 'A circular coil of 100 turns and radius 10 cm is placed perpendicular to a magnetic field. The field decreases uniformly from 0.5 T to 0 T in 0.1 s. Find the induced EMF.',
        given: [
          { label: 'Number of turns', value: '100', unit: '' },
          { label: 'Radius', value: '10', unit: 'cm' },
          { label: 'Initial field', value: '0.5', unit: 'T' },
          { label: 'Final field', value: '0', unit: 'T' },
          { label: 'Time', value: '0.1', unit: 's' },
        ],
        asked: [
          { label: 'Induced EMF' },
        ],
      },
      primaryPatternId: 'electromagnetism/em_induction',
      steps: [
        {
          stepId: 'step-1',
          type: 'NUMERIC',
          prompt: 'Calculate the area of the coil (in m²). Use A = πr²',
          correctNumeric: 0.0314,
          validation: { numericTolerance: 0.002, units: 'm²' },
          explanations: {
            micro: 'A = πr² = π(0.1)² = 0.0314 m²',
          },
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the change in magnetic flux through one turn (in Wb).',
          correctNumeric: 0.0157,
          validation: { numericTolerance: 0.001, units: 'Wb' },
          explanations: {
            micro: 'ΔΦ = A × ΔB = 0.0314 × (0.5 - 0) = 0.0157 Wb',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the induced EMF (in V). Use ε = -N(ΔΦ/Δt)',
          correctNumeric: 15.7,
          validation: { numericTolerance: 0.5, units: 'V' },
          explanations: {
            micro: 'ε = N × ΔΦ/Δt = 100 × 0.0157/0.1 = 15.7 V',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 15.7, units: 'V' },
        synthesis: [
          'Calculate coil area: A = π(0.1)² = 0.0314 m²',
          'Change in flux per turn: ΔΦ = AΔB = 0.0157 Wb',
          'Apply Faraday\'s law: ε = N(ΔΦ/Δt) = 100(0.0157/0.1) = 15.7 V',
        ],
      },
    },
  },

  // Optics - Interference (Hard)
  {
    questionId: 'optics-interference-001',
    primaryPatternId: 'optics/interference',
    difficulty: 4,
    topicTags: ['optics', 'wave-optics', 'interference'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'optics-interference-001',
      metadata: {
        title: 'Young\'s Double Slit Fringe Width',
        difficulty: 4,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['optics', 'wave-optics', 'interference'],
        patternTags: ['double-slit', 'fringe-width'],
      },
      prompt: {
        text: 'In Young\'s double slit experiment, the slit separation is 0.5 mm and the screen is 1 m away. If light of wavelength 500 nm is used, find the fringe width.',
        given: [
          { label: 'Slit separation (d)', value: '0.5', unit: 'mm' },
          { label: 'Screen distance (D)', value: '1', unit: 'm' },
          { label: 'Wavelength (λ)', value: '500', unit: 'nm' },
        ],
        asked: [
          { label: 'Fringe width (β)' },
        ],
      },
      primaryPatternId: 'optics/interference',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The fringe width in Young\'s double slit experiment is given by:',
          choices: [
            { key: 'A', text: '$\\beta = \\lambda D / d$', isDistractor: false },
            { key: 'B', text: '$\\beta = \\lambda d / D$', isDistractor: true },
            { key: 'C', text: '$\\beta = d D / \\lambda$', isDistractor: true },
            { key: 'D', text: '$\\beta = D / (\\lambda d)$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the fringe width (in mm).',
          correctNumeric: 1,
          validation: { numericTolerance: 0.05, units: 'mm' },
          explanations: {
            micro: 'β = λD/d = (500×10⁻⁹)(1)/(0.5×10⁻³) = 5×10⁻⁴/5×10⁻⁴ = 10⁻³ m = 1 mm',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 1, units: 'mm' },
        synthesis: [
          'Convert units: λ = 500 nm = 5×10⁻⁷ m, d = 0.5 mm = 5×10⁻⁴ m',
          'Apply fringe width formula: β = λD/d',
          'Calculate: β = (5×10⁻⁷)(1)/(5×10⁻⁴) = 10⁻³ m = 1 mm',
        ],
      },
    },
  },

  // Modern Physics - Bohr Model (Medium)
  {
    questionId: 'modern-bohr-001',
    primaryPatternId: 'modern/bohr_model',
    difficulty: 3,
    topicTags: ['modern-physics', 'atomic', 'bohr-model'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'modern-bohr-001',
      metadata: {
        title: 'Hydrogen Atom Energy Levels',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['modern-physics', 'atomic'],
        patternTags: ['bohr-model', 'energy-levels'],
      },
      prompt: {
        text: 'Calculate the energy required to excite a hydrogen atom from the ground state (n=1) to the first excited state (n=2). The ground state energy is -13.6 eV.',
        given: [
          { label: 'Ground state energy', value: '-13.6', unit: 'eV' },
          { label: 'Initial state', value: 'n = 1', unit: '' },
          { label: 'Final state', value: 'n = 2', unit: '' },
        ],
        asked: [
          { label: 'Excitation energy' },
        ],
      },
      primaryPatternId: 'modern/bohr_model',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The energy of the nth level in hydrogen atom is:',
          choices: [
            { key: 'A', text: '$E_n = -13.6/n^2$ eV', isDistractor: false },
            { key: 'B', text: '$E_n = -13.6 \\times n^2$ eV', isDistractor: true },
            { key: 'C', text: '$E_n = -13.6/n$ eV', isDistractor: true },
            { key: 'D', text: '$E_n = -13.6 \\times n$ eV', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the energy of the n=2 state (in eV).',
          correctNumeric: -3.4,
          validation: { numericTolerance: 0.1, units: 'eV' },
          explanations: {
            micro: 'E₂ = -13.6/2² = -13.6/4 = -3.4 eV',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the excitation energy (in eV).',
          correctNumeric: 10.2,
          validation: { numericTolerance: 0.1, units: 'eV' },
          explanations: {
            micro: 'ΔE = E₂ - E₁ = -3.4 - (-13.6) = 10.2 eV',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 10.2, units: 'eV' },
        synthesis: [
          'E₁ = -13.6 eV (given)',
          'E₂ = -13.6/4 = -3.4 eV',
          'Excitation energy = E₂ - E₁ = -3.4 - (-13.6) = 10.2 eV',
        ],
      },
    },
  },

  // Mechanics - Inclined Plane with Friction (Medium)
  {
    questionId: 'mech-incline-friction-001',
    primaryPatternId: 'mechanics/incline_with_friction',
    difficulty: 3,
    topicTags: ['mechanics', 'dynamics', 'friction', 'inclined-plane'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-incline-friction-001',
      metadata: {
        title: 'Block Sliding Down Rough Incline',
        difficulty: 3,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'dynamics', 'friction'],
        patternTags: ['incline-with-friction', 'newton-second-law'],
      },
      prompt: {
        text: 'A 4 kg block is placed on a rough inclined plane at 37° to the horizontal. The coefficient of kinetic friction is 0.25. Find the acceleration of the block as it slides down. (Take g = 10 m/s², sin 37° = 0.6, cos 37° = 0.8)',
        given: [
          { label: 'Mass', value: '4', unit: 'kg' },
          { label: 'Angle', value: '37', unit: '°' },
          { label: 'Coefficient of kinetic friction', value: '0.25', unit: '' },
        ],
        asked: [
          { label: 'Acceleration down the incline' },
        ],
      },
      primaryPatternId: 'mechanics/incline_with_friction',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'What forces act on the block parallel to the incline?',
          choices: [
            { key: 'A', text: 'Component of weight (mg sin θ) down, friction (μN) up', isDistractor: false },
            { key: 'B', text: 'Weight (mg) down, friction up', isDistractor: true },
            { key: 'C', text: 'Only component of weight down', isDistractor: true },
            { key: 'D', text: 'Normal force and friction', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the normal force N (in N).',
          correctNumeric: 32,
          validation: { numericTolerance: 0.5, units: 'N' },
          explanations: {
            micro: 'N = mg cos θ = 4 × 10 × 0.8 = 32 N',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the friction force (in N).',
          correctNumeric: 8,
          validation: { numericTolerance: 0.5, units: 'N' },
          explanations: {
            micro: 'f = μN = 0.25 × 32 = 8 N',
          },
        },
        {
          stepId: 'step-4',
          type: 'NUMERIC',
          prompt: 'Calculate the acceleration (in m/s²).',
          correctNumeric: 4,
          validation: { numericTolerance: 0.2, units: 'm/s²' },
          explanations: {
            micro: 'ma = mg sin θ - μmg cos θ → a = g(sin θ - μ cos θ) = 10(0.6 - 0.25×0.8) = 10(0.6 - 0.2) = 4 m/s²',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 4, units: 'm/s²' },
        synthesis: [
          'Draw FBD: weight components and friction',
          'N = mg cos θ = 32 N',
          'Friction f = μN = 8 N (opposing motion)',
          'Net force = mg sin θ - f = 24 - 8 = 16 N',
          'a = 16/4 = 4 m/s²',
        ],
      },
    },
  },

  // Mechanics - Newton 2D Block (Medium)
  {
    questionId: 'mech-newton2d-001',
    primaryPatternId: 'mechanics/newton_2d_block',
    difficulty: 3,
    topicTags: ['mechanics', 'dynamics', 'forces', '2d-motion'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-newton2d-001',
      metadata: {
        title: 'Block with Applied Force at Angle',
        difficulty: 3,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'dynamics', '2d-forces'],
        patternTags: ['newton-2d', 'force-components'],
      },
      prompt: {
        text: 'A 10 kg block rests on a frictionless horizontal surface. A force of 50 N is applied at an angle of 37° above the horizontal. Find the acceleration of the block. (Take g = 10 m/s², cos 37° = 0.8, sin 37° = 0.6)',
        given: [
          { label: 'Mass', value: '10', unit: 'kg' },
          { label: 'Applied force', value: '50', unit: 'N' },
          { label: 'Angle', value: '37', unit: '° above horizontal' },
        ],
        asked: [
          { label: 'Acceleration of the block' },
        ],
      },
      primaryPatternId: 'mechanics/newton_2d_block',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'Which component of the applied force causes horizontal acceleration?',
          choices: [
            { key: 'A', text: 'F cos θ (horizontal component)', isDistractor: false },
            { key: 'B', text: 'F sin θ (vertical component)', isDistractor: true },
            { key: 'C', text: 'The full force F', isDistractor: true },
            { key: 'D', text: 'F tan θ', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the horizontal component of the applied force (in N).',
          correctNumeric: 40,
          validation: { numericTolerance: 0.5, units: 'N' },
          explanations: {
            micro: 'Fₓ = F cos θ = 50 × 0.8 = 40 N',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the acceleration (in m/s²).',
          correctNumeric: 4,
          validation: { numericTolerance: 0.1, units: 'm/s²' },
          explanations: {
            micro: 'a = Fₓ/m = 40/10 = 4 m/s²',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 4, units: 'm/s²' },
        synthesis: [
          'Resolve force into components: Fₓ = F cos θ, Fᵧ = F sin θ',
          'Horizontal: Fₓ = 50 × 0.8 = 40 N',
          'Apply Newton\'s 2nd law: a = Fₓ/m = 40/10 = 4 m/s²',
          'Note: Vertical component reduces normal force but doesn\'t affect horizontal motion on frictionless surface',
        ],
      },
    },
  },

  // Thermodynamics - Heat Engine (Medium)
  {
    questionId: 'thermo-engine-001',
    primaryPatternId: 'thermodynamics/heat_engine',
    difficulty: 3,
    topicTags: ['thermodynamics', 'heat-engine', 'carnot'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'thermo-engine-001',
      metadata: {
        title: 'Carnot Engine Efficiency',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['thermodynamics', 'heat-engine'],
        patternTags: ['carnot-cycle', 'efficiency'],
      },
      prompt: {
        text: 'A Carnot engine operates between a hot reservoir at 500 K and a cold reservoir at 300 K. If the engine absorbs 1000 J of heat from the hot reservoir, find the work done by the engine.',
        given: [
          { label: 'Hot reservoir temperature', value: '500', unit: 'K' },
          { label: 'Cold reservoir temperature', value: '300', unit: 'K' },
          { label: 'Heat absorbed', value: '1000', unit: 'J' },
        ],
        asked: [
          { label: 'Work done by the engine' },
        ],
      },
      primaryPatternId: 'thermodynamics/heat_engine',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The efficiency of a Carnot engine is given by:',
          choices: [
            { key: 'A', text: '$\\eta = 1 - T_C/T_H$', isDistractor: false },
            { key: 'B', text: '$\\eta = 1 - T_H/T_C$', isDistractor: true },
            { key: 'C', text: '$\\eta = T_C/T_H$', isDistractor: true },
            { key: 'D', text: '$\\eta = T_H - T_C$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the efficiency of the engine (as a decimal).',
          correctNumeric: 0.4,
          validation: { numericTolerance: 0.02 },
          explanations: {
            micro: 'η = 1 - Tc/Th = 1 - 300/500 = 1 - 0.6 = 0.4 (or 40%)',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the work done by the engine (in J).',
          correctNumeric: 400,
          validation: { numericTolerance: 5, units: 'J' },
          explanations: {
            micro: 'W = η × Qh = 0.4 × 1000 = 400 J',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 400, units: 'J' },
        synthesis: [
          'Carnot efficiency: η = 1 - Tc/Th = 1 - 300/500 = 0.4',
          'Work output: W = η × Qh = 0.4 × 1000 = 400 J',
          'Heat rejected: Qc = Qh - W = 1000 - 400 = 600 J',
        ],
      },
    },
  },

  // Thermodynamics - Calorimetry (Easy)
  {
    questionId: 'thermo-calor-001',
    primaryPatternId: 'thermodynamics/calorimetry',
    difficulty: 2,
    topicTags: ['thermodynamics', 'calorimetry', 'specific-heat'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'thermo-calor-001',
      metadata: {
        title: 'Mixing Hot and Cold Water',
        difficulty: 2,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['thermodynamics', 'calorimetry'],
        patternTags: ['heat-transfer', 'thermal-equilibrium'],
      },
      prompt: {
        text: '200 g of water at 80°C is mixed with 300 g of water at 20°C in an insulated container. Find the final equilibrium temperature. (Specific heat of water = 4.2 J/g°C)',
        given: [
          { label: 'Mass of hot water', value: '200', unit: 'g' },
          { label: 'Temperature of hot water', value: '80', unit: '°C' },
          { label: 'Mass of cold water', value: '300', unit: 'g' },
          { label: 'Temperature of cold water', value: '20', unit: '°C' },
        ],
        asked: [
          { label: 'Final equilibrium temperature' },
        ],
      },
      primaryPatternId: 'thermodynamics/calorimetry',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'In calorimetry, which principle applies?',
          choices: [
            { key: 'A', text: 'Heat lost = Heat gained', isDistractor: false },
            { key: 'B', text: 'Heat lost + Heat gained = constant', isDistractor: true },
            { key: 'C', text: 'Temperature lost = Temperature gained', isDistractor: true },
            { key: 'D', text: 'Mass × Temperature is conserved', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'MCQ_SINGLE',
          prompt: 'If final temperature is T, the heat lost by hot water is:',
          choices: [
            { key: 'A', text: '$m_1 c (80 - T)$', isDistractor: false },
            { key: 'B', text: '$m_1 c (T - 80)$', isDistractor: true },
            { key: 'C', text: '$m_1 c T$', isDistractor: true },
            { key: 'D', text: '$m_1 (80 - T)$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the final temperature (in °C).',
          correctNumeric: 44,
          validation: { numericTolerance: 1, units: '°C' },
          explanations: {
            micro: 'm₁c(80-T) = m₂c(T-20) → 200(80-T) = 300(T-20) → 16000-200T = 300T-6000 → 22000 = 500T → T = 44°C',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 44, units: '°C' },
        synthesis: [
          'Heat lost by hot water = Heat gained by cold water',
          'm₁c(T₁-T) = m₂c(T-T₂)',
          '200(80-T) = 300(T-20)',
          '16000 - 200T = 300T - 6000',
          '22000 = 500T → T = 44°C',
        ],
      },
    },
  },

  // Electromagnetism - Gauss's Law (Hard)
  {
    questionId: 'em-gauss-001',
    primaryPatternId: 'electromagnetism/gauss_law',
    difficulty: 4,
    topicTags: ['electromagnetism', 'electrostatics', 'gauss-law'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'em-gauss-001',
      metadata: {
        title: 'Electric Field of Uniformly Charged Sphere',
        difficulty: 4,
        estimatedTimeSec: 480,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['electromagnetism', 'electrostatics'],
        patternTags: ['gauss-law', 'symmetric-charge'],
      },
      prompt: {
        text: 'A solid sphere of radius R carries a total charge Q uniformly distributed throughout its volume. Find the electric field at a distance r from the center, where r < R (inside the sphere). Express in terms of Q, R, r, and ε₀.',
        given: [
          { label: 'Sphere radius', value: 'R', unit: '' },
          { label: 'Total charge', value: 'Q', unit: '' },
          { label: 'Distance from center', value: 'r < R', unit: '' },
        ],
        asked: [
          { label: 'Electric field inside the sphere' },
        ],
      },
      primaryPatternId: 'electromagnetism/gauss_law',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'What is the appropriate Gaussian surface for this problem?',
          choices: [
            { key: 'A', text: 'A sphere of radius r centered at the center of the charged sphere', isDistractor: false },
            { key: 'B', text: 'A cylinder passing through the sphere', isDistractor: true },
            { key: 'C', text: 'A cube of side r', isDistractor: true },
            { key: 'D', text: 'The surface of the charged sphere itself', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'MCQ_SINGLE',
          prompt: 'The charge enclosed by a Gaussian sphere of radius r is:',
          choices: [
            { key: 'A', text: '$Q_{enc} = Q(r/R)^3$', isDistractor: false },
            { key: 'B', text: '$Q_{enc} = Q(r/R)^2$', isDistractor: true },
            { key: 'C', text: '$Q_{enc} = Q(r/R)$', isDistractor: true },
            { key: 'D', text: '$Q_{enc} = Q$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-3',
          type: 'MCQ_SINGLE',
          prompt: 'Applying Gauss\'s law, the electric field inside is:',
          choices: [
            { key: 'A', text: '$E = \\frac{Qr}{4\\pi\\varepsilon_0 R^3}$', isDistractor: false },
            { key: 'B', text: '$E = \\frac{Q}{4\\pi\\varepsilon_0 r^2}$', isDistractor: true },
            { key: 'C', text: '$E = \\frac{Q}{4\\pi\\varepsilon_0 R^2}$', isDistractor: true },
            { key: 'D', text: '$E = \\frac{Qr^2}{4\\pi\\varepsilon_0 R^3}$', isDistractor: true },
          ],
          correct: 'A',
        },
      ],
      solutions: {
        finalAnswer: { type: 'EXPRESSION', value: 'E = Qr/(4πε₀R³)' },
        synthesis: [
          'Choose Gaussian sphere of radius r < R',
          'Charge enclosed: Q_enc = Q × (volume ratio) = Q(r³/R³)',
          'Apply Gauss\'s law: E(4πr²) = Q_enc/ε₀',
          'E = Q_enc/(4πε₀r²) = Qr³/(4πε₀R³r²) = Qr/(4πε₀R³)',
          'Field increases linearly with r inside the sphere',
        ],
      },
    },
  },

  // Optics - Mirrors (Easy)
  {
    questionId: 'optics-mirror-001',
    primaryPatternId: 'optics/mirrors',
    difficulty: 2,
    topicTags: ['optics', 'mirrors', 'geometric-optics'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'optics-mirror-001',
      metadata: {
        title: 'Concave Mirror Image Formation',
        difficulty: 2,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['optics', 'mirrors'],
        patternTags: ['mirror-equation', 'image-formation'],
      },
      prompt: {
        text: 'An object is placed 30 cm in front of a concave mirror of focal length 20 cm. Find the position of the image and state whether it is real or virtual.',
        given: [
          { label: 'Object distance (u)', value: '-30', unit: 'cm' },
          { label: 'Focal length (f)', value: '-20', unit: 'cm' },
        ],
        asked: [
          { label: 'Image distance (v)' },
          { label: 'Nature of image (real/virtual)' },
        ],
      },
      primaryPatternId: 'optics/mirrors',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The mirror equation is:',
          choices: [
            { key: 'A', text: '$\\frac{1}{f} = \\frac{1}{v} + \\frac{1}{u}$', isDistractor: false },
            { key: 'B', text: '$\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u}$', isDistractor: true },
            { key: 'C', text: '$f = u + v$', isDistractor: true },
            { key: 'D', text: '$f = uv$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the image distance v (in cm). Use sign convention.',
          correctNumeric: -60,
          validation: { numericTolerance: 1, units: 'cm' },
          explanations: {
            micro: '1/v = 1/f - 1/u = 1/(-20) - 1/(-30) = -1/20 + 1/30 = -1/60 → v = -60 cm',
          },
        },
        {
          stepId: 'step-3',
          type: 'MCQ_SINGLE',
          prompt: 'The image is:',
          choices: [
            { key: 'A', text: 'Real (v is negative, same side as object)', isDistractor: false },
            { key: 'B', text: 'Virtual (v is positive)', isDistractor: true },
            { key: 'C', text: 'At infinity', isDistractor: true },
            { key: 'D', text: 'Cannot be determined', isDistractor: true },
          ],
          correct: 'A',
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: -60, units: 'cm' },
        synthesis: [
          'Apply mirror equation: 1/f = 1/v + 1/u',
          '1/(-20) = 1/v + 1/(-30)',
          '1/v = -1/20 + 1/30 = -1/60',
          'v = -60 cm (real image, 60 cm in front of mirror)',
          'Magnification m = -v/u = -(-60)/(-30) = -2 (inverted, magnified)',
        ],
      },
    },
  },

  // Waves - Standing Waves (Medium)
  {
    questionId: 'waves-standing-001',
    primaryPatternId: 'waves/standing_waves',
    difficulty: 3,
    topicTags: ['waves', 'standing-waves', 'resonance'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'waves-standing-001',
      metadata: {
        title: 'Standing Waves on a String',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['waves', 'standing-waves'],
        patternTags: ['resonance', 'harmonics'],
      },
      prompt: {
        text: 'A string of length 1 m is fixed at both ends and vibrates in its third harmonic. If the wave speed on the string is 200 m/s, find the frequency of vibration.',
        given: [
          { label: 'Length of string', value: '1', unit: 'm' },
          { label: 'Harmonic', value: '3rd', unit: '' },
          { label: 'Wave speed', value: '200', unit: 'm/s' },
        ],
        asked: [
          { label: 'Frequency of vibration' },
        ],
      },
      primaryPatternId: 'waves/standing_waves',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'For a string fixed at both ends, the wavelength of the nth harmonic is:',
          choices: [
            { key: 'A', text: '$\\lambda_n = 2L/n$', isDistractor: false },
            { key: 'B', text: '$\\lambda_n = nL/2$', isDistractor: true },
            { key: 'C', text: '$\\lambda_n = 4L/n$', isDistractor: true },
            { key: 'D', text: '$\\lambda_n = L/n$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the wavelength of the third harmonic (in m).',
          correctNumeric: 0.667,
          validation: { numericTolerance: 0.02, units: 'm' },
          explanations: {
            micro: 'λ₃ = 2L/3 = 2(1)/3 = 0.667 m',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the frequency (in Hz). Use f = v/λ',
          correctNumeric: 300,
          validation: { numericTolerance: 5, units: 'Hz' },
          explanations: {
            micro: 'f = v/λ = 200/0.667 = 300 Hz',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 300, units: 'Hz' },
        synthesis: [
          'For nth harmonic: λₙ = 2L/n',
          'Third harmonic: λ₃ = 2(1)/3 = 2/3 m',
          'Frequency: f = v/λ = 200/(2/3) = 300 Hz',
          'Note: f₃ = 3f₁ where f₁ = v/2L = 100 Hz is fundamental',
        ],
      },
    },
  },

  // Modern Physics - Nuclear Decay (Medium)
  {
    questionId: 'modern-nuclear-001',
    primaryPatternId: 'modern/nuclear_decay',
    difficulty: 3,
    topicTags: ['modern-physics', 'nuclear', 'radioactivity'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'modern-nuclear-001',
      metadata: {
        title: 'Radioactive Half-Life',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['modern-physics', 'nuclear'],
        patternTags: ['half-life', 'radioactive-decay'],
      },
      prompt: {
        text: 'A radioactive sample has a half-life of 20 minutes. If the initial activity is 800 Bq, what will be the activity after 1 hour?',
        given: [
          { label: 'Half-life', value: '20', unit: 'minutes' },
          { label: 'Initial activity', value: '800', unit: 'Bq' },
          { label: 'Time elapsed', value: '60', unit: 'minutes (1 hour)' },
        ],
        asked: [
          { label: 'Activity after 1 hour' },
        ],
      },
      primaryPatternId: 'modern/nuclear_decay',
      steps: [
        {
          stepId: 'step-1',
          type: 'NUMERIC',
          prompt: 'How many half-lives have passed in 1 hour?',
          correctNumeric: 3,
          validation: { numericTolerance: 0.1 },
          explanations: {
            micro: 'Number of half-lives = 60 min / 20 min = 3',
          },
        },
        {
          stepId: 'step-2',
          type: 'MCQ_SINGLE',
          prompt: 'After n half-lives, the remaining activity is:',
          choices: [
            { key: 'A', text: '$A = A_0 / 2^n$', isDistractor: false },
            { key: 'B', text: '$A = A_0 \\times 2^n$', isDistractor: true },
            { key: 'C', text: '$A = A_0 / n$', isDistractor: true },
            { key: 'D', text: '$A = A_0 - n$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the activity after 1 hour (in Bq).',
          correctNumeric: 100,
          validation: { numericTolerance: 2, units: 'Bq' },
          explanations: {
            micro: 'A = A₀/2³ = 800/8 = 100 Bq',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 100, units: 'Bq' },
        synthesis: [
          'Number of half-lives: n = t/T½ = 60/20 = 3',
          'After 3 half-lives: A = A₀/2³ = 800/8 = 100 Bq',
          'Alternatively: 800 → 400 → 200 → 100 Bq',
        ],
      },
    },
  },

  // ============ ADDITIONAL QUESTIONS (2nd question per pattern) ============

  // Mechanics - Frictionless Incline #2 (Hard)
  {
    questionId: 'mech-incline-002',
    primaryPatternId: 'mechanics/incline_frictionless',
    difficulty: 4,
    topicTags: ['mechanics', 'dynamics', 'inclined-plane'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-incline-002',
      metadata: {
        title: 'Two Blocks on Frictionless Double Incline',
        difficulty: 4,
        estimatedTimeSec: 480,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'dynamics', 'inclined-plane'],
        patternTags: ['incline-frictionless', 'connected-masses'],
      },
      prompt: {
        text: 'Two blocks of masses 3 kg and 5 kg are connected by a light string over a frictionless pulley at the top of a double incline. The 3 kg block is on a 30° incline and the 5 kg block is on a 45° incline. Both surfaces are frictionless. Find the acceleration of the system. (g = 10 m/s², sin 30° = 0.5, sin 45° = 0.707)',
        given: [
          { label: 'm₁', value: '3', unit: 'kg' },
          { label: 'm₂', value: '5', unit: 'kg' },
          { label: 'θ₁', value: '30', unit: '°' },
          { label: 'θ₂', value: '45', unit: '°' },
        ],
        asked: [{ label: 'Acceleration of the system' }],
      },
      primaryPatternId: 'mechanics/incline_frictionless',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'Which block will move down its incline?',
          choices: [
            { key: 'A', text: 'The 5 kg block (larger component of weight along incline)', isDistractor: false },
            { key: 'B', text: 'The 3 kg block', isDistractor: true },
            { key: 'C', text: 'Neither, they balance', isDistractor: true },
            { key: 'D', text: 'Cannot determine without friction', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the net force driving the system (in N).',
          correctNumeric: 20.35,
          validation: { numericTolerance: 0.5, units: 'N' },
          explanations: {
            micro: 'F_net = m₂g sin 45° - m₁g sin 30° = 5(10)(0.707) - 3(10)(0.5) = 35.35 - 15 = 20.35 N',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the acceleration (in m/s²).',
          correctNumeric: 2.54,
          validation: { numericTolerance: 0.1, units: 'm/s²' },
          explanations: {
            micro: 'a = F_net/(m₁+m₂) = 20.35/8 = 2.54 m/s²',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 2.54, units: 'm/s²' },
        synthesis: [
          'Compare weight components: m₂g sin 45° vs m₁g sin 30°',
          '5(10)(0.707) = 35.35 N > 3(10)(0.5) = 15 N',
          'a = (35.35 - 15)/(3 + 5) = 2.54 m/s²',
        ],
      },
    },
  },

  // Mechanics - Incline with Friction #2 (Hard)
  {
    questionId: 'mech-incline-friction-002',
    primaryPatternId: 'mechanics/incline_with_friction',
    difficulty: 4,
    topicTags: ['mechanics', 'dynamics', 'friction'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-incline-friction-002',
      metadata: {
        title: 'Block Pushed Up Rough Incline',
        difficulty: 4,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'dynamics', 'friction'],
        patternTags: ['incline-with-friction', 'applied-force'],
      },
      prompt: {
        text: 'A 2 kg block is pushed up a rough inclined plane at 30° with a horizontal force of 20 N. If μₖ = 0.2, find the acceleration. (g = 10 m/s², sin 30° = 0.5, cos 30° = 0.866)',
        given: [
          { label: 'Mass', value: '2', unit: 'kg' },
          { label: 'Angle', value: '30', unit: '°' },
          { label: 'Horizontal force', value: '20', unit: 'N' },
          { label: 'μₖ', value: '0.2', unit: '' },
        ],
        asked: [{ label: 'Acceleration up the incline' }],
      },
      primaryPatternId: 'mechanics/incline_with_friction',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The component of the horizontal force along the incline is:',
          choices: [
            { key: 'A', text: 'F cos θ (up the incline)', isDistractor: false },
            { key: 'B', text: 'F sin θ', isDistractor: true },
            { key: 'C', text: 'F', isDistractor: true },
            { key: 'D', text: 'F tan θ', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the normal force (in N). Note: horizontal force has a perpendicular component.',
          correctNumeric: 27.32,
          validation: { numericTolerance: 0.5, units: 'N' },
          explanations: {
            micro: 'N = mg cos θ + F sin θ = 2(10)(0.866) + 20(0.5) = 17.32 + 10 = 27.32 N',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate the acceleration (in m/s²).',
          correctNumeric: 1.15,
          validation: { numericTolerance: 0.2, units: 'm/s²' },
          explanations: {
            micro: 'ma = F cos θ - mg sin θ - μN = 20(0.866) - 2(10)(0.5) - 0.2(27.32) = 17.32 - 10 - 5.46 = 1.86 N → a = 0.93 m/s²',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 1.15, units: 'm/s²' },
        synthesis: [
          'Resolve horizontal force into components along and perpendicular to incline',
          'N = mg cos θ + F sin θ = 27.32 N',
          'Net force = F cos θ - mg sin θ - μN',
          'a = (17.32 - 10 - 5.46)/2 ≈ 1.15 m/s²',
        ],
      },
    },
  },

  // Mechanics - Newton 2D Block #2 (Easy)
  {
    questionId: 'mech-newton2d-002',
    primaryPatternId: 'mechanics/newton_2d_block',
    difficulty: 2,
    topicTags: ['mechanics', 'dynamics', 'forces'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-newton2d-002',
      metadata: {
        title: 'Two Forces on a Block',
        difficulty: 2,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'dynamics'],
        patternTags: ['newton-2d', 'vector-addition'],
      },
      prompt: {
        text: 'A 4 kg block on a frictionless surface has two forces applied: 12 N to the east and 16 N to the north. Find the magnitude of the acceleration.',
        given: [
          { label: 'Mass', value: '4', unit: 'kg' },
          { label: 'Force east', value: '12', unit: 'N' },
          { label: 'Force north', value: '16', unit: 'N' },
        ],
        asked: [{ label: 'Magnitude of acceleration' }],
      },
      primaryPatternId: 'mechanics/newton_2d_block',
      steps: [
        {
          stepId: 'step-1',
          type: 'NUMERIC',
          prompt: 'Calculate the net force magnitude using Pythagorean theorem (in N).',
          correctNumeric: 20,
          validation: { numericTolerance: 0.5, units: 'N' },
          explanations: {
            micro: 'F_net = √(12² + 16²) = √(144 + 256) = √400 = 20 N',
          },
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the acceleration (in m/s²).',
          correctNumeric: 5,
          validation: { numericTolerance: 0.1, units: 'm/s²' },
          explanations: {
            micro: 'a = F_net/m = 20/4 = 5 m/s²',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 5, units: 'm/s²' },
        synthesis: [
          'Forces are perpendicular, use Pythagorean theorem',
          'F_net = √(12² + 16²) = 20 N',
          'a = F/m = 20/4 = 5 m/s²',
        ],
      },
    },
  },

  // Mechanics - Projectile Motion #2 (Hard)
  {
    questionId: 'mech-proj-002',
    primaryPatternId: 'mechanics/projectile_motion',
    difficulty: 4,
    topicTags: ['mechanics', 'kinematics', 'projectile'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-proj-002',
      metadata: {
        title: 'Projectile from Height',
        difficulty: 4,
        estimatedTimeSec: 480,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'kinematics', 'projectile'],
        patternTags: ['projectile-motion', 'height-launch'],
      },
      prompt: {
        text: 'A ball is thrown horizontally from a cliff 80 m high with speed 15 m/s. Find: (a) time to hit ground, (b) horizontal distance traveled. (g = 10 m/s²)',
        given: [
          { label: 'Height', value: '80', unit: 'm' },
          { label: 'Horizontal speed', value: '15', unit: 'm/s' },
        ],
        asked: [
          { label: 'Time to hit ground' },
          { label: 'Horizontal distance' },
        ],
      },
      primaryPatternId: 'mechanics/projectile_motion',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'For a horizontally thrown projectile, the initial vertical velocity is:',
          choices: [
            { key: 'A', text: 'Zero', isDistractor: false },
            { key: 'B', text: 'Equal to horizontal velocity', isDistractor: true },
            { key: 'C', text: 'g', isDistractor: true },
            { key: 'D', text: 'Cannot be determined', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate time to hit ground (in s). Use h = ½gt²',
          correctNumeric: 4,
          validation: { numericTolerance: 0.1, units: 's' },
          explanations: {
            micro: 't = √(2h/g) = √(2×80/10) = √16 = 4 s',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate horizontal distance (in m).',
          correctNumeric: 60,
          validation: { numericTolerance: 1, units: 'm' },
          explanations: {
            micro: 'R = vₓ × t = 15 × 4 = 60 m',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 60, units: 'm' },
        synthesis: [
          'Vertical motion: h = ½gt² → t = √(2×80/10) = 4 s',
          'Horizontal motion: R = vₓt = 15 × 4 = 60 m',
        ],
      },
    },
  },

  // Mechanics - Circular Motion #2 (Easy)
  {
    questionId: 'mech-circular-002',
    primaryPatternId: 'mechanics/circular_motion',
    difficulty: 2,
    topicTags: ['mechanics', 'circular-motion'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-circular-002',
      metadata: {
        title: 'Centripetal Acceleration',
        difficulty: 2,
        estimatedTimeSec: 240,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'circular-motion'],
        patternTags: ['circular-motion', 'centripetal-acceleration'],
      },
      prompt: {
        text: 'A car moves in a circle of radius 100 m at constant speed 20 m/s. Find the centripetal acceleration.',
        given: [
          { label: 'Radius', value: '100', unit: 'm' },
          { label: 'Speed', value: '20', unit: 'm/s' },
        ],
        asked: [{ label: 'Centripetal acceleration' }],
      },
      primaryPatternId: 'mechanics/circular_motion',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'Centripetal acceleration is given by:',
          choices: [
            { key: 'A', text: '$a_c = v^2/r$', isDistractor: false },
            { key: 'B', text: '$a_c = vr$', isDistractor: true },
            { key: 'C', text: '$a_c = v/r$', isDistractor: true },
            { key: 'D', text: '$a_c = r/v^2$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the centripetal acceleration (in m/s²).',
          correctNumeric: 4,
          validation: { numericTolerance: 0.1, units: 'm/s²' },
          explanations: {
            micro: 'aᶜ = v²/r = (20)²/100 = 400/100 = 4 m/s²',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 4, units: 'm/s²' },
        synthesis: [
          'Use centripetal acceleration formula: aᶜ = v²/r',
          'aᶜ = (20)²/100 = 4 m/s²',
          'Direction: toward center of circle',
        ],
      },
    },
  },

  // Mechanics - Work Energy #2 (Hard)
  {
    questionId: 'mech-energy-002',
    primaryPatternId: 'mechanics/work_energy',
    difficulty: 4,
    topicTags: ['mechanics', 'energy', 'conservation'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-energy-002',
      metadata: {
        title: 'Block Sliding Down Curve into Spring',
        difficulty: 4,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'energy'],
        patternTags: ['work-energy', 'energy-conservation'],
      },
      prompt: {
        text: 'A 1 kg block slides from rest down a frictionless curved track from height 5 m and compresses a spring (k = 500 N/m) at the bottom. Find maximum compression. (g = 10 m/s²)',
        given: [
          { label: 'Mass', value: '1', unit: 'kg' },
          { label: 'Height', value: '5', unit: 'm' },
          { label: 'Spring constant', value: '500', unit: 'N/m' },
        ],
        asked: [{ label: 'Maximum spring compression' }],
      },
      primaryPatternId: 'mechanics/work_energy',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'At maximum compression, the block\'s kinetic energy is:',
          choices: [
            { key: 'A', text: 'Zero (momentarily at rest)', isDistractor: false },
            { key: 'B', text: 'Maximum', isDistractor: true },
            { key: 'C', text: 'Equal to potential energy', isDistractor: true },
            { key: 'D', text: 'Equal to spring energy', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate maximum compression (in m). Use mgh = ½kx²',
          correctNumeric: 0.447,
          validation: { numericTolerance: 0.02, units: 'm' },
          explanations: {
            micro: 'mgh = ½kx² → x = √(2mgh/k) = √(2×1×10×5/500) = √0.2 = 0.447 m',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 0.447, units: 'm' },
        synthesis: [
          'Energy conservation: mgh = ½kx²',
          'x = √(2mgh/k) = √(100/500) = √0.2 ≈ 0.447 m',
        ],
      },
    },
  },

  // Mechanics - Momentum Collision #2 (Hard)
  {
    questionId: 'mech-momentum-002',
    primaryPatternId: 'mechanics/momentum_collision',
    difficulty: 4,
    topicTags: ['mechanics', 'momentum', 'collision'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-momentum-002',
      metadata: {
        title: 'Elastic Collision - Equal Masses',
        difficulty: 4,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'momentum', 'collision'],
        patternTags: ['momentum-collision', 'elastic-collision'],
      },
      prompt: {
        text: 'A ball of mass 2 kg moving at 6 m/s collides elastically head-on with another 2 kg ball at rest. Find the velocities of both balls after collision.',
        given: [
          { label: 'm₁ = m₂', value: '2', unit: 'kg' },
          { label: 'u₁', value: '6', unit: 'm/s' },
          { label: 'u₂', value: '0', unit: 'm/s' },
        ],
        asked: [
          { label: 'v₁ (velocity of first ball after collision)' },
          { label: 'v₂ (velocity of second ball after collision)' },
        ],
      },
      primaryPatternId: 'mechanics/momentum_collision',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'In an elastic collision between equal masses where one is at rest:',
          choices: [
            { key: 'A', text: 'The moving ball stops and the stationary ball moves with original velocity', isDistractor: false },
            { key: 'B', text: 'Both balls move with half the original velocity', isDistractor: true },
            { key: 'C', text: 'Both balls stick together', isDistractor: true },
            { key: 'D', text: 'The moving ball bounces back', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'What is v₁ after collision (in m/s)?',
          correctNumeric: 0,
          validation: { numericTolerance: 0.1, units: 'm/s' },
          explanations: {
            micro: 'For elastic collision with equal masses: v₁ = 0 (complete momentum transfer)',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'What is v₂ after collision (in m/s)?',
          correctNumeric: 6,
          validation: { numericTolerance: 0.1, units: 'm/s' },
          explanations: {
            micro: 'v₂ = u₁ = 6 m/s (complete momentum transfer)',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'TEXT', value: 'v₁ = 0, v₂ = 6 m/s' },
        synthesis: [
          'Equal mass elastic collision: velocities exchange',
          'v₁ = u₂ = 0 m/s',
          'v₂ = u₁ = 6 m/s',
        ],
      },
    },
  },

  // Mechanics - Pulley System #2 (Medium)
  {
    questionId: 'mech-pulley-002',
    primaryPatternId: 'mechanics/pulley_system',
    difficulty: 3,
    topicTags: ['mechanics', 'dynamics', 'pulley'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-pulley-002',
      metadata: {
        title: 'Block and Pulley on Table',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'dynamics', 'pulley'],
        patternTags: ['pulley-system', 'table-edge'],
      },
      prompt: {
        text: 'A 4 kg block on a frictionless table is connected by a string over a pulley to a 2 kg hanging mass. Find the acceleration and tension. (g = 10 m/s²)',
        given: [
          { label: 'Mass on table', value: '4', unit: 'kg' },
          { label: 'Hanging mass', value: '2', unit: 'kg' },
        ],
        asked: [
          { label: 'Acceleration' },
          { label: 'Tension' },
        ],
      },
      primaryPatternId: 'mechanics/pulley_system',
      steps: [
        {
          stepId: 'step-1',
          type: 'NUMERIC',
          prompt: 'Calculate the acceleration (in m/s²). Use a = m₂g/(m₁+m₂)',
          correctNumeric: 3.33,
          validation: { numericTolerance: 0.1, units: 'm/s²' },
          explanations: {
            micro: 'a = m₂g/(m₁+m₂) = 2(10)/(4+2) = 20/6 = 3.33 m/s²',
          },
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the tension (in N). Use T = m₁a',
          correctNumeric: 13.33,
          validation: { numericTolerance: 0.2, units: 'N' },
          explanations: {
            micro: 'T = m₁a = 4 × 3.33 = 13.33 N',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'TEXT', value: 'a = 3.33 m/s², T = 13.33 N' },
        synthesis: [
          'For block on table: T = m₁a',
          'For hanging mass: m₂g - T = m₂a',
          'Solving: a = m₂g/(m₁+m₂) = 3.33 m/s²',
          'T = m₁a = 13.33 N',
        ],
      },
    },
  },

  // Mechanics - SHM #2 (Easy)
  {
    questionId: 'mech-shm-002',
    primaryPatternId: 'mechanics/simple_harmonic_motion',
    difficulty: 2,
    topicTags: ['mechanics', 'oscillations', 'shm'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'mech-shm-002',
      metadata: {
        title: 'Spring-Mass Period',
        difficulty: 2,
        estimatedTimeSec: 240,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['mechanics', 'oscillations'],
        patternTags: ['simple-harmonic-motion', 'spring-mass'],
      },
      prompt: {
        text: 'A 0.5 kg mass attached to a spring oscillates with period 1 second. Find the spring constant.',
        given: [
          { label: 'Mass', value: '0.5', unit: 'kg' },
          { label: 'Period', value: '1', unit: 's' },
        ],
        asked: [{ label: 'Spring constant k' }],
      },
      primaryPatternId: 'mechanics/simple_harmonic_motion',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The period of a spring-mass system is:',
          choices: [
            { key: 'A', text: '$T = 2\\pi\\sqrt{m/k}$', isDistractor: false },
            { key: 'B', text: '$T = 2\\pi\\sqrt{k/m}$', isDistractor: true },
            { key: 'C', text: '$T = 2\\pi\\sqrt{L/g}$', isDistractor: true },
            { key: 'D', text: '$T = 2\\pi mk$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the spring constant k (in N/m).',
          correctNumeric: 19.74,
          validation: { numericTolerance: 0.5, units: 'N/m' },
          explanations: {
            micro: 'k = 4π²m/T² = 4(9.87)(0.5)/1 = 19.74 N/m',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 19.74, units: 'N/m' },
        synthesis: [
          'From T = 2π√(m/k), we get k = 4π²m/T²',
          'k = 4(9.87)(0.5)/1² = 19.74 N/m',
        ],
      },
    },
  },

  // Thermodynamics - Ideal Gas #2 (Medium)
  {
    questionId: 'thermo-gas-002',
    primaryPatternId: 'thermodynamics/ideal_gas',
    difficulty: 3,
    topicTags: ['thermodynamics', 'ideal-gas'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'thermo-gas-002',
      metadata: {
        title: 'Isobaric Expansion',
        difficulty: 3,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['thermodynamics', 'ideal-gas'],
        patternTags: ['ideal-gas-law', 'isobaric-process'],
      },
      prompt: {
        text: 'An ideal gas at 27°C occupies 2 L at constant pressure. To what temperature must it be heated to occupy 3 L?',
        given: [
          { label: 'Initial temperature', value: '27', unit: '°C (300 K)' },
          { label: 'Initial volume', value: '2', unit: 'L' },
          { label: 'Final volume', value: '3', unit: 'L' },
        ],
        asked: [{ label: 'Final temperature' }],
      },
      primaryPatternId: 'thermodynamics/ideal_gas',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'For constant pressure, which law applies?',
          choices: [
            { key: 'A', text: 'Charles\'s Law: V₁/T₁ = V₂/T₂', isDistractor: false },
            { key: 'B', text: 'Boyle\'s Law', isDistractor: true },
            { key: 'C', text: 'Gay-Lussac\'s Law', isDistractor: true },
            { key: 'D', text: 'Combined Gas Law', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the final temperature (in K).',
          correctNumeric: 450,
          validation: { numericTolerance: 5, units: 'K' },
          explanations: {
            micro: 'T₂ = T₁(V₂/V₁) = 300(3/2) = 450 K = 177°C',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 450, units: 'K' },
        synthesis: [
          'Convert to Kelvin: T₁ = 27 + 273 = 300 K',
          'Charles\'s Law: V₁/T₁ = V₂/T₂',
          'T₂ = T₁(V₂/V₁) = 300(3/2) = 450 K = 177°C',
        ],
      },
    },
  },

  // Thermodynamics - First Law #2 (Easy)
  {
    questionId: 'thermo-first-002',
    primaryPatternId: 'thermodynamics/first_law',
    difficulty: 2,
    topicTags: ['thermodynamics', 'first-law'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'thermo-first-002',
      metadata: {
        title: 'Isothermal Process',
        difficulty: 2,
        estimatedTimeSec: 240,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['thermodynamics', 'first-law'],
        patternTags: ['first-law', 'isothermal-process'],
      },
      prompt: {
        text: 'In an isothermal expansion, an ideal gas absorbs 400 J of heat. How much work does the gas do?',
        given: [
          { label: 'Heat absorbed', value: '400', unit: 'J' },
          { label: 'Process type', value: 'Isothermal', unit: '' },
        ],
        asked: [{ label: 'Work done by gas' }],
      },
      primaryPatternId: 'thermodynamics/first_law',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'In an isothermal process, the change in internal energy is:',
          choices: [
            { key: 'A', text: 'Zero (temperature constant)', isDistractor: false },
            { key: 'B', text: 'Equal to heat absorbed', isDistractor: true },
            { key: 'C', text: 'Equal to work done', isDistractor: true },
            { key: 'D', text: 'Negative', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate work done (in J). Use ΔU = Q - W with ΔU = 0.',
          correctNumeric: 400,
          validation: { numericTolerance: 5, units: 'J' },
          explanations: {
            micro: 'ΔU = 0 (isothermal) → Q = W → W = 400 J',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 400, units: 'J' },
        synthesis: [
          'Isothermal: ΔU = 0 (internal energy depends only on T)',
          'First law: ΔU = Q - W → 0 = Q - W',
          'W = Q = 400 J',
        ],
      },
    },
  },

  // Thermodynamics - Heat Engine #2 (Hard)
  {
    questionId: 'thermo-engine-002',
    primaryPatternId: 'thermodynamics/heat_engine',
    difficulty: 4,
    topicTags: ['thermodynamics', 'heat-engine'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'thermo-engine-002',
      metadata: {
        title: 'Heat Engine Efficiency Comparison',
        difficulty: 4,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['thermodynamics', 'heat-engine'],
        patternTags: ['heat-engine', 'carnot-efficiency'],
      },
      prompt: {
        text: 'A heat engine has efficiency 40%. It exhausts 600 J to the cold reservoir per cycle. Find the heat absorbed from the hot reservoir and work done per cycle.',
        given: [
          { label: 'Efficiency', value: '40', unit: '%' },
          { label: 'Heat rejected', value: '600', unit: 'J' },
        ],
        asked: [
          { label: 'Heat absorbed Qh' },
          { label: 'Work done W' },
        ],
      },
      primaryPatternId: 'thermodynamics/heat_engine',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The efficiency η relates to Qh and Qc as:',
          choices: [
            { key: 'A', text: '$\\eta = 1 - Q_c/Q_h$', isDistractor: false },
            { key: 'B', text: '$\\eta = Q_c/Q_h$', isDistractor: true },
            { key: 'C', text: '$\\eta = Q_h/Q_c$', isDistractor: true },
            { key: 'D', text: '$\\eta = Q_h - Q_c$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate Qh (in J).',
          correctNumeric: 1000,
          validation: { numericTolerance: 10, units: 'J' },
          explanations: {
            micro: 'η = 1 - Qc/Qh → 0.4 = 1 - 600/Qh → Qh = 600/0.6 = 1000 J',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate work done W (in J).',
          correctNumeric: 400,
          validation: { numericTolerance: 5, units: 'J' },
          explanations: {
            micro: 'W = Qh - Qc = 1000 - 600 = 400 J',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'TEXT', value: 'Qh = 1000 J, W = 400 J' },
        synthesis: [
          'From η = 1 - Qc/Qh: 0.4 = 1 - 600/Qh',
          'Qh = 600/0.6 = 1000 J',
          'W = Qh - Qc = 400 J (or W = ηQh = 0.4 × 1000)',
        ],
      },
    },
  },

  // Thermodynamics - Calorimetry #2 (Medium)
  {
    questionId: 'thermo-calor-002',
    primaryPatternId: 'thermodynamics/calorimetry',
    difficulty: 3,
    topicTags: ['thermodynamics', 'calorimetry'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'thermo-calor-002',
      metadata: {
        title: 'Metal Block in Water',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['thermodynamics', 'calorimetry'],
        patternTags: ['calorimetry', 'specific-heat'],
      },
      prompt: {
        text: 'A 200 g metal block at 100°C is dropped into 400 g of water at 20°C. The final temperature is 25°C. Find the specific heat of the metal. (c_water = 4.2 J/g°C)',
        given: [
          { label: 'Metal mass', value: '200', unit: 'g' },
          { label: 'Metal initial temp', value: '100', unit: '°C' },
          { label: 'Water mass', value: '400', unit: 'g' },
          { label: 'Water initial temp', value: '20', unit: '°C' },
          { label: 'Final temp', value: '25', unit: '°C' },
        ],
        asked: [{ label: 'Specific heat of metal' }],
      },
      primaryPatternId: 'thermodynamics/calorimetry',
      steps: [
        {
          stepId: 'step-1',
          type: 'NUMERIC',
          prompt: 'Calculate heat gained by water (in J).',
          correctNumeric: 8400,
          validation: { numericTolerance: 100, units: 'J' },
          explanations: {
            micro: 'Q_water = mc∆T = 400 × 4.2 × (25-20) = 8400 J',
          },
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate specific heat of metal (in J/g°C).',
          correctNumeric: 0.56,
          validation: { numericTolerance: 0.02, units: 'J/g°C' },
          explanations: {
            micro: 'Q_metal = Q_water → 200 × c × 75 = 8400 → c = 0.56 J/g°C',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 0.56, units: 'J/g°C' },
        synthesis: [
          'Heat lost by metal = Heat gained by water',
          'Q_water = 400 × 4.2 × 5 = 8400 J',
          'c_metal = 8400/(200 × 75) = 0.56 J/g°C',
        ],
      },
    },
  },

  // Electromagnetism - Coulomb #2 (Medium)
  {
    questionId: 'em-coulomb-002',
    primaryPatternId: 'electromagnetism/coulomb_field',
    difficulty: 3,
    topicTags: ['electromagnetism', 'electrostatics'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'em-coulomb-002',
      metadata: {
        title: 'Three Charges in a Line',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['electromagnetism', 'electrostatics'],
        patternTags: ['coulomb-law', 'superposition'],
      },
      prompt: {
        text: 'Three charges +q, -2q, and +q are placed at x = 0, x = d, and x = 2d respectively. Find the net force on the middle charge. (Express in terms of kq²/d²)',
        given: [
          { label: 'Charges', value: '+q, -2q, +q', unit: '' },
          { label: 'Positions', value: '0, d, 2d', unit: '' },
        ],
        asked: [{ label: 'Net force on middle charge' }],
      },
      primaryPatternId: 'electromagnetism/coulomb_field',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The force on -2q from the +q at origin is:',
          choices: [
            { key: 'A', text: 'Attractive, toward origin', isDistractor: false },
            { key: 'B', text: 'Repulsive, away from origin', isDistractor: true },
            { key: 'C', text: 'Zero', isDistractor: true },
            { key: 'D', text: 'Perpendicular to line', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'MCQ_SINGLE',
          prompt: 'The net force on -2q is:',
          choices: [
            { key: 'A', text: 'Zero (forces from both +q charges are equal and opposite)', isDistractor: false },
            { key: 'B', text: '$4kq^2/d^2$ toward origin', isDistractor: true },
            { key: 'C', text: '$4kq^2/d^2$ toward x=2d', isDistractor: true },
            { key: 'D', text: '$2kq^2/d^2$ toward origin', isDistractor: true },
          ],
          correct: 'A',
        },
      ],
      solutions: {
        finalAnswer: { type: 'TEXT', value: 'F_net = 0' },
        synthesis: [
          'Force from +q at origin: F₁ = 2kq²/d² (toward origin)',
          'Force from +q at 2d: F₂ = 2kq²/d² (toward 2d)',
          'By symmetry: F_net = 0',
        ],
      },
    },
  },

  // Electromagnetism - Gauss Law #2 (Medium)
  {
    questionId: 'em-gauss-002',
    primaryPatternId: 'electromagnetism/gauss_law',
    difficulty: 3,
    topicTags: ['electromagnetism', 'electrostatics', 'gauss-law'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'em-gauss-002',
      metadata: {
        title: 'Electric Field of Infinite Line Charge',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['electromagnetism', 'electrostatics'],
        patternTags: ['gauss-law', 'line-charge'],
      },
      prompt: {
        text: 'An infinite line has linear charge density λ = 2 μC/m. Find the electric field at distance 10 cm from the line. (k = 9×10⁹ N·m²/C²)',
        given: [
          { label: 'Linear charge density', value: '2', unit: 'μC/m' },
          { label: 'Distance', value: '10', unit: 'cm' },
        ],
        asked: [{ label: 'Electric field' }],
      },
      primaryPatternId: 'electromagnetism/gauss_law',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'For an infinite line charge, E varies as:',
          choices: [
            { key: 'A', text: 'E ∝ 1/r', isDistractor: false },
            { key: 'B', text: 'E ∝ 1/r²', isDistractor: true },
            { key: 'C', text: 'E = constant', isDistractor: true },
            { key: 'D', text: 'E ∝ r', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate E (in N/C). Use E = 2kλ/r',
          correctNumeric: 3.6e5,
          validation: { numericTolerance: 1e4, units: 'N/C' },
          explanations: {
            micro: 'E = 2kλ/r = 2(9×10⁹)(2×10⁻⁶)/(0.1) = 3.6×10⁵ N/C',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 360000, units: 'N/C' },
        synthesis: [
          'For infinite line: E = λ/(2πε₀r) = 2kλ/r',
          'E = 2(9×10⁹)(2×10⁻⁶)/(0.1) = 3.6×10⁵ N/C',
        ],
      },
    },
  },

  // Electromagnetism - Capacitors #2 (Medium)
  {
    questionId: 'em-capacitor-002',
    primaryPatternId: 'electromagnetism/capacitors',
    difficulty: 3,
    topicTags: ['electromagnetism', 'capacitors'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'em-capacitor-002',
      metadata: {
        title: 'Capacitors in Series',
        difficulty: 3,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['electromagnetism', 'capacitors'],
        patternTags: ['capacitors', 'series-combination'],
      },
      prompt: {
        text: 'Two capacitors of 6 μF and 3 μF are connected in series across a 12 V battery. Find the equivalent capacitance and charge stored.',
        given: [
          { label: 'C₁', value: '6', unit: 'μF' },
          { label: 'C₂', value: '3', unit: 'μF' },
          { label: 'Voltage', value: '12', unit: 'V' },
        ],
        asked: [
          { label: 'Equivalent capacitance' },
          { label: 'Charge' },
        ],
      },
      primaryPatternId: 'electromagnetism/capacitors',
      steps: [
        {
          stepId: 'step-1',
          type: 'NUMERIC',
          prompt: 'Calculate equivalent capacitance (in μF). Use 1/C_eq = 1/C₁ + 1/C₂',
          correctNumeric: 2,
          validation: { numericTolerance: 0.1, units: 'μF' },
          explanations: {
            micro: '1/C_eq = 1/6 + 1/3 = 1/6 + 2/6 = 3/6 = 1/2 → C_eq = 2 μF',
          },
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate charge stored (in μC).',
          correctNumeric: 24,
          validation: { numericTolerance: 0.5, units: 'μC' },
          explanations: {
            micro: 'Q = C_eq × V = 2 × 12 = 24 μC',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'TEXT', value: 'C_eq = 2 μF, Q = 24 μC' },
        synthesis: [
          'Series: 1/C_eq = 1/6 + 1/3 = 1/2 → C_eq = 2 μF',
          'Q = CV = 2 × 12 = 24 μC',
          'Both capacitors have same charge in series',
        ],
      },
    },
  },

  // Electromagnetism - DC Circuits #2 (Easy)
  {
    questionId: 'em-circuit-002',
    primaryPatternId: 'electromagnetism/dc_circuits',
    difficulty: 2,
    topicTags: ['electromagnetism', 'circuits'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'em-circuit-002',
      metadata: {
        title: 'Resistors in Parallel',
        difficulty: 2,
        estimatedTimeSec: 240,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['electromagnetism', 'circuits'],
        patternTags: ['dc-circuits', 'parallel-resistors'],
      },
      prompt: {
        text: 'Three 6Ω resistors are connected in parallel. Find the equivalent resistance.',
        given: [
          { label: 'Each resistor', value: '6', unit: 'Ω' },
          { label: 'Number', value: '3', unit: '' },
        ],
        asked: [{ label: 'Equivalent resistance' }],
      },
      primaryPatternId: 'electromagnetism/dc_circuits',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'For n equal resistors R in parallel, R_eq equals:',
          choices: [
            { key: 'A', text: 'R/n', isDistractor: false },
            { key: 'B', text: 'nR', isDistractor: true },
            { key: 'C', text: 'R', isDistractor: true },
            { key: 'D', text: 'R/n²', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate equivalent resistance (in Ω).',
          correctNumeric: 2,
          validation: { numericTolerance: 0.1, units: 'Ω' },
          explanations: {
            micro: 'R_eq = R/n = 6/3 = 2 Ω',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 2, units: 'Ω' },
        synthesis: [
          '1/R_eq = 1/6 + 1/6 + 1/6 = 3/6 = 1/2',
          'R_eq = 2 Ω',
          'Or directly: R_eq = R/n = 6/3 = 2 Ω',
        ],
      },
    },
  },

  // Electromagnetism - Magnetic Force #2 (Hard)
  {
    questionId: 'em-magforce-002',
    primaryPatternId: 'electromagnetism/magnetic_force',
    difficulty: 4,
    topicTags: ['electromagnetism', 'magnetism'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'em-magforce-002',
      metadata: {
        title: 'Circular Motion in Magnetic Field',
        difficulty: 4,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['electromagnetism', 'magnetism'],
        patternTags: ['magnetic-force', 'circular-motion'],
      },
      prompt: {
        text: 'An electron (m = 9×10⁻³¹ kg, q = 1.6×10⁻¹⁹ C) moves at 10⁷ m/s perpendicular to a 0.1 T magnetic field. Find the radius of its circular path.',
        given: [
          { label: 'Mass', value: '9×10⁻³¹', unit: 'kg' },
          { label: 'Charge', value: '1.6×10⁻¹⁹', unit: 'C' },
          { label: 'Velocity', value: '10⁷', unit: 'm/s' },
          { label: 'Magnetic field', value: '0.1', unit: 'T' },
        ],
        asked: [{ label: 'Radius of circular path' }],
      },
      primaryPatternId: 'electromagnetism/magnetic_force',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'For circular motion in magnetic field, the radius is given by:',
          choices: [
            { key: 'A', text: '$r = mv/(qB)$', isDistractor: false },
            { key: 'B', text: '$r = qB/(mv)$', isDistractor: true },
            { key: 'C', text: '$r = qvB/m$', isDistractor: true },
            { key: 'D', text: '$r = m/(qvB)$', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the radius (in mm).',
          correctNumeric: 0.56,
          validation: { numericTolerance: 0.05, units: 'mm' },
          explanations: {
            micro: 'r = mv/(qB) = (9×10⁻³¹)(10⁷)/((1.6×10⁻¹⁹)(0.1)) = 5.6×10⁻⁴ m = 0.56 mm',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 0.56, units: 'mm' },
        synthesis: [
          'Magnetic force = Centripetal force: qvB = mv²/r',
          'r = mv/(qB) = (9×10⁻³¹)(10⁷)/((1.6×10⁻¹⁹)(0.1))',
          'r = 5.6×10⁻⁴ m = 0.56 mm',
        ],
      },
    },
  },

  // Electromagnetism - EM Induction #2 (Medium)
  {
    questionId: 'em-induction-002',
    primaryPatternId: 'electromagnetism/em_induction',
    difficulty: 3,
    topicTags: ['electromagnetism', 'induction'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'em-induction-002',
      metadata: {
        title: 'Moving Rod in Magnetic Field',
        difficulty: 3,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['electromagnetism', 'induction'],
        patternTags: ['em-induction', 'motional-emf'],
      },
      prompt: {
        text: 'A 50 cm rod moves at 4 m/s perpendicular to a 0.5 T magnetic field. Find the induced EMF.',
        given: [
          { label: 'Length', value: '50', unit: 'cm' },
          { label: 'Velocity', value: '4', unit: 'm/s' },
          { label: 'Magnetic field', value: '0.5', unit: 'T' },
        ],
        asked: [{ label: 'Induced EMF' }],
      },
      primaryPatternId: 'electromagnetism/em_induction',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'The motional EMF formula is:',
          choices: [
            { key: 'A', text: 'ε = BLv', isDistractor: false },
            { key: 'B', text: 'ε = BL/v', isDistractor: true },
            { key: 'C', text: 'ε = Bv/L', isDistractor: true },
            { key: 'D', text: 'ε = B + L + v', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the induced EMF (in V).',
          correctNumeric: 1,
          validation: { numericTolerance: 0.05, units: 'V' },
          explanations: {
            micro: 'ε = BLv = 0.5 × 0.5 × 4 = 1 V',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 1, units: 'V' },
        synthesis: [
          'Motional EMF: ε = BLv',
          'ε = 0.5 × 0.5 × 4 = 1 V',
        ],
      },
    },
  },

  // Optics - Lenses #2 (Medium)
  {
    questionId: 'optics-lens-002',
    primaryPatternId: 'optics/lenses',
    difficulty: 3,
    topicTags: ['optics', 'lenses'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'optics-lens-002',
      metadata: {
        title: 'Magnification by Convex Lens',
        difficulty: 3,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['optics', 'lenses'],
        patternTags: ['thin-lens', 'magnification'],
      },
      prompt: {
        text: 'An object 2 cm tall is placed 15 cm from a convex lens of focal length 10 cm. Find the height of the image.',
        given: [
          { label: 'Object height', value: '2', unit: 'cm' },
          { label: 'Object distance', value: '15', unit: 'cm' },
          { label: 'Focal length', value: '10', unit: 'cm' },
        ],
        asked: [{ label: 'Image height' }],
      },
      primaryPatternId: 'optics/lenses',
      steps: [
        {
          stepId: 'step-1',
          type: 'NUMERIC',
          prompt: 'Calculate image distance v (in cm).',
          correctNumeric: 30,
          validation: { numericTolerance: 1, units: 'cm' },
          explanations: {
            micro: '1/v = 1/f - 1/u = 1/10 - 1/15 = 1/30 → v = 30 cm',
          },
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate magnification m = v/u.',
          correctNumeric: 2,
          validation: { numericTolerance: 0.1 },
          explanations: {
            micro: 'm = v/u = 30/15 = 2',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate image height (in cm).',
          correctNumeric: 4,
          validation: { numericTolerance: 0.1, units: 'cm' },
          explanations: {
            micro: 'h\' = m × h = 2 × 2 = 4 cm',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 4, units: 'cm' },
        synthesis: [
          'v = 30 cm (using lens formula)',
          'm = v/u = 30/15 = 2',
          'Image height = 2 × 2 = 4 cm (inverted)',
        ],
      },
    },
  },

  // Optics - Mirrors #2 (Medium)
  {
    questionId: 'optics-mirror-002',
    primaryPatternId: 'optics/mirrors',
    difficulty: 3,
    topicTags: ['optics', 'mirrors'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'optics-mirror-002',
      metadata: {
        title: 'Convex Mirror Image',
        difficulty: 3,
        estimatedTimeSec: 300,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['optics', 'mirrors'],
        patternTags: ['mirror-equation', 'convex-mirror'],
      },
      prompt: {
        text: 'A convex mirror has focal length 15 cm. An object is placed 30 cm from the mirror. Find the image distance and magnification.',
        given: [
          { label: 'Focal length', value: '+15', unit: 'cm' },
          { label: 'Object distance', value: '-30', unit: 'cm' },
        ],
        asked: [
          { label: 'Image distance' },
          { label: 'Magnification' },
        ],
      },
      primaryPatternId: 'optics/mirrors',
      steps: [
        {
          stepId: 'step-1',
          type: 'NUMERIC',
          prompt: 'Calculate image distance v (in cm).',
          correctNumeric: 10,
          validation: { numericTolerance: 0.5, units: 'cm' },
          explanations: {
            micro: '1/v = 1/f - 1/u = 1/15 - 1/(-30) = 1/15 + 1/30 = 1/10 → v = +10 cm',
          },
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate magnification.',
          correctNumeric: 0.33,
          validation: { numericTolerance: 0.02 },
          explanations: {
            micro: 'm = -v/u = -10/(-30) = 1/3 ≈ 0.33',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'TEXT', value: 'v = +10 cm, m = 1/3' },
        synthesis: [
          '1/v = 1/15 + 1/30 = 3/30 = 1/10 → v = +10 cm',
          'm = 1/3 (virtual, erect, diminished)',
        ],
      },
    },
  },

  // Optics - Interference #2 (Medium)
  {
    questionId: 'optics-interference-002',
    primaryPatternId: 'optics/interference',
    difficulty: 3,
    topicTags: ['optics', 'wave-optics'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'optics-interference-002',
      metadata: {
        title: 'Thin Film Interference',
        difficulty: 3,
        estimatedTimeSec: 360,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['optics', 'wave-optics'],
        patternTags: ['interference', 'thin-film'],
      },
      prompt: {
        text: 'A thin soap film (n = 1.33) appears green (λ = 532 nm) in reflected light. What is the minimum thickness for constructive interference?',
        given: [
          { label: 'Refractive index', value: '1.33', unit: '' },
          { label: 'Wavelength', value: '532', unit: 'nm' },
        ],
        asked: [{ label: 'Minimum thickness' }],
      },
      primaryPatternId: 'optics/interference',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'For thin film in air, constructive interference occurs when:',
          choices: [
            { key: 'A', text: '2nt = (m + 1/2)λ for minimum at m=0', isDistractor: false },
            { key: 'B', text: '2nt = mλ', isDistractor: true },
            { key: 'C', text: 'nt = λ/2', isDistractor: true },
            { key: 'D', text: '2t = mλ', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate minimum thickness (in nm). Use 2nt = λ/2',
          correctNumeric: 100,
          validation: { numericTolerance: 5, units: 'nm' },
          explanations: {
            micro: 't = λ/(4n) = 532/(4×1.33) = 100 nm',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 100, units: 'nm' },
        synthesis: [
          'For m=0: 2nt = λ/2 (accounting for phase change at top surface)',
          't = λ/(4n) = 532/(4×1.33) = 100 nm',
        ],
      },
    },
  },

  // Waves - Standing Waves #2 (Easy)
  {
    questionId: 'waves-standing-002',
    primaryPatternId: 'waves/standing_waves',
    difficulty: 2,
    topicTags: ['waves', 'standing-waves'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'waves-standing-002',
      metadata: {
        title: 'Open Pipe Harmonics',
        difficulty: 2,
        estimatedTimeSec: 240,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['waves', 'standing-waves'],
        patternTags: ['standing-waves', 'organ-pipe'],
      },
      prompt: {
        text: 'An open pipe is 1 m long. If the speed of sound is 340 m/s, find the fundamental frequency.',
        given: [
          { label: 'Length', value: '1', unit: 'm' },
          { label: 'Speed of sound', value: '340', unit: 'm/s' },
        ],
        asked: [{ label: 'Fundamental frequency' }],
      },
      primaryPatternId: 'waves/standing_waves',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'For an open pipe, the fundamental wavelength is:',
          choices: [
            { key: 'A', text: 'λ = 2L', isDistractor: false },
            { key: 'B', text: 'λ = 4L', isDistractor: true },
            { key: 'C', text: 'λ = L', isDistractor: true },
            { key: 'D', text: 'λ = L/2', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate the fundamental frequency (in Hz).',
          correctNumeric: 170,
          validation: { numericTolerance: 5, units: 'Hz' },
          explanations: {
            micro: 'f = v/λ = v/(2L) = 340/(2×1) = 170 Hz',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 170, units: 'Hz' },
        synthesis: [
          'Open pipe: λ₁ = 2L = 2 m',
          'f₁ = v/λ = 340/2 = 170 Hz',
        ],
      },
    },
  },

  // Waves - Doppler #2 (Hard)
  {
    questionId: 'waves-doppler-002',
    primaryPatternId: 'waves/doppler',
    difficulty: 4,
    topicTags: ['waves', 'sound', 'doppler'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'waves-doppler-002',
      metadata: {
        title: 'Doppler - Both Moving',
        difficulty: 4,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['waves', 'sound', 'doppler'],
        patternTags: ['doppler-effect', 'relative-motion'],
      },
      prompt: {
        text: 'A source (f = 1000 Hz) moves at 40 m/s toward an observer moving at 20 m/s toward the source. Find the observed frequency. (Speed of sound = 340 m/s)',
        given: [
          { label: 'Source frequency', value: '1000', unit: 'Hz' },
          { label: 'Source velocity', value: '40', unit: 'm/s (toward observer)' },
          { label: 'Observer velocity', value: '20', unit: 'm/s (toward source)' },
          { label: 'Speed of sound', value: '340', unit: 'm/s' },
        ],
        asked: [{ label: 'Observed frequency' }],
      },
      primaryPatternId: 'waves/doppler',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'When both source and observer move toward each other, the observed frequency:',
          choices: [
            { key: 'A', text: 'Increases more than single motion case', isDistractor: false },
            { key: 'B', text: 'Decreases', isDistractor: true },
            { key: 'C', text: 'Stays same', isDistractor: true },
            { key: 'D', text: 'Doubles', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate observed frequency (in Hz). Use f\' = f(v + v_o)/(v - v_s)',
          correctNumeric: 1200,
          validation: { numericTolerance: 10, units: 'Hz' },
          explanations: {
            micro: 'f\' = 1000(340 + 20)/(340 - 40) = 1000(360/300) = 1200 Hz',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 1200, units: 'Hz' },
        synthesis: [
          'General Doppler formula: f\' = f(v ± v_o)/(v ∓ v_s)',
          'Both approaching: f\' = f(v + v_o)/(v - v_s)',
          'f\' = 1000(360/300) = 1200 Hz',
        ],
      },
    },
  },

  // Modern Physics - Photoelectric #2 (Hard)
  {
    questionId: 'modern-photo-002',
    primaryPatternId: 'modern/photoelectric',
    difficulty: 4,
    topicTags: ['modern-physics', 'quantum', 'photoelectric'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'modern-photo-002',
      metadata: {
        title: 'Stopping Potential',
        difficulty: 4,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['modern-physics', 'quantum'],
        patternTags: ['photoelectric-effect', 'stopping-potential'],
      },
      prompt: {
        text: 'Light of wavelength 300 nm falls on a metal with work function 3.0 eV. Find the stopping potential. (hc = 1240 eV·nm)',
        given: [
          { label: 'Wavelength', value: '300', unit: 'nm' },
          { label: 'Work function', value: '3.0', unit: 'eV' },
          { label: 'hc', value: '1240', unit: 'eV·nm' },
        ],
        asked: [{ label: 'Stopping potential' }],
      },
      primaryPatternId: 'modern/photoelectric',
      steps: [
        {
          stepId: 'step-1',
          type: 'NUMERIC',
          prompt: 'Calculate photon energy (in eV). Use E = hc/λ',
          correctNumeric: 4.13,
          validation: { numericTolerance: 0.1, units: 'eV' },
          explanations: {
            micro: 'E = 1240/300 = 4.13 eV',
          },
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate stopping potential (in V). Use eV₀ = KE_max = hf - φ',
          correctNumeric: 1.13,
          validation: { numericTolerance: 0.1, units: 'V' },
          explanations: {
            micro: 'V₀ = (E - φ)/e = 4.13 - 3.0 = 1.13 V',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 1.13, units: 'V' },
        synthesis: [
          'Photon energy: E = 1240/300 = 4.13 eV',
          'KE_max = E - φ = 4.13 - 3.0 = 1.13 eV',
          'Stopping potential V₀ = 1.13 V',
        ],
      },
    },
  },

  // Modern Physics - Bohr Model #2 (Hard)
  {
    questionId: 'modern-bohr-002',
    primaryPatternId: 'modern/bohr_model',
    difficulty: 4,
    topicTags: ['modern-physics', 'atomic'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'modern-bohr-002',
      metadata: {
        title: 'Wavelength of Emitted Photon',
        difficulty: 4,
        estimatedTimeSec: 420,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['modern-physics', 'atomic'],
        patternTags: ['bohr-model', 'emission-spectrum'],
      },
      prompt: {
        text: 'A hydrogen atom transitions from n=3 to n=2. Find the wavelength of the emitted photon. (hc = 1240 eV·nm, E₁ = -13.6 eV)',
        given: [
          { label: 'Initial state', value: 'n = 3', unit: '' },
          { label: 'Final state', value: 'n = 2', unit: '' },
          { label: 'hc', value: '1240', unit: 'eV·nm' },
        ],
        asked: [{ label: 'Wavelength of emitted photon' }],
      },
      primaryPatternId: 'modern/bohr_model',
      steps: [
        {
          stepId: 'step-1',
          type: 'NUMERIC',
          prompt: 'Calculate energy of n=3 level (in eV).',
          correctNumeric: -1.51,
          validation: { numericTolerance: 0.05, units: 'eV' },
          explanations: {
            micro: 'E₃ = -13.6/9 = -1.51 eV',
          },
        },
        {
          stepId: 'step-2',
          type: 'NUMERIC',
          prompt: 'Calculate photon energy (in eV).',
          correctNumeric: 1.89,
          validation: { numericTolerance: 0.05, units: 'eV' },
          explanations: {
            micro: 'ΔE = E₃ - E₂ = -1.51 - (-3.4) = 1.89 eV',
          },
        },
        {
          stepId: 'step-3',
          type: 'NUMERIC',
          prompt: 'Calculate wavelength (in nm).',
          correctNumeric: 656,
          validation: { numericTolerance: 10, units: 'nm' },
          explanations: {
            micro: 'λ = hc/ΔE = 1240/1.89 = 656 nm (red, Hα line)',
          },
        },
      ],
      solutions: {
        finalAnswer: { type: 'NUMERIC', value: 656, units: 'nm' },
        synthesis: [
          'E₃ = -13.6/9 = -1.51 eV, E₂ = -13.6/4 = -3.4 eV',
          'ΔE = 1.89 eV',
          'λ = 1240/1.89 = 656 nm (Balmer series, Hα)',
        ],
      },
    },
  },

  // Modern Physics - Nuclear Decay #2 (Easy)
  {
    questionId: 'modern-nuclear-002',
    primaryPatternId: 'modern/nuclear_decay',
    difficulty: 2,
    topicTags: ['modern-physics', 'nuclear'],
    lifecycleState: QuestionLifecycleState.approved,
    provenance: QuestionProvenance.manual,
    payload: {
      schemaVersion: 'question.v2',
      questionId: 'modern-nuclear-002',
      metadata: {
        title: 'Alpha Decay',
        difficulty: 2,
        estimatedTimeSec: 240,
        source: { kind: 'original' },
        createdAt: new Date().toISOString(),
      },
      classification: {
        topicTags: ['modern-physics', 'nuclear'],
        patternTags: ['nuclear-decay', 'alpha-decay'],
      },
      prompt: {
        text: 'Uranium-238 undergoes alpha decay. What is the resulting nucleus?',
        given: [
          { label: 'Parent nucleus', value: '²³⁸U', unit: '(Z=92)' },
          { label: 'Alpha particle', value: '⁴He', unit: '(Z=2)' },
        ],
        asked: [{ label: 'Daughter nucleus' }],
      },
      primaryPatternId: 'modern/nuclear_decay',
      steps: [
        {
          stepId: 'step-1',
          type: 'MCQ_SINGLE',
          prompt: 'In alpha decay, the mass number decreases by:',
          choices: [
            { key: 'A', text: '4', isDistractor: false },
            { key: 'B', text: '2', isDistractor: true },
            { key: 'C', text: '1', isDistractor: true },
            { key: 'D', text: '0', isDistractor: true },
          ],
          correct: 'A',
        },
        {
          stepId: 'step-2',
          type: 'MCQ_SINGLE',
          prompt: 'The daughter nucleus is:',
          choices: [
            { key: 'A', text: '²³⁴Th (Thorium-234)', isDistractor: false },
            { key: 'B', text: '²³⁶U', isDistractor: true },
            { key: 'C', text: '²³⁴Pa', isDistractor: true },
            { key: 'D', text: '²³⁴U', isDistractor: true },
          ],
          correct: 'A',
        },
      ],
      solutions: {
        finalAnswer: { type: 'TEXT', value: '²³⁴Th (Thorium-234)' },
        synthesis: [
          '²³⁸U → ²³⁴Th + ⁴He',
          'Mass number: 238 - 4 = 234',
          'Atomic number: 92 - 2 = 90 (Thorium)',
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
