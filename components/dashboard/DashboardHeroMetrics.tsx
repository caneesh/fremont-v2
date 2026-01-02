'use client'

import type { DashboardMetrics } from '@/types/dashboard'

interface DashboardHeroMetricsProps {
  metrics: DashboardMetrics
}

/**
 * Hero metrics cards for the dashboard
 * Shows: Days Practiced, Problems Solved, Independence (hint usage)
 */
export default function DashboardHeroMetrics({ metrics }: DashboardHeroMetricsProps) {
  const {
    daysPracticed,
    totalDays,
    problemsSolved,
    problemsSolvedChange,
    avgMaxHintLevel,
    avgMaxHintLevelChange,
  } = metrics

  // Calculate independence score (inverse of hint usage, 0-100%)
  // 0 hints = 100%, 5 hints = 0%
  const independenceScore = Math.round((1 - avgMaxHintLevel / 5) * 100)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Days Practiced */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-5 shadow-md dark:shadow-dark-md border border-gray-100 dark:border-dark-border">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-xs text-gray-500 dark:text-dark-text-muted">This Week</span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{daysPracticed}</span>
          <span className="text-lg text-gray-500 dark:text-dark-text-muted">/ {totalDays}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">Days Practiced</p>
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-gray-200 dark:bg-dark-card-soft rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 dark:bg-blue-400 rounded-full transition-all"
            style={{ width: `${(daysPracticed / totalDays) * 100}%` }}
          />
        </div>
      </div>

      {/* Problems Solved */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-5 shadow-md dark:shadow-dark-md border border-gray-100 dark:border-dark-border">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          {problemsSolvedChange !== 0 && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              problemsSolvedChange > 0
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {problemsSolvedChange > 0 ? '+' : ''}{problemsSolvedChange}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{problemsSolved}</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">Problems Solved</p>
        {problemsSolvedChange !== 0 && (
          <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-2">
            {problemsSolvedChange > 0 ? 'vs last week' : 'vs last week'}
          </p>
        )}
      </div>

      {/* Independence Score */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-5 shadow-md dark:shadow-dark-md border border-gray-100 dark:border-dark-border">
        <div className="flex items-start justify-between mb-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          {avgMaxHintLevelChange !== 0 && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              avgMaxHintLevelChange < 0
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }`}>
              {avgMaxHintLevelChange < 0 ? 'Improving' : 'Needs work'}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{independenceScore}%</span>
        </div>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">Independence</p>
        <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-2">
          Avg hint level: {avgMaxHintLevel.toFixed(1)}/5
        </p>
      </div>
    </div>
  )
}
