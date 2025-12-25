'use client'

import { useState, useEffect } from 'react'
import { BlockMath, InlineMath } from 'react-katex'
import type { MicroCurriculum, PracticeProblem } from '@/types/conceptMastery'

interface RepairModeModalProps {
  conceptId: string
  conceptName: string
  onClose: () => void
  onComplete?: () => void
}

type Step = 'clarification' | 'diagnostic' | 'practice1' | 'practice2' | 'complete'

export default function RepairModeModal({
  conceptId,
  conceptName,
  onClose,
  onComplete,
}: RepairModeModalProps) {
  const [curriculum, setCurriculum] = useState<MicroCurriculum | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<Step>('clarification')
  const [showDiagnosticAnswer, setShowDiagnosticAnswer] = useState(false)
  const [currentHintIndex, setCurrentHintIndex] = useState<number>(0)

  // Load curriculum from API
  useEffect(() => {
    loadCurriculum()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conceptId])

  const loadCurriculum = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptId, conceptName }),
      })

      if (!response.ok) {
        throw new Error('Failed to load repair curriculum')
      }

      const data = await response.json()
      setCurriculum(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load curriculum')
    } finally {
      setIsLoading(false)
    }
  }

  // Render LaTeX in text
  const renderLatex = (text: string) => {
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

  const handleNext = () => {
    if (currentStep === 'clarification') {
      setCurrentStep('diagnostic')
    } else if (currentStep === 'diagnostic') {
      setCurrentStep('practice1')
      setCurrentHintIndex(0)
    } else if (currentStep === 'practice1') {
      setCurrentStep('practice2')
      setCurrentHintIndex(0)
    } else if (currentStep === 'practice2') {
      setCurrentStep('complete')
      onComplete?.()
    }
  }

  const handleShowHint = () => {
    const currentProblem = getCurrentProblem()
    if (currentProblem && currentHintIndex < currentProblem.hints.length) {
      setCurrentHintIndex(currentHintIndex + 1)
    }
  }

  const getCurrentProblem = (): PracticeProblem | null => {
    if (!curriculum) return null
    if (currentStep === 'practice1') return curriculum.practiceProblems[0]
    if (currentStep === 'practice2') return curriculum.practiceProblems[1]
    return null
  }

  const renderStepIndicator = () => {
    const steps: Step[] = ['clarification', 'diagnostic', 'practice1', 'practice2', 'complete']
    const currentIndex = steps.indexOf(currentStep)

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.slice(0, -1).map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                index <= currentIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index + 1}
            </div>
            {index < steps.length - 2 && (
              <div
                className={`w-12 h-1 ${
                  index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
          <div className="flex items-center justify-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-700">Loading repair curriculum...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !curriculum) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-4">{error || 'No curriculum available for this concept.'}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Repair Mode</h2>
            <p className="text-sm text-gray-600">{conceptName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Content */}
        <div className="space-y-6">
          {/* Step 1: Concept Clarification */}
          {currentStep === 'clarification' && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                📚 Concept Clarification
              </h3>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                <div className="text-gray-800 whitespace-pre-line">
                  {renderLatex(curriculum.conceptClarification)}
                </div>
              </div>
              <button
                onClick={handleNext}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                I understand → Continue to Diagnostic
              </button>
            </div>
          )}

          {/* Step 2: Diagnostic Question */}
          {currentStep === 'diagnostic' && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                🔍 Diagnostic Question
              </h3>
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6 mb-4">
                <p className="text-gray-800 mb-4">{renderLatex(curriculum.diagnosticQuestion)}</p>
              </div>

              {!showDiagnosticAnswer ? (
                <button
                  onClick={() => setShowDiagnosticAnswer(true)}
                  className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition-colors mb-4"
                >
                  Reveal Answer
                </button>
              ) : (
                <>
                  <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-4">
                    <h4 className="font-semibold text-green-900 mb-2">Answer:</h4>
                    <div className="text-gray-800">{renderLatex(curriculum.diagnosticAnswer)}</div>
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Continue to Practice Problems
                  </button>
                </>
              )}
            </div>
          )}

          {/* Steps 3-4: Practice Problems */}
          {(currentStep === 'practice1' || currentStep === 'practice2') && (
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                ✏️ Practice Problem {currentStep === 'practice1' ? '1' : '2'}
              </h3>

              {(() => {
                const problem = getCurrentProblem()
                if (!problem) return null

                return (
                  <>
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-semibold text-purple-900">
                          Difficulty: {problem.difficulty.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-800">{renderLatex(problem.problemText)}</p>
                    </div>

                    {/* Hints */}
                    {currentHintIndex > 0 && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
                        <h4 className="font-semibold text-blue-900 mb-2">
                          Hints ({currentHintIndex}/{problem.hints.length}):
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                          {problem.hints.slice(0, currentHintIndex).map((hint, index) => (
                            <li key={index} className="text-sm text-gray-700">
                              {renderLatex(hint)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Hint and Solution Buttons */}
                    <div className="flex gap-3 mb-4">
                      {currentHintIndex < problem.hints.length && (
                        <button
                          onClick={handleShowHint}
                          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Show Hint ({currentHintIndex + 1}/{problem.hints.length})
                        </button>
                      )}
                    </div>

                    {/* Solution (always visible for mock mode) */}
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 mb-4">
                      <h4 className="font-semibold text-green-900 mb-2">Solution:</h4>
                      <div className="text-gray-800">{renderLatex(problem.solution)}</div>
                    </div>

                    <button
                      onClick={handleNext}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      {currentStep === 'practice1' ? 'Continue to Problem 2' : 'Complete Repair Mode'}
                    </button>
                  </>
                )
              })()}
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 'complete' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-12 h-12 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                Repair Complete!
              </h3>
              <p className="text-gray-600 mb-6">
                Great job working through {conceptName}. Keep practicing to build mastery!
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
