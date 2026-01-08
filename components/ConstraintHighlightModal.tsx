/**
 * ConstraintHighlightModal Component
 *
 * Modal that displays a highlighted constraint when a student
 * may have missed an important detail in the problem statement.
 */

'use client'

import { useEffect, useRef } from 'react'
import type { ConstraintHighlight, TextPosition } from '@/types/constraintHighlight'

interface ConstraintHighlightModalProps {
  constraint: ConstraintHighlight
  position: TextPosition
  problemText: string
  stepIndex: number
  onAcknowledge: () => void
  onDismiss: () => void
}

export default function ConstraintHighlightModal({
  constraint,
  position,
  problemText,
  stepIndex,
  onAcknowledge,
  onDismiss,
}: ConstraintHighlightModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Focus trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  // Get highlighted text context
  const getHighlightedContext = () => {
    const start = Math.max(0, position.start - 30)
    const end = Math.min(problemText.length, position.end + 30)
    const before = problemText.slice(start, position.start)
    const highlighted = problemText.slice(position.start, position.end)
    const after = problemText.slice(position.end, end)
    
    return { before, highlighted, after, hasEllipsisBefore: start > 0, hasEllipsisAfter: end < problemText.length }
  }

  const context = getHighlightedContext()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden"
        role="dialog"
        aria-labelledby="constraint-title"
        aria-describedby="constraint-description"
      >
        {/* Header */}
        <div className="bg-amber-50 dark:bg-amber-900/30 px-6 py-4 border-b border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl" role="img" aria-label="lightbulb">💡</span>
            <h2 id="constraint-title" className="text-lg font-semibold text-amber-800 dark:text-amber-200">
              Did you notice this constraint?
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Highlighted text */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {context.hasEllipsisBefore && '...'}
              {context.before}
              <mark className="bg-amber-200 dark:bg-amber-600 px-1 rounded font-medium">
                {context.highlighted}
              </mark>
              {context.after}
              {context.hasEllipsisAfter && '...'}
            </p>
          </div>

          {/* Constraint explanation */}
          <div id="constraint-description" className="space-y-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {constraint.displayText}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {constraint.hint}
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 mt-2">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Implication:</strong> {constraint.implication}
              </p>
            </div>
          </div>

          {/* Category badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300">
              {constraint.category}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Step {stepIndex + 1}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-3">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Skip
          </button>
          <button
            onClick={onAcknowledge}
            className="px-4 py-2 text-sm bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium"
          >
            Got it! I&apos;ll reconsider
          </button>
        </div>
      </div>
    </div>
  )
}
