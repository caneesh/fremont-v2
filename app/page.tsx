'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import ProblemInput from '@/components/ProblemInput'
import SolutionScaffold from '@/components/SolutionScaffold'
import PrerequisiteCheck from '@/components/PrerequisiteCheck'
import MobileNav from '@/components/MobileNav'
import PullToRefreshIndicator from '@/components/PullToRefreshIndicator'
import ContinueBanner from '@/components/ContinueBanner'
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
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
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
                className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 flex items-center gap-1 transition-colors"
                title="Keyboard shortcuts"
              >
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-[10px]">?</kbd>
                <span>Shortcuts</span>
              </button>
              <ThemeToggle />
            </div>
            <div className="flex-1 text-center md:text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-2 md:mb-4">
                PhysiScaffold
              </h1>
            </div>
            {/* Desktop Navigation - Hidden on mobile */}
            <div className="hidden md:flex flex-1 justify-end gap-3">
              <button
                onClick={() => router.push('/concept-network')}
                className="px-6 py-3 bg-white border-2 border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 flex items-center gap-2 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Network
              </button>
              <button
                onClick={() => router.push('/study-path')}
                className="px-6 py-3 bg-white border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 flex items-center gap-2 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Study Path
              </button>
              <button
                onClick={() => router.push('/spot-mistake')}
                className="px-6 py-3 bg-white border-2 border-orange-400 text-orange-600 rounded-lg hover:bg-orange-50 flex items-center gap-2 font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Spot Mistake
              </button>
              <button
                onClick={() => router.push('/history')}
                className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                History
              </button>
            </div>
          </div>
          <div className="text-center px-4">
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 italic">
              The Socratic Physics Engine
            </p>
            <p className="text-xs md:text-sm text-gray-500 dark:text-gray-500 mt-2">
              Active Decomposition: We don&apos;t give answers; we give the framework for the answer.
            </p>
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
