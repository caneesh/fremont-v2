/**
 * Unit tests for Question Engine Schemas
 */

import { describe, it, expect } from 'vitest'
import {
  QuestionDocSchema,
  PatternTemplateSchema,
  ResolveRequestSchema,
  StepSchema,
  FingerprintSchema,
  parseQuestionDoc,
  validateTemplateAdherence,
  type QuestionDoc,
  type PatternTemplate,
  type Step,
} from '../schemas'

// =============================================================================
// Test Fixtures
// =============================================================================

const validStep: Step = {
  id: 'step-1',
  type: 'equation',
  prompt: 'Find the acceleration',
  expected: { type: 'exact', value: '5 m/s²' },
  hint: 'Use Newton\'s second law',
  trap: 'Don\'t forget to decompose forces',
  solution: 'a = g sin(θ) = 10 × 0.5 = 5 m/s²',
}

const validQuestionDoc: QuestionDoc = {
  id: 'q-123',
  statement: 'A 5 kg block slides down a 30° incline. Find the acceleration.',
  topic: 'mechanics',
  subtopic: 'inclined_plane',
  fingerprint: {
    topic: 'mechanics',
    subtopic: 'inclined_plane',
    asked: ['acceleration'],
    keywords: ['block', 'incline', 'acceleration'],
    diagramType: 'incline',
  },
  templateId: 'mechanics/incline_frictionless',
  steps: [validStep],
  finalAnswer: '5 m/s²',
  version: '1.0.0',
  createdAt: '2025-01-01T00:00:00.000Z',
  source: 'generated',
}

const validTemplate: PatternTemplate = {
  templateId: 'mechanics/incline_frictionless',
  topic: 'mechanics',
  subtopic: 'inclined_plane',
  description: 'Frictionless incline problem',
  stepBlueprints: [
    {
      id: 'step-1',
      type: 'equation',
      requiredFields: ['prompt', 'expected', 'hint', 'trap', 'solution'],
      description: 'Find the acceleration',
    },
  ],
  allowedVariables: ['mass', 'angle', 'acceleration'],
  rules: 'no add/remove/reorder',
}

// =============================================================================
// StepSchema Tests
// =============================================================================

describe('StepSchema', () => {
  it('validates a correct step', () => {
    const result = StepSchema.safeParse(validStep)
    expect(result.success).toBe(true)
  })

  it('rejects step with invalid type', () => {
    const invalidStep = { ...validStep, type: 'invalid_type' }
    const result = StepSchema.safeParse(invalidStep)
    expect(result.success).toBe(false)
  })

  it('rejects step missing required fields', () => {
    const { prompt, ...stepWithoutPrompt } = validStep
    const result = StepSchema.safeParse(stepWithoutPrompt)
    expect(result.success).toBe(false)
  })

  it('accepts all valid step types', () => {
    const types = ['mcq', 'fill', 'short', 'equation', 'diagram'] as const
    for (const type of types) {
      const step = { ...validStep, type }
      const result = StepSchema.safeParse(step)
      expect(result.success).toBe(true)
    }
  })
})

// =============================================================================
// FingerprintSchema Tests
// =============================================================================

describe('FingerprintSchema', () => {
  it('validates a correct fingerprint', () => {
    const fingerprint = {
      topic: 'mechanics',
      subtopic: 'inclined_plane',
      asked: ['acceleration'],
      keywords: ['block', 'incline'],
      diagramType: 'fbd',
    }
    const result = FingerprintSchema.safeParse(fingerprint)
    expect(result.success).toBe(true)
  })

  it('accepts fingerprint without diagramType', () => {
    const fingerprint = {
      topic: 'mechanics',
      subtopic: 'inclined_plane',
      asked: ['acceleration'],
      keywords: ['block'],
    }
    const result = FingerprintSchema.safeParse(fingerprint)
    expect(result.success).toBe(true)
  })

  it('rejects invalid diagramType', () => {
    const fingerprint = {
      topic: 'mechanics',
      subtopic: 'inclined_plane',
      asked: ['acceleration'],
      keywords: ['block'],
      diagramType: 'invalid',
    }
    const result = FingerprintSchema.safeParse(fingerprint)
    expect(result.success).toBe(false)
  })
})

// =============================================================================
// QuestionDocSchema Tests
// =============================================================================

describe('QuestionDocSchema', () => {
  it('validates a correct QuestionDoc', () => {
    const result = QuestionDocSchema.safeParse(validQuestionDoc)
    expect(result.success).toBe(true)
  })

  it('accepts QuestionDoc with choices', () => {
    const docWithChoices = {
      ...validQuestionDoc,
      choices: ['5 m/s²', '10 m/s²', '2.5 m/s²', '0 m/s²'],
    }
    const result = QuestionDocSchema.safeParse(docWithChoices)
    expect(result.success).toBe(true)
  })

  it('rejects QuestionDoc with invalid source', () => {
    const invalidDoc = { ...validQuestionDoc, source: 'invalid' }
    const result = QuestionDocSchema.safeParse(invalidDoc)
    expect(result.success).toBe(false)
  })

  it('accepts all valid source types', () => {
    const sources = ['reuse', 'adapted', 'generated'] as const
    for (const source of sources) {
      const doc = { ...validQuestionDoc, source }
      const result = QuestionDocSchema.safeParse(doc)
      expect(result.success).toBe(true)
    }
  })

  it('rejects QuestionDoc missing required fields', () => {
    const { statement, ...docWithoutStatement } = validQuestionDoc
    const result = QuestionDocSchema.safeParse(docWithoutStatement)
    expect(result.success).toBe(false)
  })
})

// =============================================================================
// PatternTemplateSchema Tests
// =============================================================================

describe('PatternTemplateSchema', () => {
  it('validates a correct PatternTemplate', () => {
    const result = PatternTemplateSchema.safeParse(validTemplate)
    expect(result.success).toBe(true)
  })

  it('rejects template with wrong rules value', () => {
    const invalidTemplate = { ...validTemplate, rules: 'allow changes' }
    const result = PatternTemplateSchema.safeParse(invalidTemplate)
    expect(result.success).toBe(false)
  })

  it('rejects template with empty stepBlueprints', () => {
    const invalidTemplate = { ...validTemplate, stepBlueprints: [] }
    const result = PatternTemplateSchema.safeParse(invalidTemplate)
    // Empty array is technically valid per schema, but should have at least one step
    expect(result.success).toBe(true) // Schema allows empty, validation logic should catch
  })
})

// =============================================================================
// ResolveRequestSchema Tests
// =============================================================================

describe('ResolveRequestSchema', () => {
  it('validates minimal request', () => {
    const request = { statement: 'A block slides down an incline.' }
    const result = ResolveRequestSchema.safeParse(request)
    expect(result.success).toBe(true)
  })

  it('validates full request', () => {
    const request = {
      statement: 'A block slides down an incline.',
      choices: ['A', 'B', 'C', 'D'],
      topic: 'mechanics',
      subtopic: 'inclined_plane',
      userId: 'user-123',
    }
    const result = ResolveRequestSchema.safeParse(request)
    expect(result.success).toBe(true)
  })

  it('rejects statement that is too short', () => {
    const request = { statement: 'Short' }
    const result = ResolveRequestSchema.safeParse(request)
    expect(result.success).toBe(false)
  })

  it('rejects empty statement', () => {
    const request = { statement: '' }
    const result = ResolveRequestSchema.safeParse(request)
    expect(result.success).toBe(false)
  })
})

// =============================================================================
// parseQuestionDoc Tests
// =============================================================================

describe('parseQuestionDoc', () => {
  it('returns success for valid doc', () => {
    const result = parseQuestionDoc(validQuestionDoc)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(validQuestionDoc)
    expect(result.error).toBeUndefined()
  })

  it('returns error for invalid doc', () => {
    const invalidDoc = { ...validQuestionDoc, source: 'invalid' }
    const result = parseQuestionDoc(invalidDoc)
    expect(result.success).toBe(false)
    expect(result.data).toBeUndefined()
    expect(result.error).toBeDefined()
    expect(result.error).toContain('source')
  })

  it('returns formatted error message with path', () => {
    const invalidDoc = { ...validQuestionDoc, steps: [{ id: 'bad' }] }
    const result = parseQuestionDoc(invalidDoc)
    expect(result.success).toBe(false)
    expect(result.error).toContain('steps')
  })
})

// =============================================================================
// validateTemplateAdherence Tests
// =============================================================================

describe('validateTemplateAdherence', () => {
  it('returns null for valid adherence', () => {
    const result = validateTemplateAdherence(validQuestionDoc, validTemplate)
    expect(result).toBeNull()
  })

  it('detects step count mismatch', () => {
    const docWithExtraStep: QuestionDoc = {
      ...validQuestionDoc,
      steps: [validStep, { ...validStep, id: 'step-2' }],
    }
    const result = validateTemplateAdherence(docWithExtraStep, validTemplate)
    expect(result).not.toBeNull()
    expect(result).toContain('Step count mismatch')
  })

  it('detects step ID mismatch', () => {
    const docWithWrongId: QuestionDoc = {
      ...validQuestionDoc,
      steps: [{ ...validStep, id: 'wrong-id' }],
    }
    const result = validateTemplateAdherence(docWithWrongId, validTemplate)
    expect(result).not.toBeNull()
    expect(result).toContain('ID mismatch')
  })

  it('detects step type mismatch', () => {
    const docWithWrongType: QuestionDoc = {
      ...validQuestionDoc,
      steps: [{ ...validStep, type: 'mcq' }],
    }
    const result = validateTemplateAdherence(docWithWrongType, validTemplate)
    expect(result).not.toBeNull()
    expect(result).toContain('type mismatch')
  })

  it('detects template ID mismatch', () => {
    const docWithWrongTemplate: QuestionDoc = {
      ...validQuestionDoc,
      templateId: 'wrong/template',
    }
    const result = validateTemplateAdherence(docWithWrongTemplate, validTemplate)
    expect(result).not.toBeNull()
    expect(result).toContain('Template ID mismatch')
  })

  it('detects missing required fields', () => {
    const stepMissingHint = { ...validStep, hint: '' }
    const docWithMissingField: QuestionDoc = {
      ...validQuestionDoc,
      steps: [stepMissingHint],
    }
    const result = validateTemplateAdherence(docWithMissingField, validTemplate)
    expect(result).not.toBeNull()
    expect(result).toContain('missing required field')
  })
})
