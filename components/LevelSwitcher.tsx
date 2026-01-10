'use client'

/**
 * LevelSwitcher Component
 *
 * Modal for selecting/changing the user's track/level.
 */

import { useEffect, useCallback } from 'react'
import type { Track } from '@prisma/client'
import { useUserProfile, getOrderedTracks, getTrackInfo } from '@/lib/profile'

interface LevelSwitcherProps {
  isOpen: boolean
  onClose: () => void
}

export default function LevelSwitcher({ isOpen, onClose }: LevelSwitcherProps) {
  const { track: currentTrack, setTrack, ensureProfile } = useUserProfile()
  const tracks = getOrderedTracks()

  // Ensure profile exists when modal opens
  useEffect(() => {
    if (isOpen) {
      ensureProfile()
    }
  }, [isOpen, ensureProfile])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  const handleSelectTrack = useCallback((track: Track) => {
    setTrack(track)
    onClose()
  }, [setTrack, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-dark-card rounded-xl shadow-2xl dark:shadow-dark-lg max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-dark-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
                Select Your Level
              </h2>
              <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-0.5">
                Choose the difficulty that matches your current skills
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card-soft transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-500 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Track Options */}
          <div className="p-4 space-y-3">
            {tracks.map((trackInfo) => {
              const isSelected = currentTrack === trackInfo.id

              return (
                <button
                  key={trackInfo.id}
                  onClick={() => handleSelectTrack(trackInfo.id)}
                  className={`
                    w-full p-4 rounded-xl text-left transition-all
                    border-2
                    ${isSelected
                      ? `${trackInfo.bgColor} border-current ${trackInfo.color}`
                      : 'bg-gray-50 dark:bg-dark-card-soft border-transparent hover:border-gray-300 dark:hover:border-dark-border'
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection indicator */}
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5
                      flex items-center justify-center
                      ${isSelected
                        ? `border-current ${trackInfo.color}`
                        : 'border-gray-300 dark:border-dark-border'
                      }
                    `}>
                      {isSelected && (
                        <div className={`w-2.5 h-2.5 rounded-full bg-current ${trackInfo.color}`} />
                      )}
                    </div>

                    {/* Track info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`
                          font-semibold
                          ${isSelected
                            ? trackInfo.color
                            : 'text-gray-900 dark:text-dark-text-primary'
                          }
                        `}>
                          {trackInfo.name}
                        </span>
                        {isSelected && (
                          <span className={`
                            text-xs px-2 py-0.5 rounded-full
                            ${trackInfo.bgColor} ${trackInfo.color}
                          `}>
                            Current
                          </span>
                        )}
                      </div>
                      <p className={`
                        text-sm mt-1
                        ${isSelected
                          ? `${trackInfo.color} opacity-80`
                          : 'text-gray-600 dark:text-dark-text-secondary'
                        }
                      `}>
                        {trackInfo.description}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card-soft rounded-b-xl">
            <p className="text-xs text-gray-500 dark:text-dark-text-muted text-center">
              You can change your level anytime. Your progress is saved across all levels.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
