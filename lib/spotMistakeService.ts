// Service for managing Spot the Mistake feature
import type {
  MistakeAnalysis,
  MistakeStatistics,
  MistakeType,
} from '@/types/spotTheMistake'

const STORAGE_KEY_PREFIX = 'physiscaffold_spot_mistake_'
const ANALYSIS_HISTORY_KEY = `${STORAGE_KEY_PREFIX}analysis_history`
const STATISTICS_KEY = `${STORAGE_KEY_PREFIX}statistics`

class SpotMistakeService {
  // Record a mistake analysis attempt
  recordAnalysis(analysis: MistakeAnalysis): void {
    const history = this.getAnalysisHistory(analysis.studentId)
    history.push(analysis)

    // Keep only last 100 analyses
    if (history.length > 100) {
      history.shift()
    }

    this.saveAnalysisHistory(analysis.studentId, history)
    this.updateStatistics(analysis)
  }

  // Get analysis history for a student
  getAnalysisHistory(studentId: string): MistakeAnalysis[] {
    if (typeof window === 'undefined') return []

    try {
      const key = `${ANALYSIS_HISTORY_KEY}_${studentId}`
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Error loading analysis history:', error)
      return []
    }
  }

  // Save analysis history
  private saveAnalysisHistory(studentId: string, history: MistakeAnalysis[]): void {
    if (typeof window === 'undefined') return

    try {
      const key = `${ANALYSIS_HISTORY_KEY}_${studentId}`
      localStorage.setItem(key, JSON.stringify(history))
    } catch (error) {
      console.error('Error saving analysis history:', error)
    }
  }

  // Update statistics after an analysis
  private updateStatistics(analysis: MistakeAnalysis): void {
    const stats = this.getStatistics(analysis.studentId)

    stats.totalAttempts++
    if (analysis.isCorrect) {
      stats.correctIdentifications++
    }

    // Update average time (simplified - assumes timestamp is end time)
    const now = new Date(analysis.timestamp).getTime()
    stats.averageTimeToIdentify =
      (stats.averageTimeToIdentify * (stats.totalAttempts - 1) + 180000) / stats.totalAttempts

    this.saveStatistics(analysis.studentId, stats)
  }

  // Get statistics for a student
  getStatistics(studentId: string): MistakeStatistics {
    if (typeof window === 'undefined') {
      return this.createEmptyStatistics(studentId)
    }

    try {
      const key = `${STATISTICS_KEY}_${studentId}`
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : this.createEmptyStatistics(studentId)
    } catch (error) {
      console.error('Error loading statistics:', error)
      return this.createEmptyStatistics(studentId)
    }
  }

  // Save statistics
  private saveStatistics(studentId: string, stats: MistakeStatistics): void {
    if (typeof window === 'undefined') return

    try {
      const key = `${STATISTICS_KEY}_${studentId}`
      localStorage.setItem(key, JSON.stringify(stats))
    } catch (error) {
      console.error('Error saving statistics:', error)
    }
  }

  // Create empty statistics object
  private createEmptyStatistics(studentId: string): MistakeStatistics {
    return {
      studentId,
      totalAttempts: 0,
      correctIdentifications: 0,
      mistakesByType: {
        sign_convention: { encountered: 0, identified: 0, successRate: 0 },
        reference_frame: { encountered: 0, identified: 0, successRate: 0 },
        conservation_violation: { encountered: 0, identified: 0, successRate: 0 },
        force_identification: { encountered: 0, identified: 0, successRate: 0 },
        concept_confusion: { encountered: 0, identified: 0, successRate: 0 },
        coordinate_system: { encountered: 0, identified: 0, successRate: 0 },
        initial_conditions: { encountered: 0, identified: 0, successRate: 0 },
        vector_scalar_confusion: { encountered: 0, identified: 0, successRate: 0 },
      },
      averageTimeToIdentify: 0,
      commonMisses: [],
    }
  }

  // Update mistake type statistics
  updateMistakeTypeStats(
    studentId: string,
    mistakeType: MistakeType,
    wasIdentified: boolean
  ): void {
    const stats = this.getStatistics(studentId)
    const typeStats = stats.mistakesByType[mistakeType]

    typeStats.encountered++
    if (wasIdentified) {
      typeStats.identified++
    }
    typeStats.successRate = typeStats.identified / typeStats.encountered

    // Update common misses
    if (!wasIdentified) {
      if (!stats.commonMisses.includes(mistakeType)) {
        stats.commonMisses.push(mistakeType)
      }
    } else {
      // Remove from common misses if success rate improves
      if (typeStats.successRate > 0.7) {
        stats.commonMisses = stats.commonMisses.filter(t => t !== mistakeType)
      }
    }

    this.saveStatistics(studentId, stats)
  }

  // Get success rate for a specific mistake type
  getMistakeTypeSuccessRate(studentId: string, mistakeType: MistakeType): number {
    const stats = this.getStatistics(studentId)
    return stats.mistakesByType[mistakeType].successRate
  }

  // Get overall success rate
  getOverallSuccessRate(studentId: string): number {
    const stats = this.getStatistics(studentId)
    if (stats.totalAttempts === 0) return 0
    return stats.correctIdentifications / stats.totalAttempts
  }

  // Get weak areas (mistake types with low success rate)
  getWeakAreas(studentId: string): MistakeType[] {
    const stats = this.getStatistics(studentId)
    const weakThreshold = 0.5

    return Object.entries(stats.mistakesByType)
      .filter(([_, typeStats]) =>
        typeStats.encountered > 0 && typeStats.successRate < weakThreshold
      )
      .map(([type, _]) => type as MistakeType)
  }

  // Get strong areas (mistake types with high success rate)
  getStrongAreas(studentId: string): MistakeType[] {
    const stats = this.getStatistics(studentId)
    const strongThreshold = 0.8

    return Object.entries(stats.mistakesByType)
      .filter(([_, typeStats]) =>
        typeStats.encountered > 0 && typeStats.successRate >= strongThreshold
      )
      .map(([type, _]) => type as MistakeType)
  }

  // Clean old data
  cleanup(studentId: string, daysToKeep: number = 30): void {
    const history = this.getAnalysisHistory(studentId)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const filteredHistory = history.filter(analysis =>
      new Date(analysis.timestamp) > cutoffDate
    )

    this.saveAnalysisHistory(studentId, filteredHistory)
  }
}

export const spotMistakeService = new SpotMistakeService()
