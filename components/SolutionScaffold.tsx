'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ScaffoldData } from '@/types/scaffold'
import type { StepProgress, ProblemProgress } from '@/types/history'
import { problemHistoryService } from '@/lib/problemHistory'
import { generateProblemId, generateProblemTitle } from '@/lib/utils'
import StepAccordion from './StepAccordion'
import ConceptPanel from './ConceptPanel'
import SanityCheckStep from './SanityCheckStep'
import NextChallenge from './NextChallenge'
import ReflectionStep from './ReflectionStep'
import ProblemVariations from './ProblemVariations'
import MistakeWarning from './MistakeWarning'
import ErrorPatternInsights from './ErrorPatternInsights'
import ExplainToFriend from './ExplainToFriend'
import PostSolveActivity from './PostSolveActivity'
import type { ReflectionAnswer } from '@/types/history'
import type { MistakeWarning as MistakeWarningType } from '@/types/mistakes'
import { mistakeTrackingService } from '@/lib/mistakeTracking'
import { errorPatternService } from '@/lib/errorPatternService'
import { explainToFriendService } from '@/lib/explainToFriendService'
import type { ErrorAnalysisResponse } from '@/types/errorPatterns'

interface SolutionScaffoldProps {
  data: ScaffoldData
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
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)

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
  }, [problemId])

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
  }, [stepAnswers, completedSteps, stepHintLevels, currentStep, sanityCheckAnswer])

  const getCurrentProgress = useCallback((): ProblemProgress => {
    const stepProgress: StepProgress[] = data.steps.map((_, index) => ({
      stepId: index,
      isCompleted: completedSteps.includes(index),
      userAnswer: stepAnswers.get(index),
      currentHintLevel: stepHintLevels.get(index),
    }))

    return {
      problemText: data.problem,
      stepProgress,
      sanityCheckAnswer,
      currentStep,
      reflectionAnswers: reflectionAnswers.length > 0 ? reflectionAnswers : undefined,
    }
  }, [data, completedSteps, stepAnswers, stepHintLevels, sanityCheckAnswer, currentStep, reflectionAnswers])

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

      setSaveMessage('Problem solved and reflection saved! ✓')
      setIsProblemSolved(true) // Show next challenge
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

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with problem statement and actions */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium mb-2">
              {data.domain} → {data.subdomain}
            </span>
            <h2 className="text-2xl font-semibold text-gray-900">Problem Statement</h2>
          </div>
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:border-gray-400"
          >
            ← New Problem
          </button>
        </div>
        <p className="text-gray-800 leading-relaxed text-lg mb-6">
          {data.problem}
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
          <button
            onClick={() => handleSaveDraft(false)}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Draft
          </button>

          <button
            onClick={handleMarkSolved}
            disabled={isSaving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Mark as Solved
          </button>

          <button
            onClick={handleToggleReview}
            className={`px-4 py-2 rounded-lg border-2 flex items-center gap-2 ${
              isReviewFlagged
                ? 'bg-yellow-50 border-yellow-500 text-yellow-700 hover:bg-yellow-100'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            {isReviewFlagged ? 'Marked for Review' : 'Mark for Review'}
          </button>

          {saveMessage && (
            <span className="text-sm text-green-600 font-medium ml-auto animate-fade-in">
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

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Solution Roadmap
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Work through each step. Click to expand and see hints. The framework guides you - you provide the reasoning.
            </p>

            <div className="space-y-3">
              {data.steps.map((step, index) => (
                <StepAccordion
                  key={step.id}
                  step={step}
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
              ))}
            </div>
          </div>

          {/* Sanity Check - only show after all steps completed */}
          {completedSteps.length === data.steps.length && !showExplainToFriend && !showReflection && (
            <SanityCheckStep
              sanityCheck={data.sanityCheck}
              userAnswer={sanityCheckAnswer}
              onAnswerChange={setSanityCheckAnswer}
            />
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
        <div className="lg:col-span-1">
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
    </div>
  )
}
