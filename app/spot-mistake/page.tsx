'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SpotTheMistake from '@/components/SpotTheMistake'
import MistakeFeedback from '@/components/MistakeFeedback'
import Link from 'next/link'
import type { StudentSolution, AnalyzeMistakeResponse } from '@/types/spotTheMistake'
import { authenticatedFetch } from '@/lib/api/apiClient'

export default function SpotMistakePage() {
  const router = useRouter()
  const [solution, setSolution] = useState<Omit<StudentSolution, 'mistakeLocation'> | null>(null)
  const [feedback, setFeedback] = useState<AnalyzeMistakeResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [problemText, setProblemText] = useState('')

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!problemText.trim()) return

    setIsLoading(true)
    setError(null)
    setSolution(null)
    setFeedback(null)

    try {
      const response = await authenticatedFetch('/api/spot-mistake/generate', {
        method: 'POST',
        body: JSON.stringify({
          problemText: problemText.trim(),
          domain: 'Classical Mechanics',
          subdomain: 'General',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate solution')
      }

      const data = await response.json()
      setSolution(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitAnalysis = async (stepIndex: number | null, explanation: string) => {
    if (!solution) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await authenticatedFetch('/api/spot-mistake/analyze', {
        method: 'POST',
        body: JSON.stringify({
          solutionId: solution.id,
          identifiedStepIndex: stepIndex,
          explanation,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze')
      }

      const data: AnalyzeMistakeResponse = await response.json()
      setFeedback(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleTryAnother = () => {
    setSolution(null)
    setFeedback(null)
    setProblemText('')
    setError(null)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 py-8 px-4">
      <div className="container mx-auto">
        {/* Header */}
        <header className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-orange-500">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Spot the Mistake
            </h1>
            <p className="text-gray-600">
              Sharpen your critical thinking by finding conceptual errors in student solutions.
              Each solution contains exactly ONE deliberate mistake - can you spot it?
            </p>
          </div>
        </header>

        {/* Main Content */}
        {!solution && !feedback ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                Enter a Physics Problem
              </h2>

              <form onSubmit={handleGenerate} className="space-y-6">
                <div>
                  <label htmlFor="problem" className="block text-sm font-medium text-gray-700 mb-2">
                    Problem Statement
                  </label>
                  <textarea
                    id="problem"
                    rows={6}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-gray-900"
                    placeholder="Enter any IIT-JEE Physics problem..."
                    value={problemText}
                    onChange={(e) => setProblemText(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {isLoading && (
                  <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
                      <p className="text-orange-800 font-medium">
                        Generating a flawed student solution...
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !problemText.trim()}
                  className="w-full px-6 py-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? 'Generating...' : 'Generate Student Solution'}
                </button>
              </form>

              {/* Info Section */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">How It Works</h3>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>• We generate a student solution that&apos;s mostly correct (~90%)</p>
                  <p>• It contains exactly ONE conceptual error (not a calculation typo)</p>
                  <p>• Your task: identify which step has the mistake and explain why</p>
                  <p>• This builds critical analysis skills essential for IIT-JEE</p>
                </div>
              </div>
            </div>
          </div>
        ) : feedback ? (
          <MistakeFeedback feedback={feedback} onTryAnother={handleTryAnother} />
        ) : solution ? (
          <SpotTheMistake
            solution={solution}
            onSubmitAnalysis={handleSubmitAnalysis}
            isLoading={isLoading}
          />
        ) : null}
      </div>
    </main>
  )
}
