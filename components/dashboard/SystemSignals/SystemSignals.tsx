'use client'

import { useState, useEffect } from 'react'
import FeatureFlagChip, { ModeIndicator } from './FeatureFlagChip'
import {
  computeSystemSignals,
  getActiveModesSummary,
} from '@/lib/dashboard/systemSignalsService'
import type { SystemSignalsData } from '@/types/systemSignals'

interface SystemSignalsProps {
  className?: string
  defaultCollapsed?: boolean
}

/**
 * Collapsed view showing just active modes
 */
function CollapsedView({
  onExpand,
}: {
  onExpand: () => void
}) {
  const modes = getActiveModesSummary()
  const enabledModes = modes.filter(m => m.isEnabled)

  return (
    <button
      onClick={onExpand}
      className="
        w-full
        flex items-center justify-between
        px-4 py-3
        bg-gray-50 dark:bg-dark-card-soft
        hover:bg-gray-100 dark:hover:bg-dark-border/50
        rounded-xl
        transition-colors
        group
      "
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="
          p-1.5
          bg-white dark:bg-dark-card
          rounded-lg
          shadow-sm
        ">
          <svg
            className="w-4 h-4 text-gray-500 dark:text-dark-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        {/* Active modes */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
            Active Modes:
          </span>
          <div className="flex items-center gap-2">
            {enabledModes.map((mode) => (
              <ModeIndicator
                key={mode.name}
                name={mode.name}
                isEnabled={mode.isEnabled}
              />
            ))}
            {enabledModes.length === 0 && (
              <span className="text-xs text-gray-400 dark:text-dark-text-muted">
                None active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expand icon */}
      <svg
        className="
          w-4 h-4
          text-gray-400 dark:text-dark-text-muted
          group-hover:text-gray-600 dark:group-hover:text-dark-text-secondary
          transition-colors
        "
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}

/**
 * Expanded view showing all flags
 */
function ExpandedView({
  data,
  onCollapse,
}: {
  data: SystemSignalsData
  onCollapse: () => void
}) {
  // Group flags by category
  const learningModeFlags = data.flags.filter(f => f.category === 'learning_mode')
  const feedbackFlags = data.flags.filter(f => f.category === 'feedback')
  const practiceFlags = data.flags.filter(f => f.category === 'practice')

  return (
    <div className="
      bg-gray-50 dark:bg-dark-card-soft
      rounded-xl
      overflow-hidden
    ">
      {/* Header */}
      <button
        onClick={onCollapse}
        className="
          w-full
          flex items-center justify-between
          px-4 py-3
          bg-white dark:bg-dark-card
          border-b border-gray-100 dark:border-dark-border
          hover:bg-gray-50 dark:hover:bg-dark-card-soft
          transition-colors
        "
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-500 dark:text-dark-text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary">
            System & Learning Signals
          </span>
          <span className="
            px-1.5 py-0.5
            text-xs
            bg-gray-100 dark:bg-dark-card-soft
            text-gray-500 dark:text-dark-text-muted
            rounded
          ">
            {data.enabledCount}/{data.totalCount} active
          </span>
        </div>

        {/* Collapse icon */}
        <svg
          className="w-4 h-4 text-gray-400 dark:text-dark-text-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </button>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Learning Modes */}
        {learningModeFlags.length > 0 && (
          <FlagSection title="Learning Modes" flags={learningModeFlags} />
        )}

        {/* Feedback */}
        {feedbackFlags.length > 0 && (
          <FlagSection title="Feedback & Review" flags={feedbackFlags} />
        )}

        {/* Practice */}
        {practiceFlags.length > 0 && (
          <FlagSection title="Practice Tools" flags={practiceFlags} />
        )}

        {/* Info text */}
        <p className="
          text-xs text-center
          text-gray-500 dark:text-dark-text-muted
          pt-2
        ">
          Hover over any mode to see how it helps your exam performance
        </p>
      </div>
    </div>
  )
}

/**
 * Flag section with title and chips
 */
function FlagSection({
  title,
  flags,
}: {
  title: string
  flags: SystemSignalsData['flags']
}) {
  return (
    <div>
      <h4 className="text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-2">
        {title}
      </h4>
      <div className="flex flex-wrap gap-2">
        {flags.map((flag) => (
          <FeatureFlagChip key={flag.key} flag={flag} showTooltip />
        ))}
      </div>
    </div>
  )
}

/**
 * System Signals Section (Collapsible)
 *
 * Shows active feature flags and learning modes for transparency.
 * Collapsed by default to reduce visual noise.
 */
export default function SystemSignals({
  className = '',
  defaultCollapsed = true,
}: SystemSignalsProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const [data, setData] = useState<SystemSignalsData | null>(null)

  useEffect(() => {
    const signalsData = computeSystemSignals()
    setData(signalsData)
  }, [])

  // Don't render until data is loaded
  if (!data) {
    return null
  }

  return (
    <div className={className}>
      {isCollapsed ? (
        <CollapsedView onExpand={() => setIsCollapsed(false)} />
      ) : (
        <ExpandedView data={data} onCollapse={() => setIsCollapsed(true)} />
      )}
    </div>
  )
}
