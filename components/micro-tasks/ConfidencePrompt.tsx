'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Confidence } from '@/types/confidence'
import { CONFIDENCE_OPTIONS, getOutcomeDisplay } from '@/types/confidence'
import { getConfidenceOutcome, getMatrixResult } from '@/lib/confidenceWeightedSRS'

interface ConfidencePromptProps {
  isCorrect: boolean
  onRate: (confidence: Confidence) => void
  onSkip?: () => void
  autoSkipDelayMs?: number
  showFeedback?: boolean
}

type PromptState = 'asking' | 'feedback' | 'done'

/**
 * ConfidencePrompt - Inline prompt shown after answering a micro-task
 *
 * Designed to be unobtrusive:
 * - Appears inline after the answer result
 * - Auto-skips after delay (defaults to medium confidence)
 * - Quick keyboard shortcuts (1/2/3)
 * - Optional brief feedback before dismissing
 */
export default function ConfidencePrompt({
  isCorrect,
  onRate,
  onSkip,
  autoSkipDelayMs = 4000,
  showFeedback = true
}: ConfidencePromptProps) {
  const [state, setState] = useState<PromptState>('asking')
  const [selectedConfidence, setSelectedConfidence] = useState<Confidence | null>(null)
  const [timeRemaining, setTimeRemaining] = useState(autoSkipDelayMs)

  // Define handleSelect first so it can be used in useEffects
  const handleSelect = useCallback((confidence: Confidence) => {
    setSelectedConfidence(confidence)

    if (showFeedback) {
      setState('feedback')
      // Show feedback briefly
      setTimeout(() => {
        setState('done')
        onRate(confidence)
      }, 1200)
    } else {
      setState('done')
      onRate(confidence)
    }
  }, [showFeedback, onRate])

  // Countdown timer for auto-skip
  useEffect(() => {
    if (state !== 'asking' || autoSkipDelayMs <= 0) return

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 100) {
          // Time's up - default to medium
          handleSelect('medium')
          return 0
        }
        return prev - 100
      })
    }, 100)

    return () => clearInterval(interval)
  }, [state, autoSkipDelayMs, handleSelect])

  // Keyboard shortcuts
  useEffect(() => {
    if (state !== 'asking') return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      if (e.key === '1') handleSelect('low')
      else if (e.key === '2') handleSelect('medium')
      else if (e.key === '3') handleSelect('high')
      else if (e.key === 'Escape' && onSkip) {
        e.preventDefault()
        onSkip()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state, onSkip, handleSelect])

  const handleSkip = useCallback(() => {
    if (onSkip) {
      onSkip()
    } else {
      // Default to medium on skip
      handleSelect('medium')
    }
  }, [onSkip, handleSelect])

  // Feedback state
  if (state === 'feedback' && selectedConfidence) {
    const outcome = getConfidenceOutcome(isCorrect, selectedConfidence)
    const display = getOutcomeDisplay(outcome)
    const matrixResult = getMatrixResult(isCorrect, selectedConfidence)

    return (
      <div
        className={`
          mt-3 p-3 rounded-lg border
          animate-in slide-in-from-bottom-2 duration-200
          ${getBorderColor(matrixResult.uiColor)}
          ${getBgColor(matrixResult.uiColor)}
        `}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{display.icon}</span>
          <div className="flex-1">
            <p className={`text-sm font-medium ${getTextColor(matrixResult.uiColor)}`}>
              {matrixResult.uiMessage}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Done state - render nothing
  if (state === 'done') {
    return null
  }

  // Progress percentage for visual indicator
  const progress = autoSkipDelayMs > 0
    ? ((autoSkipDelayMs - timeRemaining) / autoSkipDelayMs) * 100
    : 0

  return (
    <div className="mt-3 animate-in slide-in-from-bottom-2 duration-200">
      {/* Question */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
          How confident were you?
        </p>
        <button
          onClick={handleSkip}
          className="text-xs text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-secondary"
        >
          Skip
        </button>
      </div>

      {/* Options */}
      <div className="flex gap-2">
        {CONFIDENCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={`
              flex-1 flex items-center justify-center gap-2
              px-3 py-2.5 rounded-lg
              border transition-all duration-150
              hover:scale-[1.02] active:scale-[0.98]
              ${getOptionStyles(option.value)}
            `}
          >
            <span className="text-lg">{option.emoji}</span>
            <span className="text-sm font-medium">{option.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Auto-skip progress bar */}
      {autoSkipDelayMs > 0 && (
        <div className="mt-2 h-0.5 bg-gray-200 dark:bg-dark-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-400 dark:bg-dark-text-muted transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Keyboard hint */}
      <p className="mt-1.5 text-[10px] text-center text-gray-400 dark:text-dark-text-muted">
        Press 1, 2, or 3
      </p>
    </div>
  )
}

function getOptionStyles(confidence: Confidence): string {
  switch (confidence) {
    case 'low':
      return `
        border-amber-200 dark:border-amber-800/50
        bg-amber-50 dark:bg-amber-900/10
        text-amber-700 dark:text-amber-400
        hover:bg-amber-100 dark:hover:bg-amber-900/20
        hover:border-amber-300 dark:hover:border-amber-700
      `
    case 'medium':
      return `
        border-blue-200 dark:border-blue-800/50
        bg-blue-50 dark:bg-blue-900/10
        text-blue-700 dark:text-blue-400
        hover:bg-blue-100 dark:hover:bg-blue-900/20
        hover:border-blue-300 dark:hover:border-blue-700
      `
    case 'high':
      return `
        border-green-200 dark:border-green-800/50
        bg-green-50 dark:bg-green-900/10
        text-green-700 dark:text-green-400
        hover:bg-green-100 dark:hover:bg-green-900/20
        hover:border-green-300 dark:hover:border-green-700
      `
  }
}

function getBorderColor(color: 'green' | 'blue' | 'amber' | 'orange' | 'red'): string {
  const colors = {
    green: 'border-green-200 dark:border-green-800',
    blue: 'border-blue-200 dark:border-blue-800',
    amber: 'border-amber-200 dark:border-amber-800',
    orange: 'border-orange-200 dark:border-orange-800',
    red: 'border-red-200 dark:border-red-800'
  }
  return colors[color]
}

function getBgColor(color: 'green' | 'blue' | 'amber' | 'orange' | 'red'): string {
  const colors = {
    green: 'bg-green-50 dark:bg-green-900/20',
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    amber: 'bg-amber-50 dark:bg-amber-900/20',
    orange: 'bg-orange-50 dark:bg-orange-900/20',
    red: 'bg-red-50 dark:bg-red-900/20'
  }
  return colors[color]
}

function getTextColor(color: 'green' | 'blue' | 'amber' | 'orange' | 'red'): string {
  const colors = {
    green: 'text-green-700 dark:text-green-300',
    blue: 'text-blue-700 dark:text-blue-300',
    amber: 'text-amber-700 dark:text-amber-300',
    orange: 'text-orange-700 dark:text-orange-300',
    red: 'text-red-700 dark:text-red-300'
  }
  return colors[color]
}

/**
 * Pre-answer confidence prompt
 * Asks confidence BEFORE revealing if correct (avoids hindsight bias)
 */
export function PreAnswerConfidencePrompt({
  onRate
}: {
  onRate: (confidence: Confidence) => void
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }
      if (e.key === '1') onRate('low')
      else if (e.key === '2') onRate('medium')
      else if (e.key === '3') onRate('high')
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onRate])

  return (
    <div className="p-4 bg-gray-50 dark:bg-dark-card-soft rounded-lg border border-gray-200 dark:border-dark-border">
      <p className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-3 text-center">
        Before we check: How confident are you?
      </p>

      <div className="flex gap-2">
        {CONFIDENCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onRate(option.value)}
            className={`
              flex-1 flex flex-col items-center
              px-3 py-3 rounded-lg
              border-2 transition-all duration-150
              hover:scale-[1.02] active:scale-[0.98]
              ${getOptionStyles(option.value)}
            `}
          >
            <span className="text-2xl mb-1">{option.emoji}</span>
            <span className="text-sm font-medium">{option.shortLabel}</span>
          </button>
        ))}
      </div>

      <p className="mt-2 text-[10px] text-center text-gray-400 dark:text-dark-text-muted">
        Press 1, 2, or 3
      </p>
    </div>
  )
}
