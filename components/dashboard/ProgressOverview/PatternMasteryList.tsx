'use client'

import type { PatternMasteryItem, MasteryLevel, PatternState } from '@/types/progressOverview'
import { getStateLabel, getStateColor, getMasteryBarColor } from '@/types/progressOverview'

interface PatternMasteryListProps {
  patterns: PatternMasteryItem[]
  maxItems?: number
}

/**
 * Mastery bar visualization (5 segments)
 */
function MasteryBar({ level, state }: { level: MasteryLevel; state: PatternState }) {
  const filledColor = getMasteryBarColor(level, state)
  const emptyColor = 'bg-gray-100 dark:bg-dark-card-soft'

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((segment) => (
        <div
          key={segment}
          className={`
            h-2 w-3 rounded-sm
            ${segment <= level ? filledColor : emptyColor}
          `}
        />
      ))}
    </div>
  )
}

/**
 * Trend indicator icon
 */
function TrendIcon({ trend }: { trend: 'improving' | 'stable' | 'declining' }) {
  if (trend === 'improving') {
    return (
      <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    )
  }

  if (trend === 'declining') {
    return (
      <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    )
  }

  // Stable - horizontal line
  return (
    <svg className="w-3.5 h-3.5 text-gray-400 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
    </svg>
  )
}

/**
 * State badge
 */
function StateBadge({ state }: { state: PatternState }) {
  const label = getStateLabel(state)
  const colorClass = getStateColor(state)

  const bgClass = state === 'needs_review'
    ? 'bg-orange-100 dark:bg-orange-900/30'
    : state === 'stable'
    ? 'bg-green-100 dark:bg-green-900/30'
    : state === 'learning' || state === 'practicing'
    ? 'bg-blue-100 dark:bg-blue-900/30'
    : 'bg-gray-100 dark:bg-dark-card-soft'

  return (
    <span className={`
      inline-flex items-center
      px-1.5 py-0.5
      text-xs font-medium
      rounded
      ${bgClass}
      ${colorClass}
    `}>
      {label}
    </span>
  )
}

/**
 * Single pattern mastery row
 */
function PatternMasteryItem({ pattern }: { pattern: PatternMasteryItem }) {
  return (
    <div className="
      flex items-center gap-3
      py-2
      border-b border-gray-50 dark:border-dark-border/50
      last:border-b-0
    ">
      {/* Pattern name */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="
            text-sm font-medium
            text-gray-800 dark:text-dark-text-primary
            truncate
          ">
            {pattern.patternName}
          </span>
          {pattern.needsAttention && (
            <span className="
              flex-shrink-0
              w-1.5 h-1.5
              bg-orange-400
              rounded-full
            " />
          )}
        </div>
      </div>

      {/* Mastery bar */}
      <div className="flex-shrink-0">
        <MasteryBar level={pattern.masteryLevel} state={pattern.state} />
      </div>

      {/* Trend indicator */}
      <div className="flex-shrink-0 w-4">
        <TrendIcon trend={pattern.trend} />
      </div>

      {/* State badge */}
      <div className="flex-shrink-0 w-20 text-right">
        <StateBadge state={pattern.state} />
      </div>
    </div>
  )
}

/**
 * Empty state when no patterns available
 */
function EmptyState() {
  return (
    <div className="py-6 text-center">
      <p className="text-sm text-gray-500 dark:text-dark-text-muted">
        No patterns tracked yet.
      </p>
      <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
        Complete problems to see your pattern mastery develop.
      </p>
    </div>
  )
}

/**
 * Pattern mastery list showing all patterns with their states
 */
export default function PatternMasteryList({
  patterns,
  maxItems = 6,
}: PatternMasteryListProps) {
  if (patterns.length === 0) {
    return <EmptyState />
  }

  // Show limited items by default
  const visiblePatterns = patterns.slice(0, maxItems)
  const hiddenCount = patterns.length - maxItems

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
          Pattern Mastery
        </h3>
        <span className="text-xs text-gray-500 dark:text-dark-text-muted">
          {patterns.filter(p => p.state === 'stable').length}/{patterns.length} stable
        </span>
      </div>

      {/* Pattern list */}
      <div className="space-y-0">
        {visiblePatterns.map((pattern) => (
          <PatternMasteryItem key={pattern.patternId} pattern={pattern} />
        ))}
      </div>

      {/* Show more indicator */}
      {hiddenCount > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-50 dark:border-dark-border/50">
          <span className="text-xs text-gray-500 dark:text-dark-text-muted">
            +{hiddenCount} more patterns
          </span>
        </div>
      )}
    </div>
  )
}
