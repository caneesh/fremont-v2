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
      case 'improving': return 'bg-green-50 border-green-300'
      case 'worsening': return 'bg-red-50 border-red-300'
      case 'persistent': return 'bg-yellow-50 border-yellow-300'
    }
  }

  const getTrendTextColor = () => {
    switch (summary.trend) {
      case 'improving': return 'text-green-800'
      case 'worsening': return 'text-red-800'
      case 'persistent': return 'text-yellow-800'
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
            <strong>You've made this mistake {summary.occurrences} times</strong> in different problems.
          </p>

          <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
            <p className="text-sm font-semibold text-gray-900 mb-1">
              {summary.pattern.title}
            </p>
            <p className="text-xs text-gray-600">
              {summary.pattern.description}
            </p>
          </div>

          <div className="bg-white rounded-lg p-3 border border-blue-200">
            <p className="text-xs font-semibold text-blue-900 mb-1">
              💡 How to fix this:
            </p>
            <p className="text-xs text-gray-700">
              {summary.pattern.remediation}
            </p>
          </div>

          {summary.pattern.relatedConcepts.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">
                Related concepts:
              </p>
              <div className="flex flex-wrap gap-1">
                {summary.pattern.relatedConcepts.map((concept, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-white rounded text-xs text-gray-600 border border-gray-200"
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
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Dismiss"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
