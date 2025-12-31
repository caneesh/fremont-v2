'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { studyPlanV2Service } from '@/lib/studyPlanV2/studyPlanV2Service'
import { authService } from '@/lib/auth/authService'
import type {
  ErrorWatchlistEntry,
  MistakeType,
  Pattern,
} from '@/types/studyPlanV2'

// ============================================
// Sub-Components
// ============================================

function ErrorCard({
  entry,
  pattern,
  mistakeType,
  onStartPractice,
}: {
  entry: ErrorWatchlistEntry
  pattern: Pattern | null
  mistakeType: MistakeType | null
  onStartPractice: () => void
}) {
  const severityColor =
    entry.occurrenceCount >= 5
      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
      : entry.occurrenceCount >= 3
      ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
      : 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'

  const severityBadge =
    entry.occurrenceCount >= 5
      ? 'bg-red-500 text-white'
      : entry.occurrenceCount >= 3
      ? 'bg-orange-500 text-white'
      : 'bg-yellow-500 text-white'

  // Calculate days since last occurrence
  const lastOccurredDate = new Date(entry.lastOccurred)
  const now = new Date()
  const daysSince = Math.floor((now.getTime() - lastOccurredDate.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div
      className={`rounded-xl p-6 border-l-4 ${severityColor} shadow-md dark:shadow-dark-md`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">
              {entry.mistakeTypeName}
            </h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${severityBadge}`}>
              {entry.occurrenceCount}x
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-dark-text-muted">
            Related pattern: {entry.relatedPatternName}
          </p>
        </div>
        <div className="text-right text-sm text-gray-500 dark:text-dark-text-muted">
          <p>Last seen</p>
          <p className="font-medium">
            {daysSince === 0 ? 'Today' : daysSince === 1 ? 'Yesterday' : `${daysSince} days ago`}
          </p>
        </div>
      </div>

      {/* Description */}
      {mistakeType && (
        <p className="text-sm text-gray-700 dark:text-dark-text-secondary mb-4">
          {mistakeType.description}
        </p>
      )}

      {/* Remediation */}
      <div className="bg-white dark:bg-dark-card rounded-lg p-4 mb-4 border border-gray-200 dark:border-dark-border">
        <h4 className="text-sm font-medium text-gray-900 dark:text-dark-text-primary mb-1">
          How to Fix
        </h4>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
          {entry.suggestedAction}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-muted">
          {pattern && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-dark-card-soft rounded">
              Difficulty: {'⭐'.repeat(pattern.difficulty)}
            </span>
          )}
        </div>
        <button
          onClick={onStartPractice}
          className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-strong transition-colors"
        >
          Practice to Fix
        </button>
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

interface ErrorWatchlistViewProps {
  onBack?: () => void
}

export default function ErrorWatchlistView({ onBack }: ErrorWatchlistViewProps) {
  const router = useRouter()
  const [entries, setEntries] = useState<ErrorWatchlistEntry[]>([])
  const [patterns, setPatterns] = useState<Map<string, Pattern>>(new Map())
  const [mistakeTypes, setMistakeTypes] = useState<Map<string, MistakeType>>(new Map())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  useEffect(() => {
    const loadData = () => {
      try {
        const userId = authService.getUserId() || 'default-user'

        // Load error watchlist
        const errorEntries = studyPlanV2Service.getErrorWatchlist(userId)
        setEntries(errorEntries)

        // Load patterns for additional info
        const allPatterns = studyPlanV2Service.getAllPatterns()
        const patternMap = new Map(allPatterns.map(p => [p.id, p]))
        setPatterns(patternMap)
      } catch (error) {
        console.error('Error loading error watchlist:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleStartPractice = (mistakeTypeId: string, patternId?: string) => {
    if (patternId) {
      const problems = studyPlanV2Service.getProblemsByPattern(patternId)
      const drills = problems.filter(
        p => p.isMicroDrill || p.trapTags.includes(mistakeTypeId)
      )

      if (drills.length > 0) {
        // Store session info
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('v2_session', JSON.stringify({
            mistakeTypeId,
            patternId,
            problemIds: drills.slice(0, 3).map(p => p.id),
            currentIndex: 0,
            type: 'review_mistakes',
          }))
        }
        router.push(`/?question=${drills[0].id}&v2session=true`)
        return
      }

      // Fallback to pattern problems
      const patternProblems = problems.slice(0, 2)
      if (patternProblems.length > 0) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('v2_session', JSON.stringify({
            mistakeTypeId,
            patternId,
            problemIds: patternProblems.map(p => p.id),
            currentIndex: 0,
            type: 'review_mistakes',
          }))
        }
        router.push(`/?question=${patternProblems[0].id}&v2session=true`)
      }
    }
  }

  const filteredEntries = entries.filter(entry => {
    if (filter === 'all') return true
    if (filter === 'high') return entry.occurrenceCount >= 5
    if (filter === 'medium') return entry.occurrenceCount >= 3 && entry.occurrenceCount < 5
    if (filter === 'low') return entry.occurrenceCount < 3
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text-primary mb-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
          )}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-1">
            Error Watchlist
          </h1>
          <p className="text-gray-600 dark:text-dark-text-secondary">
            Recurring mistakes from the last 14 days. Practice to eliminate them!
          </p>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400 mb-1">High Priority</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">
            {entries.filter(e => e.occurrenceCount >= 5).length}
          </p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-orange-600 dark:text-orange-400 mb-1">Medium Priority</p>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
            {entries.filter(e => e.occurrenceCount >= 3 && e.occurrenceCount < 5).length}
          </p>
        </div>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">Low Priority</p>
          <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
            {entries.filter(e => e.occurrenceCount < 3).length}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-dark-text-muted">Filter:</span>
        {(['all', 'high', 'medium', 'low'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-sm rounded-full transition-colors ${
              filter === f
                ? 'bg-accent text-white'
                : 'bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-muted hover:bg-gray-200 dark:hover:bg-dark-border'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Error list */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-dark-card rounded-xl shadow dark:shadow-dark-md border dark:border-dark-border">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
            {filter === 'all' ? 'No Recurring Errors!' : `No ${filter} priority errors`}
          </h3>
          <p className="text-gray-600 dark:text-dark-text-muted text-sm">
            {filter === 'all'
              ? 'Great job! Keep practicing to maintain your streak.'
              : 'Try changing the filter to see other errors.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map(entry => {
            // Find the related pattern
            const patternId = entry.relatedPatternName
              ? Array.from(patterns.entries()).find(
                  ([, p]) => p.name === entry.relatedPatternName
                )?.[0]
              : undefined
            const pattern = patternId ? (patterns.get(patternId) ?? null) : null

            return (
              <ErrorCard
                key={entry.mistakeTypeId}
                entry={entry}
                pattern={pattern}
                mistakeType={null}
                onStartPractice={() =>
                  handleStartPractice(entry.mistakeTypeId, pattern?.id)
                }
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
