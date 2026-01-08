'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MobileNav from '@/components/MobileNav'
import PageHeader from '@/components/PageHeader'
import type { Pattern, TrackProgress, PatternWithProgress } from '@/lib/patternTrack'
import { authService } from '@/lib/auth/authService'

export default function PatternTrackPage() {
  const router = useRouter()
  const userId = authService.getUserId() || authService.getUserCode() || 'anonymous'
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [trackProgress, setTrackProgress] = useState<TrackProgress | null>(null)
  const [weakPatterns, setWeakPatterns] = useState<PatternWithProgress[]>([])
  const [needsReview, setNeedsReview] = useState<PatternWithProgress[]>([])
  const [hintStats, setHintStats] = useState<{
    total_hints_used: number
    questions_with_hints: number
    total_questions: number
    avg_hints_per_question: number
    hint_free_rate: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [patternsRes, progressRes] = await Promise.all([
          fetch('/api/pattern-track/patterns'),
          fetch(`/api/pattern-track/progress?user_id=${userId}`),
        ])

        if (patternsRes.ok) {
          const data = await patternsRes.json()
          setPatterns(data.patterns || [])
        }

        if (progressRes.ok) {
          const data = await progressRes.json()
          setTrackProgress(data.trackProgress)
          setWeakPatterns(data.weakPatterns || [])
          setNeedsReview(data.needsReview || [])
          setHintStats(data.hintStats || null)
        }
      } catch (error) {
        console.error('Error loading pattern track data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [userId])

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (difficulty <= 3) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 80) return 'text-green-600 dark:text-green-400'
    if (mastery >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
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
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
              Pattern Identification Track
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary">
              Learn to recognize physics problem patterns for faster, more confident solving
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => router.push('/pattern-track/practice')}
              className="px-5 py-2.5 bg-accent text-white rounded-lg hover:bg-accent-strong flex items-center gap-2 transition-all hover:shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Start Practice
            </button>
            <button
              onClick={() => router.push('/pattern-track/lessons')}
              className="px-5 py-2.5 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft flex items-center gap-2 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              View Lessons
            </button>
            <button
              onClick={() => router.push('/pattern-track/patterns')}
              className="px-5 py-2.5 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft flex items-center gap-2 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Pattern Library
            </button>
          </div>
        </div>

        {/* Progress Stats */}
        {trackProgress && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-8">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-6 border border-transparent dark:border-dark-border">
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted mb-1">Overall Mastery</p>
                <p className={`text-2xl sm:text-3xl font-bold ${getMasteryColor(trackProgress.overall_mastery)}`}>
                  {trackProgress.overall_mastery}%
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-6 border border-transparent dark:border-dark-border">
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted mb-1">Patterns Mastered</p>
                <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                  {trackProgress.patterns_mastered}/{trackProgress.total_patterns}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-6 border border-transparent dark:border-dark-border">
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted mb-1">Questions Done</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {trackProgress.questions_attempted}
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-6 border border-transparent dark:border-dark-border">
              <div className="flex flex-col">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-muted mb-1">Streak</p>
                <p className="text-2xl sm:text-3xl font-bold text-amber-600 dark:text-amber-400">
                  {trackProgress.daily_streak} days
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hint Usage Stats */}
        {hintStats && hintStats.total_questions > 0 && (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-6 mb-6 md:mb-8 border border-transparent dark:border-dark-border">
            <h2 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Hint Usage
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 dark:bg-dark-card-soft rounded-lg">
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {hintStats.hint_free_rate}%
                </p>
                <p className="text-xs text-gray-600 dark:text-dark-text-muted">Hint-Free Rate</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-dark-card-soft rounded-lg">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {hintStats.total_hints_used}
                </p>
                <p className="text-xs text-gray-600 dark:text-dark-text-muted">Total Hints Used</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-dark-card-soft rounded-lg">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {hintStats.avg_hints_per_question}
                </p>
                <p className="text-xs text-gray-600 dark:text-dark-text-muted">Avg per Question</p>
              </div>
              <div className="text-center p-3 bg-gray-50 dark:bg-dark-card-soft rounded-lg">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {hintStats.total_questions - hintStats.questions_with_hints}
                </p>
                <p className="text-xs text-gray-600 dark:text-dark-text-muted">Solved Without Hints</p>
              </div>
            </div>
            {hintStats.hint_free_rate < 50 && (
              <p className="mt-3 text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Try solving more problems without hints to boost your mastery score!
              </p>
            )}
            {hintStats.hint_free_rate >= 80 && (
              <p className="mt-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Excellent! You&apos;re solving most problems independently.
              </p>
            )}
          </div>
        )}

        {/* Needs Review Section */}
        {needsReview.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 sm:p-6 mb-6 md:mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-amber-800 dark:text-amber-400 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Patterns Due for Review
            </h2>
            <div className="flex flex-wrap gap-2">
              {needsReview.slice(0, 5).map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/pattern-track/practice?patterns=${p.id}`)}
                  className="px-3 py-1.5 bg-white dark:bg-dark-card rounded-lg text-sm font-medium text-amber-800 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors border border-amber-300 dark:border-amber-700"
                >
                  {p.name}
                </button>
              ))}
              {needsReview.length > 5 && (
                <span className="px-3 py-1.5 text-sm text-amber-600 dark:text-amber-500">
                  +{needsReview.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Weak Patterns Section */}
        {weakPatterns.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 sm:p-6 mb-6 md:mb-8">
            <h2 className="text-lg sm:text-xl font-bold text-red-800 dark:text-red-400 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Patterns Needing Work
            </h2>
            <div className="flex flex-wrap gap-2">
              {weakPatterns.map((p) => (
                <button
                  key={p.id}
                  onClick={() => router.push(`/pattern-track/practice?patterns=${p.id}`)}
                  className="px-3 py-1.5 bg-white dark:bg-dark-card rounded-lg text-sm font-medium text-red-800 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-300 dark:border-red-700 flex items-center gap-2"
                >
                  {p.name}
                  <span className="text-xs opacity-75">{p.progress?.mastery_level || 0}%</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* All Patterns */}
        <div className="mb-6 md:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-3 sm:mb-4">
            All Patterns
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {patterns.map((pattern) => (
              <button
                key={pattern.id}
                onClick={() => router.push(`/pattern-track/patterns/${pattern.id}`)}
                className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-5 hover:shadow-xl dark:hover:shadow-dark-lg active:scale-98 transition-all text-left group border border-transparent dark:border-dark-border hover:border-accent dark:hover:border-accent"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary group-hover:text-accent transition-colors">
                    {pattern.name}
                  </h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getDifficultyColor(pattern.difficulty)}`}>
                    Lvl {pattern.difficulty}
                  </span>
                </div>

                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3 line-clamp-2">
                  {pattern.description}
                </p>

                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-dark-text-muted">
                  <span className="capitalize">{pattern.category}</span>
                  <span className="text-accent group-hover:underline">Learn more →</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Start Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-gradient-to-br from-accent to-accent-strong rounded-lg shadow-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Quick Practice</h3>
            <p className="text-white/80 mb-4">
              Jump into a mixed practice session with 10 random questions
            </p>
            <button
              onClick={() => router.push('/pattern-track/practice?mode=mixed&count=10')}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
            >
              Start Now
            </button>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Focused Review</h3>
            <p className="text-white/80 mb-4">
              Practice patterns you&apos;re struggling with
            </p>
            <button
              onClick={() => router.push('/pattern-track/practice?mode=focused')}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
            >
              Review Weak Areas
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
