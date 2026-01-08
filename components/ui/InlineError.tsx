'use client'

/**
 * InlineError - Standardized inline error display component
 *
 * Use this for:
 * - Form validation errors
 * - Blocking API errors for a specific action
 * - Field-level errors that require user attention
 *
 * Do NOT use toast for these - blocking errors should appear near the control.
 */
interface InlineErrorProps {
  message: string | null | undefined
  className?: string
  /** Optional ID for aria-describedby linkage */
  id?: string
}

export default function InlineError({ message, className = '', id }: InlineErrorProps) {
  if (!message) return null

  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className={`mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg ${className}`}
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-sm text-red-700 dark:text-red-300 font-medium">
          {message}
        </p>
      </div>
    </div>
  )
}

/**
 * InlineWarning - For non-blocking warnings that need attention
 */
interface InlineWarningProps {
  message: string | null | undefined
  className?: string
  onDismiss?: () => void
}

export function InlineWarning({ message, className = '', onDismiss }: InlineWarningProps) {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg ${className}`}
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <p className="flex-1 text-sm text-amber-700 dark:text-amber-300">
          {message}
        </p>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200"
            aria-label="Dismiss warning"
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
 * InlineSuccess - For inline success messages (rare - usually use toast)
 */
export function InlineSuccess({ message, className = '' }: { message: string | null | undefined; className?: string }) {
  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg ${className}`}
    >
      <div className="flex items-start gap-2">
        <svg
          className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <p className="text-sm text-green-700 dark:text-green-300">
          {message}
        </p>
      </div>
    </div>
  )
}
