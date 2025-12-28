'use client'

import { useState } from 'react'
import type { DailyDebrief } from '@/types/mistakeNotebook'

interface DailyDebriefCardProps {
  debrief: DailyDebrief
  onStartReview?: () => void
  onDismiss?: () => void
}

export default function DailyDebriefCard({
  debrief,
  onStartReview,
  onDismiss
}: DailyDebriefCardProps) {
  const [expanded, setExpanded] = useState(false)

  const hasActivity = debrief.problemsAttempted > 0 || debrief.stepsCompleted > 0

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">
                Daily Debrief
              </h3>
              <p className="text-sm text-gray-500 dark:text-dark-text-muted">
                {new Date(debrief.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>

          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Encouragement */}
        <p className="mt-4 text-indigo-700 dark:text-indigo-300 font-medium">
          {debrief.encouragement}
        </p>

        {/* Quick stats */}
        {hasActivity && (
          <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-4">
            <div className="text-center p-2 bg-white/50 dark:bg-dark-card/50 rounded-lg">
              <p className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
                {debrief.problemsAttempted}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Problems</p>
            </div>
            <div className="text-center p-2 bg-white/50 dark:bg-dark-card/50 rounded-lg">
              <p className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
                {debrief.stepsCompleted}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Steps</p>
            </div>
            <div className="text-center p-2 bg-white/50 dark:bg-dark-card/50 rounded-lg">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                {debrief.mistakesMade}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Mistakes</p>
            </div>
            <div className="text-center p-2 bg-white/50 dark:bg-dark-card/50 rounded-lg">
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                {debrief.hintsUsed}
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted">Hints</p>
            </div>
          </div>
        )}

        {/* Due cards alert */}
        {(debrief.cardsDueToday > 0 || debrief.cardsOverdue > 0) && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
                  {debrief.cardsDueToday} cards due
                  {debrief.cardsOverdue > 0 && (
                    <span className="text-red-600 dark:text-red-400 ml-1">
                      ({debrief.cardsOverdue} overdue)
                    </span>
                  )}
                </span>
              </div>
              {onStartReview && (
                <button
                  onClick={onStartReview}
                  className="px-3 py-1 bg-amber-600 text-white text-sm font-medium rounded hover:bg-amber-700 transition-colors"
                >
                  Review
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Expandable section */}
      <div className="border-t border-indigo-200 dark:border-indigo-800">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full px-4 sm:px-6 py-3 flex items-center justify-between text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors"
        >
          <span>View detailed analysis</span>
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expanded && (
          <div className="px-4 sm:px-6 pb-6 space-y-6">
            {/* Top struggled concepts */}
            {debrief.topStruggledConcepts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary mb-3">
                  Top Struggled Concepts
                </h4>
                <div className="space-y-2">
                  {debrief.topStruggledConcepts.map((concept, idx) => (
                    <div
                      key={concept.conceptTag}
                      className="flex items-center gap-3 p-3 bg-white/70 dark:bg-dark-card/70 rounded-lg"
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400' :
                        idx === 1 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400' :
                        'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/50 dark:text-yellow-400'
                      }`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-dark-text-primary">
                          {concept.conceptName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                          {concept.mistakeCount} mistakes | Avg {concept.averageHintsNeeded.toFixed(1)} hints
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strong concepts */}
            {debrief.strongConcepts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Strong Concepts
                </h4>
                <div className="flex flex-wrap gap-2">
                  {debrief.strongConcepts.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs"
                    >
                      {tag.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Review plan */}
            {debrief.reviewPlan.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary mb-3">
                  10-Minute Review Plan
                </h4>
                <div className="space-y-2">
                  {debrief.reviewPlan.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-3 p-3 bg-white/70 dark:bg-dark-card/70 rounded-lg"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        item.type === 'flashcard_review' ? 'bg-blue-100 dark:bg-blue-900/50' :
                        item.type === 'concept_review' ? 'bg-purple-100 dark:bg-purple-900/50' :
                        'bg-green-100 dark:bg-green-900/50'
                      }`}>
                        {item.type === 'flashcard_review' && (
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        )}
                        {item.type === 'concept_review' && (
                          <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        )}
                        {item.type === 'practice_problem' && (
                          <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 dark:text-dark-text-primary text-sm">
                            {item.title}
                          </p>
                          <span className="text-xs text-gray-400 dark:text-dark-text-muted">
                            ~{item.estimatedMinutes} min
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
