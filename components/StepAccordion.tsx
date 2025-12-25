'use client'

import { useState } from 'react'
import type { Step, Concept } from '@/types/scaffold'
import type { FeynmanScript } from '@/types/feynman'
import MathRenderer from './MathRenderer'
import FeynmanDialoguePlayer from './audio/FeynmanDialoguePlayer'
import { authenticatedFetch, handleQuotaExceeded } from '@/lib/api/apiClient'

interface StepAccordionProps {
  step: Step
  stepNumber: number
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  concepts: Concept[]
  userAnswer: string
  problemStatement?: string
  currentHintLevel?: number
  onAnswerChange: (answer: string) => void
  onComplete: () => void
  onActivate: () => void
  onHintLevelChange: (level: number) => void
}

export default function StepAccordion({
  step,
  stepNumber,
  isActive,
  isCompleted,
  isLocked,
  concepts,
  userAnswer,
  problemStatement,
  currentHintLevel = 0,
  onAnswerChange,
  onComplete,
  onActivate,
  onHintLevelChange,
}: StepAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [feynmanScript, setFeynmanScript] = useState<FeynmanScript | null>(null)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [generatedHints, setGeneratedHints] = useState<Map<number, { level: number; title: string; content: string }>>(new Map())
  const [isGeneratingHint, setIsGeneratingHint] = useState<number | null>(null)

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

  const handleAudioHint = async () => {
    setIsLoadingAudio(true)
    setAudioError(null)

    try {
      // Generate concept summary from required concepts
      const conceptNames = relatedConcepts.map(c => c.name).join(', ')

      // Get the current hint content for context
      const currentHint = step.hints.find(h => h.level === currentHintLevel)
      const hintContext = currentHint?.content || step.hints[0]?.content || ''

      const response = await fetch('/api/feynman', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concept: conceptNames || step.title,
          context: hintContext,
          stepTitle: step.title,
          problemStatement,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate audio explanation')
      }

      const script: FeynmanScript = await response.json()
      setFeynmanScript(script)
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Failed to load audio hint')
    } finally {
      setIsLoadingAudio(false)
    }
  }

  const handleUnlockNextHint = async () => {
    const nextLevel = currentHintLevel + 1
    if (nextLevel > 5) return

    // If Level 4 or 5, and not already generated, fetch from API
    if ((nextLevel === 4 || nextLevel === 5) && !generatedHints.has(nextLevel)) {
      setIsGeneratingHint(nextLevel)

      try {
        const response = await authenticatedFetch('/api/generate-hint', {
          method: 'POST',
          body: JSON.stringify({
            problemText: problemStatement,
            stepTitle: step.title,
            stepHints: step.hints,
            level: nextLevel,
          }),
        })

        // Check for quota exceeded
        if (await handleQuotaExceeded(response)) {
          setIsGeneratingHint(null)
          return
        }

        if (!response.ok) {
          throw new Error('Failed to generate hint')
        }

        const hint = await response.json()
        setGeneratedHints(prev => {
          const newMap = new Map(prev)
          newMap.set(nextLevel, hint)
          return newMap
        })

        onHintLevelChange(nextLevel)
      } catch (error) {
        console.error('Failed to generate hint:', error)
        // Still unlock the level even if generation fails
        onHintLevelChange(nextLevel)
      } finally {
        setIsGeneratingHint(null)
      }
    } else {
      // Levels 1-3 or already generated, just unlock
      onHintLevelChange(nextLevel)
    }
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

            {/* Progressive Hint Ladder */}
            <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h5 className="text-base font-bold text-gray-900">
                    Progressive Hint Ladder
                  </h5>
                  <p className="text-xs text-gray-600 mt-1">
                    Unlock hints progressively. Try thinking before revealing each level.
                  </p>
                </div>
                {currentHintLevel > 0 && (
                  <button
                    onClick={handleAudioHint}
                    disabled={isLoadingAudio}
                    className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-300 text-xs font-medium flex items-center gap-2"
                    title="Get an intuitive audio explanation"
                  >
                    {isLoadingAudio ? (
                      <>
                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>🎭 Audio</>
                    )}
                  </button>
                )}
              </div>

              {/* Visual Hint Progress Stepper */}
              <div className="mb-5 px-2">
                <div className="relative flex items-center justify-between">
                  {/* Progress Line Background */}
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full" />
                  {/* Progress Line Filled */}
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(0, (currentHintLevel - 1) / 4) * 100}%` }}
                  />

                  {/* Stepper Nodes */}
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isUnlocked = level <= currentHintLevel
                    const isCurrent = level === currentHintLevel
                    const isNext = level === currentHintLevel + 1
                    const labels = ['Concept', 'Visual', 'Strategy', 'Equation', 'Solution']

                    return (
                      <div key={level} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                            isUnlocked
                              ? level === 5
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'bg-green-500 border-green-500 text-white'
                              : isNext
                              ? 'bg-yellow-100 border-yellow-500 text-yellow-700 animate-pulse'
                              : 'bg-white border-gray-300 text-gray-400'
                          } ${isCurrent ? 'ring-2 ring-offset-2 ring-green-400' : ''}`}
                        >
                          {isUnlocked ? '✓' : level}
                        </div>
                        <span className={`mt-1.5 text-[10px] font-medium ${
                          isUnlocked ? 'text-green-700' : isNext ? 'text-yellow-700' : 'text-gray-400'
                        }`}>
                          {labels[level - 1]}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Current Position Indicator */}
                {currentHintLevel > 0 && currentHintLevel < 5 && (
                  <p className="text-center text-xs text-gray-500 mt-3">
                    Level {currentHintLevel} of 5 unlocked
                  </p>
                )}
                {currentHintLevel === 0 && (
                  <p className="text-center text-xs text-gray-500 mt-3">
                    Start by unlocking Level 1
                  </p>
                )}
                {currentHintLevel === 5 && (
                  <p className="text-center text-xs text-red-600 font-medium mt-3">
                    Full solution revealed
                  </p>
                )}
              </div>

              {/* Hint Ladder Steps */}
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((level) => {
                  // Get hint from either original hints or generated hints
                  const originalHint = step.hints.find(h => h.level === level)
                  const generatedHint = generatedHints.get(level)
                  const hint = originalHint || generatedHint

                  const isUnlocked = level <= currentHintLevel
                  const isNextHint = level === currentHintLevel + 1
                  const isFutureHint = level > currentHintLevel + 1
                  const isGenerating = isGeneratingHint === level

                  return (
                    <div
                      key={level}
                      className={`border-2 rounded-lg transition-all ${
                        isUnlocked
                          ? level === 5
                            ? 'border-red-400 bg-red-50'
                            : 'border-green-400 bg-green-50'
                          : isNextHint
                          ? 'border-yellow-400 bg-yellow-50'
                          : 'border-gray-300 bg-gray-100 opacity-60'
                      }`}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isUnlocked
                                  ? level === 5
                                    ? 'bg-red-600 text-white'
                                    : 'bg-green-600 text-white'
                                  : isNextHint
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-gray-400 text-white'
                              }`}
                            >
                              {isUnlocked ? '✓' : level}
                            </div>
                            <h6
                              className={`text-sm font-semibold ${
                                isUnlocked ? 'text-gray-900' : 'text-gray-600'
                              }`}
                            >
                              Level {level}: {hint?.title || (level === 4 ? 'Structural Equation' : level === 5 ? 'Full Solution' : 'Hint')}
                            </h6>
                          </div>

                          {isNextHint && (
                            <button
                              onClick={handleUnlockNextHint}
                              disabled={isGenerating}
                              className="px-3 py-1 bg-yellow-600 text-white rounded text-xs font-medium hover:bg-yellow-700 disabled:bg-yellow-400 flex items-center gap-1"
                            >
                              {isGenerating ? (
                                <>
                                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                  </svg>
                                  {level >= 4 ? 'Generate' : 'Unlock'}
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {isUnlocked && hint ? (
                          <div className="mt-2 text-sm text-gray-800">
                            <MathRenderer text={hint.content} />
                          </div>
                        ) : isFutureHint ? (
                          <p className="text-xs text-gray-500 italic">
                            Locked - unlock previous hints first
                          </p>
                        ) : isNextHint && level >= 4 ? (
                          <p className="text-xs text-gray-700 italic">
                            Click &quot;Generate&quot; to create this hint (~3 seconds)
                          </p>
                        ) : (
                          <p className="text-xs text-gray-700 italic">
                            Click &quot;Unlock&quot; to reveal this hint
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {currentHintLevel === 5 && (
                <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-xs text-red-800 font-medium">
                    ⚠️ You&apos;ve unlocked the full solution. Make sure you understand each step before moving forward.
                  </p>
                </div>
              )}

              {audioError && (
                <p className="text-xs text-red-600 mt-2">{audioError}</p>
              )}
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
                  onChange={(e) => onAnswerChange(e.target.value)}
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

      {/* Feynman Dialogue Player Modal */}
      {feynmanScript && (
        <FeynmanDialoguePlayer
          script={feynmanScript}
          onClose={() => setFeynmanScript(null)}
        />
      )}
    </div>
  )
}
