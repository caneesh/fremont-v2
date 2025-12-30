'use client'

import { useState, useEffect } from 'react'
import type { MicroTask, MultipleChoiceTask, FillBlankTask } from '@/types/microTask'
import type {
  RevealBundle,
  ReconstructQuestion,
  ValidationOutcome,
  QuestionResult,
  RevealFlowEventMetadata
} from '@/types/revealFlow'
import {
  generateRevealBundleFromTask,
  generateReconstructFromTask,
  determineValidationOutcome,
  generateValidationFeedback
} from '@/types/revealFlow'
import MathRenderer from '../MathRenderer'

type RevealStage = 'reveal' | 'reconstruct' | 'validate'

interface RevealReconstructValidateProps {
  task: MicroTask
  stepTitle: string
  onComplete: (outcome: ValidationOutcome, explanation: string) => void
  onSkip: () => void
  onClose: () => void
  onLogEvent?: (eventType: string, metadata: RevealFlowEventMetadata) => void
}

/**
 * RevealReconstructValidate - A 3-stage learning modal for reading mode
 *
 * Stage A: REVEAL - Show structured explanation
 * Stage B: RECONSTRUCT - Comprehension check question(s)
 * Stage C: VALIDATE - Feedback based on answer
 */
export default function RevealReconstructValidate({
  task,
  stepTitle,
  onComplete,
  onSkip,
  onClose,
  onLogEvent
}: RevealReconstructValidateProps) {
  const [stage, setStage] = useState<RevealStage>('reveal')
  const [showMoreDetail, setShowMoreDetail] = useState(false)
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [questionResults, setQuestionResults] = useState<QuestionResult[]>([])
  const [validationOutcome, setValidationOutcome] = useState<ValidationOutcome | null>(null)
  const [showSkipConfirm, setShowSkipConfirm] = useState(false)

  // Generate reveal bundle from task
  const revealBundle: RevealBundle = generateRevealBundleFromTask(
    task.levelTitle,
    task.explanation,
    stepTitle
  )

  // Generate reconstruct question from task
  const reconstructQuestion: ReconstructQuestion = (() => {
    if (task.type === 'MULTIPLE_CHOICE') {
      const mcTask = task as MultipleChoiceTask
      return generateReconstructFromTask(
        `${task.level}`,
        'MULTIPLE_CHOICE',
        mcTask.question,
        mcTask.options.map((opt, idx) => ({ id: String.fromCharCode(97 + idx), text: opt })),
        String.fromCharCode(97 + mcTask.correctIndex),
        task.explanation
      )
    } else {
      const fbTask = task as FillBlankTask
      const distractors = Array.isArray(fbTask.distractors) ? fbTask.distractors : []
      const allOptions = [fbTask.correctTerm, ...distractors].sort()
      return generateReconstructFromTask(
        `${task.level}`,
        'FILL_BLANK',
        fbTask.question,
        allOptions.map((opt, idx) => ({ id: String.fromCharCode(97 + idx), text: opt })),
        String.fromCharCode(97 + allOptions.indexOf(fbTask.correctTerm)),
        task.explanation
      )
    }
  })()

  // Log events
  useEffect(() => {
    onLogEvent?.('reveal_opened', { stepId: 0, levelId: task.level })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleProceedToReconstruct = () => {
    onLogEvent?.('reveal_explanation_shown', { stepId: 0, levelId: task.level })
    setStage('reconstruct')
  }

  const handleAnswerSubmit = () => {
    if (!selectedOption) return

    const isCorrect = selectedOption === reconstructQuestion.correctOptionId
    const result: QuestionResult = {
      questionId: reconstructQuestion.id,
      selectedOptionId: selectedOption,
      isCorrect
    }

    onLogEvent?.('reconstruct_question_answered', {
      stepId: 0,
      levelId: task.level,
      questionId: reconstructQuestion.id,
      selectedOptionId: selectedOption,
      isCorrect
    })

    const allResults = [...questionResults, result]
    setQuestionResults(allResults)

    const outcome = determineValidationOutcome(allResults)
    setValidationOutcome(outcome)

    onLogEvent?.('reconstruct_completed', {
      stepId: 0,
      levelId: task.level,
      outcome
    })

    if (outcome !== 'solid') {
      onLogEvent?.('concept_confusion_detected', {
        stepId: 0,
        levelId: task.level,
        conceptTag: task.levelTitle
      })
    }

    setStage('validate')
  }

  const handleTryAgain = () => {
    setSelectedOption(null)
    setValidationOutcome(null)
    setQuestionResults([])
    setStage('reconstruct')
  }

  const handleComplete = () => {
    onLogEvent?.('reveal_closed', { stepId: 0, levelId: task.level })
    onComplete(validationOutcome || 'mismatch', task.explanation)
  }

  const handleSkipCheckpoint = () => {
    if (!showSkipConfirm) {
      setShowSkipConfirm(true)
      return
    }
    onLogEvent?.('reveal_closed', { stepId: 0, levelId: task.level })
    onSkip()
  }

  const handleCloseModal = () => {
    onLogEvent?.('reveal_closed', { stepId: 0, levelId: task.level })
    onClose()
  }

  const getOutcomeStyles = (outcome: ValidationOutcome) => {
    switch (outcome) {
      case 'solid':
        return {
          bg: 'bg-green-50 dark:bg-green-900/20',
          border: 'border-green-200 dark:border-green-800',
          text: 'text-green-700 dark:text-green-300',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Solid Understanding'
        }
      case 'partial':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          text: 'text-amber-700 dark:text-amber-300',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          label: 'Partial Understanding'
        }
      case 'mismatch':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-300',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          label: 'Needs Review'
        }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-dark-lg overflow-hidden animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              {stage === 'reveal' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              )}
              {stage === 'reconstruct' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {stage === 'validate' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className="font-semibold">Level {task.level}: {task.levelTitle}</h3>
              <p className="text-sm text-white/80">
                {stage === 'reveal' && 'Understanding the concept'}
                {stage === 'reconstruct' && 'Quick comprehension check'}
                {stage === 'validate' && 'Your result'}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 px-6 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600">
          {(['reveal', 'reconstruct', 'validate'] as RevealStage[]).map((s, idx) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                stage === s
                  ? 'bg-indigo-500 text-white'
                  : ['reveal', 'reconstruct', 'validate'].indexOf(stage) > idx
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-400'
              }`}>
                {['reveal', 'reconstruct', 'validate'].indexOf(stage) > idx ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span className={`text-xs font-medium ${
                stage === s ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'
              }`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </span>
              {idx < 2 && (
                <div className={`w-8 h-0.5 ${
                  ['reveal', 'reconstruct', 'validate'].indexOf(stage) > idx
                    ? 'bg-green-500'
                    : 'bg-slate-200 dark:bg-slate-600'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Stage A: REVEAL */}
          {stage === 'reveal' && (
            <div className="space-y-4">
              {revealBundle.sections.map((section, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                >
                  <h4 className="font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
                    {section.title}
                  </h4>
                  <div className="text-slate-700 dark:text-slate-300">
                    <MathRenderer text={section.content} />
                  </div>
                </div>
              ))}

              {/* Show more detail (collapsed) */}
              {revealBundle.moreDetail && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowMoreDetail(!showMoreDetail)}
                    className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${showMoreDetail ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    {showMoreDetail ? 'Hide' : 'Show'} full explanation
                  </button>
                  {showMoreDetail && (
                    <div className="mt-3 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                      <MathRenderer text={revealBundle.moreDetail} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Stage B: RECONSTRUCT */}
          {stage === 'reconstruct' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Quick Check
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Answer this to confirm you understood the concept.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  <MathRenderer text={reconstructQuestion.prompt} />
                </div>

                <div className="space-y-2">
                  {reconstructQuestion.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSelectedOption(option.id)}
                      className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                        selectedOption === option.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                          : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          selectedOption === option.id
                            ? 'border-indigo-500 bg-indigo-500 text-white'
                            : 'border-slate-300 dark:border-slate-500'
                        }`}>
                          {selectedOption === option.id && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-slate-700 dark:text-slate-300">
                          <MathRenderer text={option.text} />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stage C: VALIDATE */}
          {stage === 'validate' && validationOutcome && (
            <div className="space-y-4">
              {(() => {
                const styles = getOutcomeStyles(validationOutcome)
                return (
                  <div className={`p-4 rounded-lg ${styles.bg} border ${styles.border}`}>
                    <div className="flex items-start gap-3">
                      <div className={styles.text}>{styles.icon}</div>
                      <div>
                        <p className={`font-semibold ${styles.text}`}>
                          {styles.label}
                        </p>
                        <p className={`text-sm mt-1 ${styles.text}`}>
                          {generateValidationFeedback(
                            validationOutcome,
                            reconstructQuestion.explainCorrect,
                            reconstructQuestion.explainWrong
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Show correct answer for partial/mismatch */}
              {validationOutcome !== 'solid' && (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    The correct answer was:
                  </p>
                  <div className="font-medium text-slate-800 dark:text-slate-200">
                    <MathRenderer
                      text={reconstructQuestion.options.find(o => o.id === reconstructQuestion.correctOptionId)?.text || ''}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-600">
          <div className="flex items-center justify-between">
            {/* Skip option (with 2-click confirm) */}
            {stage !== 'validate' && (
              <button
                onClick={handleSkipCheckpoint}
                className={`text-sm transition-colors ${
                  showSkipConfirm
                    ? 'text-red-600 dark:text-red-400 font-medium'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {showSkipConfirm ? 'Click again to confirm skip' : 'Skip checkpoint'}
              </button>
            )}
            {stage === 'validate' && <div />}

            {/* Primary actions */}
            <div className="flex items-center gap-3">
              {stage === 'reveal' && (
                <button
                  onClick={handleProceedToReconstruct}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  I understand, continue
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}

              {stage === 'reconstruct' && (
                <button
                  onClick={handleAnswerSubmit}
                  disabled={!selectedOption}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  Check answer
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </button>
              )}

              {stage === 'validate' && (
                <>
                  {validationOutcome !== 'solid' && (
                    <button
                      onClick={handleTryAgain}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-500 text-slate-700 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                    >
                      Try again
                    </button>
                  )}
                  <button
                    onClick={handleComplete}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      validationOutcome === 'solid'
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-slate-600 hover:bg-slate-700 text-white'
                    }`}
                  >
                    {validationOutcome === 'solid' ? 'Continue' : 'Close'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
