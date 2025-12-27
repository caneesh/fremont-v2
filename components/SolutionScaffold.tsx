'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ScaffoldData } from '@/types/scaffold'
import { isHintScaffold } from '@/types/scaffold'
import type { MicroTaskScaffoldData, MicroTaskStep } from '@/types/microTask'
import { isMicroTaskScaffold } from '@/types/microTask'
import type { StepProgress, ProblemProgress, MicroTaskStepProgress } from '@/types/history'
import { problemHistoryService } from '@/lib/problemHistory'
import { generateProblemId, generateProblemTitle } from '@/lib/utils'
import StepAccordion from './StepAccordion'
import MicroTaskStepAccordion from './MicroTaskStepAccordion'
import ConceptPanel from './ConceptPanel'
import SanityCheckStep from './SanityCheckStep'
import NextChallenge from './NextChallenge'
import ReflectionStep from './ReflectionStep'
import ProblemVariations from './ProblemVariations'
import MistakeWarning from './MistakeWarning'
import ErrorPatternInsights from './ErrorPatternInsights'
import ExplainToFriend from './ExplainToFriend'
import PostSolveActivity from './PostSolveActivity'
import Celebration from './Celebration'
import SubmissionCanvas from './SubmissionCanvas'
import type { ReflectionAnswer } from '@/types/history'
import type { GradeSolutionResponse } from '@/types/gradeSolution'
import type { MistakeWarning as MistakeWarningType } from '@/types/mistakes'
import { mistakeTrackingService } from '@/lib/mistakeTracking'
import { errorPatternService } from '@/lib/errorPatternService'
import { explainToFriendService } from '@/lib/explainToFriendService'
import type { ErrorAnalysisResponse } from '@/types/errorPatterns'
import { conceptMasteryService } from '@/lib/conceptMasteryService'
import { conceptMappingService } from '@/lib/conceptMappingService'
import { CONCEPT_NETWORK_DATA } from '@/lib/conceptNetworkData'

interface SolutionScaffoldProps {
  data: ScaffoldData | MicroTaskScaffoldData
  onReset: () => void
  onLoadNewProblem?: (problemText: string) => void
}

export default function SolutionScaffold({ data, onReset, onLoadNewProblem }: SolutionScaffoldProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [stepAnswers, setStepAnswers] = useState<Map<number, string>>(new Map())
  const [stepHintLevels, setStepHintLevels] = useState<Map<number, number>>(new Map())
  const [sanityCheckAnswer, setSanityCheckAnswer] = useState('')
  const [isReviewFlagged, setIsReviewFlagged] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [isProblemSolved, setIsProblemSolved] = useState(false)
  const [showExplainToFriend, setShowExplainToFriend] = useState(false)
  const [friendExplanation, setFriendExplanation] = useState('')
  const [friendExplanationQuality, setFriendExplanationQuality] = useState<string>('')
  const [showReflection, setShowReflection] = useState(false)
  const [reflectionAnswers, setReflectionAnswers] = useState<ReflectionAnswer[]>([])
  const [isReflectionComplete, setIsReflectionComplete] = useState(false)
  const [mistakeWarnings, setMistakeWarnings] = useState<MistakeWarningType[]>([])
  const [showWarnings, setShowWarnings] = useState(true)
  const [problemStartTime] = useState(Date.now())
  const [isAnalyzingError, setIsAnalyzingError] = useState(false)
  const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysisResponse | null>(null)
  const [showPostSolveActivity, setShowPostSolveActivity] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)
  const [highlightedStepId, setHighlightedStepId] = useState<number | null>(null)
  const [showSubmissionCanvas, setShowSubmissionCanvas] = useState(false)
  const [solutionGradeResult, setSolutionGradeResult] = useState<GradeSolutionResponse | null>(null)
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const stepRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  // Micro-task mode state
  const useMicroTasks = isMicroTaskScaffold(data)
  const [microTaskProgress, setMicroTaskProgress] = useState<Map<number, MicroTaskStepProgress>>(new Map())

  // Handlers for micro-task mode
  const handleMicroTaskComplete = useCallback((stepId: number, level: number, explanation: string) => {
    setMicroTaskProgress(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(stepId) || {
        stepId,
        isCompleted: false,
        currentLevel: 1,
        taskAttempts: [],
        collectedInsights: []
      }

      current.taskAttempts.push({ level, attempts: 1, isCompleted: true })
      current.currentLevel = level + 1
      current.collectedInsights.push(explanation)

      // Check if all tasks are completed for this step
      const microData = data as MicroTaskScaffoldData
      const step = microData.steps.find(s => s.id === stepId)
      if (step && current.currentLevel > step.tasks.length) {
        current.isCompleted = true
      }

      newMap.set(stepId, current)
      return newMap
    })
  }, [data])

  const handleMicroStepComplete = useCallback((stepId: number) => {
    // Mark step as completed
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId])
    }
    // Move to next step
    const stepIndex = (data as MicroTaskScaffoldData).steps.findIndex(s => s.id === stepId)
    if (stepIndex < (data as MicroTaskScaffoldData).steps.length - 1) {
      setCurrentStep(stepIndex + 1)
    }
  }, [completedSteps, data])

  // Generate a unique problem ID based on the problem text hash
  const problemId = useCallback(() => {
    return generateProblemId(data.problem)
  }, [data.problem])

  const problemTitle = useCallback(() => {
    return generateProblemTitle(data.problem)
  }, [data.problem])

  // Load saved progress and generate mistake warnings on mount
  useEffect(() => {
    // Generate warnings based on past patterns
    const warnings = mistakeTrackingService.generateWarnings(
      data.concepts,
      `${data.domain} - ${data.subdomain}`
    )
    setMistakeWarnings(warnings)

    const attempt = problemHistoryService.getAttempt(problemId())
    if (attempt) {
      setIsReviewFlagged(attempt.reviewFlag)

      // If problem was previously solved, set the solved state
      if (attempt.status === 'SOLVED') {
        setIsProblemSolved(true)
      }

      // Load draft or final solution
      const progress = attempt.status === 'SOLVED'
        ? problemHistoryService.loadFinalSolution(problemId())
        : problemHistoryService.loadDraft(problemId())

      if (progress) {
        const answers = new Map<number, string>()
        const completed: number[] = []
        const hintLevels = new Map<number, number>()

        progress.stepProgress.forEach((sp: StepProgress) => {
          if (sp.userAnswer) {
            answers.set(sp.stepId, sp.userAnswer)
          }
          if (sp.isCompleted) {
            completed.push(sp.stepId)
          }
          if (sp.currentHintLevel) {
            hintLevels.set(sp.stepId, sp.currentHintLevel)
          }
        })

        setStepAnswers(answers)
        setCompletedSteps(completed)
        setStepHintLevels(hintLevels)
        setSanityCheckAnswer(progress.sanityCheckAnswer || '')
        setCurrentStep(progress.currentStep || 0)

        // Load reflection if it exists
        if (progress.reflectionAnswers && progress.reflectionAnswers.length > 0) {
          setReflectionAnswers(progress.reflectionAnswers)
          setIsReflectionComplete(true)
        }

        // Load micro-task progress if it exists
        if (progress.useMicroTasks && progress.microTaskProgress) {
          const microProgress = new Map<number, MicroTaskStepProgress>()
          progress.microTaskProgress.forEach(mp => {
            microProgress.set(mp.stepId, mp)
          })
          setMicroTaskProgress(microProgress)
        }
      }
    }

    // Update last opened timestamp
    problemHistoryService.updateLastOpened(problemId())

    // Cleanup autosave on unmount
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, data.concepts, data.domain, data.subdomain])

  // Autosave every 30 seconds
  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current)
    }

    autosaveTimerRef.current = setTimeout(() => {
      handleSaveDraft(true) // silent autosave
    }, 30000)

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepAnswers, completedSteps, stepHintLevels, currentStep, sanityCheckAnswer, microTaskProgress])

  const getCurrentProgress = useCallback((): ProblemProgress => {
    const stepProgress: StepProgress[] = data.steps.map((_, index) => ({
      stepId: index,
      isCompleted: completedSteps.includes(index),
      userAnswer: stepAnswers.get(index),
      currentHintLevel: stepHintLevels.get(index),
    }))

    const progress: ProblemProgress = {
      problemText: data.problem,
      stepProgress,
      sanityCheckAnswer,
      currentStep,
      reflectionAnswers: reflectionAnswers.length > 0 ? reflectionAnswers : undefined,
    }

    // Include micro-task progress if in micro-task mode
    if (useMicroTasks && microTaskProgress.size > 0) {
      progress.useMicroTasks = true
      progress.microTaskProgress = Array.from(microTaskProgress.values())
    }

    return progress
  }, [data, completedSteps, stepAnswers, stepHintLevels, sanityCheckAnswer, currentStep, reflectionAnswers, useMicroTasks, microTaskProgress])

  const handleSaveDraft = useCallback((silent = false) => {
    if (!silent) setIsSaving(true)

    try {
      const progress = getCurrentProgress()
      problemHistoryService.saveDraft(problemId(), problemTitle(), progress)

      if (!silent) {
        setSaveMessage('Draft saved!')
        setTimeout(() => setSaveMessage(''), 2000)
        setIsSaving(false)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save draft'
      console.error('Save error:', error)
      if (!silent) {
        setSaveMessage(`Error: ${errorMessage}`)
        setTimeout(() => setSaveMessage(''), 4000)
        setIsSaving(false)
      }
    }
  }, [getCurrentProgress, problemId, problemTitle])

  const handleMarkSolved = useCallback(() => {
    // Show Explain to a Friend first (Feynman Technique)
    setShowExplainToFriend(true)
    setSaveMessage('Explain the solution to proceed')
    setTimeout(() => setSaveMessage(''), 3000)
  }, [])

  const handleExplainToFriendComplete = useCallback((explanation: string, quality: string) => {
    setFriendExplanation(explanation)
    setFriendExplanationQuality(quality)
    setShowExplainToFriend(false)

    // Record explanation
    if (typeof window !== 'undefined') {
      const studentId = localStorage.getItem('physiscaffold_user') || 'anonymous'
      explainToFriendService.recordExplanation(
        studentId,
        problemId(),
        explanation,
        quality as 'excellent' | 'good' | 'needs_work',
        undefined
      )
    }

    // Now show reflection
    setShowReflection(true)
    setSaveMessage('Complete reflection before finalizing')
    setTimeout(() => setSaveMessage(''), 3000)
  }, [problemId])

  const handleSkipExplanation = useCallback(() => {
    // Allow skipping but note it
    setShowExplainToFriend(false)
    setShowReflection(true)
    setSaveMessage('Skipped explanation - Complete reflection')
    setTimeout(() => setSaveMessage(''), 3000)
  }, [])

  // Analyze error patterns when student struggled
  const analyzeErrorPattern = useCallback(async (
    studentAttempt: string,
    correctApproach: string,
    hintsUsed: number
  ) => {
    setIsAnalyzingError(true)
    try {
      const response = await fetch('/api/analyze-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemText: data.problem,
          studentAttempt,
          correctApproach,
          topic: `${data.domain} - ${data.subdomain}`,
          hintsUsed,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze error pattern')
      }

      const analysis: ErrorAnalysisResponse = await response.json()
      setErrorAnalysis(analysis)

      // Record the highest-confidence pattern
      if (analysis.patterns.length > 0 && typeof window !== 'undefined') {
        const studentId = localStorage.getItem('physiscaffold_user') || 'anonymous'
        const topPattern = analysis.patterns.reduce((prev, current) =>
          current.confidence > prev.confidence ? current : prev
        )

        if (topPattern.confidence >= 0.6) { // Only record if confidence is high enough
          const timeSpent = Date.now() - problemStartTime
          const allHintLevels = Array.from(stepHintLevels.values())
          const maxHintLevel = allHintLevels.length > 0 ? Math.max(...allHintLevels) : 0

          errorPatternService.recordError(
            studentId,
            topPattern.patternId,
            problemId(),
            data.problem,
            studentAttempt,
            correctApproach,
            {
              topic: `${data.domain} - ${data.subdomain}`,
              difficulty: maxHintLevel >= 5 ? 'hard' : maxHintLevel >= 3 ? 'medium' : 'easy',
              hintsUsed,
              timeSpent: Math.floor(timeSpent / 1000), // Convert to seconds
            }
          )
        }
      }

      return analysis
    } catch (error) {
      console.error('Error analyzing pattern:', error)
      return null
    } finally {
      setIsAnalyzingError(false)
    }
  }, [data, problemId, problemStartTime, stepHintLevels])

  const handleReflectionComplete = useCallback(async (reflections: ReflectionAnswer[]) => {
    setReflectionAnswers(reflections)
    setIsReflectionComplete(true)
    setIsSaving(true)

    try {
      const progress = getCurrentProgress()
      // Update progress with reflections
      const progressWithReflection = {
        ...progress,
        reflectionAnswers: reflections,
      }

      problemHistoryService.markSolved(problemId(), problemTitle(), progressWithReflection)

      // Record mistake pattern for tracking
      const allHintLevels = Array.from(stepHintLevels.values())
      const maxHintLevel = allHintLevels.length > 0 ? Math.max(...allHintLevels) : 0
      const timeSpent = Date.now() - problemStartTime

      // Record pattern for each concept
      data.concepts.forEach(concept => {
        mistakeTrackingService.recordPattern({
          conceptId: concept.id,
          conceptName: concept.name,
          problemType: `${data.domain} - ${data.subdomain}`,
          struggledSteps: completedSteps.filter((_, idx) => (stepHintLevels.get(idx) || 0) >= 4),
          maxHintLevelUsed: maxHintLevel,
          timeSpent,
          timestamp: new Date().toISOString(),
          commonMistake: reflections[0]?.answer.substring(0, 100), // First reflection as mistake indicator
        })
      })

      // Analyze error patterns if student struggled (used hints level 3+)
      if (maxHintLevel >= 3 && reflections.length > 0) {
        const studentAttempt = reflections.find(r => r.question.includes('mistake'))?.answer || ''
        const correctApproach = data.steps.map((s, idx) => `${idx + 1}. ${s.title}`).join('\n')

        if (studentAttempt) {
          // Trigger error pattern analysis (async, don't block)
          analyzeErrorPattern(studentAttempt, correctApproach, maxHintLevel).catch(err => {
            console.error('Error pattern analysis failed:', err)
          })
        }
      }

      // Update concept mastery tracking
      if (typeof window !== 'undefined') {
        const studentId = localStorage.getItem('physiscaffold_user') || 'anonymous'
        const currentProblemId = problemId()

        // Map AI concepts to network concepts
        const networkConcepts = CONCEPT_NETWORK_DATA.network.nodes
        const conceptMapping = conceptMappingService.mapConcepts(
          data.concepts,
          networkConcepts
        )

        // Process each step to track concept mastery
        data.steps.forEach((step, stepIdx) => {
          const stepHintLevel = stepHintLevels.get(stepIdx) || 0
          const stepCompleted = completedSteps.includes(stepIdx)

          // Record mastery for each concept used in this step
          step.requiredConcepts.forEach(aiConceptId => {
            const aiConcept = data.concepts.find(c => c.id === aiConceptId)
            if (!aiConcept) return

            // Get mapped network concept ID (or use AI concept ID if unmapped)
            const networkConceptId = conceptMapping.get(aiConceptId) || aiConceptId

            // Record the attempt
            conceptMasteryService.recordAttempt(
              studentId,
              networkConceptId,
              aiConcept.name,
              {
                problemId: currentProblemId,
                hintLevel: stepHintLevel,
                timeSpent: timeSpent / data.steps.length, // Distribute time across steps
                success: stepCompleted && stepHintLevel < 5, // Success if completed without max hints
              }
            )
          })
        })

        // Cleanup old concept mastery data periodically (every 10th problem)
        const problemCount = problemHistoryService.getHistory().total
        if (problemCount % 10 === 0) {
          conceptMasteryService.cleanup(studentId)
        }
      }

      setSaveMessage('Problem solved and reflection saved!')
      setIsProblemSolved(true) // Show next challenge
      setShowCelebration(true) // Trigger celebration animation
      setTimeout(() => setSaveMessage(''), 3000)
      setIsSaving(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save'
      console.error('Save error:', error)
      setSaveMessage(`Error: ${errorMessage}`)
      setTimeout(() => setSaveMessage(''), 4000)
      setIsSaving(false)
    }
  }, [getCurrentProgress, problemId, problemTitle, stepHintLevels, completedSteps, data, problemStartTime, analyzeErrorPattern])

  // Show post-solve activity popup RANDOMLY after problem is solved
  useEffect(() => {
    if (isProblemSolved && isReflectionComplete && !showPostSolveActivity) {
      // Random chance: 40% probability of showing the popup
      // You can also use other logic like:
      // - Show after every N problems: (problemCount % 3 === 0)
      // - Show based on prime numbers, even numbers, etc.
      const shouldShow = Math.random() < 0.4 // 40% chance

      if (shouldShow) {
        // Small delay to let the user see the completion message
        const timer = setTimeout(() => {
          setShowPostSolveActivity(true)
        }, 1500)
        return () => clearTimeout(timer)
      }
    }
  }, [isProblemSolved, isReflectionComplete, showPostSolveActivity])

  // Calculate student outcome based on hint usage
  const getStudentOutcome = useCallback((): 'solved' | 'assisted' | 'struggled' => {
    const allHintLevels = Array.from(stepHintLevels.values())
    if (allHintLevels.length === 0) return 'solved'

    const maxHintLevel = Math.max(...allHintLevels)

    if (maxHintLevel === 5) return 'struggled'
    if (maxHintLevel >= 3) return 'assisted'
    return 'solved'
  }, [stepHintLevels])

  const getAllHintsUsed = useCallback((): number[] => {
    return Array.from(stepHintLevels.values())
  }, [stepHintLevels])

  const handleToggleReview = useCallback(() => {
    try {
      const newFlag = !isReviewFlagged
      setIsReviewFlagged(newFlag)
      problemHistoryService.toggleReview(problemId())

      setSaveMessage(newFlag ? 'Marked for review 📌' : 'Unmarked for review')
      setTimeout(() => setSaveMessage(''), 2000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle review'
      console.error('Toggle review error:', error)
      setSaveMessage(`Error: ${errorMessage}`)
      setTimeout(() => setSaveMessage(''), 4000)
    }
  }, [isReviewFlagged, problemId])

  const handleStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId])
    }
    if (stepId < data.steps.length - 1) {
      setCurrentStep(stepId + 1)
    }
  }

  const handleStepAnswerChange = (stepId: number, answer: string) => {
    setStepAnswers(prev => {
      const newMap = new Map(prev)
      newMap.set(stepId, answer)
      return newMap
    })
  }

  const handleHintLevelChange = (stepId: number, level: number) => {
    setStepHintLevels(prev => {
      const newMap = new Map(prev)
      newMap.set(stepId, level)
      return newMap
    })
  }

  // Handle targeted rewind from Socratic Debugger
  const handleTargetStep = useCallback((stepId: number) => {
    // Convert 1-based stepId to 0-based index
    const stepIndex = stepId - 1
    if (stepIndex < 0 || stepIndex >= data.steps.length) return

    // Set the highlighted step
    setHighlightedStepId(stepIndex)

    // Scroll to the step
    const stepElement = stepRefs.current.get(stepIndex)
    if (stepElement) {
      stepElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // Remove highlight after 5 seconds
    setTimeout(() => {
      setHighlightedStepId(null)
    }, 5000)
  }, [data.steps.length])

  // Handle sanity check solved
  const handleSanityCheckSolved = useCallback(() => {
    // Trigger celebration and allow proceeding to Mark as Solved
    setShowCelebration(true)
  }, [])

  // Handle solution grade complete
  const handleGradeComplete = useCallback((result: GradeSolutionResponse) => {
    setSolutionGradeResult(result)
    if (result.status === 'SUCCESS') {
      setShowCelebration(true)
    }
  }, [])

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with problem statement and actions */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-4 sm:p-6 mb-6 border border-transparent dark:border-dark-border">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4">
          <div>
            <span className="inline-block px-3 py-1 bg-primary-100 dark:bg-accent/20 text-primary-700 dark:text-accent rounded-full text-sm font-medium mb-2">
              {data.domain} → {data.subdomain}
            </span>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-dark-text-primary">Problem Statement</h2>
          </div>
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary border border-gray-300 dark:border-dark-border rounded-lg hover:border-gray-400 dark:hover:border-dark-border-strong hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors"
          >
            ← New Problem
          </button>
        </div>
        <p className="text-gray-800 dark:text-dark-text-secondary leading-relaxed text-base sm:text-lg mb-6">
          {data.problem}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
          <button
            onClick={() => handleSaveDraft(false)}
            disabled={isSaving}
            className="px-3 sm:px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-900/30 disabled:text-blue-100 flex items-center gap-2 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden">Save</span>
          </button>

          <button
            onClick={handleMarkSolved}
            disabled={isSaving}
            className="px-3 sm:px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-green-300 dark:disabled:bg-green-900/30 disabled:text-green-100 flex items-center gap-2 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden sm:inline">Mark as Solved</span>
            <span className="sm:hidden">Solved</span>
          </button>

          <button
            onClick={handleToggleReview}
            className={`px-3 sm:px-4 py-2 rounded-lg border flex items-center gap-2 text-sm transition-colors ${
              isReviewFlagged
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                : 'bg-white dark:bg-dark-card-soft border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="hidden sm:inline">{isReviewFlagged ? 'Marked for Review' : 'Mark for Review'}</span>
            <span className="sm:hidden">{isReviewFlagged ? 'Review' : 'Review'}</span>
          </button>

          {saveMessage && (
            <span className="text-sm text-green-600 dark:text-green-400 font-medium ml-auto animate-fade-in">
              {saveMessage}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main solving area - Steps */}
        <div className="lg:col-span-3 space-y-4">
          {/* Mistake Warnings */}
          {showWarnings && mistakeWarnings.length > 0 && (
            <MistakeWarning
              warnings={mistakeWarnings}
              onDismiss={() => setShowWarnings(false)}
            />
          )}

          <div className="demo-step-steps bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-4 sm:p-6 border border-transparent dark:border-dark-border">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
              Solution Roadmap
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-muted mb-6">
              Work through each step. Click to expand and see hints. The framework guides you - you provide the reasoning.
            </p>

            <div className="space-y-3">
              {data.steps.map((step, index) => (
                <div
                  key={step.id}
                  ref={(el) => {
                    if (el) stepRefs.current.set(index, el)
                  }}
                  className={`transition-all duration-500 ${
                    highlightedStepId === index
                      ? 'ring-4 ring-yellow-400 dark:ring-yellow-500 ring-offset-2 dark:ring-offset-dark-card rounded-lg shadow-lg shadow-yellow-200 dark:shadow-yellow-900/30'
                      : ''
                  }`}
                >
                  {useMicroTasks ? (
                    <MicroTaskStepAccordion
                      step={step as MicroTaskStep}
                      stepNumber={index + 1}
                      isActive={currentStep === index}
                      isCompleted={completedSteps.includes(index)}
                      isLocked={index > 0 && !completedSteps.includes(index - 1)}
                      concepts={data.concepts}
                      progress={microTaskProgress.get(step.id)}
                      problemStatement={data.problem}
                      onTaskComplete={handleMicroTaskComplete}
                      onComplete={handleMicroStepComplete}
                      onActivate={() => setCurrentStep(index)}
                    />
                  ) : (
                    <StepAccordion
                      step={step as import('@/types/scaffold').Step}
                      stepNumber={index + 1}
                      isActive={currentStep === index}
                      isCompleted={completedSteps.includes(index)}
                      isLocked={index > 0 && !completedSteps.includes(index - 1)}
                      concepts={data.concepts}
                      userAnswer={stepAnswers.get(index) || ''}
                      currentHintLevel={stepHintLevels.get(index) || 0}
                      problemStatement={data.problem}
                      onAnswerChange={(answer) => handleStepAnswerChange(index, answer)}
                      onComplete={() => handleStepComplete(index)}
                      onActivate={() => setCurrentStep(index)}
                      onHintLevelChange={(level) => handleHintLevelChange(index, level)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Solution Section - always visible after first step */}
          {completedSteps.length > 0 && !showExplainToFriend && !showReflection && (
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-4 sm:p-6 border border-transparent dark:border-dark-border">
              <button
                onClick={() => setShowSubmissionCanvas(!showSubmissionCanvas)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    solutionGradeResult?.status === 'SUCCESS'
                      ? 'bg-green-500/20 text-green-400'
                      : solutionGradeResult?.status === 'MINOR_SLIP'
                      ? 'bg-amber-500/20 text-amber-400'
                      : solutionGradeResult?.status === 'CONCEPTUAL_GAP'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {solutionGradeResult?.status === 'SUCCESS' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                      {solutionGradeResult ? 'Solution Graded' : 'Submit Your Solution'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-dark-text-muted">
                      {solutionGradeResult
                        ? `Status: ${solutionGradeResult.status.replace('_', ' ')}`
                        : 'Type or scan your handwritten solution for AI grading'}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${showSubmissionCanvas ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showSubmissionCanvas && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                  <SubmissionCanvas
                    problemText={data.problem}
                    domain={data.domain}
                    subdomain={data.subdomain}
                    concepts={data.concepts}
                    onGradeComplete={handleGradeComplete}
                  />
                </div>
              )}
            </div>
          )}

          {/* Sanity Check - only show after all steps completed */}
          {completedSteps.length === data.steps.length && !showExplainToFriend && !showReflection && (
            <div className="demo-step-sanity">
              <SanityCheckStep
                sanityCheck={data.sanityCheck}
                userAnswer={sanityCheckAnswer}
                onAnswerChange={setSanityCheckAnswer}
                problemText={data.problem}
                domain={data.domain}
                subdomain={data.subdomain}
                steps={data.steps}
                concepts={data.concepts}
                onTargetStep={handleTargetStep}
                onSolved={handleSanityCheckSolved}
              />
            </div>
          )}

          {/* Explain to a Friend - Feynman Technique (before reflection) */}
          {showExplainToFriend && (
            <ExplainToFriend
              problemText={data.problem}
              steps={data.steps.map(s => s.title)}
              topic={`${data.domain} - ${data.subdomain}`}
              onComplete={handleExplainToFriendComplete}
              onSkip={handleSkipExplanation}
            />
          )}

          {/* Reflection - show after explaining to a friend */}
          {showReflection && !isReflectionComplete && (
            <ReflectionStep
              problemText={data.problem}
              studentOutcome={getStudentOutcome()}
              hintsUsed={getAllHintsUsed()}
              savedReflections={reflectionAnswers.length > 0 ? reflectionAnswers : undefined}
              onReflectionComplete={handleReflectionComplete}
            />
          )}

          {/* Error Pattern Insights - show after reflection is complete */}
          {isProblemSolved && isReflectionComplete && typeof window !== 'undefined' && (
            <ErrorPatternInsights
              studentId={localStorage.getItem('physiscaffold_user') || 'anonymous'}
              maxInsights={3}
            />
          )}

          {/* Practice Options - show after reflection is complete */}
          {isProblemSolved && isReflectionComplete && (
            <div className="space-y-4">
              {/* Problem Variations - Practice same concept */}
              <ProblemVariations
                originalProblem={data.problem}
                coreConcept={`${data.domain} - ${data.subdomain}`}
                onSelectVariation={(problemText) => {
                  if (onLoadNewProblem) {
                    onReset() // Clear current problem
                    onLoadNewProblem(problemText) // Load variation
                  }
                }}
              />

              {/* Next Challenge - Progressive difficulty */}
              {onLoadNewProblem && (
                <NextChallenge
                  currentProblem={data.problem}
                  topicTags={[data.domain, data.subdomain]}
                  onAcceptChallenge={(problemText) => {
                    onReset() // Clear current problem
                    onLoadNewProblem(problemText) // Load next challenge
                  }}
                />
              )}
            </div>
          )}
        </div>

        {/* Right sidebar - Concept panel */}
        <div className="demo-step-concepts lg:col-span-1">
          <ConceptPanel concepts={data.concepts} />
        </div>
      </div>

      {/* Post-Solve Activity Popup */}
      {showPostSolveActivity && (
        <PostSolveActivity
          problemText={data.problem}
          onDismiss={() => setShowPostSolveActivity(false)}
        />
      )}

      {/* Celebration Animation */}
      <Celebration
        show={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />
    </div>
  )
}
