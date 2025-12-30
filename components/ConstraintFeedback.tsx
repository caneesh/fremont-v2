'use client'

import React, { useState } from 'react'
import type {
  ConstraintCollision,
  SocraticDialogue,
  CollisionSeverity,
  CollisionType,
} from '@/types/constraintCollision'

interface ConstraintFeedbackProps {
  collisions: ConstraintCollision[]
  dialogue?: SocraticDialogue
  onDismiss?: () => void
  onHighlightProblem?: (startIndex: number, endIndex: number) => void
}

const SEVERITY_STYLES: Record<CollisionSeverity, {
  border: string
  bg: string
  icon: string
  iconBg: string
  text: string
  label: string
}> = {
  high: {
    border: 'border-red-300 dark:border-red-700',
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-100 dark:bg-red-900/40',
    text: 'text-red-800 dark:text-red-200',
    label: 'Critical',
  },
  medium: {
    border: 'border-amber-300 dark:border-amber-700',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    text: 'text-amber-800 dark:text-amber-200',
    label: 'Warning',
  },
  low: {
    border: 'border-yellow-300 dark:border-yellow-700',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    icon: 'text-yellow-600 dark:text-yellow-400',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/40',
    text: 'text-yellow-800 dark:text-yellow-200',
    label: 'Note',
  },
}

const COLLISION_TYPE_LABELS: Record<CollisionType, string> = {
  OMISSION: 'Missing Constraint',
  ADDITION: 'Invalid Assumption',
  REVERSAL: 'Reversed Constraint',
  SUBSTITUTION: 'Wrong Value',
}

export default function ConstraintFeedback({
  collisions,
  dialogue,
  onDismiss,
  onHighlightProblem,
}: ConstraintFeedbackProps) {
  const [showFollowUps, setShowFollowUps] = useState(false)
  const [expandedCollisions, setExpandedCollisions] = useState<Set<string>>(new Set())

  if (collisions.length === 0) {
    return null
  }

  // Get highest severity collision for main display
  const primaryCollision = collisions.reduce((prev, curr) => {
    const severityOrder = { high: 3, medium: 2, low: 1 }
    return severityOrder[curr.severity] > severityOrder[prev.severity] ? curr : prev
  })

  const styles = SEVERITY_STYLES[primaryCollision.severity]

  const toggleCollision = (id: string) => {
    const newExpanded = new Set(expandedCollisions)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCollisions(newExpanded)
  }

  const handleHighlight = () => {
    if (dialogue?.highlightProblemText && onHighlightProblem) {
      onHighlightProblem(
        dialogue.highlightProblemText.startIndex,
        dialogue.highlightProblemText.endIndex
      )
    }
  }

  return (
    <div className={`rounded-lg border-2 ${styles.border} ${styles.bg} p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center`}>
            <svg
              className={`w-6 h-6 ${styles.icon}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${styles.text}`}>
              Constraint Check
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {collisions.length === 1
                ? '1 constraint conflict detected'
                : `${collisions.length} constraint conflicts detected`}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Socratic Question */}
      {dialogue && (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0">
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
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-slate-800 dark:text-slate-200 font-medium">
                {dialogue.question}
              </p>

              {/* Follow-up prompts */}
              {dialogue.followUpPrompts.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() => setShowFollowUps(!showFollowUps)}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${showFollowUps ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {showFollowUps ? 'Hide hints' : 'Need more hints?'}
                  </button>

                  {showFollowUps && (
                    <ul className="mt-2 space-y-2 pl-4 border-l-2 border-indigo-200 dark:border-indigo-700">
                      {dialogue.followUpPrompts.map((prompt, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-slate-600 dark:text-slate-400"
                        >
                          {prompt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Problem Reference Hint */}
      {dialogue?.problemReferenceHint && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          onClick={handleHighlight}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleHighlight()}
        >
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Hint:</strong> {dialogue.problemReferenceHint}
          </span>
          {dialogue.highlightProblemText && (
            <svg
              className="w-4 h-4 text-blue-500 dark:text-blue-400 ml-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          )}
        </div>
      )}

      {/* Collision Details (Expandable) */}
      {collisions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Detected Issues:
          </h4>
          {collisions.map((collision) => {
            const collisionStyles = SEVERITY_STYLES[collision.severity]
            const isExpanded = expandedCollisions.has(collision.id)

            return (
              <div
                key={collision.id}
                className={`rounded-lg border ${collisionStyles.border} overflow-hidden`}
              >
                <button
                  onClick={() => toggleCollision(collision.id)}
                  className={`w-full flex items-center justify-between p-3 ${collisionStyles.bg} hover:opacity-90 transition-opacity`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${collisionStyles.iconBg} ${collisionStyles.text}`}
                    >
                      {collisionStyles.label}
                    </span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {COLLISION_TYPE_LABELS[collision.collisionType]}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isExpanded && (
                  <div className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {collision.explanation}
                    </p>
                    {collision.studentAssumption && (
                      <div className="mt-2 p-2 rounded bg-slate-100 dark:bg-slate-700/50">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          <strong>Your assumption:</strong> {collision.studentAssumption.description}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Related Concepts */}
      {dialogue?.relatedConceptIds && dialogue.relatedConceptIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <span className="text-xs text-slate-500 dark:text-slate-400">Related:</span>
          {dialogue.relatedConceptIds.map((conceptId) => (
            <span
              key={conceptId}
              className="px-2 py-1 text-xs rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              {conceptId.replace(/-/g, ' ')}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
