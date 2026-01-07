/**
 * Prisma-based Question Repository Implementation
 *
 * Loads questions from PostgreSQL database via Prisma.
 * Transforms the v2 payload format to practice schema format.
 */

import type {
  Question,
  QuestionFilter,
  PaginationOptions,
  PaginatedResult,
  CreateQuestion,
  UpdateQuestion,
  QuestionWithPatterns,
  PatternRef,
  QuestionHint,
  QuestionAnswer,
} from '../schema'
import type { IQuestionRepository } from './interfaces'
import { prisma } from '@/lib/db'
import { Prisma, QuestionLifecycleState } from '@prisma/client'
import { PrismaPatternRepository } from './prismaPatternRepository'

// Type for the database question payload
interface QuestionPayload {
  schemaVersion?: string
  prompt?: {
    text?: string
    given?: Array<{ label: string; value: string; unit?: string }>
  }
  primaryPatternId?: string
  classification?: {
    topicTags?: string[]
    patternTags?: string[]
  }
  metadata?: {
    title?: string
    difficulty?: number
  }
  solutions?: {
    finalAnswer?: { type: string; value: number | string; units?: string }
    synthesis?: string[]
  }
  steps?: Array<{
    stepId: string
    type: string
    prompt: string
    explanations?: { hint?: string }
  }>
}

/**
 * Transform database Question to practice schema Question
 */
function transformQuestion(dbQuestion: {
  questionId: string
  primaryPatternId: string | null
  difficulty: number
  topicTags: string[]
  payload: unknown
  createdAt: Date
  updatedAt: Date
}): Question {
  const payload = dbQuestion.payload as QuestionPayload

  // Build pattern_refs
  const pattern_refs: PatternRef[] = []
  if (dbQuestion.primaryPatternId) {
    pattern_refs.push({
      pattern_id: dbQuestion.primaryPatternId,
      relevance: 'primary',
      application_notes: 'Primary pattern for this problem',
    })
  }

  // Extract hints from steps
  const hints: QuestionHint[] = []
  if (payload.steps) {
    payload.steps.forEach((step, index) => {
      if (step.explanations?.hint) {
        hints.push({
          order: index + 1,
          text: step.explanations.hint,
          pattern_id: dbQuestion.primaryPatternId || undefined,
        })
      }
    })
  }

  // Build answer from solutions
  let answer: QuestionAnswer = { type: 'free_response', rubric: [] }
  if (payload.solutions?.finalAnswer) {
    const fa = payload.solutions.finalAnswer
    if (fa.type === 'NUMERIC' && typeof fa.value === 'number') {
      answer = {
        type: 'numeric',
        value: fa.value,
        unit: fa.units || '',
        tolerance: 0.1,
      }
    } else if (typeof fa.value === 'string') {
      answer = {
        type: 'symbolic',
        expression: fa.value,
      }
    }
  }

  // Extract category from topic tags
  const category = dbQuestion.topicTags[0] || 'general'
  const subcategory = dbQuestion.topicTags[1]

  // Build solution explanation
  const solution_explanation = payload.solutions?.synthesis?.join(' ') || 'Solution not available.'

  return {
    id: dbQuestion.questionId,
    problem_text: payload.prompt?.text || 'Problem text not available',
    pattern_refs,
    difficulty: dbQuestion.difficulty,
    category,
    subcategory,
    hints,
    answer,
    solution_explanation,
    tags: dbQuestion.topicTags,
    source: 'database',
    created_at: dbQuestion.createdAt.toISOString(),
    updated_at: dbQuestion.updatedAt.toISOString(),
  }
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

export class PrismaQuestionRepository implements IQuestionRepository {
  private patternRepo = new PrismaPatternRepository()

  async getById(id: string): Promise<Question | null> {
    const question = await prisma.question.findUnique({
      where: { questionId: id },
    })
    return question ? transformQuestion(question) : null
  }

  async getByIds(ids: string[]): Promise<Question[]> {
    const questions = await prisma.question.findMany({
      where: { questionId: { in: ids } },
    })
    return questions.map(transformQuestion)
  }

  async getByPatternId(patternId: string): Promise<Question[]> {
    const questions = await prisma.question.findMany({
      where: {
        primaryPatternId: patternId,
        lifecycleState: QuestionLifecycleState.approved,
      },
    })
    return questions.map(transformQuestion)
  }

  async getByCategory(category: string): Promise<Question[]> {
    const questions = await prisma.question.findMany({
      where: {
        topicTags: { has: category },
        lifecycleState: QuestionLifecycleState.approved,
      },
    })
    return questions.map(transformQuestion)
  }

  async getFiltered(
    filter: QuestionFilter,
    pagination?: PaginationOptions
  ): Promise<PaginatedResult<Question>> {
    // Build where clause using Prisma's generated types
    const where: Prisma.QuestionWhereInput = {
      lifecycleState: QuestionLifecycleState.approved,
    }

    if (filter.pattern_ids && filter.pattern_ids.length > 0) {
      where.primaryPatternId = { in: filter.pattern_ids }
    }

    if (filter.categories && filter.categories.length > 0) {
      where.topicTags = { hasSome: filter.categories }
    }

    if (filter.difficulty_min !== undefined || filter.difficulty_max !== undefined) {
      where.difficulty = {}
      if (filter.difficulty_min !== undefined) {
        where.difficulty.gte = filter.difficulty_min
      }
      if (filter.difficulty_max !== undefined) {
        where.difficulty.lte = filter.difficulty_max
      }
    }

    if (filter.exclude_ids && filter.exclude_ids.length > 0) {
      where.questionId = { notIn: filter.exclude_ids }
    }

    // Count total
    const total = await prisma.question.count({ where })

    // Pagination
    const page = pagination?.page || 1
    const pageSize = pagination?.page_size || 20
    const skip = (page - 1) * pageSize

    const questions = await prisma.question.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    })

    return {
      items: questions.map(transformQuestion),
      total,
      page,
      page_size: pageSize,
      total_pages: Math.ceil(total / pageSize),
    }
  }

  async getRandomForPatterns(
    patternIds: string[],
    count: number,
    excludeIds: string[] = []
  ): Promise<Question[]> {
    const questions = await prisma.question.findMany({
      where: {
        primaryPatternId: { in: patternIds },
        lifecycleState: QuestionLifecycleState.approved,
        questionId: excludeIds.length > 0 ? { notIn: excludeIds } : undefined,
      },
    })

    return shuffleArray(questions.map(transformQuestion)).slice(0, count)
  }

  async getRandomMixed(
    count: number,
    filter?: QuestionFilter
  ): Promise<Question[]> {
    const questions = await prisma.question.findMany({
      where: {
        lifecycleState: QuestionLifecycleState.approved,
        ...(filter?.exclude_ids && filter.exclude_ids.length > 0
          ? { questionId: { notIn: filter.exclude_ids } }
          : {}),
      },
    })

    return shuffleArray(questions.map(transformQuestion)).slice(0, count)
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
    const where: Prisma.QuestionWhereInput = {
      lifecycleState: QuestionLifecycleState.approved,
    }

    if (filter?.pattern_ids && filter.pattern_ids.length > 0) {
      where.primaryPatternId = { in: filter.pattern_ids }
    }

    return prisma.question.count({ where })
  }

  async getCategories(): Promise<string[]> {
    const questions = await prisma.question.findMany({
      where: { lifecycleState: QuestionLifecycleState.approved },
      select: { topicTags: true },
    })

    const categories = new Set<string>()
    for (const q of questions) {
      if (q.topicTags[0]) categories.add(q.topicTags[0])
    }
    return Array.from(categories).sort()
  }

  async getTags(): Promise<string[]> {
    const questions = await prisma.question.findMany({
      where: { lifecycleState: QuestionLifecycleState.approved },
      select: { topicTags: true },
    })

    const tags = new Set<string>()
    for (const q of questions) {
      for (const tag of q.topicTags) {
        tags.add(tag)
      }
    }
    return Array.from(tags).sort()
  }

  // Write operations
  async create(data: CreateQuestion): Promise<Question> {
    const now = new Date()
    const questionId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    const question = await prisma.question.create({
      data: {
        questionId,
        primaryPatternId: data.pattern_refs[0]?.pattern_id,
        difficulty: data.difficulty,
        topicTags: [data.category, data.subcategory].filter(Boolean) as string[],
        payload: {
          schemaVersion: 'question.v2',
          prompt: { text: data.problem_text },
          solutions: { synthesis: [data.solution_explanation] },
        },
      },
    })

    return transformQuestion({
      ...question,
      createdAt: now,
      updatedAt: now,
    })
  }

  async update(id: string, data: UpdateQuestion): Promise<Question | null> {
    try {
      const existing = await prisma.question.findUnique({
        where: { questionId: id },
      })
      if (!existing) return null

      const payload = existing.payload as QuestionPayload

      const question = await prisma.question.update({
        where: { questionId: id },
        data: {
          difficulty: data.difficulty ?? existing.difficulty,
          topicTags: data.category
            ? [data.category, data.subcategory].filter(Boolean) as string[]
            : existing.topicTags,
          payload: (data.problem_text
            ? { ...payload, prompt: { ...payload.prompt, text: data.problem_text } }
            : payload) as unknown as Prisma.InputJsonValue,
        },
      })

      return transformQuestion(question)
    } catch {
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.question.update({
        where: { questionId: id },
        data: { lifecycleState: QuestionLifecycleState.retired },
      })
      return true
    } catch {
      return false
    }
  }
}
