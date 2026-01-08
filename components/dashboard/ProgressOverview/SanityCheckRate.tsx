'use client'

import type { SanityCheckStats } from '@/types/progressOverview'

interface SanityCheckRateProps {
  stats: SanityCheckStats
}

/**
 * Circular progress indicator
 */
function CircularProgress({ percentage }: { percentage: number }) {
  // SVG circle dimensions
  const size = 48
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  // Color based on percentage
  const getColor = () => {
    if (percentage >= 80) return 'text-green-500 dark:text-green-400'
    if (percentage >= 50) return 'text-amber-500 dark:text-amber-400'
    return 'text-gray-400 dark:text-dark-text-muted'
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        {/* Background circle */}
        <circle
          className="text-gray-100 dark:text-dark-card-soft"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={getColor()}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 0.5s ease-in-out',
          }}
        />
      </svg>
      {/* Percentage text in center */}
      <span className="
        absolute
        text-sm font-semibold
        text-gray-700 dark:text-dark-text-secondary
      ">
        {percentage}%
      </span>
    </div>
  )
}

/**
 * Empty state when no sanity checks
 */
function EmptyState() {
  return (
    <div className="flex items-center gap-4">
      <div className="
        w-12 h-12
        flex items-center justify-center
        bg-gray-100 dark:bg-dark-card-soft
        rounded-full
      ">
        <span className="text-xs text-gray-400">--</span>
      </div>
      <div>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
          No data yet
        </p>
        <p className="text-xs text-gray-400 dark:text-dark-text-muted">
          Complete sanity checks to track rigor
        </p>
      </div>
    </div>
  )
}

/**
 * Sanity check completion rate display
 * Shows how often final validation step is completed
 */
export default function SanityCheckRate({ stats }: SanityCheckRateProps) {
  const { completed, total, percentage } = stats

  return (
    <div>
      {/* Header */}
      <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-3">
        Sanity Check Rate
      </h3>

      {total === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex items-center gap-4">
          {/* Circular progress */}
          <CircularProgress percentage={percentage} />

          {/* Stats text */}
          <div>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              <span className="font-medium">{completed}</span>
              <span className="text-gray-400 dark:text-dark-text-muted"> / {total}</span>
              <span className="ml-1 text-gray-400 dark:text-dark-text-muted">completed</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-0.5">
              {getInsight(percentage)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get insight text based on completion rate
 */
function getInsight(percentage: number): string {
  if (percentage >= 90) return 'Excellent rigor!'
  if (percentage >= 70) return 'Good validation habits'
  if (percentage >= 50) return 'Room for improvement'
  if (percentage > 0) return 'Try to validate more solutions'
  return 'Start checking your work'
}
