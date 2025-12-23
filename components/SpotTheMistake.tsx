'use client'

import { useState } from 'react'
import type { StudentSolution, SolutionStep } from '@/types/spotTheMistake'
import { BlockMath, InlineMath } from 'react-katex'

interface SpotTheMistakeProps {
  solution: Omit<StudentSolution, 'mistakeLocation'>
  onSubmitAnalysis: (stepIndex: number | null, explanation: string) => void
  isLoading: boolean
}

export default function SpotTheMistake({
  solution,
  onSubmitAnalysis,
  isLoading
}: SpotTheMistakeProps) {
  const [selectedStep, setSelectedStep] = useState<number | null>(null)
  const [explanation, setExplanation] = useState('')
  const [showHint, setShowHint] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (explanation.trim()) {
      onSubmitAnalysis(selectedStep, explanation.trim())
    }
  }

  const renderLatex = (text: string) => {
    // Split text by $$ for display math and $ for inline math
    const parts: React.ReactNode[] = []
    let remaining = text
    let key = 0

    while (remaining) {
      // Check for display math $$...$$
      const displayMatch = remaining.match(/\$\$(.*?)\$\$/)
      if (displayMatch) {
        const beforeMatch = remaining.substring(0, displayMatch.index)
        if (beforeMatch) {
          parts.push(<span key={key++}>{beforeMatch}</span>)
        }
        parts.push(<BlockMath key={key++} math={displayMatch[1]} />)
        remaining = remaining.substring(displayMatch.index! + displayMatch[0].length)
        continue
      }

      // Check for inline math $...$
      const inlineMatch = remaining.match(/\$(.*?)\$/)
      if (inlineMatch) {
        const beforeMatch = remaining.substring(0, inlineMatch.index)
        if (beforeMatch) {
          parts.push(<span key={key++}>{beforeMatch}</span>)
        }
        parts.push(<InlineMath key={key++} math={inlineMatch[1]} />)
        remaining = remaining.substring(inlineMatch.index! + inlineMatch[0].length)
        continue
      }

      // No more math, add remaining text
      parts.push(<span key={key++}>{remaining}</span>)
      break
    }

    return <>{parts}</>
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 md:p-8 mb-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                Spot the Mistake
              </h2>
              <p className="text-sm sm:text-base text-gray-700">
                This solution looks mostly correct, but contains <strong>exactly ONE conceptual error</strong> that makes the final answer wrong.
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Can you find it? Read carefully and identify which step contains the mistake.
              </p>
            </div>
          </div>

          {/* Hint Toggle */}
          <button
            onClick={() => setShowHint(!showHint)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showHint ? 'Hide Hint' : 'Show Hint'}
          </button>

          {showHint && (
            <div className="mt-3 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm text-blue-900">
                <strong>Hint:</strong> Look for conceptual errors, not calculation mistakes. Common types: wrong reference frame, incorrect force identification, conservation law misapplication, sign errors, or mixing up concepts.
              </p>
            </div>
          )}
        </div>

        {/* Student Solution */}
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-gray-200">
            {solution.title}
          </h3>

          <div className="space-y-4">
            {solution.steps.map((step: SolutionStep, index: number) => (
              <div
                key={index}
                className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${
                  selectedStep === index
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
                onClick={() => setSelectedStep(index)}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    selectedStep === index
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {step.stepNumber}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">{step.title}</h4>
                    <p className="text-sm text-gray-700 mb-2">{renderLatex(step.content)}</p>

                    {step.equations && step.equations.length > 0 && (
                      <div className="my-3 p-3 bg-gray-50 rounded border border-gray-200">
                        {step.equations.map((eq, eqIndex) => (
                          <div key={eqIndex} className="my-2">
                            {renderLatex(eq)}
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-sm text-gray-600 italic">{renderLatex(step.reasoning)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Conclusion */}
          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">Conclusion</h4>
            <p className="text-sm text-gray-800">{renderLatex(solution.conclusion)}</p>
          </div>
        </div>

        {/* Analysis Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Which step contains the mistake?
            </label>
            <p className="text-sm text-gray-600 mb-3">
              {selectedStep !== null
                ? `You selected: Step ${selectedStep + 1} - ${solution.steps[selectedStep]?.title}`
                : 'Click on a step above to select it, or choose "No mistake" if you think the solution is correct.'}
            </p>
            <button
              type="button"
              onClick={() => setSelectedStep(null)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors text-sm ${
                selectedStep === null
                  ? 'border-gray-500 bg-gray-100 text-gray-900 font-semibold'
                  : 'border-gray-300 text-gray-700 hover:border-gray-400'
              }`}
            >
              No mistake - solution is correct
            </button>
          </div>

          <div>
            <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-2">
              Explain the mistake (or why the solution is correct)
            </label>
            <textarea
              id="explanation"
              rows={4}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none text-sm"
              placeholder="Describe what's wrong with this step, or explain why you think there's no mistake..."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !explanation.trim()}
            className="w-full px-6 py-4 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-base"
          >
            {isLoading ? 'Analyzing...' : 'Submit Analysis'}
          </button>
        </form>
      </div>
    </div>
  )
}
