/**
 * Phase 2: Question Selection Service
 *
 * Selection order: curated edge → auto edge → pool → fallback
 * Supports Competitive and Intermediate tracks.
 */

import { prisma } from '@/lib/db'
import { EdgeType, QuestionLifecycleState, Track } from '@prisma/client'

// =============================================================================
// TYPES
// =============================================================================

export type SelectionMode = 'same' | 'harder' | 'easier'

export interface SelectionRequest {
  userId: string
  currentQuestionId?: string
  mode: SelectionMode
  track?: Track
  excludeQuestionIds?: string[]
}

export interface SelectionResult {
  success: boolean
  question: SelectedQuestion | null
  selectionMethod: 'curated_edge' | 'auto_edge' | 'pool' | 'fallback' | 'none'
  edgeId?: string
  edgeType?: EdgeType
  poolSize?: number
  reason?: string
}

export interface SelectedQuestion {
  id: string
  questionId: string
  difficulty: number
  track: Track
  primaryPatternId: string | null
  payload: unknown
  topicTags: string[]
}

// =============================================================================
// EDGE TYPE MAPPING
// =============================================================================

function getEdgeTypesForMode(mode: SelectionMode): EdgeType[] {
  switch (mode) {
    case 'same':
      return [EdgeType.same_difficulty, EdgeType.same_pattern, EdgeType.variation]
    case 'harder':
      return [EdgeType.harder]
    case 'easier':
      return [EdgeType.easier]
  }
}

function getDifficultyRangeForMode(
  baseDifficulty: number,
  mode: SelectionMode
): { min: number; max: number } {
  switch (mode) {
    case 'same':
      return {
        min: Math.max(1, baseDifficulty - 1),
        max: Math.min(10, baseDifficulty + 1),
      }
    case 'harder':
      return {
        min: baseDifficulty + 1,
        max: Math.min(10, baseDifficulty + 3),
      }
    case 'easier':
      return {
        min: Math.max(1, baseDifficulty - 3),
        max: Math.max(1, baseDifficulty - 1),
      }
  }
}

// =============================================================================
// SELECTION SERVICE
// =============================================================================

/**
 * Select the next question using the priority order:
 * 1. Curated edges (isCurated = true)
 * 2. Auto-generated edges (isCurated = false)
 * 3. Pool query (same pattern, appropriate difficulty)
 * 4. Fallback (any approved question not completed)
 */
export async function selectNextQuestion(
  request: SelectionRequest
): Promise<SelectionResult> {
  const { userId, currentQuestionId, mode, track, excludeQuestionIds = [] } = request

  // Get user's completed question IDs
  const completedAttempts = await prisma.userQuestionHistory.findMany({
    where: {
      userId,
      outcome: 'completed',
    },
    select: { questionId: true },
  })
  const completedIds = new Set([
    ...completedAttempts.map(a => a.questionId),
    ...excludeQuestionIds,
  ])

  // If we have a current question, try edge-based selection
  if (currentQuestionId) {
    const edgeResult = await tryEdgeSelection(
      currentQuestionId,
      mode,
      completedIds,
      track
    )
    if (edgeResult.success && edgeResult.question) {
      return edgeResult
    }
  }

  // Get base difficulty for pool/fallback queries
  let baseDifficulty = 5
  let basePatternId: string | null = null

  if (currentQuestionId) {
    const currentQuestion = await prisma.question.findUnique({
      where: { id: currentQuestionId },
      select: { difficulty: true, primaryPatternId: true },
    })
    if (currentQuestion) {
      baseDifficulty = currentQuestion.difficulty
      basePatternId = currentQuestion.primaryPatternId
    }
  }

  // Try pool selection
  const poolResult = await tryPoolSelection(
    baseDifficulty,
    basePatternId,
    mode,
    completedIds,
    track
  )
  if (poolResult.success && poolResult.question) {
    return poolResult
  }

  // Try fallback selection
  const fallbackResult = await tryFallbackSelection(completedIds, track)
  if (fallbackResult.success && fallbackResult.question) {
    return fallbackResult
  }

  // No questions available
  return {
    success: true,
    question: null,
    selectionMethod: 'none',
    reason: 'No available questions matching criteria',
  }
}

/**
 * Step 1 & 2: Try curated edges first, then auto edges
 */
async function tryEdgeSelection(
  currentQuestionId: string,
  mode: SelectionMode,
  excludeIds: Set<string>,
  track?: Track
): Promise<SelectionResult> {
  const edgeTypes = getEdgeTypesForMode(mode)

  // Build base query for edges
  const baseWhere = {
    fromQuestionId: currentQuestionId,
    edgeType: { in: edgeTypes },
    toQuestion: {
      lifecycleState: QuestionLifecycleState.approved,
      ...(track && { track }),
    },
  }

  // Step 1: Try curated edges first (highest priority)
  const curatedEdges = await prisma.questionEdge.findMany({
    where: {
      ...baseWhere,
      isCurated: true,
    },
    include: {
      toQuestion: {
        select: {
          id: true,
          questionId: true,
          difficulty: true,
          track: true,
          primaryPatternId: true,
          payload: true,
          topicTags: true,
        },
      },
    },
    orderBy: [
      { weight: 'desc' },
      { createdAt: 'asc' },
    ],
  })

  for (const edge of curatedEdges) {
    if (!excludeIds.has(edge.toQuestionId)) {
      return {
        success: true,
        question: edge.toQuestion as SelectedQuestion,
        selectionMethod: 'curated_edge',
        edgeId: edge.id,
        edgeType: edge.edgeType,
      }
    }
  }

  // Step 2: Try auto-generated edges
  const autoEdges = await prisma.questionEdge.findMany({
    where: {
      ...baseWhere,
      isCurated: false,
    },
    include: {
      toQuestion: {
        select: {
          id: true,
          questionId: true,
          difficulty: true,
          track: true,
          primaryPatternId: true,
          payload: true,
          topicTags: true,
        },
      },
    },
    orderBy: [
      { weight: 'desc' },
      { createdAt: 'asc' },
    ],
  })

  for (const edge of autoEdges) {
    if (!excludeIds.has(edge.toQuestionId)) {
      return {
        success: true,
        question: edge.toQuestion as SelectedQuestion,
        selectionMethod: 'auto_edge',
        edgeId: edge.id,
        edgeType: edge.edgeType,
      }
    }
  }

  return {
    success: false,
    question: null,
    selectionMethod: 'none',
    reason: 'No matching edges found',
  }
}

/**
 * Step 3: Pool selection (same pattern, appropriate difficulty)
 */
async function tryPoolSelection(
  baseDifficulty: number,
  patternId: string | null,
  mode: SelectionMode,
  excludeIds: Set<string>,
  track?: Track
): Promise<SelectionResult> {
  const diffRange = getDifficultyRangeForMode(baseDifficulty, mode)

  // Try with pattern filter first
  if (patternId) {
    const withPattern = await prisma.question.findMany({
      where: {
        lifecycleState: QuestionLifecycleState.approved,
        id: { notIn: Array.from(excludeIds) },
        primaryPatternId: patternId,
        difficulty: { gte: diffRange.min, lte: diffRange.max },
        ...(track && { track }),
      },
      select: {
        id: true,
        questionId: true,
        difficulty: true,
        track: true,
        primaryPatternId: true,
        payload: true,
        topicTags: true,
      },
      take: 10,
    })

    if (withPattern.length > 0) {
      const randomIndex = Math.floor(Math.random() * withPattern.length)
      return {
        success: true,
        question: withPattern[randomIndex] as SelectedQuestion,
        selectionMethod: 'pool',
        poolSize: withPattern.length,
      }
    }
  }

  // Try without pattern filter
  const withoutPattern = await prisma.question.findMany({
    where: {
      lifecycleState: QuestionLifecycleState.approved,
      id: { notIn: Array.from(excludeIds) },
      difficulty: { gte: diffRange.min, lte: diffRange.max },
      ...(track && { track }),
    },
    select: {
      id: true,
      questionId: true,
      difficulty: true,
      track: true,
      primaryPatternId: true,
      payload: true,
      topicTags: true,
    },
    take: 10,
  })

  if (withoutPattern.length > 0) {
    const randomIndex = Math.floor(Math.random() * withoutPattern.length)
    return {
      success: true,
      question: withoutPattern[randomIndex] as SelectedQuestion,
      selectionMethod: 'pool',
      poolSize: withoutPattern.length,
    }
  }

  return {
    success: false,
    question: null,
    selectionMethod: 'none',
    reason: 'No questions in pool matching criteria',
  }
}

/**
 * Step 4: Fallback selection (any approved question not completed)
 */
async function tryFallbackSelection(
  excludeIds: Set<string>,
  track?: Track
): Promise<SelectionResult> {
  const fallback = await prisma.question.findMany({
    where: {
      lifecycleState: QuestionLifecycleState.approved,
      id: { notIn: Array.from(excludeIds) },
      ...(track && { track }),
    },
    select: {
      id: true,
      questionId: true,
      difficulty: true,
      track: true,
      primaryPatternId: true,
      payload: true,
      topicTags: true,
    },
    orderBy: { difficulty: 'asc' }, // Start with easier questions
    take: 5,
  })

  if (fallback.length > 0) {
    const randomIndex = Math.floor(Math.random() * fallback.length)
    return {
      success: true,
      question: fallback[randomIndex] as SelectedQuestion,
      selectionMethod: 'fallback',
      poolSize: fallback.length,
    }
  }

  return {
    success: false,
    question: null,
    selectionMethod: 'none',
    reason: 'No approved questions available',
  }
}

// =============================================================================
// TRACK-SPECIFIC SELECTION
// =============================================================================

/**
 * Get the starting question for a track
 */
export async function getTrackStartQuestion(
  userId: string,
  track: Track
): Promise<SelectionResult> {
  // Get user's completed questions in this track
  const completedAttempts = await prisma.userQuestionHistory.findMany({
    where: {
      userId,
      outcome: 'completed',
      question: { track },
    },
    select: { questionId: true },
  })
  const completedIds = new Set(completedAttempts.map(a => a.questionId))

  // Find easiest uncompleted question in the track
  const startQuestion = await prisma.question.findFirst({
    where: {
      lifecycleState: QuestionLifecycleState.approved,
      track,
      id: { notIn: Array.from(completedIds) },
    },
    select: {
      id: true,
      questionId: true,
      difficulty: true,
      track: true,
      primaryPatternId: true,
      payload: true,
      topicTags: true,
    },
    orderBy: { difficulty: 'asc' },
  })

  if (startQuestion) {
    return {
      success: true,
      question: startQuestion as SelectedQuestion,
      selectionMethod: 'pool',
      reason: 'Starting question for track',
    }
  }

  return {
    success: true,
    question: null,
    selectionMethod: 'none',
    reason: 'All questions in track completed',
  }
}

/**
 * Get user's progress in a track
 */
export async function getTrackProgress(
  userId: string,
  track: Track
): Promise<{
  completed: number
  total: number
  averageScore: number
  currentDifficulty: number
}> {
  const [completedCount, totalCount, attempts] = await Promise.all([
    prisma.userQuestionHistory.count({
      where: {
        userId,
        outcome: 'completed',
        question: { track },
      },
    }),
    prisma.question.count({
      where: {
        lifecycleState: QuestionLifecycleState.approved,
        track,
      },
    }),
    prisma.userQuestionHistory.findMany({
      where: {
        userId,
        outcome: 'completed',
        question: { track },
      },
      select: { score: true, difficulty: true },
      orderBy: { completedAt: 'desc' },
      take: 10,
    }),
  ])

  const scores = attempts.filter(a => a.score !== null).map(a => a.score!)
  const averageScore = scores.length > 0
    ? scores.reduce((sum, s) => sum + s, 0) / scores.length
    : 0

  const difficulties = attempts.filter(a => a.difficulty !== null).map(a => a.difficulty!)
  const currentDifficulty = difficulties.length > 0
    ? Math.round(difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length)
    : 1

  return {
    completed: completedCount,
    total: totalCount,
    averageScore: Math.round(averageScore),
    currentDifficulty,
  }
}
