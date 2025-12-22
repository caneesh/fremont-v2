'use client'

import { useState } from 'react'
import { validateExplanation, countLines, countWords } from '@/types/explainToFriend'
import type { ExplainToFriendResponse } from '@/types/explainToFriend'

interface ExplainToFriendProps {
  problemText: string
  steps: string[]
  topic: string
  onComplete: (explanation: string, quality: string) => void
  onSkip?: () => void
}

export default function ExplainToFriend({
  problemText,
  steps,
  topic,
  onComplete,
  onSkip
}: ExplainToFriendProps) {
  const [explanation, setExplanation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [aiResponse, setAiResponse] = useState<ExplainToFriendResponse | null>(null)
  const [attemptCount, setAttemptCount] = useState(0)

  const lineCount = countLines(explanation)
  const wordCount = countWords(explanation)

  const handleSubmit = async () => {
    // Validate format first
    const validation = validateExplanation(explanation)

    if (!validation.valid) {
      setValidationErrors(validation.errors)
      return
    }

    setValidationErrors([])
    setIsSubmitting(true)

    try {
      // Get AI assessment
      const response = await fetch('/api/explain-to-friend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText,
          explanation,
          steps,
          topic,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to assess explanation')
      }

      const assessment: ExplainToFriendResponse = await response.json()
      setAiResponse(assessment)
      setAttemptCount(attemptCount + 1)

      // If quality is good enough, proceed
      if (assessment.canProceed) {
        setTimeout(() => {
          onComplete(explanation, assessment.quality)
        }, 2000) // Give time to read feedback
      }
    } catch (error) {
      console.error('Error assessing explanation:', error)
      setValidationErrors(['Failed to assess explanation. Please try again.'])
    } finally {
      setIsSubmitting(false)
    }
  }

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-700 bg-green-50 border-green-300'
      case 'good': return 'text-blue-700 bg-blue-50 border-blue-300'
      case 'needs_work': return 'text-yellow-700 bg-yellow-50 border-yellow-300'
      default: return 'text-gray-700 bg-gray-50 border-gray-300'
    }
  }

  const getQualityIcon = (quality: string) => {
    switch (quality) {
      case 'excellent': return '🌟'
      case 'good': return '👍'
      case 'needs_work': return '💭'
      default: return ''
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg border-2 border-blue-400 p-6 animate-fade-in">
      <div className="mb-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="text-4xl">💡</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Explain to a Friend
            </h2>
            <p className="text-gray-700 text-base leading-relaxed">
              Before marking this problem as mastered, explain the solution as if you're teaching a friend.
              <strong className="text-blue-600"> Use exactly 3 lines.</strong>
            </p>
            <p className="text-sm text-gray-600 mt-2 italic">
              "If you can't explain it simply, you don't understand it well enough." — Richard Feynman
            </p>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <p className="text-sm font-semibold text-blue-900 mb-2">What to include:</p>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Line 1:</strong> What's the main concept or approach?</li>
            <li>• <strong>Line 2:</strong> What's the key step or insight?</li>
            <li>• <strong>Line 3:</strong> Why does this method work?</li>
          </ul>
        </div>
      </div>

      {/* Explanation Input */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-gray-700">
            Your Explanation:
          </label>
          <div className="text-xs text-gray-500">
            {lineCount} / 3 lines • {wordCount} words
          </div>
        </div>

        <textarea
          value={explanation}
          onChange={(e) => {
            setExplanation(e.target.value)
            setValidationErrors([])
            setAiResponse(null)
          }}
          placeholder="Line 1: The main approach is...&#10;Line 2: The key step is...&#10;Line 3: This works because..."
          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm resize-y"
          style={{ minHeight: '120px' }}
          disabled={isSubmitting}
        />

        {/* Live character count feedback */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <div className={`${
            lineCount === 3 ? 'text-green-600 font-semibold' :
            lineCount > 3 ? 'text-red-600 font-semibold' :
            'text-gray-500'
          }`}>
            {lineCount === 3 ? '✓ Perfect line count' :
             lineCount > 3 ? '⚠ Too many lines' :
             `${3 - lineCount} more line${3 - lineCount !== 1 ? 's' : ''} needed`}
          </div>
          <div className={wordCount > 100 ? 'text-red-600 font-semibold' : 'text-gray-500'}>
            {wordCount > 100 && '⚠ '} Max 100 words
          </div>
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded mb-4">
          <div className="text-sm font-semibold text-red-900 mb-1">Please fix these issues:</div>
          <ul className="text-sm text-red-700 space-y-1">
            {validationErrors.map((error, idx) => (
              <li key={idx}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* AI Feedback */}
      {aiResponse && (
        <div className={`border-2 rounded-lg p-4 mb-4 ${getQualityColor(aiResponse.quality)}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getQualityIcon(aiResponse.quality)}</span>
            <span className="font-bold text-base capitalize">
              {aiResponse.quality === 'needs_work' ? 'Needs Work' : aiResponse.quality}
            </span>
          </div>
          <p className="text-sm mb-3">{aiResponse.feedback}</p>

          {aiResponse.suggestions && aiResponse.suggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <p className="text-xs font-semibold mb-1">Suggestions:</p>
              <ul className="text-xs space-y-1">
                {aiResponse.suggestions.map((suggestion, idx) => (
                  <li key={idx}>• {suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {aiResponse.canProceed && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <p className="text-xs font-semibold text-green-800">
                ✓ Great! Proceeding to mark problem as solved...
              </p>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || !explanation.trim() || (aiResponse?.canProceed === true)}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Assessing...
            </>
          ) : attemptCount === 0 ? (
            'Submit Explanation'
          ) : (
            'Try Again'
          )}
        </button>

        {onSkip && attemptCount < 2 && (
          <button
            onClick={onSkip}
            className="px-4 py-3 text-gray-600 hover:text-gray-900 border-2 border-gray-300 rounded-lg hover:border-gray-400 font-medium transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>

      {attemptCount > 0 && !aiResponse?.canProceed && (
        <p className="text-xs text-gray-600 mt-3 text-center">
          Attempt {attemptCount} of 3 • Keep trying! Understanding deepens with each attempt.
        </p>
      )}
    </div>
  )
}
