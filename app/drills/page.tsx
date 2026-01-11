'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { SAMPLE_DRILLS } from '@/lib/sampleDrills'
import { getDrillProgress } from '@/lib/drillService'
import type { DrillOverallProgress } from '@/types/drill'

export default function DrillsPage() {
  const [progress, setProgress] = useState<DrillOverallProgress | null>(null)

  useEffect(() => {
    setProgress(getDrillProgress())
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/study-path"
            className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-2">
            Micro-Pattern Drills
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Rapid-fire questions to build reflex pattern recognition. Master physics patterns through timed practice.
          </p>
        </div>

        {/* Overall Stats */}
        {progress && progress.totalDrillsCompleted > 0 && (
          <div className="mb-8 p-6 bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">
              Your Progress
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {progress.totalDrillsCompleted}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Drills Completed
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {progress.totalItemsAnswered}
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Questions Answered
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {Math.round(progress.overallAccuracy)}%
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Overall Accuracy
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {(progress.overallAverageTimeMs / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Avg Response Time
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Drill Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {SAMPLE_DRILLS.map((drill) => {
            const patternProgress = progress?.byPattern[drill.patternId]
            const isWeak = progress?.weakPatternIds.includes(drill.patternId)
            const isStrong = progress?.strongPatternIds.includes(drill.patternId)

            return (
              <Link
                key={drill.id}
                href={`/drills/${drill.patternId}`}
                className="block bg-white dark:bg-dark-card rounded-xl shadow-sm border border-slate-200 dark:border-dark-border overflow-hidden hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group"
              >
                {/* Card Header */}
                <div className="px-6 py-4 bg-indigo-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white mb-1">
                        {drill.title}
                      </h3>
                      {drill.description && (
                        <p className="text-indigo-100 text-sm">
                          {drill.description}
                        </p>
                      )}
                    </div>
                    {isStrong && (
                      <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                        Mastered
                      </span>
                    )}
                    {isWeak && (
                      <span className="px-2 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
                        Needs Practice
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-6">
                  {/* Stats Row */}
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-4">
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{drill.items.length} questions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>~{Math.ceil((drill.items.length * 20) / 60)} min</span>
                    </div>
                    {drill.difficulty && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        drill.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        drill.difficulty === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {drill.difficulty}
                      </span>
                    )}
                  </div>

                  {/* Progress */}
                  {patternProgress && patternProgress.completionCount > 0 ? (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">
                        Completed {patternProgress.completionCount} time{patternProgress.completionCount > 1 ? 's' : ''}
                      </span>
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">
                        Best: {Math.round(patternProgress.bestAccuracy)}%
                      </span>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      Not attempted yet
                    </div>
                  )}

                  {/* Tags */}
                  {drill.tags && drill.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {drill.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover Arrow */}
                <div className="px-6 pb-4">
                  <div className="flex items-center justify-end text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium mr-1">Start Drill</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Empty State */}
        {SAMPLE_DRILLS.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
              No Drills Available Yet
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Check back soon for new pattern drills!
            </p>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
          <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
            How Micro-Pattern Drills Work
          </h3>
          <ul className="text-sm text-indigo-600 dark:text-indigo-400 space-y-1">
            <li>• Each drill has 8-15 rapid-fire questions on a specific physics pattern</li>
            <li>• You have 20 seconds per question - speed matters for building reflexes</li>
            <li>• Get immediate feedback with explanations after each answer</li>
            <li>• Review wrong answers and redo them to strengthen weak areas</li>
            <li>• Use keyboard shortcuts: 1-4 for choices, Enter to submit</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
