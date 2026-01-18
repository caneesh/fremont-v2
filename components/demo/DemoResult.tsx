'use client'

/**
 * DemoResult - Result display with explanation and CTA buttons
 */

import Link from 'next/link'
import type { DemoProblem } from '@/lib/demo/demoProblems'

interface DemoResultProps {
  problem: DemoProblem
  userAnswer: string
  isCorrect: boolean
  thinkingAnswers: number[]
  onTryAnother: () => void
  onStartOver: () => void
}

export default function DemoResult({
  problem,
  userAnswer,
  isCorrect,
  thinkingAnswers,
  onTryAnother,
  onStartOver,
}: DemoResultProps) {
  // Calculate how many thinking questions were answered correctly
  const correctThinkingCount = thinkingAnswers.filter(
    (answer, idx) => answer === problem.thinkingGate[idx]?.correctIndex
  ).length

  return (
    <div className="space-y-6">
      {/* Result Banner */}
      <div
        className={`rounded-xl shadow-lg p-8 text-center ${
          isCorrect
            ? 'bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200'
            : 'bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200'
        }`}
      >
        <div
          className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
            isCorrect ? 'bg-green-100' : 'bg-amber-100'
          }`}
        >
          {isCorrect ? (
            <svg
              className="w-10 h-10 text-green-600"
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
          ) : (
            <svg
              className="w-10 h-10 text-amber-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
        </div>
        <h2
          className={`text-2xl font-bold mb-2 ${
            isCorrect ? 'text-green-800' : 'text-amber-800'
          }`}
        >
          {isCorrect ? 'Excellent Work!' : 'Good Attempt!'}
        </h2>
        <p className={isCorrect ? 'text-green-700' : 'text-amber-700'}>
          {isCorrect
            ? 'You solved the problem correctly!'
            : "Let's understand what went wrong."}
        </p>
        <div className="mt-4 flex justify-center gap-4 text-sm">
          <div className="px-4 py-2 bg-white/60 rounded-lg">
            <span className="font-medium">Your Answer:</span> {userAnswer}
          </div>
          <div className="px-4 py-2 bg-white/60 rounded-lg">
            <span className="font-medium">Correct Answer:</span> {problem.expectedAnswer}
          </div>
        </div>
      </div>

      {/* Thinking Gate Performance */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="text-xl">🤔</span>
          Thinking Gate Performance
        </h3>
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700">Conceptual Questions</span>
            <span className="font-medium text-gray-900">
              {correctThinkingCount} / {problem.thinkingGate.length} correct
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500"
              style={{
                width: `${(correctThinkingCount / problem.thinkingGate.length) * 100}%`,
              }}
            />
          </div>
        </div>
        <p className="text-sm text-gray-600">
          {correctThinkingCount === problem.thinkingGate.length
            ? 'Great conceptual understanding! This solid foundation helps prevent errors.'
            : 'Reviewing the conceptual questions can help strengthen your understanding.'}
        </p>
      </div>

      {/* Explanation */}
      <div className="bg-blue-50 rounded-xl shadow-lg p-6 border border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-600"
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
          Solution Explanation
        </h3>
        <p className="text-blue-800 leading-relaxed">{problem.explanation}</p>
      </div>

      {/* Common Mistake */}
      <div className="bg-rose-50 rounded-xl shadow-lg p-6 border border-rose-200">
        <h3 className="text-lg font-semibold text-rose-900 mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-rose-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Common Mistake to Avoid
        </h3>
        <p className="text-rose-800 leading-relaxed">
          {problem.commonMistakeExplained}
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          What would you like to do next?
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={onTryAnother}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Try Another Problem
          </button>
          <button
            onClick={onStartOver}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Back to Problem Selection
          </button>
        </div>

        {/* Sign Up CTA */}
        <div className="mt-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
          <div className="text-center">
            <h4 className="font-semibold text-gray-900 mb-2">
              Want to track your progress?
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Create a free account to save your progress, access more problems, and get
              personalized recommendations.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-colors shadow"
            >
              Get Started Free
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
