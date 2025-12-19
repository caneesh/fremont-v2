export interface StepUpRequest {
  previousProblem: string
  userPerformance: 'Solved successfully' | 'Solved with hints' | 'Struggled'
  topicTags: string[]
  previousConcepts?: string[]
  difficulty?: 'Easy' | 'Medium' | 'Hard'
}

export interface StepUpProblem {
  nextProblemTitle: string
  problemText: string
  addedComplexity: string
  whyThisNext: string
  suggestedDifficulty: 'Easy' | 'Medium' | 'Hard'
  newConcepts: string[]
  estimatedTime: number
}

export interface ProblemProgression {
  problemId: string
  problemTitle: string
  difficulty: string
  solvedAt: string
  nextProblem?: StepUpProblem
}
