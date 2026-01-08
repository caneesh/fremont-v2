'use client'

import { useState } from 'react'
import type { DisplayableFeatureFlag } from '@/types/systemSignals'

interface FeatureFlagChipProps {
  flag: DisplayableFeatureFlag
  showTooltip?: boolean
}

/**
 * Tooltip component for exam benefit explanation
 */
function Tooltip({
  children,
  content,
}: {
  children: React.ReactNode
  content: string
}) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}

      {isVisible && (
        <div className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-2
          px-2.5 py-1.5
          text-xs
          text-white
          bg-gray-900 dark:bg-gray-700
          rounded-lg
          shadow-lg
          whitespace-nowrap
          z-50
          animate-in fade-in duration-150
        ">
          {content}
          {/* Arrow */}
          <div className="
            absolute top-full left-1/2 -translate-x-1/2
            border-4 border-transparent border-t-gray-900 dark:border-t-gray-700
          " />
        </div>
      )}
    </div>
  )
}

/**
 * Status indicator (checkmark or X)
 */
function StatusIndicator({ isEnabled }: { isEnabled: boolean }) {
  if (isEnabled) {
    return (
      <svg className="w-3 h-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    )
  }

  return (
    <svg className="w-3 h-3 text-gray-400 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
    </svg>
  )
}

/**
 * Feature flag chip showing status with optional tooltip
 */
export default function FeatureFlagChip({
  flag,
  showTooltip = true,
}: FeatureFlagChipProps) {
  const chipContent = (
    <span
      className={`
        inline-flex items-center gap-1.5
        px-2 py-1
        text-xs font-medium
        rounded-full
        transition-colors
        ${flag.isEnabled
          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
          : 'bg-gray-100 dark:bg-dark-card-soft text-gray-500 dark:text-dark-text-muted'
        }
      `}
    >
      <StatusIndicator isEnabled={flag.isEnabled} />
      <span>{flag.displayName}</span>
    </span>
  )

  if (showTooltip && flag.examBenefit) {
    return (
      <Tooltip content={flag.examBenefit}>
        {chipContent}
      </Tooltip>
    )
  }

  return chipContent
}

/**
 * Compact mode indicator (just checkmark and name)
 */
export function ModeIndicator({
  name,
  isEnabled,
}: {
  name: string
  isEnabled: boolean
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        text-xs
        ${isEnabled
          ? 'text-green-600 dark:text-green-400'
          : 'text-gray-400 dark:text-dark-text-muted'
        }
      `}
    >
      <StatusIndicator isEnabled={isEnabled} />
      <span>{name}</span>
    </span>
  )
}
