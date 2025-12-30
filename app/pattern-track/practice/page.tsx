'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import MobileNav from '@/components/MobileNav'
import type { Question, Pattern } from '@/lib/patternTrack'
import LatexRenderer from '@/components/LatexRenderer'

// Temporary user ID
const USER_ID = 'local_user'

interface QuestionWithPatterns extends Question {
  patterns: Pattern[]
}

function PracticeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [questions, setQuestions] = useState<QuestionWithPatterns[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([])
  const [showAnswer, setShowAnswer] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [results, setResults] = useState<{ correct: number; total: number }>({ correct: 0, total: 0 })
  const [allPatterns, setAllPatterns] = useState<Pattern[]>([])
  const [startTime, setStartTime] = useState<number>(Date.now())

  const mode = searchParams.get('mode') || 'mixed'
  const count = parseInt(searchParams.get('count') || '10', 10)
  const patternsParam = searchParams.get('patterns')
  const focusPatterns = useMemo(
    () => patternsParam?.split(',').filter(Boolean) || [],
    [patternsParam]
  )

  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true)

      // Load all patterns for selection
      const patternsRes = await fetch('/api/pattern-track/patterns')
      if (patternsRes.ok) {
        const data = await patternsRes.json()
        setAllPatterns(data.patterns || [])
      }

      // Load practice questions
      let url = `/api/pattern-track/practice?mode=${mode}&count=${count}`
      if (focusPatterns.length > 0) {
        url += `&pattern_ids=${focusPatterns.join(',')}`
      }

      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setQuestions(data.questions || [])
      }
    } catch (error) {
      console.error('Error loading questions:', error)
    } finally {
      setLoading(false)
      setStartTime(Date.now())
    }
  }, [mode, count, focusPatterns])

  useEffect(() => {
    loadQuestions()
  }, [loadQuestions])

  const currentQuestion = questions[currentIndex]

  const handlePatternToggle = (patternId: string) => {
    if (showAnswer) return

    setSelectedPatterns(prev =>
      prev.includes(patternId)
        ? prev.filter(id => id !== patternId)
        : [...prev, patternId]
    )
  }

  const handleSubmit = async () => {
    if (!currentQuestion) return

    // Check if selected patterns match the question's patterns
    const correctPatternIds = currentQuestion.pattern_refs
      .filter(ref => ref.relevance === 'primary')
      .map(ref => ref.pattern_id)

    const isAnswerCorrect = correctPatternIds.every(id => selectedPatterns.includes(id)) &&
      selectedPatterns.every(id => correctPatternIds.includes(id) ||
        currentQuestion.pattern_refs.some(ref => ref.pattern_id === id))

    setIsCorrect(isAnswerCorrect)
    setShowAnswer(true)
    setResults(prev => ({
      correct: prev.correct + (isAnswerCorrect ? 1 : 0),
      total: prev.total + 1,
    }))

    // Record the attempt
    const timeTaken = Math.round((Date.now() - startTime) / 1000)
    try {
      await fetch('/api/pattern-track/practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: USER_ID,
          question_id: currentQuestion.id,
          identified_pattern_ids: selectedPatterns,
          is_correct: isAnswerCorrect,
          time_taken_seconds: timeTaken,
        }),
      })
    } catch (error) {
      console.error('Error recording attempt:', error)
    }
  }

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedPatterns([])
      setShowAnswer(false)
      setIsCorrect(null)
      setStartTime(Date.now())
    } else {
      setSessionComplete(true)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
        <MobileNav />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        </div>
      </div>
    )
  }

  if (sessionComplete) {
    const percentage = Math.round((results.correct / results.total) * 100)

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
        <MobileNav />
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-8 text-center border border-transparent dark:border-dark-border">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-4xl">
                {percentage >= 80 ? '🎉' : percentage >= 50 ? '👍' : '💪'}
              </span>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
              Session Complete!
            </h2>

            <p className="text-4xl font-bold text-accent mb-2">
              {results.correct}/{results.total}
            </p>

            <p className="text-gray-600 dark:text-dark-text-secondary mb-8">
              {percentage >= 80
                ? "Excellent! You're mastering these patterns."
                : percentage >= 50
                  ? 'Good progress! Keep practicing.'
                  : "Keep going! Practice makes perfect."}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  setSessionComplete(false)
                  setCurrentIndex(0)
                  setResults({ correct: 0, total: 0 })
                  setSelectedPatterns([])
                  setShowAnswer(false)
                  setIsCorrect(null)
                  loadQuestions()
                }}
                className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-strong transition-colors font-medium"
              >
                Practice Again
              </button>
              <button
                onClick={() => router.push('/pattern-track')}
                className="px-6 py-3 bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-border transition-colors font-medium"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
        <MobileNav />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
              No questions available for this practice session.
            </p>
            <button
              onClick={() => router.push('/pattern-track')}
              className="text-accent hover:underline"
            >
              Back to Pattern Track
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
      <MobileNav />
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-dark-text-muted mb-2">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>{results.correct}/{results.total} correct</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-dark-card-soft rounded-full h-2">
            <div
              className="bg-accent h-2 rounded-full transition-all"
              style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 sm:p-8 mb-6 border border-transparent dark:border-dark-border">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-1 bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-muted text-xs rounded capitalize">
              {currentQuestion.category}
            </span>
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded">
              Difficulty {currentQuestion.difficulty}
            </span>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
            Which pattern(s) apply to this problem?
          </h2>

          <div className="p-4 bg-gray-50 dark:bg-dark-card-soft rounded-lg mb-6">
            <LatexRenderer content={currentQuestion.problem_text} />
          </div>

          {/* Hints */}
          {currentQuestion.hints.length > 0 && !showAnswer && (
            <details className="mb-6">
              <summary className="text-sm text-accent cursor-pointer hover:underline">
                Need a hint?
              </summary>
              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300">
                {currentQuestion.hints[0].text}
              </div>
            </details>
          )}
        </div>

        {/* Pattern Selection */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 mb-6 border border-transparent dark:border-dark-border">
          <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
            Select all patterns that apply:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allPatterns.map(pattern => {
              const isSelected = selectedPatterns.includes(pattern.id)
              const isCorrectPattern = currentQuestion.pattern_refs.some(
                ref => ref.pattern_id === pattern.id
              )
              const isPrimary = currentQuestion.pattern_refs.some(
                ref => ref.pattern_id === pattern.id && ref.relevance === 'primary'
              )

              let borderColor = 'border-gray-200 dark:border-dark-border'
              let bgColor = 'bg-white dark:bg-dark-card'

              if (showAnswer) {
                if (isCorrectPattern) {
                  borderColor = 'border-green-500'
                  bgColor = 'bg-green-50 dark:bg-green-900/20'
                } else if (isSelected) {
                  borderColor = 'border-red-500'
                  bgColor = 'bg-red-50 dark:bg-red-900/20'
                }
              } else if (isSelected) {
                borderColor = 'border-accent'
                bgColor = 'bg-accent/5'
              }

              return (
                <button
                  key={pattern.id}
                  onClick={() => handlePatternToggle(pattern.id)}
                  disabled={showAnswer}
                  className={`p-4 rounded-lg border-2 ${borderColor} ${bgColor} text-left transition-all ${
                    !showAnswer ? 'hover:border-accent cursor-pointer' : 'cursor-default'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-dark-text-primary">
                        {pattern.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-text-muted capitalize mt-1">
                        {pattern.category}
                      </p>
                    </div>
                    {showAnswer && isCorrectPattern && (
                      <span className={`text-xs font-medium ${isPrimary ? 'text-green-600' : 'text-blue-600'}`}>
                        {isPrimary ? 'Primary' : 'Secondary'}
                      </span>
                    )}
                    {isSelected && !showAnswer && (
                      <svg className="w-5 h-5 text-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Answer Feedback */}
        {showAnswer && (
          <div className={`mb-6 p-4 rounded-lg ${
            isCorrect
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'
          }`}>
            <p className={`font-semibold mb-2 ${isCorrect ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'}`}>
              {isCorrect ? 'Correct!' : 'Not quite right'}
            </p>
            <p className="text-sm text-gray-700 dark:text-dark-text-secondary">
              {currentQuestion.solution_explanation}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          {!showAnswer ? (
            <button
              onClick={handleSubmit}
              disabled={selectedPatterns.length === 0}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedPatterns.length === 0
                  ? 'bg-gray-200 dark:bg-dark-card-soft text-gray-400 dark:text-dark-text-muted cursor-not-allowed'
                  : 'bg-accent text-white hover:bg-accent-strong'
              }`}
            >
              Check Answer
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-strong transition-colors font-medium"
            >
              {currentIndex < questions.length - 1 ? 'Next Question' : 'See Results'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PracticePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        </div>
      </div>
    }>
      <PracticeContent />
    </Suspense>
  )
}
