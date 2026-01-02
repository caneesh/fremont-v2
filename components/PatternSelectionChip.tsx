'use client'

import type { PatternOption } from '@/types/patternFirst'

interface PatternSelectionChipProps {
  patterns: PatternOption[]
  selectedPatternId: string | null
  showWarning?: boolean
  disabled?: boolean
  onClick: () => void
}

function getPatternLabel(pattern: PatternOption): string {
  return pattern.label || pattern.name || pattern.id
}

export default function PatternSelectionChip({
  patterns,
  selectedPatternId,
  showWarning,
  disabled,
  onClick,
}: PatternSelectionChipProps) {
  const selected = selectedPatternId
    ? patterns.find(p => p.id === selectedPatternId)
    : undefined

  const label = selected ? getPatternLabel(selected) : 'Pick a pattern'

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center gap-2 px-3 py-2 rounded-full border text-sm transition-colors
        ${disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}
        ${selectedPatternId
          ? 'border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/20'
          : showWarning
            ? 'border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 bg-amber-50/60 dark:bg-amber-900/20'
            : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-dark-card-soft'}
      `}
      title={selectedPatternId ? 'Change pattern' : 'Pick a pattern'}
    >
      {showWarning && !selectedPatternId && (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      )}
      <span className="truncate max-w-[220px]">
        Pattern: {label}
      </span>
      <span className="text-xs opacity-80">
        (change)
      </span>
    </button>
  )
}

