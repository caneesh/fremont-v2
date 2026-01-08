'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import type { MistakeCard } from '@/types/mistakeNotebook'
import type { ConstraintCollision, SocraticDialogue } from '@/types/constraintCollision'
import type { Confidence } from '@/types/confidence'
import type { SkipCommitAnalytics } from '@/types/skipCommitGate'
import type { PatternOption } from '@/types/patternFirst'

const SESSION_STORAGE_KEY = 'coach_tools_panel_open'

interface CoachToolsPanelProps {
  isOpen: boolean
  onClose: () => void
  // Step Heatmap props
  showHeatmap?: boolean
  stepConfidenceRatings?: Map<number, Confidence>
  stepTitles?: string[]
  completedSteps?: number[]
  currentStep?: number
  onStepClick?: (stepIndex: number) => void
  // Related Mistakes props
  relatedMistakes?: MistakeCard[]
  onDismissMistakes?: () => void
  // Constraint Feedback props
  constraintCollisions?: ConstraintCollision[]
  constraintDialogue?: SocraticDialogue
  onDismissConstraint?: (collisionId: string) => void
  onHighlightProblem?: (startIndex: number, endIndex: number) => void
  // Stuck/Rewind props
  onRecoverFromStuck?: () => void
  // Pattern Selection props
  patterns?: PatternOption[]
  selectedPatternId?: string | null
  onOpenPatternPicker?: () => void
  // Skip/Commit Analytics props
  skipCommitAnalytics?: SkipCommitAnalytics | null
  showSkipCommitAnalytics?: boolean
  onToggleSkipCommitAnalytics?: () => void
}

export default function CoachToolsPanel({
  isOpen,
  onClose,
  showHeatmap = false,
  stepConfidenceRatings,
  stepTitles = [],
  completedSteps = [],
  currentStep = 0,
  onStepClick,
  relatedMistakes = [],
  onDismissMistakes,
  constraintCollisions = [],
  constraintDialogue,
  onDismissConstraint,
  onHighlightProblem,
  onRecoverFromStuck,
  patterns = [],
  selectedPatternId,
  onOpenPatternPicker,
  skipCommitAnalytics,
  showSkipCommitAnalytics = false,
  onToggleSkipCommitAnalytics,
}: CoachToolsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus first focusable element when opening
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const firstFocusable = panelRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    }
  }, [isOpen])

  const hasActiveAlerts = constraintCollisions.length > 0 || relatedMistakes.length > 0

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 dark:bg-black/50 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="coach-tools-title"
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-dark-card shadow-2xl dark:shadow-dark-lg z-50 flex flex-col animate-in slide-in-from-right duration-300 border-l border-gray-200 dark:border-dark-border"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-border bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 dark:bg-indigo-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 id="coach-tools-title" className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
              Coach Tools
            </h2>
            {hasActiveAlerts && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                {constraintCollisions.length + relatedMistakes.length} alerts
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card-soft transition-colors"
            aria-label="Close coach tools"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Help Section */}
          {onRecoverFromStuck && (
            <section className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
              <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                Need help?
              </h3>
              <button
                onClick={() => {
                  onRecoverFromStuck()
                  onClose()
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
                Get Socratic guidance
              </button>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 text-center">
                Review your approach step-by-step
              </p>
            </section>
          )}

          {/* Active Alerts Section */}
          {(constraintCollisions.length > 0 || relatedMistakes.length > 0) && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Active Alerts
              </h3>

              {/* Constraint Collisions */}
              {constraintCollisions.map((collision) => (
                <div
                  key={collision.id}
                  className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        {collision.explanation}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                        collision.severity === 'high' ? 'bg-red-200 text-red-800' :
                        collision.severity === 'medium' ? 'bg-amber-200 text-amber-800' :
                        'bg-yellow-200 text-yellow-800'
                      }`}>
                        {collision.severity} severity
                      </span>
                    </div>
                    <button
                      onClick={() => onDismissConstraint?.(collision.id)}
                      className="ml-2 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-300"
                      aria-label="Dismiss"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}

              {/* Related Past Mistakes */}
              {relatedMistakes.length > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Related past mistakes ({relatedMistakes.length})
                    </span>
                    <button
                      onClick={onDismissMistakes}
                      className="text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300"
                      aria-label="Dismiss"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {relatedMistakes.slice(0, 3).map((mistake) => (
                      <div key={mistake.id} className="p-2 bg-white dark:bg-dark-card rounded border border-amber-100 dark:border-amber-800/50">
                        <p className="text-xs font-medium text-gray-900 dark:text-dark-text-primary truncate">
                          {mistake.stepTitle}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-0.5 line-clamp-2">
                          {mistake.misconceptionNote}
                        </p>
                      </div>
                    ))}
                  </div>
                  <a
                    href="/mistake-notebook"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-amber-700 dark:text-amber-300 hover:underline"
                  >
                    View all
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              )}
            </section>
          )}

          {/* Pattern Selection */}
          {patterns.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Pattern Recognition
              </h3>
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-indigo-800 dark:text-indigo-200">
                    {selectedPatternId
                      ? patterns.find(p => p.id === selectedPatternId)?.label || selectedPatternId
                      : 'No pattern selected'}
                  </span>
                  <button
                    onClick={onOpenPatternPicker}
                    className="px-3 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                  >
                    {selectedPatternId ? 'Change' : 'Select'}
                  </button>
                </div>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                  Identifying patterns builds exam-time speed
                </p>
              </div>
            </section>
          )}

          {/* Step Confidence Heatmap */}
          {showHeatmap && stepConfidenceRatings && stepConfidenceRatings.size > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Confidence Heatmap
              </h3>
              <div className="p-3 bg-gray-50 dark:bg-dark-card-soft rounded-lg">
                <div className="flex flex-wrap gap-1">
                  {stepTitles.map((title, index) => {
                    const confidence = stepConfidenceRatings.get(index)
                    const isCompleted = completedSteps.includes(index)
                    const isCurrent = currentStep === index

                    let bgColor = 'bg-gray-200 dark:bg-gray-700'
                    if (confidence === 'high') bgColor = 'bg-green-400 dark:bg-green-600'
                    else if (confidence === 'medium') bgColor = 'bg-yellow-400 dark:bg-yellow-600'
                    else if (confidence === 'low') bgColor = 'bg-red-400 dark:bg-red-600'

                    return (
                      <button
                        key={index}
                        onClick={() => onStepClick?.(index)}
                        className={`w-8 h-8 rounded text-xs font-medium transition-all ${bgColor} ${
                          isCurrent ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
                        } hover:opacity-80`}
                        title={`Step ${index + 1}: ${title} ${confidence ? `(${confidence} confidence)` : ''}`}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-600 dark:text-dark-text-muted">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-green-400 dark:bg-green-600" />
                    <span>High</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-yellow-400 dark:bg-yellow-600" />
                    <span>Medium</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-red-400 dark:bg-red-600" />
                    <span>Low</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Decision Training Stats */}
          {onToggleSkipCommitAnalytics && (
            <section>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Decision Training
              </h3>
              <button
                onClick={onToggleSkipCommitAnalytics}
                className="w-full p-3 text-left bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  View skip/commit analytics
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Track your exam-time decision patterns
                </p>
              </button>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-app">
          <p className="text-xs text-gray-500 dark:text-dark-text-muted text-center">
            Press <kbd className="px-1.5 py-0.5 bg-white dark:bg-dark-card-soft border border-gray-300 dark:border-dark-border rounded text-xs">Esc</kbd> to close
          </p>
        </div>
      </div>
    </>
  )
}

// Button to open Coach Tools panel
interface CoachToolsButtonProps {
  onClick: () => void
  hasAlerts?: boolean
  alertCount?: number
}

export function CoachToolsButton({ onClick, hasAlerts = false, alertCount = 0 }: CoachToolsButtonProps) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-lg transition-colors"
      title="Open Coach Tools"
    >
      <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300 hidden sm:inline">
        Coach Tools
      </span>
      {hasAlerts && alertCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
          {alertCount > 9 ? '9+' : alertCount}
        </span>
      )}
    </button>
  )
}

// Hook for managing panel state with session persistence
export function useCoachToolsPanel() {
  const [isOpen, setIsOpen] = useState(false)

  // Load initial state from session storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (saved === 'true') {
        setIsOpen(true)
      }
    }
  }, [])

  const open = useCallback(() => {
    setIsOpen(true)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'true')
    }
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_STORAGE_KEY, 'false')
    }
  }, [])

  const toggle = useCallback(() => {
    setIsOpen(prev => {
      const newValue = !prev
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_STORAGE_KEY, String(newValue))
      }
      return newValue
    })
  }, [])

  return { isOpen, open, close, toggle }
}
