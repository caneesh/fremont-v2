'use client'

import { useState, useEffect } from 'react'
import type { ConstraintHighlight, TextPosition } from '@/types/constraintHighlight'

// =============================================================================
// TYPES
// =============================================================================

export interface ConstraintHighlightModalProps {
  constraint: ConstraintHighlight
  position: TextPosition
  problemText: string
  stepIndex: number
  onAcknowledge: () => void
  onDismiss: () => void
}

// =============================================================================
// CATEGORY STYLES
// =============================================================================

const categoryStyles: Record<string, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  surface: {
    icon: '🏔️',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    borderColor: 'border-blue-300 dark:border-blue-700',
  },
  motion: {
    icon: '🏃',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    borderColor: 'border-green-300 dark:border-green-700',
  },
  connection: {
    icon: '🔗',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    borderColor: 'border-purple-300 dark:border-purple-700',
  },
  force: {
    icon: '💪',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/30',
    borderColor: 'border-orange-300 dark:border-orange-700',
  },
  energy: {
    icon: '⚡',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    borderColor: 'border-amber-300 dark:border-amber-700',
  },
  symmetry: {
    icon: '⚖️',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-50 dark:bg-indigo-900/30',
    borderColor: 'border-indigo-300 dark:border-indigo-700',
  },
  reference: {
    icon: '📍',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-50 dark:bg-rose-900/30',
    borderColor: 'border-rose-300 dark:border-rose-700',
  },
  approximation: {
    icon: '≈',
    color: 'text-teal-600 dark:text-teal-400',
    bgColor: 'bg-teal-50 dark:bg-teal-900/30',
    borderColor: 'border-teal-300 dark:border-teal-700',
  },
}

// =============================================================================
// HELPER FUNCTION
// =============================================================================

function highlightKeywordInText(
  text: string,
  position: TextPosition,
  keyword: string
): React.ReactNode {
  // Find the actual keyword position (case-insensitive)
  const lowerText = text.toLowerCase()
  const lowerKeyword = keyword.toLowerCase()
  const keywordIndex = lowerText.indexOf(lowerKeyword)

  if (keywordIndex === -1) {
    // Keyword not found, return original text
    return text
  }

  const before = text.slice(0, keywordIndex)
  const highlighted = text.slice(keywordIndex, keywordIndex + keyword.length)
  const after = text.slice(keywordIndex + keyword.length)

  // Show context around the keyword (100 chars before and after)
  const contextStart = Math.max(0, keywordIndex - 100)
  const contextEnd = Math.min(text.length, keywordIndex + keyword.length + 100)

  const prefix = contextStart > 0 ? '...' : ''
  const suffix = contextEnd < text.length ? '...' : ''

  const contextBefore = text.slice(contextStart, keywordIndex)
  const contextAfter = text.slice(keywordIndex + keyword.length, contextEnd)

  return (
    <span>
      {prefix}
      {contextBefore}
      <mark className="bg-yellow-300 dark:bg-yellow-600 px-1 rounded font-semibold">
        {highlighted}
      </mark>
      {contextAfter}
      {suffix}
    </span>
  )
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ConstraintHighlightModal({
  constraint,
  position,
  problemText,
  stepIndex,
  onAcknowledge,
  onDismiss,
}: ConstraintHighlightModalProps) {
  const [showImplication, setShowImplication] = useState(false)

  const style = categoryStyles[constraint.category] || categoryStyles.surface

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200 border-2 ${style.borderColor}`}>
        {/* Header */}
        <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${style.bgColor}`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-white dark:bg-gray-700 flex items-center justify-center text-2xl shadow-sm`}>
              {style.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Did You Notice This?
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Step {stepIndex + 1} &bull; {constraint.category.charAt(0).toUpperCase() + constraint.category.slice(1)} constraint
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Constraint Display */}
          <div className={`p-4 rounded-lg ${style.bgColor} border ${style.borderColor}`}>
            <p className={`font-semibold ${style.color} mb-2`}>
              {constraint.displayText}
            </p>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              {constraint.hint}
            </p>
          </div>

          {/* Problem Text with Highlight */}
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
              In the problem:
            </p>
            <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 italic">
              {highlightKeywordInText(problemText, position, constraint.keyword)}
            </div>
          </div>

          {/* Implication (Expandable) */}
          <div>
            <button
              onClick={() => setShowImplication(!showImplication)}
              className={`flex items-center gap-2 text-sm ${style.color} hover:underline`}
            >
              <svg
                className={`w-4 h-4 transition-transform ${showImplication ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              {showImplication ? 'Hide' : 'Show'} what this means for your solution
            </button>

            {showImplication && (
              <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                <strong>Implication:</strong> {constraint.implication}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
          >
            Skip for now
          </button>
          <button
            onClick={onAcknowledge}
            className={`px-6 py-2 rounded-lg font-medium text-white transition-colors ${
              constraint.category === 'surface' ? 'bg-blue-600 hover:bg-blue-700' :
              constraint.category === 'motion' ? 'bg-green-600 hover:bg-green-700' :
              constraint.category === 'connection' ? 'bg-purple-600 hover:bg-purple-700' :
              constraint.category === 'force' ? 'bg-orange-600 hover:bg-orange-700' :
              constraint.category === 'energy' ? 'bg-amber-600 hover:bg-amber-700' :
              constraint.category === 'symmetry' ? 'bg-indigo-600 hover:bg-indigo-700' :
              constraint.category === 'reference' ? 'bg-rose-600 hover:bg-rose-700' :
              'bg-teal-600 hover:bg-teal-700'
            }`}
          >
            Got it, I&apos;ll reconsider
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConstraintHighlightModal
