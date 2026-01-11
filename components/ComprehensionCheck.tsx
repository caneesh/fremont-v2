'use client'

import { useState, useRef, useEffect } from 'react'
import type { ComprehensionCheck as ComprehensionCheckType, GentleIntervention } from '@/types/integritySignal'
import { validateComprehensionResponse } from '@/lib/integrityMonitor'

interface ComprehensionCheckProps {
  /** The check to display */
  check: ComprehensionCheckType
  /** Intervention config for framing */
  intervention: GentleIntervention
  /** Called when check is complete */
  onComplete: (passed: boolean) => void
  /** Optional: step context for personalization */
  stepTitle?: string
}

/**
 * Gentle Comprehension Check Component
 *
 * Displays a friendly, non-accusatory comprehension question.
 * Framed as a learning opportunity, not a trust test.
 *
 * UI Principles:
 * - Warm, encouraging tone
 * - No "prove yourself" language
 * - Celebrate understanding
 * - Support on struggle (no shame)
 */
export default function ComprehensionCheck({
  check,
  intervention,
  onComplete,
  stepTitle,
}: ComprehensionCheckProps) {
  const [response, setResponse] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{ passed: boolean; feedback: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const handleSubmit = () => {
    if (response.trim().length === 0) return

    const validation = validateComprehensionResponse(response, check)
    setResult(validation)
    setSubmitted(true)

    // Auto-complete after showing feedback
    setTimeout(() => {
      onComplete(validation.passed)
    }, 2000)
  }

  const wordCount = response.trim().split(/\s+/).filter(Boolean).length

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-5 border border-amber-200 dark:border-amber-700/50">
      {/* Header - Warm and encouraging */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center">
          <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-amber-900 dark:text-amber-100">
            {intervention.title || "Let's solidify this!"}
          </h3>
          {stepTitle && (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Re: {stepTitle}
            </p>
          )}
        </div>
      </div>

      {/* Encouraging message */}
      <p className="text-amber-800 dark:text-amber-200 mb-4">
        {intervention.message || "Quick check to make sure this concept sticks:"}
      </p>

      {/* Question */}
      <div className="bg-white dark:bg-dark-card rounded-lg p-4 mb-4 border border-amber-200 dark:border-amber-700/30">
        <p className="text-gray-900 dark:text-dark-text-primary font-medium">
          {check.question}
        </p>
      </div>

      {!submitted ? (
        <>
          {/* Response textarea */}
          <textarea
            ref={textareaRef}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Share your thinking in a few words..."
            className="w-full p-3 rounded-lg border border-amber-200 dark:border-amber-700/50
                       bg-white dark:bg-dark-input
                       text-gray-900 dark:text-dark-text-primary
                       placeholder:text-gray-400 dark:placeholder:text-gray-500
                       focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent
                       resize-none transition-all"
            rows={3}
          />

          {/* Word count helper */}
          <div className="flex items-center justify-between mt-2">
            <span className={`text-sm ${
              wordCount >= check.minWords
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {wordCount} word{wordCount !== 1 ? 's' : ''}
              {wordCount < check.minWords && (
                <span className="text-gray-400 dark:text-gray-500">
                  {' '}(aim for {check.minWords}+)
                </span>
              )}
            </span>

            <button
              onClick={handleSubmit}
              disabled={response.trim().length === 0}
              className="px-4 py-2 rounded-lg font-medium transition-all
                         bg-amber-500 hover:bg-amber-600 text-white
                         disabled:bg-gray-300 dark:disabled:bg-gray-700
                         disabled:text-gray-500 dark:disabled:text-gray-400
                         disabled:cursor-not-allowed"
            >
              Share
            </button>
          </div>
        </>
      ) : (
        /* Result feedback */
        <div className={`rounded-lg p-4 ${
          result?.passed
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50'
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50'
        }`}>
          <div className="flex items-start gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              result?.passed
                ? 'bg-green-100 dark:bg-green-800/40'
                : 'bg-blue-100 dark:bg-blue-800/40'
            }`}>
              {result?.passed ? (
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <p className={`font-medium ${
                result?.passed
                  ? 'text-green-800 dark:text-green-200'
                  : 'text-blue-800 dark:text-blue-200'
              }`}>
                {result?.passed ? 'Great thinking!' : 'Good effort!'}
              </p>
              <p className={`text-sm mt-1 ${
                result?.passed
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-blue-700 dark:text-blue-300'
              }`}>
                {result?.feedback}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subtle note - learning framing */}
      <p className="text-xs text-amber-600/70 dark:text-amber-400/60 mt-3 text-center">
        Teaching is the best way to learn
      </p>
    </div>
  )
}

/**
 * Inline comprehension badge for step headers
 * Shows when a check was passed
 */
export function ComprehensionBadge({ passed }: { passed: boolean }) {
  if (!passed) return null

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                     bg-green-100 dark:bg-green-900/30
                     text-green-700 dark:text-green-300 text-xs font-medium">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      Verified
    </span>
  )
}
