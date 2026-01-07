/**
 * Phase 7: Controlled AI Augmentation
 *
 * AI is allowed to:
 * - Generate original questions from blueprints
 * - Generate micro-visual animation specs
 * - Fill exhausted question pools
 *
 * AI must NEVER:
 * - Be required at runtime for core learning
 * - Auto-publish content
 * - Bypass human review
 * - Exceed quotas
 */

import { prisma } from '@/lib/db'
import { AIFeatureType } from '@prisma/client'

// =============================================================================
// AI INVOCATION POINTS
// =============================================================================

/**
 * Allowed AI invocation points and their constraints
 */
export const AI_INVOCATION_POINTS = {
  // Question Generation
  QUESTION_GENERATION: {
    featureType: AIFeatureType.question_generation,
    description: 'Generate original questions from blueprints',
    requiresBlueprint: true,
    autoPublish: false, // NEVER auto-publish
    requiresHumanReview: true,
    maxDailyPerUser: 10,
    maxDailyPerPattern: 50,
  },

  // Hint Generation
  HINT_GENERATION: {
    featureType: AIFeatureType.hint_generation,
    description: 'Generate contextual hints for stuck students',
    requiresBlueprint: false,
    autoPublish: false,
    requiresHumanReview: false, // Real-time, but cached
    maxDailyPerUser: 20,
    maxDailyPerPattern: null, // No pattern limit
  },

  // Explanation Generation
  EXPLANATION_GENERATION: {
    featureType: AIFeatureType.explanation_generation,
    description: 'Generate step explanations on demand',
    requiresBlueprint: false,
    autoPublish: false,
    requiresHumanReview: false,
    maxDailyPerUser: 30,
    maxDailyPerPattern: null,
  },

  // Socratic Dialogue
  SOCRATIC_DIALOGUE: {
    featureType: AIFeatureType.socratic_dialogue,
    description: 'Conversational tutoring interactions',
    requiresBlueprint: false,
    autoPublish: false,
    requiresHumanReview: false,
    maxDailyPerUser: 50,
    maxDailyPerPattern: null,
  },

  // Step Feedback
  STEP_FEEDBACK: {
    featureType: AIFeatureType.step_feedback,
    description: 'Evaluate student step responses',
    requiresBlueprint: false,
    autoPublish: false,
    requiresHumanReview: false,
    maxDailyPerUser: 100,
    maxDailyPerPattern: null,
  },
} as const

/**
 * What AI must NEVER do
 */
export const AI_PROHIBITIONS = [
  'Auto-publish any generated content',
  'Replace human review for question approval',
  'Be required for basic learning flow (hints/feedback are optional)',
  'Access user PII beyond userId',
  'Modify existing approved questions',
  'Generate content that bypasses copyright checks',
  'Exceed quota limits under any circumstances',
  'Store conversation history beyond session',
  'Make editorial decisions about question difficulty',
  'Automatically correlate generated questions',
] as const

// =============================================================================
// QUOTA ENFORCEMENT
// =============================================================================

export interface QuotaCheckResult {
  allowed: boolean
  remainingQuota: number
  resetTime: Date
  reason?: string
}

/**
 * Check if AI invocation is allowed under quota
 */
export async function checkQuota(
  userId: string,
  featureType: AIFeatureType
): Promise<QuotaCheckResult> {
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Start of day UTC

  // Get or create quota record
  let quota = await prisma.userAiQuota.findFirst({
    where: {
      userId,
      featureType,
      quotaDate: today,
    },
  })

  if (!quota) {
    // Get default max from invocation points
    const invocationPoint = Object.values(AI_INVOCATION_POINTS).find(
      p => p.featureType === featureType
    )
    const maxAllowed = invocationPoint?.maxDailyPerUser ?? 10

    quota = await prisma.userAiQuota.create({
      data: {
        userId,
        featureType,
        quotaDate: today,
        usedCount: 0,
        maxAllowed,
      },
    })
  }

  const remaining = quota.maxAllowed - quota.usedCount
  const resetTime = new Date(today)
  resetTime.setDate(resetTime.getDate() + 1) // Tomorrow

  if (remaining <= 0) {
    return {
      allowed: false,
      remainingQuota: 0,
      resetTime,
      reason: `Daily quota exhausted for ${featureType}`,
    }
  }

  return {
    allowed: true,
    remainingQuota: remaining,
    resetTime,
  }
}

/**
 * Consume quota after successful AI invocation
 */
export async function consumeQuota(
  userId: string,
  featureType: AIFeatureType,
  tokensUsed: number,
  estimatedCostUsd: number
): Promise<void> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  await prisma.userAiQuota.updateMany({
    where: {
      userId,
      featureType,
      quotaDate: today,
    },
    data: {
      usedCount: { increment: 1 },
      tokensUsed: { increment: tokensUsed },
      estimatedCostUsd: { increment: estimatedCostUsd },
      lastUsedAt: new Date(),
    },
  })
}

/**
 * Get user's current quota status
 */
export async function getQuotaStatus(
  userId: string
): Promise<Record<AIFeatureType, QuotaCheckResult>> {
  const results: Partial<Record<AIFeatureType, QuotaCheckResult>> = {}

  for (const featureType of Object.values(AIFeatureType)) {
    results[featureType] = await checkQuota(userId, featureType)
  }

  return results as Record<AIFeatureType, QuotaCheckResult>
}

// =============================================================================
// CACHING STRATEGY
// =============================================================================

/**
 * Cache configuration per feature type
 */
export const CACHE_CONFIG = {
  [AIFeatureType.hint_generation]: {
    enabled: true,
    ttlSeconds: 86400 * 7, // 7 days
    keyPrefix: 'hint',
    // Cache key: hint:{questionId}:{stepId}:{hintLevel}
  },
  [AIFeatureType.explanation_generation]: {
    enabled: true,
    ttlSeconds: 86400 * 30, // 30 days
    keyPrefix: 'explain',
    // Cache key: explain:{questionId}:{stepId}
  },
  [AIFeatureType.question_generation]: {
    enabled: false, // Don't cache generated questions
    ttlSeconds: 0,
    keyPrefix: 'qgen',
  },
  [AIFeatureType.socratic_dialogue]: {
    enabled: false, // Each dialogue is unique
    ttlSeconds: 0,
    keyPrefix: 'socratic',
  },
  [AIFeatureType.step_feedback]: {
    enabled: true,
    ttlSeconds: 86400, // 1 day
    keyPrefix: 'feedback',
    // Cache key: feedback:{questionId}:{stepId}:{hash(studentAnswer)}
  },
} as const

/**
 * Generate cache key for AI response
 */
export function generateCacheKey(
  featureType: AIFeatureType,
  params: Record<string, string>
): string | null {
  const config = CACHE_CONFIG[featureType]
  if (!config.enabled) return null

  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}:${params[k]}`)
    .join(':')

  return `${config.keyPrefix}:${sortedParams}`
}

// =============================================================================
// FAILURE-SAFE BEHAVIOR
// =============================================================================

/**
 * Fallback responses when AI is unavailable
 */
export const FALLBACK_RESPONSES = {
  [AIFeatureType.hint_generation]: {
    message: 'Hints are temporarily unavailable. Try reviewing the concept inventory.',
    action: 'show_concept_inventory',
  },
  [AIFeatureType.explanation_generation]: {
    message: 'Explanations are temporarily unavailable. The step solution is shown below.',
    action: 'show_static_solution',
  },
  [AIFeatureType.socratic_dialogue]: {
    message: 'The tutor is temporarily unavailable. Continue with the next step.',
    action: 'skip_tutor',
  },
  [AIFeatureType.step_feedback]: {
    message: 'Automatic feedback is unavailable. Your answer has been recorded.',
    action: 'accept_answer',
  },
  [AIFeatureType.question_generation]: {
    message: 'Question generation is unavailable.',
    action: 'none',
  },
} as const

/**
 * Handle AI failure gracefully
 */
export function handleAiFailure(
  featureType: AIFeatureType,
  error: Error
): {
  fallback: typeof FALLBACK_RESPONSES[AIFeatureType]
  shouldRetry: boolean
  retryDelayMs: number
} {
  const fallback = FALLBACK_RESPONSES[featureType]

  // Determine if retry is appropriate
  const isTransient = error.message.includes('timeout') ||
    error.message.includes('rate limit') ||
    error.message.includes('503')

  return {
    fallback,
    shouldRetry: isTransient,
    retryDelayMs: isTransient ? 5000 : 0,
  }
}

// =============================================================================
// PROVENANCE TRACKING
// =============================================================================

/**
 * Record AI generation for audit
 */
export async function recordAiGeneration(params: {
  userId: string
  featureType: AIFeatureType
  questionId?: string
  stepId?: string
  model: string
  promptTemplateId?: string
  promptTemplateVersion?: number
  inputTokens: number
  outputTokens: number
  latencyMs: number
  success: boolean
  errorMessage?: string
}): Promise<string> {
  const estimatedCost = estimateCost(params.model, params.inputTokens, params.outputTokens)

  const log = await prisma.aiGenerationLog.create({
    data: {
      userId: params.userId,
      featureType: params.featureType,
      questionId: params.questionId,
      stepId: params.stepId,
      model: params.model,
      promptTemplateId: params.promptTemplateId,
      promptTemplateVer: params.promptTemplateVersion,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      latencyMs: params.latencyMs,
      estimatedCostUsd: estimatedCost,
      success: params.success,
      errorMessage: params.errorMessage,
    },
  })

  // Update quota
  if (params.success) {
    await consumeQuota(
      params.userId,
      params.featureType,
      params.inputTokens + params.outputTokens,
      estimatedCost
    )
  }

  return log.id
}

/**
 * Estimate cost based on model and tokens
 */
function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  // Pricing per 1M tokens (approximate)
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-sonnet-4-20250514': { input: 3, output: 15 },
    'claude-haiku-3-5-20241022': { input: 0.25, output: 1.25 },
    default: { input: 3, output: 15 },
  }

  const rates = pricing[model] || pricing.default

  const inputCost = (inputTokens / 1_000_000) * rates.input
  const outputCost = (outputTokens / 1_000_000) * rates.output

  return Math.round((inputCost + outputCost) * 10000) / 10000 // Round to 4 decimal places
}

// =============================================================================
// POOL EXHAUSTION HANDLER
// =============================================================================

/**
 * Handle exhausted question pool by triggering AI generation
 * (Async, background process - does not block user)
 */
export async function handlePoolExhaustion(
  patternId: string,
  track: string,
  difficulty: number
): Promise<void> {
  // Check if we're under daily pattern quota
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayGenerations = await prisma.aiGenerationLog.count({
    where: {
      featureType: AIFeatureType.question_generation,
      createdAt: { gte: today },
      success: true,
    },
  })

  const maxPerPattern = AI_INVOCATION_POINTS.QUESTION_GENERATION.maxDailyPerPattern
  if (maxPerPattern && todayGenerations >= maxPerPattern) {
    console.log(`Pattern quota exhausted for ${patternId}, skipping generation`)
    return
  }

  // Queue generation job (would be handled by job system)
  console.log(`Queuing question generation for pattern=${patternId}, track=${track}, difficulty=${difficulty}`)

  // In production, this would:
  // 1. Add to job queue
  // 2. Generate question from blueprint
  // 3. Create as draft (never auto-publish)
  // 4. Notify reviewers
}
