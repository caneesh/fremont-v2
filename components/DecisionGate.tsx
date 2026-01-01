'use client'

import { useState, useCallback } from 'react'
import type { StepDecisionGateState } from '@/types/gatingPolicy'
import type { MicroTask, MultipleChoiceTask, FillBlankTask } from '@/types/microTask'

interface DecisionGateProps {
  /** Current gate state */
  gateState: StepDecisionGateState
  /** The micro-task to display */
  task: MicroTask
  /** Number of correct answers required */
  requiredCount: number
  /** Maximum attempts before auto-unlock */
  maxAttempts: number
  /** Callback when user submits an answer */
  onAnswer: (isCorrect: boolean, explanation: string) => void
  /** Callback when hint should be auto-unlocked */
  onAutoUnlockHint: () => void
}

/**
 * DecisionGate Component
 *
 * A gate that requires users to correctly answer micro-tasks before
 * they can submit/complete a step. For concept, setup, equation steps.
 *
 * Features:
 * - Shows MCQ or Fill-in-the-blank task
 * - Targeted feedback on wrong answers
 * - Retry up to maxAttempts, then auto-unlock hint
 * - Progress indicator for required correct answers
 */
export default function DecisionGate({
  gateState,
  task,
  requiredCount,
  maxAttempts,
  onAnswer,
  onAutoUnlockHint,
}: DecisionGateProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [fillBlankAnswer, setFillBlankAnswer] = useState<string>('')
  const [showFeedback, setShowFeedback] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState('')

  const attemptsRemaining = maxAttempts - gateState.currentAttempts

  const handleMCQSelect = useCallback((index: number) => {
    if (showFeedback) return
    setSelectedOption(index)
  }, [showFeedback])

  const handleFillBlankChange = useCallback((value: string) => {
    if (showFeedback) return
    setFillBlankAnswer(value)
  }, [showFeedback])

  const handleSubmit = useCallback(() => {
    let correct = false
    let feedback = ''

    if (task.type === 'MULTIPLE_CHOICE') {
      const mcqTask = task as MultipleChoiceTask
      correct = selectedOption === mcqTask.correctIndex

      if (!correct && mcqTask.feedbackPerOption && selectedOption !== null) {
        feedback = mcqTask.feedbackPerOption[selectedOption] || task.explanation
      } else {
        feedback = task.explanation
      }
    } else if (task.type === 'FILL_BLANK') {
      const fillTask = task as FillBlankTask
      const userAnswer = fillBlankAnswer.trim()
      const correctAnswer = fillTask.correctTerm

      correct = fillTask.caseSensitive
        ? userAnswer === correctAnswer
        : userAnswer.toLowerCase() === correctAnswer.toLowerCase()

      feedback = correct
        ? task.explanation
        : `The correct answer is "${correctAnswer}". ${task.explanation}`
    }

    setIsCorrect(correct)
    setFeedbackMessage(feedback)
    setShowFeedback(true)

    onAnswer(correct, task.explanation)

    // Check if should auto-unlock hint
    if (!correct && gateState.currentAttempts + 1 >= maxAttempts) {
      // Will auto-unlock after feedback is shown
    }
  }, [task, selectedOption, fillBlankAnswer, onAnswer, gateState.currentAttempts, maxAttempts])

  const handleContinue = useCallback(() => {
    if (isCorrect) {
      // Reset for next task if needed
      setSelectedOption(null)
      setFillBlankAnswer('')
      setShowFeedback(false)
    } else {
      // Check if should auto-unlock
      if (gateState.currentAttempts >= maxAttempts) {
        onAutoUnlockHint()
      }
      // Let them try again
      setSelectedOption(null)
      setFillBlankAnswer('')
      setShowFeedback(false)
    }
  }, [isCorrect, gateState.currentAttempts, maxAttempts, onAutoUnlockHint])

  const canSubmit = task.type === 'MULTIPLE_CHOICE'
    ? selectedOption !== null
    : fillBlankAnswer.trim().length > 0

  return (
    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-300 dark:border-indigo-700 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500 rounded-lg">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 text-sm">
              Decision Check
            </h4>
            <p className="text-xs text-indigo-600 dark:text-indigo-300">
              Answer correctly to unlock step completion
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1">
          {Array.from({ length: requiredCount }).map((_, idx) => (
            <div
              key={idx}
              className={`
                w-2 h-2 rounded-full
                ${idx < gateState.microTasksPassedCount
                  ? 'bg-green-500'
                  : 'bg-indigo-200 dark:bg-indigo-700'
                }
              `}
            />
          ))}
        </div>
      </div>

      {/* Attempts remaining warning */}
      {gateState.currentAttempts > 0 && !showFeedback && (
        <div className="mb-3 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg">
          <p className="text-xs text-amber-800 dark:text-amber-200">
            {attemptsRemaining === 1
              ? 'Last attempt! A hint will be shown if incorrect.'
              : `${attemptsRemaining} attempts remaining`
            }
          </p>
        </div>
      )}

      {/* Question */}
      <div className="mb-4">
        <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-3">
          {task.question}
        </p>

        {/* MCQ Options */}
        {task.type === 'MULTIPLE_CHOICE' && (
          <div className="space-y-2">
            {(task as MultipleChoiceTask).options.map((option, idx) => {
              const isSelected = selectedOption === idx
              const isCorrectOption = idx === (task as MultipleChoiceTask).correctIndex
              const showAsCorrect = showFeedback && isCorrectOption
              const showAsWrong = showFeedback && isSelected && !isCorrectOption

              return (
                <button
                  key={idx}
                  onClick={() => handleMCQSelect(idx)}
                  disabled={showFeedback}
                  className={`
                    w-full text-left p-3 rounded-lg border-2 transition-all
                    ${isSelected && !showFeedback
                      ? 'border-indigo-500 bg-indigo-100 dark:bg-indigo-800/50'
                      : showAsCorrect
                        ? 'border-green-500 bg-green-100 dark:bg-green-900/30'
                        : showAsWrong
                          ? 'border-red-500 bg-red-100 dark:bg-red-900/30'
                          : 'border-indigo-200 dark:border-indigo-700 hover:border-indigo-400'
                    }
                    ${showFeedback ? 'cursor-default' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0
                      ${isSelected && !showFeedback
                        ? 'border-indigo-500 bg-indigo-500'
                        : showAsCorrect
                          ? 'border-green-500 bg-green-500'
                          : showAsWrong
                            ? 'border-red-500 bg-red-500'
                            : 'border-indigo-300 dark:border-indigo-600'
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
                    <span className="text-sm text-indigo-900 dark:text-indigo-100">
                      {option}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Fill-in-the-blank */}
        {task.type === 'FILL_BLANK' && (
          <div className="space-y-3">
            <p className="text-sm text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-800/50 p-3 rounded-lg">
              {(task as FillBlankTask).sentence.replace('____', '______')}
            </p>

            <div className="flex flex-wrap gap-2">
              {[(task as FillBlankTask).correctTerm, ...(task as FillBlankTask).distractors]
                .sort(() => Math.random() - 0.5)
                .map((option, idx) => {
                  const isSelected = fillBlankAnswer === option
                  const isCorrectOption = option === (task as FillBlankTask).correctTerm
                  const showAsCorrect = showFeedback && isCorrectOption
                  const showAsWrong = showFeedback && isSelected && !isCorrectOption

                  return (
                    <button
                      key={idx}
                      onClick={() => handleFillBlankChange(option)}
                      disabled={showFeedback}
                      className={`
                        px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all
                        ${isSelected && !showFeedback
                          ? 'border-indigo-500 bg-indigo-500 text-white'
                          : showAsCorrect
                            ? 'border-green-500 bg-green-500 text-white'
                            : showAsWrong
                              ? 'border-red-500 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              : 'border-indigo-200 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200 hover:border-indigo-400'
                        }
                        ${showFeedback ? 'cursor-default' : 'cursor-pointer'}
                      `}
                    >
                      {option}
                    </button>
                  )
                })}
            </div>
          </div>
        )}
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div className={`
          p-3 rounded-lg mb-4
          ${isCorrect
            ? 'bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700'
            : 'bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700'
          }
        `}>
          <div className="flex items-start gap-2">
            {isCorrect ? (
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
                ${isCorrect ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}
              `}>
                {isCorrect ? 'Correct!' : 'Not quite right.'}
              </p>
              <p className={`
                text-sm mt-1
                ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}
              `}>
                {feedbackMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action button */}
      {!showFeedback ? (
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`
            w-full py-2.5 rounded-lg font-medium text-sm transition-colors
            ${canSubmit
              ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
              : 'bg-indigo-200 dark:bg-indigo-800 text-indigo-400 dark:text-indigo-600 cursor-not-allowed'
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
            ${isCorrect
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-indigo-500 hover:bg-indigo-600 text-white'
            }
          `}
        >
          {isCorrect ? 'Continue' : 'Try Again'}
        </button>
      )}

      {/* Gate status */}
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-indigo-600 dark:text-indigo-400">
        <span>{gateState.microTasksPassedCount}/{requiredCount} correct</span>
        <span>•</span>
        <span>Level {task.level}: {task.levelTitle}</span>
      </div>
    </div>
  )
}
