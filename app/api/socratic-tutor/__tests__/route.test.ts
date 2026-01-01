import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Hoisted mock function
const mockCreate = vi.hoisted(() => vi.fn())

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class MockAnthropic {
      messages = {
        create: mockCreate,
      }
    },
  }
})

// Import after mocking
import { GET, POST } from '../route'

describe('Socratic Tutor API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockReset()
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
  })

  describe('GET /api/socratic-tutor (question generation)', () => {
    const createGetRequest = (params: Record<string, string>) => {
      const searchParams = new URLSearchParams(params)
      return new NextRequest(`http://localhost/api/socratic-tutor?${searchParams}`)
    }

    it('returns comprehension questions for valid request', async () => {
      const mockResponse = {
        questions: [
          {
            id: 'q1',
            question: 'Why does the normal force point perpendicular to the surface?',
            hint: 'Think about contact forces',
          },
        ],
      }

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      })

      const request = createGetRequest({
        problemText: 'A block on an incline',
        stepTitle: 'Draw FBD',
        stepContent: 'Identify forces acting on the block',
        concepts: 'normal force, weight',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.questions).toBeDefined()
      expect(data.questions).toHaveLength(1)
      expect(data.questions[0].question).toContain('normal force')
    })

    it('handles empty parameters gracefully', async () => {
      const mockResponse = {
        questions: [
          { id: 'q1', question: 'What is the key concept here?', hint: 'Think carefully' },
        ],
      }

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      })

      const request = createGetRequest({})

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.questions).toBeDefined()
    })

    it('uses correct model and parameters', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"questions": []}' }],
      })

      const request = createGetRequest({
        problemText: 'Test problem',
        stepTitle: 'Test step',
        stepContent: 'Test content',
        concepts: 'test concepts',
      })

      await GET(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          temperature: 0.3,
        })
      )
    })

    it('includes step context in prompt', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"questions": []}' }],
      })

      const request = createGetRequest({
        problemText: 'A 5kg block on a 30 degree incline',
        stepTitle: 'Force Decomposition',
        stepContent: 'Break weight into components',
        concepts: 'trigonometry, vectors',
      })

      await GET(request)

      const callArgs = mockCreate.mock.calls[0][0]
      const prompt = callArgs.messages[0].content
      expect(prompt).toContain('5kg block')
      expect(prompt).toContain('Force Decomposition')
      expect(prompt).toContain('trigonometry')
    })

    it('extracts JSON from response with surrounding text', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: 'Here is the response:\n{"questions": [{"id": "q1", "question": "Test?", "hint": "Hint"}]}\nEnd of response',
        }],
      })

      const request = createGetRequest({
        problemText: 'Test',
        stepTitle: 'Test',
        stepContent: 'Test',
        concepts: 'Test',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.questions[0].question).toBe('Test?')
    })

    it('returns 500 on non-text response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'test' }],
      })

      const request = createGetRequest({
        problemText: 'Test',
        stepTitle: 'Test',
        stepContent: 'Test',
        concepts: 'Test',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate questions')
    })

    it('returns 500 when JSON parsing fails', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'This is not JSON at all' }],
      })

      const request = createGetRequest({
        problemText: 'Test',
        stepTitle: 'Test',
        stepContent: 'Test',
        concepts: 'Test',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate questions')
      expect(data.details).toContain('parse')
    })

    it('returns 500 on API error with details', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Rate limit exceeded'))

      const request = createGetRequest({
        problemText: 'Test',
        stepTitle: 'Test',
        stepContent: 'Test',
        concepts: 'Test',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to generate questions')
      expect(data.details).toContain('Rate limit')
      expect(data.hasApiKey).toBe(true)
    })

    it('reports hasApiKey=false when API key missing', async () => {
      delete process.env.ANTHROPIC_API_KEY
      mockCreate.mockRejectedValueOnce(new Error('No API key'))

      const request = createGetRequest({
        problemText: 'Test',
        stepTitle: 'Test',
        stepContent: 'Test',
        concepts: 'Test',
      })

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.hasApiKey).toBe(false)
    })
  })

  describe('POST /api/socratic-tutor (answer analysis)', () => {
    const createPostRequest = (body: object) => {
      return new NextRequest('http://localhost/api/socratic-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    const validRequestBody = {
      problemText: 'A 5kg block on a 30 degree incline',
      stepTitle: 'Force Decomposition',
      stepContent: 'Break weight into parallel and perpendicular components',
      requiredConcepts: ['trigonometry', 'force components'],
      question: 'Why use sine for the parallel component?',
      studentAnswer: 'Because the parallel component is opposite to the angle',
      chatHistory: [],
    }

    it('returns resolved=true for correct answer', async () => {
      const mockResponse = {
        analysis: {
          isCorrect: true,
          understanding: 'full',
          feedback: 'Excellent!',
          followUpQuestion: '',
          conceptGaps: [],
        },
        isResolved: true,
        encouragement: 'Outstanding work!',
      }

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      })

      const request = createPostRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isResolved).toBe(true)
      expect(data.analysis.isCorrect).toBe(true)
      expect(data.analysis.understanding).toBe('full')
      expect(data.encouragement).toBe('Outstanding work!')
    })

    it('returns follow-up question for partial understanding', async () => {
      const mockResponse = {
        analysis: {
          isCorrect: false,
          understanding: 'partial',
          feedback: 'Good start!',
          followUpQuestion: 'Can you explain why opposite means sine?',
          conceptGaps: ['SOHCAHTOA'],
        },
        isResolved: false,
        encouragement: null,
      }

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      })

      const request = createPostRequest({
        ...validRequestBody,
        studentAnswer: 'I think it uses sine but not sure why',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isResolved).toBe(false)
      expect(data.analysis.understanding).toBe('partial')
      expect(data.analysis.followUpQuestion).toContain('explain')
      expect(data.analysis.conceptGaps).toContain('SOHCAHTOA')
    })

    it('handles misconception with gentle feedback', async () => {
      const mockResponse = {
        analysis: {
          isCorrect: false,
          understanding: 'misconception',
          feedback: "Let's think about this differently...",
          followUpQuestion: 'What does opposite mean in a right triangle?',
          conceptGaps: ['trigonometric ratios', 'angle identification'],
        },
        isResolved: false,
        encouragement: null,
      }

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
      })

      const request = createPostRequest({
        ...validRequestBody,
        studentAnswer: 'Sine is always used for parallel components',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.analysis.understanding).toBe('misconception')
      expect(data.analysis.conceptGaps).toHaveLength(2)
    })

    it('includes chat history in prompt', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"analysis":{"isCorrect":true,"understanding":"full","feedback":"Good","followUpQuestion":"","conceptGaps":[]},"isResolved":true,"encouragement":"Great!"}' }],
      })

      const request = createPostRequest({
        ...validRequestBody,
        chatHistory: [
          { id: 'q1', role: 'professor', content: 'First question?', timestamp: 1000 },
          { id: 's1', role: 'student', content: 'First answer', timestamp: 2000 },
        ],
      })

      await POST(request)

      const callArgs = mockCreate.mock.calls[0][0]
      const prompt = callArgs.messages[0].content
      expect(prompt).toContain('Conversation History')
      expect(prompt).toContain('Professor: First question?')
      expect(prompt).toContain('Student: First answer')
    })

    it('uses correct model and parameters', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"analysis":{"isCorrect":true,"understanding":"full","feedback":"","followUpQuestion":"","conceptGaps":[]},"isResolved":true}' }],
      })

      const request = createPostRequest(validRequestBody)
      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 800,
          temperature: 0.4,
        })
      )
    })

    it('includes all required context in prompt', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"analysis":{"isCorrect":true,"understanding":"full","feedback":"","followUpQuestion":"","conceptGaps":[]},"isResolved":true}' }],
      })

      const request = createPostRequest(validRequestBody)
      await POST(request)

      const callArgs = mockCreate.mock.calls[0][0]
      const prompt = callArgs.messages[0].content
      expect(prompt).toContain('5kg block')
      expect(prompt).toContain('Force Decomposition')
      expect(prompt).toContain('trigonometry')
      expect(prompt).toContain('Why use sine')
      expect(prompt).toContain('opposite to the angle')
    })

    it('returns 500 on non-text response', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'test' }],
      })

      const request = createPostRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to analyze answer')
    })

    it('returns 500 when JSON parsing fails', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Not valid JSON response' }],
      })

      const request = createPostRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to analyze answer')
    })

    it('returns 500 on API error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Service unavailable'))

      const request = createPostRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to analyze answer')
      expect(data.details).toContain('Service unavailable')
    })

    it('handles empty chatHistory gracefully', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"analysis":{"isCorrect":true,"understanding":"full","feedback":"Good","followUpQuestion":"","conceptGaps":[]},"isResolved":true}' }],
      })

      const request = createPostRequest({
        ...validRequestBody,
        chatHistory: undefined,
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const callArgs = mockCreate.mock.calls[0][0]
      const prompt = callArgs.messages[0].content
      expect(prompt).not.toContain('Conversation History')
    })

    it('extracts JSON from response with markdown formatting', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{
          type: 'text',
          text: '```json\n{"analysis":{"isCorrect":true,"understanding":"full","feedback":"Great!","followUpQuestion":"","conceptGaps":[]},"isResolved":true,"encouragement":"Well done!"}\n```',
        }],
      })

      const request = createPostRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.isResolved).toBe(true)
      expect(data.encouragement).toBe('Well done!')
    })
  })

  describe('understanding types', () => {
    const createPostRequest = (body: object) => {
      return new NextRequest('http://localhost/api/socratic-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    }

    const baseRequest = {
      problemText: 'Test problem',
      stepTitle: 'Test step',
      stepContent: 'Test content',
      requiredConcepts: ['concept1'],
      question: 'Test question?',
      studentAnswer: 'Test answer',
      chatHistory: [],
    }

    it.each([
      ['full', true, true],
      ['partial', false, false],
      ['misconception', false, false],
      ['unclear', false, false],
    ])('handles understanding=%s correctly (isCorrect=%s, isResolved=%s)',
      async (understanding, isCorrect, isResolved) => {
        const mockResponse = {
          analysis: {
            isCorrect,
            understanding,
            feedback: 'Feedback',
            followUpQuestion: isResolved ? '' : 'Follow up?',
            conceptGaps: isResolved ? [] : ['gap'],
          },
          isResolved,
          encouragement: isResolved ? 'Congrats!' : null,
        }

        mockCreate.mockResolvedValueOnce({
          content: [{ type: 'text', text: JSON.stringify(mockResponse) }],
        })

        const request = createPostRequest(baseRequest)
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.analysis.understanding).toBe(understanding)
        expect(data.isResolved).toBe(isResolved)
      }
    )
  })
})
