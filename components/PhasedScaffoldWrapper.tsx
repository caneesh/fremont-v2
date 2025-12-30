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

interface PhasedScaffoldWrapperProps {
  problem: string
  diagramImage?: string
  density?: number
  onReset: () => void
  onLoadNewProblem?: (problemText: string) => void
  onError?: (error: string) => void
  onOutlineReady?: () => void
}

export default function PhasedScaffoldWrapper({
  problem,
  diagramImage,
  density = 3,
  onReset,
  onLoadNewProblem,
  onError,
  onOutlineReady,
}: PhasedScaffoldWrapperProps) {
  const {
    state,
    loadOutline,
    loadStepExpansion,
    getAdaptedScaffoldData,
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
        console.log('[PhasedScaffoldWrapper] Updating adaptedData, expanded steps:', state.expandedSteps.size)
        console.log('[PhasedScaffoldWrapper] Step tasks:', data.steps.map(s => ({ id: s.id, title: s.title, tasks: s.tasks?.length || 0 })))
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
      // Show failure message with weak concepts
      alert(
        `You got ${result.correctAnswers}/${result.totalQuestions} correct.\n\n` +
        `Weak areas: ${result.weakConcepts.join(', ')}\n\n` +
        `Consider reviewing these concepts before attempting this problem. You can still proceed, but it might be challenging.`
      )
    }
  }, [])

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
      />
    )
  }

  // Render SolutionScaffold with adapted data
  // Note: We attach a custom data loader to handle on-demand step expansion
  return (
    <PhasedScaffoldContext.Provider value={{
      loadStepExpansion: handleStepPreload,
      isLoadingStep: state.loadingState === 'loading_step',
      currentLoadingStepId: state.currentLoadingStepId
    }}>
      <SolutionScaffold
        data={adaptedData}
        onReset={handleReset}
        onLoadNewProblem={onLoadNewProblem}
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
}

export const PhasedScaffoldContext = createContext<PhasedScaffoldContextType | null>(null)

export function usePhasedScaffoldContext() {
  return useContext(PhasedScaffoldContext)
}

/**
 * Skeleton loading component for outline
 */
function OutlineLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 border border-transparent dark:border-dark-border">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="h-6 w-32 bg-gray-200 dark:bg-dark-border rounded-full mb-2" />
            <div className="h-8 w-48 bg-gray-200 dark:bg-dark-border rounded" />
          </div>
          <div className="h-10 w-28 bg-gray-200 dark:bg-dark-border rounded-lg" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 dark:bg-dark-border rounded" />
          <div className="h-4 w-5/6 bg-gray-200 dark:bg-dark-border rounded" />
          <div className="h-4 w-4/6 bg-gray-200 dark:bg-dark-border rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Steps skeleton */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-6 border border-transparent dark:border-dark-border">
            <div className="h-6 w-40 bg-gray-200 dark:bg-dark-border rounded mb-4" />
            <div className="h-4 w-64 bg-gray-100 dark:bg-dark-border-strong rounded mb-6" />

            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <StepSkeleton key={i} index={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Concept panel skeleton */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg p-4 border border-transparent dark:border-dark-border">
            <div className="h-5 w-24 bg-gray-200 dark:bg-dark-border rounded mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-3 bg-gray-50 dark:bg-dark-card-soft rounded-lg">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-dark-border rounded mb-2" />
                  <div className="h-3 w-full bg-gray-100 dark:bg-dark-border-strong rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-dark-card shadow-lg rounded-full px-6 py-3 flex items-center gap-3 border border-gray-200 dark:border-dark-border">
        <div className="w-5 h-5 border-2 border-primary-600 dark:border-accent border-t-transparent rounded-full animate-spin" />
        <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
          Generating scaffold...
        </span>
      </div>
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
