'use client'

/**
 * WarmUpModal Component
 *
 * Modal overlay that presents warm-up drills before main session.
 * Blocks main content until warm-up is completed or skipped.
 */

import { useState, useEffect, useCallback } from 'react'
import { useWarmUp } from '@/hooks/useWarmUp'
import type { PatternDecayScore, WarmUpDrillItem } from '@/types/warmUp'
import { X, Play, SkipForward, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface WarmUpModalProps {
  patternStates: PatternDecayScore[]
  recentMistakes?: string[]
  onComplete: () => void
  onSkip: () => void
}

export function WarmUpModal({
  patternStates,
  recentMistakes = [],
  onComplete,
  onSkip,
}: WarmUpModalProps) {
  const {
    session,
    currentBlock,
    currentItems,
    currentItemIndex,
    progress,
    canSkip,
    isLoading,
    error,
    isActive,
    isCompleted,
    hasSession,
    checkAndAssign,
    start,
    submitAnswer,
    skipSession,
  } = useWarmUp()

  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [itemStartTime, setItemStartTime] = useState<number>(Date.now())
  const [showFeedback, setShowFeedback] = useState<boolean>(false)
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; explanation: string } | null>(null)
  const [skipConfirm, setSkipConfirm] = useState(false)

  // Initialize warm-up on mount
  useEffect(() => {
    checkAndAssign(patternStates, recentMistakes)
  }, [checkAndAssign, patternStates, recentMistakes])

  // Track item start time
  useEffect(() => {
    if (currentItemIndex >= 0) {
      setItemStartTime(Date.now())
      setSelectedAnswer('')
      setShowFeedback(false)
      setLastResult(null)
    }
  }, [currentItemIndex, currentBlock])

  // Handle completion
  useEffect(() => {
    if (isCompleted) {
      onComplete()
    }
  }, [isCompleted, onComplete])

  const currentItem = currentItems[currentItemIndex] as WarmUpDrillItem | undefined

  const handleSubmit = useCallback(async () => {
    if (!currentItem || !selectedAnswer) return

    const timeSpent = Math.round((Date.now() - itemStartTime) / 1000)
    const isCorrect = await submitAnswer(selectedAnswer, timeSpent)

    setLastResult({
      isCorrect,
      explanation: currentItem.explanation,
    })
    setShowFeedback(true)
  }, [currentItem, selectedAnswer, itemStartTime, submitAnswer])

  const handleContinue = useCallback(() => {
    setShowFeedback(false)
    setLastResult(null)
    setSelectedAnswer('')
  }, [])

  const handleSkip = useCallback(async () => {
    if (!skipConfirm) {
      setSkipConfirm(true)
      return
    }

    const skipped = await skipSession('User chose to skip')
    if (skipped) {
      onSkip()
    }
  }, [skipConfirm, skipSession, onSkip])

  // No session needed
  if (!hasSession && !isLoading) {
    return null
  }

  // Loading state
  if (isLoading && !session) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
            <span className="text-gray-700 dark:text-gray-300">Preparing warm-up...</span>
          </div>
        </div>
      </div>
    )
  }

  // Pre-start view
  if (session && session.status === 'assigned') {
    const totalDuration = session.assignedBlocks.length * 3 // Approximate minutes

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 shadow-xl">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Quick Warm-Up
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Let&apos;s refresh some key concepts before diving in.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 mb-2">
              <Clock className="w-4 h-4" />
              <span className="font-medium">~{totalDuration} minutes</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {session.assignedBlocks.length} topic{session.assignedBlocks.length > 1 ? 's' : ''} to review
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={start}
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5" />
              Start Warm-Up
            </button>

            {canSkip && (
              <button
                onClick={handleSkip}
                disabled={isLoading}
                className={`py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  skipConfirm
                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-500'
                }`}
              >
                <SkipForward className="w-5 h-5" />
                {skipConfirm ? 'Confirm Skip' : 'Skip'}
              </button>
            )}
          </div>

          {skipConfirm && (
            <p className="mt-3 text-sm text-orange-600 dark:text-orange-400 text-center">
              Skipping applies a small penalty. You can only skip once per day.
            </p>
          )}
        </div>
      </div>
    )
  }

  // Active warm-up view
  if (isActive && currentBlock && currentItem) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4 shadow-xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {currentBlock.title}
              </h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Block {progress?.currentBlockOrder} of {progress?.totalBlocks}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{
                  width: `${
                    ((currentItemIndex + (showFeedback ? 1 : 0)) / currentItems.length) * 100
                  }%`,
                }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Question {currentItemIndex + 1} of {currentItems.length}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {showFeedback && lastResult ? (
              /* Feedback view */
              <div className="text-center">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                    lastResult.isCorrect
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}
                >
                  {lastResult.isCorrect ? (
                    <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                  )}
                </div>

                <h4
                  className={`text-xl font-bold mb-2 ${
                    lastResult.isCorrect
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {lastResult.isCorrect ? 'Correct!' : 'Not quite'}
                </h4>

                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  {lastResult.explanation}
                </p>

                {!lastResult.isCorrect && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-4 mb-6 text-left">
                    <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                      Correct answer:
                    </div>
                    <div className="text-blue-900 dark:text-blue-100">
                      {currentItem.correctAnswer}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleContinue}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-8 rounded-lg font-medium transition-colors"
                >
                  Continue
                </button>
              </div>
            ) : (
              /* Question view */
              <>
                <div className="mb-6">
                  <p className="text-lg text-gray-900 dark:text-white">
                    {currentItem.promptText}
                  </p>
                </div>

                {currentItem.type === 'mcq' && currentItem.choices ? (
                  <div className="space-y-3 mb-6">
                    {currentItem.choices.map((choice, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedAnswer(choice)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                          selectedAnswer === choice
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <span className="text-gray-900 dark:text-white">{choice}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mb-6">
                    <input
                      type="text"
                      value={selectedAnswer}
                      onChange={e => setSelectedAnswer(e.target.value)}
                      placeholder="Type your answer..."
                      className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-600 focus:outline-none"
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedAnswer || isLoading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Checking...' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer with skip option */}
          {!showFeedback && canSkip && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <button
                onClick={handleSkip}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
              >
                <AlertTriangle className="w-4 h-4" />
                {skipConfirm
                  ? 'Click again to confirm skip (applies penalty)'
                  : 'Skip warm-up today'}
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Fallback - shouldn't reach here normally
  return null
}
