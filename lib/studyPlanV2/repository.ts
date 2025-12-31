/**
 * Study Plan v2 Repository Layer
 *
 * Abstract repository interfaces and in-memory implementation.
 * Designed for easy swap to database later.
 */

import type {
  MetaSkill,
  Pattern,
  PatternTrack,
  ProblemV2,
  MistakeType,
  UserPatternState,
  UserMetaSkillState,
  UserMistakeEvent,
  DailyPlan,
  StepAttemptEvent,
  STUDY_PLAN_V2_STORAGE_KEYS,
} from '@/types/studyPlanV2'

// ============================================
// Repository Interfaces
// ============================================

/**
 * Content catalog repository (read-only, from seed data)
 */
export interface IContentCatalogRepository {
  // Meta-skills
  getAllMetaSkills(): MetaSkill[]
  getMetaSkillById(id: string): MetaSkill | null

  // Patterns
  getAllPatterns(): Pattern[]
  getPatternById(id: string): Pattern | null
  getPatternsByMetaSkillId(metaSkillId: string): Pattern[]
  getPatternsByTopicId(topicId: string): Pattern[]

  // Pattern Tracks
  getAllPatternTracks(): PatternTrack[]
  getPatternTrackById(id: string): PatternTrack | null

  // Problems
  getAllProblems(): ProblemV2[]
  getProblemById(id: string): ProblemV2 | null
  getProblemsByPatternId(patternId: string): ProblemV2[]
  getProblemsByTopicId(topicId: string): ProblemV2[]
  getMicroDrillsForMistakeType(mistakeTypeId: string): ProblemV2[]

  // Mistake Types
  getAllMistakeTypes(): MistakeType[]
  getMistakeTypeById(id: string): MistakeType | null
  getMistakeTypesByPatternId(patternId: string): MistakeType[]
}

/**
 * User state repository (read-write, persisted)
 */
export interface IUserStateRepository {
  // Pattern states
  getUserPatternStates(userId: string): UserPatternState[]
  getUserPatternState(userId: string, patternId: string): UserPatternState | null
  saveUserPatternState(state: UserPatternState): void
  saveUserPatternStates(states: UserPatternState[]): void

  // Meta-skill states
  getUserMetaSkillStates(userId: string): UserMetaSkillState[]
  getUserMetaSkillState(userId: string, metaSkillId: string): UserMetaSkillState | null
  saveUserMetaSkillState(state: UserMetaSkillState): void

  // Mistake events
  getUserMistakeEvents(userId: string, daysSince?: number): UserMistakeEvent[]
  addUserMistakeEvent(event: UserMistakeEvent): void
  markMistakeRecycled(eventId: string): void

  // Daily plans
  getDailyPlan(userId: string, date: string): DailyPlan | null
  saveDailyPlan(plan: DailyPlan): void

  // Step attempts
  addStepAttempt(event: StepAttemptEvent): void
  getStepAttempts(userId: string, problemId?: string): StepAttemptEvent[]

  // Track state
  getCurrentTrackId(userId: string): string | null
  setCurrentTrackId(userId: string, trackId: string): void
  getLastMetaSkillDate(userId: string): string | null
  setLastMetaSkillDate(userId: string, date: string): void
}

// ============================================
// In-Memory Implementation with localStorage
// ============================================

// Import seed data
import metaSkillsData from '@/data/studyPlanV2/metaSkills.json'
import patternsData from '@/data/studyPlanV2/patterns.json'
import patternTracksData from '@/data/studyPlanV2/patternTracks.json'
import problemsData from '@/data/studyPlanV2/problemsV2.json'
import mistakeTypesData from '@/data/studyPlanV2/mistakeTypes.json'

// Storage keys
const STORAGE_KEYS = {
  USER_PATTERN_STATES: 'physiscaffold_v2_pattern_states',
  USER_METASKILL_STATES: 'physiscaffold_v2_metaskill_states',
  USER_MISTAKE_EVENTS: 'physiscaffold_v2_mistake_events',
  DAILY_PLANS: 'physiscaffold_v2_daily_plans',
  STEP_ATTEMPTS: 'physiscaffold_v2_step_attempts',
  CURRENT_TRACK_ID: 'physiscaffold_v2_current_track',
  LAST_METASKILL_DATE: 'physiscaffold_v2_last_metaskill_date',
} as const

/**
 * In-memory content catalog repository
 */
class InMemoryContentCatalogRepository implements IContentCatalogRepository {
  private metaSkills: MetaSkill[]
  private patterns: Pattern[]
  private patternTracks: PatternTrack[]
  private problems: ProblemV2[]
  private mistakeTypes: MistakeType[]

  // Indexes for fast lookup
  private patternsByMetaSkill: Map<string, Pattern[]>
  private patternsByTopic: Map<string, Pattern[]>
  private problemsByPattern: Map<string, ProblemV2[]>
  private problemsByTopic: Map<string, ProblemV2[]>
  private drillsByMistakeType: Map<string, ProblemV2[]>
  private mistakeTypesByPattern: Map<string, MistakeType[]>

  constructor() {
    // Load from seed data
    this.metaSkills = metaSkillsData.metaSkills as MetaSkill[]
    this.patterns = patternsData.patterns as Pattern[]
    this.patternTracks = patternTracksData.patternTracks as PatternTrack[]
    this.problems = problemsData.problems as ProblemV2[]
    this.mistakeTypes = mistakeTypesData.mistakeTypes as MistakeType[]

    // Build indexes
    this.patternsByMetaSkill = new Map()
    this.patternsByTopic = new Map()
    this.problemsByPattern = new Map()
    this.problemsByTopic = new Map()
    this.drillsByMistakeType = new Map()
    this.mistakeTypesByPattern = new Map()

    this.buildIndexes()
  }

  private buildIndexes() {
    // Index patterns by meta-skill
    for (const pattern of this.patterns) {
      for (const metaSkillId of pattern.metaSkillIds) {
        const existing = this.patternsByMetaSkill.get(metaSkillId) || []
        existing.push(pattern)
        this.patternsByMetaSkill.set(metaSkillId, existing)
      }

      // Index patterns by topic
      for (const topicId of pattern.topicIds) {
        const existing = this.patternsByTopic.get(topicId) || []
        existing.push(pattern)
        this.patternsByTopic.set(topicId, existing)
      }
    }

    // Index problems by pattern and topic
    for (const problem of this.problems) {
      for (const patternId of problem.patternTags) {
        const existing = this.problemsByPattern.get(patternId) || []
        existing.push(problem)
        this.problemsByPattern.set(patternId, existing)
      }

      const topicProblems = this.problemsByTopic.get(problem.topicId) || []
      topicProblems.push(problem)
      this.problemsByTopic.set(problem.topicId, topicProblems)

      // Index micro-drills by mistake type
      if (problem.isMicroDrill && problem.targetsMistakeTypes) {
        for (const mistakeTypeId of problem.targetsMistakeTypes) {
          const existing = this.drillsByMistakeType.get(mistakeTypeId) || []
          existing.push(problem)
          this.drillsByMistakeType.set(mistakeTypeId, existing)
        }
      }
    }

    // Index mistake types by pattern
    for (const mt of this.mistakeTypes) {
      const existing = this.mistakeTypesByPattern.get(mt.relatedPatternId) || []
      existing.push(mt)
      this.mistakeTypesByPattern.set(mt.relatedPatternId, existing)
    }
  }

  getAllMetaSkills(): MetaSkill[] {
    return this.metaSkills
  }

  getMetaSkillById(id: string): MetaSkill | null {
    return this.metaSkills.find(m => m.id === id) || null
  }

  getAllPatterns(): Pattern[] {
    return this.patterns
  }

  getPatternById(id: string): Pattern | null {
    return this.patterns.find(p => p.id === id) || null
  }

  getPatternsByMetaSkillId(metaSkillId: string): Pattern[] {
    return this.patternsByMetaSkill.get(metaSkillId) || []
  }

  getPatternsByTopicId(topicId: string): Pattern[] {
    return this.patternsByTopic.get(topicId) || []
  }

  getAllPatternTracks(): PatternTrack[] {
    return this.patternTracks
  }

  getPatternTrackById(id: string): PatternTrack | null {
    return this.patternTracks.find(t => t.id === id) || null
  }

  getAllProblems(): ProblemV2[] {
    return this.problems
  }

  getProblemById(id: string): ProblemV2 | null {
    return this.problems.find(p => p.id === id) || null
  }

  getProblemsByPatternId(patternId: string): ProblemV2[] {
    return this.problemsByPattern.get(patternId) || []
  }

  getProblemsByTopicId(topicId: string): ProblemV2[] {
    return this.problemsByTopic.get(topicId) || []
  }

  getMicroDrillsForMistakeType(mistakeTypeId: string): ProblemV2[] {
    return this.drillsByMistakeType.get(mistakeTypeId) || []
  }

  getAllMistakeTypes(): MistakeType[] {
    return this.mistakeTypes
  }

  getMistakeTypeById(id: string): MistakeType | null {
    return this.mistakeTypes.find(m => m.id === id) || null
  }

  getMistakeTypesByPatternId(patternId: string): MistakeType[] {
    return this.mistakeTypesByPattern.get(patternId) || []
  }
}

/**
 * In-memory user state repository with localStorage persistence
 */
class InMemoryUserStateRepository implements IUserStateRepository {
  private getStorageItem<T>(key: string): T | null {
    if (typeof window === 'undefined') return null
    try {
      const data = localStorage.getItem(key)
      return data ? JSON.parse(data) : null
    } catch (error) {
      console.error(`Failed to load ${key}:`, error)
      return null
    }
  }

  private setStorageItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(`Failed to save ${key}:`, error)
    }
  }

  // Pattern states
  getUserPatternStates(userId: string): UserPatternState[] {
    const allStates = this.getStorageItem<Record<string, UserPatternState[]>>(
      STORAGE_KEYS.USER_PATTERN_STATES
    ) || {}
    return allStates[userId] || []
  }

  getUserPatternState(userId: string, patternId: string): UserPatternState | null {
    const states = this.getUserPatternStates(userId)
    return states.find(s => s.patternId === patternId) || null
  }

  saveUserPatternState(state: UserPatternState): void {
    const allStates = this.getStorageItem<Record<string, UserPatternState[]>>(
      STORAGE_KEYS.USER_PATTERN_STATES
    ) || {}

    const userStates = allStates[state.userId] || []
    const existingIndex = userStates.findIndex(s => s.patternId === state.patternId)

    if (existingIndex >= 0) {
      userStates[existingIndex] = state
    } else {
      userStates.push(state)
    }

    allStates[state.userId] = userStates
    this.setStorageItem(STORAGE_KEYS.USER_PATTERN_STATES, allStates)
  }

  saveUserPatternStates(states: UserPatternState[]): void {
    for (const state of states) {
      this.saveUserPatternState(state)
    }
  }

  // Meta-skill states
  getUserMetaSkillStates(userId: string): UserMetaSkillState[] {
    const allStates = this.getStorageItem<Record<string, UserMetaSkillState[]>>(
      STORAGE_KEYS.USER_METASKILL_STATES
    ) || {}
    return allStates[userId] || []
  }

  getUserMetaSkillState(userId: string, metaSkillId: string): UserMetaSkillState | null {
    const states = this.getUserMetaSkillStates(userId)
    return states.find(s => s.metaSkillId === metaSkillId) || null
  }

  saveUserMetaSkillState(state: UserMetaSkillState): void {
    const allStates = this.getStorageItem<Record<string, UserMetaSkillState[]>>(
      STORAGE_KEYS.USER_METASKILL_STATES
    ) || {}

    const userStates = allStates[state.userId] || []
    const existingIndex = userStates.findIndex(s => s.metaSkillId === state.metaSkillId)

    if (existingIndex >= 0) {
      userStates[existingIndex] = state
    } else {
      userStates.push(state)
    }

    allStates[state.userId] = userStates
    this.setStorageItem(STORAGE_KEYS.USER_METASKILL_STATES, allStates)
  }

  // Mistake events
  getUserMistakeEvents(userId: string, daysSince: number = 14): UserMistakeEvent[] {
    const allEvents = this.getStorageItem<Record<string, UserMistakeEvent[]>>(
      STORAGE_KEYS.USER_MISTAKE_EVENTS
    ) || {}

    const userEvents = allEvents[userId] || []
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysSince)
    const cutoffIso = cutoffDate.toISOString()

    return userEvents.filter(e => e.occurredAt >= cutoffIso)
  }

  addUserMistakeEvent(event: UserMistakeEvent): void {
    const allEvents = this.getStorageItem<Record<string, UserMistakeEvent[]>>(
      STORAGE_KEYS.USER_MISTAKE_EVENTS
    ) || {}

    const userEvents = allEvents[event.userId] || []
    userEvents.push(event)

    // Keep only last 100 events per user
    if (userEvents.length > 100) {
      userEvents.shift()
    }

    allEvents[event.userId] = userEvents
    this.setStorageItem(STORAGE_KEYS.USER_MISTAKE_EVENTS, allEvents)
  }

  markMistakeRecycled(eventId: string): void {
    const allEvents = this.getStorageItem<Record<string, UserMistakeEvent[]>>(
      STORAGE_KEYS.USER_MISTAKE_EVENTS
    ) || {}

    for (const userId in allEvents) {
      const userEvents = allEvents[userId]
      const event = userEvents.find(e => e.id === eventId)
      if (event) {
        event.recycled = true
        event.recycledAt = new Date().toISOString()
        break
      }
    }

    this.setStorageItem(STORAGE_KEYS.USER_MISTAKE_EVENTS, allEvents)
  }

  // Daily plans
  getDailyPlan(userId: string, date: string): DailyPlan | null {
    const allPlans = this.getStorageItem<Record<string, Record<string, DailyPlan>>>(
      STORAGE_KEYS.DAILY_PLANS
    ) || {}

    return allPlans[userId]?.[date] || null
  }

  saveDailyPlan(plan: DailyPlan): void {
    const allPlans = this.getStorageItem<Record<string, Record<string, DailyPlan>>>(
      STORAGE_KEYS.DAILY_PLANS
    ) || {}

    if (!allPlans[plan.userId]) {
      allPlans[plan.userId] = {}
    }

    allPlans[plan.userId][plan.date] = plan

    // Keep only last 30 days of plans per user
    const userPlans = allPlans[plan.userId]
    const dates = Object.keys(userPlans).sort().reverse()
    if (dates.length > 30) {
      for (let i = 30; i < dates.length; i++) {
        delete userPlans[dates[i]]
      }
    }

    this.setStorageItem(STORAGE_KEYS.DAILY_PLANS, allPlans)
  }

  // Step attempts
  addStepAttempt(event: StepAttemptEvent): void {
    const allAttempts = this.getStorageItem<Record<string, StepAttemptEvent[]>>(
      STORAGE_KEYS.STEP_ATTEMPTS
    ) || {}

    const userAttempts = allAttempts[event.userId] || []
    userAttempts.push(event)

    // Keep only last 500 attempts per user
    if (userAttempts.length > 500) {
      userAttempts.shift()
    }

    allAttempts[event.userId] = userAttempts
    this.setStorageItem(STORAGE_KEYS.STEP_ATTEMPTS, allAttempts)
  }

  getStepAttempts(userId: string, problemId?: string): StepAttemptEvent[] {
    const allAttempts = this.getStorageItem<Record<string, StepAttemptEvent[]>>(
      STORAGE_KEYS.STEP_ATTEMPTS
    ) || {}

    const userAttempts = allAttempts[userId] || []

    if (problemId) {
      return userAttempts.filter(a => a.problemId === problemId)
    }

    return userAttempts
  }

  // Track state
  getCurrentTrackId(userId: string): string | null {
    const allTracks = this.getStorageItem<Record<string, string>>(
      STORAGE_KEYS.CURRENT_TRACK_ID
    ) || {}
    return allTracks[userId] || null
  }

  setCurrentTrackId(userId: string, trackId: string): void {
    const allTracks = this.getStorageItem<Record<string, string>>(
      STORAGE_KEYS.CURRENT_TRACK_ID
    ) || {}
    allTracks[userId] = trackId
    this.setStorageItem(STORAGE_KEYS.CURRENT_TRACK_ID, allTracks)
  }

  getLastMetaSkillDate(userId: string): string | null {
    const allDates = this.getStorageItem<Record<string, string>>(
      STORAGE_KEYS.LAST_METASKILL_DATE
    ) || {}
    return allDates[userId] || null
  }

  setLastMetaSkillDate(userId: string, date: string): void {
    const allDates = this.getStorageItem<Record<string, string>>(
      STORAGE_KEYS.LAST_METASKILL_DATE
    ) || {}
    allDates[userId] = date
    this.setStorageItem(STORAGE_KEYS.LAST_METASKILL_DATE, allDates)
  }
}

// ============================================
// Export Singletons
// ============================================

export const contentCatalogRepository = new InMemoryContentCatalogRepository()
export const userStateRepository = new InMemoryUserStateRepository()

// ============================================
// Combined Repository Facade
// ============================================

export class StudyPlanV2Repository {
  readonly content: IContentCatalogRepository
  readonly user: IUserStateRepository

  constructor(
    contentRepo: IContentCatalogRepository = contentCatalogRepository,
    userRepo: IUserStateRepository = userStateRepository
  ) {
    this.content = contentRepo
    this.user = userRepo
  }
}

export const studyPlanV2Repository = new StudyPlanV2Repository()
