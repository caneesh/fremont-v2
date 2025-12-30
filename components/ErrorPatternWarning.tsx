'use client'

import { useEffect, useState } from 'react'
import { errorPatternService } from '@/lib/errorPatternService'
import type { ErrorPatternSummary } from '@/types/errorPatterns'

interface ErrorPatternWarningProps {
  studentId: string
  patternId: string
  onDismiss?: () => void
}

export default function ErrorPatternWarning({
  studentId,
  patternId,
  onDismiss
}: ErrorPatternWarningProps) {
  const [summary, setSummary] = useState<ErrorPatternSummary | null>(null)
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    // Check if we should show warning
    const show = errorPatternService.shouldShowWarning(studentId, patternId)
    setShouldShow(show)

    if (show) {
      const summaries = errorPatternService.getErrorPatternSummaries(studentId)
      const patternSummary = summaries.find(s => s.pattern.id === patternId)
      setSummary(patternSummary || null)
    }
  }, [studentId, patternId])

  if (!shouldShow || !summary) return null

  const getTrendIcon = () => {
    switch (summary.trend) {
      case 'improving': return '📈'
      case 'worsening': return '📉'
      case 'persistent': return '⚠️'
    }
  }

  const getTrendColor = () => {
    switch (summary.trend) {
      case 'improving': return 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
      case 'worsening': return 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
      case 'persistent': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
    }
  }

  const getTrendTextColor = () => {
    switch (summary.trend) {
      case 'improving': return 'text-green-800 dark:text-green-300'
      case 'worsening': return 'text-red-800 dark:text-red-300'
      case 'persistent': return 'text-yellow-800 dark:text-yellow-300'
    }
  }

  return (
    <div className={`rounded-lg border-2 p-4 ${getTrendColor()} animate-fade-in`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getTrendIcon()}</span>
            <h3 className={`font-bold text-lg ${getTrendTextColor()}`}>
              Pattern Detected
            </h3>
          </div>

          <p className={`text-sm mb-3 ${getTrendTextColor()}`}>
            <strong>You&apos;ve made this mistake {summary.occurrences} times</strong> in different problems.
          </p>

          <div className="bg-white dark:bg-dark-card rounded-lg p-3 mb-3 border border-gray-200 dark:border-dark-border">
            <p className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary mb-1">
              {summary.pattern.title}
            </p>
            <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
              {summary.pattern.description}
            </p>
          </div>

          <div className="bg-white dark:bg-dark-card rounded-lg p-3 border border-blue-200 dark:border-blue-700/50">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
              💡 How to fix this:
            </p>
            <p className="text-xs text-gray-700 dark:text-dark-text-secondary">
              {summary.pattern.remediation}
            </p>
          </div>

          {summary.pattern.relatedConcepts.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-700 dark:text-dark-text-secondary mb-1">
                Related concepts:
              </p>
              <div className="flex flex-wrap gap-1">
                {summary.pattern.relatedConcepts.map((concept, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-white dark:bg-dark-card-soft rounded text-xs text-gray-600 dark:text-dark-text-secondary border border-gray-200 dark:border-dark-border"
                  >
                    {concept}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
