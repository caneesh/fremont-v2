/**
 * Warm-Up Selection Policy
 *
 * Deterministic algorithm for selecting warm-up drills based on:
 * 1. Spaced repetition decay scores
 * 2. Recent mistake patterns
 * 3. User's mastery levels
 */

import type {
  WarmUpBlock,
  WarmUpSelectionInput,
  WarmUpSelectionResult,
  PatternDecayScore,
  WarmUpSkipRecord,
} from '@/types/warmUp'
import { WARMUP_POLICY_CONSTANTS } from '../entities/warm-up'

/**
 * Policy thresholds for warm-up selection
 */
export const WARMUP_SELECTION_THRESHOLDS = {
  // Decay score thresholds
  HIGH_DECAY_THRESHOLD: 0.7, // Definitely include
  MEDIUM_DECAY_THRESHOLD: 0.4, // Consider including
  LOW_DECAY_THRESHOLD: 0.2, // Only if space available

  // Mastery thresholds
  LOW_MASTERY_THRESHOLD: 0.4, // Needs reinforcement
  HIGH_MASTERY_THRESHOLD: 0.85, // Skip unless very decayed

  // Weight factors for selection scoring
  DECAY_WEIGHT: 0.5,
  INVERSE_MASTERY_WEIGHT: 0.3,
  RECENT_MISTAKE_WEIGHT: 0.2,

  // Days thresholds
  STALE_TOPIC_DAYS: 7, // Topic not seen in this many days is stale
  VERY_STALE_TOPIC_DAYS: 14, // Priority refresh needed
} as const

/**
 * Topic-to-WarmUpBlock mapping (content configuration)
 * In production, this would come from a content database
 */
export const DEFAULT_WARMUP_BLOCKS: WarmUpBlock[] = [
  {
    id: 'warmup-vector-basics',
    topicId: 'vector_component',
    title: 'Vector Component Warm-Up',
    description: 'Quick review of vector resolution and components',
    durationMinutes: 3,
    drillTemplateIds: ['vec-1', 'vec-2', 'vec-3'],
    difficulty: 'easy',
  },
  {
    id: 'warmup-sign-convention',
    topicId: 'sign_convention',
    title: 'Sign Convention Refresher',
    description: 'Practice with positive/negative direction conventions',
    durationMinutes: 2,
    drillTemplateIds: ['sign-1', 'sign-2', 'sign-3'],
    difficulty: 'easy',
  },
  {
    id: 'warmup-trig-identities',
    topicId: 'trig_identity',
    title: 'Trig Identity Quick Drill',
    description: 'Review sin²θ + cos²θ = 1 and complementary angles',
    durationMinutes: 3,
    drillTemplateIds: ['trig-1', 'trig-2', 'trig-3'],
    difficulty: 'medium',
  },
  {
    id: 'warmup-unit-conversion',
    topicId: 'unit_conversion',
    title: 'Unit Conversion Speed Round',
    description: 'Quick conversions: km/h ↔ m/s, area units, etc.',
    durationMinutes: 2,
    drillTemplateIds: ['unit-1', 'unit-2', 'unit-3'],
    difficulty: 'easy',
  },
  {
    id: 'warmup-algebra',
    topicId: 'algebra_manipulation',
    title: 'Algebra Manipulation Warm-Up',
    description: 'Review algebraic identities and manipulations',
    durationMinutes: 3,
    drillTemplateIds: ['alg-1', 'alg-2', 'alg-3'],
    difficulty: 'medium',
  },
  {
    id: 'warmup-conservation',
    topicId: 'conservation_scope',
    title: 'Conservation Laws Quick Check',
    description: 'When to apply conservation principles',
    durationMinutes: 4,
    drillTemplateIds: ['cons-1', 'cons-2', 'cons-3'],
    difficulty: 'medium',
  },
  {
    id: 'warmup-reference-frame',
    topicId: 'reference_frame',
    title: 'Reference Frame Basics',
    description: 'Pseudo forces and relative motion concepts',
    durationMinutes: 4,
    drillTemplateIds: ['ref-1', 'ref-2', 'ref-3'],
    difficulty: 'hard',
  },
  {
    id: 'warmup-fbd',
    topicId: 'force_enumeration',
    title: 'Free Body Diagram Drill',
    description: 'Practice identifying all forces in a system',
    durationMinutes: 3,
    drillTemplateIds: ['fbd-1', 'fbd-2', 'fbd-3'],
    difficulty: 'easy',
  },
  {
    id: 'warmup-kinematics',
    topicId: 'kinematics',
    title: 'Kinematics Equations Warm-Up',
    description: 'Applying the equations of motion',
    durationMinutes: 4,
    drillTemplateIds: ['kin-1', 'kin-2', 'kin-3', 'kin-4', 'kin-5'],
    difficulty: 'medium',
  },
  {
    id: 'warmup-newtons-laws',
    topicId: 'newtons_laws',
    title: "Newton's Laws Warm-Up",
    description: "Applying Newton's three laws of motion",
    durationMinutes: 4,
    drillTemplateIds: ['newton-1', 'newton-2', 'newton-3', 'newton-4', 'newton-5'],
    difficulty: 'medium',
  },
  {
    id: 'warmup-work-energy',
    topicId: 'work_energy',
    title: 'Work & Energy Warm-Up',
    description: 'Work, kinetic energy, and potential energy',
    durationMinutes: 4,
    drillTemplateIds: ['we-1', 'we-2', 'we-3', 'we-4', 'we-5'],
    difficulty: 'medium',
  },
  {
    id: 'warmup-circular-motion',
    topicId: 'circular_motion',
    title: 'Circular Motion Warm-Up',
    description: 'Centripetal acceleration and circular motion',
    durationMinutes: 4,
    drillTemplateIds: ['circ-1', 'circ-2', 'circ-3', 'circ-4', 'circ-5'],
    difficulty: 'hard',
  },
  {
    id: 'warmup-momentum',
    topicId: 'momentum',
    title: 'Momentum Warm-Up',
    description: 'Linear momentum and impulse',
    durationMinutes: 4,
    drillTemplateIds: ['mom-1', 'mom-2', 'mom-3', 'mom-4', 'mom-5'],
    difficulty: 'medium',
  },
  {
    id: 'warmup-projectile',
    topicId: 'projectile_motion',
    title: 'Projectile Motion Warm-Up',
    description: 'Motion in two dimensions under gravity',
    durationMinutes: 4,
    drillTemplateIds: ['proj-1', 'proj-2', 'proj-3', 'proj-4', 'proj-5'],
    difficulty: 'hard',
  },
  {
    id: 'warmup-thermodynamics',
    topicId: 'thermodynamics',
    title: 'Thermodynamics Warm-Up',
    description: 'Heat transfer, processes, and the First Law',
    durationMinutes: 5,
    drillTemplateIds: ['thermo-1', 'thermo-2', 'thermo-3', 'thermo-4', 'thermo-5', 'thermo-6'],
    difficulty: 'medium',
  },
  {
    id: 'warmup-waves',
    topicId: 'waves',
    title: 'Waves Warm-Up',
    description: 'Wave properties, interference, and Doppler effect',
    durationMinutes: 5,
    drillTemplateIds: ['wave-1', 'wave-2', 'wave-3', 'wave-4', 'wave-5', 'wave-6'],
    difficulty: 'medium',
  },
  {
    id: 'warmup-shm',
    topicId: 'shm',
    title: 'Simple Harmonic Motion Warm-Up',
    description: 'Oscillations, pendulums, and spring-mass systems',
    durationMinutes: 4,
    drillTemplateIds: ['shm-1', 'shm-2', 'shm-3', 'shm-4', 'shm-5'],
    difficulty: 'hard',
  },
  {
    id: 'warmup-electrostatics',
    topicId: 'electrostatics',
    title: 'Electrostatics Warm-Up',
    description: "Coulomb's Law, electric fields, and charge interactions",
    durationMinutes: 5,
    drillTemplateIds: ['elec-1', 'elec-2', 'elec-3', 'elec-4', 'elec-5', 'elec-6'],
    difficulty: 'medium',
  },
]

/**
 * Calculate selection score for a pattern/topic
 * Higher score = higher priority for warm-up inclusion
 */
export function calculateSelectionScore(
  pattern: PatternDecayScore,
  recentMistakeTypes: readonly string[]
): number {
  const { decayScore, mastery, topicId } = pattern

  // Decay component (0-1)
  const decayComponent = decayScore * WARMUP_SELECTION_THRESHOLDS.DECAY_WEIGHT

  // Inverse mastery component (0-1) - lower mastery = higher score
  const inverseMasteryComponent =
    (1 - mastery) * WARMUP_SELECTION_THRESHOLDS.INVERSE_MASTERY_WEIGHT

  // Recent mistake bonus
  const hasMistake = recentMistakeTypes.includes(topicId)
  const mistakeComponent = hasMistake
    ? WARMUP_SELECTION_THRESHOLDS.RECENT_MISTAKE_WEIGHT
    : 0

  return decayComponent + inverseMasteryComponent + mistakeComponent
}

/**
 * Select warm-up blocks based on user's pattern states
 * DETERMINISTIC: Same inputs always produce same outputs
 */
export function selectWarmUpBlocks(
  input: WarmUpSelectionInput,
  availableBlocks: readonly WarmUpBlock[] = DEFAULT_WARMUP_BLOCKS
): WarmUpSelectionResult {
  const { patternStates, recentMistakeTypes, maxBlocks, maxDurationMinutes } = input

  // Step 1: Calculate selection scores for each pattern
  const scoredPatterns = patternStates
    .filter(p => {
      // Exclude topics with very high mastery unless they've decayed significantly
      if (
        p.mastery >= WARMUP_SELECTION_THRESHOLDS.HIGH_MASTERY_THRESHOLD &&
        p.decayScore < WARMUP_SELECTION_THRESHOLDS.HIGH_DECAY_THRESHOLD
      ) {
        return false
      }
      return true
    })
    .map(pattern => ({
      pattern,
      score: calculateSelectionScore(pattern, recentMistakeTypes),
    }))
    .sort((a, b) => b.score - a.score) // Descending by score

  // Step 2: Map to available blocks and select within constraints
  const selectedBlocks: WarmUpBlock[] = []
  let totalDuration = 0
  const priorityTopics: string[] = []

  for (const { pattern } of scoredPatterns) {
    if (selectedBlocks.length >= maxBlocks) break
    if (totalDuration >= maxDurationMinutes) break

    // Find matching block for this topic
    const block = availableBlocks.find(b => b.topicId === pattern.topicId)
    if (!block) continue

    // Check if adding this block exceeds duration limit
    if (totalDuration + block.durationMinutes > maxDurationMinutes) continue

    selectedBlocks.push(block)
    totalDuration += block.durationMinutes
    priorityTopics.push(pattern.topicId)
  }

  // Step 3: Generate selection reason
  const selectionReason = generateSelectionReason(
    selectedBlocks,
    scoredPatterns.map(s => s.pattern),
    recentMistakeTypes
  )

  return {
    selectedBlocks,
    totalDurationMinutes: totalDuration,
    selectionReason,
    priorityTopics,
  }
}

/**
 * Generate human-readable explanation for selection
 */
function generateSelectionReason(
  selectedBlocks: WarmUpBlock[],
  patterns: PatternDecayScore[],
  recentMistakes: readonly string[]
): string {
  if (selectedBlocks.length === 0) {
    return 'No warm-up needed today - all topics are fresh!'
  }

  const reasons: string[] = []

  // Check for decay-based selections
  const decayedTopics = patterns.filter(
    p => p.decayScore >= WARMUP_SELECTION_THRESHOLDS.MEDIUM_DECAY_THRESHOLD
  )
  if (decayedTopics.length > 0) {
    reasons.push(`reviewing ${decayedTopics.length} topics that need refreshing`)
  }

  // Check for mistake-based selections
  const mistakeTopics = selectedBlocks.filter(b =>
    recentMistakes.includes(b.topicId)
  )
  if (mistakeTopics.length > 0) {
    reasons.push(
      `reinforcing ${mistakeTopics.length} area${mistakeTopics.length > 1 ? 's' : ''} with recent mistakes`
    )
  }

  // Check for low mastery selections
  const lowMasteryTopics = patterns.filter(
    p =>
      p.mastery < WARMUP_SELECTION_THRESHOLDS.LOW_MASTERY_THRESHOLD &&
      selectedBlocks.some(b => b.topicId === p.topicId)
  )
  if (lowMasteryTopics.length > 0) {
    reasons.push(
      `building up ${lowMasteryTopics.length} developing skill${lowMasteryTopics.length > 1 ? 's' : ''}`
    )
  }

  return reasons.length > 0
    ? `Today's warm-up: ${reasons.join(', ')}.`
    : 'Selected based on your learning patterns.'
}

/**
 * Calculate decay score based on days since last seen and mastery
 * Higher score = more urgent need for review
 */
export function calculateDecayScore(
  mastery: number,
  daysSinceLastSeen: number
): number {
  // Base decay formula: more time passed = higher decay
  const timeDecay = Math.min(
    1,
    daysSinceLastSeen / WARMUP_SELECTION_THRESHOLDS.VERY_STALE_TOPIC_DAYS
  )

  // Mastery modifier: lower mastery decays faster
  const masteryModifier = 1 - mastery * 0.5 // Range: 0.5-1.0

  return Math.min(1, timeDecay * masteryModifier)
}

/**
 * Check if user can skip warm-up today
 */
export function canSkipWarmUp(
  skipRecord: WarmUpSkipRecord | null,
  today: string
): { canSkip: boolean; reason?: string } {
  if (!skipRecord) {
    return { canSkip: true }
  }

  if (skipRecord.lastSkipDate === today) {
    return {
      canSkip: false,
      reason: 'You have already skipped warm-up once today. Try completing this one!',
    }
  }

  return { canSkip: true }
}

/**
 * Calculate mastery penalty for skipping warm-up
 */
export function calculateSkipPenalty(selectedBlocks: readonly WarmUpBlock[]): {
  penaltyPerTopic: Record<string, number>
  totalPenalty: number
} {
  const penaltyPerTopic: Record<string, number> = {}

  for (const block of selectedBlocks) {
    penaltyPerTopic[block.topicId] = WARMUP_POLICY_CONSTANTS.SKIP_PENALTY_MASTERY_DELTA
  }

  return {
    penaltyPerTopic,
    totalPenalty:
      selectedBlocks.length * WARMUP_POLICY_CONSTANTS.SKIP_PENALTY_MASTERY_DELTA,
  }
}

/**
 * Determine if warm-up should be assigned for a session
 */
export function shouldAssignWarmUp(
  patternStates: readonly PatternDecayScore[],
  today: string,
  lastWarmUpDate?: string
): boolean {
  // Don't assign if already completed warm-up today
  if (lastWarmUpDate === today) {
    return false
  }

  // Check if any topic has significant decay
  const hasDecayedTopics = patternStates.some(
    p => p.decayScore >= WARMUP_SELECTION_THRESHOLDS.LOW_DECAY_THRESHOLD
  )

  // Check if any topic has low mastery
  const hasLowMasteryTopics = patternStates.some(
    p => p.mastery < WARMUP_SELECTION_THRESHOLDS.LOW_MASTERY_THRESHOLD
  )

  return hasDecayedTopics || hasLowMasteryTopics
}
