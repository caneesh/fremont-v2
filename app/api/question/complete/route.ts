import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { AttemptOutcome, EdgeType } from '@prisma/client'

/**
 * recordCompletion API
 *
 * Records a user's attempt on a question and returns:
 * - The created history record
 * - Any newly unlocked questions (via prerequisite edges)
 */

interface CompleteQuestionRequest {
  userId: string
  questionId: string
  outcome: AttemptOutcome
  score?: number
  stepsCompleted: number
  stepsTotal: number
  hintsUsed: number
  durationSec: number
}

export async function POST(request: NextRequest) {
  try {
    const body: CompleteQuestionRequest = await request.json()
    const {
      userId,
      questionId,
      outcome,
      score,
      stepsCompleted,
      stepsTotal,
      hintsUsed,
      durationSec,
    } = body

    // Validate required fields
    if (!userId || !questionId || !outcome) {
      return NextResponse.json(
        { success: false, error: 'userId, questionId, and outcome are required' },
        { status: 400 }
      )
    }

    // Validate outcome
    const validOutcomes: AttemptOutcome[] = ['completed', 'abandoned', 'revealed', 'skipped']
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { success: false, error: `Invalid outcome. Must be one of: ${validOutcomes.join(', ')}` },
        { status: 400 }
      )
    }

    // Get question details for denormalization
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      select: {
        id: true,
        questionId: true,
        primaryPatternId: true,
        difficulty: true,
      },
    })

    if (!question) {
      return NextResponse.json(
        { success: false, error: 'Question not found' },
        { status: 404 }
      )
    }

    // Count existing attempts for this user/question
    const existingAttempts = await prisma.userQuestionHistory.count({
      where: { userId, questionId },
    })

    const attemptNumber = existingAttempts + 1

    // Create the history record
    const history = await prisma.userQuestionHistory.create({
      data: {
        userId,
        questionId,
        attemptNumber,
        outcome,
        score,
        startedAt: new Date(Date.now() - durationSec * 1000), // Calculate start time
        completedAt: new Date(),
        durationSec,
        stepsCompleted,
        stepsTotal,
        hintsUsed,
        patternId: question.primaryPatternId,
        difficulty: question.difficulty,
      },
    })

    // If completed, find newly unlocked questions (via prerequisite edges)
    let unlockedQuestionIds: string[] = []

    if (outcome === 'completed') {
      // Get all questions that have this question as a prerequisite
      const prerequisiteEdges = await prisma.questionEdge.findMany({
        where: {
          fromQuestionId: questionId,
          edgeType: EdgeType.prerequisite,
        },
        select: {
          toQuestionId: true,
          toQuestion: {
            select: {
              id: true,
              questionId: true,
              // Get all prerequisite edges for the target
              incomingEdges: {
                where: { edgeType: EdgeType.prerequisite },
                select: { fromQuestionId: true },
              },
            },
          },
        },
      })

      // For each potential unlock, check if ALL prerequisites are met
      for (const edge of prerequisiteEdges) {
        const targetQuestion = edge.toQuestion
        const allPrereqIds = targetQuestion.incomingEdges.map(e => e.fromQuestionId)

        // Get user's completed questions
        const userCompleted = await prisma.userQuestionHistory.findMany({
          where: {
            userId,
            questionId: { in: allPrereqIds },
            outcome: 'completed',
          },
          select: { questionId: true },
        })

        const completedPrereqIds = new Set(userCompleted.map(h => h.questionId))

        // Check if all prerequisites are completed
        const allPrereqsMet = allPrereqIds.every(id => completedPrereqIds.has(id))

        if (allPrereqsMet) {
          unlockedQuestionIds.push(targetQuestion.questionId)
        }
      }
    }

    return NextResponse.json({
      success: true,
      historyId: history.id,
      attemptNumber,
      outcome,
      unlockedQuestionIds,
      stats: {
        stepsCompleted,
        stepsTotal,
        hintsUsed,
        durationSec,
        score,
      },
    })

  } catch (error) {
    console.error('Error in recordCompletion:', error)

    // Handle unique constraint violation (duplicate attempt)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'Duplicate attempt record' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to record completion',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve user's history for a question
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const questionId = searchParams.get('questionId')

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    const where: Parameters<typeof prisma.userQuestionHistory.findMany>[0]['where'] = { userId }

    if (questionId) {
      where.questionId = questionId
    }

    const history = await prisma.userQuestionHistory.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      take: 100,
      include: {
        question: {
          select: {
            questionId: true,
            primaryPatternId: true,
            difficulty: true,
            track: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      history,
      count: history.length,
    })

  } catch (error) {
    console.error('Error fetching history:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
