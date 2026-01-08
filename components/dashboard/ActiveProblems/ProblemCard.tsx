'use client'

import { useRouter } from 'next/navigation'
import StatusBadge from './StatusBadge'
import type { ActiveProblemItem } from '@/types/activeProblems'
import {
  getStatusColors,
  getActionLabel,
  formatRelativeTime,
  formatDuration,
} from '@/types/activeProblems'

interface ProblemCardProps {
  problem: ActiveProblemItem
}

/**
 * Progress indicator for in-progress problems
 */
function ProgressIndicator({ current, total }: { current: number; total: number }) {
  const percentage = (current / total) * 100

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-dark-card-soft rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-400 dark:bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 dark:text-dark-text-muted whitespace-nowrap">
        {current}/{total}
      </span>
    </div>
  )
}

/**
 * Action button based on problem status
 */
function ActionButton({
  status,
  onClick,
}: {
  status: ActiveProblemItem['status']
  onClick: () => void
}) {
  const label = getActionLabel(status)
  const colors = getStatusColors(status)

  // Primary style for in_progress, secondary for others
  const isPrimary = status === 'in_progress'

  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className={`
        px-3 py-1.5
        text-xs font-medium
        rounded-lg
        transition-colors
        ${isPrimary
          ? 'bg-accent hover:bg-accent-strong text-white'
          : 'bg-gray-100 dark:bg-dark-card-soft hover:bg-gray-200 dark:hover:bg-dark-border text-gray-700 dark:text-dark-text-secondary'
        }
      `}
    >
      {label}
    </button>
  )
}

/**
 * Problem card showing status, progress, and action
 */
export default function ProblemCard({ problem }: ProblemCardProps) {
  const router = useRouter()
  const colors = getStatusColors(problem.status)

  const handleClick = () => {
    router.push(problem.route)
  }

  return (
    <div
      onClick={handleClick}
      className={`
        relative
        flex items-center gap-3
        p-3
        rounded-lg
        border
        cursor-pointer
        transition-all
        hover:shadow-sm
        ${colors.border}
        bg-white dark:bg-dark-card
        hover:bg-gray-50 dark:hover:bg-dark-card-soft
      `}
    >
      {/* Status indicator bar */}
      <div
        className={`
          absolute left-0 top-2 bottom-2
          w-1 rounded-full
          ${problem.status === 'in_progress'
            ? 'bg-blue-400 dark:bg-blue-500'
            : problem.status === 'solved'
            ? 'bg-green-400 dark:bg-green-500'
            : 'bg-gray-300 dark:bg-dark-border'
          }
        `}
      />

      {/* Content */}
      <div className="flex-1 min-w-0 pl-2">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="
            text-sm font-medium
            text-gray-800 dark:text-dark-text-primary
            truncate
          ">
            {problem.title}
          </h4>
          <StatusBadge status={problem.status} size="sm" />
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-dark-text-muted">
          {/* Domain */}
          {problem.domain && (
            <span className="truncate max-w-[80px]">
              {problem.domain}
            </span>
          )}

          {/* Progress for in-progress */}
          {problem.status === 'in_progress' && problem.currentStep && problem.totalSteps && (
            <span>
              Step {problem.currentStep}/{problem.totalSteps}
            </span>
          )}

          {/* Time spent for solved */}
          {problem.status === 'solved' && problem.timeSpent && (
            <span>
              {formatDuration(problem.timeSpent)}
            </span>
          )}

          {/* Timestamp */}
          <span className="ml-auto">
            {formatRelativeTime(problem.timestamp)}
          </span>
        </div>

        {/* Progress bar for in-progress */}
        {problem.status === 'in_progress' && problem.currentStep && problem.totalSteps && (
          <div className="mt-2">
            <ProgressIndicator
              current={problem.currentStep - 1}
              total={problem.totalSteps}
            />
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="flex-shrink-0">
        <ActionButton status={problem.status} onClick={handleClick} />
      </div>
    </div>
  )
}
