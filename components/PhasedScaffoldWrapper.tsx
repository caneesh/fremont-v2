'use client'

/**
 * PhasedScaffoldWrapper
 *
 * Wrapper component for phased scaffold loading.
 * Shows skeleton loading states while content loads progressively.
 */

import { useEffect, useCallback, useState } from 'react'
import { usePhasedScaffold, PhasedLoadingState } from '@/hooks/usePhasedScaffold'
import SolutionScaffold from './SolutionScaffold'
import PrerequisiteCheck from './PrerequisiteCheck'
import type { MicroTaskScaffoldData } from '@/types/microTask'
import type { PrerequisiteResult } from '@/types/prerequisites'
import { useToast } from '@/components/ui/ToastProvider'
import type { MiniProblem } from '@/lib/patternTrack'

interface PhasedScaffoldWrapperProps {
  problem: string
  diagramImage?: string
  density?: number
  onReset: () => void
  onLoadNewProblem?: (problemText: string) => void
  onError?: (error: string) => void
  onOutlineReady?: () => void
  onSolved?: () => void
}

export default function PhasedScaffoldWrapper({
  problem,
  diagramImage,
  density = 3,
  onReset,
  onLoadNewProblem,
  onError,
  onOutlineReady,
  onSolved,
}: PhasedScaffoldWrapperProps) {
  const { pushToast } = useToast()
  const {
    state,
    loadOutline,
    loadStepExpansion,
    getAdaptedScaffoldData,
    recordAttempt,
    getStepDifficulty,
    reset,
  } = usePhasedScaffold()

  const [adaptedData, setAdaptedData] = useState<MicroTaskScaffoldData | null>(null)
  const [firstStepLoaded, setFirstStepLoaded] = useState(false)
  const [showPrerequisiteCheck, setShowPrerequisiteCheck] = useState(false)
  const [prerequisitesPassed, setPrerequisitesPassed] = useState(false)

  // Load outline on mount
  useEffect(() => {
    loadOutline(problem, { density, diagramImage })
    setFirstStepLoaded(false) // Reset when problem changes
    setShowPrerequisiteCheck(false) // Reset prerequisite check
    setPrerequisitesPassed(false)
  }, [problem, density, diagramImage, loadOutline])

  // Auto-load first step expansion when outline is ready
  useEffect(() => {
    if (state.loadingState === 'outline_ready' && state.outline && !firstStepLoaded) {
      const firstStepId = state.outline.steps[0]?.step_id
      if (firstStepId && !state.expandedSteps.has(firstStepId)) {
        console.log('[Phased Scaffold] Auto-loading first step:', firstStepId)
        loadStepExpansion(firstStepId).then(() => {
          setFirstStepLoaded(true)
        })
      } else {
        setFirstStepLoaded(true)
      }
    }
  }, [state.loadingState, state.outline, state.expandedSteps, firstStepLoaded, loadStepExpansion])

  // Notify when outline is ready
  useEffect(() => {
    if (state.loadingState === 'outline_ready' && onOutlineReady) {
      onOutlineReady()
    }
  }, [state.loadingState, onOutlineReady])

  // Update adapted data when state changes
  useEffect(() => {
    if (state.loadingState === 'outline_ready' || state.expandedSteps.size > 0) {
      const data = getAdaptedScaffoldData()
      if (data) {
        setAdaptedData(data)
      }
    }
  }, [state.loadingState, state.expandedSteps, getAdaptedScaffoldData])

  // Show prerequisite check when first step is loaded and data is ready
  useEffect(() => {
    if (firstStepLoaded && adaptedData && !prerequisitesPassed && !showPrerequisiteCheck) {
      setShowPrerequisiteCheck(true)
    }
  }, [firstStepLoaded, adaptedData, prerequisitesPassed, showPrerequisiteCheck])

  // Handle prerequisite check completion
  const handlePrerequisiteComplete = useCallback((result: PrerequisiteResult) => {
    setShowPrerequisiteCheck(false)
    setPrerequisitesPassed(true)

    if (!result.passed && result.weakConcepts.length > 0) {
      pushToast({
        title: 'Prerequisites not passed',
        message: `Weak areas: ${result.weakConcepts.join(', ')}. You can proceed, but expect this to be challenging.`,
        variant: 'warning',
        durationMs: 7000,
      })
    }
  }, [pushToast])

  // Handle prerequisite skip
  const handlePrerequisiteSkip = useCallback(() => {
    setShowPrerequisiteCheck(false)
    setPrerequisitesPassed(true)
  }, [])

  // Notify on error
  useEffect(() => {
    if (state.error && onError) {
      onError(state.error)
    }
  }, [state.error, onError])

  // Handle reset
  const handleReset = useCallback(() => {
    reset()
    onReset()
  }, [reset, onReset])

  // Preload step expansion when step becomes active
  const handleStepPreload = useCallback(async (stepId: string) => {
    if (!state.expandedSteps.has(stepId)) {
      await loadStepExpansion(stepId)
    }
  }, [state.expandedSteps, loadStepExpansion])

  // Loading states
  if (state.loadingState === 'idle' || state.loadingState === 'loading_outline') {
    return (
      <div className="max-w-7xl mx-auto">
        <OutlineLoadingSkeleton />
      </div>
    )
  }

  if (state.loadingState === 'error') {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
            Failed to Load Scaffold
          </h3>
          <p className="text-red-600 dark:text-red-400 mb-4">
            {state.error}
          </p>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // Wait for first step to be loaded before showing scaffold
  if (!adaptedData || !firstStepLoaded) {
    return (
      <div className="max-w-7xl mx-auto">
        <OutlineLoadingSkeleton />
        {state.loadingState === 'outline_ready' && !firstStepLoaded && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-dark-card shadow-lg rounded-full px-6 py-3 flex items-center gap-3 border border-gray-200 dark:border-dark-border z-50">
            <div className="w-5 h-5 border-2 border-green-600 dark:border-green-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
              Loading first step...
            </span>
          </div>
        )}
      </div>
    )
  }

  // Show prerequisite check before scaffold
  if (showPrerequisiteCheck && adaptedData.concepts.length > 0) {
    return (
      <PrerequisiteCheck
        concepts={adaptedData.concepts}
        onComplete={handlePrerequisiteComplete}
        onSkip={handlePrerequisiteSkip}
        onSelectMiniProblem={(miniProblem: MiniProblem) => {
          if (!onLoadNewProblem) return
          pushToast({
            title: 'Quick practice',
            message: 'Loading a focused mini-problem…',
            variant: 'info',
          })
          onLoadNewProblem(miniProblem.question.problem_text)
        }}
      />
    )
  }

  // Render SolutionScaffold with adapted data
  // Note: We attach a custom data loader to handle on-demand step expansion
  return (
    <PhasedScaffoldContext.Provider value={{
      loadStepExpansion: handleStepPreload,
      isLoadingStep: state.loadingState === 'loading_step',
      currentLoadingStepId: state.currentLoadingStepId,
      recordAttempt,
      getStepDifficulty,
    }}>
      <SolutionScaffold
        data={adaptedData}
        onReset={handleReset}
        onLoadNewProblem={onLoadNewProblem}
        onSolved={onSolved}
      />
      {/* Loading indicator when fetching step expansion */}
      {state.loadingState === 'loading_step' && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-dark-card shadow-lg rounded-full px-6 py-3 flex items-center gap-3 border border-gray-200 dark:border-dark-border z-50">
          <div className="w-5 h-5 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
            Loading step content...
          </span>
        </div>
      )}
    </PhasedScaffoldContext.Provider>
  )
}

// Context for phased scaffold loading (used by step components)
import { createContext, useContext } from 'react'

interface PhasedScaffoldContextType {
  loadStepExpansion: (stepId: string) => Promise<void>
  isLoadingStep: boolean
  currentLoadingStepId: string | null
  /** Record a task attempt for difficulty tuning */
  recordAttempt: (stepId: string, taskLevel: number, isCorrect: boolean, attemptNumber: number) => void
  /** Get current tuned difficulty for a step */
  getStepDifficulty: (stepId: string) => 'easy' | 'medium' | 'hard'
}

export const PhasedScaffoldContext = createContext<PhasedScaffoldContextType | null>(null)

export function usePhasedScaffoldContext() {
  return useContext(PhasedScaffoldContext)
}

// Static arrays moved outside component to avoid recreating on each render
const LOADING_MESSAGES = [
  'Analyzing your problem...',
  'Identifying key concepts...',
  'Breaking down the solution...',
  'Crafting step-by-step guidance...',
  'Almost ready...',
]

const LOADING_TIPS = [
  'Try to identify the given quantities before starting.',
  'Draw a diagram to visualize the problem.',
  'Think about which physics principles might apply.',
  'Break complex problems into smaller parts.',
  'Check units throughout your calculation.',
]

/**
 * Skeleton loading component for outline - Beautiful animated loading experience
 */
function OutlineLoadingSkeleton() {
  const [messageIndex, setMessageIndex] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length)
    }, 2500)

    const tipTimer = setInterval(() => {
      setTipIndex(prev => (prev + 1) % LOADING_TIPS.length)
    }, 5000)

    return () => {
      clearInterval(messageTimer)
      clearInterval(tipTimer)
    }
  }, [])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
      {/* Main loading card */}
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-2xl border border-gray-100 dark:border-dark-border p-8 max-w-lg w-full text-center">
        {/* Animated icon */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Outer ring */}
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-900/30" />
          {/* Spinning ring */}
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 dark:border-t-indigo-400 animate-spin" />
          {/* Inner circle with icon */}
          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500 flex items-center justify-center shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
          Building Your Scaffold
        </h2>

        {/* Animated loading message */}
        <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-6 h-6 transition-opacity duration-300">
          {LOADING_MESSAGES[messageIndex]}
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i <= messageIndex
                  ? 'bg-indigo-500 dark:bg-indigo-400 scale-100'
                  : 'bg-gray-200 dark:bg-dark-border scale-75'
              }`}
            />
          ))}
        </div>

        {/* Tip section */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide mb-1">
                Pro Tip
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-200 transition-opacity duration-500">
                {LOADING_TIPS[tipIndex]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subtle background animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-indigo-200 dark:bg-indigo-900/20 rounded-full blur-3xl opacity-30 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-200 dark:bg-purple-900/20 rounded-full blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Estimated time */}
      <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-6">
        This usually takes 10-20 seconds
      </p>
    </div>
  )
}

function StepSkeleton({ index }: { index: number }) {
  const width = 100 - (index * 5) // Vary widths for more natural look
  return (
    <div className="border border-gray-200 dark:border-dark-border rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 dark:bg-dark-border rounded-full flex-shrink-0" />
        <div className="flex-1">
          <div className={`h-4 bg-gray-200 dark:bg-dark-border rounded`} style={{ width: `${width}%` }} />
        </div>
        <div className="w-5 h-5 bg-gray-200 dark:bg-dark-border rounded" />
      </div>
    </div>
  )
}
