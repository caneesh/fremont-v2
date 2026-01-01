'use client'

import { useState, useCallback } from 'react'
import type { RebuildQuestion, StepRebuildGateState } from '@/types/gatingPolicy'

interface RebuildGateProps {
  /** Rebuild gate state */
  gateState: StepRebuildGateState
  /** Step title for context */
  stepTitle: string
  /** Callback when user answers a question */
  onAnswer: (questionIndex: number, selectedIndex: number) => void
  /** Callback when gate is passed */
  onGatePassed: () => void
}

/**
 * RebuildGate Component
 *
 * Shown after a user uses Hint Level 5 (Full Reveal).
 * Forces the user to demonstrate understanding before proceeding.
 *
 * Features:
 * - 1-2 questions about the pattern used and first decision
 * - Must answer correctly to unlock progression
 * - Shows targeted feedback on wrong answers
 */
export default function RebuildGate({
  gateState,
  stepTitle,
  onAnswer,
  onGatePassed,
}: RebuildGateProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackCorrect, setFeedbackCorrect] = useState(false)

  const currentQuestion = gateState.questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === gateState.questions.length - 1
  const questionAlreadyAnswered = gateState.correctAnswers[currentQuestionIndex]

  const handleOptionSelect = useCallback((index: number) => {
    if (showFeedback || questionAlreadyAnswered) return
    setSelectedOption(index)
  }, [showFeedback, questionAlreadyAnswered])

  const handleSubmit = useCallback(() => {
    if (selectedOption === null) return

    const isCorrect = selectedOption === currentQuestion.correctIndex
    setFeedbackCorrect(isCorrect)
    setShowFeedback(true)

    onAnswer(currentQuestionIndex, selectedOption)
  }, [selectedOption, currentQuestion, currentQuestionIndex, onAnswer])

  const handleContinue = useCallback(() => {
    if (feedbackCorrect) {
      if (isLastQuestion) {
        // All questions answered correctly
        onGatePassed()
      } else {
        // Move to next question
        setCurrentQuestionIndex(prev => prev + 1)
        setSelectedOption(null)
        setShowFeedback(false)
      }
    } else {
      // Wrong answer - let them try again
      setSelectedOption(null)
      setShowFeedback(false)
    }
  }, [feedbackCorrect, isLastQuestion, onGatePassed])

  if (!currentQuestion) {
    return null
  }

  return (
    <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-amber-500 rounded-lg">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div>
          <h4 className="font-semibold text-amber-900 dark:text-amber-100">
            Rebuild Your Understanding
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            You viewed the full solution. Let&apos;s make sure you understand it.
          </p>
        </div>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-4">
        {gateState.questions.map((_, idx) => (
          <div
            key={idx}
            className={`
              h-1.5 flex-1 rounded-full transition-colors
              ${idx < currentQuestionIndex || gateState.correctAnswers[idx]
                ? 'bg-green-500'
                : idx === currentQuestionIndex
                  ? 'bg-amber-500'
                  : 'bg-amber-200 dark:bg-amber-800'
              }
            `}
          />
        ))}
      </div>

      {/* Question */}
      <div className="mb-4">
        <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-3">
          {currentQuestion.question}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === idx
            const isCorrectOption = idx === currentQuestion.correctIndex
            const showAsCorrect = showFeedback && isCorrectOption
            const showAsWrong = showFeedback && isSelected && !isCorrectOption

            return (
              <button
                key={idx}
                onClick={() => handleOptionSelect(idx)}
                disabled={showFeedback || questionAlreadyAnswered}
                className={`
                  w-full text-left p-3 rounded-lg border-2 transition-all
                  ${isSelected && !showFeedback
                    ? 'border-amber-500 bg-amber-100 dark:bg-amber-800/50'
                    : showAsCorrect
                      ? 'border-green-500 bg-green-100 dark:bg-green-900/30'
                      : showAsWrong
                        ? 'border-red-500 bg-red-100 dark:bg-red-900/30'
                        : 'border-amber-200 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-500'
                  }
                  ${showFeedback || questionAlreadyAnswered ? 'cursor-default' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`
                    w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0
                    ${isSelected && !showFeedback
                      ? 'border-amber-500 bg-amber-500'
                      : showAsCorrect
                        ? 'border-green-500 bg-green-500'
                        : showAsWrong
                          ? 'border-red-500 bg-red-500'
                          : 'border-amber-300 dark:border-amber-600'
                    }
                  `}>
                    {(isSelected || showAsCorrect) && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showAsWrong ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        )}
                      </svg>
                    )}
                  </div>
                  <span className={`
                    text-sm
                    ${showAsCorrect ? 'text-green-800 dark:text-green-200 font-medium' : ''}
                    ${showAsWrong ? 'text-red-800 dark:text-red-200' : ''}
                    ${!showFeedback ? 'text-amber-900 dark:text-amber-100' : ''}
                  `}>
                    {option}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className={`
          p-3 rounded-lg mb-4
          ${feedbackCorrect
            ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
            : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
          }
        `}>
          <div className="flex items-start gap-2">
            {feedbackCorrect ? (
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            <div>
              <p className={`
                font-medium text-sm
                ${feedbackCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}
              `}>
                {feedbackCorrect ? 'Correct!' : 'Not quite. Try again.'}
              </p>
              {feedbackCorrect && (
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  {currentQuestion.explanation}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action button */}
      {!showFeedback ? (
        <button
          onClick={handleSubmit}
          disabled={selectedOption === null}
          className={`
            w-full py-2.5 rounded-lg font-medium text-sm transition-colors
            ${selectedOption !== null
              ? 'bg-amber-500 hover:bg-amber-600 text-white'
              : 'bg-amber-200 dark:bg-amber-800 text-amber-400 dark:text-amber-600 cursor-not-allowed'
            }
          `}
        >
          Check Answer
        </button>
      ) : (
        <button
          onClick={handleContinue}
          className={`
            w-full py-2.5 rounded-lg font-medium text-sm transition-colors
            ${feedbackCorrect
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-amber-500 hover:bg-amber-600 text-white'
            }
          `}
        >
          {feedbackCorrect
            ? isLastQuestion
              ? 'Continue to Next Step'
              : 'Next Question'
            : 'Try Again'
          }
        </button>
      )}

      {/* Context reminder */}
      <p className="mt-3 text-xs text-amber-600 dark:text-amber-400 text-center">
        Step: {stepTitle}
      </p>
    </div>
  )
}
