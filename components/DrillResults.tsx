'use client'

import type { DrillResultsProps } from '@/types/drill'
import { getPerformanceLabel } from '@/lib/drillService'

/**
 * DrillResults Component
 *
 * Displays the results summary after completing a drill session.
 * Shows accuracy, timing stats, and options to retry.
 */
export default function DrillResults({
  summary,
  drill,
  onRedoWrong,
  onRetryFull,
  onExit,
}: DrillResultsProps) {
  const performance = getPerformanceLabel(summary.accuracy)
  const hasWrongAnswers = summary.wrongItemIds.length > 0

  // Get wrong items details
  const wrongItems = drill.items.filter((item) =>
    summary.wrongItemIds.includes(item.id)
  )

  // Get slowest items details
  const slowestItemsDetails = summary.slowestItems.map((s) => ({
    ...s,
    item: drill.items.find((item) => item.id === s.itemId),
  }))

  return (
    <div className="max-w-2xl mx-auto">
      {/* Results card */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-slate-200 dark:border-dark-border overflow-hidden">
        {/* Header */}
        <div className="px-6 py-8 bg-gradient-to-r from-indigo-500 to-purple-500 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Drill Complete!</h2>
          <p className="text-indigo-100">{drill.title}</p>
        </div>

        {/* Score section */}
        <div className="px-6 py-8 text-center border-b border-slate-200 dark:border-slate-700">
          <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
            <div>
              <div className="text-4xl font-bold text-slate-800 dark:text-slate-200">
                {Math.round(summary.accuracy)}%
              </div>
              <div className={`text-sm font-medium ${performance.color}`}>
                {performance.label}
              </div>
            </div>
          </div>

          <div className="text-slate-600 dark:text-slate-400">
            {summary.correctCount} of {summary.totalItems} correct
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 border-b border-slate-200 dark:border-slate-700">
          <div className="px-4 py-6 text-center">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {(summary.averageTimeMs / 1000).toFixed(1)}s
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Avg. Time
            </div>
          </div>
          <div className="px-4 py-6 text-center">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {(summary.totalTimeMs / 1000).toFixed(0)}s
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Total Time
            </div>
          </div>
          <div className="px-4 py-6 text-center">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {summary.timedOutCount}
            </div>
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Timed Out
            </div>
          </div>
        </div>

        {/* Wrong answers section */}
        {hasWrongAnswers && (
          <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Questions to Review ({wrongItems.length})
            </h3>
            <div className="space-y-2">
              {wrongItems.slice(0, 3).map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm"
                >
                  <div className="text-slate-700 dark:text-slate-300 font-medium mb-1">
                    {item.promptText.length > 80
                      ? item.promptText.substring(0, 80) + '...'
                      : item.promptText}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400">
                    Answer: <span className="text-green-600 dark:text-green-400 font-medium">{item.correctAnswer}</span>
                  </div>
                </div>
              ))}
              {wrongItems.length > 3 && (
                <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-2">
                  +{wrongItems.length - 3} more
                </div>
              )}
            </div>
          </div>
        )}

        {/* Slowest items section */}
        {slowestItemsDetails.length > 0 && (
          <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Slowest Responses
            </h3>
            <div className="space-y-2">
              {slowestItemsDetails.map((s, index) => (
                <div
                  key={s.itemId}
                  className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm"
                >
                  <div className="text-slate-700 dark:text-slate-300 flex-1 mr-4">
                    {s.item?.promptText?.substring(0, 50)}...
                  </div>
                  <div className="text-amber-600 dark:text-amber-400 font-mono font-medium whitespace-nowrap">
                    {(s.timeMs / 1000).toFixed(1)}s
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 py-6 space-y-3">
          {hasWrongAnswers && (
            <button
              onClick={onRedoWrong}
              className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Redo Wrong Only ({wrongItems.length})
            </button>
          )}

          <button
            onClick={onRetryFull}
            className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              hasWrongAnswers
                ? 'border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Full Drill
          </button>

          <button
            onClick={onExit}
            className="w-full py-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Back to Drills
          </button>
        </div>
      </div>

      {/* Encouragement message */}
      <div className="mt-6 text-center">
        {summary.accuracy >= 90 ? (
          <p className="text-green-600 dark:text-green-400">
            Outstanding! You&apos;ve mastered this pattern. Try a harder drill next!
          </p>
        ) : summary.accuracy >= 70 ? (
          <p className="text-blue-600 dark:text-blue-400">
            Good progress! A few more practice sessions will solidify this pattern.
          </p>
        ) : (
          <p className="text-amber-600 dark:text-amber-400">
            Keep practicing! Pattern recognition improves with repetition.
          </p>
        )}
      </div>
    </div>
  )
}
