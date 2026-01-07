/**
 * Warm-Up Use Cases
 *
 * Business logic for warm-up session management.
 * Pure functions with dependency injection for testability.
 */

import type {
  WarmUpSession,
  WarmUpSelectionInput,
  WarmUpSelectionResult,
  WarmUpItemResult,
  WarmUpSkipRecord,
  PatternDecayScore,
} from '@/types/warmUp'
import type {
  WarmUpRepository,
  WarmUpAnalytics,
  WarmUpContentProvider,
} from '../ports/warm-up-repository'
import {
  createWarmUpSession,
  startWarmUpSession,
  recordWarmUpItemResult,
  completeWarmUpBlock as completeWarmUpBlockEntity,
  skipWarmUpSession,
  calculateSessionScore,
  getSessionProgress,
} from '../entities/warm-up'
import {
  selectWarmUpBlocks,
  canSkipWarmUp,
  calculateSkipPenalty,
  shouldAssignWarmUp,
} from '../policies/warm-up-policy'

// ============================================================================
// ASSIGN WARM-UP
// ============================================================================

export interface AssignWarmUpInput {
  tenantId: string
  userId: string
  date: string
  patternStates: PatternDecayScore[]
  recentMistakeTypes: string[]
}

export interface AssignWarmUpOutput {
  session: WarmUpSession | null
  selection: WarmUpSelectionResult | null
  alreadyAssigned: boolean
}

/**
 * Assign warm-up blocks for today's session
 */
export async function assignWarmUp(
  input: AssignWarmUpInput,
  deps: {
    repository: WarmUpRepository
    contentProvider: WarmUpContentProvider
    analytics: WarmUpAnalytics
    generateId: () => string
  }
): Promise<AssignWarmUpOutput> {
  const { tenantId, userId, date, patternStates, recentMistakeTypes } = input
  const { repository, contentProvider, analytics, generateId } = deps

  // Check if warm-up already assigned today
  const existingSession = await repository.findTodaySession(tenantId, userId, date)
  if (existingSession) {
    return {
      session: existingSession,
      selection: null,
      alreadyAssigned: true,
    }
  }

  // Check if warm-up should be assigned
  if (!shouldAssignWarmUp(patternStates, date)) {
    return {
      session: null,
      selection: null,
      alreadyAssigned: false,
    }
  }

  // Get available blocks from content provider
  const availableBlocks = await contentProvider.getAllBlocks()

  // Select blocks using deterministic policy
  const selectionInput: WarmUpSelectionInput = {
    tenantId,
    userId,
    date,
    patternStates,
    recentMistakeTypes,
    maxBlocks: 3,
    maxDurationMinutes: 5,
  }

  const selection = selectWarmUpBlocks(selectionInput, availableBlocks)

  if (selection.selectedBlocks.length === 0) {
    return {
      session: null,
      selection,
      alreadyAssigned: false,
    }
  }

  // Create session
  const session = createWarmUpSession({
    id: generateId(),
    tenantId,
    userId,
    date,
    blocks: [...selection.selectedBlocks],
  })

  // Persist session
  const savedSession = await repository.createSession(session)

  // Track analytics
  analytics.trackSessionAssigned(
    tenantId,
    userId,
    session.id,
    selection.selectedBlocks.map(b => b.id)
  )

  return {
    session: savedSession,
    selection,
    alreadyAssigned: false,
  }
}

// ============================================================================
// START WARM-UP
// ============================================================================

export interface StartWarmUpInput {
  tenantId: string
  userId: string
  sessionId: string
}

export interface StartWarmUpOutput {
  session: WarmUpSession
  firstBlockId: string
}

/**
 * Start a warm-up session
 */
export async function startWarmUp(
  input: StartWarmUpInput,
  deps: {
    repository: WarmUpRepository
    analytics: WarmUpAnalytics
  }
): Promise<StartWarmUpOutput> {
  const { tenantId, sessionId } = input
  const { repository, analytics } = deps

  // Load session
  const session = await repository.findSessionById(tenantId, sessionId)
  if (!session) {
    throw new Error(`Warm-up session not found: ${sessionId}`)
  }

  if (session.status !== 'assigned') {
    throw new Error(`Cannot start session with status: ${session.status}`)
  }

  // Start session
  const startedSession = startWarmUpSession(session)
  const updatedSession = await repository.updateSession(startedSession)

  // Track analytics
  analytics.trackSessionStarted(tenantId, input.userId, sessionId)

  return {
    session: updatedSession,
    firstBlockId: updatedSession.assignedBlocks[0].blockId,
  }
}

// ============================================================================
// SUBMIT ITEM ANSWER
// ============================================================================

export interface SubmitWarmUpItemInput {
  tenantId: string
  userId: string
  sessionId: string
  blockId: string
  itemId: string
  userAnswer: string
  correctAnswer: string
  timeSpentSeconds: number
}

export interface SubmitWarmUpItemOutput {
  session: WarmUpSession
  itemResult: WarmUpItemResult
  isCorrect: boolean
  blockCompleted: boolean
  sessionCompleted: boolean
}

/**
 * Submit answer for a warm-up item
 */
export async function submitWarmUpItem(
  input: SubmitWarmUpItemInput,
  deps: {
    repository: WarmUpRepository
    analytics: WarmUpAnalytics
  }
): Promise<SubmitWarmUpItemOutput> {
  const {
    tenantId,
    userId,
    sessionId,
    blockId,
    itemId,
    userAnswer,
    correctAnswer,
    timeSpentSeconds,
  } = input
  const { repository, analytics } = deps

  // Load session
  let session = await repository.findSessionById(tenantId, sessionId)
  if (!session) {
    throw new Error(`Warm-up session not found: ${sessionId}`)
  }

  // Normalize answers for comparison
  const normalizedUser = userAnswer.trim().toLowerCase()
  const normalizedCorrect = correctAnswer.trim().toLowerCase()
  const isCorrect = normalizedUser === normalizedCorrect

  // Create item result
  const itemResult: WarmUpItemResult = {
    itemId,
    userAnswer,
    isCorrect,
    attemptCount: 1,
    timeSpentSeconds,
  }

  // Record result
  session = recordWarmUpItemResult(session, blockId, itemResult)

  // Save item result
  await repository.recordItemResult(tenantId, sessionId, blockId, itemResult)

  // Track analytics
  analytics.trackItemCompleted(
    tenantId,
    userId,
    sessionId,
    blockId,
    itemId,
    isCorrect,
    timeSpentSeconds
  )

  // Update session in repository
  session = await repository.updateSession(session)

  return {
    session,
    itemResult,
    isCorrect,
    blockCompleted: false, // Will be set by completeBlock
    sessionCompleted: session.status === 'completed',
  }
}

// ============================================================================
// COMPLETE BLOCK
// ============================================================================

export interface CompleteWarmUpBlockInput {
  tenantId: string
  userId: string
  sessionId: string
  blockId: string
}

export interface CompleteWarmUpBlockOutput {
  session: WarmUpSession
  blockScore: number
  sessionCompleted: boolean
  nextBlockId: string | null
}

/**
 * Complete a warm-up block and move to next
 */
export async function completeWarmUpBlock(
  input: CompleteWarmUpBlockInput,
  deps: {
    repository: WarmUpRepository
    analytics: WarmUpAnalytics
  }
): Promise<CompleteWarmUpBlockOutput> {
  const { tenantId, userId, sessionId, blockId } = input
  const { repository, analytics } = deps

  // Load session
  let session = await repository.findSessionById(tenantId, sessionId)
  if (!session) {
    throw new Error(`Warm-up session not found: ${sessionId}`)
  }

  // Complete block
  session = completeWarmUpBlockEntity(session, blockId)
  session = await repository.updateSession(session)

  // Get completed block
  const completedBlock = session.assignedBlocks.find(b => b.blockId === blockId)
  const blockScore = completedBlock?.score ?? 0

  // Track analytics
  analytics.trackBlockCompleted(tenantId, userId, sessionId, blockId, blockScore)

  // Check if session completed
  const sessionCompleted = session.status === 'completed'

  if (sessionCompleted) {
    const totalScore = calculateSessionScore(session)
    const startTime = session.startedAt ? new Date(session.startedAt).getTime() : 0
    const endTime = session.completedAt
      ? new Date(session.completedAt).getTime()
      : Date.now()
    const durationSeconds = Math.round((endTime - startTime) / 1000)

    analytics.trackSessionCompleted(
      tenantId,
      userId,
      sessionId,
      totalScore,
      durationSeconds
    )
  }

  // Find next block
  const nextBlock = session.assignedBlocks.find(b => b.status === 'in_progress')

  return {
    session,
    blockScore,
    sessionCompleted,
    nextBlockId: nextBlock?.blockId ?? null,
  }
}

// ============================================================================
// SKIP WARM-UP
// ============================================================================

export interface SkipWarmUpInput {
  tenantId: string
  userId: string
  sessionId: string
  reason?: string
}

export interface SkipWarmUpOutput {
  session: WarmUpSession
  canSkip: boolean
  skipDeniedReason?: string
  masteryPenalties: Record<string, number>
}

/**
 * Skip warm-up session (once per day limit)
 */
export async function skipWarmUp(
  input: SkipWarmUpInput,
  deps: {
    repository: WarmUpRepository
    analytics: WarmUpAnalytics
    today: string
  }
): Promise<SkipWarmUpOutput> {
  const { tenantId, userId, sessionId, reason } = input
  const { repository, analytics, today } = deps

  // Load session
  let session = await repository.findSessionById(tenantId, sessionId)
  if (!session) {
    throw new Error(`Warm-up session not found: ${sessionId}`)
  }

  // Check skip allowance
  const skipRecord = await repository.getSkipRecord(tenantId, userId)
  const { canSkip, reason: denyReason } = canSkipWarmUp(skipRecord, today)

  if (!canSkip) {
    return {
      session,
      canSkip: false,
      skipDeniedReason: denyReason,
      masteryPenalties: {},
    }
  }

  // Skip session
  session = skipWarmUpSession(session, reason)
  session = await repository.updateSession(session)

  // Calculate and apply penalties
  const blocks = session.assignedBlocks
  const { penaltyPerTopic } = calculateSkipPenalty(
    blocks.map(b => ({ topicId: b.blockId, id: b.blockId } as any))
  )

  // Update skip record
  const newSkipRecord: WarmUpSkipRecord = {
    userId,
    tenantId,
    lastSkipDate: today,
    skipCount: (skipRecord?.skipCount ?? 0) + 1,
  }
  await repository.updateSkipRecord(newSkipRecord)

  // Track analytics
  analytics.trackSessionSkipped(tenantId, userId, sessionId, reason)

  return {
    session,
    canSkip: true,
    masteryPenalties: penaltyPerTopic,
  }
}

// ============================================================================
// GET SESSION STATUS
// ============================================================================

export interface GetWarmUpStatusInput {
  tenantId: string
  userId: string
  date: string
}

export interface GetWarmUpStatusOutput {
  hasSession: boolean
  session: WarmUpSession | null
  progress: {
    completedBlocks: number
    totalBlocks: number
    percentComplete: number
    currentBlockOrder: number | null
  } | null
  canSkip: boolean
}

/**
 * Get warm-up status for today
 */
export async function getWarmUpStatus(
  input: GetWarmUpStatusInput,
  deps: {
    repository: WarmUpRepository
  }
): Promise<GetWarmUpStatusOutput> {
  const { tenantId, userId, date } = input
  const { repository } = deps

  const session = await repository.findTodaySession(tenantId, userId, date)

  if (!session) {
    return {
      hasSession: false,
      session: null,
      progress: null,
      canSkip: true,
    }
  }

  const progress = getSessionProgress(session)
  const skipRecord = await repository.getSkipRecord(tenantId, userId)
  const { canSkip } = canSkipWarmUp(skipRecord, date)

  return {
    hasSession: true,
    session,
    progress,
    canSkip,
  }
}
