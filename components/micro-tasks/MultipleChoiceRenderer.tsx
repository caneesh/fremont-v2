'use client'

import { useState } from 'react'
import MathRenderer from '../MathRenderer'

interface MultipleChoiceRendererProps {
  question: string
  options: string[]
  correctIndex: number
  onSubmit: (selectedIndex: number, isCorrect: boolean) => void
  disabled?: boolean
  showResult?: boolean
  selectedAnswer?: number
}

export default function MultipleChoiceRenderer({
  question,
  options,
  correctIndex,
  onSubmit,
  disabled = false,
  showResult = false,
  selectedAnswer
}: MultipleChoiceRendererProps) {
  const [selected, setSelected] = useState<number | null>(selectedAnswer ?? null)
  const [hasSubmitted, setHasSubmitted] = useState(showResult)
  const [isCorrect, setIsCorrect] = useState(false)
  const [lastWrongAnswer, setLastWrongAnswer] = useState<number | null>(null)

  const handleSelect = (index: number) => {
    // Allow selection if not disabled and either not submitted, or submitted but wrong
    if (disabled || (hasSubmitted && isCorrect)) return
    setSelected(index)
    // If user is selecting after a wrong answer, reset submission state
    if (hasSubmitted && !isCorrect) {
      setHasSubmitted(false)
    }
  }

  const handleSubmit = () => {
    if (selected === null || disabled) return
    const correct = selected === correctIndex
    setIsCorrect(correct)
    setHasSubmitted(true)
    if (!correct) {
      setLastWrongAnswer(selected)
    }
    onSubmit(selected, correct)
  }

  const getOptionStyle = (index: number) => {
    const baseStyle = 'w-full p-4 rounded-lg border-2 text-left transition-all duration-200 flex items-start gap-3'

    if (hasSubmitted && isCorrect) {
      // Only show green for correct answer when user got it right
      if (index === correctIndex) {
        return `${baseStyle} border-green-500 bg-green-500/10 dark:bg-green-500/20`
      }
      return `${baseStyle} border-slate-300 dark:border-slate-600 opacity-50`
    }

    if (hasSubmitted && !isCorrect) {
      // Wrong answer: only highlight the wrong selection in red, don't reveal correct
      if (index === selected) {
        return `${baseStyle} border-red-500 bg-red-500/10 dark:bg-red-500/20 animate-shake`
      }
      return `${baseStyle} border-slate-300 dark:border-slate-600`
    }

    if (selected === index) {
      return `${baseStyle} border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20 ring-2 ring-indigo-500/50`
    }

    return `${baseStyle} border-slate-300 dark:border-slate-600 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer`
  }

  const getRadioStyle = (index: number) => {
    const baseStyle = 'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5'

    if (hasSubmitted && isCorrect) {
      // Only show green for correct answer when user got it right
      if (index === correctIndex) {
        return `${baseStyle} border-green-500 bg-green-500`
      }
      return `${baseStyle} border-slate-300 dark:border-slate-600`
    }

    if (hasSubmitted && !isCorrect) {
      // Wrong answer: only highlight the wrong selection in red
      if (index === selected) {
        return `${baseStyle} border-red-500 bg-red-500`
      }
      return `${baseStyle} border-slate-300 dark:border-slate-600`
    }

    if (selected === index) {
      return `${baseStyle} border-indigo-500 bg-indigo-500`
    }

    return `${baseStyle} border-slate-400 dark:border-slate-500`
  }

  return (
    <div className="space-y-4">
      {/* Question */}
      <div className="text-slate-800 dark:text-slate-200 font-medium">
        <MathRenderer text={question} />
      </div>

      {/* Options */}
      <div className="space-y-3">
        {options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelect(index)}
            disabled={disabled || (hasSubmitted && isCorrect)}
            className={getOptionStyle(index)}
          >
            <div className={getRadioStyle(index)}>
              {(selected === index || (hasSubmitted && isCorrect && index === correctIndex)) && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <span className="text-slate-700 dark:text-slate-300 text-sm">
              <MathRenderer text={option} />
            </span>
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

      {/* Result Feedback */}
      {hasSubmitted && selected !== null && (
        <div className={`p-3 rounded-lg ${
          selected === correctIndex
            ? 'bg-green-500/10 border border-green-500/30'
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          <p className={`text-sm font-medium ${
            selected === correctIndex ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {selected === correctIndex ? 'Correct!' : 'Not quite. Try to understand why before continuing.'}
          </p>
        </div>
      )}
    </div>
  )
}
