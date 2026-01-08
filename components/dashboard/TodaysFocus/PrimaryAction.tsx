'use client'

import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import type { PrimaryAction as PrimaryActionType } from '@/types/todaysFocus'

interface PrimaryActionProps {
  action: PrimaryActionType
}

/**
 * Get icon for the action type
 */
function ActionIcon({ type }: { type: PrimaryActionType['type'] }) {
  switch (type) {
    case 'continue_problem':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case 'start_review':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    case 'practice_pattern':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    case 'start_fresh':
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      )
    default:
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      )
  }
}

/**
 * Get subtitle based on action type
 */
function getSubtitle(action: PrimaryActionType): string | null {
  switch (action.type) {
    case 'continue_problem': {
      const data = action.continueData
      if (!data) return null
      const progress = `Step ${data.currentStep} of ${data.totalSteps}`
      return data.patternName ? `${progress} - ${data.patternName}` : progress
    }
    case 'start_review': {
      const data = action.reviewData
      if (!data) return null
      return `~${data.estimatedMinutes} min`
    }
    case 'practice_pattern': {
      const data = action.patternData
      if (!data) return null
      const stepLabel = data.stepType === 'learn' ? 'Learn' : data.stepType === 'practice' ? 'Practice' : 'Drill'
      return data.trackName ? `${data.trackName} - ${stepLabel}` : stepLabel
    }
    default:
      return null
  }
}

/**
 * Primary action button with prominent styling
 * This is the single, most important CTA on the dashboard
 */
export default function PrimaryAction({ action }: PrimaryActionProps) {
  const router = useRouter()
  const subtitle = getSubtitle(action)

  const handleClick = () => {
    router.push(action.route)
  }

  return (
    <button
      onClick={handleClick}
      className="
        w-full group
        flex items-center gap-4
        p-4 sm:p-5
        bg-accent hover:bg-accent-strong
        rounded-xl
        text-white
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2
        dark:focus:ring-offset-dark-card
        shadow-md hover:shadow-lg
      "
    >
      {/* Icon */}
      <div className="
        flex-shrink-0
        p-3
        bg-white/20
        rounded-lg
        group-hover:bg-white/30
        transition-colors
      ">
        <ActionIcon type={action.type} />
      </div>

      {/* Content */}
      <div className="flex-1 text-left min-w-0">
        <div className="font-semibold text-lg truncate">
          {action.ctaLabel}
        </div>
        {subtitle && (
          <div className="text-sm text-white/80 mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>

      {/* Arrow */}
      <div className="
        flex-shrink-0
        opacity-60 group-hover:opacity-100
        group-hover:translate-x-1
        transition-all
      ">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  )
}
