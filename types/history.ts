export type ProblemStatus = 'IN_PROGRESS' | 'SOLVED'

export interface ProblemAttempt {
  id: string
  userId?: string // nullable for guest mode
  problemId: string
  problemTitle: string
  status: ProblemStatus
  reviewFlag: boolean
  draftSolution?: string // JSON stringified user answers/progress
  finalSolution?: string // JSON stringified final solution
  language?: string
  createdAt: string // ISO date string
  updatedAt: string // ISO date string
  lastOpenedAt?: string // ISO date string
}

export interface StepProgress {
  stepId: number
  isCompleted: boolean
  userAnswer?: string
  currentHintLevel?: number // Tracks which hint level (1-5) the user has unlocked
}

export interface ReflectionAnswer {
  question: string
  answer: string
}

export interface ProblemProgress {
  problemText: string
  stepProgress: StepProgress[]
  sanityCheckAnswer?: string
  currentStep: number
  reflectionAnswers?: ReflectionAnswer[]
}

export interface HistoryFilters {
  status?: ProblemStatus
  review?: boolean
  query?: string
  page?: number
  limit?: number
}

export interface HistoryResponse {
  attempts: ProblemAttempt[]
  total: number
  page: number
  totalPages: number
}
