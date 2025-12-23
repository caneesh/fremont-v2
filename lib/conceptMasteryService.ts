import type {
  ConceptAttempt,
  ConceptMasteryData,
  ConceptMasteryStorage,
  MasteryLevel,
} from '@/types/conceptMastery'

const STORAGE_KEY = 'physiscaffold_concept_mastery'
const STORAGE_VERSION = 1
const MAX_ATTEMPTS_PER_CONCEPT = 5 // Rolling window: keep last 5 attempts
const TARGET_TIME_MS = 120000 // 2 minutes target time per concept

class ConceptMasteryService {
  private getStorage(): ConceptMasteryStorage {
    if (typeof window === 'undefined') {
      return {
        version: STORAGE_VERSION,
        studentId: '',
        data: {},
        lastCleanup: new Date().toISOString(),
      }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return {
          version: STORAGE_VERSION,
          studentId: '',
          data: {},
          lastCleanup: new Date().toISOString(),
        }
      }

      const data = JSON.parse(stored)
      if (data.version !== STORAGE_VERSION) {
        // Migration logic if needed
        return {
          version: STORAGE_VERSION,
          studentId: '',
          data: {},
          lastCleanup: new Date().toISOString(),
        }
      }

      return data
    } catch (error) {
      console.error('Error reading concept mastery:', error)
      return {
        version: STORAGE_VERSION,
        studentId: '',
        data: {},
        lastCleanup: new Date().toISOString(),
      }
    }
  }

  private saveStorage(storage: ConceptMasteryStorage): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
    } catch (error) {
      console.error('Error saving concept mastery:', error)
    }
  }

  /**
   * Calculate mastery score from attempts using weighted formula
   * masteryScore = 0.5 × hintScore + 0.3 × successRate + 0.2 × timeScore
   */
  calculateMasteryScore(attempts: ConceptAttempt[]): number {
    if (attempts.length === 0) return 0

    // Take last N attempts (rolling window)
    const recentAttempts = attempts.slice(-MAX_ATTEMPTS_PER_CONCEPT)

    // Calculate hint score: 1 - (avgHintLevel / 5)
    const avgHintLevel =
      recentAttempts.reduce((sum, att) => sum + att.hintLevel, 0) / recentAttempts.length
    const hintScore = 1 - avgHintLevel / 5

    // Calculate success rate
    const successfulAttempts = recentAttempts.filter((att) => att.success).length
    const successRate = successfulAttempts / recentAttempts.length

    // Calculate time score: 1 - min(avgTime / targetTime, 1)
    const avgTime =
      recentAttempts.reduce((sum, att) => sum + att.timeSpent, 0) / recentAttempts.length
    const timeScore = 1 - Math.min(avgTime / TARGET_TIME_MS, 1)

    // Weighted combination
    const masteryScore = 0.5 * hintScore + 0.3 * successRate + 0.2 * timeScore

    return Math.max(0, Math.min(1, masteryScore)) // Clamp to [0, 1]
  }

  /**
   * Get mastery level from mastery score
   */
  getMasteryLevel(masteryScore: number): MasteryLevel {
    if (masteryScore >= 0.75) return 'high'
    if (masteryScore >= 0.4) return 'medium'
    if (masteryScore > 0) return 'low'
    return 'none'
  }

  /**
   * Record a new attempt for a concept
   */
  recordAttempt(
    studentId: string,
    conceptId: string,
    conceptName: string,
    attemptData: {
      problemId: string
      hintLevel: number
      timeSpent: number
      success: boolean
    }
  ): void {
    const storage = this.getStorage()

    // Initialize or update student ID
    if (!storage.studentId) {
      storage.studentId = studentId
    }

    // Get existing concept data or create new
    const conceptData = storage.data[conceptId] || {
      conceptId,
      conceptName,
      attempts: [],
      masteryScore: 0,
      lastUpdated: new Date().toISOString(),
    }

    // Create attempt
    const attempt: ConceptAttempt = {
      attemptId: `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      problemId: attemptData.problemId,
      timestamp: new Date().toISOString(),
      hintLevel: Math.max(0, Math.min(5, attemptData.hintLevel)), // Clamp to [0, 5]
      timeSpent: Math.max(0, attemptData.timeSpent), // Non-negative
      success: attemptData.success,
    }

    // Add attempt to concept data
    conceptData.attempts.push(attempt)

    // Keep only last MAX_ATTEMPTS_PER_CONCEPT attempts
    if (conceptData.attempts.length > MAX_ATTEMPTS_PER_CONCEPT * 2) {
      conceptData.attempts = conceptData.attempts.slice(-MAX_ATTEMPTS_PER_CONCEPT)
    }

    // Recalculate mastery score
    conceptData.masteryScore = this.calculateMasteryScore(conceptData.attempts)
    conceptData.lastUpdated = new Date().toISOString()

    // Update storage
    storage.data[conceptId] = conceptData
    this.saveStorage(storage)

    console.log(
      `[ConceptMastery] Recorded attempt for ${conceptId} (${conceptName}) - student ${studentId}, mastery: ${conceptData.masteryScore.toFixed(2)}`
    )
  }

  /**
   * Get mastery data for a specific concept
   */
  getConceptMastery(studentId: string, conceptId: string): ConceptMasteryData | null {
    const storage = this.getStorage()

    // Filter by student ID
    if (storage.studentId !== studentId) {
      return null
    }

    return storage.data[conceptId] || null
  }

  /**
   * Get all mastery data for a student
   */
  getAllMasteryData(studentId: string): Record<string, ConceptMasteryData> {
    const storage = this.getStorage()

    // Filter by student ID
    if (storage.studentId !== studentId) {
      return {}
    }

    return storage.data
  }

  /**
   * Get concepts that need improvement (mastery < 0.4)
   */
  getWeakConcepts(studentId: string): ConceptMasteryData[] {
    const allData = this.getAllMasteryData(studentId)

    return Object.values(allData)
      .filter((concept) => concept.masteryScore < 0.4 && concept.attempts.length > 0)
      .sort((a, b) => a.masteryScore - b.masteryScore) // Weakest first
  }

  /**
   * Get concepts with high mastery (mastery >= 0.75)
   */
  getStrongConcepts(studentId: string): ConceptMasteryData[] {
    const allData = this.getAllMasteryData(studentId)

    return Object.values(allData)
      .filter((concept) => concept.masteryScore >= 0.75)
      .sort((a, b) => b.masteryScore - a.masteryScore) // Strongest first
  }

  /**
   * Clean up old attempts (older than 90 days)
   */
  cleanup(studentId: string): void {
    const storage = this.getStorage()

    // Only cleanup for the current student
    if (storage.studentId !== studentId) {
      return
    }

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)
    const cutoffTime = cutoff.getTime()

    let removedCount = 0

    Object.keys(storage.data).forEach((conceptId) => {
      const conceptData = storage.data[conceptId]

      // Filter out old attempts
      const filteredAttempts = conceptData.attempts.filter(
        (att) => new Date(att.timestamp).getTime() > cutoffTime
      )

      if (filteredAttempts.length === 0) {
        // Remove concept entirely if no recent attempts
        delete storage.data[conceptId]
        removedCount++
      } else if (filteredAttempts.length !== conceptData.attempts.length) {
        // Update attempts and recalculate mastery
        conceptData.attempts = filteredAttempts
        conceptData.masteryScore = this.calculateMasteryScore(conceptData.attempts)
        conceptData.lastUpdated = new Date().toISOString()
      }
    })

    storage.lastCleanup = new Date().toISOString()
    this.saveStorage(storage)

    if (removedCount > 0) {
      console.log(`[ConceptMastery] Cleaned up ${removedCount} old concepts`)
    }
  }

  /**
   * Get statistics for a student
   */
  getStatistics(studentId: string) {
    const allData = this.getAllMasteryData(studentId)
    const concepts = Object.values(allData)

    const totalConcepts = concepts.length
    const weakConcepts = concepts.filter((c) => c.masteryScore < 0.4).length
    const mediumConcepts = concepts.filter((c) => c.masteryScore >= 0.4 && c.masteryScore < 0.75)
      .length
    const strongConcepts = concepts.filter((c) => c.masteryScore >= 0.75).length

    const totalAttempts = concepts.reduce((sum, c) => sum + c.attempts.length, 0)
    const avgMastery =
      totalConcepts > 0
        ? concepts.reduce((sum, c) => sum + c.masteryScore, 0) / totalConcepts
        : 0

    return {
      totalConcepts,
      weakConcepts,
      mediumConcepts,
      strongConcepts,
      totalAttempts,
      avgMastery: Math.round(avgMastery * 100) / 100,
      masteryPercentage: totalConcepts > 0 ? Math.round((strongConcepts / totalConcepts) * 100) : 0,
    }
  }

  /**
   * Clear all data for a student (useful for testing)
   */
  clearData(studentId: string): void {
    const storage = this.getStorage()

    if (storage.studentId === studentId) {
      storage.data = {}
      storage.lastCleanup = new Date().toISOString()
      this.saveStorage(storage)
      console.log(`[ConceptMastery] Cleared all data for student ${studentId}`)
    }
  }
}

export const conceptMasteryService = new ConceptMasteryService()
