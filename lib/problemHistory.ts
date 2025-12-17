import type { ProblemAttempt, ProblemProgress, ProblemStatus, HistoryFilters } from '@/types/history'

const STORAGE_KEY = 'physiscaffold_problem_attempts'

/**
 * LocalStorage service for managing problem attempts
 * Design allows easy migration to server-side storage later
 */
class ProblemHistoryService {
  /**
   * Get all problem attempts from storage
   */
  private getAllAttempts(): ProblemAttempt[] {
    if (typeof window === 'undefined') return []

    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error('Failed to load problem attempts:', error)
      return []
    }
  }

  /**
   * Save all attempts to storage
   */
  private saveAllAttempts(attempts: ProblemAttempt[]): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts))
    } catch (error) {
      console.error('Failed to save problem attempts:', error)
    }
  }

  /**
   * Generate a unique ID for a problem attempt
   */
  private generateId(): string {
    return `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get or create an attempt for a problem
   */
  getAttempt(problemId: string): ProblemAttempt | null {
    const attempts = this.getAllAttempts()
    return attempts.find(a => a.problemId === problemId) || null
  }

  /**
   * Save draft solution for a problem
   */
  saveDraft(
    problemId: string,
    problemTitle: string,
    progress: ProblemProgress
  ): ProblemAttempt {
    const attempts = this.getAllAttempts()
    const existingIndex = attempts.findIndex(a => a.problemId === problemId)
    const now = new Date().toISOString()

    const attempt: ProblemAttempt = existingIndex >= 0
      ? {
          ...attempts[existingIndex],
          draftSolution: JSON.stringify(progress),
          updatedAt: now,
          lastOpenedAt: now,
        }
      : {
          id: this.generateId(),
          problemId,
          problemTitle,
          status: 'IN_PROGRESS',
          reviewFlag: false,
          draftSolution: JSON.stringify(progress),
          createdAt: now,
          updatedAt: now,
          lastOpenedAt: now,
        }

    if (existingIndex >= 0) {
      attempts[existingIndex] = attempt
    } else {
      attempts.push(attempt)
    }

    this.saveAllAttempts(attempts)
    return attempt
  }

  /**
   * Mark a problem as solved
   */
  markSolved(
    problemId: string,
    problemTitle: string,
    finalProgress: ProblemProgress
  ): ProblemAttempt {
    const attempts = this.getAllAttempts()
    const existingIndex = attempts.findIndex(a => a.problemId === problemId)
    const now = new Date().toISOString()

    const attempt: ProblemAttempt = existingIndex >= 0
      ? {
          ...attempts[existingIndex],
          status: 'SOLVED',
          finalSolution: JSON.stringify(finalProgress),
          draftSolution: undefined, // Clear draft when solved
          updatedAt: now,
        }
      : {
          id: this.generateId(),
          problemId,
          problemTitle,
          status: 'SOLVED',
          reviewFlag: false,
          finalSolution: JSON.stringify(finalProgress),
          createdAt: now,
          updatedAt: now,
        }

    if (existingIndex >= 0) {
      attempts[existingIndex] = attempt
    } else {
      attempts.push(attempt)
    }

    this.saveAllAttempts(attempts)
    return attempt
  }

  /**
   * Toggle review flag for a problem
   */
  toggleReview(problemId: string): ProblemAttempt | null {
    const attempts = this.getAllAttempts()
    const index = attempts.findIndex(a => a.problemId === problemId)

    if (index < 0) return null

    attempts[index] = {
      ...attempts[index],
      reviewFlag: !attempts[index].reviewFlag,
      updatedAt: new Date().toISOString(),
    }

    this.saveAllAttempts(attempts)
    return attempts[index]
  }

  /**
   * Update last opened timestamp
   */
  updateLastOpened(problemId: string): void {
    const attempts = this.getAllAttempts()
    const index = attempts.findIndex(a => a.problemId === problemId)

    if (index >= 0) {
      attempts[index].lastOpenedAt = new Date().toISOString()
      this.saveAllAttempts(attempts)
    }
  }

  /**
   * Get problem history with filters
   */
  getHistory(filters: HistoryFilters = {}): {
    attempts: ProblemAttempt[]
    total: number
    page: number
    totalPages: number
  } {
    let attempts = this.getAllAttempts()

    // Apply filters
    if (filters.status) {
      attempts = attempts.filter(a => a.status === filters.status)
    }

    if (filters.review !== undefined) {
      attempts = attempts.filter(a => a.reviewFlag === filters.review)
    }

    if (filters.query) {
      const query = filters.query.toLowerCase()
      attempts = attempts.filter(a =>
        a.problemTitle.toLowerCase().includes(query) ||
        a.problemId.toLowerCase().includes(query)
      )
    }

    // Sort by last updated (most recent first)
    attempts.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    // Pagination
    const page = filters.page || 1
    const limit = filters.limit || 10
    const total = attempts.length
    const totalPages = Math.ceil(total / limit)
    const startIndex = (page - 1) * limit
    const paginatedAttempts = attempts.slice(startIndex, startIndex + limit)

    return {
      attempts: paginatedAttempts,
      total,
      page,
      totalPages,
    }
  }

  /**
   * Delete a problem attempt
   */
  deleteAttempt(problemId: string): boolean {
    const attempts = this.getAllAttempts()
    const filtered = attempts.filter(a => a.problemId !== problemId)

    if (filtered.length === attempts.length) {
      return false // Nothing was deleted
    }

    this.saveAllAttempts(filtered)
    return true
  }

  /**
   * Load draft progress for a problem
   */
  loadDraft(problemId: string): ProblemProgress | null {
    const attempt = this.getAttempt(problemId)

    if (!attempt?.draftSolution) return null

    try {
      return JSON.parse(attempt.draftSolution)
    } catch (error) {
      console.error('Failed to parse draft solution:', error)
      return null
    }
  }

  /**
   * Load final solution for a solved problem
   */
  loadFinalSolution(problemId: string): ProblemProgress | null {
    const attempt = this.getAttempt(problemId)

    if (!attempt?.finalSolution) return null

    try {
      return JSON.parse(attempt.finalSolution)
    } catch (error) {
      console.error('Failed to parse final solution:', error)
      return null
    }
  }
}

// Export singleton instance
export const problemHistoryService = new ProblemHistoryService()
