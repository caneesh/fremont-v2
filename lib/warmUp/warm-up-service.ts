/**
 * Warm-Up Service
 *
 * Wires use cases with concrete dependencies.
 * Provides a simple API for UI components.
 */

import type {
  WarmUpBlock,
  WarmUpDrillItem,
  WarmUpSession,
  PatternDecayScore,
} from '@/types/warmUp'
import type {
  WarmUpAnalytics,
  WarmUpContentProvider,
} from '@/lib/core/ports/warm-up-repository'
import {
  assignWarmUp,
  startWarmUp,
  submitWarmUpItem,
  completeWarmUpBlock,
  skipWarmUp,
  getWarmUpStatus,
  type AssignWarmUpOutput,
  type StartWarmUpOutput,
  type SubmitWarmUpItemOutput,
  type CompleteWarmUpBlockOutput,
  type SkipWarmUpOutput,
  type GetWarmUpStatusOutput,
} from '@/lib/core/use-cases/warm-up'
import { createWarmUpRepository } from './warm-up-repository'
import { DEFAULT_WARMUP_BLOCKS } from '@/lib/core/policies/warm-up-policy'
import { eventLogger } from '@/lib/storage/eventLogger'

// Default tenant for single-tenant mode
const DEFAULT_TENANT = 'default'

// Default user ID for anonymous users
const DEFAULT_USER = 'anonymous'

/**
 * No-op analytics implementation for MVP
 * In production, this would send events to a real analytics service
 */
const noopAnalytics: WarmUpAnalytics = {
  trackSessionAssigned: (tenantId, userId, sessionId, blockIds) => {
    eventLogger.log('warmup_assigned', {
      warmUpSessionId: sessionId,
      totalBlocks: blockIds.length,
    })
  },
  trackSessionStarted: (tenantId, userId, sessionId) => {
    eventLogger.log('warmup_started' as any, {
      warmUpSessionId: sessionId,
    })
  },
  trackItemCompleted: (tenantId, userId, sessionId, blockId, itemId, isCorrect, timeSpentSeconds) => {
    eventLogger.log('warmup_item_completed' as any, {
      warmUpSessionId: sessionId,
      blockId,
      itemId,
      isCorrect,
      timeSpentSeconds,
    })
  },
  trackBlockCompleted: (tenantId, userId, sessionId, blockId, score) => {
    eventLogger.log('warmup_block_completed' as any, {
      warmUpSessionId: sessionId,
      blockId,
      score,
    })
  },
  trackSessionCompleted: (tenantId, userId, sessionId, totalScore, durationSeconds) => {
    eventLogger.log('warmup_completed', {
      warmUpSessionId: sessionId,
      score: totalScore,
      duration: durationSeconds * 1000,
    })
  },
  trackSessionSkipped: (tenantId, userId, sessionId, reason) => {
    eventLogger.log('warmup_skipped', {
      warmUpSessionId: sessionId,
      skipReason: reason,
    })
  },
}

/**
 * In-memory content provider with default warm-up blocks
 */
const defaultContentProvider: WarmUpContentProvider = {
  async getAllBlocks(): Promise<WarmUpBlock[]> {
    return [...DEFAULT_WARMUP_BLOCKS]
  },

  async getBlockById(blockId: string): Promise<WarmUpBlock | null> {
    return DEFAULT_WARMUP_BLOCKS.find(b => b.id === blockId) ?? null
  },

  async getBlocksByTopic(topicId: string): Promise<WarmUpBlock[]> {
    return DEFAULT_WARMUP_BLOCKS.filter(b => b.topicId === topicId)
  },

  async getDrillItems(blockId: string): Promise<WarmUpDrillItem[]> {
    // Return mock drill items for now
    // In production, these would come from a content database
    const block = DEFAULT_WARMUP_BLOCKS.find(b => b.id === blockId)
    if (!block) return []

    return generateMockDrillItems(block)
  },
}

/**
 * Generate mock drill items for a block
 */
function generateMockDrillItems(block: WarmUpBlock): WarmUpDrillItem[] {
  const items: WarmUpDrillItem[] = []

  // Generate 3 items per block
  for (let i = 0; i < 3; i++) {
    items.push({
      id: `${block.id}-item-${i + 1}`,
      warmUpBlockId: block.id,
      promptText: getMockPrompt(block.topicId, i),
      type: i % 2 === 0 ? 'mcq' : 'short',
      choices: i % 2 === 0 ? getMockChoices(block.topicId, i) : undefined,
      correctAnswer: getMockAnswer(block.topicId, i),
      explanation: getMockExplanation(block.topicId, i),
      timeLimitSeconds: 20,
    })
  }

  return items
}

/**
 * Get mock prompts based on topic
 */
function getMockPrompt(topicId: string, index: number): string {
  const prompts: Record<string, string[]> = {
    vector_component: [
      'A force of 10N acts at 30° to the horizontal. What is the horizontal component?',
      'If Fx = 8N and Fy = 6N, what is the magnitude of F?',
      'A velocity of 20 m/s at 45° - what is the vertical component?',
    ],
    sign_convention: [
      'A ball falls downward. Using y-axis positive upward, what is the sign of velocity?',
      'An object moves left. Using standard x-axis, what is the sign of displacement?',
      'Gravity acts downward. If up is positive, what is the sign of g?',
    ],
    trig_identity: [
      'If sin(θ) = 0.6, what is cos(θ)?',
      'What is sin²(30°) + cos²(30°)?',
      'If θ + φ = 90°, and sin(θ) = 0.8, what is cos(φ)?',
    ],
    unit_conversion: [
      'Convert 72 km/h to m/s',
      'Convert 5 m² to cm²',
      'Convert 2.5 hours to seconds',
    ],
    algebra_manipulation: [
      'Simplify: (a + b)² - a² - b²',
      'If x² = 16, what are the possible values of x?',
      'Solve for x: 2x + 3 = 7',
    ],
    conservation_scope: [
      'A ball bounces off a wall. Is momentum conserved?',
      'A spring compresses and releases. Is mechanical energy conserved?',
      'Two balls collide inelastically. What is conserved?',
    ],
    reference_frame: [
      'In a rotating frame, what pseudo force appears?',
      'A car accelerates. What does a passenger feel?',
      'Two trains pass each other at 60 km/h each. What is relative velocity?',
    ],
    force_enumeration: [
      'A book rests on a table. How many forces act on the book?',
      'A ball hangs from a string at rest. List all forces.',
      'A block slides down a frictionless incline. What forces act on it?',
    ],
  }

  return prompts[topicId]?.[index] ?? `Question ${index + 1} for ${topicId}`
}

/**
 * Get mock choices for MCQ
 */
function getMockChoices(topicId: string, index: number): string[] {
  const choices: Record<string, string[][]> = {
    vector_component: [
      ['5√3 N', '5 N', '10√3 N', '10 N'],
      ['10 N', '14 N', '2 N', '100 N'],
      ['10√2 m/s', '20√2 m/s', '10 m/s', '40 m/s'],
    ],
    sign_convention: [
      ['Negative', 'Positive', 'Zero', 'Undefined'],
      ['Negative', 'Positive', 'Zero', 'Depends on magnitude'],
      ['Negative', 'Positive', 'Zero', 'Undefined'],
    ],
    trig_identity: [
      ['0.8', '0.6', '0.4', '1.0'],
      ['1', '0', '0.5', '2'],
      ['0.8', '0.6', '0.4', '0.2'],
    ],
    unit_conversion: [
      ['20 m/s', '72 m/s', '7.2 m/s', '200 m/s'],
      ['50000 cm²', '500 cm²', '5000 cm²', '0.05 cm²'],
      ['9000 s', '2500 s', '150 s', '90000 s'],
    ],
    algebra_manipulation: [
      ['2ab', 'a² + b²', '0', '(a+b)²'],
      ['±4', '4 only', '-4 only', '16'],
      ['2', '3', '4', '5'],
    ],
    conservation_scope: [
      ['No - external force from wall', 'Yes - closed system', 'Depends on elasticity', 'Only if perfectly elastic'],
      ['Yes - no non-conservative forces', 'No - always dissipates', 'Only if frictionless', 'Depends on spring constant'],
      ['Momentum', 'Kinetic energy', 'Both', 'Neither'],
    ],
    reference_frame: [
      ['Centrifugal force', 'Gravity', 'Friction', 'Normal force'],
      ['Pushed backward', 'Pushed forward', 'Nothing', 'Pushed sideways'],
      ['120 km/h', '60 km/h', '0 km/h', '30 km/h'],
    ],
    force_enumeration: [
      ['2', '1', '3', '4'],
      ['Gravity and Tension', 'Only Gravity', 'Only Tension', 'Gravity, Tension, and Normal'],
      ['Gravity and Normal', 'Only Gravity', 'Gravity, Normal, and Friction', 'Only Normal'],
    ],
  }

  return choices[topicId]?.[index] ?? ['A', 'B', 'C', 'D']
}

/**
 * Get mock correct answer
 */
function getMockAnswer(topicId: string, index: number): string {
  const answers: Record<string, string[]> = {
    vector_component: ['5√3 N', '10 N', '10√2 m/s'],
    sign_convention: ['Negative', 'Negative', 'Negative'],
    trig_identity: ['0.8', '1', '0.8'],
    unit_conversion: ['20 m/s', '50000 cm²', '9000 s'],
    algebra_manipulation: ['2ab', '±4', '2'],
    conservation_scope: ['No - external force from wall', 'Yes - no non-conservative forces', 'Momentum'],
    reference_frame: ['Centrifugal force', 'Pushed backward', '120 km/h'],
    force_enumeration: ['2', 'Gravity and Tension', 'Gravity and Normal'],
  }

  return answers[topicId]?.[index] ?? 'A'
}

/**
 * Get mock explanation
 */
function getMockExplanation(topicId: string, index: number): string {
  return `The correct answer follows from the fundamental principles of ${topicId.replace('_', ' ')}. Review this concept if needed.`
}

// Create singleton instances
const repository = createWarmUpRepository()

/**
 * Generate unique ID
 */
function generateId(): string {
  return `warmup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get today's date in YYYY-MM-DD format
 */
function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

// ============================================================================
// PUBLIC SERVICE API
// ============================================================================

export const warmUpService = {
  /**
   * Assign warm-up blocks for today's session
   */
  async assignWarmUp(
    patternStates: PatternDecayScore[],
    recentMistakeTypes: string[] = [],
    userId: string = DEFAULT_USER
  ): Promise<AssignWarmUpOutput> {
    return assignWarmUp(
      {
        tenantId: DEFAULT_TENANT,
        userId,
        date: getToday(),
        patternStates,
        recentMistakeTypes,
      },
      {
        repository,
        contentProvider: defaultContentProvider,
        analytics: noopAnalytics,
        generateId,
      }
    )
  },

  /**
   * Start a warm-up session
   */
  async startWarmUp(
    sessionId: string,
    userId: string = DEFAULT_USER
  ): Promise<StartWarmUpOutput> {
    return startWarmUp(
      {
        tenantId: DEFAULT_TENANT,
        userId,
        sessionId,
      },
      {
        repository,
        analytics: noopAnalytics,
      }
    )
  },

  /**
   * Submit answer for a warm-up item
   */
  async submitItem(
    sessionId: string,
    blockId: string,
    itemId: string,
    userAnswer: string,
    correctAnswer: string,
    timeSpentSeconds: number,
    userId: string = DEFAULT_USER
  ): Promise<SubmitWarmUpItemOutput> {
    return submitWarmUpItem(
      {
        tenantId: DEFAULT_TENANT,
        userId,
        sessionId,
        blockId,
        itemId,
        userAnswer,
        correctAnswer,
        timeSpentSeconds,
      },
      {
        repository,
        analytics: noopAnalytics,
      }
    )
  },

  /**
   * Complete a warm-up block
   */
  async completeBlock(
    sessionId: string,
    blockId: string,
    userId: string = DEFAULT_USER
  ): Promise<CompleteWarmUpBlockOutput> {
    return completeWarmUpBlock(
      {
        tenantId: DEFAULT_TENANT,
        userId,
        sessionId,
        blockId,
      },
      {
        repository,
        analytics: noopAnalytics,
      }
    )
  },

  /**
   * Skip warm-up session
   */
  async skipWarmUp(
    sessionId: string,
    reason?: string,
    userId: string = DEFAULT_USER
  ): Promise<SkipWarmUpOutput> {
    return skipWarmUp(
      {
        tenantId: DEFAULT_TENANT,
        userId,
        sessionId,
        reason,
      },
      {
        repository,
        analytics: noopAnalytics,
        today: getToday(),
      }
    )
  },

  /**
   * Get warm-up status for today
   */
  async getStatus(userId: string = DEFAULT_USER): Promise<GetWarmUpStatusOutput> {
    return getWarmUpStatus(
      {
        tenantId: DEFAULT_TENANT,
        userId,
        date: getToday(),
      },
      {
        repository,
      }
    )
  },

  /**
   * Get drill items for a block
   */
  async getDrillItems(blockId: string): Promise<WarmUpDrillItem[]> {
    return defaultContentProvider.getDrillItems(blockId)
  },

  /**
   * Get block by ID
   */
  async getBlock(blockId: string): Promise<WarmUpBlock | null> {
    return defaultContentProvider.getBlockById(blockId)
  },

  /**
   * Get warm-up statistics
   */
  async getStats(userId: string = DEFAULT_USER) {
    return repository.getWarmUpStats(DEFAULT_TENANT, userId)
  },
}
