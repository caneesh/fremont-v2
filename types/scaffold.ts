export interface Concept {
  id: string
  name: string
  definition: string
  formula?: string
}

export interface Step {
  id: number
  title: string
  hint: string
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
