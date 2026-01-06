'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type {
  Drill,
  DrillItem,
  DrillItemResult,
  DrillSessionState,
  DrillSessionSummary,
  DrillPlayerProps,
} from '@/types/drill'
import {
  createDrillSession,
  recordItemResult,
  completeDrillSession,
  abandonDrillSession,
  checkAnswer,
  getItemTimeLimit,
} from '@/lib/drillService'

/**
 * DrillPlayer Component
 *
 * Plays through a drill session, showing one item at a time with
 * a countdown timer. Supports MCQ and short answer questions.
 *
 * Features:
 * - Reliable countdown using timestamp deltas (works with tab focus loss)
 * - Immediate feedback after each answer
 * - Auto-submit on timeout
 * - Keyboard navigation support
 */
export default function DrillPlayer({
  drill,
  onItemComplete,
  onDrillComplete,
  onExit,
  showImmediateFeedback = true,
  startIndex = 0,
  itemFilter,
}: DrillPlayerProps) {
  // Filter items if specified (for redo wrong only mode)
  const items = itemFilter
    ? drill.items.filter((item) => itemFilter.includes(item.id))
    : drill.items

  const [session, setSession] = useState<DrillSessionState | null>(null)
  const [currentItem, setCurrentItem] = useState<DrillItem | null>(null)
  const [userAnswer, setUserAnswer] = useState<string>('')
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)
  const [showFeedback, setShowFeedback] = useState(false)
  const [lastResult, setLastResult] = useState<DrillItemResult | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Initialize session on mount
  useEffect(() => {
    const newSession = createDrillSession({
      ...drill,
      items, // Use filtered items
    })
    newSession.currentIndex = startIndex
    setSession(newSession)

    if (items.length > 0) {
      setCurrentItem(items[startIndex])
      setTimeRemaining(getItemTimeLimit(items[startIndex]) * 1000)
      startTimeRef.current = Date.now()
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Timer effect using timestamp deltas for reliability
  useEffect(() => {
    if (!currentItem || showFeedback || isTransitioning) return

    const timeLimit = getItemTimeLimit(currentItem) * 1000

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const remaining = Math.max(0, timeLimit - elapsed)
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
  }, [currentItem, showFeedback, isTransitioning]) // eslint-disable-line react-hooks/exhaustive-deps

  // Focus input when item changes (for short answer)
  useEffect(() => {
    if (currentItem?.type === 'short' && inputRef.current && !showFeedback) {
      inputRef.current.focus()
    }
  }, [currentItem, showFeedback])

  // Advance to next item
  const advanceToNextItem = useCallback((result: DrillItemResult) => {
    if (!session) return

    setIsTransitioning(true)

    const updatedSession = recordItemResult(session, result)
    setSession(updatedSession)

    if (updatedSession.isComplete) {
      const summary = completeDrillSession(updatedSession)
      onDrillComplete(summary)
    } else {
      // Move to next item
      const nextItem = items[updatedSession.currentIndex]
      setCurrentItem(nextItem)
      setUserAnswer('')
      setSelectedChoice(null)
      setShowFeedback(false)
      setLastResult(null)
      setTimeRemaining(getItemTimeLimit(nextItem) * 1000)
      startTimeRef.current = Date.now()
      setIsTransitioning(false)
    }
  }, [session, items, onDrillComplete])

  // Handle answer submission
  const handleSubmit = useCallback(() => {
    if (!currentItem || !session || showFeedback) return

    const answer = currentItem.type === 'mcq' && selectedChoice !== null
      ? currentItem.choices?.[selectedChoice] || ''
      : userAnswer

    const timeMs = Date.now() - startTimeRef.current
    const correct = checkAnswer(currentItem, answer)

    const result: DrillItemResult = {
      itemId: currentItem.id,
      answer,
      correct,
      timeMs,
      timedOut: false,
      completedAt: new Date().toISOString(),
    }

    setLastResult(result)
    onItemComplete(result)

    if (showImmediateFeedback) {
      setShowFeedback(true)
    } else {
      advanceToNextItem(result)
    }
  }, [currentItem, session, selectedChoice, userAnswer, showFeedback, showImmediateFeedback, onItemComplete, advanceToNextItem])

  // Handle timeout
  const handleTimeout = useCallback(() => {
    if (!currentItem || !session || showFeedback) return

    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    const result: DrillItemResult = {
      itemId: currentItem.id,
      answer: null,
      correct: false,
      timeMs: getItemTimeLimit(currentItem) * 1000,
      timedOut: true,
      completedAt: new Date().toISOString(),
    }

    setLastResult(result)
    onItemComplete(result)
    setShowFeedback(true)
  }, [currentItem, session, showFeedback, onItemComplete])

  // Handle "Next" button after feedback
  const handleNext = useCallback(() => {
    if (lastResult) {
      advanceToNextItem(lastResult)
    }
  }, [lastResult, advanceToNextItem])

  // Handle exit/abandon
  const handleExit = useCallback(() => {
    if (session) {
      abandonDrillSession(session)
    }
    onExit()
  }, [session, onExit])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showFeedback) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleNext()
      }
      return
    }

    if (currentItem?.type === 'mcq' && currentItem.choices) {
      const choiceIndex = parseInt(e.key) - 1
      if (choiceIndex >= 0 && choiceIndex < currentItem.choices.length) {
        e.preventDefault()
        setSelectedChoice(choiceIndex)
      }
    }

    if (e.key === 'Enter' && (selectedChoice !== null || userAnswer.trim())) {
      e.preventDefault()
      handleSubmit()
    }
  }, [showFeedback, currentItem, selectedChoice, userAnswer, handleNext, handleSubmit])

  // Calculate progress percentage
  const progress = session
    ? ((session.currentIndex) / session.totalItems) * 100
    : 0

  // Time warning threshold (last 5 seconds)
  const isTimeWarning = timeRemaining <= 5000 && timeRemaining > 0

  if (!session || !currentItem) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div
      className="max-w-2xl mx-auto"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header with progress and timer */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Question {session.currentIndex + 1} of {session.totalItems}
          </div>
          <div
            className={`text-lg font-mono font-bold ${
              isTimeWarning
                ? 'text-red-500 animate-pulse'
                : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            {Math.ceil(timeRemaining / 1000)}s
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Timer bar */}
        <div className="h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mt-2">
          <div
            className={`h-full transition-all duration-100 ${
              isTimeWarning ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{
              width: `${(timeRemaining / (getItemTimeLimit(currentItem) * 1000)) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg border border-slate-200 dark:border-dark-border overflow-hidden">
        {/* Question */}
        <div className="p-6">
          <div className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-6">
            {currentItem.promptText}
          </div>

          {/* MCQ choices */}
          {currentItem.type === 'mcq' && currentItem.choices && !showFeedback && (
            <div className="space-y-3">
              {currentItem.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedChoice(index)}
                  className={`
                    w-full text-left p-4 rounded-lg border-2 transition-all
                    ${selectedChoice === index
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
                    }
                  `}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 flex items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-full text-sm font-medium text-slate-600 dark:text-slate-400">
                      {index + 1}
                    </span>
                    <span className="text-slate-700 dark:text-slate-300">{choice}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Short answer input */}
          {currentItem.type === 'short' && !showFeedback && (
            <div>
              <input
                ref={inputRef}
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type your answer..."
                className="w-full px-4 py-3 text-lg border-2 border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-500 dark:focus:border-indigo-400 focus:outline-none bg-white dark:bg-dark-bg text-slate-800 dark:text-slate-200"
                autoComplete="off"
              />
            </div>
          )}

          {/* Feedback display */}
          {showFeedback && lastResult && (
            <div className="space-y-4">
              {/* Result indicator */}
              <div
                className={`flex items-center gap-3 p-4 rounded-lg ${
                  lastResult.correct
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
                }`}
              >
                {lastResult.correct ? (
                  <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <div>
                  <div className={`font-medium ${lastResult.correct ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                    {lastResult.correct ? 'Correct!' : lastResult.timedOut ? "Time's up!" : 'Not quite'}
                  </div>
                  {!lastResult.correct && (
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Correct answer: <span className="font-medium">{currentItem.correctAnswer}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Explanation */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {currentItem.explanationOneLiner}
                </div>
              </div>

              {/* Time taken */}
              <div className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Time: {(lastResult.timeMs / 1000).toFixed(1)}s
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <button
            onClick={handleExit}
            className="px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          >
            Exit Drill
          </button>

          {!showFeedback ? (
            <button
              onClick={handleSubmit}
              disabled={currentItem.type === 'mcq' ? selectedChoice === null : !userAnswer.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Submit
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              {session.currentIndex + 1 >= session.totalItems ? 'See Results' : 'Next'}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
        {currentItem.type === 'mcq' ? (
          <span>Press 1-{currentItem.choices?.length || 4} to select, Enter to submit</span>
        ) : (
          <span>Press Enter to submit</span>
        )}
      </div>
    </div>
  )
}
