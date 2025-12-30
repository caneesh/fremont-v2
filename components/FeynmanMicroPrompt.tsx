'use client'

import { useState, useCallback } from 'react'
import type {
  FeynmanValidationResult,
  FeynmanPromptConfig,
  ClarityScore
} from '@/types/feynman'

interface FeynmanMicroPromptProps {
  config: FeynmanPromptConfig
  problemStatement?: string
  onValidated: (passed: boolean, result: FeynmanValidationResult) => void
  onSkip?: () => void
}

export default function FeynmanMicroPrompt({
  config,
  problemStatement,
  onValidated,
  onSkip
}: FeynmanMicroPromptProps) {
  const [explanation, setExplanation] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [result, setResult] = useState<FeynmanValidationResult | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [previousScores, setPreviousScores] = useState<ClarityScore[]>([])

  const minScore = config.minScore ?? 4
  const maxAttempts = config.maxAttempts ?? 3

  const handleSubmit = useCallback(async () => {
    if (!explanation.trim() || isValidating) return

    setIsValidating(true)

    try {
      const response = await fetch('/api/feynman-validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          explanation: explanation.trim(),
          topic: config.topic,
          context: config.context,
          problemStatement
        })
      })

      const data = await response.json()

      if (data.success && data.result) {
        setResult(data.result)
        setAttempts(prev => prev + 1)
        setPreviousScores(prev => [...prev, data.result.clarityScore])

        if (data.result.clarityScore >= minScore) {
          onValidated(true, data.result)
        } else {
          onValidated(false, data.result)
        }
      } else {
        console.error('Validation failed:', data.error)
      }
    } catch (error) {
      console.error('Error validating explanation:', error)
    } finally {
      setIsValidating(false)
    }
  }, [explanation, isValidating, config, problemStatement, minScore, onValidated])

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip()
    }
  }, [onSkip])

  const isPassed = result && result.clarityScore >= minScore
  const canSkip = attempts >= maxAttempts && !isPassed

  const getScoreColor = (score: ClarityScore) => {
    if (score >= 4) return 'text-green-600 dark:text-green-400'
    if (score === 3) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-500 dark:text-red-400'
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'VALID_MECHANISM':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'PARTIAL_UNDERSTANDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'VAGUE_INTUITION':
      case 'MEMORIZED_PHRASE':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
      case 'CIRCULAR_LOGIC':
      case 'INCORRECT_MECHANISM':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
    }
  }

  const formatCategory = (category: string) => {
    return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl border border-purple-200 dark:border-purple-800 p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-purple-900 dark:text-purple-100">
            Feynman Check
          </h3>
          <p className="text-sm text-purple-700 dark:text-purple-300">
            Explain in your own words before calculating
          </p>
        </div>
        {attempts > 0 && (
          <div className="text-sm text-purple-600 dark:text-purple-400">
            Attempt {attempts}/{maxAttempts}
          </div>
        )}
      </div>

      {/* Question */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 border border-purple-100 dark:border-purple-900">
        <p className="text-gray-800 dark:text-gray-200 font-medium">
          {config.question}
        </p>
      </div>

      {/* Input Area */}
      {!isPassed && (
        <div className="mb-4">
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder="Explain WHY this happens, not just WHAT happens..."
            className="w-full h-32 px-4 py-3 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            disabled={isValidating}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">{explanation.length} characters</span>
            <span className="text-xs text-purple-600 dark:text-purple-400">Use cause-and-effect reasoning</span>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`mb-4 p-4 rounded-lg ${isPassed ? 'bg-green-50 dark:bg-green-900/20 border border-green-200' : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`text-2xl font-bold ${getScoreColor(result.clarityScore)}`}>{result.clarityScore}/5</div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(result.category)}`}>
              {formatCategory(result.category)}
            </span>
            {isPassed && <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Passed</span>}
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{result.feedback}</p>
          {result.followUpQuestion && !isPassed && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-amber-200">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Think about this:</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{result.followUpQuestion}</p>
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-3">
        {!isPassed && (
          <button onClick={handleSubmit} disabled={!explanation.trim() || isValidating}
            className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isValidating ? 'Checking...' : (attempts > 0 ? 'Try Again' : 'Check Understanding')}
          </button>
        )}
        {isPassed && (
          <div className="flex-1 px-4 py-2.5 bg-green-100 text-green-800 rounded-lg font-medium text-center">
            Great understanding! Continue to calculation.
          </div>
        )}
        {canSkip && onSkip && (
          <button onClick={handleSkip} className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg">Skip</button>
        )}
      </div>
    </div>
  )
}
