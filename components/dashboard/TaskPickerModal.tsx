'use client'

import { useState, useEffect } from 'react'
import type { TaskSuggestion, PlanTaskType } from '@/types/dashboard'

interface TaskPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectTask: (suggestion: TaskSuggestion) => void
  suggestions: TaskSuggestion[]
}

type TabId = 'recommended' | 'study_path' | 'review' | 'custom'

/**
 * Modal for picking tasks to add to the plan
 */
export default function TaskPickerModal({
  isOpen,
  onClose,
  onSelectTask,
  suggestions,
}: TaskPickerModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('recommended')

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: 'recommended',
      label: 'For You',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'study_path',
      label: 'Study Path',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      id: 'review',
      label: 'Review',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      id: 'custom',
      label: 'Custom',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
  ]

  // Filter suggestions by tab
  const getFilteredSuggestions = (): TaskSuggestion[] => {
    switch (activeTab) {
      case 'recommended':
        return suggestions.filter(s => s.priority === 'high' || s.priority === 'medium')
      case 'study_path':
        return suggestions.filter(s => s.type === 'study_path_question')
      case 'review':
        return suggestions.filter(s => s.type === 'review_due')
      case 'custom':
        return [
          {
            type: 'custom_solve' as PlanTaskType,
            title: 'Custom Problem',
            description: 'Enter any physics problem to solve',
            priority: 'medium' as const,
          },
        ]
      default:
        return suggestions
    }
  }

  const filteredSuggestions = getFilteredSuggestions()

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'medium':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-dark-card-soft dark:text-dark-text-muted'
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-white dark:bg-dark-card rounded-2xl shadow-2xl dark:shadow-dark-lg z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Add Task</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-dark-card-soft transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-dark-border overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text-secondary'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredSuggestions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-dark-text-muted">No tasks available in this category</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.type}-${index}`}
                  onClick={() => {
                    onSelectTask(suggestion)
                    onClose()
                  }}
                  className="w-full text-left p-4 rounded-lg border-2 border-gray-200 dark:border-dark-border hover:border-accent dark:hover:border-accent bg-white dark:bg-dark-card-soft hover:bg-gray-50 dark:hover:bg-dark-border transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900 dark:text-dark-text-primary">
                          {suggestion.title}
                        </h3>
                        {suggestion.priority !== 'low' && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityColor(suggestion.priority)}`}>
                            {suggestion.priority === 'high' ? 'Due' : 'Recommended'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-dark-text-muted">
                        {suggestion.description}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 dark:text-dark-text-muted flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
