'use client'

import type { MistakeCategory } from '@/types/mistakeIntelligence'
import { getSeverityColor, getSeverityLabel } from '@/types/mistakeIntelligence'

interface MistakeCardProps {
  mistake: MistakeCategory
  rank: number
}

/**
 * Format relative time for display
 */
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  return `${Math.floor(diffDays / 30)} months ago`
}

/**
 * Severity indicator dot
 */
function SeverityDot({ severity }: { severity: MistakeCategory['severity'] }) {
  const colors = getSeverityColor(severity)

  return (
    <span
      className={`
        inline-block
        w-2 h-2
        rounded-full
        ${severity === 'high' ? 'bg-red-500' : severity === 'medium' ? 'bg-amber-500' : 'bg-gray-400'}
      `}
      title={getSeverityLabel(severity)}
    />
  )
}

/**
 * Individual mistake card showing category, count, and context
 */
export default function MistakeCard({ mistake, rank }: MistakeCardProps) {
  const colors = getSeverityColor(mistake.severity)

  return (
    <div
      className={`
        relative
        p-3
        rounded-lg
        border
        ${colors.bg}
        ${colors.border}
        transition-colors
        hover:border-opacity-80
      `}
    >
      {/* Rank badge */}
      <div className="
        absolute -top-2 -left-2
        w-5 h-5
        flex items-center justify-center
        bg-white dark:bg-dark-card
        border border-gray-200 dark:border-dark-border
        rounded-full
        text-xs font-medium
        text-gray-500 dark:text-dark-text-muted
        shadow-sm
      ">
        {rank}
      </div>

      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <SeverityDot severity={mistake.severity} />
          <h4 className={`
            text-sm font-medium
            truncate
            ${colors.text}
          `}>
            {mistake.category}
          </h4>
        </div>

        {/* Occurrence count badge */}
        <span className={`
          flex-shrink-0
          px-1.5 py-0.5
          text-xs font-semibold
          rounded
          ${mistake.severity === 'high'
            ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
            : mistake.severity === 'medium'
            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
            : 'bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-muted'
          }
        `}>
          {mistake.occurrenceCount}x
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-2 line-clamp-2">
        {mistake.description}
      </p>

      {/* Footer with pattern link and time */}
      <div className="flex items-center justify-between text-xs">
        {mistake.associatedPattern ? (
          <span className="
            inline-flex items-center gap-1
            text-gray-500 dark:text-dark-text-muted
          ">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="truncate max-w-[100px]">
              {mistake.associatedPattern}
            </span>
          </span>
        ) : (
          <span />
        )}

        <span className="text-gray-400 dark:text-dark-text-muted">
          {formatRelativeTime(mistake.lastOccurred)}
        </span>
      </div>
    </div>
  )
}
