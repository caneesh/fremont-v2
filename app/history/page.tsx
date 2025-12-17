'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ProblemAttempt, ProblemStatus } from '@/types/history'
import { problemHistoryService } from '@/lib/problemHistory'

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
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
          ✓ Solved
        </span>
      )
    }
    return (
      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
        ⏳ In Progress
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Problem History
            </h1>
            <p className="text-gray-600">
              {total} {total === 1 ? 'attempt' : 'attempts'} recorded
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Problem
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filteredStatus}
                onChange={(e) => {
                  setFilteredStatus(e.target.value as ProblemStatus | '')
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="SOLVED">Solved</option>
              </select>
            </div>

            {/* Review Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Flag
              </label>
              <select
                value={filteredReview === '' ? '' : filteredReview ? 'true' : 'false'}
                onChange={(e) => {
                  setFilteredReview(e.target.value === '' ? '' : e.target.value === 'true')
                  setCurrentPage(1)
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All</option>
                <option value="true">Marked for Review</option>
                <option value="false">Not Marked</option>
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Attempts List */}
        {attempts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
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
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No attempts found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery || filteredStatus || filteredReview !== ''
                ? 'Try adjusting your filters'
                : 'Start solving problems to build your history'}
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Solve a Problem
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt) => (
              <div
                key={attempt.id}
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(attempt.status)}
                      {attempt.reviewFlag && (
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-semibold flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                          </svg>
                          Review
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {attempt.problemTitle}
                    </h3>
                    <div className="text-sm text-gray-500 space-y-1">
                      <p>Last updated: {formatDate(attempt.updatedAt)}</p>
                      {attempt.lastOpenedAt && (
                        <p>Last opened: {formatDate(attempt.lastOpenedAt)}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => {
                        // Navigate to main page with problem loaded
                        router.push(`/?loadProblem=${attempt.problemId}`)
                      }}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => handleToggleReview(attempt.problemId)}
                      className={`px-4 py-2 rounded-lg text-sm border ${
                        attempt.reviewFlag
                          ? 'bg-yellow-50 border-yellow-500 text-yellow-700 hover:bg-yellow-100'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
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
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm border border-red-200"
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
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-gray-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
