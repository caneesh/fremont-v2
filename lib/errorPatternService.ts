import type {
  ErrorPattern,
  StudentErrorInstance,
  ErrorPatternSummary,
  ErrorPatternInsight,
} from '@/types/errorPatterns'
import { COMMON_ERROR_PATTERNS } from '@/types/errorPatterns'

const STORAGE_KEY = 'physiscaffold_error_patterns'
const STORAGE_VERSION = 1

interface ErrorPatternStorage {
  version: number
  instances: StudentErrorInstance[]
  lastCleanup: string
}

class ErrorPatternService {
  private getStorage(): ErrorPatternStorage {
    if (typeof window === 'undefined') {
      return { version: STORAGE_VERSION, instances: [], lastCleanup: new Date().toISOString() }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return { version: STORAGE_VERSION, instances: [], lastCleanup: new Date().toISOString() }
      }

      const data = JSON.parse(stored)
      if (data.version !== STORAGE_VERSION) {
        // Migration logic if needed
        return { version: STORAGE_VERSION, instances: [], lastCleanup: new Date().toISOString() }
      }

      return data
    } catch (error) {
      console.error('Error reading error patterns:', error)
      return { version: STORAGE_VERSION, instances: [], lastCleanup: new Date().toISOString() }
    }
  }

  private saveStorage(storage: ErrorPatternStorage): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(storage))
    } catch (error) {
      console.error('Error saving error patterns:', error)
    }
  }

  /**
   * Record a new error instance
   */
  recordError(
    studentId: string,
    patternId: string,
    problemId: string,
    problemText: string,
    studentAttempt: string,
    correctApproach: string,
    context: {
      topic: string
      difficulty: string
      hintsUsed: number
      timeSpent: number
    }
  ): void {
    const storage = this.getStorage()

    const instance: StudentErrorInstance = {
      id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      studentId,
      patternId,
      problemId,
      timestamp: new Date().toISOString(),
      problemText,
      studentAttempt,
      correctApproach,
      context,
    }

    storage.instances.push(instance)
    this.saveStorage(storage)

    console.log(`Recorded error pattern ${patternId} for student ${studentId}`)
  }

  /**
   * Get all error instances for a student
   */
  getStudentErrors(studentId: string): StudentErrorInstance[] {
    const storage = this.getStorage()
    return storage.instances.filter((inst) => inst.studentId === studentId)
  }

  /**
   * Get summary of all error patterns for a student
   */
  getErrorPatternSummaries(studentId: string): ErrorPatternSummary[] {
    const instances = this.getStudentErrors(studentId)

    // Group by pattern
    const groupedByPattern = new Map<string, StudentErrorInstance[]>()
    instances.forEach((inst) => {
      const existing = groupedByPattern.get(inst.patternId) || []
      existing.push(inst)
      groupedByPattern.set(inst.patternId, existing)
    })

    const summaries: ErrorPatternSummary[] = []

    groupedByPattern.forEach((patternInstances, patternId) => {
      const pattern = COMMON_ERROR_PATTERNS.find((p) => p.id === patternId)
      if (!pattern) return

      // Sort by timestamp
      const sorted = [...patternInstances].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )

      const firstSeen = sorted[0].timestamp
      const lastSeen = sorted[sorted.length - 1].timestamp

      // Determine trend: check if errors are getting less frequent
      const recentCount = sorted.filter(
        (inst) => new Date(inst.timestamp).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
      ).length
      const olderCount = sorted.filter(
        (inst) => new Date(inst.timestamp).getTime() <= Date.now() - 7 * 24 * 60 * 60 * 1000
      ).length

      let trend: 'improving' | 'persistent' | 'worsening' = 'persistent'
      if (olderCount > 0) {
        if (recentCount === 0) trend = 'improving'
        else if (recentCount > olderCount) trend = 'worsening'
      }

      // Check if mastered (no errors in last 5 problems with this pattern's context)
      const recentProblems = sorted.slice(-5)
      const mastered = recentProblems.length >= 5 && recentCount === 0

      summaries.push({
        pattern,
        occurrences: sorted.length,
        firstSeen,
        lastSeen,
        instances: sorted,
        trend,
        mastered,
      })
    })

    // Sort by severity and occurrences
    return summaries.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 }
      const severityDiff = severityOrder[b.pattern.severity] - severityOrder[a.pattern.severity]
      if (severityDiff !== 0) return severityDiff
      return b.occurrences - a.occurrences
    })
  }

  /**
   * Generate insights for a student based on error patterns
   */
  getInsights(studentId: string): ErrorPatternInsight[] {
    const summaries = this.getErrorPatternSummaries(studentId)
    const insights: ErrorPatternInsight[] = []

    summaries.forEach((summary) => {
      // High-frequency errors
      if (summary.occurrences >= 3 && !summary.mastered) {
        insights.push({
          type: 'warning',
          message: `You've made this mistake ${summary.occurrences} times in different problems.`,
          patternId: summary.pattern.id,
          actionable: summary.pattern.remediation,
          relatedResources: summary.pattern.relatedConcepts,
        })
      }

      // Improving patterns
      if (summary.trend === 'improving' && summary.occurrences >= 2) {
        insights.push({
          type: 'celebration',
          message: `Great progress! You used to struggle with this but you're getting better.`,
          patternId: summary.pattern.id,
          actionable: 'Keep practicing problems in this area to solidify your understanding.',
        })
      }

      // Worsening patterns
      if (summary.trend === 'worsening') {
        insights.push({
          type: 'warning',
          message: `This mistake is becoming more frequent. Let's address it now.`,
          patternId: summary.pattern.id,
          actionable: summary.pattern.remediation,
          relatedResources: summary.pattern.relatedConcepts,
        })
      }

      // Mastered patterns
      if (summary.mastered) {
        insights.push({
          type: 'celebration',
          message: `Mastered! You haven't made this mistake in your last 5 problems.`,
          patternId: summary.pattern.id,
          actionable: 'You can now tackle more advanced problems in this area.',
        })
      }
    })

    return insights
  }

  /**
   * Get the most critical patterns to focus on
   */
  getCriticalPatterns(studentId: string): ErrorPatternSummary[] {
    const summaries = this.getErrorPatternSummaries(studentId)

    return summaries.filter(
      (summary) =>
        summary.pattern.severity === 'high' &&
        summary.occurrences >= 2 &&
        !summary.mastered &&
        summary.trend !== 'improving'
    )
  }

  /**
   * Check if student should see a warning for a specific pattern
   */
  shouldShowWarning(studentId: string, patternId: string): boolean {
    const summaries = this.getErrorPatternSummaries(studentId)
    const summary = summaries.find((s) => s.pattern.id === patternId)

    if (!summary) return false

    // Show warning if: high severity AND made 2+ times AND not mastered
    return summary.pattern.severity === 'high' && summary.occurrences >= 2 && !summary.mastered
  }

  /**
   * Clean up old error instances (older than 90 days)
   */
  cleanup(): void {
    const storage = this.getStorage()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)

    storage.instances = storage.instances.filter(
      (inst) => new Date(inst.timestamp).getTime() > cutoff.getTime()
    )

    storage.lastCleanup = new Date().toISOString()
    this.saveStorage(storage)
  }

  /**
   * Get statistics for dashboard
   */
  getStatistics(studentId: string) {
    const summaries = this.getErrorPatternSummaries(studentId)
    const instances = this.getStudentErrors(studentId)

    const totalErrors = instances.length
    const uniquePatterns = summaries.length
    const masteredPatterns = summaries.filter((s) => s.mastered).length
    const criticalPatterns = this.getCriticalPatterns(studentId).length

    // Most common error category
    const categoryCount = new Map<string, number>()
    summaries.forEach((s) => {
      const count = categoryCount.get(s.pattern.category) || 0
      categoryCount.set(s.pattern.category, count + s.occurrences)
    })

    let mostCommonCategory = ''
    let maxCount = 0
    categoryCount.forEach((count, category) => {
      if (count > maxCount) {
        maxCount = count
        mostCommonCategory = category
      }
    })

    return {
      totalErrors,
      uniquePatterns,
      masteredPatterns,
      criticalPatterns,
      mostCommonCategory,
      improvementRate:
        uniquePatterns > 0 ? Math.round((masteredPatterns / uniquePatterns) * 100) : 0,
    }
  }
}

export const errorPatternService = new ErrorPatternService()
