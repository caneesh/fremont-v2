'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { PatternFirstModalProps, PatternOption } from '@/types/patternFirst'

/**
 * PatternFirstModal
 *
 * A timed modal that prompts students to identify the relevant physics pattern
 * before they can access the solution scaffold. This builds pattern recognition
 * skills crucial for physics problem-solving.
 *
 * Features:
 * - Countdown timer with progress bar (default: 12 seconds)
 * - 4-8 pattern options as selectable cards
 * - Locks scaffold until selection or timeout
 * - Keyboard navigation support (arrow keys + Enter)
 */
export default function PatternFirstModal({
  patterns,
  primaryPatternId,
  lockSeconds,
  showCountdown,
  problemText,
  onSelect,
  onTimeout,
  onSkip,
  canDismiss,
}: PatternFirstModalProps) {
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(lockSeconds * 1000) // in ms
  const [hasTimedOut, setHasTimedOut] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const startTimeRef = useRef<number>(Date.now())
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate progress percentage
  const progress = Math.max(0, (timeRemaining / (lockSeconds * 1000)) * 100)

  // Countdown timer effect
  useEffect(() => {
    if (hasTimedOut || selectedPatternId) return

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 100
        if (newTime <= 0) {
          setHasTimedOut(true)
          const elapsedTime = Date.now() - startTimeRef.current
          onTimeout(elapsedTime)
          return 0
        }
        return newTime
      })
    }, 100)

    return () => clearInterval(interval)
  }, [hasTimedOut, selectedPatternId, onTimeout])

  // Handle pattern selection
  const handleSelect = useCallback(
    (pattern: PatternOption) => {
      if (selectedPatternId) return // Already selected

      const elapsedTime = Date.now() - startTimeRef.current
      const isCorrect = primaryPatternId ? pattern.id === primaryPatternId : null

      setSelectedPatternId(pattern.id)
      onSelect(pattern.id, elapsedTime, isCorrect)
    },
    [selectedPatternId, primaryPatternId, onSelect]
  )

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (selectedPatternId) return

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : patterns.length - 1))
          break
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          setFocusedIndex((prev) => (prev < patterns.length - 1 ? prev + 1 : 0))
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          handleSelect(patterns[focusedIndex])
          break
        case 'Escape':
          if (canDismiss && onSkip) {
            onSkip()
          }
          break
      }
    },
    [selectedPatternId, patterns, focusedIndex, handleSelect, canDismiss, onSkip]
  )

  // Format time for display
  const formatTime = (ms: number): string => {
    const seconds = Math.ceil(ms / 1000)
    return `${seconds}s`
  }

  // Get button styling based on state
  const getPatternButtonStyle = (pattern: PatternOption, index: number): string => {
    const isSelected = selectedPatternId === pattern.id
    const isFocused = index === focusedIndex && !selectedPatternId

    if (isSelected) {
      return 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500'
    }
    if (isFocused) {
      return 'border-indigo-300 dark:border-indigo-600 bg-slate-50 dark:bg-slate-800'
    }
    return 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800'
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pattern-first-title"
    >
      <div
        ref={containerRef}
        className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {/* Header with timer */}
        <div className="px-6 py-4 bg-indigo-500 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2
                id="pattern-first-title"
                className="text-xl font-bold text-white"
              >
                Identify the pattern (10–15s)
              </h2>
              <p className="text-indigo-100 text-sm mt-1">
                Fast recognition before equations.
              </p>
            </div>
            {showCountdown && !selectedPatternId && !hasTimedOut && (
              <div className="flex items-center gap-2">
                <div className="text-white/80 text-sm">Time:</div>
                <div className="bg-white/20 rounded-full px-3 py-1 text-white font-mono font-bold">
                  {formatTime(timeRemaining)}
                </div>
              </div>
            )}
            {selectedPatternId && (
              <div className="bg-green-500 rounded-full px-3 py-1 text-white text-sm font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Selected
              </div>
            )}
            {hasTimedOut && !selectedPatternId && (
              <div className="bg-amber-500 rounded-full px-3 py-1 text-white text-sm font-medium">
                Time&apos;s up!
              </div>
            )}
          </div>

          {/* Progress bar */}
          {showCountdown && !selectedPatternId && !hasTimedOut && (
            <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Problem context (collapsed) */}
          <details className="mb-6 text-sm">
            <summary className="cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
              View problem statement
            </summary>
            <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
              {problemText.substring(0, 300)}
              {problemText.length > 300 && '...'}
            </div>
          </details>

          {/* Pattern options grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {patterns.map((pattern, index) => (
              <button
                key={pattern.id}
                onClick={() => handleSelect(pattern)}
                disabled={!!selectedPatternId}
                className={`
                  text-left p-4 rounded-xl border-2 transition-all duration-150
                  ${getPatternButtonStyle(pattern, index)}
                  ${selectedPatternId && selectedPatternId !== pattern.id ? 'opacity-50' : ''}
                  ${!selectedPatternId ? 'cursor-pointer' : 'cursor-default'}
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                `}
              >
                <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {pattern.label || pattern.name || pattern.id}
                </div>
                {pattern.description && (
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {pattern.description}
                  </div>
                )}
                {pattern.triggers && pattern.triggers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {pattern.triggers.slice(0, 2).map((trigger, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full"
                      >
                        {trigger}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Timeout warning message */}
          {hasTimedOut && !selectedPatternId && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    Time&apos;s up! Continue, but pick a pattern soon.
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Selecting a pattern helps build recognition speed for exams.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {canDismiss && hasTimedOut && !selectedPatternId && onSkip && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
            <button
              onClick={onSkip}
              className="w-full py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Skip pattern selection (not recommended)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
