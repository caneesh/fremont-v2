'use client'

import { useState } from 'react'
import type { MistakeCard } from '@/types/mistakeNotebook'
import { getStatusDisplay, formatInterval } from '@/lib/srsScheduler'
import { getStepTypeBadge } from '@/lib/hintEngine'

interface MistakeCardDisplayProps {
  card: MistakeCard
  onSuspend?: (id: string) => void
  onUnsuspend?: (id: string) => void
  onDelete?: (id: string) => void
  onReview?: (id: string) => void
  compact?: boolean
}

export default function MistakeCardDisplay({
  card,
  onSuspend,
  onUnsuspend,
  onDelete,
  onReview,
  compact = false
}: MistakeCardDisplayProps) {
  const [showActions, setShowActions] = useState(false)

  const statusDisplay = getStatusDisplay(card.srs.status)
  const stepTypeBadge = getStepTypeBadge(card.stepType)

  const isOverdue = card.srs.dueDate < new Date().toISOString().split('T')[0]
  const isDue = card.srs.dueDate <= new Date().toISOString().split('T')[0]

  const severityColors = {
    minor: 'border-l-yellow-400',
    moderate: 'border-l-orange-400',
    major: 'border-l-red-400'
  }

  if (compact) {
    return (
      <div
        className={`bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border p-3 border-l-4 ${severityColors[card.severity]}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary truncate">
              {card.stepTitle}
            </p>
            <p className="text-xs text-gray-500 dark:text-dark-text-muted truncate">
              {card.problemTitle}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusDisplay.bgClass} ${statusDisplay.color}`}>
              {statusDisplay.label}
            </span>
            {isDue && card.srs.status !== 'suspended' && onReview && (
              <button
                onClick={() => onReview(card.id)}
                className="p-1 text-accent hover:text-accent-strong"
                title="Review now"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm hover:shadow-md dark:shadow-dark-sm dark:hover:shadow-dark-md transition-all border-l-4 ${severityColors[card.severity]}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="p-4 pb-3 border-b border-gray-100 dark:border-dark-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">
              {card.stepTitle}
            </h3>
            <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-0.5 truncate">
              {card.problemTitle}
            </p>
          </div>

          {/* Status + Due indicator */}
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusDisplay.bgClass} ${statusDisplay.color}`}>
              {statusDisplay.label}
            </span>
            {card.srs.status !== 'suspended' && (
              <span className={`text-xs ${isOverdue ? 'text-red-500 dark:text-red-400 font-medium' : isDue ? 'text-amber-500 dark:text-amber-400' : 'text-gray-400 dark:text-dark-text-muted'}`}>
                {isOverdue ? 'Overdue' : isDue ? 'Due today' : `Due in ${formatInterval(Math.ceil((new Date(card.srs.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))}`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Misconception note */}
        <p className="text-sm text-gray-700 dark:text-dark-text-secondary">
          {card.misconceptionNote}
        </p>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Step type */}
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${stepTypeBadge.bgClass} ${stepTypeBadge.textClass}`}>
            {stepTypeBadge.label}
          </span>

          {/* Domain */}
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-muted">
            {card.domain}
          </span>

          {/* Trigger */}
          <span className="text-xs text-gray-400 dark:text-dark-text-muted">
            {card.trigger.replace('_', ' ')}
          </span>
        </div>

        {/* Concept tags */}
        <div className="flex flex-wrap gap-1.5">
          {card.conceptTags.slice(0, 4).map(tag => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs bg-accent/10 text-accent dark:bg-accent/20"
            >
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
          {card.conceptTags.length > 4 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-dark-card-soft text-gray-500 dark:text-dark-text-muted">
              +{card.conceptTags.length - 4} more
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 pt-2 text-xs text-gray-500 dark:text-dark-text-muted">
          <span>Reviews: {card.reviewCount}</span>
          <span>Streak: {card.correctStreak}</span>
          <span>Hints: {card.hintLevelReached}</span>
        </div>
      </div>

      {/* Actions footer */}
      <div className={`px-4 py-3 bg-gray-50 dark:bg-dark-card-soft border-t border-gray-100 dark:border-dark-border rounded-b-xl flex items-center justify-between transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center gap-2">
          {card.srs.status === 'suspended' ? (
            onUnsuspend && (
              <button
                onClick={() => onUnsuspend(card.id)}
                className="text-xs text-green-600 dark:text-green-400 hover:underline"
              >
                Unsuspend
              </button>
            )
          ) : (
            onSuspend && (
              <button
                onClick={() => onSuspend(card.id)}
                className="text-xs text-gray-500 dark:text-dark-text-muted hover:underline"
              >
                Suspend
              </button>
            )
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(card.id)}
              className="text-xs text-red-500 dark:text-red-400 hover:underline"
            >
              Delete
            </button>
          )}
        </div>

        {isDue && card.srs.status !== 'suspended' && onReview && (
          <button
            onClick={() => onReview(card.id)}
            className="px-3 py-1 bg-accent text-white text-xs font-medium rounded hover:bg-accent-strong transition-colors"
          >
            Review Now
          </button>
        )}
      </div>
    </div>
  )
}
