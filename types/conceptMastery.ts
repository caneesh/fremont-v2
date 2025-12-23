// Concept Mastery Tracking Types

export interface ConceptAttempt {
  attemptId: string
  problemId: string
  timestamp: string
  hintLevel: number      // 0-5, max hint level used for this concept in the problem
  timeSpent: number      // milliseconds spent on this concept
  success: boolean       // solved without level 5 hint
}

export interface ConceptMasteryData {
  conceptId: string
  conceptName: string
  attempts: ConceptAttempt[]
  masteryScore: number   // 0-1, weighted calculation
  lastUpdated: string
}

export interface ConceptMasteryStorage {
  version: number
  studentId: string
  data: Record<string, ConceptMasteryData>  // key = conceptId
  lastCleanup: string
}

// Repair Mode Types

export interface PracticeProblem {
  problemText: string
  difficulty: 'easy' | 'medium'
  hints: string[]
  solution: string
}

export interface MicroCurriculum {
  conceptClarification: string
  diagnosticQuestion: string
  diagnosticAnswer: string
  practiceProblems: PracticeProblem[]
}

export type MasteryLevel = 'high' | 'medium' | 'low' | 'none'

export interface ConceptNode {
  id: string
  name: string
  masteryScore: number
  masteryLevel: MasteryLevel
  attemptCount: number
  lastAttempt?: string
}
