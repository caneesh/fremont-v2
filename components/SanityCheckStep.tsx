'use client'

import { useState } from 'react'
import type { SanityCheck } from '@/types/scaffold'
import MathRenderer from './MathRenderer'

interface SanityCheckStepProps {
  sanityCheck: SanityCheck
  userAnswer: string
  onAnswerChange: (answer: string) => void
}

export default function SanityCheckStep({ sanityCheck, userAnswer, onAnswerChange }: SanityCheckStepProps) {
  const [showAnswer, setShowAnswer] = useState(false)

  const getCheckTypeEmoji = (type: string) => {
    switch (type) {
      case 'limit':
        return '🎯'
      case 'dimension':
        return '📏'
      case 'symmetry':
        return '⚖️'
      default:
        return '✅'
    }
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-lg shadow-lg dark:shadow-dark-lg p-8 border-2 border-indigo-300 dark:border-indigo-700">
      <div className="flex items-center space-x-3 mb-6">
        <span className="text-4xl">{getCheckTypeEmoji(sanityCheck.type)}</span>
        <div>
          <h3 className="text-2xl font-bold text-indigo-900 dark:text-indigo-200">
            Final Reality Check
          </h3>
          <p className="text-sm text-indigo-700 dark:text-indigo-400">
            Does your solution make physical sense?
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-lg p-6 mb-4 border border-indigo-200 dark:border-indigo-700">
        <h4 className="font-semibold text-indigo-900 dark:text-indigo-200 mb-3">
          🔬 Sanity Check Question:
        </h4>
        <MathRenderer text={sanityCheck.question} className="text-lg text-gray-900 dark:text-dark-text-primary" />
      </div>

      <div className="bg-white dark:bg-dark-card rounded-lg p-6 mb-4 border border-indigo-200 dark:border-indigo-700">
        <label className="block font-semibold text-indigo-900 dark:text-indigo-200 mb-3">
          Your Prediction:
        </label>
        <textarea
          placeholder="What do you expect to happen? Why does this make physical sense?"
          className="w-full px-4 py-3 border border-indigo-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-muted"
          rows={4}
          value={userAnswer}
          onChange={(e) => onAnswerChange(e.target.value)}
        />
      </div>

      {!showAnswer ? (
        <button
          onClick={() => setShowAnswer(true)}
          className="w-full px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg font-medium hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
        >
          Reveal Expected Behavior
        </button>
      ) : (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-6 border-2 border-green-300 dark:border-green-700">
          <h4 className="font-semibold text-green-900 dark:text-green-300 mb-3 flex items-center">
            <span className="mr-2">✅</span>
            Expected Physical Behavior:
          </h4>
          <MathRenderer text={sanityCheck.expectedBehavior} className="text-gray-900 dark:text-dark-text-primary" />

          <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
            <p className="text-sm text-green-800 dark:text-green-400">
              <strong>Why this matters:</strong> If your solution doesn&apos;t match this behavior,
              there may be an error in your reasoning. This is a crucial physics intuition check!
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-green-200 dark:border-green-700">
            <p className="text-sm text-green-800 dark:text-green-400 mb-3">
              <strong>Next step:</strong> If your prediction matches, click &quot;Mark as Solved&quot; above to complete this problem and reflect on your learning.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
