'use client'

import { useState, useEffect } from 'react'
import type { ReflectionAnswer } from '@/types/history'

interface ReflectionStepProps {
  problemText: string
  studentOutcome: 'solved' | 'assisted' | 'struggled'
  hintsUsed: number[]
  savedReflections?: ReflectionAnswer[]
  onReflectionComplete: (reflections: ReflectionAnswer[]) => void
}

export default function ReflectionStep({
  problemText,
  studentOutcome,
  hintsUsed,
  savedReflections,
  onReflectionComplete,
}: ReflectionStepProps) {
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>(['', ''])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)

  // Load saved reflections if they exist
  useEffect(() => {
    if (savedReflections && savedReflections.length > 0) {
      setQuestions(savedReflections.map(r => r.question))
      setAnswers(savedReflections.map(r => r.answer))
      setIsCompleted(true)
    } else {
      // Generate reflection questions
      loadReflectionQuestions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadReflectionQuestions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/reflection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          problemText,
          studentOutcome,
          hintsUsed,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate reflection questions')
      }

      const data = await response.json()
      setQuestions(data.questions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reflection questions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (index: number, value: string) => {
    const newAnswers = [...answers]
    newAnswers[index] = value
    setAnswers(newAnswers)
  }

  const handleSubmit = () => {
    // Validate that both answers are filled
    if (answers.some(a => !a.trim())) {
      setError('Please answer both reflection questions before continuing.')
      return
    }

    // Create reflection answer objects
    const reflections: ReflectionAnswer[] = questions.map((question, index) => ({
      question,
      answer: answers[index],
    }))

    setIsCompleted(true)
    onReflectionComplete(reflections)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mr-3"></div>
          <p className="text-gray-600">Generating reflection questions...</p>
        </div>
      </div>
    )
  }

  if (error && !questions.length) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={loadReflectionQuestions}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 border-2 border-purple-400">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Reflection: Strengthen Your Learning
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Take a moment to reflect on your problem-solving process. This helps solidify your understanding.
            </p>
          </div>
        </div>

        {!isCompleted && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-purple-900 font-medium">
              Note: Reflection is mandatory. Answer both questions thoughtfully before proceeding.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {questions.map((question, index) => (
          <div key={index} className="bg-gray-50 border-2 border-gray-300 rounded-lg p-5">
            <label className="block mb-3">
              <div className="flex items-start gap-2 mb-2">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </span>
                <p className="text-base font-semibold text-gray-900 flex-1">
                  {question}
                </p>
              </div>
              <textarea
                value={answers[index]}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                disabled={isCompleted}
                placeholder="Write your reflection here..."
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none ${
                  isCompleted
                    ? 'bg-gray-100 border-gray-300 text-gray-700'
                    : 'bg-white border-purple-300'
                }`}
                rows={3}
              />
            </label>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        {isCompleted ? (
          <div className="flex items-center gap-2 text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">Reflection complete</span>
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 flex items-center gap-2"
          >
            Submit Reflection
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
