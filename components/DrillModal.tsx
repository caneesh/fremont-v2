'use client'

import { useState, useEffect, useCallback } from 'react'
import type { DrillTask } from '@/types/circuitBreaker'
import { ERROR_TAG_LABELS } from '@/types/circuitBreaker'
import { isMultipleChoiceTask, isFillBlankTask } from '@/types/microTask'
import MathRenderer from './MathRenderer'

interface DrillModalProps {
  drill: DrillTask
  onComplete: (success: boolean) => void
  onSkip: () => void
}

export default function DrillModal({ drill, onComplete, onSkip }: DrillModalProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [startTime] = useState(Date.now())

  const tagLabel = ERROR_TAG_LABELS[drill.linkedErrorTag]
  const task = drill.task

  // Check answer
  const handleSubmit = useCallback(() => {
    if (selectedAnswer === null) return

    let correct = false

    if (isMultipleChoiceTask(task)) {
      correct = selectedAnswer === task.correctIndex
    } else if (isFillBlankTask(task)) {
      const answer = String(selectedAnswer).trim()
      correct = task.caseSensitive
        ? answer === task.correctTerm
        : answer.toLowerCase() === task.correctTerm.toLowerCase()
    }

    setIsCorrect(correct)
    setShowFeedback(true)
    setAttempts(prev => prev + 1)

    if (correct) {
      // Success - wait a moment then complete
      setTimeout(() => {
        onComplete(true)
      }, 2000)
    } else if (attempts + 1 >= drill.maxAttempts) {
      // Max attempts reached - show answer
      setShowAnswer(true)
    }
  }, [selectedAnswer, task, attempts, drill.maxAttempts, onComplete])

  // Handle "Got it" after seeing the answer
  const handleGotIt = useCallback(() => {
    onComplete(false)
  }, [onComplete])

  // Try again after wrong answer
  const handleTryAgain = useCallback(() => {
    setSelectedAnswer(null)
    setShowFeedback(false)
  }, [])

  // Keyboard shortcut for submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedAnswer !== null && !showFeedback) {
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedAnswer, showFeedback, handleSubmit])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Quick Drill</h2>
                <p className="text-sm text-white/80">{tagLabel}</p>
              </div>
            </div>
            <button
              onClick={onSkip}
              className="text-white/70 hover:text-white transition-colors p-1"
              title="Skip drill"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Question */}
          <div className="mb-6">
            <p className="text-gray-900 dark:text-dark-text-primary font-medium mb-2">
              <MathRenderer text={task.question} />
            </p>
            {isFillBlankTask(task) && (
              <p className="text-gray-700 dark:text-dark-text-secondary mt-2">
                <MathRenderer text={task.sentence} />
              </p>
            )}
          </div>

          {/* Answer Options */}
          {!showAnswer && (
            <div className="space-y-2 mb-6">
              {isMultipleChoiceTask(task) && (
                <>
                  {task.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => !showFeedback && setSelectedAnswer(index)}
                      disabled={showFeedback}
                      className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                        selectedAnswer === index
                          ? showFeedback
                            ? isCorrect
                              ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                              : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : showFeedback && index === task.correctIndex
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-border-strong'
                      } ${showFeedback ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                          selectedAnswer === index
                            ? showFeedback
                              ? isCorrect
                                ? 'bg-green-500 text-white'
                                : 'bg-red-500 text-white'
                              : 'bg-blue-500 text-white'
                            : showFeedback && index === task.correctIndex
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 dark:bg-dark-border text-gray-600 dark:text-dark-text-secondary'
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span className="text-gray-800 dark:text-dark-text-primary">
                          <MathRenderer text={option} />
                        </span>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {isFillBlankTask(task) && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {[task.correctTerm, ...task.distractors].sort(() => Math.random() - 0.5).map((term, index) => (
                      <button
                        key={index}
                        onClick={() => !showFeedback && setSelectedAnswer(term)}
                        disabled={showFeedback}
                        className={`px-4 py-2 rounded-lg border-2 transition-all ${
                          selectedAnswer === term
                            ? showFeedback
                              ? isCorrect
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                              : 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : showFeedback && term === task.correctTerm
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-border-strong'
                        } ${showFeedback ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <MathRenderer text={term} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback */}
          {showFeedback && (
            <div className={`p-4 rounded-lg mb-4 ${
              isCorrect
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
            }`}>
              {isCorrect ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="font-medium text-green-800 dark:text-green-300">Correct!</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {drill.successMessage}
                  </p>
                </div>
              ) : showAnswer ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium text-amber-800 dark:text-amber-300">Here&apos;s the answer</span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-dark-text-secondary mb-2">
                    <MathRenderer text={task.explanation} />
                  </p>
                  <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
                    {drill.conceptReinforcement}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="font-medium text-amber-800 dark:text-amber-300">Not quite</span>
                  </div>
                  {isMultipleChoiceTask(task) && task.feedbackPerOption && (
                    <p className="text-sm text-gray-700 dark:text-dark-text-secondary">
                      {task.feedbackPerOption[selectedAnswer as number]}
                    </p>
                  )}
                  <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                    {drill.maxAttempts - attempts} attempt{drill.maxAttempts - attempts !== 1 ? 's' : ''} remaining
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!showFeedback ? (
              <button
                onClick={handleSubmit}
                disabled={selectedAnswer === null}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors"
              >
                Check Answer
              </button>
            ) : isCorrect ? (
              <div className="flex-1 flex items-center justify-center gap-2 text-green-600 dark:text-green-400 font-medium">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Continuing...
              </div>
            ) : showAnswer ? (
              <button
                onClick={handleGotIt}
                className="flex-1 px-4 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
              >
                Got it, continue
              </button>
            ) : (
              <button
                onClick={handleTryAgain}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>

          {/* Progress indicator */}
          <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-dark-text-muted">
            <span>Attempt {attempts}/{drill.maxAttempts}</span>
            <span>{Math.round((Date.now() - startTime) / 1000)}s</span>
          </div>
        </div>
      </div>
    </div>
  )
}
