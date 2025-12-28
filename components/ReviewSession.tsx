'use client'

import { useState, useEffect, useCallback } from 'react'
import type { MistakeCard, ReviewQuality, ReviewSession as ReviewSessionType } from '@/types/mistakeNotebook'
import { getCardsDue, recordReview, startReviewSession, completeReviewSession } from '@/lib/mistakeNotebook'
import { getStatusDisplay, formatInterval } from '@/lib/srsScheduler'
import { getStepTypeBadge } from '@/lib/hintEngine'

interface ReviewSessionProps {
  onComplete?: (session: ReviewSessionType) => void
  onCancel?: () => void
  maxCards?: number
}

type SessionState = 'loading' | 'ready' | 'reviewing' | 'showAnswer' | 'complete'

export default function ReviewSession({
  onComplete,
  onCancel,
  maxCards = 20
}: ReviewSessionProps) {
  const [state, setState] = useState<SessionState>('loading')
  const [cards, setCards] = useState<MistakeCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [session, setSession] = useState<ReviewSessionType | null>(null)
  const [startTime, setStartTime] = useState<number>(0)
  const [showHint, setShowHint] = useState(false)

  // Load due cards on mount
  useEffect(() => {
    const dueCards = getCardsDue().slice(0, maxCards)
    setCards(dueCards)
    setState(dueCards.length > 0 ? 'ready' : 'complete')
  }, [maxCards])

  // Start session
  const handleStartSession = useCallback(() => {
    const newSession = startReviewSession()
    setSession(newSession)
    setCurrentIndex(0)
    setStartTime(Date.now())
    setState('reviewing')
  }, [])

  // Show answer
  const handleShowAnswer = useCallback(() => {
    setState('showAnswer')
  }, [])

  // Record response and move to next
  const handleResponse = useCallback((quality: ReviewQuality) => {
    if (!session || currentIndex >= cards.length) return

    const responseTimeMs = Date.now() - startTime
    const { session: updatedSession, updatedCard } = recordReview(
      session,
      cards[currentIndex].id,
      quality,
      responseTimeMs
    )

    setSession(updatedSession)

    // Update card in local state
    if (updatedCard) {
      setCards(prev => prev.map((c, i) =>
        i === currentIndex ? updatedCard : c
      ))
    }

    // Move to next card or complete
    if (currentIndex + 1 >= cards.length) {
      const completedSession = completeReviewSession(updatedSession)
      setSession(completedSession)
      setState('complete')
      onComplete?.(completedSession)
    } else {
      setCurrentIndex(prev => prev + 1)
      setStartTime(Date.now())
      setShowHint(false)
      setState('reviewing')
    }
  }, [session, currentIndex, cards, startTime, onComplete])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state === 'reviewing') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          handleShowAnswer()
        }
      } else if (state === 'showAnswer') {
        if (e.key === '1') handleResponse(0)
        if (e.key === '2') handleResponse(1)
        if (e.key === '3') handleResponse(3)
        if (e.key === '4') handleResponse(4)
        if (e.key === '5') handleResponse(5)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, handleShowAnswer, handleResponse])

  const currentCard = cards[currentIndex]
  const progress = cards.length > 0 ? ((currentIndex) / cards.length) * 100 : 0

  // Loading state
  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  // No cards to review
  if (state === 'complete' && cards.length === 0) {
    return (
      <div className="text-center p-12">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
          All caught up!
        </h3>
        <p className="text-gray-500 dark:text-dark-text-muted">
          No cards are due for review right now.
        </p>
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 text-accent hover:underline"
          >
            Back to Notebook
          </button>
        )}
      </div>
    )
  }

  // Ready to start
  if (state === 'ready') {
    return (
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-accent/10 dark:bg-accent/20 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
          {cards.length} cards to review
        </h3>
        <p className="text-gray-500 dark:text-dark-text-muted mb-6">
          Estimated time: {Math.ceil(cards.length * 0.5)} minutes
        </p>

        <div className="flex items-center justify-center gap-4">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-dark-text-muted dark:hover:text-dark-text-secondary"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleStartSession}
            className="px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-strong transition-colors"
          >
            Start Review
          </button>
        </div>
      </div>
    )
  }

  // Session complete
  if (state === 'complete' && session) {
    const accuracy = session.cardsReviewed > 0
      ? Math.round((session.cardsCorrect / session.cardsReviewed) * 100)
      : 0

    return (
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
          Session Complete!
        </h3>

        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto my-6">
          <div className="p-3 bg-gray-50 dark:bg-dark-card-soft rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
              {session.cardsReviewed}
            </p>
            <p className="text-xs text-gray-500 dark:text-dark-text-muted">Cards Reviewed</p>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-dark-card-soft rounded-lg">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {accuracy}%
            </p>
            <p className="text-xs text-gray-500 dark:text-dark-text-muted">Accuracy</p>
          </div>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-strong transition-colors"
          >
            Done
          </button>
        )}
      </div>
    )
  }

  // Active review
  if (!currentCard) return null

  const stepTypeBadge = getStepTypeBadge(currentCard.stepType)

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-dark-text-muted mb-2">
          <span>{currentIndex + 1} of {cards.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-dark-card-soft rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-lg dark:shadow-dark-lg overflow-hidden">
        {/* Question side */}
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${stepTypeBadge.bgClass} ${stepTypeBadge.textClass}`}>
              {stepTypeBadge.label}
            </span>
            <span className="text-xs text-gray-400 dark:text-dark-text-muted">
              {currentCard.domain}
            </span>
          </div>

          {/* Step title as question */}
          <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-3">
            {currentCard.stepTitle}
          </h3>

          {/* Problem context */}
          <p className="text-sm text-gray-500 dark:text-dark-text-muted mb-4">
            From: {currentCard.problemTitle}
          </p>

          {/* Concept tags */}
          <div className="flex flex-wrap gap-2">
            {currentCard.conceptTags.map(tag => (
              <span
                key={tag}
                className="px-2 py-1 rounded-full text-xs bg-accent/10 text-accent dark:bg-accent/20"
              >
                {tag.replace(/_/g, ' ')}
              </span>
            ))}
          </div>

          {/* Hint toggle */}
          {state === 'reviewing' && !showHint && (
            <button
              onClick={() => setShowHint(true)}
              className="mt-4 text-sm text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-secondary"
            >
              Show hint
            </button>
          )}

          {showHint && (
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Think about: What principle or approach applies here?
              </p>
            </div>
          )}
        </div>

        {/* Show Answer button or Answer section */}
        {state === 'reviewing' ? (
          <div className="p-6 bg-gray-50 dark:bg-dark-card-soft border-t border-gray-200 dark:border-dark-border">
            <button
              onClick={handleShowAnswer}
              className="w-full py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-strong transition-colors"
            >
              Show Answer
            </button>
            <p className="text-xs text-center text-gray-400 dark:text-dark-text-muted mt-2">
              Press Space or Enter
            </p>
          </div>
        ) : (
          <>
            {/* Answer reveal */}
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-t border-gray-200 dark:border-dark-border">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
                Review Note:
              </h4>
              <p className="text-blue-700 dark:text-blue-200">
                {currentCard.misconceptionNote}
              </p>
            </div>

            {/* Rating buttons */}
            <div className="p-6 bg-gray-50 dark:bg-dark-card-soft border-t border-gray-200 dark:border-dark-border">
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4 text-center">
                How well did you recall this?
              </p>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => handleResponse(0)}
                  className="py-3 px-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                >
                  <span className="block text-lg mb-1">1</span>
                  Again
                </button>
                <button
                  onClick={() => handleResponse(2)}
                  className="py-3 px-2 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors text-sm font-medium"
                >
                  <span className="block text-lg mb-1">2</span>
                  Hard
                </button>
                <button
                  onClick={() => handleResponse(4)}
                  className="py-3 px-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-sm font-medium"
                >
                  <span className="block text-lg mb-1">4</span>
                  Good
                </button>
                <button
                  onClick={() => handleResponse(5)}
                  className="py-3 px-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                >
                  <span className="block text-lg mb-1">5</span>
                  Easy
                </button>
              </div>

              <p className="text-xs text-center text-gray-400 dark:text-dark-text-muted mt-3">
                Press 1-5 for quick response
              </p>
            </div>
          </>
        )}
      </div>

      {/* Cancel button */}
      {onCancel && (
        <div className="mt-4 text-center">
          <button
            onClick={onCancel}
            className="text-sm text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-secondary"
          >
            End session early
          </button>
        </div>
      )}
    </div>
  )
}
