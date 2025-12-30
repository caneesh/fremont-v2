'use client'

import { useState, useCallback } from 'react'
import MathRenderer from '../MathRenderer'

interface VerbalPlanRendererProps {
  question: string
  prompt: string
  minWords?: number
  requiredKeywords?: string[]
  scaffoldingQuestions?: string[]
  onSubmit: (response: string, isValid: boolean) => void
  disabled?: boolean
  showResult?: boolean
}

export default function VerbalPlanRenderer({
  question,
  prompt,
  minWords = 20,
  requiredKeywords = [],
  scaffoldingQuestions = [],
  onSubmit,
  disabled = false,
  showResult = false
}: VerbalPlanRendererProps) {
  const [response, setResponse] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(showResult)
  const [isValid, setIsValid] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  // Count words in response
  const wordCount = response.trim().split(/\s+/).filter(word => word.length > 0).length

  // Check if response meets minimum word count
  const meetsMinWords = wordCount >= minWords

  // Check for required keywords (case-insensitive)
  const checkKeywords = useCallback((text: string): string[] => {
    if (requiredKeywords.length === 0) return []
    const lowercaseText = text.toLowerCase()
    return requiredKeywords.filter(keyword =>
      !lowercaseText.includes(keyword.toLowerCase())
    )
  }, [requiredKeywords])

  const handleSubmit = () => {
    if (disabled) return

    const errors: string[] = []

    // Validate word count
    if (!meetsMinWords) {
      errors.push(`Please write at least ${minWords} words (currently ${wordCount})`)
    }

    // Validate keywords if any are required
    const missingKeywords = checkKeywords(response)
    if (missingKeywords.length > 0) {
      errors.push(`Consider mentioning: ${missingKeywords.join(', ')}`)
    }

    setValidationErrors(errors)

    // For verbal plans, we're lenient - only word count is strictly required
    // Missing keywords are suggestions, not blockers
    const valid = meetsMinWords
    setIsValid(valid)
    setHasSubmitted(true)

    onSubmit(response, valid)
  }

  const getTextareaStyle = () => {
    if (hasSubmitted && isValid) {
      return 'border-green-500 bg-green-50/50 dark:bg-green-900/10'
    }
    if (hasSubmitted && !isValid) {
      return 'border-red-500 bg-red-50/50 dark:bg-red-900/10'
    }
    return 'border-slate-300 dark:border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
  }

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="text-slate-800 dark:text-slate-200 font-medium">
        <MathRenderer text={question} />
      </div>

      {/* Prompt */}
      <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-800/50 flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
              Describe your approach in words
            </p>
            <div className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
              <MathRenderer text={prompt} />
            </div>
          </div>
        </div>
      </div>

      {/* Scaffolding Questions (if any) */}
      {scaffoldingQuestions.length > 0 && (
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
            Consider addressing:
          </p>
          <ul className="space-y-1">
            {scaffoldingQuestions.map((q, idx) => (
              <li key={idx} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                <MathRenderer text={q} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Text Area for Response */}
      <div className="relative">
        <textarea
          value={response}
          onChange={(e) => {
            setResponse(e.target.value)
            // Reset validation when user types after failed attempt
            if (hasSubmitted && !isValid) {
              setHasSubmitted(false)
              setValidationErrors([])
            }
          }}
          disabled={disabled || (hasSubmitted && isValid)}
          placeholder="Before writing any equations, explain your plan here. What physics principles will you use? What quantities are given vs unknown? What's your strategy?"
          className={`w-full h-40 p-4 rounded-lg border-2 resize-none text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors ${getTextareaStyle()}`}
        />

        {/* Word Count Indicator */}
        <div className={`absolute bottom-3 right-3 text-xs font-medium ${
          meetsMinWords
            ? 'text-green-600 dark:text-green-400'
            : 'text-slate-400 dark:text-slate-500'
        }`}>
          {wordCount}/{minWords} words
          {meetsMinWords && (
            <svg className="inline-block w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {hasSubmitted && validationErrors.length > 0 && !isValid && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <ul className="space-y-1">
            {validationErrors.map((error, idx) => (
              <li key={idx} className="text-sm text-amber-700 dark:text-amber-300 flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Submit Button */}
      {!hasSubmitted && (
        <button
          onClick={handleSubmit}
          disabled={response.trim().length === 0 || disabled}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Submit My Plan
        </button>
      )}

      {/* Success Message */}
      {hasSubmitted && isValid && (
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Great verbal plan!
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                Now you can proceed to set up the equations. Having a clear plan will make the algebra much easier.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
