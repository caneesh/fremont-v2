'use client'

/**
 * DemoSolvePhase - Problem solving phase after Thinking Gate
 *
 * Features:
 * - Hint 1 (reasoning approach)
 * - Hint 2 (setup/formula)
 * - Final answer input
 * - Answer validation
 */

import { useState, useCallback } from 'react'
import type { DemoProblem } from '@/lib/demo/demoProblems'
import { validateAnswer } from '@/lib/demo/demoProblems'

interface DemoSolvePhaseProps {
  problem: DemoProblem
  onSubmit: (answer: string, isCorrect: boolean) => void
}

export default function DemoSolvePhase({ problem, onSubmit }: DemoSolvePhaseProps) {
  const [revealedHints, setRevealedHints] = useState<number[]>([])
  const [userAnswer, setUserAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRevealHint = useCallback((hintIndex: number) => {
    if (!revealedHints.includes(hintIndex)) {
      setRevealedHints([...revealedHints, hintIndex])
    }
  }, [revealedHints])

  const handleSubmit = useCallback(() => {
    if (!userAnswer.trim()) return

    setIsSubmitting(true)

    // Validate the answer
    const isCorrect = validateAnswer(
      userAnswer,
      problem.expectedAnswer,
      problem.tolerance
    )

    // Brief delay for UX
    setTimeout(() => {
      onSubmit(userAnswer, isCorrect)
    }, 500)
  }, [userAnswer, problem, onSubmit])

  const hintLabels = [
    { title: 'Hint 1: Reasoning Approach', icon: '💡' },
    { title: 'Hint 2: Setup & Formula', icon: '📐' },
  ]

  return (
    <div className="space-y-6">
      {/* Problem Statement */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg dark:shadow-dark-lg p-6 border border-gray-200 dark:border-dark-border">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
            {problem.exam}
          </span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary text-xs font-medium rounded">
            {problem.topic}
          </span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3">Problem</h2>
        <p className="text-gray-800 dark:text-dark-text-primary leading-relaxed">{problem.statement}</p>
      </div>

      {/* Hints Section */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg dark:shadow-dark-lg p-6 border border-gray-200 dark:border-dark-border">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-amber-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          Progressive Hints
        </h3>

        <div className="space-y-4">
          {problem.hints.map((hint, idx) => {
            const isRevealed = revealedHints.includes(idx)
            const canReveal = idx === 0 || revealedHints.includes(idx - 1)
            const label = hintLabels[idx] || { title: `Hint ${idx + 1}`, icon: '💡' }

            return (
              <div
                key={idx}
                className={`rounded-lg border-2 transition-all ${
                  isRevealed
                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                    : canReveal
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20'
                    : 'border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card-soft opacity-60'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
                      <span>{label.icon}</span>
                      {label.title}
                    </h4>
                    {!isRevealed && (
                      <button
                        onClick={() => handleRevealHint(idx)}
                        disabled={!canReveal}
                        className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          canReveal
                            ? 'bg-amber-500 text-white hover:bg-amber-600'
                            : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        Reveal
                      </button>
                    )}
                    {isRevealed && (
                      <span className="text-green-600 dark:text-green-400 text-sm font-medium flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
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
                        Revealed
                      </span>
                    )}
                  </div>
                  {isRevealed && (
                    <p className="mt-3 text-gray-700 dark:text-dark-text-secondary leading-relaxed">{hint}</p>
                  )}
                  {!isRevealed && !canReveal && (
                    <p className="mt-2 text-sm text-gray-500 dark:text-dark-text-muted italic">
                      Reveal previous hint first
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="mt-4 text-sm text-gray-500 dark:text-dark-text-muted text-center">
          Try to solve without hints first for the best learning experience
        </p>
      </div>

      {/* Answer Input Section */}
      <div className="bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 rounded-xl shadow-lg dark:shadow-dark-lg p-6 border border-blue-100 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Your Answer
        </h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="answer" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Enter your final answer (numerical value only)
            </label>
            <input
              id="answer"
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="e.g., 4 or 2.5"
              className="w-full px-4 py-3 text-lg border-2 border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text-primary focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 outline-none transition-colors"
              disabled={isSubmitting}
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-dark-text-muted">
              Enter just the number without units
            </p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!userAnswer.trim() || isSubmitting}
            className={`w-full py-4 text-lg font-semibold rounded-lg transition-all ${
              !userAnswer.trim() || isSubmitting
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-5 h-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Checking...
              </span>
            ) : (
              'Submit Answer'
            )}
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="bg-gray-50 dark:bg-dark-card-soft rounded-lg p-4 border border-gray-200 dark:border-dark-border">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2">Tips</h4>
        <ul className="text-sm text-gray-600 dark:text-dark-text-secondary space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-green-500">•</span>
            Double-check your arithmetic before submitting
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">•</span>
            Make sure you&apos;re answering what the question asks
          </li>
          <li className="flex items-start gap-2">
            <span className="text-green-500">•</span>
            Use hints only if you&apos;re genuinely stuck
          </li>
        </ul>
      </div>
    </div>
  )
}
