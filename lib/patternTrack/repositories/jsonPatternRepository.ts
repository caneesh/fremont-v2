/**
 * JSON-based Pattern Repository Implementation
 *
 * Loads patterns from static JSON files.
 * Read-only in production; write operations are for seeding/admin.
 */

import type { Pattern, CreatePattern, UpdatePattern } from '../schema'
import type { IPatternRepository } from './interfaces'

// Pattern data will be loaded from JSON
let patternsCache: Pattern[] | null = null

/**
 * Load patterns from JSON file
 */
async function loadPatterns(): Promise<Pattern[]> {
  if (patternsCache) {
    return patternsCache
  }

  try {
    // Dynamic import of pattern data
    const data = await import('../data/patterns.json')
    patternsCache = data.default as Pattern[]
    return patternsCache
  } catch (error) {
    console.error('Failed to load patterns:', error)
    return []
  }
}

/**
 * Clear the cache (useful for testing or hot reloading)
 */
export function clearPatternCache(): void {
  patternsCache = null
}

export class JsonPatternRepository implements IPatternRepository {
  async getById(id: string): Promise<Pattern | null> {
    const patterns = await loadPatterns()
    return patterns.find(p => p.id === id) || null
  }

  async getByIds(ids: string[]): Promise<Pattern[]> {
    const patterns = await loadPatterns()
    const idSet = new Set(ids)
    return patterns.filter(p => idSet.has(p.id))
  }

  async getAll(): Promise<Pattern[]> {
    return loadPatterns()
  }

  async getByCategory(category: string): Promise<Pattern[]> {
    const patterns = await loadPatterns()
    return patterns
      .filter(p => p.category === category)
      .sort((a, b) => a.display_order - b.display_order)
  }

  async getRelated(patternId: string): Promise<Pattern[]> {
    const patterns = await loadPatterns()
    const pattern = patterns.find(p => p.id === patternId)
    if (!pattern) return []

    const relatedIds = new Set(pattern.related_pattern_ids)
    return patterns.filter(p => relatedIds.has(p.id))
  }

  async search(query: string): Promise<Pattern[]> {
    const patterns = await loadPatterns()
    const lowerQuery = query.toLowerCase()

    return patterns.filter(p =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.category.toLowerCase().includes(lowerQuery) ||
      p.recognition_cues.some(cue => cue.toLowerCase().includes(lowerQuery))
    )
  }

  async getCategories(): Promise<string[]> {
    const patterns = await loadPatterns()
    const categories = new Set(patterns.map(p => p.category))
    return Array.from(categories).sort()
  }

  async getCount(): Promise<number> {
    const patterns = await loadPatterns()
    return patterns.length
  }

  // Write operations - these would write to JSON in dev, no-op in prod
  async create(data: CreatePattern): Promise<Pattern> {
    const now = new Date().toISOString()
    const pattern: Pattern = {
      ...data,
      id: `pattern_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      created_at: now,
      updated_at: now,
    }

    // In a real implementation, this would persist to the JSON file
    // For now, just add to cache
    const patterns = await loadPatterns()
    patterns.push(pattern)

    return pattern
  }

  async update(id: string, data: UpdatePattern): Promise<Pattern | null> {
    const patterns = await loadPatterns()
    const index = patterns.findIndex(p => p.id === id)
    if (index === -1) return null

    const updated: Pattern = {
      ...patterns[index],
      ...data,
      updated_at: new Date().toISOString(),
    }
    patterns[index] = updated

    return updated
  }

  async delete(id: string): Promise<boolean> {
    const patterns = await loadPatterns()
    const index = patterns.findIndex(p => p.id === id)
    if (index === -1) return false

    patterns.splice(index, 1)
    return true
  }
}
