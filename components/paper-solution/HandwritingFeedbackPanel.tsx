'use client'

import type { AnalyzeSolutionResponse } from '@/types/paperSolution'

interface HandwritingFeedbackPanelProps {
  stepTitle: string
  feedback: AnalyzeSolutionResponse
  onRevise: () => void
  onEditText: () => void
  onContinue: () => void
}

export default function HandwritingFeedbackPanel({
  stepTitle,
  feedback,
  onRevise,
  onEditText,
  onContinue,
}: HandwritingFeedbackPanelProps) {
  const statusConfig = {
    pass: {
      icon: '✅',
      label: 'PASS',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-200 dark:border-green-500/30',
      textColor: 'text-green-800 dark:text-green-400',
      badgeBg: 'bg-green-100 dark:bg-green-900/40',
    },
    partial: {
      icon: '⚠️',
      label: 'PARTIAL',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-200 dark:border-yellow-500/30',
      textColor: 'text-yellow-800 dark:text-yellow-400',
      badgeBg: 'bg-yellow-100 dark:bg-yellow-900/40',
    },
    fail: {
      icon: '❌',
      label: 'NEEDS WORK',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-200 dark:border-red-500/30',
      textColor: 'text-red-800 dark:text-red-400',
      badgeBg: 'bg-red-100 dark:bg-red-900/40',
    },
    unclear: {
      icon: '❓',
      label: 'UNCLEAR',
      bgColor: 'bg-gray-50 dark:bg-dark-card-soft',
      borderColor: 'border-gray-200 dark:border-dark-border',
      textColor: 'text-gray-800 dark:text-dark-text-primary',
      badgeBg: 'bg-gray-100 dark:bg-dark-card',
    },
  }

  const config = statusConfig[feedback.status]

  return (
    <div className={`rounded-lg border ${config.borderColor} ${config.bgColor} overflow-hidden`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-inherit flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-dark-text-muted">{stepTitle}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${config.badgeBg} ${config.textColor}`}>
              {config.icon} {config.label}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500 dark:text-dark-text-muted">Analysis Confidence</p>
          <p className={`text-sm font-medium ${config.textColor}`}>
            {Math.round(feedback.analysisConfidence * 100)}%
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b border-inherit">
        <p className="text-gray-800 dark:text-dark-text-primary">{feedback.summary}</p>
      </div>

      {/* What you did well */}
      {feedback.correctElements.length > 0 && (
        <div className="px-4 py-3 border-b border-inherit">
          <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            What you did well
          </h4>
          <ul className="space-y-1">
            {feedback.correctElements.map((item, index) => (
              <li
                key={index}
                className="text-sm text-gray-700 dark:text-dark-text-secondary flex items-start gap-2"
              >
                <span className="text-green-500 mt-1">•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* First issue to address */}
      {feedback.firstIssue && (
        <div className="px-4 py-3 border-b border-inherit bg-white/50 dark:bg-dark-card/50">
          <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            First issue to address
          </h4>
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
              {feedback.firstIssue.title}
            </p>
            <p className="text-sm text-gray-700 dark:text-dark-text-secondary">
              {feedback.firstIssue.description}
            </p>
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-100 dark:border-red-500/20">
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                💡 Why this matters:
              </p>
              <p className="text-sm text-red-600 dark:text-red-300">
                {feedback.firstIssue.whyItMatters}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Socratic nudge */}
      <div className="px-4 py-3 border-b border-inherit bg-blue-50/50 dark:bg-accent/5">
        <h4 className="text-sm font-semibold text-blue-700 dark:text-accent mb-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Think about this
        </h4>
        <p className="text-sm text-blue-800 dark:text-accent/90 italic">
          &ldquo;{feedback.socraticNudge}&rdquo;
        </p>
      </div>

      {/* Suggested action */}
      <div className="px-4 py-3 border-b border-inherit">
        <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
          Suggested next action
        </h4>
        <p className="text-sm text-gray-700 dark:text-dark-text-secondary">
          {feedback.suggestedAction}
        </p>
      </div>

      {/* Clarification needed */}
      {feedback.clarificationNeeded && feedback.clarifications && (
        <div className="px-4 py-3 border-b border-inherit bg-orange-50 dark:bg-orange-900/20">
          <h4 className="text-sm font-semibold text-orange-700 dark:text-orange-400 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Please clarify
          </h4>
          {feedback.clarifications.map((clarification, index) => (
            <div key={index} className="mt-2">
              <p className="text-sm text-orange-800 dark:text-orange-300">
                {clarification.question}
              </p>
              {clarification.options && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {clarification.options.map((option, optIndex) => (
                    <button
                      key={optIndex}
                      className="px-3 py-1 text-sm bg-white dark:bg-dark-card border border-orange-300 dark:border-orange-500/30 rounded-full text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-dark-card">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRevise}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-strong flex items-center gap-2 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Upload Revised Work
          </button>
          <button
            onClick={onEditText}
            className="px-4 py-2 bg-white dark:bg-dark-card-soft border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-border flex items-center gap-2 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Extracted Text
          </button>
        </div>
        <button
          onClick={onContinue}
          className="px-4 py-2 text-gray-600 dark:text-dark-text-muted hover:text-gray-900 dark:hover:text-dark-text-primary text-sm transition-colors"
        >
          Continue Without Revising →
        </button>
      </div>
    </div>
  )
}
