'use client'

import { useState } from 'react'
import type { SanityCheck } from '@/types/scaffold'
import MathRenderer from './MathRenderer'

interface SanityCheckStepProps {
  sanityCheck: SanityCheck
}

export default function SanityCheckStep({ sanityCheck }: SanityCheckStepProps) {
  const [userAnswer, setUserAnswer] = useState('')
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
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg shadow-lg p-8 border-2 border-indigo-300">
      <div className="flex items-center space-x-3 mb-6">
        <span className="text-4xl">{getCheckTypeEmoji(sanityCheck.type)}</span>
        <div>
          <h3 className="text-2xl font-bold text-indigo-900">
            Final Reality Check
          </h3>
          <p className="text-sm text-indigo-700">
            Does your solution make physical sense?
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6 mb-4 border border-indigo-200">
        <h4 className="font-semibold text-indigo-900 mb-3">
          🔬 Sanity Check Question:
        </h4>
        <MathRenderer text={sanityCheck.question} className="text-lg" />
      </div>

      <div className="bg-white rounded-lg p-6 mb-4 border border-indigo-200">
        <label className="block font-semibold text-indigo-900 mb-3">
          Your Prediction:
        </label>
        <textarea
          placeholder="What do you expect to happen? Why does this make physical sense?"
          className="w-full px-4 py-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          rows={4}
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
        />
      </div>

      {!showAnswer ? (
        <button
          onClick={() => setShowAnswer(true)}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
        >
          Reveal Expected Behavior
        </button>
      ) : (
        <div className="bg-green-50 rounded-lg p-6 border-2 border-green-300">
          <h4 className="font-semibold text-green-900 mb-3 flex items-center">
            <span className="mr-2">✅</span>
            Expected Physical Behavior:
          </h4>
          <MathRenderer text={sanityCheck.expectedBehavior} />

          <div className="mt-4 pt-4 border-t border-green-200">
            <p className="text-sm text-green-800">
              <strong>Why this matters:</strong> If your solution doesn&apos;t match this behavior,
              there may be an error in your reasoning. This is a crucial physics intuition check!
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
