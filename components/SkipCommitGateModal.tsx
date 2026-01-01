'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { SkipCommitDecision } from '@/types/skipCommitGate'

interface SkipCommitGateModalProps {
  isOpen: boolean
  autoCommitSeconds?: number
  onCommit: () => void
  onSkip: () => void
  onAutoCommit: () => void
}

/**
 * Skip-or-Commit Gate Modal
 *
 * Forces learners to make a strategic decision:
 * - Commit: continue solving the problem
 * - Skip: exit and move to next problem
 *
 * Auto-commits after a timeout if user doesn't decide.
 * Renders as bottom sheet on mobile, centered modal on desktop.
 */
export default function SkipCommitGateModal({
  isOpen,
  autoCommitSeconds = 8,
  onCommit,
  onSkip,
  onAutoCommit,
}: SkipCommitGateModalProps) {
  const [countdown, setCountdown] = useState(autoCommitSeconds)
  const [isClosing, setIsClosing] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hasDecidedRef = useRef(false)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCountdown(autoCommitSeconds)
      setIsClosing(false)
      hasDecidedRef.current = false
    }
  }, [isOpen, autoCommitSeconds])

  // Countdown timer
  useEffect(() => {
    if (!isOpen || hasDecidedRef.current) return

    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto-commit
          if (timerRef.current) {
            clearInterval(timerRef.current)
          }
          if (!hasDecidedRef.current) {
            hasDecidedRef.current = true
            onAutoCommit()
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isOpen, onAutoCommit])

  const handleCommit = useCallback(() => {
    if (hasDecidedRef.current) return
    hasDecidedRef.current = true
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setIsClosing(true)
    setTimeout(() => onCommit(), 150)
  }, [onCommit])

  const handleSkip = useCallback(() => {
    if (hasDecidedRef.current) return
    hasDecidedRef.current = true
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setIsClosing(true)
    setTimeout(() => onSkip(), 150)
  }, [onSkip])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-200 ${
          isClosing ? 'opacity-0' : 'opacity-100'
        }`}
        aria-hidden="true"
      />

      {/* Modal - Bottom sheet on mobile, centered on desktop */}
      <div
        className={`fixed z-50 transition-all duration-200 ${
          isClosing ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
        }
        // Mobile: bottom sheet
        inset-x-0 bottom-0 sm:inset-auto
        // Desktop: centered modal
        sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
        sm:max-w-md sm:w-full`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="skip-commit-title"
      >
        <div className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 sm:p-8">
          {/* Timer indicator */}
          <div className="flex justify-center mb-4">
            <div className="relative w-16 h-16">
              {/* Background circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  className="text-slate-200 dark:text-slate-700"
                />
                {/* Progress circle */}
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  className="text-amber-500 dark:text-amber-400 transition-all duration-1000"
                  strokeDasharray={`${(countdown / autoCommitSeconds) * 176} 176`}
                />
              </svg>
              {/* Countdown number */}
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-slate-700 dark:text-slate-200">
                {countdown}
              </span>
            </div>
          </div>

          {/* Title */}
          <h2
            id="skip-commit-title"
            className="text-xl sm:text-2xl font-bold text-center text-slate-800 dark:text-white mb-2"
          >
            Decide Now
          </h2>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-center text-slate-600 dark:text-slate-400 mb-6">
            This trains exam-time strategy. Make a quick decision.
          </p>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Commit button - Primary */}
            <button
              onClick={handleCommit}
              className="flex-1 py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Commit
              </span>
            </button>

            {/* Skip button - Secondary */}
            <button
              onClick={handleSkip}
              className="flex-1 py-3 px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 5l7 7-7 7M5 5l7 7-7 7"
                  />
                </svg>
                Skip
              </span>
            </button>
          </div>

          {/* Auto-commit note */}
          <p className="text-xs text-center text-slate-500 dark:text-slate-500 mt-4">
            Auto-commits in {countdown}s if no decision
          </p>
        </div>
      </div>
    </>
  )
}

/**
 * Toast notification for skip action
 */
export function SkipToast({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
      <div className="bg-slate-800 dark:bg-slate-700 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
        <svg
          className="w-5 h-5 text-green-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="text-sm font-medium">Skipped. Good decision training.</span>
      </div>
    </div>
  )
}
