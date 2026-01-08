'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import MistakeCard from './MistakeCard'
import {
  computeMistakeIntelligence,
  getEmptyMistakeIntelligence,
} from '@/lib/dashboard/mistakeIntelligenceService'
import type { MistakeIntelligenceData } from '@/types/mistakeIntelligence'

/**
 * Loading skeleton for mistake intelligence
 */
function LoadingSkeleton() {
  return (
    <Card variant="elevated" padding="lg">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="h-5 w-40 bg-gray-200 dark:bg-dark-card-soft rounded mb-4" />

        {/* Cards skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 dark:bg-dark-card-soft rounded-lg"
            />
          ))}
        </div>
      </div>
    </Card>
  )
}

/**
 * Empty state when no mistakes recorded
 */
function EmptyState() {
  return (
    <Card variant="elevated" padding="lg">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
        Mistake Intelligence
      </h2>

      <div className="py-6 text-center">
        {/* Icon */}
        <div className="
          inline-flex items-center justify-center
          w-12 h-12
          mb-3
          bg-green-50 dark:bg-green-900/20
          rounded-full
        ">
          <svg
            className="w-6 h-6 text-green-500 dark:text-green-400"
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
        </div>

        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
          No mistakes recorded yet
        </p>
        <p className="text-xs text-gray-400 dark:text-dark-text-muted">
          Errors you make will appear here with actionable insights.
        </p>
      </div>
    </Card>
  )
}

/**
 * Review mistakes link button
 */
function ReviewMistakesLink({ cardsDue }: { cardsDue: number }) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/mistake-notebook?review=true')}
      className="
        w-full
        flex items-center justify-between
        p-3
        mt-4
        bg-gray-50 dark:bg-dark-card-soft
        hover:bg-gray-100 dark:hover:bg-dark-border/50
        rounded-lg
        transition-colors
        group
      "
    >
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-amber-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
          Review Mistakes
        </span>
        {cardsDue > 0 && (
          <span className="
            px-1.5 py-0.5
            text-xs font-medium
            bg-amber-100 dark:bg-amber-900/40
            text-amber-700 dark:text-amber-300
            rounded
          ">
            {cardsDue} due
          </span>
        )}
      </div>

      <svg
        className="
          w-4 h-4
          text-gray-400 dark:text-dark-text-muted
          group-hover:text-gray-600 dark:group-hover:text-dark-text-secondary
          group-hover:translate-x-0.5
          transition-all
        "
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </button>
  )
}

interface MistakeIntelligenceProps {
  className?: string
}

/**
 * Mistake Intelligence Panel
 *
 * Turns errors into actionable insight:
 * - Top 3 recurring mistake categories
 * - Count per category
 * - Link to review session
 * - Pattern associations
 */
export default function MistakeIntelligence({ className = '' }: MistakeIntelligenceProps) {
  const [data, setData] = useState<MistakeIntelligenceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = () => {
      try {
        const intelligenceData = computeMistakeIntelligence()
        setData(intelligenceData)
      } catch (error) {
        console.error('[MistakeIntelligence] Error computing data:', error)
        setData(getEmptyMistakeIntelligence())
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />
  }

  // No data
  if (!data) {
    return <LoadingSkeleton />
  }

  // Empty state - no mistakes
  if (data.topMistakes.length === 0) {
    return <EmptyState />
  }

  return (
    <Card variant="elevated" padding="lg" className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
          Mistake Intelligence
        </h2>
        {data.totalMistakeTypes > 3 && (
          <span className="text-xs text-gray-500 dark:text-dark-text-muted">
            Top 3 of {data.totalMistakeTypes}
          </span>
        )}
      </div>

      {/* Mistake cards */}
      <div className="space-y-3">
        {data.topMistakes.map((mistake, index) => (
          <MistakeCard
            key={mistake.id}
            mistake={mistake}
            rank={index + 1}
          />
        ))}
      </div>

      {/* Review link */}
      {data.reviewSessionAvailable && (
        <ReviewMistakesLink cardsDue={data.cardsDueForReview} />
      )}

      {/* Fixability encouragement */}
      {data.topMistakes.some(m => m.isFixable) && (
        <p className="
          mt-3
          text-xs text-center
          text-gray-500 dark:text-dark-text-muted
        ">
          These patterns are fixable with targeted practice
        </p>
      )}
    </Card>
  )
}
