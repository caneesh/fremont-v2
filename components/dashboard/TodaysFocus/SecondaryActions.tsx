'use client'

import { useRouter } from 'next/navigation'
import type { SecondaryAction } from '@/types/todaysFocus'

interface SecondaryActionsProps {
  actions: SecondaryAction[]
}

/**
 * Get icon for secondary action type
 */
function SecondaryIcon({ type }: { type: SecondaryAction['type'] }) {
  const iconClass = "w-4 h-4"

  switch (type) {
    case 'review':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    case 'practice_pattern':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    case 'continue_problem':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'new_problem':
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      )
    default:
      return (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      )
  }
}

/**
 * Secondary actions - de-emphasized alternatives to the primary action
 * Displayed as subtle text links, not competing with primary CTA
 */
export default function SecondaryActions({ actions }: SecondaryActionsProps) {
  const router = useRouter()

  if (actions.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
      <span className="text-sm text-gray-500 dark:text-dark-text-muted">
        Or:
      </span>
      {actions.map((action, index) => (
        <button
          key={`${action.type}-${index}`}
          onClick={() => router.push(action.route)}
          className="
            inline-flex items-center gap-1.5
            text-sm
            text-gray-600 dark:text-dark-text-secondary
            hover:text-accent dark:hover:text-accent
            transition-colors
            group
          "
        >
          <span className="opacity-60 group-hover:opacity-100 transition-opacity">
            <SecondaryIcon type={action.type} />
          </span>
          <span className="underline underline-offset-2 decoration-gray-300 dark:decoration-dark-border group-hover:decoration-accent">
            {action.label}
          </span>
          {action.count !== undefined && (
            <span className="
              ml-1 px-1.5 py-0.5
              text-xs font-medium
              bg-gray-100 dark:bg-dark-card-soft
              text-gray-600 dark:text-dark-text-muted
              rounded
            ">
              {action.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
