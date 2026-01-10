'use client'

/**
 * LevelBadge Component
 *
 * Displays the user's current track/level as a clickable badge.
 * Opens the LevelSwitcher modal when clicked.
 */

import { useState } from 'react'
import { useUserProfile, getTrackInfo } from '@/lib/profile'
import LevelSwitcher from './LevelSwitcher'

interface LevelBadgeProps {
  /** Optional className for styling */
  className?: string
  /** Show compact version (shortName only) */
  compact?: boolean
}

export default function LevelBadge({ className = '', compact = false }: LevelBadgeProps) {
  const { track, isLoaded } = useUserProfile()
  const [showSwitcher, setShowSwitcher] = useState(false)

  if (!isLoaded) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-7 w-20 bg-gray-200 dark:bg-dark-card-soft rounded-full" />
      </div>
    )
  }

  const trackInfo = getTrackInfo(track)

  return (
    <>
      <button
        onClick={() => setShowSwitcher(true)}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full
          ${trackInfo.bgColor} ${trackInfo.color}
          text-sm font-medium
          hover:opacity-90 active:scale-95
          transition-all cursor-pointer
          border border-current/20
          ${className}
        `}
        title={`Current level: ${trackInfo.name}. Click to change.`}
      >
        {/* Level icon */}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>

        {/* Level name */}
        <span>{compact ? trackInfo.shortName : trackInfo.name}</span>

        {/* Dropdown indicator */}
        <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Level Switcher Modal */}
      <LevelSwitcher
        isOpen={showSwitcher}
        onClose={() => setShowSwitcher(false)}
      />
    </>
  )
}
