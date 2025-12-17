import topicsData from '@/data/topics.json'
import questionsData from '@/data/questions.json'
import type { Topic, Question, StudyProgress, StudyStats } from '@/types/studyPath'

const STORAGE_KEY_PROGRESS = 'physiscaffold_study_progress'

class StudyPathService {
  /**
   * Get all topics
   */
  getAllTopics(): Topic[] {
    return topicsData.topics as Topic[]
  }

  /**
   * Get topic by ID
   */
  getTopicById(topicId: string): Topic | null {
    return topicsData.topics.find(t => t.id === topicId) as Topic || null
  }

  /**
   * Get all questions
   */
  getAllQuestions(): Question[] {
    return questionsData.questions as Question[]
  }

  /**
   * Get question by ID
   */
  getQuestionById(questionId: string): Question | null {
    return questionsData.questions.find(q => q.id === questionId) as Question || null
  }

  /**
   * Get questions by topic
   */
  getQuestionsByTopic(topicId: string): Question[] {
    return questionsData.questions.filter(q => q.topic === topicId) as Question[]
  }

  /**
   * Get questions by subtopic
   */
  getQuestionsBySubtopic(topicId: string, subtopicId: string): Question[] {
    return questionsData.questions.filter(
      q => q.topic === topicId && q.subtopic === subtopicId
    ) as Question[]
  }

  /**
   * Get recommended next questions based on progress
   */
  getRecommendedQuestions(limit: number = 5): Question[] {
    const stats = this.getStudyStats()
    const allQuestions = this.getAllQuestions()

    // Find questions not yet attempted
    const unattempted = allQuestions.filter(
      q => !Object.values(stats.topicProgress).some(
        p => p.questionsAttempted.includes(q.id)
      )
    )

    // Prioritize: Easy unattempted -> Medium unattempted -> Hard unattempted
    const prioritized = [
      ...unattempted.filter(q => q.difficulty === 'Easy'),
      ...unattempted.filter(q => q.difficulty === 'Medium'),
      ...unattempted.filter(q => q.difficulty === 'Hard'),
    ]

    return prioritized.slice(0, limit)
  }

  /**
   * Get study progress for all topics
   */
  private getAllProgress(): Record<string, StudyProgress> {
    if (typeof window === 'undefined') return {}

    try {
      const data = localStorage.getItem(STORAGE_KEY_PROGRESS)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('Failed to load study progress:', error)
      return {}
    }
  }

  /**
   * Save study progress
   */
  private saveProgress(progress: Record<string, StudyProgress>): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY_PROGRESS, JSON.stringify(progress))
    } catch (error) {
      console.error('Failed to save study progress:', error)
    }
  }

  /**
   * Get progress for a specific topic
   */
  getTopicProgress(topicId: string): StudyProgress {
    const allProgress = this.getAllProgress()
    return allProgress[topicId] || {
      topicId,
      questionsAttempted: [],
      questionsSolved: [],
      lastAccessedAt: new Date().toISOString(),
      timeSpent: 0,
    }
  }

  /**
   * Update topic progress when question is attempted
   */
  markQuestionAttempted(topicId: string, questionId: string): void {
    const allProgress = this.getAllProgress()
    const topicProgress = this.getTopicProgress(topicId)

    if (!topicProgress.questionsAttempted.includes(questionId)) {
      topicProgress.questionsAttempted.push(questionId)
    }

    topicProgress.lastAccessedAt = new Date().toISOString()

    allProgress[topicId] = topicProgress
    this.saveProgress(allProgress)
  }

  /**
   * Update topic progress when question is solved
   */
  markQuestionSolved(topicId: string, questionId: string): void {
    const allProgress = this.getAllProgress()
    const topicProgress = this.getTopicProgress(topicId)

    if (!topicProgress.questionsAttempted.includes(questionId)) {
      topicProgress.questionsAttempted.push(questionId)
    }

    if (!topicProgress.questionsSolved.includes(questionId)) {
      topicProgress.questionsSolved.push(questionId)
    }

    topicProgress.lastAccessedAt = new Date().toISOString()

    allProgress[topicId] = topicProgress
    this.saveProgress(allProgress)
  }

  /**
   * Add time spent on a topic
   */
  addTimeSpent(topicId: string, minutes: number): void {
    const allProgress = this.getAllProgress()
    const topicProgress = this.getTopicProgress(topicId)

    topicProgress.timeSpent += minutes
    topicProgress.lastAccessedAt = new Date().toISOString()

    allProgress[topicId] = topicProgress
    this.saveProgress(allProgress)
  }

  /**
   * Get comprehensive study statistics
   */
  getStudyStats(): StudyStats {
    const allProgress = this.getAllProgress()
    const allQuestions = this.getAllQuestions()

    let totalQuestionsAttempted = 0
    let totalQuestionsSolved = 0
    let totalTimeSpent = 0

    // Aggregate stats
    Object.values(allProgress).forEach(progress => {
      totalQuestionsAttempted += progress.questionsAttempted.length
      totalQuestionsSolved += progress.questionsSolved.length
      totalTimeSpent += progress.timeSpent
    })

    // Identify strength and weak areas
    const topicScores = Object.entries(allProgress).map(([topicId, progress]) => {
      const topicQuestions = allQuestions.filter(q => q.topic === topicId)
      const solveRate = topicQuestions.length > 0
        ? progress.questionsSolved.length / topicQuestions.length
        : 0

      return { topicId, solveRate }
    })

    topicScores.sort((a, b) => b.solveRate - a.solveRate)

    const strengthAreas = topicScores.slice(0, 2).map(t => t.topicId)
    const weakAreas = topicScores.slice(-2).map(t => t.topicId)

    return {
      totalQuestionsAttempted,
      totalQuestionsSolved,
      totalTimeSpent,
      topicProgress: allProgress,
      strengthAreas,
      weakAreas,
    }
  }

  /**
   * Get topic completion percentage
   */
  getTopicCompletionPercentage(topicId: string): number {
    const progress = this.getTopicProgress(topicId)
    const topicQuestions = this.getQuestionsByTopic(topicId)

    if (topicQuestions.length === 0) return 0

    return Math.round((progress.questionsSolved.length / topicQuestions.length) * 100)
  }
}

export const studyPathService = new StudyPathService()
