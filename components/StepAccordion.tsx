'use client'

import { useState, useEffect, useRef } from 'react'
import type { Step, Concept, WarningBeacon } from '@/types/scaffold'
import type { FeynmanScript, FeynmanValidationResult } from '@/types/feynman'
import MathRenderer from './MathRenderer'
import FeynmanDialoguePlayer from './audio/FeynmanDialoguePlayer'
import FeynmanMicroPrompt from './FeynmanMicroPrompt'
import VerbalPlanRenderer from './micro-tasks/VerbalPlanRenderer'
import { PaperSolutionUploader } from './paper-solution'
import SocraticTutorChat from './SocraticTutorChat'
import type { AnalyzeSolutionResponse } from '@/types/paperSolution'
import { authenticatedFetch, handleQuotaExceeded } from '@/lib/api/apiClient'
import { getStepTypeBadge, getHintStyle } from '@/lib/hintEngine'
import { onHintRequested, onStepTimeout, type ProblemContext, type StepContext } from '@/lib/mistakeTriggers'
import { detectMisconceptionFlag, type MisconceptionFlag } from '@/lib/misconceptionFlags'
import { errorPatternService } from '@/lib/errorPatternService'
import type { ErrorPatternSummary } from '@/types/errorPatterns'
import { FEATURE_FLAGS } from '@/lib/featureFlags'
import type { FeynmanPromptConfig } from '@/types/feynman'

interface StepAccordionProps {
  step: Step
  stepNumber: number
  isActive: boolean
  isCompleted: boolean
  isLocked: boolean
  concepts: Concept[]
  userAnswer: string
  problemStatement?: string
  currentHintLevel?: number
  warningBeacon?: WarningBeacon  // Optional warning beacon from Error Anticipator
  // Problem context for mistake tracking
  problemId?: string
  problemTitle?: string
  domain?: string
  subdomain?: string
  onAnswerChange: (answer: string) => void
  onComplete: () => void
  onActivate: () => void
  onHintLevelChange: (level: number) => void
}

export default function StepAccordion({
  step,
  stepNumber,
  isActive,
  isCompleted,
  isLocked,
  concepts,
  userAnswer,
  problemStatement,
  currentHintLevel = 0,
  warningBeacon,
  problemId,
  problemTitle,
  domain,
  subdomain,
  onAnswerChange,
  onComplete,
  onActivate,
  onHintLevelChange,
}: StepAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [feynmanScript, setFeynmanScript] = useState<FeynmanScript | null>(null)
  const [isLoadingAudio, setIsLoadingAudio] = useState(false)
  const [audioError, setAudioError] = useState<string | null>(null)
  const [generatedHints, setGeneratedHints] = useState<Map<number, { level: number; title: string; content: string }>>(new Map())
  const [isGeneratingHint, setIsGeneratingHint] = useState<number | null>(null)
  const [misconceptionFlag, setMisconceptionFlag] = useState<MisconceptionFlag | null>(null)
  const [dismissedMisconceptions, setDismissedMisconceptions] = useState<Set<string>>(new Set())

  // Error Pattern Prevention - personalized watch-outs from history
  const [errorWatchOuts, setErrorWatchOuts] = useState<ErrorPatternSummary[]>([])
  const [dismissedWatchOuts, setDismissedWatchOuts] = useState<Set<string>>(new Set())

  // Feynman Micro-Prompt state (for step-level Feynman prompts)
  const [feynmanPassed, setFeynmanPassed] = useState(false)
  const [feynmanResult, setFeynmanResult] = useState<FeynmanValidationResult | null>(null)

  // Feynman check state for hint level 3+ gating
  const [pendingHintFeynmanCheck, setPendingHintFeynmanCheck] = useState(false)
  const [hintFeynmanPassed, setHintFeynmanPassed] = useState(false)
  const [pendingHintLevel, setPendingHintLevel] = useState<number | null>(null)

  // Equationless Path state - verbal plan before algebra
  const [pendingVerbalPlan, setPendingVerbalPlan] = useState(false)
  const [verbalPlanPassed, setVerbalPlanPassed] = useState(false)
  const [verbalPlanResponse, setVerbalPlanResponse] = useState<string | null>(null)

  // Paper Solution Upload state
  const [showPaperUpload, setShowPaperUpload] = useState(false)
  const [paperSolutionFeedback, setPaperSolutionFeedback] = useState<AnalyzeSolutionResponse | null>(null)
  const [paperExtractedText, setPaperExtractedText] = useState<string>('')

  // Socratic Tutor Chat state
  const [showSocraticTutor, setShowSocraticTutor] = useState(false)

  // Track step activation time for timeout detection
  const stepActivationTimeRef = useRef<number | null>(null)

  // Set activation time when step becomes active
  useEffect(() => {
    if (isActive && !isCompleted && stepActivationTimeRef.current === null) {
      stepActivationTimeRef.current = Date.now()
    }
    // Reset when step is completed
    if (isCompleted) {
      stepActivationTimeRef.current = null
    }
  }, [isActive, isCompleted])

  const handleToggle = () => {
    if (!isLocked) {
      setIsExpanded(!isExpanded)
      if (!isExpanded) {
        onActivate()
      }
    }
  }

  const handleComplete = () => {
    // Track timeout if step took too long
    if (problemId && stepActivationTimeRef.current) {
      const durationMs = Date.now() - stepActivationTimeRef.current
      const problemContext: ProblemContext = {
        problemId,
        problemTitle: problemTitle || 'Untitled Problem',
        domain: domain || 'physics',
        subdomain: subdomain || 'general'
      }
      const stepContext: StepContext = {
        stepId: step.id,
        stepTitle: step.title,
        stepType: step.stepType || 'physics_concept',
        requiredConcepts: step.requiredConcepts || []
      }
      onStepTimeout(problemContext, stepContext, durationMs)
    }

    // Show Socratic tutor chat if enabled (triggers professor check-in)
    if (FEATURE_FLAGS.SOCRATIC_TUTOR_CHAT && !showSocraticTutor) {
      setShowSocraticTutor(true)
      return  // Wait for tutor to resolve before marking complete
    }

    onComplete()
    setIsExpanded(false)
  }

  // Called when Socratic tutor confirms understanding
  const handleSocraticResolved = () => {
    setShowSocraticTutor(false)
    onComplete()
    setIsExpanded(false)
  }

  // Skip Socratic tutor
  const handleSocraticSkip = () => {
    setShowSocraticTutor(false)
    onComplete()
    setIsExpanded(false)
  }

  const handleAudioHint = async () => {
    setIsLoadingAudio(true)
    setAudioError(null)

    try {
      // Generate concept summary from required concepts
      const conceptNames = relatedConcepts.map(c => c.name).join(', ')

      // Get the current hint content for context
      const currentHint = step.hints.find(h => h.level === currentHintLevel)
      const hintContext = currentHint?.content || step.hints[0]?.content || ''

      const response = await fetch('/api/feynman', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          concept: conceptNames || step.title,
          context: hintContext,
          stepTitle: step.title,
          problemStatement,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate audio explanation')
      }

      const script: FeynmanScript = await response.json()
      setFeynmanScript(script)
    } catch (error) {
      setAudioError(error instanceof Error ? error.message : 'Failed to load audio hint')
    } finally {
      setIsLoadingAudio(false)
    }
  }

  // Generate a dynamic Feynman prompt config based on step concepts
  const generateDynamicFeynmanConfig = (): FeynmanPromptConfig => {
    const conceptNames = relatedConcepts.map(c => c.name).join(' and ')
    const conceptForPrompt = conceptNames || step.title

    // Map step concepts to topic - use first required concept or step title
    const topic = step.requiredConcepts[0] || step.title.toLowerCase().replace(/\s+/g, '_')

    return {
      question: `Before getting computational help, explain in your own words: Why does ${conceptForPrompt} apply to this step? What is the underlying mechanism?`,
      topic: topic,
      context: problemStatement,
      requiredBefore: true,
      minScore: 4,
      maxAttempts: 3
    }
  }

  // Check if Feynman gate should apply for a hint level
  const shouldRequireFeynmanForHint = (level: number): boolean => {
    // Only gate levels 3+ (Strategy, Equation, Solution)
    if (level < 3) return false
    // Only if feature flag is enabled
    if (!FEATURE_FLAGS.FEYNMAN_HINT_PROMPTS) return false
    // Only if user hasn't already passed a Feynman check for this step's hints
    if (hintFeynmanPassed) return false
    // Only if there are concepts to check understanding of
    if (relatedConcepts.length === 0 && step.requiredConcepts.length === 0) return false
    return true
  }

  const handleUnlockNextHint = async () => {
    const nextLevel = currentHintLevel + 1
    if (nextLevel > 5) return

    // Check if we need a verbal plan first (Equationless Path)
    // This comes BEFORE Feynman - first articulate strategy, then explain concepts
    if (shouldRequireVerbalPlan(nextLevel)) {
      setPendingHintLevel(nextLevel)
      setPendingVerbalPlan(true)
      return  // Wait for verbal plan before proceeding
    }

    // Check if we need a Feynman check (conceptual understanding)
    if (shouldRequireFeynmanForHint(nextLevel)) {
      setPendingHintLevel(nextLevel)
      setPendingHintFeynmanCheck(true)
      return  // Wait for Feynman validation before proceeding
    }

    // Continue with actual hint unlock
    await proceedWithHintUnlock(nextLevel)
  }

  const proceedWithHintUnlock = async (nextLevel: number) => {
    // Track hint request for mistake notebook (level 2+ indicates struggle)
    if (problemId && nextLevel >= 2) {
      const problemContext: ProblemContext = {
        problemId,
        problemTitle: problemTitle || 'Untitled Problem',
        domain: domain || 'physics',
        subdomain: subdomain || 'general'
      }
      const stepContext: StepContext = {
        stepId: step.id,
        stepTitle: step.title,
        stepType: step.stepType || 'physics_concept',
        requiredConcepts: step.requiredConcepts || []
      }
      onHintRequested(problemContext, stepContext, nextLevel)
    }

    // If Level 4 or 5, and not already generated, fetch from API
    if ((nextLevel === 4 || nextLevel === 5) && !generatedHints.has(nextLevel)) {
      setIsGeneratingHint(nextLevel)

      try {
        const response = await authenticatedFetch('/api/generate-hint', {
          method: 'POST',
          body: JSON.stringify({
            problemText: problemStatement,
            stepTitle: step.title,
            stepHints: step.hints,
            level: nextLevel,
          }),
        })

        // Check for quota exceeded
        if (await handleQuotaExceeded(response)) {
          setIsGeneratingHint(null)
          return
        }

        if (!response.ok) {
          throw new Error('Failed to generate hint')
        }

        const hint = await response.json()
        setGeneratedHints(prev => {
          const newMap = new Map(prev)
          newMap.set(nextLevel, hint)
          return newMap
        })

        onHintLevelChange(nextLevel)
      } catch (error) {
        console.error('Failed to generate hint:', error)
        // Still unlock the level even if generation fails
        onHintLevelChange(nextLevel)
      } finally {
        setIsGeneratingHint(null)
      }
    } else {
      // Levels 1-3 or already generated, just unlock
      onHintLevelChange(nextLevel)
    }
  }

  // Handler for Feynman validation when gating hints
  const handleHintFeynmanValidated = async (passed: boolean, result: FeynmanValidationResult) => {
    if (passed && pendingHintLevel !== null) {
      setHintFeynmanPassed(true)
      setPendingHintFeynmanCheck(false)
      // Now proceed with the actual hint unlock
      await proceedWithHintUnlock(pendingHintLevel)
      setPendingHintLevel(null)
    }
    // If failed, the FeynmanMicroPrompt component handles feedback
  }

  const handleHintFeynmanSkip = async () => {
    // Allow skip but still mark as passed (user chose to bypass)
    setHintFeynmanPassed(true)
    setPendingHintFeynmanCheck(false)
    if (pendingHintLevel !== null) {
      await proceedWithHintUnlock(pendingHintLevel)
      setPendingHintLevel(null)
    }
  }

  // ============================================
  // Equationless Path - Verbal Plan Before Algebra
  // ============================================

  // Check if verbal plan should be required for a hint level
  const shouldRequireVerbalPlan = (level: number): boolean => {
    // Only gate level 3+ (Strategy, Equation, Solution - algebra territory)
    if (level < 3) return false
    // Only if feature flag is enabled
    if (!FEATURE_FLAGS.EQUATIONLESS_PATH) return false
    // Only if user hasn't already submitted a verbal plan for this step
    if (verbalPlanPassed) return false
    // Apply to math manipulation steps, or any step at strategy level
    // For other step types, still require if going to level 3+
    return true
  }

  // Generate verbal plan prompt based on step context
  const generateVerbalPlanPrompt = () => {
    const conceptNames = relatedConcepts.map(c => c.name).join(', ')

    return {
      question: `Before seeing the mathematical approach, describe your problem-solving strategy in plain words.`,
      prompt: `For "${step.title}": What quantities do you know? What are you solving for? What physics principles or equations might help? Walk through your approach step by step.`,
      minWords: 25,
      requiredKeywords: [] as string[], // We're lenient - just want them to think through it
      scaffoldingQuestions: [
        'What information is given in the problem?',
        'What physical principle applies here?',
        'How will you connect the knowns to the unknowns?'
      ]
    }
  }

  // Handle verbal plan submission
  const handleVerbalPlanSubmit = async (response: string, isValid: boolean) => {
    if (isValid) {
      setVerbalPlanPassed(true)
      setVerbalPlanResponse(response)
      setPendingVerbalPlan(false)

      // Check if Feynman is also required
      if (pendingHintLevel !== null) {
        if (shouldRequireFeynmanForHint(pendingHintLevel)) {
          // Move to Feynman check
          setPendingHintFeynmanCheck(true)
        } else {
          // No Feynman needed, proceed to unlock
          await proceedWithHintUnlock(pendingHintLevel)
          setPendingHintLevel(null)
        }
      }
    }
    // If not valid, VerbalPlanRenderer shows feedback and user can retry
  }

  // Skip verbal plan (user chooses to bypass)
  const handleVerbalPlanSkip = async () => {
    setVerbalPlanPassed(true)
    setPendingVerbalPlan(false)

    if (pendingHintLevel !== null) {
      // Check if Feynman is still required
      if (shouldRequireFeynmanForHint(pendingHintLevel)) {
        setPendingHintFeynmanCheck(true)
      } else {
        await proceedWithHintUnlock(pendingHintLevel)
        setPendingHintLevel(null)
      }
    }
  }

  // ============================================
  // Paper Solution Upload Handlers
  // ============================================

  // Handle extracted text from paper solution
  const handlePaperExtractedText = (text: string) => {
    setPaperExtractedText(text)
    // Also update the main answer field
    onAnswerChange(text)
  }

  // Handle paper solution analysis complete
  const handlePaperAnalysisComplete = (feedback: AnalyzeSolutionResponse) => {
    setPaperSolutionFeedback(feedback)

    // If analysis passed, mark step as complete
    if (feedback.status === 'pass') {
      onComplete()
    }
    // For partial/unclear, keep showing feedback so user can revise
    // For fail, keep the uploader open for revision
  }

  // Toggle between typed answer and paper upload
  const handleTogglePaperUpload = () => {
    setShowPaperUpload(!showPaperUpload)
    // Clear feedback when switching modes
    if (!showPaperUpload) {
      setPaperSolutionFeedback(null)
    }
  }

  const relatedConcepts = concepts.filter(c => step.requiredConcepts.includes(c.id))

  // Handler for Feynman validation result
  const handleFeynmanValidated = (passed: boolean, result: FeynmanValidationResult) => {
    setFeynmanResult(result)
    if (passed) {
      setFeynmanPassed(true)
    }
  }

  const handleDismissMisconception = (id: string) => {
    setDismissedMisconceptions(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
    setMisconceptionFlag(null)
  }

  // Check if this step requires Feynman check
  const requiresFeynmanCheck = !!step.feynmanPrompt
  const showStepContent = !requiresFeynmanCheck || feynmanPassed

  useEffect(() => {
    const detected = detectMisconceptionFlag({ answer: userAnswer, warningBeacon })
    if (detected && dismissedMisconceptions.has(detected.id)) {
      setMisconceptionFlag(null)
      return
    }
    setMisconceptionFlag(detected)
  }, [userAnswer, warningBeacon, dismissedMisconceptions])

  // Load personalized watch-outs from error history when step becomes active
  // Show before equation/math steps to prevent recurring mistakes
  useEffect(() => {
    if (!isActive || isCompleted) {
      setErrorWatchOuts([])
      return
    }

    // Get student's error pattern summaries (not just critical - we'll filter ourselves)
    const studentId = typeof window !== 'undefined'
      ? localStorage.getItem('physiscaffold_student_id') || 'anonymous'
      : 'anonymous'

    const allPatterns = errorPatternService.getErrorPatternSummaries(studentId)

    // Filter to patterns with 2+ occurrences that aren't mastered
    const activePatterns = allPatterns.filter(summary =>
      summary.occurrences >= 2 && !summary.mastered
    )

    if (activePatterns.length === 0) {
      setErrorWatchOuts([])
      return
    }

    // Check if this is an equation/math step (used for pattern filtering below)
    const isEquationStep = step.stepType === 'math_manipulation'

    // Filter to patterns relevant to this step's concepts/domain
    const stepConcepts = step.requiredConcepts || []

    const relevantPatterns = activePatterns.filter(summary => {
      const patternConcepts = summary.pattern.relatedConcepts.map(c => c.toLowerCase())
      const patternTopics = summary.pattern.commonIn.map(t => t.toLowerCase())

      // Match on concepts
      const hasConceptMatch = stepConcepts.some(concept =>
        patternConcepts.some(pc => pc.includes(concept.toLowerCase()) || concept.toLowerCase().includes(pc))
      )

      // Match on domain/subdomain
      const hasDomainMatch = domain && patternTopics.some(topic =>
        topic.includes(domain.toLowerCase()) || domain.toLowerCase().includes(topic)
      )
      const hasSubdomainMatch = subdomain && patternTopics.some(topic =>
        topic.includes(subdomain.toLowerCase()) || subdomain.toLowerCase().includes(topic)
      )

      // For equation steps, also include sign/algebra patterns
      const isAlgebraPattern = summary.pattern.category === 'ALGEBRA_MANIPULATION' ||
        summary.pattern.category === 'SIGN_CONVENTION'
      const mathStepMatch = isEquationStep && isAlgebraPattern

      // Generic physics match - show mechanics patterns for physics problems
      const isPhysicsPattern = patternTopics.some(t =>
        t.includes('mechanics') || t.includes('dynamics') || t.includes('kinematics')
      )

      return hasConceptMatch || hasDomainMatch || hasSubdomainMatch || mathStepMatch || isPhysicsPattern
    })

    // Take top 2 most relevant (already sorted by severity & occurrences)
    const topWatchOuts = relevantPatterns
      .filter(p => !dismissedWatchOuts.has(p.pattern.id))
      .slice(0, 2)

    setErrorWatchOuts(topWatchOuts)
  }, [isActive, isCompleted, step.stepType, step.requiredConcepts, domain, subdomain, dismissedWatchOuts])

  const handleDismissWatchOut = (patternId: string) => {
    setDismissedWatchOuts(prev => {
      const next = new Set(prev)
      next.add(patternId)
      return next
    })
  }

  return (
    <div
      className={`border-2 rounded-lg overflow-hidden transition-all ${
        isCompleted
          ? 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
          : isActive
          ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/20'
          : isLocked
          ? 'border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card-soft opacity-60'
          : 'border-gray-300 dark:border-dark-border bg-white dark:bg-dark-card hover:border-gray-400 dark:hover:border-dark-border-strong'
      }`}
    >
      {/* Header */}
      <button
        onClick={handleToggle}
        disabled={isLocked}
        className="w-full px-6 py-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center space-x-4">
          {/* Status Icon */}
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
              isCompleted
                ? 'bg-green-500 text-white'
                : isActive
                ? 'bg-primary-600 text-white'
                : isLocked
                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                : 'bg-gray-200 dark:bg-dark-border text-gray-700 dark:text-dark-text-secondary'
            }`}
          >
            {isCompleted ? '✓' : stepNumber}
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Step {stepNumber}: {step.title}
              </h4>
              {/* Step Type Badge */}
              {step.stepType && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStepTypeBadge(step.stepType).bgClass} ${getStepTypeBadge(step.stepType).textClass}`}>
                  {getStepTypeBadge(step.stepType).label}
                </span>
              )}
            </div>
            {isLocked && (
              <p className="text-sm text-gray-500 dark:text-dark-text-muted">
                Complete previous steps to unlock
              </p>
            )}
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        {!isLocked && (
          <svg
            className={`w-6 h-6 text-gray-600 dark:text-dark-text-secondary transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && !isLocked && (
        <div className="px-6 pb-6 border-t border-gray-200 dark:border-dark-border">
          <div className="pt-4 space-y-4">
            {/* Feynman Micro-Prompt - Show before step content if configured */}
            {requiresFeynmanCheck && !feynmanPassed && step.feynmanPrompt && (
              <FeynmanMicroPrompt
                config={step.feynmanPrompt}
                problemStatement={problemStatement}
                onValidated={handleFeynmanValidated}
                onSkip={() => setFeynmanPassed(true)}
              />
            )}

            {/* Feynman Passed Indicator */}
            {requiresFeynmanCheck && feynmanPassed && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    Conceptual understanding verified
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    You explained WHY, now proceed with the calculation
                  </p>
                </div>
              </div>
            )}

            {/* Warning Beacon - Non-spoilery hint about common mistakes */}
            {showStepContent && warningBeacon && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg p-3 flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-800/40 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
                    {warningBeacon.message}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5" title={`Common mistake: ${warningBeacon.tag}`}>
                    Most common mistake here
                  </p>
                </div>
              </div>
            )}

            {/* Error Pattern Watch-Outs - Personalized warnings from student's error history */}
            {showStepContent && errorWatchOuts.length > 0 && (
              <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-300 dark:border-rose-700 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-800/40 flex items-center justify-center">
                    <svg className="w-3 h-3 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-rose-700 dark:text-rose-300 uppercase tracking-wide">
                    Watch-Outs From Your History
                  </p>
                </div>
                <div className="space-y-2">
                  {errorWatchOuts.map((summary) => (
                    <div
                      key={summary.pattern.id}
                      className="flex items-start justify-between gap-2 bg-white dark:bg-dark-card-soft rounded p-2 border border-rose-200 dark:border-rose-800"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-rose-900 dark:text-rose-100">
                          {summary.pattern.title}
                        </p>
                        <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                          {summary.pattern.remediation}
                        </p>
                        <p className="text-xs text-rose-500 dark:text-rose-400 mt-1">
                          {summary.occurrences}x in past problems
                          {summary.trend === 'worsening' && ' • Getting more frequent'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDismissWatchOut(summary.pattern.id)}
                        className="flex-shrink-0 text-xs text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-200 p-1"
                        title="Dismiss"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Misconception Flag - Clarification question when likely misconception detected */}
            {showStepContent && misconceptionFlag && (
              <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-300 dark:border-indigo-700 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs uppercase tracking-wide text-indigo-600 dark:text-indigo-300 font-semibold">
                      Clarification Check
                    </p>
                    <p className="text-sm text-indigo-900 dark:text-indigo-100 font-medium mt-1">
                      {misconceptionFlag.title}
                    </p>
                    <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-1">
                      {misconceptionFlag.question}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismissMisconception(misconceptionFlag.id)}
                    className="text-xs text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Required Concepts */}
            {showStepContent && relatedConcepts.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Required Concepts:
                </h5>
                <div className="flex flex-wrap gap-2">
                  {relatedConcepts.map(concept => (
                    <span
                      key={concept.id}
                      className="px-3 py-1 bg-blue-100 dark:bg-blue-800/40 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium"
                    >
                      {concept.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Progressive Hint Ladder */}
            {showStepContent && (
            <div className="bg-gray-50 dark:bg-dark-card-soft border-2 border-gray-300 dark:border-dark-border rounded-lg p-5">
              {/* Equationless Path - Verbal Plan Before Algebra */}
              {pendingVerbalPlan && (
                <div className="mb-5 p-4 bg-indigo-50 dark:bg-indigo-900/20 border-2 border-indigo-300 dark:border-indigo-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </div>
                    <div>
                      <h6 className="text-sm font-bold text-indigo-900 dark:text-indigo-200">
                        Describe Your Strategy First
                      </h6>
                      <p className="text-xs text-indigo-700 dark:text-indigo-300">
                        Level {pendingHintLevel} contains equations. Before jumping to math, articulate your approach in words.
                      </p>
                    </div>
                  </div>
                  <VerbalPlanRenderer
                    question={generateVerbalPlanPrompt().question}
                    prompt={generateVerbalPlanPrompt().prompt}
                    minWords={generateVerbalPlanPrompt().minWords}
                    requiredKeywords={generateVerbalPlanPrompt().requiredKeywords}
                    scaffoldingQuestions={generateVerbalPlanPrompt().scaffoldingQuestions}
                    onSubmit={handleVerbalPlanSubmit}
                  />
                  <button
                    onClick={handleVerbalPlanSkip}
                    className="mt-3 w-full py-2 text-sm text-indigo-400 dark:text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Skip and show hint anyway
                  </button>
                </div>
              )}

              {/* Feynman Check Modal for Level 3+ Hints */}
              {pendingHintFeynmanCheck && (
                <div className="mb-5 p-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="text-white text-lg">🎓</span>
                    </div>
                    <div>
                      <h6 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                        Explain Before Proceeding
                      </h6>
                      <p className="text-xs text-purple-700 dark:text-purple-300">
                        Level {pendingHintLevel} contains computational help. First, show you understand the concept.
                      </p>
                    </div>
                  </div>
                  <FeynmanMicroPrompt
                    config={step.feynmanPrompt || generateDynamicFeynmanConfig()}
                    problemStatement={problemStatement}
                    onValidated={handleHintFeynmanValidated}
                    onSkip={handleHintFeynmanSkip}
                  />
                </div>
              )}

              {/* Professor Explains - Prominent Dialogue Button */}
              <button
                onClick={handleAudioHint}
                disabled={isLoadingAudio}
                className="w-full mb-4 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-500 dark:to-indigo-500 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 dark:hover:from-purple-600 dark:hover:to-indigo-600 disabled:from-purple-300 disabled:to-indigo-300 dark:disabled:from-purple-400 dark:disabled:to-indigo-400 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">
                      🎭
                    </div>
                    <div className="text-left">
                      <h6 className="font-bold text-base">Professor Explains</h6>
                      <p className="text-purple-100 text-sm">
                        {isLoadingAudio ? 'Generating conversation...' : 'Hear a student-professor dialogue about this concept'}
                      </p>
                    </div>
                  </div>
                  {isLoadingAudio ? (
                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-full">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      <span className="text-sm font-medium">Listen</span>
                    </div>
                  )}
                </div>
              </button>

              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h5 className="text-base font-bold text-gray-900 dark:text-dark-text-primary">
                      Progressive Hint Ladder
                    </h5>
                    {/* Verbal Plan Passed Indicator */}
                    {verbalPlanPassed && FEATURE_FLAGS.EQUATIONLESS_PATH && (
                      <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Strategy Articulated
                      </span>
                    )}
                    {/* Feynman Check Passed Indicator */}
                    {hintFeynmanPassed && FEATURE_FLAGS.FEYNMAN_HINT_PROMPTS && (
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full flex items-center gap-1">
                        <span>🎓</span>
                        Conceptual Check Passed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-dark-text-muted mt-1">
                    Unlock hints progressively. Try thinking before revealing each level.
                  </p>
                </div>
              </div>

              {/* Visual Hint Progress Stepper */}
              <div className="mb-5 px-2">
                <div className="relative flex items-center justify-between">
                  {/* Progress Line Background */}
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gray-200 dark:bg-dark-border rounded-full" />
                  {/* Progress Line Filled */}
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(0, (currentHintLevel - 1) / 4) * 100}%` }}
                  />

                  {/* Stepper Nodes */}
                  {[1, 2, 3, 4, 5].map((level) => {
                    const isUnlocked = level <= currentHintLevel
                    const isCurrent = level === currentHintLevel
                    const isNext = level === currentHintLevel + 1
                    const labels = ['Concept', 'Visual', 'Strategy', 'Equation', 'Solution']

                    return (
                      <div key={level} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 ${
                            isUnlocked
                              ? level === 5
                                ? 'bg-red-500 border-red-500 text-white'
                                : 'bg-green-500 border-green-500 text-white'
                              : isNext
                              ? 'bg-yellow-100 dark:bg-yellow-900/40 border-yellow-500 text-yellow-700 dark:text-yellow-300 animate-pulse'
                              : 'bg-white dark:bg-dark-card border-gray-300 dark:border-dark-border text-gray-400 dark:text-dark-text-muted'
                          } ${isCurrent ? 'ring-2 ring-offset-2 dark:ring-offset-dark-card-soft ring-green-400' : ''}`}
                        >
                          {isUnlocked ? '✓' : level}
                        </div>
                        <span className={`mt-1.5 text-[10px] font-medium ${
                          isUnlocked ? 'text-green-700 dark:text-green-400' : isNext ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-400 dark:text-dark-text-muted'
                        }`}>
                          {labels[level - 1]}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Current Position Indicator */}
                {currentHintLevel > 0 && currentHintLevel < 5 && (
                  <p className="text-center text-xs text-gray-500 dark:text-dark-text-muted mt-3">
                    Level {currentHintLevel} of 5 unlocked
                  </p>
                )}
                {currentHintLevel === 0 && (
                  <p className="text-center text-xs text-gray-500 dark:text-dark-text-muted mt-3">
                    Start by unlocking Level 1
                  </p>
                )}
                {currentHintLevel === 5 && (
                  <p className="text-center text-xs text-red-600 dark:text-red-400 font-medium mt-3">
                    Full solution revealed
                  </p>
                )}
              </div>

              {/* Hint Ladder Steps */}
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((level) => {
                  // Get hint from either original hints or generated hints
                  const originalHint = step.hints.find(h => h.level === level)
                  const generatedHint = generatedHints.get(level)
                  const hint = originalHint || generatedHint

                  const isUnlocked = level <= currentHintLevel
                  const isNextHint = level === currentHintLevel + 1
                  const isFutureHint = level > currentHintLevel + 1
                  const isGenerating = isGeneratingHint === level

                  return (
                    <div
                      key={level}
                      className={`border-2 rounded-lg transition-all ${
                        isUnlocked
                          ? level === 5
                            ? 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20'
                            : 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20'
                          : isNextHint
                          ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'
                          : 'border-gray-300 dark:border-dark-border bg-gray-100 dark:bg-dark-card opacity-60'
                      }`}
                    >
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isUnlocked
                                  ? level === 5
                                    ? 'bg-red-600 text-white'
                                    : 'bg-green-600 text-white'
                                  : isNextHint
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-gray-400 dark:bg-gray-600 text-white'
                              }`}
                            >
                              {isUnlocked ? '✓' : level}
                            </div>
                            <h6
                              className={`text-sm font-semibold ${
                                isUnlocked ? 'text-gray-900 dark:text-dark-text-primary' : 'text-gray-600 dark:text-dark-text-secondary'
                              }`}
                            >
                              Level {level}: {hint?.title || (level === 4 ? 'Structural Equation' : level === 5 ? 'Full Solution' : 'Hint')}
                            </h6>
                          </div>

                          {isNextHint && !pendingHintFeynmanCheck && !pendingVerbalPlan && (
                            <button
                              onClick={handleUnlockNextHint}
                              disabled={isGenerating}
                              className={`px-3 py-1 text-white rounded text-xs font-medium flex items-center gap-1 ${
                                shouldRequireVerbalPlan(level)
                                  ? 'bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400'
                                  : shouldRequireFeynmanForHint(level)
                                  ? 'bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400'
                                  : 'bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400'
                              }`}
                            >
                              {isGenerating ? (
                                <>
                                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                  Generating...
                                </>
                              ) : shouldRequireVerbalPlan(level) ? (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                  Describe Strategy
                                </>
                              ) : shouldRequireFeynmanForHint(level) ? (
                                <>
                                  <span>🎓</span>
                                  Explain to Unlock
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                  </svg>
                                  {level >= 4 ? 'Generate' : 'Unlock'}
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {isUnlocked && hint ? (
                          <div className="mt-2 text-sm text-gray-800 dark:text-dark-text-secondary">
                            <MathRenderer text={hint.content} />
                          </div>
                        ) : isFutureHint ? (
                          <p className="text-xs text-gray-500 dark:text-dark-text-muted italic">
                            Locked - unlock previous hints first
                          </p>
                        ) : isNextHint && shouldRequireVerbalPlan(level) ? (
                          <p className="text-xs text-indigo-700 dark:text-indigo-300 italic">
                            Describe your problem-solving strategy in words before seeing equations
                          </p>
                        ) : isNextHint && shouldRequireFeynmanForHint(level) ? (
                          <p className="text-xs text-purple-700 dark:text-purple-300 italic">
                            Explain your conceptual understanding to unlock computational help
                          </p>
                        ) : isNextHint && level >= 4 ? (
                          <p className="text-xs text-gray-700 dark:text-dark-text-secondary italic">
                            Click &quot;Generate&quot; to create this hint (~3 seconds)
                          </p>
                        ) : (
                          <p className="text-xs text-gray-700 dark:text-dark-text-secondary italic">
                            Click &quot;Unlock&quot; to reveal this hint
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {currentHintLevel === 5 && (
                <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                  <p className="text-xs text-red-800 dark:text-red-300 font-medium">
                    ⚠️ You&apos;ve unlocked the full solution. Make sure you understand each step before moving forward.
                  </p>
                </div>
              )}

              {audioError && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">{audioError}</p>
              )}
            </div>
            )}

            {/* Socratic Question */}
            {showStepContent && step.question && (
              <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
                <h5 className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3">
                  🤔 Think About This:
                </h5>
                <MathRenderer text={step.question} className="mb-3 text-gray-900 dark:text-dark-text-primary" />

                {/* Toggle between typed answer and paper upload */}
                {FEATURE_FLAGS.PAPER_SOLUTION_UPLOAD && (
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setShowPaperUpload(false)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                        !showPaperUpload
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-dark-card border border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Type Answer
                    </button>
                    <button
                      onClick={() => setShowPaperUpload(true)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                        showPaperUpload
                          ? 'bg-purple-600 text-white'
                          : 'bg-white dark:bg-dark-card border border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Upload Paper Solution
                    </button>
                  </div>
                )}

                {/* Typed answer mode */}
                {!showPaperUpload && (
                  <textarea
                    placeholder="Type your reasoning here..."
                    className="w-full px-3 py-2 border border-purple-300 dark:border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none bg-white dark:bg-dark-card-soft text-gray-900 dark:text-dark-text-primary placeholder:text-gray-400 dark:placeholder:text-dark-text-muted"
                    rows={3}
                    value={userAnswer}
                    onChange={(e) => onAnswerChange(e.target.value)}
                  />
                )}

                {/* Paper upload mode */}
                {showPaperUpload && FEATURE_FLAGS.PAPER_SOLUTION_UPLOAD && (
                  <PaperSolutionUploader
                    stepId={step.id}
                    stepTitle={step.title}
                    stepObjective={step.question || step.title}
                    requiredElements={step.requiredConcepts || []}
                    commonMistakes={[]}
                    problemText={problemStatement || ''}
                    domain={domain || 'physics'}
                    subdomain={subdomain || 'mechanics'}
                    relevantConcepts={step.requiredConcepts || []}
                    onExtractedTextChange={handlePaperExtractedText}
                    onAnalysisComplete={handlePaperAnalysisComplete}
                  />
                )}
              </div>
            )}

            {/* Action Button */}
            {showStepContent && !showSocraticTutor && (
            <div className="flex justify-end pt-2">
              <button
                onClick={handleComplete}
                className="px-6 py-2 bg-green-600 dark:bg-green-500 text-white rounded-lg font-medium hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
              >
                Mark as Complete →
              </button>
            </div>
            )}

            {/* Socratic Tutor Chat - Live professor check-in */}
            {showSocraticTutor && (
              <div className="mt-4">
                <SocraticTutorChat
                  problemText={problemStatement || ''}
                  stepTitle={step.title}
                  stepContent={step.hints.map(h => h.content).join('\n')}
                  requiredConcepts={step.requiredConcepts || []}
                  onResolved={handleSocraticResolved}
                  onSkip={handleSocraticSkip}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feynman Dialogue Player Modal */}
      {feynmanScript && (
        <FeynmanDialoguePlayer
          script={feynmanScript}
          onClose={() => setFeynmanScript(null)}
        />
      )}
    </div>
  )
}
