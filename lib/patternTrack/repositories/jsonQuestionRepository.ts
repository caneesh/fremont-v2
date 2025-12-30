/**
 * JSON-based Question Repository Implementation
 *
 * Loads questions from static JSON files with efficient filtering.
 * Supports lazy loading and pagination for 5000+ questions.
 */

import type {
  Question,
  QuestionFilter,
  PaginationOptions,
  PaginatedResult,
  CreateQuestion,
  UpdateQuestion,
  QuestionWithPatterns,
} from '../schema'
import type { IQuestionRepository } from './interfaces'
import { JsonPatternRepository } from './jsonPatternRepository'

// Questions data cache with lazy loading by category
const questionsByCategory: Map<string, Question[]> = new Map()
let allQuestionsLoaded = false
let questionsCache: Question[] = []

// Index for efficient lookups
const questionById: Map<string, Question> = new Map()
const questionsByPatternId: Map<string, Question[]> = new Map()

/**
 * Load questions for a specific category (lazy loading)
 */
async function loadQuestionsByCategory(category: string): Promise<Question[]> {
  if (questionsByCategory.has(category)) {
    return questionsByCategory.get(category)!
  }

  try {
    // Try to load category-specific file first
    const data = await import(`../data/questions/${category}.json`)
    const questions = data.default as Question[]
    questionsByCategory.set(category, questions)

    // Update indexes
    for (const q of questions) {
      questionById.set(q.id, q)
      for (const ref of q.pattern_refs) {
        const existing = questionsByPatternId.get(ref.pattern_id) || []
        existing.push(q)
        questionsByPatternId.set(ref.pattern_id, existing)
      }
    }

    return questions
  } catch {
    // Category file doesn't exist, return empty
    questionsByCategory.set(category, [])
    return []
  }
}

/**
 * Load all questions (used when filtering across categories)
 */
async function loadAllQuestions(): Promise<Question[]> {
  if (allQuestionsLoaded) {
    return questionsCache
  }

  try {
    // Load the main questions index
    const data = await import('../data/questions/index.json')
    const categories = data.categories as string[]

    // Load each category
    for (const category of categories) {
      await loadQuestionsByCategory(category)
    }

    questionsCache = Array.from(questionById.values())
    allQuestionsLoaded = true
    return questionsCache
  } catch (error) {
    console.error('Failed to load questions:', error)

    // Fallback: try to load a single questions.json file
    try {
      const fallbackData = await import('../data/questions.json')
      questionsCache = fallbackData.default as Question[]
      allQuestionsLoaded = true

      // Build indexes
      for (const q of questionsCache) {
        questionById.set(q.id, q)
        for (const ref of q.pattern_refs) {
          const existing = questionsByPatternId.get(ref.pattern_id) || []
          existing.push(q)
          questionsByPatternId.set(ref.pattern_id, existing)
        }
      }

      return questionsCache
    } catch {
      return []
    }
  }
}

/**
 * Clear cache (for testing or hot reloading)
 */
export function clearQuestionCache(): void {
  questionsByCategory.clear()
  questionById.clear()
  questionsByPatternId.clear()
  questionsCache = []
  allQuestionsLoaded = false
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export class JsonQuestionRepository implements IQuestionRepository {
  private patternRepo = new JsonPatternRepository()

  async getById(id: string): Promise<Question | null> {
    // Check cache first
    if (questionById.has(id)) {
      return questionById.get(id)!
    }

    // Load all questions to find it
    await loadAllQuestions()
    return questionById.get(id) || null
  }

  async getByIds(ids: string[]): Promise<Question[]> {
    await loadAllQuestions()
    return ids
      .map(id => questionById.get(id))
      .filter((q): q is Question => q !== undefined)
  }

  async getByPatternId(patternId: string): Promise<Question[]> {
    await loadAllQuestions()
    return questionsByPatternId.get(patternId) || []
  }

  async getByCategory(category: string): Promise<Question[]> {
    return loadQuestionsByCategory(category)
  }

  async getFiltered(
    filter: QuestionFilter,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Question>> {
    let questions: Question[]

    // Optimize: if filtering by category, only load those categories
    if (filter.categories && filter.categories.length > 0) {
      const categoryQuestions = await Promise.all(
        filter.categories.map(cat => loadQuestionsByCategory(cat))
      )
      questions = categoryQuestions.flat()
    } else {
      questions = await loadAllQuestions()
    }

    // Apply filters
    let filtered = questions

    if (filter.pattern_ids && filter.pattern_ids.length > 0) {
      const patternIdSet = new Set(filter.pattern_ids)
      filtered = filtered.filter(q =>
        q.pattern_refs.some(ref => patternIdSet.has(ref.pattern_id))
      )
    }

    if (filter.difficulty_min !== undefined) {
      filtered = filtered.filter(q => q.difficulty >= filter.difficulty_min!)
    }

    if (filter.difficulty_max !== undefined) {
      filtered = filtered.filter(q => q.difficulty <= filter.difficulty_max!)
    }

    if (filter.tags && filter.tags.length > 0) {
      const tagSet = new Set(filter.tags)
      filtered = filtered.filter(q =>
        q.tags.some(tag => tagSet.has(tag))
      )
    }

    if (filter.exclude_ids && filter.exclude_ids.length > 0) {
      const excludeSet = new Set(filter.exclude_ids)
      filtered = filtered.filter(q => !excludeSet.has(q.id))
    }

    // Pagination
    const page = pagination?.page || 1
    const pageSize = pagination?.page_size || 20
    const total = filtered.length
    const totalPages = Math.ceil(total / pageSize)
    const startIndex = (page - 1) * pageSize
    const items = filtered.slice(startIndex, startIndex + pageSize)

    return {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
    }
  }

  async getRandomForPatterns(
    patternIds: string[],
    count: number,
    excludeIds: string[] = []
  ): Promise<Question[]> {
    await loadAllQuestions()

    const excludeSet = new Set(excludeIds)
    const patternIdSet = new Set(patternIds)

    // Get questions that have any of the specified patterns
    const candidates = Array.from(questionById.values()).filter(q =>
      !excludeSet.has(q.id) &&
      q.pattern_refs.some(ref => patternIdSet.has(ref.pattern_id))
    )

    // Shuffle and take requested count
    return shuffleArray(candidates).slice(0, count)
  }

  async getRandomMixed(
    count: number,
    filter?: QuestionFilter
  ): Promise<Question[]> {
    const result = await this.getFiltered(filter || {}, { page: 1, page_size: 1000 })
    return shuffleArray(result.items).slice(0, count)
  }

  async getByIdWithPatterns(id: string): Promise<QuestionWithPatterns | null> {
    const question = await this.getById(id)
    if (!question) return null

    const patternIds = question.pattern_refs.map(ref => ref.pattern_id)
    const patterns = await this.patternRepo.getByIds(patternIds)

    return {
      ...question,
      patterns,
    }
  }

  async getCount(filter?: QuestionFilter): Promise<number> {
    if (!filter) {
      const questions = await loadAllQuestions()
      return questions.length
    }

    const result = await this.getFiltered(filter, { page: 1, page_size: 1 })
    return result.total
  }

  async getCategories(): Promise<string[]> {
    const questions = await loadAllQuestions()
    const categories = new Set(questions.map(q => q.category))
    return Array.from(categories).sort()
  }

  async getTags(): Promise<string[]> {
    const questions = await loadAllQuestions()
    const tags = new Set(questions.flatMap(q => q.tags))
    return Array.from(tags).sort()
  }

  // Write operations
  async create(data: CreateQuestion): Promise<Question> {
    const now = new Date().toISOString()
    const question: Question = {
      ...data,
      id: `question_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      created_at: now,
      updated_at: now,
    }

    questionById.set(question.id, question)
    for (const ref of question.pattern_refs) {
      const existing = questionsByPatternId.get(ref.pattern_id) || []
      existing.push(question)
      questionsByPatternId.set(ref.pattern_id, existing)
    }

    return question
  }

  async update(id: string, data: UpdateQuestion): Promise<Question | null> {
    const existing = await this.getById(id)
    if (!existing) return null

    const updated: Question = {
      ...existing,
      ...data,
      updated_at: new Date().toISOString(),
    }

    questionById.set(id, updated)
    return updated
  }

  async delete(id: string): Promise<boolean> {
    const existing = questionById.get(id)
    if (!existing) return false

    questionById.delete(id)
    return true
  }
}
