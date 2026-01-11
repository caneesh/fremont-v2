'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ProblemInput from '@/components/ProblemInput'
import SolutionScaffold from '@/components/SolutionScaffold'
import PhasedScaffoldWrapper from '@/components/PhasedScaffoldWrapper'
import PrerequisiteCheck from '@/components/PrerequisiteCheck'
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator'
import Image from 'next/image'
import ContinueBanner from '@/components/ContinueBanner'
import DemoTour from '@/components/DemoTour'
import DailyDebriefCard from '@/components/DailyDebriefCard'
import type { ScaffoldData, ScaffoldDensity } from '@/types/scaffold'
import type { MicroTaskScaffoldData } from '@/types/microTask'
import type { PrerequisiteResult } from '@/types/prerequisites'
import type { DailyDebrief } from '@/types/mistakeNotebook'
import { problemHistoryService } from '@/lib/problemHistory'
import { studyPathService } from '@/lib/studyPath/studyPathService'
import * as planService from '@/lib/dashboard/todayPlanService'
import { authService } from '@/lib/auth/authService'
import { getTodayDebrief, isDebriefDue } from '@/lib/dailyDebrief'
import { authenticatedFetch, parseQuotaExceeded } from '@/lib/api/apiClient'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp'
import ThemeToggle from '@/components/ThemeToggle'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import { useToast } from '@/components/ui/ToastProvider'
import { resolveWithQuestionEngine } from '@/lib/question-engine/adapter'
import type { MiniProblem } from '@/lib/patternTrack'
import FeaturedQuestions from '@/components/FeaturedQuestions'
// Interview Mode
import { InterviewModeToggle, InterviewTimer, RubricResults } from '@/components/interview'
import { useInterviewMode } from '@/hooks/useInterviewMode'
import { useInterviewSession } from '@/hooks/useInterviewSession'

const DEMO_PROBLEM = "A bead of mass m is threaded on a frictionless circular hoop of radius R. The hoop rotates with constant angular velocity ω about a vertical diameter. Find the angle θ at which the bead can remain in stable equilibrium relative to the hoop."

interface SolvePageProps {
  /**
   * Whether this is being rendered as part of the v3 dashboard experience.
   * When true, omits redundant navigation elements since AppShell handles them.
   */
  useDashboardLayout?: boolean
  /**
   * Callback when returning to dashboard from a plan session
   */
  onReturnToDashboard?: () => void
  /**
   * Whether we're in a plan session (from dashboard)
   */
  fromPlan?: boolean
}

export default function SolvePage({ useDashboardLayout = false, onReturnToDashboard, fromPlan = false }: SolvePageProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { pushToast } = useToast()
  const [scaffoldData, setScaffoldData] = useState<ScaffoldData | MicroTaskScaffoldData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentProblemText, setCurrentProblemText] = useState<string>('')
  const [showPrerequisiteCheck, setShowPrerequisiteCheck] = useState(false)
  const [prerequisitesPassed, setPrerequisitesPassed] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [dailyDebrief, setDailyDebrief] = useState<DailyDebrief | null>(null)
  const [showDebrief, setShowDebrief] = useState(false)
  const [returnProblemText, setReturnProblemText] = useState<string | null>(null)
  // Track current question ID for local scaffold lookup
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null)
  // Track problem input for phased loading
  const [phasedProblemData, setPhasedProblemData] = useState<{
    problem: string
    diagramImage?: string
    density?: number
  } | null>(null)
  const submitProblemRef = useRef<null | (() => void)>(null)
  // Active learning mode is the default (Duolingo approach)
  const useMicroTasks = true
  // Use phased scaffold loading for faster initial response
  const usePhasedScaffold = FEATURE_FLAGS.PHASED_SCAFFOLD
  // Use Question Engine for template-based scaffolding (faster, cached)
  const useQuestionEngine = FEATURE_FLAGS.QUESTION_ENGINE

  // Plan session detection from URL params
  const isFromPlan = fromPlan || searchParams.get('fromPlan') === '1'
  const planDate = searchParams.get('planDate')
  const userId = authService.getUser()?.userId || 'anonymous'

  // Interview Mode
  const interviewMode = useInterviewMode()
  const interviewSession = useInterviewSession(interviewMode.config, userId)

  // Handle problem solved callback for plan sessions
  const handlePlanTaskSolved = useCallback(() => {
    if (!isFromPlan) return

    // Get the active task from the plan and mark it done
    const plan = planService.loadPlan(userId)
    if (plan && plan.tasks.length > 0) {
      const activeTask = plan.tasks[plan.activeTaskIndex]
      if (activeTask && !activeTask.completed) {
        planService.markTaskDone(userId, activeTask.id)

        pushToast({
          title: 'Task completed!',
          message: 'Great work! Returning to dashboard...',
          variant: 'success',
          durationMs: 3000,
        })

        // Navigate back to dashboard after a short delay
        setTimeout(() => {
          router.push('/study-path')
        }, 1500)
      }
    }
  }, [isFromPlan, userId, pushToast, router])

  // Return to dashboard handler
  const handleReturnToDashboard = useCallback(() => {
    router.push('/study-path')
  }, [router])

  // Load daily debrief on mount (only when not in dashboard layout)
  useEffect(() => {
    if (!useDashboardLayout && isDebriefDue()) {
      const debrief = getTodayDebrief()
      setDailyDebrief(debrief)
      // Only show if there's some activity or cards due
      if (debrief.problemsAttempted > 0 || debrief.cardsDueToday > 0 || debrief.cardsOverdue > 0) {
        setShowDebrief(true)
      }
    }
  }, [useDashboardLayout])

  // Start interview session when scaffold loads (if interview mode enabled)
  useEffect(() => {
    if (interviewMode.isEnabled && scaffoldData && !interviewSession.session) {
      const totalSteps = scaffoldData.steps?.length || 5
      const questionId = currentQuestionId || `problem_${Date.now()}`
      interviewSession.start(questionId, totalSteps)
    }
  }, [interviewMode.isEnabled, scaffoldData, currentQuestionId, interviewSession])

  const handleProblemSubmit = async (
    problemText: string,
    diagramImage?: string | null,
    density?: ScaffoldDensity,
    includeFinalAnswer?: boolean,
    questionId?: string
  ) => {
    setCurrentProblemText(problemText)
    setCurrentQuestionId(questionId || null)
    setError(null)
    setScaffoldData(null)
    setPhasedProblemData(null)
    setShowPrerequisiteCheck(false)
    setPrerequisitesPassed(false)

    // Use Question Engine for template-based scaffolding (fastest)
    if (useQuestionEngine) {
      setIsLoading(true)
      try {
        const result = await resolveWithQuestionEngine(problemText, { questionId })
        if (result.success) {
          setScaffoldData(result.data)
          if (!isDemoMode) {
            setShowPrerequisiteCheck(true)
          }
        } else {
          // Fallback to legacy flow if Question Engine fails
          console.warn('[Question Engine] Fallback to legacy:', result.error)
          setError(result.error)
        }
      } catch (err) {
        console.error('[Question Engine] Error:', err)
        setError(err instanceof Error ? err.message : 'Question Engine error')
      } finally {
        setIsLoading(false)
      }
      return
    }

    // Use phased scaffold loading if enabled
    if (usePhasedScaffold) {
      setIsLoading(true) // Show initial loading state briefly
      setPhasedProblemData({
        problem: problemText,
        diagramImage: diagramImage || undefined,
        density: density || 3,
      })
      setIsLoading(false)
      return
    }

    // Legacy: Full scaffold loading
    setIsLoading(true)

    try {
      const response = await authenticatedFetch('/api/solve', {
        method: 'POST',
        body: JSON.stringify({
          problem: problemText,
          diagramImage: diagramImage || undefined,
          useMicroTasks,
          density: density || 3,
          includeFinalAnswer: Boolean(includeFinalAnswer),
        }),
      })

      const quota = await parseQuotaExceeded(response)
      if (quota) {
        pushToast({
          title: 'Daily limit reached',
          message: `${quota.message} Your limits reset at midnight.`,
          variant: 'warning',
        })
        setError(quota.message)
        setIsLoading(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || response.statusText)
      }

      const data = await response.json()
      setScaffoldData(data)
      // Show prerequisite check after scaffold loads (skip in demo mode)
      if (!isDemoMode) {
        setShowPrerequisiteCheck(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrerequisiteComplete = (result: PrerequisiteResult) => {
    setShowPrerequisiteCheck(false)
    setPrerequisitesPassed(result.passed)

    if (!result.passed && result.weakConcepts.length > 0) {
      pushToast({
        title: 'Prerequisites not passed',
        message: `Weak areas: ${result.weakConcepts.join(', ')}. You can proceed, but expect this to be challenging.`,
        variant: 'warning',
        durationMs: 7000,
      })
    }
  }

  const handlePrerequisiteSkip = () => {
    setShowPrerequisiteCheck(false)
    setPrerequisitesPassed(true)
  }

  // Load problem from history or study path if specified in URL
  useEffect(() => {
    const loadProblemId = searchParams.get('loadProblem')
    const questionId = searchParams.get('question')

    if (loadProblemId) {
      const attempt = problemHistoryService.getAttempt(loadProblemId)
      if (attempt) {
        // Load the saved problem and regenerate scaffold
        const progress = attempt.status === 'SOLVED'
          ? problemHistoryService.loadFinalSolution(loadProblemId)
          : problemHistoryService.loadDraft(loadProblemId)

        if (progress) {
          handleProblemSubmit(progress.problemText)
        }
      }
      // Clear the query parameter
      router.replace('/solve')
    } else if (questionId) {
      // Load question from study path
      const loadQuestion = async () => {
        try {
          const response = await fetch('/api/study-path/questions')
          if (response.ok) {
            const data = await response.json()
            const question = data.questions.find((q: any) => q.id === questionId)
            if (question) {
              // Pass questionId for local scaffold lookup
              handleProblemSubmit(question.statement, null, undefined, undefined, questionId)
              // Mark as attempted
              studyPathService.markQuestionAttempted(question.topic, question.id)
            }
          }
        } catch (error) {
          console.error('Error loading question:', error)
        }
        // Clear the query parameter
        router.replace('/solve')
      }
      loadQuestion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleReset = () => {
    setScaffoldData(null)
    setPhasedProblemData(null)
    setError(null)
    setCurrentProblemText('')
    setShowPrerequisiteCheck(false)
    setPrerequisitesPassed(false)
    setReturnProblemText(null)
  }

  // Pull to refresh
  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    handleReset()
  }

  const { isPulling, pullDistance } = usePullToRefresh(handleRefresh)

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'Enter', ctrlKey: true, action: () => submitProblemRef.current?.(), description: 'Submit problem' },
    { key: 'n', action: handleReset, description: 'New problem' },
    { key: 'h', action: () => router.push('/history'), description: 'Go to history' },
    { key: 's', action: () => router.push('/study-path'), description: 'Go to study path' },
    { key: 'c', action: () => router.push('/concept-network'), description: 'Go to concept network' },
    { key: '?', shiftKey: true, action: () => setShowShortcutsHelp(true), description: 'Show shortcuts' },
    { key: 'Escape', action: () => setShowShortcutsHelp(false), description: 'Close dialogs' },
  ], !isLoading && !scaffoldData && !phasedProblemData)

  // When using dashboard layout (v3), render minimal UI
  const showHeader = !useDashboardLayout

  return (
    <main className={useDashboardLayout ? '' : 'min-h-screen bg-slate-50 dark:bg-dark-app'}>
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isPulling && pullDistance > 60} />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header - only shown when not using dashboard layout */}
        {showHeader && (
          <header className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              {/* Keyboard Shortcut Hint & Theme Toggle - Desktop only */}
              <div className="hidden md:flex flex-1 justify-start items-center gap-3">
                {returnProblemText && currentProblemText && currentProblemText !== returnProblemText && (
                  <button
                    onClick={() => {
                      const original = returnProblemText
                      setReturnProblemText(null)
                      handleProblemSubmit(original)
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary flex items-center gap-1 transition-colors"
                    title="Return to your original problem"
                  >
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-card-soft border border-gray-300 dark:border-dark-border rounded text-[10px]">
                      ↩
                    </span>
                    <span>Return</span>
                  </button>
                )}
                <button
                  onClick={() => setShowShortcutsHelp(true)}
                  className="text-xs text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary flex items-center gap-1 transition-colors"
                  title="Keyboard shortcuts"
                >
                  <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-card-soft border border-gray-300 dark:border-dark-border rounded text-[10px]">?</kbd>
                  <span>Shortcuts</span>
                </button>
                {!isLoading && !scaffoldData && !phasedProblemData && (
                  <button
                    onClick={() => setIsDemoMode(true)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary flex items-center gap-1 transition-colors"
                    title="Quick tour"
                  >
                    <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-card-soft border border-gray-300 dark:border-dark-border rounded text-[10px]">
                      ▶
                    </span>
                    <span>Tour</span>
                  </button>
                )}
                <ThemeToggle />
              </div>
              <div className="flex-1 text-center md:text-center">
                <button
                  onClick={handleReset}
                  className="mb-2 md:mb-4 hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <Image
                    src="/logo.png"
                    alt="PhysiScaffold"
                    width={300}
                    height={60}
                    className="h-10 sm:h-12 md:h-14 w-auto mx-auto dark:brightness-110 dark:contrast-90"
                    priority
                  />
                </button>
              </div>
              {/* Desktop Navigation - Hidden on mobile (legacy layout) */}
              <div className="hidden md:flex flex-1 justify-end gap-3">
                <button
                  onClick={() => router.push('/concept-network')}
                  className="px-5 py-2.5 bg-white dark:bg-dark-card border border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 flex items-center gap-2 font-medium transition-all hover:shadow-md dark:hover:shadow-dark-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                  Network
                </button>
                <button
                  onClick={() => router.push('/study-path')}
                  className="px-5 py-2.5 bg-white dark:bg-dark-card border border-primary-600 dark:border-accent text-primary-600 dark:text-accent rounded-lg hover:bg-primary-50 dark:hover:bg-accent/10 flex items-center gap-2 font-medium transition-all hover:shadow-md dark:hover:shadow-dark-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Study Path
                </button>
                <button
                  onClick={() => router.push('/spot-mistake')}
                  className="px-5 py-2.5 bg-white dark:bg-dark-card border border-orange-400 dark:border-orange-500 text-orange-600 dark:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 flex items-center gap-2 font-medium transition-all hover:shadow-md dark:hover:shadow-dark-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Spot Mistake
                </button>
                <button
                  onClick={() => router.push('/mistake-notebook')}
                  className="px-5 py-2.5 bg-white dark:bg-dark-card border border-amber-400 dark:border-amber-500 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2 font-medium transition-all hover:shadow-md dark:hover:shadow-dark-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Notebook
                </button>
                <button
                  onClick={() => router.push('/history')}
                  className="px-5 py-2.5 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft flex items-center gap-2 transition-all hover:shadow-md dark:hover:shadow-dark-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  History
                </button>
              </div>
            </div>
            <div className="text-center px-4">
              <p className="text-lg md:text-xl text-gray-600 dark:text-dark-text-secondary italic">
                The Socratic Physics Engine
              </p>
              <p className="text-xs md:text-sm text-gray-500 dark:text-dark-text-muted mt-2">
                Active Decomposition: We don&apos;t give answers; we give the framework for the answer.
              </p>
              {!isLoading && !scaffoldData && !phasedProblemData && (
                <div className="mt-4 grid grid-cols-2 gap-3 max-w-md mx-auto md:flex md:max-w-none md:justify-center md:flex-wrap">
                  <button
                    onClick={() => router.push('/study-path')}
                    className="px-4 py-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors text-sm font-medium"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => {
                      const anchor = document.getElementById('custom-problem')
                      anchor?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      window.setTimeout(() => {
                        const input = document.getElementById('problem') as HTMLTextAreaElement | null
                        input?.focus()
                      }, 50)
                    }}
                    className="px-4 py-2 bg-white dark:bg-dark-card border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors text-sm font-medium"
                  >
                    Custom Problem
                  </button>
                  <button
                    onClick={() => setIsDemoMode(true)}
                    className="col-span-2 md:col-span-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-strong transition-colors text-sm font-medium"
                  >
                    Take Tour
                  </button>
                </div>
              )}
            </div>
          </header>
        )}

        {/* Interview Mode Toggle & Timer */}
        {!isLoading && !scaffoldData && !phasedProblemData && (
          <div className="mb-6 flex justify-center">
            <InterviewModeToggle
              onConfigChange={interviewMode.updateConfig}
              initialConfig={interviewMode.config}
              disabled={isLoading}
            />
          </div>
        )}

        {/* Interview Timer - Show when session is active */}
        {interviewSession.isActive && (scaffoldData || phasedProblemData) && (
          <div className="mb-4 flex justify-center">
            <InterviewTimer
              startedAt={interviewSession.session?.timerState.startedAt || Date.now()}
              timeLimitSeconds={interviewMode.config.timeLimitMinutes * 60}
              onTimeUp={() => {
                pushToast({
                  title: 'Time is up!',
                  message: 'Your interview session has ended.',
                  variant: 'warning',
                })
              }}
              paused={false}
            />
          </div>
        )}

        {/* Return to Dashboard button (when in plan session) */}
        {isFromPlan && (
          <div className="mb-4">
            <button
              onClick={onReturnToDashboard || handleReturnToDashboard}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Return to Dashboard
            </button>
          </div>
        )}

        {/* Main Content */}
        {phasedProblemData ? (
          /* Phased Scaffold Loading - Fast initial response */
          <PhasedScaffoldWrapper
            problem={phasedProblemData.problem}
            diagramImage={phasedProblemData.diagramImage}
            density={phasedProblemData.density}
            onReset={handleReset}
            onLoadNewProblem={handleProblemSubmit}
            onSolved={handlePlanTaskSolved}
            onError={(err) => setError(err)}
          />
        ) : !scaffoldData ? (
          <>
            {/* Daily Debrief (only in non-dashboard layout) */}
            {!useDashboardLayout && showDebrief && dailyDebrief && (
              <div className="max-w-3xl mx-auto mb-6">
                <DailyDebriefCard
                  debrief={dailyDebrief}
                  onStartReview={() => router.push('/mistake-notebook?review=true')}
                  onDismiss={() => setShowDebrief(false)}
                />
              </div>
            )}
            {!isLoading && !useDashboardLayout && (
              <ContinueBanner onContinue={handleProblemSubmit} />
            )}

            {/* Featured Questions - Show quick-start problems */}
            {!isLoading && (
              <FeaturedQuestions
                onSelectQuestion={(statement, questionId) => {
                  handleProblemSubmit(statement, null, undefined, undefined, questionId)
                  // Mark as attempted in study path
                  fetch('/api/study-path/questions').then(res => res.json()).then(data => {
                    const question = data.questions?.find((q: any) => q.id === questionId)
                    if (question) {
                      studyPathService.markQuestionAttempted(question.topic, questionId)
                    }
                  }).catch(() => {})
                }}
              />
            )}

            <div id="custom-problem">
              <ProblemInput
                onSubmit={handleProblemSubmit}
                isLoading={isLoading}
                error={error}
                initialProblem={currentProblemText}
                onRegisterSubmit={(submit) => {
                  submitProblemRef.current = submit
                }}
              />
            </div>
          </>
        ) : showPrerequisiteCheck ? (
          <PrerequisiteCheck
            concepts={scaffoldData.concepts}
            onComplete={handlePrerequisiteComplete}
            onSkip={handlePrerequisiteSkip}
            onSelectMiniProblem={(miniProblem: MiniProblem) => {
              if (!returnProblemText && currentProblemText) {
                setReturnProblemText(currentProblemText)
              }
              pushToast({
                title: 'Quick practice',
                message: 'Solving a focused mini-problem. Use "Return" to go back to your original problem anytime.',
                variant: 'info',
                durationMs: 7000,
              })
              handleProblemSubmit(miniProblem.question.problem_text)
            }}
          />
        ) : (
          <SolutionScaffold
            data={scaffoldData}
            onReset={handleReset}
            onLoadNewProblem={handleProblemSubmit}
            onSolved={handlePlanTaskSolved}
            interviewMode={interviewMode.isEnabled ? {
              enabled: true,
              config: interviewMode.config,
              session: interviewSession.session,
              onStepComplete: async (stepId, explanation) => {
                await interviewSession.submitAnswer(stepId, 'completed', true, explanation)
              },
              onHintRequest: () => {
                // Hints are tracked in the session
              },
            } : undefined}
          />
        )}
      </div>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        isOpen={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      {/* Demo Tour */}
      <DemoTour
        isActive={isDemoMode}
        onEnd={() => setIsDemoMode(false)}
        onStartDemo={() => {
          handleProblemSubmit(DEMO_PROBLEM)
        }}
      />

      {/* Interview Results Modal */}
      {interviewSession.results && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
            <button
              onClick={() => {
                interviewSession.clearResults()
                handleReset()
              }}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Close results"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-6">
              <RubricResults
                result={interviewSession.results.rubricResult}
                grade={interviewSession.results.grade}
                summary={interviewSession.results.summary}
              />
              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={() => {
                    interviewSession.clearResults()
                    handleReset()
                  }}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                >
                  Try Another Problem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
