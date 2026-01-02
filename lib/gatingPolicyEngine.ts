/**
 * P0 Gating Policy Engine
 *
 * Manages session-level gating decisions based on:
 * - Pattern gate performance (correct/wrong → strong/weak confidence)
 * - Step performance (consecutive wrong submissions)
 * - Per-step micro-task completion and rebuild gate status
 */

import {
  type SessionGatingPolicy,
  type PatternGateState,
  type StepDecisionGateState,
  type StepRebuildGateState,
  type DecisionGateConfig,
  type RebuildQuestion,
  type GatingIntensity,
  type PatternConfidence,
  type CognitiveLoadLevel,
  createInitialSessionPolicy,
  createInitialRebuildGateState,
  DEFAULT_DECISION_GATE_CONFIG,
  WEAK_CONFIDENCE_DECISION_GATE_CONFIG,
  isGatedStepType,
  serializeSessionPolicy,
  deserializeSessionPolicy,
} from '@/types/gatingPolicy'
import type { PatternOption } from '@/types/patternFirst'

const SESSION_POLICY_KEY = 'v2_gating_policy'

// ============================================
// Session Policy Management
// ============================================

/**
 * Load session gating policy from sessionStorage
 */
export function loadSessionPolicy(): SessionGatingPolicy | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = sessionStorage.getItem(SESSION_POLICY_KEY)
    if (!stored) return null
    return deserializeSessionPolicy(stored)
  } catch (error) {
    console.error('[GatingPolicy] Failed to load session policy:', error)
    return null
  }
}

/**
 * Save session gating policy to sessionStorage
 */
export function saveSessionPolicy(policy: SessionGatingPolicy): void {
  if (typeof window === 'undefined') return

  try {
    sessionStorage.setItem(SESSION_POLICY_KEY, serializeSessionPolicy(policy))
  } catch (error) {
    console.error('[GatingPolicy] Failed to save session policy:', error)
  }
}

/**
 * Clear session gating policy
 */
export function clearSessionPolicy(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_POLICY_KEY)
}

/**
 * Get or create session policy
 */
export function getOrCreateSessionPolicy(): SessionGatingPolicy {
  const existing = loadSessionPolicy()
  if (existing) return existing

  const newPolicy = createInitialSessionPolicy()
  saveSessionPolicy(newPolicy)
  return newPolicy
}

// ============================================
// Pattern Gate Logic
// ============================================

/**
 * Process pattern gate selection
 */
export function processPatternGateSelection(
  policy: SessionGatingPolicy,
  selectedPatternId: string,
  primaryPatternId: string,
  secondaryPatternIds: string[] | undefined,
  decisionTimeMs: number
): SessionGatingPolicy {
  const isPrimary = selectedPatternId === primaryPatternId
  const isSecondary = secondaryPatternIds?.includes(selectedPatternId) ?? false
  const isCorrect = isPrimary || isSecondary

  const confidence: PatternConfidence = isCorrect ? 'strong' : 'weak'

  const patternGate: PatternGateState = {
    selectedPatternId,
    isCorrect,
    confidence,
    decisionTimeMs,
    timedOut: false,
    timestamp: new Date().toISOString(),
  }

  // Adjust gating config based on confidence
  const decisionGateConfig = isCorrect
    ? { ...DEFAULT_DECISION_GATE_CONFIG }
    : { ...WEAK_CONFIDENCE_DECISION_GATE_CONFIG }

  const updatedPolicy: SessionGatingPolicy = {
    ...policy,
    patternGate,
    intensity: isCorrect ? 'normal' : 'high',
    decisionGateConfig,
  }

  saveSessionPolicy(updatedPolicy)
  return updatedPolicy
}

/**
 * Process pattern gate timeout
 */
export function processPatternGateTimeout(
  policy: SessionGatingPolicy,
  decisionTimeMs: number
): SessionGatingPolicy {
  const patternGate: PatternGateState = {
    selectedPatternId: null,
    isCorrect: false,
    confidence: 'weak',
    decisionTimeMs,
    timedOut: true,
    timestamp: new Date().toISOString(),
  }

  const updatedPolicy: SessionGatingPolicy = {
    ...policy,
    patternGate,
    intensity: 'high',
    decisionGateConfig: { ...WEAK_CONFIDENCE_DECISION_GATE_CONFIG },
  }

  saveSessionPolicy(updatedPolicy)
  return updatedPolicy
}

// ============================================
// Decision Gate Logic
// ============================================

/**
 * Check if a step requires a decision gate
 */
export function requiresDecisionGate(
  policy: SessionGatingPolicy,
  stepId: number,
  stepType: string | undefined,
  hasMicroTasks: boolean
): boolean {
  // No micro-tasks = backward compatible, no gate required
  if (!hasMicroTasks) return false

  // Check if step type requires gating
  const gatedTypes = policy.decisionGateConfig.gatedStepTypes
  if (gatedTypes.length > 0 && !isGatedStepType(stepType)) {
    return false
  }

  return true
}

/**
 * Get or create decision gate state for a step
 */
export function getStepDecisionGateState(
  policy: SessionGatingPolicy,
  stepId: number
): StepDecisionGateState {
  const existing = policy.stepDecisionGates.get(stepId)
  if (existing) return existing

  return {
    stepId,
    microTasksPassedCount: 0,
    currentAttempts: 0,
    gatePassed: false,
    hintAutoUnlocked: false,
  }
}

/**
 * Record a micro-task attempt result
 */
export function recordMicroTaskAttempt(
  policy: SessionGatingPolicy,
  stepId: number,
  isCorrect: boolean
): { updatedPolicy: SessionGatingPolicy; shouldAutoUnlockHint: boolean } {
  const gateState = getStepDecisionGateState(policy, stepId)
  const config = policy.decisionGateConfig

  let shouldAutoUnlockHint = false

  if (isCorrect) {
    gateState.microTasksPassedCount += 1
    gateState.currentAttempts = 0

    // Check if gate is now passed
    if (gateState.microTasksPassedCount >= config.requiredMicroTasks) {
      gateState.gatePassed = true
    }
  } else {
    gateState.currentAttempts += 1

    // Check if max attempts reached
    if (gateState.currentAttempts >= config.maxAttempts) {
      gateState.hintAutoUnlocked = true
      gateState.currentAttempts = 0
      shouldAutoUnlockHint = true
    }
  }

  policy.stepDecisionGates.set(stepId, gateState)
  saveSessionPolicy(policy)

  return { updatedPolicy: policy, shouldAutoUnlockHint }
}

/**
 * Check if step submission is allowed
 */
export function canSubmitStep(
  policy: SessionGatingPolicy,
  stepId: number,
  stepType: string | undefined,
  hasMicroTasks: boolean
): boolean {
  // If no gate required, allow submission
  if (!requiresDecisionGate(policy, stepId, stepType, hasMicroTasks)) {
    return true
  }

  const gateState = policy.stepDecisionGates.get(stepId)
  return gateState?.gatePassed ?? false
}

/**
 * Get required micro-task count for a step
 */
export function getRequiredMicroTaskCount(policy: SessionGatingPolicy): number {
  return policy.decisionGateConfig.requiredMicroTasks
}

// ============================================
// Rebuild Gate Logic
// ============================================

/**
 * Get or create rebuild gate state for a step
 */
export function getStepRebuildGateState(
  policy: SessionGatingPolicy,
  stepId: number
): StepRebuildGateState {
  const existing = policy.stepRebuildGates.get(stepId)
  if (existing) return existing

  return createInitialRebuildGateState(stepId)
}

/**
 * Trigger rebuild gate after hint level 5 is used
 */
export function triggerRebuildGate(
  policy: SessionGatingPolicy,
  stepId: number,
  stepTitle: string,
  patterns: PatternOption[] | undefined,
  primaryPatternId: string | undefined
): SessionGatingPolicy {
  const questions = generateRebuildQuestions(stepTitle, patterns, primaryPatternId)

  const rebuildState: StepRebuildGateState = {
    stepId,
    revealUsed: true,
    isActive: true,
    questions,
    userAnswers: questions.map(() => null),
    correctAnswers: questions.map(() => false),
    gatePassed: false,
    attempts: 0,
  }

  policy.stepRebuildGates.set(stepId, rebuildState)
  saveSessionPolicy(policy)

  return policy
}

/**
 * Generate rebuild gate questions
 */
function generateRebuildQuestions(
  stepTitle: string,
  patterns: PatternOption[] | undefined,
  primaryPatternId: string | undefined
): RebuildQuestion[] {
  const questions: RebuildQuestion[] = []

  // Q1: Pattern identification (if patterns available)
  if (patterns && patterns.length > 0 && primaryPatternId) {
    const patternNames = patterns.map(p => p.label || p.name || p.id)
    const correctIndex = patterns.findIndex(p => p.id === primaryPatternId)
    const correctPattern = patterns.find(p => p.id === primaryPatternId)

    if (correctIndex >= 0) {
      questions.push({
        id: 'pattern',
        type: 'pattern',
        question: 'Which physics pattern was used in this step?',
        options: patternNames,
        correctIndex,
        explanation: `This step uses the "${(correctPattern?.label || correctPattern?.name || correctPattern?.id) ?? 'Unknown'}" pattern. ${correctPattern?.description || ''}`,
      })
    }
  }

  // Q2: First decision question (generic fallback)
  questions.push({
    id: 'decision',
    type: 'decision',
    question: `What is the first key decision in "${stepTitle}"?`,
    options: [
      'Identify the relevant physical quantities',
      'Write down all given information',
      'Draw a diagram or free body diagram',
      'Apply the relevant equation directly',
    ],
    correctIndex: 0, // First option is usually safest
    explanation:
      'The first step is always to identify what physical quantities are involved and how they relate to the problem.',
  })

  return questions
}

/**
 * Record rebuild gate answer
 */
export function recordRebuildAnswer(
  policy: SessionGatingPolicy,
  stepId: number,
  questionIndex: number,
  selectedIndex: number
): { updatedPolicy: SessionGatingPolicy; isCorrect: boolean; allPassed: boolean } {
  const rebuildState = getStepRebuildGateState(policy, stepId)
  const question = rebuildState.questions[questionIndex]

  if (!question) {
    return { updatedPolicy: policy, isCorrect: false, allPassed: false }
  }

  const isCorrect = selectedIndex === question.correctIndex
  rebuildState.userAnswers[questionIndex] = selectedIndex
  rebuildState.correctAnswers[questionIndex] = isCorrect
  rebuildState.attempts += 1

  // Check if all questions passed
  const allPassed = rebuildState.correctAnswers.every(c => c)
  if (allPassed) {
    rebuildState.gatePassed = true
    rebuildState.isActive = false
  }

  policy.stepRebuildGates.set(stepId, rebuildState)
  saveSessionPolicy(policy)

  return { updatedPolicy: policy, isCorrect, allPassed }
}

/**
 * Check if step can proceed (rebuild gate passed or not required)
 */
export function canProceedFromStep(
  policy: SessionGatingPolicy,
  stepId: number
): boolean {
  const rebuildState = policy.stepRebuildGates.get(stepId)

  // If no rebuild gate triggered, can proceed
  if (!rebuildState || !rebuildState.revealUsed) {
    return true
  }

  // If rebuild gate active and not passed, cannot proceed
  if (rebuildState.isActive && !rebuildState.gatePassed) {
    return false
  }

  return rebuildState.gatePassed
}

// ============================================
// Intensity Adjustment
// ============================================

/**
 * Record wrong step submission and potentially increase intensity
 */
export function recordWrongSubmission(
  policy: SessionGatingPolicy
): SessionGatingPolicy {
  policy.consecutiveWrongSubmissions += 1

  // After 2 consecutive wrong submissions, increase intensity
  if (policy.consecutiveWrongSubmissions >= 2 && policy.intensity !== 'high') {
    policy.intensity = 'high'
    policy.decisionGateConfig = { ...WEAK_CONFIDENCE_DECISION_GATE_CONFIG }
  }

  saveSessionPolicy(policy)
  return policy
}

/**
 * Record correct step submission and reset consecutive counter
 */
export function recordCorrectSubmission(
  policy: SessionGatingPolicy
): SessionGatingPolicy {
  policy.consecutiveWrongSubmissions = 0

  // Potentially decrease intensity if was high and now performing well
  if (policy.intensity === 'high' && policy.patternGate?.isCorrect) {
    policy.intensity = 'normal'
    policy.decisionGateConfig = { ...DEFAULT_DECISION_GATE_CONFIG }
  }

  saveSessionPolicy(policy)
  return policy
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get summary of current gating state for telemetry
 */
export function getGatingSummary(policy: SessionGatingPolicy): Record<string, unknown> {
  return {
    patternConfidence: policy.patternGate?.confidence ?? 'unknown',
    patternCorrect: policy.patternGate?.isCorrect ?? null,
    intensity: policy.intensity,
    consecutiveWrong: policy.consecutiveWrongSubmissions,
    requiredMicroTasks: policy.decisionGateConfig.requiredMicroTasks,
    stepsWithDecisionGates: policy.stepDecisionGates.size,
    stepsWithRebuildGates: policy.stepRebuildGates.size,
  }
}

/**
 * Check if any gate is currently blocking progression
 */
export function hasActiveBlockingGate(
  policy: SessionGatingPolicy,
  currentStepId: number
): { blocked: boolean; reason: string | null } {
  // Check rebuild gate
  const rebuildState = policy.stepRebuildGates.get(currentStepId)
  if (rebuildState?.isActive && !rebuildState.gatePassed) {
    return { blocked: true, reason: 'rebuild_gate' }
  }

  return { blocked: false, reason: null }
}

// ============================================
// Cognitive Load Management
// ============================================

/**
 * Update cognitive load level in policy
 */
export function updateCognitiveLoadLevel(
  policy: SessionGatingPolicy,
  level: CognitiveLoadLevel
): SessionGatingPolicy {
  const updatedPolicy = {
    ...policy,
    cognitiveLoadLevel: level,
  }

  saveSessionPolicy(updatedPolicy)
  return updatedPolicy
}

/**
 * Get current cognitive load level
 */
export function getCognitiveLoadLevel(
  policy: SessionGatingPolicy
): CognitiveLoadLevel {
  return policy.cognitiveLoadLevel ?? 'low'
}

/**
 * Check if simplified UI mode should be active based on cognitive load
 */
export function isSimplifiedUIActive(
  policy: SessionGatingPolicy
): boolean {
  return policy.cognitiveLoadLevel === 'high'
}

/**
 * Get cognitive load summary for telemetry
 */
export function getCognitiveLoadSummary(
  policy: SessionGatingPolicy
): { level: CognitiveLoadLevel; simplified: boolean } {
  return {
    level: getCognitiveLoadLevel(policy),
    simplified: isSimplifiedUIActive(policy),
  }
}
