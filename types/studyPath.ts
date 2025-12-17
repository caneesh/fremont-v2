export interface Question {
  id: string
  title: string
  statement: string
  topic: string
  subtopic: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  concepts: string[]
  expectedTime: number // in minutes
  source?: string
  year?: number
}

export interface Topic {
  id: string
  name: string
  description: string
  icon: string
  subtopics: Subtopic[]
  totalQuestions: number
  order: number
}

export interface Subtopic {
  id: string
  name: string
  description: string
  questions: string[] // question IDs
}

export interface StudyProgress {
  topicId: string
  questionsAttempted: string[]
  questionsSolved: string[]
  lastAccessedAt: string
  timeSpent: number // in minutes
}

export interface StudyStats {
  totalQuestionsAttempted: number
  totalQuestionsSolved: number
  totalTimeSpent: number
  topicProgress: Record<string, StudyProgress>
  strengthAreas: string[]
  weakAreas: string[]
}
