'use client'

/**
 * Dashboard Empty State
 *
 * Shows when specific data is unavailable with a clear CTA.
 * Uses the EmptyState type from the dashboard model.
 */

import Link from 'next/link'
import type { EmptyState } from '@/types/dashboardModel'

interface DashboardEmptyStateProps {
  state: EmptyState
  variant?: 'card' | 'inline' | 'full'
  onDismiss?: () => void
}

const icons: Record<string, JSX.Element> = {
  calendar: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  play: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  check: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  lightbulb: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  rocket: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  default: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

export default function DashboardEmptyState({
  state,
  variant = 'card',
  onDismiss,
}: DashboardEmptyStateProps) {
  const icon = icons[state.icon || 'default'] || icons.default

  // Full variant - centered with larger elements
  if (variant === 'full') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="
          w-20 h-20
          mb-6
          flex items-center justify-center
          bg-gray-100 dark:bg-dark-card-soft
          text-gray-400 dark:text-dark-text-muted
          rounded-full
        ">
          {icon}
        </div>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
          {state.title}
        </h2>

        <p className="text-gray-600 dark:text-dark-text-secondary mb-6 max-w-md">
          {state.description}
        </p>

        <Link
          href={state.ctaRoute}
          className="
            inline-flex items-center gap-2
            px-6 py-3
            bg-accent text-white
            rounded-xl
            font-semibold
            hover:bg-accent-strong
            transition-colors
            shadow-md hover:shadow-lg
          "
        >
          {state.ctaLabel}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    )
  }

  // Card variant - compact card style
  if (variant === 'card') {
    return (
      <div className="
        bg-white dark:bg-dark-card
        border border-gray-200 dark:border-dark-border
        rounded-xl
        p-6
        text-center
      ">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="
          w-14 h-14
          mx-auto mb-4
          flex items-center justify-center
          bg-gray-100 dark:bg-dark-card-soft
          text-gray-400 dark:text-dark-text-muted
          rounded-full
        ">
          {icon}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-1">
          {state.title}
        </h3>

        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
          {state.description}
        </p>

        <Link
          href={state.ctaRoute}
          className="
            inline-flex items-center gap-1.5
            px-4 py-2
            bg-accent text-white
            rounded-lg
            text-sm font-medium
            hover:bg-accent-strong
            transition-colors
          "
        >
          {state.ctaLabel}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    )
  }

  // Inline variant - minimal horizontal layout
  return (
    <div className="
      flex items-center gap-4
      p-4
      bg-gray-50 dark:bg-dark-card-soft
      rounded-lg
    ">
      <div className="
        w-10 h-10
        flex-shrink-0
        flex items-center justify-center
        bg-white dark:bg-dark-card
        text-gray-400 dark:text-dark-text-muted
        rounded-lg
        border border-gray-200 dark:border-dark-border
      ">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
          {state.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-dark-text-muted truncate">
          {state.description}
        </p>
      </div>

      <Link
        href={state.ctaRoute}
        className="
          flex-shrink-0
          px-3 py-1.5
          bg-accent text-white
          rounded-lg
          text-xs font-medium
          hover:bg-accent-strong
          transition-colors
        "
      >
        {state.ctaLabel}
      </Link>
    </div>
  )
}
