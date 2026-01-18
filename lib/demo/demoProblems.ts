/**
 * Demo Problems for Parent Call Demonstrations
 *
 * Each problem focuses on conceptual traps common in JEE/NEET physics.
 * The thinking gate questions ensure students pause to think before solving.
 */

export interface ThinkingGateQuestion {
  question: string
  options: string[]
  correctIndex: number
}

export interface DemoProblem {
  id: string
  exam: 'JEE' | 'NEET' | 'Boards'
  topic: string
  statement: string
  thinkingGate: ThinkingGateQuestion[]
  hints: string[]
  expectedAnswer: string
  tolerance?: number
  explanation: string
  commonMistakeExplained: string
}

export const DEMO_PROBLEMS: DemoProblem[] = [
  {
    id: 'demo-projectile-1',
    exam: 'JEE',
    topic: 'Kinematics - Projectile Motion',
    statement:
      'A ball is thrown horizontally from a cliff of height 80 m with an initial speed of 20 m/s. Find the time taken to reach the ground. Take g = 10 m/s².',
    thinkingGate: [
      {
        question: 'What determines the time of flight for a horizontally thrown projectile?',
        options: [
          'The initial horizontal velocity',
          'The vertical height and acceleration due to gravity',
          'The mass of the projectile',
          'Both horizontal velocity and height',
        ],
        correctIndex: 1,
      },
      {
        question: 'In this problem, what is the initial vertical velocity?',
        options: ['20 m/s', '0 m/s', '10 m/s', 'Cannot be determined'],
        correctIndex: 1,
      },
      {
        question: 'Which kinematic equation relates height, initial velocity, and time?',
        options: [
          'v = u + at',
          's = ut + ½at²',
          'v² = u² + 2as',
          's = (u + v)t / 2',
        ],
        correctIndex: 1,
      },
      {
        question: 'Does the horizontal velocity affect how quickly the ball falls?',
        options: [
          'Yes, faster horizontal speed means faster fall',
          'Yes, faster horizontal speed means slower fall',
          'No, horizontal and vertical motions are independent',
          'It depends on the air resistance',
        ],
        correctIndex: 2,
      },
    ],
    hints: [
      'The vertical motion is independent of horizontal motion.',
      'Use h = ½gt² since initial vertical velocity is zero.',
    ],
    expectedAnswer: '4',
    tolerance: 0.1,
    explanation:
      'For horizontal projectile motion, the time of flight depends only on the vertical motion. Using h = ½gt², we get 80 = ½ × 10 × t², solving gives t² = 16, so t = 4 seconds.',
    commonMistakeExplained:
      'A common mistake is using the horizontal velocity (20 m/s) in the calculation. Remember: horizontal and vertical motions are independent. The horizontal velocity only affects the range, not the time of flight.',
  },
  {
    id: 'demo-newton-2',
    exam: 'JEE',
    topic: 'Dynamics - Newton\'s Laws',
    statement:
      'Two blocks of masses 3 kg and 5 kg are connected by a light string passing over a frictionless pulley (Atwood machine). Find the acceleration of the system. Take g = 10 m/s².',
    thinkingGate: [
      {
        question: 'In an Atwood machine, what causes the acceleration?',
        options: [
          'The total mass of the system',
          'The difference in weights of the two masses',
          'The tension in the string',
          'The friction in the pulley',
        ],
        correctIndex: 1,
      },
      {
        question: 'When analyzing this system, how many free body diagrams should you draw?',
        options: [
          'One for the entire system',
          'Two - one for each mass',
          'Three - one for each mass and one for the pulley',
          'Only one for the heavier mass',
        ],
        correctIndex: 1,
      },
      {
        question: 'What is the constraint in this system?',
        options: [
          'Both masses move with the same speed but in opposite directions',
          'Both masses experience the same force',
          'The tension is equal to the weight of the lighter mass',
          'The heavier mass accelerates faster',
        ],
        correctIndex: 0,
      },
      {
        question: 'For the system, net force = ?',
        options: [
          '(m₁ + m₂) × g',
          '(m₁ - m₂) × g',
          'm₁ × g',
          'm₂ × g',
        ],
        correctIndex: 1,
      },
    ],
    hints: [
      'Draw FBDs for both masses. For heavier mass: m₂g - T = m₂a. For lighter mass: T - m₁g = m₁a.',
      'Add both equations to eliminate T: (m₂ - m₁)g = (m₁ + m₂)a',
    ],
    expectedAnswer: '2.5',
    tolerance: 0.1,
    explanation:
      'Using Newton\'s second law for both masses and adding the equations: a = (m₂ - m₁)g / (m₁ + m₂) = (5 - 3) × 10 / (3 + 5) = 20/8 = 2.5 m/s².',
    commonMistakeExplained:
      'Students often forget that the tension is NOT equal to either weight during acceleration. Some also divide by only one mass instead of the total mass. The correct denominator is (m₁ + m₂) because both masses accelerate together.',
  },
  {
    id: 'demo-energy-3',
    exam: 'NEET',
    topic: 'Work-Energy - Conservation of Energy',
    statement:
      'A 2 kg block slides down a frictionless incline of height 5 m starting from rest. Find its speed at the bottom. Take g = 10 m/s².',
    thinkingGate: [
      {
        question: 'What principle should we use when friction is absent?',
        options: [
          'Newton\'s second law only',
          'Conservation of mechanical energy',
          'Conservation of momentum',
          'Work-energy theorem with friction',
        ],
        correctIndex: 1,
      },
      {
        question: 'At the top of the incline, what forms of energy does the block have?',
        options: [
          'Only kinetic energy',
          'Only potential energy',
          'Both kinetic and potential energy',
          'No mechanical energy',
        ],
        correctIndex: 1,
      },
      {
        question: 'At the bottom of the incline, the potential energy converts to:',
        options: [
          'Heat energy',
          'Kinetic energy',
          'Sound energy',
          'Chemical energy',
        ],
        correctIndex: 1,
      },
      {
        question: 'Does the mass of the block affect the final speed?',
        options: [
          'Yes, heavier blocks are faster',
          'Yes, lighter blocks are faster',
          'No, the mass cancels out',
          'It depends on the angle of incline',
        ],
        correctIndex: 2,
      },
    ],
    hints: [
      'Use mgh = ½mv². Notice the mass cancels.',
      'Solve for v: v = √(2gh)',
    ],
    expectedAnswer: '10',
    tolerance: 0.1,
    explanation:
      'By conservation of energy: mgh = ½mv². The mass cancels, giving v = √(2gh) = √(2 × 10 × 5) = √100 = 10 m/s.',
    commonMistakeExplained:
      'Students often think heavier objects will be faster, but mass cancels out! Another mistake is forgetting to take the square root at the end, giving 100 instead of 10.',
  },
]

/**
 * Get a demo problem by ID
 */
export function getDemoProblemById(id: string): DemoProblem | undefined {
  return DEMO_PROBLEMS.find((p) => p.id === id)
}

/**
 * Get all demo problems for a specific exam
 */
export function getDemoProblemsByExam(exam: DemoProblem['exam']): DemoProblem[] {
  return DEMO_PROBLEMS.filter((p) => p.exam === exam)
}

/**
 * Validate user's answer against expected answer with tolerance
 */
export function validateAnswer(
  userAnswer: string,
  expectedAnswer: string,
  tolerance: number = 0.01
): boolean {
  const userNum = parseFloat(userAnswer.trim())
  const expectedNum = parseFloat(expectedAnswer)

  if (isNaN(userNum) || isNaN(expectedNum)) {
    // Fallback to string comparison for non-numeric answers
    return userAnswer.trim().toLowerCase() === expectedAnswer.trim().toLowerCase()
  }

  return Math.abs(userNum - expectedNum) <= tolerance * Math.abs(expectedNum)
}
