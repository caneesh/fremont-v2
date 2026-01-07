/**
 * System Design Whiteboard Types (PhaseB_03)
 *
 * Structured component builder for system design practice
 * with Socratic questioning and rubric grading.
 */

/**
 * System design scenario
 */
export interface SystemDesignScenario {
  readonly id: string
  readonly title: string
  readonly prompt: string
  readonly requirements: readonly Requirement[]
  readonly constraints: readonly Constraint[]
  readonly componentPalette: readonly DesignComponent[]
  readonly socraticQuestions: readonly SocraticQuestion[]
  readonly rubrics: readonly DesignRubric[]
  readonly difficulty: 'junior' | 'mid' | 'senior' | 'staff'
}

/**
 * System requirement
 */
export interface Requirement {
  readonly id: string
  readonly text: string
  readonly type: 'functional' | 'non-functional'
  readonly priority: 'must' | 'should' | 'nice'
}

/**
 * System constraint
 */
export interface Constraint {
  readonly id: string
  readonly text: string
  readonly type: 'scale' | 'latency' | 'availability' | 'budget' | 'technology'
}

/**
 * Design component from palette
 */
export interface DesignComponent {
  readonly id: string
  readonly name: string
  readonly category: ComponentCategory
  readonly description: string
  readonly icon?: string
  readonly tradeoffs: readonly string[]
  readonly commonUseCases: readonly string[]
}

export type ComponentCategory =
  | 'compute' // Servers, containers, serverless
  | 'storage' // Databases, caches, file storage
  | 'messaging' // Queues, pub/sub, streams
  | 'network' // Load balancers, CDN, API gateway
  | 'security' // Auth, encryption, WAF
  | 'monitoring' // Logging, metrics, tracing

/**
 * Socratic question tied to component/tradeoff
 */
export interface SocraticQuestion {
  readonly id: string
  readonly questionText: string
  readonly triggeredBy: QuestionTrigger
  readonly expectedInsights: readonly string[]
  readonly followUpQuestions?: readonly string[]
}

export type QuestionTrigger =
  | { type: 'component_added'; componentId: string }
  | { type: 'tradeoff_decision'; decision: string }
  | { type: 'requirement_addressed'; requirementId: string }
  | { type: 'constraint_considered'; constraintId: string }

/**
 * Rubric for grading justifications
 */
export interface DesignRubric {
  readonly dimension: string
  readonly maxPoints: number
  readonly criteria: readonly RubricCriterion[]
}

export interface RubricCriterion {
  readonly description: string
  readonly points: number
  readonly keywords?: readonly string[]
}

/**
 * User's design session
 */
export interface DesignSession {
  readonly id: string
  readonly scenarioId: string
  readonly userId: string
  readonly status: DesignSessionStatus
  readonly components: readonly PlacedComponent[]
  readonly connections: readonly ComponentConnection[]
  readonly justifications: readonly Justification[]
  readonly tradeoffAnswers: readonly TradeoffAnswer[]
  readonly createdAt: string
  readonly updatedAt: string
}

export type DesignSessionStatus =
  | 'in_progress'
  | 'reviewing'
  | 'completed'

/**
 * Component placed in design
 */
export interface PlacedComponent {
  readonly componentId: string
  readonly name: string
  readonly position: { x: number; y: number }
  readonly configuration?: Record<string, unknown>
  readonly addedAt: string
}

/**
 * Connection between components
 */
export interface ComponentConnection {
  readonly id: string
  readonly fromComponentId: string
  readonly toComponentId: string
  readonly connectionType: 'sync' | 'async' | 'data-flow'
  readonly label?: string
}

/**
 * Justification for a design decision
 */
export interface Justification {
  readonly questionId: string
  readonly answer: string
  readonly submittedAt: string
  readonly score?: number
  readonly feedback?: string
}

/**
 * Answer to tradeoff question
 */
export interface TradeoffAnswer {
  readonly tradeoff: string
  readonly choice: string
  readonly reasoning: string
}

/**
 * Design review result
 */
export interface DesignReviewResult {
  readonly totalScore: number
  readonly maxScore: number
  readonly dimensionScores: readonly { dimension: string; score: number; max: number }[]
  readonly feedback: string
  readonly strengths: readonly string[]
  readonly improvements: readonly string[]
}

// Policy constants
export const SYSTEM_DESIGN_POLICY = {
  MIN_COMPONENTS: 3,
  MAX_COMPONENTS: 15,
  MIN_JUSTIFICATION_LENGTH: 50,
  COMPONENT_POINTS: 5,
  JUSTIFICATION_POINTS: 10,
  TRADEOFF_POINTS: 15,
} as const

// Event types
export type SystemDesignEventType =
  | 'design_session_started'
  | 'design_component_added'
  | 'design_component_removed'
  | 'design_connection_added'
  | 'design_justification_submitted'
  | 'design_reviewed'
  | 'design_completed'
