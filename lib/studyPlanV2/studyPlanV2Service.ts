/**
 * Study Plan v2 Service
 *
 * High-level service for Study Plan v2 operations.
 * Coordinates between repository, scheduler, and UI.
 */

import type {
  DailyPlan,
  UserPatternState,
  StepAttemptEvent,
  Pattern,
  MetaSkill,
  PatternTrack,
  ProblemV2,
  ConfidenceMeterEntry,
  ErrorWatchlistEntry,
  PatternTrackProgress,
} from '@/types/studyPlanV2'

import { studyPlanV2Repository, type StudyPlanV2Repository } from './repository'
import {
  getOrGenerateTodaysPlan,
  markPlanItemCompleted,
  updateMasteryOnAttempt,
  recordMistakeEvent,
  createInitialPatternState,
} from './scheduler'

// ============================================
// Main Service Class
// ============================================

export class StudyPlanV2Service {
  private repo: StudyPlanV2Repository

  constructor(repo: StudyPlanV2Repository = studyPlanV2Repository) {
    this.repo = repo
  }

  // ============================================
  // Daily Plan Operations
  // ============================================

  /**
   * Get today's plan, generating if needed
   */
  getTodaysPlan(userId: string): DailyPlan {
    return getOrGenerateTodaysPlan(userId, this.repo)
  }

  /**
   * Mark a plan item as completed
   */
  completePlanItem(userId: string, itemId: string): DailyPlan | null {
    const today = new Date().toISOString().split('T')[0]
    return markPlanItemCompleted(userId, today, itemId, this.repo)
  }

  // ============================================
  // Pattern Operations
  // ============================================

  /**
   * Get all patterns
   */
  getAllPatterns(): Pattern[] {
    return this.repo.content.getAllPatterns()
  }

  /**
   * Get pattern by ID
   */
  getPatternById(patternId: string): Pattern | null {
    return this.repo.content.getPatternById(patternId)
  }

  /**
   * Get user's state for a pattern
   */
  getPatternState(userId: string, patternId: string): UserPatternState {
    const state = this.repo.user.getUserPatternState(userId, patternId)
    if (state) return state
    return createInitialPatternState(userId, patternId)
  }

  /**
   * Get all pattern states for user
   */
  getAllPatternStates(userId: string): UserPatternState[] {
    const patterns = this.repo.content.getAllPatterns()
    return patterns.map(p => this.getPatternState(userId, p.id))
  }

  /**
   * Mark a pattern session as completed (learn, practice, or drill)
   */
  markPatternSessionComplete(
    userId: string,
    patternId: string,
    sessionType: 'learn' | 'practice' | 'drill'
  ): void {
    let state = this.repo.user.getUserPatternState(userId, patternId)
    if (!state) {
      state = createInitialPatternState(userId, patternId)
    }

    if (sessionType === 'learn' && !state.learnCompleted) {
      state.learnCompleted = true
      state.learnCompletedAt = new Date().toISOString()
    } else if (sessionType === 'practice' && !state.guidedPracticeCompleted) {
      state.guidedPracticeCompleted = true
      state.guidedPracticeCompletedAt = new Date().toISOString()
    } else if (sessionType === 'drill') {
      state.drillsAttempted += 1
    }

    this.repo.user.saveUserPatternState(state)
  }

  // ============================================
  // Pattern Track Operations
  // ============================================

  /**
   * Get all pattern tracks
   */
  getAllPatternTracks(): PatternTrack[] {
    return this.repo.content.getAllPatternTracks()
  }

  /**
   * Get pattern track by ID
   */
  getPatternTrackById(trackId: string): PatternTrack | null {
    return this.repo.content.getPatternTrackById(trackId)
  }

  /**
   * Get current active track for user
   */
  getCurrentTrack(userId: string): PatternTrack | null {
    const trackId = this.repo.user.getCurrentTrackId(userId)
    if (!trackId) {
      // Default to first track
      const tracks = this.repo.content.getAllPatternTracks()
      return tracks[0] || null
    }
    return this.repo.content.getPatternTrackById(trackId)
  }

  /**
   * Set current track for user
   */
  setCurrentTrack(userId: string, trackId: string): void {
    this.repo.user.setCurrentTrackId(userId, trackId)
  }

  /**
   * Get progress for a pattern track
   */
  getPatternTrackProgress(userId: string, trackId: string): PatternTrackProgress | null {
    const track = this.repo.content.getPatternTrackById(trackId)
    if (!track) return null

    const patternStates = track.patternIds.map(pid =>
      this.getPatternState(userId, pid)
    )

    const completedPatterns = patternStates.filter(
      s => s.learnCompleted && s.guidedPracticeCompleted
    ).length

    const totalMastery = patternStates.reduce((sum, s) => sum + s.mastery, 0)
    const overallMastery = patternStates.length > 0
      ? totalMastery / patternStates.length
      : 0

    // Find current pattern (first incomplete)
    let currentPatternIndex = track.patternIds.length
    for (let i = 0; i < track.patternIds.length; i++) {
      const state = patternStates[i]
      if (!state.learnCompleted || !state.guidedPracticeCompleted) {
        currentPatternIndex = i
        break
      }
    }

    const currentTrackId = this.repo.user.getCurrentTrackId(userId)

    return {
      trackId: track.id,
      trackName: track.name,
      currentPatternIndex,
      totalPatterns: track.patternIds.length,
      completedPatterns,
      overallMastery,
      isActive: currentTrackId === track.id,
    }
  }

  // ============================================
  // Meta-Skill Operations
  // ============================================

  /**
   * Get all meta-skills
   */
  getAllMetaSkills(): MetaSkill[] {
    return this.repo.content.getAllMetaSkills()
  }

  /**
   * Get meta-skill by ID
   */
  getMetaSkillById(metaSkillId: string): MetaSkill | null {
    return this.repo.content.getMetaSkillById(metaSkillId)
  }

  // ============================================
  // Problem Operations
  // ============================================

  /**
   * Get problem by ID
   */
  getProblemById(problemId: string): ProblemV2 | null {
    return this.repo.content.getProblemById(problemId)
  }

  /**
   * Get problems for a session
   */
  getProblemsForSession(problemIds: string[]): ProblemV2[] {
    return problemIds
      .map(id => this.repo.content.getProblemById(id))
      .filter((p): p is ProblemV2 => p !== null)
  }

  /**
   * Get problems by pattern
   */
  getProblemsByPattern(patternId: string): ProblemV2[] {
    return this.repo.content.getProblemsByPatternId(patternId)
  }

  // ============================================
  // Mastery & Telemetry
  // ============================================

  /**
   * Record step attempt and update mastery
   */
  recordStepAttempt(
    userId: string,
    problemId: string,
    stepIndex: number,
    isCorrect: boolean,
    hintCount: number,
    usedReveal: boolean,
    timeSpentSeconds: number,
    confidenceRating?: 'low' | 'medium' | 'high'
  ): void {
    const problem = this.repo.content.getProblemById(problemId)
    if (!problem) return

    const event: StepAttemptEvent = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId,
      problemId,
      stepIndex,
      attemptedAt: new Date().toISOString(),
      isCorrect,
      hintCount,
      usedReveal,
      enteredReadOnlyMode: usedReveal,
      timeSpentSeconds,
      confidenceRating,
    }

    // Save step attempt
    this.repo.user.addStepAttempt(event)

    // Update mastery for each pattern tag
    for (const patternId of problem.patternTags) {
      updateMasteryOnAttempt(userId, patternId, [event], this.repo)
    }

    // Record mistake if incorrect or revealed
    if (!isCorrect || usedReveal) {
      // Try to detect mistake type from trap tags
      const trapTag = problem.trapTags[0]
      if (trapTag) {
        recordMistakeEvent(userId, problemId, stepIndex, trapTag, {
          hintLevel: hintCount,
          usedReveal,
          timeSpentSeconds,
        }, this.repo)
      }
    }
  }

  // ============================================
  // Dashboard Data
  // ============================================

  /**
   * Get confidence meter entries for dashboard
   */
  getConfidenceMeter(userId: string): ConfidenceMeterEntry[] {
    const patterns = this.repo.content.getAllPatterns()
    const states = this.repo.user.getUserPatternStates(userId)
    const stateMap = new Map(states.map(s => [s.patternId, s]))

    return patterns.map(pattern => {
      const state = stateMap.get(pattern.id)
      const mastery = state?.mastery ?? 0
      const lastSeen = state?.lastSeenAt ?? new Date().toISOString()

      // Determine trend (simplified)
      let trend: 'improving' | 'stable' | 'declining' = 'stable'
      if (state) {
        if (state.recentFailCount > 2) trend = 'declining'
        else if (mastery > 0.6 && state.recentFailCount === 0) trend = 'improving'
      }

      return {
        patternId: pattern.id,
        patternName: pattern.name,
        mastery,
        trend,
        lastSeen,
        isWeak: mastery < 0.4,
      }
    }).sort((a, b) => a.mastery - b.mastery) // Weakest first
  }

  /**
   * Get error watchlist entries for dashboard
   */
  getErrorWatchlist(userId: string): ErrorWatchlistEntry[] {
    const events = this.repo.user.getUserMistakeEvents(userId, 14)

    // Group by mistake type
    const grouped = new Map<string, { count: number; lastOccurred: string }>()
    for (const event of events) {
      const existing = grouped.get(event.mistakeTypeId)
      if (existing) {
        existing.count++
        if (event.occurredAt > existing.lastOccurred) {
          existing.lastOccurred = event.occurredAt
        }
      } else {
        grouped.set(event.mistakeTypeId, {
          count: 1,
          lastOccurred: event.occurredAt,
        })
      }
    }

    // Convert to entries
    const entries: ErrorWatchlistEntry[] = []
    for (const [mistakeTypeId, data] of grouped) {
      const mistakeType = this.repo.content.getMistakeTypeById(mistakeTypeId)
      if (!mistakeType) continue

      const pattern = this.repo.content.getPatternById(mistakeType.relatedPatternId)

      entries.push({
        mistakeTypeId,
        mistakeTypeName: mistakeType.name,
        occurrenceCount: data.count,
        lastOccurred: data.lastOccurred,
        relatedPatternName: pattern?.name || 'Unknown',
        suggestedAction: mistakeType.remediation,
      })
    }

    // Sort by count descending
    return entries.sort((a, b) => b.occurrenceCount - a.occurrenceCount)
  }

  /**
   * Get overall stats for dashboard
   */
  getDashboardStats(userId: string): {
    patternsLearned: number
    totalPatterns: number
    averageMastery: number
    mistakesLastWeek: number
    streakDays: number
  } {
    const patterns = this.repo.content.getAllPatterns()
    const states = this.repo.user.getUserPatternStates(userId)

    const patternsLearned = states.filter(s => s.learnCompleted).length
    const totalMastery = states.reduce((sum, s) => sum + s.mastery, 0)
    const averageMastery = states.length > 0 ? totalMastery / states.length : 0

    const events = this.repo.user.getUserMistakeEvents(userId, 7)
    const mistakesLastWeek = events.length

    // Calculate streak (simplified)
    let streakDays = 0
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(checkDate.getDate() - i)
      const dateStr = checkDate.toISOString().split('T')[0]
      const plan = this.repo.user.getDailyPlan(userId, dateStr)
      if (plan && plan.completionPercent > 0) {
        streakDays++
      } else if (i > 0) {
        break
      }
    }

    return {
      patternsLearned,
      totalPatterns: patterns.length,
      averageMastery,
      mistakesLastWeek,
      streakDays,
    }
  }
}

// ============================================
// Export Singleton
// ============================================

export const studyPlanV2Service = new StudyPlanV2Service()
