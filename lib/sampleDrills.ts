/**
 * Sample Drills for Micro-Pattern Drills Feature
 *
 * Contains sample drills for 2 patterns:
 * - incline-plane: Inclined plane problems (forces, acceleration)
 * - rotation-frame: Rotating reference frame problems (centripetal, Coriolis)
 */

import type { Drill } from '@/types/drill'

/**
 * Incline Plane Pattern Drill
 * Focuses on decomposing forces and finding acceleration on inclines
 */
const inclinePlaneDrill: Drill = {
  id: 'drill-incline-001',
  patternId: 'incline-plane',
  title: 'Inclined Plane Mastery',
  description: 'Master force decomposition and acceleration on inclined planes',
  difficulty: 'medium',
  tags: ['forces', 'incline', 'decomposition', 'acceleration'],
  items: [
    {
      id: 'inc-001',
      promptText: 'A block on a frictionless 30° incline. Which component of weight acts along the incline?',
      type: 'mcq',
      choices: ['mg sin θ', 'mg cos θ', 'mg tan θ', 'mg'],
      correctAnswer: 'mg sin θ',
      explanationOneLiner: 'The component parallel to the incline is mg sin θ, causing acceleration down the slope.',
      timeLimitSeconds: 20,
      difficulty: 'easy',
    },
    {
      id: 'inc-002',
      promptText: 'What is the normal force on a 5 kg block on a 30° frictionless incline? (g = 10 m/s²)',
      type: 'mcq',
      choices: ['25 N', '43.3 N', '50 N', '25√3 N'],
      correctAnswer: '43.3 N',
      explanationOneLiner: 'N = mg cos θ = 5 × 10 × cos(30°) = 50 × 0.866 ≈ 43.3 N',
      timeLimitSeconds: 20,
      difficulty: 'medium',
    },
    {
      id: 'inc-003',
      promptText: 'Acceleration of a block on a frictionless 30° incline? (g = 10 m/s²)',
      type: 'short',
      correctAnswer: '5',
      explanationOneLiner: 'a = g sin θ = 10 × sin(30°) = 10 × 0.5 = 5 m/s²',
      timeLimitSeconds: 20,
      difficulty: 'easy',
    },
    {
      id: 'inc-004',
      promptText: 'A 2 kg block on a 45° incline with μk = 0.2. What is the friction force? (g = 10 m/s²)',
      type: 'mcq',
      choices: ['2.83 N', '4 N', '14.14 N', '2 N'],
      correctAnswer: '2.83 N',
      explanationOneLiner: 'f = μN = μ mg cos θ = 0.2 × 2 × 10 × cos(45°) ≈ 2.83 N',
      timeLimitSeconds: 20,
      difficulty: 'medium',
    },
    {
      id: 'inc-005',
      promptText: 'For a block sliding down an incline with friction, net force equals:',
      type: 'mcq',
      choices: ['mg sin θ - μ mg cos θ', 'mg sin θ + μ mg cos θ', 'mg cos θ - μ mg sin θ', 'mg - μN'],
      correctAnswer: 'mg sin θ - μ mg cos θ',
      explanationOneLiner: 'Net force = weight component down - friction up = mg sin θ - μN = mg sin θ - μ mg cos θ',
      timeLimitSeconds: 20,
      difficulty: 'medium',
    },
    {
      id: 'inc-006',
      promptText: 'At what angle does a block start sliding if μs = 0.5?',
      type: 'short',
      correctAnswer: '26.57',
      explanationOneLiner: 'Block slides when tan θ > μs, so θ = arctan(0.5) ≈ 26.57°',
      timeLimitSeconds: 20,
      difficulty: 'hard',
    },
    {
      id: 'inc-007',
      promptText: 'A 3 kg block is pushed up a 30° incline at constant velocity. If μk = 0.3, find the applied force parallel to incline. (g = 10 m/s²)',
      type: 'mcq',
      choices: ['22.8 N', '15 N', '7.8 N', '30 N'],
      correctAnswer: '22.8 N',
      explanationOneLiner: 'At constant v: F = mg sin θ + μ mg cos θ = 3×10×0.5 + 0.3×3×10×0.866 ≈ 22.8 N',
      timeLimitSeconds: 20,
      difficulty: 'hard',
    },
    {
      id: 'inc-008',
      promptText: 'Two blocks (2 kg and 3 kg) connected by a string on a frictionless 30° incline. What is their common acceleration? (g = 10 m/s²)',
      type: 'short',
      correctAnswer: '5',
      explanationOneLiner: 'Both accelerate at a = g sin θ = 10 × 0.5 = 5 m/s² (tension is internal)',
      timeLimitSeconds: 20,
      difficulty: 'medium',
    },
    {
      id: 'inc-009',
      promptText: 'Which force does NO work on a block sliding down a frictionless incline?',
      type: 'mcq',
      choices: ['Normal force', 'Weight', 'mg sin θ component', 'All forces do work'],
      correctAnswer: 'Normal force',
      explanationOneLiner: 'Normal force is perpendicular to motion, so W = F·d·cos(90°) = 0',
      timeLimitSeconds: 20,
      difficulty: 'easy',
    },
    {
      id: 'inc-010',
      promptText: 'A block slides down from height h on a frictionless incline. Speed at bottom?',
      type: 'mcq',
      choices: ['√(2gh)', '√(gh)', '2gh', 'gh'],
      correctAnswer: '√(2gh)',
      explanationOneLiner: 'Energy conservation: mgh = ½mv², so v = √(2gh), independent of angle!',
      timeLimitSeconds: 20,
      difficulty: 'easy',
    },
  ],
}

/**
 * Rotating Reference Frame Pattern Drill
 * Focuses on centripetal force, centrifugal effects, and circular motion
 */
const rotatingFrameDrill: Drill = {
  id: 'drill-rotation-001',
  patternId: 'rotation-frame',
  title: 'Rotating Frames & Circular Motion',
  description: 'Master centripetal acceleration, pseudo-forces, and rotating reference frames',
  difficulty: 'hard',
  tags: ['rotation', 'centripetal', 'circular', 'reference-frames'],
  items: [
    {
      id: 'rot-001',
      promptText: 'Centripetal acceleration for an object moving in a circle of radius r at speed v is:',
      type: 'mcq',
      choices: ['v²/r', 'vr', 'v/r', 'r/v²'],
      correctAnswer: 'v²/r',
      explanationOneLiner: 'Centripetal acceleration ac = v²/r, always pointing toward the center.',
      timeLimitSeconds: 20,
      difficulty: 'easy',
    },
    {
      id: 'rot-002',
      promptText: 'A 2 kg ball on a 1 m string moves in a horizontal circle at 4 m/s. What is the tension?',
      type: 'short',
      correctAnswer: '32',
      explanationOneLiner: 'T = mac = mv²/r = 2 × 16/1 = 32 N',
      timeLimitSeconds: 20,
      difficulty: 'medium',
    },
    {
      id: 'rot-003',
      promptText: 'In a rotating reference frame, which pseudo-force acts radially outward?',
      type: 'mcq',
      choices: ['Centrifugal force', 'Coriolis force', 'Centripetal force', 'Euler force'],
      correctAnswer: 'Centrifugal force',
      explanationOneLiner: 'Centrifugal force = mω²r, acts radially outward in the rotating frame.',
      timeLimitSeconds: 20,
      difficulty: 'easy',
    },
    {
      id: 'rot-004',
      promptText: 'A car on a banked curve at angle θ, no friction, radius r. Speed for no sliding?',
      type: 'mcq',
      choices: ['√(gr tan θ)', '√(gr/tan θ)', 'gr tan θ', '√(gr sin θ)'],
      correctAnswer: '√(gr tan θ)',
      explanationOneLiner: 'N sin θ = mv²/r and N cos θ = mg → tan θ = v²/gr → v = √(gr tan θ)',
      timeLimitSeconds: 20,
      difficulty: 'hard',
    },
    {
      id: 'rot-005',
      promptText: 'Period of a conical pendulum with length L at angle θ from vertical?',
      type: 'mcq',
      choices: ['2π√(L cos θ/g)', '2π√(L/g)', '2π√(L sin θ/g)', '2π√(g/L)'],
      correctAnswer: '2π√(L cos θ/g)',
      explanationOneLiner: 'The effective length is L cos θ, so T = 2π√(L cos θ/g)',
      timeLimitSeconds: 20,
      difficulty: 'hard',
    },
    {
      id: 'rot-006',
      promptText: 'At the top of a vertical loop, minimum speed to maintain contact with track?',
      type: 'mcq',
      choices: ['√(gr)', '√(2gr)', '2gr', 'gr'],
      correctAnswer: '√(gr)',
      explanationOneLiner: 'At minimum speed, N = 0, so mg = mv²/r → v = √(gr)',
      timeLimitSeconds: 20,
      difficulty: 'medium',
    },
    {
      id: 'rot-007',
      promptText: 'Angular velocity ω = 2 rad/s, radius r = 0.5 m. Linear speed v = ?',
      type: 'short',
      correctAnswer: '1',
      explanationOneLiner: 'v = ωr = 2 × 0.5 = 1 m/s',
      timeLimitSeconds: 20,
      difficulty: 'easy',
    },
    {
      id: 'rot-008',
      promptText: 'Coriolis force on a mass m moving with velocity v in a frame rotating at ω is:',
      type: 'mcq',
      choices: ['2mω×v', 'mω×v', 'mω²r', '2mωv'],
      correctAnswer: '2mω×v',
      explanationOneLiner: 'Coriolis force = -2m(ω×v), magnitude 2mωv sin θ where θ is angle between ω and v.',
      timeLimitSeconds: 20,
      difficulty: 'hard',
    },
    {
      id: 'rot-009',
      promptText: 'A satellite orbits Earth at radius r. If r doubles, orbital period changes by factor:',
      type: 'mcq',
      choices: ['2√2', '2', '4', '√2'],
      correctAnswer: '2√2',
      explanationOneLiner: "By Kepler's 3rd law: T² ∝ r³, so T ∝ r^(3/2). If r→2r, T→2^(3/2)T = 2√2 T",
      timeLimitSeconds: 20,
      difficulty: 'hard',
    },
    {
      id: 'rot-010',
      promptText: 'Weight of a 60 kg person at equator vs poles differs by approximately:',
      type: 'mcq',
      choices: ['2 N', '0.2 N', '20 N', '0 N'],
      correctAnswer: '2 N',
      explanationOneLiner: "At equator: apparent weight = mg - mω²R ≈ 600 - 2 = 598 N (Earth's rotation effect)",
      timeLimitSeconds: 20,
      difficulty: 'hard',
    },
  ],
}

/**
 * All sample drills
 */
export const SAMPLE_DRILLS: Drill[] = [inclinePlaneDrill, rotatingFrameDrill]

/**
 * Get drill by pattern ID
 */
export function getDrillByPatternId(patternId: string): Drill | undefined {
  return SAMPLE_DRILLS.find((d) => d.patternId === patternId)
}

/**
 * Get all available pattern IDs with drills
 */
export function getAvailableDrillPatternIds(): string[] {
  return SAMPLE_DRILLS.map((d) => d.patternId)
}
