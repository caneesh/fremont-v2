'use client'

import { useEffect, useState } from 'react'
import { errorPatternService } from '@/lib/errorPatternService'
import type { ErrorPatternSummary } from '@/types/errorPatterns'

interface ErrorPatternAnalyticsProps {
  studentId: string
}

export default function ErrorPatternAnalytics({ studentId }: ErrorPatternAnalyticsProps) {
  const [summaries, setSummaries] = useState<ErrorPatternSummary[]>([])
  const [stats, setStats] = useState({
    totalErrors: 0,
    uniquePatterns: 0,
    masteredPatterns: 0,
    criticalPatterns: 0,
    mostCommonCategory: '',
    improvementRate: 0
  })
  const [activeCategory, setActiveCategory] = useState<string>('all')

  useEffect(() => {
    const allSummaries = errorPatternService.getErrorPatternSummaries(studentId)
    setSummaries(allSummaries)

    const statistics = errorPatternService.getStatistics(studentId)
    setStats(statistics)
  }, [studentId])

  const filteredSummaries = activeCategory === 'all'
    ? summaries
    : summaries.filter(s => s.pattern.category === activeCategory)

  const categories = Array.from(new Set(summaries.map(s => s.pattern.category)))

  const getTrendBadge = (trend: ErrorPatternSummary['trend']) => {
    const badges = {
      improving: { label: 'Improving', color: 'bg-green-100 text-green-800' },
      persistent: { label: 'Persistent', color: 'bg-yellow-100 text-yellow-800' },
      worsening: { label: 'Worsening', color: 'bg-red-100 text-red-800' }
    }
    const badge = badges[trend]
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-gray-600'
      default: return 'text-gray-600'
    }
  }

  if (summaries.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Error Patterns Yet</h2>
        <p className="text-gray-600">
          Keep solving problems! Your error patterns will appear here as you learn.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Overview */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Learning Analytics</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-3xl font-bold text-blue-600">{stats.totalErrors}</div>
            <div className="text-xs text-gray-600 mt-1">Total Errors</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-3xl font-bold text-purple-600">{stats.uniquePatterns}</div>
            <div className="text-xs text-gray-600 mt-1">Unique Patterns</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-3xl font-bold text-green-600">{stats.masteredPatterns}</div>
            <div className="text-xs text-gray-600 mt-1">Mastered</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-3xl font-bold text-red-600">{stats.criticalPatterns}</div>
            <div className="text-xs text-gray-600 mt-1">Critical</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-3xl font-bold text-indigo-600">{stats.improvementRate}%</div>
            <div className="text-xs text-gray-600 mt-1">Improvement Rate</div>
          </div>

          {stats.mostCommonCategory && (
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-sm font-bold text-gray-900 truncate">
                {stats.mostCommonCategory.replace(/_/g, ' ')}
              </div>
              <div className="text-xs text-gray-600 mt-1">Most Common</div>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white rounded-lg shadow-lg p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({summaries.length})
          </button>
          {categories.map(cat => {
            const count = summaries.filter(s => s.pattern.category === cat).length
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.replace(/_/g, ' ')} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {/* Error Pattern List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">
          {activeCategory === 'all' ? 'All Error Patterns' : activeCategory.replace(/_/g, ' ')}
        </h3>

        {filteredSummaries.map(summary => (
          <div
            key={summary.pattern.id}
            className={`bg-white rounded-lg shadow-lg p-5 border-2 ${
              summary.mastered
                ? 'border-green-300 bg-green-50'
                : summary.pattern.severity === 'high'
                ? 'border-red-300'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-bold text-gray-900">
                    {summary.pattern.title}
                  </h4>
                  {summary.mastered && (
                    <span className="text-xl" title="Mastered!">✓</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {summary.pattern.description}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                {getTrendBadge(summary.trend)}
                <span className={`text-xs font-semibold ${getSeverityColor(summary.pattern.severity)}`}>
                  {summary.pattern.severity.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-600">Occurrences</div>
                <div className="text-lg font-bold text-gray-900">{summary.occurrences}</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-600">First Seen</div>
                <div className="text-xs font-semibold text-gray-900">
                  {new Date(summary.firstSeen).toLocaleDateString()}
                </div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-600">Last Seen</div>
                <div className="text-xs font-semibold text-gray-900">
                  {new Date(summary.lastSeen).toLocaleDateString()}
                </div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-gray-600">Category</div>
                <div className="text-xs font-semibold text-gray-900">
                  {summary.pattern.category.replace(/_/g, ' ')}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 mb-3 border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-1">
                💡 How to fix this:
              </p>
              <p className="text-xs text-gray-700">
                {summary.pattern.remediation}
              </p>
            </div>

            {summary.pattern.relatedConcepts.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-2">Related concepts:</p>
                <div className="flex flex-wrap gap-1">
                  {summary.pattern.relatedConcepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
