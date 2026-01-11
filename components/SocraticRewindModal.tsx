'use client'

import { useState, useEffect, useCallback } from 'react'
import type {
  SocraticRewindContext,
  SocraticRewindResponse,
  SocraticRewindState,
  RewindTriggerSource,
} from '@/types/socraticRewind'
import {
  generateQuickRewindResponse,
  logRewindEvent,
} from '@/lib/socraticRewindService'
import { useUserProfile } from '@/lib/profile'
import MathRenderer from './MathRenderer'

interface SocraticRewindModalProps {
  isOpen: boolean
  context: SocraticRewindContext
  triggerSource: RewindTriggerSource
  problemId: string
  onClose: () => void
  onReturnToStep: (stepId: number) => void
  onProceed: () => void
}

/**
 * SocraticRewindModal
 *
 * A modal that implements the "Socratic Rewind" pedagogical pattern:
 * After a wrong step, guides the student back to their last correct assumption
 * and asks them to identify the contradiction using the Socratic method.
 *
 * The modal progresses through phases:
 * 1. The Stop - "Pause for calibration"
 * 2. The Rewind - Shows previous valid step
 * 3. The Comparison - Asks student to compare
 * 4. The Bridge Question - Highlights the contradiction
 */
export default function SocraticRewindModal({
  isOpen,
  context,
  triggerSource,
  problemId,
  onClose,
  onReturnToStep,
  onProceed,
}: SocraticRewindModalProps) {
  const { track } = useUserProfile()
  const [state, setState] = useState<SocraticRewindState>('idle')
  const [response, setResponse] = useState<SocraticRewindResponse | null>(null)
  const [showNudge, setShowNudge] = useState(false)
  const [startTime] = useState<number>(Date.now())
  const [isLoadingAI, setIsLoadingAI] = useState(false)

  const fetchAIResponse = useCallback(async () => {
    setIsLoadingAI(true)
    try {
      const res = await fetch('/api/socratic-rewind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context, track }), // Pass user's current track
      })

      if (res.ok) {
        const aiResponse: SocraticRewindResponse = await res.json()
        setResponse(aiResponse)
      }
    } catch (error) {
      console.error('Failed to fetch AI rewind response:', error)
      // Keep the quick response as fallback
    } finally {
      setIsLoadingAI(false)
    }
  }, [context])

  // Generate response when modal opens
  useEffect(() => {
    if (isOpen && state === 'idle') {
      // Generate quick response immediately
      const quickResponse = generateQuickRewindResponse(context)
      setResponse(quickResponse)
      setState('triggered')

      // Optionally fetch AI-enhanced response in background
      fetchAIResponse()
    }
  }, [isOpen, context, state, fetchAIResponse])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setState('idle')
      setResponse(null)
      setShowNudge(false)
    }
  }, [isOpen])

  const handleAcknowledge = useCallback(() => {
    setState('showing_rewind')
  }, [])

  const handleContinueToComparison = useCallback(() => {
    setState('showing_comparison')
  }, [])

  const handleContinueToBridge = useCallback(() => {
    setState('showing_bridge')
  }, [])

  const handleShowNudge = useCallback(() => {
    setShowNudge(true)
  }, [])

  const handleReturnToStep = useCallback(() => {
    const timeToAcknowledge = Date.now() - startTime

    // Log the event
    logRewindEvent({
      problemId,
      triggerSource,
      context,
      response: response || undefined,
      studentInteraction: {
        timeToAcknowledge,
        proceedClicked: false,
        returnedToStep: response?.highlightStepId,
      },
      outcome: 'resolved',
    })

    setState('resolved')
    if (response?.highlightStepId !== undefined) {
      onReturnToStep(response.highlightStepId)
    }
    onClose()
  }, [startTime, problemId, triggerSource, context, response, onReturnToStep, onClose])

  const handleProceedAnyway = useCallback(() => {
    const timeToAcknowledge = Date.now() - startTime

    // Log the event
    logRewindEvent({
      problemId,
      triggerSource,
      context,
      response: response || undefined,
      studentInteraction: {
        timeToAcknowledge,
        proceedClicked: true,
      },
      outcome: 'dismissed',
    })

    setState('resolved')
    onProceed()
    onClose()
  }, [startTime, problemId, triggerSource, context, response, onProceed, onClose])

  if (!isOpen || !response) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-dark-border">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 px-6 py-4 border-b border-amber-200 dark:border-amber-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-amber-600 dark:text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Socratic Rewind
              </h2>
              <p className="text-sm text-gray-600 dark:text-dark-text-muted">
                Let&apos;s retrace your steps
              </p>
            </div>
            {isLoadingAI && (
              <div className="ml-auto">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-600 dark:border-amber-400" />
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Phase 1: The Stop */}
          {state === 'triggered' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg p-4">
                <p className="text-gray-800 dark:text-dark-text-primary leading-relaxed">
                  <MathRenderer text={response.stopMessage} />
                </p>
              </div>

              <button
                onClick={handleAcknowledge}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>I understand, let&apos;s review</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Phase 2: The Rewind */}
          {state === 'showing_rewind' && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-dark-text-secondary uppercase tracking-wide flex items-center gap-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4z" />
                  </svg>
                  Rewinding to {response.rewindReference.stepLabel}
                </h3>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
                    In {response.rewindReference.stepLabel}:
                  </p>
                  <p className="text-gray-800 dark:text-dark-text-primary leading-relaxed">
                    <MathRenderer text={response.rewindReference.quotedContent} />
                  </p>
                </div>
              </div>

              <button
                onClick={handleContinueToComparison}
                className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>I see this - continue</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Phase 3: The Comparison */}
          {state === 'showing_comparison' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium mb-2">
                  {response.rewindReference.stepLabel}:
                </p>
                <p className="text-gray-700 dark:text-dark-text-secondary text-sm">
                  <MathRenderer text={response.rewindReference.quotedContent} />
                </p>
              </div>

              <div className="flex items-center justify-center">
                <div className="px-4 py-2 bg-gray-100 dark:bg-dark-card-soft rounded-full text-gray-600 dark:text-dark-text-muted text-sm font-medium">
                  vs
                </div>
              </div>

              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-lg p-4">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
                  Current input:
                </p>
                <p className="text-gray-700 dark:text-dark-text-secondary text-sm">
                  <MathRenderer text={context.currentError.studentInput || context.currentError.description} />
                </p>
              </div>

              <p className="text-gray-800 dark:text-dark-text-primary leading-relaxed text-center">
                <MathRenderer text={response.comparisonPrompt} />
              </p>

              <button
                onClick={handleContinueToBridge}
                className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>I&apos;ve compared them</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Phase 4: The Bridge Question */}
          {state === 'showing_bridge' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-700/50 rounded-lg p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center flex-shrink-0 mt-1">
                    <svg
                      className="w-5 h-5 text-indigo-600 dark:text-indigo-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg text-gray-900 dark:text-dark-text-primary leading-relaxed font-medium">
                      <MathRenderer text={response.bridgeQuestion} />
                    </p>
                  </div>
                </div>
              </div>

              {/* Gentle Nudge (optional hint) */}
              {response.gentleNudge && !showNudge && (
                <button
                  onClick={handleShowNudge}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 mx-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Need a gentle nudge?
                </button>
              )}

              {showNudge && response.gentleNudge && (
                <div className="bg-gray-50 dark:bg-dark-card-soft border border-gray-200 dark:border-dark-border rounded-lg p-3 animate-fade-in">
                  <p className="text-sm text-gray-600 dark:text-dark-text-muted">
                    <MathRenderer text={response.gentleNudge} />
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleReturnToStep}
                  className="py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  <span>Return to step</span>
                </button>

                <button
                  onClick={handleProceedAnyway}
                  className="py-3 bg-gray-200 dark:bg-dark-card-soft hover:bg-gray-300 dark:hover:bg-dark-border text-gray-700 dark:text-dark-text-secondary font-medium rounded-lg transition-colors"
                >
                  <span>Proceed anyway</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with related concepts */}
        {response.relatedConcepts && response.relatedConcepts.length > 0 && state === 'showing_bridge' && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-dark-card-soft border-t border-gray-200 dark:border-dark-border">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500 dark:text-dark-text-muted">Related concepts:</span>
              {response.relatedConcepts.map((concept) => (
                <span
                  key={concept}
                  className="px-2 py-1 text-xs rounded-full bg-gray-200 dark:bg-dark-border text-gray-600 dark:text-dark-text-secondary capitalize"
                >
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
