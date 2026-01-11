'use client'

import type { QuestionTrack } from '@/types/studyPath'
import { getTrackDisplayName } from '@/types/studyPath'

interface TrackFallbackWarningProps {
  requestedTrack: QuestionTrack
  actualTrack: QuestionTrack
  message?: string
  className?: string
  onDismiss?: () => void
}

/**
 * Warning component shown when track fallback occurs
 * Displayed when no questions are available for the requested track
 */
export default function TrackFallbackWarning({
  requestedTrack,
  actualTrack,
  message,
  className = '',
  onDismiss,
}: TrackFallbackWarningProps) {
  const displayMessage = message || `No ${getTrackDisplayName(requestedTrack)} questions found; showing ${getTrackDisplayName(actualTrack)} instead`

  return (
    <div className={`bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            {displayMessage}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Change your level in Settings to see different questions.
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Compact inline version of the fallback warning
 */
export function TrackFallbackBadge({
  requestedTrack,
  actualTrack,
  className = '',
}: Pick<TrackFallbackWarningProps, 'requestedTrack' | 'actualTrack' | 'className'>) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 ${className}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
      </svg>
      Showing {getTrackDisplayName(actualTrack)}
    </span>
  )
}
