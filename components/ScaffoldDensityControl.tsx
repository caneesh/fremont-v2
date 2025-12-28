'use client'

import { useState, useEffect } from 'react'
import type { ScaffoldDensity } from '@/types/scaffold'

interface ScaffoldDensityControlProps {
  value: ScaffoldDensity
  onChange: (density: ScaffoldDensity) => void
  disabled?: boolean
  showLabels?: boolean
}

const DENSITY_LABELS: Record<ScaffoldDensity, { label: string; description: string; icon: string }> = {
  1: {
    label: 'Micro',
    description: '8-12 detailed micro-steps for beginners',
    icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
  },
  2: {
    label: 'Detailed',
    description: '6-8 steps with explicit sub-tasks',
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
  },
  3: {
    label: 'Balanced',
    description: '4-6 key milestone steps (default)',
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
  },
  4: {
    label: 'Condensed',
    description: '3-4 high-level steps',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z'
  },
  5: {
    label: 'Macro',
    description: '2-3 milestones for advanced students',
    icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'
  }
}

export default function ScaffoldDensityControl({
  value,
  onChange,
  disabled = false,
  showLabels = true
}: ScaffoldDensityControlProps) {
  const [hoveredLevel, setHoveredLevel] = useState<ScaffoldDensity | null>(null)

  const displayLevel = hoveredLevel || value
  const displayInfo = DENSITY_LABELS[displayLevel]

  return (
    <div className="space-y-3">
      {showLabels && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
            Scaffold Density
          </label>
          <span className="text-xs text-gray-500 dark:text-dark-text-muted">
            Level {displayLevel}/5
          </span>
        </div>
      )}

      {/* Level Selector */}
      <div className="flex items-center gap-1">
        {([1, 2, 3, 4, 5] as ScaffoldDensity[]).map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            onMouseEnter={() => setHoveredLevel(level)}
            onMouseLeave={() => setHoveredLevel(null)}
            disabled={disabled}
            className={`flex-1 h-10 rounded-lg border-2 transition-all duration-200 ${
              value === level
                ? 'bg-accent border-accent text-white shadow-md'
                : level <= value
                  ? 'bg-accent/20 border-accent/40 text-accent hover:bg-accent/30'
                  : 'bg-gray-100 dark:bg-dark-card-soft border-gray-300 dark:border-dark-border text-gray-600 dark:text-dark-text-muted hover:border-gray-400 dark:hover:border-dark-border-strong'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            title={`${DENSITY_LABELS[level].label}: ${DENSITY_LABELS[level].description}`}
          >
            <span className="font-medium text-sm">{level}</span>
          </button>
        ))}
      </div>

      {/* Description */}
      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-card-soft rounded-lg border border-gray-200 dark:border-dark-border">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={displayInfo.icon}
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-dark-text-primary">
            {displayInfo.label}
          </p>
          <p className="text-xs text-gray-600 dark:text-dark-text-secondary truncate">
            {displayInfo.description}
          </p>
        </div>
      </div>

      {/* Visual Scale */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-dark-text-muted px-1">
        <span>More Steps</span>
        <span>Fewer Steps</span>
      </div>
    </div>
  )
}
