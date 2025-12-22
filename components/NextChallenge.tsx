'use client'

import { useState } from 'react'
import type { StepUpProblem } from '@/types/stepUp'

interface NextChallengeProps {
  currentProblem: string
  topicTags: string[]
  onAcceptChallenge: (problemText: string) => void
}

export default function NextChallenge({ currentProblem, topicTags, onAcceptChallenge }: NextChallengeProps) {
  const [nextProblem, setNextProblem] = useState<StepUpProblem | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const handleGenerateNext = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const requestBody = {
        previousProblem: currentProblem,
        userPerformance: 'Solved successfully',
        topicTags,
        difficulty: 'Medium', // Could be dynamic based on actual difficulty
      }

      console.log('Step-Up Request:', requestBody)

      const response = await fetch('/api/step-up', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Step-Up API Error:', errorData)
        const errorMessage = errorData.error || 'Failed to generate next challenge'
        const details = errorData.details ? ` (${errorData.details})` : ''
        throw new Error(errorMessage + details)
      }

      const problem: StepUpProblem = await response.json()
      console.log('Step-Up Response:', problem)
      setNextProblem(problem)
      setShowDetails(false)
    } catch (err) {
      console.error('Step-Up Generation Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate next challenge')
    } finally {
      setIsGenerating(false)
    }
  }

  if (!nextProblem && !isGenerating && !error) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg shadow-lg p-8 border-2 border-emerald-300">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-emerald-900 mb-2 flex items-center gap-2">
              🎯 Ready for the Next Challenge?
            </h3>
            <p className="text-emerald-700">
              Great job solving this problem! Want to level up with a slightly harder version?
            </p>
          </div>
          <button
            onClick={handleGenerateNext}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            Generate Next Problem
          </button>
        </div>
      </div>
    )
  }

  if (isGenerating) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg shadow-lg p-8 border-2 border-emerald-300">
        <div className="flex items-center justify-center gap-4">
          <svg className="w-8 h-8 animate-spin text-emerald-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div>
            <p className="text-lg font-semibold text-emerald-900">
              Curriculum Architect is designing your next challenge...
            </p>
            <p className="text-sm text-emerald-700">
              Building on your success, adding one new complexity
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg shadow-lg p-6 border-2 border-red-300">
        <p className="text-red-700">❌ {error}</p>
        <button
          onClick={handleGenerateNext}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (nextProblem) {
    return (
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg shadow-lg p-8 border-2 border-amber-400">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">🚀</span>
              <h3 className="text-2xl font-bold text-amber-900">
                Next Challenge: {nextProblem.nextProblemTitle}
              </h3>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                nextProblem.suggestedDifficulty === 'Easy'
                  ? 'bg-green-100 text-green-800'
                  : nextProblem.suggestedDifficulty === 'Medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {nextProblem.suggestedDifficulty}
              </span>
              <span className="text-sm text-amber-700">
                ⏱️ {nextProblem.estimatedTime} minutes
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
        </div>

        {/* What Changed */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-amber-200">
          <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <span>🔧</span> What&apos;s New:
          </h4>
          <p className="text-gray-800">{nextProblem.addedComplexity}</p>
        </div>

        {/* Why This Next */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-amber-200">
          <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
            <span>💡</span> Why This Challenge:
          </h4>
          <p className="text-gray-800">{nextProblem.whyThisNext}</p>
        </div>

        {/* New Concepts */}
        {nextProblem.newConcepts.length > 0 && (
          <div className="bg-white rounded-lg p-4 mb-4 border border-amber-200">
            <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
              <span>📚</span> New Concepts:
            </h4>
            <div className="flex flex-wrap gap-2">
              {nextProblem.newConcepts.map((concept, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Problem Statement (shown when details expanded) */}
        {showDetails && (
          <div className="bg-white rounded-lg p-6 mb-4 border-2 border-amber-300">
            <h4 className="font-semibold text-amber-900 mb-3 text-lg">
              📋 Full Problem Statement:
            </h4>
            <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
              {nextProblem.problemText}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => onAcceptChallenge(nextProblem.problemText)}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 font-semibold flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Accept Challenge
          </button>
          <button
            onClick={handleGenerateNext}
            className="px-6 py-3 bg-white border-2 border-amber-400 text-amber-900 rounded-lg hover:bg-amber-50 font-medium"
          >
            Generate Different One
          </button>
        </div>
      </div>
    )
  }

  return null
}
