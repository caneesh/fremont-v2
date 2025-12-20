'use client'

import type { MistakeWarning as MistakeWarningType } from '@/types/mistakes'

interface MistakeWarningProps {
  warnings: MistakeWarningType[]
  onDismiss?: () => void
}

export default function MistakeWarning({ warnings, onDismiss }: MistakeWarningProps) {
  if (warnings.length === 0) return null

  return (
    <div className="space-y-3">
      {warnings.map((warning, index) => (
        <div
          key={index}
          className={`border-2 rounded-lg p-4 ${
            warning.severity === 'high'
              ? 'bg-red-50 border-red-400'
              : warning.severity === 'medium'
              ? 'bg-orange-50 border-orange-400'
              : 'bg-yellow-50 border-yellow-400'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    warning.severity === 'high'
                      ? 'bg-red-600'
                      : warning.severity === 'medium'
                      ? 'bg-orange-600'
                      : 'bg-yellow-600'
                  }`}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4
                    className={`text-sm font-bold ${
                      warning.severity === 'high'
                        ? 'text-red-900'
                        : warning.severity === 'medium'
                        ? 'text-orange-900'
                        : 'text-yellow-900'
                    }`}
                  >
                    Pattern Detected
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Based on your previous attempts
                  </p>
                </div>
              </div>

              <p
                className={`text-sm font-medium mb-3 ${
                  warning.severity === 'high'
                    ? 'text-red-800'
                    : warning.severity === 'medium'
                    ? 'text-orange-800'
                    : 'text-yellow-800'
                }`}
              >
                {warning.message}
              </p>

              {warning.suggestions.length > 0 && (
                <div className="space-y-1">
                  <p
                    className={`text-xs font-semibold ${
                      warning.severity === 'high'
                        ? 'text-red-900'
                        : warning.severity === 'medium'
                        ? 'text-orange-900'
                        : 'text-yellow-900'
                    }`}
                  >
                    Suggestions:
                  </p>
                  <ul className="space-y-1">
                    {warning.suggestions.map((suggestion, idx) => (
                      <li
                        key={idx}
                        className={`text-xs flex items-start gap-2 ${
                          warning.severity === 'high'
                            ? 'text-red-700'
                            : warning.severity === 'medium'
                            ? 'text-orange-700'
                            : 'text-yellow-700'
                        }`}
                      >
                        <span className="flex-shrink-0 mt-0.5">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-3 text-gray-400 hover:text-gray-600 flex-shrink-0"
                aria-label="Dismiss warning"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
