'use client'

import { useState } from 'react'

interface ProblemInputProps {
  onSubmit: (problem: string) => void
  isLoading: boolean
  error: string | null
}

const SAMPLE_PROBLEMS = [
  {
    title: "Bead on a Rotating Hoop",
    text: "A bead of mass m is threaded on a frictionless circular hoop of radius R. The hoop rotates with constant angular velocity ω about a vertical diameter. Find the angle θ at which the bead can remain in stable equilibrium relative to the hoop."
  },
  {
    title: "Block on Accelerating Wedge",
    text: "A wedge of mass M and angle α rests on a frictionless horizontal surface. A block of mass m is placed on the wedge. What horizontal acceleration must be given to the wedge so that the block does not slide down the wedge? (Assume the block-wedge interface is frictionless)."
  },
  {
    title: "Rotating Rod with Bead",
    text: "A uniform rod of length L rotates in a horizontal plane with constant angular velocity ω about a vertical axis passing through one of its ends. A bead of mass m can slide without friction along the rod. At what distance r from the axis will the bead be in equilibrium?"
  }
]

export default function ProblemInput({ onSubmit, isLoading, error }: ProblemInputProps) {
  const [problemText, setProblemText] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (problemText.trim()) {
      onSubmit(problemText.trim())
    }
  }

  const loadSample = (sampleText: string) => {
    setProblemText(sampleText)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Enter Your Physics Problem
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="problem" className="block text-sm font-medium text-gray-700 mb-2">
              Problem Statement
            </label>
            <textarea
              id="problem"
              rows={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none text-gray-900"
              placeholder="Paste your physics problem here..."
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !problemText.trim()}
            className="w-full bg-primary-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Analyzing Problem...' : 'Generate Solution Scaffold'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-medium text-gray-800 mb-4">
            Or try a sample problem:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_PROBLEMS.map((sample, idx) => (
              <button
                key={idx}
                onClick={() => loadSample(sample.text)}
                className="text-left p-4 border border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 group"
                disabled={isLoading}
              >
                <h4 className="font-medium text-gray-900 mb-2 group-hover:text-primary-700">
                  {sample.title}
                </h4>
                <p className="text-sm text-gray-600 line-clamp-3">
                  {sample.text}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
