/**
 * Boundary-Case Builder Service
 *
 * Detects and generates boundary/limiting cases for physics equations
 * to help students "stress test" their formulas using physical intuition.
 */

import type {
  BoundaryCase,
  BoundaryCaseDetection,
  LimitCaseType,
  StudentPrediction,
  PredictionValidation,
} from '@/types/boundaryCase'
import type { ScaffoldData } from '@/types/scaffold'
import type { MicroTaskScaffoldData } from '@/types/microTask'

type ScaffoldDataUnion = ScaffoldData | MicroTaskScaffoldData

/**
 * Patterns for detecting equation types and their boundary cases
 */
const EQUATION_PATTERNS: {
  pattern: RegExp
  equationType: string
  cases: Omit<BoundaryCase, 'id' | 'equation'>[]
}[] = [
  {
    // Projectile range: R = u²sin(2θ)/g or v²sin(2θ)/g
    pattern: /[Rr]ange|sin\s*\(\s*2\s*[θ\u03B8]\s*\)|u[²2]\s*sin/i,
    equationType: 'projectile_range',
    cases: [
      {
        type: 'angle_limiting',
        variable: 'θ',
        variableDisplay: 'launch angle θ',
        direction: 'approaches_min',
        limitValue: '0°',
        promptQuestion: 'If you launch a projectile horizontally (θ = 0°), what do you intuitively expect the horizontal range to be?',
        expectedPhysicalOutcome: 'Zero range - the projectile goes straight into the ground immediately',
        expectedMathOutcome: 'sin(2×0°) = sin(0°) = 0, so R = 0',
        physicalReasoning: 'With no vertical component, the projectile has no time in the air to travel horizontally.',
        commonMistakes: [
          'Thinking it would travel infinitely far',
          'Confusing with maximum range at 45°',
        ],
      },
      {
        type: 'angle_limiting',
        variable: 'θ',
        variableDisplay: 'launch angle θ',
        direction: 'approaches_max',
        limitValue: '90°',
        promptQuestion: 'If you launch a projectile straight up (θ = 90°), what horizontal range do you expect?',
        expectedPhysicalOutcome: 'Zero range - the projectile goes straight up and comes straight back down',
        expectedMathOutcome: 'sin(2×90°) = sin(180°) = 0, so R = 0',
        physicalReasoning: 'All the velocity is vertical; there\'s no horizontal motion at all.',
        commonMistakes: [
          'Thinking maximum angle gives maximum range',
          'Forgetting there\'s no horizontal velocity component',
        ],
      },
      {
        type: 'velocity_limiting',
        variable: 'u',
        variableDisplay: 'initial velocity u',
        direction: 'approaches_zero',
        limitValue: '0',
        promptQuestion: 'If the initial velocity approaches zero, what happens to the range?',
        expectedPhysicalOutcome: 'Zero range - with no initial push, the projectile just drops',
        expectedMathOutcome: 'R = 0²×sin(2θ)/g = 0',
        physicalReasoning: 'No initial velocity means the object simply falls from the launch point.',
        commonMistakes: [
          'Thinking the projectile would still travel some distance',
        ],
      },
      {
        type: 'gravity_limiting',
        variable: 'g',
        variableDisplay: 'gravitational acceleration g',
        direction: 'approaches_zero',
        limitValue: '0',
        promptQuestion: 'Imagine you\'re on the Moon where gravity is much weaker. What happens to the range as g decreases?',
        expectedPhysicalOutcome: 'Range increases dramatically - weaker gravity means longer hang time',
        expectedMathOutcome: 'R = u²sin(2θ)/g → ∞ as g → 0',
        physicalReasoning: 'Less gravitational pull means the projectile stays in the air longer, traveling further horizontally.',
        commonMistakes: [
          'Thinking gravity doesn\'t affect horizontal motion',
          'Confusing range with height',
        ],
      },
    ],
  },
  {
    // Incline plane: a = g·sin(θ) - μ·g·cos(θ) or similar
    pattern: /incline|ramp|slope|g\s*sin\s*[θ\u03B8]|mg\s*sin/i,
    equationType: 'incline_plane',
    cases: [
      {
        type: 'angle_limiting',
        variable: 'θ',
        variableDisplay: 'incline angle θ',
        direction: 'approaches_min',
        limitValue: '0°',
        promptQuestion: 'If the incline is nearly flat (θ → 0°), what happens to the acceleration down the slope?',
        expectedPhysicalOutcome: 'Zero acceleration - on a flat surface, there\'s no tendency to slide',
        expectedMathOutcome: 'a = g·sin(0°) = 0',
        physicalReasoning: 'A flat surface has no component of gravity along it.',
        commonMistakes: [
          'Forgetting that friction also goes to zero on a flat surface',
        ],
      },
      {
        type: 'angle_limiting',
        variable: 'θ',
        variableDisplay: 'incline angle θ',
        direction: 'approaches_max',
        limitValue: '90°',
        promptQuestion: 'If the incline is vertical (θ = 90°), what\'s the acceleration?',
        expectedPhysicalOutcome: 'Free fall - acceleration equals g',
        expectedMathOutcome: 'a = g·sin(90°) = g',
        physicalReasoning: 'A vertical "incline" is just dropping the object.',
        commonMistakes: [
          'Thinking friction would slow it down (friction needs a normal force)',
        ],
      },
      {
        type: 'friction_limiting',
        variable: 'μ',
        variableDisplay: 'friction coefficient μ',
        direction: 'approaches_zero',
        limitValue: '0',
        promptQuestion: 'If the surface is perfectly frictionless (μ = 0), what determines the motion?',
        expectedPhysicalOutcome: 'Only gravity acts - object slides down freely',
        expectedMathOutcome: 'a = g·sin(θ) (friction term vanishes)',
        physicalReasoning: 'Without friction, there\'s nothing to resist the gravitational pull along the incline.',
        commonMistakes: [
          'Thinking object would stay in place without friction',
        ],
      },
    ],
  },
  {
    // Simple harmonic motion: T = 2π√(m/k) or similar
    pattern: /period|T\s*=\s*2\s*π|√\s*\(\s*m\s*\/\s*k\s*\)|harmonic|oscillat/i,
    equationType: 'simple_harmonic_motion',
    cases: [
      {
        type: 'mass_limiting',
        variable: 'm',
        variableDisplay: 'mass m',
        direction: 'approaches_zero',
        limitValue: '0',
        promptQuestion: 'If the oscillating mass becomes very light (m → 0), what happens to the period?',
        expectedPhysicalOutcome: 'Period approaches zero - lighter objects oscillate faster',
        expectedMathOutcome: 'T = 2π√(0/k) = 0',
        physicalReasoning: 'Less mass means less inertia, so the spring can move it back and forth more quickly.',
        commonMistakes: [
          'Thinking period is independent of mass',
        ],
      },
      {
        type: 'spring_limiting',
        variable: 'k',
        variableDisplay: 'spring constant k',
        direction: 'approaches_infinity',
        limitValue: '∞',
        promptQuestion: 'If the spring becomes infinitely stiff (k → ∞), what happens to the period?',
        expectedPhysicalOutcome: 'Period approaches zero - stiffer springs oscillate faster',
        expectedMathOutcome: 'T = 2π√(m/∞) = 0',
        physicalReasoning: 'A stiffer spring exerts more force, accelerating the mass faster through each cycle.',
        commonMistakes: [
          'Thinking stiffer springs would slow down the motion',
        ],
      },
    ],
  },
  {
    // Pendulum: T = 2π√(L/g)
    pattern: /pendulum|T\s*=\s*2\s*π.*√.*[Ll]\s*\/\s*g/i,
    equationType: 'simple_pendulum',
    cases: [
      {
        type: 'distance_limiting',
        variable: 'L',
        variableDisplay: 'pendulum length L',
        direction: 'approaches_zero',
        limitValue: '0',
        promptQuestion: 'If the pendulum length becomes very short (L → 0), what happens to the period?',
        expectedPhysicalOutcome: 'Period approaches zero - shorter pendulums swing faster',
        expectedMathOutcome: 'T = 2π√(0/g) = 0',
        physicalReasoning: 'A shorter pendulum has less distance to travel in each swing.',
        commonMistakes: [
          'Thinking length doesn\'t affect the period',
        ],
      },
      {
        type: 'gravity_limiting',
        variable: 'g',
        variableDisplay: 'gravitational acceleration g',
        direction: 'approaches_zero',
        limitValue: '0',
        promptQuestion: 'In zero gravity (g → 0), what would happen to a pendulum?',
        expectedPhysicalOutcome: 'It would never swing back - period becomes infinite',
        expectedMathOutcome: 'T = 2π√(L/0) → ∞',
        physicalReasoning: 'Without gravity, there\'s no restoring force to pull the pendulum back.',
        commonMistakes: [
          'Thinking it would oscillate faster without gravity',
        ],
      },
    ],
  },
  {
    // Kinetic energy: KE = ½mv²
    pattern: /kinetic\s*energy|KE\s*=|½\s*m\s*v[²2]/i,
    equationType: 'kinetic_energy',
    cases: [
      {
        type: 'velocity_limiting',
        variable: 'v',
        variableDisplay: 'velocity v',
        direction: 'approaches_zero',
        limitValue: '0',
        promptQuestion: 'If an object is at rest (v = 0), what is its kinetic energy?',
        expectedPhysicalOutcome: 'Zero - no motion means no kinetic energy',
        expectedMathOutcome: 'KE = ½m(0)² = 0',
        physicalReasoning: 'Kinetic energy is the energy of motion. No motion, no kinetic energy.',
        commonMistakes: [
          'Confusing with potential energy',
        ],
      },
      {
        type: 'mass_limiting',
        variable: 'm',
        variableDisplay: 'mass m',
        direction: 'approaches_zero',
        limitValue: '0',
        promptQuestion: 'If an object has negligible mass (m → 0) but moves at velocity v, what\'s its kinetic energy?',
        expectedPhysicalOutcome: 'Zero - no mass means no kinetic energy regardless of speed',
        expectedMathOutcome: 'KE = ½(0)v² = 0',
        physicalReasoning: 'Kinetic energy requires mass. A massless object (like light in classical mechanics) has no kinetic energy.',
        commonMistakes: [
          'Thinking high velocity alone gives energy',
        ],
      },
    ],
  },
]

/**
 * Generate a unique ID for a boundary case
 */
function generateCaseId(equationType: string, variable: string, direction: string): string {
  return `${equationType}_${variable}_${direction}`.toLowerCase().replace(/\s+/g, '_')
}

class BoundaryCaseService {
  /**
   * Detect available boundary cases from scaffold data
   */
  detectBoundaryCases(scaffoldData: ScaffoldDataUnion): BoundaryCaseDetection {
    const problemText = scaffoldData.problem.toLowerCase()
    const domain = scaffoldData.domain.toLowerCase()
    const subdomain = scaffoldData.subdomain.toLowerCase()

    // Combine all text for pattern matching
    const searchText = `${problemText} ${domain} ${subdomain}`

    // Find matching equation patterns
    for (const pattern of EQUATION_PATTERNS) {
      if (pattern.pattern.test(searchText)) {
        const cases: BoundaryCase[] = pattern.cases.map((c) => ({
          ...c,
          id: generateCaseId(pattern.equationType, c.variable, c.direction),
          equation: this.extractEquationFromProblem(problemText, pattern.equationType),
        }))

        return {
          hasBoundaryCases: true,
          detectedEquation: pattern.equationType,
          cases,
        }
      }
    }

    return {
      hasBoundaryCases: false,
      cases: [],
    }
  }

  /**
   * Extract or infer the equation from problem text
   */
  private extractEquationFromProblem(problemText: string, equationType: string): string {
    // Return common equation forms based on type
    const equations: Record<string, string> = {
      projectile_range: 'R = u²sin(2θ)/g',
      incline_plane: 'a = g·sin(θ) - μg·cos(θ)',
      simple_harmonic_motion: 'T = 2π√(m/k)',
      simple_pendulum: 'T = 2π√(L/g)',
      kinetic_energy: 'KE = ½mv²',
    }
    return equations[equationType] || 'Unknown equation'
  }

  /**
   * Validate a student's physical prediction
   */
  validatePrediction(
    boundaryCase: BoundaryCase,
    prediction: StudentPrediction
  ): PredictionValidation {
    const predictionLower = prediction.physicalPrediction.toLowerCase()
    const expectedLower = boundaryCase.expectedPhysicalOutcome.toLowerCase()

    // Check for key concepts in the prediction
    const keyTerms = this.extractKeyTerms(expectedLower)
    const matchedTerms = keyTerms.filter((term) => predictionLower.includes(term))
    const matchRatio = matchedTerms.length / keyTerms.length

    // Check for common mistakes
    const hasMisconception = boundaryCase.commonMistakes.some((mistake) =>
      predictionLower.includes(mistake.toLowerCase().split(' ').slice(0, 3).join(' '))
    )

    if (matchRatio >= 0.5 && !hasMisconception) {
      return {
        isCorrect: true,
        feedbackType: 'correct',
        feedback: `Excellent physical intuition! ${boundaryCase.physicalReasoning}`,
        mathVerification: `Let's verify with math: ${boundaryCase.expectedMathOutcome}`,
      }
    } else if (matchRatio >= 0.25) {
      return {
        isCorrect: false,
        feedbackType: 'partial',
        feedback: `You're on the right track! Think about it this way: ${boundaryCase.physicalReasoning}`,
        mathVerification: `The math confirms: ${boundaryCase.expectedMathOutcome}`,
      }
    } else {
      const misconceptionHint = hasMisconception
        ? ' This is a common misconception.'
        : ''
      return {
        isCorrect: false,
        feedbackType: 'misconception',
        feedback: `Not quite.${misconceptionHint} ${boundaryCase.physicalReasoning}`,
        mathVerification: `The equation shows: ${boundaryCase.expectedMathOutcome}`,
      }
    }
  }

  /**
   * Extract key terms from expected outcome for matching
   */
  private extractKeyTerms(text: string): string[] {
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'to', 'of', 'and', 'or', 'in', 'on', 'at', 'for', 'with', 'as', 'by'])
    return text
      .split(/\s+/)
      .filter((word) => word.length > 2 && !stopWords.has(word))
      .map((word) => word.replace(/[^a-z]/g, ''))
      .filter((word) => word.length > 2)
  }

  /**
   * Get a hint for the student without giving away the answer
   */
  getHint(boundaryCase: BoundaryCase): string {
    const hints: Record<LimitCaseType, string> = {
      angle_limiting: 'Think about what direction the motion would be in at this extreme angle.',
      mass_limiting: 'Consider how mass affects inertia and the ability to accelerate.',
      velocity_limiting: 'Remember that motion requires initial velocity - what happens without it?',
      friction_limiting: 'Friction opposes motion. What if there was no opposition?',
      time_limiting: 'Consider the very first instant or a very long time later.',
      distance_limiting: 'Think about what happens as distances become very small or very large.',
      spring_limiting: 'A stiffer spring pushes harder. How does that affect the motion?',
      gravity_limiting: 'Gravity is what pulls things down. What if that pull changed?',
    }
    return hints[boundaryCase.type] || 'Think about the physical situation at this extreme.'
  }
}

export const boundaryCaseService = new BoundaryCaseService()
