/**
 * useWarmUp Hook
 *
 * React hook for managing warm-up sessions in UI components.
 */

import { useState, useCallback, useEffect } from 'react'
import type {
  WarmUpSession,
  WarmUpBlock,
  WarmUpDrillItem,
  PatternDecayScore,
} from '@/types/warmUp'
import { warmUpService } from '@/lib/warmUp'

export interface WarmUpProgress {
  completedBlocks: number
  totalBlocks: number
  percentComplete: number
  currentBlockOrder: number | null
}

export interface WarmUpState {
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
  checkAndAssign: (
    patternStates: PatternDecayScore[],
    recentMistakes?: string[]
  ) => Promise<void>
  start: () => Promise<void>
  submitAnswer: (answer: string, timeSpentSeconds: number) => Promise<boolean>
  skipSession: (reason?: string) => Promise<boolean>
  reset: () => void

  // Computed
  isActive: boolean
  isCompleted: boolean
  hasSession: boolean
}

const initialState: WarmUpState = {
  session: null,
  currentBlock: null,
  currentItems: [],
  currentItemIndex: 0,
  progress: null,
  canSkip: true,
  isLoading: false,
  error: null,
}

/**
 * Hook for managing warm-up sessions
 */
export function useWarmUp(): UseWarmUpReturn {
  const [state, setState] = useState<WarmUpState>(initialState)

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession()
  }, [])

  /**
   * Check for existing warm-up session
   */
  const checkExistingSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const status = await warmUpService.getStatus()

      if (status.hasSession && status.session) {
        const session = status.session

        // Load current block if in progress
        let currentBlock: WarmUpBlock | null = null
        let currentItems: WarmUpDrillItem[] = []
        let currentItemIndex = 0

        if (session.status === 'in_progress') {
          const inProgressBlock = session.assignedBlocks.find(
            b => b.status === 'in_progress'
          )
          if (inProgressBlock) {
            currentBlock = await warmUpService.getBlock(inProgressBlock.blockId)
            if (currentBlock) {
              currentItems = await warmUpService.getDrillItems(currentBlock.id)
              currentItemIndex = inProgressBlock.itemResults?.length ?? 0
            }
          }
        }

        setState(prev => ({
          ...prev,
          session,
          currentBlock,
          currentItems,
          currentItemIndex,
          progress: status.progress,
          canSkip: status.canSkip,
          isLoading: false,
        }))
      } else {
        setState(prev => ({
          ...prev,
          isLoading: false,
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to check warm-up status',
      }))
    }
  }, [])

  /**
   * Check pattern states and assign warm-up if needed
   */
  const checkAndAssign = useCallback(
    async (patternStates: PatternDecayScore[], recentMistakes: string[] = []) => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))

        const result = await warmUpService.assignWarmUp(patternStates, recentMistakes)

        if (result.session) {
          setState(prev => ({
            ...prev,
            session: result.session,
            progress: {
              completedBlocks: 0,
              totalBlocks: result.session!.assignedBlocks.length,
              percentComplete: 0,
              currentBlockOrder: null,
            },
            canSkip: true,
            isLoading: false,
          }))
        } else {
          setState(prev => ({ ...prev, isLoading: false }))
        }
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to assign warm-up',
        }))
      }
    },
    []
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

      const result = await warmUpService.startWarmUp(session.id)

      // Load first block's items
      const firstBlock = await warmUpService.getBlock(result.firstBlockId)
      const items = firstBlock ? await warmUpService.getDrillItems(firstBlock.id) : []

      setState(prev => ({
        ...prev,
        session: result.session,
        currentBlock: firstBlock,
        currentItems: items,
        currentItemIndex: 0,
        progress: {
          completedBlocks: 0,
          totalBlocks: result.session.assignedBlocks.length,
          percentComplete: 0,
          currentBlockOrder: 1,
        },
        isLoading: false,
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to start warm-up',
      }))
    }
  }, [state.session])

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

        const result = await warmUpService.submitItem(
          session.id,
          currentBlock.id,
          currentItem.id,
          answer,
          currentItem.correctAnswer,
          timeSpentSeconds
        )

        const nextItemIndex = currentItemIndex + 1
        const blockCompleted = nextItemIndex >= currentItems.length

        if (blockCompleted) {
          // Complete the block
          const blockResult = await warmUpService.completeBlock(
            session.id,
            currentBlock.id
          )

          if (blockResult.sessionCompleted) {
            // Session is done
            setState(prev => ({
              ...prev,
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
            const nextBlock = await warmUpService.getBlock(blockResult.nextBlockId)
            const nextItems = nextBlock
              ? await warmUpService.getDrillItems(nextBlock.id)
              : []

            const completedCount = blockResult.session.assignedBlocks.filter(
              b => b.status === 'completed'
            ).length

            setState(prev => ({
              ...prev,
              session: blockResult.session,
              currentBlock: nextBlock,
              currentItems: nextItems,
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
    [state.session, state.currentBlock, state.currentItems, state.currentItemIndex]
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
