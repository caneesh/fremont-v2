'use client'

/**
 * TestRunner Component
 *
 * Displays test cases and their results.
 */

import type { TestCase } from '@/types/debugRefactorMode'
import type { TestResult } from '@/lib/debugRefactor'

interface TestRunnerProps {
  testCases: readonly TestCase[]
  results: TestResult[]
  isRunning: boolean
  onRun: () => void
  disabled?: boolean
}

export function TestRunner({
  testCases,
  results,
  isRunning,
  onRun,
  disabled = false,
}: TestRunnerProps) {
  // Map results by test ID for easy lookup
  const resultMap = new Map(results.map((r) => [r.testId, r]))

  const passedCount = results.filter((r) => r.passed).length
  const failedCount = results.filter((r) => !r.passed).length

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Test Cases
          </h4>
          {results.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600 dark:text-green-400">
                {passedCount} passed
              </span>
              {failedCount > 0 && (
                <span className="text-red-600 dark:text-red-400">
                  {failedCount} failed
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onRun}
          disabled={disabled || isRunning}
          className="flex items-center gap-2 rounded-lg bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50"
        >
          {isRunning ? (
            <>
              <svg
                className="h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Running...
            </>
          ) : (
            <>
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
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Run Tests
            </>
          )}
        </button>
      </div>

      {/* Test list */}
      <div className="max-h-60 divide-y divide-gray-200 overflow-y-auto dark:divide-gray-700">
        {testCases.map((test, index) => {
          const result = resultMap.get(test.id)

          return (
            <div
              key={test.id}
              className="flex items-start gap-3 px-4 py-3"
            >
              {/* Status icon */}
              <div className="flex-shrink-0 pt-0.5">
                {result === undefined ? (
                  <div className="h-5 w-5 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                ) : result.passed ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500">
                    <svg
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Test info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Test {index + 1}
                  </span>
                  {test.isHidden && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      Hidden
                    </span>
                  )}
                </div>

                {!test.isHidden && (
                  <div className="mt-1 space-y-1 font-mono text-xs">
                    <div className="text-gray-600 dark:text-gray-400">
                      Input: <span className="text-gray-900 dark:text-gray-200">{test.input}</span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Expected: <span className="text-gray-900 dark:text-gray-200">{test.expectedOutput}</span>
                    </div>
                    {result && !result.passed && result.actualOutput && (
                      <div className="text-red-600 dark:text-red-400">
                        Actual: <span>{result.actualOutput}</span>
                      </div>
                    )}
                    {result && !result.passed && result.error && (
                      <div className="text-red-600 dark:text-red-400">
                        Error: {result.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Empty state */}
      {testCases.length === 0 && (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No test cases available
          </p>
        </div>
      )}
    </div>
  )
}
