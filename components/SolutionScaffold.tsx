'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { ScaffoldData } from '@/types/scaffold'
import type { StepProgress, ProblemProgress } from '@/types/history'
import { problemHistoryService } from '@/lib/problemHistory'
import { generateProblemId, generateProblemTitle } from '@/lib/utils'
import StepAccordion from './StepAccordion'
import ConceptPanel from './ConceptPanel'
import SanityCheckStep from './SanityCheckStep'

interface SolutionScaffoldProps {
  data: ScaffoldData
  onReset: () => void
}

export default function SolutionScaffold({ data, onReset }: SolutionScaffoldProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])
  const [stepAnswers, setStepAnswers] = useState<Map<number, string>>(new Map())
  const [sanityCheckAnswer, setSanityCheckAnswer] = useState('')
  const [isReviewFlagged, setIsReviewFlagged] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Generate a unique problem ID based on the problem text hash
  const problemId = useCallback(() => {
    return generateProblemId(data.problem)
  }, [data.problem])

  const problemTitle = useCallback(() => {
    return generateProblemTitle(data.problem)
  }, [data.problem])

  // Load saved progress on mount
  useEffect(() => {
    const attempt = problemHistoryService.getAttempt(problemId())
    if (attempt) {
      setIsReviewFlagged(attempt.reviewFlag)

      // Load draft or final solution
      const progress = attempt.status === 'SOLVED'
        ? problemHistoryService.loadFinalSolution(problemId())
        : problemHistoryService.loadDraft(problemId())

      if (progress) {
        const answers = new Map<number, string>()
        const completed: number[] = []

        progress.stepProgress.forEach((sp: StepProgress) => {
          if (sp.userAnswer) {
            answers.set(sp.stepId, sp.userAnswer)
          }
          if (sp.isCompleted) {
            completed.push(sp.stepId)
          }
        })

        setStepAnswers(answers)
        setCompletedSteps(completed)
        setSanityCheckAnswer(progress.sanityCheckAnswer || '')
        setCurrentStep(progress.currentStep || 0)
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
  }, [stepAnswers, completedSteps, currentStep, sanityCheckAnswer])

  const getCurrentProgress = useCallback((): ProblemProgress => {
    const stepProgress: StepProgress[] = data.steps.map((_, index) => ({
      stepId: index,
      isCompleted: completedSteps.includes(index),
      userAnswer: stepAnswers.get(index),
    }))

    return {
      problemText: data.problem,
      stepProgress,
      sanityCheckAnswer,
      currentStep,
    }
  }, [data, completedSteps, stepAnswers, sanityCheckAnswer, currentStep])

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
    setIsSaving(true)

    try {
      const progress = getCurrentProgress()
      problemHistoryService.markSolved(problemId(), problemTitle(), progress)

      setSaveMessage('Marked as solved! ✓')
      setTimeout(() => setSaveMessage(''), 3000)
      setIsSaving(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark as solved'
      console.error('Save error:', error)
      setSaveMessage(`Error: ${errorMessage}`)
      setTimeout(() => setSaveMessage(''), 4000)
      setIsSaving(false)
    }
  }, [getCurrentProgress, problemId, problemTitle])

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
                  problemStatement={data.problem}
                  onAnswerChange={(answer) => handleStepAnswerChange(index, answer)}
                  onComplete={() => handleStepComplete(index)}
                  onActivate={() => setCurrentStep(index)}
                />
              ))}
            </div>
          </div>

          {/* Sanity Check - only show after all steps completed */}
          {completedSteps.length === data.steps.length && (
            <SanityCheckStep
              sanityCheck={data.sanityCheck}
              userAnswer={sanityCheckAnswer}
              onAnswerChange={setSanityCheckAnswer}
            />
          )}
        </div>

        {/* Right sidebar - Concept panel */}
        <div className="lg:col-span-1">
          <ConceptPanel concepts={data.concepts} />
        </div>
      </div>
    </div>
  )
}
