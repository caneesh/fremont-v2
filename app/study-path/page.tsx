'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { studyPathService } from '@/lib/studyPath/studyPathService'
import type { Topic, StudyStats, Question } from '@/types/studyPath'
import MobileNav from '@/components/MobileNav'
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'

export default function StudyPathPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<Topic[]>([])
  const [stats, setStats] = useState<StudyStats | null>(null)
  const [recommendedQuestions, setRecommendedQuestions] = useState<Question[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch topics and questions from API
        const [topicsResponse, questionsResponse] = await Promise.all([
          fetch('/api/study-path/topics'),
          fetch('/api/study-path/questions')
        ])

        if (topicsResponse.ok) {
          const topicsData = await topicsResponse.json()
          setTopics(topicsData.topics || [])
        }

        // Get stats from localStorage
        const studyStats = studyPathService.getStudyStats()
        setStats(studyStats)

        // Calculate recommended questions
        if (questionsResponse.ok) {
          const questionsData = await questionsResponse.json()
          const allQuestions = questionsData.questions || []

          // Find questions not yet attempted
          const unattempted = allQuestions.filter(
            (q: Question) => !Object.values(studyStats.topicProgress).some(
              p => p.questionsAttempted.includes(q.id)
            )
          )

          // Prioritize: Easy unattempted -> Medium unattempted -> Hard unattempted
          const prioritized = [
            ...unattempted.filter((q: Question) => q.difficulty === 'Easy'),
            ...unattempted.filter((q: Question) => q.difficulty === 'Medium'),
            ...unattempted.filter((q: Question) => q.difficulty === 'Hard'),
          ]

          setRecommendedQuestions(prioritized.slice(0, 5))
        }
      } catch (error) {
        console.error('Error loading study path data:', error)
      }
    }

    loadData()
  }, [])

  const getTopicProgress = (topicId: string) => {
    return studyPathService.getTopicCompletionPercentage(topicId)
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy':
        return 'bg-green-100 text-green-800'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'Hard':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Pull to refresh
  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 800))
    window.location.reload()
  }

  const { isPulling, pullDistance } = usePullToRefresh(handleRefresh)

  // Swipe gestures
  useSwipeGesture({
    onSwipeLeft: () => {
      if (window.innerWidth < 768) {
        router.push('/history')
      }
    },
    onSwipeRight: () => {
      if (window.innerWidth < 768) {
        router.push('/concept-network')
      }
    },
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isPulling && pullDistance > 60} />
      <MobileNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
              IIT-JEE Physics Study Path
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary">
              Systematic preparation for IIT-JEE Advanced
            </p>
          </div>
          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-3 justify-end">
            <button
              onClick={() => router.push('/history')}
              className="px-5 py-2.5 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft flex items-center gap-2 transition-all hover:shadow-md dark:hover:shadow-dark-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-5 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-strong flex items-center gap-2 transition-all hover:shadow-lg dark:hover:shadow-dark-glow"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Custom Problem
            </button>
          </div>
        </div>

        {/* Study Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-8">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-6 border border-transparent dark:border-dark-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between">
                <div className="mb-2 sm:mb-0">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted mb-1">Attempted</p>
                  <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.totalQuestionsAttempted}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">📝</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-6 border border-transparent dark:border-dark-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between">
                <div className="mb-2 sm:mb-0">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted mb-1">Solved</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">{stats.totalQuestionsSolved}</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">✓</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-6 border border-transparent dark:border-dark-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between">
                <div className="mb-2 sm:mb-0">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted mb-1">Time</p>
                  <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.totalTimeSpent}m</p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">⏱️</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-6 border border-transparent dark:border-dark-border">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between">
                <div className="mb-2 sm:mb-0">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted mb-1">Success</p>
                  <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {stats.totalQuestionsAttempted > 0
                      ? Math.round((stats.totalQuestionsSolved / stats.totalQuestionsAttempted) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                  <span className="text-xl sm:text-2xl">🎯</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Topics Grid */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-3 sm:mb-4">Study Topics</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {topics.map((topic) => {
              const progress = getTopicProgress(topic.id)
              return (
                <button
                  key={topic.id}
                  onClick={() => router.push(`/study-path/${topic.id}`)}
                  className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-6 hover:shadow-xl dark:hover:shadow-dark-lg active:scale-98 transition-all text-left group min-h-[120px] border border-transparent dark:border-dark-border hover:border-accent dark:hover:border-accent"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{topic.icon}</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary group-hover:text-accent transition-colors">
                          {topic.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-dark-text-muted">{topic.subtopics.length} subtopics</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-dark-text-secondary text-sm mb-4 line-clamp-2">
                    {topic.description}
                  </p>

                  <div className="space-y-3">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-dark-text-muted">Progress</span>
                        <span className="font-semibold text-gray-900 dark:text-dark-text-primary">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-dark-card-soft rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-accent h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Question Count */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-dark-text-muted">{topic.totalQuestions} problems</span>
                      <span className="text-accent font-medium group-hover:underline">
                        Start Practicing →
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Recommended Questions */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 sm:p-8 border border-transparent dark:border-dark-border">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-3 sm:mb-4">Recommended for You</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary mb-4 sm:mb-6">
            Based on your progress, here are the next problems you should try
          </p>

          <div className="space-y-3 sm:space-y-4">
            {recommendedQuestions.map((question) => (
              <button
                key={question.id}
                onClick={() => {
                  // Load the question into the main solver
                  router.push(`/?question=${question.id}`)
                }}
                className="w-full bg-gray-50 dark:bg-dark-card-soft hover:bg-gray-100 dark:hover:bg-dark-border rounded-lg p-4 text-left border-2 border-transparent dark:border-dark-border hover:border-accent dark:hover:border-accent transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-dark-text-primary group-hover:text-accent">
                        {question.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2 line-clamp-2">
                      {question.statement.slice(0, 150)}...
                    </p>
                    <div className="flex items-center gap-3 sm:gap-4 text-xs text-gray-500 dark:text-dark-text-muted flex-wrap">
                      <span>⏱️ {question.expectedTime} min</span>
                      <span>📚 {question.concepts.length} concepts</span>
                      {question.source && <span>📖 {question.source}</span>}
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 dark:text-dark-text-muted group-hover:text-accent ml-3 sm:ml-4 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
