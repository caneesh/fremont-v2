// Spot the Mistake - Pedagogical Feature
// Students analyze deliberately flawed solutions to identify conceptual errors

export interface StudentSolution {
  id: string
  problemId: string
  title: string
  steps: SolutionStep[]
  conclusion: string
  // Hidden metadata (not shown to user)
  mistakeLocation: {
    stepIndex: number
    mistakeType: MistakeType
    correctApproach: string
  }
  createdAt: string
}

export interface SolutionStep {
  stepNumber: number
  title: string
  content: string
  equations?: string[] // LaTeX equations
  reasoning: string
}

export type MistakeType =
  | 'sign_convention'           // Wrong sign for forces/vectors
  | 'reference_frame'           // Wrong reference frame choice
  | 'conservation_violation'    // Incorrectly assumes conservation
  | 'force_identification'      // Missing or incorrect force
  | 'concept_confusion'         // Mixing up concepts (e.g., energy vs momentum)
  | 'coordinate_system'         // Wrong coordinate choice
  | 'initial_conditions'        // Wrong boundary/initial conditions
  | 'vector_scalar_confusion'   // Treating vector as scalar

export interface MistakeAnalysis {
  studentId: string
  solutionId: string
  identifiedStepIndex: number | null
  explanation: string
  timestamp: string
  isCorrect: boolean
  feedback?: string
}

export interface MistakeStatistics {
  studentId: string
  totalAttempts: number
  correctIdentifications: number
  mistakesByType: Record<MistakeType, {
    encountered: number
    identified: number
    successRate: number
  }>
  averageTimeToIdentify: number // milliseconds
  commonMisses: MistakeType[]
}

// API Request/Response types
export interface GenerateMistakeSolutionRequest {
  problemText: string
  domain: string
  subdomain: string
  correctSolution?: string // Optional: provide correct solution for comparison
}

export interface GenerateMistakeSolutionResponse extends StudentSolution {
  // Public response doesn't include mistake location
}

export interface AnalyzeMistakeRequest {
  studentId: string
  solutionId: string
  identifiedStepIndex: number | null
  explanation: string
}

export interface AnalyzeMistakeResponse {
  isCorrect: boolean
  feedback: string
  actualMistakeLocation: {
    stepIndex: number
    mistakeType: MistakeType
  }
  correctApproach: string
  encouragement: string
}
