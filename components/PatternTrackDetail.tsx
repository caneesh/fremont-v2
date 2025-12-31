'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { studyPlanV2Service } from '@/lib/studyPlanV2/studyPlanV2Service'
import { authService } from '@/lib/auth/authService'
import type {
  PatternTrack,
  Pattern,
  UserPatternState,
  ProblemV2,
} from '@/types/studyPlanV2'

// ============================================
// Types
// ============================================

interface PatternWithState {
  pattern: Pattern
  state: UserPatternState
}

// ============================================
// Sub-Components
// ============================================

function PatternCard({
  pattern,
  state,
  index,
  onStartLearn,
  onStartPractice,
  onStartDrills,
}: {
  pattern: Pattern
  state: UserPatternState
  index: number
  onStartLearn: () => void
  onStartPractice: () => void
  onStartDrills: () => void
}) {
  const masteryPercent = Math.round(state.mastery * 100)
  const isLocked = false // Could implement prereq checking here

  // Determine progress stage
  const stage = !state.learnCompleted
    ? 'learn'
    : !state.guidedPracticeCompleted
    ? 'practice'
    : 'drills'

  return (
    <div
      className={`bg-white dark:bg-dark-card rounded-xl p-6 shadow-lg dark:shadow-dark-md border-2 transition-all ${
        isLocked
          ? 'opacity-50 border-gray-200 dark:border-dark-border'
          : stage === 'learn'
          ? 'border-blue-300 dark:border-blue-700'
          : stage === 'practice'
          ? 'border-green-300 dark:border-green-700'
          : 'border-purple-300 dark:border-purple-700'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
              state.learnCompleted && state.guidedPracticeCompleted
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                : state.learnCompleted
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
            }`}
          >
            {index + 1}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">
              {pattern.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-dark-text-muted">
              Difficulty: {'⭐'.repeat(pattern.difficulty)}
            </p>
          </div>
        </div>

        {/* Mastery badge */}
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            masteryPercent >= 75
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : masteryPercent >= 40
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}
        >
          {masteryPercent}% Mastery
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
        {pattern.summary}
      </p>

      {/* Progress stages */}
      <div className="flex items-center gap-2 mb-4">
        <div
          className={`flex-1 h-2 rounded-full ${
            state.learnCompleted
              ? 'bg-blue-500'
              : 'bg-gray-200 dark:bg-dark-card-soft'
          }`}
        />
        <div
          className={`flex-1 h-2 rounded-full ${
            state.guidedPracticeCompleted
              ? 'bg-green-500'
              : 'bg-gray-200 dark:bg-dark-card-soft'
          }`}
        />
        <div
          className={`flex-1 h-2 rounded-full ${
            state.drillsAttempted > 0
              ? 'bg-purple-500'
              : 'bg-gray-200 dark:bg-dark-card-soft'
          }`}
        />
      </div>

      {/* Stage labels */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-muted mb-4">
        <span className="flex-1 text-center">Learn</span>
        <span className="flex-1 text-center">Practice</span>
        <span className="flex-1 text-center">Drills</span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={onStartLearn}
          disabled={isLocked}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            stage === 'learn'
              ? 'bg-blue-500 text-white hover:bg-blue-600'
              : state.learnCompleted
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-dark-card-soft text-gray-500 dark:text-dark-text-muted'
          }`}
        >
          {state.learnCompleted ? '✓ Learned' : 'Learn'}
        </button>
        <button
          onClick={onStartPractice}
          disabled={isLocked || !state.learnCompleted}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            stage === 'practice'
              ? 'bg-green-500 text-white hover:bg-green-600'
              : state.guidedPracticeCompleted
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : !state.learnCompleted
              ? 'bg-gray-100 dark:bg-dark-card-soft text-gray-400 dark:text-dark-text-muted cursor-not-allowed'
              : 'bg-gray-100 dark:bg-dark-card-soft text-gray-500 dark:text-dark-text-muted'
          }`}
        >
          {state.guidedPracticeCompleted ? '✓ Practiced' : 'Practice'}
        </button>
        <button
          onClick={onStartDrills}
          disabled={isLocked || !state.guidedPracticeCompleted}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            stage === 'drills' && state.guidedPracticeCompleted
              ? 'bg-purple-500 text-white hover:bg-purple-600'
              : state.drillsAttempted > 0
              ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
              : !state.guidedPracticeCompleted
              ? 'bg-gray-100 dark:bg-dark-card-soft text-gray-400 dark:text-dark-text-muted cursor-not-allowed'
              : 'bg-gray-100 dark:bg-dark-card-soft text-gray-500 dark:text-dark-text-muted'
          }`}
        >
          Drills {state.drillsAttempted > 0 && `(${state.drillsAttempted})`}
        </button>
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

interface PatternTrackDetailProps {
  trackId: string
  onBack?: () => void
}

export default function PatternTrackDetail({ trackId, onBack }: PatternTrackDetailProps) {
  const router = useRouter()
  const [track, setTrack] = useState<PatternTrack | null>(null)
  const [patternsWithState, setPatternsWithState] = useState<PatternWithState[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = () => {
      try {
        const userId = authService.getUserId() || 'default-user'

        // Load track
        const loadedTrack = studyPlanV2Service.getPatternTrackById(trackId)
        setTrack(loadedTrack)

        if (loadedTrack) {
          // Load patterns with states
          const patterns: PatternWithState[] = loadedTrack.patternIds
            .map(patternId => {
              const pattern = studyPlanV2Service.getPatternById(patternId)
              const state = studyPlanV2Service.getPatternState(userId, patternId)
              if (pattern) {
                return { pattern, state }
              }
              return null
            })
            .filter((p): p is PatternWithState => p !== null)

          setPatternsWithState(patterns)
        }
      } catch (error) {
        console.error('Error loading pattern track:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [trackId])

  const handleStartSession = (patternId: string, sessionType: 'learn' | 'practice' | 'drill') => {
    const problems = studyPlanV2Service.getProblemsByPattern(patternId)

    // Filter by session type
    const filtered = problems.filter(p => {
      if (sessionType === 'learn') return p.problemType === 'learn' || p.difficulty <= 2
      if (sessionType === 'practice') return p.problemType === 'practice'
      return p.problemType === 'drill' || p.problemType === 'practice'
    })

    if (filtered.length > 0) {
      // Store session info
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('v2_session', JSON.stringify({
          patternId,
          problemIds: filtered.slice(0, sessionType === 'drill' ? 5 : 2).map(p => p.id),
          currentIndex: 0,
          type: sessionType,
        }))
      }
      router.push(`/?question=${filtered[0].id}&v2session=true`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (!track) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-dark-text-muted">
          Pattern track not found.
        </p>
        {onBack && (
          <button onClick={onBack} className="mt-4 text-accent hover:underline">
            Go back
          </button>
        )}
      </div>
    )
  }

  // Calculate overall progress
  const completedCount = patternsWithState.filter(
    p => p.state.learnCompleted && p.state.guidedPracticeCompleted
  ).length
  const overallPercent = patternsWithState.length > 0
    ? Math.round((completedCount / patternsWithState.length) * 100)
    : 0

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
            {track.name}
          </h1>
          <p className="text-gray-600 dark:text-dark-text-secondary">
            {track.description}
          </p>
        </div>
      </div>

      {/* Progress summary */}
      <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-lg dark:shadow-dark-md border dark:border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-dark-text-primary">
            Track Progress
          </h2>
          <span className="text-lg font-bold text-accent">{overallPercent}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-dark-card-soft rounded-full h-3 mb-2">
          <div
            className="bg-accent h-3 rounded-full transition-all"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 dark:text-dark-text-muted">
          {completedCount} of {patternsWithState.length} patterns mastered
        </p>
      </div>

      {/* Pattern list */}
      <div className="space-y-4">
        <h2 className="font-semibold text-gray-900 dark:text-dark-text-primary">
          Patterns in this Track
        </h2>
        {patternsWithState.map((item, index) => (
          <PatternCard
            key={item.pattern.id}
            pattern={item.pattern}
            state={item.state}
            index={index}
            onStartLearn={() => handleStartSession(item.pattern.id, 'learn')}
            onStartPractice={() => handleStartSession(item.pattern.id, 'practice')}
            onStartDrills={() => handleStartSession(item.pattern.id, 'drill')}
          />
        ))}
      </div>
    </div>
  )
}
