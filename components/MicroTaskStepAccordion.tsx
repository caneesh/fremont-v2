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
import SocraticTutorChat from './SocraticTutorChat'
import MathRenderer from './MathRenderer'
import { getStepTypeBadge } from '@/lib/hintEngine'
import { onTaskIncorrect, onStepTimeout, type ProblemContext, type StepContext } from '@/lib/mistakeTriggers'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { eventLogger } from '@/lib/storage/eventLogger'
import type { Confidence } from '@/types/confidence'
import type { ErrorTag } from '@/types/circuitBreaker'
import type { TaskDifficulty } from '@/types/microTask'
import type { StepDecisionGateState } from '@/types/gatingPolicy'

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
  // Difficulty tuning callback for recording attempts
  onRecordAttempt?: (stepId: string, taskLevel: number, isCorrect: boolean, attemptNumber: number) => void
  // Get current tuned difficulty for this step
  getStepDifficulty?: (stepId: string) => TaskDifficulty
  // P0 Decision Gate props
  decisionGateState?: StepDecisionGateState | null
  onRecordDecisionGateAttempt?: (stepId: number, isCorrect: boolean) => { shouldAutoUnlockHint: boolean }
  requiresDecisionGate?: boolean
  requiredMicroTaskCount?: number
  maxTaskLevel?: number
  onSessionError?: (stepId: number) => void
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
  onCircuitBreakerError,
  onRecordAttempt,
  getStepDifficulty,
  decisionGateState,
  onRecordDecisionGateAttempt,
  requiresDecisionGate = false,
  requiredMicroTaskCount = 1,
  maxTaskLevel,
  onSessionError,
}: MicroTaskStepAccordionProps) {
  // Get the outline step ID for difficulty tuning (from phased scaffold adapter)
  const outlineStepId = (step as MicroTaskStep & { _outlineStepId?: string })._outlineStepId || `s${step.id}`

  // Get current difficulty for this step
  const currentDifficulty = getStepDifficulty?.(outlineStepId) || 'medium'
  const requestedMaxTaskLevel = maxTaskLevel ?? 5
  const resolvedMaxTaskLevel = step.tasks.length > 0
    ? Math.min(step.tasks.length, requestedMaxTaskLevel)
    : requestedMaxTaskLevel
  const availableTasks = step.tasks.filter(task => task.level <= resolvedMaxTaskLevel)
  const totalTaskLevels = step.tasks.length > 0 ? availableTasks.length : requestedMaxTaskLevel
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
    progress?.collectedInsights
      .slice(0, resolvedMaxTaskLevel)
      .map((explanation, idx) => ({
        level: idx + 1,
        levelTitle: availableTasks[idx]?.levelTitle || step.tasks[idx]?.levelTitle || 'Concept',
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

  // "Why this step?" explainer state
  const [whyStepExplanation, setWhyStepExplanation] = useState<string | null>(null)
  const [isLoadingWhyStep, setIsLoadingWhyStep] = useState(false)
  const [showWhyStep, setShowWhyStep] = useState(false)

  // Socratic Tutor (Professor Check-In) state
  const [showSocraticTutor, setShowSocraticTutor] = useState(false)
  const [pendingStepCompletion, setPendingStepCompletion] = useState(false)

  // Feature flag checks
  const useRevealFlow = FEATURE_FLAGS.REVEAL_RECONSTRUCT_VALIDATE
  const useConfidenceSRS = FEATURE_FLAGS.CONFIDENCE_WEIGHTED_SRS
  const useSocraticTutor = FEATURE_FLAGS.SOCRATIC_TUTOR_CHAT

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

  useEffect(() => {
    if (resolvedMaxTaskLevel > 0 && currentLevel > resolvedMaxTaskLevel) {
      setCurrentLevel(resolvedMaxTaskLevel)
    }
  }, [currentLevel, resolvedMaxTaskLevel])

  const handleToggle = () => {
    if (isLocked) return
    if (!isExpanded) {
      onActivate(step.id)
    }
    setIsExpanded(!isExpanded)
  }

  // Trigger step completion - shows Socratic Tutor if enabled
  const triggerStepCompletion = useCallback(() => {
    if (useSocraticTutor && !showSocraticTutor) {
      // Show professor check-in before completing
      setPendingStepCompletion(true)
      setShowSocraticTutor(true)
    } else {
      // Complete immediately
      onComplete(step.id)
      setIsExpanded(false)
    }
  }, [useSocraticTutor, showSocraticTutor, onComplete, step.id])

  // Called when Socratic tutor confirms understanding
  const handleSocraticResolved = useCallback(() => {
    setShowSocraticTutor(false)
    setPendingStepCompletion(false)
    onComplete(step.id)
    setIsExpanded(false)
  }, [onComplete, step.id])

  // Skip Socratic tutor
  const handleSocraticSkip = useCallback(() => {
    setShowSocraticTutor(false)
    setPendingStepCompletion(false)
    onComplete(step.id)
    setIsExpanded(false)
  }, [onComplete, step.id])

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
      const currentTask = availableTasks.find(t => t.level === currentLevel)
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
      if (currentLevel < resolvedMaxTaskLevel) {
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
        triggerStepCompletion()
      }
    }

    // Clear pending state
    setPendingTaskResult(null)
    setShowConfidencePrompt(false)
  }, [step.id, step.title, step.stepType, step.requiredConcepts, currentLevel, problemId, problemTitle, domain, subdomain, onTaskComplete, triggerStepCompletion, availableTasks, resolvedMaxTaskLevel])

  const handleTaskCorrect = (explanation: string) => {
    // Record attempt for difficulty tuning (correct answer)
    const attemptCount = (taskAttempts.get(currentLevel) || 0) + 1
    onRecordAttempt?.(outlineStepId, currentLevel, true, attemptCount)

    // P0 Decision Gate: Record correct attempt
    if (FEATURE_FLAGS.P0_DECISION_GATES && onRecordDecisionGateAttempt) {
      onRecordDecisionGateAttempt(step.id, true)
    }

    if (useConfidenceSRS) {
      // Show confidence prompt before proceeding
      setPendingTaskResult({ isCorrect: true, explanation, attempts: attemptCount })
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
    const task = availableTasks.find(t => t.level === currentLevel)
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

    // Record attempt for difficulty tuning (incorrect answer)
    onRecordAttempt?.(outlineStepId, currentLevel, false, attempts)
    onSessionError?.(step.id)

    // P0 Decision Gate: Record wrong attempt
    if (FEATURE_FLAGS.P0_DECISION_GATES && onRecordDecisionGateAttempt) {
      const { shouldAutoUnlockHint } = onRecordDecisionGateAttempt(step.id, false)
      if (shouldAutoUnlockHint) {
        // Auto-unlock hint after max attempts - handled by parent
        console.log('[DecisionGate] Auto-unlocking hint for step', step.id)
      }
    }

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
    onSessionError?.(step.id)

    setIsReadingMode(true)
    // Expand the first non-completed level
    const firstUncompletedLevel = availableTasks.find(t => t.level >= currentLevel)?.level || 1
    setExpandedHintLevel(firstUncompletedLevel)
  }

  const handleHintRead = (level: number) => {
    const task = availableTasks.find(t => t.level === level)
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
    if (level === currentLevel && currentLevel < resolvedMaxTaskLevel) {
      setCurrentLevel(currentLevel + 1)
    } else if (level === currentLevel && currentLevel >= resolvedMaxTaskLevel) {
      triggerStepCompletion()
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
    const task = availableTasks.find(t => t.level === level)
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
    if (level === currentLevel && currentLevel < resolvedMaxTaskLevel) {
      setCurrentLevel(currentLevel + 1)
    } else if (level === currentLevel && currentLevel >= resolvedMaxTaskLevel) {
      onComplete(step.id)
    }

    // Close the modal
    setRevealFlowTask(null)
  }, [step.id, collectedInsights, currentLevel, onTaskComplete, onComplete, availableTasks, resolvedMaxTaskLevel])

  // Handle reveal flow skip (user skipped comprehension check)
  const handleRevealFlowSkip = useCallback((level: number) => {
    const task = availableTasks.find(t => t.level === level)
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
    if (level === currentLevel && currentLevel < resolvedMaxTaskLevel) {
      setCurrentLevel(currentLevel + 1)
    } else if (level === currentLevel && currentLevel >= resolvedMaxTaskLevel) {
      onComplete(step.id)
    }

    // Close the modal
    setRevealFlowTask(null)
  }, [step.id, collectedInsights, currentLevel, onTaskComplete, onComplete, availableTasks, resolvedMaxTaskLevel])

  // Handle opening reveal flow for a specific task level
  const handleOpenRevealFlow = useCallback((taskLevel: number) => {
    const task = availableTasks.find(t => t.level === taskLevel)
    if (task) {
      setRevealFlowTask(task)
    }
  }, [availableTasks])

  // Get current task
  const currentTask = availableTasks.find(t => t.level === currentLevel)
  // Handle empty tasks array - show loading state instead of completed
  const hasNoTasks = step.tasks.length === 0
  const allTasksCompleted = !hasNoTasks && (currentLevel > resolvedMaxTaskLevel || isCompleted)

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

  // "Why this step?" handler
  const handleWhyStepClick = useCallback(async () => {
    if (whyStepExplanation) {
      // Already loaded, just toggle visibility
      setShowWhyStep(!showWhyStep)
      return
    }

    setIsLoadingWhyStep(true)
    setShowWhyStep(true)

    try {
      const response = await fetch('/api/scaffold/step/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepTitle: step.title,
          stepType: step.stepType,
          problemText: problemStatement || '',
          stepPosition: stepNumber,
          totalSteps: totalTaskLevels,
          requiredConcepts: step.requiredConcepts,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success && data.explanation) {
          setWhyStepExplanation(data.explanation)
        }
      }
    } catch (error) {
      console.error('Failed to fetch step explanation:', error)
    } finally {
      setIsLoadingWhyStep(false)
    }
  }, [whyStepExplanation, showWhyStep, step.title, step.stepType, step.requiredConcepts, totalTaskLevels, problemStatement, stepNumber])

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${getBorderColor()} ${getBackgroundColor()}`}
    >
      {/* Header - using div with role="button" to allow nested "Why?" button */}
      <div
        role="button"
        tabIndex={isLocked ? -1 : 0}
        onClick={isLocked ? undefined : handleToggle}
        onKeyDown={(e) => {
          if (!isLocked && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            handleToggle()
          }
        }}
        aria-disabled={isLocked}
        className={`w-full flex items-center gap-4 p-4 text-left transition-colors ${
          isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50'
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
            {/* Difficulty Badge */}
            {getStepDifficulty && (
              <DifficultyBadge difficulty={currentDifficulty} />
            )}
            {/* Why this step? button */}
            {!isLocked && FEATURE_FLAGS.WHY_THIS_STEP && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleWhyStepClick()
                }}
                className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-1"
                title="Learn why this step matters"
              >
                {isLoadingWhyStep ? (
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                Why?
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {/* Progress dots */}
            <div className="flex gap-1">
              {availableTasks.map((task) => (
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
              {Math.min(currentLevel - 1, totalTaskLevels)}/{totalTaskLevels} insights
            </span>
            {/* P0 Decision Gate Progress */}
            {FEATURE_FLAGS.P0_DECISION_GATES && requiresDecisionGate && decisionGateState && !decisionGateState.gatePassed && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                {decisionGateState.microTasksPassedCount}/{requiredMicroTaskCount}
              </span>
            )}
            {FEATURE_FLAGS.P0_DECISION_GATES && requiresDecisionGate && decisionGateState?.gatePassed && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Gate Passed
              </span>
            )}
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
      </div>

      {/* Why this step? explanation panel - shown when requested */}
      {showWhyStep && (
        <div className="mx-4 mb-2 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-wide">Why this step?</span>
            </div>
            <button
              onClick={() => setShowWhyStep(false)}
              className="text-purple-400 hover:text-purple-600 dark:text-purple-500 dark:hover:text-purple-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {isLoadingWhyStep ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Generating explanation...
            </div>
          ) : whyStepExplanation ? (
            <p className="mt-2 text-sm text-purple-800 dark:text-purple-200">
              {whyStepExplanation}
            </p>
          ) : (
            <p className="mt-2 text-sm text-purple-600 dark:text-purple-400 italic">
              Could not load explanation.
            </p>
          )}
        </div>
      )}

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
              totalLevels={totalTaskLevels}
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
              {availableTasks.map((task) => {
                const isCollected = collectedInsights.some(i => i.level === task.level)
                const isExpanded = expandedHintLevel === task.level
                const learningStatus = levelLearningStatus.get(task.level)

                // Tier enforcement: A tier is locked if any earlier tier hasn't been read
                // Tier N is unlocked only if all tiers 1 to N-1 are collected
                const isTierLocked = availableTasks
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
                All {totalTaskLevels} insights earned for this step.
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

/**
 * Difficulty badge component showing current adaptive difficulty level
 */
function DifficultyBadge({ difficulty }: { difficulty: TaskDifficulty }) {
  const config: Record<TaskDifficulty, { label: string; icon: string; bgClass: string; textClass: string }> = {
    easy: {
      label: 'Easy',
      icon: '○',
      bgClass: 'bg-green-100 dark:bg-green-900/30',
      textClass: 'text-green-700 dark:text-green-400',
    },
    medium: {
      label: 'Medium',
      icon: '◐',
      bgClass: 'bg-amber-100 dark:bg-amber-900/30',
      textClass: 'text-amber-700 dark:text-amber-400',
    },
    hard: {
      label: 'Hard',
      icon: '●',
      bgClass: 'bg-red-100 dark:bg-red-900/30',
      textClass: 'text-red-700 dark:text-red-400',
    },
  }

  const { label, icon, bgClass, textClass } = config[difficulty]

  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1 ${bgClass} ${textClass}`}
      title={`Difficulty: ${label} (adapts based on your performance)`}
    >
      <span className="text-[10px]">{icon}</span>
      {label}
    </span>
  )
}
