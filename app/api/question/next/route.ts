import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { EdgeType, QuestionLifecycleState } from '@prisma/client'

/**
 * getNextQuestion API
 *
 * Selection algorithm (deterministic):
 * 1. Get user's completed question IDs
 * 2. Get current question's outgoing edges filtered by mode
 * 3. Filter: target must be approved AND not completed by user
 * 4. Sort by: weight DESC, then createdAt ASC
 * 5. Return first match
 * 6. Fallback: pool query (same pattern, similar difficulty, not completed)
 * 7. If no pool: return null
 */

type SelectionMode = 'same' | 'harder' | 'easier'

interface NextQuestionRequest {
  userId: string
  currentQuestionId?: string
  mode: SelectionMode
  track?: string
}

// Map mode to allowed edge types
function getEdgeTypesForMode(mode: SelectionMode): EdgeType[] {
  switch (mode) {
    case 'same':
      return [EdgeType.same_difficulty, EdgeType.same_pattern, EdgeType.variation]
    case 'harder':
      return [EdgeType.harder]
    case 'easier':
      return [EdgeType.easier]
    default:
      return [EdgeType.same_difficulty]
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: NextQuestionRequest = await request.json()
    const { userId, currentQuestionId, mode, track } = body

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    // 1. Get user's completed question IDs
    const completedAttempts = await prisma.userQuestionHistory.findMany({
      where: {
        userId,
        outcome: 'completed',
      },
      select: { questionId: true },
    })
    const completedIds = new Set(completedAttempts.map(a => a.questionId))

    // 2. If we have a current question, try edge-based selection
    if (currentQuestionId) {
      const edgeTypes = getEdgeTypesForMode(mode)

      // Get outgoing edges of allowed types
      const edges = await prisma.questionEdge.findMany({
        where: {
          fromQuestionId: currentQuestionId,
          edgeType: { in: edgeTypes },
          toQuestion: {
            lifecycleState: QuestionLifecycleState.approved,
          },
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

      // 3. Filter out completed questions
      for (const edge of edges) {
        if (!completedIds.has(edge.toQuestionId)) {
          return NextResponse.json({
            success: true,
            question: edge.toQuestion,
            selectionMethod: 'edge',
            edgeId: edge.id,
            edgeType: edge.edgeType,
          })
        }
      }
    }

    // 4. Fallback: pool-based selection
    // Get current question's pattern and difficulty for pool matching
    let patternId: string | null = null
    let baseDifficulty = 5

    if (currentQuestionId) {
      const currentQuestion = await prisma.question.findUnique({
        where: { id: currentQuestionId },
        select: { primaryPatternId: true, difficulty: true },
      })
      if (currentQuestion) {
        patternId = currentQuestion.primaryPatternId
        baseDifficulty = currentQuestion.difficulty
      }
    }

    // Calculate difficulty range based on mode
    let minDifficulty = baseDifficulty
    let maxDifficulty = baseDifficulty

    switch (mode) {
      case 'same':
        minDifficulty = Math.max(1, baseDifficulty - 1)
        maxDifficulty = Math.min(10, baseDifficulty + 1)
        break
      case 'harder':
        minDifficulty = baseDifficulty + 1
        maxDifficulty = Math.min(10, baseDifficulty + 3)
        break
      case 'easier':
        minDifficulty = Math.max(1, baseDifficulty - 3)
        maxDifficulty = baseDifficulty - 1
        break
    }

    // Build pool query
    const poolQuery: Parameters<typeof prisma.question.findMany>[0] = {
      where: {
        lifecycleState: QuestionLifecycleState.approved,
        id: { notIn: Array.from(completedIds) },
        difficulty: {
          gte: minDifficulty,
          lte: maxDifficulty,
        },
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
      take: 5,
    }

    // Prefer same pattern if available
    if (patternId) {
      poolQuery.where!.primaryPatternId = patternId
    }

    // Filter by track if specified
    if (track) {
      poolQuery.where!.track = track as any
    }

    let poolQuestions = await prisma.question.findMany(poolQuery)

    // If no questions with same pattern, try without pattern filter
    if (poolQuestions.length === 0 && patternId) {
      delete poolQuery.where!.primaryPatternId
      poolQuestions = await prisma.question.findMany(poolQuery)
    }

    // If still no questions, expand difficulty range
    if (poolQuestions.length === 0) {
      poolQuery.where!.difficulty = {
        gte: 1,
        lte: 10,
      }
      poolQuestions = await prisma.question.findMany(poolQuery)
    }

    if (poolQuestions.length > 0) {
      // Random selection from pool
      const randomIndex = Math.floor(Math.random() * poolQuestions.length)
      return NextResponse.json({
        success: true,
        question: poolQuestions[randomIndex],
        selectionMethod: 'pool',
        poolSize: poolQuestions.length,
      })
    }

    // No questions available
    return NextResponse.json({
      success: true,
      question: null,
      selectionMethod: 'none',
      message: 'No available questions matching criteria',
    })

  } catch (error) {
    console.error('Error in getNextQuestion:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to get next question',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
