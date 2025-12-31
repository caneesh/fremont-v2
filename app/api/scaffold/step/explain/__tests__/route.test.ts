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
import { POST } from '../route'

describe('POST /api/scaffold/step/explain', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockReset()
    // Set up environment
    process.env.ANTHROPIC_API_KEY = 'test-api-key'
  })

  const createRequest = (body: object) => {
    return new NextRequest('http://localhost/api/scaffold/step/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  describe('validation', () => {
    it('returns 400 when stepTitle is missing', async () => {
      const request = createRequest({
        problemText: 'A block on an incline',
        stepPosition: 1,
        totalSteps: 3,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('stepTitle')
    })

    it('returns 400 when problemText is missing', async () => {
      const request = createRequest({
        stepTitle: 'Draw FBD',
        stepPosition: 1,
        totalSteps: 3,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('problemText')
    })

    it('returns 500 when API key is not configured', async () => {
      delete process.env.ANTHROPIC_API_KEY

      const request = createRequest({
        stepTitle: 'Draw FBD',
        problemText: 'A block on an incline',
        stepPosition: 1,
        totalSteps: 3,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('API key')
    })
  })

  describe('simple mode', () => {
    it('returns explanation for valid request', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'This step helps you visualize all forces acting on the block.' }],
      })

      const request = createRequest({
        stepTitle: 'Draw Free Body Diagram',
        stepType: 'physics_concept',
        problemText: 'A 5kg block on a 30° incline',
        stepPosition: 1,
        totalSteps: 4,
        requiredConcepts: ['force_analysis'],
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.explanation).toBe('This step helps you visualize all forces acting on the block.')
    })

    it('uses Haiku model for simple mode', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Explanation text' }],
      })

      const request = createRequest({
        stepTitle: 'Test Step',
        problemText: 'Test problem',
        stepPosition: 1,
        totalSteps: 3,
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 200,
        })
      )
    })

    it('includes context info when previous/next steps provided', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Explanation with context' }],
      })

      const request = createRequest({
        stepTitle: 'Apply Newton\'s Second Law',
        problemText: 'Block on incline',
        stepPosition: 2,
        totalSteps: 4,
        previousStepTitle: 'Draw FBD',
        nextStepTitle: 'Solve for acceleration',
      })

      await POST(request)

      // Check that the prompt includes context
      const callArgs = mockCreate.mock.calls[0][0]
      const prompt = callArgs.messages[0].content
      expect(prompt).toContain('Draw FBD')
      expect(prompt).toContain('Solve for acceleration')
    })
  })

  describe('detailed mode', () => {
    it('returns structured explanation when detailed=true', async () => {
      const structuredResponse = JSON.stringify({
        purpose: 'To identify all forces',
        connection: 'Builds on problem setup',
        conceptImportance: 'Force identification is crucial',
        commonMistakes: 'Students often forget normal force',
        insight: 'Every force has a reaction',
        quickSummary: 'Map all forces before calculating',
      })

      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: structuredResponse }],
      })

      const request = createRequest({
        stepTitle: 'Draw FBD',
        problemText: 'Block on incline',
        stepPosition: 1,
        totalSteps: 3,
        detailed: true,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.structured).toBeDefined()
      expect(data.structured.purpose).toBe('To identify all forces')
      expect(data.structured.commonMistakes).toBe('Students often forget normal force')
      expect(data.quickSummary).toBe('Map all forces before calculating')
    })

    it('uses Sonnet model for detailed mode', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: '{"purpose":"test"}' }],
      })

      const request = createRequest({
        stepTitle: 'Test Step',
        problemText: 'Test problem',
        stepPosition: 1,
        totalSteps: 3,
        detailed: true,
      })

      await POST(request)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 600,
        })
      )
    })

    it('falls back to simple mode if JSON parsing fails', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'text', text: 'This is not valid JSON but is a good explanation.' }],
      })

      const request = createRequest({
        stepTitle: 'Test Step',
        problemText: 'Test problem',
        stepPosition: 1,
        totalSteps: 3,
        detailed: true,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.explanation).toBe('This is not valid JSON but is a good explanation.')
      expect(data.structured).toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('returns 500 on API error', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API rate limit exceeded'))

      const request = createRequest({
        stepTitle: 'Test Step',
        problemText: 'Test problem',
        stepPosition: 1,
        totalSteps: 3,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('API rate limit exceeded')
    })

    it('handles non-text response content', async () => {
      mockCreate.mockResolvedValueOnce({
        content: [{ type: 'tool_use', id: 'test' }],
      })

      const request = createRequest({
        stepTitle: 'Test Step',
        problemText: 'Test problem',
        stepPosition: 1,
        totalSteps: 3,
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.explanation).toBe('')
    })
  })
})
