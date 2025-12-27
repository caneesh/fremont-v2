'use client'

import { useState } from 'react'
import MathRenderer from '../MathRenderer'

interface CollectedInsight {
  level: number
  levelTitle: string
  explanation: string
}

interface CollectedInsightsProps {
  insights: CollectedInsight[]
  totalLevels?: number
}

export default function CollectedInsights({
  insights,
  totalLevels = 5
}: CollectedInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  if (insights.length === 0) return null

  const levelColors = {
    1: 'bg-blue-500',
    2: 'bg-purple-500',
    3: 'bg-amber-500',
    4: 'bg-emerald-500',
    5: 'bg-red-500'
  }

  return (
    <div className="mb-4">
      {/* Collapsed Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 text-green-600 dark:text-green-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-left">
            <div className="text-sm font-medium text-green-700 dark:text-green-300">
              {insights.length} Insight{insights.length > 1 ? 's' : ''} Earned
            </div>
            <div className="text-xs text-green-600 dark:text-green-400">
              {insights.length}/{totalLevels} levels completed
            </div>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((level) => {
              const isCompleted = insights.some(i => i.level === level)
              return (
                <div
                  key={level}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    isCompleted
                      ? levelColors[level as keyof typeof levelColors]
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              )
            })}
          </div>
          <svg
            className={`w-5 h-5 text-green-600 dark:text-green-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-2 space-y-2 animate-fadeIn">
          {insights.map((insight, index) => (
            <div
              key={index}
              className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                    levelColors[insight.level as keyof typeof levelColors]
                  }`}
                >
                  {insight.level}
                </div>
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    {insight.levelTitle}
                  </div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">
                    <MathRenderer text={insight.explanation} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
