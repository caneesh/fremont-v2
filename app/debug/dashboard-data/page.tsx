'use client'

/**
 * Dashboard Data Inspector (Dev-Only)
 *
 * Shows:
 * - Each dashboard localStorage key with lastUpdated timestamp
 * - Count of records per key
 * - Last 5 recent events from physiscaffold_events
 * - Simulate button to create a safe test event (dev-only)
 */

import { useState, useEffect, useCallback } from 'react'

interface StorageKeyData {
  key: string
  displayName: string
  recordCount: number
  lastUpdated: string | null
  rawSize: number
  sampleData?: unknown
}

interface EventData {
  id: string
  type: string
  timestamp: string
  metadata?: Record<string, unknown>
}

const DASHBOARD_KEYS = [
  { key: 'physiscaffold_problem_attempts', displayName: 'Problem Attempts' },
  { key: 'physiscaffold_study_progress', displayName: 'Study Progress' },
  { key: 'physiscaffold_mistake_cards', displayName: 'Mistake Cards' },
  { key: 'physiscaffold_events', displayName: 'Events' },
  { key: 'physiscaffold_v2_pattern_states', displayName: 'V2 Pattern States' },
  { key: 'physiscaffold_v2_step_attempts', displayName: 'V2 Step Attempts' },
  { key: 'physiscaffold_review_sessions', displayName: 'Review Sessions' },
  { key: 'physiscaffold_review_streak', displayName: 'Review Streak' },
]

function parseStorageKey(key: string): StorageKeyData {
  const displayName = DASHBOARD_KEYS.find(k => k.key === key)?.displayName || key

  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return { key, displayName, recordCount: 0, lastUpdated: null, rawSize: 0 }
    }

    const data = JSON.parse(raw)
    const rawSize = raw.length

    let recordCount = 0
    let lastUpdated: string | null = null

    if (Array.isArray(data)) {
      recordCount = data.length
      for (const item of data) {
        const ts = item.updatedAt || item.createdAt || item.timestamp || item.occurredAt || item.lastReviewedAt
        if (ts && (!lastUpdated || ts > lastUpdated)) {
          lastUpdated = ts
        }
      }
    } else if (typeof data === 'object' && data !== null) {
      const values = Object.values(data)
      recordCount = values.length

      for (const val of values) {
        if (Array.isArray(val)) {
          recordCount += val.length - 1
          for (const item of val as Array<Record<string, unknown>>) {
            const ts = item.updatedAt || item.createdAt || item.timestamp
            if (typeof ts === 'string' && (!lastUpdated || ts > lastUpdated)) {
              lastUpdated = ts
            }
          }
        } else if (typeof val === 'object' && val !== null) {
          const record = val as Record<string, unknown>
          const ts = record.lastAccessedAt || record.updatedAt || record.createdAt
          if (typeof ts === 'string' && (!lastUpdated || ts > lastUpdated)) {
            lastUpdated = ts
          }
        }
      }
    }

    return { key, displayName, recordCount, lastUpdated, rawSize, sampleData: data }
  } catch {
    return { key, displayName, recordCount: -1, lastUpdated: null, rawSize: 0 }
  }
}

function getRecentEvents(limit: number = 5): EventData[] {
  try {
    const raw = localStorage.getItem('physiscaffold_events')
    if (!raw) return []

    const events = JSON.parse(raw) as EventData[]
    return events.slice(-limit).reverse()
  } catch {
    return []
  }
}

export default function DashboardDataPage() {
  const [storageData, setStorageData] = useState<StorageKeyData[]>([])
  const [recentEvents, setRecentEvents] = useState<EventData[]>([])
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [simulateStatus, setSimulateStatus] = useState<string | null>(null)

  const refreshData = useCallback(() => {
    const data = DASHBOARD_KEYS.map(k => parseStorageKey(k.key))
    setStorageData(data)
    setRecentEvents(getRecentEvents(5))
  }, [])

  useEffect(() => {
    refreshData()
  }, [refreshData])

  // Dev-only: Simulate a test event
  const simulateTestEvent = () => {
    if (process.env.NODE_ENV === 'production') {
      setSimulateStatus('Simulation disabled in production')
      return
    }

    try {
      const raw = localStorage.getItem('physiscaffold_events')
      const events = raw ? JSON.parse(raw) : []

      const testEvent = {
        id: `test_${Date.now()}`,
        type: 'debug_test_event',
        timestamp: new Date().toISOString(),
        sessionId: 'debug-session',
        userId: 'debug-user',
        metadata: {
          source: 'dashboard-data-inspector',
          note: 'Safe test event for debugging',
        },
      }

      events.push(testEvent)
      localStorage.setItem('physiscaffold_events', JSON.stringify(events))

      setSimulateStatus(`Created test event: ${testEvent.id}`)
      refreshData()

      setTimeout(() => setSimulateStatus(null), 3000)
    } catch (error) {
      setSimulateStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'Never'
    try {
      return new Date(ts).toLocaleString()
    } catch {
      return ts
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  // Dev-only guard for the entire page
  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
            Debug Page Not Available
          </h1>
          <p className="text-gray-600 dark:text-dark-text-secondary">
            This page is only available in development mode.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
              Dashboard Data Inspector
            </h1>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Development-only view of dashboard localStorage data
            </p>
          </div>
          <button
            onClick={refreshData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Refresh Data
          </button>
        </div>

        {/* Storage Keys Table */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border mb-6">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border">
            <h2 className="font-semibold text-gray-900 dark:text-dark-text-primary">
              Storage Keys
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-dark-card-soft">
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-dark-text-secondary font-medium">Key</th>
                  <th className="px-4 py-2 text-right text-gray-600 dark:text-dark-text-secondary font-medium">Records</th>
                  <th className="px-4 py-2 text-right text-gray-600 dark:text-dark-text-secondary font-medium">Size</th>
                  <th className="px-4 py-2 text-left text-gray-600 dark:text-dark-text-secondary font-medium">Last Updated</th>
                  <th className="px-4 py-2 text-center text-gray-600 dark:text-dark-text-secondary font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {storageData.map(data => (
                  <tr key={data.key} className="hover:bg-gray-50 dark:hover:bg-dark-card-soft">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-dark-text-primary">
                        {data.displayName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-dark-text-muted font-mono">
                        {data.key}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                        data.recordCount > 0
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : data.recordCount === 0
                          ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {data.recordCount === -1 ? 'ERROR' : data.recordCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-dark-text-secondary">
                      {formatBytes(data.rawSize)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-dark-text-secondary">
                      {formatTimestamp(data.lastUpdated)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setExpandedKey(expandedKey === data.key ? null : data.key)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-xs"
                      >
                        {expandedKey === data.key ? 'Hide' : 'View'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Expanded JSON View */}
          {expandedKey && (
            <div className="border-t border-gray-200 dark:border-dark-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 dark:text-dark-text-primary">
                  {storageData.find(d => d.key === expandedKey)?.displayName} Data
                </h3>
                <button
                  onClick={() => setExpandedKey(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  Close
                </button>
              </div>
              <pre className="p-3 bg-gray-900 dark:bg-gray-950 text-green-400 rounded overflow-x-auto text-xs leading-relaxed max-h-64 overflow-y-auto">
                {JSON.stringify(
                  storageData.find(d => d.key === expandedKey)?.sampleData,
                  null,
                  2
                )}
              </pre>
            </div>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border mb-6">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-dark-text-primary">
              Last 5 Events
            </h2>
            <span className="text-xs text-gray-500 dark:text-dark-text-muted">
              from physiscaffold_events
            </span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-dark-border">
            {recentEvents.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-dark-text-muted">
                No events recorded yet
              </div>
            ) : (
              recentEvents.map((event, idx) => (
                <div key={event.id || idx} className="px-4 py-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-flex px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 text-xs font-medium rounded">
                        {event.type}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-dark-text-muted mt-1 font-mono">
                        {event.id}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-dark-text-muted">
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>
                  {event.metadata && Object.keys(event.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-dark-text-secondary font-mono">
                      {JSON.stringify(event.metadata)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Simulate Test Event (Dev Only) */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-500/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-yellow-800 dark:text-yellow-400">
                Simulate Test Event
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Creates a safe &quot;debug_test_event&quot; in localStorage for testing. Dev-only.
              </p>
            </div>
            <button
              onClick={simulateTestEvent}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm font-medium"
            >
              Create Test Event
            </button>
          </div>
          {simulateStatus && (
            <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-sm text-yellow-800 dark:text-yellow-300">
              {simulateStatus}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-500 dark:text-dark-text-muted">
          This page is only visible in development mode (NODE_ENV !== &apos;production&apos;)
        </div>
      </div>
    </div>
  )
}
