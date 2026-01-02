'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import DrillPlayer from '@/components/DrillPlayer'
import DrillResults from '@/components/DrillResults'
import type { Drill, DrillItemResult, DrillSessionSummary } from '@/types/drill'
import { getDrillProgress } from '@/lib/drillService'

// Import sample drills (will be replaced with API call)
import { SAMPLE_DRILLS } from '@/lib/sampleDrills'

type DrillState = 'loading' | 'ready' | 'playing' | 'results'

export default function DrillPage() {
  const params = useParams()
  const router = useRouter()
  const patternId = params.patternId as string

  const [state, setState] = useState<DrillState>('loading')
  const [drill, setDrill] = useState<Drill | null>(null)
  const [summary, setSummary] = useState<DrillSessionSummary | null>(null)
  const [redoWrongIds, setRedoWrongIds] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Load drill data
  useEffect(() => {
    const loadDrill = async () => {
      try {
        // For now, use sample drills. Later, fetch from API
        const foundDrill = SAMPLE_DRILLS.find((d) => d.patternId === patternId)

        if (!foundDrill) {
          setError(`No drill found for pattern: ${patternId}`)
          setState('ready')
          return
        }

        setDrill(foundDrill)
        setState('ready')
      } catch (err) {
        setError('Failed to load drill')
        setState('ready')
      }
    }

    loadDrill()
  }, [patternId])

  // Start the drill
  const handleStart = useCallback(() => {
    setRedoWrongIds(null)
    setSummary(null)
    setState('playing')
  }, [])

  // Handle item completion (for progress tracking)
  const handleItemComplete = useCallback((result: DrillItemResult) => {
    // Could show toast or update UI here
    console.log('Item completed:', result)
  }, [])

  // Handle drill completion
  const handleDrillComplete = useCallback((drillSummary: DrillSessionSummary) => {
    setSummary(drillSummary)
    setState('results')
  }, [])

  // Handle exit
  const handleExit = useCallback(() => {
    router.push('/drills')
  }, [router])

  // Handle redo wrong only
  const handleRedoWrong = useCallback(() => {
    if (summary && summary.wrongItemIds.length > 0) {
      setRedoWrongIds(summary.wrongItemIds)
      setSummary(null)
      setState('playing')
    }
  }, [summary])

  // Handle full retry
  const handleRetryFull = useCallback(() => {
    setRedoWrongIds(null)
    setSummary(null)
    setState('playing')
  }, [])

  // Loading state
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading drill...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !drill) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Drill Not Found
          </h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {error || `No drill available for pattern "${patternId}"`}
          </p>
          <Link
            href="/drills"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Drills
          </Link>
        </div>
      </div>
    )
  }

  // Ready state - show drill info and start button
  if (state === 'ready') {
    const progress = getDrillProgress()
    const patternProgress = progress.byPattern[patternId]

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Back link */}
          <Link
            href="/drills"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Drills
          </Link>

          {/* Drill info card */}
          <div className="bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-slate-200 dark:border-dark-border overflow-hidden">
            <div className="px-6 py-8 bg-gradient-to-r from-indigo-500 to-purple-500">
              <h1 className="text-2xl font-bold text-white mb-2">{drill.title}</h1>
              {drill.description && (
                <p className="text-indigo-100">{drill.description}</p>
              )}
            </div>

            <div className="p-6">
              {/* Drill stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    {drill.items.length}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Questions
                  </div>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    20s
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Per Question
                  </div>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
                    ~{Math.ceil((drill.items.length * 20) / 60)}m
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Est. Time
                  </div>
                </div>
              </div>

              {/* Previous attempts */}
              {patternProgress && patternProgress.completionCount > 0 && (
                <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                  <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
                    Your Progress
                  </h3>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-400">
                      Completed {patternProgress.completionCount} time{patternProgress.completionCount > 1 ? 's' : ''}
                    </span>
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                      Best: {Math.round(patternProgress.bestAccuracy)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Start button */}
              <button
                onClick={handleStart}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Drill
              </button>

              {/* Tips */}
              <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">
                <p className="font-medium mb-2">Tips:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Answer quickly - speed matters for pattern recognition</li>
                  <li>Use keyboard shortcuts (1-4 for choices, Enter to submit)</li>
                  <li>Review wrong answers to strengthen weak areas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Playing state
  if (state === 'playing') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg py-8 px-4">
        <DrillPlayer
          drill={drill}
          onItemComplete={handleItemComplete}
          onDrillComplete={handleDrillComplete}
          onExit={handleExit}
          showImmediateFeedback={true}
          itemFilter={redoWrongIds || undefined}
        />
      </div>
    )
  }

  // Results state
  if (state === 'results' && summary) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-bg py-8 px-4">
        <DrillResults
          summary={summary}
          drill={drill}
          onRedoWrong={handleRedoWrong}
          onRetryFull={handleRetryFull}
          onExit={handleExit}
        />
      </div>
    )
  }

  return null
}
