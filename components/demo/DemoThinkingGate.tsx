'use client'

/**
 * DemoThinkingGate - Mandatory conceptual checkpoint before solving
 *
 * Requirements:
 * - 4 mandatory thinking questions
 * - Must complete all before solving
 * - No correctness feedback (just collecting responses)
 * - Persist completion in localStorage
 */

import { useState, useCallback } from 'react'
import type { DemoProblem } from '@/lib/demo/demoProblems'

interface DemoThinkingGateProps {
  problem: DemoProblem
  initialAnswers?: number[]
  onComplete: (answers: number[]) => void
}

export default function DemoThinkingGate({
  problem,
  initialAnswers = [],
  onComplete,
}: DemoThinkingGateProps) {
  const [currentQuestion, setCurrentQuestion] = useState(
    initialAnswers.length < problem.thinkingGate.length ? initialAnswers.length : 0
  )
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(initialAnswers)
  const [isAnimating, setIsAnimating] = useState(false)

  const questions = problem.thinkingGate
  const totalQuestions = questions.length
  const isComplete = selectedAnswers.length >= totalQuestions

  const handleSelectOption = useCallback(
    (optionIndex: number) => {
      if (isAnimating) return

      setIsAnimating(true)

      // Record the answer
      const newAnswers = [...selectedAnswers]
      newAnswers[currentQuestion] = optionIndex
      setSelectedAnswers(newAnswers)

      // Move to next question after brief animation
      setTimeout(() => {
        if (currentQuestion < totalQuestions - 1) {
          setCurrentQuestion(currentQuestion + 1)
        }
        setIsAnimating(false)
      }, 300)
    },
    [currentQuestion, totalQuestions, selectedAnswers, isAnimating]
  )

  const handleProceedToSolve = useCallback(() => {
    onComplete(selectedAnswers)
  }, [selectedAnswers, onComplete])

  const handleGoBack = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1)
    }
  }, [currentQuestion])

  const currentQ = questions[currentQuestion]

  return (
    <div className="space-y-6">
      {/* Problem Statement */}
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg dark:shadow-dark-lg p-6 border border-gray-200 dark:border-dark-border">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
            {problem.exam}
          </span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary text-xs font-medium rounded">
            {problem.topic}
          </span>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3">Problem</h2>
        <p className="text-gray-800 dark:text-dark-text-primary leading-relaxed">{problem.statement}</p>
      </div>

      {/* Thinking Gate Section */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl shadow-lg dark:shadow-dark-lg p-6 border border-indigo-100 dark:border-indigo-800">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-200">Think First</h3>
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Answer these conceptual questions before solving
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-indigo-700 dark:text-indigo-300 mb-2">
            <span>
              Question {Math.min(currentQuestion + 1, totalQuestions)} of {totalQuestions}
            </span>
            <span>{selectedAnswers.length} answered</span>
          </div>
          <div className="h-2 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{
                width: `${(selectedAnswers.length / totalQuestions) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Question Display */}
        {!isComplete && currentQ && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-dark-card rounded-lg p-4 shadow-sm dark:shadow-dark-lg">
              <p className="text-gray-900 dark:text-dark-text-primary font-medium">{currentQ.question}</p>
            </div>

            {/* Options */}
            <div className="grid gap-3">
              {currentQ.options.map((option, idx) => {
                const isSelected = selectedAnswers[currentQuestion] === idx
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    disabled={isAnimating}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md'
                        : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm'
                    } ${isAnimating ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                          isSelected
                            ? 'bg-indigo-500 text-white'
                            : 'bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-secondary'
                        }`}
                      >
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-gray-800 dark:text-dark-text-primary">{option}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <button
                onClick={handleGoBack}
                disabled={currentQuestion === 0}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  currentQuestion === 0
                    ? 'text-gray-400 dark:text-dark-text-muted cursor-not-allowed'
                    : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                }`}
              >
                Previous
              </button>
              <div className="flex gap-1">
                {questions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      idx === currentQuestion
                        ? 'bg-indigo-500'
                        : selectedAnswers[idx] !== undefined
                        ? 'bg-indigo-300 dark:bg-indigo-600'
                        : 'bg-gray-300 dark:bg-dark-border'
                    }`}
                    aria-label={`Go to question ${idx + 1}`}
                  />
                ))}
              </div>
              <div className="w-20" /> {/* Spacer for alignment */}
            </div>
          </div>
        )}

        {/* Completion State */}
        {isComplete && (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
              Great thinking!
            </h4>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
              You&apos;ve thought through the key concepts. Now let&apos;s solve the problem.
            </p>
            <button
              onClick={handleProceedToSolve}
              className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Proceed to Solve
            </button>
          </div>
        )}
      </div>

      {/* Why This Matters */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Why the Thinking Gate?
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Research shows that pausing to think about concepts before calculating
              dramatically reduces careless mistakes and builds deeper understanding.
              This is not a test - it&apos;s a thinking exercise.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
