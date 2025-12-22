'use client'

import { useEffect, useState } from 'react'
import { errorPatternService } from '@/lib/errorPatternService'
import type { ErrorPatternInsight } from '@/types/errorPatterns'

interface ErrorPatternInsightsProps {
  studentId: string
  maxInsights?: number
}

export default function ErrorPatternInsights({
  studentId,
  maxInsights = 3
}: ErrorPatternInsightsProps) {
  const [insights, setInsights] = useState<ErrorPatternInsight[]>([])

  useEffect(() => {
    const allInsights = errorPatternService.getInsights(studentId)
    setInsights(allInsights.slice(0, maxInsights))
  }, [studentId, maxInsights])

  if (insights.length === 0) return null

  const getInsightIcon = (type: ErrorPatternInsight['type']) => {
    switch (type) {
      case 'warning': return '⚠️'
      case 'celebration': return '🎉'
      case 'info': return 'ℹ️'
    }
  }

  const getInsightColor = (type: ErrorPatternInsight['type']) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-300 text-yellow-900'
      case 'celebration': return 'bg-green-50 border-green-300 text-green-900'
      case 'info': return 'bg-blue-50 border-blue-300 text-blue-900'
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-gray-900">Your Learning Insights</h2>

      {insights.map((insight, idx) => (
        <div
          key={`${insight.patternId}-${idx}`}
          className={`rounded-lg border-2 p-4 ${getInsightColor(insight.type)} animate-fade-in`}
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{getInsightIcon(insight.type)}</span>

            <div className="flex-1">
              <p className="font-semibold mb-2">
                {insight.message}
              </p>

              <div className="bg-white bg-opacity-50 rounded p-2 text-sm">
                <p className="font-medium text-xs mb-1">What you can do:</p>
                <p className="text-xs">{insight.actionable}</p>
              </div>

              {insight.relatedResources && insight.relatedResources.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-1">Review these concepts:</p>
                  <div className="flex flex-wrap gap-1">
                    {insight.relatedResources.map((resource, ridx) => (
                      <span
                        key={ridx}
                        className="px-2 py-0.5 bg-white bg-opacity-70 rounded text-xs"
                      >
                        {resource}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
