/**
 * useWarmUp Hook
 *
 * React hook for managing warm-up sessions in UI components.
 * Uses API endpoints for all operations.
 */

import { useState, useCallback, useEffect } from 'react'
import type {
  WarmUpSession,
  WarmUpBlock,
  WarmUpDrillItem,
  PatternDecayScore,
} from '@/types/warmUp'

/**
 * Phase of the warm-up flow
 */
export type WarmUpPhase =
  | 'loading'   // Initial load
  | 'gate'      // Show warm-up gate (start or skip)
  | 'playing'   // Active drill session
  | 'results'   // Show results after completion
  | 'complete'  // Done (completed or skipped), pass through
  | 'error'     // Error state

export interface WarmUpProgress {
  completedBlocks: number
  totalBlocks: number
  percentComplete: number
  currentBlockOrder: number | null
}

export interface WarmUpState {
  phase: WarmUpPhase
  session: WarmUpSession | null
  currentBlock: WarmUpBlock | null
  currentItems: WarmUpDrillItem[]
  currentItemIndex: number
  progress: WarmUpProgress | null
  canSkip: boolean
  isLoading: boolean
  error: string | null
}

export interface UseWarmUpReturn extends WarmUpState {
  // Actions
  checkStatus: () => Promise<void>
  checkAndAssign: (
    patternStates: PatternDecayScore[],
    recentMistakes?: string[]
  ) => Promise<void>
  start: () => Promise<void>
  submitAnswer: (answer: string, timeSpentSeconds: number) => Promise<boolean>
  skipSession: (reason?: string) => Promise<boolean>
  finishResults: () => void
  reset: () => void

  // Computed
  isActive: boolean
  isCompleted: boolean
  hasSession: boolean
}

const initialState: WarmUpState = {
  phase: 'loading',
  session: null,
  currentBlock: null,
  currentItems: [],
  currentItemIndex: 0,
  progress: null,
  canSkip: true,
  isLoading: true,
  error: null,
}

/**
 * Hook for managing warm-up sessions
 *
 * @param userId - User ID (defaults to 'anonymous')
 */
export function useWarmUp(userId: string = 'anonymous'): UseWarmUpReturn {
  const [state, setState] = useState<WarmUpState>(initialState)

  /**
   * Check warm-up status via API
   */
  const checkStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch(`/api/warmup/status?userId=${userId}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to get status')
      }

      if (!data.hasSession) {
        // No warm-up assigned yet
        setState(prev => ({
          ...prev,
          phase: 'gate',
          session: null,
          canSkip: data.canSkip ?? true,
          isLoading: false,
        }))
      } else if (data.session?.status === 'completed' || data.session?.status === 'skipped') {
        // Already done today
        setState(prev => ({
          ...prev,
          phase: 'complete',
          session: data.session,
          isLoading: false,
        }))
      } else if (data.session?.status === 'in_progress') {
        // Resume in-progress session - load current block
        const session = data.session
        const inProgressBlock = session.assignedBlocks.find(
          (b: { status: string }) => b.status === 'in_progress'
        )

        if (inProgressBlock) {
          const drillsResponse = await fetch(`/api/warmup/drills/${inProgressBlock.blockId}`)
          const drillsData = await drillsResponse.json()

          const completedCount = session.assignedBlocks.filter(
            (b: { status: string }) => b.status === 'completed'
          ).length

          setState(prev => ({
            ...prev,
            phase: 'playing',
            session,
            currentBlock: drillsData.block,
            currentItems: drillsData.drillItems || [],
            currentItemIndex: inProgressBlock.itemResults?.length ?? 0,
            progress: {
              completedBlocks: completedCount,
              totalBlocks: session.assignedBlocks.length,
              percentComplete: Math.round((completedCount / session.assignedBlocks.length) * 100),
              currentBlockOrder: completedCount + 1,
            },
            canSkip: data.canSkip ?? true,
            isLoading: false,
          }))
        } else {
          setState(prev => ({
            ...prev,
            phase: 'playing',
            session,
            canSkip: data.canSkip ?? true,
            isLoading: false,
          }))
        }
      } else {
        // Session assigned but not started
        setState(prev => ({
          ...prev,
          phase: 'gate',
          session: data.session,
          progress: data.progress,
          canSkip: data.canSkip ?? true,
          isLoading: false,
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        phase: 'error',
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check warm-up status',
      }))
    }
  }, [userId])

  // Check for existing session on mount
  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  /**
   * Check pattern states and assign warm-up if needed
   */
  const checkAndAssign = useCallback(
    async (patternStates: PatternDecayScore[], recentMistakes: string[] = []) => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        const response = await fetch('/api/warmup/assign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, patternStates, recentMistakeTypes: recentMistakes }),
        })
        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Failed to assign warm-up')
        }

        if (data.session) {
          setState(prev => ({
            ...prev,
            phase: 'gate',
            session: data.session,
            progress: {
              completedBlocks: 0,
              totalBlocks: data.session.assignedBlocks.length,
              percentComplete: 0,
              currentBlockOrder: null,
            },
            canSkip: true,
            isLoading: false,
          }))
        } else {
          // No warm-up needed
          setState(prev => ({
            ...prev,
            phase: 'complete',
            isLoading: false,
          }))
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          phase: 'error',
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to assign warm-up',
        }))
      }
    },
    [userId]
  )

  /**
   * Start the warm-up session
   */
  const start = useCallback(async () => {
    const { session } = state
    if (!session) {
      setState(prev => ({ ...prev, error: 'No warm-up session to start' }))
      return
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch('/api/warmup/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, userId }),
      })
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to start warm-up')
      }

      // Load first block's items
      const drillsResponse = await fetch(`/api/warmup/drills/${data.firstBlockId}`)
      const drillsData = await drillsResponse.json()

      setState(prev => ({
        ...prev,
        phase: 'playing',
        session: data.session,
        currentBlock: drillsData.block,
        currentItems: drillsData.drillItems || [],
        currentItemIndex: 0,
        progress: {
          completedBlocks: 0,
          totalBlocks: data.session.assignedBlocks.length,
          percentComplete: 0,
          currentBlockOrder: 1,
        },
        isLoading: false,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        phase: 'error',
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start warm-up',
      }))
    }
  }, [state.session, userId])

  /**
   * Submit answer for current item
   */
  const submitAnswer = useCallback(
    async (answer: string, timeSpentSeconds: number): Promise<boolean> => {
      const { session, currentBlock, currentItems, currentItemIndex } = state

      if (!session || !currentBlock || currentItems.length === 0) {
        setState(prev => ({ ...prev, error: 'No active warm-up item' }))
        return false
      }

      const currentItem = currentItems[currentItemIndex]
      if (!currentItem) {
        setState(prev => ({ ...prev, error: 'Invalid item index' }))
        return false
      }

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        const response = await fetch('/api/warmup/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.id,
            blockId: currentBlock.id,
            itemId: currentItem.id,
            userAnswer: answer,
            correctAnswer: currentItem.correctAnswer,
            timeSpentSeconds,
            userId,
          }),
        })
        const result = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to submit answer')
        }

        const nextItemIndex = currentItemIndex + 1
        const blockCompleted = nextItemIndex >= currentItems.length

        if (blockCompleted) {
          // Complete the block via API
          const blockResponse = await fetch('/api/warmup/complete-block', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId: session.id,
              blockId: currentBlock.id,
              userId,
            }),
          })
          const blockResult = await blockResponse.json()

          if (!blockResult.success) {
            throw new Error(blockResult.error || 'Failed to complete block')
          }

          if (blockResult.sessionCompleted) {
            // Session is done - show results
            setState(prev => ({
              ...prev,
              phase: 'results',
              session: blockResult.session,
              currentBlock: null,
              currentItems: [],
              currentItemIndex: 0,
              progress: {
                completedBlocks: blockResult.session.assignedBlocks.length,
                totalBlocks: blockResult.session.assignedBlocks.length,
                percentComplete: 100,
                currentBlockOrder: null,
              },
              isLoading: false,
            }))
          } else if (blockResult.nextBlockId) {
            // Load next block
            const drillsResponse = await fetch(`/api/warmup/drills/${blockResult.nextBlockId}`)
            const drillsData = await drillsResponse.json()

            const completedCount = blockResult.session.assignedBlocks.filter(
              (b: { status: string }) => b.status === 'completed'
            ).length

            setState(prev => ({
              ...prev,
              session: blockResult.session,
              currentBlock: drillsData.block,
              currentItems: drillsData.drillItems || [],
              currentItemIndex: 0,
              progress: {
                completedBlocks: completedCount,
                totalBlocks: blockResult.session.assignedBlocks.length,
                percentComplete: Math.round(
                  (completedCount / blockResult.session.assignedBlocks.length) * 100
                ),
                currentBlockOrder: completedCount + 1,
              },
              isLoading: false,
            }))
          }
        } else {
          // Move to next item
          setState(prev => ({
            ...prev,
            session: result.session,
            currentItemIndex: nextItemIndex,
            isLoading: false,
          }))
        }

        return result.isCorrect
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to submit answer',
        }))
        return false
      }
    },
    [state.session, state.currentBlock, state.currentItems, state.currentItemIndex, userId]
  )

  /**
   * Skip the warm-up session
   */
  const skipSession = useCallback(
    async (reason?: string): Promise<boolean> => {
      const { session } = state
      if (!session) {
        setState(prev => ({ ...prev, error: 'No warm-up session to skip' }))
        return false
      }

      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        const result = await warmUpService.skipWarmUp(session.id, reason)

        if (!result.canSkip) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: result.skipDeniedReason ?? 'Cannot skip warm-up',
            canSkip: false,
          }))
          return false
        }

        setState(prev => ({
          ...prev,
          session: result.session,
          currentBlock: null,
          currentItems: [],
          currentItemIndex: 0,
          isLoading: false,
        }))

        return true
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to skip warm-up',
        }))
        return false
      }
    },
    [state.session]
  )

  /**
   * Reset the warm-up state
   */
  const reset = useCallback(() => {
    setState(initialState)
  }, [])

  // Computed values
  const isActive = state.session?.status === 'in_progress'
  const isCompleted = state.session?.status === 'completed'
  const hasSession = state.session !== null

  return {
    ...state,
    checkAndAssign,
    start,
    submitAnswer,
    skipSession,
    reset,
    isActive,
    isCompleted,
    hasSession,
  }
}
