'use client'

import type { SkipCommitAnalytics, SkipCandidate } from '@/types/skipCommitGate'

interface SkipCommitAnalyticsProps {
  analytics: SkipCommitAnalytics
  onClose?: () => void
}

/**
 * Skip-Commit Analytics Panel
 *
 * Shows session-level statistics for skip/commit decisions:
 * - Skipped count
 * - Auto-commit count
 * - Average decision time
 * - "Should have skipped" candidates
 */
export default function SkipCommitAnalyticsPanel({
  analytics,
  onClose,
}: SkipCommitAnalyticsProps) {
  const {
    totalAttempted,
    committed,
    skipped,
    autoCommitted,
    avgDecisionTimeMs,
    shouldHaveSkipped,
  } = analytics

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatRatio = (ratio: number) => `${ratio.toFixed(1)}x`

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 max-w-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
          Decision Training Stats
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Committed */}
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Committed
            </span>
          </div>
          <p className="text-2xl font-bold text-green-800 dark:text-green-200">
            {committed}
          </p>
        </div>

        {/* Skipped */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 5l7 7-7 7M5 5l7 7-7 7"
              />
            </svg>
            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
              Skipped
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-800 dark:text-amber-200">
            {skipped}
          </p>
        </div>

        {/* Auto-committed */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <svg
              className="w-5 h-5 text-slate-500 dark:text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Auto-commit
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-700 dark:text-slate-200">
            {autoCommitted}
          </p>
        </div>

        {/* Avg Decision Time */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <svg
              className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              Avg Decision
            </span>
          </div>
          <p className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">
            {avgDecisionTimeMs > 0 ? formatTime(avgDecisionTimeMs) : '-'}
          </p>
        </div>
      </div>

      {/* Should Have Skipped Section */}
      {shouldHaveSkipped.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-5 h-5 text-red-500"
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
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Should Have Skipped
            </span>
            <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
              {shouldHaveSkipped.length}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
            Problems where you spent &gt;2x expected time and got wrong
          </p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {shouldHaveSkipped.map((candidate, index) => (
              <ShouldHaveSkippedItem key={index} candidate={candidate} />
            ))}
          </div>
        </div>
      )}

      {/* Summary Message */}
      <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {getSessionSummary(analytics)}
        </p>
      </div>
    </div>
  )
}

function ShouldHaveSkippedItem({ candidate }: { candidate: SkipCandidate }) {
  return (
    <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
      <span className="text-sm text-red-800 dark:text-red-200 truncate flex-1 mr-2">
        {candidate.problemTitle}
      </span>
      <span className="text-xs font-medium text-red-600 dark:text-red-400 whitespace-nowrap">
        {(candidate.timeRatio).toFixed(1)}x time
      </span>
    </div>
  )
}

function getSessionSummary(analytics: SkipCommitAnalytics): string {
  const { totalAttempted, skipped, autoCommitted, shouldHaveSkipped } = analytics

  if (totalAttempted === 0) {
    return 'No problems attempted this session.'
  }

  const skipRate = totalAttempted > 0 ? (skipped / totalAttempted) * 100 : 0
  const autoRate = totalAttempted > 0 ? (autoCommitted / totalAttempted) * 100 : 0

  if (skipRate >= 30 && skipRate <= 50) {
    return 'Good strategic skipping! You\'re training efficient triage.'
  }

  if (skipRate > 50) {
    return 'High skip rate. Consider pushing through on problems you understand.'
  }

  if (autoCommitted > skipped) {
    return 'Slow decisions. Try to decide faster when the gate appears.'
  }

  if (shouldHaveSkipped.length > 0) {
    return `Consider skipping earlier on problems you find difficult. ${shouldHaveSkipped.length} problem(s) took too long.`
  }

  return 'Keep practicing strategic decision-making!'
}
