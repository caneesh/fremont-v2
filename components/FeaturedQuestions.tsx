'use client'

import { useState, useEffect } from 'react'
import type { Question } from '@/types/studyPath'

interface FeaturedQuestionsProps {
  onSelectQuestion: (questionStatement: string, questionId: string) => void
}

export default function FeaturedQuestions({ onSelectQuestion }: FeaturedQuestionsProps) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const response = await fetch('/api/study-path/questions')
        if (response.ok) {
          const data = await response.json()
          // Get a mix of difficulties - 2 Easy, 2 Medium, 1 Hard
          const allQuestions = data.questions || []
          const easy = allQuestions.filter((q: Question) => q.difficulty === 'Easy').slice(0, 2)
          const medium = allQuestions.filter((q: Question) => q.difficulty === 'Medium').slice(0, 2)
          const hard = allQuestions.filter((q: Question) => q.difficulty === 'Hard').slice(0, 1)
          setQuestions([...easy, ...medium, ...hard])
        }
      } catch (error) {
        console.error('Error loading questions:', error)
      } finally {
        setLoading(false)
      }
    }

    loadQuestions()
  }, [])

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'Medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'Hard':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
          Featured Problems
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-dark-card rounded-lg p-4 animate-pulse border border-gray-200 dark:border-dark-border">
              <div className="h-4 bg-gray-200 dark:bg-dark-card-soft rounded w-3/4 mb-3"></div>
              <div className="h-3 bg-gray-200 dark:bg-dark-card-soft rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-dark-card-soft rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
          Quick Start Problems
        </h2>
        <span className="text-xs text-gray-500 dark:text-dark-text-muted">
          Click to solve instantly
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {questions.map((question) => (
          <button
            key={question.id}
            onClick={() => onSelectQuestion(question.statement, question.id)}
            className="bg-white dark:bg-dark-card rounded-lg p-4 text-left border border-gray-200 dark:border-dark-border hover:border-accent dark:hover:border-accent hover:shadow-md dark:hover:shadow-dark-md transition-all group"
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <h3 className="font-medium text-gray-900 dark:text-dark-text-primary group-hover:text-accent line-clamp-1">
                {question.title}
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold shrink-0 ${getDifficultyColor(question.difficulty)}`}>
                {question.difficulty}
              </span>
            </div>

            <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-2 mb-3">
              {question.statement.slice(0, 100)}...
            </p>

            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-dark-text-muted">
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {question.expectedTime} min
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                {question.concepts.length} concepts
              </span>
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-sm text-gray-500 dark:text-dark-text-muted mt-4">
        Or enter your own problem below
      </p>
    </div>
  )
}
