'use client'

import { useState } from 'react'
import ProblemInput from '@/components/ProblemInput'
import SolutionScaffold from '@/components/SolutionScaffold'
import type { ScaffoldData } from '@/types/scaffold'

export default function Home() {
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

  const handleReset = () => {
    setScaffoldData(null)
    setError(null)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            PhysiScaffold
          </h1>
          <p className="text-xl text-gray-600 italic">
            The Socratic Physics Engine
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Active Decomposition: We don&apos;t give answers; we give the framework for the answer.
          </p>
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
