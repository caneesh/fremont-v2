'use client'

import { useEffect, useState } from 'react'
import type { SanityCheckMatrix as SanityCheckMatrixType, SanityCheckVariant, CheckStatus, Concept } from '@/types/scaffold'
import { authenticatedFetch } from '@/lib/api/apiClient'
import MathRenderer from './MathRenderer'

interface CheckState {
  status: CheckStatus
  prediction: string
  reasoning: string
  feedback: string | null
  feedbackType: 'correct' | 'partial' | 'misconception' | null
  attempts: number
}

interface SanityCheckMatrixProps {
  matrix: SanityCheckMatrixType
  problemText: string
  domain: string
  subdomain: string
  steps: Array<{ id: number; title: string }>
  concepts: Concept[]
  onAllChecksComplete: () => void
  onTargetStep?: (stepId: number) => void
}

type CheckType = 'limit' | 'symmetry' | 'dimension'

const SELF_CHECK_TOKEN_KEY = 'physiscaffold_self_check_tokens'
const DEFAULT_SELF_CHECK_TOKENS = 5

const CHECK_CONFIG: Record<CheckType, { icon: string; label: string; color: string; bgColor: string; borderColor: string }> = {
  limit: {
    icon: '🔬',
    label: 'Extreme Cases',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-200 dark:border-purple-500/30',
  },
  symmetry: {
    icon: '⚖️',
    label: 'Symmetry',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-500/30',
  },
  dimension: {
    icon: '📐',
    label: 'Dimensions',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-500/30',
  },
}

export default function SanityCheckMatrix({
  matrix,
  problemText,
  domain,
  subdomain,
  steps,
  concepts,
  onAllChecksComplete,
  onTargetStep,
}: SanityCheckMatrixProps) {
  const [activeCheck, setActiveCheck] = useState<CheckType>('limit')
  const [checkStates, setCheckStates] = useState<Record<CheckType, CheckState>>({
    limit: { status: 'available', prediction: '', reasoning: '', feedback: null, feedbackType: null, attempts: 0 },
    symmetry: { status: 'available', prediction: '', reasoning: '', feedback: null, feedbackType: null, attempts: 0 },
    dimension: { status: 'available', prediction: '', reasoning: '', feedback: null, feedbackType: null, attempts: 0 },
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tokensRemaining, setTokensRemaining] = useState<number | null>(null)
  const [tokenMessage, setTokenMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = sessionStorage.getItem(SELF_CHECK_TOKEN_KEY)
    const parsed = stored ? Number(stored) : Number.NaN
    const initial = Number.isFinite(parsed) ? parsed : DEFAULT_SELF_CHECK_TOKENS
    sessionStorage.setItem(SELF_CHECK_TOKEN_KEY, String(initial))
    setTokensRemaining(initial)
  }, [])

  const updateTokens = (nextValue: number) => {
    setTokensRemaining(nextValue)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SELF_CHECK_TOKEN_KEY, String(nextValue))
    }
  }

  const getVariant = (type: CheckType): SanityCheckVariant => {
    switch (type) {
      case 'limit': return matrix.limitCheck
      case 'symmetry': return matrix.symmetryCheck
      case 'dimension': return matrix.dimensionCheck
    }
  }

  const completedCount = Object.values(checkStates).filter(s => s.status === 'completed').length

  const handleInputChange = (field: 'prediction' | 'reasoning', value: string) => {
    setCheckStates(prev => ({
      ...prev,
      [activeCheck]: { ...prev[activeCheck], [field]: value },
    }))
  }

  const handleSubmit = async () => {
    if (tokensRemaining === null) return
    const state = checkStates[activeCheck]
    if (!state.prediction.trim() || !state.reasoning.trim()) return
    if (tokensRemaining !== null && tokensRemaining <= 0) {
      setTokenMessage('You have used all verify tokens for this session. Refresh to reset.')
      return
    }

    setIsSubmitting(true)
    setTokenMessage(null)
    setCheckStates(prev => ({
      ...prev,
      [activeCheck]: { ...prev[activeCheck], status: 'in_progress' },
    }))
    const nextTokenCount = tokensRemaining !== null ? Math.max(tokensRemaining - 1, 0) : null
    if (nextTokenCount !== null) {
      updateTokens(nextTokenCount)
    }

    try {
      const variant = getVariant(activeCheck)

      const response = await authenticatedFetch('/api/verify-reasoning', {
        method: 'POST',
        body: JSON.stringify({
          checkType: activeCheck,
          studentPrediction: state.prediction,
          studentReasoning: state.reasoning,
          variant,
          problemContext: {
            problemText,
            domain,
            subdomain,
            steps: steps.map(s => ({ id: s.id, title: s.title })),
            concepts: concepts.map(c => ({ id: c.id, name: c.name })),
          },
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to verify reasoning')
      }

      const result = await response.json()

      const newStatus: CheckStatus = result.reasoningValid ? 'completed' : 'available'

      setCheckStates(prev => {
        const updated = {
          ...prev,
          [activeCheck]: {
            ...prev[activeCheck],
            status: newStatus,
            feedback: result.feedback,
            feedbackType: result.feedbackType,
            attempts: prev[activeCheck].attempts + 1,
          },
        }

        // Check if all completed
        const allCompleted = Object.values(updated).every(s => s.status === 'completed')
        if (allCompleted) {
          setTimeout(() => onAllChecksComplete(), 500)
        }

        return updated
      })

      // If there's a target step suggestion, highlight it
      if (result.targetStepId && onTargetStep) {
        onTargetStep(result.targetStepId)
      }
    } catch (error) {
      console.error('Error verifying reasoning:', error)
      if (tokensRemaining !== null) {
        updateTokens(tokensRemaining)
      }
      setCheckStates(prev => ({
        ...prev,
        [activeCheck]: {
          ...prev[activeCheck],
          status: 'available',
          feedback: 'Something went wrong. Please try again.',
          feedbackType: null,
        },
      }))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTryAgain = () => {
    setCheckStates(prev => ({
      ...prev,
      [activeCheck]: {
        ...prev[activeCheck],
        feedback: null,
        feedbackType: null,
      },
    }))
    setTokenMessage(null)
  }

  const currentState = checkStates[activeCheck]
  const currentVariant = getVariant(activeCheck)
  const currentConfig = CHECK_CONFIG[activeCheck]

  return (
    <div data-testid="sanity-check" className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧪</span>
            <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">
              Verify Your Solution
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-dark-text-muted">
              {completedCount}/3 checks complete
            </span>
            {tokensRemaining !== null && (
              <span className="text-xs text-gray-500 dark:text-dark-text-muted">
                Tokens left: {tokensRemaining}
              </span>
            )}
            <div className="flex gap-1">
              {(['limit', 'symmetry', 'dimension'] as CheckType[]).map(type => (
                <div
                  key={type}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    checkStates[type].status === 'completed'
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-dark-border'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-dark-text-muted mt-1">
          Before trusting your answer, verify it makes physical sense using these three checks.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 dark:border-dark-border">
        {(['limit', 'symmetry', 'dimension'] as CheckType[]).map(type => {
          const config = CHECK_CONFIG[type]
          const state = checkStates[type]
          const isActive = activeCheck === type
          const isCompleted = state.status === 'completed'

          return (
            <button
              key={type}
              onClick={() => setActiveCheck(type)}
              className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 transition-colors relative ${
                isActive
                  ? `${config.bgColor} ${config.color} font-medium`
                  : 'text-gray-600 dark:text-dark-text-muted hover:bg-gray-50 dark:hover:bg-dark-card-soft'
              }`}
            >
              <span>{config.icon}</span>
              <span className="text-sm">{config.label}</span>
              {isCompleted && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Content Area */}
      <div className={`p-4 ${currentConfig.bgColor}`}>
        {/* Question Card */}
        <div className={`rounded-lg border ${currentConfig.borderColor} bg-white dark:bg-dark-card p-4 mb-4`}>
          <h4 className={`font-medium ${currentConfig.color} mb-2 flex items-center gap-2`}>
            <span>{currentConfig.icon}</span>
            {activeCheck === 'limit' && 'Extreme Case Check'}
            {activeCheck === 'symmetry' && 'Symmetry Check'}
            {activeCheck === 'dimension' && 'Dimensional Analysis'}
          </h4>
          <div className="text-gray-800 dark:text-dark-text-primary">
            <MathRenderer text={currentVariant.question} />
          </div>
          <p className="text-sm text-gray-600 dark:text-dark-text-muted mt-2 italic">
            {currentVariant.setupPrompt}
          </p>
        </div>

        {/* Completed State */}
        {currentState.status === 'completed' && (
          <div className="rounded-lg border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-900/20 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">✅</span>
              <div>
                <h4 className="font-medium text-green-800 dark:text-green-400 mb-1">
                  Excellent reasoning!
                </h4>
                <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                  {currentState.feedback}
                </p>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded border border-green-200 dark:border-green-500/20">
                  <p className="text-xs font-medium text-green-800 dark:text-green-400 mb-1">
                    💡 Physical Insight:
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {currentVariant.physicalInsight}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input State */}
        {currentState.status !== 'completed' && (
          <>
            {/* Feedback from previous attempt */}
            {currentState.feedback && currentState.feedbackType !== 'correct' && (
              <div className={`rounded-lg border p-4 mb-4 ${
                currentState.feedbackType === 'partial'
                  ? 'border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/20'
                  : 'border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">
                    {currentState.feedbackType === 'partial' ? '🤔' : '💭'}
                  </span>
                  <div>
                    <h4 className={`font-medium mb-1 ${
                      currentState.feedbackType === 'partial'
                        ? 'text-yellow-800 dark:text-yellow-400'
                        : 'text-red-800 dark:text-red-400'
                    }`}>
                      {currentState.feedbackType === 'partial' ? 'Getting closer!' : 'Think about this...'}
                    </h4>
                    <p className={`text-sm ${
                      currentState.feedbackType === 'partial'
                        ? 'text-yellow-700 dark:text-yellow-300'
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {currentState.feedback}
                    </p>
                    <button
                      onClick={handleTryAgain}
                      className="mt-2 text-sm font-medium text-gray-600 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text-primary"
                    >
                      Try again →
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tokenMessage && (
              <div className="rounded-lg border border-yellow-200 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-900/20 p-3 mb-4 text-sm text-yellow-800 dark:text-yellow-300">
                {tokenMessage}
              </div>
            )}

            {/* Prediction Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Your Prediction
              </label>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-2">
                What do you predict will happen? (Before doing any math!)
              </p>
              <textarea
                value={currentState.prediction}
                onChange={(e) => handleInputChange('prediction', e.target.value)}
                placeholder="I predict that..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted focus:ring-2 focus:ring-accent focus:border-transparent resize-none transition-colors"
                rows={2}
                disabled={isSubmitting}
              />
            </div>

            {/* Reasoning Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Your Reasoning
              </label>
              <p className="text-xs text-gray-500 dark:text-dark-text-muted mb-2">
                Explain WHY you predict this using physical intuition (not math).
              </p>
              <textarea
                value={currentState.reasoning}
                onChange={(e) => handleInputChange('reasoning', e.target.value)}
                placeholder="This makes physical sense because..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted focus:ring-2 focus:ring-accent focus:border-transparent resize-none transition-colors"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={
                isSubmitting
                || !currentState.prediction.trim()
                || !currentState.reasoning.trim()
                || tokensRemaining === 0
                || tokensRemaining === null
              }
              className={`w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                isSubmitting || !currentState.prediction.trim() || !currentState.reasoning.trim() || tokensRemaining === 0 || tokensRemaining === null
                  ? 'bg-gray-300 dark:bg-dark-card-soft text-gray-500 dark:text-dark-text-muted cursor-not-allowed'
                  : `${currentConfig.bgColor} ${currentConfig.color} border ${currentConfig.borderColor} hover:opacity-80`
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  Checking your reasoning...
                </>
              ) : (
                <>
                  Check My Reasoning
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </button>

            {/* Hint about attempts */}
            {currentState.attempts > 0 && (
              <p className="text-xs text-gray-500 dark:text-dark-text-muted text-center mt-2">
                Attempts: {currentState.attempts} • Keep thinking about the physics!
              </p>
            )}
          </>
        )}
      </div>

      {/* All Complete Celebration */}
      {completedCount === 3 && (
        <div className="px-4 py-4 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-500/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <h4 className="font-semibold text-green-800 dark:text-green-400">
                All verification checks passed!
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your solution passes all three sanity checks. You can be confident in your answer!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
