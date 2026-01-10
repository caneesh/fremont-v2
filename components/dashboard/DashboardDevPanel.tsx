'use client'

/**
 * Dashboard Dev Panel
 *
 * Development-only panel showing dashboard state for debugging.
 * Only renders in development mode (NODE_ENV !== 'production').
 *
 * Shows:
 * - Active user ID
 * - Data provider (mock/local/db)
 * - Feature flags affecting dashboard
 * - Model state summary
 */

import { useState, useEffect } from 'react'
import type { DashboardModel } from '@/types/dashboardModel'

interface StorageKeyStats {
  key: string
  recordCount: number
  lastUpdated: string | null
  recentEvents?: Array<{ type: string; timestamp: string }>
}

function getStorageStats(): StorageKeyStats[] {
  if (typeof window === 'undefined') return []

  const keys = [
    'physiscaffold_problem_attempts',
    'physiscaffold_study_progress',
    'physiscaffold_mistake_cards',
    'physiscaffold_events',
    'physiscaffold_v2_pattern_states',
    'physiscaffold_v2_step_attempts',
  ]

  return keys.map(key => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return { key, recordCount: 0, lastUpdated: null }

      const data = JSON.parse(raw)

      // Handle different data shapes
      let recordCount = 0
      let lastUpdated: string | null = null
      let recentEvents: Array<{ type: string; timestamp: string }> | undefined

      if (Array.isArray(data)) {
        recordCount = data.length
        // Find most recent timestamp
        for (const item of data) {
          const ts = item.updatedAt || item.createdAt || item.timestamp || item.occurredAt
          if (ts && (!lastUpdated || ts > lastUpdated)) {
            lastUpdated = ts
          }
        }
        // For events array, get last 3
        if (key === 'physiscaffold_events') {
          recentEvents = data.slice(-3).reverse().map((e: { type: string; timestamp: string }) => ({
            type: e.type,
            timestamp: e.timestamp,
          }))
        }
      } else if (typeof data === 'object') {
        // Nested object (like study_progress or user-keyed data)
        const allValues = Object.values(data)
        recordCount = allValues.length
        for (const val of allValues) {
          if (Array.isArray(val)) {
            recordCount += val.length - 1 // Adjust for nesting
            for (const item of val) {
              const ts = item.updatedAt || item.createdAt || item.timestamp
              if (ts && (!lastUpdated || ts > lastUpdated)) {
                lastUpdated = ts
              }
            }
          } else if (typeof val === 'object' && val !== null) {
            const ts = (val as Record<string, unknown>).lastAccessedAt || (val as Record<string, unknown>).updatedAt
            if (typeof ts === 'string' && (!lastUpdated || ts > lastUpdated)) {
              lastUpdated = ts
            }
          }
        }
      }

      return { key, recordCount, lastUpdated, recentEvents }
    } catch {
      return { key, recordCount: -1, lastUpdated: null }
    }
  })
}

interface DashboardDevPanelProps {
  model: DashboardModel
}

export default function DashboardDevPanel({ model }: DashboardDevPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showFullModel, setShowFullModel] = useState(false)
  const [storageStats, setStorageStats] = useState<StorageKeyStats[]>([])
  const [showStorage, setShowStorage] = useState(false)

  // Refresh storage stats when panel is expanded
  useEffect(() => {
    if (isExpanded) {
      setStorageStats(getStorageStats())
    }
  }, [isExpanded])

  const refreshStorage = () => {
    setStorageStats(getStorageStats())
  }

  // Only render in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  const {
    userId,
    dataProvider,
    loadingState,
    featureFlags,
    plan,
    currentModule,
    dueReviews,
    recentMistakes,
    activityMetrics,
    hasAnyProgress,
    needsOnboarding,
    primaryAction,
    computedAt,
  } = model

  // Data provider badge color
  const providerColors: Record<string, string> = {
    mock: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    local: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    db: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  }

  // Loading state badge color
  const loadingColors: Record<string, string> = {
    idle: 'bg-gray-100 text-gray-600',
    loading: 'bg-yellow-100 text-yellow-700',
    loaded: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="
          flex items-center gap-2
          px-3 py-2
          bg-gray-900 dark:bg-gray-100
          text-white dark:text-gray-900
          text-xs font-mono
          rounded-lg
          shadow-lg
          hover:bg-gray-800 dark:hover:bg-gray-200
          transition-colors
        "
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        Dev Panel
        <span className={`px-1.5 py-0.5 rounded text-xs ${providerColors[dataProvider]}`}>
          {dataProvider}
        </span>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="
          absolute bottom-12 right-0
          w-96 max-h-[70vh]
          bg-white dark:bg-dark-card
          border border-gray-200 dark:border-dark-border
          rounded-lg
          shadow-xl dark:shadow-dark-xl
          overflow-hidden
          font-mono text-xs
        ">
          {/* Header */}
          <div className="
            flex items-center justify-between
            px-4 py-3
            bg-gray-50 dark:bg-dark-card-soft
            border-b border-gray-200 dark:border-dark-border
          ">
            <span className="font-semibold text-gray-900 dark:text-dark-text-primary">
              Dashboard State Contract
            </span>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
            {/* User & Provider */}
            <section>
              <h3 className="text-gray-500 dark:text-dark-text-muted uppercase tracking-wider mb-2">
                Identity
              </h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-dark-text-secondary">User ID:</span>
                  <span className="text-gray-900 dark:text-dark-text-primary font-medium">{userId}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-dark-text-secondary">Provider:</span>
                  <span className={`px-2 py-0.5 rounded ${providerColors[dataProvider]}`}>
                    {dataProvider}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-dark-text-secondary">State:</span>
                  <span className={`px-2 py-0.5 rounded ${loadingColors[loadingState]}`}>
                    {loadingState}
                  </span>
                </div>
              </div>
            </section>

            {/* Feature Flags */}
            <section>
              <h3 className="text-gray-500 dark:text-dark-text-muted uppercase tracking-wider mb-2">
                Feature Flags
              </h3>
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(featureFlags).map(([flag, enabled]) => (
                  <div
                    key={flag}
                    className={`
                      flex items-center gap-1.5 px-2 py-1 rounded
                      ${enabled
                        ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-500'
                      }
                    `}
                  >
                    <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="truncate">{flag}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Model Summary */}
            <section>
              <h3 className="text-gray-500 dark:text-dark-text-muted uppercase tracking-wider mb-2">
                Model Summary
              </h3>
              <div className="space-y-1 text-gray-600 dark:text-dark-text-secondary">
                <div className="flex justify-between">
                  <span>Has Progress:</span>
                  <span className={hasAnyProgress ? 'text-green-600' : 'text-gray-400'}>
                    {hasAnyProgress ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Needs Onboarding:</span>
                  <span className={needsOnboarding ? 'text-yellow-600' : 'text-gray-400'}>
                    {needsOnboarding ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Plan Tasks:</span>
                  <span>{plan?.tasks.length ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Module:</span>
                  <span className={currentModule ? 'text-blue-600' : 'text-gray-400'}>
                    {currentModule?.title?.slice(0, 20) || 'None'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Due Reviews:</span>
                  <span className={dueReviews.length > 0 ? 'text-orange-600' : ''}>
                    {dueReviews.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Recent Mistakes:</span>
                  <span>{recentMistakes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Primary Action:</span>
                  <span className="text-accent">{primaryAction?.type || 'None'}</span>
                </div>
              </div>
            </section>

            {/* Activity Metrics */}
            <section>
              <h3 className="text-gray-500 dark:text-dark-text-muted uppercase tracking-wider mb-2">
                Activity Metrics
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 dark:bg-dark-card-soft rounded p-2">
                  <div className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
                    {activityMetrics.daysPracticed}/{activityMetrics.totalDays}
                  </div>
                  <div className="text-gray-500">Days</div>
                </div>
                <div className="bg-gray-50 dark:bg-dark-card-soft rounded p-2">
                  <div className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
                    {activityMetrics.problemsSolved}
                  </div>
                  <div className="text-gray-500">Solved</div>
                </div>
                <div className="bg-gray-50 dark:bg-dark-card-soft rounded p-2">
                  <div className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
                    {activityMetrics.avgHintLevel.toFixed(1)}
                  </div>
                  <div className="text-gray-500">Avg Hints</div>
                </div>
                <div className="bg-gray-50 dark:bg-dark-card-soft rounded p-2">
                  <div className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
                    {activityMetrics.streakDays}
                  </div>
                  <div className="text-gray-500">Streak</div>
                </div>
              </div>
            </section>

            {/* Storage Inspector */}
            <section>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">
                  Storage Inspector
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshStorage}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Refresh"
                  >
                    ⟳
                  </button>
                  <button
                    onClick={() => setShowStorage(!showStorage)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showStorage ? '▼' : '▶'}
                  </button>
                </div>
              </div>
              {showStorage && (
                <div className="space-y-2">
                  {storageStats.map(stat => (
                    <div
                      key={stat.key}
                      className="p-2 bg-gray-50 dark:bg-dark-card-soft rounded text-[10px]"
                    >
                      <div className="flex justify-between items-start">
                        <span className="text-gray-700 dark:text-dark-text-primary font-medium truncate max-w-[60%]" title={stat.key}>
                          {stat.key.replace('physiscaffold_', '')}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded ${
                          stat.recordCount > 0
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {stat.recordCount === -1 ? 'ERR' : stat.recordCount} records
                        </span>
                      </div>
                      {stat.lastUpdated && (
                        <div className="text-gray-400 dark:text-dark-text-muted mt-1">
                          Updated: {new Date(stat.lastUpdated).toLocaleString()}
                        </div>
                      )}
                      {stat.recentEvents && stat.recentEvents.length > 0 && (
                        <div className="mt-1 pt-1 border-t border-gray-200 dark:border-dark-border">
                          <div className="text-gray-500 dark:text-dark-text-muted mb-1">Recent events:</div>
                          {stat.recentEvents.map((event, i) => (
                            <div key={i} className="text-gray-600 dark:text-dark-text-secondary flex justify-between">
                              <span className="truncate">{event.type}</span>
                              <span className="text-gray-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Computed At */}
            <div className="text-gray-400 dark:text-dark-text-muted text-center pt-2 border-t border-gray-100 dark:border-dark-border">
              Computed: {new Date(computedAt).toLocaleTimeString()}
            </div>

            {/* Full Model Toggle */}
            <button
              onClick={() => setShowFullModel(!showFullModel)}
              className="
                w-full py-2
                text-gray-500 dark:text-dark-text-muted
                hover:text-gray-700 dark:hover:text-dark-text-secondary
                text-center
              "
            >
              {showFullModel ? 'Hide' : 'Show'} Full Model JSON
            </button>

            {showFullModel && (
              <pre className="
                p-3
                bg-gray-900 dark:bg-gray-950
                text-green-400
                rounded
                overflow-x-auto
                text-[10px]
                leading-tight
              ">
                {JSON.stringify(model, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
