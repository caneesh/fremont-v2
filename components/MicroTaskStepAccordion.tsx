'use client'

import { useState, useEffect } from 'react'
import type { MicroTaskStep } from '@/types/microTask'
import type { Concept } from '@/types/scaffold'
import type { MicroTaskStepProgress } from '@/types/history'
import InsightCard from './micro-tasks/InsightCard'
import CollectedInsights from './micro-tasks/CollectedInsights'
import MathRenderer from './MathRenderer'

interface MicroTaskStepAccordionProps {
  step: MicroTaskStep
  stepNumber: number
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  concepts: Concept[]
  progress?: MicroTaskStepProgress
  problemStatement?: string
  onTaskComplete: (stepId: number, level: number, explanation: string) => void
  onComplete: (stepId: number) => void
  onActivate: (stepId: number) => void
}

export default function MicroTaskStepAccordion({
  step,
  stepNumber,
  isActive,
  isCompleted,
  isLocked,
  concepts,
  progress,
  problemStatement,
  onTaskComplete,
  onComplete,
  onActivate
}: MicroTaskStepAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(isActive)
  const [currentLevel, setCurrentLevel] = useState(progress?.currentLevel || 1)
  const [taskAttempts, setTaskAttempts] = useState<Map<number, number>>(
    new Map(progress?.taskAttempts.map(t => [t.level, t.attempts]) || [])
  )
  const [collectedInsights, setCollectedInsights] = useState<Array<{
    level: number
    levelTitle: string
    explanation: string
  }>>(
    progress?.collectedInsights.map((explanation, idx) => ({
      level: idx + 1,
      levelTitle: step.tasks[idx]?.levelTitle || 'Concept',
      explanation
    })) || []
  )
  const [isReadingMode, setIsReadingMode] = useState(false)
  const [expandedHintLevel, setExpandedHintLevel] = useState<number | null>(null)

  // Sync with active state
  useEffect(() => {
    setIsExpanded(isActive)
  }, [isActive])

  const handleToggle = () => {
    if (isLocked) return
    if (!isExpanded) {
      onActivate(step.id)
    }
    setIsExpanded(!isExpanded)
  }

  const handleTaskCorrect = (explanation: string) => {
    // Add to collected insights
    const currentTask = step.tasks.find(t => t.level === currentLevel)
    if (currentTask) {
      setCollectedInsights(prev => [...prev, {
        level: currentLevel,
        levelTitle: currentTask.levelTitle,
        explanation
      }])
    }

    // Notify parent
    onTaskComplete(step.id, currentLevel, explanation)

    // Move to next level
    if (currentLevel < step.tasks.length) {
      setCurrentLevel(currentLevel + 1)
    } else {
      // All tasks completed
      onComplete(step.id)
    }
  }

  const handleTaskWrong = (attempts: number) => {
    setTaskAttempts(prev => {
      const newMap = new Map(prev)
      newMap.set(currentLevel, attempts)
      return newMap
    })
  }

  const handleSwitchToReadingMode = () => {
    setIsReadingMode(true)
    // Expand the first non-completed level
    const firstUncompletedLevel = step.tasks.find(t => t.level >= currentLevel)?.level || 1
    setExpandedHintLevel(firstUncompletedLevel)
  }

  const handleHintRead = (level: number) => {
    const task = step.tasks.find(t => t.level === level)
    if (!task) return

    // Add to collected insights if not already there
    const alreadyCollected = collectedInsights.some(i => i.level === level)
    if (!alreadyCollected) {
      setCollectedInsights(prev => [...prev, {
        level,
        levelTitle: task.levelTitle,
        explanation: task.explanation
      }])
      onTaskComplete(step.id, level, task.explanation)
    }

    // Move to next level if this was the current level
    if (level === currentLevel && currentLevel < step.tasks.length) {
      setCurrentLevel(currentLevel + 1)
    } else if (level === currentLevel && currentLevel >= step.tasks.length) {
      onComplete(step.id)
    }
  }

  // Get current task
  const currentTask = step.tasks.find(t => t.level === currentLevel)
  const allTasksCompleted = currentLevel > step.tasks.length || isCompleted

  // Get required concepts for this step
  const requiredConcepts = concepts.filter(c =>
    step.requiredConcepts.includes(c.id)
  )

  const getBorderColor = () => {
    if (isCompleted) return 'border-green-500 dark:border-green-600'
    if (isActive) return 'border-indigo-500 dark:border-indigo-400'
    if (isLocked) return 'border-slate-300 dark:border-slate-600'
    return 'border-slate-400 dark:border-slate-500'
  }

  const getBackgroundColor = () => {
    if (isCompleted) return 'bg-green-50/50 dark:bg-green-900/10'
    if (isActive) return 'bg-white dark:bg-slate-800'
    if (isLocked) return 'bg-slate-100 dark:bg-slate-800/50'
    return 'bg-white dark:bg-slate-800'
  }

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${getBorderColor()} ${getBackgroundColor()}`}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        disabled={isLocked}
        className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
          isLocked ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
        }`}
      >
        {/* Step Number Circle */}
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
            isCompleted
              ? 'bg-green-500 text-white'
              : isActive
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          {isCompleted ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            stepNumber
          )}
        </div>

        {/* Title and Progress */}
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold truncate ${
            isLocked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
          }`}>
            {step.title}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {/* Progress dots */}
            <div className="flex gap-1">
              {step.tasks.map((task) => (
                <div
                  key={task.level}
                  className={`w-2 h-2 rounded-full ${
                    task.level < currentLevel || isCompleted
                      ? 'bg-green-500'
                      : task.level === currentLevel
                      ? 'bg-indigo-500 animate-pulse'
                      : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {Math.min(currentLevel - 1, step.tasks.length)}/{step.tasks.length} insights
            </span>
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        {!isLocked && (
          <svg
            className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}

        {/* Lock Icon */}
        {isLocked && (
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && !isLocked && (
        <div className="px-4 pb-4 space-y-4">
          {/* Required Concepts */}
          {requiredConcepts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {requiredConcepts.map(concept => (
                <span
                  key={concept.id}
                  className="px-2 py-1 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                >
                  {concept.name}
                </span>
              ))}
            </div>
          )}

          {/* Collected Insights */}
          {collectedInsights.length > 0 && !isReadingMode && (
            <CollectedInsights
              insights={collectedInsights}
              totalLevels={step.tasks.length}
            />
          )}

          {/* Quiz Mode: Current Task Card */}
          {!isReadingMode && currentTask && !allTasksCompleted && (
            <InsightCard
              key={`step-${step.id}-level-${currentLevel}`}
              task={currentTask}
              stepTitle={step.title}
              onCorrectAnswer={handleTaskCorrect}
              onWrongAnswer={handleTaskWrong}
              onSwitchToReadingMode={handleSwitchToReadingMode}
              attempts={taskAttempts.get(currentLevel) || 0}
            />
          )}

          {/* Reading Mode: Hint Ladder */}
          {isReadingMode && !allTasksCompleted && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Reading Mode
                </div>
                <button
                  onClick={() => setIsReadingMode(false)}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Back to Quiz Mode
                </button>
              </div>

              {/* Hint Ladder */}
              {step.tasks.map((task) => {
                const isCollected = collectedInsights.some(i => i.level === task.level)
                const isExpanded = expandedHintLevel === task.level

                return (
                  <div
                    key={task.level}
                    className={`rounded-lg border overflow-hidden transition-all ${
                      isCollected
                        ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setExpandedHintLevel(isExpanded ? null : task.level)
                        if (!isCollected) {
                          handleHintRead(task.level)
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          isCollected
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          {isCollected ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            task.level
                          )}
                        </div>
                        <span className={`text-sm font-medium ${
                          isCollected ? 'text-green-700 dark:text-green-300' : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {task.levelTitle}
                        </span>
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                          <MathRenderer text={task.explanation} />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Completion Message */}
          {allTasksCompleted && (
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-center">
              <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-300 font-medium">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Step Completed!
              </div>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                All {step.tasks.length} insights earned for this step.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
