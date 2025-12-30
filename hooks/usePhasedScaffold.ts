/**
 * usePhasedScaffold Hook
 *
 * Manages phased scaffold loading for reduced latency:
 * - Phase A: Load outline quickly (~10-20s)
 * - Phase B: Load step expansions on-demand
 * - Phase C: Load final solve on explicit request
 */

import { useState, useCallback, useRef } from 'react'
import type {
  OutlineScaffoldResponse,
  StepExpansionResponse,
  FinalSolveResponse,
  OutlineStep,
} from '@/types/phasedScaffold'
import type { MicroTaskScaffoldData, MicroTaskStep, MicroTask } from '@/types/microTask'
import type { DiagramStepData, RequiredForce, ForceDirection } from '@/types/diagram'
import { authenticatedFetch } from '@/lib/api/apiClient'

export type PhasedLoadingState = 'idle' | 'loading_outline' | 'outline_ready' | 'loading_step' | 'error'

export interface PhasedScaffoldState {
  loadingState: PhasedLoadingState
  outline: OutlineScaffoldResponse | null
  expandedSteps: Map<string, StepExpansionResponse>
  finalSolve: FinalSolveResponse | null
  error: string | null
  currentLoadingStepId: string | null
}

export interface UsePhasedScaffoldReturn {
  state: PhasedScaffoldState
  loadOutline: (problem: string, options?: { density?: number; diagramImage?: string }) => Promise<void>
  loadStepExpansion: (stepId: string) => Promise<StepExpansionResponse | null>
  loadFinalSolve: (stepsCompleted?: string[]) => Promise<FinalSolveResponse | null>
  getAdaptedScaffoldData: () => MicroTaskScaffoldData | null
  reset: () => void
}

/**
 * Hook for managing phased scaffold loading
 */
export function usePhasedScaffold(): UsePhasedScaffoldReturn {
  const [state, setState] = useState<PhasedScaffoldState>({
    loadingState: 'idle',
    outline: null,
    expandedSteps: new Map(),
    finalSolve: null,
    error: null,
    currentLoadingStepId: null,
  })

  // Use ref to maintain stable reference to current outline
  const outlineRef = useRef<OutlineScaffoldResponse | null>(null)

  /**
   * Load outline scaffold (Phase A)
   */
  const loadOutline = useCallback(async (
    problem: string,
    options: { density?: number; diagramImage?: string } = {}
  ): Promise<void> => {
    setState(prev => ({
      ...prev,
      loadingState: 'loading_outline',
      error: null,
      outline: null,
      expandedSteps: new Map(),
      finalSolve: null,
    }))

    try {
      const response = await authenticatedFetch('/api/scaffold/outline', {
        method: 'POST',
        body: JSON.stringify({
          problem,
          diagram_image: options.diagramImage,
          options: {
            density: options.density || 3,
            include_fbd_hints: true,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load outline')
      }

      const data = await response.json()
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Invalid outline response')
      }

      const outline = data.data as OutlineScaffoldResponse
      outlineRef.current = outline

      setState(prev => ({
        ...prev,
        loadingState: 'outline_ready',
        outline,
        error: null,
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setState(prev => ({
        ...prev,
        loadingState: 'error',
        error: errorMessage,
      }))
    }
  }, [])

  /**
   * Load step expansion (Phase B)
   */
  const loadStepExpansion = useCallback(async (stepId: string): Promise<StepExpansionResponse | null> => {
    const currentOutline = outlineRef.current
    if (!currentOutline) {
      console.error('Cannot load step expansion: no outline loaded')
      return null
    }

    // Check if already loaded
    if (state.expandedSteps.has(stepId)) {
      return state.expandedSteps.get(stepId) || null
    }

    setState(prev => ({
      ...prev,
      loadingState: 'loading_step',
      currentLoadingStepId: stepId,
    }))

    try {
      const response = await authenticatedFetch('/api/scaffold/step', {
        method: 'POST',
        body: JSON.stringify({
          scaffold_id: currentOutline.scaffold_id,
          step_id: stepId,
          outline_steps: currentOutline.steps,
          problem: currentOutline.problem,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load step expansion')
      }

      const data = await response.json()
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Invalid step expansion response')
      }

      const expansion = data.data as StepExpansionResponse
      console.log(`[usePhasedScaffold] Step expansion loaded for ${stepId}, micro_tasks:`, expansion.micro_tasks?.length || 0)

      setState(prev => {
        const newExpandedSteps = new Map(prev.expandedSteps)
        newExpandedSteps.set(stepId, expansion)
        console.log(`[usePhasedScaffold] Storing expansion for ${stepId}, new expandedSteps size:`, newExpandedSteps.size)
        return {
          ...prev,
          loadingState: 'outline_ready',
          expandedSteps: newExpandedSteps,
          currentLoadingStepId: null,
        }
      })

      return expansion
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to load step expansion:', errorMessage)
      setState(prev => ({
        ...prev,
        loadingState: 'outline_ready',
        currentLoadingStepId: null,
      }))
      return null
    }
  }, [state.expandedSteps])

  /**
   * Load final solve (Phase C)
   */
  const loadFinalSolve = useCallback(async (stepsCompleted: string[] = []): Promise<FinalSolveResponse | null> => {
    const currentOutline = outlineRef.current
    if (!currentOutline) {
      console.error('Cannot load final solve: no outline loaded')
      return null
    }

    try {
      const response = await authenticatedFetch('/api/solve/final', {
        method: 'POST',
        body: JSON.stringify({
          scaffold_id: currentOutline.scaffold_id,
          problem: currentOutline.problem,
          steps_completed: stepsCompleted,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load final solve')
      }

      const data = await response.json()
      if (!data.success || !data.data) {
        throw new Error(data.error || 'Invalid final solve response')
      }

      const finalSolve = data.data as FinalSolveResponse

      setState(prev => ({
        ...prev,
        finalSolve,
      }))

      return finalSolve
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('Failed to load final solve:', errorMessage)
      return null
    }
  }, [])

  /**
   * Convert phased scaffold data to MicroTaskScaffoldData format
   * for compatibility with existing SolutionScaffold component
   */
  const getAdaptedScaffoldData = useCallback((): MicroTaskScaffoldData | null => {
    const { outline, expandedSteps } = state
    if (!outline) return null

    // Convert outline steps to MicroTaskStep format
    console.log('[usePhasedScaffold] getAdaptedScaffoldData called, expandedSteps size:', expandedSteps.size, 'keys:', Array.from(expandedSteps.keys()))
    const steps: MicroTaskStep[] = outline.steps.map((outlineStep, index) => {
      const expansion = expandedSteps.get(outlineStep.step_id)
      const isLoading = state.currentLoadingStepId === outlineStep.step_id
      console.log(`[usePhasedScaffold] Step ${outlineStep.step_id}: expansion=${!!expansion}, isLoading=${isLoading}`)

      // Build tasks from expansion if available
      let tasks: MicroTaskStep['tasks'] = []

      // Only use expansion tasks if they exist AND are not empty
      if (expansion?.micro_tasks && expansion.micro_tasks.length > 0) {
        console.log(`[usePhasedScaffold] Step ${outlineStep.step_id} has expansion with ${expansion.micro_tasks.length} micro_tasks`)
        // Step is expanded - use real tasks
        tasks = expansion.micro_tasks.map((task, taskIndex): MicroTask => {
          const level = (taskIndex + 1) as 1 | 2 | 3 | 4 | 5
          const levelTitle = getLevelTitle(taskIndex + 1)

          // Map API task types to frontend task types:
          // MCQ → MULTIPLE_CHOICE
          // FILL_BLANK → FILL_BLANK
          // SHORT_ANSWER → VERBAL_PLAN
          if (task.type === 'FILL_BLANK') {
            return {
              level,
              levelTitle,
              type: 'FILL_BLANK' as const,
              question: task.question,
              sentence: task.sentence || '',
              correctTerm: task.correct_term || '',
              distractors: task.distractors || [],
              explanation: task.reasoning,
            }
          } else if (task.type === 'SHORT_ANSWER') {
            // SHORT_ANSWER maps to VERBAL_PLAN
            return {
              level,
              levelTitle,
              type: 'VERBAL_PLAN' as const,
              question: task.question,
              prompt: task.question, // Use question as prompt
              minWords: 10,
              requiredKeywords: task.expected_keywords || [],
              scaffoldingQuestions: [],
              explanation: task.reasoning,
            }
          } else {
            // MCQ → MULTIPLE_CHOICE
            // Ensure options array is valid (non-empty)
            const options = task.options && task.options.length > 0
              ? task.options
              : ['Option A', 'Option B', 'Option C', 'Option D'] // Fallback options
            const correctIndex = typeof task.correct_index === 'number' ? task.correct_index : 0

            return {
              level,
              levelTitle,
              type: 'MULTIPLE_CHOICE' as const,
              question: task.question,
              options,
              correctIndex: Math.min(correctIndex, options.length - 1), // Ensure valid index
              explanation: task.reasoning,
            }
          }
        })
      } else {
        // Step not expanded yet - use empty tasks array to show loading state
        // The MicroTaskStepAccordion will display "Loading step content..." when tasks is empty
        // This prevents fake quiz options from being shown and validated incorrectly
        tasks = []
      }

      // Map fbd_data to diagramData for diagram steps
      let diagramData: DiagramStepData | undefined = undefined
      if (outlineStep.requires_fbd) {
        if (expansion?.fbd_data) {
          const fbdData = expansion.fbd_data
          diagramData = {
            scenarioType: fbdData.scenario_type || 'horizontal',
            objectShape: fbdData.object_shape || 'block',
            surfaceAngle: fbdData.surface_angle,
            requiredForces: (fbdData.required_forces || []).map(f => ({
              type: f.type,
              direction: normalizeForceDirection(f.direction || 'down'),
              label: f.label,
            })),
            hints: expansion.hints?.map(h => h.content),
          }
        } else {
          // Provide default diagramData for FBD steps that haven't been expanded yet
          // This prevents NaN errors in SurfaceRenderer when the step is rendered
          diagramData = {
            scenarioType: 'horizontal',
            objectShape: 'block',
            requiredForces: [],
            hints: [],
          }
        }
      }

      return {
        id: index + 1, // Use 1-based index for compatibility
        title: outlineStep.title,
        stepType: mapStepType(outlineStep.step_type),
        prerequisites: [],
        tasks,
        requiredConcepts: [],
        feynmanPrompt: expansion?.feynman_prompt,
        // Diagram step data for FBD canvas
        diagramData,
        // Include expansion data for components that need it
        _expansion: expansion,
        _isLoading: isLoading,
        _outlineStepId: outlineStep.step_id,
        _needsExpansion: !expansion,
      } as MicroTaskStep & {
        _expansion?: StepExpansionResponse
        _isLoading?: boolean
        _outlineStepId?: string
        _needsExpansion?: boolean
        diagramData?: DiagramStepData
      }
    })

    // Build concepts from outline
    const concepts = outline.concepts.map(c => ({
      id: c.id,
      name: c.name,
      definition: '',
      formula: undefined,
    }))

    return {
      problem: outline.problem,
      domain: outline.tags.domain,
      subdomain: outline.tags.subdomain,
      concepts,
      steps,
      sanityCheck: {
        question: 'Verify your solution using a limiting case.',
        expectedBehavior: 'The result should reduce to a known case.',
        type: 'limit' as const,
      },
      // Include phased scaffold metadata
      _scaffoldId: outline.scaffold_id,
      _schemaVersion: outline.schema_version,
      _estimatedTime: outline.estimated_time_mins,
    } as MicroTaskScaffoldData & {
      _scaffoldId?: string
      _schemaVersion?: string
      _estimatedTime?: number
    }
  }, [state])

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    outlineRef.current = null
    setState({
      loadingState: 'idle',
      outline: null,
      expandedSteps: new Map(),
      finalSolve: null,
      error: null,
      currentLoadingStepId: null,
    })
  }, [])

  return {
    state,
    loadOutline,
    loadStepExpansion,
    loadFinalSolve,
    getAdaptedScaffoldData,
    reset,
  }
}

// Helper functions

function getLevelTitle(level: number): 'Concept' | 'Visual' | 'Strategy' | 'Equation' | 'Solution' {
  const titles: Record<number, 'Concept' | 'Visual' | 'Strategy' | 'Equation' | 'Solution'> = {
    1: 'Concept',
    2: 'Visual',
    3: 'Strategy',
    4: 'Equation',
    5: 'Solution',
  }
  return titles[level] || 'Concept'
}

function mapStepType(outlineType: string): 'diagram' | 'physics_concept' | 'math_manipulation' | 'sanity_check' | undefined {
  const mapping: Record<string, 'diagram' | 'physics_concept' | 'math_manipulation' | 'sanity_check'> = {
    diagram: 'diagram',
    concept: 'physics_concept',
    equation: 'math_manipulation',
    compute: 'math_manipulation',
    check: 'sanity_check',
  }
  return mapping[outlineType]
}

/**
 * Normalize force direction from AI format to frontend format
 * AI may return underscores (perpendicular_to_surface) but frontend uses hyphens (perpendicular-surface)
 */
function normalizeForceDirection(direction: string): ForceDirection {
  // Map common AI variations to standard frontend format
  const directionMap: Record<string, ForceDirection> = {
    'perpendicular_to_surface': 'perpendicular-surface',
    'perpendicular-to-surface': 'perpendicular-surface',
    'perpendicular_surface': 'perpendicular-surface',
    'along_surface': 'along-surface',
    'along-surface': 'along-surface',
    'up_left': 'up-left',
    'up_right': 'up-right',
    'down_left': 'down-left',
    'down_right': 'down-right',
    // Standard directions pass through
    'up': 'up',
    'down': 'down',
    'left': 'left',
    'right': 'right',
    'up-left': 'up-left',
    'up-right': 'up-right',
    'down-left': 'down-left',
    'down-right': 'down-right',
    'perpendicular-surface': 'perpendicular-surface',
  }

  const normalized = direction.toLowerCase().trim()
  return directionMap[normalized] || 'down'
}
