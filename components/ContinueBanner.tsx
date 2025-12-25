'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { problemHistoryService } from '@/lib/problemHistory'
import type { ProblemAttempt, ProblemProgress } from '@/types/history'

interface ContinueBannerProps {
  onContinue: (problemText: string) => void
}

export default function ContinueBanner({ onContinue }: ContinueBannerProps) {
  const router = useRouter()
  const [inProgressProblem, setInProgressProblem] = useState<ProblemAttempt | null>(null)
  const [progress, setProgress] = useState<ProblemProgress | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Find the most recent in-progress problem
    const { attempts } = problemHistoryService.getHistory({ status: 'IN_PROGRESS', limit: 1 })
    if (attempts.length > 0) {
      const attempt = attempts[0]
      setInProgressProblem(attempt)

      // Load the draft to get step progress
      const draft = problemHistoryService.loadDraft(attempt.problemId)
      if (draft) {
        setProgress(draft)
      }
    }
  }, [])

  if (!inProgressProblem || isDismissed) {
    return null
  }

  const completedSteps = progress?.stepProgress.filter(s => s.isCompleted).length || 0
  const totalSteps = progress?.stepProgress.length || 0
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  // Format relative time
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    return date.toLocaleDateString()
  }

  const handleContinue = () => {
    if (progress?.problemText) {
      onContinue(progress.problemText)
    } else {
      // Fallback: navigate to history to load it
      router.push(`/?loadProblem=${inProgressProblem.problemId}`)
    }
  }

  return (
    <div className="mb-6 animate-fade-in">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 md:p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">
                Continue where you left off
              </h3>
              <p className="text-sm text-blue-800 truncate font-medium">
                {inProgressProblem.problemTitle}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs text-blue-600">
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Step {completedSteps}/{totalSteps}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {getRelativeTime(inProgressProblem.updatedAt)}
                </span>
              </div>

              {/* Progress bar */}
              <div className="mt-3 w-full bg-blue-200 rounded-full h-1.5">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleContinue}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Resume
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
