'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Concept } from '@/types/scaffold'
import type { SelfReportConfidence, VerificationResult } from '@/types/socraticFirst'
import { useUserProfile } from '@/lib/profile'
import MathRenderer from './MathRenderer'

interface ReadOnlyExplanationPopupProps {
  isOpen: boolean
  stepTitle: string
  stepContent: string
  problemStatement: string
  concepts: Concept[]
  onClose: () => void
  onComplete: (understood: boolean) => void
}

interface UnderstandingCheck {
  question: string
  exchangeCount: number
  maxExchanges: number
}

const CONFIDENCE_OPTIONS: Array<{
  value: SelfReportConfidence
  label: string
  emoji: string
  color: string
}> = [
  { value: 'guess', label: 'Guessing', emoji: '🎲', color: 'amber' },
  { value: 'okay', label: 'Okay', emoji: '🤔', color: 'blue' },
  { value: 'solid', label: 'Solid', emoji: '💪', color: 'green' },
]

export default function ReadOnlyExplanationPopup({
  isOpen,
  stepTitle,
  stepContent,
  problemStatement,
  concepts,
  onClose,
  onComplete,
}: ReadOnlyExplanationPopupProps) {
  const { track } = useUserProfile()
  const [phase, setPhase] = useState<'reading' | 'checking' | 'complete' | 'review'>('reading')
  const [understandingCheck, setUnderstandingCheck] = useState<UnderstandingCheck | null>(null)
  const [answer, setAnswer] = useState('')
  const [selectedConfidence, setSelectedConfidence] = useState<SelfReportConfidence | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [showConfidenceSelector, setShowConfidenceSelector] = useState(false)
  const [exchangeHistory, setExchangeHistory] = useState<Array<{
    question: string
    answer: string
    confidence: SelfReportConfidence
    feedback: string
    quality: string
  }>>([])

  const MAX_EXCHANGES = 5

  // Fetch initial understanding check question
  const fetchUnderstandingQuestion = useCallback(async () => {
    setIsProcessing(true)
    try {
      const params = new URLSearchParams({
        stepTitle,
        stepContent,
        problemText: problemStatement,
        concepts: concepts.map(c => c.name).join(', '),
        track, // Pass user's current track
      })

      const response = await fetch(`/api/socratic-tutor/initial-prompt?${params}`)
      if (!response.ok) throw new Error('Failed to fetch question')

      const data = await response.json()
      setUnderstandingCheck({
        question: data.thinkingPrompt || "Now that you've read the explanation, what's the key concept here? How would you apply it?",
        exchangeCount: 0,
        maxExchanges: MAX_EXCHANGES,
      })
    } catch (error) {
      console.error('Error fetching understanding question:', error)
      setUnderstandingCheck({
        question: "Now that you've read the explanation, can you summarize the key concept in your own words?",
        exchangeCount: 0,
        maxExchanges: MAX_EXCHANGES,
      })
    } finally {
      setIsProcessing(false)
    }
  }, [stepTitle, stepContent, problemStatement, concepts, track])

  // Handle starting the understanding check
  const handleStartCheck = () => {
    setPhase('checking')
    fetchUnderstandingQuestion()
  }

  // Handle submitting an answer
  const handleSubmitAnswer = async () => {
    if (!answer.trim() || !selectedConfidence || !understandingCheck) return

    setIsProcessing(true)
    try {
      const response = await fetch('/api/socratic-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'verification',
          problemText: problemStatement,
          stepTitle,
          stepContent,
          concepts: concepts.map(c => c.name),
          question: understandingCheck.question,
          studentAnswer: answer,
          selfReportedConfidence: selectedConfidence,
          track, // Pass user's current track
          previousExchanges: exchangeHistory.map(e => ({
            question: e.question,
            studentAnswer: e.answer,
            selfReport: e.confidence,
            aiVerification: { feedback: e.feedback, answerQuality: e.quality },
          })),
        }),
      })

      if (!response.ok) throw new Error('Failed to verify answer')

      const data = await response.json()
      const verification = data.verification as VerificationResult

      // Add to history
      const newExchange = {
        question: understandingCheck.question,
        answer: answer.trim(),
        confidence: selectedConfidence,
        feedback: verification.feedback,
        quality: verification.answerQuality,
      }
      setExchangeHistory(prev => [...prev, newExchange])

      // Check if understood
      if (data.isComplete || verification.answerQuality === 'excellent' || verification.answerQuality === 'good') {
        setFeedback(verification.feedback)
        setPhase('complete')
      } else if (understandingCheck.exchangeCount + 1 >= MAX_EXCHANGES) {
        // Max exchanges reached - add to review
        setFeedback("Let's add this to your review list so you can practice this concept more.")
        setPhase('review')
      } else {
        // Continue with follow-up question
        setFeedback(verification.feedback)
        setUnderstandingCheck({
          question: verification.followUpQuestion || "Can you tell me more about your thinking?",
          exchangeCount: understandingCheck.exchangeCount + 1,
          maxExchanges: MAX_EXCHANGES,
        })
        setAnswer('')
        setSelectedConfidence(null)
        setShowConfidenceSelector(false)
      }
    } catch (error) {
      console.error('Error verifying answer:', error)
      setFeedback("Something went wrong. Let's try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle keyboard submit
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (answer.trim() && !showConfidenceSelector) {
        setShowConfidenceSelector(true)
      } else if (selectedConfidence) {
        handleSubmitAnswer()
      }
    }
    if (e.key === 'Escape') {
      setShowConfidenceSelector(false)
    }
  }

  // Handle skip at any point
  const handleSkip = () => {
    onComplete(false)
    onClose()
  }

  // Handle confirmed understanding
  const handleConfirmUnderstanding = () => {
    onComplete(true)
    onClose()
  }

  // Handle adding to review
  const handleAddToReview = async () => {
    // TODO: Add to mistake notebook for review
    // For now, just close with understood = false
    onComplete(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-2xl">📖</span>
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{stepTitle}</h3>
              <p className="text-indigo-100 text-sm">Read Mode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {phase === 'reading' && (
            <div className="space-y-6">
              {/* Explanation Content */}
              <div className="prose dark:prose-invert max-w-none">
                <MathRenderer text={stepContent} />
              </div>

              {/* Concepts */}
              {concepts.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    Key Concepts:
                  </h5>
                  <div className="flex flex-wrap gap-2">
                    {concepts.map(concept => (
                      <span
                        key={concept.id}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200 rounded-full text-sm"
                      >
                        {concept.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3 pt-4">
                <button
                  onClick={handleStartCheck}
                  className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <span>🎯</span>
                  I&apos;ve read it - Check my understanding
                </button>
                <button
                  onClick={handleSkip}
                  className="w-full py-2 text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-gray-300 text-sm transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {phase === 'checking' && understandingCheck && (
            <div className="space-y-4">
              {/* Exchange History */}
              {exchangeHistory.map((exchange, idx) => (
                <div key={idx} className="space-y-2">
                  {/* Question */}
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2 bg-gray-100 dark:bg-dark-card-soft border border-gray-200 dark:border-dark-border">
                      <p className="text-sm text-gray-800 dark:text-dark-text-primary">{exchange.question}</p>
                    </div>
                  </div>
                  {/* Answer */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2 bg-indigo-600 text-white">
                      <p className="text-sm">{exchange.answer}</p>
                    </div>
                  </div>
                  {/* Feedback */}
                  <div className="flex justify-start">
                    <div className={`max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2 border ${
                      exchange.quality === 'excellent' || exchange.quality === 'good'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    }`}>
                      <p className="text-sm text-gray-800 dark:text-dark-text-primary">{exchange.feedback}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Current Question */}
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-200 dark:border-indigo-700">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">🤔</span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Understanding Check</span>
                  </div>
                  <p className="text-sm text-gray-800 dark:text-dark-text-primary font-medium">{understandingCheck.question}</p>
                  <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                    Question {understandingCheck.exchangeCount + 1} of {MAX_EXCHANGES}
                  </p>
                </div>
              </div>

              {/* Feedback from last answer */}
              {feedback && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <p className="text-sm text-amber-800 dark:text-amber-200">{feedback}</p>
                </div>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-dark-card-soft">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Confidence Selector */}
              {showConfidenceSelector && (
                <div className="p-4 bg-gray-100 dark:bg-dark-card-soft rounded-xl">
                  <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-3 text-center">
                    How confident are you?
                  </p>
                  <div className="flex gap-2">
                    {CONFIDENCE_OPTIONS.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedConfidence(option.value)}
                        className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                          selectedConfidence === option.value
                            ? option.color === 'amber' ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/30'
                            : option.color === 'blue' ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30'
                            : 'border-green-500 bg-green-100 dark:bg-green-900/30'
                            : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:bg-gray-50 dark:hover:bg-dark-card-soft'
                        }`}
                      >
                        <div className="text-2xl mb-1">{option.emoji}</div>
                        <div className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">{option.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <textarea
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value)
                    if (showConfidenceSelector && !e.target.value.trim()) {
                      setShowConfidenceSelector(false)
                      setSelectedConfidence(null)
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Share your understanding..."
                  className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-dark-border rounded-xl resize-none bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400"
                  rows={2}
                  disabled={isProcessing}
                />
                <button
                  onClick={() => {
                    if (answer.trim() && !showConfidenceSelector) {
                      setShowConfidenceSelector(true)
                    } else if (selectedConfidence) {
                      handleSubmitAnswer()
                    }
                  }}
                  disabled={!answer.trim() || isProcessing || (showConfidenceSelector && !selectedConfidence)}
                  className="px-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
                >
                  {isProcessing ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Skip option */}
              <button
                onClick={handleSkip}
                className="w-full py-2 text-gray-400 dark:text-dark-text-muted hover:text-gray-600 text-sm transition-colors"
              >
                Skip check
              </button>
            </div>
          )}

          {phase === 'complete' && (
            <div className="text-center space-y-6 py-8">
              <div className="text-6xl">🎉</div>
              <div>
                <h4 className="text-xl font-bold text-green-700 dark:text-green-400 mb-2">
                  Great understanding!
                </h4>
                <p className="text-gray-600 dark:text-dark-text-secondary">
                  {feedback || "You've demonstrated a solid grasp of this concept."}
                </p>
              </div>
              <button
                onClick={handleConfirmUnderstanding}
                className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          )}

          {phase === 'review' && (
            <div className="text-center space-y-6 py-8">
              <div className="text-6xl">📚</div>
              <div>
                <h4 className="text-xl font-bold text-amber-700 dark:text-amber-400 mb-2">
                  Let&apos;s practice this more
                </h4>
                <p className="text-gray-600 dark:text-dark-text-secondary">
                  This concept seems tricky. We&apos;ll add it to your review list for more practice.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleAddToReview}
                  className="w-full py-3 bg-amber-600 text-white rounded-xl font-medium hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
                >
                  <span>📝</span>
                  Add to review & continue
                </button>
                <button
                  onClick={handleSkip}
                  className="w-full py-2 text-gray-500 dark:text-dark-text-muted hover:text-gray-700 text-sm transition-colors"
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
