'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { studyPathService } from '@/lib/studyPath/studyPathService'
import type { Topic, StudyStats } from '@/types/studyPath'

export default function StudyPathPage() {
  const router = useRouter()
  const [topics, setTopics] = useState<Topic[]>([])
  const [stats, setStats] = useState<StudyStats | null>(null)

  useEffect(() => {
    const allTopics = studyPathService.getAllTopics()
    const studyStats = studyPathService.getStudyStats()

    setTopics(allTopics)
    setStats(studyStats)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              IIT-JEE Physics Study Path
            </h1>
            <p className="text-gray-600">
              Systematic preparation for IIT-JEE Advanced
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/history')}
              className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Questions Attempted</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalQuestionsAttempted}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">📝</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Questions Solved</p>
                  <p className="text-3xl font-bold text-green-600">{stats.totalQuestionsSolved}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✓</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Time Spent</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.totalTimeSpent}m</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">⏱️</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Success Rate</p>
                  <p className="text-3xl font-bold text-amber-600">
                    {stats.totalQuestionsAttempted > 0
                      ? Math.round((stats.totalQuestionsSolved / stats.totalQuestionsAttempted) * 100)
                      : 0}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">🎯</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Topics Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Study Topics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topics.map((topic) => {
              const progress = getTopicProgress(topic.id)
              return (
                <button
                  key={topic.id}
                  onClick={() => router.push(`/study-path/${topic.id}`)}
                  className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-all text-left group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{topic.icon}</span>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {topic.name}
                        </h3>
                        <p className="text-sm text-gray-500">{topic.subtopics.length} subtopics</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {topic.description}
                  </p>

                  <div className="space-y-3">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-semibold text-gray-900">{progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Question Count */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">{topic.totalQuestions} problems</span>
                      <span className="text-primary-600 font-medium group-hover:underline">
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
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Recommended for You</h2>
          <p className="text-gray-600 mb-6">
            Based on your progress, here are the next problems you should try
          </p>

          <div className="space-y-4">
            {studyPathService.getRecommendedQuestions(5).map((question) => (
              <button
                key={question.id}
                onClick={() => {
                  // Load the question into the main solver
                  router.push(`/?question=${question.id}`)
                }}
                className="w-full bg-gray-50 hover:bg-gray-100 rounded-lg p-4 text-left border-2 border-transparent hover:border-primary-500 transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600">
                        {question.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {question.statement.slice(0, 150)}...
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>⏱️ {question.expectedTime} min</span>
                      <span>📚 {question.concepts.length} concepts</span>
                      {question.source && <span>📖 {question.source}</span>}
                    </div>
                  </div>
                  <svg
                    className="w-6 h-6 text-gray-400 group-hover:text-primary-600 ml-4"
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
