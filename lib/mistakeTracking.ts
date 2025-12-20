import type { MistakePattern, ConceptMistakeStats, MistakeWarning } from '@/types/mistakes'
import { checkLocalStorageAvailable, hasLocalStorageSpace } from './utils'

const STORAGE_KEY = 'physiscaffold_mistake_patterns'
const MAX_PATTERNS_PER_CONCEPT = 10

class MistakeTrackingService {
  /**
   * Record a mistake pattern from a problem attempt
   */
  recordPattern(pattern: MistakePattern): void {
    const { available } = checkLocalStorageAvailable()
    if (!available) {
      console.warn('localStorage not available - mistake tracking disabled')
      return
    }

    if (!hasLocalStorageSpace()) {
      console.warn('localStorage low on space - cleaning old patterns')
      this.cleanOldPatterns()
    }

    try {
      const patterns = this.getAllPatterns()

      // Add new pattern
      if (!patterns[pattern.conceptId]) {
        patterns[pattern.conceptId] = []
      }

      patterns[pattern.conceptId].push(pattern)

      // Keep only recent patterns (last 10 per concept)
      if (patterns[pattern.conceptId].length > MAX_PATTERNS_PER_CONCEPT) {
        patterns[pattern.conceptId] = patterns[pattern.conceptId]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, MAX_PATTERNS_PER_CONCEPT)
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns))
    } catch (error) {
      console.error('Failed to record mistake pattern:', error)
    }
  }

  /**
   * Get all mistake patterns
   */
  getAllPatterns(): Record<string, MistakePattern[]> {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : {}
    } catch (error) {
      console.error('Failed to load mistake patterns:', error)
      return {}
    }
  }

  /**
   * Get patterns for a specific concept
   */
  getConceptPatterns(conceptId: string): MistakePattern[] {
    const patterns = this.getAllPatterns()
    return patterns[conceptId] || []
  }

  /**
   * Calculate statistics for a concept
   */
  getConceptStats(conceptId: string, conceptName: string): ConceptMistakeStats | null {
    const patterns = this.getConceptPatterns(conceptId)
    if (patterns.length === 0) return null

    const struggledAttempts = patterns.filter(p => p.maxHintLevelUsed >= 4).length
    const avgHintLevel = patterns.reduce((sum, p) => sum + p.maxHintLevelUsed, 0) / patterns.length

    // Extract common mistakes from patterns
    const mistakes = patterns
      .map(p => p.commonMistake)
      .filter(m => m !== undefined && m !== null) as string[]

    // Simple frequency counting for common patterns
    const mistakeFreq: Record<string, number> = {}
    mistakes.forEach(m => {
      const key = m.toLowerCase().substring(0, 50) // First 50 chars as key
      mistakeFreq[key] = (mistakeFreq[key] || 0) + 1
    })

    const commonPatterns = Object.entries(mistakeFreq)
      .filter(([_, count]) => count >= 2) // Appeared at least twice
      .sort((a, b) => b[1] - a[1])
      .map(([pattern]) => pattern)
      .slice(0, 3) // Top 3

    return {
      conceptId,
      conceptName,
      totalAttempts: patterns.length,
      struggledAttempts,
      averageHintLevel: avgHintLevel,
      commonPatterns,
      lastSeen: patterns[0]?.timestamp || new Date().toISOString(),
    }
  }

  /**
   * Generate warnings based on current problem and past patterns
   */
  generateWarnings(
    currentConcepts: Array<{ id: string; name: string }>,
    problemType: string
  ): MistakeWarning[] {
    const warnings: MistakeWarning[] = []

    currentConcepts.forEach(concept => {
      const stats = this.getConceptStats(concept.id, concept.name)
      if (!stats) return

      // High struggle rate (>50% of attempts needed Level 4-5)
      const struggleRate = stats.struggledAttempts / stats.totalAttempts

      if (struggleRate > 0.5 && stats.totalAttempts >= 2) {
        const severity: 'low' | 'medium' | 'high' =
          struggleRate > 0.75 ? 'high' : struggleRate > 0.6 ? 'medium' : 'low'

        const suggestions: string[] = []

        if (stats.averageHintLevel >= 4) {
          suggestions.push('Review the concept definition before diving into the problem')
          suggestions.push('Try sketching the problem setup before writing equations')
        }

        if (stats.commonPatterns.length > 0) {
          suggestions.push(`Common mistake: Pay attention to ${stats.commonPatterns[0]}`)
        }

        // Recent struggle (within last 7 days)
        const daysSinceLastSeen =
          (Date.now() - new Date(stats.lastSeen).getTime()) / (1000 * 60 * 60 * 24)

        if (daysSinceLastSeen < 7) {
          suggestions.push('You struggled with this concept recently - take it slow')
        }

        warnings.push({
          message: `Caution: You've needed advanced hints (Level ${Math.round(stats.averageHintLevel)}) on ${concept.name} problems ${stats.struggledAttempts}/${stats.totalAttempts} times.`,
          severity,
          relatedConcepts: [concept.name],
          suggestions,
        })
      }
    })

    return warnings
  }

  /**
   * Clean old patterns (keep last 30 days)
   */
  private cleanOldPatterns(): void {
    try {
      const patterns = this.getAllPatterns()
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)

      Object.keys(patterns).forEach(conceptId => {
        patterns[conceptId] = patterns[conceptId].filter(p =>
          new Date(p.timestamp).getTime() > thirtyDaysAgo
        )

        if (patterns[conceptId].length === 0) {
          delete patterns[conceptId]
        }
      })

      localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns))
    } catch (error) {
      console.error('Failed to clean old patterns:', error)
    }
  }

  /**
   * Clear all patterns (for testing or user request)
   */
  clearAllPatterns(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('Failed to clear patterns:', error)
    }
  }
}

export const mistakeTrackingService = new MistakeTrackingService()
