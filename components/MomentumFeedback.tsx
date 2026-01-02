'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MomentumEvent, StreakType } from '@/types/momentum'

interface MomentumFeedbackProps {
  /** The momentum event to display */
  event: MomentumEvent | null
  /** Called when feedback is dismissed (auto or manual) */
  onDismiss: () => void
  /** Auto-dismiss timeout in ms (default: 3000) */
  autoHideMs?: number
}

/**
 * MomentumFeedback Component
 *
 * Displays subtle, non-blocking feedback for momentum wins.
 * Features:
 * - Small glow effect (not flashy)
 * - Checkmark icon
 * - Short copy
 * - Auto-dismisses after timeout
 * - Mobile-friendly
 *
 * Design: Subtle and motivating, not distracting or gamified.
 */
export default function MomentumFeedback({
  event,
  onDismiss,
  autoHideMs = 3000,
}: MomentumFeedbackProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  const handleDismiss = useCallback(() => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsExiting(false)
      onDismiss()
    }, 200) // Exit animation duration
  }, [onDismiss])

  useEffect(() => {
    if (event) {
      setIsVisible(true)
      setIsExiting(false)

      // Auto-dismiss after timeout
      const timer = setTimeout(handleDismiss, autoHideMs)
      return () => clearTimeout(timer)
    }
  }, [event, autoHideMs, handleDismiss])

  if (!isVisible || !event) {
    return null
  }

  const { streakType, message, isRecovery, streakCount } = event
  const styles = getStreakStyles(streakType, isRecovery)
  const Icon = getStreakIcon(streakType, isRecovery)

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed bottom-20 left-1/2 -translate-x-1/2 z-50
        flex items-center gap-2 px-4 py-2.5 rounded-full
        shadow-lg backdrop-blur-sm
        transition-all duration-200 ease-out
        ${isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'}
        ${styles.bg} ${styles.border} ${styles.glow}
      `}
      onClick={handleDismiss}
    >
      {/* Subtle glow ring */}
      <div className={`
        absolute inset-0 rounded-full opacity-30
        ${styles.ring}
      `} />

      {/* Icon */}
      <div className={`
        relative flex items-center justify-center
        w-6 h-6 rounded-full
        ${styles.iconBg}
      `}>
        <Icon className={`w-3.5 h-3.5 ${styles.iconColor}`} />
      </div>

      {/* Message */}
      <span className={`
        relative text-sm font-medium
        ${styles.text}
      `}>
        {message}
      </span>

      {/* Streak count badge (if > 2) */}
      {streakCount > 2 && !isRecovery && (
        <span className={`
          relative px-1.5 py-0.5 rounded text-xs font-semibold
          ${styles.badge}
        `}>
          {streakCount}x
        </span>
      )}
    </div>
  )
}

// ============================================
// Inline MomentumBadge (for step-level feedback)
// ============================================

interface MomentumBadgeProps {
  /** Type of streak */
  type: StreakType
  /** Current streak count */
  count: number
  /** Whether this is a recovery */
  isRecovery?: boolean
  /** Size variant */
  size?: 'sm' | 'md'
}

/**
 * Inline badge for showing momentum in step accordions
 */
export function MomentumBadge({
  type,
  count,
  isRecovery = false,
  size = 'sm',
}: MomentumBadgeProps) {
  const styles = getStreakStyles(type, isRecovery)
  const Icon = getStreakIcon(type, isRecovery)

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-2.5 py-1 text-sm gap-1.5'

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'

  return (
    <div className={`
      inline-flex items-center rounded-full
      ${sizeClasses}
      ${styles.bg} ${styles.border}
    `}>
      <Icon className={`${iconSize} ${styles.iconColor}`} />
      <span className={styles.text}>
        {isRecovery ? 'Recovered' : count > 1 ? `${count}x` : getShortLabel(type)}
      </span>
    </div>
  )
}

// ============================================
// Streak indicator for step headers
// ============================================

interface StreakIndicatorProps {
  /** Decision streak count */
  decisionStreak: number
  /** Hint-free streak count */
  hintFreeStreak: number
  /** Whether to show compact version */
  compact?: boolean
}

/**
 * Small indicator showing current streaks
 * For placement in step headers or problem header
 */
export function StreakIndicator({
  decisionStreak,
  hintFreeStreak,
  compact = true,
}: StreakIndicatorProps) {
  const hasStreak = decisionStreak >= 2 || hintFreeStreak >= 1

  if (!hasStreak) return null

  return (
    <div className="flex items-center gap-1.5">
      {decisionStreak >= 2 && (
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 rounded text-xs text-emerald-700 dark:text-emerald-300">
          <CheckIcon className="w-2.5 h-2.5" />
          {!compact && <span>{decisionStreak}x</span>}
        </div>
      )}
      {hintFreeStreak >= 1 && (
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded text-xs text-blue-700 dark:text-blue-300">
          <LightbulbOffIcon className="w-2.5 h-2.5" />
          {!compact && <span>{hintFreeStreak}x</span>}
        </div>
      )}
    </div>
  )
}

// ============================================
// Helper Functions
// ============================================

function getStreakStyles(type: StreakType, isRecovery: boolean) {
  if (isRecovery) {
    return {
      bg: 'bg-amber-50/95 dark:bg-amber-900/80',
      border: 'border border-amber-200 dark:border-amber-700',
      glow: 'shadow-amber-200/50 dark:shadow-amber-800/50',
      ring: 'bg-amber-400/20',
      iconBg: 'bg-amber-500',
      iconColor: 'text-white',
      text: 'text-amber-900 dark:text-amber-100',
      badge: 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200',
    }
  }

  switch (type) {
    case 'decision':
      return {
        bg: 'bg-emerald-50/95 dark:bg-emerald-900/80',
        border: 'border border-emerald-200 dark:border-emerald-700',
        glow: 'shadow-emerald-200/50 dark:shadow-emerald-800/50',
        ring: 'bg-emerald-400/20',
        iconBg: 'bg-emerald-500',
        iconColor: 'text-white',
        text: 'text-emerald-900 dark:text-emerald-100',
        badge: 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200',
      }
    case 'hintFree':
      return {
        bg: 'bg-blue-50/95 dark:bg-blue-900/80',
        border: 'border border-blue-200 dark:border-blue-700',
        glow: 'shadow-blue-200/50 dark:shadow-blue-800/50',
        ring: 'bg-blue-400/20',
        iconBg: 'bg-blue-500',
        iconColor: 'text-white',
        text: 'text-blue-900 dark:text-blue-100',
        badge: 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200',
      }
    case 'rebuild':
      return {
        bg: 'bg-violet-50/95 dark:bg-violet-900/80',
        border: 'border border-violet-200 dark:border-violet-700',
        glow: 'shadow-violet-200/50 dark:shadow-violet-800/50',
        ring: 'bg-violet-400/20',
        iconBg: 'bg-violet-500',
        iconColor: 'text-white',
        text: 'text-violet-900 dark:text-violet-100',
        badge: 'bg-violet-200 dark:bg-violet-800 text-violet-800 dark:text-violet-200',
      }
  }
}

function getStreakIcon(type: StreakType, isRecovery: boolean) {
  if (isRecovery) return ArrowUpIcon
  switch (type) {
    case 'decision': return CheckIcon
    case 'hintFree': return LightbulbOffIcon
    case 'rebuild': return RefreshIcon
  }
}

function getShortLabel(type: StreakType): string {
  switch (type) {
    case 'decision': return 'Good'
    case 'hintFree': return 'Solo'
    case 'rebuild': return 'Rebuilt'
  }
}

// ============================================
// Icons (inline SVG for bundle size)
// ============================================

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function LightbulbOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  )
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  )
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
        d="M5 10l7-7m0 0l7 7m-7-7v18"
      />
    </svg>
  )
}
