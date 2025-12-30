'use client'

import type { ErrorTag } from '@/types/circuitBreaker'
import { ERROR_TAG_LABELS } from '@/types/circuitBreaker'

interface CircuitBreakerWarningProps {
  message: string
  errorTag: ErrorTag
  onDismiss: () => void
}

export default function CircuitBreakerWarning({
  message,
  errorTag,
  onDismiss,
}: CircuitBreakerWarningProps) {
  const tagLabel = ERROR_TAG_LABELS[errorTag]

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mb-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-amber-100 dark:bg-amber-800/30 rounded-full flex items-center justify-center">
          <svg
            className="w-4 h-4 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-800/40 text-amber-800 dark:text-amber-300">
                {tagLabel}
              </span>
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-300">
                Pattern Detected
              </h4>
            </div>
            <button
              onClick={onDismiss}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{message}</p>
        </div>
      </div>
    </div>
  )
}
