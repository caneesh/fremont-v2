'use client'

import { useState, useEffect } from 'react'
import type { ProblemVariation } from '@/types/variation'
import { authenticatedFetch, handleQuotaExceeded } from '@/lib/api/apiClient'

interface ProblemVariationsProps {
  originalProblem: string
  coreConcept?: string
  onSelectVariation?: (problemText: string) => void
}

export default function ProblemVariations({
  originalProblem,
  coreConcept,
  onSelectVariation,
}: ProblemVariationsProps) {
  const [variations, setVariations] = useState<ProblemVariation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  const loadVariations = async () => {
    if (variations.length > 0) {
      // Already loaded, just toggle expand
      setIsExpanded(!isExpanded)
      return
    }

    setIsLoading(true)
    setError(null)
    setIsExpanded(true)

    try {
      const response = await authenticatedFetch('/api/variations', {
        method: 'POST',
        body: JSON.stringify({
          problemText: originalProblem,
          coreConcept,
        }),
      })

      // Check for quota exceeded
      if (await handleQuotaExceeded(response)) {
        setIsLoading(false)
        setError('Daily variations limit reached')
        setIsExpanded(false)
        return
      }

      if (!response.ok) {
        throw new Error('Failed to generate problem variations')
      }

      const data = await response.json()
      setVariations(data.variations || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load variations')
      setIsExpanded(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTryVariation = (problemText: string) => {
    if (onSelectVariation) {
      onSelectVariation(problemText)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-blue-400 overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={loadVariations}
        disabled={isLoading}
        className="w-full px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between hover:bg-blue-50 transition-colors"
      >
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">
              Practice Similar Problems
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {isExpanded
                ? 'Test your understanding with variations of this concept'
                : 'Generate new problems testing the same physics concept'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        ) : (
          <svg
            className={`w-6 h-6 text-gray-600 transition-transform flex-shrink-0 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Error State */}
      {error && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-5">
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
            <p className="text-red-800 text-xs sm:text-sm">{error}</p>
            <button
              onClick={loadVariations}
              className="mt-3 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs sm:text-sm font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* Variations List */}
      {isExpanded && variations.length > 0 && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-blue-200">
          <div className="pt-4 sm:pt-5 space-y-3 sm:space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3">
              <p className="text-xs sm:text-sm text-blue-900 font-medium">
                These problems test the same concept but with different setups. Try solving them to reinforce your understanding.
              </p>
            </div>

            {variations.map((variation, index) => (
              <div
                key={index}
                className="bg-gray-50 border-2 border-gray-300 rounded-lg p-3 sm:p-5 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 sm:gap-4 mb-3">
                  <div className="flex items-start gap-2 sm:gap-3 flex-1">
                    <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs sm:text-sm font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base text-gray-900 leading-relaxed mb-2">
                        {variation.problemStatement}
                      </p>
                      <p className="text-xs text-blue-700 bg-blue-100 border border-blue-200 rounded px-2 py-1 inline-block">
                        <span className="font-semibold">What changed:</span> {variation.whyDifferent}
                      </p>
                    </div>
                  </div>
                </div>

                {onSelectVariation && (
                  <div className="flex justify-end mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleTryVariation(variation.problemStatement)}
                      className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-xs sm:text-sm flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      Try This Problem
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 border-t border-blue-200">
          <div className="flex items-center justify-center py-6 sm:py-8">
            <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mr-2 sm:mr-3"></div>
            <p className="text-sm sm:text-base text-gray-600">Generating problem variations...</p>
          </div>
        </div>
      )}
    </div>
  )
}
