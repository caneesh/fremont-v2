'use client'

import type { ConfidenceDistribution as ConfidenceDistributionType } from '@/types/progressOverview'

interface ConfidenceDistributionProps {
  distribution: ConfidenceDistributionType
}

/**
 * Single confidence bar segment
 */
function ConfidenceBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  // Calculate width as percentage of total, minimum 4px if count > 0
  const percentage = total > 0 ? (count / total) * 100 : 0
  const width = count > 0 ? Math.max(percentage, 8) : 0

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-dark-text-muted w-12">
        {label}
      </span>
      <div className="flex-1 h-4 bg-gray-100 dark:bg-dark-card-soft rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-dark-text-secondary w-8 text-right">
        {count}
      </span>
    </div>
  )
}

/**
 * Empty state when no confidence data
 */
function EmptyState() {
  return (
    <div className="py-3 text-center">
      <p className="text-xs text-gray-500 dark:text-dark-text-muted">
        No confidence ratings yet.
      </p>
      <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
        Rate your confidence after solving steps.
      </p>
    </div>
  )
}

/**
 * Confidence distribution visualization
 * Shows low/medium/high confidence answer counts
 */
export default function ConfidenceDistribution({
  distribution,
}: ConfidenceDistributionProps) {
  const { low, medium, high, total } = distribution

  if (total === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-3">
          Confidence Distribution
        </h3>
        <EmptyState />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
          Confidence Distribution
        </h3>
        <span className="text-xs text-gray-500 dark:text-dark-text-muted">
          {total} ratings
        </span>
      </div>

      {/* Distribution bars */}
      <div className="space-y-2">
        <ConfidenceBar
          label="Low"
          count={low}
          total={total}
          color="bg-red-400 dark:bg-red-500"
        />
        <ConfidenceBar
          label="Med"
          count={medium}
          total={total}
          color="bg-amber-400 dark:bg-amber-500"
        />
        <ConfidenceBar
          label="High"
          count={high}
          total={total}
          color="bg-green-400 dark:bg-green-500"
        />
      </div>

      {/* Insight */}
      {total >= 5 && (
        <div className="mt-3 pt-3 border-t border-gray-50 dark:border-dark-border/50">
          <ConfidenceInsight distribution={distribution} />
        </div>
      )}
    </div>
  )
}

/**
 * Generate insight based on confidence distribution
 */
function ConfidenceInsight({ distribution }: { distribution: ConfidenceDistributionType }) {
  const { low, medium, high, total } = distribution

  const highPct = (high / total) * 100
  const lowPct = (low / total) * 100

  let insight: string
  let isPositive: boolean

  if (highPct >= 60) {
    insight = 'Strong confidence - trust your understanding'
    isPositive = true
  } else if (lowPct >= 40) {
    insight = 'Focus on shaky areas before moving forward'
    isPositive = false
  } else {
    insight = 'Building confidence steadily'
    isPositive = true
  }

  return (
    <p className={`
      text-xs
      ${isPositive
        ? 'text-green-600 dark:text-green-400'
        : 'text-amber-600 dark:text-amber-400'
      }
    `}>
      {insight}
    </p>
  )
}
