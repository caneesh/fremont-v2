'use client'

import { useState, useEffect, useCallback } from 'react'
import { eventLogger, localStorageProvider } from '@/lib/storage'
import type { StoredEvent, EventType } from '@/lib/storage'
import { useToast } from '@/components/ui/ToastProvider'

// Only show in development
const IS_DEV = process.env.NODE_ENV === 'development'

interface EventStats {
  totalEvents: number
  eventsByType: Record<string, number>
  storageUsed: string
  oldestEvent?: string
  newestEvent?: string
}

export default function EventsDebugPage() {
  const { confirm, pushToast } = useToast()
  const [events, setEvents] = useState<StoredEvent[]>([])
  const [stats, setStats] = useState<EventStats | null>(null)
  const [filterType, setFilterType] = useState<EventType | 'all'>('all')
  const [filterProblemId, setFilterProblemId] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadEvents = useCallback(() => {
    const options: { types?: EventType[]; problemId?: string } = {}

    if (filterType !== 'all') {
      options.types = [filterType]
    }
    if (filterProblemId.trim()) {
      options.problemId = filterProblemId.trim()
    }

    const result = eventLogger.getRecentEvents(100)
    if (result.success && result.data) {
      let filteredEvents = result.data

      if (filterType !== 'all') {
        filteredEvents = filteredEvents.filter(e => e.type === filterType)
      }
      if (filterProblemId.trim()) {
        filteredEvents = filteredEvents.filter(e =>
          e.metadata.problemId?.includes(filterProblemId.trim())
        )
      }

      setEvents(filteredEvents)
    }

    // Calculate stats
    const allEventsResult = eventLogger.getRecentEvents(10000)
    if (allEventsResult.success && allEventsResult.data) {
      const allEvents = allEventsResult.data
      const eventsByType: Record<string, number> = {}

      allEvents.forEach(event => {
        eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
      })

      const storageInfo = localStorageProvider.getStorageInfo()

      setStats({
        totalEvents: allEvents.length,
        eventsByType,
        storageUsed: storageInfo.success && storageInfo.data
          ? `${(storageInfo.data.usedBytes / 1024).toFixed(1)} KB (${storageInfo.data.percentUsed.toFixed(1)}%)`
          : 'Unknown',
        oldestEvent: allEvents.length > 0 ? allEvents[allEvents.length - 1]?.timestamp : undefined,
        newestEvent: allEvents.length > 0 ? allEvents[0]?.timestamp : undefined
      })
    }

    setIsLoading(false)
  }, [filterType, filterProblemId])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(loadEvents, 2000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, loadEvents])

  const handleClearEvents = async () => {
    const ok = await confirm({
      title: 'Clear all events?',
      message: 'Are you sure you want to clear all events? This cannot be undone.',
      confirmText: 'Clear',
      cancelText: 'Cancel',
      destructive: true,
    })
    if (!ok) return
    eventLogger.clearEvents()
    loadEvents()
  }

  const handlePruneEvents = () => {
    const result = eventLogger.pruneEvents()
    if (result.success) {
      pushToast({
        title: 'Events pruned',
        message: `Pruned ${result.data} old events.`,
        variant: 'success',
      })
      loadEvents()
    }
  }

  const handleExportEvents = () => {
    const result = localStorageProvider.exportAll()
    if (result.success && result.data) {
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `physiscaffold-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const formatTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000)
    if (seconds < 60) return `${seconds}s ago`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const getEventTypeColor = (type: EventType): string => {
    const colors: Record<string, string> = {
      problem_started: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      problem_saved_draft: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
      problem_marked_solved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      problem_deleted: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      step_activated: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      step_completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      step_failed: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      hint_unlocked: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      hint_viewed: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
      task_attempted: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      task_correct: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      task_incorrect: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      reading_mode_activated: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      sanity_check_completed: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
      reflection_started: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      reflection_completed: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
      preference_changed: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      error_occurred: 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100',
    }
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }

  // Production guard
  if (!IS_DEV) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            Development Only
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            This page is only available in development mode.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Event Logger Debug Panel
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            View and manage logged events. Development mode only.
          </p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {stats.totalEvents}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Total Events</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {Object.keys(stats.eventsByType).length}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Event Types</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                {stats.storageUsed}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Storage Used</div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
              <div className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {stats.newestEvent ? formatTimeAgo(stats.newestEvent) : 'N/A'}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">Last Event</div>
            </div>
          </div>
        )}

        {/* Event Type Breakdown */}
        {stats && Object.keys(stats.eventsByType).length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm mb-6">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Events by Type
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.eventsByType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type as EventType)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-opacity ${
                      getEventTypeColor(type as EventType)
                    } ${filterType === type ? 'ring-2 ring-offset-2 ring-indigo-500' : 'hover:opacity-80'}`}
                  >
                    {type}: {count}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 dark:text-slate-400">Filter:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as EventType | 'all')}
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200"
              >
                <option value="all">All Types</option>
                <option value="problem_started">problem_started</option>
                <option value="problem_saved_draft">problem_saved_draft</option>
                <option value="problem_marked_solved">problem_marked_solved</option>
                <option value="step_activated">step_activated</option>
                <option value="step_completed">step_completed</option>
                <option value="step_failed">step_failed</option>
                <option value="hint_unlocked">hint_unlocked</option>
                <option value="task_correct">task_correct</option>
                <option value="task_incorrect">task_incorrect</option>
                <option value="reading_mode_activated">reading_mode_activated</option>
                <option value="error_occurred">error_occurred</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 dark:text-slate-400">Problem ID:</label>
              <input
                type="text"
                value={filterProblemId}
                onChange={(e) => setFilterProblemId(e.target.value)}
                placeholder="Filter by problem..."
                className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-800 dark:text-slate-200 w-48"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400">Auto-refresh</span>
            </label>

            <div className="flex-1" />

            <button
              onClick={loadEvents}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-500"
            >
              Refresh
            </button>
            <button
              onClick={handleExportEvents}
              className="px-3 py-1.5 text-sm bg-slate-600 text-white rounded hover:bg-slate-500"
            >
              Export All
            </button>
            <button
              onClick={handlePruneEvents}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-500"
            >
              Prune Old
            </button>
            <button
              onClick={handleClearEvents}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-500"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Events List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Recent Events ({events.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No events found</div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700 max-h-[600px] overflow-y-auto">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEventTypeColor(event.type)}`}>
                          {event.type}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatTimeAgo(event.timestamp)}
                        </span>
                      </div>
                      {Object.keys(event.metadata).length > 0 && (
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {JSON.stringify(event.metadata)}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-slate-400">
                        {formatTimestamp(event.timestamp)}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        {event.id.split('_').pop()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Session: {localStorageProvider.getSessionId()} |
          User: {localStorageProvider.getUserId() || 'anonymous'}
        </div>
      </div>
    </div>
  )
}
