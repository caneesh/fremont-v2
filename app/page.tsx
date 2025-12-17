'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ProblemInput from '@/components/ProblemInput'
import SolutionScaffold from '@/components/SolutionScaffold'
import type { ScaffoldData } from '@/types/scaffold'
import { problemHistoryService } from '@/lib/problemHistory'

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [scaffoldData, setScaffoldData] = useState<ScaffoldData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleProblemSubmit = async (problemText: string) => {
    setIsLoading(true)
    setError(null)
    setScaffoldData(null)

    try {
      const response = await fetch('/api/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ problem: problemText }),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`)
      }

      const data = await response.json()
      setScaffoldData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  // Load problem from history if specified in URL
  useEffect(() => {
    const loadProblemId = searchParams.get('loadProblem')
    if (loadProblemId) {
      const attempt = problemHistoryService.getAttempt(loadProblemId)
      if (attempt) {
        // Load the saved problem and regenerate scaffold
        const progress = attempt.status === 'SOLVED'
          ? problemHistoryService.loadFinalSolution(loadProblemId)
          : problemHistoryService.loadDraft(loadProblemId)

        if (progress) {
          handleProblemSubmit(progress.problemText)
        }
      }
      // Clear the query parameter
      router.replace('/')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleReset = () => {
    setScaffoldData(null)
    setError(null)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1" />
            <div className="flex-1 text-center">
              <h1 className="text-5xl font-bold text-gray-900 mb-4">
                PhysiScaffold
              </h1>
            </div>
            <div className="flex-1 flex justify-end">
              <button
                onClick={() => router.push('/history')}
                className="px-6 py-3 bg-white border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 flex items-center gap-2 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </button>
            </div>
          </div>
          <div className="text-center">
            <p className="text-xl text-gray-600 italic">
              The Socratic Physics Engine
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Active Decomposition: We don&apos;t give answers; we give the framework for the answer.
            </p>
          </div>
        </header>

        {/* Main Content */}
        {!scaffoldData ? (
          <ProblemInput
            onSubmit={handleProblemSubmit}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <SolutionScaffold
            data={scaffoldData}
            onReset={handleReset}
          />
        )}
      </div>
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <HomeContent />
    </Suspense>
  )
}
