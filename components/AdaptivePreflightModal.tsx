'use client'

import { useState, useCallback, useMemo } from 'react'
import type { StepRiskAssessment, RiskFactor } from '@/lib/adaptivePreflightService'
import { getRiskSummary } from '@/lib/adaptivePreflightService'

// ============================================
// Types
// ============================================

interface AdaptivePreflightModalProps {
  assessment: StepRiskAssessment
  stepTitle: string
  conceptNames: string[]
  onProceed: () => void
  onReviewConcepts: () => void
  onClose: () => void
}

interface QuickCheck {
  question: string
  options: Array<{
    id: string
    label: string
    isCorrect: boolean
    explanation?: string
  }>
}

// ============================================
// Quick Check Generation
// ============================================

function generateQuickCheck(conceptNames: string[], riskFactors: RiskFactor[]): QuickCheck | null {
  if (conceptNames.length === 0) return null

  const concept = conceptNames[0]
  const hasMistakeHistory = riskFactors.some(f => f.source === 'mistake_notebook')
  const hasStrugglePattern = riskFactors.some(f => f.source === 'mistake_tracking')

  // Generate a conceptual understanding question
  if (hasMistakeHistory || hasStrugglePattern) {
    return {
      question: `Before proceeding, can you explain why ${concept} is relevant to this step?`,
      options: [
        {
          id: 'understand',
          label: 'Yes, I understand how it applies here',
          isCorrect: true,
        },
        {
          id: 'unsure',
          label: 'I\'m not entirely sure',
          isCorrect: false,
          explanation: 'Consider reviewing this concept before proceeding. Take your time.',
        },
        {
          id: 'need_review',
          label: 'I need to review this concept first',
          isCorrect: false,
          explanation: 'Good self-awareness! Reviewing will help you solve this step more confidently.',
        },
      ],
    }
  }

  return null
}

// ============================================
// Risk Factor Display
// ============================================

function RiskFactorBadge({ factor }: { factor: RiskFactor }) {
  const config = {
    mistake_notebook: {
      icon: '📓',
      color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    },
    mistake_tracking: {
      icon: '📊',
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    },
    concept_mastery: {
      icon: '🎯',
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    },
  }[factor.source]

  return (
    <div className={`px-3 py-2 rounded-lg text-sm ${config.color}`}>
      <span className="mr-2">{config.icon}</span>
      {factor.description}
    </div>
  )
}

// ============================================
// Risk Level Indicator
// ============================================

function RiskLevelIndicator({ level, score }: { level: 'low' | 'medium' | 'high'; score: number }) {
  const config = {
    low: {
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      barColor: 'bg-green-500',
      label: 'Low Risk',
    },
    medium: {
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      barColor: 'bg-amber-500',
      label: 'Medium Risk',
    },
    high: {
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      barColor: 'bg-red-500',
      label: 'High Risk',
    },
  }[level]

  return (
    <div className={`px-4 py-3 rounded-lg ${config.bgColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`font-medium ${config.color}`}>{config.label}</span>
        <span className={`text-sm ${config.color}`}>{Math.round(score * 100)}%</span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${config.barColor} transition-all duration-500`}
          style={{ width: `${score * 100}%` }}
        />
      </div>
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export default function AdaptivePreflightModal({
  assessment,
  stepTitle,
  conceptNames,
  onProceed,
  onReviewConcepts,
  onClose,
}: AdaptivePreflightModalProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  // Generate quick check question
  const quickCheck = useMemo(
    () => generateQuickCheck(conceptNames, assessment.riskFactors),
    [conceptNames, assessment.riskFactors]
  )

  const selectedOptionData = quickCheck?.options.find(o => o.id === selectedOption)

  // Handle option selection
  const handleOptionSelect = useCallback((optionId: string) => {
    setSelectedOption(optionId)
    setShowFeedback(true)
  }, [])

  // Handle proceed click
  const handleProceed = useCallback(() => {
    if (selectedOptionData?.isCorrect || !quickCheck) {
      onProceed()
    } else {
      // If they acknowledged uncertainty, let them proceed anyway
      onProceed()
    }
  }, [selectedOptionData, quickCheck, onProceed])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-amber-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-xl">🛡️</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Quick Check</h2>
                <p className="text-sm text-white/80">Before you proceed...</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Step context */}
          <div className="text-center pb-4 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">Step:</p>
            <p className="font-medium text-gray-900 dark:text-white">{stepTitle}</p>
          </div>

          {/* Risk indicator */}
          <RiskLevelIndicator level={assessment.riskLevel} score={assessment.riskScore} />

          {/* Risk factors */}
          {assessment.riskFactors.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Why we&apos;re checking:
              </p>
              <div className="space-y-2">
                {assessment.riskFactors.slice(0, 3).map((factor, idx) => (
                  <RiskFactorBadge key={idx} factor={factor} />
                ))}
              </div>
            </div>
          )}

          {/* Quick check question */}
          {quickCheck && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
              <p className="text-gray-900 dark:text-white font-medium">
                {quickCheck.question}
              </p>

              <div className="space-y-2">
                {quickCheck.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleOptionSelect(option.id)}
                    disabled={showFeedback}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all
                      ${selectedOption === option.id
                        ? option.isCorrect
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                      }
                      ${showFeedback && selectedOption !== option.id ? 'opacity-50' : ''}
                      ${showFeedback ? 'cursor-default' : 'cursor-pointer'}
                    `}
                  >
                    <span className="text-gray-900 dark:text-white">{option.label}</span>
                  </button>
                ))}
              </div>

              {/* Feedback */}
              {showFeedback && selectedOptionData && !selectedOptionData.isCorrect && selectedOptionData.explanation && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-500/30">
                  <p className="text-amber-800 dark:text-amber-200 text-sm">
                    {selectedOptionData.explanation}
                  </p>
                </div>
              )}

              {showFeedback && selectedOptionData?.isCorrect && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-500/30">
                  <p className="text-green-800 dark:text-green-200 text-sm">
                    Great! You&apos;re ready to proceed with this step.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* No quick check - just show info */}
          {!quickCheck && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                Based on your learning history, take a moment to review the concepts before proceeding.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <button
            onClick={onReviewConcepts}
            className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            Review Concepts
          </button>
          <button
            onClick={handleProceed}
            disabled={quickCheck !== null && !showFeedback}
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-colors
              ${quickCheck !== null && !showFeedback
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {showFeedback && selectedOptionData?.isCorrect ? 'Proceed' : 'Continue Anyway'}
          </button>
        </div>
      </div>
    </div>
  )
}
