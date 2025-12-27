'use client'

import { useState } from 'react'
import MathRenderer from '../MathRenderer'

interface FillBlankRendererProps {
  question: string
  sentence: string  // Contains ____ placeholder
  correctTerm: string
  distractors: string[]
  onSubmit: (selectedTerm: string, isCorrect: boolean) => void
  disabled?: boolean
  showResult?: boolean
  selectedAnswer?: string
}

export default function FillBlankRenderer({
  question,
  sentence,
  correctTerm,
  distractors,
  onSubmit,
  disabled = false,
  showResult = false,
  selectedAnswer
}: FillBlankRendererProps) {
  const [selected, setSelected] = useState<string | null>(selectedAnswer ?? null)
  const [hasSubmitted, setHasSubmitted] = useState(showResult)
  const [isCorrect, setIsCorrect] = useState(false)

  // Combine correct term with distractors and shuffle
  const allOptions = [correctTerm, ...distractors].sort(() => Math.random() - 0.5)

  const handleSelect = (term: string) => {
    // Allow selection if not disabled and either not submitted, or submitted but wrong
    if (disabled || (hasSubmitted && isCorrect)) return
    setSelected(term)
    // If user is selecting after a wrong answer, reset submission state
    if (hasSubmitted && !isCorrect) {
      setHasSubmitted(false)
    }
  }

  const handleSubmit = () => {
    if (selected === null || disabled) return
    const correct = selected === correctTerm
    setIsCorrect(correct)
    setHasSubmitted(true)
    onSubmit(selected, correct)
  }

  // Split sentence by ____ placeholder to render with blank
  const parts = sentence.split('____')

  const getOptionStyle = (term: string) => {
    const baseStyle = 'px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200'

    if (hasSubmitted) {
      if (term === correctTerm) {
        return `${baseStyle} border-green-500 bg-green-500/20 text-green-700 dark:text-green-300`
      }
      if (term === selected && term !== correctTerm) {
        return `${baseStyle} border-red-500 bg-red-500/20 text-red-700 dark:text-red-300 animate-shake`
      }
      return `${baseStyle} border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500`
    }

    if (selected === term) {
      return `${baseStyle} border-indigo-500 bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/50`
    }

    return `${baseStyle} border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer`
  }

  const getBlankStyle = () => {
    if (hasSubmitted && selected) {
      if (selected === correctTerm) {
        return 'inline-block px-3 py-1 mx-1 rounded bg-green-500/20 border-b-2 border-green-500 text-green-700 dark:text-green-300 font-medium'
      }
      return 'inline-block px-3 py-1 mx-1 rounded bg-red-500/20 border-b-2 border-red-500 text-red-700 dark:text-red-300 font-medium line-through'
    }
    if (selected) {
      return 'inline-block px-3 py-1 mx-1 rounded bg-indigo-500/20 border-b-2 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-medium'
    }
    return 'inline-block px-6 py-1 mx-1 rounded bg-slate-200 dark:bg-slate-700 border-b-2 border-dashed border-slate-400 dark:border-slate-500'
  }

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="text-slate-800 dark:text-slate-200 font-medium">
        <MathRenderer text={question} />
      </div>

      {/* Sentence with blank */}
      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
        {parts.map((part, index) => (
          <span key={index}>
            <MathRenderer text={part} />
            {index < parts.length - 1 && (
              <span className={getBlankStyle()}>
                {selected || '\u00A0\u00A0\u00A0\u00A0'}
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Options to choose from */}
      <div className="flex flex-wrap gap-2">
        {allOptions.map((term) => (
          <button
            key={term}
            onClick={() => handleSelect(term)}
            disabled={disabled || (hasSubmitted && isCorrect)}
            className={getOptionStyle(term)}
          >
            <MathRenderer text={term} />
          </button>
        ))}
      </div>

      {/* Submit Button */}
      {!hasSubmitted && (
        <button
          onClick={handleSubmit}
          disabled={selected === null || disabled}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
        >
          Check Answer
        </button>
      )}

      {/* Show correct answer if wrong */}
      {hasSubmitted && selected !== correctTerm && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            The correct answer is: <strong>{correctTerm}</strong>
          </p>
        </div>
      )}

      {/* Result Feedback */}
      {hasSubmitted && (
        <div className={`p-3 rounded-lg ${
          selected === correctTerm
            ? 'bg-green-500/10 border border-green-500/30'
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          <p className={`text-sm font-medium ${
            selected === correctTerm ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {selected === correctTerm ? 'Correct!' : 'Not quite. Review the concept before continuing.'}
          </p>
        </div>
      )}
    </div>
  )
}
