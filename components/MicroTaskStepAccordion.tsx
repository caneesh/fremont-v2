'use client'

import { useState, useEffect } from 'react'
import type { MicroTaskStep } from '@/types/microTask'
import type { Concept } from '@/types/scaffold'
import type { MicroTaskStepProgress } from '@/types/history'
import InsightCard from './micro-tasks/InsightCard'
import CollectedInsights from './micro-tasks/CollectedInsights'

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
          {collectedInsights.length > 0 && (
            <CollectedInsights
              insights={collectedInsights}
              totalLevels={step.tasks.length}
            />
          )}

          {/* Current Task Card */}
          {currentTask && !allTasksCompleted && (
            <InsightCard
              key={`step-${step.id}-level-${currentLevel}`}
              task={currentTask}
              stepTitle={step.title}
              onCorrectAnswer={handleTaskCorrect}
              onWrongAnswer={handleTaskWrong}
              attempts={taskAttempts.get(currentLevel) || 0}
            />
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
