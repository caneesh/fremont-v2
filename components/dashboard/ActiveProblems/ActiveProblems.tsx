'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import ProblemCard from './ProblemCard'
import {
  computeActiveProblems,
  getEmptyActiveProblems,
} from '@/lib/dashboard/activeProblemsService'
import type { ActiveProblemsData } from '@/types/activeProblems'

/**
 * Loading skeleton for active problems
 */
function LoadingSkeleton() {
  return (
    <Card variant="elevated" padding="lg">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="h-5 w-36 bg-gray-200 dark:bg-dark-card-soft rounded mb-4" />

        {/* Cards skeleton */}
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-gray-100 dark:bg-dark-card-soft rounded-lg"
            />
          ))}
        </div>
      </div>
    </Card>
  )
}

/**
 * Empty state when no recent problems
 */
function EmptyState() {
  const router = useRouter()

  return (
    <Card variant="elevated" padding="lg">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
        Active Problems
      </h2>

      <div className="py-6 text-center">
        {/* Icon */}
        <div className="
          inline-flex items-center justify-center
          w-12 h-12
          mb-3
          bg-gray-100 dark:bg-dark-card-soft
          rounded-full
        ">
          <svg
            className="w-6 h-6 text-gray-400 dark:text-dark-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>

        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">
          No recent problems
        </p>
        <p className="text-xs text-gray-400 dark:text-dark-text-muted mb-4">
          Start a problem to see your history here.
        </p>

        <button
          onClick={() => router.push('/solve')}
          className="
            px-4 py-2
            text-sm font-medium
            bg-accent hover:bg-accent-strong
            text-white
            rounded-lg
            transition-colors
          "
        >
          Start a Problem
        </button>
      </div>
    </Card>
  )
}

/**
 * Quick filter tabs for problem status
 */
function FilterTabs({
  activeFilter,
  onFilterChange,
  counts,
}: {
  activeFilter: 'all' | 'in_progress' | 'solved' | 'skipped'
  onFilterChange: (filter: 'all' | 'in_progress' | 'solved' | 'skipped') => void
  counts: { all: number; inProgress: number; solved: number; skipped: number }
}) {
  const tabs = [
    { key: 'all' as const, label: 'All', count: counts.all },
    { key: 'in_progress' as const, label: 'In Progress', count: counts.inProgress },
    { key: 'solved' as const, label: 'Solved', count: counts.solved },
    { key: 'skipped' as const, label: 'Skipped', count: counts.skipped },
  ]

  // Only show tabs if there are problems in multiple categories
  const nonEmptyTabs = tabs.filter(t => t.count > 0)
  if (nonEmptyTabs.length <= 1) return null

  return (
    <div className="flex gap-1 mb-4 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onFilterChange(tab.key)}
          disabled={tab.count === 0}
          className={`
            px-2.5 py-1
            text-xs font-medium
            rounded-lg
            whitespace-nowrap
            transition-colors
            ${activeFilter === tab.key
              ? 'bg-accent text-white'
              : tab.count > 0
              ? 'bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
              : 'bg-gray-50 dark:bg-dark-card-soft text-gray-400 dark:text-dark-text-muted cursor-not-allowed'
            }
          `}
        >
          {tab.label}
          {tab.count > 0 && (
            <span className={`
              ml-1.5
              ${activeFilter === tab.key
                ? 'text-white/80'
                : 'text-gray-400 dark:text-dark-text-muted'
              }
            `}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

interface ActiveProblemsProps {
  className?: string
}

/**
 * Active Problems Section
 *
 * Shows in-progress and recent problems for continuity:
 * - In-progress problems with resume state
 * - Recently solved problems
 * - Recently skipped problems
 * - Max 5 items visible
 */
export default function ActiveProblems({ className = '' }: ActiveProblemsProps) {
  const [data, setData] = useState<ActiveProblemsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'solved' | 'skipped'>('all')

  useEffect(() => {
    const loadData = () => {
      try {
        const problemsData = computeActiveProblems()
        setData(problemsData)
      } catch (error) {
        console.error('[ActiveProblems] Error computing data:', error)
        setData(getEmptyActiveProblems())
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

  // Empty state
  if (data.allItems.length === 0) {
    return <EmptyState />
  }

  // Filter items based on selected tab
  const filteredItems = filter === 'all'
    ? data.allItems
    : filter === 'in_progress'
    ? data.inProgress
    : filter === 'solved'
    ? data.recentlySolved
    : data.recentlySkipped

  // Take max 5 items
  const displayItems = filteredItems.slice(0, 5)

  return (
    <Card variant="elevated" padding="lg" className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
          Active Problems
        </h2>
        {data.inProgress.length > 0 && (
          <span className="
            px-2 py-0.5
            text-xs font-medium
            bg-blue-100 dark:bg-blue-900/30
            text-blue-600 dark:text-blue-400
            rounded-full
          ">
            {data.inProgress.length} in progress
          </span>
        )}
      </div>

      {/* Filter tabs */}
      <FilterTabs
        activeFilter={filter}
        onFilterChange={setFilter}
        counts={{
          all: data.allItems.length,
          inProgress: data.inProgress.length,
          solved: data.recentlySolved.length,
          skipped: data.recentlySkipped.length,
        }}
      />

      {/* Problem cards */}
      <div className="space-y-2">
        {displayItems.map((problem) => (
          <ProblemCard key={problem.problemId} problem={problem} />
        ))}
      </div>

      {/* Show more indicator */}
      {filteredItems.length > 5 && (
        <p className="
          mt-3 pt-3
          text-xs text-center
          text-gray-500 dark:text-dark-text-muted
          border-t border-gray-100 dark:border-dark-border
        ">
          +{filteredItems.length - 5} more problems
        </p>
      )}
    </Card>
  )
}
