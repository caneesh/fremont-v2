'use client'

import { useState, useEffect, useMemo } from 'react'
import { eventLogger } from '@/lib/storage/eventLogger'
import type { StoredEvent } from '@/lib/storage/types'

interface ProblemReplayProps {
  problemId: string
  problemTitle?: string
  onClose?: () => void
}

interface TimelineEntry {
  id: string
  timestamp: Date
  type: 'step_activated' | 'step_completed' | 'hint_unlocked' | 'hint_viewed' | 'task_correct' | 'task_incorrect' | 'problem_started' | 'problem_marked_solved' | 'other'
  label: string
  description?: string
  stepId?: number
  hintLevel?: number
  duration?: number // time spent until next event (ms)
  icon: 'start' | 'step' | 'hint' | 'success' | 'error' | 'complete'
}

interface TimelineStats {
  totalTime: number // ms
  stepsCompleted: number
  hintsUsed: number
  tasksAttempted: number
  tasksCorrect: number
  stepTimes: Record<number, number> // stepId -> time spent in ms
}

function formatDuration(ms: number): string {
  if (ms < 1000) return '<1s'
  if (ms < 60000) return `${Math.round(ms / 1000)}s`
  if (ms < 3600000) {
    const mins = Math.floor(ms / 60000)
    const secs = Math.round((ms % 60000) / 1000)
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`
  }
  const hours = Math.floor(ms / 3600000)
  const mins = Math.round((ms % 3600000) / 60000)
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function ProblemReplay({ problemId, problemTitle, onClose }: ProblemReplayProps) {
  const [events, setEvents] = useState<StoredEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set())

  useEffect(() => {
    const result = eventLogger.getProblemEvents(problemId)
    if (result.success && result.data) {
      // Sort by timestamp ascending (chronological order)
      const sorted = [...result.data].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
      setEvents(sorted)
    }
    setLoading(false)
  }, [problemId])

  // Build timeline entries and stats from events
  const { timeline, stats, stepGroups } = useMemo(() => {
    const entries: TimelineEntry[] = []
    const stats: TimelineStats = {
      totalTime: 0,
      stepsCompleted: 0,
      hintsUsed: 0,
      tasksAttempted: 0,
      tasksCorrect: 0,
      stepTimes: {},
    }
    const stepGroups: Map<number, TimelineEntry[]> = new Map()

    events.forEach((event, index) => {
      const timestamp = new Date(event.timestamp)
      const nextEvent = events[index + 1]
      const duration = nextEvent
        ? new Date(nextEvent.timestamp).getTime() - timestamp.getTime()
        : 0

      let entry: TimelineEntry | null = null

      switch (event.type) {
        case 'problem_started':
          entry = {
            id: event.id,
            timestamp,
            type: 'problem_started',
            label: 'Problem Started',
            icon: 'start',
            duration,
          }
          break

        case 'step_activated':
          entry = {
            id: event.id,
            timestamp,
            type: 'step_activated',
            label: `Step ${(event.metadata.stepId ?? 0) + 1} opened`,
            stepId: event.metadata.stepId as number,
            icon: 'step',
            duration,
          }
          break

        case 'step_completed':
          entry = {
            id: event.id,
            timestamp,
            type: 'step_completed',
            label: `Step ${(event.metadata.stepId ?? 0) + 1} completed`,
            stepId: event.metadata.stepId as number,
            icon: 'success',
            duration,
          }
          stats.stepsCompleted++
          break

        case 'hint_unlocked':
        case 'hint_viewed':
          entry = {
            id: event.id,
            timestamp,
            type: event.type,
            label: `Hint level ${event.metadata.level} ${event.type === 'hint_unlocked' ? 'unlocked' : 'viewed'}`,
            stepId: event.metadata.stepId as number,
            hintLevel: event.metadata.level as number,
            icon: 'hint',
            duration,
          }
          if (event.type === 'hint_unlocked') stats.hintsUsed++
          break

        case 'task_correct':
          entry = {
            id: event.id,
            timestamp,
            type: 'task_correct',
            label: `Task answered correctly`,
            description: `Attempt #${event.metadata.attemptNumber}`,
            stepId: event.metadata.stepId as number,
            icon: 'success',
            duration,
          }
          stats.tasksAttempted++
          stats.tasksCorrect++
          break

        case 'task_incorrect':
          entry = {
            id: event.id,
            timestamp,
            type: 'task_incorrect',
            label: `Task answered incorrectly`,
            description: `Attempt #${event.metadata.attemptNumber}`,
            stepId: event.metadata.stepId as number,
            icon: 'error',
            duration,
          }
          stats.tasksAttempted++
          break

        case 'problem_marked_solved':
          entry = {
            id: event.id,
            timestamp,
            type: 'problem_marked_solved',
            label: 'Problem Completed',
            icon: 'complete',
            duration,
          }
          break
      }

      if (entry) {
        entries.push(entry)

        // Group by step for collapsible view
        if (entry.stepId !== undefined) {
          const group = stepGroups.get(entry.stepId) || []
          group.push(entry)
          stepGroups.set(entry.stepId, group)

          // Track time spent on step
          stats.stepTimes[entry.stepId] = (stats.stepTimes[entry.stepId] || 0) + duration
        }
      }
    })

    // Calculate total time
    if (events.length >= 2) {
      stats.totalTime =
        new Date(events[events.length - 1].timestamp).getTime() -
        new Date(events[0].timestamp).getTime()
    }

    return { timeline: entries, stats, stepGroups }
  }, [events])

  const toggleStep = (stepId: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  const getIconElement = (icon: TimelineEntry['icon']) => {
    switch (icon) {
      case 'start':
        return (
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'step':
        return (
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        )
      case 'hint':
        return (
          <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        )
      case 'success':
        return (
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )
      case 'error':
        return (
          <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )
      case 'complete':
        return (
          <div className="w-8 h-8 rounded-full bg-green-500 dark:bg-green-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
        <p className="mt-2 text-sm text-gray-500 dark:text-dark-text-muted">Loading timeline...</p>
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="p-6 text-center">
        <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-dark-text-muted mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500 dark:text-dark-text-muted">No timeline data available</p>
        <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-1">
          Events will be recorded as you work through problems
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-dark-card-soft border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm">
            Session Timeline
          </h3>
          {problemTitle && (
            <p className="text-xs text-gray-500 dark:text-dark-text-muted truncate max-w-xs">
              {problemTitle}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-dark-border transition-colors"
          >
            <svg className="w-4 h-4 text-gray-500 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="px-4 py-3 grid grid-cols-4 gap-2 border-b border-gray-200 dark:border-dark-border text-center">
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
            {formatDuration(stats.totalTime)}
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-text-muted">Total Time</p>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
            {stats.stepsCompleted}
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-text-muted">Steps Done</p>
        </div>
        <div>
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {stats.hintsUsed}
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-text-muted">Hints Used</p>
        </div>
        <div>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {stats.tasksAttempted > 0
              ? Math.round((stats.tasksCorrect / stats.tasksAttempted) * 100)
              : 0}%
          </p>
          <p className="text-xs text-gray-500 dark:text-dark-text-muted">Accuracy</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="px-4 py-3 max-h-80 overflow-y-auto">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-dark-border" />

          <div className="space-y-3">
            {timeline.map((entry, index) => (
              <div key={entry.id} className="relative flex items-start gap-3">
                {/* Icon */}
                <div className="relative z-10">{getIconElement(entry.icon)}</div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                      {entry.label}
                    </p>
                    <span className="text-xs text-gray-400 dark:text-dark-text-muted whitespace-nowrap">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  {entry.description && (
                    <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                      {entry.description}
                    </p>
                  )}
                  {entry.duration && entry.duration > 0 && index < timeline.length - 1 && (
                    <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-0.5">
                      {formatDuration(entry.duration)} until next action
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step Time Breakdown */}
      {Object.keys(stats.stepTimes).length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-border">
          <p className="text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-2">
            Time per Step
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.stepTimes)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([stepId, time]) => (
                <span
                  key={stepId}
                  className="px-2 py-1 bg-gray-100 dark:bg-dark-card-soft rounded text-xs text-gray-700 dark:text-dark-text-secondary"
                >
                  Step {Number(stepId) + 1}: {formatDuration(time)}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
