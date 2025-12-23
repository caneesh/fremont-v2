import type { ConceptNode } from '@/types/conceptNetwork'

/**
 * Service for mapping AI-generated concept names to network concept IDs
 * Uses fuzzy matching strategies: exact, substring, and keyword matching
 */

// Physics keywords for fuzzy matching
const PHYSICS_KEYWORDS: Record<string, string[]> = {
  'kinematics-1d': ['kinematics', '1d', 'one dimension', 'linear motion', 'displacement', 'velocity', 'acceleration'],
  'vectors': ['vector', 'magnitude', 'direction', 'component', 'dot product', 'cross product'],
  'newtons-laws': ['newton', 'force', 'mass', 'inertia', 'action reaction', 'f=ma'],
  'kinematics-2d': ['2d', 'projectile', 'two dimension', 'trajectory'],
  'work-energy': ['work', 'energy', 'kinetic energy', 'potential energy', 'conservation of energy'],
  'momentum': ['momentum', 'impulse', 'collision', 'conservation of momentum'],
  'friction': ['friction', 'static friction', 'kinetic friction', 'coefficient'],
  'circular-motion': ['circular', 'centripetal', 'angular', 'radius', 'tangential'],
  'rotation': ['rotation', 'torque', 'angular momentum', 'moment of inertia', 'rotational'],
  'gravitation': ['gravity', 'gravitation', 'orbital', 'kepler', 'universal gravitation'],
  'shm': ['simple harmonic', 'oscillation', 'spring', 'pendulum', 'shm'],
  'temperature': ['temperature', 'heat', 'thermal', 'celsius', 'kelvin'],
  'kinetic-theory': ['kinetic theory', 'molecular', 'ideal gas', 'gas law'],
  'first-law': ['first law', 'thermodynamics', 'internal energy', 'heat transfer'],
  'second-law': ['second law', 'entropy', 'carnot', 'heat engine', 'efficiency'],
  'electrostatics': ['electrostatic', 'coulomb', 'electric charge', 'electric field', 'gauss'],
  'electric-potential': ['potential', 'voltage', 'electric potential', 'equipotential'],
  'capacitance': ['capacitor', 'capacitance', 'dielectric', 'charge storage'],
  'current': ['current', 'resistance', 'ohm', 'resistor', 'circuit', 'kirchhoff'],
  'magnetism': ['magnetic', 'magnet', 'magnetic field', 'lorentz', 'ampere'],
  'induction': ['induction', 'faraday', 'lenz', 'induced', 'flux'],
  'ac-circuits': ['ac', 'alternating', 'impedance', 'reactance', 'inductor'],
  'wave-motion': ['wave', 'wavelength', 'frequency', 'amplitude', 'superposition'],
  'sound': ['sound', 'acoustic', 'doppler', 'ultrasonic', 'decibel'],
  'em-waves': ['electromagnetic', 'em wave', 'light', 'spectrum', 'photon'],
  'reflection-refraction': ['reflection', 'refraction', 'snell', 'mirror', 'lens'],
  'interference': ['interference', 'young', 'double slit', 'constructive', 'destructive'],
  'diffraction': ['diffraction', 'single slit', 'resolution', 'fraunhofer'],
  'photoelectric': ['photoelectric', 'photon', 'work function', 'einstein'],
  'atomic-structure': ['atom', 'bohr', 'electron', 'nucleus', 'quantum', 'energy level'],
}

class ConceptMappingService {
  /**
   * Normalize concept name for comparison
   */
  private normalize(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  /**
   * Try exact match (after normalization)
   */
  private exactMatch(aiConceptName: string, networkConcepts: ConceptNode[]): string | null {
    const normalizedAI = this.normalize(aiConceptName)

    for (const concept of networkConcepts) {
      const normalizedNetwork = this.normalize(concept.name)

      if (normalizedAI === normalizedNetwork) {
        return concept.id
      }
    }

    return null
  }

  /**
   * Try substring match
   */
  private substringMatch(aiConceptName: string, networkConcepts: ConceptNode[]): string | null {
    const normalizedAI = this.normalize(aiConceptName)

    for (const concept of networkConcepts) {
      const normalizedNetwork = this.normalize(concept.name)

      // Check if AI name contains network name or vice versa
      if (
        normalizedAI.includes(normalizedNetwork) ||
        normalizedNetwork.includes(normalizedAI)
      ) {
        return concept.id
      }
    }

    return null
  }

  /**
   * Try keyword-based matching
   */
  private keywordMatch(aiConceptName: string, networkConcepts: ConceptNode[]): string | null {
    const normalizedAI = this.normalize(aiConceptName)

    let bestMatch: { id: string; score: number } | null = null

    // Check each network concept's keywords
    Object.entries(PHYSICS_KEYWORDS).forEach(([conceptId, keywords]) => {
      let matchScore = 0

      keywords.forEach((keyword) => {
        if (normalizedAI.includes(this.normalize(keyword))) {
          matchScore++
        }
      })

      if (matchScore > 0 && (!bestMatch || matchScore > bestMatch.score)) {
        bestMatch = { id: conceptId, score: matchScore }
      }
    })

    // Verify the concept exists in the network
    if (bestMatch && networkConcepts.some((c) => c.id === bestMatch.id)) {
      return bestMatch.id
    }

    return null
  }

  /**
   * Map AI concept name to network concept ID
   * Uses three strategies in order: exact, substring, keyword
   */
  mapConceptToNetworkId(
    aiConceptName: string,
    networkConcepts: ConceptNode[]
  ): string | null {
    // Strategy 1: Exact match
    const exactResult = this.exactMatch(aiConceptName, networkConcepts)
    if (exactResult) {
      return exactResult
    }

    // Strategy 2: Substring match
    const substringResult = this.substringMatch(aiConceptName, networkConcepts)
    if (substringResult) {
      return substringResult
    }

    // Strategy 3: Keyword match
    const keywordResult = this.keywordMatch(aiConceptName, networkConcepts)
    if (keywordResult) {
      return keywordResult
    }

    // No match found
    console.warn(`[ConceptMapping] Could not map AI concept: "${aiConceptName}"`)
    return null
  }

  /**
   * Map multiple AI concepts to network concept IDs
   * Returns a Map<aiConceptId, networkConceptId | null>
   */
  mapConcepts(
    aiConcepts: Array<{ id: string; name: string }>,
    networkConcepts: ConceptNode[]
  ): Map<string, string | null> {
    const mapping = new Map<string, string | null>()

    aiConcepts.forEach((aiConcept) => {
      const networkId = this.mapConceptToNetworkId(aiConcept.name, networkConcepts)
      mapping.set(aiConcept.id, networkId)

      if (networkId) {
        console.log(
          `[ConceptMapping] Mapped "${aiConcept.name}" (${aiConcept.id}) → "${networkId}"`
        )
      }
    })

    return mapping
  }

  /**
   * Get unmapped AI concepts (for debugging/logging)
   */
  getUnmappedConcepts(
    aiConcepts: Array<{ id: string; name: string }>,
    networkConcepts: ConceptNode[]
  ): Array<{ id: string; name: string }> {
    return aiConcepts.filter((aiConcept) => {
      const networkId = this.mapConceptToNetworkId(aiConcept.name, networkConcepts)
      return networkId === null
    })
  }

  /**
   * Get mapping statistics (for debugging)
   */
  getMappingStats(
    aiConcepts: Array<{ id: string; name: string }>,
    networkConcepts: ConceptNode[]
  ): {
    total: number
    mapped: number
    unmapped: number
    mappingRate: number
  } {
    const mapping = this.mapConcepts(aiConcepts, networkConcepts)
    const mapped = Array.from(mapping.values()).filter((id) => id !== null).length
    const unmapped = aiConcepts.length - mapped

    return {
      total: aiConcepts.length,
      mapped,
      unmapped,
      mappingRate: aiConcepts.length > 0 ? (mapped / aiConcepts.length) * 100 : 0,
    }
  }
}

export const conceptMappingService = new ConceptMappingService()
