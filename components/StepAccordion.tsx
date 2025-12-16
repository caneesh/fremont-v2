'use client'

import { useState } from 'react'
import type { Step, Concept } from '@/types/scaffold'
import MathRenderer from './MathRenderer'

interface StepAccordionProps {
  step: Step
  stepNumber: number
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  concepts: Concept[]
  onComplete: () => void
  onActivate: () => void
}

export default function StepAccordion({
  step,
  stepNumber,
  isActive,
  isCompleted,
  isLocked,
  concepts,
  onComplete,
  onActivate,
}: StepAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')

  const handleToggle = () => {
    if (!isLocked) {
      setIsExpanded(!isExpanded)
      if (!isExpanded) {
        onActivate()
      }
    }
  }

  const handleComplete = () => {
    onComplete()
    setIsExpanded(false)
  }

  const relatedConcepts = concepts.filter(c => step.requiredConcepts.includes(c.id))

  return (
    <div
      className={`border-2 rounded-lg overflow-hidden transition-all ${
        isCompleted
          ? 'border-green-400 bg-green-50'
          : isActive
          ? 'border-primary-500 bg-primary-50'
          : isLocked
          ? 'border-gray-200 bg-gray-50 opacity-60'
          : 'border-gray-300 bg-white hover:border-gray-400'
      }`}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        disabled={isLocked}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-4">
          {/* Status Icon */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              isCompleted
                ? 'bg-green-500 text-white'
                : isActive
                ? 'bg-primary-600 text-white'
                : isLocked
                ? 'bg-gray-300 text-gray-500'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            {isCompleted ? '✓' : stepNumber}
          </div>

          {/* Title */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900">
              Step {stepNumber}: {step.title}
            </h4>
            {isLocked && (
              <p className="text-sm text-gray-500">
                Complete previous steps to unlock
              </p>
            )}
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        {!isLocked && (
          <svg
            className={`w-6 h-6 text-gray-600 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && !isLocked && (
        <div className="px-6 pb-6 border-t border-gray-200">
          <div className="pt-4 space-y-4">
            {/* Required Concepts */}
            {relatedConcepts.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-blue-900 mb-2">
                  Required Concepts:
                </h5>
                <div className="flex flex-wrap gap-2">
                  {relatedConcepts.map(concept => (
                    <span
                      key={concept.id}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                    >
                      {concept.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Hint */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h5 className="text-sm font-semibold text-yellow-900 mb-2">
                💡 Guiding Hint:
              </h5>
              <MathRenderer text={step.hint} />
            </div>

            {/* Socratic Question */}
            {step.question && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-purple-900 mb-3">
                  🤔 Think About This:
                </h5>
                <MathRenderer text={step.question} className="mb-3" />

                <textarea
                  placeholder="Type your reasoning here..."
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                />
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleComplete}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
              >
                Mark as Complete →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
