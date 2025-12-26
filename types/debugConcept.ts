// Types for the Socratic Debugger / Debug Concept API

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ProblemContext {
  problemText: string
  domain: string
  subdomain: string
  sanityCheckQuestion: string
  expectedBehavior: string
  checkType: 'limit' | 'dimension' | 'symmetry'
  steps: Array<{
    id: number
    title: string
  }>
  concepts: Array<{
    id: string
    name: string
  }>
}

export interface DebugConceptRequest {
  userInput: string
  problemContext: ProblemContext
  chatHistory: ChatMessage[]
  isInitialSubmission: boolean // true for first wrong answer, false for follow-up chat
}

export interface DebugConceptResponse {
  message: string // The AI's Socratic question or response
  isCorrect: boolean // true when user finally understands
  targetStepId?: number // If error relates to a specific step, highlight it
  targetConceptId?: string // If error relates to a specific concept
  encouragement?: string // Optional encouragement message when correct
  hintsGiven: number // Track how many hints/questions given so far
}

export type DebuggerStatus = 'idle' | 'submitting' | 'analyzing' | 'chatting' | 'solved'
