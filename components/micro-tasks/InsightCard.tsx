'use client'

import { useState } from 'react'
import type { MicroTask, MultipleChoiceTask, FillBlankTask } from '@/types/microTask'
import MultipleChoiceRenderer from './MultipleChoiceRenderer'
import FillBlankRenderer from './FillBlankRenderer'
import MathRenderer from '../MathRenderer'

interface InsightCardProps {
  task: MicroTask
  stepTitle: string
  onCorrectAnswer: (explanation: string) => void
  onWrongAnswer: (attempts: number) => void
  attempts: number
  isGenerating?: boolean
  disabled?: boolean
}

export default function InsightCard({
  task,
  stepTitle,
  onCorrectAnswer,
  onWrongAnswer,
  attempts,
  isGenerating = false,
  disabled = false
}: InsightCardProps) {
  const [isCompleted, setIsCompleted] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  const levelColors = {
    1: 'border-blue-500 bg-blue-500/5',
    2: 'border-purple-500 bg-purple-500/5',
    3: 'border-amber-500 bg-amber-500/5',
    4: 'border-emerald-500 bg-emerald-500/5',
    5: 'border-red-500 bg-red-500/5'
  }

  const levelIcons = {
    Concept: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    Visual: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      </svg>
    ),
    Strategy: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    Equation: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.871 4A17.926 17.926 0 003 12c0 2.874.673 5.59 1.871 8m14.13 0a17.926 17.926 0 001.87-8c0-2.874-.673-5.59-1.87-8M9 9h1.246a1 1 0 01.961.725l1.586 5.55a1 1 0 00.961.725H15m-6 4h6" />
      </svg>
    ),
    Solution: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  const handleTaskSubmit = (isCorrect: boolean) => {
    if (isCorrect) {
      setIsCompleted(true)
      setShowExplanation(true)

      // After showing explanation, animate out and notify parent
      setTimeout(() => {
        setIsAnimatingOut(true)
        setTimeout(() => {
          onCorrectAnswer(task.explanation)
        }, 300)
      }, 2000) // Show explanation for 2 seconds
    } else {
      onWrongAnswer(attempts + 1)
    }
  }

  const handleMultipleChoiceSubmit = (selectedIndex: number, isCorrect: boolean) => {
    handleTaskSubmit(isCorrect)
  }

  const handleFillBlankSubmit = (selectedTerm: string, isCorrect: boolean) => {
    handleTaskSubmit(isCorrect)
  }

  // Render loading state
  if (isGenerating) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border-2 border-dashed border-slate-300 dark:border-slate-600 animate-pulse">
        <div className="flex items-center justify-center gap-3">
          <svg className="w-5 h-5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-500 dark:text-slate-400">Generating task...</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`relative rounded-xl border-2 overflow-hidden transition-all duration-300 ${
        levelColors[task.level]
      } ${isAnimatingOut ? 'opacity-0 scale-95 -translate-y-4' : 'opacity-100 scale-100'}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
          {levelIcons[task.levelTitle]}
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Level {task.level}
          </div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {task.levelTitle}
          </div>
        </div>
        {attempts > 0 && !isCompleted && (
          <div className="ml-auto px-2 py-1 rounded text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            {attempts} attempt{attempts > 1 ? 's' : ''}
          </div>
        )}
        {isCompleted && (
          <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Correct
          </div>
        )}
      </div>

      {/* Task Content */}
      <div className="p-4">
        {task.type === 'MULTIPLE_CHOICE' && (
          <MultipleChoiceRenderer
            question={task.question}
            options={(task as MultipleChoiceTask).options}
            correctIndex={(task as MultipleChoiceTask).correctIndex}
            onSubmit={handleMultipleChoiceSubmit}
            disabled={disabled || isCompleted}
            showResult={isCompleted}
          />
        )}

        {task.type === 'FILL_BLANK' && (
          <FillBlankRenderer
            question={task.question}
            sentence={(task as FillBlankTask).sentence}
            correctTerm={(task as FillBlankTask).correctTerm}
            distractors={(task as FillBlankTask).distractors}
            onSubmit={handleFillBlankSubmit}
            disabled={disabled || isCompleted}
            showResult={isCompleted}
          />
        )}
      </div>

      {/* Explanation (shown after correct answer) */}
      {showExplanation && (
        <div className="px-4 pb-4 animate-fadeIn">
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <div>
                <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                  Insight Earned
                </div>
                <div className="text-sm text-green-800 dark:text-green-200">
                  <MathRenderer text={task.explanation} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Skip option after 3 attempts */}
      {attempts >= 3 && !isCompleted && (
        <div className="px-4 pb-4">
          <button
            onClick={() => {
              setIsCompleted(true)
              setShowExplanation(true)
              setTimeout(() => {
                setIsAnimatingOut(true)
                setTimeout(() => {
                  onCorrectAnswer(task.explanation)
                }, 300)
              }, 1500)
            }}
            className="w-full py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            Show answer and continue
          </button>
        </div>
      )}
    </div>
  )
}
