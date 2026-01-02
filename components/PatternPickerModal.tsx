'use client'

import { useCallback } from 'react'
import type { PatternOption } from '@/types/patternFirst'

interface PatternPickerModalProps {
  isOpen: boolean
  title?: string
  patterns: PatternOption[]
  selectedPatternId: string | null
  onSelect: (patternId: string) => void
  onClose: () => void
}

function getPatternLabel(pattern: PatternOption): string {
  return pattern.label || pattern.name || pattern.id
}

export default function PatternPickerModal({
  isOpen,
  title = 'Pick a pattern',
  patterns,
  selectedPatternId,
  onSelect,
  onClose,
}: PatternPickerModalProps) {
  const handleSelect = useCallback((patternId: string) => {
    onSelect(patternId)
    onClose()
  }, [onSelect, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pattern-picker-title"
    >
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-slate-700 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 id="pattern-picker-title" className="text-xl font-bold text-white">
                {title}
              </h2>
              <p className="text-slate-200 text-sm mt-1">
                This trains fast recognition before equations.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {patterns.map((pattern) => {
              const isSelected = selectedPatternId === pattern.id
              return (
                <button
                  key={pattern.id}
                  onClick={() => handleSelect(pattern.id)}
                  className={`
                    text-left p-4 rounded-xl border-2 transition-all duration-150
                    ${isSelected
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800'}
                    focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
                  `}
                >
                  <div className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    {getPatternLabel(pattern)}
                  </div>
                  {pattern.description && (
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {pattern.description}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

