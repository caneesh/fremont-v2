'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { studyPathService } from '@/lib/studyPath/studyPathService'
import type { Topic, Question } from '@/types/studyPath'

export default function TopicDetailPage() {
  const router = useRouter()
  const params = useParams()
  const topicId = params.topicId as string

  const [topic, setTopic] = useState<Topic | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedSubtopic, setSelectedSubtopic] = useState<string>('all')

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch topics and questions from API
        const [topicsResponse, questionsResponse] = await Promise.all([
          fetch('/api/study-path/topics'),
          fetch('/api/study-path/questions')
        ])

        if (topicsResponse.ok && questionsResponse.ok) {
          const topicsData = await topicsResponse.json()
          const questionsData = await questionsResponse.json()

          const topicData = topicsData.topics.find((t: Topic) => t.id === topicId)
          const topicQuestions = questionsData.questions.filter((q: Question) => q.topic === topicId)

          setTopic(topicData || null)
          setQuestions(topicQuestions || [])
        }
      } catch (error) {
        console.error('Error loading topic data:', error)
      }
    }

    loadData()
  }, [topicId])

  if (!topic) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
        <p className="text-gray-600 dark:text-dark-text-secondary">Loading...</p>
      </div>
    </div>
  }

  const filteredQuestions = selectedSubtopic === 'all'
    ? questions
    : questions.filter(q => q.subtopic === selectedSubtopic)

  const progress = studyPathService.getTopicCompletionPercentage(topicId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <button
            onClick={() => router.push('/study-path')}
            className="text-accent hover:text-accent-strong mb-4 flex items-center gap-2 text-sm md:text-base transition-colors"
          >
            ← Back to Study Path
          </button>

          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 md:p-8 border border-transparent dark:border-dark-border">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl md:text-6xl">{topic.icon}</span>
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-dark-text-primary">{topic.name}</h1>
                <p className="text-sm md:text-base text-gray-600 dark:text-dark-text-secondary mt-2">{topic.description}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-dark-text-muted">Your Progress</span>
                <span className="font-semibold text-gray-900 dark:text-dark-text-primary">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-dark-card-soft rounded-full h-3 overflow-hidden">
                <div
                  className="bg-accent h-3 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Subtopic Filter */}
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedSubtopic('all')}
              className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-all ${
                selectedSubtopic === 'all'
                  ? 'bg-accent text-white shadow-md dark:shadow-dark-glow'
                  : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-card-soft border border-gray-200 dark:border-dark-border'
              }`}
            >
              All ({questions.length})
            </button>
            {topic.subtopics.map((subtopic) => {
              const count = questions.filter(q => q.subtopic === subtopic.id).length
              return (
                <button
                  key={subtopic.id}
                  onClick={() => setSelectedSubtopic(subtopic.id)}
                  className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-all ${
                    selectedSubtopic === subtopic.id
                      ? 'bg-accent text-white shadow-md dark:shadow-dark-glow'
                      : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-card-soft border border-gray-200 dark:border-dark-border'
                  }`}
                >
                  {subtopic.name} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3 md:space-y-4">
          {filteredQuestions.map((question) => (
            <button
              key={question.id}
              onClick={() => router.push(`/?question=${question.id}`)}
              className="w-full bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 md:p-6 text-left hover:shadow-xl dark:hover:shadow-dark-lg transition-all group border border-transparent dark:border-dark-border hover:border-accent dark:hover:border-accent"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 md:gap-3 mb-3 flex-wrap">
                    <h3 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-dark-text-primary group-hover:text-accent">
                      {question.title}
                    </h3>
                    <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-semibold ${
                      question.difficulty === 'Easy'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                        : question.difficulty === 'Medium'
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                    }`}>
                      {question.difficulty}
                    </span>
                  </div>
                  <p className="text-sm md:text-base text-gray-700 dark:text-dark-text-secondary mb-3 md:mb-4 line-clamp-2">{question.statement}</p>
                  <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm text-gray-500 dark:text-dark-text-muted flex-wrap">
                    <span>⏱️ {question.expectedTime} min</span>
                    <span>📚 {question.concepts.join(', ')}</span>
                    {question.source && <span>📖 {question.source}</span>}
                  </div>
                </div>
                <svg
                  className="w-5 h-5 md:w-6 md:h-6 text-gray-400 dark:text-dark-text-muted group-hover:text-accent ml-3 md:ml-4 flex-shrink-0"
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
  )
}
