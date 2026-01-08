/**
 * Question API Route Tests
 *
 * Tests for /api/question/next and /api/question/complete endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { EdgeType, QuestionLifecycleState } from '@prisma/client'

// Mock Prisma
const mockPrisma = vi.hoisted(() => ({
  userQuestionHistory: {
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  questionEdge: {
    findMany: vi.fn(),
  },
  question: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

// Import routes after mocking
import { POST as nextQuestion } from '../next/route'
import { POST as completeQuestion, GET as getHistory } from '../complete/route'

// Helper to create mock NextRequest
function createRequest(
  method: 'GET' | 'POST',
  body?: object,
  searchParams?: Record<string, string>
): NextRequest {
  const url = new URL('http://localhost:3000/api/question')
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }

  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  })
}

describe('Question API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/question/next', () => {
    describe('Validation', () => {
      it('returns 400 when userId is missing', async () => {
        const request = createRequest('POST', {
          mode: 'same',
        })

        const response = await nextQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('userId is required')
      })
    })

    describe('Edge-based selection', () => {
      it('returns question via edge when available', async () => {
        const mockQuestion = {
          id: 'q2-uuid',
          questionId: 'Q2',
          difficulty: 5,
          track: 'mechanics',
          primaryPatternId: 'pattern-1',
          payload: {},
          topicTags: ['force'],
        }

        mockPrisma.userQuestionHistory.findMany.mockResolvedValue([])
        mockPrisma.questionEdge.findMany.mockResolvedValue([
          {
            id: 'edge-1',
            fromQuestionId: 'q1-uuid',
            toQuestionId: 'q2-uuid',
            edgeType: EdgeType.same_difficulty,
            weight: 1.0,
            createdAt: new Date(),
            toQuestion: mockQuestion,
          },
        ])

        const request = createRequest('POST', {
          userId: 'user-1',
          currentQuestionId: 'q1-uuid',
          mode: 'same',
        })

        const response = await nextQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.question).toEqual(mockQuestion)
        expect(data.selectionMethod).toBe('edge')
        expect(data.edgeId).toBe('edge-1')
        expect(data.edgeType).toBe(EdgeType.same_difficulty)
      })

      it('skips completed questions in edge selection', async () => {
        const mockQuestion1 = {
          id: 'q2-uuid',
          questionId: 'Q2',
          difficulty: 5,
          track: 'mechanics',
          primaryPatternId: 'pattern-1',
          payload: {},
          topicTags: [],
        }
        const mockQuestion2 = {
          id: 'q3-uuid',
          questionId: 'Q3',
          difficulty: 5,
          track: 'mechanics',
          primaryPatternId: 'pattern-1',
          payload: {},
          topicTags: [],
        }

        // User has completed q2
        mockPrisma.userQuestionHistory.findMany.mockResolvedValue([
          { questionId: 'q2-uuid' },
        ])
        mockPrisma.questionEdge.findMany.mockResolvedValue([
          {
            id: 'edge-1',
            fromQuestionId: 'q1-uuid',
            toQuestionId: 'q2-uuid',
            edgeType: EdgeType.same_difficulty,
            weight: 1.0,
            createdAt: new Date(),
            toQuestion: mockQuestion1,
          },
          {
            id: 'edge-2',
            fromQuestionId: 'q1-uuid',
            toQuestionId: 'q3-uuid',
            edgeType: EdgeType.same_difficulty,
            weight: 0.8,
            createdAt: new Date(),
            toQuestion: mockQuestion2,
          },
        ])

        const request = createRequest('POST', {
          userId: 'user-1',
          currentQuestionId: 'q1-uuid',
          mode: 'same',
        })

        const response = await nextQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.question.id).toBe('q3-uuid')
        expect(data.selectionMethod).toBe('edge')
      })

      it('uses correct edge types for harder mode', async () => {
        mockPrisma.userQuestionHistory.findMany.mockResolvedValue([])
        mockPrisma.questionEdge.findMany.mockResolvedValue([])
        mockPrisma.question.findUnique.mockResolvedValue({
          primaryPatternId: 'pattern-1',
          difficulty: 5,
        })
        mockPrisma.question.findMany.mockResolvedValue([])

        const request = createRequest('POST', {
          userId: 'user-1',
          currentQuestionId: 'q1-uuid',
          mode: 'harder',
        })

        await nextQuestion(request)

        // Check that edge query uses harder edge type
        expect(mockPrisma.questionEdge.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              edgeType: { in: [EdgeType.harder] },
            }),
          })
        )
      })

      it('uses correct edge types for easier mode', async () => {
        mockPrisma.userQuestionHistory.findMany.mockResolvedValue([])
        mockPrisma.questionEdge.findMany.mockResolvedValue([])
        mockPrisma.question.findUnique.mockResolvedValue({
          primaryPatternId: 'pattern-1',
          difficulty: 5,
        })
        mockPrisma.question.findMany.mockResolvedValue([])

        const request = createRequest('POST', {
          userId: 'user-1',
          currentQuestionId: 'q1-uuid',
          mode: 'easier',
        })

        await nextQuestion(request)

        expect(mockPrisma.questionEdge.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              edgeType: { in: [EdgeType.easier] },
            }),
          })
        )
      })
    })

    describe('Pool-based selection', () => {
      it('falls back to pool when no edges match', async () => {
        const mockPoolQuestion = {
          id: 'pool-q-uuid',
          questionId: 'POOL-Q1',
          difficulty: 5,
          track: 'mechanics',
          primaryPatternId: 'pattern-1',
          payload: {},
          topicTags: [],
        }

        mockPrisma.userQuestionHistory.findMany.mockResolvedValue([])
        mockPrisma.questionEdge.findMany.mockResolvedValue([])
        mockPrisma.question.findUnique.mockResolvedValue({
          primaryPatternId: 'pattern-1',
          difficulty: 5,
        })
        mockPrisma.question.findMany.mockResolvedValue([mockPoolQuestion])

        const request = createRequest('POST', {
          userId: 'user-1',
          currentQuestionId: 'q1-uuid',
          mode: 'same',
        })

        const response = await nextQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.question.id).toBe('pool-q-uuid')
        expect(data.selectionMethod).toBe('pool')
        expect(data.poolSize).toBe(1)
      })

      it('returns pool question without currentQuestionId', async () => {
        const mockPoolQuestion = {
          id: 'pool-q-uuid',
          questionId: 'POOL-Q1',
          difficulty: 5,
          track: 'mechanics',
          primaryPatternId: null,
          payload: {},
          topicTags: [],
        }

        mockPrisma.userQuestionHistory.findMany.mockResolvedValue([])
        mockPrisma.question.findMany.mockResolvedValue([mockPoolQuestion])

        const request = createRequest('POST', {
          userId: 'user-1',
          mode: 'same',
        })

        const response = await nextQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.selectionMethod).toBe('pool')
      })

      it('applies track filter when specified', async () => {
        mockPrisma.userQuestionHistory.findMany.mockResolvedValue([])
        mockPrisma.question.findMany.mockResolvedValue([])

        const request = createRequest('POST', {
          userId: 'user-1',
          mode: 'same',
          track: 'electromagnetism',
        })

        await nextQuestion(request)

        expect(mockPrisma.question.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              track: 'electromagnetism',
            }),
          })
        )
      })
    })

    describe('No questions available', () => {
      it('returns null question when nothing available', async () => {
        mockPrisma.userQuestionHistory.findMany.mockResolvedValue([])
        mockPrisma.questionEdge.findMany.mockResolvedValue([])
        mockPrisma.question.findUnique.mockResolvedValue({
          primaryPatternId: 'pattern-1',
          difficulty: 5,
        })
        // Return empty for all pool queries
        mockPrisma.question.findMany.mockResolvedValue([])

        const request = createRequest('POST', {
          userId: 'user-1',
          currentQuestionId: 'q1-uuid',
          mode: 'same',
        })

        const response = await nextQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.question).toBeNull()
        expect(data.selectionMethod).toBe('none')
        expect(data.message).toBe('No available questions matching criteria')
      })
    })

    describe('Error handling', () => {
      it('returns 500 on database error', async () => {
        mockPrisma.userQuestionHistory.findMany.mockRejectedValue(
          new Error('Database connection failed')
        )

        const request = createRequest('POST', {
          userId: 'user-1',
          mode: 'same',
        })

        const response = await nextQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to get next question')
        expect(data.details).toBe('Database connection failed')
      })
    })
  })

  describe('POST /api/question/complete', () => {
    describe('Validation', () => {
      it('returns 400 when userId is missing', async () => {
        const request = createRequest('POST', {
          questionId: 'q1-uuid',
          outcome: 'completed',
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 0,
          durationSec: 120,
        })

        const response = await completeQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('userId, questionId, and outcome are required')
      })

      it('returns 400 when questionId is missing', async () => {
        const request = createRequest('POST', {
          userId: 'user-1',
          outcome: 'completed',
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 0,
          durationSec: 120,
        })

        const response = await completeQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('userId, questionId, and outcome are required')
      })

      it('returns 400 when outcome is missing', async () => {
        const request = createRequest('POST', {
          userId: 'user-1',
          questionId: 'q1-uuid',
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 0,
          durationSec: 120,
        })

        const response = await completeQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('userId, questionId, and outcome are required')
      })

      it('returns 400 for invalid outcome', async () => {
        const request = createRequest('POST', {
          userId: 'user-1',
          questionId: 'q1-uuid',
          outcome: 'invalid_outcome',
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 0,
          durationSec: 120,
        })

        const response = await completeQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toContain('Invalid outcome')
        expect(data.error).toContain('completed, abandoned, revealed, skipped')
      })
    })

    describe('Question not found', () => {
      it('returns 404 when question does not exist', async () => {
        mockPrisma.question.findUnique.mockResolvedValue(null)

        const request = createRequest('POST', {
          userId: 'user-1',
          questionId: 'nonexistent-uuid',
          outcome: 'completed',
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 0,
          durationSec: 120,
        })

        const response = await completeQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(404)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Question not found')
      })
    })

    describe('Successful completion', () => {
      it('records completion and returns history', async () => {
        mockPrisma.question.findUnique.mockResolvedValue({
          id: 'q1-uuid',
          questionId: 'Q1',
          primaryPatternId: 'pattern-1',
          difficulty: 5,
        })
        mockPrisma.userQuestionHistory.count.mockResolvedValue(0)
        mockPrisma.userQuestionHistory.create.mockResolvedValue({
          id: 'history-1',
          userId: 'user-1',
          questionId: 'q1-uuid',
          attemptNumber: 1,
          outcome: 'completed',
          score: 85,
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 1,
          durationSec: 120,
        })
        mockPrisma.questionEdge.findMany.mockResolvedValue([])

        const request = createRequest('POST', {
          userId: 'user-1',
          questionId: 'q1-uuid',
          outcome: 'completed',
          score: 85,
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 1,
          durationSec: 120,
        })

        const response = await completeQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.historyId).toBe('history-1')
        expect(data.attemptNumber).toBe(1)
        expect(data.outcome).toBe('completed')
        expect(data.stats).toEqual({
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 1,
          durationSec: 120,
          score: 85,
        })
      })

      it('increments attempt number for repeat attempts', async () => {
        mockPrisma.question.findUnique.mockResolvedValue({
          id: 'q1-uuid',
          questionId: 'Q1',
          primaryPatternId: 'pattern-1',
          difficulty: 5,
        })
        // User has 2 existing attempts
        mockPrisma.userQuestionHistory.count.mockResolvedValue(2)
        mockPrisma.userQuestionHistory.create.mockResolvedValue({
          id: 'history-3',
          userId: 'user-1',
          questionId: 'q1-uuid',
          attemptNumber: 3,
          outcome: 'completed',
        })
        mockPrisma.questionEdge.findMany.mockResolvedValue([])

        const request = createRequest('POST', {
          userId: 'user-1',
          questionId: 'q1-uuid',
          outcome: 'completed',
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 0,
          durationSec: 100,
        })

        const response = await completeQuestion(request)
        const data = await response.json()

        expect(data.attemptNumber).toBe(3)
      })

      it('records abandoned outcome', async () => {
        mockPrisma.question.findUnique.mockResolvedValue({
          id: 'q1-uuid',
          questionId: 'Q1',
          primaryPatternId: 'pattern-1',
          difficulty: 5,
        })
        mockPrisma.userQuestionHistory.count.mockResolvedValue(0)
        mockPrisma.userQuestionHistory.create.mockResolvedValue({
          id: 'history-1',
          outcome: 'abandoned',
        })

        const request = createRequest('POST', {
          userId: 'user-1',
          questionId: 'q1-uuid',
          outcome: 'abandoned',
          stepsCompleted: 1,
          stepsTotal: 3,
          hintsUsed: 2,
          durationSec: 300,
        })

        const response = await completeQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.outcome).toBe('abandoned')
        // Should not check for unlocks on non-completed
        expect(data.unlockedQuestionIds).toEqual([])
      })
    })

    describe('Prerequisite unlocking', () => {
      it('returns unlocked questions when prerequisites met', async () => {
        mockPrisma.question.findUnique.mockResolvedValue({
          id: 'q1-uuid',
          questionId: 'Q1',
          primaryPatternId: 'pattern-1',
          difficulty: 5,
        })
        mockPrisma.userQuestionHistory.count.mockResolvedValue(0)
        mockPrisma.userQuestionHistory.create.mockResolvedValue({
          id: 'history-1',
          outcome: 'completed',
        })
        // Q1 is prerequisite for Q2
        mockPrisma.questionEdge.findMany.mockResolvedValue([
          {
            toQuestionId: 'q2-uuid',
            toQuestion: {
              id: 'q2-uuid',
              questionId: 'Q2',
              incomingEdges: [{ fromQuestionId: 'q1-uuid' }],
            },
          },
        ])
        // User has now completed Q1
        mockPrisma.userQuestionHistory.findMany.mockResolvedValue([
          { questionId: 'q1-uuid' },
        ])

        const request = createRequest('POST', {
          userId: 'user-1',
          questionId: 'q1-uuid',
          outcome: 'completed',
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 0,
          durationSec: 120,
        })

        const response = await completeQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.unlockedQuestionIds).toContain('Q2')
      })

      it('does not unlock when not all prerequisites met', async () => {
        mockPrisma.question.findUnique.mockResolvedValue({
          id: 'q1-uuid',
          questionId: 'Q1',
          primaryPatternId: 'pattern-1',
          difficulty: 5,
        })
        mockPrisma.userQuestionHistory.count.mockResolvedValue(0)
        mockPrisma.userQuestionHistory.create.mockResolvedValue({
          id: 'history-1',
          outcome: 'completed',
        })
        // Q3 requires both Q1 and Q2
        mockPrisma.questionEdge.findMany.mockResolvedValue([
          {
            toQuestionId: 'q3-uuid',
            toQuestion: {
              id: 'q3-uuid',
              questionId: 'Q3',
              incomingEdges: [
                { fromQuestionId: 'q1-uuid' },
                { fromQuestionId: 'q2-uuid' },
              ],
            },
          },
        ])
        // User only completed Q1, not Q2
        mockPrisma.userQuestionHistory.findMany.mockResolvedValue([
          { questionId: 'q1-uuid' },
        ])

        const request = createRequest('POST', {
          userId: 'user-1',
          questionId: 'q1-uuid',
          outcome: 'completed',
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 0,
          durationSec: 120,
        })

        const response = await completeQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.unlockedQuestionIds).not.toContain('Q3')
        expect(data.unlockedQuestionIds).toEqual([])
      })
    })

    describe('Error handling', () => {
      it('returns 500 on database error', async () => {
        mockPrisma.question.findUnique.mockRejectedValue(
          new Error('Database error')
        )

        const request = createRequest('POST', {
          userId: 'user-1',
          questionId: 'q1-uuid',
          outcome: 'completed',
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 0,
          durationSec: 120,
        })

        const response = await completeQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to record completion')
      })

      it('returns 409 on duplicate attempt', async () => {
        mockPrisma.question.findUnique.mockResolvedValue({
          id: 'q1-uuid',
          questionId: 'Q1',
          primaryPatternId: 'pattern-1',
          difficulty: 5,
        })
        mockPrisma.userQuestionHistory.count.mockResolvedValue(0)
        mockPrisma.userQuestionHistory.create.mockRejectedValue(
          new Error('Unique constraint violation')
        )

        const request = createRequest('POST', {
          userId: 'user-1',
          questionId: 'q1-uuid',
          outcome: 'completed',
          stepsCompleted: 3,
          stepsTotal: 3,
          hintsUsed: 0,
          durationSec: 120,
        })

        const response = await completeQuestion(request)
        const data = await response.json()

        expect(response.status).toBe(409)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Duplicate attempt record')
      })
    })
  })

  describe('GET /api/question/complete', () => {
    describe('Validation', () => {
      it('returns 400 when userId is missing', async () => {
        const request = createRequest('GET', undefined, {})

        const response = await getHistory(request)
        const data = await response.json()

        expect(response.status).toBe(400)
        expect(data.success).toBe(false)
        expect(data.error).toBe('userId is required')
      })
    })

    describe('Get history', () => {
      it('returns all history for user', async () => {
        const mockHistory = [
          {
            id: 'history-1',
            outcome: 'completed',
            score: 90,
            attemptNumber: 1,
            startedAt: new Date('2025-01-01'),
            completedAt: new Date('2025-01-01'),
            stepsCompleted: 3,
            stepsTotal: 3,
            hintsUsed: 0,
            durationSec: 120,
            question: {
              questionId: 'Q1',
              primaryPatternId: 'pattern-1',
              difficulty: 5,
              track: 'mechanics',
            },
          },
          {
            id: 'history-2',
            outcome: 'abandoned',
            score: null,
            attemptNumber: 1,
            startedAt: new Date('2025-01-02'),
            completedAt: new Date('2025-01-02'),
            stepsCompleted: 1,
            stepsTotal: 3,
            hintsUsed: 2,
            durationSec: 300,
            question: {
              questionId: 'Q2',
              primaryPatternId: 'pattern-2',
              difficulty: 6,
              track: 'mechanics',
            },
          },
        ]

        mockPrisma.userQuestionHistory.findMany.mockResolvedValue(mockHistory)

        const request = createRequest('GET', undefined, { userId: 'user-1' })

        const response = await getHistory(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.history).toHaveLength(2)
        expect(data.count).toBe(2)
        expect(data.history[0].question.questionId).toBe('Q1')
      })

      it('filters by questionId when provided', async () => {
        const mockHistory = [
          {
            id: 'history-1',
            outcome: 'completed',
            score: 90,
            attemptNumber: 1,
            startedAt: new Date('2025-01-01'),
            completedAt: new Date('2025-01-01'),
            stepsCompleted: 3,
            stepsTotal: 3,
            hintsUsed: 0,
            durationSec: 120,
            question: {
              questionId: 'Q1',
              primaryPatternId: 'pattern-1',
              difficulty: 5,
              track: 'mechanics',
            },
          },
        ]

        mockPrisma.userQuestionHistory.findMany.mockResolvedValue(mockHistory)

        const request = createRequest('GET', undefined, {
          userId: 'user-1',
          questionId: 'q1-uuid',
        })

        const response = await getHistory(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.history).toHaveLength(1)

        // Verify the query was filtered by questionId
        expect(mockPrisma.userQuestionHistory.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { userId: 'user-1', questionId: 'q1-uuid' },
          })
        )
      })

      it('returns empty array when no history exists', async () => {
        mockPrisma.userQuestionHistory.findMany.mockResolvedValue([])

        const request = createRequest('GET', undefined, { userId: 'user-1' })

        const response = await getHistory(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.history).toEqual([])
        expect(data.count).toBe(0)
      })
    })

    describe('Error handling', () => {
      it('returns 500 on database error', async () => {
        mockPrisma.userQuestionHistory.findMany.mockRejectedValue(
          new Error('Database error')
        )

        const request = createRequest('GET', undefined, { userId: 'user-1' })

        const response = await getHistory(request)
        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.success).toBe(false)
        expect(data.error).toBe('Failed to fetch history')
      })
    })
  })
})
