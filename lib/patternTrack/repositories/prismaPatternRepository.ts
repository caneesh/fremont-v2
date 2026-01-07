/**
 * Prisma-based Pattern Repository Implementation
 *
 * Loads patterns from PostgreSQL database via Prisma.
 */

import type { Pattern, CreatePattern, UpdatePattern } from '../schema'
import type { IPatternRepository } from './interfaces'
import { prisma } from '@/lib/db'

/**
 * Transform database Pattern to practice schema Pattern
 */
function transformPattern(dbPattern: {
  patternId: string
  label: string
  description: string | null
  path: string[]
  questionCount: number
}): Pattern {
  // Extract category from path or patternId
  const category = dbPattern.path[0] || dbPattern.patternId.split('/')[0] || 'general'

  return {
    id: dbPattern.patternId,
    name: dbPattern.label,
    description: dbPattern.description || '',
    category,
    difficulty: 3, // Default difficulty
    recognition_cues: [],
    common_pitfalls: [],
    related_pattern_ids: [],
    display_order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

export class PrismaPatternRepository implements IPatternRepository {
  async getById(id: string): Promise<Pattern | null> {
    const pattern = await prisma.pattern.findUnique({
      where: { patternId: id },
    })
    return pattern ? transformPattern(pattern) : null
  }

  async getByIds(ids: string[]): Promise<Pattern[]> {
    const patterns = await prisma.pattern.findMany({
      where: { patternId: { in: ids } },
    })
    return patterns.map(transformPattern)
  }

  async getAll(): Promise<Pattern[]> {
    const patterns = await prisma.pattern.findMany({
      where: { isActive: true },
      orderBy: { patternId: 'asc' },
    })
    return patterns.map(transformPattern)
  }

  async getByCategory(category: string): Promise<Pattern[]> {
    const patterns = await prisma.pattern.findMany({
      where: {
        isActive: true,
        patternId: { startsWith: `${category}/` },
      },
      orderBy: { patternId: 'asc' },
    })
    return patterns.map(transformPattern)
  }

  async getRelated(patternId: string): Promise<Pattern[]> {
    // Get patterns in the same category
    const pattern = await prisma.pattern.findUnique({
      where: { patternId },
    })
    if (!pattern) return []

    const category = pattern.path[0] || patternId.split('/')[0]
    const related = await prisma.pattern.findMany({
      where: {
        isActive: true,
        patternId: { startsWith: `${category}/`, not: patternId },
      },
      take: 5,
    })
    return related.map(transformPattern)
  }

  async search(query: string): Promise<Pattern[]> {
    const lowerQuery = query.toLowerCase()
    const patterns = await prisma.pattern.findMany({
      where: {
        isActive: true,
        OR: [
          { label: { contains: lowerQuery, mode: 'insensitive' } },
          { description: { contains: lowerQuery, mode: 'insensitive' } },
          { patternId: { contains: lowerQuery, mode: 'insensitive' } },
        ],
      },
    })
    return patterns.map(transformPattern)
  }

  async getCategories(): Promise<string[]> {
    const patterns = await prisma.pattern.findMany({
      where: { isActive: true },
      select: { path: true, patternId: true },
    })

    const categories = new Set<string>()
    for (const p of patterns) {
      const category = p.path[0] || p.patternId.split('/')[0]
      if (category) categories.add(category)
    }
    return Array.from(categories).sort()
  }

  async getCount(): Promise<number> {
    return prisma.pattern.count({ where: { isActive: true } })
  }

  // Write operations
  async create(data: CreatePattern): Promise<Pattern> {
    const pattern = await prisma.pattern.create({
      data: {
        patternId: data.name.toLowerCase().replace(/\s+/g, '_'),
        label: data.name,
        description: data.description,
        path: [data.category],
      },
    })
    return transformPattern(pattern)
  }

  async update(id: string, data: UpdatePattern): Promise<Pattern | null> {
    try {
      const pattern = await prisma.pattern.update({
        where: { patternId: id },
        data: {
          label: data.name,
          description: data.description,
        },
      })
      return transformPattern(pattern)
    } catch {
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await prisma.pattern.update({
        where: { patternId: id },
        data: { isActive: false },
      })
      return true
    } catch {
      return false
    }
  }
}
