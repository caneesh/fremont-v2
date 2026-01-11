'use client'

import { useState, useCallback, useEffect } from 'react'
import type {
  ConceptContrastChallenge,
  DistractorConcept,
  DistractorRejection,
  RejectionValidation,
  ConceptContrastValidation,
  ConceptContrastStatus,
} from '@/types/conceptContrast'
import { authenticatedFetch } from '@/lib/api/apiClient'
import MathRenderer from './MathRenderer'

// ============================================
// Component Props
// ============================================

interface ConceptContrastModalProps {
  challenge: ConceptContrastChallenge
  problemText: string
  onComplete: (passed: boolean, validation: ConceptContrastValidation) => void
  onSkip?: () => void
  onClose: () => void
}

// ============================================
// Internal State Types
// ============================================

interface DistractorState {
  explanation: string
  submitted: boolean
  validation: RejectionValidation | null
  timeStarted: number
}

type ModalView = 'challenge' | 'explain' | 'result'

// ============================================
// Main Component
// ============================================

export default function ConceptContrastModal({
  challenge,
  problemText,
  onComplete,
  onSkip,
  onClose,
}: ConceptContrastModalProps) {
  // View state
  const [currentView, setCurrentView] = useState<ModalView>('challenge')
  const [currentDistractorIndex, setCurrentDistractorIndex] = useState(0)

  // Distractor states
  const [distractorStates, setDistractorStates] = useState<Record<string, DistractorState>>(() => {
    const initial: Record<string, DistractorState> = {}
    challenge.distractors.forEach((distractor) => {
      initial[distractor.id] = {
        explanation: '',
        submitted: false,
        validation: null,
        timeStarted: Date.now(),
      }
    })
    return initial
  })

  // Overall state
  const [status, setStatus] = useState<ConceptContrastStatus>('pending')
  const [attemptCount, setAttemptCount] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [overallValidation, setOverallValidation] = useState<ConceptContrastValidation | null>(null)
  const [showHint, setShowHint] = useState(false)

  // Current distractor
  const currentDistractor = challenge.distractors[currentDistractorIndex]
  const currentState = distractorStates[currentDistractor.id]

  // Progress calculation
  const acceptedCount = Object.values(distractorStates).filter(
    (s) => s.submitted && s.validation?.isAccepted
  ).length
  const totalDistractors = challenge.distractors.length

  // ============================================
  // Explanation Handler
  // ============================================

  const handleExplanationChange = useCallback(
    (value: string) => {
      setDistractorStates((prev) => ({
        ...prev,
        [currentDistractor.id]: {
          ...prev[currentDistractor.id],
          explanation: value,
        },
      }))
    },
    [currentDistractor.id]
  )

  // ============================================
  // Submit Explanation
  // ============================================

  const handleSubmitExplanation = async () => {
    if (!currentState.explanation.trim()) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/concept-contrast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate',
          challengeId: challenge.id,
          distractorId: currentDistractor.id,
          explanation: currentState.explanation,
          problemContext: challenge.problemContext,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to validate explanation')
      }

      const result = await response.json()
      const validation = result.validation as RejectionValidation

      setDistractorStates((prev) => ({
        ...prev,
        [currentDistractor.id]: {
          ...prev[currentDistractor.id],
          submitted: true,
          validation,
        },
      }))

      // Check if all distractors have been handled
      const updatedStates = {
        ...distractorStates,
        [currentDistractor.id]: { ...currentState, submitted: true, validation },
      }

      const allSubmitted = Object.values(updatedStates).every((s) => s.submitted)

      if (allSubmitted) {
        // Calculate overall result
        const acceptedRejections = Object.values(updatedStates).filter(
          (s) => s.validation?.isAccepted
        ).length

        const passed = acceptedRejections >= challenge.requiredCorrectRejections

        const overall: ConceptContrastValidation = {
          challengeId: challenge.id,
          passed,
          score: {
            accepted: acceptedRejections,
            required: challenge.requiredCorrectRejections,
            total: totalDistractors,
          },
          rejectionValidations: Object.values(updatedStates)
            .map((s) => s.validation)
            .filter((v): v is RejectionValidation => v !== null),
          overallFeedback: passed
            ? `Excellent! You've demonstrated clear understanding of why ${challenge.selectedConcept.name} is the right choice here.`
            : `Some of your explanations need more precision. Let's work on identifying the exact conditions.`,
          canProceedAnyway: attemptCount >= challenge.maxAttempts - 1,
        }

        setOverallValidation(overall)
        setAttemptCount((prev) => prev + 1)

        if (passed) {
          setStatus('passed')
        } else {
          setStatus('failed')
        }
        setCurrentView('result')
      }
    } catch (error) {
      console.error('Error validating explanation:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // Navigation Handlers
  // ============================================

  const handleStartExplaining = () => {
    setStatus('in_progress')
    setCurrentView('explain')
  }

  const handleNextDistractor = () => {
    if (currentDistractorIndex < totalDistractors - 1) {
      setCurrentDistractorIndex((prev) => prev + 1)
      setShowHint(false)
    }
  }

  const handlePrevDistractor = () => {
    if (currentDistractorIndex > 0) {
      setCurrentDistractorIndex((prev) => prev - 1)
      setShowHint(false)
    }
  }

  const handleRetry = () => {
    // Reset all states
    const reset: Record<string, DistractorState> = {}
    challenge.distractors.forEach((distractor) => {
      reset[distractor.id] = {
        explanation: '',
        submitted: false,
        validation: null,
        timeStarted: Date.now(),
      }
    })
    setDistractorStates(reset)
    setCurrentDistractorIndex(0)
    setCurrentView('challenge')
    setStatus('pending')
    setShowHint(false)
    setOverallValidation(null)
  }

  const handleComplete = () => {
    if (overallValidation) {
      onComplete(overallValidation.passed, overallValidation)
    }
  }

  const canSkip = onSkip && attemptCount >= challenge.maxAttempts

  // ============================================
  // Render: Challenge View (Initial)
  // ============================================

  const renderChallengeView = () => (
    <div className="space-y-6">
      {/* Selected Concept Display */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🎯</span>
          <div>
            <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Your Choice</p>
            <h4 className="text-lg font-semibold text-indigo-900 dark:text-indigo-200">
              {challenge.selectedConcept.name}
            </h4>
          </div>
        </div>
        {challenge.selectedConcept.formula && (
          <div className="mt-2 pl-11">
            <MathRenderer text={`$${challenge.selectedConcept.formula}$`} />
          </div>
        )}
      </div>

      {/* Challenge Prompt */}
      <div className="text-center py-4">
        <p className="text-gray-600 dark:text-dark-text-secondary mb-2">
          Interesting choice. But before we lock that in...
        </p>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
          Look at these neighbors:
        </h3>
      </div>

      {/* Distractor Cards */}
      <div className="space-y-3">
        {challenge.distractors.map((distractor, idx) => (
          <div
            key={distractor.id}
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4 flex items-center gap-4"
          >
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {idx + 1}.
            </span>
            <div className="flex-1">
              <h4 className="font-semibold text-amber-900 dark:text-amber-200">
                {distractor.name}
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                {distractor.whyPlausible}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Challenge Question */}
      <div className="bg-gray-100 dark:bg-dark-card-soft border border-gray-200 dark:border-dark-border rounded-lg p-4 text-center">
        <p className="text-gray-700 dark:text-dark-text-secondary font-medium">
          Why did you throw these out?
        </p>
        <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">
          Specifically, what condition in the problem makes each one impossible to use here?
        </p>
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          onClick={handleStartExplaining}
          className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 transition-colors"
        >
          Explain My Reasoning
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )

  // ============================================
  // Render: Explain View
  // ============================================

  const renderExplainView = () => (
    <div className="space-y-4">
      {/* Progress Indicator */}
      <div className="flex items-center gap-2 mb-4">
        {challenge.distractors.map((d, idx) => {
          const state = distractorStates[d.id]
          const isActive = idx === currentDistractorIndex
          const isAccepted = state.submitted && state.validation?.isAccepted
          const isRejected = state.submitted && !state.validation?.isAccepted

          return (
            <button
              key={d.id}
              onClick={() => setCurrentDistractorIndex(idx)}
              className={`flex-1 h-2 rounded-full transition-colors ${
                isActive
                  ? 'bg-indigo-500'
                  : isAccepted
                    ? 'bg-green-500'
                    : isRejected
                      ? 'bg-amber-500'
                      : 'bg-gray-200 dark:bg-dark-border'
              }`}
            />
          )
        })}
      </div>

      {/* Current Distractor */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl font-bold text-amber-600 dark:text-amber-400">
            {currentDistractorIndex + 1}.
          </span>
          <div className="flex-1">
            <h4 className="font-semibold text-amber-900 dark:text-amber-200">
              {currentDistractor.name}
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              {currentDistractor.whyPlausible}
            </p>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="text-center py-2">
        <p className="text-gray-700 dark:text-dark-text-secondary font-medium">
          Why can&apos;t you use <span className="text-amber-600 dark:text-amber-400">{currentDistractor.name}</span> here?
        </p>
        <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">
          Identify the specific condition in the problem that makes this invalid.
        </p>
      </div>

      {/* Explanation Input */}
      {!currentState.submitted ? (
        <div className="space-y-3">
          <textarea
            value={currentState.explanation}
            onChange={(e) => handleExplanationChange(e.target.value)}
            placeholder="Because in this problem, [specific condition] means that..."
            className="w-full h-32 p-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-muted resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />

          {/* Hint Toggle */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowHint(!showHint)}
              className="text-sm text-gray-500 dark:text-dark-text-muted hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showHint ? 'Hide Hint' : 'Need a hint?'}
            </button>

            <span className="text-xs text-gray-400 dark:text-dark-text-muted">
              {currentState.explanation.length}/500 characters
            </span>
          </div>

          {/* Hint Display */}
          {showHint && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-lg">💡</span>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {currentDistractor.rejectionHint}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Feedback Display */
        <div
          className={`rounded-lg border p-4 ${
            currentState.validation?.isAccepted
              ? 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-900/20'
              : 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/20'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">
              {currentState.validation?.isAccepted ? '✅' : '🤔'}
            </span>
            <div>
              <h4
                className={`font-medium mb-1 ${
                  currentState.validation?.isAccepted
                    ? 'text-green-800 dark:text-green-400'
                    : 'text-amber-800 dark:text-amber-400'
                }`}
              >
                {currentState.validation?.isAccepted
                  ? 'Good reasoning!'
                  : 'Almost there...'}
              </h4>
              <p
                className={`text-sm ${
                  currentState.validation?.isAccepted
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-amber-700 dark:text-amber-300'
                }`}
              >
                {currentState.validation?.feedback}
              </p>

              {/* Show what was missing if not accepted */}
              {!currentState.validation?.isAccepted && currentState.validation?.missingInsight && (
                <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-500/30">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    Key insight: {currentState.validation.missingInsight}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={handlePrevDistractor}
          disabled={currentDistractorIndex === 0}
          className="px-4 py-2 text-sm text-gray-600 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>

        {!currentState.submitted ? (
          <button
            onClick={handleSubmitExplanation}
            disabled={!currentState.explanation.trim() || isSubmitting}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              !currentState.explanation.trim() || isSubmitting
                ? 'bg-gray-300 dark:bg-dark-card-soft text-gray-500 dark:text-dark-text-muted cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Checking...
              </>
            ) : (
              'Submit Explanation'
            )}
          </button>
        ) : currentDistractorIndex < totalDistractors - 1 ? (
          <button
            onClick={handleNextDistractor}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            Next Distractor →
          </button>
        ) : null}
      </div>
    </div>
  )

  // ============================================
  // Render: Result View
  // ============================================

  const renderResultView = () => {
    if (!overallValidation) return null

    const { passed, score } = overallValidation

    return (
      <div className="space-y-4">
        {/* Result Header */}
        <div
          className={`rounded-lg border p-6 text-center ${
            passed
              ? 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-900/20'
              : 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/20'
          }`}
        >
          <span className="text-5xl mb-3 block">{passed ? '🎯' : '🔄'}</span>
          <h3
            className={`text-xl font-semibold mb-2 ${
              passed ? 'text-green-800 dark:text-green-400' : 'text-amber-800 dark:text-amber-400'
            }`}
          >
            {passed ? 'Contrast Challenge Passed!' : 'Keep Thinking...'}
          </h3>
          <p
            className={`text-sm ${
              passed ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {overallValidation.overallFeedback}
          </p>

          {/* Score */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-card rounded-full border border-gray-200 dark:border-dark-border">
            <span className="text-sm text-gray-600 dark:text-dark-text-muted">Score:</span>
            <span className="font-semibold text-gray-900 dark:text-dark-text-primary">
              {score.accepted}/{score.total} explained correctly
            </span>
          </div>
        </div>

        {/* Summary of each distractor */}
        <div className="space-y-2">
          {overallValidation.rejectionValidations.map((val, idx) => {
            const distractor = challenge.distractors[idx]
            return (
              <div
                key={val.distractorId}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  val.isAccepted
                    ? 'border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-900/10'
                    : 'border-amber-200 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-900/10'
                }`}
              >
                <span className="text-lg">{val.isAccepted ? '✓' : '○'}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                    {distractor.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-muted">
                    Quality: {val.quality}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Key Insight (if failed) */}
        {!passed && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-400 mb-1">
                  Remember:
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  To correctly reject a law, you need to identify the specific condition in the problem
                  that violates that law&apos;s prerequisites. Just saying &quot;it doesn&apos;t apply&quot; isn&apos;t enough.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-dark-border">
          {!passed && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              >
                Try Again
              </button>
              {canSkip && (
                <button
                  onClick={onSkip}
                  className="px-4 py-2 text-gray-600 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text-primary text-sm"
                >
                  Skip for Now
                </button>
              )}
            </div>
          )}
          <button
            onClick={handleComplete}
            className={`px-6 py-2 rounded-lg font-medium ${
              passed
                ? 'bg-green-600 text-white hover:bg-green-700 ml-auto'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {passed ? 'Continue' : 'Proceed Anyway'}
          </button>
        </div>

        {/* Attempt counter */}
        <p className="text-xs text-gray-500 dark:text-dark-text-muted text-center">
          Attempt {attemptCount} of {challenge.maxAttempts}
          {canSkip && ' (You can now skip this challenge)'}
        </p>
      </div>
    )
  }

  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-500/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚖️</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  Concept Contrast Challenge
                </h2>
                <p className="text-sm text-gray-600 dark:text-dark-text-muted">
                  Why did you reject the alternatives?
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-primary rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card-soft"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {currentView === 'challenge' && renderChallengeView()}
          {currentView === 'explain' && renderExplainView()}
          {currentView === 'result' && renderResultView()}
        </div>

        {/* Progress Footer */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-dark-card-soft border-t border-gray-200 dark:border-dark-border flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-dark-text-muted">
            <span>
              {acceptedCount}/{totalDistractors} distractors explained
            </span>
            <span>Required: {challenge.requiredCorrectRejections}/{totalDistractors}</span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${(acceptedCount / totalDistractors) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
