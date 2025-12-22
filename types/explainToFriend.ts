// "Explain to a Friend" Mode - Feynman Technique Types

export interface FriendExplanation {
  id: string
  studentId: string
  problemId: string
  timestamp: string
  explanation: string // The 3-line explanation
  lineCount: number
  wordCount: number
  quality: 'excellent' | 'good' | 'needs_work' | null // AI-assessed quality
  feedback?: string // AI feedback on explanation
}

export interface ExplainToFriendRequest {
  problemText: string
  explanation: string
  steps: string[] // The solution steps to explain
  topic: string
}

export interface ExplainToFriendResponse {
  quality: 'excellent' | 'good' | 'needs_work'
  feedback: string
  suggestions?: string[]
  canProceed: boolean // true if quality is good enough
}

export interface ExplainToFriendStatistics {
  totalExplanations: number
  excellentCount: number
  goodCount: number
  needsWorkCount: number
  averageWordCount: number
  improvementRate: number // Percentage of excellent explanations
}

// Validation rules
export const EXPLAIN_TO_FRIEND_RULES = {
  MIN_LINES: 3,
  MAX_LINES: 3,
  MIN_WORDS_PER_LINE: 5,
  MAX_WORDS_TOTAL: 100,
  MIN_CHARS_TOTAL: 50,
}

// Helper to count lines (split by newlines, filter empty)
export function countLines(text: string): number {
  return text.split('\n').filter(line => line.trim().length > 0).length
}

// Helper to count words
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

// Validate explanation meets requirements
export function validateExplanation(explanation: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  const lineCount = countLines(explanation)
  const wordCount = countWords(explanation)
  const charCount = explanation.trim().length

  if (lineCount < EXPLAIN_TO_FRIEND_RULES.MIN_LINES) {
    errors.push(`Please write at least ${EXPLAIN_TO_FRIEND_RULES.MIN_LINES} lines`)
  }

  if (lineCount > EXPLAIN_TO_FRIEND_RULES.MAX_LINES) {
    errors.push(`Please keep it to ${EXPLAIN_TO_FRIEND_RULES.MAX_LINES} lines`)
  }

  if (charCount < EXPLAIN_TO_FRIEND_RULES.MIN_CHARS_TOTAL) {
    errors.push('Your explanation is too brief. Add more detail.')
  }

  if (wordCount > EXPLAIN_TO_FRIEND_RULES.MAX_WORDS_TOTAL) {
    errors.push('Keep it concise - explain in simpler terms')
  }

  // Check if each line has meaningful content
  const lines = explanation.split('\n').filter(l => l.trim().length > 0)
  const tooShortLines = lines.filter(line =>
    countWords(line) < EXPLAIN_TO_FRIEND_RULES.MIN_WORDS_PER_LINE
  )

  if (tooShortLines.length > 0) {
    errors.push('Each line should have at least 5 words')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
