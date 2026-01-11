'use client'

import { useState } from 'react'
import { COMPLETION_ACTIONS, type CompletionActionId } from '@/lib/solveUIConfig'

interface SolveCompletionActionsProps {
  /** Whether the "Continue the Path" (next challenge) action is available */
  canGenerateNextChallenge: boolean
  /** Whether the "What-If Simulation" action is available */
  canLaunchSimulation: boolean
  /** Handler for primary action: Generate next problem */
  onContinuePath: () => void
  /** Handler for "Practice Similar Problems" */
  onReinforce: () => void
  /** Handler for "Launch Simulation" */
  onExploreWhatIf: () => void
  /** Handler for "Review Concepts" - opens concepts drawer */
  onReviewConcepts: () => void
  /** Problem domain/subdomain for display */
  topic?: string
}

/**
 * SolveCompletionActions - Post-completion decision layer
 *
 * Shown only after the user completes the final step (or marks as solved).
 * Provides a single "Problem Completed" card with:
 * - Primary CTA: "Continue the Path" (generate next problem)
 * - Secondary actions: Reinforce, What-If, Review Concepts
 *
 * This consolidates previously scattered post-solve actions into one calm decision point.
 */
export default function SolveCompletionActions({
  canGenerateNextChallenge,
  canLaunchSimulation,
  onContinuePath,
  onReinforce,
  onExploreWhatIf,
  onReviewConcepts,
  topic,
}: SolveCompletionActionsProps) {
  const [hoveredAction, setHoveredAction] = useState<CompletionActionId | null>(null)

  return (
    <div
      className="bg-white dark:bg-dark-card rounded-lg border border-slate-200 dark:border-dark-border overflow-hidden"
      data-testid="solve-completion-actions"
    >
      {/* Header */}
      <div className="px-6 py-5 bg-emerald-600 dark:bg-emerald-700">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Problem Completed!</h3>
            {topic && (
              <p className="text-emerald-100 text-sm mt-0.5">{topic}</p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 space-y-4">
        {/* Primary Action */}
        {canGenerateNextChallenge && (
          <button
            onClick={onContinuePath}
            onMouseEnter={() => setHoveredAction('continue-path')}
            onMouseLeave={() => setHoveredAction(null)}
            className={`
              w-full flex items-center gap-4 p-4 rounded-lg
              bg-emerald-600 hover:bg-emerald-700
              dark:bg-emerald-600 dark:hover:bg-emerald-500
              text-white font-medium
              transition-colors
            `}
            data-testid="completion-action-continue-path"
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
            <div className="text-left flex-1">
              <span className="block text-lg">{COMPLETION_ACTIONS.primary.label}</span>
              <span className="block text-sm text-emerald-100 mt-0.5">
                {COMPLETION_ACTIONS.primary.description}
              </span>
            </div>
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        )}

        {/* Secondary Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Reinforce This Concept */}
          <button
            onClick={onReinforce}
            onMouseEnter={() => setHoveredAction('reinforce-concept')}
            onMouseLeave={() => setHoveredAction(null)}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-lg
              bg-white dark:bg-slate-700
              border border-gray-200 dark:border-slate-600
              hover:border-blue-400 dark:hover:border-blue-400
              hover:bg-blue-50 dark:hover:bg-blue-900/30
              transition-all duration-200
              ${hoveredAction === 'reinforce-concept' ? 'border-blue-400 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30' : ''}
            `}
            data-testid="completion-action-reinforce"
          >
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100 text-center">
              {COMPLETION_ACTIONS.secondary[0].label}
            </span>
          </button>

          {/* Explore What-If Scenarios */}
          {canLaunchSimulation && (
            <button
              onClick={onExploreWhatIf}
              onMouseEnter={() => setHoveredAction('explore-whatif')}
              onMouseLeave={() => setHoveredAction(null)}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-lg
                bg-white dark:bg-slate-700
                border border-gray-200 dark:border-slate-600
                hover:border-indigo-400 dark:hover:border-indigo-400
                hover:bg-indigo-50 dark:hover:bg-indigo-900/30
                transition-all duration-200
                ${hoveredAction === 'explore-whatif' ? 'border-indigo-400 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30' : ''}
              `}
              data-testid="completion-action-whatif"
            >
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-slate-100 text-center">
                {COMPLETION_ACTIONS.secondary[1].label}
              </span>
            </button>
          )}

          {/* Review Concepts Used */}
          <button
            onClick={onReviewConcepts}
            onMouseEnter={() => setHoveredAction('review-concepts')}
            onMouseLeave={() => setHoveredAction(null)}
            className={`
              flex flex-col items-center gap-2 p-4 rounded-lg
              bg-white dark:bg-slate-700
              border border-gray-200 dark:border-slate-600
              hover:border-amber-400 dark:hover:border-amber-400
              hover:bg-amber-50 dark:hover:bg-amber-900/30
              transition-all duration-200
              ${hoveredAction === 'review-concepts' ? 'border-amber-400 dark:border-amber-400 bg-amber-50 dark:bg-amber-900/30' : ''}
            `}
            data-testid="completion-action-review-concepts"
          >
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <svg
                className="w-5 h-5 text-amber-600 dark:text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-slate-100 text-center">
              {COMPLETION_ACTIONS.secondary[2].label}
            </span>
          </button>
        </div>

        {/* Tip */}
        <p className="text-xs text-gray-500 dark:text-slate-400 text-center pt-2">
          Tip: Continuing the path builds mastery by progressively challenging you.
        </p>
      </div>
    </div>
  )
}
