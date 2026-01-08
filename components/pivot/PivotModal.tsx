'use client'

import { useState } from 'react'
import type { PivotQuestion } from '@/types/pivot'

// =============================================================================
// TYPES
// =============================================================================

export interface PivotModalProps {
  pivot: PivotQuestion
  stepIndex: number
  onAnswer: (answer: string, wasHelpful: boolean) => void
  onSkip: () => void
  disabled?: boolean
}

// =============================================================================
// CATEGORY ICONS
// =============================================================================

const categoryIcons: Record<string, { icon: string; color: string; bgColor: string }> = {
  simplify: {
    icon: '🔍',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  analogy: {
    icon: '🔗',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  constraint: {
    icon: '🔒',
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  decompose: {
    icon: '📋',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  visualize: {
    icon: '📊',
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  reverse: {
    icon: '↩️',
    color: 'text-rose-600 dark:text-rose-400',
    bgColor: 'bg-rose-100 dark:bg-rose-900/30',
  },
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PivotModal({
  pivot,
  stepIndex,
  onAnswer,
  onSkip,
  disabled = false,
}: PivotModalProps) {
  const [answer, setAnswer] = useState('')
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null)

  const categoryStyle = categoryIcons[pivot.category] || categoryIcons.simplify

  const handleSubmit = () => {
    if (pivot.type === 'mcq' && !selectedChoice) return
    if (pivot.type === 'short' && answer.trim().length < 5) return

    // For reflection, show feedback section
    if (pivot.type === 'reflection' && wasHelpful === null) {
      setShowFeedback(true)
      return
    }

    const finalAnswer = pivot.type === 'mcq' ? selectedChoice! : answer
    onAnswer(finalAnswer, wasHelpful ?? true)
  }

  const handleFeedbackSubmit = (helpful: boolean) => {
    setWasHelpful(helpful)
    const finalAnswer = pivot.type === 'mcq' ? selectedChoice! : (answer || 'reflected')
    onAnswer(finalAnswer, helpful)
  }

  const canSubmit = () => {
    if (disabled) return false
    if (pivot.type === 'mcq') return selectedChoice !== null
    if (pivot.type === 'short') return answer.trim().length >= 5
    return true // Reflection always submittable
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${categoryStyle.bgColor} flex items-center justify-center text-xl`}>
              {categoryStyle.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Let&apos;s Think About This
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Step {stepIndex + 1} • {pivot.category.charAt(0).toUpperCase() + pivot.category.slice(1)} question
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!showFeedback ? (
            <>
              {/* Question */}
              <p className="text-gray-900 dark:text-white text-lg mb-6">
                {pivot.questionText}
              </p>

              {/* MCQ Choices */}
              {pivot.type === 'mcq' && pivot.choices && (
                <div className="space-y-3 mb-6">
                  {pivot.choices.map((choice, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedChoice(choice)}
                      disabled={disabled}
                      className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                        selectedChoice === choice
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-gray-900 dark:text-white">{choice}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Short Answer */}
              {pivot.type === 'short' && (
                <div className="mb-6">
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={disabled}
                    placeholder="Type your answer here..."
                    className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {answer.length}/5 characters minimum
                  </p>
                </div>
              )}

              {/* Reflection Prompt */}
              {pivot.type === 'reflection' && (
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Take a moment to think about this. When you&apos;re ready, click &quot;I&apos;ve Thought About It&quot;.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Feedback Section */
            <div className="text-center">
              <p className="text-gray-900 dark:text-white text-lg mb-4">
                Was this helpful for your understanding?
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => handleFeedbackSubmit(true)}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  Yes, it helped!
                </button>
                <button
                  onClick={() => handleFeedbackSubmit(false)}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium"
                >
                  Not really
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showFeedback && (
          <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
            <button
              onClick={onSkip}
              disabled={disabled}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Skip for now
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit()}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                canSubmit()
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-400 cursor-not-allowed'
              }`}
            >
              {pivot.type === 'reflection' ? "I've Thought About It" : 'Submit'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PivotModal
