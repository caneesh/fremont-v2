/**
 * Today's Plan Service
 *
 * Manages the daily plan with localStorage persistence.
 * Key format: physiscaffold_today_plan:${userId}:${YYYY-MM-DD}
 */

import type { TodayPlan, PlanTask, PlanTaskType, TaskSuggestion } from '@/types/dashboard'
import { studyPathService } from '@/lib/studyPath/studyPathService'
import { getNotebookStats } from '@/lib/mistakeNotebook'
import { resolveNextAction, isNextAction } from './patternTrackResolveService'

const STORAGE_PREFIX = 'physiscaffold_today_plan'

/**
 * Get today's date key (YYYY-MM-DD)
 */
function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Get storage key for a user and date
 */
function getStorageKey(userId: string, dateKey: string): string {
  return `${STORAGE_PREFIX}:${userId}:${dateKey}`
}

/**
 * Generate a unique task ID
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Load today's plan for a user
 */
export function loadPlan(userId: string): TodayPlan | null {
  if (typeof window === 'undefined') return null

  const dateKey = getTodayKey()
  const key = getStorageKey(userId, dateKey)

  try {
    const stored = localStorage.getItem(key)
    if (!stored) return null

    const plan = JSON.parse(stored) as TodayPlan

    // Validate it's for today
    if (plan.dateKey !== dateKey) return null

    return plan
  } catch {
    return null
  }
}

/**
 * Save today's plan for a user
 */
export function savePlan(userId: string, plan: TodayPlan): void {
  if (typeof window === 'undefined') return

  const key = getStorageKey(userId, plan.dateKey)
  plan.updatedAt = new Date().toISOString()

  try {
    localStorage.setItem(key, JSON.stringify(plan))
  } catch (error) {
    console.error('[TodayPlanService] Failed to save plan:', error)
  }
}

/**
 * Create a new empty plan for today
 */
export function createPlan(userId: string): TodayPlan {
  const dateKey = getTodayKey()
  const now = new Date().toISOString()

  return {
    dateKey,
    userId,
    tasks: [],
    activeTaskIndex: 0,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Get or create today's plan
 */
export function getOrCreatePlan(userId: string): TodayPlan {
  const existing = loadPlan(userId)
  if (existing) return existing

  const newPlan = createPlan(userId)
  savePlan(userId, newPlan)
  return newPlan
}

/**
 * Add a task to the plan
 */
export function addTask(
  userId: string,
  task: Omit<PlanTask, 'id' | 'completed' | 'completedAt'>
): TodayPlan {
  const plan = getOrCreatePlan(userId)

  const newTask: PlanTask = {
    ...task,
    id: generateTaskId(),
    completed: false,
  }

  plan.tasks.push(newTask)
  savePlan(userId, plan)

  return plan
}

/**
 * Remove a task from the plan
 */
export function removeTask(userId: string, taskId: string): TodayPlan {
  const plan = getOrCreatePlan(userId)

  const taskIndex = plan.tasks.findIndex(t => t.id === taskId)
  if (taskIndex === -1) return plan

  plan.tasks.splice(taskIndex, 1)

  // Adjust active index if needed
  if (plan.activeTaskIndex >= plan.tasks.length) {
    plan.activeTaskIndex = Math.max(0, plan.tasks.length - 1)
  }

  savePlan(userId, plan)
  return plan
}

/**
 * Move a task up in the list
 */
export function moveTaskUp(userId: string, taskId: string): TodayPlan {
  const plan = getOrCreatePlan(userId)

  const taskIndex = plan.tasks.findIndex(t => t.id === taskId)
  if (taskIndex <= 0) return plan // Can't move up if first or not found

  // Swap with previous task
  const temp = plan.tasks[taskIndex - 1]
  plan.tasks[taskIndex - 1] = plan.tasks[taskIndex]
  plan.tasks[taskIndex] = temp

  // Adjust active index if affected
  if (plan.activeTaskIndex === taskIndex) {
    plan.activeTaskIndex = taskIndex - 1
  } else if (plan.activeTaskIndex === taskIndex - 1) {
    plan.activeTaskIndex = taskIndex
  }

  savePlan(userId, plan)
  return plan
}

/**
 * Move a task down in the list
 */
export function moveTaskDown(userId: string, taskId: string): TodayPlan {
  const plan = getOrCreatePlan(userId)

  const taskIndex = plan.tasks.findIndex(t => t.id === taskId)
  if (taskIndex === -1 || taskIndex >= plan.tasks.length - 1) return plan

  // Swap with next task
  const temp = plan.tasks[taskIndex + 1]
  plan.tasks[taskIndex + 1] = plan.tasks[taskIndex]
  plan.tasks[taskIndex] = temp

  // Adjust active index if affected
  if (plan.activeTaskIndex === taskIndex) {
    plan.activeTaskIndex = taskIndex + 1
  } else if (plan.activeTaskIndex === taskIndex + 1) {
    plan.activeTaskIndex = taskIndex
  }

  savePlan(userId, plan)
  return plan
}

/**
 * Set the active task index
 */
export function setActiveIndex(userId: string, index: number): TodayPlan {
  const plan = getOrCreatePlan(userId)

  if (index >= 0 && index < plan.tasks.length) {
    plan.activeTaskIndex = index
    savePlan(userId, plan)
  }

  return plan
}

/**
 * Mark a task as done and advance to next
 */
export function markTaskDone(userId: string, taskId: string): TodayPlan {
  const plan = getOrCreatePlan(userId)

  const task = plan.tasks.find(t => t.id === taskId)
  if (!task) return plan

  task.completed = true
  task.completedAt = new Date().toISOString()

  // Advance to next incomplete task
  const nextIncomplete = plan.tasks.findIndex(
    (t, i) => i > plan.activeTaskIndex && !t.completed
  )

  if (nextIncomplete !== -1) {
    plan.activeTaskIndex = nextIncomplete
  }

  savePlan(userId, plan)
  return plan
}

/**
 * Get the current active task
 */
export function getActiveTask(userId: string): PlanTask | null {
  const plan = loadPlan(userId)
  if (!plan || plan.tasks.length === 0) return null

  return plan.tasks[plan.activeTaskIndex] || null
}

/**
 * Get route for a task
 */
export function getTaskRoute(task: PlanTask): string {
  switch (task.type) {
    case 'study_path_question':
      return `/solve?question=${task.questionId}`
    case 'review_due':
      return '/mistake-notebook?review=true'
    case 'pattern_track_continue':
      if (task.trackId && task.patternId) {
        return `/study-path/v2/track/${task.trackId}?pattern=${task.patternId}`
      }
      if (task.trackId) {
        return `/study-path/v2/track/${task.trackId}`
      }
      return '/pattern-track'
    case 'custom_solve':
      return '/solve'
    default:
      return '/solve'
  }
}

/**
 * Get task suggestions based on current progress
 */
export function getTaskSuggestions(userId: string): TaskSuggestion[] {
  const suggestions: TaskSuggestion[] = []

  // Check for due reviews
  try {
    const mistakeStats = getNotebookStats()
    if (mistakeStats.dueToday > 0) {
      suggestions.push({
        type: 'review_due',
        title: `Review ${mistakeStats.dueToday} due cards`,
        description: `You have ${mistakeStats.dueToday} mistake cards due for review today`,
        priority: 'high',
      })
    }
  } catch {
    // Mistake notebook not available
  }

  // Check for pattern track continuation
  try {
    const nextAction = resolveNextAction(userId)
    if (isNextAction(nextAction)) {
      suggestions.push({
        type: 'pattern_track_continue',
        title: nextAction.description,
        description: `${nextAction.trackName} - ${nextAction.progress.trackCompletionPercent}% complete`,
        priority: 'high',
        trackId: nextAction.trackId,
        patternId: nextAction.patternId,
      })
    }
  } catch {
    // Pattern track not available
  }

  // Get recommended questions from study path
  try {
    const recommended = studyPathService.getRecommendedQuestions(3)
    for (const question of recommended) {
      suggestions.push({
        type: 'study_path_question',
        title: question.title || 'Practice Question',
        description: `${question.difficulty} - ${question.topic}`,
        priority: 'medium',
        questionId: question.id,
        topicId: question.topic,
      })
    }
  } catch {
    // Study path not available
  }

  // Always suggest custom solve as fallback
  suggestions.push({
    type: 'custom_solve',
    title: 'Solve Custom Problem',
    description: 'Enter any physics problem to solve',
    priority: 'low',
  })

  return suggestions
}

/**
 * Create a task from a suggestion
 */
export function createTaskFromSuggestion(suggestion: TaskSuggestion): Omit<PlanTask, 'id' | 'completed' | 'completedAt'> {
  return {
    type: suggestion.type,
    title: suggestion.title,
    description: suggestion.description,
    questionId: suggestion.questionId,
    topicId: suggestion.topicId,
    trackId: suggestion.trackId,
    patternId: suggestion.patternId,
  }
}

/**
 * Clean up old plans (older than 7 days)
 */
export function cleanupOldPlans(userId: string): void {
  if (typeof window === 'undefined') return

  const today = new Date()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const cutoffKey = sevenDaysAgo.toISOString().split('T')[0]

  // Find and remove old plans
  const keysToRemove: string[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(`${STORAGE_PREFIX}:${userId}:`)) {
      const dateKey = key.split(':').pop()
      if (dateKey && dateKey < cutoffKey) {
        keysToRemove.push(key)
      }
    }
  }

  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }
}
