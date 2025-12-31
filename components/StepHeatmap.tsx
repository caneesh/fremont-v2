'use client'

import { useMemo } from 'react'
import type { Confidence } from '@/types/confidence'

interface StepHeatmapProps {
  /** Map of step index to confidence rating */
  stepConfidenceRatings: Map<number, Confidence>
  /** Array of step titles for tooltip display */
  stepTitles: string[]
  /** Set of completed step indices */
  completedSteps: number[]
  /** Current active step index */
  currentStep: number
  /** Optional callback when a step cell is clicked */
  onStepClick?: (stepIndex: number) => void
}

/**
 * StepHeatmap - Visual confidence overview
 *
 * Displays a compact heatmap of step confidence ratings:
 * - Green: High confidence (mastery)
 * - Blue: Medium confidence (progressing)
 * - Amber: Low confidence (uncertain/lucky guess)
 * - Gray: Not yet rated
 * - Dotted border: Current step
 */
export default function StepHeatmap({
  stepConfidenceRatings,
  stepTitles,
  completedSteps,
  currentStep,
  onStepClick,
}: StepHeatmapProps) {
  // Calculate summary statistics
  const stats = useMemo(() => {
    const rated = Array.from(stepConfidenceRatings.values())
    const total = stepTitles.length
    const ratedCount = rated.length
    const highCount = rated.filter(c => c === 'high').length
    const mediumCount = rated.filter(c => c === 'medium').length
    const lowCount = rated.filter(c => c === 'low').length

    // Calculate average confidence score (high=3, medium=2, low=1)
    const avgScore = ratedCount > 0
      ? (highCount * 3 + mediumCount * 2 + lowCount * 1) / ratedCount
      : 0

    return {
      total,
      ratedCount,
      highCount,
      mediumCount,
      lowCount,
      avgScore,
      completedCount: completedSteps.length,
    }
  }, [stepConfidenceRatings, stepTitles.length, completedSteps.length])

  // Get color class for a confidence level
  const getConfidenceColor = (confidence: Confidence | undefined, isCompleted: boolean): string => {
    if (!isCompleted) {
      return 'bg-slate-100 dark:bg-slate-800'
    }
    if (!confidence) {
      return 'bg-slate-200 dark:bg-slate-700'
    }
    switch (confidence) {
      case 'high':
        return 'bg-green-400 dark:bg-green-600'
      case 'medium':
        return 'bg-blue-400 dark:bg-blue-500'
      case 'low':
        return 'bg-amber-400 dark:bg-amber-500'
    }
  }

  // Get emoji for confidence
  const getConfidenceEmoji = (confidence: Confidence | undefined): string => {
    if (!confidence) return ''
    switch (confidence) {
      case 'high': return '💪'
      case 'medium': return '🤔'
      case 'low': return '🎲'
    }
  }

  // Don't render if no steps
  if (stepTitles.length === 0) return null

  return (
    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Confidence Heatmap
          </span>
        </div>
        {stats.ratedCount > 0 && (
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {stats.ratedCount}/{stats.total} rated
          </div>
        )}
      </div>

      {/* Heatmap Grid */}
      <div className="flex flex-wrap gap-1 mb-3">
        {stepTitles.map((title, index) => {
          const confidence = stepConfidenceRatings.get(index)
          const isCompleted = completedSteps.includes(index)
          const isCurrent = index === currentStep

          return (
            <button
              key={index}
              onClick={() => onStepClick?.(index)}
              className={`
                w-8 h-8 rounded flex items-center justify-center text-xs font-medium
                transition-all duration-200 hover:scale-110 hover:shadow-md
                ${getConfidenceColor(confidence, isCompleted)}
                ${isCurrent ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-slate-800' : ''}
                ${isCompleted ? 'text-white dark:text-white' : 'text-slate-400 dark:text-slate-500'}
              `}
              title={`Step ${index + 1}: ${title}${confidence ? ` (${confidence} confidence)` : isCompleted ? ' (not rated)' : ' (not completed)'}`}
            >
              {isCompleted && confidence ? (
                <span className="text-[10px]">{getConfidenceEmoji(confidence)}</span>
              ) : isCompleted ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </button>
          )
        })}
      </div>

      {/* Summary Stats */}
      {stats.ratedCount > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-green-400 dark:bg-green-600"></span>
                <span className="text-slate-600 dark:text-slate-400">High: {stats.highCount}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-blue-400 dark:bg-blue-500"></span>
                <span className="text-slate-600 dark:text-slate-400">Med: {stats.mediumCount}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-amber-400 dark:bg-amber-500"></span>
                <span className="text-slate-600 dark:text-slate-400">Low: {stats.lowCount}</span>
              </span>
            </div>
            {stats.avgScore > 0 && (
              <span className={`font-medium ${
                stats.avgScore >= 2.5 ? 'text-green-600 dark:text-green-400' :
                stats.avgScore >= 1.5 ? 'text-blue-600 dark:text-blue-400' :
                'text-amber-600 dark:text-amber-400'
              }`}>
                Avg: {stats.avgScore.toFixed(1)}/3
              </span>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {stats.ratedCount === 0 && stats.completedCount === 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          Complete steps to see your confidence ratings here
        </p>
      )}
    </div>
  )
}

/**
 * Compact inline version for use in headers or sidebars
 */
export function StepHeatmapInline({
  stepConfidenceRatings,
  completedSteps,
  totalSteps,
}: {
  stepConfidenceRatings: Map<number, Confidence>
  completedSteps: number[]
  totalSteps: number
}) {
  const rated = Array.from(stepConfidenceRatings.values())
  const highCount = rated.filter(c => c === 'high').length
  const mediumCount = rated.filter(c => c === 'medium').length
  const lowCount = rated.filter(c => c === 'low').length

  if (rated.length === 0) return null

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-slate-500 dark:text-slate-400">Confidence:</span>
      <div className="flex gap-0.5">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const confidence = stepConfidenceRatings.get(i)
          const isCompleted = completedSteps.includes(i)

          return (
            <div
              key={i}
              className={`w-2 h-4 rounded-sm ${
                !isCompleted ? 'bg-slate-200 dark:bg-slate-700' :
                !confidence ? 'bg-slate-300 dark:bg-slate-600' :
                confidence === 'high' ? 'bg-green-400 dark:bg-green-600' :
                confidence === 'medium' ? 'bg-blue-400 dark:bg-blue-500' :
                'bg-amber-400 dark:bg-amber-500'
              }`}
              title={`Step ${i + 1}${confidence ? `: ${confidence}` : ''}`}
            />
          )
        })}
      </div>
      <span className="text-slate-400">
        ({highCount}💪 {mediumCount}🤔 {lowCount}🎲)
      </span>
    </div>
  )
}
