/**
 * Adaptive Preflight Gating Service
 *
 * Combines data from multiple mistake tracking systems to determine
 * which steps should have auto-inserted preflight checks based on
 * historical mistake probability.
 *
 * Data sources:
 * - mistakeNotebook.ts: Mistake cards with SRS scheduling
 * - mistakeTracking.ts: Mistake patterns and struggle rates
 * - conceptMasteryService.ts: Concept mastery scores
 */

import { getAllCards, getFilteredCards } from './mistakeNotebook'
import { mistakeTrackingService } from './mistakeTracking'
import { conceptMasteryService } from './conceptMasteryService'
import type { MistakeCard } from '@/types/mistakeNotebook'
import type { ConceptMasteryData } from '@/types/conceptMastery'

// ============================================
// Types
// ============================================

export interface StepRiskAssessment {
  stepIndex: number
  stepId: number
  riskScore: number // 0-1, higher = more likely to make mistakes
  riskLevel: 'low' | 'medium' | 'high'
  shouldTriggerPreflight: boolean
  riskFactors: RiskFactor[]
}

export interface RiskFactor {
  source: 'mistake_notebook' | 'mistake_tracking' | 'concept_mastery'
  description: string
  weight: number // Contribution to risk score (0-1)
}

export interface AdaptivePreflightConfig {
  // Thresholds for triggering preflight
  riskThreshold: number // Risk score above this triggers preflight (default: 0.6)

  // Weights for different risk sources
  mistakeNotebookWeight: number // Default: 0.35
  mistakeTrackingWeight: number // Default: 0.35
  conceptMasteryWeight: number  // Default: 0.30

  // Minimum data requirements
  minMistakeCards: number // Min related cards to consider notebook data (default: 1)
  minMasteryAttempts: number // Min attempts to consider mastery data (default: 2)
}

const DEFAULT_CONFIG: AdaptivePreflightConfig = {
  riskThreshold: 0.55,
  mistakeNotebookWeight: 0.35,
  mistakeTrackingWeight: 0.35,
  conceptMasteryWeight: 0.30,
  minMistakeCards: 1,
  minMasteryAttempts: 2,
}

// ============================================
// Risk Calculation
// ============================================

/**
 * Calculate risk score from mistake notebook cards
 * Looks for cards with matching concepts that are due or have low mastery
 */
function calculateNotebookRisk(
  conceptIds: string[],
  config: AdaptivePreflightConfig
): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = []
  let score = 0

  if (typeof window === 'undefined') {
    return { score: 0, factors: [] }
  }

  // Get all cards
  const allCards = getAllCards()

  // Find cards related to these concepts
  const relatedCards = allCards.filter(card =>
    card.conceptTags.some(tag =>
      conceptIds.some(id =>
        id.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(id.toLowerCase())
      )
    )
  )

  if (relatedCards.length < config.minMistakeCards) {
    return { score: 0, factors: [] }
  }

  // Calculate based on card severity and recency
  const now = new Date()
  let weightedScore = 0
  let totalWeight = 0

  relatedCards.forEach(card => {
    const daysSinceCreated = (now.getTime() - new Date(card.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    const recencyWeight = Math.max(0, 1 - daysSinceCreated / 30) // Decay over 30 days

    // Severity multiplier
    const severityMultiplier =
      card.severity === 'major' ? 1.0 :
      card.severity === 'moderate' ? 0.7 : 0.4

    // Due status boost
    const dueBoost = card.srs.dueDate <= now.toISOString().split('T')[0] ? 0.3 : 0

    const cardRisk = (severityMultiplier + dueBoost) * recencyWeight
    weightedScore += cardRisk
    totalWeight += 1
  })

  if (totalWeight > 0) {
    score = Math.min(1, weightedScore / totalWeight)

    if (score > 0.3) {
      factors.push({
        source: 'mistake_notebook',
        description: `${relatedCards.length} related mistake card${relatedCards.length > 1 ? 's' : ''} found`,
        weight: score * config.mistakeNotebookWeight,
      })
    }
  }

  return { score, factors }
}

/**
 * Calculate risk score from mistake tracking patterns
 * Uses struggle rates and common patterns
 */
function calculateTrackingRisk(
  conceptIds: string[],
  conceptNames: string[]
): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = []
  let maxStruggleRate = 0
  let hasWarnings = false

  // Generate warnings for concepts to assess risk
  const warnings = mistakeTrackingService.generateWarnings(
    conceptIds.map((id, i) => ({ id, name: conceptNames[i] || id })),
    'adaptive_preflight'
  )

  if (warnings.length > 0) {
    hasWarnings = true

    // Extract struggle information from warnings
    warnings.forEach(warning => {
      // Parse struggle rate from warning message if possible
      const match = warning.message.match(/(\d+)\/(\d+)\s+times/)
      if (match) {
        const rate = parseInt(match[1]) / parseInt(match[2])
        maxStruggleRate = Math.max(maxStruggleRate, rate)
      }

      // Use severity as proxy for struggle level
      const severityScore =
        warning.severity === 'high' ? 0.9 :
        warning.severity === 'medium' ? 0.7 : 0.5

      maxStruggleRate = Math.max(maxStruggleRate, severityScore)
    })

    factors.push({
      source: 'mistake_tracking',
      description: `${warnings.length} historical struggle pattern${warnings.length > 1 ? 's' : ''} detected`,
      weight: maxStruggleRate * 0.35,
    })
  }

  // Also check concept stats directly
  conceptIds.forEach((conceptId, i) => {
    const stats = mistakeTrackingService.getConceptStats(conceptId, conceptNames[i] || conceptId)
    if (stats && stats.totalAttempts >= 2) {
      const struggleRate = stats.struggledAttempts / stats.totalAttempts
      if (struggleRate > maxStruggleRate) {
        maxStruggleRate = struggleRate
        if (!hasWarnings) {
          factors.push({
            source: 'mistake_tracking',
            description: `${Math.round(struggleRate * 100)}% struggle rate on ${conceptNames[i] || conceptId}`,
            weight: struggleRate * 0.35,
          })
        }
      }
    }
  })

  return { score: maxStruggleRate, factors }
}

/**
 * Calculate risk score from concept mastery levels
 * Lower mastery = higher risk
 */
function calculateMasteryRisk(
  conceptIds: string[],
  studentId: string,
  config: AdaptivePreflightConfig
): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = []
  let lowestMastery = 1
  let hasData = false

  conceptIds.forEach(conceptId => {
    const masteryData = conceptMasteryService.getConceptMastery(studentId, conceptId)

    if (masteryData && masteryData.attempts.length >= config.minMasteryAttempts) {
      hasData = true
      if (masteryData.masteryScore < lowestMastery) {
        lowestMastery = masteryData.masteryScore
      }
    }
  })

  if (!hasData) {
    // No mastery data - assume medium risk for new concepts
    return {
      score: 0.5,
      factors: [{
        source: 'concept_mastery',
        description: 'No prior mastery data - treating as new concept',
        weight: 0.5 * config.conceptMasteryWeight,
      }]
    }
  }

  // Convert mastery to risk (inverse relationship)
  const masteryRisk = 1 - lowestMastery

  if (masteryRisk > 0.4) {
    const level = conceptMasteryService.getMasteryLevel(lowestMastery)
    factors.push({
      source: 'concept_mastery',
      description: `Concept mastery is ${level} (${Math.round(lowestMastery * 100)}%)`,
      weight: masteryRisk * config.conceptMasteryWeight,
    })
  }

  return { score: masteryRisk, factors }
}

// ============================================
// Main Assessment Functions
// ============================================

/**
 * Assess risk for a single step
 */
export function assessStepRisk(
  stepIndex: number,
  stepId: number,
  requiredConceptIds: string[],
  requiredConceptNames: string[],
  studentId: string,
  config: Partial<AdaptivePreflightConfig> = {}
): StepRiskAssessment {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }

  // Calculate risk from each source
  const notebookRisk = calculateNotebookRisk(requiredConceptIds, fullConfig)
  const trackingRisk = calculateTrackingRisk(requiredConceptIds, requiredConceptNames)
  const masteryRisk = calculateMasteryRisk(requiredConceptIds, studentId, fullConfig)

  // Combine factors
  const allFactors = [
    ...notebookRisk.factors,
    ...trackingRisk.factors,
    ...masteryRisk.factors,
  ]

  // Calculate weighted risk score
  const riskScore = Math.min(1,
    notebookRisk.score * fullConfig.mistakeNotebookWeight +
    trackingRisk.score * fullConfig.mistakeTrackingWeight +
    masteryRisk.score * fullConfig.conceptMasteryWeight
  )

  // Determine risk level
  const riskLevel: 'low' | 'medium' | 'high' =
    riskScore >= 0.7 ? 'high' :
    riskScore >= 0.4 ? 'medium' : 'low'

  // Determine if preflight should trigger
  const shouldTriggerPreflight = riskScore >= fullConfig.riskThreshold

  return {
    stepIndex,
    stepId,
    riskScore,
    riskLevel,
    shouldTriggerPreflight,
    riskFactors: allFactors,
  }
}

/**
 * Assess risk for all steps in a scaffold
 */
export function assessAllStepsRisk(
  steps: Array<{
    id: number
    requiredConcepts?: string[]
    requiredConceptNames?: string[]
  }>,
  concepts: Array<{ id: string; name: string }>,
  studentId: string,
  config: Partial<AdaptivePreflightConfig> = {}
): StepRiskAssessment[] {
  return steps.map((step, index) => {
    const requiredConceptIds = step.requiredConcepts || []
    const requiredConceptNames = requiredConceptIds.map(id => {
      const concept = concepts.find(c => c.id === id)
      return concept?.name || id
    })

    return assessStepRisk(
      index,
      step.id,
      requiredConceptIds,
      requiredConceptNames,
      studentId,
      config
    )
  })
}

/**
 * Get high-risk steps that should have preflight checks
 */
export function getHighRiskSteps(
  steps: Array<{
    id: number
    requiredConcepts?: string[]
  }>,
  concepts: Array<{ id: string; name: string }>,
  studentId: string,
  config: Partial<AdaptivePreflightConfig> = {}
): StepRiskAssessment[] {
  const assessments = assessAllStepsRisk(steps, concepts, studentId, config)
  return assessments.filter(a => a.shouldTriggerPreflight)
}

/**
 * Check if a specific step should have adaptive preflight
 * This is the main function called from SolutionScaffold
 */
export function shouldShowAdaptivePreflight(
  stepIndex: number,
  stepId: number,
  requiredConceptIds: string[],
  concepts: Array<{ id: string; name: string }>,
  studentId: string,
  passedPreflightSteps: Set<number>,
  config: Partial<AdaptivePreflightConfig> = {}
): { shouldShow: boolean; assessment: StepRiskAssessment | null } {
  // Don't show if already passed for this step
  if (passedPreflightSteps.has(stepIndex)) {
    return { shouldShow: false, assessment: null }
  }

  // Don't show if no concepts to assess
  if (!requiredConceptIds.length) {
    return { shouldShow: false, assessment: null }
  }

  const requiredConceptNames = requiredConceptIds.map(id => {
    const concept = concepts.find(c => c.id === id)
    return concept?.name || id
  })

  const assessment = assessStepRisk(
    stepIndex,
    stepId,
    requiredConceptIds,
    requiredConceptNames,
    studentId,
    config
  )

  return {
    shouldShow: assessment.shouldTriggerPreflight,
    assessment,
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get a human-readable summary of why preflight is triggered
 */
export function getRiskSummary(assessment: StepRiskAssessment): string {
  if (assessment.riskFactors.length === 0) {
    return 'No specific risk factors identified.'
  }

  const mainFactors = assessment.riskFactors
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)
    .map(f => f.description)
    .join('; ')

  return `${assessment.riskLevel.charAt(0).toUpperCase() + assessment.riskLevel.slice(1)} risk: ${mainFactors}`
}

/**
 * Generate a preflight message based on risk assessment
 */
export function generatePreflightMessage(assessment: StepRiskAssessment): string {
  const messages: Record<string, string[]> = {
    mistake_notebook: [
      "You've had trouble with similar concepts before.",
      "This topic appeared in your mistake notebook.",
      "Previous errors suggest reviewing this concept first.",
    ],
    mistake_tracking: [
      "Historical patterns suggest this step may be challenging.",
      "You've struggled with this concept type before.",
      "Past performance indicates extra attention needed here.",
    ],
    concept_mastery: [
      "Your mastery of these concepts is still developing.",
      "This concept area needs strengthening.",
      "Building solid foundations here will help.",
    ],
  }

  const sources = assessment.riskFactors.map(f => f.source)
  const uniqueSources = [...new Set(sources)]

  const selectedMessages = uniqueSources.map(source => {
    const sourceMessages = messages[source]
    return sourceMessages[Math.floor(Math.random() * sourceMessages.length)]
  })

  return selectedMessages.join(' ')
}
