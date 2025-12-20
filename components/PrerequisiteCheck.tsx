'use client'

import { useState, useEffect } from 'react'
import type { PrerequisiteQuestion, PrerequisiteAnswer, PrerequisiteResult } from '@/types/prerequisites'
import { authenticatedFetch, handleQuotaExceeded } from '@/lib/api/apiClient'

interface PrerequisiteCheckProps {
  concepts: Array<{
    id: string
    name: string
    definition: string
    formula?: string
  }>
  onComplete: (result: PrerequisiteResult) => void
  onSkip?: () => void
}

export default function PrerequisiteCheck({ concepts, onComplete, onSkip }: PrerequisiteCheckProps) {
  const [questions, setQuestions] = useState<PrerequisiteQuestion[]>([])
  const [answers, setAnswers] = useState<PrerequisiteAnswer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [passingScore, setPassingScore] = useState(2)

  useEffect(() => {
    loadQuestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadQuestions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch('/api/prerequisites', {
        method: 'POST',
        body: JSON.stringify({ concepts }),
      })

      // Check for quota exceeded
      if (await handleQuotaExceeded(response)) {
        setIsLoading(false)
        setError('Daily prerequisite check limit reached')
        return
      }

      if (!response.ok) {
        throw new Error('Failed to generate prerequisite questions')
      }

      const data = await response.json()
      setQuestions(data.questions || [])
      setPassingScore(data.passingScore || 2)

      // Initialize empty answers
      setAnswers(data.questions.map((_: any, idx: number) => ({
        questionIndex: idx,
        conceptId: data.questions[idx].conceptId,
        answer: '',
      })))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load questions')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAnswerChange = (index: number, value: string) => {
    setAnswers(prev => {
      const newAnswers = [...prev]
      newAnswers[index] = {
        ...newAnswers[index],
        answer: value,
      }
      return newAnswers
    })
  }

  const handleSubmit = () => {
    // Check answers
    const checkedAnswers = answers.map((ans, idx) => {
      const question = questions[idx]
      const isCorrect = question.expectedAnswer
        ? ans.answer.toLowerCase().trim() === question.expectedAnswer.toLowerCase().trim()
        : false

      return {
        ...ans,
        isCorrect,
      }
    })

    const correctCount = checkedAnswers.filter(a => a.isCorrect).length
    const passed = correctCount >= passingScore

    const weakConcepts = checkedAnswers
      .filter(a => !a.isCorrect)
      .map(a => questions.find(q => q.conceptId === a.conceptId)?.conceptName || '')
      .filter(name => name !== '')

    const result: PrerequisiteResult = {
      totalQuestions: questions.length,
      correctAnswers: correctCount,
      passed,
      weakConcepts,
      answers: checkedAnswers,
    }

    onComplete(result)
  }

  const allAnswered = answers.every(a => a.answer.trim() !== '')

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center justify-center py-12">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mr-3"></div>
            <p className="text-gray-600">Generating prerequisite check...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={loadQuestions}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Try Again
              </button>
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Skip Check
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8 border-2 border-blue-400">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Prerequisites Check
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Quick verification of core concepts before you begin
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Before diving in:</span> Answer {questions.length} quick questions to verify you understand the fundamentals. This ensures you won&apos;t waste time on a problem you&apos;re not ready for.
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Passing score: {passingScore}/{questions.length} correct • Takes ~1 minute
            </p>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((question, index) => (
            <div
              key={index}
              className="bg-gray-50 border-2 border-gray-300 rounded-lg p-5"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-700 font-semibold mb-1">
                    {question.conceptName}
                  </p>
                  <p className="text-base font-medium text-gray-900">
                    {question.question}
                  </p>
                </div>
              </div>

              {/* Answer Input */}
              <div className="ml-11">
                {question.type === 'multiple-choice' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                          answers[index]?.answer === option
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${index}`}
                          value={option}
                          checked={answers[index]?.answer === option}
                          onChange={(e) => handleAnswerChange(index, e.target.value)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="ml-3 text-sm text-gray-900">{option}</span>
                      </label>
                    ))}
                  </div>
                )}

                {question.type === 'true-false' && (
                  <div className="flex gap-3">
                    <label className={`flex-1 flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      answers[index]?.answer === 'True'
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300 hover:border-green-300'
                    }`}>
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value="True"
                        checked={answers[index]?.answer === 'True'}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        className="w-4 h-4 text-green-600"
                      />
                      <span className="ml-2 font-medium text-gray-900">True</span>
                    </label>
                    <label className={`flex-1 flex items-center justify-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                      answers[index]?.answer === 'False'
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-300 hover:border-red-300'
                    }`}>
                      <input
                        type="radio"
                        name={`question-${index}`}
                        value="False"
                        checked={answers[index]?.answer === 'False'}
                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                        className="w-4 h-4 text-red-600"
                      />
                      <span className="ml-2 font-medium text-gray-900">False</span>
                    </label>
                  </div>
                )}

                {question.type === 'short-answer' && (
                  <input
                    type="text"
                    value={answers[index]?.answer || ''}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    placeholder="Type your brief answer here..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}

                <p className="text-xs text-gray-600 mt-2 italic">
                  {question.explanation}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-5 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:border-gray-400"
            >
              Skip This Check
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="ml-auto px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Submit Answers
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
