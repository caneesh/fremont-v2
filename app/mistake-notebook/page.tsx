'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import type { MistakeCard, MistakeNotebookFilters, SRSStatus, MistakeTrigger, DailyDebrief } from '@/types/mistakeNotebook'
import type { StepType } from '@/types/scaffold'
import {
  getAllCards,
  getFilteredCards,
  getNotebookStats,
  getAllConceptTags,
  getAllDomains,
  deleteCard,
  suspendCard,
  unsuspendCard,
  getCardsDue
} from '@/lib/mistakeNotebook'
import { getTodayDebrief, isDebriefDue } from '@/lib/dailyDebrief'
import MistakeCardDisplay from '@/components/MistakeCardDisplay'
import DailyDebriefCard from '@/components/DailyDebriefCard'
import ReviewSession from '@/components/ReviewSession'
import { useToast } from '@/components/ui/ToastProvider'

type ViewMode = 'cards' | 'review'

export default function MistakeNotebookPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { confirm } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [cards, setCards] = useState<MistakeCard[]>([])
  const [debrief, setDebrief] = useState<DailyDebrief | null>(null)
  const [showDebrief, setShowDebrief] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Filter state
  const [filters, setFilters] = useState<MistakeNotebookFilters>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Available filter options
  const [conceptTags, setConceptTags] = useState<string[]>([])
  const [domains, setDomains] = useState<string[]>([])

  // Stats
  const [stats, setStats] = useState<ReturnType<typeof getNotebookStats> | null>(null)

  // Load data
  const loadData = useCallback(() => {
    const allCards = filters.dueOnly || Object.keys(filters).length > 1 || filters.searchQuery
      ? getFilteredCards({ ...filters, searchQuery })
      : getAllCards()

    setCards(allCards)
    setStats(getNotebookStats())
    setConceptTags(getAllConceptTags())
    setDomains(getAllDomains())
    setIsLoading(false)
  }, [filters, searchQuery])

  useEffect(() => {
    loadData()

    // Check if debrief should be shown
    if (isDebriefDue()) {
      const todayDebrief = getTodayDebrief()
      setDebrief(todayDebrief)
      setShowDebrief(true)
    }

    // Check if auto-start review from URL param
    const reviewParam = searchParams.get('review')
    if (reviewParam === 'true') {
      // Only start review if there are cards due
      const dueCards = getCardsDue()
      if (dueCards.length > 0) {
        setViewMode('review')
      }
      // Clear the query param
      router.replace('/mistake-notebook')
    }
  }, [loadData, searchParams, router])

  // Handle filter changes
  const handleFilterChange = (key: keyof MistakeNotebookFilters, value: unknown) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({})
    setSearchQuery('')
  }

  // Card actions
  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete card?',
      message: 'Delete this card? This cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      destructive: true,
    })
    if (!ok) return
    deleteCard(id)
    loadData()
  }

  const handleSuspend = (id: string) => {
    suspendCard(id)
    loadData()
  }

  const handleUnsuspend = (id: string) => {
    unsuspendCard(id)
    loadData()
  }

  const handleStartReview = () => {
    setViewMode('review')
  }

  const handleReviewComplete = () => {
    setViewMode('cards')
    loadData()
  }

  // Status filter options
  const statusOptions: { value: SRSStatus; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'learning', label: 'Learning' },
    { value: 'review', label: 'Review' },
    { value: 'graduated', label: 'Mastered' },
    { value: 'suspended', label: 'Suspended' }
  ]

  const stepTypeOptions: { value: StepType; label: string }[] = [
    { value: 'physics_concept', label: 'Physics' },
    { value: 'math_manipulation', label: 'Math' },
    { value: 'diagram', label: 'Diagram' },
    { value: 'sanity_check', label: 'Sanity Check' }
  ]

  const triggerOptions: { value: MistakeTrigger; label: string }[] = [
    { value: 'hint_requested', label: 'Hint Requested' },
    { value: 'step_failed', label: 'Step Failed' },
    { value: 'timeout', label: 'Timeout' },
    { value: 'task_incorrect', label: 'Task Incorrect' },
    { value: 'multiple_attempts', label: 'Multiple Attempts' }
  ]

  if (viewMode === 'review') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-bg p-4 sm:p-6">
        <div className="max-w-4xl mx-auto">
          <ReviewSession
            onComplete={handleReviewComplete}
            onCancel={() => setViewMode('cards')}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg">
      {/* Header */}
      <header className="bg-white dark:bg-dark-card border-b border-gray-200 dark:border-dark-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/study-path"
                className="text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text-secondary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
                  Mistake Notebook
                </h1>
                <p className="text-sm text-gray-500 dark:text-dark-text-muted">
                  Track and review your learning gaps
                </p>
              </div>
            </div>

            {stats && stats.dueToday > 0 && (
              <button
                onClick={handleStartReview}
                className="px-4 py-2 bg-accent text-white font-medium rounded-lg hover:bg-accent-strong transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Review ({stats.dueToday})
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Daily Debrief */}
        {showDebrief && debrief && (
          <DailyDebriefCard
            debrief={debrief}
            onStartReview={handleStartReview}
            onDismiss={() => setShowDebrief(false)}
          />
        )}

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border p-4">
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                {stats.totalCards}
              </p>
              <p className="text-sm text-gray-500 dark:text-dark-text-muted">Total Cards</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border p-4">
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {stats.dueToday}
              </p>
              <p className="text-sm text-gray-500 dark:text-dark-text-muted">Due Today</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border p-4">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.averageRetention}%
              </p>
              <p className="text-sm text-gray-500 dark:text-dark-text-muted">Retention</p>
            </div>
            <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border p-4">
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {stats.streakDays}
              </p>
              <p className="text-sm text-gray-500 dark:text-dark-text-muted">Day Streak</p>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search cards..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  handleFilterChange('searchQuery', e.target.value)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-placeholder focus:ring-2 focus:ring-accent focus:border-accent"
              />
            </div>

            {/* Quick filters */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleFilterChange('dueOnly', !filters.dueOnly)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filters.dueOnly
                    ? 'bg-accent text-white'
                    : 'bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
                }`}
              >
                Due Only
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                  showFilters
                    ? 'bg-accent text-white'
                    : 'bg-gray-100 dark:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-border'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
                Filters
              </button>
              {(Object.keys(filters).length > 0 || searchQuery) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-2 text-sm text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text-secondary"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1">
                  Status
                </label>
                <select
                  value={filters.srsStatus?.[0] || ''}
                  onChange={(e) => handleFilterChange('srsStatus', e.target.value ? [e.target.value as SRSStatus] : undefined)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary text-sm"
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Step type filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1">
                  Step Type
                </label>
                <select
                  value={filters.stepTypes?.[0] || ''}
                  onChange={(e) => handleFilterChange('stepTypes', e.target.value ? [e.target.value as StepType] : undefined)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary text-sm"
                >
                  <option value="">All Types</option>
                  {stepTypeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Domain filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1">
                  Domain
                </label>
                <select
                  value={filters.domains?.[0] || ''}
                  onChange={(e) => handleFilterChange('domains', e.target.value ? [e.target.value] : undefined)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary text-sm"
                >
                  <option value="">All Domains</option>
                  {domains.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </div>

              {/* Trigger filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-dark-text-muted mb-1">
                  Trigger
                </label>
                <select
                  value={filters.triggers?.[0] || ''}
                  onChange={(e) => handleFilterChange('triggers', e.target.value ? [e.target.value as MistakeTrigger] : undefined)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary text-sm"
                >
                  <option value="">All Triggers</option>
                  {triggerOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Cards list */}
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : cards.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-dark-card-soft rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
              {Object.keys(filters).length > 0 ? 'No cards match filters' : 'No mistake cards yet'}
            </h3>
            <p className="text-gray-500 dark:text-dark-text-muted mb-4">
              {Object.keys(filters).length > 0
                ? 'Try adjusting your filters or clearing them.'
                : 'Cards are automatically created when you need hints or make mistakes while solving problems.'}
            </p>
            {Object.keys(filters).length > 0 && (
              <button
                onClick={clearFilters}
                className="text-accent hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {cards.map(card => (
              <MistakeCardDisplay
                key={card.id}
                card={card}
                onDelete={handleDelete}
                onSuspend={handleSuspend}
                onUnsuspend={handleUnsuspend}
                onReview={() => {
                  // Start review with this card
                  handleStartReview()
                }}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
