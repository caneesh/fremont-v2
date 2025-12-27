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

export interface ScaffoldData {
  problem: string
  domain: string
  subdomain: string
  concepts: Concept[]
  steps: Step[]
  sanityCheck: SanityCheck
}

export interface StepValidation {
  isCorrect: boolean
  feedback: string
  nextHint?: string
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
