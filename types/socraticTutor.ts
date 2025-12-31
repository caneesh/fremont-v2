/**
 * Socratic Tutor Chat Types
 *
 * A live tutoring system where a professor asks follow-up questions
 * until the student demonstrates understanding.
 */

export interface ChatMessage {
  id: string
  role: 'professor' | 'student'
  content: string
  timestamp: number
}

export interface ComprehensionQuestion {
  id: string
  question: string
  hint?: string
}

export interface AnalysisResult {
  isCorrect: boolean
  understanding: 'full' | 'partial' | 'misconception' | 'unclear'
  feedback: string
  followUpQuestion?: string
  conceptGaps?: string[]
}

export interface SocraticTutorState {
  phase: 'questions' | 'chat' | 'resolved'
  questions: ComprehensionQuestion[]
  answers: Record<string, string>
  chatHistory: ChatMessage[]
  isAnalyzing: boolean
  isProfessorTyping: boolean
}

export interface SocraticAnalyzeRequest {
  problemText: string
  stepTitle: string
  stepContent: string
  requiredConcepts: string[]
  question: string
  studentAnswer: string
  chatHistory?: ChatMessage[]
}

export interface SocraticAnalyzeResponse {
  analysis: AnalysisResult
  isResolved: boolean
  encouragement?: string
}

export interface GenerateQuestionsRequest {
  problemText: string
  stepTitle: string
  stepContent: string
  requiredConcepts: string[]
}

export interface GenerateQuestionsResponse {
  questions: ComprehensionQuestion[]
}
