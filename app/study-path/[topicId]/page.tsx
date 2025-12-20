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
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  }

  const filteredQuestions = selectedSubtopic === 'all'
    ? questions
    : questions.filter(q => q.subtopic === selectedSubtopic)

  const progress = studyPathService.getTopicCompletionPercentage(topicId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/study-path')}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2"
          >
            ← Back to Study Path
          </button>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center gap-4 mb-4">
              <span className="text-6xl">{topic.icon}</span>
              <div>
                <h1 className="text-4xl font-bold text-gray-900">{topic.name}</h1>
                <p className="text-gray-600 mt-2">{topic.description}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Your Progress</span>
                <span className="font-semibold text-gray-900">{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all"
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
              className={`px-4 py-2 rounded-lg font-medium ${
                selectedSubtopic === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
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
                  className={`px-4 py-2 rounded-lg font-medium ${
                    selectedSubtopic === subtopic.id
                      ? 'bg-primary-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {subtopic.name} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-4">
          {filteredQuestions.map((question) => (
            <button
              key={question.id}
              onClick={() => router.push(`/?question=${question.id}`)}
              className="w-full bg-white rounded-lg shadow-lg p-6 text-left hover:shadow-xl transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600">
                      {question.title}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      question.difficulty === 'Easy'
                        ? 'bg-green-100 text-green-800'
                        : question.difficulty === 'Medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {question.difficulty}
                    </span>
                  </div>
                  <p className="text-gray-700 mb-4 line-clamp-2">{question.statement}</p>
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <span>⏱️ {question.expectedTime} min</span>
                    <span>📚 {question.concepts.join(', ')}</span>
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
  )
}
