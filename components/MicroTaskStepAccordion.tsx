'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { MicroTaskStep } from '@/types/microTask'
import type { Concept, WarningBeacon } from '@/types/scaffold'
import type { MicroTaskStepProgress } from '@/types/history'
import type { StepLearningStatus, ValidationOutcome, RevealFlowEventMetadata } from '@/types/revealFlow'
import type { FeynmanValidationResult } from '@/types/feynman'
import InsightCard from './micro-tasks/InsightCard'
import CollectedInsights from './micro-tasks/CollectedInsights'
import RevealReconstructValidate from './micro-tasks/RevealReconstructValidate'
import ConfidencePrompt from './micro-tasks/ConfidencePrompt'
import FeynmanMicroPrompt from './FeynmanMicroPrompt'
import MathRenderer from './MathRenderer'
import { getStepTypeBadge } from '@/lib/hintEngine'
import { onTaskIncorrect, onStepTimeout, type ProblemContext, type StepContext } from '@/lib/mistakeTriggers'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { eventLogger } from '@/lib/storage/eventLogger'
import type { Confidence } from '@/types/confidence'
import type { ErrorTag } from '@/types/circuitBreaker'

interface MicroTaskStepAccordionProps {
  step: MicroTaskStep
  stepNumber: number
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  concepts: Concept[]
  progress?: MicroTaskStepProgress
  problemStatement?: string
  warningBeacon?: WarningBeacon  // Optional warning beacon from Error Anticipator
  // Problem context for mistake tracking
  problemId?: string
  problemTitle?: string
  domain?: string
  subdomain?: string
  onTaskComplete: (stepId: number, level: number, explanation: string) => void
  onComplete: (stepId: number) => void
  onActivate: (stepId: number) => void
  // Circuit breaker callback for error pattern tracking
  onCircuitBreakerError?: (stepId: number, errorTag: ErrorTag) => void
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
  warningBeacon,
  problemId,
  problemTitle,
  domain,
  subdomain,
  onTaskComplete,
  onComplete,
  onActivate,
  onCircuitBreakerError
}: MicroTaskStepAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(isActive)

  // Track step activation time for timeout detection
  const stepActivationTimeRef = useRef<number | null>(null)
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

  // Reveal-Reconstruct-Validate flow state
  const [revealFlowTask, setRevealFlowTask] = useState<typeof step.tasks[0] | null>(null)
  const [levelLearningStatus, setLevelLearningStatus] = useState<Map<number, StepLearningStatus>>(new Map())

  // Feynman Micro-Prompt state
  const [feynmanPassed, setFeynmanPassed] = useState(false)
  const [feynmanResult, setFeynmanResult] = useState<FeynmanValidationResult | null>(null)

  // Confidence prompt state (for confidence-weighted SRS)
  const [showConfidencePrompt, setShowConfidencePrompt] = useState(false)
  const [pendingTaskResult, setPendingTaskResult] = useState<{
    isCorrect: boolean
    explanation: string
    attempts: number
  } | null>(null)

  // Feature flag checks
  const useRevealFlow = FEATURE_FLAGS.REVEAL_RECONSTRUCT_VALIDATE
  const useConfidenceSRS = FEATURE_FLAGS.CONFIDENCE_WEIGHTED_SRS

  // Sync with active state and track activation time
  useEffect(() => {
    setIsExpanded(isActive)
    if (isActive && !isCompleted && stepActivationTimeRef.current === null) {
      stepActivationTimeRef.current = Date.now()
    }
    if (isCompleted) {
      stepActivationTimeRef.current = null
    }
  }, [isActive, isCompleted])

  const handleToggle = () => {
    if (isLocked) return
    if (!isExpanded) {
      onActivate(step.id)
    }
    setIsExpanded(!isExpanded)
  }

  // Process task completion (called after confidence is rated or directly if disabled)
  const processTaskCompletion = useCallback((isCorrect: boolean, explanation: string, confidence?: Confidence) => {
    // Log confidence if provided
    if (confidence && problemId) {
      eventLogger.log('task_confidence_rated', {
        problemId,
        stepId: step.id,
        level: currentLevel,
        isCorrect,
        confidence
      })
    }

    if (isCorrect) {
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
        // All tasks completed - check for timeout
        if (problemId && stepActivationTimeRef.current) {
          const durationMs = Date.now() - stepActivationTimeRef.current
          const problemContext: ProblemContext = {
            problemId,
            problemTitle: problemTitle || 'Untitled Problem',
            domain: domain || 'physics',
            subdomain: subdomain || 'general'
          }
          const stepContext: StepContext = {
            stepId: step.id,
            stepTitle: step.title,
            stepType: step.stepType || 'physics_concept',
            requiredConcepts: step.requiredConcepts || []
          }
          onStepTimeout(problemContext, stepContext, durationMs)
        }
        onComplete(step.id)
      }
    }

    // Clear pending state
    setPendingTaskResult(null)
    setShowConfidencePrompt(false)
  }, [step.id, step.tasks, step.title, step.stepType, step.requiredConcepts, currentLevel, problemId, problemTitle, domain, subdomain, onTaskComplete, onComplete])

  const handleTaskCorrect = (explanation: string) => {
    if (useConfidenceSRS) {
      // Show confidence prompt before proceeding
      setPendingTaskResult({ isCorrect: true, explanation, attempts: 0 })
      setShowConfidencePrompt(true)
    } else {
      // Original behavior - proceed immediately
      processTaskCompletion(true, explanation)
    }
  }

  // Handle confidence rating from the prompt
  const handleConfidenceRated = useCallback((confidence: Confidence) => {
    if (pendingTaskResult) {
      processTaskCompletion(
        pendingTaskResult.isCorrect,
        pendingTaskResult.explanation,
        confidence
      )
    }
  }, [pendingTaskResult, processTaskCompletion])

  // Handle skipping confidence prompt (defaults to medium)
  const handleConfidenceSkipped = useCallback(() => {
    if (pendingTaskResult) {
      processTaskCompletion(
        pendingTaskResult.isCorrect,
        pendingTaskResult.explanation,
        'medium'
      )
    }
  }, [pendingTaskResult, processTaskCompletion])

  // Infer ErrorTag from step type and task content
  const inferErrorTag = useCallback((): ErrorTag => {
    const stepType = step.stepType || 'physics_concept'
    const title = step.title.toLowerCase()
    const task = step.tasks[currentLevel - 1]
    const question = task?.question?.toLowerCase() || ''

    // Check for specific patterns in question/title
    if (question.includes('component') || question.includes('resolve') || title.includes('vector')) {
      return 'vector_component'
    }
    if (question.includes('sign') || question.includes('positive') || question.includes('negative') || question.includes('direction')) {
      return 'sign_convention'
    }
    if (question.includes('sin') || question.includes('cos') || question.includes('tan') || question.includes('trig')) {
      return 'trig_identity'
    }
    if (question.includes('unit') || question.includes('convert') || question.includes('m/s') || question.includes('km/h')) {
      return 'unit_conversion'
    }
    if (question.includes('conservation') || question.includes('momentum') || question.includes('energy')) {
      return 'conservation_scope'
    }
    if (question.includes('frame') || question.includes('relative') || question.includes('observer')) {
      return 'reference_frame'
    }
    if (question.includes('force') || question.includes('fbd') || question.includes('free body')) {
      return 'force_enumeration'
    }

    // Fall back to step type mapping
    if (stepType === 'math_manipulation') {
      return 'algebra_manipulation'
    }

    // Default based on common physics errors
    return 'algebra_manipulation'
  }, [step, currentLevel])

  const handleTaskWrong = (attempts: number) => {
    setTaskAttempts(prev => {
      const newMap = new Map(prev)
      newMap.set(currentLevel, attempts)
      return newMap
    })

    // Track mistake when 2+ wrong attempts on a task
    if (problemId && attempts >= 2) {
      const problemContext: ProblemContext = {
        problemId,
        problemTitle: problemTitle || 'Untitled Problem',
        domain: domain || 'physics',
        subdomain: subdomain || 'general'
      }
      const stepContext: StepContext = {
        stepId: step.id,
        stepTitle: step.title,
        stepType: step.stepType || 'physics_concept',
        requiredConcepts: step.requiredConcepts || []
      }
      onTaskIncorrect(problemContext, stepContext, currentLevel, attempts)

      // Notify circuit breaker of the error
      if (onCircuitBreakerError) {
        const errorTag = inferErrorTag()
        onCircuitBreakerError(step.id, errorTag)
      }
    }
  }

  const handleSwitchToReadingMode = () => {
    // Track switching to reading mode as a mistake (user gave up on quiz)
    if (problemId) {
      const problemContext: ProblemContext = {
        problemId,
        problemTitle: problemTitle || 'Untitled Problem',
        domain: domain || 'physics',
        subdomain: subdomain || 'general'
      }
      const stepContext: StepContext = {
        stepId: step.id,
        stepTitle: step.title,
        stepType: step.stepType || 'physics_concept',
        requiredConcepts: step.requiredConcepts || []
      }
      // Use onTaskIncorrect with current level and attempts (minimum 2 to trigger)
      const attempts = taskAttempts.get(currentLevel) || 0
      onTaskIncorrect(problemContext, stepContext, currentLevel, Math.max(attempts, 2))

      // Notify circuit breaker of the error (switching to reading mode = giving up)
      if (onCircuitBreakerError) {
        const errorTag = inferErrorTag()
        onCircuitBreakerError(step.id, errorTag)
      }
    }

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

  // Event logging helper for reveal flow
  const logRevealFlowEvent = useCallback((eventType: string, metadata: RevealFlowEventMetadata) => {
    // Use the existing event logger with reveal flow event types
    eventLogger.log(eventType as Parameters<typeof eventLogger.log>[0], {
      ...metadata,
      stepId: step.id,
      problemId
    })
  }, [step.id, problemId])

  // Handle reveal flow completion (from RevealReconstructValidate modal)
  const handleRevealFlowComplete = useCallback((outcome: ValidationOutcome, explanation: string, level: number) => {
    const task = step.tasks.find(t => t.level === level)
    if (!task) return

    // Update learning status based on outcome
    setLevelLearningStatus(prev => {
      const newMap = new Map(prev)
      newMap.set(level, outcome === 'solid' ? 'conceptually_validated' : 'revealed_not_validated')
      return newMap
    })

    // Add to collected insights
    const alreadyCollected = collectedInsights.some(i => i.level === level)
    if (!alreadyCollected) {
      setCollectedInsights(prev => [...prev, {
        level,
        levelTitle: task.levelTitle,
        explanation
      }])
      onTaskComplete(step.id, level, explanation)
    }

    // Move to next level if this was the current level
    if (level === currentLevel && currentLevel < step.tasks.length) {
      setCurrentLevel(currentLevel + 1)
    } else if (level === currentLevel && currentLevel >= step.tasks.length) {
      onComplete(step.id)
    }

    // Close the modal
    setRevealFlowTask(null)
  }, [step.tasks, step.id, collectedInsights, currentLevel, onTaskComplete, onComplete])

  // Handle reveal flow skip (user skipped comprehension check)
  const handleRevealFlowSkip = useCallback((level: number) => {
    const task = step.tasks.find(t => t.level === level)
    if (!task) return

    // Mark as revealed but not validated
    setLevelLearningStatus(prev => {
      const newMap = new Map(prev)
      newMap.set(level, 'revealed_not_validated')
      return newMap
    })

    // Still add to collected insights (they saw the explanation)
    const alreadyCollected = collectedInsights.some(i => i.level === level)
    if (!alreadyCollected) {
      setCollectedInsights(prev => [...prev, {
        level,
        levelTitle: task.levelTitle,
        explanation: task.explanation
      }])
      onTaskComplete(step.id, level, task.explanation)
    }

    // Move to next level
    if (level === currentLevel && currentLevel < step.tasks.length) {
      setCurrentLevel(currentLevel + 1)
    } else if (level === currentLevel && currentLevel >= step.tasks.length) {
      onComplete(step.id)
    }

    // Close the modal
    setRevealFlowTask(null)
  }, [step.tasks, step.id, collectedInsights, currentLevel, onTaskComplete, onComplete])

  // Handle opening reveal flow for a specific task level
  const handleOpenRevealFlow = useCallback((taskLevel: number) => {
    const task = step.tasks.find(t => t.level === taskLevel)
    if (task) {
      setRevealFlowTask(task)
    }
  }, [step.tasks])

  // Get current task
  const currentTask = step.tasks.find(t => t.level === currentLevel)
  // Handle empty tasks array - show loading state instead of completed
  const hasNoTasks = step.tasks.length === 0
  const allTasksCompleted = !hasNoTasks && (currentLevel > step.tasks.length || isCompleted)

  // Debug logging for step tasks
  useEffect(() => {
    console.log(`[MicroTaskStepAccordion] Step ${step.id} (${step.title}): ${step.tasks.length} tasks, isActive=${isActive}, isExpanded=${isExpanded}`)
    if (step.tasks.length > 0) {
      console.log(`[MicroTaskStepAccordion] Step ${step.id} tasks:`, step.tasks.map(t => ({ level: t.level, type: t.type })))
    }
  }, [step.id, step.title, step.tasks, isActive, isExpanded])

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

  // Handler for Feynman validation result
  const handleFeynmanValidated = (passed: boolean, result: FeynmanValidationResult) => {
    setFeynmanResult(result)
    if (passed) {
      setFeynmanPassed(true)
    }
  }

  // Check if this step requires Feynman check
  const requiresFeynmanCheck = !!step.feynmanPrompt
  const showStepContent = !requiresFeynmanCheck || feynmanPassed

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
          <div className="flex items-center gap-2">
            <h3 className={`font-semibold truncate ${
              isLocked ? 'text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-200'
            }`}>
              {step.title}
            </h3>
            {/* Step Type Badge */}
            {step.stepType && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStepTypeBadge(step.stepType).bgClass} ${getStepTypeBadge(step.stepType).textClass}`}>
                {getStepTypeBadge(step.stepType).label}
              </span>
            )}
          </div>
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
          {/* Feynman Micro-Prompt - Show before step content if configured */}
          {requiresFeynmanCheck && !feynmanPassed && step.feynmanPrompt && (
            <FeynmanMicroPrompt
              config={step.feynmanPrompt}
              problemStatement={problemStatement}
              onValidated={handleFeynmanValidated}
              onSkip={() => setFeynmanPassed(true)}
            />
          )}

          {/* Feynman Passed Indicator */}
          {requiresFeynmanCheck && feynmanPassed && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Conceptual understanding verified
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  You explained WHY, now proceed with the tasks
                </p>
              </div>
            </div>
          )}

          {/* Warning Beacon - Non-spoilery hint about common mistakes */}
          {showStepContent && warningBeacon && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                  {warningBeacon.message}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5" title={`Common mistake: ${warningBeacon.tag}`}>
                  Most common mistake here
                </p>
              </div>
            </div>
          )}

          {/* Required Concepts */}
          {showStepContent && requiredConcepts.length > 0 && (
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
          {showStepContent && collectedInsights.length > 0 && !isReadingMode && (
            <CollectedInsights
              insights={collectedInsights}
              totalLevels={step.tasks.length}
            />
          )}

          {/* Loading state when tasks are empty (being fetched) */}
          {showStepContent && hasNoTasks && (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  Loading step content...
                </span>
              </div>
            </div>
          )}

          {/* Quiz Mode: Current Task Card */}
          {showStepContent && !isReadingMode && currentTask && !allTasksCompleted && !showConfidencePrompt && !hasNoTasks && (
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

          {/* Confidence Prompt - shown after correct answer when feature is enabled */}
          {showStepContent && !isReadingMode && showConfidencePrompt && pendingTaskResult && (
            <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-green-700 dark:text-green-300 font-medium">
                  Correct!
                </span>
              </div>
              <ConfidencePrompt
                isCorrect={pendingTaskResult.isCorrect}
                onRate={handleConfidenceRated}
                onSkip={handleConfidenceSkipped}
                autoSkipDelayMs={5000}
                showFeedback={true}
              />
            </div>
          )}

          {/* Reading Mode: Hint Ladder */}
          {showStepContent && isReadingMode && !allTasksCompleted && (
            <div className="space-y-2">
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <span className="font-medium">Socratic Ladder</span>
                    {useRevealFlow && (
                      <span className="px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded">
                        Structured
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setIsReadingMode(false)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Back to Quiz Mode
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Progress through each tier in order: concept → method → setup → check
                </p>
              </div>

              {/* Socratic Ladder - Hint tiers with enforcement */}
              {step.tasks.map((task) => {
                const isCollected = collectedInsights.some(i => i.level === task.level)
                const isExpanded = expandedHintLevel === task.level
                const learningStatus = levelLearningStatus.get(task.level)

                // Tier enforcement: A tier is locked if any earlier tier hasn't been read
                // Tier N is unlocked only if all tiers 1 to N-1 are collected
                const isTierLocked = step.tasks
                  .filter(t => t.level < task.level)
                  .some(t => !collectedInsights.some(i => i.level === t.level))

                // Determine the next available tier (first uncollected, unlocked tier)
                const isNextAvailable = !isCollected && !isTierLocked

                return (
                  <div
                    key={task.level}
                    className={`rounded-lg border overflow-hidden transition-all ${
                      isCollected
                        ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                        : isTierLocked
                        ? 'border-dashed border-slate-300 dark:border-slate-600 bg-slate-100/50 dark:bg-slate-800/30'
                        : isNextAvailable
                        ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/30 dark:bg-indigo-900/10'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <button
                      onClick={() => {
                        // Enforce tier order: cannot click locked tiers
                        if (isTierLocked) return

                        if (useRevealFlow && !isCollected) {
                          // Open the reveal-reconstruct-validate flow
                          handleOpenRevealFlow(task.level)
                        } else {
                          // Original behavior: expand and mark as read
                          setExpandedHintLevel(isExpanded ? null : task.level)
                          if (!isCollected) {
                            handleHintRead(task.level)
                          }
                        }
                      }}
                      disabled={isTierLocked}
                      title={isTierLocked ? `Complete Tier ${task.level - 1} first to unlock` : undefined}
                      className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                        isTierLocked
                          ? 'cursor-not-allowed opacity-50'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                          isCollected
                            ? 'bg-green-500 text-white'
                            : isTierLocked
                            ? 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
                            : isNextAvailable
                            ? 'bg-indigo-500 text-white animate-pulse'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                        }`}>
                          {isCollected ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : isTierLocked ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          ) : (
                            task.level
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium flex items-center gap-1.5 ${
                            isCollected
                              ? 'text-green-700 dark:text-green-300'
                              : isTierLocked
                              ? 'text-slate-400 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {task.levelTitle}
                            {isTierLocked && (
                              <svg className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </span>
                          {/* Tier status indicators */}
                          {isTierLocked && (
                            <span className="px-1.5 py-0.5 text-xs bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded flex items-center gap-1">
                              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                              </svg>
                              Locked
                            </span>
                          )}
                          {isNextAvailable && (
                            <span className="px-1.5 py-0.5 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded">
                              Next
                            </span>
                          )}
                          {/* Learning status badge */}
                          {learningStatus === 'revealed_not_validated' && (
                            <span className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded">
                              Explained
                            </span>
                          )}
                          {learningStatus === 'conceptually_validated' && (
                            <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                              Validated
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Show different icon based on state */}
                      {isTierLocked ? (
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      ) : useRevealFlow && !isCollected ? (
                        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      ) : (
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      )}
                    </button>

                    {/* Original inline expansion (only when feature flag is off or already collected) */}
                    {isExpanded && (!useRevealFlow || isCollected) && !isTierLocked && (
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

      {/* Reveal-Reconstruct-Validate Modal */}
      {revealFlowTask && (
        <RevealReconstructValidate
          task={revealFlowTask}
          stepTitle={step.title}
          onComplete={(outcome, explanation) => handleRevealFlowComplete(outcome, explanation, revealFlowTask.level)}
          onSkip={() => handleRevealFlowSkip(revealFlowTask.level)}
          onClose={() => setRevealFlowTask(null)}
          onLogEvent={logRevealFlowEvent}
        />
      )}
    </div>
  )
}
