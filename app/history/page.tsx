'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ProblemAttempt, ProblemStatus } from '@/types/history'
import { problemHistoryService } from '@/lib/problemHistory'
import MobileNav from '@/components/MobileNav'
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import PageHeader from '@/components/PageHeader'

export default function HistoryPage() {
  const router = useRouter()
  const [attempts, setAttempts] = useState<ProblemAttempt[]>([])
  const [filteredStatus, setFilteredStatus] = useState<ProblemStatus | ''>('')
  const [filteredReview, setFilteredReview] = useState<boolean | ''>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredStatus, filteredReview, searchQuery, currentPage])

  const loadHistory = () => {
    const filters = {
      status: filteredStatus || undefined,
      review: filteredReview === '' ? undefined : filteredReview,
      query: searchQuery || undefined,
      page: currentPage,
      limit: 10,
    }

    const result = problemHistoryService.getHistory(filters)
    setAttempts(result.attempts)
    setTotalPages(result.totalPages)
    setTotal(result.total)
  }

  const handleDelete = (problemId: string) => {
    if (confirm('Are you sure you want to delete this attempt?')) {
      problemHistoryService.deleteAttempt(problemId)
      loadHistory()
    }
  }

  const handleToggleReview = (problemId: string) => {
    problemHistoryService.toggleReview(problemId)
    loadHistory()
  }

  const formatDate = (isoString: string) => {
    const date = new Date(isoString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: ProblemStatus) => {
    if (status === 'SOLVED') {
      return (
        <span className="px-2 sm:px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full text-xs font-semibold">
          ✓ Solved
        </span>
      )
    }
    return (
      <span className="px-2 sm:px-3 py-1 bg-blue-100 dark:bg-accent/20 text-blue-800 dark:text-accent rounded-full text-xs font-semibold">
        ⏳ In Progress
      </span>
    )
  }

  // Pull to refresh
  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 800))
    loadHistory()
  }

  const { isPulling, pullDistance } = usePullToRefresh(handleRefresh)

  // Swipe gestures
  useSwipeGesture({
    onSwipeLeft: () => {
      if (window.innerWidth < 768) {
        router.push('/')
      }
    },
    onSwipeRight: () => {
      if (window.innerWidth < 768) {
        router.push('/study-path')
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
          <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
                Problem History
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary">
                {total} {total === 1 ? 'attempt' : 'attempts'} recorded
              </p>
            </div>
            <button
              onClick={() => router.push('/')}
              className="w-full sm:w-auto px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-strong active:scale-98 flex items-center justify-center gap-2 transition-all min-h-[48px] shadow-md hover:shadow-lg dark:hover:shadow-dark-glow"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Problem
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-6 mb-6 border border-transparent dark:border-dark-border">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Filters</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                Status
              </label>
              <select
                value={filteredStatus}
                onChange={(e) => {
                  setFilteredStatus(e.target.value as ProblemStatus | '')
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-accent focus:border-transparent dark:focus:ring-accent/50 transition-colors"
              >
                <option value="">All</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SOLVED">Solved</option>
              </select>
            </div>

            {/* Review Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                Review Flag
              </label>
              <select
                value={filteredReview === '' ? '' : filteredReview ? 'true' : 'false'}
                onChange={(e) => {
                  setFilteredReview(e.target.value === '' ? '' : e.target.value === 'true')
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-accent focus:border-transparent dark:focus:ring-accent/50 transition-colors"
              >
                <option value="">All</option>
                <option value="true">Marked for Review</option>
                <option value="false">Not Marked</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search problem title..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-placeholder focus:ring-2 focus:ring-accent focus:border-transparent dark:focus:ring-accent/50 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Attempts List */}
        {attempts.length === 0 ? (
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-12 text-center border border-transparent dark:border-dark-border">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 dark:text-dark-text-muted mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
              No attempts found
            </h3>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
              {searchQuery || filteredStatus || filteredReview !== ''
                ? 'Try adjusting your filters'
                : 'Start solving problems to build your history'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-strong transition-all shadow-md hover:shadow-lg dark:hover:shadow-dark-glow"
            >
              Solve a Problem
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-md p-4 sm:p-6 hover:shadow-xl dark:hover:shadow-dark-lg transition-shadow border border-transparent dark:border-dark-border"
              >
                <div className="flex items-start justify-between mb-4 flex-col sm:flex-row gap-3 sm:gap-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                      {getStatusBadge(attempt.status)}
                      {attempt.reviewFlag && (
                        <span className="px-2 sm:px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 rounded-full text-xs font-semibold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                          Review
                        </span>
                      )}
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                      {attempt.problemTitle}
                    </h3>
                    <div className="text-xs sm:text-sm text-gray-500 dark:text-dark-text-muted space-y-1">
                      <p>Last updated: {formatDate(attempt.updatedAt)}</p>
                      {attempt.lastOpenedAt && (
                        <p>Last opened: {formatDate(attempt.lastOpenedAt)}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 sm:ml-4 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        // Navigate to main page with problem loaded
                        router.push(`/?loadProblem=${attempt.problemId}`)
                      }}
                      className="flex-1 sm:flex-none px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-strong text-sm transition-all shadow-sm hover:shadow-md dark:hover:shadow-dark-glow"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleToggleReview(attempt.problemId)}
                      className={`px-3 sm:px-4 py-2 rounded-lg text-sm border transition-colors ${
                        attempt.reviewFlag
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                          : 'bg-white dark:bg-dark-card-soft border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border'
                      }`}
                      title={attempt.reviewFlag ? 'Unmark review' : 'Mark for review'}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                    {attempt.status === 'IN_PROGRESS' && (
                      <button
                        onClick={() => handleDelete(attempt.problemId)}
                        className="px-3 sm:px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-sm border border-red-200 dark:border-red-500/30 transition-colors"
                        title="Delete draft"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-4">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-gray-700 dark:text-dark-text-secondary text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft text-gray-700 dark:text-dark-text-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
