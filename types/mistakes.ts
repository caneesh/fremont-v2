export interface MistakePattern {
  conceptId: string
  conceptName: string
  problemType: string // e.g., "Rotating Reference Frames", "Energy Conservation"
  struggledSteps: number[] // Step IDs where student struggled
  maxHintLevelUsed: number
  timeSpent: number // milliseconds
  timestamp: string
  commonMistake?: string // Extracted from reflection
}

export interface ConceptMistakeStats {
  conceptId: string
  conceptName: string
  totalAttempts: number
  struggledAttempts: number // Used Level 4-5 hints
  averageHintLevel: number
  commonPatterns: string[] // Common mistakes across problems
  lastSeen: string
}

export interface MistakeWarning {
  message: string
  severity: 'low' | 'medium' | 'high'
  relatedConcepts: string[]
  suggestions: string[]
}
