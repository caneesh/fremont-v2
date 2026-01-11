'use client'

import { useState, useCallback } from 'react'
import type {
  PreFlightCheck,
  PreFlightCheckItem,
  TrapOption,
  PreFlightValidation,
  CheckItemValidation,
  CheckItemResponse,
  PreFlightStatus,
  GuidanceScript,
  GuidanceStep,
} from '@/types/preFlightCheck'
import { authenticatedFetch } from '@/lib/api/apiClient'
import MathRenderer from './MathRenderer'

// ============================================
// Component Props
// ============================================

interface PreFlightCheckModalProps {
  check: PreFlightCheck
  problemText: string
  onComplete: (passed: boolean, validation: PreFlightValidation) => void
  onSkip?: () => void
  onClose: () => void
}

// ============================================
// Internal State Types
// ============================================

interface CheckItemState {
  selectedOptionIds: string[]
  submitted: boolean
  validation: CheckItemValidation | null
  timeStarted: number
}

type ModalView = 'check' | 'guidance' | 'result'

// ============================================
// Styling Configuration
// ============================================

const SEVERITY_CONFIG = {
  critical: {
    icon: '🚨',
    label: 'Critical',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-500/30',
  },
  important: {
    icon: '⚠️',
    label: 'Important',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-200 dark:border-amber-500/30',
  },
  advisory: {
    icon: '💡',
    label: 'Advisory',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-500/30',
  },
}

// ============================================
// Main Component
// ============================================

export default function PreFlightCheckModal({
  check,
  problemText,
  onComplete,
  onSkip,
  onClose,
}: PreFlightCheckModalProps) {
  // View state
  const [currentView, setCurrentView] = useState<ModalView>('check')
  const [currentItemIndex, setCurrentItemIndex] = useState(0)

  // Check item states
  const [itemStates, setItemStates] = useState<Record<string, CheckItemState>>(() => {
    const initial: Record<string, CheckItemState> = {}
    check.checkItems.forEach((item, idx) => {
      initial[`item-${idx}`] = {
        selectedOptionIds: [],
        submitted: false,
        validation: null,
        timeStarted: Date.now(),
      }
    })
    return initial
  })

  // Overall state
  const [status, setStatus] = useState<PreFlightStatus>('available')
  const [attemptCount, setAttemptCount] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [overallValidation, setOverallValidation] = useState<PreFlightValidation | null>(null)

  // Guidance state
  const [guidanceScript, setGuidanceScript] = useState<GuidanceScript | null>(null)
  const [guidanceStepIndex, setGuidanceStepIndex] = useState(0)

  // Current check item
  const currentItem = check.checkItems[currentItemIndex]
  const currentItemKey = `item-${currentItemIndex}`
  const currentState = itemStates[currentItemKey]
  const severityConfig = SEVERITY_CONFIG[currentItem.preCondition.severity]

  // Progress calculation
  const completedItems = Object.values(itemStates).filter((s) => s.submitted && s.validation?.isCorrect).length
  const totalItems = check.checkItems.length

  // ============================================
  // Option Selection Handler
  // ============================================

  const handleOptionToggle = useCallback(
    (optionId: string) => {
      if (currentState.submitted) return

      setItemStates((prev) => {
        const state = prev[currentItemKey]
        const isMultiSelect = currentItem.multiSelect

        let newSelected: string[]
        if (isMultiSelect) {
          // Toggle selection for multi-select
          newSelected = state.selectedOptionIds.includes(optionId)
            ? state.selectedOptionIds.filter((id) => id !== optionId)
            : [...state.selectedOptionIds, optionId]
        } else {
          // Single select - replace selection
          newSelected = state.selectedOptionIds.includes(optionId) ? [] : [optionId]
        }

        return {
          ...prev,
          [currentItemKey]: {
            ...state,
            selectedOptionIds: newSelected,
          },
        }
      })
    },
    [currentItemKey, currentItem.multiSelect, currentState.submitted]
  )

  // ============================================
  // Submit Current Item
  // ============================================

  const handleSubmitItem = async () => {
    if (currentState.selectedOptionIds.length === 0) return

    setIsSubmitting(true)

    try {
      // Validate locally first (can also call API for more complex validation)
      const selectedSet = new Set(currentState.selectedOptionIds)
      const correctSet = new Set(currentItem.correctOptionIds)

      const selectedTraps = currentItem.options
        .filter((opt) => selectedSet.has(opt.id) && !opt.isCorrect)
        .map((opt) => opt.id)

      const missedCorrect = currentItem.correctOptionIds.filter((id) => !selectedSet.has(id))

      const isCorrect =
        selectedTraps.length === 0 &&
        missedCorrect.length === 0 &&
        currentState.selectedOptionIds.length === currentItem.correctOptionIds.length &&
        currentState.selectedOptionIds.every((id) => correctSet.has(id))

      // Generate feedback
      let feedback: string
      let misconceptionDetected: CheckItemValidation['misconceptionDetected']

      if (isCorrect) {
        feedback = `Correct! You correctly identified the conditions for using ${check.displayName}.`
      } else if (selectedTraps.length > 0) {
        const trapOption = currentItem.options.find((opt) => opt.id === selectedTraps[0])
        feedback = trapOption?.misconceptionExplanation || 'This condition does not actually apply here.'
        misconceptionDetected = trapOption?.trapType
      } else if (missedCorrect.length > 0) {
        feedback = `You missed an important condition. ${currentItem.preCondition.hints[0]}`
      } else {
        feedback = 'Not quite right. Think about what this formula actually requires.'
      }

      const validation: CheckItemValidation = {
        checkItemId: currentItemKey,
        isCorrect,
        selectedTrapIds: selectedTraps,
        missedCorrectIds: missedCorrect,
        feedback,
        misconceptionDetected,
      }

      setItemStates((prev) => ({
        ...prev,
        [currentItemKey]: {
          ...prev[currentItemKey],
          submitted: true,
          validation,
        },
      }))

      // If this was the last item, check overall result
      const updatedStates = {
        ...itemStates,
        [currentItemKey]: { ...currentState, submitted: true, validation },
      }

      const allSubmitted = Object.values(updatedStates).every((s) => s.submitted)

      if (allSubmitted) {
        const correctCount = Object.values(updatedStates).filter((s) => s.validation?.isCorrect).length
        const passed = correctCount >= check.requiredToPass

        const overallResult: PreFlightValidation = {
          preFlightCheckId: check.id,
          passed,
          score: {
            correct: correctCount,
            total: totalItems,
            percentage: Math.round((correctCount / totalItems) * 100),
          },
          itemValidations: Object.values(updatedStates)
            .map((s) => s.validation)
            .filter((v): v is CheckItemValidation => v !== null),
          overallFeedback: passed
            ? `You've verified the conditions for ${check.displayName}. You may now proceed.`
            : `Some conditions for ${check.displayName} were not correctly identified.`,
        }

        setOverallValidation(overallResult)
        setAttemptCount((prev) => prev + 1)

        if (passed) {
          setStatus('passed')
          setCurrentView('result')
        } else {
          // Generate guidance for failed attempt
          await generateGuidance(overallResult)
        }
      }
    } catch (error) {
      console.error('Error validating check item:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================
  // Guidance Generation
  // ============================================

  const generateGuidance = async (validation: PreFlightValidation) => {
    // Find the first failed item for guidance
    const failedValidation = validation.itemValidations.find((v) => !v.isCorrect)
    if (!failedValidation) return

    const failedItemIndex = check.checkItems.findIndex(
      (_, idx) => `item-${idx}` === failedValidation.checkItemId
    )
    const failedItem = check.checkItems[failedItemIndex]

    // Build guidance script
    const script: GuidanceScript = {
      strategy: 'CONDITION_WALKTHROUGH',
      steps: [
        {
          type: 'question',
          content: `Let's think about this: ${failedItem.preCondition.checkQuestion}`,
          expectedInsight: failedItem.preCondition.description,
        },
        {
          type: 'highlight',
          content: 'Look at this part of the problem:',
          highlightRange: check.problemContext.highlightRanges?.[0],
        },
        {
          type: 'explanation',
          content: failedItem.preCondition.physicsRationale,
        },
        {
          type: 'reveal',
          content: `The key insight: ${failedItem.preCondition.description}`,
          conceptToReveal: failedItem.preCondition.id,
        },
      ],
      targetInsight: failedItem.preCondition.description,
      violatedCondition: failedItem.preCondition,
      physicsRationale: failedItem.preCondition.physicsRationale,
    }

    setGuidanceScript(script)
    setGuidanceStepIndex(0)
    setCurrentView('guidance')
  }

  // ============================================
  // Navigation Handlers
  // ============================================

  const handleNextItem = () => {
    if (currentItemIndex < totalItems - 1) {
      setCurrentItemIndex((prev) => prev + 1)
    }
  }

  const handlePrevItem = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex((prev) => prev - 1)
    }
  }

  const handleNextGuidanceStep = () => {
    if (guidanceScript && guidanceStepIndex < guidanceScript.steps.length - 1) {
      setGuidanceStepIndex((prev) => prev + 1)
    } else {
      // End of guidance - allow retry or skip
      setCurrentView('result')
    }
  }

  const handleRetry = () => {
    // Reset all item states
    const reset: Record<string, CheckItemState> = {}
    check.checkItems.forEach((_, idx) => {
      reset[`item-${idx}`] = {
        selectedOptionIds: [],
        submitted: false,
        validation: null,
        timeStarted: Date.now(),
      }
    })
    setItemStates(reset)
    setCurrentItemIndex(0)
    setCurrentView('check')
    setGuidanceScript(null)
    setGuidanceStepIndex(0)
  }

  const handleComplete = () => {
    if (overallValidation) {
      onComplete(overallValidation.passed, overallValidation)
    }
  }

  const canSkip = onSkip && attemptCount >= (check.allowSkipAfterAttempts ?? check.maxAttempts)

  // ============================================
  // Render: Check View
  // ============================================

  const renderCheckView = () => (
    <>
      {/* Progress Indicator */}
      <div className="flex items-center gap-2 mb-4">
        {check.checkItems.map((_, idx) => {
          const itemKey = `item-${idx}`
          const state = itemStates[itemKey]
          const isActive = idx === currentItemIndex
          const isComplete = state.submitted && state.validation?.isCorrect
          const isFailed = state.submitted && !state.validation?.isCorrect

          return (
            <button
              key={idx}
              onClick={() => setCurrentItemIndex(idx)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-300'
                  : isComplete
                    ? 'bg-green-500 text-white'
                    : isFailed
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 dark:bg-dark-border text-gray-600 dark:text-dark-text-muted hover:bg-gray-300'
              }`}
            >
              {isComplete ? '✓' : isFailed ? '×' : idx + 1}
            </button>
          )
        })}
      </div>

      {/* Current Check Item Card */}
      <div className={`rounded-lg border ${severityConfig.borderColor} ${severityConfig.bgColor} p-4 mb-4`}>
        <div className="flex items-start gap-3 mb-3">
          <span className="text-2xl">{severityConfig.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${severityConfig.bgColor} ${severityConfig.color}`}>
                {severityConfig.label}
              </span>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-dark-text-primary">
              {currentItem.preCondition.checkQuestion}
            </h4>
            <p className="text-sm text-gray-600 dark:text-dark-text-muted mt-1">
              {currentItem.preCondition.description}
            </p>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-2 mb-4">
        <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
          {currentItem.multiSelect
            ? 'Select all that apply to this problem:'
            : 'Which best describes this problem?'}
        </p>

        {currentItem.options.map((option) => {
          const isSelected = currentState.selectedOptionIds.includes(option.id)
          const showResult = currentState.submitted
          const isCorrect = option.isCorrect
          const wasSelected = isSelected

          let optionStyle = ''
          if (showResult) {
            if (isCorrect && wasSelected) {
              optionStyle = 'border-green-500 bg-green-50 dark:bg-green-900/20'
            } else if (isCorrect && !wasSelected) {
              optionStyle = 'border-green-300 bg-green-50/50 dark:bg-green-900/10'
            } else if (!isCorrect && wasSelected) {
              optionStyle = 'border-red-500 bg-red-50 dark:bg-red-900/20'
            } else {
              optionStyle = 'border-gray-200 dark:border-dark-border opacity-50'
            }
          } else if (isSelected) {
            optionStyle = 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
          } else {
            optionStyle = 'border-gray-200 dark:border-dark-border hover:border-indigo-300 dark:hover:border-indigo-500/50'
          }

          return (
            <button
              key={option.id}
              onClick={() => handleOptionToggle(option.id)}
              disabled={currentState.submitted}
              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${optionStyle} ${
                currentState.submitted ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded ${currentItem.multiSelect ? 'rounded' : 'rounded-full'} border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500'
                      : 'border-gray-300 dark:border-dark-border'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900 dark:text-dark-text-primary">{option.label}</p>

                  {/* Show trap explanation after submission */}
                  {showResult && wasSelected && !isCorrect && option.misconceptionExplanation && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300">
                      <span className="font-medium">Trap:</span> {option.misconceptionExplanation}
                    </div>
                  )}

                  {/* Show correct indicator */}
                  {showResult && isCorrect && (
                    <div className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
                      ✓ Correct condition
                    </div>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Feedback after submission */}
      {currentState.submitted && currentState.validation && (
        <div
          className={`rounded-lg border p-4 mb-4 ${
            currentState.validation.isCorrect
              ? 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-900/20'
              : 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/20'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl">{currentState.validation.isCorrect ? '✅' : '🤔'}</span>
            <div>
              <h4
                className={`font-medium mb-1 ${
                  currentState.validation.isCorrect
                    ? 'text-green-800 dark:text-green-400'
                    : 'text-amber-800 dark:text-amber-400'
                }`}
              >
                {currentState.validation.isCorrect ? 'Correct!' : 'Not quite right'}
              </h4>
              <p
                className={`text-sm ${
                  currentState.validation.isCorrect
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-amber-700 dark:text-amber-300'
                }`}
              >
                {currentState.validation.feedback}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrevItem}
          disabled={currentItemIndex === 0}
          className="px-4 py-2 text-sm text-gray-600 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>

        {!currentState.submitted ? (
          <button
            onClick={handleSubmitItem}
            disabled={currentState.selectedOptionIds.length === 0 || isSubmitting}
            className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              currentState.selectedOptionIds.length === 0 || isSubmitting
                ? 'bg-gray-300 dark:bg-dark-card-soft text-gray-500 dark:text-dark-text-muted cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                Checking...
              </>
            ) : (
              'Check Answer'
            )}
          </button>
        ) : currentItemIndex < totalItems - 1 ? (
          <button
            onClick={handleNextItem}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700"
          >
            Next Check →
          </button>
        ) : null}
      </div>
    </>
  )

  // ============================================
  // Render: Guidance View
  // ============================================

  const renderGuidanceView = () => {
    if (!guidanceScript) return null

    const currentStep = guidanceScript.steps[guidanceStepIndex]
    const isLastStep = guidanceStepIndex === guidanceScript.steps.length - 1

    return (
      <div className="space-y-4">
        {/* Guidance Header */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🧭</span>
            <h4 className="font-medium text-amber-800 dark:text-amber-400">Let&apos;s Think Through This</h4>
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            The condition for {check.displayName} wasn&apos;t quite right. Let&apos;s work through it together.
          </p>
        </div>

        {/* Progress through guidance */}
        <div className="flex gap-1 mb-4">
          {guidanceScript.steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 flex-1 rounded ${
                idx <= guidanceStepIndex ? 'bg-amber-500' : 'bg-gray-200 dark:bg-dark-border'
              }`}
            />
          ))}
        </div>

        {/* Current Guidance Step */}
        <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg p-4">
          {currentStep.type === 'question' && (
            <div>
              <p className="text-lg text-gray-900 dark:text-dark-text-primary mb-2">{currentStep.content}</p>
              <p className="text-sm text-gray-500 dark:text-dark-text-muted italic">
                Think about this before continuing...
              </p>
            </div>
          )}

          {currentStep.type === 'highlight' && (
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-text-muted mb-2">{currentStep.content}</p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-3 italic text-gray-800 dark:text-dark-text-primary">
                {currentStep.highlightRange
                  ? problemText.slice(currentStep.highlightRange.start, currentStep.highlightRange.end)
                  : check.problemContext.relevantText}
              </div>
            </div>
          )}

          {currentStep.type === 'explanation' && (
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="font-medium text-gray-900 dark:text-dark-text-primary mb-1">Key Insight</p>
                <p className="text-gray-700 dark:text-dark-text-secondary">{currentStep.content}</p>
              </div>
            </div>
          )}

          {currentStep.type === 'reveal' && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">✨</span>
                <div>
                  <p className="font-medium text-green-800 dark:text-green-400 mb-1">The Answer</p>
                  <p className="text-green-700 dark:text-green-300">{currentStep.content}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Alternative Law Suggestion */}
        {isLastStep && guidanceScript.alternativeLaw && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl">💡</span>
              <div>
                <p className="font-medium text-blue-800 dark:text-blue-400 mb-1">
                  Consider using: {guidanceScript.alternativeLaw.displayName}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {guidanceScript.alternativeLaw.whyItApplies}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-end">
          <button
            onClick={handleNextGuidanceStep}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 flex items-center gap-2"
          >
            {isLastStep ? 'Got It' : 'Continue'}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // ============================================
  // Render: Result View
  // ============================================

  const renderResultView = () => {
    if (!overallValidation) return null

    const { passed, score } = overallValidation

    return (
      <div className="space-y-4">
        {/* Result Header */}
        <div
          className={`rounded-lg border p-6 text-center ${
            passed
              ? 'border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-900/20'
              : 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/20'
          }`}
        >
          <span className="text-5xl mb-3 block">{passed ? '✅' : '🔄'}</span>
          <h3
            className={`text-xl font-semibold mb-2 ${
              passed ? 'text-green-800 dark:text-green-400' : 'text-amber-800 dark:text-amber-400'
            }`}
          >
            {passed ? 'Pre-Flight Check Passed!' : 'Not Quite Ready Yet'}
          </h3>
          <p className={`text-sm ${passed ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>
            {overallValidation.overallFeedback}
          </p>

          {/* Score */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-card rounded-full border border-gray-200 dark:border-dark-border">
            <span className="text-sm text-gray-600 dark:text-dark-text-muted">Score:</span>
            <span className="font-semibold text-gray-900 dark:text-dark-text-primary">
              {score.correct}/{score.total} ({score.percentage}%)
            </span>
          </div>
        </div>

        {/* Item Summary */}
        <div className="space-y-2">
          {overallValidation.itemValidations.map((itemVal, idx) => {
            const item = check.checkItems[idx]
            return (
              <div
                key={idx}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  itemVal.isCorrect
                    ? 'border-green-200 dark:border-green-500/30 bg-green-50/50 dark:bg-green-900/10'
                    : 'border-red-200 dark:border-red-500/30 bg-red-50/50 dark:bg-red-900/10'
                }`}
              >
                <span className="text-lg">{itemVal.isCorrect ? '✓' : '×'}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                    {item.preCondition.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-dark-border">
          {!passed && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
              >
                Try Again
              </button>
              {canSkip && (
                <button
                  onClick={onSkip}
                  className="px-4 py-2 text-gray-600 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text-primary text-sm"
                >
                  Skip for Now
                </button>
              )}
            </div>
          )}
          <button
            onClick={handleComplete}
            className={`px-6 py-2 rounded-lg font-medium ${
              passed
                ? 'bg-green-600 text-white hover:bg-green-700 ml-auto'
                : 'bg-gray-600 text-white hover:bg-gray-700'
            }`}
          >
            {passed ? 'Continue to Formula' : 'Proceed Anyway'}
          </button>
        </div>

        {/* Attempt counter */}
        <p className="text-xs text-gray-500 dark:text-dark-text-muted text-center">
          Attempt {attemptCount} of {check.maxAttempts}
          {canSkip && ' • You can now skip this check'}
        </p>
      </div>
    )
  }

  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-500/30 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛫</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  Pre-Flight Check
                </h2>
                <p className="text-sm text-gray-600 dark:text-dark-text-muted">
                  Verify conditions before using this formula
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-primary rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card-soft"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Formula Display */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-dark-card-soft border-b border-gray-200 dark:border-dark-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-dark-text-muted">Formula:</span>
            <div className="text-lg">
              <MathRenderer text={`$${check.formula}$`} />
            </div>
            <span className="ml-auto text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {check.displayName}
            </span>
          </div>
        </div>

        {/* Modal Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {currentView === 'check' && renderCheckView()}
          {currentView === 'guidance' && renderGuidanceView()}
          {currentView === 'result' && renderResultView()}
        </div>

        {/* Progress Footer */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-dark-card-soft border-t border-gray-200 dark:border-dark-border flex-shrink-0">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-dark-text-muted">
            <span>
              {completedItems}/{totalItems} conditions verified
            </span>
            <span>Required to pass: {check.requiredToPass}/{totalItems}</span>
          </div>
          <div className="mt-2 h-2 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${(completedItems / totalItems) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
