'use client'

import { useState, useCallback } from 'react'
import type { Step } from '@/types/scaffold'
import type { PlacedForce, DiagramStepData } from '@/types/diagram'
import FBDCanvas from './FBDCanvas'
import { validateFBD, generateHint } from '@/lib/fbdValidator'

interface DiagramStepProps {
  step: Step
  stepNumber: number
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  onComplete: () => void
  onActivate: () => void
}

export default function DiagramStep({
  step,
  stepNumber,
  isActive,
  isCompleted,
  isLocked,
  onComplete,
  onActivate
}: DiagramStepProps) {
  const [isExpanded, setIsExpanded] = useState(isActive)
  const [placedForces, setPlacedForces] = useState<PlacedForce[]>([])
  const [validationFeedback, setValidationFeedback] = useState<string | null>(null)
  const [currentHint, setCurrentHint] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [showSuccess, setShowSuccess] = useState(false)

  const diagramData = step.diagramData as DiagramStepData

  const handleToggle = () => {
    if (isLocked) return
    if (!isExpanded) {
      onActivate()
    }
    setIsExpanded(!isExpanded)
  }

  const handleCheckDiagram = useCallback(() => {
    if (!diagramData) return

    const result = validateFBD(placedForces, diagramData.requiredForces, diagramData)
    setAttempts(prev => prev + 1)

    if (result.isValid) {
      setValidationFeedback(null)
      setCurrentHint(null)
      setShowSuccess(true)
      // Delay completion to show success animation
      setTimeout(() => {
        onComplete()
      }, 1000)
    } else {
      setValidationFeedback(result.feedback)
      // Show progressive hints after attempts
      if (attempts >= 1) {
        const hint = generateHint(result, attempts + 1, diagramData)
        setCurrentHint(hint)
      }
    }
  }, [placedForces, diagramData, attempts, onComplete])

  const handleReset = () => {
    setPlacedForces([])
    setValidationFeedback(null)
    setCurrentHint(null)
  }

  const getBorderColor = () => {
    if (isCompleted) return 'border-green-500 dark:border-green-600'
    if (isActive) return 'border-indigo-500 dark:border-indigo-400'
    if (isLocked) return 'border-slate-300 dark:border-slate-600'
    return 'border-slate-400 dark:border-slate-500'
  }

  const getBackgroundColor = () => {
    if (isCompleted) return 'bg-green-50/50 dark:bg-green-900/10'
    if (isActive) return 'bg-white dark:bg-slate-800'
    if (isLocked) return 'bg-slate-100 dark:bg-slate-800/50'
    return 'bg-white dark:bg-slate-800'
  }

  if (!diagramData) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
        Error: Missing diagram data for this step
      </div>
    )
  }

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${getBorderColor()} ${getBackgroundColor()}`}>
      {/* Header */}
      <button
        onClick={handleToggle}
        disabled={isLocked}
        className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
          isLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
        }`}
      >
        {/* Step Number Circle */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
            isCompleted
              ? 'bg-green-500 text-white'
              : isActive
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          {isCompleted ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            stepNumber
          )}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold truncate ${
              isLocked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
            }`}>
              {step.title}
            </h3>
            {/* Diagram badge */}
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
              Diagram
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Draw the free body diagram
          </p>
        </div>

        {/* Expand/Collapse Icon */}
        {!isLocked && (
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}

        {/* Lock Icon */}
        {isLocked && (
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && !isLocked && (
        <div className="px-4 pb-4 space-y-4">
          {/* Instructions */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              <strong>Instructions:</strong> Click forces on the left to add them.
              Use ← → arrow keys to rotate. Press Delete to remove.
            </p>
          </div>

          {/* Canvas */}
          <FBDCanvas
            scenario={diagramData}
            placedForces={placedForces}
            onPlacedForcesChange={setPlacedForces}
            isCompleted={isCompleted || showSuccess}
          />

          {/* Validation Feedback */}
          {validationFeedback && !showSuccess && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {validationFeedback}
                </p>
              </div>
            </div>
          )}

          {/* Hint */}
          {currentHint && !showSuccess && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Hint:</strong> {currentHint}
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {showSuccess && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300 font-medium">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Correct! Your free body diagram is complete.
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!isCompleted && !showSuccess && (
            <div className="flex gap-3">
              <button
                onClick={handleCheckDiagram}
                disabled={placedForces.length === 0}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Check Diagram
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Reset
              </button>
            </div>
          )}

          {/* Skip option after many attempts */}
          {attempts >= 5 && !isCompleted && !showSuccess && (
            <button
              onClick={onComplete}
              className="w-full px-4 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Skip this step and continue →
            </button>
          )}
        </div>
      )}
    </div>
  )
}
