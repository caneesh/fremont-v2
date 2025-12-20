export interface ReflectionRequest {
  problemText: string
  studentOutcome: 'solved' | 'assisted' | 'struggled'
  hintsUsed: number[] // Array of hint levels used across all steps
}

export interface ReflectionResponse {
  questions: string[]
}
