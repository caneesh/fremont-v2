/**
 * Scaffold Density Level
 * Level 1 = micro-steps (most detailed, for beginners)
 * Level 5 = macro-milestones (high-level, for advanced students)
 */
export type ScaffoldDensity = 1 | 2 | 3 | 4 | 5

/**
 * Step Type Classification
 * Used for routing hints and validation feedback
 */
export type StepType = 'diagram' | 'physics_concept' | 'math_manipulation' | 'sanity_check'

export interface Concept {
  id: string
  name: string
  definition: string
  formula?: string
}

export interface HintLevel {
  level: 1 | 2 | 3 | 4 | 5
  title: 'Concept Identification' | 'Visualization' | 'Strategy Selection' | 'Structural Equation' | 'Full Solution'
  content: string
}

export interface Step {
  id: number
  title: string
  stepType?: StepType // Type of step for hint routing (optional for backwards compat)
  prerequisites?: string[] // Concept tags that must be understood before this step
  hints: HintLevel[] // Progressive 5-level hint ladder
  requiredConcepts: string[] // IDs of concepts needed for this step
  question?: string // Optional Socratic question
  validationPrompt?: string // How to validate user's answer
}

export interface SanityCheck {
  question: string
  expectedBehavior: string
  type: 'limit' | 'dimension' | 'symmetry'
}

/**
 * Conceptual trap identified by the Error Anticipator (Pass 1.5)
 * Represents a common mistake students make on this type of problem
 */
export interface ConceptualTrap {
  title: string           // Short name for the trap (e.g., "Sign Convention Error")
  description: string     // Detailed explanation of the misconception
  tags: string[]          // Category tags (e.g., ["sign", "vector", "direction"])
}

/**
 * Warning beacon attached to a specific step
 * Provides a non-spoilery hint about common pitfalls
 */
export interface WarningBeacon {
  stepId: number          // Which step this beacon applies to
  message: string         // Brief warning (e.g., "Watch your signs here")
  tag: string             // Links to a ConceptualTrap tag
}

export interface ScaffoldData {
  problem: string
  domain: string
  subdomain: string
  concepts: Concept[]
  steps: Step[]
  sanityCheck: SanityCheck
  // Scaffold density (optional for backwards compat)
  density?: ScaffoldDensity          // 1=micro-steps, 5=macro-milestones
  // Optional Error Anticipator fields (Pass 1.5)
  commonTraps?: ConceptualTrap[]     // Top 3 conceptual traps for this problem
  warningBeacons?: WarningBeacon[]   // Step-specific warning beacons
}

/**
 * Error type classification for validation feedback
 */
export type ValidationErrorType = 'physics' | 'math' | 'conceptual' | 'procedural'

export interface StepValidation {
  isCorrect: boolean
  feedback: string
  nextHint?: string
  errorType?: ValidationErrorType   // Whether the error was physics-related or math-related
  stepType?: StepType               // Type of step where error occurred
}

/**
 * Type guard to check if scaffold uses traditional hints (vs micro-tasks)
 */
export function isHintScaffold(data: unknown): data is ScaffoldData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'steps' in data &&
    Array.isArray((data as ScaffoldData).steps) &&
    (data as ScaffoldData).steps.length > 0 &&
    'hints' in (data as ScaffoldData).steps[0]
  )
}
