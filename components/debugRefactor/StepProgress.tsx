'use client'

/**
 * StepProgress Component
 *
 * Visual progress indicator for debug/refactor steps.
 */

interface Step {
  id: string
  title: string
  description: string
  isComplete: boolean
  isCurrent: boolean
}

interface StepProgressProps {
  steps: Step[]
  progress: number
}

export function StepProgress({ steps, progress }: StepProgressProps) {
  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {progress}%
        </span>
      </div>

      {/* Step indicators */}
      <div className="flex justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center">
            {/* Connector line */}
            {index > 0 && (
              <div
                className={`absolute h-0.5 w-full -translate-y-4 ${
                  step.isComplete || step.isCurrent
                    ? 'bg-blue-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            )}

            {/* Step circle */}
            <div
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                step.isComplete
                  ? 'bg-green-500 text-white'
                  : step.isCurrent
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              }`}
            >
              {step.isComplete ? (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                index + 1
              )}
            </div>

            {/* Step label */}
            <span
              className={`mt-1 text-xs ${
                step.isCurrent
                  ? 'font-medium text-blue-600 dark:text-blue-400'
                  : step.isComplete
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {step.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
