/**
 * Concept-to-Problem Bridge Service
 *
 * Maps weak concepts to patterns and fetches focused mini-problems
 * for reinforcement practice.
 */

import { getRepositories } from '../repositories'
import type { Pattern, Question } from '../schema'

/**
 * A focused mini-problem for concept reinforcement
 */
export interface MiniProblem {
  question: Question
  pattern: Pattern
  /** Why this problem was selected */
  reason: string
}

/**
 * Result of finding mini-problems for weak concepts
 */
export interface ConceptBridgeResult {
  /** The weak concept names that were analyzed */
  weakConcepts: string[]
  /** Matched patterns for these concepts */
  matchedPatterns: Pattern[]
  /** Recommended mini-problems (1-2) */
  miniProblems: MiniProblem[]
}

/**
 * Maps common concept names to pattern IDs
 * This handles variations in how concepts might be named
 */
const CONCEPT_TO_PATTERN_MAP: Record<string, string[]> = {
  // Newton's Laws
  "newton's second law": ['pattern_newton_2'],
  "newton's 2nd law": ['pattern_newton_2'],
  'f = ma': ['pattern_newton_2'],
  'net force': ['pattern_newton_2'],
  "newton's third law": ['pattern_newton_3'],
  "newton's 3rd law": ['pattern_newton_3'],
  'action-reaction': ['pattern_newton_3'],

  // Free Body Diagrams
  'free body diagram': ['pattern_free_body_diagram'],
  'fbd': ['pattern_free_body_diagram'],
  'force diagram': ['pattern_free_body_diagram'],

  // Friction
  'friction': ['pattern_friction'],
  'kinetic friction': ['pattern_friction'],
  'static friction': ['pattern_friction'],
  'coefficient of friction': ['pattern_friction'],

  // Inclined Planes
  'inclined plane': ['pattern_inclined_plane'],
  'incline': ['pattern_inclined_plane'],
  'ramp': ['pattern_inclined_plane'],

  // Energy
  'energy conservation': ['pattern_energy_conservation'],
  'conservation of energy': ['pattern_energy_conservation'],
  'kinetic energy': ['pattern_energy_conservation'],
  'potential energy': ['pattern_energy_conservation', 'pattern_spring_potential'],
  'work-energy': ['pattern_work_energy'],

  // Springs
  'spring': ['pattern_spring_potential'],
  'hooke\'s law': ['pattern_spring_potential'],
  'elastic potential energy': ['pattern_spring_potential'],

  // Momentum
  'momentum': ['pattern_momentum_conservation'],
  'conservation of momentum': ['pattern_momentum_conservation'],
  'collision': ['pattern_momentum_conservation'],
  'impulse': ['pattern_momentum_conservation'],

  // Circular Motion
  'circular motion': ['pattern_circular_motion'],
  'centripetal': ['pattern_circular_motion'],
  'centrifugal': ['pattern_circular_motion'],

  // Projectile Motion
  'projectile': ['pattern_projectile_motion'],
  'trajectory': ['pattern_projectile_motion'],

  // Kinematics
  'kinematics': ['pattern_kinematics_equations'],
  'motion equations': ['pattern_kinematics_equations'],
  'suvat': ['pattern_kinematics_equations'],
}

/**
 * Find pattern IDs that match a concept name
 */
function findPatternIdsForConcept(conceptName: string): string[] {
  const normalized = conceptName.toLowerCase().trim()

  // Direct match
  if (CONCEPT_TO_PATTERN_MAP[normalized]) {
    return CONCEPT_TO_PATTERN_MAP[normalized]
  }

  // Partial match - check if concept contains any key
  for (const [key, patternIds] of Object.entries(CONCEPT_TO_PATTERN_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return patternIds
    }
  }

  // Fuzzy match by words
  const conceptWords = normalized.split(/\s+/)
  for (const [key, patternIds] of Object.entries(CONCEPT_TO_PATTERN_MAP)) {
    const keyWords = key.split(/\s+/)
    const overlap = conceptWords.filter(w => keyWords.some(kw => kw.includes(w) || w.includes(kw)))
    if (overlap.length >= 1 && overlap.length >= keyWords.length * 0.5) {
      return patternIds
    }
  }

  return []
}

/**
 * Find mini-problems for a list of weak concepts
 *
 * @param weakConcepts - Array of concept names that the student struggled with
 * @param maxProblems - Maximum number of mini-problems to return (default: 2)
 * @returns ConceptBridgeResult with matched patterns and mini-problems
 */
export async function findMiniProblemsForWeakConcepts(
  weakConcepts: string[],
  maxProblems: number = 2
): Promise<ConceptBridgeResult> {
  const repos = getRepositories()

  // Collect all pattern IDs for weak concepts
  const patternIdSet = new Set<string>()
  const conceptToPatterns: Record<string, string[]> = {}

  for (const concept of weakConcepts) {
    const patternIds = findPatternIdsForConcept(concept)
    conceptToPatterns[concept] = patternIds
    patternIds.forEach(id => patternIdSet.add(id))
  }

  const patternIds = Array.from(patternIdSet)

  if (patternIds.length === 0) {
    return {
      weakConcepts,
      matchedPatterns: [],
      miniProblems: [],
    }
  }

  // Fetch patterns
  const patterns = await repos.patterns.getByIds(patternIds)

  // Fetch easy questions (difficulty 1-2) for these patterns
  const questions = await repos.questions.getRandomForPatterns(
    patternIds,
    maxProblems * 2, // Get more than needed to filter
    []
  )

  // Sort by difficulty (prefer easier problems for reinforcement)
  const sortedQuestions = questions.sort((a, b) => a.difficulty - b.difficulty)

  // Select mini-problems with reasons
  const miniProblems: MiniProblem[] = []
  const usedPatternIds = new Set<string>()

  for (const question of sortedQuestions) {
    if (miniProblems.length >= maxProblems) break

    // Find the primary pattern for this question
    const primaryRef = question.pattern_refs.find(ref => ref.relevance === 'primary')
    if (!primaryRef) continue

    const pattern = patterns.find(p => p.id === primaryRef.pattern_id)
    if (!pattern) continue

    // Prefer variety - try to cover different patterns
    if (usedPatternIds.has(pattern.id) && miniProblems.length < maxProblems - 1) {
      continue
    }

    // Find which weak concept this helps with
    const helpsConcept = weakConcepts.find(
      c => conceptToPatterns[c]?.includes(pattern.id)
    )

    miniProblems.push({
      question,
      pattern,
      reason: helpsConcept
        ? `Reinforces your understanding of ${helpsConcept}`
        : `Practice with ${pattern.name}`,
    })

    usedPatternIds.add(pattern.id)
  }

  return {
    weakConcepts,
    matchedPatterns: patterns,
    miniProblems,
  }
}

/**
 * Get a single focused mini-problem for a specific pattern
 */
export async function getMiniProblemForPattern(
  patternId: string,
  difficulty: number = 2,
  excludeQuestionIds: string[] = []
): Promise<MiniProblem | null> {
  const repos = getRepositories()

  const pattern = await repos.patterns.getById(patternId)
  if (!pattern) return null

  const questions = await repos.questions.getRandomForPatterns(
    [patternId],
    3,
    excludeQuestionIds
  )

  // Find question closest to requested difficulty
  const sortedByDifficulty = questions.sort(
    (a, b) => Math.abs(a.difficulty - difficulty) - Math.abs(b.difficulty - difficulty)
  )

  const question = sortedByDifficulty[0]
  if (!question) return null

  return {
    question,
    pattern,
    reason: `Practice ${pattern.name}`,
  }
}
