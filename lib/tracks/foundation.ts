/**
 * Phase 5 & 6: Foundation Track Integration
 *
 * Foundation 1: Intuition, representation, cause-effect
 * Foundation 2: Vector sense, constraints, multi-step reasoning
 *
 * These tracks connect upward to Competitive track.
 * Not separate products - integrated into the same system.
 */

import { Track } from '@prisma/client'

// =============================================================================
// PHASE 5: FOUNDATION 1 SKILL DEFINITIONS
// =============================================================================

/**
 * Foundation 1 Skills
 *
 * Focus: Building physical intuition without advanced math
 */
export const FOUNDATION1_SKILLS = {
  // Core intuition skills
  QUALITATIVE_REASONING: {
    id: 'f1_qualitative_reasoning',
    name: 'Qualitative Reasoning',
    description: 'Predict outcomes without calculation using physical intuition',
    examples: ['Which ball lands first?', 'Which direction does friction act?'],
    assessmentCriteria: [
      'Can predict direction of change',
      'Can identify dominant factor',
      'Can explain reasoning in words',
    ],
  },

  REPRESENTATION: {
    id: 'f1_representation',
    name: 'Physical Representation',
    description: 'Translate between verbal, pictorial, and diagrammatic representations',
    examples: ['Draw forces on block', 'Describe motion from graph'],
    assessmentCriteria: [
      'Can draw accurate diagrams from text',
      'Can describe diagrams in words',
      'Can match representations to scenarios',
    ],
  },

  CAUSE_EFFECT: {
    id: 'f1_cause_effect',
    name: 'Cause-Effect Chains',
    description: 'Identify causal relationships between physical quantities',
    examples: ['If mass increases, what happens to acceleration?'],
    assessmentCriteria: [
      'Can identify cause and effect',
      'Can predict effect direction',
      'Can chain multiple effects',
    ],
  },

  COMPARISON: {
    id: 'f1_comparison',
    name: 'Comparative Reasoning',
    description: 'Compare scenarios to determine relative magnitudes',
    examples: ['Which has more kinetic energy?', 'Where is speed greatest?'],
    assessmentCriteria: [
      'Can rank quantities',
      'Can identify when quantities are equal',
      'Can explain basis for comparison',
    ],
  },

  LIMITING_CASES: {
    id: 'f1_limiting_cases',
    name: 'Limiting Case Analysis',
    description: 'Use extreme values to verify or derive relationships',
    examples: ['What if angle is 0°?', 'What if mass is infinite?'],
    assessmentCriteria: [
      'Can identify relevant limits',
      'Can predict behavior at limits',
      'Can use limits to check answers',
    ],
  },
} as const

/**
 * Foundation 1 Question Characteristics
 */
export const FOUNDATION1_QUESTION_CHARACTERISTICS = {
  // Format constraints
  allowedFormats: ['mcq_qualitative', 'diagram_interpretation', 'comparison', 'true_false'],
  forbiddenFormats: ['numerical_calculation', 'derivation', 'multi_part_numerical'],

  // Math constraints
  maxMathLevel: 'arithmetic', // No algebra, no trigonometry
  allowedMathOperations: ['addition', 'subtraction', 'multiplication', 'division'],
  forbiddenMathOperations: ['trigonometry', 'calculus', 'vectors', 'algebra'],

  // Difficulty
  difficultyRange: { min: 1, max: 2 },

  // Step count
  maxSteps: 3,

  // Time
  targetTimeMinutes: { min: 2, max: 5 },
}

// =============================================================================
// PHASE 6: FOUNDATION 2 SKILL DEFINITIONS
// =============================================================================

/**
 * Foundation 2 Skills
 *
 * Focus: Bridge from intuition to quantitative reasoning
 */
export const FOUNDATION2_SKILLS = {
  // Bridge skills
  VECTOR_SENSE: {
    id: 'f2_vector_sense',
    name: 'Vector Sense',
    description: 'Understand direction and magnitude of vector quantities',
    examples: ['Which way does net force point?', 'Add velocity vectors'],
    assessmentCriteria: [
      'Can identify vector direction',
      'Can estimate resultant direction',
      'Can decompose into components conceptually',
    ],
  },

  CONSTRAINT_IDENTIFICATION: {
    id: 'f2_constraint_identification',
    name: 'Constraint Identification',
    description: 'Recognize physical constraints that limit motion',
    examples: ['What does the normal force ensure?', 'Why does tension equal?'],
    assessmentCriteria: [
      'Can identify constraint equations',
      'Can explain physical meaning',
      'Can apply to novel situations',
    ],
  },

  MULTI_STEP_REASONING: {
    id: 'f2_multi_step_reasoning',
    name: 'Multi-Step Reasoning',
    description: 'Chain 2-3 logical steps to reach conclusion',
    examples: ['Find acceleration, then time, then distance'],
    assessmentCriteria: [
      'Can plan solution strategy',
      'Can execute steps in order',
      'Can track intermediate results',
    ],
  },

  EQUATION_SENSE: {
    id: 'f2_equation_sense',
    name: 'Equation Sense',
    description: 'Understand what equations tell us physically',
    examples: ['What does F=ma mean for a falling object?'],
    assessmentCriteria: [
      'Can interpret equation meaning',
      'Can identify when equations apply',
      'Can predict equation behavior',
    ],
  },

  UNIT_CONSISTENCY: {
    id: 'f2_unit_consistency',
    name: 'Unit Consistency',
    description: 'Use dimensional analysis to check relationships',
    examples: ['Does v² = 2as have correct units?'],
    assessmentCriteria: [
      'Can verify unit consistency',
      'Can derive units from equations',
      'Can catch unit errors',
    ],
  },
} as const

/**
 * Foundation 2 Question Characteristics
 */
export const FOUNDATION2_QUESTION_CHARACTERISTICS = {
  // Format constraints
  allowedFormats: ['mcq_quantitative', 'simple_numerical', 'diagram_analysis', 'fill_in_blank'],
  forbiddenFormats: ['complex_derivation', 'multi_variable_optimization'],

  // Math constraints
  maxMathLevel: 'basic_algebra', // Algebra OK, no calculus
  allowedMathOperations: ['algebra', 'basic_trigonometry', 'simple_vectors'],
  forbiddenMathOperations: ['calculus', 'complex_integration', 'differential_equations'],

  // Difficulty
  difficultyRange: { min: 2, max: 4 },

  // Step count
  maxSteps: 5,

  // Time
  targetTimeMinutes: { min: 3, max: 8 },
}

// =============================================================================
// EDGE TRANSITIONS (UPWARD CONNECTIONS)
// =============================================================================

/**
 * Allowed track transitions
 */
export const TRACK_TRANSITIONS = {
  foundation1: {
    canProgressTo: ['foundation2'],
    canRemediateTo: [], // Foundation 1 is the bottom
  },
  foundation2: {
    canProgressTo: ['intermediate', 'competitive'],
    canRemediateTo: ['foundation1'],
  },
  intermediate: {
    canProgressTo: ['competitive'],
    canRemediateTo: ['foundation2'],
  },
  competitive: {
    canProgressTo: [], // Top track
    canRemediateTo: ['intermediate', 'foundation2'],
  },
} as const

/**
 * Check if track transition is allowed
 */
export function isTrackTransitionAllowed(
  fromTrack: Track,
  toTrack: Track,
  direction: 'progress' | 'remediate'
): boolean {
  const transitions = TRACK_TRANSITIONS[fromTrack]
  if (!transitions) return false

  if (direction === 'progress') {
    return transitions.canProgressTo.includes(toTrack as any)
  } else {
    return transitions.canRemediateTo.includes(toTrack as any)
  }
}

// =============================================================================
// PROGRESSION RULES
// =============================================================================

export interface ProgressionRequirements {
  minQuestionsCompleted: number
  minAverageScore: number
  minSkillsCovered: number
  totalSkillsInTrack: number
}

/**
 * Requirements to progress from one track to next
 */
export const PROGRESSION_REQUIREMENTS: Record<Track, ProgressionRequirements> = {
  foundation1: {
    minQuestionsCompleted: 10,
    minAverageScore: 70,
    minSkillsCovered: 4,
    totalSkillsInTrack: 5,
  },
  foundation2: {
    minQuestionsCompleted: 15,
    minAverageScore: 65,
    minSkillsCovered: 4,
    totalSkillsInTrack: 5,
  },
  intermediate: {
    minQuestionsCompleted: 20,
    minAverageScore: 60,
    minSkillsCovered: 5,
    totalSkillsInTrack: 6,
  },
  competitive: {
    minQuestionsCompleted: 0, // Top track, no progression
    minAverageScore: 0,
    minSkillsCovered: 0,
    totalSkillsInTrack: 8,
  },
}

/**
 * Check if user can progress to next track
 */
export function checkProgressionEligibility(
  track: Track,
  stats: {
    questionsCompleted: number
    averageScore: number
    skillsCovered: number
  }
): {
  eligible: boolean
  missingRequirements: string[]
} {
  const requirements = PROGRESSION_REQUIREMENTS[track]
  const missingRequirements: string[] = []

  if (stats.questionsCompleted < requirements.minQuestionsCompleted) {
    missingRequirements.push(
      `Need ${requirements.minQuestionsCompleted - stats.questionsCompleted} more questions`
    )
  }

  if (stats.averageScore < requirements.minAverageScore) {
    missingRequirements.push(
      `Need average score ≥ ${requirements.minAverageScore}% (current: ${stats.averageScore}%)`
    )
  }

  if (stats.skillsCovered < requirements.minSkillsCovered) {
    missingRequirements.push(
      `Need ${requirements.minSkillsCovered - stats.skillsCovered} more skills covered`
    )
  }

  return {
    eligible: missingRequirements.length === 0,
    missingRequirements,
  }
}

// =============================================================================
// REMEDIATION BEHAVIOR
// =============================================================================

/**
 * Remediation triggers and responses
 */
export interface RemediationTrigger {
  id: string
  condition: string
  suggestedAction: string
  targetTrack: Track | null
}

export const REMEDIATION_TRIGGERS: RemediationTrigger[] = [
  {
    id: 'struggling_with_concepts',
    condition: 'Score < 40% on 3 consecutive questions with same concept',
    suggestedAction: 'Suggest Foundation 2 questions on that concept',
    targetTrack: Track.foundation2,
  },
  {
    id: 'missing_intuition',
    condition: 'Fails qualitative reasoning checks repeatedly',
    suggestedAction: 'Suggest Foundation 1 intuition-building questions',
    targetTrack: Track.foundation1,
  },
  {
    id: 'math_gaps',
    condition: 'Makes systematic algebra/trig errors',
    suggestedAction: 'Suggest Foundation 2 equation-sense questions',
    targetTrack: Track.foundation2,
  },
  {
    id: 'diagram_weakness',
    condition: 'Consistently incorrect FBD or diagram interpretation',
    suggestedAction: 'Suggest Foundation 1 representation questions',
    targetTrack: Track.foundation1,
  },
]

/**
 * Check if remediation should be triggered
 */
export function shouldTriggerRemediation(
  currentTrack: Track,
  recentAttempts: Array<{
    score: number
    conceptId?: string
    errorTypes: string[]
  }>
): RemediationTrigger | null {
  // Don't remediate from Foundation 1
  if (currentTrack === Track.foundation1) {
    return null
  }

  // Check for concept struggles
  if (recentAttempts.length >= 3) {
    const last3 = recentAttempts.slice(-3)
    const allLowScore = last3.every(a => a.score < 40)
    const sameConceptId = last3[0].conceptId
    const sameConcept = sameConceptId && last3.every(a => a.conceptId === sameConceptId)

    if (allLowScore && sameConcept) {
      return REMEDIATION_TRIGGERS.find(t => t.id === 'struggling_with_concepts') || null
    }
  }

  // Check for diagram errors
  const diagramErrors = recentAttempts.filter(a =>
    a.errorTypes.includes('fbd_error') || a.errorTypes.includes('diagram_error')
  )
  if (diagramErrors.length >= 2) {
    return REMEDIATION_TRIGGERS.find(t => t.id === 'diagram_weakness') || null
  }

  // Check for math errors
  const mathErrors = recentAttempts.filter(a =>
    a.errorTypes.includes('algebra_error') || a.errorTypes.includes('trig_error')
  )
  if (mathErrors.length >= 2) {
    return REMEDIATION_TRIGGERS.find(t => t.id === 'math_gaps') || null
  }

  return null
}

// =============================================================================
// READINESS SIGNALS
// =============================================================================

/**
 * Signals that indicate readiness for next track
 */
export interface ReadinessSignal {
  id: string
  name: string
  weight: number // 0-1
  check: (stats: TrackStats) => number // Returns 0-1
}

export interface TrackStats {
  questionsCompleted: number
  averageScore: number
  recentStreak: number
  skillMastery: Record<string, number> // skill_id -> mastery 0-100
  averageTimeRatio: number // actual_time / expected_time
  hintsPerQuestion: number
}

export const READINESS_SIGNALS: ReadinessSignal[] = [
  {
    id: 'completion_count',
    name: 'Question Completion',
    weight: 0.2,
    check: (stats) => Math.min(1, stats.questionsCompleted / 15),
  },
  {
    id: 'score_threshold',
    name: 'Score Achievement',
    weight: 0.25,
    check: (stats) => Math.min(1, stats.averageScore / 70),
  },
  {
    id: 'recent_momentum',
    name: 'Recent Success Streak',
    weight: 0.15,
    check: (stats) => Math.min(1, stats.recentStreak / 5),
  },
  {
    id: 'skill_coverage',
    name: 'Skill Breadth',
    weight: 0.2,
    check: (stats) => {
      const skills = Object.values(stats.skillMastery)
      const masteredCount = skills.filter(m => m >= 60).length
      return masteredCount / Math.max(skills.length, 1)
    },
  },
  {
    id: 'independence',
    name: 'Solving Independence',
    weight: 0.2,
    check: (stats) => Math.max(0, 1 - stats.hintsPerQuestion / 3),
  },
]

/**
 * Calculate overall readiness score
 */
export function calculateReadinessScore(stats: TrackStats): {
  score: number
  breakdown: Record<string, number>
  isReady: boolean
} {
  const breakdown: Record<string, number> = {}
  let totalScore = 0

  for (const signal of READINESS_SIGNALS) {
    const signalScore = signal.check(stats) * signal.weight
    breakdown[signal.id] = Math.round(signalScore * 100) / 100
    totalScore += signalScore
  }

  return {
    score: Math.round(totalScore * 100),
    breakdown,
    isReady: totalScore >= 0.7, // 70% threshold
  }
}
