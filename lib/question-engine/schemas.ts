/**
 * Question Scaffolding Engine v1 - Zod Schemas
 *
 * Defines the core data models for the question caching and scaffolding system.
 * All validation is done via Zod to ensure type safety at runtime.
 */

import { z } from 'zod'

// =============================================================================
// Step Types
// =============================================================================

export const StepTypeEnum = z.enum(['mcq', 'fill', 'short', 'equation', 'diagram'])
export type StepType = z.infer<typeof StepTypeEnum>

// =============================================================================
// Expected Answer Schema
// =============================================================================

/**
 * Expected answer structure - minimal but typed
 * Different step types have different expected answer formats
 */
export const ExpectedAnswerSchema = z.object({
  type: z.enum(['exact', 'numeric', 'regex', 'choice', 'diagram_check']),
  value: z.union([z.string(), z.number(), z.array(z.string())]).optional(),
  tolerance: z.number().optional(), // For numeric answers
  unit: z.string().optional(),
  choiceIndex: z.number().optional(), // For MCQ
})
export type ExpectedAnswer = z.infer<typeof ExpectedAnswerSchema>

// =============================================================================
// Step Schema
// =============================================================================

export const StepSchema = z.object({
  id: z.string(),
  type: StepTypeEnum,
  prompt: z.string(),
  expected: ExpectedAnswerSchema,
  hint: z.string(),
  trap: z.string(),
  solution: z.string(),
})
export type Step = z.infer<typeof StepSchema>

// =============================================================================
// Fingerprint Schema
// =============================================================================

/**
 * Numerical parameters extracted from problem statement
 * Used to distinguish questions with same concepts but different values
 */
export const NumericalParamsSchema = z.object({
  angles: z.array(z.number()).optional(),      // e.g., [30, 45] degrees
  masses: z.array(z.number()).optional(),      // e.g., [5, 10] kg
  distances: z.array(z.number()).optional(),   // e.g., [10, 20] m
  velocities: z.array(z.number()).optional(),  // e.g., [15] m/s
  forces: z.array(z.number()).optional(),      // e.g., [100] N
  times: z.array(z.number()).optional(),       // e.g., [5] s
  heights: z.array(z.number()).optional(),     // e.g., [80] m
})
export type NumericalParams = z.infer<typeof NumericalParamsSchema>

/**
 * Fingerprint for similarity matching
 * Used to find similar questions without LLM
 */
export const FingerprintSchema = z.object({
  topic: z.string(),
  subtopic: z.string(),
  asked: z.array(z.string()), // What the problem asks for (acceleration, force, etc.)
  keywords: z.array(z.string()), // Key physics terms
  diagramType: z.enum(['none', 'fbd', 'incline', 'pulley', 'circuit', 'optics', 'other']).optional(),
  numericalParams: NumericalParamsSchema.optional(), // Numerical values for similarity
})
export type Fingerprint = z.infer<typeof FingerprintSchema>

// =============================================================================
// QuestionDoc Schema
// =============================================================================

export const SourceEnum = z.enum(['reuse', 'adapted', 'generated'])
export type Source = z.infer<typeof SourceEnum>

export const QuestionDocSchema = z.object({
  id: z.string(),
  statement: z.string(),
  choices: z.array(z.string()).optional(),
  topic: z.string(),
  subtopic: z.string(),
  fingerprint: FingerprintSchema,
  templateId: z.string(),
  steps: z.array(StepSchema),
  finalAnswer: z.string(),
  version: z.string(),
  createdAt: z.string(), // ISO timestamp
  source: SourceEnum,
})
export type QuestionDoc = z.infer<typeof QuestionDocSchema>

// =============================================================================
// PatternTemplate Schema
// =============================================================================

/**
 * Step Blueprint - defines the structure a step must follow
 */
export const StepBlueprintSchema = z.object({
  id: z.string(),
  type: StepTypeEnum,
  requiredFields: z.array(z.string()),
  promptTemplate: z.string().optional(), // Template string with {{variables}}
  description: z.string(), // Human-readable description of what this step does
})
export type StepBlueprint = z.infer<typeof StepBlueprintSchema>

/**
 * PatternTemplate - defines the fixed structure for a problem type
 * LLM can only fill slots, never add/remove/reorder steps
 */
export const PatternTemplateSchema = z.object({
  templateId: z.string(),
  topic: z.string(),
  subtopic: z.string(),
  description: z.string(),
  stepBlueprints: z.array(StepBlueprintSchema),
  allowedVariables: z.array(z.string()), // Variables LLM can substitute
  rules: z.literal('no add/remove/reorder'),
})
export type PatternTemplate = z.infer<typeof PatternTemplateSchema>

// =============================================================================
// API Request/Response Schemas
// =============================================================================

export const ResolveRequestSchema = z.object({
  statement: z.string().min(10, 'Statement must be at least 10 characters'),
  choices: z.array(z.string()).optional(),
  topic: z.string().optional(),
  subtopic: z.string().optional(),
  userId: z.string().optional(),
})
export type ResolveRequest = z.infer<typeof ResolveRequestSchema>

export const ResolveResponseSchema = z.object({
  success: z.boolean(),
  question: QuestionDocSchema.optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }).optional(),
  meta: z.object({
    source: SourceEnum.optional(),
    generationTimeMs: z.number().optional(),
    cached: z.boolean(),
    statusId: z.string().optional(), // For status tracking during generation
  }).optional(),
})
export type ResolveResponse = z.infer<typeof ResolveResponseSchema>

// =============================================================================
// Status Update Schema
// =============================================================================

export const GenerationStatusEnum = z.enum([
  'analyzing',
  'selecting_template',
  'checking_cache',
  'adapting',
  'generating',
  'validating',
  'saving',
  'completed',
  'error',
])
export type GenerationStatus = z.infer<typeof GenerationStatusEnum>

export const StatusUpdateSchema = z.object({
  statusId: z.string(),
  status: GenerationStatusEnum,
  message: z.string(),
  progress: z.number().min(0).max(100),
  timestamp: z.string(),
})
export type StatusUpdate = z.infer<typeof StatusUpdateSchema>

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validates that a QuestionDoc adheres to its template
 * Returns null if valid, or an error message if invalid
 */
export function validateTemplateAdherence(
  doc: QuestionDoc,
  template: PatternTemplate
): string | null {
  // Check step count
  if (doc.steps.length !== template.stepBlueprints.length) {
    return `Step count mismatch: expected ${template.stepBlueprints.length}, got ${doc.steps.length}`
  }

  // Check each step matches blueprint
  for (let i = 0; i < template.stepBlueprints.length; i++) {
    const blueprint = template.stepBlueprints[i]
    const step = doc.steps[i]

    // Check step ID matches
    if (step.id !== blueprint.id) {
      return `Step ${i} ID mismatch: expected "${blueprint.id}", got "${step.id}"`
    }

    // Check step type matches
    if (step.type !== blueprint.type) {
      return `Step "${step.id}" type mismatch: expected "${blueprint.type}", got "${step.type}"`
    }

    // Check required fields are present and non-empty
    for (const field of blueprint.requiredFields) {
      const value = step[field as keyof Step]
      if (value === undefined || value === null || value === '') {
        return `Step "${step.id}" missing required field: "${field}"`
      }
    }
  }

  // Check templateId matches
  if (doc.templateId !== template.templateId) {
    return `Template ID mismatch: expected "${template.templateId}", got "${doc.templateId}"`
  }

  return null
}

/**
 * Safely parse QuestionDoc, returning result with error
 */
export function parseQuestionDoc(data: unknown): {
  success: boolean
  data?: QuestionDoc
  error?: string
} {
  const result = QuestionDocSchema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return {
    success: false,
    error: result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
  }
}
