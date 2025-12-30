/**
 * Socratic Rewind Service
 * Implements the "Socratic Rewind" algorithm for guiding students back
 * to their last valid step after making an error.
 *
 * THE ALGORITHM:
 * 1. The Stop: Do not say "Wrong." Frame it as a "Pause for calibration."
 * 2. The Rewind: Quote what the student agreed to in the previous valid step.
 * 3. The Comparison: Ask the student to compare the valid step and current error.
 * 4. The Bridge Question: Single targeted question highlighting the contradiction.
 *
 * GUARDRAILS:
 * - NEVER give the correct equation or numerical answer.
 * - NEVER explicitly state the mistake. Instead, ask guiding questions.
 * - Keep the tone encouraging but rigorous (Socratic method).
 */

import type {
  SocraticRewindContext,
  SocraticRewindResponse,
  SocraticRewindEvent,
  RewindTriggerSource,
} from '@/types/socraticRewind'
import type { Step } from '@/types/scaffold'
import type { GradeSolutionResponse } from '@/types/gradeSolution'

/**
 * Templates for the "Stop" message based on error type
 */
const STOP_MESSAGES: Record<SocraticRewindContext['currentError']['errorType'], string[]> = {
  sign_convention: [
    "Hold on. Let's pause for a moment to calibrate our direction conventions.",
    "Let's take a step back and check our sign conventions.",
    "Before we proceed, let's verify our directional setup.",
  ],
  vector_direction: [
    "Let's pause here. I want us to revisit the directions we established.",
    "Hold on - let's check the vector directions we set up earlier.",
    "Before moving forward, let's revisit our vector analysis.",
  ],
  force_missing: [
    "Let's pause and systematically check our force inventory.",
    "Wait - before we continue, let's verify we have all the forces.",
    "Hold on. Let's rewind and do a complete force enumeration.",
  ],
  wrong_equation: [
    "Let's pause here and revisit the equation we're using.",
    "Before we proceed, let's check if this equation matches our setup.",
    "Hold on - let's verify this equation against our earlier analysis.",
  ],
  unit_error: [
    "Let's pause to check our units and values.",
    "Before continuing, let's verify the values we're using.",
    "Hold on - let's double-check the numbers from the problem.",
  ],
  constraint_violation: [
    "Let's pause and revisit the constraints stated in the problem.",
    "Before we proceed, let's check if we're honoring all the problem's constraints.",
    "Hold on. Let's rewind to what the problem actually states.",
  ],
  algebra_error: [
    "Let's pause and trace through our algebra step by step.",
    "Before continuing, let's verify our mathematical manipulation.",
    "Hold on - let's check the algebraic steps we just performed.",
  ],
  conceptual_gap: [
    "Let's pause here. There might be a physics principle we need to revisit.",
    "Before we continue, let's review the underlying physics.",
    "Hold on - let's make sure we're applying the right physics concept.",
  ],
  other: [
    "Let's pause for a moment and rewind to check our work.",
    "Before we proceed, let's review what we've established.",
    "Hold on - let's take a step back and verify our approach.",
  ],
}

/**
 * Templates for bridge questions based on error type
 */
const BRIDGE_QUESTION_TEMPLATES: Record<SocraticRewindContext['currentError']['errorType'], string[]> = {
  sign_convention: [
    "Based on the direction you defined as positive in {stepLabel}, what sign should {quantity} carry?",
    "Looking at your coordinate system in {stepLabel}, does {quantity} point in the positive or negative direction?",
    "You defined {direction} as positive. Does {quantity} act in that same direction or opposite to it?",
  ],
  vector_direction: [
    "In {stepLabel}, you drew {vector} pointing in a certain direction. Does your current equation reflect that direction?",
    "Look at your diagram from {stepLabel}. Are {vectorA} and {vectorB} acting in the same direction or opposite directions?",
    "Based on your Free Body Diagram, how should the vector directions appear in your equation?",
  ],
  force_missing: [
    "Looking back at {stepLabel}, is there any force acting on the object that isn't in your current equation?",
    "In your setup, you identified certain contact surfaces. What forces would those contacts produce?",
    "The problem mentions something about the surface. What force would that imply?",
  ],
  wrong_equation: [
    "Looking at {stepLabel}, does the equation you're using match the physical setup you described?",
    "Which physics principle applies here? Is your current equation the correct expression of that principle?",
    "Compare the physical situation in {stepLabel} to the equation you just wrote. Do they match?",
  ],
  unit_error: [
    "In {stepLabel}, what value did the problem give for {quantity}? Is that what you're using now?",
    "Let's check: what units should {quantity} have? Does your value match the problem statement?",
    "Look back at the given values. Is the number you're using exactly what the problem provides?",
  ],
  constraint_violation: [
    "The problem states a specific condition about {constraint}. How does that affect your current approach?",
    "Looking at the problem statement, what does it say about {topic}? Does your work reflect that?",
    "Re-read the constraint about {constraint}. Is your current assumption consistent with it?",
  ],
  algebra_error: [
    "In {stepLabel}, you had {expression}. Walk me through how you got to your current result.",
    "Let's trace the algebra: starting from {stepLabel}, can you verify each step?",
    "Looking at the expression in {stepLabel}, what operation did you perform to get here?",
  ],
  conceptual_gap: [
    "What physics principle did you use in {stepLabel}? Does your current step follow from that principle?",
    "Think about the physics: in {stepLabel}, we established {concept}. How does that apply here?",
    "Let's think about what the physics tells us. Based on {stepLabel}, what should happen next?",
  ],
  other: [
    "Compare what you did in {stepLabel} with your current step. Do they logically connect?",
    "Looking at {stepLabel}, is your current approach consistent with what you established there?",
    "Walk me through your reasoning from {stepLabel} to here. Is each step justified?",
  ],
}

/**
 * Select a random item from an array
 */
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Interpolate placeholders in template string
 */
function interpolate(template: string, context: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(context)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return result
}

/**
 * Generate a client-side Socratic Rewind response without AI
 * This provides immediate feedback while optionally waiting for AI response
 */
export function generateQuickRewindResponse(
  context: SocraticRewindContext
): SocraticRewindResponse {
  const errorType = context.currentError.errorType

  // Generate stop message
  const stopMessage = randomChoice(STOP_MESSAGES[errorType])

  // Generate rewind reference
  const stepLabel = `Step ${context.previousValidStep.stepId + 1}`
  const rewindReference = {
    stepLabel,
    quotedContent: context.previousValidStep.userAnswer
      ? `You wrote: "${context.previousValidStep.userAnswer}"`
      : `In **${context.previousValidStep.stepTitle}**, you established: ${context.previousValidStep.stepContent}`,
  }

  // Generate comparison prompt
  const comparisonPrompt = `Now, look at your current input and compare it to what you did in ${stepLabel}.`

  // Generate bridge question
  const bridgeTemplate = randomChoice(BRIDGE_QUESTION_TEMPLATES[errorType])
  const bridgeQuestion = interpolate(bridgeTemplate, {
    stepLabel,
    quantity: context.violatedPrinciple.name,
    direction: 'the positive direction',
    vector: 'the force',
    vectorA: 'one vector',
    vectorB: 'the other vector',
    expression: context.previousValidStep.userAnswer || 'the expression',
    constraint: context.violatedPrinciple.name,
    topic: context.violatedPrinciple.name,
    concept: context.violatedPrinciple.name,
  })

  // Generate gentle nudge
  const gentleNudge = `Hint: ${context.violatedPrinciple.description}`

  return {
    stopMessage,
    rewindReference,
    comparisonPrompt,
    bridgeQuestion,
    gentleNudge,
    relatedConcepts: [context.violatedPrinciple.category],
    highlightStepId: context.previousValidStep.stepId,
  }
}

/**
 * Build rewind context from a grading result
 */
export function buildContextFromGradeResult(
  gradeResult: GradeSolutionResponse,
  steps: Step[],
  stepAnswers: Map<number, string>,
  completedSteps: number[],
  problemText: string,
  domain: string,
  subdomain: string
): SocraticRewindContext | null {
  // Only trigger for CONCEPTUAL_GAP or errors
  if (gradeResult.status === 'SUCCESS') {
    return null
  }

  // Find the last completed step as the previous valid step
  const lastCompletedStepId = completedSteps.length > 0
    ? Math.max(...completedSteps)
    : 0

  const previousStep = steps[lastCompletedStepId]
  if (!previousStep) {
    return null
  }

  // Determine error type from grading result
  let errorType: SocraticRewindContext['currentError']['errorType'] = 'conceptual_gap'
  let violatedPrincipleName = 'Physics Principle'
  let violatedPrincipleDescription = 'Review the underlying physics concept.'

  if (gradeResult.detailedAnalysis?.errors) {
    const errors = gradeResult.detailedAnalysis.errors
    if (errors.signErrors && errors.signErrors.length > 0) {
      errorType = 'sign_convention'
      violatedPrincipleName = 'Sign Convention'
      violatedPrincipleDescription = errors.signErrors[0]
    } else if (errors.algebraErrors && errors.algebraErrors.length > 0) {
      errorType = 'algebra_error'
      violatedPrincipleName = 'Algebraic Manipulation'
      violatedPrincipleDescription = errors.algebraErrors[0]
    } else if (errors.physicsErrors && errors.physicsErrors.length > 0) {
      errorType = 'conceptual_gap'
      violatedPrincipleName = 'Physics Principle'
      violatedPrincipleDescription = errors.physicsErrors[0]
    } else if (errors.conceptualGaps && errors.conceptualGaps.length > 0) {
      errorType = 'conceptual_gap'
      violatedPrincipleName = 'Conceptual Understanding'
      violatedPrincipleDescription = errors.conceptualGaps[0]
    }
  }

  // Determine principle category
  const categoryMap: Record<string, SocraticRewindContext['violatedPrinciple']['category']> = {
    sign_convention: 'vectors',
    vector_direction: 'vectors',
    algebra_error: 'math',
    unit_error: 'math',
    conceptual_gap: 'dynamics',
    force_missing: 'dynamics',
    wrong_equation: 'math',
    constraint_violation: 'constraints',
    other: 'dynamics',
  }

  return {
    previousValidStep: {
      stepId: lastCompletedStepId,
      stepTitle: previousStep.title,
      stepContent: previousStep.question || previousStep.title,
      userAnswer: stepAnswers.get(lastCompletedStepId),
    },
    currentError: {
      description: gradeResult.feedback,
      errorType,
      studentInput: gradeResult.detailedAnalysis?.overallAssessment,
    },
    violatedPrinciple: {
      name: violatedPrincipleName,
      description: violatedPrincipleDescription,
      category: categoryMap[errorType] || 'dynamics',
    },
    problemContext: {
      problemText,
      domain,
      subdomain,
    },
  }
}

/**
 * Build rewind context from a sanity check failure
 */
export function buildContextFromSanityCheckFailure(
  checkType: 'limit' | 'symmetry' | 'dimension',
  feedback: string,
  steps: Step[],
  stepAnswers: Map<number, string>,
  completedSteps: number[],
  problemText: string,
  domain: string,
  subdomain: string
): SocraticRewindContext | null {
  // Find the last completed step
  const lastCompletedStepId = completedSteps.length > 0
    ? Math.max(...completedSteps)
    : 0

  const previousStep = steps[lastCompletedStepId]
  if (!previousStep) {
    return null
  }

  // Map check type to error context
  const checkTypeContext: Record<string, {
    errorType: SocraticRewindContext['currentError']['errorType']
    principle: string
    category: SocraticRewindContext['violatedPrinciple']['category']
  }> = {
    limit: {
      errorType: 'conceptual_gap',
      principle: 'Limiting Behavior',
      category: 'dynamics',
    },
    symmetry: {
      errorType: 'conceptual_gap',
      principle: 'Physical Symmetry',
      category: 'dynamics',
    },
    dimension: {
      errorType: 'unit_error',
      principle: 'Dimensional Analysis',
      category: 'math',
    },
  }

  const ctx = checkTypeContext[checkType]

  return {
    previousValidStep: {
      stepId: lastCompletedStepId,
      stepTitle: previousStep.title,
      stepContent: previousStep.question || previousStep.title,
      userAnswer: stepAnswers.get(lastCompletedStepId),
    },
    currentError: {
      description: feedback,
      errorType: ctx.errorType,
    },
    violatedPrinciple: {
      name: ctx.principle,
      description: feedback,
      category: ctx.category,
    },
    problemContext: {
      problemText,
      domain,
      subdomain,
    },
  }
}

/**
 * Log a Socratic Rewind event to localStorage
 */
export function logRewindEvent(
  event: Omit<SocraticRewindEvent, 'id' | 'timestamp'>
): SocraticRewindEvent {
  const fullEvent: SocraticRewindEvent = {
    ...event,
    id: `rewind_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
  }

  if (typeof window !== 'undefined') {
    try {
      const storageKey = 'physiscaffold_rewind_events'
      const existing = localStorage.getItem(storageKey)
      const events: SocraticRewindEvent[] = existing ? JSON.parse(existing) : []

      // Keep only last 50 events
      events.push(fullEvent)
      if (events.length > 50) {
        events.shift()
      }

      localStorage.setItem(storageKey, JSON.stringify(events))
    } catch (error) {
      console.error('Failed to log rewind event:', error)
    }
  }

  return fullEvent
}

/**
 * Get rewind analytics for a student
 */
export function getRewindAnalytics(): {
  totalRewinds: number
  resolvedRate: number
  commonErrorTypes: { type: string; count: number }[]
  averageTimeToResolve: number
} {
  if (typeof window === 'undefined') {
    return {
      totalRewinds: 0,
      resolvedRate: 0,
      commonErrorTypes: [],
      averageTimeToResolve: 0,
    }
  }

  try {
    const storageKey = 'physiscaffold_rewind_events'
    const existing = localStorage.getItem(storageKey)
    if (!existing) {
      return {
        totalRewinds: 0,
        resolvedRate: 0,
        commonErrorTypes: [],
        averageTimeToResolve: 0,
      }
    }

    const events: SocraticRewindEvent[] = JSON.parse(existing)
    const totalRewinds = events.length
    const resolved = events.filter(e => e.outcome === 'resolved').length
    const resolvedRate = totalRewinds > 0 ? resolved / totalRewinds : 0

    // Count error types
    const errorTypeCounts: Record<string, number> = {}
    for (const event of events) {
      const type = event.context.currentError.errorType
      errorTypeCounts[type] = (errorTypeCounts[type] || 0) + 1
    }

    const commonErrorTypes = Object.entries(errorTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Calculate average time to acknowledge
    const times = events
      .filter(e => e.studentInteraction.timeToAcknowledge)
      .map(e => e.studentInteraction.timeToAcknowledge!)

    const averageTimeToResolve = times.length > 0
      ? times.reduce((a, b) => a + b, 0) / times.length
      : 0

    return {
      totalRewinds,
      resolvedRate,
      commonErrorTypes,
      averageTimeToResolve,
    }
  } catch (error) {
    console.error('Failed to get rewind analytics:', error)
    return {
      totalRewinds: 0,
      resolvedRate: 0,
      commonErrorTypes: [],
      averageTimeToResolve: 0,
    }
  }
}
