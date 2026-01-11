'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import MobileNav from '@/components/MobileNav'
import PageHeader from '@/components/PageHeader'
import type { Pattern } from '@/lib/patternTrack'

export default function PatternsLibraryPage() {
  const router = useRouter()
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPatterns = async () => {
      try {
        const res = await fetch('/api/pattern-track/patterns')
        if (res.ok) {
          const data = await res.json()
          setPatterns(data.patterns || [])

          // Extract unique categories
          const cats = Array.from(new Set((data.patterns || []).map((p: Pattern) => p.category)))
          setCategories(cats as string[])
        }
      } catch (error) {
        console.error('Error loading patterns:', error)
      } finally {
        setLoading(false)
      }
    }

    loadPatterns()
  }, [])

  const filteredPatterns = patterns.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
    const matchesSearch = searchQuery === '' ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const getDifficultyStars = (difficulty: number) => {
    return '★'.repeat(difficulty) + '☆'.repeat(5 - difficulty)
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'text-green-500'
    if (difficulty <= 3) return 'text-yellow-500'
    return 'text-red-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-dark-app">
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
    <div className="min-h-screen bg-slate-50 dark:bg-dark-app">
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
            <span className="text-gray-900 dark:text-dark-text-primary font-medium">Library</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
            Pattern Library
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary">
            Browse all physics problem patterns
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search patterns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card text-gray-900 dark:text-dark-text-primary placeholder-gray-500 dark:placeholder-dark-text-muted focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-accent text-white'
                  : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text-secondary border border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card-soft'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  selectedCategory === cat
                    ? 'bg-accent text-white'
                    : 'bg-white dark:bg-dark-card text-gray-700 dark:text-dark-text-secondary border border-gray-300 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-card-soft'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-sm text-gray-600 dark:text-dark-text-muted mb-4">
          Showing {filteredPatterns.length} pattern{filteredPatterns.length !== 1 ? 's' : ''}
        </p>

        {/* Patterns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredPatterns.map((pattern) => (
            <button
              key={pattern.id}
              onClick={() => router.push(`/pattern-track/patterns/${pattern.id}`)}
              className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-5 sm:p-6 hover:shadow-xl dark:hover:shadow-dark-lg active:scale-98 transition-all text-left group border border-transparent dark:border-dark-border hover:border-accent dark:hover:border-accent"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="px-2 py-1 bg-gray-100 dark:bg-dark-card-soft text-gray-600 dark:text-dark-text-muted text-xs rounded capitalize">
                  {pattern.category}
                </span>
                <span className={`text-sm ${getDifficultyColor(pattern.difficulty)}`}>
                  {getDifficultyStars(pattern.difficulty)}
                </span>
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary group-hover:text-accent transition-colors mb-2">
                {pattern.name}
              </h3>

              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4 line-clamp-3">
                {pattern.description}
              </p>

              {/* Recognition cues preview */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-2">
                  Recognition cues:
                </p>
                <div className="flex flex-wrap gap-1">
                  {pattern.recognition_cues.slice(0, 2).map((cue, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-xs rounded"
                    >
                      {cue.length > 30 ? cue.slice(0, 30) + '...' : cue}
                    </span>
                  ))}
                  {pattern.recognition_cues.length > 2 && (
                    <span className="px-2 py-0.5 text-xs text-gray-500 dark:text-dark-text-muted">
                      +{pattern.recognition_cues.length - 2} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-dark-text-muted">
                  {pattern.related_pattern_ids.length} related
                </span>
                <span className="text-accent group-hover:underline font-medium">
                  View Details →
                </span>
              </div>
            </button>
          ))}
        </div>

        {filteredPatterns.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-dark-text-muted">
              No patterns found matching your criteria
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
