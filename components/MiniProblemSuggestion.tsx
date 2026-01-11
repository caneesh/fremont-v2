'use client'

import { useState, useEffect } from 'react'
import type { MiniProblem, ConceptBridgeResult } from '@/lib/patternTrack'
import { findMiniProblemsForWeakConcepts } from '@/lib/patternTrack'

interface MiniProblemSuggestionProps {
  /** Weak concepts to find problems for */
  weakConcepts: string[]
  /** Called when user selects a mini-problem */
  onSelectProblem?: (problem: MiniProblem) => void
  /** Called when user skips */
  onSkip?: () => void
  /** Maximum problems to show (1-2) */
  maxProblems?: number
  /** Custom title */
  title?: string
  /** Compact mode for inline display */
  compact?: boolean
}

export default function MiniProblemSuggestion({
  weakConcepts,
  onSelectProblem,
  onSkip,
  maxProblems = 2,
  title = 'Strengthen These Concepts',
  compact = false,
}: MiniProblemSuggestionProps) {
  const [result, setResult] = useState<ConceptBridgeResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (weakConcepts.length === 0) {
      setIsLoading(false)
      return
    }

    async function loadProblems() {
      try {
        const bridgeResult = await findMiniProblemsForWeakConcepts(
          weakConcepts,
          maxProblems
        )
        setResult(bridgeResult)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load practice problems')
      } finally {
        setIsLoading(false)
      }
    }

    loadProblems()
  }, [weakConcepts, maxProblems])

  if (isLoading) {
    return (
      <div className={`${compact ? 'p-3' : 'p-6'} bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg`}>
        <div className="flex items-center gap-2">
          <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 dark:border-amber-400" />
          <span className="text-sm text-amber-700 dark:text-amber-300">Finding practice problems...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return null // Silently fail - this is an enhancement, not critical
  }

  if (!result || result.miniProblems.length === 0) {
    return null // No matching problems found
  }

  if (compact) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200 mb-2">
              Quick practice to reinforce: {result.weakConcepts.slice(0, 2).join(', ')}
            </p>
            <div className="flex flex-wrap gap-2">
              {result.miniProblems.map((mp, idx) => (
                <button
                  key={mp.question.id}
                  onClick={() => onSelectProblem?.(mp)}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Problem {idx + 1}: {mp.pattern.name}
                </button>
              ))}
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="px-3 py-1.5 text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
                >
                  Skip
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
          <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200">{title}</h3>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Try these focused problems to build your understanding
          </p>
        </div>
      </div>

      {/* Weak concepts */}
      <div className="mb-4">
        <p className="text-xs text-amber-700 dark:text-amber-300 mb-2 font-medium uppercase tracking-wide">
          Areas to strengthen:
        </p>
        <div className="flex flex-wrap gap-2">
          {result.weakConcepts.map((concept) => (
            <span
              key={concept}
              className="px-2 py-1 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200 rounded-full"
            >
              {concept}
            </span>
          ))}
        </div>
      </div>

      {/* Mini-problems */}
      <div className="space-y-3 mb-4">
        {result.miniProblems.map((mp, idx) => (
          <div
            key={mp.question.id}
            className="bg-white dark:bg-dark-card border border-amber-200 dark:border-amber-700 rounded-lg p-4 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {mp.pattern.name}
                  </span>
                  <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded">
                    Difficulty {mp.question.difficulty}/5
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-dark-text-secondary line-clamp-2">
                  {mp.question.problem_text.slice(0, 120)}
                  {mp.question.problem_text.length > 120 ? '...' : ''}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 italic">{mp.reason}</p>
              </div>
              <button
                onClick={() => onSelectProblem?.(mp)}
                className="flex-shrink-0 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                Try This
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Skip option */}
      {onSkip && (
        <div className="text-center">
          <button
            onClick={onSkip}
            className="text-sm text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 underline"
          >
            Skip practice for now
          </button>
        </div>
      )}
    </div>
  )
}
