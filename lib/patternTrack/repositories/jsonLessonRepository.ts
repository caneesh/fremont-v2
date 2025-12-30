/**
 * JSON-based Lesson Repository Implementation
 *
 * Loads lessons from static JSON files.
 */

import type {
  Lesson,
  CreateLesson,
  UpdateLesson,
  LessonWithProgress,
} from '../schema'
import type { ILessonRepository } from './interfaces'
import { JsonPatternRepository } from './jsonPatternRepository'
import { LocalProgressRepository } from './localProgressRepository'

let lessonsCache: Lesson[] | null = null

/**
 * Load lessons from JSON file
 */
async function loadLessons(): Promise<Lesson[]> {
  if (lessonsCache) {
    return lessonsCache
  }

  try {
    const data = await import('../data/lessons.json')
    lessonsCache = data.default as Lesson[]
    return lessonsCache
  } catch (error) {
    console.error('Failed to load lessons:', error)
    return []
  }
}

/**
 * Clear cache
 */
export function clearLessonCache(): void {
  lessonsCache = null
}

export class JsonLessonRepository implements ILessonRepository {
  private patternRepo = new JsonPatternRepository()
  private progressRepo = new LocalProgressRepository()

  async getById(id: string): Promise<Lesson | null> {
    const lessons = await loadLessons()
    return lessons.find(l => l.id === id) || null
  }

  async getAll(): Promise<Lesson[]> {
    const lessons = await loadLessons()
    return lessons.sort((a, b) => a.display_order - b.display_order)
  }

  async getByPatternId(patternId: string): Promise<Lesson[]> {
    const lessons = await loadLessons()
    return lessons.filter(l => l.pattern_ids.includes(patternId))
  }

  async getPrerequisites(lessonId: string): Promise<Lesson[]> {
    const lessons = await loadLessons()
    const lesson = lessons.find(l => l.id === lessonId)
    if (!lesson) return []

    const prereqIds = new Set(lesson.prerequisite_lesson_ids)
    return lessons.filter(l => prereqIds.has(l.id))
  }

  async getNextLessons(lessonId: string): Promise<Lesson[]> {
    const lessons = await loadLessons()
    return lessons.filter(l => l.prerequisite_lesson_ids.includes(lessonId))
  }

  async getByIdWithPatterns(id: string): Promise<LessonWithProgress | null> {
    const lesson = await this.getById(id)
    if (!lesson) return null

    const patterns = await this.patternRepo.getByIds(lesson.pattern_ids)

    return {
      ...lesson,
      patterns,
    }
  }

  async getAllWithProgress(userId: string): Promise<LessonWithProgress[]> {
    const lessons = await this.getAll()
    const allProgress = await this.progressRepo.getAllLessonProgress(userId)
    const progressMap = new Map(allProgress.map(p => [p.lesson_id, p]))

    const results: LessonWithProgress[] = []

    for (const lesson of lessons) {
      const patterns = await this.patternRepo.getByIds(lesson.pattern_ids)
      results.push({
        ...lesson,
        progress: progressMap.get(lesson.id),
        patterns,
      })
    }

    return results
  }

  async getCount(): Promise<number> {
    const lessons = await loadLessons()
    return lessons.length
  }

  // Write operations
  async create(data: CreateLesson): Promise<Lesson> {
    const now = new Date().toISOString()
    const lesson: Lesson = {
      ...data,
      id: `lesson_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      created_at: now,
      updated_at: now,
    }

    const lessons = await loadLessons()
    lessons.push(lesson)

    return lesson
  }

  async update(id: string, data: UpdateLesson): Promise<Lesson | null> {
    const lessons = await loadLessons()
    const index = lessons.findIndex(l => l.id === id)
    if (index === -1) return null

    const updated: Lesson = {
      ...lessons[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    lessons[index] = updated

    return updated
  }

  async delete(id: string): Promise<boolean> {
    const lessons = await loadLessons()
    const index = lessons.findIndex(l => l.id === id)
    if (index === -1) return false

    lessons.splice(index, 1)
    return true
  }
}
