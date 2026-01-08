'use client'

/**
 * ResultsModal Component
 *
 * Displays the final results after completing a debug/refactor session.
 */

import type { ModeSubmissionResult, ProblemMode } from '@/types/debugRefactorMode'
import { debugRefactorService } from '@/lib/debugRefactor'

interface ResultsModalProps {
  result: ModeSubmissionResult
  mode: ProblemMode
  onClose: () => void
  onRetry: () => void
}

export function ResultsModal({
  result,
  mode,
  onClose,
  onRetry,
}: ResultsModalProps) {
  const grade = debugRefactorService.getGrade(result.rubricScore)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div
          className={`rounded-t-lg px-6 py-4 ${
            result.passed
              ? 'bg-green-50 dark:bg-green-900/30'
              : 'bg-amber-50 dark:bg-amber-900/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2
                className={`text-lg font-bold ${
                  result.passed
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-amber-800 dark:text-amber-200'
                }`}
              >
                {result.passed ? 'Success!' : 'Keep Practicing'}
              </h2>
              <p
                className={`text-sm ${
                  result.passed
                    ? 'text-green-600 dark:text-green-300'
                    : 'text-amber-600 dark:text-amber-300'
                }`}
              >
                {mode === 'debug' ? 'Debug' : 'Refactor'} Mode Complete
              </p>
            </div>
            <div className="text-center">
              <div
                className={`text-4xl font-bold ${getGradeColor(grade)}`}
              >
                {grade}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {result.rubricScore}%
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 px-6 py-4">
          {/* Test Results */}
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Tests Passed
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {result.testsPassed}/{result.totalTests}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-600">
              <div
                className={`h-full ${
                  result.testsPassed === result.totalTests
                    ? 'bg-green-500'
                    : 'bg-amber-500'
                }`}
                style={{
                  width: `${
                    result.totalTests > 0
                      ? (result.testsPassed / result.totalTests) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Feedback */}
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/30">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {result.feedback}
            </p>
          </div>

          {/* Mode-specific results */}
          {mode === 'debug' && result.bugTagsIdentified && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Bug Types Identified
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.bugTagsIdentified.length > 0 ? (
                  result.bugTagsIdentified.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    None identified
                  </span>
                )}
              </div>
            </div>
          )}

          {mode === 'refactor' && result.smellsFixed && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Code Smells Addressed
              </h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.smellsFixed.length > 0 ? (
                  result.smellsFixed.map((smell) => (
                    <span
                      key={smell}
                      className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800 dark:bg-teal-900/30 dark:text-teal-200"
                    >
                      {smell}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    None identified
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <button
            onClick={onRetry}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            Try Again
          </button>
          <button
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white ${
              result.passed
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {result.passed ? 'Continue' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  )
}

function getGradeColor(grade: 'A' | 'B' | 'C' | 'D' | 'F'): string {
  switch (grade) {
    case 'A':
      return 'text-green-600 dark:text-green-400'
    case 'B':
      return 'text-blue-600 dark:text-blue-400'
    case 'C':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'D':
      return 'text-orange-600 dark:text-orange-400'
    case 'F':
      return 'text-red-600 dark:text-red-400'
  }
}
