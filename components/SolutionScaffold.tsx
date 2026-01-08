'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { ScaffoldData } from '@/types/scaffold'
import { isHintScaffold } from '@/types/scaffold'
import type { MicroTaskScaffoldData, MicroTaskStep } from '@/types/microTask'
import { isMicroTaskScaffold } from '@/types/microTask'
import type { StepProgress, ProblemProgress, MicroTaskStepProgress } from '@/types/history'
import { problemHistoryService } from '@/lib/problemHistory'
import { generateProblemId, generateProblemTitle } from '@/lib/utils'
import StepAccordion from './StepAccordion'
import MicroTaskStepAccordion from './MicroTaskStepAccordion'
import DiagramStep from './diagram/DiagramStep'
import ConceptPanel from './ConceptPanel'
import SanityCheckStep from './SanityCheckStep'
import SanityCheckMatrix from './SanityCheckMatrix'
import NextChallenge from './NextChallenge'
import ReflectionStep from './ReflectionStep'
import ProblemVariations from './ProblemVariations'
import MistakeWarning from './MistakeWarning'
import ErrorPatternInsights from './ErrorPatternInsights'
import ExplainToFriend from './ExplainToFriend'
import PostSolveActivity from './PostSolveActivity'
import Celebration from './Celebration'
import SubmissionCanvas from './SubmissionCanvas'
import MathRenderer from './MathRenderer'
import { WhatIfSimulation } from './simulation'
import BoundaryCaseBuilder from './BoundaryCaseBuilder'
import type { ReflectionAnswer } from '@/types/history'
import type { GradeSolutionResponse } from '@/types/gradeSolution'
import type { MistakeWarning as MistakeWarningType } from '@/types/mistakes'
import { mistakeTrackingService } from '@/lib/mistakeTracking'
import { errorPatternService } from '@/lib/errorPatternService'
import { explainToFriendService } from '@/lib/explainToFriendService'
import type { ErrorAnalysisResponse } from '@/types/errorPatterns'
import { conceptMasteryService } from '@/lib/conceptMasteryService'
import { conceptMappingService } from '@/lib/conceptMappingService'
import { CONCEPT_NETWORK_DATA } from '@/lib/conceptNetworkData'
import { useCircuitBreaker } from '@/lib/hooks/useCircuitBreaker'
import DrillModal from './DrillModal'
import CircuitBreakerWarning from './CircuitBreakerWarning'
import SocraticRewindModal from './SocraticRewindModal'
import PreFlightCheckModal from './PreFlightCheckModal'
import ConceptContrastModal from './ConceptContrastModal'
import type { ErrorTag } from '@/types/circuitBreaker'
import type { PreFlightCheck, PreFlightValidation } from '@/types/preFlightCheck'
import type { SocraticRewindContext, RewindTriggerSource } from '@/types/socraticRewind'
import { buildRewindContextFromCollision } from '@/types/socraticRewind'
import type { ConceptContrastChallenge, ConceptContrastValidation } from '@/types/conceptContrast'
import {
  buildContextFromGradeResult,
  buildContextFromSanityCheckFailure,
} from '@/lib/socraticRewindService'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import type { SocraticMasteryResult } from '@/types/socraticFirst'
import { usePhasedScaffoldContext } from './PhasedScaffoldWrapper'
import ConfidenceRating from './ConfidenceRating'
import StepHeatmap from './StepHeatmap'
import type { Confidence } from '@/types/confidence'
import { getConfidenceOutcome } from '@/lib/confidenceWeightedSRS'
import {
  createCardIfNotExists,
  getFilteredCards,
  type CreateCardInput,
} from '@/lib/mistakeNotebook'
import type { MistakeTrigger, MistakeCard } from '@/types/mistakeNotebook'
import { extractConstraints } from '@/lib/constraintExtractor'
import { analyzeStudentWork, detectCollisions } from '@/lib/constraintCollisionEngine'
import { generateSocraticDialogue } from '@/lib/constraintDialogueEngine'
import type { ProblemConstraintData, ConstraintCollision, SocraticDialogue } from '@/types/constraintCollision'
import ConstraintFeedback from './ConstraintFeedback'
import AdaptivePreflightModal from './AdaptivePreflightModal'
import {
  shouldShowAdaptivePreflight,
  type StepRiskAssessment,
} from '@/lib/adaptivePreflightService'
import PatternFirstModal from './PatternFirstModal'
import type { PatternSelectionState, PatternSelectionProgress } from '@/types/patternFirst'
import SkipCommitGateModal, { SkipToast } from './SkipCommitGateModal'
import SkipCommitAnalyticsPanel from './SkipCommitAnalytics'
import type { SkipCommitState, SkipCommitAnalytics } from '@/types/skipCommitGate'
import { INITIAL_SKIP_COMMIT_STATE, toSkipCommitPersistence } from '@/types/skipCommitGate'
import { getPatternFirstTimePressure, getSkipCommitTimePressure } from '@/types/timePressure'
import PatternSelectionChip from './PatternSelectionChip'
import PatternPickerModal from './PatternPickerModal'
import CoachToolsPanel, { CoachToolsButton, useCoachToolsPanel } from './CoachToolsPanel'
import { getSkipCommitAnalyticsForCurrentSession } from '@/lib/skipCommitSessionAnalytics'
import {
  shouldShowPatternFirst,
  validateSelection,
  createSelectionState,
  createTimeoutState,
  toProgressFormat,
  logPatternFirstShown,
  logPatternSelected,
  logPatternCorrectness,
  logPatternTimeout,
  logPatternFirstUnlock,
} from '@/lib/patternFirstService'
import type { SessionGatingPolicy, StepRebuildGateState, StepDecisionGateState } from '@/types/gatingPolicy'
import {
  getOrCreateSessionPolicy,
  processPatternGateSelection,
  processPatternGateTimeout,
  triggerRebuildGate,
  recordRebuildAnswer,
  canProceedFromStep,
  saveSessionPolicy,
  clearSessionPolicy,
  requiresDecisionGate,
  getStepDecisionGateState,
  recordMicroTaskAttempt,
  getRequiredMicroTaskCount,
  updateCognitiveLoadLevel,
} from '@/lib/gatingPolicyEngine'
import type { MomentumState, MomentumEvent } from '@/types/momentum'
import {
  getOrCreateMomentumState,
  recordDecisionWin,
  recordDecisionFailure,
  recordHintFreeWin,
  recordRebuildWin,
  consumePendingEvent,
  saveMomentumState,
} from '@/lib/momentumEngine'
import MomentumFeedback from './MomentumFeedback'
import {
  getOrCreateCognitiveLoadState,
  getOrCreateSessionLoadMetrics,
  saveSessionLoadMetrics,
  recordStepActivation,
  recordHintUnlock,
  recordStepCompletion,
  recordWrongAttempt,
  updateCognitiveLoadAfterStep,
  updateCircuitBreakerState,
  getUIConfigForLoadScore,
  clearCognitiveLoadState,
  type CognitiveLoadState,
  type SessionLoadMetrics,
} from '@/lib/cognitiveLoadService'
import type { HighLoadUIConfig } from '@/types/cognitiveLoad'
import type { SessionMode, SessionModeState } from '@/types/sessionMode'
import {
  createInitialSessionModeState,
  evaluateSessionMode,
  getModePresentationConfig,
  getOrCreateSessionModeState,
  getVisibleStepIndexes,
  recordSessionModeError,
  saveSessionModeState,
} from '@/lib/sessionModePolicyEngine'
import type { InterviewSession, ExplanationSubmission } from '@/lib/interview'
import type { InterviewModeConfig } from '@/hooks/useInterviewMode'
import { ExplanationForm } from '@/components/interview'
import { usePivot } from '@/hooks/usePivot'
import { PivotModal } from '@/components/pivot'

interface InterviewModeProps {
  enabled: boolean
  config: InterviewModeConfig
  session: InterviewSession | null
  onStepComplete: (stepId: string, explanation?: ExplanationSubmission) => Promise<void>
  onHintRequest: (stepId: string) => void
}

interface SolutionScaffoldProps {
  data: ScaffoldData | MicroTaskScaffoldData
  onReset: () => void
  onLoadNewProblem?: (problemText: string) => void
  onSolved?: () => void
  interviewMode?: InterviewModeProps
}

export default function SolutionScaffold({ data, onReset, onLoadNewProblem, onSolved, interviewMode }: SolutionScaffoldProps) {
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
  const [showCelebration, setShowCelebration] = useState(false)
  const [highlightedStepId, setHighlightedStepId] = useState<number | null>(null)
  const [highlightedProblemRange, setHighlightedProblemRange] = useState<{ start: number; end: number } | null>(null)
  const [showSubmissionCanvas, setShowSubmissionCanvas] = useState(false)
  const [solutionGradeResult, setSolutionGradeResult] = useState<GradeSolutionResponse | null>(null)
  const [sessionMode, setSessionMode] = useState<SessionMode>('guided')
  const [sessionModeState, setSessionModeState] = useState<SessionModeState | null>(null)
  const [problemMasteryScore, setProblemMasteryScore] = useState(0)
  const [stepErrorCounts, setStepErrorCounts] = useState<Map<number, number>>(new Map())
  const masteryScoreRef = useRef(0)
  const [sessionModeSeed, setSessionModeSeed] = useState<SessionMode | null>(null)

  // Confidence rating state
  const [pendingConfidenceStepId, setPendingConfidenceStepId] = useState<number | null>(null)
  const [stepConfidenceRatings, setStepConfidenceRatings] = useState<Map<number, Confidence>>(new Map())

  // Interview mode state
  const [pendingInterviewExplanation, setPendingInterviewExplanation] = useState<number | null>(null)
  const isInterviewMode = interviewMode?.enabled ?? false
  const hintsHidden = isInterviewMode && interviewMode?.config.hintsHidden
  const explanationsRequired = isInterviewMode && interviewMode?.config.explanationsRequired

  // Mistake notebook state - related past mistakes for current concepts
  const [relatedMistakes, setRelatedMistakes] = useState<MistakeCard[]>([])
  const [showMistakeNotification, setShowMistakeNotification] = useState(false)
  const [lastCreatedMistakeCard, setLastCreatedMistakeCard] = useState<MistakeCard | null>(null)

  // Constraint Collision Detection state
  const [problemConstraints, setProblemConstraints] = useState<ProblemConstraintData | null>(null)
  const [constraintCollisions, setConstraintCollisions] = useState<ConstraintCollision[]>([])
  const [constraintDialogue, setConstraintDialogue] = useState<SocraticDialogue | null>(null)
  const [dismissedCollisions, setDismissedCollisions] = useState<Set<string>>(new Set())
  const constraintCheckTimerRef = useRef<NodeJS.Timeout | null>(null)

  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null)
  const stepRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const problemStatementRef = useRef<HTMLParagraphElement>(null)
  const reverseSolveEnabled = Boolean(data.reverseSolve)
  const finalAnswer = data.finalAnswer?.trim()

  // Pre-Flight Check state
  const [showPreFlightCheck, setShowPreFlightCheck] = useState(false)
  const [currentPreFlightCheck, setCurrentPreFlightCheck] = useState<PreFlightCheck | null>(null)
  const [passedPreFlightChecks, setPassedPreFlightChecks] = useState<Set<string>>(new Set())

  // Adaptive Preflight state
  const [showAdaptivePreflight, setShowAdaptivePreflight] = useState(false)
  const [currentAdaptiveAssessment, setCurrentAdaptiveAssessment] = useState<StepRiskAssessment | null>(null)
  const [passedAdaptivePreflightSteps, setPassedAdaptivePreflightSteps] = useState<Set<number>>(new Set())

  // Pattern-First Mode state
  const [showPatternFirst, setShowPatternFirst] = useState(false)
  const [patternSelectionState, setPatternSelectionState] = useState<PatternSelectionState | null>(null)
  const [isScaffoldLocked, setIsScaffoldLocked] = useState(false)
  const [showPatternPicker, setShowPatternPicker] = useState(false)
  const [patternPickerTitle, setPatternPickerTitle] = useState<string | undefined>(undefined)
  const [showPatternPickWarning, setShowPatternPickWarning] = useState(false)
  const patternGateStartedAtRef = useRef<number | null>(null)
  const patternGateLockedRef = useRef(false)
  const patternUnlockLoggedRef = useRef(false)
  const pendingFinalizeAfterPatternPickRef = useRef(false)

  // P0 Gating Policy state
  const [gatingPolicy, setGatingPolicy] = useState<SessionGatingPolicy | null>(null)
  const gatingPolicyInitRef = useRef(false)

  // Cognitive Load Governor state
  const [cognitiveLoadState, setCognitiveLoadState] = useState<CognitiveLoadState | null>(null)
  const [cognitiveLoadMetrics, setCognitiveLoadMetrics] = useState<SessionLoadMetrics | null>(null)
  const [cognitiveLoadUIConfig, setCognitiveLoadUIConfig] = useState<HighLoadUIConfig | null>(null)
  const stepActivationTimesRef = useRef<Map<number, number>>(new Map())

  // Skip-or-Commit Gate state
  const [showSkipCommitGate, setShowSkipCommitGate] = useState(false)
  const [skipCommitState, setSkipCommitState] = useState<SkipCommitState>(INITIAL_SKIP_COMMIT_STATE)
  const [showSkipToast, setShowSkipToast] = useState(false)
  const [showSkipCommitAnalytics, setShowSkipCommitAnalytics] = useState(false)
  const [sessionSkipCommitAnalytics, setSessionSkipCommitAnalytics] = useState<SkipCommitAnalytics | null>(null)
  const [skipCommitCountdownStartSeconds, setSkipCommitCountdownStartSeconds] = useState<number | null>(null)
  const skipCommitGateShownRef = useRef(false)
  const skipCommitTimerRef = useRef<NodeJS.Timeout | null>(null)
  const saveMessageTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Momentum Engine state
  const [momentumState, setMomentumState] = useState<MomentumState | null>(null)
  const [pendingMomentumEvent, setPendingMomentumEvent] = useState<MomentumEvent | null>(null)
  const momentumInitRef = useRef(false)

  // Concept Contrast state
  const [showConceptContrast, setShowConceptContrast] = useState(false)
  const [currentConceptContrastChallenge, setCurrentConceptContrastChallenge] = useState<ConceptContrastChallenge | null>(null)
  const [passedConceptContrastSteps, setPassedConceptContrastSteps] = useState<Set<number>>(new Set())
  const [isLoadingConceptContrast, setIsLoadingConceptContrast] = useState(false)

  // Coach Tools panel state
  const coachToolsPanel = useCoachToolsPanel()

  // Micro-task mode state
  const useMicroTasks = isMicroTaskScaffold(data)
  const [microTaskProgress, setMicroTaskProgress] = useState<Map<number, MicroTaskStepProgress>>(new Map())
  const modeConfig = useMemo(() => getModePresentationConfig(sessionMode), [sessionMode])
  const visibleStepIndexes = useMemo(
    () => getVisibleStepIndexes(modeConfig.stepVisibility, currentStep, data.steps.length),
    [modeConfig.stepVisibility, currentStep, data.steps.length]
  )

  // Dev: Skip steps mode for testing sanity check UI
  const searchParams = useSearchParams()
  const skipStepsMode = useMemo(() => {
    if (!FEATURE_FLAGS.DEV_SKIP_STEPS) return false
    return searchParams.get('skipSteps') === 'true'
  }, [searchParams])

  const patternFirstCfg = useMemo(
    () => getPatternFirstTimePressure(data.timePressure),
    [data.timePressure]
  )

  const skipCommitCfg = useMemo(
    () => getSkipCommitTimePressure(data.timePressure),
    [data.timePressure]
  )

  const computeProblemMasteryScore = useCallback(() => {
    if (typeof window === 'undefined') return 0
    const studentId = localStorage.getItem('physiscaffold_user') || 'anonymous'
    const conceptMapping = conceptMappingService.mapConcepts(
      data.concepts,
      CONCEPT_NETWORK_DATA.network.nodes
    )
    const masteryScores = data.concepts.map((concept) => {
      const mappedConceptId = conceptMapping.get(concept.id) || concept.id
      const masteryData = conceptMasteryService.getConceptMastery(studentId, mappedConceptId)
      return masteryData?.masteryScore ?? 0
    })
    if (masteryScores.length === 0) return 0
    const total = masteryScores.reduce((sum, score) => sum + score, 0)
    return total / masteryScores.length
  }, [data.concepts])

  useEffect(() => {
    const mastery = computeProblemMasteryScore()
    masteryScoreRef.current = mastery
    setProblemMasteryScore(mastery)
  }, [computeProblemMasteryScore])

  // Cleanup save message timer on unmount
  useEffect(() => {
    return () => {
      if (saveMessageTimerRef.current) {
        clearTimeout(saveMessageTimerRef.current)
      }
    }
  }, [])

  // Helper to show timed save messages with proper cleanup
  const showTimedSaveMessage = useCallback((message: string, durationMs: number = 3000) => {
    if (saveMessageTimerRef.current) {
      clearTimeout(saveMessageTimerRef.current)
    }
    setSaveMessage(message)
    saveMessageTimerRef.current = setTimeout(() => {
      setSaveMessage('')
    }, durationMs)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const seedMode = sessionModeSeed || 'guided'
    // Use functional update to avoid sessionModeState in dependencies
    setSessionModeState(prevState => {
      const baseState = prevState ?? getOrCreateSessionModeState(seedMode)
      const { state: updatedState } = evaluateSessionMode(
        baseState,
        masteryScoreRef.current
      )
      setSessionMode(updatedState.mode)
      return updatedState
    })
  }, [problemMasteryScore, sessionModeSeed])

  useEffect(() => {
    if (!showSkipCommitAnalytics) return
    try {
      setSessionSkipCommitAnalytics(getSkipCommitAnalyticsForCurrentSession())
    } catch (error) {
      console.error('Failed to compute skip/commit analytics:', error)
      setSessionSkipCommitAnalytics(null)
    }
  }, [showSkipCommitAnalytics])

  // Phased scaffold context for on-demand step loading
  const phasedScaffoldContext = usePhasedScaffoldContext()

  // Trigger step expansion when a step becomes active and needs loading
  useEffect(() => {
    if (!phasedScaffoldContext || !useMicroTasks) return

    const currentStepData = data.steps[currentStep] as MicroTaskStep & {
      _needsExpansion?: boolean
      _outlineStepId?: string
      _isLoading?: boolean
    }

    // Check if this step needs expansion (has _needsExpansion flag and _outlineStepId)
    // Don't trigger if already loading this step
    if (currentStepData?._needsExpansion &&
        currentStepData._outlineStepId &&
        !currentStepData._isLoading &&
        !phasedScaffoldContext.isLoadingStep) {
      console.log('[SolutionScaffold] Loading step expansion for:', currentStepData._outlineStepId)
      phasedScaffoldContext.loadStepExpansion(currentStepData._outlineStepId)
    }
  }, [currentStep, data.steps, phasedScaffoldContext, useMicroTasks])

  useEffect(() => {
    if (!sessionModeState) return
    const { state: updatedState } = evaluateSessionMode(
      sessionModeState,
      masteryScoreRef.current
    )
    if (
      updatedState.mode !== sessionModeState.mode ||
      updatedState.recentErrorTimestamps.length !== sessionModeState.recentErrorTimestamps.length
    ) {
      setSessionModeState(updatedState)
      setSessionMode(updatedState.mode)
    }
  }, [currentStep, sessionModeState])

  // Determine if all steps are "complete" (real or simulated for testing)
  const allStepsComplete = useMemo(() => {
    if (skipStepsMode) return true
    return completedSteps.length === data.steps.length
  }, [skipStepsMode, completedSteps.length, data.steps.length])

  // Generate session ID for circuit breaker (stable across component lifecycle)
  const sessionId = useRef(`session_${Date.now()}`).current

  // Generate problem ID for circuit breaker (needs to be before hook call)
  const currentProblemId = generateProblemId(data.problem)

  // Get userId for pivot
  const pivotUserId = useMemo(() => {
    if (typeof window === 'undefined') return 'anonymous'
    return localStorage.getItem('physiscaffold_user') || 'anonymous'
  }, [])

  // Pivot Injection hook
  const {
    isInitialized: pivotInitialized,
    activePivot,
    activeStepIndex: pivotStepIndex,
    checkTrigger: checkPivotTrigger,
    showPivot,
    answerPivot,
    skipPivot,
    dismissPivot,
    hasActivePivot,
  } = usePivot({
    sessionId,
    userId: pivotUserId,
    stepCount: data.steps.length,
    enabled: FEATURE_FLAGS.PIVOT_INJECTION && !isInterviewMode,
  })

  // Pivot timer ref for checking time-based triggers
  const lastPivotCheckRef = useRef<Map<number, number>>(new Map())

  // Circuit Breaker integration
  const {
    state: circuitBreakerState,
    isProblemLocked,
    currentDrill,
    warningMessage,
    warningTag,
    recordError: recordCircuitBreakerError,
    recordGradingErrors,
    startDrill,
    completeDrill,
    skipDrill,
    dismissWarning,
  } = useCircuitBreaker({
    sessionId,
    problemId: currentProblemId,
  })

  // State for showing drill modal
  const [showDrillModal, setShowDrillModal] = useState(false)

  // State for Socratic Rewind
  const [showSocraticRewind, setShowSocraticRewind] = useState(false)
  const [socraticRewindContext, setSocraticRewindContext] = useState<SocraticRewindContext | null>(null)
  const [socraticRewindTrigger, setSocraticRewindTrigger] = useState<RewindTriggerSource>('sanity_check_failed')

  // Initialize P0 Gating Policy, Cognitive Load Governor, and Momentum Engine
  useEffect(() => {
    if (gatingPolicyInitRef.current) return
    gatingPolicyInitRef.current = true

    // Get or create session policy
    const policy = getOrCreateSessionPolicy()
    setGatingPolicy(policy)

    // Initialize Cognitive Load Governor if enabled
    if (FEATURE_FLAGS.COGNITIVE_LOAD_GOVERNOR) {
      const loadState = getOrCreateCognitiveLoadState()
      const loadMetrics = getOrCreateSessionLoadMetrics()
      setCognitiveLoadState(loadState)
      setCognitiveLoadMetrics(loadMetrics)
      setCognitiveLoadUIConfig(getUIConfigForLoadScore(loadState.score))
    }

    // Initialize Momentum Engine (always enabled - lightweight motivation)
    if (!momentumInitRef.current) {
      momentumInitRef.current = true
      const momentum = getOrCreateMomentumState()
      setMomentumState(momentum)
    }

    // Clear policy and cognitive load state on unmount (new problem = fresh state)
    return () => {
      clearSessionPolicy()
      if (FEATURE_FLAGS.COGNITIVE_LOAD_GOVERNOR) {
        clearCognitiveLoadState()
      }
    }
  }, [])

  // Track step activation time for cognitive load metrics
  useEffect(() => {
    if (!FEATURE_FLAGS.COGNITIVE_LOAD_GOVERNOR || !cognitiveLoadMetrics) return

    // Record activation time if not already set
    if (!stepActivationTimesRef.current.has(currentStep)) {
      stepActivationTimesRef.current.set(currentStep, Date.now())

      // Also track step activation in metrics
      const updatedMetrics = recordStepActivation(cognitiveLoadMetrics, currentStep)
      setCognitiveLoadMetrics(updatedMetrics)
      saveSessionLoadMetrics(updatedMetrics)
    }
  }, [currentStep, cognitiveLoadMetrics])

  // Update cognitive load metrics when circuit breaker state changes
  useEffect(() => {
    if (!FEATURE_FLAGS.COGNITIVE_LOAD_GOVERNOR || !cognitiveLoadMetrics) return

    const updatedMetrics = updateCircuitBreakerState(cognitiveLoadMetrics, circuitBreakerState)
    if (updatedMetrics.circuitBreakerState !== cognitiveLoadMetrics.circuitBreakerState) {
      setCognitiveLoadMetrics(updatedMetrics)
      saveSessionLoadMetrics(updatedMetrics)
    }
  }, [circuitBreakerState, cognitiveLoadMetrics])

  // P0 Rebuild Gate: Handler for when hint level 5 is used
  const handleRebuildGateTriggered = useCallback((stepId: number, stepTitle: string) => {
    if (!FEATURE_FLAGS.P0_REBUILD_GATES || !gatingPolicy) return

    const updatedPolicy = triggerRebuildGate(
      gatingPolicy,
      stepId,
      stepTitle,
      data.patterns,
      data.primaryPatternId
    )
    setGatingPolicy(updatedPolicy)
  }, [gatingPolicy, data.patterns, data.primaryPatternId])

  // P0 Rebuild Gate: Handler for answering rebuild questions
  const handleRebuildGateAnswer = useCallback((stepId: number, questionIndex: number, selectedIndex: number) => {
    if (!gatingPolicy) return { isCorrect: false, allPassed: false }

    const { updatedPolicy, isCorrect, allPassed } = recordRebuildAnswer(
      gatingPolicy,
      stepId,
      questionIndex,
      selectedIndex
    )
    setGatingPolicy(updatedPolicy)

    // Track momentum for rebuild gate pass
    if (allPassed && momentumState) {
      const patternId = data.primaryPatternId
      const problemId = generateProblemId(data.problem)

      const { updatedState, event } = recordRebuildWin(momentumState, {
        patternId,
        stepId,
        problemId,
      })
      setMomentumState(updatedState)
      if (event) {
        setPendingMomentumEvent(event)
      }
    }

    return { isCorrect, allPassed }
  }, [gatingPolicy, momentumState, data.primaryPatternId, data.problem])

  // P0 Rebuild Gate: Get gate state for a step
  const getRebuildGateState = useCallback((stepId: number): StepRebuildGateState | null => {
    if (!gatingPolicy) return null
    return gatingPolicy.stepRebuildGates.get(stepId) || null
  }, [gatingPolicy])

  // P0 Rebuild Gate: Check if step can proceed
  const canStepProceed = useCallback((stepId: number): boolean => {
    if (!FEATURE_FLAGS.P0_REBUILD_GATES || !gatingPolicy) return true
    return canProceedFromStep(gatingPolicy, stepId)
  }, [gatingPolicy])

  // P0 Decision Gate: Check if step requires decision gate
  const stepRequiresDecisionGate = useCallback((stepId: number, stepType: string | undefined, hasMicroTasks: boolean): boolean => {
    if (!FEATURE_FLAGS.P0_DECISION_GATES || !gatingPolicy) return false
    return requiresDecisionGate(gatingPolicy, stepId, stepType, hasMicroTasks)
  }, [gatingPolicy])

  // P0 Decision Gate: Get gate state for a step
  const getDecisionGateState = useCallback((stepId: number): StepDecisionGateState | null => {
    if (!gatingPolicy) return null
    return getStepDecisionGateState(gatingPolicy, stepId)
  }, [gatingPolicy])

  // Track step-level errors (moved here to be available for decision gate callback)
  const recordStepError = useCallback((stepId: number) => {
    setStepErrorCounts(prev => {
      const next = new Map(prev)
      next.set(stepId, (next.get(stepId) || 0) + 1)
      return next
    })
  }, [])

  const registerSessionError = useCallback((stepId?: number) => {
    if (stepId !== undefined) {
      recordStepError(stepId)
    }
    const seedMode = sessionModeSeed || 'guided'
    const baseState = sessionModeState ?? getOrCreateSessionModeState(seedMode)
    const { state: updatedState } = recordSessionModeError(
      baseState,
      masteryScoreRef.current
    )
    setSessionModeState(updatedState)
    setSessionMode(updatedState.mode)
  }, [recordStepError, sessionModeSeed, sessionModeState])

  // P0 Decision Gate: Record micro-task attempt
  const handleRecordDecisionGateAttempt = useCallback((stepId: number, isCorrect: boolean): { shouldAutoUnlockHint: boolean } => {
    if (!gatingPolicy) return { shouldAutoUnlockHint: false }

    // Check if this is a first attempt (no previous attempts on this task)
    const currentGateState = getStepDecisionGateState(gatingPolicy, stepId)
    const isFirstAttempt = currentGateState.currentAttempts === 0

    const { updatedPolicy, shouldAutoUnlockHint } = recordMicroTaskAttempt(
      gatingPolicy,
      stepId,
      isCorrect
    )
    setGatingPolicy(updatedPolicy)

    if (!isCorrect) {
      registerSessionError(stepId)
    }

    // Track momentum for decision gates
    if (momentumState) {
      const patternId = data.primaryPatternId
      const problemId = generateProblemId(data.problem)

      if (isCorrect) {
        const { updatedState, event } = recordDecisionWin(momentumState, {
          isFirstAttempt,
          patternId,
          stepId,
          problemId,
        })
        setMomentumState(updatedState)
        if (event) {
          setPendingMomentumEvent(event)
        }
      } else {
        const { updatedState } = recordDecisionFailure(momentumState, {
          patternId,
          stepId,
          problemId,
        })
        setMomentumState(updatedState)
      }
    }

    return { shouldAutoUnlockHint }
  }, [gatingPolicy, momentumState, data.primaryPatternId, data.problem, registerSessionError])

  // P0 Decision Gate: Get required micro-task count
  const getDecisionGateRequiredCount = useCallback((): number => {
    if (!gatingPolicy) return 1
    return getRequiredMicroTaskCount(gatingPolicy)
  }, [gatingPolicy])

  // Auto-show drill modal when circuit breaker trips
  useEffect(() => {
    if (circuitBreakerState === 'TRIPPED' && currentDrill && !showDrillModal) {
      // Small delay to let the user see the tripped state
      const timer = setTimeout(() => {
        startDrill()
        setShowDrillModal(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [circuitBreakerState, currentDrill, showDrillModal, startDrill])

  // Helper to build Socratic Rewind context from circuit breaker
  const buildCircuitBreakerRewindContext = useCallback((): SocraticRewindContext | null => {
    if (!warningTag) return null

    // Get the last completed step as the anchor
    const lastCompletedStepId = completedSteps.length > 0
      ? Math.max(...completedSteps)
      : 0
    const previousStep = data.steps[lastCompletedStepId]
    if (!previousStep) return null

    // Map error tags to error types
    const tagToErrorType: Record<string, SocraticRewindContext['currentError']['errorType']> = {
      sign_convention: 'sign_convention',
      vector_components: 'vector_direction',
      trig_identities: 'algebra_error',
      unit_conversion: 'unit_error',
      algebra_manipulation: 'algebra_error',
      conservation_scope: 'wrong_equation',
      reference_frame: 'vector_direction',
      force_identification: 'force_missing',
    }

    const tagToDescription: Record<string, string> = {
      sign_convention: 'Sign convention errors were detected',
      vector_components: 'Vector component errors were detected',
      trig_identities: 'Trigonometric identity errors were detected',
      unit_conversion: 'Unit conversion errors were detected',
      algebra_manipulation: 'Algebraic manipulation errors were detected',
      conservation_scope: 'Conservation law scope errors were detected',
      reference_frame: 'Reference frame errors were detected',
      force_identification: 'Force identification errors were detected',
    }

    return {
      previousValidStep: {
        stepId: lastCompletedStepId,
        stepTitle: previousStep.title,
        stepContent: previousStep.question || previousStep.title,
        userAnswer: stepAnswers.get(lastCompletedStepId),
      },
      currentError: {
        description: tagToDescription[warningTag] || 'Multiple errors of the same type were detected',
        errorType: tagToErrorType[warningTag] || 'other',
      },
      violatedPrinciple: {
        name: warningTag.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        description: 'This error pattern triggered the circuit breaker after repeated occurrences.',
        category: 'math',
      },
      problemContext: {
        problemText: data.problem,
        domain: data.domain,
        subdomain: data.subdomain,
      },
    }
  }, [warningTag, completedSteps, data, stepAnswers])

  // Drill completion handlers
  const handleDrillComplete = useCallback((success: boolean) => {
    completeDrill(success)
    setShowDrillModal(false)

    // Trigger Socratic Rewind if drill was failed
    if (!success) {
      const rewindContext = buildCircuitBreakerRewindContext()
      if (rewindContext) {
        // Small delay to let drill modal close
        setTimeout(() => {
          setSocraticRewindContext(rewindContext)
          setSocraticRewindTrigger('circuit_breaker')
          setShowSocraticRewind(true)
        }, 500)
      }
    }
  }, [completeDrill, buildCircuitBreakerRewindContext])

  const handleDrillSkip = useCallback(() => {
    skipDrill()
    setShowDrillModal(false)

    // Trigger Socratic Rewind when drill is skipped
    const rewindContext = buildCircuitBreakerRewindContext()
    if (rewindContext) {
      // Small delay to let drill modal close
      setTimeout(() => {
        setSocraticRewindContext(rewindContext)
        setSocraticRewindTrigger('circuit_breaker')
        setShowSocraticRewind(true)
      }, 500)
    }
  }, [skipDrill, buildCircuitBreakerRewindContext])

  // Handler for micro-task incorrect events (passed to MicroTaskStepAccordion)
  const handleTaskIncorrect = useCallback((stepId: number, errorTag: ErrorTag) => {
    recordCircuitBreakerError(errorTag, stepId, 'task_incorrect')

    // Create mistake card for incorrect micro-task
    if (FEATURE_FLAGS.MISTAKE_NOTEBOOK) {
      const step = (data as MicroTaskScaffoldData).steps.find(s => s.id === stepId)
      if (step) {
        const cardInput: CreateCardInput = {
          problemId: generateProblemId(data.problem),
          problemTitle: generateProblemTitle(data.problem),
          stepId,
          stepTitle: step.title,
          conceptTags: step.requiredConcepts || [],
          stepType: step.stepType || 'physics_concept',
          domain: data.domain,
          subdomain: data.subdomain,
          trigger: 'task_incorrect' as MistakeTrigger,
          hintLevelReached: microTaskProgress.get(stepId)?.currentLevel || 1,
          attemptCount: microTaskProgress.get(stepId)?.taskAttempts.reduce((sum, t) => sum + t.attempts, 0) || 1,
        }

        const newCard = createCardIfNotExists(cardInput)
        if (newCard) {
          setLastCreatedMistakeCard(newCard)
          setShowMistakeNotification(true)
          setTimeout(() => setShowMistakeNotification(false), 3000)
          console.log(`[MistakeNotebook] Created card for micro-task ${stepId}: ${newCard.misconceptionNote}`)
        }
      }
    }
  }, [recordCircuitBreakerError, data, microTaskProgress])

  // Handlers for micro-task mode
  const handleMicroTaskComplete = useCallback((stepId: number, level: number, explanation: string) => {
    setMicroTaskProgress(prev => {
      const newMap = new Map(prev)
      const current = newMap.get(stepId) || {
        stepId,
        isCompleted: false,
        currentLevel: 1,
        taskAttempts: [],
        collectedInsights: []
      }

      current.taskAttempts.push({ level, attempts: 1, isCompleted: true })
      current.currentLevel = level + 1
      current.collectedInsights.push(explanation)

      // Check if all tasks are completed for this step
      // Guard: only mark complete if step has tasks (prevents false completion for unexpanded steps)
      const microData = data as MicroTaskScaffoldData
      const step = microData.steps.find(s => s.id === stepId)
      const maxTaskLevel = step ? Math.min(step.tasks.length, modeConfig.maxTaskLevel) : 0
      if (step && step.tasks.length > 0 && current.currentLevel > maxTaskLevel) {
        current.isCompleted = true
      }

      newMap.set(stepId, current)
      return newMap
    })
  }, [data, modeConfig.maxTaskLevel])

  const handleMicroStepComplete = useCallback((stepId: number) => {
    // Mark step as completed
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps(prev => [...prev, stepId])
    }

    // Show confidence prompt before moving to next step
    if (FEATURE_FLAGS.CONFIDENCE_WEIGHTED_SRS) {
      setPendingConfidenceStepId(stepId)
    } else {
      // Without confidence feature, move directly to next step
      const stepIndex = (data as MicroTaskScaffoldData).steps.findIndex(s => s.id === stepId)
      if (stepIndex < (data as MicroTaskScaffoldData).steps.length - 1) {
        setCurrentStep(stepIndex + 1)
      }
    }
  }, [completedSteps, data])

  // Generate a unique problem ID based on the problem text hash
  const problemId = useCallback(() => {
    return generateProblemId(data.problem)
  }, [data.problem])

  const problemTitle = useCallback(() => {
    return generateProblemTitle(data.problem)
  }, [data.problem])

  // Extract problem constraints on load for real-time collision detection
  useEffect(() => {
    const constraints = extractConstraints(data.problem, problemId())
    setProblemConstraints(constraints)
    console.log('[ConstraintCollision] Extracted constraints:', constraints.statedConstraints.length, 'stated,', constraints.impliedConstraints.length, 'implied')
  }, [data.problem, problemId])

  // Cleanup constraint check timer on unmount
  useEffect(() => {
    return () => {
      if (constraintCheckTimerRef.current) {
        clearTimeout(constraintCheckTimerRef.current)
      }
    }
  }, [])

  // Track if we've done the initial load to prevent re-running on data updates
  const hasLoadedProgressRef = useRef(false)

  // Load saved progress and generate mistake warnings on mount
  useEffect(() => {
    // Generate warnings based on past patterns
    const warnings = mistakeTrackingService.generateWarnings(
      data.concepts,
      `${data.domain} - ${data.subdomain}`
    )
    setMistakeWarnings(warnings)

    // Load related past mistakes from the mistake notebook
    if (FEATURE_FLAGS.MISTAKE_NOTEBOOK) {
      const conceptTags = data.concepts.map(c => c.id)
      const pastMistakes = getFilteredCards({
        conceptTags,
        dueOnly: false, // Show all related, not just due
      })
      // Keep only the 3 most recent related mistakes
      const recentMistakes = pastMistakes
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3)
      setRelatedMistakes(recentMistakes)

      if (recentMistakes.length > 0) {
        console.log(`[MistakeNotebook] Found ${recentMistakes.length} related past mistakes for this problem`)
      }
    }

    // Only load saved progress on initial mount, not on data updates
    // This prevents resetting completedSteps when adaptedData updates
    if (hasLoadedProgressRef.current) {
      return
    }
    hasLoadedProgressRef.current = true

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

        if (progress.sessionMode) {
          const seededState = createInitialSessionModeState(progress.sessionMode)
          saveSessionModeState(seededState)
          setSessionModeState(seededState)
          setSessionMode(progress.sessionMode)
          setSessionModeSeed(progress.sessionMode)
        }

        // Get current steps for validation (if using micro-tasks)
        const microSteps = useMicroTasks ? (data as MicroTaskScaffoldData).steps : null

        // Check if saved progress was from micro-tasks mode but current data isn't
        // This happens when phased scaffold was disabled - don't restore stale completions
        const savedWasMicroTasks = progress.useMicroTasks === true
        const currentIsMicroTasks = useMicroTasks
        const modeChanged = savedWasMicroTasks !== currentIsMicroTasks

        progress.stepProgress.forEach((sp: StepProgress) => {
          if (sp.userAnswer) {
            answers.set(sp.stepId, sp.userAnswer)
          }
          if (sp.isCompleted && !modeChanged) {
            // Validate: only restore completion if step has actual tasks loaded
            // This prevents false completion from stale localStorage when steps haven't been expanded
            if (microSteps) {
              const step = microSteps.find(s => s.id === sp.stepId)
              if (step && step.tasks.length > 0) {
                completed.push(sp.stepId)
              }
              // Skip completion for steps with no tasks (unexpanded phased scaffold steps)
            } else {
              // Only restore if we have a valid hint level (user actually worked on this step)
              if (sp.currentHintLevel && sp.currentHintLevel > 0) {
                completed.push(sp.stepId)
              }
            }
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

        // Load micro-task progress if it exists
        if (progress.useMicroTasks && progress.microTaskProgress) {
          const microProgress = new Map<number, MicroTaskStepProgress>()
          progress.microTaskProgress.forEach(mp => {
            microProgress.set(mp.stepId, mp)
          })
          setMicroTaskProgress(microProgress)
        }

        // Load pattern selection if it exists (Pattern-First Mode)
        if (progress.patternSelection) {
          setPatternSelectionState({
            selectedPatternId: progress.patternSelection.selectedPatternId,
            decisionTimeMs: progress.patternSelection.patternDecisionTimeMs,
            isCorrect: progress.patternSelection.patternDecisionCorrect,
            confidence: progress.patternSelection.patternDecisionCorrect ? 'strong' : 'weak',
            timedOut: progress.patternSelection.patternTimedOut,
            timestamp: '',
          })
        }

        // Load skip/commit decision if it exists
        if (progress.skipCommit) {
          setSkipCommitState(prev => ({
            ...prev,
            decision: progress.skipCommit?.decision ?? null,
            decisionTimeMs: progress.skipCommit?.decisionTimeMs ?? null,
            wasSkipped: progress.skipCommit?.wasSkipped ?? false,
            wasAutoCommit: progress.skipCommit?.wasAutoCommit ?? false,
            gateShownAt: progress.skipCommit?.gateShownAt ?? null,
            decisionMadeAt: progress.skipCommit?.decisionMadeAt ?? null,
          }))

          if (progress.skipCommit.gateShownAt || progress.skipCommit.decision) {
            skipCommitGateShownRef.current = true
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId, data.concepts, data.domain, data.subdomain])

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
  }, [stepAnswers, completedSteps, stepHintLevels, currentStep, sanityCheckAnswer, microTaskProgress])

  // Pattern-First Mode: Show modal on initial mount if enabled
  const patternFirstShownRef = useRef(false)
  useEffect(() => {
    // Only run once on mount
    if (patternFirstShownRef.current) return

    // Check if pattern-first mode should show
    const timePressure = patternFirstCfg
    const existingSelection = patternSelectionState ? toProgressFormat(patternSelectionState) : undefined

    if (FEATURE_FLAGS.PATTERN_FIRST_MODE &&
        shouldShowPatternFirst(data.patterns, timePressure, existingSelection)) {
      patternFirstShownRef.current = true
      setShowPatternFirst(true)
      setIsScaffoldLocked(true)
      setShowPatternPickWarning(false)
      patternGateStartedAtRef.current = Date.now()
      patternGateLockedRef.current = true
      patternUnlockLoggedRef.current = false

      // Log analytics
      logPatternFirstShown(
        currentProblemId,
        data.patterns?.length || 0,
        timePressure.lockSeconds
      )
    }
  }, [data.patterns, patternFirstCfg, patternSelectionState, currentProblemId])

  // Pattern-First Mode: Handler for pattern selection
  const handlePatternSelect = useCallback((patternId: string, elapsedTimeMs: number) => {
    const beforeUnlock = patternGateLockedRef.current === true
    const primaryPatternId = data.primaryPatternId
    const isCorrect = primaryPatternId
      ? validateSelection(patternId, primaryPatternId, data.secondaryPatternIds).isCorrect
      : null

    const state = createSelectionState(patternId, elapsedTimeMs, isCorrect)
    setPatternSelectionState(state)
    setShowPatternPickWarning(false)

    // Update P0 gating policy with pattern gate result (only if canonical is defined)
    if (gatingPolicy && primaryPatternId) {
      const updatedPolicy = processPatternGateSelection(
        gatingPolicy,
        patternId,
        primaryPatternId,
        data.secondaryPatternIds,
        elapsedTimeMs
      )
      setGatingPolicy(updatedPolicy)
    }

    // Log analytics
    logPatternSelected(currentProblemId, patternId, elapsedTimeMs, beforeUnlock)
    if (isCorrect !== null) {
      logPatternCorrectness(currentProblemId, isCorrect)
    }

    // Unlock scaffold after short delay for visual feedback (only once)
    if (beforeUnlock) {
      setTimeout(() => {
        setShowPatternFirst(false)
        setIsScaffoldLocked(false)
        patternGateLockedRef.current = false
        if (!patternUnlockLoggedRef.current) {
          patternUnlockLoggedRef.current = true
          logPatternFirstUnlock(currentProblemId, false)
        }
      }, 800)
    }
  }, [currentProblemId, data.primaryPatternId, data.secondaryPatternIds, gatingPolicy])

  // Pattern-First Mode: Handler for timeout
  const handlePatternTimeout = useCallback((elapsedTimeMs: number) => {
    const state = createTimeoutState(elapsedTimeMs)
    setPatternSelectionState(state)

    // Update P0 gating policy with timeout result (weak confidence)
    if (gatingPolicy) {
      const updatedPolicy = processPatternGateTimeout(gatingPolicy, elapsedTimeMs)
      setGatingPolicy(updatedPolicy)
    }

    // Log timeout
    logPatternTimeout(currentProblemId, elapsedTimeMs)

    // Auto-unlock after timeout (non-blocking warning stays)
    setShowPatternFirst(false)
    setIsScaffoldLocked(false)
    setShowPatternPickWarning(true)
    patternGateLockedRef.current = false
    if (!patternUnlockLoggedRef.current) {
      patternUnlockLoggedRef.current = true
      logPatternFirstUnlock(currentProblemId, true)
    }
  }, [currentProblemId, gatingPolicy])

  // Pattern-First Mode: Handler for skip (after timeout)
  const handlePatternSkip = useCallback(() => {
    setShowPatternFirst(false)
    setIsScaffoldLocked(false)
    patternGateLockedRef.current = false
    if (!patternUnlockLoggedRef.current) {
      patternUnlockLoggedRef.current = true
      logPatternFirstUnlock(currentProblemId, true)
    }
  }, [currentProblemId])

  // Begin the finalize flow (Explain to Friend, then Reflection, then Mark Solved)
  const beginFinalizeFlow = useCallback(() => {
    // Show Explain to a Friend first (Feynman Technique)
    setShowExplainToFriend(true)
    showTimedSaveMessage('Explain the solution to proceed', 3000)
  }, [showTimedSaveMessage])

  const handlePatternPickerSelect = useCallback((patternId: string) => {
    const startedAt = patternGateStartedAtRef.current
    const timeMs = startedAt ? Date.now() - startedAt : 0
    handlePatternSelect(patternId, timeMs)

    if (pendingFinalizeAfterPatternPickRef.current) {
      pendingFinalizeAfterPatternPickRef.current = false
      beginFinalizeFlow()
    }
  }, [handlePatternSelect, beginFinalizeFlow])

  // Skip-or-Commit Gate: Timer to show the gate
  useEffect(() => {
    // Only run once
    if (skipCommitGateShownRef.current) return
    if (!FEATURE_FLAGS.SKIP_COMMIT_GATE) return
    if (!skipCommitCfg.enableSkipCommit) return
    if (isProblemSolved || skipCommitState.decision) return

    const gateSeconds = skipCommitCfg.gateSeconds

    skipCommitTimerRef.current = setTimeout(() => {
      if (!skipCommitGateShownRef.current && !isProblemSolved) {
        skipCommitGateShownRef.current = true
        setShowSkipCommitGate(true)
        setSkipCommitCountdownStartSeconds(skipCommitCfg.autoCommitSeconds)
        setSkipCommitState(prev => ({
          ...prev,
          gateShownAt: Date.now(),
        }))
      }
    }, gateSeconds * 1000)

    return () => {
      if (skipCommitTimerRef.current) {
        clearTimeout(skipCommitTimerRef.current)
      }
    }
  }, [skipCommitCfg, isProblemSolved, skipCommitState.decision])

  // Skip-or-Commit Gate: Resume behavior (gate already shown in this attempt)
  useEffect(() => {
    if (!FEATURE_FLAGS.SKIP_COMMIT_GATE) return
    if (!skipCommitCfg.enableSkipCommit) return
    if (isProblemSolved) return
    if (skipCommitState.decision) return
    if (!skipCommitState.gateShownAt) return

    // If the gate was already shown, either re-show it (with remaining time)
    // or auto-commit if its countdown has already elapsed.
    const elapsedMs = Date.now() - skipCommitState.gateShownAt
    const autoCommitMs = skipCommitCfg.autoCommitSeconds * 1000
    if (elapsedMs >= autoCommitMs) {
      const now = Date.now()
      setSkipCommitState({
        decision: 'commit',
        decisionTimeMs: elapsedMs,
        wasSkipped: false,
        wasAutoCommit: true,
        gateShownAt: skipCommitState.gateShownAt,
        decisionMadeAt: now,
      })
      setShowSkipCommitGate(false)
      setSkipCommitCountdownStartSeconds(null)
      return
    }

    const remainingSeconds = Math.max(1, Math.ceil((autoCommitMs - elapsedMs) / 1000))
    setSkipCommitCountdownStartSeconds(remainingSeconds)
    setShowSkipCommitGate(true)
  }, [isProblemSolved, skipCommitCfg, skipCommitState.decision, skipCommitState.gateShownAt])

  // Skip-or-Commit Gate: Handler for commit
  const handleSkipCommitCommit = useCallback(() => {
    const now = Date.now()
    const decisionTimeMs = skipCommitState.gateShownAt
      ? now - skipCommitState.gateShownAt
      : null

    setSkipCommitState({
      decision: 'commit',
      decisionTimeMs,
      wasSkipped: false,
      wasAutoCommit: false,
      gateShownAt: skipCommitState.gateShownAt,
      decisionMadeAt: now,
    })
    setShowSkipCommitGate(false)
    setSkipCommitCountdownStartSeconds(null)
  }, [skipCommitState.gateShownAt])

  // Get current problem progress for saving
  const getCurrentProgress = useCallback((): ProblemProgress => {
    const stepProgress: StepProgress[] = data.steps.map((step, index) => {
      // For micro-task mode, use step.id; for hint-based mode, use index
      const stepId = useMicroTasks ? step.id : index
      return {
        stepId,
        isCompleted: completedSteps.includes(stepId),
        userAnswer: stepAnswers.get(stepId),
        currentHintLevel: stepHintLevels.get(stepId),
        confidence: stepConfidenceRatings.get(stepId),
      }
    })

    const progress: ProblemProgress = {
      problemText: data.problem,
      stepProgress,
      sanityCheckAnswer,
      currentStep,
      sessionMode,
      reflectionAnswers: reflectionAnswers.length > 0 ? reflectionAnswers : undefined,
      timeSpentMs: Date.now() - problemStartTime,
      expectedSolveTimeMs: data.timePressure?.expectedSolveTimeSeconds
        ? data.timePressure.expectedSolveTimeSeconds * 1000
        : undefined,
      wasCorrect: solutionGradeResult?.status
        ? solutionGradeResult.status === 'SUCCESS'
        : undefined,
    }

    // Include micro-task progress if in micro-task mode
    if (useMicroTasks && microTaskProgress.size > 0) {
      progress.useMicroTasks = true
      progress.microTaskProgress = Array.from(microTaskProgress.values())
    }

    // Include pattern selection if available (Pattern-First Mode)
    if (patternSelectionState) {
      progress.patternSelection = toProgressFormat(patternSelectionState)
    }

    // Include skip/commit decision if available
    if (skipCommitState.gateShownAt || skipCommitState.decision) {
      progress.skipCommit = toSkipCommitPersistence(skipCommitState)
    }

    return progress
  }, [data, completedSteps, stepAnswers, stepHintLevels, stepConfidenceRatings, sanityCheckAnswer, currentStep, sessionMode, reflectionAnswers, useMicroTasks, microTaskProgress, patternSelectionState, skipCommitState, problemStartTime, solutionGradeResult])

  // Skip-or-Commit Gate: Handler for skip
  const handleSkipCommitSkip = useCallback(() => {
    const now = Date.now()
    const decisionTimeMs = skipCommitState.gateShownAt
      ? now - skipCommitState.gateShownAt
      : null

    setSkipCommitState({
      decision: 'skip',
      decisionTimeMs,
      wasSkipped: true,
      wasAutoCommit: false,
      gateShownAt: skipCommitState.gateShownAt,
      decisionMadeAt: now,
    })
    setShowSkipCommitGate(false)
    setSkipCommitCountdownStartSeconds(null)

    // Save attempt as skipped
    try {
      const progress = getCurrentProgress()
      problemHistoryService.saveDraft(problemId(), problemTitle(), progress)
      problemHistoryService.markAttemptSkipped(problemId())
    } catch (error) {
      console.error('Failed to persist skipped attempt:', error)
    }

    // Show toast
    setShowSkipToast(true)
    setTimeout(() => {
      setShowSkipToast(false)
      // Navigate to next problem / reset
      onReset()
    }, 2000)
  }, [skipCommitState.gateShownAt, onReset, getCurrentProgress, problemId, problemTitle])

  // Skip-or-Commit Gate: Handler for auto-commit
  const handleSkipCommitAutoCommit = useCallback(() => {
    const now = Date.now()
    const decisionTimeMs = skipCommitState.gateShownAt
      ? now - skipCommitState.gateShownAt
      : null

    setSkipCommitState({
      decision: 'commit',
      decisionTimeMs,
      wasSkipped: false,
      wasAutoCommit: true,
      gateShownAt: skipCommitState.gateShownAt,
      decisionMadeAt: now,
    })
    setShowSkipCommitGate(false)
    setSkipCommitCountdownStartSeconds(null)
  }, [skipCommitState.gateShownAt])

  const handleSaveDraft = useCallback((silent = false) => {
    if (!silent) setIsSaving(true)

    try {
      const progress = getCurrentProgress()
      problemHistoryService.saveDraft(problemId(), problemTitle(), progress)

      if (!silent) {
        showTimedSaveMessage('Draft saved!', 2000)
        setIsSaving(false)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save draft'
      console.error('Save error:', error)
      if (!silent) {
        showTimedSaveMessage(`Error: ${errorMessage}`, 4000)
        setIsSaving(false)
      }
    }
  }, [getCurrentProgress, problemId, problemTitle, showTimedSaveMessage])

  // Persist decision-gate state promptly (Pattern-First + Skip/Commit)
  useEffect(() => {
    if (!patternSelectionState) return
    handleSaveDraft(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patternSelectionState?.selectedPatternId, patternSelectionState?.timedOut])

  useEffect(() => {
    if (!skipCommitState.decision && !skipCommitState.gateShownAt) return
    handleSaveDraft(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skipCommitState.decision, skipCommitState.wasAutoCommit, skipCommitState.wasSkipped, skipCommitState.decisionTimeMs, skipCommitState.gateShownAt])

  const handleMarkSolved = useCallback(() => {
    const requiresPatternSelection =
      FEATURE_FLAGS.PATTERN_FIRST_MODE &&
      patternFirstCfg.enablePatternFirst &&
      data.patterns &&
      data.patterns.length > 0

    if (requiresPatternSelection && !(patternSelectionState?.selectedPatternId)) {
      pendingFinalizeAfterPatternPickRef.current = true
      setPatternPickerTitle('Pick a pattern to finalize scoring')
      setShowPatternPicker(true)
      setShowPatternPickWarning(true)
      showTimedSaveMessage('Pick a pattern to finalize scoring', 3000)
      return
    }

    pendingFinalizeAfterPatternPickRef.current = false
    beginFinalizeFlow()
  }, [beginFinalizeFlow, data.patterns, patternFirstCfg.enablePatternFirst, patternSelectionState?.selectedPatternId, showTimedSaveMessage])

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
    showTimedSaveMessage('Complete reflection before finalizing', 3000)
  }, [problemId, showTimedSaveMessage])

  const handleSkipExplanation = useCallback(() => {
    // Allow skipping but note it
    setShowExplainToFriend(false)
    setShowReflection(true)
    showTimedSaveMessage('Skipped explanation - Complete reflection', 3000)
  }, [showTimedSaveMessage])

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
          struggledSteps: completedSteps.filter(stepId => (stepHintLevels.get(stepId) || 0) >= 4),
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

      // Update concept mastery tracking
      if (typeof window !== 'undefined') {
        const studentId = localStorage.getItem('physiscaffold_user') || 'anonymous'
        const currentProblemId = problemId()

        // Map AI concepts to network concepts
        const networkConcepts = CONCEPT_NETWORK_DATA.network.nodes
        const conceptMapping = conceptMappingService.mapConcepts(
          data.concepts,
          networkConcepts
        )

        // Process each step to track concept mastery
        data.steps.forEach((step, stepIdx) => {
          // For micro-task mode, use step.id; for hint-based mode, use index
          const stepKey = useMicroTasks ? step.id : stepIdx
          const stepHintLevel = stepHintLevels.get(stepKey) || 0
          const stepCompleted = completedSteps.includes(stepKey)

          // Record mastery for each concept used in this step
          step.requiredConcepts.forEach(aiConceptId => {
            const aiConcept = data.concepts.find(c => c.id === aiConceptId)
            if (!aiConcept) return

            // Get mapped network concept ID (or use AI concept ID if unmapped)
            const networkConceptId = conceptMapping.get(aiConceptId) || aiConceptId

            // Record the attempt
            conceptMasteryService.recordAttempt(
              studentId,
              networkConceptId,
              aiConcept.name,
              {
                problemId: currentProblemId,
                hintLevel: stepHintLevel,
                timeSpent: timeSpent / data.steps.length, // Distribute time across steps
                success: stepCompleted && stepHintLevel < 5, // Success if completed without max hints
              }
            )
          })
        })

        // Cleanup old concept mastery data periodically (every 10th problem)
        const problemCount = problemHistoryService.getHistory().total
        if (problemCount % 10 === 0) {
          conceptMasteryService.cleanup(studentId)
        }
      }

      showTimedSaveMessage('Problem solved and reflection saved!', 3000)
      setIsProblemSolved(true) // Show next challenge
      setShowCelebration(true) // Trigger celebration animation
      setIsSaving(false)

      // Notify parent that problem is solved (for plan session tracking)
      onSolved?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save'
      console.error('Save error:', error)
      showTimedSaveMessage(`Error: ${errorMessage}`, 4000)
      setIsSaving(false)
    }
  }, [getCurrentProgress, problemId, problemTitle, stepHintLevels, completedSteps, data, problemStartTime, analyzeErrorPattern, useMicroTasks, onSolved, showTimedSaveMessage])

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

      showTimedSaveMessage(newFlag ? 'Marked for review 📌' : 'Unmarked for review', 2000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle review'
      console.error('Toggle review error:', error)
      showTimedSaveMessage(`Error: ${errorMessage}`, 4000)
    }
  }, [isReviewFlagged, problemId, showTimedSaveMessage])

  const handleStepComplete = (stepId: number) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId])
    }

    // Interview mode: require explanation before proceeding
    if (isInterviewMode && explanationsRequired) {
      setPendingInterviewExplanation(stepId)
      return // Don't proceed until explanation is submitted
    }

    // If interview mode is enabled but no explanation required, still notify
    if (isInterviewMode && interviewMode?.onStepComplete) {
      const stepIdStr = `step_${stepId}`
      interviewMode.onStepComplete(stepIdStr, undefined).catch(err => {
        console.error('[InterviewMode] Failed to record step completion:', err)
      })
    }

    // Track hint-free wins for momentum
    if (momentumState) {
      const maxHintLevelUsed = stepHintLevels.get(stepId) || 0
      const patternId = data.primaryPatternId
      const problemId = generateProblemId(data.problem)

      const { updatedState, event } = recordHintFreeWin(momentumState, {
        maxHintLevelUsed,
        patternId,
        stepId,
        problemId,
      })
      setMomentumState(updatedState)
      if (event) {
        setPendingMomentumEvent(event)
      }
    }

    // Track step completion for cognitive load and update score
    if (FEATURE_FLAGS.COGNITIVE_LOAD_GOVERNOR && cognitiveLoadMetrics && cognitiveLoadState) {
      // Calculate time spent on this step
      const activationTime = stepActivationTimesRef.current.get(stepId)
      if (activationTime) {
        const timeSpentSeconds = Math.floor((Date.now() - activationTime) / 1000)
        let updatedMetrics = { ...cognitiveLoadMetrics }

        // Find or create step metrics
        const stepMetrics = updatedMetrics.stepMetrics.find(s => s.stepId === stepId)
        if (stepMetrics) {
          stepMetrics.timeSpentSeconds = timeSpentSeconds
          stepMetrics.isCompleted = true
        }

        // Update total time
        updatedMetrics.totalTimeSpentSeconds = updatedMetrics.stepMetrics.reduce(
          (sum, s) => sum + s.timeSpentSeconds, 0
        )

        // Complete the step
        updatedMetrics = recordStepCompletion(updatedMetrics, stepId)
        setCognitiveLoadMetrics(updatedMetrics)
        saveSessionLoadMetrics(updatedMetrics)

        // Recompute cognitive load score after step submission
        const { state: newState, event } = updateCognitiveLoadAfterStep(cognitiveLoadState, updatedMetrics)
        if (newState.score !== cognitiveLoadState.score) {
          setCognitiveLoadState(newState)
          setCognitiveLoadUIConfig(getUIConfigForLoadScore(newState.score))

          // Update gating policy with new cognitive load level
          if (gatingPolicy) {
            const updatedPolicy = updateCognitiveLoadLevel(gatingPolicy, newState.score)
            setGatingPolicy(updatedPolicy)
          }

          console.log(`[CognitiveLoad] Score changed: ${cognitiveLoadState.score} → ${newState.score}`)
        }
      }
    }

    // Show confidence prompt before moving to next step
    if (FEATURE_FLAGS.CONFIDENCE_WEIGHTED_SRS) {
      setPendingConfidenceStepId(stepId)
    } else {
      // Without confidence feature, move directly to next step
      if (stepId < data.steps.length - 1) {
        setCurrentStep(stepId + 1)
      }
    }
  }

  // Handle Socratic-first mode step completion
  const handleSocraticStepComplete = (stepId: number, result: SocraticMasteryResult) => {
    console.log('[Socratic-First] Step completed:', {
      stepId,
      exchanges: result.socraticExchanges,
      hintLevel: result.hintLevelReached,
      calibration: result.calibrationPattern,
      understanding: result.finalUnderstanding,
    })

    // Log event for analytics
    if (typeof window !== 'undefined') {
      try {
        const storageKey = 'physiscaffold_socratic_log'
        const existing = localStorage.getItem(storageKey)
        const logs: Array<{
          timestamp: string
          problemId: string
          stepId: number
          result: SocraticMasteryResult
        }> = existing ? JSON.parse(existing) : []

        logs.push({
          timestamp: new Date().toISOString(),
          problemId: problemId(),
          stepId,
          result,
        })

        // Keep only last 50 entries
        if (logs.length > 50) {
          logs.splice(0, logs.length - 50)
        }

        localStorage.setItem(storageKey, JSON.stringify(logs))
      } catch (error) {
        console.error('Failed to log Socratic result:', error)
      }
    }

    // If there were misconceptions detected, potentially add to review
    if (result.misconceptionsDetected.length > 0 && result.finalUnderstanding !== 'mastered') {
      console.log('[Socratic-First] Misconceptions detected:', result.misconceptionsDetected)
      // TODO: Integrate with mistake notebook to add for review
    }

    // handleStepComplete will be called by StepAccordion after this
  }

  // Handle confidence rating submission
  const handleConfidenceRated = useCallback((stepId: number, confidence: Confidence) => {
    // Store the confidence rating
    setStepConfidenceRatings(prev => {
      const newMap = new Map(prev)
      newMap.set(stepId, confidence)
      return newMap
    })

    // Log confidence for SRS analytics
    const hintLevel = stepHintLevels.get(stepId) || 0
    const isCorrect = hintLevel < 5 // Consider it "correct" if they didn't need full solution
    const outcome = getConfidenceOutcome(isCorrect, confidence)

    // Log to console for debugging (in production, this would go to analytics)
    console.log(`[Confidence-SRS] Step ${stepId}: ${confidence} confidence, outcome: ${outcome}`)

    // Record to localStorage for pattern analysis
    if (typeof window !== 'undefined') {
      try {
        const storageKey = 'physiscaffold_confidence_log'
        const existing = localStorage.getItem(storageKey)
        const logs: Array<{
          timestamp: string
          problemId: string
          stepId: number
          confidence: Confidence
          hintLevel: number
          outcome: string
        }> = existing ? JSON.parse(existing) : []

        logs.push({
          timestamp: new Date().toISOString(),
          problemId: problemId(),
          stepId,
          confidence,
          hintLevel,
          outcome,
        })

        // Keep only last 100 entries
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100)
        }

        localStorage.setItem(storageKey, JSON.stringify(logs))
      } catch (error) {
        console.error('Failed to log confidence:', error)
      }
    }

    // Clear pending confidence prompt
    setPendingConfidenceStepId(null)

    // Move to next step (handle both micro-task and hint-based modes)
    if (useMicroTasks) {
      const stepIndex = (data as MicroTaskScaffoldData).steps.findIndex(s => s.id === stepId)
      if (stepIndex < (data as MicroTaskScaffoldData).steps.length - 1) {
        setCurrentStep(stepIndex + 1)
      }
    } else {
      if (stepId < data.steps.length - 1) {
        setCurrentStep(stepId + 1)
      }
    }

    // Trigger autosave with confidence data
    handleSaveDraft(true)
  }, [data, useMicroTasks, handleSaveDraft, stepHintLevels, problemId])

  // Skip confidence rating (auto-skip or manual)
  const handleConfidenceSkipped = useCallback((stepId: number) => {
    // Default to medium confidence when skipped
    setStepConfidenceRatings(prev => {
      const newMap = new Map(prev)
      newMap.set(stepId, 'medium')
      return newMap
    })

    setPendingConfidenceStepId(null)

    // Move to next step (handle both micro-task and hint-based modes)
    if (useMicroTasks) {
      const stepIndex = (data as MicroTaskScaffoldData).steps.findIndex(s => s.id === stepId)
      if (stepIndex < (data as MicroTaskScaffoldData).steps.length - 1) {
        setCurrentStep(stepIndex + 1)
      }
    } else {
      if (stepId < data.steps.length - 1) {
        setCurrentStep(stepId + 1)
      }
    }
  }, [data, useMicroTasks])

  // Handle interview explanation submission
  const handleInterviewExplanationSubmit = useCallback(async (explanation: ExplanationSubmission) => {
    if (pendingInterviewExplanation === null || !interviewMode?.onStepComplete) return

    const stepId = pendingInterviewExplanation
    const stepIdStr = `step_${stepId}`

    try {
      await interviewMode.onStepComplete(stepIdStr, explanation)
    } catch (err) {
      console.error('[InterviewMode] Failed to submit explanation:', err)
    }

    // Clear pending and proceed to next step
    setPendingInterviewExplanation(null)

    // Continue with normal step completion flow
    // Track hint-free wins for momentum
    if (momentumState) {
      const maxHintLevelUsed = stepHintLevels.get(stepId) || 0
      const patternId = data.primaryPatternId
      const pid = generateProblemId(data.problem)

      const { updatedState, event } = recordHintFreeWin(momentumState, {
        maxHintLevelUsed,
        patternId,
        stepId,
        problemId: pid,
      })
      setMomentumState(updatedState)
      if (event) {
        setPendingMomentumEvent(event)
      }
    }

    // Move to next step
    if (FEATURE_FLAGS.CONFIDENCE_WEIGHTED_SRS) {
      setPendingConfidenceStepId(stepId)
    } else {
      if (stepId < data.steps.length - 1) {
        setCurrentStep(stepId + 1)
      }
    }
  }, [pendingInterviewExplanation, interviewMode, momentumState, stepHintLevels, data])

  const handleStepAnswerChange = (stepId: number, answer: string) => {
    setStepAnswers(prev => {
      const newMap = new Map(prev)
      newMap.set(stepId, answer)
      return newMap
    })

    // Debounced constraint collision check as user types
    if (FEATURE_FLAGS.CONSTRAINT_COLLISION && problemConstraints && answer.length > 20) {
      // Clear previous timer
      if (constraintCheckTimerRef.current) {
        clearTimeout(constraintCheckTimerRef.current)
      }

      // Check after 1 second of no typing
      constraintCheckTimerRef.current = setTimeout(() => {
        // Combine all step answers for analysis
        const allAnswers = new Map(stepAnswers)
        allAnswers.set(stepId, answer)
        const combinedSolution = Array.from(allAnswers.values()).join('\n')

        // Analyze student work and detect collisions
        const analysis = analyzeStudentWork(combinedSolution, problemConstraints)
        const collisions = detectCollisions(problemConstraints, analysis)

        // Filter out dismissed collisions
        const activeCollisions = collisions.filter(c => !dismissedCollisions.has(c.id))

        if (activeCollisions.length > 0) {
          setConstraintCollisions(activeCollisions)

          // Generate Socratic dialogue for the highest severity collision
          const highSeverityCollision = activeCollisions.find(c => c.severity === 'high')
          if (highSeverityCollision) {
            // Build dialogue context from collision details
            const dialogueContext = highSeverityCollision.studentAssumption ? {
              wrongAssumption: highSeverityCollision.studentAssumption.description,
              topicArea: highSeverityCollision.studentAssumption.category,
            } : undefined
            const dialogue = generateSocraticDialogue(highSeverityCollision, dialogueContext)
            setConstraintDialogue(dialogue)
            console.log('[ConstraintCollision] Detected collision:', highSeverityCollision.explanation)
          }
        } else {
          setConstraintCollisions([])
          setConstraintDialogue(null)
        }
      }, 1000)
    }
  }

  const handleHintLevelChange = (stepId: number, level: number) => {
    if (modeConfig.maxHintLevel === 0) return
    const cappedLevel = Math.min(level, modeConfig.maxHintLevel)
    setStepHintLevels(prev => {
      const newMap = new Map(prev)
      newMap.set(stepId, cappedLevel)
      return newMap
    })

    // Track hint unlock for cognitive load (before level 2 check to catch all unlocks)
    if (FEATURE_FLAGS.COGNITIVE_LOAD_GOVERNOR && cognitiveLoadMetrics) {
      const updatedMetrics = recordHintUnlock(cognitiveLoadMetrics, stepId, cappedLevel)
      setCognitiveLoadMetrics(updatedMetrics)
      saveSessionLoadMetrics(updatedMetrics)
    }

    // Create mistake card when user needs significant help (level >= 2)
    if (cappedLevel >= 2 && FEATURE_FLAGS.MISTAKE_NOTEBOOK) {
      const step = data.steps[stepId]
      if (step) {
        const cardInput: CreateCardInput = {
          problemId: problemId(),
          problemTitle: problemTitle(),
          stepId,
          stepTitle: step.title,
          conceptTags: step.requiredConcepts || [],
          stepType: step.stepType || 'physics_concept',
          domain: data.domain,
          subdomain: data.subdomain,
          trigger: 'hint_requested' as MistakeTrigger,
          hintLevelReached: cappedLevel,
        }

        const newCard = createCardIfNotExists(cardInput)
        if (newCard) {
          setLastCreatedMistakeCard(newCard)
          setShowMistakeNotification(true)
          // Auto-hide notification after 3 seconds
          setTimeout(() => setShowMistakeNotification(false), 3000)
          console.log(`[MistakeNotebook] Created card for step ${stepId}: ${newCard.misconceptionNote}`)
        }
      }
    }
  }

  // Pivot trigger check function
  const checkAndTriggerPivot = useCallback(async (
    stepIndex: number,
    triggerType: 'time_on_step' | 'wrong_attempts' | 'hint_level',
    stepDifficulty: 'easy' | 'medium' | 'hard' = 'medium'
  ) => {
    if (!FEATURE_FLAGS.PIVOT_INJECTION || !pivotInitialized || hasActivePivot) return

    // Get current state for this step
    const errorCount = stepErrorCounts.get(stepIndex) || 0
    const hintLevel = stepHintLevels.get(stepIndex) || 0
    const activationTime = stepActivationTimesRef.current.get(stepIndex)
    const timeSpentSeconds = activationTime
      ? Math.floor((Date.now() - activationTime) / 1000)
      : 0

    const trigger: import('@/types/pivot').PivotTrigger = {
      stepId: `step_${stepIndex}`,
      stepIndex,
      timeSpentSeconds,
      attemptCount: errorCount,
      hintLevel,
      patternId: data.primaryPatternId,
    }

    try {
      const decision = await checkPivotTrigger(trigger, stepDifficulty)
      if (decision.shouldTrigger) {
        console.log(`[Pivot] Triggering pivot on step ${stepIndex}:`, decision.reason)
        await showPivot(stepIndex, timeSpentSeconds, data.primaryPatternId)
      }
    } catch (error) {
      console.error('[Pivot] Failed to check/show pivot:', error)
    }
  }, [pivotInitialized, hasActivePivot, stepErrorCounts, stepHintLevels, checkPivotTrigger, showPivot, data.primaryPatternId])

  // Handle pivot answer submission
  const handlePivotAnswer = useCallback(async (answer: string, wasHelpful: boolean) => {
    try {
      const result = await answerPivot(answer, wasHelpful)
      if (result.timeBonus > 0) {
        console.log(`[Pivot] Time bonus earned: ${result.timeBonus}s`)
      }
    } catch (error) {
      console.error('[Pivot] Failed to submit answer:', error)
    }
  }, [answerPivot])

  // Handle pivot skip
  const handlePivotSkip = useCallback(async () => {
    try {
      await skipPivot()
    } catch (error) {
      console.error('[Pivot] Failed to skip pivot:', error)
    }
  }, [skipPivot])

  // Pivot time-based trigger check effect
  // Uses a ref to track if we've set up the interval (for cleanup in tests)
  const pivotIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Clear any existing interval
    if (pivotIntervalRef.current) {
      clearInterval(pivotIntervalRef.current)
      pivotIntervalRef.current = null
    }

    if (!FEATURE_FLAGS.PIVOT_INJECTION || !pivotInitialized) return

    // Check current step every 30 seconds for time-based triggers
    const checkPivotTime = () => {
      if (hasActivePivot) return

      // Check if current step has been active for too long
      const activationTime = stepActivationTimesRef.current.get(currentStep)
      if (activationTime) {
        const timeSpentSeconds = Math.floor((Date.now() - activationTime) / 1000)
        const lastCheck = lastPivotCheckRef.current.get(currentStep) || 0

        // Only check if we haven't checked in the last 30 seconds and time threshold is met
        if (timeSpentSeconds >= 90 && timeSpentSeconds - lastCheck >= 30) {
          lastPivotCheckRef.current.set(currentStep, timeSpentSeconds)
          checkAndTriggerPivot(currentStep, 'time_on_step', 'medium')
        }
      }
    }

    pivotIntervalRef.current = setInterval(checkPivotTime, 30000) // Check every 30 seconds

    return () => {
      if (pivotIntervalRef.current) {
        clearInterval(pivotIntervalRef.current)
        pivotIntervalRef.current = null
      }
    }
  }, [pivotInitialized, currentStep, hasActivePivot, checkAndTriggerPivot])

  // Track previous error counts for pivot trigger detection
  const prevStepErrorCountsRef = useRef<Map<number, number>>(new Map())

  // Trigger pivot on wrong attempts
  useEffect(() => {
    if (!FEATURE_FLAGS.PIVOT_INJECTION || !pivotInitialized || hasActivePivot) return

    // Check if any step's error count increased
    stepErrorCounts.forEach((count, stepIndex) => {
      const prevCount = prevStepErrorCountsRef.current.get(stepIndex) || 0
      if (count > prevCount && count >= 2) {
        // Debounce to avoid multiple triggers
        setTimeout(() => {
          if (!hasActivePivot) {
            checkAndTriggerPivot(stepIndex, 'wrong_attempts', 'medium')
          }
        }, 500)
      }
    })

    // Update previous counts
    prevStepErrorCountsRef.current = new Map(stepErrorCounts)
  }, [stepErrorCounts, pivotInitialized, hasActivePivot, checkAndTriggerPivot])

  // Track previous hint levels for pivot trigger detection
  const prevStepHintLevelsRef = useRef<Map<number, number>>(new Map())

  // Trigger pivot on hint level increase
  useEffect(() => {
    if (!FEATURE_FLAGS.PIVOT_INJECTION || !pivotInitialized || hasActivePivot) return

    // Check if any step's hint level increased to >= 2
    stepHintLevels.forEach((level, stepIndex) => {
      const prevLevel = prevStepHintLevelsRef.current.get(stepIndex) || 0
      if (level >= 2 && prevLevel < 2) {
        // Debounce to avoid multiple triggers
        setTimeout(() => {
          if (!hasActivePivot) {
            checkAndTriggerPivot(stepIndex, 'hint_level', 'medium')
          }
        }, 1000)
      }
    })

    // Update previous levels
    prevStepHintLevelsRef.current = new Map(stepHintLevels)
  }, [stepHintLevels, pivotInitialized, hasActivePivot, checkAndTriggerPivot])

  // Handle dismissing constraint collision feedback
  const handleDismissConstraintFeedback = useCallback(() => {
    // Mark all current collisions as dismissed
    setDismissedCollisions(prev => {
      const newSet = new Set(prev)
      constraintCollisions.forEach(c => newSet.add(c.id))
      return newSet
    })
    setConstraintCollisions([])
    setConstraintDialogue(null)
  }, [constraintCollisions])

  // Handle highlighting problem text from constraint feedback
  const handleHighlightProblemFromConstraint = useCallback((startIndex: number, endIndex: number) => {
    setHighlightedProblemRange({ start: startIndex, end: endIndex })
    // Auto-scroll to problem statement
    problemStatementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Clear highlight after 5 seconds
    setTimeout(() => setHighlightedProblemRange(null), 5000)
  }, [])

  // Handle targeted rewind from Socratic Debugger
  const handleTargetStep = useCallback((stepId: number) => {
    // Convert 1-based stepId to 0-based index
    const stepIndex = stepId - 1
    if (stepIndex < 0 || stepIndex >= data.steps.length) return

    // Set the highlighted step
    setHighlightedStepId(stepIndex)

    // Scroll to the step
    const stepElement = stepRefs.current.get(stepIndex)
    if (stepElement) {
      stepElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    // Remove highlight after 5 seconds
    setTimeout(() => {
      setHighlightedStepId(null)
    }, 5000)
  }, [data.steps.length])

  // Trigger Socratic Rewind for sanity check failures
  const triggerSocraticRewindFromSanityCheck = useCallback((
    checkType: 'limit' | 'symmetry' | 'dimension',
    feedback: string,
    targetStepId?: number
  ) => {
    const rewindContext = buildContextFromSanityCheckFailure(
      checkType,
      feedback,
      data.steps,
      stepAnswers,
      completedSteps,
      data.problem,
      data.domain,
      data.subdomain
    )

    if (rewindContext) {
      setSocraticRewindContext(rewindContext)
      setSocraticRewindTrigger('sanity_check_failed')
      setShowSocraticRewind(true)
    } else if (targetStepId !== undefined) {
      // Fallback to simple highlighting if context can't be built
      handleTargetStep(targetStepId)
    }
  }, [data, stepAnswers, completedSteps, handleTargetStep])

  // Handle Socratic Rewind close
  const handleSocraticRewindClose = useCallback(() => {
    setShowSocraticRewind(false)
    setSocraticRewindContext(null)
  }, [])

  // Handle return to step from Socratic Rewind
  const handleSocraticRewindReturnToStep = useCallback((stepId: number) => {
    handleTargetStep(stepId + 1) // Convert 0-based to 1-based
    setCurrentStep(stepId)
  }, [handleTargetStep])

  // Handle proceed from Socratic Rewind (student chooses to continue anyway)
  const handleSocraticRewindProceed = useCallback(() => {
    // Just close the modal, student continues with current work
  }, [])

  // Handle manual "Recover from stuck" trigger
  const handleRecoverFromStuck = useCallback(() => {
    // Build context from current step
    const currentStepData = data.steps[currentStep]
    if (!currentStepData) return

    // Find last completed step as the anchor (or use step 0 if none completed)
    const lastCompletedStepId = completedSteps.length > 0
      ? Math.max(...completedSteps)
      : Math.max(0, currentStep - 1)

    const previousStep = data.steps[lastCompletedStepId]
    if (!previousStep) return

    const rewindContext: SocraticRewindContext = {
      previousValidStep: {
        stepId: lastCompletedStepId,
        stepTitle: previousStep.title,
        stepContent: previousStep.question || previousStep.title,
        userAnswer: stepAnswers.get(lastCompletedStepId),
      },
      currentError: {
        stepId: currentStep,
        description: 'Student requested help - feeling stuck on this step',
        errorType: 'conceptual_gap',
        studentInput: stepAnswers.get(currentStep),
      },
      violatedPrinciple: {
        name: 'Step Progress',
        description: 'Review your approach and ensure you understand the connection between steps.',
        category: 'dynamics',
      },
      problemContext: {
        problemText: data.problem,
        domain: data.domain,
        subdomain: data.subdomain,
      },
    }

    setSocraticRewindContext(rewindContext)
    setSocraticRewindTrigger('manual')
    setShowSocraticRewind(true)
  }, [currentStep, completedSteps, data, stepAnswers])

  // Handle sanity check solved
  const handleSanityCheckSolved = useCallback(() => {
    // Trigger celebration and allow proceeding to Mark as Solved
    setShowCelebration(true)
  }, [])

  // Pre-Flight Check handlers
  const handlePreFlightComplete = useCallback((passed: boolean, validation: PreFlightValidation) => {
    if (passed && currentPreFlightCheck) {
      setPassedPreFlightChecks(prev => new Set([...prev, currentPreFlightCheck.id]))
    }
    setShowPreFlightCheck(false)
    setCurrentPreFlightCheck(null)
  }, [currentPreFlightCheck])

  const handlePreFlightSkip = useCallback(() => {
    setShowPreFlightCheck(false)
    setCurrentPreFlightCheck(null)
  }, [])

  // Concept Contrast handlers
  const triggerConceptContrast = useCallback(async (stepIndex: number) => {
    // Only trigger for steps with required concepts that haven't been passed
    if (passedConceptContrastSteps.has(stepIndex)) return

    const step = data.steps[stepIndex]
    if (!step.requiredConcepts?.length) return

    // Get the primary concept for this step
    const primaryConceptId = step.requiredConcepts[0]
    const primaryConcept = data.concepts.find(c => c.id === primaryConceptId)
    if (!primaryConcept) return

    setIsLoadingConceptContrast(true)

    try {
      const response = await fetch('/api/concept-contrast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          selectedConcept: {
            id: primaryConcept.id,
            name: primaryConcept.name,
            formula: primaryConcept.formula,
          },
          problemContext: {
            problemText: data.problem,
            domain: data.domain,
            subdomain: data.subdomain,
            keyConditions: [],
          },
          numDistractors: 2,
          targetStepId: stepIndex,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate concept contrast challenge')
      }

      const result = await response.json()
      if (result.success && result.challenge) {
        setCurrentConceptContrastChallenge(result.challenge)
        setShowConceptContrast(true)
      }
    } catch (error) {
      console.error('Error generating concept contrast challenge:', error)
      // If generation fails, allow the student to proceed
      setPassedConceptContrastSteps(prev => new Set([...prev, stepIndex]))
    } finally {
      setIsLoadingConceptContrast(false)
    }
  }, [data, passedConceptContrastSteps])

  const handleConceptContrastComplete = useCallback((passed: boolean, validation: ConceptContrastValidation) => {
    if (currentConceptContrastChallenge?.targetStepId !== undefined) {
      setPassedConceptContrastSteps(prev => new Set([...prev, currentConceptContrastChallenge.targetStepId!]))
    }
    setShowConceptContrast(false)
    setCurrentConceptContrastChallenge(null)
  }, [currentConceptContrastChallenge])

  const handleConceptContrastSkip = useCallback(() => {
    if (currentConceptContrastChallenge?.targetStepId !== undefined) {
      setPassedConceptContrastSteps(prev => new Set([...prev, currentConceptContrastChallenge.targetStepId!]))
    }
    setShowConceptContrast(false)
    setCurrentConceptContrastChallenge(null)
  }, [currentConceptContrastChallenge])

  const handleConceptContrastClose = useCallback(() => {
    setShowConceptContrast(false)
    setCurrentConceptContrastChallenge(null)
  }, [])

  // Check for pre-flight requirement when activating a step
  const checkPreFlightRequirement = useCallback((stepIndex: number): boolean => {
    // Only check for hint-based scaffolds that have preFlightChecks
    if (!isHintScaffold(data)) return true

    const scaffoldData = data as ScaffoldData
    if (!scaffoldData.preFlightChecks?.length) return true

    const step = scaffoldData.steps[stepIndex]
    const preFlightCheck = scaffoldData.preFlightChecks.find(
      check => check.targetStepId === step.id && !passedPreFlightChecks.has(check.id)
    )

    if (preFlightCheck) {
      setCurrentPreFlightCheck(preFlightCheck)
      setShowPreFlightCheck(true)
      return false // Block step activation
    }

    return true // Allow step activation
  }, [data, passedPreFlightChecks])

  // Check for adaptive preflight requirement when activating a step
  const checkAdaptivePreflightRequirement = useCallback((stepIndex: number): boolean => {
    // Only check if feature is enabled
    if (!FEATURE_FLAGS.ADAPTIVE_PREFLIGHT) return true

    // Skip if already passed for this step
    if (passedAdaptivePreflightSteps.has(stepIndex)) return true

    const step = data.steps[stepIndex]
    const requiredConceptIds = step.requiredConcepts || []

    // Skip if no concepts to assess
    if (requiredConceptIds.length === 0) return true

    // Use a stable student ID (could be from auth, but using localStorage for now)
    const studentId = typeof window !== 'undefined'
      ? localStorage.getItem('physiscaffold_student_id') || 'anonymous'
      : 'anonymous'

    const { shouldShow, assessment } = shouldShowAdaptivePreflight(
      stepIndex,
      step.id,
      requiredConceptIds,
      data.concepts,
      studentId,
      passedAdaptivePreflightSteps
    )

    if (shouldShow && assessment) {
      setCurrentAdaptiveAssessment(assessment)
      setShowAdaptivePreflight(true)
      return false // Block step activation
    }

    return true // Allow step activation
  }, [data, passedAdaptivePreflightSteps])

  // Handle adaptive preflight proceed
  const handleAdaptivePreflightProceed = useCallback(() => {
    if (currentAdaptiveAssessment) {
      setPassedAdaptivePreflightSteps(prev => new Set([...prev, currentAdaptiveAssessment.stepIndex]))
    }
    setShowAdaptivePreflight(false)
    setCurrentAdaptiveAssessment(null)
  }, [currentAdaptiveAssessment])

  // Handle adaptive preflight review concepts
  const handleAdaptivePreflightReview = useCallback(() => {
    // Mark as passed but suggest review (could navigate to concept panel or similar)
    if (currentAdaptiveAssessment) {
      setPassedAdaptivePreflightSteps(prev => new Set([...prev, currentAdaptiveAssessment.stepIndex]))
    }
    setShowAdaptivePreflight(false)
    setCurrentAdaptiveAssessment(null)
    // Could trigger concept panel expansion here if desired
  }, [currentAdaptiveAssessment])

  // Handle adaptive preflight close
  const handleAdaptivePreflightClose = useCallback(() => {
    setShowAdaptivePreflight(false)
    setCurrentAdaptiveAssessment(null)
  }, [])

  // Check if concept contrast should trigger for this step
  const shouldTriggerConceptContrast = useCallback((stepIndex: number): boolean => {
    if (!FEATURE_FLAGS.CONCEPT_CONTRAST) return false
    if (passedConceptContrastSteps.has(stepIndex)) return false

    const step = data.steps[stepIndex]
    if (!step.requiredConcepts?.length) return false

    // Key concept patterns that warrant a concept contrast challenge
    const keyConceptPatterns = [
      /conservation/i,
      /momentum/i,
      /energy/i,
      /newton/i,
      /equilibrium/i,
      /work-energy/i,
    ]

    // Check if any required concept matches key patterns
    const hasKeyConcept = step.requiredConcepts.some(conceptId => {
      const concept = data.concepts.find(c => c.id === conceptId)
      if (!concept) return false
      return keyConceptPatterns.some(pattern => pattern.test(concept.name))
    })

    return hasKeyConcept
  }, [data, passedConceptContrastSteps])

  // Combined step activation handler with concept contrast trigger
  const handleStepActivation = useCallback((stepIndex: number) => {
    // First check pre-flight requirement (static, from scaffold)
    if (!checkPreFlightRequirement(stepIndex)) {
      return // Pre-flight check is blocking
    }

    // Then check adaptive preflight requirement (dynamic, from learning history)
    if (!checkAdaptivePreflightRequirement(stepIndex)) {
      return // Adaptive preflight check is blocking
    }

    // Set the step as active
    setCurrentStep(stepIndex)

    // Then check if concept contrast should trigger (async, doesn't block)
    if (shouldTriggerConceptContrast(stepIndex)) {
      setTimeout(() => {
        triggerConceptContrast(stepIndex)
      }, 500)
    }
  }, [checkPreFlightRequirement, checkAdaptivePreflightRequirement, shouldTriggerConceptContrast, triggerConceptContrast])

  // Handle solution grade complete
  const handleGradeComplete = useCallback((result: GradeSolutionResponse) => {
    setSolutionGradeResult(result)
    if (result.status === 'SUCCESS') {
      setShowCelebration(true)
    }

    // Record errors to circuit breaker for MINOR_SLIP and CONCEPTUAL_GAP
    if (result.status !== 'SUCCESS' && result.detailedAnalysis?.errors) {
      recordGradingErrors(result.detailedAnalysis.errors, currentStep)
    }

    if (result.status !== 'SUCCESS') {
      registerSessionError()
    }

    // Trigger Socratic Rewind for CONCEPTUAL_GAP
    if (result.status === 'CONCEPTUAL_GAP') {
      const rewindContext = buildContextFromGradeResult(
        result,
        data.steps,
        stepAnswers,
        completedSteps,
        data.problem,
        data.domain,
        data.subdomain
      )

      if (rewindContext) {
        setSocraticRewindContext(rewindContext)
        setSocraticRewindTrigger('grade_conceptual_gap')
        setShowSocraticRewind(true)
      }
    }

    // Trigger Socratic Rewind for high-severity constraint collisions
    if (result.constraintCollisions && result.constraintCollisions.length > 0) {
      // Find the highest severity collision
      const highSeverityCollision = result.constraintCollisions.find(c => c.severity === 'high')

      if (highSeverityCollision && !showSocraticRewind) {
        // Get the last completed step to use as the anchor
        const lastCompletedStepId = completedSteps.length > 0
          ? Math.max(...completedSteps)
          : 0
        const rawStep = data.steps[lastCompletedStepId]

        if (rawStep) {
          // Build a minimal Step object compatible with buildRewindContextFromCollision
          const previousStep = {
            id: rawStep.id,
            title: rawStep.title,
            question: rawStep.question,
            hints: [], // Required by Step type, not used by the function
            requiredConcepts: rawStep.requiredConcepts,
          }
          const rewindContext = buildRewindContextFromCollision(
            highSeverityCollision,
            previousStep,
            stepAnswers.get(lastCompletedStepId),
            data.problem,
            data.domain,
            data.subdomain
          )

          // Small delay to let user see the constraint feedback first
          setTimeout(() => {
            setSocraticRewindContext(rewindContext)
            setSocraticRewindTrigger('constraint_collision')
            setShowSocraticRewind(true)
          }, 1500)
        }
      }
    }
  }, [recordGradingErrors, currentStep, data, stepAnswers, completedSteps, showSocraticRewind, registerSessionError])

  // Handle highlighting problem text from constraint feedback
  const handleHighlightProblem = useCallback((startIndex: number, endIndex: number) => {
    setHighlightedProblemRange({ start: startIndex, end: endIndex })
    // Scroll to problem statement
    problemStatementRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Auto-clear highlight after 5 seconds
    setTimeout(() => setHighlightedProblemRange(null), 5000)
  }, [])

  // Helper to render problem text with highlighting
  const renderProblemText = useCallback(() => {
    const text = data.problem
    if (!highlightedProblemRange) {
      return text
    }
    const { start, end } = highlightedProblemRange
    const before = text.slice(0, start)
    const highlighted = text.slice(start, end)
    const after = text.slice(end)
    return (
      <>
        {before}
        <mark className="bg-yellow-300 dark:bg-yellow-500/40 text-yellow-900 dark:text-yellow-100 px-1 rounded font-medium animate-pulse">
          {highlighted}
        </mark>
        {after}
      </>
    )
  }, [data.problem, highlightedProblemRange])

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with problem statement and actions */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-4 sm:p-6 mb-6 border border-transparent dark:border-dark-border">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-0 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-block px-3 py-1 bg-primary-100 dark:bg-accent/20 text-primary-700 dark:text-accent rounded-full text-sm font-medium">
                {data.domain} → {data.subdomain}
              </span>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${modeConfig.badge.className}`}
                title={modeConfig.badge.description}
              >
                Mode: {modeConfig.badge.label}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-dark-text-primary">Problem Statement</h2>
          </div>
          <button
            onClick={onReset}
            className="px-4 py-2 text-sm text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary border border-gray-300 dark:border-dark-border rounded-lg hover:border-gray-400 dark:hover:border-dark-border-strong hover:bg-gray-50 dark:hover:bg-dark-card-soft transition-colors"
          >
            ← New Problem
          </button>
        </div>
        <p
          ref={problemStatementRef}
          className="text-gray-800 dark:text-dark-text-secondary leading-relaxed text-base sm:text-lg mb-6"
        >
          {renderProblemText()}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
          <button
            onClick={() => handleSaveDraft(false)}
            disabled={isSaving}
            className="px-3 sm:px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-900/30 disabled:text-blue-100 flex items-center gap-2 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden">Save</span>
          </button>

          <button
            onClick={handleMarkSolved}
            disabled={isSaving}
            className="px-3 sm:px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 disabled:bg-green-300 dark:disabled:bg-green-900/30 disabled:text-green-100 flex items-center gap-2 text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden sm:inline">Mark as Solved</span>
            <span className="sm:hidden">Solved</span>
          </button>

          <button
            onClick={handleToggleReview}
            className={`px-3 sm:px-4 py-2 rounded-lg border flex items-center gap-2 text-sm transition-colors ${
              isReviewFlagged
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                : 'bg-white dark:bg-dark-card-soft border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-border'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="hidden sm:inline">{isReviewFlagged ? 'Marked for Review' : 'Mark for Review'}</span>
            <span className="sm:hidden">{isReviewFlagged ? 'Review' : 'Review'}</span>
          </button>

          {/* Coach Tools Button & Save Message */}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <CoachToolsButton
              onClick={coachToolsPanel.open}
              hasAlerts={constraintCollisions.length > 0 || relatedMistakes.length > 0}
              alertCount={constraintCollisions.length + relatedMistakes.length}
            />

            {saveMessage && (
              <span className="text-sm text-green-600 dark:text-green-400 font-medium animate-fade-in">
                {saveMessage}
              </span>
            )}
          </div>
        </div>

        {FEATURE_FLAGS.PATTERN_FIRST_MODE && patternFirstCfg.enablePatternFirst && data.patterns && data.patterns.length > 0 && showPatternPickWarning && !(patternSelectionState?.selectedPatternId) && (
          <div className="mt-3 text-sm text-amber-700 dark:text-amber-300">
            Pick a pattern to improve speed training.
          </div>
        )}

        {FEATURE_FLAGS.PATTERN_FIRST_MODE && patternFirstCfg.enablePatternFirst && data.patterns && data.patterns.length > 0 && isProblemSolved && isReflectionComplete && data.primaryPatternId && (
          <div className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            Canonical pattern: <span className="font-medium text-slate-800 dark:text-slate-100">
              {(data.patterns.find(p => p.id === data.primaryPatternId)?.label || data.patterns.find(p => p.id === data.primaryPatternId)?.name || data.primaryPatternId)}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {reverseSolveEnabled && modeConfig.showSteps && (
          <div className="lg:col-span-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  Reverse-Solve Mode
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-200 mt-1">
                  Use the steps below to reconstruct the reasoning from the final result.
                </p>
              </div>
              <div className="bg-white/70 dark:bg-slate-900/40 border border-amber-200 dark:border-amber-700 rounded-md px-3 py-2 text-sm text-amber-900 dark:text-amber-100 min-w-[180px]">
                <div className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-300">
                  Final Answer
                </div>
                {finalAnswer ? (
                  <MathRenderer text={finalAnswer} />
                ) : (
                  <div className="text-xs text-amber-700 dark:text-amber-300">
                    Not available yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* Main solving area - Steps */}
        <div className="lg:col-span-3 space-y-4">
          {modeConfig.submissionVisibility === 'always' && (
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-4 sm:p-6 border border-transparent dark:border-dark-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                    Exam Submission
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-dark-text-muted">
                    Submit your full solution for grading when ready.
                  </p>
                </div>
              </div>
              <SubmissionCanvas
                problemText={data.problem}
                domain={data.domain}
                subdomain={data.subdomain}
                concepts={data.concepts}
                variant={modeConfig.submissionVariant}
                onGradeComplete={handleGradeComplete}
                onHighlightProblem={handleHighlightProblem}
              />
            </div>
          )}
          {modeConfig.showSteps && (
          <>
          {/* Mistake Warnings */}
          {showWarnings && mistakeWarnings.length > 0 && (
            <MistakeWarning
              warnings={mistakeWarnings}
              onDismiss={() => setShowWarnings(false)}
            />
          )}

          {/* Related Past Mistakes from Mistake Notebook */}
          {relatedMistakes.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Related Past Mistakes ({relatedMistakes.length})
                  </h4>
                </div>
                <button
                  onClick={() => setRelatedMistakes([])}
                  className="text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300"
                  title="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                You&apos;ve struggled with similar concepts before. Review these to avoid the same mistakes:
              </p>
              <div className="space-y-2">
                {relatedMistakes.map(mistake => (
                  <div
                    key={mistake.id}
                    className="bg-white dark:bg-dark-card rounded border border-amber-100 dark:border-amber-800/50 p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary truncate">
                          {mistake.stepTitle}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                          {mistake.misconceptionNote}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {mistake.conceptTags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-300"
                            >
                              {tag.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className={`
                        ml-2 px-2 py-1 rounded text-xs font-medium
                        ${mistake.severity === 'major' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                          mistake.severity === 'moderate' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                          'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'}
                      `}>
                        {mistake.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <a
                href="/mistake-notebook"
                className="inline-flex items-center gap-1 mt-3 text-xs text-amber-700 dark:text-amber-300 hover:underline"
              >
                View all in Mistake Notebook
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          )}

          {/* Circuit Breaker Warning */}
          {warningMessage && warningTag && (
            <CircuitBreakerWarning
              message={warningMessage}
              errorTag={warningTag}
              onDismiss={dismissWarning}
            />
          )}

          {/* Real-time Constraint Collision Feedback */}
          {constraintCollisions.length > 0 && (
            <ConstraintFeedback
              collisions={constraintCollisions}
              dialogue={constraintDialogue || undefined}
              onDismiss={handleDismissConstraintFeedback}
              onHighlightProblem={handleHighlightProblemFromConstraint}
            />
          )}

          {/* Dev Mode: Skip Steps Banner */}
          {skipStepsMode && (
            <div className="bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-medium">Dev Mode: Skip Steps Enabled</span>
                <span className="text-sm text-amber-600 dark:text-amber-400 ml-2">
                  Sanity Check visible without completing steps. Remove <code className="bg-amber-200 dark:bg-amber-800 px-1 rounded">?skipSteps=true</code> to disable.
                </span>
              </div>
            </div>
          )}

          <div className="demo-step-steps bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-4 sm:p-6 border border-transparent dark:border-dark-border">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
                Solution Roadmap
              </h3>
              {/* Recover from stuck button */}
              <button
                onClick={handleRecoverFromStuck}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50 rounded-lg transition-colors"
                title="Get help if you're stuck on the current step"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                </svg>
                <span className="hidden sm:inline">Stuck?</span>
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-dark-text-muted mb-4">
              Work through each step. Click to expand and see hints. The framework guides you - you provide the reasoning.
            </p>

            {/* Step Confidence Heatmap - show when heatmap feature is enabled and has data */}
            {FEATURE_FLAGS.STEP_HEATMAP && FEATURE_FLAGS.CONFIDENCE_WEIGHTED_SRS && modeConfig.stepVisibility.mode === 'all' && stepConfidenceRatings.size > 0 && (
              <div className="mb-4">
                <StepHeatmap
                  stepConfidenceRatings={stepConfidenceRatings}
                  stepTitles={data.steps.map(s => s.title)}
                  completedSteps={completedSteps}
                  currentStep={currentStep}
                  onStepClick={(stepIndex) => {
                    // Scroll to and highlight the step
                    const stepRef = stepRefs.current.get(stepIndex)
                    if (stepRef) {
                      stepRef.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      setHighlightedStepId(stepIndex)
                      setTimeout(() => setHighlightedStepId(null), 2000)
                    }
                  }}
                />
              </div>
            )}

            <div className="space-y-3">
              {data.steps.map((step, index) => {
                if (!visibleStepIndexes.includes(index)) return null

                return (
                <div
                  key={step.id}
                  ref={(el) => {
                    if (el) stepRefs.current.set(index, el)
                  }}
                  className={`transition-all duration-500 ${
                    highlightedStepId === index
                      ? 'ring-4 ring-yellow-400 dark:ring-yellow-500 ring-offset-2 dark:ring-offset-dark-card rounded-lg shadow-lg shadow-yellow-200 dark:shadow-yellow-900/30'
                      : ''
                  }`}
                >
                  {/* Diagram steps get special treatment */}
                  {'diagramData' in step && step.stepType === 'diagram' && step.diagramData ? (
                    <DiagramStep
                      step={step as import('@/types/scaffold').Step}
                      stepNumber={index + 1}
                      isActive={currentStep === index}
                      isCompleted={completedSteps.includes(step.id)}
                      isLocked={index > 0 && !completedSteps.includes(data.steps[index - 1]?.id)}
                      onComplete={() => handleMicroStepComplete(step.id)}
                      onActivate={() => setCurrentStep(index)}
                    />
                  ) : useMicroTasks ? (
                    <MicroTaskStepAccordion
                      step={step as MicroTaskStep}
                      stepNumber={index + 1}
                      isActive={currentStep === index}
                      isCompleted={completedSteps.includes(step.id)}
                      isLocked={index > 0 && !completedSteps.includes(data.steps[index - 1]?.id)}
                      concepts={data.concepts}
                      progress={microTaskProgress.get(step.id)}
                      problemStatement={data.problem}
                      warningBeacon={(data as MicroTaskScaffoldData).warningBeacons?.find(b => b.stepId === step.id)}
                      problemId={problemId()}
                      problemTitle={problemTitle()}
                      domain={data.domain}
                      subdomain={data.subdomain}
                      onTaskComplete={handleMicroTaskComplete}
                      onComplete={handleMicroStepComplete}
                      onCircuitBreakerError={handleTaskIncorrect}
                      onActivate={() => setCurrentStep(index)}
                      onRecordAttempt={phasedScaffoldContext?.recordAttempt}
                      getStepDifficulty={phasedScaffoldContext?.getStepDifficulty}
                      decisionGateState={getDecisionGateState(step.id)}
                      onRecordDecisionGateAttempt={handleRecordDecisionGateAttempt}
                      requiresDecisionGate={stepRequiresDecisionGate(step.id, step.stepType, (step as MicroTaskStep).tasks?.length > 0)}
                      requiredMicroTaskCount={getDecisionGateRequiredCount()}
                      maxTaskLevel={modeConfig.maxTaskLevel}
                      onSessionError={registerSessionError}
                    />
                  ) : (
                    <StepAccordion
                      step={step as import('@/types/scaffold').Step}
                      stepNumber={index + 1}
                      isActive={currentStep === index}
                      isCompleted={completedSteps.includes(index)}
                      isLocked={index > 0 && !completedSteps.includes(index - 1)}
                      concepts={data.concepts}
                      userAnswer={stepAnswers.get(index) || ''}
                      currentHintLevel={stepHintLevels.get(index) || 0}
                      problemStatement={data.problem}
                      warningBeacon={(data as ScaffoldData).warningBeacons?.find(b => b.stepId === step.id)}
                      problemId={problemId()}
                      problemTitle={problemTitle()}
                      domain={data.domain}
                      subdomain={data.subdomain}
                      rebuildGateState={getRebuildGateState(step.id)}
                      onRebuildGateTriggered={handleRebuildGateTriggered}
                      onRebuildGateAnswer={handleRebuildGateAnswer}
                      canProceed={canStepProceed(step.id)}
                      decisionGateState={getDecisionGateState(step.id)}
                      decisionGateTasks={(step as import('@/types/scaffold').Step & { decisionGateTasks?: import('@/types/microTask').MicroTask[] }).decisionGateTasks}
                      onDecisionGateAnswer={handleRecordDecisionGateAttempt}
                      requiresDecisionGate={stepRequiresDecisionGate(step.id, step.stepType, !!((step as import('@/types/scaffold').Step & { decisionGateTasks?: import('@/types/microTask').MicroTask[] }).decisionGateTasks?.length))}
                      requiredMicroTaskCount={getDecisionGateRequiredCount()}
                      maxDecisionGateAttempts={gatingPolicy?.decisionGateConfig.maxAttempts ?? 2}
                      cognitiveLoadUIConfig={cognitiveLoadUIConfig}
                      maxHintLevel={hintsHidden ? 0 : modeConfig.maxHintLevel}
                      professorVisibility={modeConfig.professorVisibility}
                      hasStepErrors={Boolean(stepErrorCounts.get(step.id))}
                      useSocraticFirst={FEATURE_FLAGS.SOCRATIC_FIRST_MODE}
                      onSocraticComplete={(result) => handleSocraticStepComplete(index, result)}
                      onAnswerChange={(answer) => handleStepAnswerChange(index, answer)}
                      onComplete={() => handleStepComplete(index)}
                      onActivate={() => handleStepActivation(index)}
                      onHintLevelChange={(level) => handleHintLevelChange(index, level)}
                    />
                  )}
                </div>
                )
              })}
            </div>
          </div>
          </>
          )}

          {/* Submit Solution Section - always visible after first step */}
          {modeConfig.submissionVisibility === 'after_steps' && completedSteps.length > 0 && !showExplainToFriend && !showReflection && (
            <div className="bg-white dark:bg-dark-card rounded-lg shadow-lg dark:shadow-dark-lg p-4 sm:p-6 border border-transparent dark:border-dark-border">
              <button
                onClick={() => setShowSubmissionCanvas(!showSubmissionCanvas)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    solutionGradeResult?.status === 'SUCCESS'
                      ? 'bg-green-500/20 text-green-400'
                      : solutionGradeResult?.status === 'MINOR_SLIP'
                      ? 'bg-amber-500/20 text-amber-400'
                      : solutionGradeResult?.status === 'CONCEPTUAL_GAP'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-indigo-500/20 text-indigo-400'
                  }`}>
                    {solutionGradeResult?.status === 'SUCCESS' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                      {solutionGradeResult ? 'Solution Graded' : 'Submit Your Solution'}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-dark-text-muted">
                      {solutionGradeResult
                        ? `Status: ${solutionGradeResult.status.replace('_', ' ')}`
                        : 'Type or scan your handwritten solution for AI grading'}
                    </p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${showSubmissionCanvas ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showSubmissionCanvas && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-border">
                  <SubmissionCanvas
                    problemText={data.problem}
                    domain={data.domain}
                    subdomain={data.subdomain}
                    concepts={data.concepts}
                    variant={modeConfig.submissionVariant}
                    onGradeComplete={handleGradeComplete}
                    onHighlightProblem={handleHighlightProblem}
                  />
                </div>
              )}
            </div>
          )}

          {/* Sanity Check / Verify via Logic - only show after all steps completed (or in skip mode) */}
          {modeConfig.showSteps && allStepsComplete && !showExplainToFriend && !showReflection && (
            <div className="demo-step-sanity">
              {data.sanityCheckMatrix ? (
                <SanityCheckMatrix
                  matrix={data.sanityCheckMatrix}
                  problemText={data.problem}
                  domain={data.domain}
                  subdomain={data.subdomain}
                  steps={data.steps}
                  concepts={data.concepts}
                  onAllChecksComplete={handleSanityCheckSolved}
                  onTargetStep={handleTargetStep}
                />
              ) : (
                <SanityCheckStep
                  sanityCheck={data.sanityCheck}
                  userAnswer={sanityCheckAnswer}
                  onAnswerChange={setSanityCheckAnswer}
                  problemText={data.problem}
                  domain={data.domain}
                  subdomain={data.subdomain}
                  steps={data.steps}
                  concepts={data.concepts}
                  onTargetStep={handleTargetStep}
                  onSolved={handleSanityCheckSolved}
                />
              )}
            </div>
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

          {/* Boundary-Case Builder - stress test equations with limiting cases */}
          {isProblemSolved && isReflectionComplete && FEATURE_FLAGS.BOUNDARY_CASE_BUILDER && (
            <BoundaryCaseBuilder scaffoldData={data} />
          )}

          {/* What-If Simulation - show after problem is solved */}
          {isProblemSolved && isReflectionComplete && isHintScaffold(data) && (
            <WhatIfSimulation scaffoldData={data} />
          )}

          {/* Skip/Commit Session Summary - minimal analytics */}
          {FEATURE_FLAGS.SKIP_COMMIT_GATE && skipCommitCfg.enableSkipCommit && isProblemSolved && isReflectionComplete && (
            <div className="mt-4">
              {!showSkipCommitAnalytics ? (
                <button
                  onClick={() => setShowSkipCommitAnalytics(true)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium"
                >
                  View decision training stats
                </button>
              ) : (
                <div className="flex justify-center">
                  {sessionSkipCommitAnalytics && (
                    <SkipCommitAnalyticsPanel
                      analytics={sessionSkipCommitAnalytics}
                      onClose={() => setShowSkipCommitAnalytics(false)}
                    />
                  )}
                </div>
              )}
            </div>
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
        {modeConfig.showSidebar && (
          <div className="demo-step-concepts lg:col-span-1">
            <ConceptPanel concepts={data.concepts} />
          </div>
        )}
      </div>

      {/* Post-Solve Activity Popup */}
      {showPostSolveActivity && (
        <PostSolveActivity
          problemText={data.problem}
          onDismiss={() => setShowPostSolveActivity(false)}
        />
      )}

      {/* Celebration Animation */}
      <Celebration
        show={showCelebration}
        onComplete={() => setShowCelebration(false)}
      />

      {/* Circuit Breaker Drill Modal */}
      {showDrillModal && currentDrill && (
        <DrillModal
          drill={currentDrill}
          onComplete={handleDrillComplete}
          onSkip={handleDrillSkip}
        />
      )}

      {/* Socratic Rewind Modal */}
      {showSocraticRewind && socraticRewindContext && (
        <SocraticRewindModal
          isOpen={showSocraticRewind}
          context={socraticRewindContext}
          triggerSource={socraticRewindTrigger}
          problemId={currentProblemId}
          onClose={handleSocraticRewindClose}
          onReturnToStep={handleSocraticRewindReturnToStep}
          onProceed={handleSocraticRewindProceed}
        />
      )}

      {/* Mistake Card Created Notification Toast */}
      {showMistakeNotification && lastCreatedMistakeCard && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-800/50 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Added to Mistake Notebook
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 truncate">
                  {lastCreatedMistakeCard.misconceptionNote}
                </p>
              </div>
              <button
                onClick={() => setShowMistakeNotification(false)}
                className="text-amber-400 hover:text-amber-600 dark:text-amber-500 dark:hover:text-amber-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interview Mode Explanation Form */}
      {pendingInterviewExplanation !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl p-6 max-w-lg mx-4 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Step {pendingInterviewExplanation + 1} Completed!
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                Interview Mode: Explain your reasoning for this step
              </p>
            </div>

            <ExplanationForm
              requirements={{
                approachRequired: true,
                invariantRequired: true,
                complexityRequired: false,
              }}
              onSubmit={(formData) => {
                // Convert form data to ExplanationSubmission
                const explanation: ExplanationSubmission = {
                  approach: formData.approach || null,
                  invariant: formData.invariant || null,
                  complexity: formData.complexity || null,
                  submittedAt: Date.now(),
                }
                handleInterviewExplanationSubmit(explanation)
              }}
            />
          </div>
        </div>
      )}

      {/* Confidence Rating Prompt */}
      {pendingConfidenceStepId !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-card rounded-xl shadow-2xl p-6 max-w-sm mx-4 animate-in zoom-in-95 duration-200">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Step Completed!
              </h3>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                Quick check: Rate your confidence in understanding this step
              </p>
            </div>

            <ConfidenceRating
              isCorrect={true}
              onRate={(confidence) => handleConfidenceRated(pendingConfidenceStepId, confidence)}
              onSkip={() => handleConfidenceSkipped(pendingConfidenceStepId)}
              autoSkipDelay={8000}
              showOutcome={true}
            />
          </div>
        </div>
      )}

      {/* Problem Locked Overlay (when circuit breaker is tripped but drill not yet shown) */}
      {isProblemLocked && !showDrillModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl p-6 max-w-sm mx-4 text-center">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
              Problem Paused
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
              A quick practice drill will help reinforce the concept before continuing.
            </p>
            <div className="animate-pulse text-sm text-gray-500 dark:text-dark-text-muted">
              Loading drill...
            </div>
          </div>
        </div>
      )}

      {/* Pre-Flight Check Modal */}
      {showPreFlightCheck && currentPreFlightCheck && (
        <PreFlightCheckModal
          check={currentPreFlightCheck}
          problemText={data.problem}
          onComplete={handlePreFlightComplete}
          onSkip={handlePreFlightSkip}
          onClose={() => setShowPreFlightCheck(false)}
        />
      )}

      {/* Adaptive Preflight Modal */}
      {showAdaptivePreflight && currentAdaptiveAssessment && (
        <AdaptivePreflightModal
          assessment={currentAdaptiveAssessment}
          stepTitle={data.steps[currentAdaptiveAssessment.stepIndex]?.title || 'Step'}
          conceptNames={
            (data.steps[currentAdaptiveAssessment.stepIndex]?.requiredConcepts || [])
              .map(id => data.concepts.find(c => c.id === id)?.name || id)
          }
          onProceed={handleAdaptivePreflightProceed}
          onReviewConcepts={handleAdaptivePreflightReview}
          onClose={handleAdaptivePreflightClose}
        />
      )}

      {/* Concept Contrast Modal */}
      {showConceptContrast && currentConceptContrastChallenge && (
        <ConceptContrastModal
          challenge={currentConceptContrastChallenge}
          problemText={data.problem}
          onComplete={handleConceptContrastComplete}
          onSkip={handleConceptContrastSkip}
          onClose={handleConceptContrastClose}
        />
      )}

      {/* Concept Contrast Loading Overlay */}
      {isLoadingConceptContrast && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl p-6 max-w-sm mx-4 text-center">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 dark:border-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
              Preparing Challenge
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Analyzing related concepts...
            </p>
          </div>
        </div>
      )}

      {/* Pattern-First Mode Modal */}
      {showPatternFirst && data.patterns && (
        <PatternFirstModal
          patterns={data.patterns}
          primaryPatternId={data.primaryPatternId}
          lockSeconds={patternFirstCfg.lockSeconds}
          showCountdown={patternFirstCfg.showCountdown}
          problemText={data.problem}
          onSelect={handlePatternSelect}
          onTimeout={handlePatternTimeout}
          onSkip={handlePatternSkip}
          canDismiss={patternFirstCfg.allowTimeoutProceed}
        />
      )}

      {/* Pattern picker (after unlock / change selection) */}
      {data.patterns && data.patterns.length > 0 && (
        <PatternPickerModal
          isOpen={showPatternPicker}
          title={patternPickerTitle}
          patterns={data.patterns}
          selectedPatternId={patternSelectionState?.selectedPatternId ?? null}
          onSelect={handlePatternPickerSelect}
          onClose={() => setShowPatternPicker(false)}
        />
      )}

      {/* Skip-or-Commit Gate Modal */}
      <SkipCommitGateModal
        isOpen={showSkipCommitGate}
        autoCommitSeconds={skipCommitCfg.autoCommitSeconds}
        initialCountdownSeconds={skipCommitCountdownStartSeconds}
        onCommit={handleSkipCommitCommit}
        onSkip={handleSkipCommitSkip}
        onAutoCommit={handleSkipCommitAutoCommit}
      />

      {/* Skip Toast */}
      <SkipToast isVisible={showSkipToast} />

      {/* Momentum Feedback */}
      <MomentumFeedback
        event={pendingMomentumEvent}
        onDismiss={() => {
          setPendingMomentumEvent(null)
          if (momentumState) {
            const { updatedState } = consumePendingEvent(momentumState)
            setMomentumState(updatedState)
          }
        }}
      />

      {/* Scaffold Locked Overlay (Pattern-First) */}
      {isScaffoldLocked && !showPatternFirst && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl p-6 max-w-sm mx-4 text-center">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 dark:border-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
              Getting Ready
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Loading pattern identification...
            </p>
          </div>
        </div>
      )}

      {/* Pivot Injection Modal */}
      {hasActivePivot && activePivot && pivotStepIndex !== null && (
        <PivotModal
          pivot={activePivot}
          stepIndex={pivotStepIndex}
          onAnswer={handlePivotAnswer}
          onSkip={handlePivotSkip}
        />
      )}

      {/* Coach Tools Panel - Consolidated advanced interventions */}
      <CoachToolsPanel
        isOpen={coachToolsPanel.isOpen}
        onClose={coachToolsPanel.close}
        // Step Heatmap
        showHeatmap={FEATURE_FLAGS.STEP_HEATMAP && FEATURE_FLAGS.CONFIDENCE_WEIGHTED_SRS}
        stepConfidenceRatings={stepConfidenceRatings}
        stepTitles={data.steps.map(s => s.title)}
        completedSteps={completedSteps}
        currentStep={currentStep}
        onStepClick={(stepIndex) => {
          const stepRef = stepRefs.current.get(stepIndex)
          if (stepRef) {
            stepRef.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setHighlightedStepId(stepIndex)
            setTimeout(() => setHighlightedStepId(null), 2000)
          }
          coachToolsPanel.close()
        }}
        // Related Mistakes
        relatedMistakes={relatedMistakes}
        onDismissMistakes={() => setRelatedMistakes([])}
        // Constraint Feedback
        constraintCollisions={constraintCollisions}
        constraintDialogue={constraintDialogue || undefined}
        onDismissConstraint={(id) => setDismissedCollisions(prev => new Set([...prev, id]))}
        onHighlightProblem={handleHighlightProblem}
        // Stuck/Rewind
        onRecoverFromStuck={handleRecoverFromStuck}
        // Pattern Selection
        patterns={data.patterns || []}
        selectedPatternId={patternSelectionState?.selectedPatternId}
        onOpenPatternPicker={() => {
          setPatternPickerTitle('Pick a pattern')
          setShowPatternPicker(true)
          coachToolsPanel.close()
        }}
        // Skip/Commit Analytics
        skipCommitAnalytics={sessionSkipCommitAnalytics}
        showSkipCommitAnalytics={showSkipCommitAnalytics}
        onToggleSkipCommitAnalytics={() => setShowSkipCommitAnalytics(prev => !prev)}
      />
    </div>
  )
}
