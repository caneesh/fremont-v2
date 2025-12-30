'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import MobileNav from '@/components/MobileNav'
import PageHeader from '@/components/PageHeader'
import type { Pattern } from '@/lib/patternTrack'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PatternDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [pattern, setPattern] = useState<Pattern | null>(null)
  const [relatedPatterns, setRelatedPatterns] = useState<Pattern[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPattern = async () => {
      try {
        const res = await fetch(`/api/pattern-track/patterns/${id}`)
        if (res.ok) {
          const data = await res.json()
          setPattern(data.pattern)
          setRelatedPatterns(data.related || [])
        }
      } catch (error) {
        console.error('Error loading pattern:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPattern()
  }, [id])

  const getDifficultyLabel = (difficulty: number) => {
    const labels = ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert']
    return labels[difficulty] || 'Unknown'
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (difficulty <= 3) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
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

  if (!pattern) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
        <MobileNav />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
              Pattern Not Found
            </h2>
            <button
              onClick={() => router.push('/pattern-track/patterns')}
              className="text-accent hover:underline"
            >
              Back to Library
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
      <MobileNav />
      <div className="container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <PageHeader />
          <div className="flex items-center gap-2 mb-4 text-sm">
            <button
              onClick={() => router.push('/pattern-track')}
              className="text-gray-500 hover:text-gray-700 dark:text-dark-text-muted dark:hover:text-dark-text-secondary"
            >
              Pattern Track
            </button>
            <span className="text-gray-400">/</span>
            <button
              onClick={() => router.push('/pattern-track/patterns')}
              className="text-gray-500 hover:text-gray-700 dark:text-dark-text-muted dark:hover:text-dark-text-secondary"
            >
              Library
            </button>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 dark:text-dark-text-primary font-medium truncate max-w-[200px]">
              {pattern.name}
            </span>
          </div>
        </div>

        {/* Pattern Card */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 sm:p-8 mb-6 border border-transparent dark:border-dark-border">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
              <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-muted text-sm rounded-full capitalize mb-3">
                {pattern.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
                {pattern.name}
              </h1>
            </div>
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${getDifficultyColor(pattern.difficulty)}`}>
              {getDifficultyLabel(pattern.difficulty)}
            </span>
          </div>

          <p className="text-gray-700 dark:text-dark-text-secondary text-lg mb-8">
            {pattern.description}
          </p>

          <button
            onClick={() => router.push(`/pattern-track/practice?patterns=${pattern.id}`)}
            className="w-full sm:w-auto px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-strong transition-colors font-medium"
          >
            Practice This Pattern
          </button>
        </div>

        {/* Recognition Cues */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 sm:p-8 mb-6 border border-transparent dark:border-dark-border">
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Recognition Cues
          </h2>
          <p className="text-gray-600 dark:text-dark-text-muted text-sm mb-4">
            Look for these signals in problem statements:
          </p>
          <ul className="space-y-3">
            {pattern.recognition_cues.map((cue, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-gray-700 dark:text-dark-text-secondary">{cue}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Common Pitfalls */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 sm:p-8 mb-6 border border-transparent dark:border-dark-border">
          <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Common Pitfalls
          </h2>
          <p className="text-gray-600 dark:text-dark-text-muted text-sm mb-4">
            Watch out for these common mistakes:
          </p>
          <ul className="space-y-3">
            {pattern.common_pitfalls.map((pitfall, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                  ⚠
                </span>
                <span className="text-gray-700 dark:text-dark-text-secondary">{pitfall}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Related Patterns */}
        {relatedPatterns.length > 0 && (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 sm:p-8 border border-transparent dark:border-dark-border">
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Related Patterns
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {relatedPatterns.map((related) => (
                <button
                  key={related.id}
                  onClick={() => router.push(`/pattern-track/patterns/${related.id}`)}
                  className="p-4 bg-gray-50 dark:bg-dark-card-soft rounded-lg text-left hover:bg-gray-100 dark:hover:bg-dark-border transition-colors group"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary group-hover:text-accent transition-colors">
                    {related.name}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary line-clamp-2 mt-1">
                    {related.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
