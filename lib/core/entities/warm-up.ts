/**
 * Warm-Up Session Entity
 *
 * Pure TypeScript domain entity for warm-up sessions.
 * No framework dependencies, no side effects.
 */

import type {
  WarmUpBlock,
  WarmUpSession,
  WarmUpSessionStatus,
  AssignedWarmUpBlock,
  WarmUpItemResult,
  WarmUpDrillItem,
  WARMUP_POLICY,
} from '@/types/warmUp'

// Re-export policy constants for use in this module
export const WARMUP_POLICY_CONSTANTS = {
  MIN_DURATION_MINUTES: 2,
  MAX_DURATION_MINUTES: 5,
  MAX_BLOCKS_PER_SESSION: 3,
  MAX_ITEMS_PER_BLOCK: 5,
  DEFAULT_ITEM_TIME_LIMIT_SECONDS: 20,
  SKIP_PENALTY_MASTERY_DELTA: -0.05,
  DECAY_THRESHOLD_FOR_INCLUSION: 0.3,
  MASTERY_THRESHOLD_FOR_SKIP: 0.85,
  SKIPS_ALLOWED_PER_DAY: 1,
} as const

/**
 * Create a new warm-up block configuration
 */
export function createWarmUpBlock(params: {
  id: string
  topicId: string
  title: string
  description: string
  durationMinutes: number
  drillTemplateIds: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  prerequisites?: string[]
}): WarmUpBlock {
  const { durationMinutes } = params

  // Validate duration is within policy limits
  const clampedDuration = Math.max(
    WARMUP_POLICY_CONSTANTS.MIN_DURATION_MINUTES,
    Math.min(WARMUP_POLICY_CONSTANTS.MAX_DURATION_MINUTES, durationMinutes)
  )

  return {
    id: params.id,
    topicId: params.topicId,
    title: params.title,
    description: params.description,
    durationMinutes: clampedDuration,
    drillTemplateIds: [...params.drillTemplateIds],
    difficulty: params.difficulty,
    prerequisites: params.prerequisites ? [...params.prerequisites] : undefined,
  }
}

/**
 * Create a new warm-up session
 */
export function createWarmUpSession(params: {
  id: string
  tenantId: string
  userId: string
  date: string
  blocks: WarmUpBlock[]
}): WarmUpSession {
  const assignedBlocks: AssignedWarmUpBlock[] = params.blocks.map((block, index) => ({
    blockId: block.id,
    order: index + 1,
    status: 'pending' as const,
  }))

  return {
    id: params.id,
    tenantId: params.tenantId,
    userId: params.userId,
    date: params.date,
    assignedBlocks,
    status: 'assigned',
  }
}

/**
 * Start a warm-up session
 */
export function startWarmUpSession(session: WarmUpSession): WarmUpSession {
  if (session.status !== 'assigned') {
    return session // Cannot start a non-assigned session
  }

  const updatedBlocks = session.assignedBlocks.map((block, index) =>
    index === 0
      ? { ...block, status: 'in_progress' as const, startedAt: new Date().toISOString() }
      : block
  )

  return {
    ...session,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    assignedBlocks: updatedBlocks,
  }
}

/**
 * Record a warm-up item result
 * Idempotent: if the item already has a result, it won't be added again
 */
export function recordWarmUpItemResult(
  session: WarmUpSession,
  blockId: string,
  result: WarmUpItemResult
): WarmUpSession {
  const blockIndex = session.assignedBlocks.findIndex(b => b.blockId === blockId)
  if (blockIndex === -1) {
    return session // Block not found
  }

  const block = session.assignedBlocks[blockIndex]
  const existingResults = block.itemResults || []

  // Check if this item already has a result (idempotency)
  const alreadyRecorded = existingResults.some(r => r.itemId === result.itemId)
  if (alreadyRecorded) {
    return session // Item already recorded, skip duplicate
  }

  const updatedResults = [...existingResults, result]

  const updatedBlock: AssignedWarmUpBlock = {
    ...block,
    itemResults: updatedResults,
  }

  const updatedBlocks = [...session.assignedBlocks]
  updatedBlocks[blockIndex] = updatedBlock

  return {
    ...session,
    assignedBlocks: updatedBlocks,
  }
}

/**
 * Complete a warm-up block and advance to next
 */
export function completeWarmUpBlock(
  session: WarmUpSession,
  blockId: string
): WarmUpSession {
  const blockIndex = session.assignedBlocks.findIndex(b => b.blockId === blockId)
  if (blockIndex === -1) {
    return session
  }

  const block = session.assignedBlocks[blockIndex]
  const itemResults = block.itemResults || []

  // Calculate score: percentage of correct answers
  const correctCount = itemResults.filter(r => r.isCorrect).length
  const totalCount = itemResults.length
  const score = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

  const completedBlock: AssignedWarmUpBlock = {
    ...block,
    status: 'completed',
    score,
    completedAt: new Date().toISOString(),
  }

  const updatedBlocks = [...session.assignedBlocks]
  updatedBlocks[blockIndex] = completedBlock

  // Start next block if available
  const nextBlockIndex = blockIndex + 1
  if (nextBlockIndex < updatedBlocks.length) {
    updatedBlocks[nextBlockIndex] = {
      ...updatedBlocks[nextBlockIndex],
      status: 'in_progress',
      startedAt: new Date().toISOString(),
    }
  }

  // Check if all blocks are completed
  const allCompleted = updatedBlocks.every(b => b.status === 'completed')

  return {
    ...session,
    assignedBlocks: updatedBlocks,
    status: allCompleted ? 'completed' : session.status,
    completedAt: allCompleted ? new Date().toISOString() : undefined,
  }
}

/**
 * Skip the warm-up session
 */
export function skipWarmUpSession(
  session: WarmUpSession,
  reason?: string
): WarmUpSession {
  if (session.status === 'completed') {
    return session // Cannot skip completed session
  }

  return {
    ...session,
    status: 'skipped',
    skippedAt: new Date().toISOString(),
    skipReason: reason,
  }
}

/**
 * Calculate total warm-up session score
 */
export function calculateSessionScore(session: WarmUpSession): number {
  const completedBlocks = session.assignedBlocks.filter(
    b => b.status === 'completed' && b.score !== undefined
  )

  if (completedBlocks.length === 0) {
    return 0
  }

  const totalScore = completedBlocks.reduce((sum, block) => sum + (block.score || 0), 0)
  return Math.round(totalScore / completedBlocks.length)
}

/**
 * Get current block in progress
 */
export function getCurrentBlock(session: WarmUpSession): AssignedWarmUpBlock | null {
  return session.assignedBlocks.find(b => b.status === 'in_progress') || null
}

/**
 * Get session progress summary
 */
export function getSessionProgress(session: WarmUpSession): {
  completedBlocks: number
  totalBlocks: number
  percentComplete: number
  currentBlockOrder: number | null
} {
  const totalBlocks = session.assignedBlocks.length
  const completedBlocks = session.assignedBlocks.filter(b => b.status === 'completed').length
  const currentBlock = getCurrentBlock(session)

  return {
    completedBlocks,
    totalBlocks,
    percentComplete: totalBlocks > 0 ? Math.round((completedBlocks / totalBlocks) * 100) : 0,
    currentBlockOrder: currentBlock?.order ?? null,
  }
}

/**
 * Validate warm-up block configuration
 */
export function validateWarmUpBlock(block: WarmUpBlock): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!block.id) {
    errors.push('Block ID is required')
  }

  if (!block.topicId) {
    errors.push('Topic ID is required')
  }

  if (!block.title) {
    errors.push('Title is required')
  }

  if (
    block.durationMinutes < WARMUP_POLICY_CONSTANTS.MIN_DURATION_MINUTES ||
    block.durationMinutes > WARMUP_POLICY_CONSTANTS.MAX_DURATION_MINUTES
  ) {
    errors.push(
      `Duration must be between ${WARMUP_POLICY_CONSTANTS.MIN_DURATION_MINUTES} and ${WARMUP_POLICY_CONSTANTS.MAX_DURATION_MINUTES} minutes`
    )
  }

  if (block.drillTemplateIds.length === 0) {
    errors.push('At least one drill template is required')
  }

  if (block.drillTemplateIds.length > WARMUP_POLICY_CONSTANTS.MAX_ITEMS_PER_BLOCK) {
    errors.push(
      `Maximum ${WARMUP_POLICY_CONSTANTS.MAX_ITEMS_PER_BLOCK} items per block`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Create a warm-up drill item
 */
export function createWarmUpDrillItem(params: {
  id: string
  warmUpBlockId: string
  promptText: string
  type: 'mcq' | 'short' | 'fill'
  choices?: string[]
  correctAnswer: string
  explanation: string
  timeLimitSeconds?: number
}): WarmUpDrillItem {
  return {
    id: params.id,
    warmUpBlockId: params.warmUpBlockId,
    promptText: params.promptText,
    type: params.type,
    choices: params.choices ? [...params.choices] : undefined,
    correctAnswer: params.correctAnswer,
    explanation: params.explanation,
    timeLimitSeconds:
      params.timeLimitSeconds ?? WARMUP_POLICY_CONSTANTS.DEFAULT_ITEM_TIME_LIMIT_SECONDS,
  }
}
