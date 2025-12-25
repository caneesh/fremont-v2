'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import SpotTheMistake from '@/components/SpotTheMistake'
import MistakeFeedback from '@/components/MistakeFeedback'
import type { StudentSolution, AnalyzeMistakeResponse } from '@/types/spotTheMistake'
import { authenticatedFetch } from '@/lib/api/apiClient'
import PageHeader from '@/components/PageHeader'
import MobileNav from '@/components/MobileNav'

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
      console.log('Generating solution for problem:', problemText.substring(0, 50) + '...')

      const response = await authenticatedFetch('/api/spot-mistake/generate', {
        method: 'POST',
        body: JSON.stringify({
          problemText: problemText.trim(),
          domain: 'Classical Mechanics',
          subdomain: 'General',
        }),
      })

      console.log('Generate response status:', response.status)
      console.log('Generate response headers:', response.headers.get('content-type'))

      // Check if response has content
      const contentLength = response.headers.get('content-length')
      if (contentLength === '0') {
        throw new Error('Server returned empty response. Please check server logs.')
      }

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (jsonErr) {
          throw new Error(`Server error (${response.status}): Unable to parse error response`)
        }
        throw new Error(errorData.error || 'Failed to generate solution')
      }

      let data
      try {
        data = await response.json()
      } catch (jsonErr) {
        console.error('Failed to parse JSON response:', jsonErr)
        throw new Error('Server returned invalid response. Please check server logs.')
      }

      console.log('Generated solution:', data)
      setSolution(data)
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitAnalysis = async (stepIndex: number | null, explanation: string) => {
    if (!solution) {
      console.error('No solution available')
      return
    }

    console.log('Submitting analysis:', { solutionId: solution.id, stepIndex, explanation })
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

      console.log('Analyze response status:', response.status)
      console.log('Analyze response headers:', response.headers.get('content-type'))

      // Check if response has content
      const contentLength = response.headers.get('content-length')
      if (contentLength === '0') {
        throw new Error('Server returned empty response. Please check server logs.')
      }

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch (jsonErr) {
          throw new Error(`Server error (${response.status}): Unable to parse error response`)
        }
        console.error('API error:', errorData)
        throw new Error(errorData.error || 'Failed to analyze')
      }

      let data: AnalyzeMistakeResponse
      try {
        data = await response.json()
      } catch (jsonErr) {
        console.error('Failed to parse JSON response:', jsonErr)
        throw new Error('Server returned invalid response. Please check server logs.')
      }

      console.log('Analysis result:', data)
      setFeedback(data)
    } catch (err) {
      console.error('Analysis error:', err)
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
    <main className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50 dark:from-dark-app dark:via-dark-card dark:to-dark-app py-6 md:py-8 px-4">
      <MobileNav />
      <div className="container mx-auto">
        {/* Header */}
        <header className="mb-6 md:mb-8">
          <PageHeader />

          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 border-l-4 border-orange-500 dark:border-orange-400 border-r border-t border-b border-transparent dark:border-r-dark-border dark:border-t-dark-border dark:border-b-dark-border">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
              Spot the Mistake
            </h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary">
              Sharpen your critical thinking by finding conceptual errors in student solutions.
              Each solution contains exactly ONE deliberate mistake - can you spot it?
            </p>
          </div>
        </header>

        {/* Main Content */}
        {!solution && !feedback ? (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-6 md:p-8 border border-transparent dark:border-dark-border">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-dark-text-primary mb-6">
                Enter a Physics Problem
              </h2>

              <form onSubmit={handleGenerate} className="space-y-6">
                <div>
                  <label htmlFor="problem" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Problem Statement
                  </label>
                  <textarea
                    id="problem"
                    rows={6}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-placeholder focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400/50 focus:border-transparent resize-none transition-colors"
                    placeholder="Enter any IIT-JEE Physics problem..."
                    value={problemText}
                    onChange={(e) => setProblemText(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {isLoading && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 dark:border-orange-400"></div>
                      <p className="text-orange-800 dark:text-orange-400 font-medium">
                        Generating a flawed student solution...
                      </p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !problemText.trim()}
                  className="w-full px-6 py-4 bg-orange-600 dark:bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-700 dark:hover:bg-orange-600 disabled:bg-gray-300 dark:disabled:bg-dark-card-soft disabled:text-gray-500 dark:disabled:text-dark-text-muted disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg dark:hover:shadow-orange-500/20"
                >
                  {isLoading ? 'Generating...' : 'Generate Student Solution'}
                </button>
              </form>

              {/* Info Section */}
              <div className="mt-8 pt-6 border-t border-gray-200 dark:border-dark-border">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3">How It Works</h3>
                <div className="space-y-2 text-sm text-gray-700 dark:text-dark-text-secondary">
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
          <>
            {error && (
              <div className="max-w-4xl mx-auto mb-6">
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                  {error}
                </div>
              </div>
            )}
            <SpotTheMistake
              solution={solution}
              onSubmitAnalysis={handleSubmitAnalysis}
              isLoading={isLoading}
            />
          </>
        ) : null}
      </div>
    </main>
  )
}
