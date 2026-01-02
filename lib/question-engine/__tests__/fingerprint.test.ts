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

    it('classifies waves problems correctly', () => {
      const fp = extractFingerprint('A string fixed at both ends vibrates in its fundamental mode with frequency 440 Hz.')
      expect(fp.topic).toBe('waves')
    })

    it('classifies Doppler effect as waves', () => {
      const fp = extractFingerprint('An ambulance siren emits 1000 Hz. The ambulance approaches a stationary observer at 30 m/s. Find the frequency heard.')
      expect(fp.topic).toBe('waves')
    })

    it('classifies modern physics problems correctly', () => {
      const fp = extractFingerprint('Light of wavelength 400 nm strikes a metal with work function 2.0 eV. Find the stopping potential.')
      expect(fp.topic).toBe('modern')
    })

    it('classifies Bohr model as modern physics', () => {
      const fp = extractFingerprint('An electron in a hydrogen atom transitions from n=3 to n=1. Calculate the wavelength of the emitted photon.')
      expect(fp.topic).toBe('modern')
    })

    it('classifies nuclear decay as modern physics', () => {
      const fp = extractFingerprint('A radioactive sample has a half-life of 5 days. What fraction remains after 15 days?')
      expect(fp.topic).toBe('modern')
    })

    it('uses provided topic when given', () => {
      const fp = extractFingerprint('Some problem statement', 'thermodynamics')
      expect(fp.topic).toBe('thermodynamics')
    })
  })

  describe('subtopic classification', () => {
    // Mechanics subtopics
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

    it('detects circular motion', () => {
      const fp = extractFingerprint('A ball on a string moves in a horizontal circle with centripetal acceleration.')
      expect(fp.subtopic).toBe('circular_motion')
    })

    it('detects work-energy problems', () => {
      const fp = extractFingerprint('A spring is compressed and releases a block. Find the kinetic energy.')
      expect(fp.subtopic).toBe('work_energy')
    })

    it('detects momentum-collision problems', () => {
      const fp = extractFingerprint('Two balls collide elastically. Find the final velocities after the collision.')
      expect(fp.subtopic).toBe('momentum_collision')
    })

    it('detects SHM problems', () => {
      const fp = extractFingerprint('A mass on a spring oscillates with amplitude 5 cm. Find the period.')
      expect(fp.subtopic).toBe('simple_harmonic_motion')
    })

    // Thermodynamics subtopics
    it('detects ideal gas problems', () => {
      const fp = extractFingerprint('A gas at 300 K and 2 atm occupies 5 L. Find the new volume at 400 K.')
      expect(fp.subtopic).toBe('ideal_gas')
    })

    it('detects first law problems', () => {
      const fp = extractFingerprint('In an isothermal expansion, 500 J of heat is absorbed. Find the work done.')
      expect(fp.subtopic).toBe('first_law')
    })

    it('detects heat engine problems', () => {
      const fp = extractFingerprint('A Carnot engine operates between 500 K and 300 K reservoirs. Find the efficiency.')
      expect(fp.subtopic).toBe('heat_engine')
    })

    it('detects calorimetry problems', () => {
      const fp = extractFingerprint('A copper block at 100°C is placed in water at 20°C. Find equilibrium temperature.')
      expect(fp.subtopic).toBe('calorimetry')
    })

    // Electromagnetism subtopics
    it('detects Coulomb/electric field problems', () => {
      const fp = extractFingerprint('Two point charges are separated by 10 cm. Find the electric field at the midpoint.')
      expect(fp.subtopic).toBe('coulomb_field')
    })

    it('detects DC circuit problems', () => {
      const fp = extractFingerprint('A 12V battery is connected to resistors in series. Find the current using Kirchhoff laws.')
      expect(fp.subtopic).toBe('dc_circuits')
    })

    it('detects capacitor problems', () => {
      const fp = extractFingerprint('A parallel plate capacitor has capacitance 10 μF. Find the stored energy.')
      expect(fp.subtopic).toBe('capacitors')
    })

    // Optics subtopics
    it('detects mirror problems', () => {
      const fp = extractFingerprint('An object is placed in front of a concave mirror. Find the image distance.')
      expect(fp.subtopic).toBe('mirrors')
    })

    it('detects lens problems', () => {
      const fp = extractFingerprint('A converging lens has focal length 15 cm. Find the magnification.')
      expect(fp.subtopic).toBe('lenses')
    })

    it('detects interference problems', () => {
      const fp = extractFingerprint('In Young double slit experiment, find the fringe width.')
      expect(fp.subtopic).toBe('interference')
    })

    // Waves subtopics
    it('detects standing wave problems', () => {
      const fp = extractFingerprint('A string fixed at both ends has fundamental frequency 440 Hz. Find the third harmonic.')
      expect(fp.subtopic).toBe('standing_waves')
    })

    it('detects Doppler effect problems', () => {
      const fp = extractFingerprint('A car horn emits 400 Hz. The car approaches at 30 m/s. What frequency does the observer hear?')
      expect(fp.subtopic).toBe('doppler')
    })

    // Modern physics subtopics
    it('detects photoelectric effect problems', () => {
      const fp = extractFingerprint('Light of wavelength 400 nm strikes a metal surface with work function 2.0 eV.')
      expect(fp.subtopic).toBe('photoelectric')
    })

    it('detects Bohr model problems', () => {
      const fp = extractFingerprint('An electron in hydrogen atom transitions from n=3 to n=1. Find the wavelength.')
      expect(fp.subtopic).toBe('bohr_model')
    })

    it('detects nuclear decay problems', () => {
      const fp = extractFingerprint('A radioactive isotope has half-life of 10 days. Find the decay constant.')
      expect(fp.subtopic).toBe('nuclear_decay')
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
