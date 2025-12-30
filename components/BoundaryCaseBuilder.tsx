'use client'

import { useState, useMemo } from 'react'
import type { ScaffoldData } from '@/types/scaffold'
import type { MicroTaskScaffoldData } from '@/types/microTask'
import type {
  BoundaryCase,
  BoundaryCasePhase,
  StudentPrediction,
  PredictionValidation,
} from '@/types/boundaryCase'
import { boundaryCaseService } from '@/lib/boundaryCaseService'
import MathRenderer from './MathRenderer'

type ScaffoldDataUnion = ScaffoldData | MicroTaskScaffoldData

interface BoundaryCaseBuilderProps {
  scaffoldData: ScaffoldDataUnion
  onClose?: () => void
}

/**
 * BoundaryCaseBuilder - Interactive tool for stress-testing equations
 *
 * Teaches students to verify equations by examining limiting/boundary cases
 * where physical intuition can validate mathematical results.
 */
export default function BoundaryCaseBuilder({
  scaffoldData,
  onClose,
}: BoundaryCaseBuilderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [phase, setPhase] = useState<BoundaryCasePhase>('select_variable')
  const [selectedCase, setSelectedCase] = useState<BoundaryCase | null>(null)
  const [prediction, setPrediction] = useState('')
  const [confidence, setConfidence] = useState<'low' | 'medium' | 'high'>('medium')
  const [validation, setValidation] = useState<PredictionValidation | null>(null)
  const [completedCases, setCompletedCases] = useState<Set<string>>(new Set())

  // Detect available boundary cases
  const detection = useMemo(
    () => boundaryCaseService.detectBoundaryCases(scaffoldData),
    [scaffoldData]
  )

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  const handleSelectCase = (boundaryCase: BoundaryCase) => {
    setSelectedCase(boundaryCase)
    setPrediction('')
    setValidation(null)
    setPhase('predict_outcome')
  }

  const handleSubmitPrediction = () => {
    if (!selectedCase || !prediction.trim()) return

    const studentPrediction: StudentPrediction = {
      caseId: selectedCase.id,
      physicalPrediction: prediction,
      confidence,
      timestamp: new Date().toISOString(),
    }

    const result = boundaryCaseService.validatePrediction(selectedCase, studentPrediction)
    setValidation(result)
    setPhase('verify_with_math')
  }

  const handleContinue = () => {
    if (selectedCase) {
      setCompletedCases((prev) => new Set(prev).add(selectedCase.id))
    }
    setSelectedCase(null)
    setPrediction('')
    setValidation(null)
    setPhase('select_variable')
  }

  const handleTryAnother = () => {
    setSelectedCase(null)
    setPrediction('')
    setValidation(null)
    setPhase('select_variable')
  }

  // Don't render if no boundary cases detected
  if (!detection.hasBoundaryCases) {
    return null
  }

  const remainingCases = detection.cases.filter((c) => !completedCases.has(c.id))

  return (
    <>
      {/* Entry Card */}
      {!isOpen && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border-2 border-amber-200 dark:border-amber-500/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-dark-text-primary">
                  Stress-Test Your Equation
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                  Verify your formula by checking extreme cases
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Verify Formula
            </button>
          </div>

          {/* Feature highlights */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
              Physical Intuition
            </span>
            <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium">
              Limiting Cases
            </span>
            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-full text-xs font-medium">
              Math Verification
            </span>
          </div>
        </div>
      )}

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-auto bg-white dark:bg-dark-card rounded-xl shadow-2xl animate-scale-in">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      Boundary-Case Builder
                    </h2>
                    <p className="text-white/80 text-sm">
                      Stress-test your equation at extreme values
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Phase: Select Variable */}
              {phase === 'select_variable' && (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <p className="text-gray-700 dark:text-dark-text-secondary">
                      That formula looks neat. But let&apos;s verify it.
                    </p>
                    <p className="text-gray-900 dark:text-dark-text-primary font-medium mt-2">
                      Can you think of an extreme case where you instinctively KNOW
                      what the answer should be without doing any math?
                    </p>
                  </div>

                  {remainingCases.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-dark-text-muted">
                        Select a limiting case to explore:
                      </p>
                      {remainingCases.map((boundaryCase) => (
                        <button
                          key={boundaryCase.id}
                          onClick={() => handleSelectCase(boundaryCase)}
                          className="w-full p-4 text-left bg-gray-50 dark:bg-dark-bg hover:bg-amber-50 dark:hover:bg-amber-900/20 border-2 border-gray-200 dark:border-dark-border hover:border-amber-300 dark:hover:border-amber-500/50 rounded-lg transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="font-medium text-gray-900 dark:text-dark-text-primary group-hover:text-amber-700 dark:group-hover:text-amber-400">
                                What if {boundaryCase.variableDisplay} → {boundaryCase.limitValue}?
                              </span>
                            </div>
                            <svg
                              className="w-5 h-5 text-gray-400 group-hover:text-amber-500 transition-colors"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg
                          className="w-8 h-8 text-green-600 dark:text-green-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                      <p className="text-gray-900 dark:text-dark-text-primary font-medium">
                        You&apos;ve explored all available boundary cases!
                      </p>
                      <p className="text-gray-600 dark:text-dark-text-secondary mt-2">
                        Great job building your physical intuition.
                      </p>
                      <button
                        onClick={handleClose}
                        className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  )}

                  {/* Show completed cases */}
                  {completedCases.size > 0 && remainingCases.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-gray-200 dark:border-dark-border">
                      <p className="text-sm text-gray-500 dark:text-dark-text-muted mb-2">
                        Completed ({completedCases.size}/{detection.cases.length}):
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {detection.cases
                          .filter((c) => completedCases.has(c.id))
                          .map((c) => (
                            <span
                              key={c.id}
                              className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs"
                            >
                              {c.variableDisplay} → {c.limitValue}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Phase: Predict Outcome */}
              {phase === 'predict_outcome' && selectedCase && (
                <div className="space-y-6">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4">
                    <p className="text-amber-800 dark:text-amber-200 font-medium">
                      {selectedCase.promptQuestion}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                      Your prediction (describe the physical outcome, no math needed):
                    </label>
                    <textarea
                      value={prediction}
                      onChange={(e) => setPrediction(e.target.value)}
                      placeholder="e.g., The range would be zero because..."
                      className="w-full p-3 border-2 border-gray-200 dark:border-dark-border rounded-lg focus:border-amber-500 dark:focus:border-amber-500 focus:outline-none bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text-primary resize-none"
                      rows={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                      How confident are you?
                    </label>
                    <div className="flex gap-3">
                      {(['low', 'medium', 'high'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => setConfidence(level)}
                          className={`flex-1 py-2 px-4 rounded-lg border-2 font-medium transition-all ${
                            confidence === level
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                              : 'border-gray-200 dark:border-dark-border hover:border-amber-300 dark:hover:border-amber-500/50 text-gray-600 dark:text-dark-text-secondary'
                          }`}
                        >
                          {level.charAt(0).toUpperCase() + level.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setPhase('select_variable')
                        setSelectedCase(null)
                        setPrediction('')
                      }}
                      className="px-4 py-2 text-gray-600 dark:text-dark-text-secondary hover:text-gray-800 dark:hover:text-dark-text-primary transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmitPrediction}
                      disabled={!prediction.trim()}
                      className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed"
                    >
                      Check My Prediction
                    </button>
                  </div>
                </div>
              )}

              {/* Phase: Verify with Math */}
              {phase === 'verify_with_math' && selectedCase && validation && (
                <div className="space-y-6">
                  {/* Feedback */}
                  <div
                    className={`p-4 rounded-lg border-2 ${
                      validation.feedbackType === 'correct'
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30'
                        : validation.feedbackType === 'partial'
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-500/30'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {validation.feedbackType === 'correct' ? (
                        <svg
                          className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                            validation.feedbackType === 'partial'
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      )}
                      <div>
                        <p
                          className={`font-medium ${
                            validation.feedbackType === 'correct'
                              ? 'text-green-800 dark:text-green-200'
                              : validation.feedbackType === 'partial'
                              ? 'text-yellow-800 dark:text-yellow-200'
                              : 'text-red-800 dark:text-red-200'
                          }`}
                        >
                          {validation.feedback}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Math Verification */}
                  {validation.mathVerification && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                        Mathematical Verification
                      </h4>
                      <div className="text-blue-700 dark:text-blue-300">
                        <MathRenderer text={validation.mathVerification} enableCopy={false} />
                      </div>
                    </div>
                  )}

                  {/* Physical Insight */}
                  <div className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-dark-text-primary mb-2">
                      Physical Insight
                    </h4>
                    <p className="text-gray-700 dark:text-dark-text-secondary">
                      {selectedCase.physicalReasoning}
                    </p>
                  </div>

                  {/* Expected Outcome */}
                  <div className="bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-dark-text-primary mb-2">
                      Expected Physical Outcome
                    </h4>
                    <p className="text-gray-700 dark:text-dark-text-secondary">
                      {selectedCase.expectedPhysicalOutcome}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                    <button
                      onClick={handleTryAnother}
                      className="flex-1 py-2 border-2 border-amber-500 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg font-medium transition-colors"
                    >
                      Try Another Case
                    </button>
                    <button
                      onClick={handleContinue}
                      className="flex-1 py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg font-medium transition-all"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
