'use client'

import type { ProblemDisplayStatus } from '@/types/activeProblems'
import { getStatusColors, getStatusLabel } from '@/types/activeProblems'

interface StatusBadgeProps {
  status: ProblemDisplayStatus
  size?: 'sm' | 'md'
}

/**
 * Status icon based on problem state
 */
function StatusIcon({ status }: { status: ProblemDisplayStatus }) {
  const colors = getStatusColors(status)

  switch (status) {
    case 'in_progress':
      return (
        <svg className={`w-3 h-3 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        </svg>
      )
    case 'solved':
      return (
        <svg className={`w-3 h-3 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      )
    case 'skipped':
      return (
        <svg className={`w-3 h-3 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      )
  }
}

/**
 * Status badge showing problem state with icon and label
 */
export default function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const colors = getStatusColors(status)
  const label = getStatusLabel(status)

  const sizeClasses = size === 'sm'
    ? 'px-1.5 py-0.5 text-xs gap-1'
    : 'px-2 py-1 text-sm gap-1.5'

  return (
    <span
      className={`
        inline-flex items-center
        font-medium
        rounded
        ${colors.bg}
        ${colors.text}
        ${sizeClasses}
      `}
    >
      <StatusIcon status={status} />
      <span>{label}</span>
    </span>
  )
}
