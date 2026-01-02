'use client'

import { useMemo, useState } from 'react'
import SolutionScaffold from '@/components/SolutionScaffold'
import type { ScaffoldData } from '@/types/scaffold'
import type { MultipleChoiceTask } from '@/types/microTask'
import { FEATURE_FLAGS } from '@/lib/featureFlags'

const IS_DEV = process.env.NODE_ENV === 'development'

export default function TimePressureDevPage() {
  const [isRunning, setIsRunning] = useState(false)

  const mockData: ScaffoldData = useMemo(() => ({
    problem: 'A 2 kg block slides down a frictionless incline of angle 30°. Find its speed after moving 3 m along the incline.',
    domain: 'Mechanics',
    subdomain: 'Energy',
    concepts: [
      { id: 'c1', name: 'Work-Energy Theorem', definition: 'Net work equals change in kinetic energy.' },
      { id: 'c2', name: 'Gravitational Potential Energy', definition: 'U = mgh.' },
    ],
    steps: [
      {
        id: 0,
        title: 'Identify the driving energy change',
        stepType: 'physics_concept',
        requiredConcepts: ['c2'],
        hints: [
          { level: 1, title: 'Concept Identification', content: 'Use gravity → potential energy decreases.' },
          { level: 2, title: 'Visualization', content: 'Height drop is related to incline distance: h = s sinθ.' },
          { level: 3, title: 'Strategy Selection', content: 'Conservation of energy: ΔK = -ΔU.' },
          { level: 4, title: 'Structural Equation', content: '½mv² = mg(s sinθ).' },
          { level: 5, title: 'Full Solution', content: 'v = √(2gsinθ·s).' },
        ],
        // Decision Gate Tasks - must answer correctly before completing step
        decisionGateTasks: [
          {
            type: 'MULTIPLE_CHOICE',
            level: 1,
            levelTitle: 'Concept',
            question: 'Which type of energy is being converted in this problem?',
            options: [
              'Gravitational potential energy to kinetic energy',
              'Kinetic energy to thermal energy',
              'Chemical energy to kinetic energy',
              'Elastic potential energy to kinetic energy',
            ],
            correctIndex: 0,
            explanation: 'As the block slides down, gravitational potential energy (mgh) converts to kinetic energy (½mv²).',
            feedbackPerOption: [
              'Correct! The block loses height and gains speed.',
              'No friction means no thermal energy loss.',
              'There is no chemical reaction here.',
              'There are no springs or elastic elements.',
            ],
          } as MultipleChoiceTask,
        ],
      },
      {
        id: 1,
        title: 'Compute the speed',
        stepType: 'math_manipulation',
        requiredConcepts: ['c1', 'c2'],
        hints: [
          { level: 1, title: 'Concept Identification', content: 'Plug numbers into v = √(2gsinθ·s).' },
          { level: 2, title: 'Visualization', content: 'sin30° = 0.5, so v = √(g·s).' },
          { level: 3, title: 'Strategy Selection', content: 'Use g ≈ 9.8 m/s².' },
          { level: 4, title: 'Structural Equation', content: 'v = √(9.8×3) ≈ √29.4.' },
          { level: 5, title: 'Full Solution', content: 'v ≈ 5.4 m/s.' },
        ],
        // Decision Gate Tasks for step 2
        decisionGateTasks: [
          {
            type: 'MULTIPLE_CHOICE',
            level: 1,
            levelTitle: 'Concept',
            question: 'What is sin(30°)?',
            options: ['0.5', '0.866', '1.0', '0.707'],
            correctIndex: 0,
            explanation: 'sin(30°) = 0.5 is a key trigonometric value to memorize.',
            feedbackPerOption: [
              'Correct!',
              'That\'s sin(60°).',
              'That\'s sin(90°).',
              'That\'s sin(45°).',
            ],
          } as MultipleChoiceTask,
        ],
      },
    ],
    sanityCheck: {
      question: 'If the incline angle were 0°, what should happen?',
      expectedBehavior: 'No height drop → no speed gain.',
      type: 'limit',
    },
    patterns: [
      { id: 'energy', label: 'Conservation of Energy', description: 'Height/speed/work tradeoffs', triggers: ['height', 'speed', 'work'] },
      { id: 'kinematics', label: 'Kinematics', description: 'Constant-acceleration motion', triggers: ['a', 'v', 's'] },
      { id: 'forces', label: "Newton's Laws", description: 'Force balance and FBD', triggers: ['forces', 'normal'] },
      { id: 'momentum', label: 'Conservation of Momentum', description: 'Collisions/explosions', triggers: ['collision'] },
    ],
    primaryPatternId: 'energy',
    timePressure: {
      enablePatternFirst: true,
      lockSeconds: 12,
      enableSkipCommit: true,
      gateSeconds: 25,
    },
  }), [])

  if (!IS_DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            Development Only
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            This page is only available in development mode.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">
            Time Pressure Dev Playground
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Pattern-First + Skip/Commit + Decision Gates. Flags: P0_DECISION_GATES={String(FEATURE_FLAGS.P0_DECISION_GATES)}, P0_REBUILD_GATES={String(FEATURE_FLAGS.P0_REBUILD_GATES)}.
          </p>
        </div>

        {!isRunning ? (
          <button
            onClick={() => setIsRunning(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
          >
            Start mock problem
          </button>
        ) : (
          <SolutionScaffold
            data={mockData}
            onReset={() => setIsRunning(false)}
          />
        )}
      </div>
    </div>
  )
}

