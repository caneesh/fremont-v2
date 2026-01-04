import type {
  ConceptAttempt,
  ConceptMasteryData,
  ConceptMasteryStorage,
  MasteryLevel,
} from '@/types/conceptMastery'
import type { SocraticAttemptData, FinalUnderstanding } from '@/types/socraticFirst'

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

  /**
   * Record an attempt from Socratic-first step interaction
   *
   * Maps Socratic interaction data to concept mastery:
   * - exchangeCount affects hint level proxy (more exchanges = lower hint score)
   * - selfReportAccuracy provides calibration signal
   * - aiVerifiedUnderstanding maps to success flag
   * - hintsUsed directly affects hint level
   */
  recordSocraticAttempt(
    studentId: string,
    conceptId: string,
    conceptName: string,
    data: SocraticAttemptData
  ): void {
    // Map Socratic data to traditional attempt metrics
    // exchangeCount: 1-2 is excellent, 3-4 is good, 5+ needs work
    // This maps to a pseudo-hint level for consistency with existing scoring

    // Calculate pseudo hint level based on Socratic performance
    // Pure Socratic path with few exchanges = low hint level (good)
    // Many exchanges or hints used = higher hint level
    let pseudoHintLevel = 0

    if (data.hintsUsed > 0) {
      // If hints were used, start at that level
      pseudoHintLevel = Math.min(data.hintsUsed, 5)
    } else if (data.exchangeCount <= 2) {
      // Quick understanding - equivalent to no hints
      pseudoHintLevel = 0
    } else if (data.exchangeCount <= 4) {
      // Moderate help needed - equivalent to light hints
      pseudoHintLevel = 1
    } else if (data.exchangeCount <= 6) {
      // More guidance needed
      pseudoHintLevel = 2
    } else {
      // Extended dialogue - needed significant help
      pseudoHintLevel = 3
    }

    // Map final understanding to success
    const success = data.aiVerifiedUnderstanding === 'mastered' ||
      data.aiVerifiedUnderstanding === 'partial'

    // Apply calibration adjustment to hint level
    // Well-calibrated students get a small bonus
    // Overconfident students don't get penalized on mastery (handled by mistake notebook)
    if (data.selfReportAccuracy >= 0.8) {
      // Well-calibrated - shows self-awareness
      pseudoHintLevel = Math.max(0, pseudoHintLevel - 0.5)
    }

    // Record using standard method
    this.recordAttempt(studentId, conceptId, conceptName, {
      problemId: `socratic_${Date.now()}`,
      hintLevel: pseudoHintLevel,
      timeSpent: 0, // Could be passed in if tracked
      success,
    })

    console.log(
      `[ConceptMastery] Recorded Socratic attempt for ${conceptId}: ` +
      `exchanges=${data.exchangeCount}, hints=${data.hintsUsed}, ` +
      `understanding=${data.aiVerifiedUnderstanding}, calibration=${data.selfReportAccuracy.toFixed(2)}`
    )
  }

  /**
   * Calculate effective mastery considering Socratic calibration
   * Returns the base mastery score adjusted by calibration pattern
   */
  getEffectiveMastery(
    studentId: string,
    conceptId: string,
    calibrationPattern?: 'overconfident' | 'underconfident' | 'calibrated' | 'well_calibrated'
  ): number {
    const conceptData = this.getConceptMastery(studentId, conceptId)
    if (!conceptData) return 0

    let effectiveScore = conceptData.masteryScore

    // Apply calibration adjustment
    // Underconfident students may actually know more than scores suggest
    // Overconfident students may know less
    if (calibrationPattern === 'underconfident') {
      // Boost score slightly - they know more than they think
      effectiveScore = Math.min(1, effectiveScore * 1.1)
    } else if (calibrationPattern === 'overconfident') {
      // Reduce score slightly - they may have blind spots
      effectiveScore = effectiveScore * 0.9
    }

    return effectiveScore
  }
}

export const conceptMasteryService = new ConceptMasteryService()
