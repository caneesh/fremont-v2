/**
 * Unit tests for Question Engine Fingerprinting
 */

import { describe, it, expect } from 'vitest'
import {
  computeHash,
  normalizeStatement,
  extractFingerprint,
  computeSimilarity,
} from '../fingerprint'
import type { Fingerprint } from '../schemas'

// =============================================================================
// normalizeStatement Tests
// =============================================================================

describe('normalizeStatement', () => {
  it('converts to lowercase', () => {
    const result = normalizeStatement('A Block Slides Down')
    expect(result).toBe('a block slides down')
  })

  it('collapses multiple spaces', () => {
    const result = normalizeStatement('A   block    slides')
    expect(result).toBe('a block slides')
  })

  it('trims whitespace', () => {
    const result = normalizeStatement('  A block slides  ')
    expect(result).toBe('a block slides')
  })

  it('removes special characters except allowed ones', () => {
    const result = normalizeStatement('Find the acceleration (a) of the block!')
    expect(result).toContain('find the acceleration')
    expect(result).toContain('!')
  })

  it('preserves math symbols', () => {
    const result = normalizeStatement('θ = 30°, m = 5 kg')
    // Note: special unicode may be stripped, but $ and basic math preserved
    expect(result).toContain('30')
    expect(result).toContain('5')
  })

  it('handles empty string', () => {
    const result = normalizeStatement('')
    expect(result).toBe('')
  })

  it('handles string with only whitespace', () => {
    const result = normalizeStatement('   ')
    expect(result).toBe('')
  })
})

// =============================================================================
// computeHash Tests
// =============================================================================

describe('computeHash', () => {
  it('returns a 64-character hex string (SHA-256)', () => {
    const hash = computeHash('A block slides down an incline.')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns same hash for same input', () => {
    const statement = 'A 5 kg block slides down a 30° incline.'
    const hash1 = computeHash(statement)
    const hash2 = computeHash(statement)
    expect(hash1).toBe(hash2)
  })

  it('returns different hash for different input', () => {
    const hash1 = computeHash('A block slides down.')
    const hash2 = computeHash('A block slides up.')
    expect(hash1).not.toBe(hash2)
  })

  it('normalizes before hashing - case insensitive', () => {
    const hash1 = computeHash('A Block Slides')
    const hash2 = computeHash('a block slides')
    expect(hash1).toBe(hash2)
  })

  it('normalizes before hashing - whitespace insensitive', () => {
    const hash1 = computeHash('A  block   slides')
    const hash2 = computeHash('A block slides')
    expect(hash1).toBe(hash2)
  })

  it('includes choices in hash when provided', () => {
    const statement = 'Find the acceleration.'
    const hashWithoutChoices = computeHash(statement)
    const hashWithChoices = computeHash(statement, ['5 m/s²', '10 m/s²'])
    expect(hashWithoutChoices).not.toBe(hashWithChoices)
  })

  it('produces same hash regardless of choice order', () => {
    const statement = 'Find the acceleration.'
    const hash1 = computeHash(statement, ['A', 'B', 'C'])
    const hash2 = computeHash(statement, ['C', 'A', 'B'])
    expect(hash1).toBe(hash2)
  })
})

// =============================================================================
// extractFingerprint Tests
// =============================================================================

describe('extractFingerprint', () => {
  describe('topic classification', () => {
    it('classifies mechanics problems correctly', () => {
      const fp = extractFingerprint('A block of mass 5 kg slides down a frictionless incline.')
      expect(fp.topic).toBe('mechanics')
    })

    it('classifies thermodynamics problems correctly', () => {
      const fp = extractFingerprint('An ideal gas undergoes an isothermal expansion at temperature T.')
      expect(fp.topic).toBe('thermodynamics')
    })

    it('classifies electromagnetism problems correctly', () => {
      const fp = extractFingerprint('A charge q moves through a magnetic field B.')
      expect(fp.topic).toBe('electromagnetism')
    })

    it('classifies optics problems correctly', () => {
      const fp = extractFingerprint('Light passes through a convex lens with focal length 10 cm.')
      expect(fp.topic).toBe('optics')
    })

    it('uses provided topic when given', () => {
      const fp = extractFingerprint('Some problem statement', 'thermodynamics')
      expect(fp.topic).toBe('thermodynamics')
    })
  })

  describe('subtopic classification', () => {
    it('detects inclined plane problems', () => {
      const fp = extractFingerprint('A block slides down a 30° incline.')
      expect(fp.subtopic).toContain('incline')
    })

    it('detects friction in incline problems', () => {
      const fp = extractFingerprint('A block slides down a rough incline with friction coefficient μ.')
      expect(fp.subtopic).toContain('friction')
    })

    it('detects projectile motion', () => {
      const fp = extractFingerprint('A ball is thrown at 45° with initial velocity 20 m/s. Find the range.')
      expect(fp.subtopic).toContain('projectile')
    })

    it('uses provided subtopic when given', () => {
      const fp = extractFingerprint('Some problem', 'mechanics', 'circular_motion')
      expect(fp.subtopic).toBe('circular_motion')
    })
  })

  describe('asked quantities extraction', () => {
    it('detects acceleration', () => {
      const fp = extractFingerprint('Find the acceleration of the block.')
      expect(fp.asked).toContain('acceleration')
    })

    it('detects velocity', () => {
      const fp = extractFingerprint('What is the final velocity?')
      expect(fp.asked).toContain('velocity')
    })

    it('detects force', () => {
      const fp = extractFingerprint('Calculate the tension in the rope.')
      expect(fp.asked).toContain('force')
    })

    it('detects multiple asked quantities', () => {
      const fp = extractFingerprint('Find the acceleration and the final velocity.')
      expect(fp.asked).toContain('acceleration')
      expect(fp.asked).toContain('velocity')
    })

    it('defaults to acceleration when no specific quantity found', () => {
      const fp = extractFingerprint('Solve this mechanics problem.')
      expect(fp.asked).toContain('acceleration')
    })
  })

  describe('keywords extraction', () => {
    it('extracts physics keywords', () => {
      const fp = extractFingerprint('A block of mass 5 kg experiences a force and accelerates.')
      expect(fp.keywords).toContain('mass')
      expect(fp.keywords).toContain('force')
    })

    it('limits keywords to 10', () => {
      const longStatement = 'force mass velocity acceleration momentum energy work power torque rotation angular projectile friction gravity tension block pulley motion'
      const fp = extractFingerprint(longStatement)
      expect(fp.keywords.length).toBeLessThanOrEqual(10)
    })
  })

  describe('diagram type detection', () => {
    it('detects FBD requirement', () => {
      const fp = extractFingerprint('Draw a free body diagram for the block.')
      expect(fp.diagramType).toBe('fbd')
    })

    it('detects incline diagram', () => {
      const fp = extractFingerprint('A block on an inclined ramp.')
      expect(fp.diagramType).toBe('incline')
    })

    it('detects pulley diagram', () => {
      const fp = extractFingerprint('Two masses connected by a rope over a pulley.')
      expect(fp.diagramType).toBe('pulley')
    })

    it('defaults to fbd for force problems', () => {
      const fp = extractFingerprint('Find the acceleration of the block due to applied force.')
      expect(fp.diagramType).toBe('fbd')
    })
  })

  describe('fingerprint structure', () => {
    it('returns all required fields', () => {
      const fp = extractFingerprint('A block slides down an incline.')
      expect(fp).toHaveProperty('topic')
      expect(fp).toHaveProperty('subtopic')
      expect(fp).toHaveProperty('asked')
      expect(fp).toHaveProperty('keywords')
      expect(fp).toHaveProperty('diagramType')
    })

    it('asked is always an array', () => {
      const fp = extractFingerprint('Some problem')
      expect(Array.isArray(fp.asked)).toBe(true)
    })

    it('keywords is always an array', () => {
      const fp = extractFingerprint('Some problem')
      expect(Array.isArray(fp.keywords)).toBe(true)
    })
  })
})

// =============================================================================
// computeSimilarity Tests
// =============================================================================

describe('computeSimilarity', () => {
  const baseFp: Fingerprint = {
    topic: 'mechanics',
    subtopic: 'inclined_plane',
    asked: ['acceleration'],
    keywords: ['block', 'incline', 'friction'],
    diagramType: 'incline',
  }

  it('returns 1 for identical fingerprints', () => {
    const similarity = computeSimilarity(baseFp, { ...baseFp })
    expect(similarity).toBe(1)
  })

  it('returns high similarity for same topic and subtopic', () => {
    const similar: Fingerprint = {
      ...baseFp,
      asked: ['velocity'],
      keywords: ['mass', 'gravity'],
    }
    const similarity = computeSimilarity(baseFp, similar)
    expect(similarity).toBeGreaterThan(0.6)
  })

  it('returns low similarity for different topics', () => {
    const different: Fingerprint = {
      topic: 'thermodynamics',
      subtopic: 'ideal_gas',
      asked: ['temperature'],
      keywords: ['heat', 'pressure'],
      diagramType: 'none',
    }
    const similarity = computeSimilarity(baseFp, different)
    expect(similarity).toBeLessThan(0.3)
  })

  it('returns value between 0 and 1', () => {
    const fp1: Fingerprint = {
      topic: 'mechanics',
      subtopic: 'projectile',
      asked: ['range'],
      keywords: ['velocity', 'angle'],
      diagramType: 'none',
    }
    const similarity = computeSimilarity(baseFp, fp1)
    expect(similarity).toBeGreaterThanOrEqual(0)
    expect(similarity).toBeLessThanOrEqual(1)
  })

  it('is symmetric', () => {
    const fp1: Fingerprint = {
      topic: 'mechanics',
      subtopic: 'newton_laws',
      asked: ['force'],
      keywords: ['mass', 'acceleration'],
      diagramType: 'fbd',
    }
    const sim1 = computeSimilarity(baseFp, fp1)
    const sim2 = computeSimilarity(fp1, baseFp)
    expect(sim1).toBeCloseTo(sim2, 5)
  })

  it('weights topic match heavily', () => {
    const sameTopic: Fingerprint = {
      topic: 'mechanics',
      subtopic: 'different',
      asked: ['different'],
      keywords: ['different'],
      diagramType: 'none',
    }
    const differentTopic: Fingerprint = {
      topic: 'thermodynamics',
      subtopic: 'different',
      asked: ['temperature'],
      keywords: ['heat', 'gas'],
      diagramType: 'none',
    }
    const simSameTopic = computeSimilarity(baseFp, sameTopic)
    const simDiffTopic = computeSimilarity(baseFp, differentTopic)
    // Same topic should score higher even with different other fields
    expect(simSameTopic).toBeGreaterThan(simDiffTopic)
  })

  it('gives partial credit for similar subtopics', () => {
    const partialMatch: Fingerprint = {
      topic: 'mechanics',
      subtopic: 'inclined', // partial match with 'inclined_plane'
      asked: ['acceleration'],
      keywords: ['block'],
      diagramType: 'incline',
    }
    const noMatch: Fingerprint = {
      topic: 'mechanics',
      subtopic: 'completely_different',
      asked: ['acceleration'],
      keywords: ['block'],
      diagramType: 'incline',
    }
    const simPartial = computeSimilarity(baseFp, partialMatch)
    const simNoMatch = computeSimilarity(baseFp, noMatch)
    expect(simPartial).toBeGreaterThan(simNoMatch)
  })
})
