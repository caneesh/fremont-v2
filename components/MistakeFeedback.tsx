'use client'

import type { AnalyzeMistakeResponse } from '@/types/spotTheMistake'

interface MistakeFeedbackProps {
  feedback: AnalyzeMistakeResponse
  onTryAnother: () => void
}

export default function MistakeFeedback({ feedback, onTryAnother }: MistakeFeedbackProps) {
  const { isCorrect, feedback: message, correctApproach, encouragement } = feedback

  return (
    <div className="max-w-4xl mx-auto">
      <div className={`rounded-lg shadow-lg p-4 sm:p-6 md:p-8 ${
        isCorrect ? 'bg-green-50 border-2 border-green-500' : 'bg-yellow-50 border-2 border-yellow-500'
      }`}>
        {/* Result Icon */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 ${
            isCorrect ? 'bg-green-100' : 'bg-yellow-100'
          }`}>
            {isCorrect ? (
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>

          <h2 className={`text-2xl sm:text-3xl font-bold mb-2 ${
            isCorrect ? 'text-green-900' : 'text-yellow-900'
          }`}>
            {isCorrect ? 'Excellent Analysis!' : 'Good Effort!'}
          </h2>
        </div>

        {/* Feedback Message */}
        <div className="space-y-4 mb-6">
          <div className={`p-4 rounded-lg border-2 ${
            isCorrect ? 'bg-white border-green-300' : 'bg-white border-yellow-300'
          }`}>
            <h3 className="font-semibold text-gray-900 mb-2">Feedback</h3>
            <p className="text-sm sm:text-base text-gray-800">{message}</p>
          </div>

          {/* Correct Approach */}
          <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Correct Approach
            </h3>
            <p className="text-sm text-blue-900">{correctApproach}</p>
          </div>

          {/* Encouragement */}
          <div className={`p-4 rounded-lg border-2 ${
            isCorrect ? 'bg-green-100 border-green-400' : 'bg-yellow-100 border-yellow-400'
          }`}>
            <p className="text-sm sm:text-base font-medium ${isCorrect ? 'text-green-900' : 'text-yellow-900'}">
              💡 {encouragement}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onTryAnother}
            className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors text-base"
          >
            Try Another Problem
          </button>
        </div>

        {/* Learning Tip */}
        {!isCorrect && (
          <div className="mt-6 p-3 bg-white rounded-lg border border-gray-300">
            <p className="text-xs sm:text-sm text-gray-700">
              <strong>💡 Tip:</strong> When reviewing solutions, focus on:
              <br/>• Are the right physics laws being applied?
              <br/>• Is the reference frame consistent?
              <br/>• Are all forces/quantities accounted for?
              <br/>• Do the signs and directions make sense?
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
