export interface PrerequisiteQuestion {
  conceptId: string
  conceptName: string
  question: string
  type: 'multiple-choice' | 'true-false' | 'short-answer'
  options?: string[] // For multiple-choice
  expectedAnswer?: string // For validation
  explanation: string // Why this is important
}

export interface PrerequisiteCheckRequest {
  concepts: Array<{
    id: string
    name: string
    definition: string
    formula?: string
  }>
}

export interface PrerequisiteCheckResponse {
  questions: PrerequisiteQuestion[]
  passingScore: number // Minimum correct to pass
}

export interface PrerequisiteAnswer {
  questionIndex: number
  conceptId: string
  answer: string
  isCorrect?: boolean
}

export interface PrerequisiteResult {
  totalQuestions: number
  correctAnswers: number
  passed: boolean
  weakConcepts: string[] // Concepts where student got questions wrong
  answers: PrerequisiteAnswer[]
}
