'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/Card'
import PatternMasteryList from './PatternMasteryList'
import ConfidenceDistribution from './ConfidenceDistribution'
import SanityCheckRate from './SanityCheckRate'
import { computeProgressOverview, getEmptyProgressOverview } from '@/lib/dashboard/progressOverviewService'
import { authService } from '@/lib/auth/authService'
import type { ProgressOverviewData } from '@/types/progressOverview'

/**
 * Loading skeleton for progress overview
 */
function LoadingSkeleton() {
  return (
    <Card variant="elevated" padding="lg">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="h-5 w-36 bg-gray-200 dark:bg-dark-card-soft rounded mb-4" />

        {/* Pattern list skeleton */}
        <div className="space-y-3 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-4 flex-1 bg-gray-200 dark:bg-dark-card-soft rounded" />
              <div className="h-2 w-16 bg-gray-200 dark:bg-dark-card-soft rounded" />
            </div>
          ))}
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-4">
          <div className="h-20 bg-gray-100 dark:bg-dark-card-soft rounded" />
          <div className="h-20 bg-gray-100 dark:bg-dark-card-soft rounded" />
        </div>
      </div>
    </Card>
  )
}

/**
 * Empty state for new users
 */
function EmptyState() {
  return (
    <Card variant="elevated" padding="lg">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
        Progress Overview
      </h2>

      <div className="py-8 text-center">
        {/* Icon */}
        <div className="
          inline-flex items-center justify-center
          w-14 h-14
          mb-4
          bg-gray-100 dark:bg-dark-card-soft
          rounded-full
        ">
          <svg className="w-7 h-7 text-gray-400 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>

        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
          No progress yet
        </p>
        <p className="text-xs text-gray-400 dark:text-dark-text-muted max-w-[200px] mx-auto">
          Complete problems to see your pattern mastery develop.
        </p>
      </div>
    </Card>
  )
}

interface ProgressOverviewProps {
  className?: string
}

/**
 * Progress Overview Section
 *
 * Shows learning depth, not just volume:
 * - Pattern mastery with states (not started / learning / practicing / needs review / stable)
 * - Confidence distribution from self-assessments
 * - Sanity check completion rate
 */
export default function ProgressOverview({ className = '' }: ProgressOverviewProps) {
  const [data, setData] = useState<ProgressOverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = () => {
      try {
        const userId = authService.getUser()?.userId || 'anonymous'
        const progressData = computeProgressOverview(userId)
        setData(progressData)
      } catch (error) {
        console.error('[ProgressOverview] Error computing data:', error)
        setData(getEmptyProgressOverview())
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

  // Only show empty state if no patterns loaded (data source issue)
  // We want to show patterns even if all are 'not_started' so users can see what exists
  if (data.patterns.length === 0) {
    return <EmptyState />
  }

  return (
    <Card variant="elevated" padding="lg" className={className}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
          Progress Overview
        </h2>
        {data.summary.patternsNeedingReview > 0 && (
          <span className="
            px-2 py-0.5
            text-xs font-medium
            bg-orange-100 dark:bg-orange-900/30
            text-orange-600 dark:text-orange-400
            rounded-full
          ">
            {data.summary.patternsNeedingReview} need review
          </span>
        )}
      </div>

      {/* Pattern mastery list - takes most space */}
      <div className="mb-6">
        <PatternMasteryList patterns={data.patterns} maxItems={5} />
      </div>

      {/* Secondary metrics - two column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-dark-border">
        <ConfidenceDistribution distribution={data.confidenceDistribution} />
        <SanityCheckRate stats={data.sanityCheckStats} />
      </div>
    </Card>
  )
}
