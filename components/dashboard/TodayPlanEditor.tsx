'use client'

import { useState } from 'react'
import type { TodayPlan, PlanTask } from '@/types/dashboard'

interface TodayPlanEditorProps {
  plan: TodayPlan
  onAddTask: () => void
  onRemoveTask: (taskId: string) => void
  onMoveUp: (taskId: string) => void
  onMoveDown: (taskId: string) => void
  onStartSession: () => void
}

/**
 * Today's Plan Editor
 * Allows reordering, adding, removing tasks
 */
export default function TodayPlanEditor({
  plan,
  onAddTask,
  onRemoveTask,
  onMoveUp,
  onMoveDown,
  onStartSession,
}: TodayPlanEditorProps) {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)

  const getTaskIcon = (type: PlanTask['type']) => {
    switch (type) {
      case 'study_path_question':
        return (
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        )
      case 'review_due':
        return (
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )
      case 'pattern_track_continue':
        return (
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )
      case 'custom_solve':
        return (
          <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
    }
  }

  const incompleteTasks = plan.tasks.filter(t => !t.completed)
  const completedTasks = plan.tasks.filter(t => t.completed)

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl shadow-md dark:shadow-dark-md border border-gray-100 dark:border-dark-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Today&apos;s Plan</h2>
          <p className="text-sm text-gray-500 dark:text-dark-text-muted">
            {incompleteTasks.length} tasks remaining
          </p>
        </div>
        <button
          onClick={onAddTask}
          className="p-2 text-gray-500 dark:text-dark-text-muted hover:text-accent hover:bg-gray-100 dark:hover:bg-dark-card-soft rounded-lg transition-colors"
          title="Add task"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Task List */}
      {plan.tasks.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-gray-100 dark:bg-dark-card-soft rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400 dark:text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-dark-text-muted mb-4">No tasks planned for today</p>
          <button
            onClick={onAddTask}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-strong transition-colors text-sm font-medium"
          >
            Add Your First Task
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {incompleteTasks.map((task, index) => {
              const isActive = plan.tasks.indexOf(task) === plan.activeTaskIndex
              const isFirst = index === 0
              const isLast = index === incompleteTasks.length - 1

              return (
                <div
                  key={task.id}
                  className={`group relative rounded-lg border-2 transition-all ${
                    isActive
                      ? 'border-accent bg-accent/5 dark:bg-accent/10'
                      : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-border'
                  }`}
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Task Icon */}
                    <div className="flex-shrink-0">
                      {getTaskIcon(task.type)}
                    </div>

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium truncate ${
                        isActive ? 'text-accent' : 'text-gray-900 dark:text-dark-text-primary'
                      }`}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs text-gray-500 dark:text-dark-text-muted truncate">
                          {task.description}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!isFirst && (
                        <button
                          onClick={() => onMoveUp(task.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-secondary"
                          title="Move up"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                      )}
                      {!isLast && (
                        <button
                          onClick={() => onMoveDown(task.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-secondary"
                          title="Move down"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => onRemoveTask(task.id)}
                        className="p-1 text-gray-400 hover:text-red-500"
                        title="Remove"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="border-t border-gray-200 dark:border-dark-border pt-3 mt-3">
              <button
                onClick={() => setExpandedTaskId(expandedTaskId === 'completed' ? null : 'completed')}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text-secondary w-full"
              >
                <svg
                  className={`w-4 h-4 transition-transform ${expandedTaskId === 'completed' ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {completedTasks.length} completed
              </button>
              {expandedTaskId === 'completed' && (
                <div className="mt-2 space-y-2">
                  {completedTasks.map(task => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-2 text-gray-400 dark:text-dark-text-muted"
                    >
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="line-through">{task.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Start Session Button */}
          {incompleteTasks.length > 0 && (
            <button
              onClick={onStartSession}
              className="w-full mt-4 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent-strong transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Start Session
            </button>
          )}
        </>
      )}
    </div>
  )
}
