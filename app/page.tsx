'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ProblemInput from '@/components/ProblemInput'
import SolutionScaffold from '@/components/SolutionScaffold'
import PrerequisiteCheck from '@/components/PrerequisiteCheck'
import MobileNav from '@/components/MobileNav'
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator'
import ContinueBanner from '@/components/ContinueBanner'
import DemoTour from '@/components/DemoTour'
import type { ScaffoldData } from '@/types/scaffold'
import type { PrerequisiteResult } from '@/types/prerequisites'
import { problemHistoryService } from '@/lib/problemHistory'
import { studyPathService } from '@/lib/studyPath/studyPathService'
import { authenticatedFetch, handleQuotaExceeded } from '@/lib/api/apiClient'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'
import { useSwipeGesture } from '@/hooks/useSwipeGesture'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp'
import ThemeToggle from '@/components/ThemeToggle'

const DEMO_PROBLEM = "A bead of mass m is threaded on a frictionless circular hoop of radius R. The hoop rotates with constant angular velocity ω about a vertical diameter. Find the angle θ at which the bead can remain in stable equilibrium relative to the hoop."

function HomeContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [scaffoldData, setScaffoldData] = useState<ScaffoldData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentProblemText, setCurrentProblemText] = useState<string>('')
  const [showPrerequisiteCheck, setShowPrerequisiteCheck] = useState(false)
  const [prerequisitesPassed, setPrerequisitesPassed] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)

  const handleProblemSubmit = async (problemText: string, diagramImage?: string | null) => {
    setCurrentProblemText(problemText)
    setIsLoading(true)
    setError(null)
    setScaffoldData(null)
    setShowPrerequisiteCheck(false)
    setPrerequisitesPassed(false)

    try {
      const response = await authenticatedFetch('/api/solve', {
        method: 'POST',
        body: JSON.stringify({
          problem: problemText,
          diagramImage: diagramImage || undefined
        }),
      })

      // Check for quota exceeded
      if (await handleQuotaExceeded(response)) {
        setIsLoading(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || response.statusText)
      }

      const data = await response.json()
      setScaffoldData(data)
      // Show prerequisite check after scaffold loads
      setShowPrerequisiteCheck(true)
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
      // Show failure message with weak concepts
      alert(
        `You got ${result.correctAnswers}/${result.totalQuestions} correct.\n\n` +
        `Weak areas: ${result.weakConcepts.join(', ')}\n\n` +
        `Consider reviewing these concepts before attempting this problem. You can still proceed, but it might be challenging.`
      )
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
      router.replace('/')
    } else if (questionId) {
      // Load question from study path
      const loadQuestion = async () => {
        try {
          const response = await fetch('/api/study-path/questions')
          if (response.ok) {
            const data = await response.json()
            const question = data.questions.find((q: any) => q.id === questionId)
            if (question) {
              handleProblemSubmit(question.statement)
              // Mark as attempted
              studyPathService.markQuestionAttempted(question.topic, question.id)
            }
          }
        } catch (error) {
          console.error('Error loading question:', error)
        }
        // Clear the query parameter
        router.replace('/')
      }
      loadQuestion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const handleReset = () => {
    setScaffoldData(null)
    setError(null)
    setCurrentProblemText('')
    setShowPrerequisiteCheck(false)
    setPrerequisitesPassed(false)
  }

  // Pull to refresh
  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000))
    handleReset()
  }

  const { isPulling, pullDistance } = usePullToRefresh(handleRefresh)

  // Swipe gestures for navigation
  useSwipeGesture({
    onSwipeLeft: () => {
      // Swipe left to go to concept network
      if (window.innerWidth < 768) {
        router.push('/concept-network')
      }
    },
    onSwipeRight: () => {
      // Swipe right to go to history
      if (window.innerWidth < 768) {
        router.push('/history')
      }
    },
  })

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'n', action: handleReset, description: 'New problem' },
    { key: 'h', action: () => router.push('/history'), description: 'Go to history' },
    { key: 's', action: () => router.push('/study-path'), description: 'Go to study path' },
    { key: 'c', action: () => router.push('/concept-network'), description: 'Go to concept network' },
    { key: '?', shiftKey: true, action: () => setShowShortcutsHelp(true), description: 'Show shortcuts' },
    { key: 'Escape', action: () => setShowShortcutsHelp(false), description: 'Close dialogs' },
  ], !isLoading)

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-dark-app dark:to-dark-card">
      <PullToRefreshIndicator pullDistance={pullDistance} isRefreshing={isPulling && pullDistance > 60} />
      <MobileNav />
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <header className="mb-8 md:mb-12">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            {/* Keyboard Shortcut Hint & Theme Toggle - Desktop only */}
            <div className="hidden md:flex flex-1 justify-start items-center gap-3">
              <button
                onClick={() => setShowShortcutsHelp(true)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:text-dark-text-muted dark:hover:text-dark-text-secondary flex items-center gap-1 transition-colors"
                title="Keyboard shortcuts"
              >
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-card-soft border border-gray-300 dark:border-dark-border rounded text-[10px]">?</kbd>
                <span>Shortcuts</span>
              </button>
              <ThemeToggle />
            </div>
            <div className="flex-1 text-center md:text-center">
              <button
                onClick={handleReset}
                className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-2 md:mb-4 hover:opacity-80 transition-opacity cursor-pointer"
              >
                PhysiScaffold
              </button>
            </div>
            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden md:flex flex-1 justify-end gap-3">
              <button
                onClick={() => {
                  handleReset()
                  setIsDemoMode(true)
                }}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white rounded-lg hover:shadow-lg flex items-center gap-2 font-medium transition-all hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Demo
              </button>
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
            {/* Mobile Demo Button */}
            <button
              onClick={() => {
                handleReset()
                setIsDemoMode(true)
              }}
              className="md:hidden mt-4 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-lg flex items-center gap-2 font-medium transition-all mx-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Watch Demo
            </button>
          </div>
        </header>

        {/* Main Content */}
        {!scaffoldData ? (
          <>
            {!isLoading && (
              <ContinueBanner onContinue={handleProblemSubmit} />
            )}
            <ProblemInput
              onSubmit={handleProblemSubmit}
              isLoading={isLoading}
              error={error}
              initialProblem={currentProblemText}
            />
          </>
        ) : showPrerequisiteCheck ? (
          <PrerequisiteCheck
            concepts={scaffoldData.concepts}
            onComplete={handlePrerequisiteComplete}
            onSkip={handlePrerequisiteSkip}
          />
        ) : (
          <SolutionScaffold
            data={scaffoldData}
            onReset={handleReset}
            onLoadNewProblem={handleProblemSubmit}
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
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    }>
      <HomeContent />
    </Suspense>
  )
}
