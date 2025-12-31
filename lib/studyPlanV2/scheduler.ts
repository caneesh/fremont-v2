/**
 * Study Plan v2 Scheduler / Planner Domain Module
 *
 * Core logic for:
 * - Daily plan generation
 * - Mastery updates
 * - SRS (Spaced Repetition System)
 * - Error recycling
 */

import {
  type DailyPlan,
  type DailyPlanItem,
  type UserPatternState,
  type UserMetaSkillState,
  type UserMistakeEvent,
  type StepAttemptEvent,
  type Pattern,
  type MetaSkill,
  type PatternTrack,
  type ProblemV2,
  type MistakeType,
  type SessionType,
  MASTERY_CONSTANTS,
  SRS_CONSTANTS,
  isPatternWeak,
  isPatternDue,
} from '@/types/studyPlanV2'

import {
  studyPlanV2Repository,
  type StudyPlanV2Repository,
} from './repository'

// ============================================
// Seeded Random for Deterministic Plans
// ============================================

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed / 0x7fffffff
  }
}

function dateToSeed(date: string): number {
  // Convert YYYY-MM-DD to a number
  const parts = date.split('-')
  return parseInt(parts[0]) * 10000 + parseInt(parts[1]) * 100 + parseInt(parts[2])
}

function shuffleArray<T>(array: T[], random: () => number): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// ============================================
// Mastery & SRS Functions
// ============================================

/**
 * Calculate new mastery score based on step attempt
 */
export function calculateMasteryDelta(
  isCorrect: boolean,
  hintCount: number,
  usedReveal: boolean
): number {
  if (usedReveal) {
    return MASTERY_CONSTANTS.REVEAL_PENALTY
  }

  if (!isCorrect) {
    return MASTERY_CONSTANTS.INCORRECT_DELTA
  }

  // Correct answer
  if (hintCount === 0) {
    return MASTERY_CONSTANTS.CORRECT_NO_HINT_DELTA
  }

  // Correct with hints - reduced delta
  return MASTERY_CONSTANTS.CORRECT_WITH_HINT_DELTA
}

/**
 * Calculate next review interval based on mastery and fail count
 */
export function calculateNextReviewInterval(
  mastery: number,
  recentFailCount: number
): number {
  const { BASE_INTERVAL_DAYS, INTERVAL_MASTERY_FACTOR } = MASTERY_CONSTANTS
  const { MAX_INTERVAL_DAYS, MIN_INTERVAL_DAYS, FAIL_COUNT_INTERVAL_DIVISOR } = SRS_CONSTANTS

  // interval = base * (1 + mastery * factor) / (1 + recentFailCount)
  let interval = BASE_INTERVAL_DAYS * (1 + mastery * INTERVAL_MASTERY_FACTOR)
  interval = interval / (1 + recentFailCount * FAIL_COUNT_INTERVAL_DIVISOR)

  // Clamp to bounds
  interval = Math.max(MIN_INTERVAL_DAYS, Math.min(MAX_INTERVAL_DAYS, interval))

  return interval
}

/**
 * Calculate next review date
 */
export function calculateNextReviewDate(intervalDays: number): string {
  const now = new Date()
  now.setDate(now.getDate() + intervalDays)
  return now.toISOString()
}

/**
 * Decay the recent fail count over time
 */
export function decayFailCount(
  currentCount: number,
  daysSinceLastSeen: number
): number {
  const decay = daysSinceLastSeen * MASTERY_CONSTANTS.FAIL_COUNT_DECAY_RATE
  return Math.max(0, currentCount - decay)
}

// ============================================
// Update Functions
// ============================================

/**
 * Update mastery on a step attempt
 */
export function updateMasteryOnAttempt(
  userId: string,
  patternId: string,
  stepEvents: StepAttemptEvent[],
  repo: StudyPlanV2Repository = studyPlanV2Repository
): UserPatternState {
  // Get or create pattern state
  let state = repo.user.getUserPatternState(userId, patternId)

  if (!state) {
    state = createInitialPatternState(userId, patternId)
  }

  // Calculate aggregate result from step events
  const aggregateCorrect = stepEvents.every(e => e.isCorrect)
  const totalHints = stepEvents.reduce((sum, e) => sum + e.hintCount, 0)
  const anyReveal = stepEvents.some(e => e.usedReveal || e.enteredReadOnlyMode)

  // Calculate mastery delta
  const delta = calculateMasteryDelta(aggregateCorrect, totalHints, anyReveal)

  // Update mastery with clamping
  state.mastery = Math.max(
    MASTERY_CONSTANTS.MIN_MASTERY,
    Math.min(MASTERY_CONSTANTS.MAX_MASTERY, state.mastery + delta)
  )

  // Update fail count
  if (!aggregateCorrect || anyReveal) {
    state.recentFailCount += 1
  } else if (totalHints === 0) {
    // Perfect answer - decay fail count faster
    state.recentFailCount = Math.max(0, state.recentFailCount - 0.5)
  }

  // Update stats
  state.totalAttempts += 1
  if (aggregateCorrect && totalHints === 0 && !anyReveal) {
    state.totalCorrect += 1
  }

  // Calculate next review
  const interval = calculateNextReviewInterval(state.mastery, state.recentFailCount)
  state.reviewDueAt = calculateNextReviewDate(interval)
  state.lastSeenAt = new Date().toISOString()

  // Save state
  repo.user.saveUserPatternState(state)

  return state
}

/**
 * Record a mistake event for error recycling
 */
export function recordMistakeEvent(
  userId: string,
  problemId: string,
  stepIndex: number,
  mistakeTypeId: string,
  context: UserMistakeEvent['context'],
  repo: StudyPlanV2Repository = studyPlanV2Repository
): UserMistakeEvent {
  const event: UserMistakeEvent = {
    id: `me-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    userId,
    mistakeTypeId,
    problemId,
    stepIndex,
    occurredAt: new Date().toISOString(),
    context,
    recycled: false,
  }

  repo.user.addUserMistakeEvent(event)
  return event
}

/**
 * Create initial pattern state for a new user-pattern combination
 */
export function createInitialPatternState(
  userId: string,
  patternId: string
): UserPatternState {
  const now = new Date().toISOString()
  return {
    patternId,
    userId,
    mastery: 0,
    lastSeenAt: now,
    reviewDueAt: now, // Due immediately
    recentFailCount: 0,
    totalAttempts: 0,
    totalCorrect: 0,
    learnCompleted: false,
    guidedPracticeCompleted: false,
    drillsAttempted: 0,
  }
}

/**
 * Create initial meta-skill state
 */
export function createInitialMetaSkillState(
  userId: string,
  metaSkillId: string
): UserMetaSkillState {
  const now = new Date().toISOString()
  return {
    metaSkillId,
    userId,
    mastery: 0,
    lastPracticedAt: now,
    nextPracticeDueAt: now,
    cycleCount: 0,
  }
}

// ============================================
// Daily Plan Generation
// ============================================

interface PlanGenerationContext {
  userId: string
  date: string
  random: () => number
  repo: StudyPlanV2Repository
  patternStates: Map<string, UserPatternState>
  metaSkillStates: Map<string, UserMetaSkillState>
  mistakeEvents: UserMistakeEvent[]
  currentTrackId: string | null
  lastMetaSkillDate: string | null
}

/**
 * Generate the daily plan for a user
 */
export function generateDailyPlan(
  userId: string,
  date: string,
  repo: StudyPlanV2Repository = studyPlanV2Repository
): DailyPlan {
  const random = seededRandom(dateToSeed(date) + userId.charCodeAt(0))

  // Load all user state
  const patternStatesArray = repo.user.getUserPatternStates(userId)
  const patternStates = new Map(patternStatesArray.map(s => [s.patternId, s]))

  const metaSkillStatesArray = repo.user.getUserMetaSkillStates(userId)
  const metaSkillStates = new Map(metaSkillStatesArray.map(s => [s.metaSkillId, s]))

  const mistakeEvents = repo.user.getUserMistakeEvents(userId, 14)
  const currentTrackId = repo.user.getCurrentTrackId(userId)
  const lastMetaSkillDate = repo.user.getLastMetaSkillDate(userId)

  const ctx: PlanGenerationContext = {
    userId,
    date,
    random,
    repo,
    patternStates,
    metaSkillStates,
    mistakeEvents,
    currentTrackId,
    lastMetaSkillDate,
  }

  // Generate plan items
  const items: DailyPlanItem[] = []
  let priority = 0

  // 1. Choose meta-skill (every 2-3 days)
  const metaSkillItem = selectMetaSkillItem(ctx, priority++)
  if (metaSkillItem) {
    items.push(metaSkillItem)
  }

  // 2. Choose pattern track in focus
  const { track, focusedPattern } = selectPatternTrackFocus(ctx)

  // 3. Add focused pattern practice
  if (focusedPattern) {
    const patternItem = createPatternPracticeItem(ctx, focusedPattern, priority++)
    items.push(patternItem)
  }

  // 4. Add 2-3 mixed practice problems from weak patterns
  const mixedItems = selectMixedPracticeItems(ctx, focusedPattern?.id, priority)
  priority += mixedItems.length
  items.push(...mixedItems)

  // 5. Add error recycling item if needed
  const errorItem = selectErrorRecyclingItem(ctx, priority++)
  if (errorItem) {
    items.push(errorItem)
  }

  // Determine topic exposure
  const topicExposure = extractTopicExposure(items, repo)

  // Generate thinking objective
  const thinkingObjective = selectTodayThinkingObjective(
    focusedPattern,
    getMostFrequentMistakeType(mistakeEvents, repo)
  )

  // Create the plan
  const plan: DailyPlan = {
    id: `plan-${userId}-${date}`,
    userId,
    date,
    generatedAt: new Date().toISOString(),
    thinkingObjective,
    focusedPatternTrackId: track?.id || 'track-mechanics-fundamentals',
    focusedPatternId: focusedPattern?.id || 'pat-force-decomposition',
    topicExposure,
    items,
    completionPercent: 0,
    version: 1,
  }

  // Save the plan
  repo.user.saveDailyPlan(plan)

  return plan
}

/**
 * Select meta-skill item for today (every 2-3 days)
 */
function selectMetaSkillItem(
  ctx: PlanGenerationContext,
  priority: number
): DailyPlanItem | null {
  const { date, lastMetaSkillDate, random, repo } = ctx

  // Check if we should include a meta-skill today
  let shouldInclude = false

  if (!lastMetaSkillDate) {
    shouldInclude = true
  } else {
    const daysSince = daysBetween(lastMetaSkillDate, date)
    // Include every 2-3 days, or sooner if there are related mistakes
    shouldInclude = daysSince >= 2 || (daysSince >= 1 && random() < 0.4)
  }

  if (!shouldInclude) {
    return null
  }

  // Select a meta-skill (rotate through, prioritize weak ones)
  const allMetaSkills = repo.content.getAllMetaSkills()
  const metaSkillStates = ctx.metaSkillStates

  // Score each meta-skill
  const scored = allMetaSkills.map(ms => {
    const state = metaSkillStates.get(ms.id)
    const mastery = state?.mastery ?? 0
    const cycleCount = state?.cycleCount ?? 0

    // Lower mastery = higher priority
    // Lower cycle count = higher priority (haven't seen recently)
    const score = (1 - mastery) * 2 + (1 / (cycleCount + 1))
    return { metaSkill: ms, score }
  })

  // Sort by score descending and add randomness
  scored.sort((a, b) => b.score - a.score)
  const shuffled = shuffleArray(scored.slice(0, 3), random)
  const selected = shuffled[0].metaSkill

  // Get related problems
  const relatedPatterns = repo.content.getPatternsByMetaSkillId(selected.id)
  const problems: string[] = []
  for (const pattern of relatedPatterns.slice(0, 2)) {
    const patternProblems = repo.content.getProblemsByPatternId(pattern.id)
    const learnProblems = patternProblems.filter(p => p.problemType === 'learn')
    if (learnProblems.length > 0) {
      problems.push(learnProblems[Math.floor(random() * learnProblems.length)].id)
    }
  }

  return {
    id: `item-ms-${Date.now()}`,
    type: 'learn',
    title: `Meta-Skill: ${selected.name}`,
    description: selected.description,
    metaSkillId: selected.id,
    problemIds: problems,
    estimatedMinutes: 15,
    priority,
    isErrorRecycling: false,
    completed: false,
  }
}

/**
 * Select the pattern track in focus (weekly cadence)
 */
function selectPatternTrackFocus(
  ctx: PlanGenerationContext
): { track: PatternTrack | null; focusedPattern: Pattern | null } {
  const { repo, currentTrackId, patternStates, random } = ctx

  const allTracks = repo.content.getAllPatternTracks()

  // If no current track, start with first
  let track: PatternTrack | null = null
  if (!currentTrackId) {
    track = allTracks[0] || null
    if (track) {
      ctx.repo.user.setCurrentTrackId(ctx.userId, track.id)
    }
  } else {
    track = repo.content.getPatternTrackById(currentTrackId)
  }

  if (!track) {
    return { track: null, focusedPattern: null }
  }

  // Find the current pattern in the track
  // Prioritize patterns that are weak or due
  let focusedPattern: Pattern | null = null
  let bestScore = -Infinity

  for (const patternId of track.patternIds) {
    const pattern = repo.content.getPatternById(patternId)
    if (!pattern) continue

    const state = patternStates.get(patternId)
    const mastery = state?.mastery ?? 0
    const isDue = state ? isPatternDue(state) : true
    const isWeak = state ? isPatternWeak(state) : true

    // Score: prefer weak and due patterns
    let score = 0
    if (isDue) score += 2
    if (isWeak) score += 3
    score += (1 - mastery) * 2
    score += random() * 0.5 // Add some randomness

    if (score > bestScore) {
      bestScore = score
      focusedPattern = pattern
    }
  }

  return { track, focusedPattern }
}

/**
 * Create a practice item for a pattern
 */
function createPatternPracticeItem(
  ctx: PlanGenerationContext,
  pattern: Pattern,
  priority: number
): DailyPlanItem {
  const { repo, random, patternStates } = ctx

  const state = patternStates.get(pattern.id)
  const learnCompleted = state?.learnCompleted ?? false

  // Determine session type based on progress
  let type: SessionType = 'learn'
  if (learnCompleted && (state?.guidedPracticeCompleted ?? false)) {
    type = 'timed_drill'
  } else if (learnCompleted) {
    type = 'guided_practice'
  }

  // Select problems
  const patternProblems = repo.content.getProblemsByPatternId(pattern.id)
  const filteredProblems = patternProblems.filter(p => {
    if (type === 'learn') return p.problemType === 'learn' || p.difficulty <= 2
    if (type === 'guided_practice') return p.problemType === 'practice'
    return p.problemType === 'drill' || p.problemType === 'practice'
  })

  const shuffled = shuffleArray(filteredProblems, random)
  const problemIds = shuffled.slice(0, type === 'timed_drill' ? 5 : 2).map(p => p.id)

  const typeLabels: Record<SessionType, string> = {
    learn: 'Learn',
    guided_practice: 'Guided Practice',
    timed_drill: 'Timed Drill',
    review_mistakes: 'Review Mistakes',
  }

  return {
    id: `item-pat-${pattern.id}-${Date.now()}`,
    type,
    title: `${typeLabels[type]}: ${pattern.name}`,
    description: pattern.summary,
    patternId: pattern.id,
    problemIds,
    estimatedMinutes: type === 'learn' ? 10 : type === 'guided_practice' ? 15 : 8,
    priority,
    isErrorRecycling: false,
    completed: false,
  }
}

/**
 * Select 2-3 mixed practice items from weak patterns
 */
function selectMixedPracticeItems(
  ctx: PlanGenerationContext,
  excludePatternId: string | undefined,
  startPriority: number
): DailyPlanItem[] {
  const { repo, patternStates, random } = ctx
  const items: DailyPlanItem[] = []

  // Get all patterns, score by weakness/due-ness
  const allPatterns = repo.content.getAllPatterns()
  const scored = allPatterns
    .filter(p => p.id !== excludePatternId)
    .map(pattern => {
      const state = patternStates.get(pattern.id)
      const mastery = state?.mastery ?? 0
      const recentFailCount = state?.recentFailCount ?? 0
      const isDue = state ? isPatternDue(state) : true

      // Score: due + low mastery + recent fails
      let score = 0
      if (isDue) score += 3
      score += (1 - mastery) * 2
      score += recentFailCount * 0.5
      score += random() * 0.3

      return { pattern, score }
    })
    .sort((a, b) => b.score - a.score)

  // Select top 2-3 patterns
  const topicsUsed = new Set<string>()
  let count = 0
  const maxItems = 2 + (random() < 0.5 ? 1 : 0)

  for (const { pattern } of scored) {
    if (count >= maxItems) break

    // Enforce topic diversity
    const patternTopics = pattern.topicIds
    const alreadyUsed = patternTopics.some(t => topicsUsed.has(t))
    if (alreadyUsed && count > 0 && random() < 0.7) continue

    // Get practice problems
    const problems = repo.content.getProblemsByPatternId(pattern.id)
    const practiceProblems = problems.filter(p =>
      p.problemType === 'practice' || p.problemType === 'drill'
    )

    if (practiceProblems.length === 0) continue

    const shuffled = shuffleArray(practiceProblems, random)
    const selected = shuffled.slice(0, 1)

    items.push({
      id: `item-mix-${pattern.id}-${Date.now()}-${count}`,
      type: 'guided_practice',
      title: `Practice: ${pattern.name}`,
      description: `Mixed practice to reinforce ${pattern.name}`,
      patternId: pattern.id,
      problemIds: selected.map(p => p.id),
      estimatedMinutes: 10,
      priority: startPriority + count,
      isErrorRecycling: false,
      completed: false,
    })

    for (const t of patternTopics) topicsUsed.add(t)
    count++
  }

  return items
}

/**
 * Select an error recycling item
 */
function selectErrorRecyclingItem(
  ctx: PlanGenerationContext,
  priority: number
): DailyPlanItem | null {
  const { repo, mistakeEvents, random } = ctx

  if (mistakeEvents.length === 0) {
    return null
  }

  // Group mistakes by type and count
  const mistakeCounts = new Map<string, { count: number; lastOccurred: string }>()
  for (const event of mistakeEvents) {
    if (event.recycled) continue

    const existing = mistakeCounts.get(event.mistakeTypeId)
    if (existing) {
      existing.count++
      if (event.occurredAt > existing.lastOccurred) {
        existing.lastOccurred = event.occurredAt
      }
    } else {
      mistakeCounts.set(event.mistakeTypeId, {
        count: 1,
        lastOccurred: event.occurredAt,
      })
    }
  }

  if (mistakeCounts.size === 0) {
    return null
  }

  // Score: frequency * recency weight
  const now = new Date()
  const scored = Array.from(mistakeCounts.entries()).map(([mistakeTypeId, data]) => {
    const recencyDays = (now.getTime() - new Date(data.lastOccurred).getTime()) / (1000 * 60 * 60 * 24)
    const recencyWeight = 1 / (1 + recencyDays)
    const score = data.count * recencyWeight
    return { mistakeTypeId, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const topMistakeTypeId = scored[0].mistakeTypeId

  // Get micro-drills for this mistake type
  const drills = repo.content.getMicroDrillsForMistakeType(topMistakeTypeId)
  const mistakeType = repo.content.getMistakeTypeById(topMistakeTypeId)

  if (drills.length === 0) {
    // Fall back to related pattern problems
    if (mistakeType) {
      const patternProblems = repo.content.getProblemsByPatternId(mistakeType.relatedPatternId)
      const shuffled = shuffleArray(patternProblems.slice(0, 5), random)
      if (shuffled.length > 0) {
        return {
          id: `item-err-${topMistakeTypeId}-${Date.now()}`,
          type: 'review_mistakes',
          title: `Fix: ${mistakeType.name}`,
          description: mistakeType.remediation,
          patternId: mistakeType.relatedPatternId,
          mistakeTypeId: topMistakeTypeId,
          problemIds: shuffled.slice(0, 2).map(p => p.id),
          estimatedMinutes: 8,
          priority,
          isErrorRecycling: true,
          completed: false,
        }
      }
    }
    return null
  }

  const shuffled = shuffleArray(drills, random)

  return {
    id: `item-err-${topMistakeTypeId}-${Date.now()}`,
    type: 'review_mistakes',
    title: `Fix: ${mistakeType?.name || 'Common Mistake'}`,
    description: mistakeType?.remediation || 'Practice to fix this recurring mistake',
    patternId: mistakeType?.relatedPatternId,
    mistakeTypeId: topMistakeTypeId,
    problemIds: shuffled.slice(0, 3).map(p => p.id),
    estimatedMinutes: 5,
    priority,
    isErrorRecycling: true,
    completed: false,
  }
}

/**
 * Extract unique topics from plan items
 */
function extractTopicExposure(
  items: DailyPlanItem[],
  repo: StudyPlanV2Repository
): string[] {
  const topics = new Set<string>()

  for (const item of items) {
    for (const problemId of item.problemIds) {
      const problem = repo.content.getProblemById(problemId)
      if (problem) {
        topics.add(problem.topicId)
      }
    }
  }

  return Array.from(topics)
}

/**
 * Get most frequent mistake type
 */
function getMostFrequentMistakeType(
  events: UserMistakeEvent[],
  repo: StudyPlanV2Repository
): MistakeType | null {
  const counts = new Map<string, number>()
  for (const event of events) {
    counts.set(event.mistakeTypeId, (counts.get(event.mistakeTypeId) || 0) + 1)
  }

  let maxId: string | null = null
  let maxCount = 0
  for (const [id, count] of counts) {
    if (count > maxCount) {
      maxCount = count
      maxId = id
    }
  }

  return maxId ? repo.content.getMistakeTypeById(maxId) : null
}

/**
 * Generate today's thinking objective
 */
export function selectTodayThinkingObjective(
  focusedPattern: Pattern | null,
  topMistakeType: MistakeType | null
): string {
  // Templates based on context
  if (topMistakeType && focusedPattern) {
    return `Focus on ${focusedPattern.name} while avoiding ${topMistakeType.name} errors.`
  }

  if (focusedPattern) {
    const templates = [
      `Master the art of ${focusedPattern.name} through deliberate practice.`,
      `Today's goal: Apply ${focusedPattern.name} confidently in new problems.`,
      `Build fluency with ${focusedPattern.name} by recognizing patterns quickly.`,
    ]
    return templates[Math.floor(Math.random() * templates.length)]
  }

  if (topMistakeType) {
    return `Work on eliminating ${topMistakeType.name} from your problem-solving.`
  }

  return 'Build strong physics intuition through pattern-based practice.'
}

// ============================================
// Utility Functions
// ============================================

function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  const diff = Math.abs(d2.getTime() - d1.getTime())
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// ============================================
// Plan Update Functions
// ============================================

/**
 * Mark a plan item as completed
 */
export function markPlanItemCompleted(
  userId: string,
  date: string,
  itemId: string,
  repo: StudyPlanV2Repository = studyPlanV2Repository
): DailyPlan | null {
  const plan = repo.user.getDailyPlan(userId, date)
  if (!plan) return null

  const item = plan.items.find(i => i.id === itemId)
  if (!item) return null

  item.completed = true
  item.completedAt = new Date().toISOString()

  // Update completion percentage
  const completedCount = plan.items.filter(i => i.completed).length
  plan.completionPercent = Math.round((completedCount / plan.items.length) * 100)

  // Update meta-skill date if applicable
  if (item.metaSkillId) {
    repo.user.setLastMetaSkillDate(userId, date)
  }

  // Update pattern state if applicable
  if (item.patternId) {
    const state = repo.user.getUserPatternState(userId, item.patternId)
    if (state) {
      if (item.type === 'learn') {
        state.learnCompleted = true
        state.learnCompletedAt = new Date().toISOString()
      } else if (item.type === 'guided_practice') {
        state.guidedPracticeCompleted = true
        state.guidedPracticeCompletedAt = new Date().toISOString()
      } else if (item.type === 'timed_drill') {
        state.drillsAttempted += 1
      }
      repo.user.saveUserPatternState(state)
    }
  }

  repo.user.saveDailyPlan(plan)
  return plan
}

/**
 * Get or generate today's plan
 */
export function getOrGenerateTodaysPlan(
  userId: string,
  repo: StudyPlanV2Repository = studyPlanV2Repository
): DailyPlan {
  const today = new Date().toISOString().split('T')[0]
  const existing = repo.user.getDailyPlan(userId, today)

  if (existing) {
    return existing
  }

  return generateDailyPlan(userId, today, repo)
}
