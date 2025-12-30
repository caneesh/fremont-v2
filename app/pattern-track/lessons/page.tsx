'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MobileNav from '@/components/MobileNav'
import PageHeader from '@/components/PageHeader'
import type { LessonWithProgress } from '@/lib/patternTrack'

// Temporary user ID
const USER_ID = 'local_user'

export default function LessonsPage() {
  const router = useRouter()
  const [lessons, setLessons] = useState<LessonWithProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLessons = async () => {
      try {
        const res = await fetch(`/api/pattern-track/lessons?user_id=${USER_ID}`)
        if (res.ok) {
          const data = await res.json()
          setLessons(data.lessons || [])
        }
      } catch (error) {
        console.error('Error loading lessons:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLessons()
  }, [])

  const getStatusBadge = (lesson: LessonWithProgress) => {
    const status = lesson.progress?.status || 'not_started'

    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs rounded-full font-medium">
            Completed
          </span>
        )
      case 'in_progress':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full font-medium">
            In Progress
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 dark:bg-dark-card-soft dark:text-dark-text-muted text-xs rounded-full font-medium">
            Not Started
          </span>
        )
    }
  }

  const canStartLesson = (lesson: LessonWithProgress) => {
    // Check if all prerequisites are completed
    if (lesson.prerequisite_lesson_ids.length === 0) return true

    return lesson.prerequisite_lesson_ids.every(prereqId => {
      const prereq = lessons.find(l => l.id === prereqId)
      return prereq?.progress?.status === 'completed'
    })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
      <MobileNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <PageHeader />
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => router.push('/pattern-track')}
              className="text-gray-500 hover:text-gray-700 dark:text-dark-text-muted dark:hover:text-dark-text-secondary"
            >
              Pattern Track
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 dark:text-dark-text-primary font-medium">Lessons</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
            Pattern Lessons
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary">
            Structured lessons to learn each pattern systematically
          </p>
        </div>

        {/* Progress Summary */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-4 sm:p-6 mb-6 border border-transparent dark:border-dark-border">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-text-muted">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {lessons.filter(l => l.progress?.status === 'completed').length}/{lessons.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-text-muted">In Progress</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {lessons.filter(l => l.progress?.status === 'in_progress').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-text-muted">Est. Time Left</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                {lessons
                  .filter(l => l.progress?.status !== 'completed')
                  .reduce((sum, l) => sum + l.estimated_minutes, 0)} min
              </p>
            </div>
          </div>
        </div>

        {/* Lessons List */}
        <div className="space-y-4">
          {lessons.map((lesson, index) => {
            const canStart = canStartLesson(lesson)
            const isLocked = !canStart

            return (
              <div
                key={lesson.id}
                className={`bg-white dark:bg-dark-card rounded-lg shadow-lg p-5 sm:p-6 border border-transparent dark:border-dark-border transition-all ${
                  isLocked
                    ? 'opacity-60'
                    : 'hover:shadow-xl dark:hover:shadow-dark-lg hover:border-accent dark:hover:border-accent'
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Lesson Number */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    lesson.progress?.status === 'completed'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : lesson.progress?.status === 'in_progress'
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                        : 'bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-muted'
                  }`}>
                    {lesson.progress?.status === 'completed' ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : isLocked ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="font-semibold">{index + 1}</span>
                    )}
                  </div>

                  {/* Lesson Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
                          {lesson.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-2 mt-1">
                          {lesson.description}
                        </p>
                      </div>
                      {getStatusBadge(lesson)}
                    </div>

                    {/* Patterns */}
                    <div className="flex flex-wrap gap-2 mt-3 mb-4">
                      {lesson.patterns.map(pattern => (
                        <span
                          key={pattern.id}
                          className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 text-xs rounded"
                        >
                          {pattern.name}
                        </span>
                      ))}
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-dark-text-muted">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {lesson.estimated_minutes} min
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {lesson.content.length} sections
                      </span>
                    </div>

                    {/* Prerequisites Warning */}
                    {isLocked && (
                      <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-400">
                        <strong>Prerequisites:</strong> Complete{' '}
                        {lesson.prerequisite_lesson_ids.map((id, i) => {
                          const prereq = lessons.find(l => l.id === id)
                          return prereq ? (
                            <span key={id}>
                              {i > 0 && ', '}
                              <span className="font-medium">{prereq.title}</span>
                            </span>
                          ) : null
                        })}
                        {' '}first.
                      </div>
                    )}

                    {/* Action Button */}
                    {!isLocked && (
                      <button
                        onClick={() => router.push(`/pattern-track/lessons/${lesson.id}`)}
                        className="mt-4 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-strong transition-colors text-sm font-medium"
                      >
                        {lesson.progress?.status === 'completed'
                          ? 'Review Lesson'
                          : lesson.progress?.status === 'in_progress'
                            ? 'Continue'
                            : 'Start Lesson'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {lessons.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-dark-text-muted">
              No lessons available yet.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
