import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Hoisted mock for warmUpService
const mockWarmUpService = vi.hoisted(() => ({
  assignWarmUp: vi.fn(),
  getStatus: vi.fn(),
  startWarmUp: vi.fn(),
  getBlock: vi.fn(),
  getDrillItems: vi.fn(),
  submitItem: vi.fn(),
  completeBlock: vi.fn(),
  skipWarmUp: vi.fn(),
}))

// Mock the warmUpService module
vi.mock('@/lib/warmUp/warm-up-service', () => ({
  warmUpService: mockWarmUpService,
}))

// Import route handlers after mocking
import { POST as assignPOST } from '../assign/route'
import { GET as statusGET } from '../status/route'
import { POST as startPOST } from '../start/route'
import { GET as drillsGET } from '../drills/[blockId]/route'
import { POST as submitPOST } from '../submit/route'
import { POST as completeBlockPOST } from '../complete-block/route'
import { POST as skipPOST } from '../skip/route'

describe('Warmup API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ============================================================================
  // POST /api/warmup/assign
  // ============================================================================
  describe('POST /api/warmup/assign', () => {
    const createRequest = (body: object) =>
      new NextRequest('http://localhost/api/warmup/assign', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })

    it('assigns warmup blocks successfully', async () => {
      const mockSession = {
        id: 'warmup_123',
        tenantId: 'default',
        userId: 'test-user',
        date: '2026-01-08',
        assignedBlocks: [{ blockId: 'warmup-vectors', order: 1, status: 'pending' }],
        status: 'assigned',
      }

      const mockSelection = {
        selectedBlocks: [{ id: 'warmup-vectors', topicId: 'vectors', title: 'Vector Basics' }],
        totalDurationMinutes: 3,
        selectionReason: 'Reviewing decayed topics',
        priorityTopics: ['vectors'],
      }

      mockWarmUpService.assignWarmUp.mockResolvedValueOnce({
        session: mockSession,
        selection: mockSelection,
        alreadyAssigned: false,
      })

      const request = createRequest({
        userId: 'test-user',
        patternStates: [
          { patternId: 'vectors', topicId: 'vectors', mastery: 0.3, decayScore: 0.7, daysSinceLastSeen: 5 },
        ],
      })

      const response = await assignPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.session).toEqual(mockSession)
      expect(data.selection).toEqual(mockSelection)
      expect(data.alreadyAssigned).toBe(false)
      expect(mockWarmUpService.assignWarmUp).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ patternId: 'vectors' }),
        ]),
        [],
        'test-user'
      )
    })

    it('uses default userId when not provided', async () => {
      mockWarmUpService.assignWarmUp.mockResolvedValueOnce({
        session: null,
        selection: null,
        alreadyAssigned: false,
      })

      const request = createRequest({ patternStates: [] })

      await assignPOST(request)

      expect(mockWarmUpService.assignWarmUp).toHaveBeenCalledWith([], [], 'anonymous')
    })

    it('returns already assigned when session exists', async () => {
      const existingSession = { id: 'existing_123', status: 'assigned' }

      mockWarmUpService.assignWarmUp.mockResolvedValueOnce({
        session: existingSession,
        selection: null,
        alreadyAssigned: true,
      })

      const request = createRequest({ userId: 'test-user', patternStates: [] })

      const response = await assignPOST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.alreadyAssigned).toBe(true)
    })

    it('handles errors gracefully', async () => {
      mockWarmUpService.assignWarmUp.mockRejectedValueOnce(new Error('Database error'))

      const request = createRequest({ userId: 'test-user' })

      const response = await assignPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database error')
    })
  })

  // ============================================================================
  // GET /api/warmup/status
  // ============================================================================
  describe('GET /api/warmup/status', () => {
    const createRequest = (params: Record<string, string> = {}) => {
      const searchParams = new URLSearchParams(params)
      return new NextRequest(`http://localhost/api/warmup/status?${searchParams}`)
    }

    it('returns status when session exists', async () => {
      const mockStatus = {
        hasSession: true,
        session: { id: 'warmup_123', status: 'in_progress' },
        progress: { completedBlocks: 1, totalBlocks: 2, percentComplete: 50 },
        canSkip: true,
      }

      mockWarmUpService.getStatus.mockResolvedValueOnce(mockStatus)

      const request = createRequest({ userId: 'test-user' })

      const response = await statusGET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.hasSession).toBe(true)
      expect(data.session.id).toBe('warmup_123')
      expect(data.progress.percentComplete).toBe(50)
    })

    it('returns no session when none assigned', async () => {
      mockWarmUpService.getStatus.mockResolvedValueOnce({
        hasSession: false,
        session: null,
        progress: null,
        canSkip: true,
      })

      const request = createRequest()

      const response = await statusGET(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.hasSession).toBe(false)
      expect(data.session).toBeNull()
    })

    it('uses anonymous as default userId', async () => {
      mockWarmUpService.getStatus.mockResolvedValueOnce({
        hasSession: false,
        session: null,
        progress: null,
        canSkip: true,
      })

      const request = createRequest({})

      await statusGET(request)

      expect(mockWarmUpService.getStatus).toHaveBeenCalledWith('anonymous')
    })

    it('handles errors gracefully', async () => {
      mockWarmUpService.getStatus.mockRejectedValueOnce(new Error('Service unavailable'))

      const request = createRequest({ userId: 'test-user' })

      const response = await statusGET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Service unavailable')
    })
  })

  // ============================================================================
  // POST /api/warmup/start
  // ============================================================================
  describe('POST /api/warmup/start', () => {
    const createRequest = (body: object) =>
      new NextRequest('http://localhost/api/warmup/start', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })

    it('starts a session successfully', async () => {
      const mockResult = {
        session: { id: 'warmup_123', status: 'in_progress' },
        firstBlockId: 'warmup-vectors',
      }

      mockWarmUpService.startWarmUp.mockResolvedValueOnce(mockResult)

      const request = createRequest({
        sessionId: 'warmup_123',
        userId: 'test-user',
      })

      const response = await startPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.session.status).toBe('in_progress')
      expect(data.firstBlockId).toBe('warmup-vectors')
    })

    it('returns 400 when sessionId is missing', async () => {
      const request = createRequest({ userId: 'test-user' })

      const response = await startPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('sessionId is required')
    })

    it('handles session not found error', async () => {
      mockWarmUpService.startWarmUp.mockRejectedValueOnce(
        new Error('Warm-up session not found: invalid_123')
      )

      const request = createRequest({
        sessionId: 'invalid_123',
        userId: 'test-user',
      })

      const response = await startPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('not found')
    })
  })

  // ============================================================================
  // GET /api/warmup/drills/[blockId]
  // ============================================================================
  describe('GET /api/warmup/drills/[blockId]', () => {
    const createRequest = (blockId: string) =>
      new NextRequest(`http://localhost/api/warmup/drills/${blockId}`)

    it('returns drill items for a block', async () => {
      const mockBlock = {
        id: 'warmup-vectors',
        topicId: 'vectors',
        title: 'Vector Basics',
      }

      const mockDrillItems = [
        {
          id: 'drill-1',
          warmUpBlockId: 'warmup-vectors',
          promptText: 'What is the x-component of a 10N force at 30°?',
          type: 'mcq',
          choices: ['5N', '8.66N', '10N', '5√3N'],
          correctAnswer: '8.66N',
        },
        {
          id: 'drill-2',
          warmUpBlockId: 'warmup-vectors',
          promptText: 'Calculate the magnitude of F if Fx=3 and Fy=4',
          type: 'short',
          correctAnswer: '5',
        },
      ]

      mockWarmUpService.getBlock.mockResolvedValueOnce(mockBlock)
      mockWarmUpService.getDrillItems.mockResolvedValueOnce(mockDrillItems)

      const request = createRequest('warmup-vectors')

      const response = await drillsGET(request, { params: Promise.resolve({ blockId: 'warmup-vectors' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.drillItems).toHaveLength(2)
      expect(data.drillItems[0].promptText).toContain('x-component')
      expect(data.block).toEqual(mockBlock)
    })

    it('returns 404 when block not found', async () => {
      mockWarmUpService.getBlock.mockResolvedValueOnce(null)
      mockWarmUpService.getDrillItems.mockResolvedValueOnce([])

      const request = createRequest('nonexistent-block')

      const response = await drillsGET(request, { params: Promise.resolve({ blockId: 'nonexistent-block' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Block not found')
    })

    it('returns drillItems with block info', async () => {
      const mockBlock = { id: 'empty-block', topicId: 'test', title: 'Test Block' }
      mockWarmUpService.getBlock.mockResolvedValueOnce(mockBlock)
      mockWarmUpService.getDrillItems.mockResolvedValueOnce([])

      const request = createRequest('empty-block')

      const response = await drillsGET(request, { params: Promise.resolve({ blockId: 'empty-block' }) })
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.drillItems).toEqual([])
      expect(data.block).toEqual(mockBlock)
    })

    it('handles errors gracefully', async () => {
      mockWarmUpService.getBlock.mockRejectedValueOnce(new Error('Database error'))

      const request = createRequest('invalid-block')

      const response = await drillsGET(request, { params: Promise.resolve({ blockId: 'invalid-block' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  // ============================================================================
  // POST /api/warmup/submit
  // ============================================================================
  describe('POST /api/warmup/submit', () => {
    const createRequest = (body: object) =>
      new NextRequest('http://localhost/api/warmup/submit', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })

    it('submits correct answer successfully', async () => {
      mockWarmUpService.submitItem.mockResolvedValueOnce({
        isCorrect: true,
        nextItemId: 'drill-2',
        blockProgress: { completed: 1, total: 3 },
      })

      const request = createRequest({
        sessionId: 'warmup_123',
        userId: 'test-user',
        blockId: 'warmup-vectors',
        itemId: 'drill-1',
        userAnswer: '8.66N',
        correctAnswer: '8.66N',
        timeSpentSeconds: 15,
      })

      const response = await submitPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.isCorrect).toBe(true)
      expect(data.nextItemId).toBe('drill-2')
    })

    it('submits incorrect answer', async () => {
      mockWarmUpService.submitItem.mockResolvedValueOnce({
        isCorrect: false,
        nextItemId: 'drill-2',
        blockProgress: { completed: 1, total: 3 },
      })

      const request = createRequest({
        sessionId: 'warmup_123',
        userId: 'test-user',
        blockId: 'warmup-vectors',
        itemId: 'drill-1',
        userAnswer: '5N',
        correctAnswer: '8.66N',
        timeSpentSeconds: 20,
      })

      const response = await submitPOST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.isCorrect).toBe(false)
    })

    it('returns 400 when required fields are missing', async () => {
      const request = createRequest({
        sessionId: 'warmup_123',
        // missing other required fields
      })

      const response = await submitPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
    })
  })

  // ============================================================================
  // POST /api/warmup/complete-block
  // ============================================================================
  describe('POST /api/warmup/complete-block', () => {
    const createRequest = (body: object) =>
      new NextRequest('http://localhost/api/warmup/complete-block', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })

    it('completes a block successfully', async () => {
      mockWarmUpService.completeBlock.mockResolvedValueOnce({
        session: { id: 'warmup_123', status: 'in_progress' },
        blockScore: 85,
        nextBlockId: 'warmup-trig',
      })

      const request = createRequest({
        sessionId: 'warmup_123',
        userId: 'test-user',
        blockId: 'warmup-vectors',
      })

      const response = await completeBlockPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.blockScore).toBe(85)
      expect(data.nextBlockId).toBe('warmup-trig')
    })

    it('completes session when last block is completed', async () => {
      mockWarmUpService.completeBlock.mockResolvedValueOnce({
        session: { id: 'warmup_123', status: 'completed' },
        blockScore: 100,
        nextBlockId: null,
      })

      const request = createRequest({
        sessionId: 'warmup_123',
        userId: 'test-user',
        blockId: 'warmup-last',
      })

      const response = await completeBlockPOST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.session.status).toBe('completed')
      expect(data.nextBlockId).toBeNull()
    })

    it('returns 400 when sessionId or blockId is missing', async () => {
      const request = createRequest({
        userId: 'test-user',
        // missing both sessionId and blockId
      })

      const response = await completeBlockPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('sessionId and blockId are required')
    })

    it('returns 400 when only sessionId provided', async () => {
      const request = createRequest({
        sessionId: 'warmup_123',
        userId: 'test-user',
        // missing blockId
      })

      const response = await completeBlockPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('sessionId and blockId are required')
    })
  })

  // ============================================================================
  // POST /api/warmup/skip
  // ============================================================================
  describe('POST /api/warmup/skip', () => {
    const createRequest = (body: object) =>
      new NextRequest('http://localhost/api/warmup/skip', {
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })

    it('skips a session successfully', async () => {
      mockWarmUpService.skipWarmUp.mockResolvedValueOnce({
        skipped: true,
        canSkipAgainAt: '2026-01-09',
      })

      const request = createRequest({
        sessionId: 'warmup_123',
        userId: 'test-user',
        reason: 'No time today',
      })

      const response = await skipPOST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.skipped).toBe(true)
    })

    it('skips without reason', async () => {
      mockWarmUpService.skipWarmUp.mockResolvedValueOnce({
        skipped: true,
        canSkipAgainAt: '2026-01-09',
      })

      const request = createRequest({
        sessionId: 'warmup_123',
        userId: 'test-user',
      })

      const response = await skipPOST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(mockWarmUpService.skipWarmUp).toHaveBeenCalledWith(
        'warmup_123',
        undefined,
        'test-user'
      )
    })

    it('returns 400 when sessionId is missing', async () => {
      const request = createRequest({
        userId: 'test-user',
        reason: 'Test',
      })

      const response = await skipPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('sessionId is required')
    })

    it('handles skip limit exceeded', async () => {
      mockWarmUpService.skipWarmUp.mockRejectedValueOnce(
        new Error('Skip limit exceeded for this week')
      )

      const request = createRequest({
        sessionId: 'warmup_123',
        userId: 'test-user',
      })

      const response = await skipPOST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('Skip limit')
    })
  })
})
