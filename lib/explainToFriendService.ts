import type {
  FriendExplanation,
  ExplainToFriendStatistics,
} from '@/types/explainToFriend'
import { countLines, countWords } from '@/types/explainToFriend'

const STORAGE_KEY = 'physiscaffold_friend_explanations'
const STORAGE_VERSION = 1

interface ExplanationStorage {
  version: number
  explanations: FriendExplanation[]
  lastCleanup: string
}

class ExplainToFriendService {
  private getStorage(): ExplanationStorage {
    if (typeof window === 'undefined') {
      return { version: STORAGE_VERSION, explanations: [], lastCleanup: new Date().toISOString() }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return { version: STORAGE_VERSION, explanations: [], lastCleanup: new Date().toISOString() }
      }

      const data = JSON.parse(stored)
      if (data.version !== STORAGE_VERSION) {
        return { version: STORAGE_VERSION, explanations: [], lastCleanup: new Date().toISOString() }
      }

      return data
    } catch (error) {
      console.error('Error reading friend explanations:', error)
      return { version: STORAGE_VERSION, explanations: [], lastCleanup: new Date().toISOString() }
    }
  }

  private saveStorage(storage: ExplanationStorage): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
    } catch (error) {
      console.error('Error saving friend explanations:', error)
    }
  }

  /**
   * Record a new explanation
   */
  recordExplanation(
    studentId: string,
    problemId: string,
    explanation: string,
    quality: 'excellent' | 'good' | 'needs_work' | null,
    feedback?: string
  ): void {
    const storage = this.getStorage()

    const record: FriendExplanation = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId,
      problemId,
      timestamp: new Date().toISOString(),
      explanation,
      lineCount: countLines(explanation),
      wordCount: countWords(explanation),
      quality,
      feedback,
    }

    storage.explanations.push(record)
    this.saveStorage(storage)

    console.log(`Recorded explanation for problem ${problemId} with quality: ${quality}`)
  }

  /**
   * Get all explanations for a student
   */
  getStudentExplanations(studentId: string): FriendExplanation[] {
    const storage = this.getStorage()
    return storage.explanations.filter((exp) => exp.studentId === studentId)
  }

  /**
   * Get explanation for specific problem (most recent)
   */
  getProblemExplanation(studentId: string, problemId: string): FriendExplanation | null {
    const explanations = this.getStudentExplanations(studentId)
    const problemExplanations = explanations
      .filter((exp) => exp.problemId === problemId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return problemExplanations[0] || null
  }

  /**
   * Get statistics for student
   */
  getStatistics(studentId: string): ExplainToFriendStatistics {
    const explanations = this.getStudentExplanations(studentId)

    const totalExplanations = explanations.length
    const excellentCount = explanations.filter((e) => e.quality === 'excellent').length
    const goodCount = explanations.filter((e) => e.quality === 'good').length
    const needsWorkCount = explanations.filter((e) => e.quality === 'needs_work').length

    const totalWords = explanations.reduce((sum, e) => sum + e.wordCount, 0)
    const averageWordCount = totalExplanations > 0 ? Math.round(totalWords / totalExplanations) : 0

    const improvementRate =
      totalExplanations > 0 ? Math.round((excellentCount / totalExplanations) * 100) : 0

    return {
      totalExplanations,
      excellentCount,
      goodCount,
      needsWorkCount,
      averageWordCount,
      improvementRate,
    }
  }

  /**
   * Get recent quality trend (last 5 explanations)
   */
  getRecentTrend(studentId: string): 'improving' | 'stable' | 'declining' {
    const explanations = this.getStudentExplanations(studentId)
      .filter((e) => e.quality !== null)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5)

    if (explanations.length < 3) return 'stable'

    const qualityScore = (quality: string) => {
      switch (quality) {
        case 'excellent': return 3
        case 'good': return 2
        case 'needs_work': return 1
        default: return 0
      }
    }

    const recent = explanations.slice(0, 2).reduce((sum, e) => sum + qualityScore(e.quality || ''), 0)
    const older = explanations.slice(2, 5).reduce((sum, e) => sum + qualityScore(e.quality || ''), 0)

    const recentAvg = recent / 2
    const olderAvg = older / (explanations.length - 2)

    if (recentAvg > olderAvg * 1.1) return 'improving'
    if (recentAvg < olderAvg * 0.9) return 'declining'
    return 'stable'
  }

  /**
   * Clean up old explanations (older than 90 days)
   */
  cleanup(): void {
    const storage = this.getStorage()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)

    storage.explanations = storage.explanations.filter(
      (exp) => new Date(exp.timestamp).getTime() > cutoff.getTime()
    )

    storage.lastCleanup = new Date().toISOString()
    this.saveStorage(storage)
  }
}

export const explainToFriendService = new ExplainToFriendService()
