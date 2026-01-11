'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { studyPlanV2Service } from '@/lib/studyPlanV2/studyPlanV2Service'
import { authService } from '@/lib/auth/authService'
import type {
  DailyPlan,
  DailyPlanItem,
  ConfidenceMeterEntry,
  ErrorWatchlistEntry,
  PatternTrackProgress,
} from '@/types/studyPlanV2'

// ============================================
// Types
// ============================================

interface DashboardStats {
  patternsLearned: number
  totalPatterns: number
  averageMastery: number
  mistakesLastWeek: number
  streakDays: number
}

// ============================================
// Sub-Components
// ============================================

function ThinkingObjective({ objective }: { objective: string }) {
  return (
    <div className="bg-purple-500 text-white rounded-xl p-6 shadow-lg">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-1">Today&apos;s Thinking Objective</h2>
          <p className="text-white/90 text-base">{objective}</p>
        </div>
      </div>
    </div>
  )
}

function PatternTrackCard({
  progress,
  onViewDetails,
}: {
  progress: PatternTrackProgress
  onViewDetails: () => void
}) {
  const percentComplete = progress.totalPatterns > 0
    ? Math.round((progress.completedPatterns / progress.totalPatterns) * 100)
    : 0

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-lg dark:shadow-dark-md border border-transparent dark:border-dark-border">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {progress.isActive && (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                Active
              </span>
            )}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
              {progress.trackName}
            </h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
            {progress.completedPatterns} of {progress.totalPatterns} patterns completed
          </p>
        </div>
        <button
          onClick={onViewDetails}
          className="text-accent hover:underline text-sm font-medium"
        >
          View Details
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-dark-text-muted">Progress</span>
          <span className="font-semibold text-gray-900 dark:text-dark-text-primary">{percentComplete}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-dark-card-soft rounded-full h-2">
          <div
            className="bg-accent h-2 rounded-full transition-all"
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      {/* Mastery indicator */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 dark:text-dark-text-muted">Avg Mastery:</span>
        <div className="flex-1 bg-gray-200 dark:bg-dark-card-soft rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${
              progress.overallMastery >= 0.7
                ? 'bg-green-500'
                : progress.overallMastery >= 0.4
                ? 'bg-yellow-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${progress.overallMastery * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
          {Math.round(progress.overallMastery * 100)}%
        </span>
      </div>
    </div>
  )
}

function TopicExposureList({ topics }: { topics: string[] }) {
  const topicNames: Record<string, string> = {
    mechanics: 'Mechanics',
    thermodynamics: 'Thermodynamics',
    electromagnetism: 'Electromagnetism',
    optics: 'Optics',
    'modern-physics': 'Modern Physics',
  }

  const topicIcons: Record<string, string> = {
    mechanics: '⚙️',
    thermodynamics: '🌡️',
    electromagnetism: '⚡',
    optics: '🔭',
    'modern-physics': '⚛️',
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-lg dark:shadow-dark-md border border-transparent dark:border-dark-border">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
        Topic Exposure Today
      </h3>
      <div className="flex flex-wrap gap-2">
        {topics.map(topic => (
          <span
            key={topic}
            className="px-3 py-1.5 bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary rounded-lg text-sm flex items-center gap-2"
          >
            <span>{topicIcons[topic] || '📚'}</span>
            <span>{topicNames[topic] || topic}</span>
          </span>
        ))}
        {topics.length === 0 && (
          <span className="text-gray-500 dark:text-dark-text-muted text-sm">
            Complete sessions to see topic coverage
          </span>
        )}
      </div>
    </div>
  )
}

function ErrorWatchlistCard({
  entries,
  onViewAll,
}: {
  entries: ErrorWatchlistEntry[]
  onViewAll: () => void
}) {
  const displayEntries = entries.slice(0, 3)

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-lg dark:shadow-dark-md border border-transparent dark:border-dark-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
          Error Watchlist
        </h3>
        {entries.length > 3 && (
          <button
            onClick={onViewAll}
            className="text-accent hover:underline text-sm font-medium"
          >
            View All ({entries.length})
          </button>
        )}
      </div>

      {displayEntries.length === 0 ? (
        <p className="text-gray-500 dark:text-dark-text-muted text-sm">
          No recurring errors yet. Keep practicing!
        </p>
      ) : (
        <div className="space-y-3">
          {displayEntries.map(entry => (
            <div
              key={entry.mistakeTypeId}
              className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-900/30"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-dark-text-primary text-sm">
                    {entry.mistakeTypeName}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-dark-text-muted mt-0.5">
                    {entry.occurrenceCount}x in last 2 weeks · Related: {entry.relatedPatternName}
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-red-200 dark:bg-red-800/40 text-red-800 dark:text-red-300 text-xs font-medium rounded">
                  {entry.occurrenceCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ConfidenceMeter({ entries }: { entries: ConfidenceMeterEntry[] }) {
  const weakEntries = entries.filter(e => e.isWeak).slice(0, 5)

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-lg dark:shadow-dark-md border border-transparent dark:border-dark-border">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
        Confidence Meter
      </h3>

      {weakEntries.length === 0 ? (
        <p className="text-gray-500 dark:text-dark-text-muted text-sm">
          All patterns looking strong! Keep it up.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">
            Patterns needing attention:
          </p>
          {weakEntries.map(entry => (
            <div key={entry.patternId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-dark-text-primary truncate flex-1 mr-2">
                  {entry.patternName}
                </span>
                <span
                  className={`font-medium ${
                    entry.mastery < 0.25
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-yellow-600 dark:text-yellow-400'
                  }`}
                >
                  {Math.round(entry.mastery * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-card-soft rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full ${
                    entry.mastery < 0.25 ? 'bg-red-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${entry.mastery * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SessionCard({
  item,
  onStart,
}: {
  item: DailyPlanItem
  onStart: () => void
}) {
  const typeConfig = {
    learn: {
      icon: '📖',
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      label: 'Learn',
    },
    guided_practice: {
      icon: '✏️',
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      label: 'Practice',
    },
    timed_drill: {
      icon: '⏱️',
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
      label: 'Drill',
    },
    review_mistakes: {
      icon: '🔄',
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
      label: 'Review',
    },
  }

  const config = typeConfig[item.type]

  return (
    <div
      className={`bg-white dark:bg-dark-card rounded-xl p-5 shadow-md dark:shadow-dark-md border border-transparent dark:border-dark-border transition-all ${
        item.completed
          ? 'opacity-60'
          : 'hover:shadow-lg dark:hover:shadow-dark-lg hover:border-accent dark:hover:border-accent'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
            <span className="text-lg">{config.icon}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 ${config.color} text-xs font-medium rounded`}>
                {config.label}
              </span>
              {item.isErrorRecycling && (
                <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium rounded">
                  Fix Error
                </span>
              )}
              {item.completed && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs font-medium rounded">
                  Done
                </span>
              )}
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-dark-text-primary text-sm mb-1 truncate">
              {item.title}
            </h4>
            <p className="text-xs text-gray-600 dark:text-dark-text-muted line-clamp-2">
              {item.description}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-dark-text-muted">
              <span>{item.problemIds.length} problems</span>
              <span>~{item.estimatedMinutes} min</span>
            </div>
          </div>
        </div>
        <button
          onClick={onStart}
          disabled={item.completed}
          className={`ml-3 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
            item.completed
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              : 'bg-accent text-white hover:bg-accent-strong'
          }`}
        >
          {item.completed ? 'Completed' : 'Start'}
        </button>
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

interface StudyPlanV2DashboardProps {
  onSwitchToV1?: () => void
}

export default function StudyPlanV2Dashboard({ onSwitchToV1 }: StudyPlanV2DashboardProps) {
  const router = useRouter()
  const [plan, setPlan] = useState<DailyPlan | null>(null)
  const [trackProgress, setTrackProgress] = useState<PatternTrackProgress | null>(null)
  const [confidenceEntries, setConfidenceEntries] = useState<ConfidenceMeterEntry[]>([])
  const [errorEntries, setErrorEntries] = useState<ErrorWatchlistEntry[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const userId = authService.getUserId() || 'default-user'

        // Load today's plan
        const todaysPlan = studyPlanV2Service.getTodaysPlan(userId)
        setPlan(todaysPlan)

        // Load track progress
        const track = studyPlanV2Service.getCurrentTrack(userId)
        if (track) {
          const progress = studyPlanV2Service.getPatternTrackProgress(userId, track.id)
          setTrackProgress(progress)
        }

        // Load confidence meter
        const confidence = studyPlanV2Service.getConfidenceMeter(userId)
        setConfidenceEntries(confidence)

        // Load error watchlist
        const errors = studyPlanV2Service.getErrorWatchlist(userId)
        setErrorEntries(errors)

        // Load stats
        const dashboardStats = studyPlanV2Service.getDashboardStats(userId)
        setStats(dashboardStats)
      } catch (error) {
        console.error('Error loading Study Plan v2 data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleStartSession = (item: DailyPlanItem) => {
    // Navigate to problem solver with the first problem
    if (item.problemIds.length > 0) {
      // Store session info for continuation
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('v2_session', JSON.stringify({
          itemId: item.id,
          problemIds: item.problemIds,
          currentIndex: 0,
          type: item.type,
        }))
      }
      router.push(`/?question=${item.problemIds[0]}&v2session=true`)
    }
  }

  const handleViewTrackDetails = () => {
    if (trackProgress) {
      router.push(`/study-path/v2/track/${trackProgress.trackId}`)
    }
  }

  const handleViewAllErrors = () => {
    router.push('/study-path/v2/errors')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-dark-text-muted">
          Could not load study plan. Please try again.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-1">
            Study Plan v2
          </h1>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
            Pattern-first learning for physics mastery
          </p>
        </div>
        {onSwitchToV1 && (
          <button
            onClick={onSwitchToV1}
            className="px-4 py-2 text-sm text-gray-600 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text-primary border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors"
          >
            Switch to Topic View
          </button>
        )}
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-dark-card rounded-lg p-4 shadow dark:shadow-dark-sm border dark:border-dark-border">
            <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-1">Patterns Learned</p>
            <p className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
              {stats.patternsLearned}/{stats.totalPatterns}
            </p>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-lg p-4 shadow dark:shadow-dark-sm border dark:border-dark-border">
            <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-1">Avg Mastery</p>
            <p className="text-xl font-bold text-accent">
              {Math.round(stats.averageMastery * 100)}%
            </p>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-lg p-4 shadow dark:shadow-dark-sm border dark:border-dark-border">
            <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-1">Mistakes (7d)</p>
            <p className="text-xl font-bold text-red-600 dark:text-red-400">
              {stats.mistakesLastWeek}
            </p>
          </div>
          <div className="bg-white dark:bg-dark-card rounded-lg p-4 shadow dark:shadow-dark-sm border dark:border-dark-border">
            <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-1">Streak</p>
            <p className="text-xl font-bold text-green-600 dark:text-green-400">
              {stats.streakDays} days
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Thinking Objective */}
      <ThinkingObjective objective={plan.thinkingObjective} />

      {/* Section 2 & 3: Pattern Track + Topic Exposure */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {trackProgress && (
          <PatternTrackCard
            progress={trackProgress}
            onViewDetails={handleViewTrackDetails}
          />
        )}
        <TopicExposureList topics={plan.topicExposure} />
      </div>

      {/* Section 4 & 5: Error Watchlist + Confidence Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ErrorWatchlistCard
          entries={errorEntries}
          onViewAll={handleViewAllErrors}
        />
        <ConfidenceMeter entries={confidenceEntries} />
      </div>

      {/* Section 6: Sessions */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-lg dark:shadow-dark-md border border-transparent dark:border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
            Today&apos;s Sessions
          </h3>
          <div className="text-sm text-gray-600 dark:text-dark-text-muted">
            {plan.completionPercent}% complete
          </div>
        </div>

        <div className="space-y-4">
          {plan.items.map(item => (
            <SessionCard
              key={item.id}
              item={item}
              onStart={() => handleStartSession(item)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
