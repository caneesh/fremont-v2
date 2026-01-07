/**
 * Phase 4: Incremental Correlation Engine
 *
 * Links new questions to existing graph incrementally.
 * Preserves stability of curated edges.
 */

import { prisma } from '@/lib/db'
import { EdgeType, QuestionLifecycleState } from '@prisma/client'

// =============================================================================
// FEATURE EXTRACTION
// =============================================================================

/**
 * Feature signals extracted from questions for correlation
 */
export interface QuestionFeatures {
  questionId: string

  // Content features
  patternId: string | null
  topicTags: string[]
  difficulty: number

  // Semantic features (extracted from payload)
  conceptIds: string[]
  skillIds: string[]
  trapIds: string[]

  // Structural features
  hasMultipleParts: boolean
  requiresDiagram: boolean
  stepCount: number

  // Difficulty indicators
  mathComplexity: number      // 1-5: arithmetic to calculus
  physicsDepth: number        // 1-5: intuition to derivation
  timeEstimateMins: number
}

/**
 * Extract features from a question for correlation
 */
export async function extractFeatures(questionId: string): Promise<QuestionFeatures | null> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: {
      id: true,
      questionId: true,
      primaryPatternId: true,
      topicTags: true,
      difficulty: true,
      payload: true,
      tags: {
        select: { tagType: true, tagValue: true },
      },
    },
  })

  if (!question) return null

  const payload = question.payload as Record<string, unknown> | null

  // Extract from tags
  const conceptIds = question.tags
    .filter(t => t.tagType === 'concept')
    .map(t => t.tagValue)
  const skillIds = question.tags
    .filter(t => t.tagType === 'skill')
    .map(t => t.tagValue)
  const trapIds = question.tags
    .filter(t => t.tagType === 'trap')
    .map(t => t.tagValue)

  // Extract from payload
  const steps = (payload?.steps as unknown[]) || []
  const hasMultipleParts = (payload?.parts as unknown[])?.length > 1
  const requiresDiagram = !!payload?.requiresFbd || !!payload?.hasDiagram

  // Estimate complexity (simplified heuristics)
  const mathComplexity = estimateMathComplexity(payload)
  const physicsDepth = estimatePhysicsDepth(payload)
  const timeEstimateMins = estimateTime(question.difficulty, steps.length)

  return {
    questionId: question.id,
    patternId: question.primaryPatternId,
    topicTags: question.topicTags,
    difficulty: question.difficulty,
    conceptIds,
    skillIds,
    trapIds,
    hasMultipleParts,
    requiresDiagram,
    stepCount: steps.length,
    mathComplexity,
    physicsDepth,
    timeEstimateMins,
  }
}

function estimateMathComplexity(payload: Record<string, unknown> | null): number {
  if (!payload) return 3
  const content = JSON.stringify(payload).toLowerCase()

  if (content.includes('integral') || content.includes('derivative')) return 5
  if (content.includes('vector') || content.includes('cross product')) return 4
  if (content.includes('trigonometry') || content.includes('sin(') || content.includes('cos(')) return 3
  if (content.includes('algebra') || content.includes('equation')) return 2
  return 1
}

function estimatePhysicsDepth(payload: Record<string, unknown> | null): number {
  if (!payload) return 3
  const content = JSON.stringify(payload).toLowerCase()

  if (content.includes('derive') || content.includes('proof')) return 5
  if (content.includes('analyze') || content.includes('compare')) return 4
  if (content.includes('calculate') || content.includes('find')) return 3
  if (content.includes('identify') || content.includes('explain')) return 2
  return 1
}

function estimateTime(difficulty: number, stepCount: number): number {
  const baseTime = 5 + difficulty * 2
  const stepTime = stepCount * 1.5
  return Math.round(baseTime + stepTime)
}

// =============================================================================
// CANDIDATE NARROWING
// =============================================================================

/**
 * Candidate narrowing strategy:
 * 1. Same pattern questions (highest priority)
 * 2. Same topic questions
 * 3. Similar difficulty range
 * 4. Shared concepts/skills
 */
export async function findCandidates(
  features: QuestionFeatures,
  limit: number = 50
): Promise<string[]> {
  const candidateIds = new Set<string>()

  // Strategy 1: Same pattern
  if (features.patternId) {
    const samePattern = await prisma.question.findMany({
      where: {
        primaryPatternId: features.patternId,
        id: { not: features.questionId },
        lifecycleState: QuestionLifecycleState.approved,
      },
      select: { id: true },
      take: limit,
    })
    samePattern.forEach(q => candidateIds.add(q.id))
  }

  // Strategy 2: Same topics
  if (features.topicTags.length > 0 && candidateIds.size < limit) {
    const sameTopic = await prisma.question.findMany({
      where: {
        topicTags: { hasSome: features.topicTags },
        id: { not: features.questionId },
        lifecycleState: QuestionLifecycleState.approved,
      },
      select: { id: true },
      take: limit - candidateIds.size,
    })
    sameTopic.forEach(q => candidateIds.add(q.id))
  }

  // Strategy 3: Similar difficulty
  if (candidateIds.size < limit) {
    const similarDifficulty = await prisma.question.findMany({
      where: {
        difficulty: {
          gte: Math.max(1, features.difficulty - 2),
          lte: Math.min(10, features.difficulty + 2),
        },
        id: { not: features.questionId },
        lifecycleState: QuestionLifecycleState.approved,
      },
      select: { id: true },
      take: limit - candidateIds.size,
    })
    similarDifficulty.forEach(q => candidateIds.add(q.id))
  }

  // Strategy 4: Shared concepts via tags
  if (features.conceptIds.length > 0 && candidateIds.size < limit) {
    const sharedConcepts = await prisma.questionTag.findMany({
      where: {
        tagType: 'concept',
        tagValue: { in: features.conceptIds },
        questionId: { not: features.questionId },
      },
      select: { questionId: true },
      take: limit - candidateIds.size,
    })
    sharedConcepts.forEach(t => candidateIds.add(t.questionId))
  }

  return Array.from(candidateIds)
}

// =============================================================================
// EDGE SCORING
// =============================================================================

/**
 * Calculate similarity score between two questions
 * Returns value between 0 and 1
 */
export async function calculateEdgeScore(
  sourceFeatures: QuestionFeatures,
  targetFeatures: QuestionFeatures
): Promise<{
  score: number
  edgeType: EdgeType
  breakdown: Record<string, number>
}> {
  const breakdown: Record<string, number> = {}

  // Pattern match (0.3 weight)
  const patternScore = sourceFeatures.patternId && sourceFeatures.patternId === targetFeatures.patternId ? 1 : 0
  breakdown.pattern = patternScore * 0.3

  // Topic overlap (0.2 weight)
  const topicOverlap = calculateSetOverlap(sourceFeatures.topicTags, targetFeatures.topicTags)
  breakdown.topic = topicOverlap * 0.2

  // Concept overlap (0.2 weight)
  const conceptOverlap = calculateSetOverlap(sourceFeatures.conceptIds, targetFeatures.conceptIds)
  breakdown.concept = conceptOverlap * 0.2

  // Skill overlap (0.15 weight)
  const skillOverlap = calculateSetOverlap(sourceFeatures.skillIds, targetFeatures.skillIds)
  breakdown.skill = skillOverlap * 0.15

  // Structural similarity (0.15 weight)
  const structuralScore = calculateStructuralSimilarity(sourceFeatures, targetFeatures)
  breakdown.structural = structuralScore * 0.15

  const totalScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0)

  // Determine edge type based on difficulty comparison
  const diffDelta = targetFeatures.difficulty - sourceFeatures.difficulty
  let edgeType: EdgeType

  if (diffDelta >= 2) {
    edgeType = EdgeType.harder
  } else if (diffDelta <= -2) {
    edgeType = EdgeType.easier
  } else if (patternScore > 0) {
    edgeType = EdgeType.same_pattern
  } else {
    edgeType = EdgeType.same_difficulty
  }

  return {
    score: Math.round(totalScore * 100) / 100,
    edgeType,
    breakdown,
  }
}

function calculateSetOverlap(set1: string[], set2: string[]): number {
  if (set1.length === 0 && set2.length === 0) return 0
  if (set1.length === 0 || set2.length === 0) return 0

  const intersection = set1.filter(item => set2.includes(item))
  const union = new Set([...set1, ...set2])

  return intersection.length / union.size // Jaccard similarity
}

function calculateStructuralSimilarity(f1: QuestionFeatures, f2: QuestionFeatures): number {
  let score = 0
  let factors = 0

  // Step count similarity
  const stepDiff = Math.abs(f1.stepCount - f2.stepCount)
  score += Math.max(0, 1 - stepDiff / 5)
  factors++

  // Both require diagram or both don't
  if (f1.requiresDiagram === f2.requiresDiagram) {
    score += 1
  }
  factors++

  // Math complexity similarity
  const mathDiff = Math.abs(f1.mathComplexity - f2.mathComplexity)
  score += Math.max(0, 1 - mathDiff / 4)
  factors++

  return factors > 0 ? score / factors : 0
}

// =============================================================================
// EDGE STABILITY RULES
// =============================================================================

/**
 * Edge stability rules:
 * 1. Curated edges are NEVER auto-replaced
 * 2. Auto edges can be replaced if new score is significantly higher
 * 3. Edges older than 30 days get stability bonus
 * 4. Maximum N edges per type per question
 */

export const STABILITY_RULES = {
  /** Minimum score improvement needed to replace existing edge */
  minScoreImprovementToReplace: 0.15,

  /** Age in days after which edge gets stability bonus */
  stabilityBonusAgeDays: 30,

  /** Stability bonus value (added to existing edge score) */
  stabilityBonusValue: 0.1,

  /** Maximum auto edges per edge type per question */
  maxAutoEdgesPerType: 5,

  /** Minimum score to create an edge */
  minScoreThreshold: 0.3,
}

/**
 * Check if a new edge should replace an existing one
 */
export async function shouldReplaceEdge(
  existingEdgeId: string,
  newScore: number
): Promise<boolean> {
  const existing = await prisma.questionEdge.findUnique({
    where: { id: existingEdgeId },
    select: {
      isCurated: true,
      weight: true,
      createdAt: true,
    },
  })

  if (!existing) return true

  // Rule 1: Never replace curated edges
  if (existing.isCurated) return false

  // Calculate existing score with stability bonus
  const ageMs = Date.now() - existing.createdAt.getTime()
  const ageDays = ageMs / (1000 * 60 * 60 * 24)
  const stabilityBonus = ageDays >= STABILITY_RULES.stabilityBonusAgeDays
    ? STABILITY_RULES.stabilityBonusValue
    : 0

  const adjustedExistingScore = (existing.weight || 0) + stabilityBonus

  // Rule 2: Replace only if significant improvement
  return newScore > adjustedExistingScore + STABILITY_RULES.minScoreImprovementToReplace
}

// =============================================================================
// BATCH CORRELATION JOB
// =============================================================================

export interface CorrelationJobResult {
  questionId: string
  edgesCreated: number
  edgesUpdated: number
  edgesSkipped: number
  errors: string[]
}

/**
 * Run correlation for a single question
 */
export async function correlateQuestion(questionId: string): Promise<CorrelationJobResult> {
  const result: CorrelationJobResult = {
    questionId,
    edgesCreated: 0,
    edgesUpdated: 0,
    edgesSkipped: 0,
    errors: [],
  }

  try {
    // Extract features
    const features = await extractFeatures(questionId)
    if (!features) {
      result.errors.push('Failed to extract features')
      return result
    }

    // Find candidates
    const candidateIds = await findCandidates(features)
    if (candidateIds.length === 0) {
      return result
    }

    // Score each candidate
    for (const candidateId of candidateIds) {
      try {
        const candidateFeatures = await extractFeatures(candidateId)
        if (!candidateFeatures) continue

        const { score, edgeType } = await calculateEdgeScore(features, candidateFeatures)

        // Skip if score too low
        if (score < STABILITY_RULES.minScoreThreshold) {
          result.edgesSkipped++
          continue
        }

        // Check existing edge
        const existingEdge = await prisma.questionEdge.findFirst({
          where: {
            fromQuestionId: questionId,
            toQuestionId: candidateId,
            edgeType,
          },
        })

        if (existingEdge) {
          // Check if should replace
          if (await shouldReplaceEdge(existingEdge.id, score)) {
            await prisma.questionEdge.update({
              where: { id: existingEdge.id },
              data: { weight: score },
            })
            result.edgesUpdated++
          } else {
            result.edgesSkipped++
          }
        } else {
          // Check edge count limit
          const existingCount = await prisma.questionEdge.count({
            where: {
              fromQuestionId: questionId,
              edgeType,
              isCurated: false,
            },
          })

          if (existingCount < STABILITY_RULES.maxAutoEdgesPerType) {
            await prisma.questionEdge.create({
              data: {
                fromQuestionId: questionId,
                toQuestionId: candidateId,
                edgeType,
                weight: score,
                isCurated: false,
              },
            })
            result.edgesCreated++
          } else {
            result.edgesSkipped++
          }
        }
      } catch (err) {
        result.errors.push(`Error processing candidate ${candidateId}: ${err}`)
      }
    }
  } catch (err) {
    result.errors.push(`Fatal error: ${err}`)
  }

  return result
}

/**
 * Batch correlation job for multiple questions
 */
export async function runCorrelationBatch(
  questionIds: string[],
  onProgress?: (completed: number, total: number) => void
): Promise<CorrelationJobResult[]> {
  const results: CorrelationJobResult[] = []

  for (let i = 0; i < questionIds.length; i++) {
    const result = await correlateQuestion(questionIds[i])
    results.push(result)

    if (onProgress) {
      onProgress(i + 1, questionIds.length)
    }
  }

  return results
}

/**
 * Get questions that need correlation (newly approved, no edges)
 */
export async function getQuestionsNeedingCorrelation(limit: number = 100): Promise<string[]> {
  const questions = await prisma.question.findMany({
    where: {
      lifecycleState: QuestionLifecycleState.approved,
      outgoingEdges: { none: {} },
    },
    select: { id: true },
    take: limit,
    orderBy: { approvedAt: 'asc' },
  })

  return questions.map(q => q.id)
}
