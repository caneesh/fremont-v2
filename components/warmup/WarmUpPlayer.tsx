'use client'

/**
 * WarmUpPlayer Component
 *
 * Plays through warm-up drill items with timer and feedback.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import type { WarmUpBlock, WarmUpDrillItem } from '@/types/warmUp'
import type { WarmUpProgress } from '@/hooks/useWarmUp'

interface WarmUpPlayerProps {
  block: WarmUpBlock | null
  items: WarmUpDrillItem[]
  currentItemIndex: number
  progress: WarmUpProgress | null
  isLoading: boolean
  onSubmit: (answer: string, timeSpentSeconds: number) => Promise<boolean>
}

export default function WarmUpPlayer({
  block,
  items,
  currentItemIndex,
  progress,
  isLoading,
  onSubmit,
}: WarmUpPlayerProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [lastResult, setLastResult] = useState<{ isCorrect: boolean; correctAnswer: string } | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(0)

  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const currentItem = items[currentItemIndex]
  const timeLimit = currentItem?.timeLimitSeconds || 20

  // Reset state when item changes
  useEffect(() => {
    setSelectedAnswer('')
    setShowFeedback(false)
    setLastResult(null)
    setTimeRemaining(timeLimit * 1000)
    startTimeRef.current = Date.now()

    // Focus input for short answer
    if (currentItem?.type === 'short' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [currentItemIndex, timeLimit, currentItem?.type])

  // Timer using timestamp deltas
  useEffect(() => {
    if (!currentItem || showFeedback) return

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, timeLimit * 1000 - elapsed)
      setTimeRemaining(remaining)

      if (remaining <= 0) {
        handleTimeout()
      }
    }, 100)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [currentItem, showFeedback, timeLimit]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleTimeout = useCallback(async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    const timeSpent = timeLimit
    const isCorrect = await onSubmit('', timeSpent)

    setLastResult({
      isCorrect,
      correctAnswer: currentItem?.correctAnswer || '',
    })
    setShowFeedback(true)

    // Auto-advance after feedback
    setTimeout(() => {
      setShowFeedback(false)
    }, 2000)
  }, [currentItem, timeLimit, onSubmit])

  const handleSubmit = useCallback(async () => {
    if (!currentItem || isLoading || showFeedback) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000)
    const isCorrect = await onSubmit(selectedAnswer, timeSpent)

    setLastResult({
      isCorrect,
      correctAnswer: currentItem.correctAnswer,
    })
    setShowFeedback(true)

    // Auto-advance after feedback
    setTimeout(() => {
      setShowFeedback(false)
    }, 2000)
  }, [currentItem, selectedAnswer, isLoading, showFeedback, onSubmit])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showFeedback) return

      if (currentItem?.type === 'mcq' && currentItem.choices) {
        const index = parseInt(e.key) - 1
        if (index >= 0 && index < currentItem.choices.length) {
          e.preventDefault()
          setSelectedAnswer(currentItem.choices[index])
        }
      }

      if (e.key === 'Enter' && selectedAnswer) {
        e.preventDefault()
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentItem, selectedAnswer, showFeedback, handleSubmit])

  if (!currentItem || !block) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  const isTimeWarning = timeRemaining <= 5000 && timeRemaining > 0
  const progressPercent = progress
    ? ((progress.completedBlocks + (currentItemIndex / items.length)) / progress.totalBlocks) * 100
    : 0

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        {/* Block progress */}
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-dark-text-muted mb-2">
          <span>
            Block {progress?.currentBlockOrder || 1} of {progress?.totalBlocks || 1}: {block.title}
          </span>
          <span>
            Item {currentItemIndex + 1} of {items.length}
          </span>
        </div>

        {/* Overall progress bar */}
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-amber-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Timer bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                isTimeWarning ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{ width: `${(timeRemaining / (timeLimit * 1000)) * 100}%` }}
            />
          </div>
          <span
            className={`text-lg font-mono font-bold min-w-[3rem] text-right ${
              isTimeWarning ? 'text-red-500 animate-pulse' : 'text-slate-600 dark:text-dark-text-secondary'
            }`}
          >
            {Math.ceil(timeRemaining / 1000)}s
          </span>
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg border border-slate-200 dark:border-dark-border overflow-hidden">
        <div className="p-6">
          {/* Question */}
          <div className="text-lg font-medium text-slate-800 dark:text-dark-text-primary mb-6">
            {currentItem.promptText}
          </div>

          {/* MCQ choices */}
          {currentItem.type === 'mcq' && currentItem.choices && !showFeedback && (
            <div className="space-y-3">
              {currentItem.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedAnswer(choice)}
                  disabled={isLoading}
                  className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all
                    ${selectedAnswer === choice
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-full text-sm font-medium text-slate-600 dark:text-slate-400">
                      {index + 1}
                    </span>
                    <span className="text-slate-700 dark:text-dark-text-secondary">{choice}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Short answer input */}
          {currentItem.type === 'short' && !showFeedback && (
            <input
              ref={inputRef}
              type="text"
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(e.target.value)}
              placeholder="Type your answer..."
              disabled={isLoading}
              className="w-full px-4 py-3 text-lg border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none bg-white dark:bg-dark-bg text-slate-800 dark:text-dark-text-primary disabled:opacity-50"
              autoComplete="off"
            />
          )}

          {/* Fill blank - treat as short for now */}
          {currentItem.type === 'fill' && !showFeedback && (
            <input
              ref={inputRef}
              type="text"
              value={selectedAnswer}
              onChange={(e) => setSelectedAnswer(e.target.value)}
              placeholder="Fill in the blank..."
              disabled={isLoading}
              className="w-full px-4 py-3 text-lg border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none bg-white dark:bg-dark-bg text-slate-800 dark:text-dark-text-primary disabled:opacity-50"
              autoComplete="off"
            />
          )}

          {/* Feedback */}
          {showFeedback && lastResult && (
            <div className="space-y-4">
              <div
                className={`flex items-center gap-3 p-4 rounded-lg ${
                  lastResult.isCorrect
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                }`}
              >
                {lastResult.isCorrect ? (
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <div>
                  <div className={`font-medium ${lastResult.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {lastResult.isCorrect ? 'Correct!' : 'Not quite'}
                  </div>
                  {!lastResult.isCorrect && (
                    <div className="text-sm text-slate-600 dark:text-dark-text-muted mt-1">
                      Correct answer: <span className="font-medium">{lastResult.correctAnswer}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Explanation */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-600 dark:text-dark-text-secondary">
                {currentItem.explanation}
              </div>
            </div>
          )}
        </div>

        {/* Submit button */}
        {!showFeedback && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer || isLoading}
              className="w-full py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Keyboard hints */}
      <div className="mt-4 text-center text-xs text-slate-400 dark:text-dark-text-muted">
        {currentItem.type === 'mcq' ? (
          <span>Press 1-{currentItem.choices?.length || 4} to select, Enter to submit</span>
        ) : (
          <span>Press Enter to submit</span>
        )}
      </div>
    </div>
  )
}
