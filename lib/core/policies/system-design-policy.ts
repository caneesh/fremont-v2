/**
 * System Design Whiteboard Policy
 *
 * Deterministic scoring and Socratic questioning for system design practice.
 * Supports structured component building with rubric-based grading.
 */

import type {
  SystemDesignScenario,
  DesignComponent,
  SocraticQuestion,
  DesignRubric,
  RubricCriterion,
  DesignSession,
  PlacedComponent,
  ComponentConnection,
  Justification,
  TradeoffAnswer,
  DesignReviewResult,
  Requirement,
  ComponentCategory,
} from '@/types/systemDesignWhiteboard'
import { SYSTEM_DESIGN_POLICY } from '@/types/systemDesignWhiteboard'

// Re-export policy constants
export { SYSTEM_DESIGN_POLICY }

/**
 * Extended policy constants
 */
export const EXTENDED_DESIGN_POLICY = {
  // Scoring weights
  WEIGHTS: {
    componentSelection: 0.25,
    connections: 0.15,
    justifications: 0.35,
    tradeoffs: 0.25,
  },
  // Component scoring
  RELEVANT_COMPONENT_BONUS: 5,
  REDUNDANT_COMPONENT_PENALTY: -3,
  // Justification scoring
  KEYWORD_MATCH_BONUS: 2,
  INSIGHT_MATCH_BONUS: 5,
  // Grading thresholds
  EXCELLENT_THRESHOLD: 85,
  GOOD_THRESHOLD: 70,
  PASSING_THRESHOLD: 50,
  // Connection requirements
  MIN_CONNECTIONS_PER_COMPONENT: 1,
} as const

/**
 * Create new design session - DETERMINISTIC
 */
export function createDesignSession(
  sessionId: string,
  scenarioId: string,
  userId: string
): DesignSession {
  const now = new Date().toISOString()
  return {
    id: sessionId,
    scenarioId,
    userId,
    status: 'in_progress',
    components: [],
    connections: [],
    justifications: [],
    tradeoffAnswers: [],
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Validate component can be added - DETERMINISTIC
 */
export function canAddComponent(
  session: DesignSession,
  componentId: string,
  scenario: SystemDesignScenario
): { canAdd: boolean; reason?: string } {
  // Check max components
  if (session.components.length >= SYSTEM_DESIGN_POLICY.MAX_COMPONENTS) {
    return { canAdd: false, reason: 'Maximum components reached' }
  }

  // Check component exists in palette
  const componentExists = scenario.componentPalette.some(c => c.id === componentId)
  if (!componentExists) {
    return { canAdd: false, reason: 'Component not in palette' }
  }

  // Check for duplicates (same component type)
  const alreadyAdded = session.components.some(c => c.componentId === componentId)
  if (alreadyAdded) {
    return { canAdd: false, reason: 'Component already added' }
  }

  return { canAdd: true }
}

/**
 * Add component to session - DETERMINISTIC
 */
export function addComponent(
  session: DesignSession,
  component: PlacedComponent
): DesignSession {
  return {
    ...session,
    components: [...session.components, component],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Remove component from session - DETERMINISTIC
 */
export function removeComponent(
  session: DesignSession,
  componentId: string
): DesignSession {
  // Also remove connections involving this component
  const filteredConnections = session.connections.filter(
    c => c.fromComponentId !== componentId && c.toComponentId !== componentId
  )

  return {
    ...session,
    components: session.components.filter(c => c.componentId !== componentId),
    connections: filteredConnections,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Validate connection can be added - DETERMINISTIC
 */
export function canAddConnection(
  session: DesignSession,
  fromId: string,
  toId: string
): { canAdd: boolean; reason?: string } {
  // Check both components exist
  const fromExists = session.components.some(c => c.componentId === fromId)
  const toExists = session.components.some(c => c.componentId === toId)

  if (!fromExists || !toExists) {
    return { canAdd: false, reason: 'One or both components not in design' }
  }

  // No self-connections
  if (fromId === toId) {
    return { canAdd: false, reason: 'Cannot connect component to itself' }
  }

  // Check for duplicate connection
  const exists = session.connections.some(
    c => c.fromComponentId === fromId && c.toComponentId === toId
  )
  if (exists) {
    return { canAdd: false, reason: 'Connection already exists' }
  }

  return { canAdd: true }
}

/**
 * Add connection to session - DETERMINISTIC
 */
export function addConnection(
  session: DesignSession,
  connection: ComponentConnection
): DesignSession {
  return {
    ...session,
    connections: [...session.connections, connection],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Get triggered Socratic questions - DETERMINISTIC
 */
export function getTriggeredQuestions(
  session: DesignSession,
  scenario: SystemDesignScenario
): SocraticQuestion[] {
  const triggeredQuestions: SocraticQuestion[] = []
  const answeredQuestionIds = new Set(session.justifications.map(j => j.questionId))

  for (const question of scenario.socraticQuestions) {
    // Skip already answered
    if (answeredQuestionIds.has(question.id)) {
      continue
    }

    const trigger = question.triggeredBy

    switch (trigger.type) {
      case 'component_added': {
        const componentAdded = session.components.some(
          c => c.componentId === trigger.componentId
        )
        if (componentAdded) {
          triggeredQuestions.push(question)
        }
        break
      }
      case 'requirement_addressed': {
        // Check if components address the requirement (simplified check)
        if (session.components.length > 0) {
          triggeredQuestions.push(question)
        }
        break
      }
      case 'constraint_considered': {
        // Trigger after certain number of components
        if (session.components.length >= 2) {
          triggeredQuestions.push(question)
        }
        break
      }
      case 'tradeoff_decision': {
        // Trigger after connections are made
        if (session.connections.length >= 1) {
          triggeredQuestions.push(question)
        }
        break
      }
    }
  }

  return triggeredQuestions
}

/**
 * Score justification against rubric - DETERMINISTIC
 */
export function scoreJustification(
  answer: string,
  question: SocraticQuestion,
  rubrics: readonly DesignRubric[]
): {
  score: number
  maxScore: number
  feedback: string
  insightsMatched: string[]
} {
  const lowerAnswer = answer.toLowerCase()
  const insightsMatched: string[] = []

  // Find applicable rubric
  const rubric = rubrics.find(r =>
    question.expectedInsights.some(insight =>
      r.dimension.toLowerCase().includes(insight.toLowerCase().split(' ')[0])
    )
  ) || rubrics[0]

  if (!rubric) {
    return {
      score: 0,
      maxScore: SYSTEM_DESIGN_POLICY.JUSTIFICATION_POINTS,
      feedback: 'No applicable rubric found',
      insightsMatched: [],
    }
  }

  let score = 0
  const maxScore = rubric.maxPoints

  // Check for expected insights
  for (const insight of question.expectedInsights) {
    const insightWords = insight.toLowerCase().split(' ')
    const matchCount = insightWords.filter(word =>
      word.length > 3 && lowerAnswer.includes(word)
    ).length

    if (matchCount >= Math.ceil(insightWords.length * 0.5)) {
      insightsMatched.push(insight)
      score += EXTENDED_DESIGN_POLICY.INSIGHT_MATCH_BONUS
    }
  }

  // Check rubric criteria
  for (const criterion of rubric.criteria) {
    if (criterion.keywords) {
      const keywordMatches = criterion.keywords.filter(kw =>
        lowerAnswer.includes(kw.toLowerCase())
      ).length

      if (keywordMatches >= Math.ceil(criterion.keywords.length * 0.5)) {
        score += criterion.points
      }
    }
  }

  // Length bonus
  if (answer.length >= SYSTEM_DESIGN_POLICY.MIN_JUSTIFICATION_LENGTH * 2) {
    score += 2
  }

  // Cap at max
  score = Math.min(score, maxScore)

  // Generate feedback
  let feedback: string
  const ratio = score / maxScore
  if (ratio >= 0.8) {
    feedback = 'Excellent justification with clear reasoning and relevant insights.'
  } else if (ratio >= 0.6) {
    feedback = 'Good justification. Consider addressing more aspects of the design decision.'
  } else if (ratio >= 0.4) {
    feedback = 'Basic justification. Try to explain the trade-offs more deeply.'
  } else {
    feedback = 'Needs improvement. Focus on why this decision addresses the requirements.'
  }

  return { score, maxScore, feedback, insightsMatched }
}

/**
 * Submit justification - DETERMINISTIC
 */
export function submitJustification(
  session: DesignSession,
  questionId: string,
  answer: string,
  question: SocraticQuestion,
  rubrics: readonly DesignRubric[]
): DesignSession {
  const { score, feedback } = scoreJustification(answer, question, rubrics)

  const justification: Justification = {
    questionId,
    answer,
    submittedAt: new Date().toISOString(),
    score,
    feedback,
  }

  return {
    ...session,
    justifications: [...session.justifications, justification],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Score tradeoff answer - DETERMINISTIC
 */
export function scoreTradeoffAnswer(
  answer: TradeoffAnswer,
  scenario: SystemDesignScenario
): {
  score: number
  maxScore: number
  feedback: string
} {
  const maxScore = SYSTEM_DESIGN_POLICY.TRADEOFF_POINTS
  let score = 0

  // Base score for having a choice and reasoning
  if (answer.choice && answer.choice.length > 0) {
    score += 3
  }

  if (answer.reasoning && answer.reasoning.length >= 30) {
    score += 5
  }

  // Check if reasoning mentions constraints
  const lowerReasoning = answer.reasoning.toLowerCase()
  for (const constraint of scenario.constraints) {
    const constraintWords = constraint.text.toLowerCase().split(' ')
    const relevantWords = constraintWords.filter(w => w.length > 4)
    const matches = relevantWords.filter(w => lowerReasoning.includes(w)).length

    if (matches >= Math.ceil(relevantWords.length * 0.3)) {
      score += 2
    }
  }

  // Check if reasoning mentions requirements
  for (const req of scenario.requirements) {
    if (req.priority === 'must') {
      const reqWords = req.text.toLowerCase().split(' ')
      const relevantWords = reqWords.filter(w => w.length > 4)
      const matches = relevantWords.filter(w => lowerReasoning.includes(w)).length

      if (matches >= 1) {
        score += 2
      }
    }
  }

  score = Math.min(score, maxScore)

  let feedback: string
  const ratio = score / maxScore
  if (ratio >= 0.8) {
    feedback = 'Well-reasoned trade-off decision that considers constraints.'
  } else if (ratio >= 0.5) {
    feedback = 'Good reasoning. Consider how this affects other parts of the system.'
  } else {
    feedback = 'Explain your reasoning in terms of system requirements and constraints.'
  }

  return { score, maxScore, feedback }
}

/**
 * Submit tradeoff answer - DETERMINISTIC
 */
export function submitTradeoffAnswer(
  session: DesignSession,
  answer: TradeoffAnswer
): DesignSession {
  return {
    ...session,
    tradeoffAnswers: [...session.tradeoffAnswers, answer],
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Evaluate component selection - DETERMINISTIC
 */
export function evaluateComponentSelection(
  session: DesignSession,
  scenario: SystemDesignScenario
): {
  score: number
  maxScore: number
  feedback: string
  missingCategories: ComponentCategory[]
  redundantComponents: string[]
} {
  const maxScore = SYSTEM_DESIGN_POLICY.COMPONENT_POINTS * SYSTEM_DESIGN_POLICY.MIN_COMPONENTS

  // Check minimum components
  if (session.components.length < SYSTEM_DESIGN_POLICY.MIN_COMPONENTS) {
    return {
      score: 0,
      maxScore,
      feedback: `Need at least ${SYSTEM_DESIGN_POLICY.MIN_COMPONENTS} components`,
      missingCategories: [],
      redundantComponents: [],
    }
  }

  // Get component categories used
  const usedCategories = new Set<ComponentCategory>()
  for (const placed of session.components) {
    const component = scenario.componentPalette.find(c => c.id === placed.componentId)
    if (component) {
      usedCategories.add(component.category)
    }
  }

  // Essential categories for most designs
  const essentialCategories: ComponentCategory[] = ['compute', 'storage', 'network']
  const missingCategories = essentialCategories.filter(c => !usedCategories.has(c))

  // Check for redundant components (multiple of same category without justification)
  const categoryCount: Record<string, number> = {}
  for (const placed of session.components) {
    const component = scenario.componentPalette.find(c => c.id === placed.componentId)
    if (component) {
      categoryCount[component.category] = (categoryCount[component.category] || 0) + 1
    }
  }

  const redundantComponents: string[] = []
  for (const [category, count] of Object.entries(categoryCount)) {
    if (count > 2) {
      redundantComponents.push(category)
    }
  }

  // Calculate score
  let score = session.components.length * SYSTEM_DESIGN_POLICY.COMPONENT_POINTS

  // Bonus for covering essential categories
  score += (essentialCategories.length - missingCategories.length) * EXTENDED_DESIGN_POLICY.RELEVANT_COMPONENT_BONUS

  // Penalty for redundancy
  score += redundantComponents.length * EXTENDED_DESIGN_POLICY.REDUNDANT_COMPONENT_PENALTY

  score = Math.max(0, Math.min(score, maxScore))

  let feedback: string
  if (missingCategories.length === 0 && redundantComponents.length === 0) {
    feedback = 'Good component coverage across essential categories.'
  } else if (missingCategories.length > 0) {
    feedback = `Consider adding components for: ${missingCategories.join(', ')}`
  } else {
    feedback = 'Watch for redundant components - justify multiple instances.'
  }

  return { score, maxScore, feedback, missingCategories, redundantComponents }
}

/**
 * Evaluate connections - DETERMINISTIC
 */
export function evaluateConnections(
  session: DesignSession
): {
  score: number
  maxScore: number
  feedback: string
  isolatedComponents: string[]
} {
  const componentCount = session.components.length
  const maxScore = componentCount * EXTENDED_DESIGN_POLICY.MIN_CONNECTIONS_PER_COMPONENT * 3

  if (componentCount === 0) {
    return {
      score: 0,
      maxScore: 0,
      feedback: 'Add components first',
      isolatedComponents: [],
    }
  }

  // Find isolated components (no connections)
  const connectedComponents = new Set<string>()
  for (const conn of session.connections) {
    connectedComponents.add(conn.fromComponentId)
    connectedComponents.add(conn.toComponentId)
  }

  const isolatedComponents = session.components
    .filter(c => !connectedComponents.has(c.componentId))
    .map(c => c.name)

  // Score based on connectivity
  const connectivityRatio = connectedComponents.size / componentCount
  let score = Math.round(connectivityRatio * maxScore)

  // Bonus for having diverse connection types
  const connectionTypes = new Set(session.connections.map(c => c.connectionType))
  if (connectionTypes.size >= 2) {
    score += 3
  }

  score = Math.min(score, maxScore)

  let feedback: string
  if (isolatedComponents.length === 0) {
    feedback = 'All components are connected. Good system integration.'
  } else if (isolatedComponents.length <= 2) {
    feedback = `Connect isolated components: ${isolatedComponents.join(', ')}`
  } else {
    feedback = 'Many isolated components. Show how data flows through the system.'
  }

  return { score, maxScore, feedback, isolatedComponents }
}

/**
 * Calculate total justification score - DETERMINISTIC
 */
export function calculateJustificationScore(
  session: DesignSession
): { score: number; maxScore: number } {
  const score = session.justifications.reduce((sum, j) => sum + (j.score || 0), 0)
  const maxScore = session.justifications.length * SYSTEM_DESIGN_POLICY.JUSTIFICATION_POINTS

  return { score, maxScore: maxScore || SYSTEM_DESIGN_POLICY.JUSTIFICATION_POINTS }
}

/**
 * Calculate total tradeoff score - DETERMINISTIC
 */
export function calculateTradeoffScore(
  session: DesignSession,
  scenario: SystemDesignScenario
): { score: number; maxScore: number } {
  let score = 0
  for (const answer of session.tradeoffAnswers) {
    const result = scoreTradeoffAnswer(answer, scenario)
    score += result.score
  }

  const maxScore = session.tradeoffAnswers.length * SYSTEM_DESIGN_POLICY.TRADEOFF_POINTS

  return { score, maxScore: maxScore || SYSTEM_DESIGN_POLICY.TRADEOFF_POINTS }
}

/**
 * Review complete design - DETERMINISTIC
 */
export function reviewDesign(
  session: DesignSession,
  scenario: SystemDesignScenario
): DesignReviewResult {
  const componentEval = evaluateComponentSelection(session, scenario)
  const connectionEval = evaluateConnections(session)
  const justificationScore = calculateJustificationScore(session)
  const tradeoffScore = calculateTradeoffScore(session, scenario)

  const weights = EXTENDED_DESIGN_POLICY.WEIGHTS

  // Normalize scores to 100
  const normalizedComponent = componentEval.maxScore > 0
    ? (componentEval.score / componentEval.maxScore) * 100
    : 0
  const normalizedConnection = connectionEval.maxScore > 0
    ? (connectionEval.score / connectionEval.maxScore) * 100
    : 0
  const normalizedJustification = justificationScore.maxScore > 0
    ? (justificationScore.score / justificationScore.maxScore) * 100
    : 0
  const normalizedTradeoff = tradeoffScore.maxScore > 0
    ? (tradeoffScore.score / tradeoffScore.maxScore) * 100
    : 0

  // Weighted total
  const totalScore = Math.round(
    normalizedComponent * weights.componentSelection +
    normalizedConnection * weights.connections +
    normalizedJustification * weights.justifications +
    normalizedTradeoff * weights.tradeoffs
  )

  const maxScore = 100

  // Dimension scores
  const dimensionScores = [
    { dimension: 'Component Selection', score: componentEval.score, max: componentEval.maxScore },
    { dimension: 'Connections', score: connectionEval.score, max: connectionEval.maxScore },
    { dimension: 'Justifications', score: justificationScore.score, max: justificationScore.maxScore },
    { dimension: 'Trade-offs', score: tradeoffScore.score, max: tradeoffScore.maxScore },
  ]

  // Identify strengths and improvements
  const strengths: string[] = []
  const improvements: string[] = []

  if (normalizedComponent >= 80) {
    strengths.push('Strong component selection')
  } else if (normalizedComponent < 50) {
    improvements.push('Review component coverage')
  }

  if (normalizedConnection >= 80) {
    strengths.push('Well-connected architecture')
  } else if (connectionEval.isolatedComponents.length > 0) {
    improvements.push('Connect isolated components')
  }

  if (normalizedJustification >= 80) {
    strengths.push('Clear design justifications')
  } else if (normalizedJustification < 50) {
    improvements.push('Explain design decisions more thoroughly')
  }

  if (normalizedTradeoff >= 80) {
    strengths.push('Thoughtful trade-off analysis')
  } else if (normalizedTradeoff < 50) {
    improvements.push('Consider trade-offs in more depth')
  }

  // Overall feedback
  let feedback: string
  if (totalScore >= EXTENDED_DESIGN_POLICY.EXCELLENT_THRESHOLD) {
    feedback = 'Excellent system design! You demonstrated strong architectural thinking and clear justifications.'
  } else if (totalScore >= EXTENDED_DESIGN_POLICY.GOOD_THRESHOLD) {
    feedback = 'Good design overall. Focus on the areas for improvement to strengthen your architecture.'
  } else if (totalScore >= EXTENDED_DESIGN_POLICY.PASSING_THRESHOLD) {
    feedback = 'Basic design completed. Practice explaining your design decisions and considering trade-offs.'
  } else {
    feedback = 'Keep practicing. Focus on understanding why components are chosen and how they connect.'
  }

  return {
    totalScore,
    maxScore,
    dimensionScores,
    feedback,
    strengths,
    improvements,
  }
}

/**
 * Complete design session - DETERMINISTIC
 */
export function completeSession(session: DesignSession): DesignSession {
  return {
    ...session,
    status: 'completed',
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Check if session is ready for review - DETERMINISTIC
 */
export function isReadyForReview(session: DesignSession): {
  ready: boolean
  blockers: string[]
} {
  const blockers: string[] = []

  if (session.components.length < SYSTEM_DESIGN_POLICY.MIN_COMPONENTS) {
    blockers.push(`Add at least ${SYSTEM_DESIGN_POLICY.MIN_COMPONENTS} components`)
  }

  if (session.connections.length === 0) {
    blockers.push('Add at least one connection between components')
  }

  if (session.justifications.length === 0) {
    blockers.push('Answer at least one design question')
  }

  return {
    ready: blockers.length === 0,
    blockers,
  }
}

/**
 * Get session progress - DETERMINISTIC
 */
export function getSessionProgress(
  session: DesignSession,
  scenario: SystemDesignScenario
): {
  componentsProgress: number
  connectionsProgress: number
  questionsProgress: number
  overallProgress: number
} {
  const minComponents = SYSTEM_DESIGN_POLICY.MIN_COMPONENTS
  const totalQuestions = scenario.socraticQuestions.length

  const componentsProgress = Math.min(100, Math.round((session.components.length / minComponents) * 100))
  const connectionsProgress = session.components.length > 1
    ? Math.min(100, Math.round((session.connections.length / (session.components.length - 1)) * 100))
    : 0
  const questionsProgress = totalQuestions > 0
    ? Math.round((session.justifications.length / totalQuestions) * 100)
    : 100

  const overallProgress = Math.round(
    (componentsProgress + connectionsProgress + questionsProgress) / 3
  )

  return {
    componentsProgress,
    connectionsProgress,
    questionsProgress,
    overallProgress,
  }
}

/**
 * Get grade from score - DETERMINISTIC
 */
export function getDesignGrade(score: number): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  label: string
} {
  if (score >= 90) return { grade: 'A', label: 'Excellent' }
  if (score >= 80) return { grade: 'B', label: 'Good' }
  if (score >= 70) return { grade: 'C', label: 'Satisfactory' }
  if (score >= 60) return { grade: 'D', label: 'Needs Improvement' }
  return { grade: 'F', label: 'Insufficient' }
}

/**
 * Get component recommendations - DETERMINISTIC
 */
export function getComponentRecommendations(
  session: DesignSession,
  scenario: SystemDesignScenario
): DesignComponent[] {
  const usedIds = new Set(session.components.map(c => c.componentId))
  const usedCategories = new Set<ComponentCategory>()

  for (const placed of session.components) {
    const component = scenario.componentPalette.find(c => c.id === placed.componentId)
    if (component) {
      usedCategories.add(component.category)
    }
  }

  // Recommend from unused categories first
  const recommendations: DesignComponent[] = []

  for (const component of scenario.componentPalette) {
    if (usedIds.has(component.id)) continue

    if (!usedCategories.has(component.category)) {
      recommendations.push(component)
    }
  }

  // If all categories covered, recommend based on common use cases
  if (recommendations.length === 0) {
    for (const component of scenario.componentPalette) {
      if (!usedIds.has(component.id)) {
        recommendations.push(component)
      }
    }
  }

  return recommendations.slice(0, 3)
}

/**
 * Validate design meets requirements - DETERMINISTIC
 */
export function validateRequirementsCoverage(
  session: DesignSession,
  scenario: SystemDesignScenario
): {
  covered: string[]
  uncovered: string[]
  coverageRatio: number
} {
  const mustRequirements = scenario.requirements.filter(r => r.priority === 'must')
  const covered: string[] = []
  const uncovered: string[] = []

  // Simple heuristic: check if justifications mention requirement keywords
  const allJustificationText = session.justifications
    .map(j => j.answer.toLowerCase())
    .join(' ')

  for (const req of mustRequirements) {
    const reqWords = req.text.toLowerCase().split(' ').filter(w => w.length > 4)
    const matches = reqWords.filter(w => allJustificationText.includes(w)).length

    if (matches >= Math.ceil(reqWords.length * 0.3)) {
      covered.push(req.id)
    } else {
      uncovered.push(req.id)
    }
  }

  const coverageRatio = mustRequirements.length > 0
    ? covered.length / mustRequirements.length
    : 1

  return { covered, uncovered, coverageRatio }
}
