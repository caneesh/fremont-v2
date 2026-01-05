'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type {
  SocraticDialoguePhase,
  SocraticDialogueState,
  SocraticStepDialogueProps,
  SocraticExchangeRecord,
  SocraticMasteryResult,
  SelfReportConfidence,
  VerificationResult,
  FinalUnderstanding,
  CalibrationAdjustment,
  SocraticQuestionType,
  MCQOption,
} from '@/types/socraticFirst'
import SocraticExchange from './micro-tasks/SocraticExchange'
import StuckModePanel from './micro-tasks/StuckModePanel'
import MathRenderer from './MathRenderer'

interface QuestionData {
  type: SocraticQuestionType
  question: string
  options?: MCQOption[]
  blankAnswer?: string
}

const INITIAL_STATE: SocraticDialogueState = {
  phase: 'thinking_prompt',
  exchanges: [],
  currentQuestion: null,
  currentInput: '',
  selectedConfidence: null,
  isProcessing: false,
  hintLevel: 0,
  hintJustViewed: false,
  error: null,
}

export default function SocraticStepDialogue({
  stepIndex,
  stepTitle,
  stepContent,
  problemStatement,
  concepts,
  onComplete,
  onSwitchToHints,
  chatHistory = [],
  onProfessorExplains,
  isProfessorLoading = false,
}: SocraticStepDialogueProps) {
  const [state, setState] = useState<SocraticDialogueState>(INITIAL_STATE)
  // Multiple questions support
  const [allQuestions, setAllQuestions] = useState<QuestionData[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questionData, setQuestionData] = useState<QuestionData | null>(null)
  const [selectedMCQOption, setSelectedMCQOption] = useState<string | null>(null)
  const [fillBlankAnswer, setFillBlankAnswer] = useState('')
  const [mcqFeedback, setMcqFeedback] = useState<{ correct: boolean; message: string } | null>(null)
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set())
  const startTimeRef = useRef<number>(Date.now())
  const exchangeCountRef = useRef<number>(0)

  const fetchQuestions = useCallback(async () => {
    setState(prev => ({ ...prev, isProcessing: true }))

    try {
      const params = new URLSearchParams({
        stepTitle,
        stepContent,
        problemText: problemStatement,
        concepts: concepts.join(', '),
      })

      const response = await fetch(`/api/socratic-tutor/initial-prompt?${params}`)
      if (!response.ok) throw new Error('Failed to fetch questions')

      const data = await response.json()

      // Handle multiple questions
      if (data.questions && Array.isArray(data.questions)) {
        const questions: QuestionData[] = data.questions.map((q: QuestionData) => ({
          type: q.type,
          question: q.question,
          options: q.options,
          blankAnswer: q.blankAnswer,
        }))
        setAllQuestions(questions)
        setQuestionData(questions[0])
        setState(prev => ({
          ...prev,
          phase: 'socratic_exchange',
          currentQuestion: questions[0].question,
          isProcessing: false,
        }))
      } else {
        // Fallback to single question format
        const questionType = data.questionType || 'open_ended'
        const singleQuestion: QuestionData = {
          type: questionType,
          question: data.thinkingPrompt || "What's your approach to this step?",
          options: data.options,
          blankAnswer: data.blankAnswer,
        }
        setAllQuestions([singleQuestion])
        setQuestionData(singleQuestion)
        setState(prev => ({
          ...prev,
          phase: 'socratic_exchange',
          currentQuestion: singleQuestion.question,
          isProcessing: false,
        }))
      }
    } catch (error) {
      console.error('Error fetching questions:', error)
      const fallbackQuestions: QuestionData[] = [
        {
          type: 'multiple_choice',
          question: 'Which approach would be most helpful for this step?',
          options: [
            { id: 'a', text: 'Apply the relevant physics principle directly', isCorrect: true },
            { id: 'b', text: 'Skip to the final answer', isCorrect: false },
            { id: 'c', text: 'Ignore the given information', isCorrect: false },
            { id: 'd', text: 'Use trial and error', isCorrect: false },
          ],
        },
        {
          type: 'fill_blank',
          question: 'Think about the key relationship. What connects the given quantities?',
          blankAnswer: 'equation',
        },
        {
          type: 'open_ended',
          question: "What's your approach to this step? Think through how you'd tackle it.",
        },
      ]
      setAllQuestions(fallbackQuestions)
      setQuestionData(fallbackQuestions[0])
      setState(prev => ({
        ...prev,
        phase: 'socratic_exchange',
        currentQuestion: fallbackQuestions[0].question,
        isProcessing: false,
      }))
    }
  }, [stepTitle, stepContent, problemStatement, concepts])

  // Fetch multiple questions on mount
  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  // Build mastery result helper
  const buildMasteryResultForCompletion = useCallback((): SocraticMasteryResult => {
    const calibrationCounts = {
      overconfident: 0,
      underconfident: 0,
      calibrated: 0,
    }

    for (const exchange of state.exchanges) {
      calibrationCounts[exchange.aiVerification.calibrationAdjustment]++
    }

    let calibrationPattern: CalibrationAdjustment | 'well_calibrated' = 'well_calibrated'
    const total = Object.values(calibrationCounts).reduce((a, b) => a + b, 0)
    if (total > 0) {
      if (calibrationCounts.overconfident / total > 0.5) {
        calibrationPattern = 'overconfident'
      } else if (calibrationCounts.underconfident / total > 0.5) {
        calibrationPattern = 'underconfident'
      } else if (calibrationCounts.calibrated / total >= 0.5) {
        calibrationPattern = 'calibrated'
      }
    }

    const misconceptionsDetected: string[] = []
    for (const exchange of state.exchanges) {
      if (exchange.aiVerification.conceptGaps) {
        misconceptionsDetected.push(...exchange.aiVerification.conceptGaps)
      }
    }

    return {
      stepId: stepIndex,
      socraticExchanges: exchangeCountRef.current,
      hintLevelReached: state.hintLevel,
      calibrationPattern,
      misconceptionsDetected: [...new Set(misconceptionsDetected)],
      finalUnderstanding: 'mastered',
      timeSpentSeconds: Math.round((Date.now() - startTimeRef.current) / 1000),
    }
  }, [state.exchanges, state.hintLevel, stepIndex])

  // Move to next question
  const moveToNextQuestion = useCallback(() => {
    const nextIndex = currentQuestionIndex + 1
    if (nextIndex < allQuestions.length) {
      setCurrentQuestionIndex(nextIndex)
      setQuestionData(allQuestions[nextIndex])
      setSelectedMCQOption(null)
      setFillBlankAnswer('')
      setMcqFeedback(null)
      setState(prev => ({
        ...prev,
        currentQuestion: allQuestions[nextIndex].question,
        isProcessing: false,
      }))
    } else {
      // All questions answered - complete the step
      const result = buildMasteryResultForCompletion()
      setState(prev => ({
        ...prev,
        phase: 'complete',
        isProcessing: false,
      }))
      setTimeout(() => {
        onComplete(result)
      }, 2000)
    }
  }, [currentQuestionIndex, allQuestions, buildMasteryResultForCompletion, onComplete])

  const handleSubmitAnswer = useCallback(async (
    answer: string,
    confidence: SelfReportConfidence
  ) => {
    if (!answer.trim() || state.isProcessing) return

    setState(prev => ({ ...prev, isProcessing: true, error: null }))

    try {
      const response = await fetch('/api/socratic-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'verification',
          problemText: problemStatement,
          stepTitle,
          stepContent,
          concepts,
          question: state.currentQuestion,
          studentAnswer: answer,
          selfReportedConfidence: confidence,
          previousExchanges: state.exchanges,
        }),
      })

      if (!response.ok) throw new Error('Failed to verify answer')

      const data = await response.json()
      const verification = data.verification as VerificationResult

      const exchange: SocraticExchangeRecord = {
        id: `exchange-${Date.now()}`,
        question: state.currentQuestion || '',
        studentAnswer: answer,
        selfReport: confidence,
        aiVerification: verification,
        timestamp: Date.now(),
      }

      exchangeCountRef.current += 1

      // Mark this question as answered
      setAnsweredQuestions(prev => new Set([...prev, currentQuestionIndex]))

      if (data.isComplete || verification.answerQuality === 'excellent' || verification.answerQuality === 'good') {
        // Good answer - move to next question or complete
        setState(prev => ({
          ...prev,
          exchanges: [...prev.exchanges, exchange],
          isProcessing: false,
        }))

        setTimeout(() => {
          moveToNextQuestion()
        }, 1500)
      } else if (verification.followUpQuestion) {
        // Need more clarification - stay on this question type but show follow-up
        setQuestionData({
          type: 'open_ended',
          question: verification.followUpQuestion,
        })
        setSelectedMCQOption(null)
        setFillBlankAnswer('')
        setMcqFeedback(null)

        setState(prev => ({
          ...prev,
          phase: 'socratic_exchange',
          exchanges: [...prev.exchanges, exchange],
          currentQuestion: verification.followUpQuestion || null,
          isProcessing: false,
        }))
      } else {
        // No follow-up, move to next question
        setState(prev => ({
          ...prev,
          exchanges: [...prev.exchanges, exchange],
          isProcessing: false,
        }))
        setTimeout(() => {
          moveToNextQuestion()
        }, 1500)
      }
    } catch (error) {
      console.error('Error verifying answer:', error)
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: 'Something went wrong. Please try again.',
      }))
    }
  }, [state.currentQuestion, state.exchanges, state.isProcessing, problemStatement, stepTitle, stepContent, concepts, currentQuestionIndex, moveToNextQuestion])

  const handleMCQSelect = (optionId: string) => {
    setSelectedMCQOption(optionId)
    const option = questionData?.options?.find(o => o.id === optionId)
    if (option) {
      if (option.isCorrect) {
        setMcqFeedback({ correct: true, message: 'Correct! Great thinking!' })
        setAnsweredQuestions(prev => new Set([...prev, currentQuestionIndex]))
        exchangeCountRef.current += 1
        // Move to next question after brief delay
        setTimeout(() => {
          moveToNextQuestion()
        }, 1200)
      } else {
        setMcqFeedback({ correct: false, message: 'Not quite. Think about it again or try another option.' })
      }
    }
  }

  const handleFillBlankSubmit = () => {
    const trimmed = fillBlankAnswer.trim()
    if (!trimmed) {
      setMcqFeedback({ correct: false, message: 'Please enter your answer' })
      return
    }
    if (trimmed.length < 2) {
      setMcqFeedback({ correct: false, message: 'Please enter a complete answer' })
      return
    }
    setState(prev => ({ ...prev, isProcessing: true }))

    // Check if answer is approximately correct (case-insensitive, trimmed)
    const userAnswer = trimmed.toLowerCase()
    const correctAnswer = questionData?.blankAnswer?.toLowerCase().replace(/\$/g, '').trim() || ''

    // Allow some flexibility in matching
    const isCorrect = userAnswer === correctAnswer ||
      correctAnswer.includes(userAnswer) ||
      userAnswer.includes(correctAnswer)

    if (isCorrect) {
      setMcqFeedback({ correct: true, message: 'That\'s right! Well done!' })
      setAnsweredQuestions(prev => new Set([...prev, currentQuestionIndex]))
      exchangeCountRef.current += 1
      setTimeout(() => {
        moveToNextQuestion()
      }, 1200)
    } else {
      setMcqFeedback({ correct: false, message: `Not quite. The answer is: ${questionData?.blankAnswer}. Let's continue.` })
      // Still move forward after showing correct answer
      setTimeout(() => {
        moveToNextQuestion()
      }, 2500)
    }
  }

  const handleStuckClick = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: 'stuck_mode',
      hintLevel: 1,
    }))
  }, [])

  const handleReturnToExploration = useCallback(() => {
    setState(prev => ({
      ...prev,
      phase: 'socratic_exchange',
      hintJustViewed: false,
    }))
  }, [])

  const handleHintLevelChange = useCallback((level: number) => {
    setState(prev => ({
      ...prev,
      hintLevel: level,
      hintJustViewed: true,
    }))
  }, [])

  const handleHintVerificationComplete = useCallback(async (understood: boolean) => {
    if (understood) {
      setState(prev => ({
        ...prev,
        hintJustViewed: false,
      }))
    }
  }, [])

  const handleSwitchToHintsMode = useCallback(() => {
    onSwitchToHints()
  }, [onSwitchToHints])

  // Render loading state
  if (state.phase === 'thinking_prompt' || (state.phase === 'socratic_exchange' && state.isProcessing && !state.currentQuestion)) {
    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border-2 border-indigo-200 dark:border-indigo-700">
        <div className="flex items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center animate-pulse">
            <span className="text-xl">🤔</span>
          </div>
          <p className="text-indigo-700 dark:text-indigo-300 font-medium">
            Preparing your thinking prompt&hellip;
          </p>
        </div>
      </div>
    )
  }

  // Render complete state
  if (state.phase === 'complete') {
    return (
      <div className="relative bg-gradient-to-br from-green-500/95 to-emerald-600/95 rounded-xl p-8 text-center animate-fade-in">
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-10px',
                backgroundColor: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'][Math.floor(Math.random() * 6)],
                transform: `rotate(${Math.random() * 360}deg)`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>

        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-2">Excellent!</h2>
        <p className="text-green-100 text-lg">
          You demonstrated real understanding through our conversation.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-white/80">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Marking step as complete...</span>
        </div>

        <style jsx>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(300px) rotate(720deg); opacity: 0; }
          }
          .animate-confetti { animation: confetti 3s ease-out forwards; }
          .animate-fade-in { animation: fadeIn 0.3s ease-out; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        `}</style>
      </div>
    )
  }

  // Render stuck mode
  if (state.phase === 'stuck_mode') {
    return (
      <div className="space-y-4">
        <StuckModePanel
          hintLevel={state.hintLevel}
          stepContent={stepContent}
          problemStatement={problemStatement}
          concepts={concepts}
          onHintLevelChange={handleHintLevelChange}
          onReturnToExploration={handleReturnToExploration}
          onHintVerificationComplete={handleHintVerificationComplete}
          isVerifying={state.isProcessing}
          verificationQuestion={null}
        />

        <div className="text-center">
          <button
            onClick={handleSwitchToHintsMode}
            className="text-sm text-gray-400 dark:text-dark-text-muted hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
          >
            Prefer the traditional hint ladder? Switch modes
          </button>
        </div>
      </div>
    )
  }

  // Default: socratic_exchange phase with Professor Explains and question types
  return (
    <div className="space-y-4">
      {/* Professor Explains Button */}
      {onProfessorExplains && (
        <button
          onClick={onProfessorExplains}
          disabled={isProfessorLoading}
          className="w-full p-4 bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-500 dark:to-indigo-500 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:from-purple-300 disabled:to-indigo-300 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3"
        >
          {isProfessorLoading ? (
            <>
              <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="font-medium">Loading explanation...</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-2xl">🎓</span>
              </div>
              <div className="text-left">
                <span className="font-bold block">Professor Explains</span>
                <span className="text-purple-200 text-sm">Listen to a guided explanation</span>
              </div>
              <svg className="w-5 h-5 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </>
          )}
        </button>
      )}

      {/* Think About This Section */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-xl p-4">
        <h5 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-2">
          <span>🤔</span> Think About This:
        </h5>
        <p className="text-sm text-purple-800 dark:text-purple-200">
          {stepTitle}
        </p>
      </div>

      {/* Question Section - Different types */}
      {questionData && (
        <div className="bg-white dark:bg-dark-card rounded-xl shadow-lg border-2 border-indigo-200 dark:border-indigo-700 overflow-hidden">
          {/* Header with Progress */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-2xl">💭</span>
                </div>
                <div>
                  <h3 className="font-bold text-white">Let&apos;s Think Together</h3>
                  <p className="text-indigo-100 text-xs">
                    {questionData.type === 'multiple_choice' ? 'Select the best answer' :
                     questionData.type === 'fill_blank' ? 'Fill in the blank' :
                     'Share your thinking'}
                  </p>
                </div>
              </div>
              {/* Question counter */}
              {allQuestions.length > 1 && (
                <span className="text-white/90 text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                  {currentQuestionIndex + 1} / {allQuestions.length}
                </span>
              )}
            </div>
            {/* Progress dots */}
            {allQuestions.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-2">
                {allQuestions.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      index === currentQuestionIndex
                        ? 'bg-white scale-125'
                        : answeredQuestions.has(index)
                        ? 'bg-green-400'
                        : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="p-4 space-y-4">
            {/* Question */}
            <div className="text-gray-800 dark:text-dark-text-primary">
              <MathRenderer text={questionData.question} />
            </div>

            {/* Multiple Choice Options */}
            {questionData.type === 'multiple_choice' && questionData.options && (
              <div className="space-y-2">
                {questionData.options.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleMCQSelect(option.id)}
                    disabled={state.isProcessing || (mcqFeedback?.correct === true)}
                    className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                      selectedMCQOption === option.id
                        ? mcqFeedback?.correct
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : mcqFeedback?.correct === false
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                          : 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-dark-border hover:border-indigo-300 dark:hover:border-indigo-600'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                        selectedMCQOption === option.id
                          ? mcqFeedback?.correct
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-indigo-500 bg-indigo-500 text-white'
                          : 'border-gray-300 dark:border-dark-border'
                      }`}>
                        {option.id.toUpperCase()}
                      </div>
                      <span className="text-gray-800 dark:text-dark-text-primary">
                        <MathRenderer text={option.text} />
                      </span>
                    </div>
                  </button>
                ))}
                {mcqFeedback && (
                  <div className={`p-4 rounded-lg ${
                    mcqFeedback.correct
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                  }`}>
                    <p className="text-sm font-medium mb-2">{mcqFeedback.message}</p>
                    {!mcqFeedback.correct && (
                      <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                          <span>💡</span> Think about it:
                        </p>
                        <p className="text-sm">
                          Why might the option you selected not be the best choice? Consider the physics principles involved in this step.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fill in the Blank */}
            {questionData.type === 'fill_blank' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={fillBlankAnswer}
                  onChange={(e) => {
                    setFillBlankAnswer(e.target.value)
                    if (mcqFeedback) setMcqFeedback(null) // Clear feedback when typing
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleFillBlankSubmit()}
                  placeholder="Type your answer..."
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary ${
                    mcqFeedback && !mcqFeedback.correct
                      ? 'border-amber-400 dark:border-amber-600'
                      : 'border-gray-200 dark:border-dark-border'
                  }`}
                  disabled={state.isProcessing}
                />
                {/* Feedback for fill-in-blank */}
                {mcqFeedback && (
                  <div className={`p-4 rounded-lg ${
                    mcqFeedback.correct
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                  }`}>
                    <p className="text-sm font-medium">{mcqFeedback.message}</p>
                    {!mcqFeedback.correct && questionData.blankAnswer && (
                      <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-700">
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                          <span>💡</span> The correct answer is:
                        </p>
                        <p className="text-sm font-medium">
                          <MathRenderer text={questionData.blankAnswer} />
                        </p>
                        <p className="text-sm mt-2 opacity-80">
                          Think about why this is the answer. What physics relationship does it represent?
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {!mcqFeedback && (
                  <button
                    onClick={handleFillBlankSubmit}
                    disabled={!fillBlankAnswer.trim() || state.isProcessing}
                    className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
                  >
                    {state.isProcessing ? 'Checking...' : 'Submit Answer'}
                  </button>
                )}
              </div>
            )}

            {/* Open Ended - Use SocraticExchange */}
            {questionData.type === 'open_ended' && (
              <SocraticExchange
                question={state.currentQuestion || ''}
                exchanges={state.exchanges}
                isProcessing={state.isProcessing}
                onSubmit={handleSubmitAnswer}
                placeholder="Share your thinking..."
                onSkip={moveToNextQuestion}
              />
            )}

            {/* Skip button for MCQ and Fill-blank */}
            {(questionData.type === 'multiple_choice' || questionData.type === 'fill_blank') && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={moveToNextQuestion}
                  disabled={state.isProcessing}
                  className="text-xs text-gray-400 dark:text-dark-text-muted hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                  Skip question
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error message */}
      {state.error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
          {state.error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col items-center gap-2 pt-2">
        <button
          onClick={handleStuckClick}
          className="text-sm text-gray-400 dark:text-dark-text-muted hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          I&apos;m stuck, give me a hint
        </button>
      </div>
    </div>
  )
}
