/**
 * Pivot Injection Policy
 *
 * Deterministic algorithm for deciding when to inject pivot questions.
 * Triggers based on time spent, attempt count, and hint usage.
 */

import type {
  PivotQuestion,
  PivotCategory,
  PivotTrigger,
  PivotDecision,
  PivotDecisionReason,
  PivotSessionState,
  StepPivotState,
} from '@/types/pivot'
import { PIVOT_POLICY_CONSTANTS, getStepPivotState, getTotalPivotsShown } from '../entities/pivot'

/**
 * Pivot trigger thresholds
 */
export const PIVOT_THRESHOLDS = {
  // Time-based thresholds (seconds)
  EASY_STEP_TIME: 90, // 1.5 minutes
  MEDIUM_STEP_TIME: 120, // 2 minutes
  HARD_STEP_TIME: 180, // 3 minutes

  // Attempt-based thresholds
  WRONG_ATTEMPTS_EASY: 2,
  WRONG_ATTEMPTS_MEDIUM: 3,
  WRONG_ATTEMPTS_HARD: 4,

  // Hint escalation
  HINT_LEVEL_TRIGGER: 2, // Trigger if hint level >= 2

  // Cooldown between pivots (seconds)
  COOLDOWN_SECONDS: 120,
} as const

/**
 * Default pivot questions organized by category
 */
export const DEFAULT_PIVOT_QUESTIONS: PivotQuestion[] = [
  // Simplify category
  {
    id: 'pivot-simplify-1',
    questionText: 'What if the problem had only one object instead of two? How would you approach it then?',
    type: 'reflection',
    explanation: 'Simplifying the problem can help you see the underlying physics more clearly.',
    category: 'simplify',
    triggerPatterns: ['multi-body', 'system', 'interaction'],
  },
  {
    id: 'pivot-simplify-2',
    questionText: 'Can you ignore friction for now and solve the simpler case first?',
    type: 'reflection',
    explanation: 'Starting without friction lets you focus on the fundamental forces.',
    category: 'simplify',
    triggerPatterns: ['friction', 'surface', 'sliding'],
  },

  // Constraint category
  {
    id: 'pivot-constraint-1',
    questionText: 'What constraints does the problem give you? Which quantities are related?',
    type: 'short',
    explanation: 'Constraints connect different variables and reduce the number of unknowns.',
    category: 'constraint',
    triggerPatterns: ['pulley', 'rope', 'connected'],
  },
  {
    id: 'pivot-constraint-2',
    questionText: 'Is there a conservation law that applies here?',
    type: 'mcq',
    choices: ['Conservation of energy', 'Conservation of momentum', 'Both apply', 'Neither applies'],
    correctAnswer: 'Both apply',
    explanation: 'Conservation laws often provide the constraints needed to solve problems.',
    category: 'constraint',
    triggerPatterns: ['collision', 'explosion', 'energy'],
  },

  // Decompose category
  {
    id: 'pivot-decompose-1',
    questionText: 'What are the sub-problems you need to solve? List them.',
    type: 'short',
    explanation: 'Breaking down complex problems makes them more manageable.',
    category: 'decompose',
    triggerPatterns: ['complex', 'multi-step', 'combined'],
  },
  {
    id: 'pivot-decompose-2',
    questionText: 'Which part of the motion can you analyze first - before or after the collision/event?',
    type: 'reflection',
    explanation: 'Time-based decomposition helps analyze different phases separately.',
    category: 'decompose',
    triggerPatterns: ['collision', 'before', 'after', 'phases'],
  },

  // Visualize category
  {
    id: 'pivot-visualize-1',
    questionText: 'Have you drawn a free body diagram? What forces are acting?',
    type: 'reflection',
    explanation: 'A free body diagram helps you identify all forces systematically.',
    category: 'visualize',
    triggerPatterns: ['force', 'fbd', 'diagram'],
  },
  {
    id: 'pivot-visualize-2',
    questionText: 'Sketch the velocity/position vs time. What shape should the graph have?',
    type: 'reflection',
    explanation: 'Graphical representations can reveal patterns in motion.',
    category: 'visualize',
    triggerPatterns: ['motion', 'kinematics', 'velocity', 'acceleration'],
  },

  // Analogy category
  {
    id: 'pivot-analogy-1',
    questionText: 'Does this remind you of a simpler problem you have solved before?',
    type: 'reflection',
    explanation: 'Connecting to prior knowledge helps transfer problem-solving strategies.',
    category: 'analogy',
    triggerPatterns: ['*'], // Universal
  },
  {
    id: 'pivot-analogy-2',
    questionText: 'If you were the object in this problem, what would you feel/experience?',
    type: 'reflection',
    explanation: 'Physical intuition from personal experience can guide problem-solving.',
    category: 'analogy',
    triggerPatterns: ['force', 'motion', 'acceleration'],
  },

  // Reverse category
  {
    id: 'pivot-reverse-1',
    questionText: 'If you knew the final velocity, how would you work backwards to find the initial conditions?',
    type: 'reflection',
    explanation: 'Working backwards can reveal the relationships between quantities.',
    category: 'reverse',
    triggerPatterns: ['velocity', 'initial', 'final'],
  },
  {
    id: 'pivot-reverse-2',
    questionText: 'What would the answer look like? Estimate the order of magnitude.',
    type: 'short',
    explanation: 'Having a target estimate helps you check if your approach is reasonable.',
    category: 'reverse',
    triggerPatterns: ['*'], // Universal
  },
]

/**
 * Check if pivot should be triggered - DETERMINISTIC
 */
export function shouldTriggerPivot(
  trigger: PivotTrigger,
  sessionState: PivotSessionState,
  stepDifficulty: 'easy' | 'medium' | 'hard' = 'medium',
  lastPivotTime?: string
): PivotDecision {
  const { timeSpentSeconds, attemptCount, hintLevel, stepIndex } = trigger

  // Check session-level limits
  const totalPivotsShown = getTotalPivotsShown(sessionState)
  if (totalPivotsShown >= PIVOT_POLICY_CONSTANTS.MAX_PIVOTS_PER_SESSION) {
    return {
      shouldTrigger: false,
      reason: 'max_pivots_reached',
    }
  }

  // Check step-level limits
  const stepState = getStepPivotState(sessionState, stepIndex)
  if (stepState?.status === 'disabled') {
    return {
      shouldTrigger: false,
      reason: 'disabled',
    }
  }

  // Check if already triggered/answered for this step
  if (
    stepState &&
    stepState.status !== 'not_triggered' &&
    stepState.status !== 'pending'
  ) {
    return {
      shouldTrigger: false,
      reason: 'recently_triggered',
    }
  }

  // Check cooldown
  if (lastPivotTime) {
    const lastPivotTimestamp = new Date(lastPivotTime).getTime()
    const now = Date.now()
    const secondsSinceLastPivot = (now - lastPivotTimestamp) / 1000

    if (secondsSinceLastPivot < PIVOT_THRESHOLDS.COOLDOWN_SECONDS) {
      return {
        shouldTrigger: false,
        reason: 'recently_triggered',
      }
    }
  }

  // Check minimum time
  if (timeSpentSeconds < PIVOT_POLICY_CONSTANTS.MIN_TIME_BEFORE_TRIGGER) {
    return {
      shouldTrigger: false,
      reason: 'not_enough_time',
    }
  }

  // Get thresholds based on difficulty
  const timeThreshold = getTimeThreshold(stepDifficulty)
  const attemptThreshold = getAttemptThreshold(stepDifficulty)

  // Check time-based trigger
  if (timeSpentSeconds >= timeThreshold) {
    const suggestedPivot = selectPivotQuestion(trigger.patternId)
    return {
      shouldTrigger: true,
      reason: 'time_threshold_exceeded',
      suggestedPivot,
    }
  }

  // Check attempt-based trigger
  if (attemptCount >= attemptThreshold) {
    const suggestedPivot = selectPivotQuestion(trigger.patternId)
    return {
      shouldTrigger: true,
      reason: 'multiple_wrong_attempts',
      suggestedPivot,
    }
  }

  // Check hint-based trigger
  if (hintLevel >= PIVOT_THRESHOLDS.HINT_LEVEL_TRIGGER) {
    const suggestedPivot = selectPivotQuestion(trigger.patternId)
    return {
      shouldTrigger: true,
      reason: 'hint_escalation',
      suggestedPivot,
    }
  }

  return {
    shouldTrigger: false,
    reason: 'not_enough_time',
  }
}

/**
 * Get time threshold based on step difficulty
 */
function getTimeThreshold(difficulty: 'easy' | 'medium' | 'hard'): number {
  switch (difficulty) {
    case 'easy':
      return PIVOT_THRESHOLDS.EASY_STEP_TIME
    case 'hard':
      return PIVOT_THRESHOLDS.HARD_STEP_TIME
    default:
      return PIVOT_THRESHOLDS.MEDIUM_STEP_TIME
  }
}

/**
 * Get attempt threshold based on step difficulty
 */
function getAttemptThreshold(difficulty: 'easy' | 'medium' | 'hard'): number {
  switch (difficulty) {
    case 'easy':
      return PIVOT_THRESHOLDS.WRONG_ATTEMPTS_EASY
    case 'hard':
      return PIVOT_THRESHOLDS.WRONG_ATTEMPTS_HARD
    default:
      return PIVOT_THRESHOLDS.WRONG_ATTEMPTS_MEDIUM
  }
}

/**
 * Select appropriate pivot question based on pattern
 * DETERMINISTIC: same pattern always returns same pivot
 */
export function selectPivotQuestion(
  patternId?: string,
  excludeIds: string[] = []
): PivotQuestion {
  // Filter out excluded pivots
  const availablePivots = DEFAULT_PIVOT_QUESTIONS.filter(
    p => !excludeIds.includes(p.id)
  )

  if (availablePivots.length === 0) {
    // Fallback to universal pivot
    return DEFAULT_PIVOT_QUESTIONS.find(p => p.triggerPatterns.includes('*'))!
  }

  // If pattern provided, prioritize matching pivots
  if (patternId) {
    const patternLower = patternId.toLowerCase()

    // Find pivots that match the pattern
    const matchingPivots = availablePivots.filter(p =>
      p.triggerPatterns.some(
        tp => tp === '*' || patternLower.includes(tp) || tp.includes(patternLower)
      )
    )

    if (matchingPivots.length > 0) {
      // DETERMINISTIC: Use hash of pattern to select consistently
      const index = hashString(patternId) % matchingPivots.length
      return matchingPivots[index]
    }
  }

  // Default: return based on category rotation
  const categories: PivotCategory[] = [
    'simplify',
    'constraint',
    'decompose',
    'visualize',
    'analogy',
    'reverse',
  ]

  // Use session time or default index for determinism
  const categoryIndex = Date.now() % categories.length
  const targetCategory = categories[categoryIndex]

  const categoryPivots = availablePivots.filter(p => p.category === targetCategory)
  if (categoryPivots.length > 0) {
    return categoryPivots[0]
  }

  // Fallback to first available
  return availablePivots[0]
}

/**
 * Simple hash function for deterministic selection
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Calculate time bonus for correct pivot answer
 */
export function calculatePivotTimeBonus(
  pivotQuestion: PivotQuestion,
  userAnswer: string,
  wasHelpful: boolean
): number {
  // No bonus for reflection questions
  if (pivotQuestion.type === 'reflection') {
    return wasHelpful ? PIVOT_POLICY_CONSTANTS.CORRECT_PIVOT_TIME_BONUS_SECONDS : 0
  }

  // Check correctness for MCQ
  if (pivotQuestion.type === 'mcq' && pivotQuestion.correctAnswer) {
    const isCorrect =
      userAnswer.toLowerCase().trim() ===
      pivotQuestion.correctAnswer.toLowerCase().trim()
    return isCorrect ? PIVOT_POLICY_CONSTANTS.CORRECT_PIVOT_TIME_BONUS_SECONDS : 0
  }

  // For short answer, give partial credit if answered
  if (pivotQuestion.type === 'short' && userAnswer.trim().length > 10) {
    return Math.round(PIVOT_POLICY_CONSTANTS.CORRECT_PIVOT_TIME_BONUS_SECONDS * 0.5)
  }

  return 0
}

/**
 * Get pivot questions for a specific category
 */
export function getPivotsByCategory(
  category: PivotCategory
): readonly PivotQuestion[] {
  return DEFAULT_PIVOT_QUESTIONS.filter(p => p.category === category)
}

/**
 * Get pivot questions matching patterns
 */
export function getPivotsForPatterns(
  patterns: string[]
): readonly PivotQuestion[] {
  return DEFAULT_PIVOT_QUESTIONS.filter(p =>
    p.triggerPatterns.some(
      tp =>
        tp === '*' ||
        patterns.some(
          pattern =>
            tp.includes(pattern.toLowerCase()) ||
            pattern.toLowerCase().includes(tp)
        )
    )
  )
}
