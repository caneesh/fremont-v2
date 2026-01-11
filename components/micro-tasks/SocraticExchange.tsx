'use client'

import { useState, useRef, useEffect } from 'react'
import type { SocraticExchangeProps, SelfReportConfidence } from '@/types/socraticFirst'

const CONFIDENCE_OPTIONS: Array<{
  value: SelfReportConfidence
  label: string
  emoji: string
  description: string
  color: string
}> = [
  {
    value: 'guess',
    label: 'Guessing',
    emoji: '🎲',
    description: 'Not sure at all',
    color: 'amber',
  },
  {
    value: 'okay',
    label: 'Okay',
    emoji: '🤔',
    description: 'Somewhat confident',
    color: 'blue',
  },
  {
    value: 'solid',
    label: 'Solid',
    emoji: '💪',
    description: 'Pretty confident',
    color: 'green',
  },
]

function getConfidenceStyles(value: SelfReportConfidence, isSelected: boolean): string {
  const baseStyles = 'flex-1 flex flex-col items-center px-3 py-3 rounded-lg border-2 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]'

  const colorStyles = {
    guess: isSelected
      ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 ring-2 ring-amber-500/30'
      : 'border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/20',
    okay: isSelected
      ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/30'
      : 'border-blue-200 dark:border-blue-800/50 bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/20',
    solid: isSelected
      ? 'border-green-500 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 ring-2 ring-green-500/30'
      : 'border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20',
  }

  return `${baseStyles} ${colorStyles[value]}`
}

interface ExtendedSocraticExchangeProps extends SocraticExchangeProps {
  /** Callback when user wants to skip this question */
  onSkip?: () => void
}

export default function SocraticExchange({
  question,
  exchanges,
  isProcessing,
  onSubmit,
  placeholder = "Share your thinking...",
  onSkip,
}: ExtendedSocraticExchangeProps) {
  const [answer, setAnswer] = useState('')
  const [selectedConfidence, setSelectedConfidence] = useState<SelfReportConfidence | null>(null)
  const [showConfidenceSelector, setShowConfidenceSelector] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Minimum characters for a meaningful answer
  const MIN_ANSWER_LENGTH = 15
  const MIN_WORD_COUNT = 3

  // Auto-scroll to bottom when exchanges update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [exchanges, isProcessing])

  // Focus input when not processing
  useEffect(() => {
    if (!isProcessing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isProcessing])

  // Validate answer has sufficient content
  const validateAnswer = (text: string): { valid: boolean; error: string | null } => {
    const trimmed = text.trim()

    if (!trimmed) {
      return { valid: false, error: 'Please enter your answer' }
    }

    if (trimmed.length < MIN_ANSWER_LENGTH) {
      return { valid: false, error: `Please write at least ${MIN_ANSWER_LENGTH} characters (${trimmed.length}/${MIN_ANSWER_LENGTH})` }
    }

    // Count actual words (not just characters)
    const words = trimmed.split(/\s+/).filter(w => w.length > 1)
    if (words.length < MIN_WORD_COUNT) {
      return { valid: false, error: `Please write at least ${MIN_WORD_COUNT} words to explain your thinking` }
    }

    return { valid: true, error: null }
  }

  const handleSubmit = () => {
    const validation = validateAnswer(answer)
    if (!validation.valid) {
      setValidationError(validation.error)
      return
    }
    if (!selectedConfidence || isProcessing) return

    setValidationError(null)
    onSubmit(answer.trim(), selectedConfidence)
    setAnswer('')
    setSelectedConfidence(null)
    setShowConfidenceSelector(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const validation = validateAnswer(answer)
      if (validation.valid && !showConfidenceSelector) {
        setValidationError(null)
        setShowConfidenceSelector(true)
      } else if (!validation.valid) {
        setValidationError(validation.error)
      } else if (selectedConfidence) {
        handleSubmit()
      }
    }
    if (e.key === 'Escape') {
      setShowConfidenceSelector(false)
    }
  }

  // Keyboard shortcuts for confidence selection
  useEffect(() => {
    if (!showConfidenceSelector) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return

      if (e.key === '1') {
        setSelectedConfidence('guess')
      } else if (e.key === '2') {
        setSelectedConfidence('okay')
      } else if (e.key === '3') {
        setSelectedConfidence('solid')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showConfidenceSelector])

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg border-2 border-indigo-200 dark:border-indigo-700 overflow-hidden">
      {/* Header */}
      <div className="bg-indigo-600 dark:bg-indigo-500 px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          <span className="text-2xl">🤔</span>
        </div>
        <div>
          <h3 className="font-bold text-white">Let&apos;s Think Together</h3>
          <p className="text-indigo-100 text-xs">Share your approach, then rate your confidence</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="max-h-80 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-dark-card-soft">
        {/* Previous exchanges */}
        {exchanges.map((exchange) => (
          <div key={exchange.id} className="space-y-2">
            {/* Question */}
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-sm">🤔</span>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Guide</span>
                </div>
                <p className="text-sm text-gray-800 dark:text-dark-text-primary leading-relaxed">{exchange.question}</p>
              </div>
            </div>

            {/* Student's answer */}
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2 bg-indigo-600 text-white">
                <p className="text-sm leading-relaxed">{exchange.studentAnswer}</p>
                <div className="flex items-center gap-1 mt-1 text-indigo-200 text-xs">
                  <span>{CONFIDENCE_OPTIONS.find(o => o.value === exchange.selfReport)?.emoji}</span>
                  <span>{exchange.selfReport}</span>
                </div>
              </div>
            </div>

            {/* AI Feedback with Explanation */}
            <div className="flex justify-start">
              <div className={`max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 border shadow-sm ${
                exchange.aiVerification.answerQuality === 'excellent' || exchange.aiVerification.answerQuality === 'good'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                  : exchange.aiVerification.answerQuality === 'partial'
                  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
              }`}>
                {/* Feedback */}
                <p className="text-sm text-gray-800 dark:text-dark-text-primary leading-relaxed">
                  {exchange.aiVerification.feedback}
                </p>

                {/* Detailed Explanation (if provided) */}
                {exchange.aiVerification.explanation && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 flex items-center gap-1">
                      <span>💡</span> Here&apos;s why:
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {exchange.aiVerification.explanation}
                    </p>
                  </div>
                )}

                {/* Follow-up Question Preview (if there's one) */}
                {exchange.aiVerification.followUpQuestion && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1">
                      <span>🤔</span> Let&apos;s explore further:
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                      {exchange.aiVerification.followUpQuestion}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Current question */}
        {question && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">🤔</span>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Guide</span>
              </div>
              <p className="text-sm text-gray-800 dark:text-dark-text-primary leading-relaxed">{question}</p>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {isProcessing && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">🤔</span>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Guide</span>
              </div>
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Confidence Selector (shown after typing answer) */}
      {showConfidenceSelector && (
        <div className="px-4 py-3 bg-gray-100 dark:bg-dark-card-soft border-t border-gray-200 dark:border-dark-border">
          <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-3 text-center">
            How confident are you in this answer?
          </p>
          <div className="flex gap-2">
            {CONFIDENCE_OPTIONS.map((option, index) => (
              <button
                key={option.value}
                onClick={() => setSelectedConfidence(option.value)}
                className={getConfidenceStyles(option.value, selectedConfidence === option.value)}
              >
                <span className="text-2xl mb-1">{option.emoji}</span>
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs opacity-70">{option.description}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-center text-gray-400 dark:text-dark-text-muted">
            Press 1, 2, or 3 • Then Enter to submit
          </p>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card">
        {/* Validation Error */}
        {validationError && (
          <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {validationError}
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={answer}
            onChange={(e) => {
              setAnswer(e.target.value)
              // Clear validation error when user types
              if (validationError) {
                setValidationError(null)
              }
              if (showConfidenceSelector && !e.target.value.trim()) {
                setShowConfidenceSelector(false)
                setSelectedConfidence(null)
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`flex-1 px-4 py-2 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-muted ${
              validationError
                ? 'border-amber-400 dark:border-amber-600'
                : 'border-gray-200 dark:border-dark-border'
            }`}
            rows={2}
            disabled={isProcessing}
          />
          <button
            onClick={() => {
              const validation = validateAnswer(answer)
              if (validation.valid && !showConfidenceSelector) {
                setValidationError(null)
                setShowConfidenceSelector(true)
              } else if (!validation.valid) {
                setValidationError(validation.error)
              } else if (selectedConfidence) {
                handleSubmit()
              }
            }}
            disabled={!answer.trim() || isProcessing || (showConfidenceSelector && !selectedConfidence)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-400 transition-colors flex items-center justify-center"
          >
            {isProcessing ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : showConfidenceSelector ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500 dark:text-dark-text-muted">
            {showConfidenceSelector
              ? 'Select confidence, then Enter to submit'
              : 'Enter to rate confidence • Shift+Enter for new line'
            }
          </p>
          {/* Always show skip option */}
          {onSkip && (
            <button
              onClick={onSkip}
              disabled={isProcessing}
              className="text-xs text-gray-400 dark:text-dark-text-muted hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              </svg>
              Skip question
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
