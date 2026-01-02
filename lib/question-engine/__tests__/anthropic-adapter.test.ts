/**
 * Unit tests for Question Engine Anthropic Adapter
 *
 * These tests mock the Anthropic SDK to test LLM interaction logic
 * without making real API calls.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Store original env
const originalEnv = { ...process.env }

// Create a persistent mock function
const mockCreate = vi.fn()

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  // Create a mock class that can be instantiated with `new`
  const MockAnthropic = function() {
    return {
      messages: {
        create: mockCreate,
      },
    }
  }
  return {
    default: MockAnthropic,
  }
})

import {
  generateQuestion,
  adaptQuestion,
  isAnthropicAvailable,
  getAnthropicStatus,
} from '../anthropic-adapter'
import type { PatternTemplate, QuestionDoc } from '../schemas'

// =============================================================================
// Test Fixtures
// =============================================================================

const mockTemplate: PatternTemplate = {
  templateId: 'mechanics/test',
  topic: 'mechanics',
  subtopic: 'test',
  description: 'Test template',
  stepBlueprints: [
    {
      id: 'step-1',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      description: 'First step',
    },
  ],
  allowedVariables: ['mass', 'acceleration'],
  rules: 'no add/remove/reorder',
}

const validQuestionResponse: QuestionDoc = {
  id: 'q-generated',
  statement: 'A 5 kg block accelerates.',
  topic: 'mechanics',
  subtopic: 'test',
  fingerprint: {
    topic: 'mechanics',
    subtopic: 'test',
    asked: ['acceleration'],
    keywords: ['block', 'mass'],
  },
  templateId: 'mechanics/test',
  steps: [
    {
      id: 'step-1',
      type: 'equation',
      prompt: 'Find the acceleration',
      expected: { type: 'exact', value: '5 m/s²' },
      hint: 'Use F=ma',
      trap: 'Watch units',
      solution: 'a = F/m',
    },
  ],
  finalAnswer: '5 m/s²',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00.000Z',
  source: 'generated',
}

const mockExistingQuestion: QuestionDoc = {
  ...validQuestionResponse,
  id: 'q-existing',
  source: 'adapted',
}

// =============================================================================
// Test Setup
// =============================================================================

beforeEach(() => {
  vi.clearAllMocks()
  process.env = { ...originalEnv, ANTHROPIC_API_KEY: 'test-key' }
})

afterEach(() => {
  process.env = originalEnv
})

// =============================================================================
// generateQuestion Tests
// =============================================================================

describe('generateQuestion', () => {
  it('returns success with valid LLM response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validQuestionResponse) }],
    })

    const result = await generateQuestion(
      'A 5 kg block accelerates.',
      undefined,
      mockTemplate
    )

    expect(result.success).toBe(true)
    expect(result.question).toBeDefined()
    expect(result.question?.templateId).toBe('mechanics/test')
  })

  it('handles LLM response with markdown code blocks', async () => {
    mockCreate.mockResolvedValue({
      content: [{
        type: 'text',
        text: '```json\n' + JSON.stringify(validQuestionResponse) + '\n```'
      }],
    })

    const result = await generateQuestion(
      'A 5 kg block accelerates.',
      undefined,
      mockTemplate
    )

    expect(result.success).toBe(true)
    expect(result.question).toBeDefined()
  })

  it('passes choices to LLM when provided', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validQuestionResponse) }],
    })

    await generateQuestion(
      'Find the acceleration.',
      ['5 m/s²', '10 m/s²', '2.5 m/s²'],
      mockTemplate
    )

    expect(mockCreate).toHaveBeenCalled()
    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('5 m/s²')
    expect(prompt).toContain('10 m/s²')
  })

  it('returns error for invalid JSON response', async () => {
    // First call returns invalid JSON, second (fix) call also fails
    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'not valid json' }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'still not valid' }],
      })

    const result = await generateQuestion(
      'A block slides.',
      undefined,
      mockTemplate
    )

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('returns error for schema validation failure', async () => {
    const invalidResponse = { ...validQuestionResponse, steps: [] } // Wrong step count

    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(invalidResponse) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(invalidResponse) }],
      })

    const result = await generateQuestion(
      'A block slides.',
      undefined,
      mockTemplate
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Step count mismatch')
  })

  it('returns error when API key is missing', async () => {
    process.env.ANTHROPIC_API_KEY = ''

    const result = await generateQuestion(
      'A block slides.',
      undefined,
      mockTemplate
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('ANTHROPIC_API_KEY')
  })

  it('returns error when LLM returns non-text response', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'image', source: {} }],
    })

    const result = await generateQuestion(
      'A block slides.',
      undefined,
      mockTemplate
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unexpected response type')
  })

  it('returns error when LLM call fails', async () => {
    mockCreate.mockRejectedValue(new Error('API rate limited'))

    const result = await generateQuestion(
      'A block slides.',
      undefined,
      mockTemplate
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('API rate limited')
  })
})

// =============================================================================
// adaptQuestion Tests
// =============================================================================

describe('adaptQuestion', () => {
  it('returns success with valid adaptation', async () => {
    const adaptedResponse = {
      ...validQuestionResponse,
      id: 'q-adapted',
      source: 'adapted' as const,
    }

    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(adaptedResponse) }],
    })

    const result = await adaptQuestion(
      'A 10 kg block accelerates.',
      undefined,
      mockTemplate,
      mockExistingQuestion
    )

    expect(result.success).toBe(true)
    expect(result.question).toBeDefined()
  })

  it('includes similar question in prompt', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validQuestionResponse) }],
    })

    await adaptQuestion(
      'A new problem.',
      undefined,
      mockTemplate,
      mockExistingQuestion
    )

    expect(mockCreate).toHaveBeenCalled()
    const prompt = mockCreate.mock.calls[0][0].messages[0].content
    expect(prompt).toContain('SIMILAR QUESTION')
    expect(prompt).toContain(mockExistingQuestion.statement)
  })

  it('preserves template structure in adaptation', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validQuestionResponse) }],
    })

    const result = await adaptQuestion(
      'A different block problem.',
      undefined,
      mockTemplate,
      mockExistingQuestion
    )

    expect(result.success).toBe(true)
    expect(result.question?.steps).toHaveLength(mockTemplate.stepBlueprints.length)
    expect(result.question?.steps[0].id).toBe('step-1')
  })

  it('returns error when adaptation fails validation', async () => {
    const badAdaptation = {
      ...validQuestionResponse,
      steps: [{ ...validQuestionResponse.steps[0], id: 'wrong-id' }],
    }

    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(badAdaptation) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(badAdaptation) }],
      })

    const result = await adaptQuestion(
      'A block problem.',
      undefined,
      mockTemplate,
      mockExistingQuestion
    )

    expect(result.success).toBe(false)
    expect(result.error).toContain('ID mismatch')
  })
})

// =============================================================================
// isAnthropicAvailable Tests
// =============================================================================

describe('isAnthropicAvailable', () => {
  it('returns true when API key is set', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'

    const result = await isAnthropicAvailable()

    expect(result).toBe(true)
  })

  it('returns false when API key is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY

    const result = await isAnthropicAvailable()

    expect(result).toBe(false)
  })

  it('returns false when API key is empty', async () => {
    process.env.ANTHROPIC_API_KEY = ''

    const result = await isAnthropicAvailable()

    expect(result).toBe(false)
  })
})

// =============================================================================
// getAnthropicStatus Tests
// =============================================================================

describe('getAnthropicStatus', () => {
  it('returns available status when API key is set', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'

    const status = getAnthropicStatus()

    expect(status.available).toBe(true)
    expect(status.message).toContain('configured')
    expect(status.message).toContain('claude')
  })

  it('returns unavailable status when API key is not set', () => {
    delete process.env.ANTHROPIC_API_KEY

    const status = getAnthropicStatus()

    expect(status.available).toBe(false)
    expect(status.message).toContain('ANTHROPIC_API_KEY')
  })
})

// =============================================================================
// Template Enforcement Tests
// =============================================================================

describe('Template Enforcement', () => {
  it('rejects response with extra steps', async () => {
    const responseWithExtraStep = {
      ...validQuestionResponse,
      steps: [
        validQuestionResponse.steps[0],
        { ...validQuestionResponse.steps[0], id: 'step-2' }, // Extra step
      ],
    }

    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(responseWithExtraStep) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(responseWithExtraStep) }],
      })

    const result = await generateQuestion('A block.', undefined, mockTemplate)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Step count mismatch')
  })

  it('rejects response with missing steps', async () => {
    const responseWithMissingStep = {
      ...validQuestionResponse,
      steps: [], // No steps
    }

    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(responseWithMissingStep) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(responseWithMissingStep) }],
      })

    const result = await generateQuestion('A block.', undefined, mockTemplate)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Step count mismatch')
  })

  it('rejects response with wrong step IDs', async () => {
    const responseWithWrongId = {
      ...validQuestionResponse,
      steps: [{ ...validQuestionResponse.steps[0], id: 'wrong-step-id' }],
    }

    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(responseWithWrongId) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(responseWithWrongId) }],
      })

    const result = await generateQuestion('A block.', undefined, mockTemplate)

    expect(result.success).toBe(false)
    expect(result.error).toContain('ID mismatch')
  })

  it('rejects response with wrong step types', async () => {
    const responseWithWrongType = {
      ...validQuestionResponse,
      steps: [{ ...validQuestionResponse.steps[0], type: 'mcq' as const }], // Should be equation
    }

    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(responseWithWrongType) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(responseWithWrongType) }],
      })

    const result = await generateQuestion('A block.', undefined, mockTemplate)

    expect(result.success).toBe(false)
    expect(result.error).toContain('type mismatch')
  })

  it('rejects response with wrong template ID', async () => {
    const responseWithWrongTemplateId = {
      ...validQuestionResponse,
      templateId: 'wrong/template',
    }

    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(responseWithWrongTemplateId) }],
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(responseWithWrongTemplateId) }],
      })

    const result = await generateQuestion('A block.', undefined, mockTemplate)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Template ID mismatch')
  })
})
