'use client'

import React, { useState } from 'react'
import type { DetectedMisconception } from '@/types/misconception'

interface MisconceptionFlagProps {
  misconceptions: DetectedMisconception[]
  onDismiss?: () => void
  onAcknowledge?: (misconceptionId: string) => void
}

const SEVERITY_STYLES: Record<'high' | 'medium' | 'low', {
  border: string
  bg: string
  icon: string
  iconBg: string
  text: string
  label: string
}> = {
  high: {
    border: 'border-purple-300 dark:border-purple-700',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    text: 'text-purple-800 dark:text-purple-200',
    label: 'Important',
  },
  medium: {
    border: 'border-indigo-300 dark:border-indigo-700',
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    icon: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    text: 'text-indigo-800 dark:text-indigo-200',
    label: 'Consider',
  },
  low: {
    border: 'border-slate-300 dark:border-slate-600',
    bg: 'bg-slate-50 dark:bg-slate-800/50',
    icon: 'text-slate-600 dark:text-slate-400',
    iconBg: 'bg-slate-100 dark:bg-slate-700/40',
    text: 'text-slate-700 dark:text-slate-300',
    label: 'Note',
  },
}

export default function MisconceptionFlag({
  misconceptions,
  onDismiss,
  onAcknowledge,
}: MisconceptionFlagProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set())

  if (misconceptions.length === 0) {
    return null
  }

  // Get highest severity misconception for main styling
  const primaryMisconception = misconceptions.reduce((prev, curr) => {
    const severityOrder = { high: 3, medium: 2, low: 1 }
    return severityOrder[curr.severity] > severityOrder[prev.severity] ? curr : prev
  })

  const styles = SEVERITY_STYLES[primaryMisconception.severity]

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedIds(newExpanded)
  }

  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds(new Set([...acknowledgedIds, id]))
    onAcknowledge?.(id)
  }

  // Filter out acknowledged misconceptions
  const activeMisconceptions = misconceptions.filter(m => !acknowledgedIds.has(m.id))

  if (activeMisconceptions.length === 0) {
    return null
  }

  return (
    <div className={`rounded-lg border-2 ${styles.border} ${styles.bg} p-4 space-y-4`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${styles.iconBg} flex items-center justify-center`}>
            <svg
              className={`w-6 h-6 ${styles.icon}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${styles.text}`}>
              Conceptual Check
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {activeMisconceptions.length === 1
                ? 'Something to think about'
                : `${activeMisconceptions.length} points to consider`}
            </p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Misconception Cards */}
      <div className="space-y-3">
        {activeMisconceptions.map((misconception) => {
          const miscStyles = SEVERITY_STYLES[misconception.severity]
          const isExpanded = expandedIds.has(misconception.id)

          return (
            <div
              key={misconception.id}
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              {/* Clarification Question (always visible) */}
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full ${miscStyles.iconBg} flex items-center justify-center flex-shrink-0`}>
                    <svg
                      className={`w-5 h-5 ${miscStyles.icon}`}
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
                  <div className="flex-1">
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {misconception.clarificationQuestion}
                    </p>

                    {/* Related concept tag */}
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                        {misconception.relatedConcept}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${miscStyles.iconBg} ${miscStyles.text}`}>
                        {miscStyles.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Expand/Collapse button for evidence */}
                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => toggleExpand(misconception.id)}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {isExpanded ? 'Hide details' : 'Why am I seeing this?'}
                  </button>

                  <button
                    onClick={() => handleAcknowledge(misconception.id)}
                    className="text-sm px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3 space-y-3">
                  {/* Evidence */}
                  <div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                      From your solution:
                    </p>
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-700/50 border-l-2 border-slate-300 dark:border-slate-600">
                      <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                        &ldquo;{misconception.evidence}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Confidence indicator */}
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Confidence:
                    </p>
                    <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${miscStyles.iconBg} rounded-full`}
                        style={{ width: `${misconception.confidence * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {Math.round(misconception.confidence * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer hint */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          These questions are designed to help you verify your understanding, not to mark you wrong.
        </p>
      </div>
    </div>
  )
}
