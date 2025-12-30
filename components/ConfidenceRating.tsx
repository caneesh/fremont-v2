'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Confidence } from '@/types/confidence'
import { CONFIDENCE_OPTIONS, getOutcomeDisplay } from '@/types/confidence'
import { getConfidenceOutcome } from '@/lib/confidenceWeightedSRS'

interface ConfidenceRatingProps {
  isCorrect: boolean
  onRate: (confidence: Confidence) => void
  onSkip?: () => void
  autoSkipDelay?: number // ms before auto-skipping (0 = no auto-skip)
  showOutcome?: boolean  // Whether to show the outcome after rating
}

export default function ConfidenceRating({
  isCorrect,
  onRate,
  onSkip,
  autoSkipDelay = 5000,
  showOutcome = false
}: ConfidenceRatingProps) {
  const [selectedConfidence, setSelectedConfidence] = useState<Confidence | null>(null)
  const [showingOutcome, setShowingOutcome] = useState(false)

  // Define handleSelect first so it can be used in useEffect
  const handleSelect = useCallback((confidence: Confidence) => {
    setSelectedConfidence(confidence)

    if (showOutcome) {
      setShowingOutcome(true)
      // Show outcome briefly, then call onRate
      setTimeout(() => {
        onRate(confidence)
      }, 1500)
    } else {
      onRate(confidence)
    }
  }, [showOutcome, onRate])

  // Auto-skip timer
  useEffect(() => {
    if (autoSkipDelay <= 0 || selectedConfidence) return

    const timer = setTimeout(() => {
      // Default to medium on timeout
      if (onSkip) {
        onSkip()
      } else {
        onRate('medium')
      }
    }, autoSkipDelay)

    return () => clearTimeout(timer)
  }, [autoSkipDelay, selectedConfidence, onSkip, onRate])

  // Keyboard shortcuts
  useEffect(() => {
    if (selectedConfidence) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') handleSelect('low')
      else if (e.key === '2') handleSelect('medium')
      else if (e.key === '3') handleSelect('high')
      else if (e.key === 'Escape' && onSkip) onSkip()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedConfidence, onSkip, handleSelect])

  // Show outcome screen
  if (showingOutcome && selectedConfidence) {
    const outcome = getConfidenceOutcome(isCorrect, selectedConfidence)
    const display = getOutcomeDisplay(outcome)

    return (
      <div className={`p-4 rounded-lg ${display.bgClass} animate-in fade-in duration-200`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{display.icon}</span>
          <div>
            <p className={`font-medium ${display.color}`}>{display.label}</p>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              {display.description}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-dark-text-secondary text-center">
        How confident were you?
      </p>

      <div className="flex justify-center gap-2">
        {CONFIDENCE_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={`
              flex flex-col items-center px-4 py-3 rounded-lg
              border-2 transition-all duration-150
              hover:scale-105 active:scale-95
              ${getButtonStyles(option.value)}
            `}
            title={option.description}
          >
            <span className="text-2xl mb-1">{option.emoji}</span>
            <span className="text-xs font-medium">{option.shortLabel}</span>
            <span className="text-[10px] text-gray-400 dark:text-dark-text-muted mt-0.5">
              {option.keyboardShortcut}
            </span>
          </button>
        ))}
      </div>

      {onSkip && (
        <button
          onClick={onSkip}
          className="block mx-auto text-xs text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
        >
          Skip (Esc)
        </button>
      )}

      {autoSkipDelay > 0 && (
        <p className="text-[10px] text-center text-gray-400 dark:text-dark-text-muted">
          Auto-skipping in {Math.round(autoSkipDelay / 1000)}s...
        </p>
      )}
    </div>
  )
}

function getButtonStyles(confidence: Confidence): string {
  switch (confidence) {
    case 'low':
      return `
        border-amber-200 dark:border-amber-800
        bg-amber-50 dark:bg-amber-900/20
        text-amber-700 dark:text-amber-300
        hover:border-amber-300 dark:hover:border-amber-700
        hover:bg-amber-100 dark:hover:bg-amber-900/30
      `
    case 'medium':
      return `
        border-blue-200 dark:border-blue-800
        bg-blue-50 dark:bg-blue-900/20
        text-blue-700 dark:text-blue-300
        hover:border-blue-300 dark:hover:border-blue-700
        hover:bg-blue-100 dark:hover:bg-blue-900/30
      `
    case 'high':
      return `
        border-green-200 dark:border-green-800
        bg-green-50 dark:bg-green-900/20
        text-green-700 dark:text-green-300
        hover:border-green-300 dark:hover:border-green-700
        hover:bg-green-100 dark:hover:bg-green-900/30
      `
  }
}

/**
 * Compact inline version for use in smaller spaces
 */
export function ConfidenceRatingInline({
  onRate,
  onSkip
}: {
  onRate: (confidence: Confidence) => void
  onSkip?: () => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-dark-text-muted">Confidence:</span>
      {CONFIDENCE_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onRate(option.value)}
          className={`
            px-2 py-1 rounded text-xs font-medium
            transition-all hover:scale-105
            ${getInlineButtonStyles(option.value)}
          `}
          title={`${option.label} (${option.keyboardShortcut})`}
        >
          {option.emoji}
        </button>
      ))}
      {onSkip && (
        <button
          onClick={onSkip}
          className="text-xs text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary"
        >
          ×
        </button>
      )}
    </div>
  )
}

function getInlineButtonStyles(confidence: Confidence): string {
  switch (confidence) {
    case 'low':
      return 'bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50'
    case 'medium':
      return 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50'
    case 'high':
      return 'bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50'
  }
}
