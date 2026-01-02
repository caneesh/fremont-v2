/**
 * Question Scaffolding Engine v1 - Fingerprinting
 *
 * Extracts fingerprints from problem statements WITHOUT using LLM.
 * Uses heuristic classification based on keyword patterns.
 *
 * Key principle: Fingerprinting is LLM-FREE for the hot path.
 * - Cache hit path must not call LLM
 * - Uses keyword matching for topic/subtopic classification
 * - Extracts "asked" quantities and diagram types heuristically
 */

import type { Fingerprint, NumericalParams } from './schemas'
import * as crypto from 'crypto'

// =============================================================================
// Keyword Maps
// =============================================================================

/**
 * Topic classification keywords
 * Maps keywords to topics with weights
 */
const TOPIC_KEYWORDS: Record<string, { keywords: string[]; weight: number }> = {
  mechanics: {
    keywords: [
      'force', 'mass', 'acceleration', 'velocity', 'motion', 'newton',
      'friction', 'incline', 'block', 'pulley', 'tension', 'gravity',
      'momentum', 'collision', 'energy', 'work', 'power', 'torque',
      'rotation', 'angular', 'projectile', 'free body', 'fbd',
      'equilibrium', 'center of mass', 'rolling', 'sliding',
      // Projectile motion keywords
      'thrown', 'throw', 'ball', 'range', 'flight', 'cliff', 'speed',
      'height', 'horizontal', 'vertical', 'trajectory', 'landing',
      'ground', 'air', 'falls', 'dropped', 'launched', 'initial',
      // Additional kinematics
      'distance', 'displacement', 'time', 'seconds', 'meters',
      // SHM keywords (to distinguish from waves)
      'mass on a spring', 'spring constant', 'oscillates', 'pendulum',
      'simple harmonic', 'restoring force',
    ],
    weight: 1,
  },
  thermodynamics: {
    keywords: [
      'heat', 'temperature', 'thermal', 'entropy', 'adiabatic',
      'isothermal', 'isobaric', 'isochoric', 'carnot', 'ideal gas',
      'specific heat', 'latent heat', 'conduction', 'convection',
      'radiation', 'stefan', 'boltzmann', 'pressure', 'volume',
      'calorimeter', 'equilibrium temperature', 'mole', 'kelvin',
      'celsius', 'joule', 'calorie', 'melting', 'boiling', 'freezing',
      'copper', 'aluminum', 'iron', 'water', 'ice', 'steam',
      'placed in', 'mixed with', 'heated', 'cooled', 'gas law',
    ],
    weight: 1,
  },
  electromagnetism: {
    keywords: [
      'electric', 'magnetic', 'charge', 'current', 'voltage',
      'resistance', 'capacitor', 'capacitance', 'inductor', 'circuit', 'field',
      'coulomb', 'gauss', 'ampere', 'faraday', 'lenz', 'emf',
      'dipole', 'potential', 'flux', 'solenoid', 'loop',
      'parallel plate', 'dielectric', 'resistor', 'ohm',
    ],
    weight: 1.1,  // Slightly higher weight to handle energy/work overlap
  },
  optics: {
    keywords: [
      'light', 'lens', 'mirror', 'refraction', 'reflection',
      'interference', 'diffraction', 'polarization', 'wavelength',
      'focal', 'optical', 'prism', 'spectrum', 'snell', 'image',
      'young', 'double slit', 'fringe', 'thin film', 'ray',
    ],
    weight: 1.1,  // Slightly higher weight
  },
  waves: {
    keywords: [
      'wave', 'frequency', 'amplitude', 'oscillation', 'harmonic',
      'resonance', 'standing wave', 'sound', 'doppler', 'beat',
      'superposition', 'node', 'antinode', 'wavelength',
      'siren', 'horn', 'ambulance', 'train whistle', 'approaching',
      'receding', 'observer', 'source frequency', 'apparent frequency',
      'speed of sound', 'Hz', 'heard', 'emits', 'moving toward',
      'moving away', 'passes', 'stationary observer',
    ],
    weight: 1.3,  // Higher weight to overcome mechanics velocity keywords
  },
  modern: {
    keywords: [
      'quantum', 'photon', 'electron', 'atomic', 'nuclear',
      'radioactive', 'decay', 'half-life', 'relativity', 'planck',
      'bohr', 'de broglie', 'photoelectric', 'compton',
      'wavelength', 'work function', 'threshold frequency', 'emitted',
      'stopping potential', 'energy level', 'orbit', 'hydrogen atom',
      'spectral', 'lyman', 'balmer', 'rydberg', 'alpha particle',
      'beta particle', 'gamma ray', 'activity', 'becquerel', 'curie',
      'eV', 'electronvolt', 'nm', 'nanometer', 'metal surface',
    ],
    weight: 1.2,  // Slightly higher weight to overcome mechanics keywords
  },
}

/**
 * Subtopic classification for mechanics
 */
const MECHANICS_SUBTOPICS: Record<string, string[]> = {
  inclined_plane: ['incline', 'ramp', 'slope', 'angle', 'wedge'],
  inclined_plane_friction: ['incline', 'friction', 'coefficient', 'rough', 'sliding'],
  newton_laws_2d: ['force', 'newton', 'equilibrium', '2d', 'components', 'fbd'],
  projectile: ['projectile', 'throw', 'launch', 'trajectory', 'range', 'height', 'horizontal', 'thrown', 'ball', 'cliff', 'flight', 'vertical', 'angle of projection', 'initial velocity', 'landing', 'ground', 'air', 'falls', 'dropped', 'launched', 'maximum height', 'time of flight'],
  circular_motion: ['circular', 'circle', 'centripetal', 'centrifugal', 'rotating', 'orbit', 'conical', 'banked', 'loop', 'horizontal circle', 'vertical circle'],
  momentum_collision: ['momentum', 'collision', 'elastic', 'inelastic', 'restitution', 'impact', 'stick'],
  work_energy: ['work', 'energy', 'kinetic', 'potential', 'conservation', 'spring', 'compressed'],
  rotational: ['rotation', 'angular', 'torque', 'moment of inertia', 'rolling'],
  pulley: ['pulley', 'rope', 'tension', 'atwood', 'string', 'massless'],
  simple_harmonic_motion: ['oscillation', 'oscillates', 'shm', 'simple harmonic', 'harmonic motion', 'spring mass', 'pendulum', 'period of oscillation', 'mass on a spring', 'mass on spring', 'spring constant'],
}

/**
 * Subtopic classification for thermodynamics
 */
const THERMODYNAMICS_SUBTOPICS: Record<string, string[]> = {
  ideal_gas: ['ideal gas', 'pv', 'nrt', 'mole', 'pressure', 'volume', 'boyle', 'charles', 'atm', 'litre'],
  first_law: ['first law', 'internal energy', 'heat absorbed', 'work done', 'adiabatic', 'isothermal', 'isobaric', 'isochoric', 'expansion', 'compression'],
  heat_engine: ['engine', 'carnot', 'efficiency', 'reservoir', 'cycle', 'refrigerator', 'heat pump'],
  calorimetry: ['calorimeter', 'specific heat', 'latent', 'melting', 'boiling', 'mixing', 'equilibrium temperature', 'placed in', 'mixed with', 'copper', 'water', 'ice', 'steam', 'aluminum'],
}

/**
 * Subtopic classification for electromagnetism
 */
const ELECTROMAGNETISM_SUBTOPICS: Record<string, string[]> = {
  coulomb_field: ['coulomb', 'electric field', 'point charge', 'force between', 'superposition'],
  gauss_law: ['gauss', 'flux', 'gaussian surface', 'sphere', 'cylinder', 'plane', 'enclosed'],
  capacitors: ['capacitor', 'capacitance', 'parallel plate', 'dielectric', 'stored energy', 'series capacitor', 'parallel capacitor'],
  dc_circuits: ['circuit', 'resistor', 'ohm', 'kirchhoff', 'current', 'voltage', 'series resistor', 'parallel resistor', 'emf'],
  magnetic_force: ['magnetic force', 'lorentz', 'moving charge', 'magnetic field', 'current carrying', 'wire in field'],
  em_induction: ['induction', 'faraday', 'lenz', 'induced emf', 'flux change', 'motional emf', 'generator'],
}

/**
 * Subtopic classification for optics
 */
const OPTICS_SUBTOPICS: Record<string, string[]> = {
  mirrors: ['mirror', 'concave', 'convex', 'reflection', 'focal length', 'image distance', 'magnification'],
  lenses: ['lens', 'converging', 'diverging', 'refraction', 'focal length', 'thin lens', 'power'],
  interference: ['interference', 'double slit', 'young', 'fringe', 'path difference', 'thin film', 'constructive', 'destructive'],
}

/**
 * Subtopic classification for waves
 */
const WAVES_SUBTOPICS: Record<string, string[]> = {
  standing_waves: ['standing wave', 'resonance', 'node', 'antinode', 'harmonic', 'fundamental', 'string fixed', 'pipe', 'organ'],
  doppler: ['doppler', 'moving source', 'moving observer', 'apparent frequency', 'approaching', 'receding', 'horn', 'siren', 'car', 'train', 'ambulance', 'observer hear'],
}

/**
 * Subtopic classification for modern physics
 */
const MODERN_SUBTOPICS: Record<string, string[]> = {
  photoelectric: ['photoelectric', 'work function', 'threshold', 'stopping potential', 'electron emission', 'metal surface', 'eV', 'nm'],
  bohr_model: ['bohr', 'hydrogen', 'energy level', 'orbit', 'spectral', 'lyman', 'balmer', 'paschen', 'rydberg', 'transition', 'n=', 'electron in'],
  nuclear_decay: ['radioactive', 'decay', 'half-life', 'alpha', 'beta', 'gamma', 'activity', 'nuclear', 'isotope', 'becquerel'],
}

/**
 * Quantities that problems typically ask for
 */
const ASKED_PATTERNS: Record<string, RegExp[]> = {
  acceleration: [/acceleration/i, /\ba\b.*=/, /find.*a\b/i],
  velocity: [/velocity/i, /speed/i, /\bv\b.*=/],
  force: [/force/i, /tension/i, /\bF\b.*=/, /\bT\b.*=/],
  time: [/time/i, /duration/i, /\bt\b.*=/],
  distance: [/distance/i, /displacement/i, /how far/i],
  height: [/height/i, /how high/i],
  angle: [/angle/i, /\bθ\b/, /theta/i],
  energy: [/energy/i, /kinetic/i, /potential/i],
  momentum: [/momentum/i, /\bp\b.*=/],
  normal_force: [/normal force/i, /\bN\b.*=/],
  friction: [/friction force/i, /\bf\b.*=/, /coefficient/i],
}

/**
 * Diagram type patterns
 */
const DIAGRAM_PATTERNS: Record<string, RegExp[]> = {
  fbd: [/free body/i, /fbd/i, /forces on/i, /all forces/i],
  incline: [/incline/i, /ramp/i, /slope/i, /wedge/i],
  pulley: [/pulley/i, /atwood/i, /rope.*over/i],
  circuit: [/circuit/i, /resistance/i, /capacitor/i],
  optics: [/lens/i, /mirror/i, /ray diagram/i],
}

/**
 * Patterns to extract numerical parameters from problem statements
 */
const NUMERICAL_PATTERNS = {
  // Angles: "30 degrees", "30°", "angle of 30", "inclined at 45"
  angles: [
    /(\d+(?:\.\d+)?)\s*(?:degrees?|°|deg)/gi,
    /angle\s+(?:of\s+)?(\d+(?:\.\d+)?)/gi,
    /inclined?\s+(?:at\s+)?(\d+(?:\.\d+)?)/gi,
    /(\d+(?:\.\d+)?)\s*(?:degree|°)\s*(?:incline|angle|slope)/gi,
  ],
  // Masses: "5 kg", "5-kg", "mass of 5"
  masses: [
    /(\d+(?:\.\d+)?)\s*(?:kg|kilogram|gram|g\b)/gi,
    /mass\s+(?:of\s+)?(\d+(?:\.\d+)?)/gi,
    /(\d+(?:\.\d+)?)\s*-?\s*kg/gi,
  ],
  // Distances: "10 m", "10 meters", "distance of 10"
  distances: [
    /(\d+(?:\.\d+)?)\s*(?:m\b|meter|metre|cm|km)/gi,
    /distance\s+(?:of\s+)?(\d+(?:\.\d+)?)/gi,
    /(\d+(?:\.\d+)?)\s*(?:m|meter)\s+(?:away|from|long)/gi,
  ],
  // Velocities: "15 m/s", "velocity of 15", "speed of 20"
  velocities: [
    /(\d+(?:\.\d+)?)\s*(?:m\/s|m\s*s\^?-1|meters?\s*per\s*second)/gi,
    /(?:velocity|speed)\s+(?:of\s+)?(\d+(?:\.\d+)?)/gi,
    /(\d+(?:\.\d+)?)\s*(?:km\/h|kmph|mph)/gi,
  ],
  // Forces: "100 N", "force of 50"
  forces: [
    /(\d+(?:\.\d+)?)\s*(?:N\b|newton)/gi,
    /force\s+(?:of\s+)?(\d+(?:\.\d+)?)/gi,
  ],
  // Times: "5 s", "5 seconds", "after 3"
  times: [
    /(\d+(?:\.\d+)?)\s*(?:s\b|sec|second)/gi,
    /(?:after|for|in)\s+(\d+(?:\.\d+)?)\s*(?:s\b|sec|second)/gi,
  ],
  // Heights: "80 m high", "height of 50", "80 meters tall"
  heights: [
    /(\d+(?:\.\d+)?)\s*(?:m|meter|metre)\s*(?:high|tall|above)/gi,
    /height\s+(?:of\s+)?(\d+(?:\.\d+)?)/gi,
    /(\d+(?:\.\d+)?)\s*(?:m|meter)\s+(?:cliff|tower|building)/gi,
  ],
}

// =============================================================================
// Fingerprinting Functions
// =============================================================================

/**
 * Compute SHA-256 hash of the normalized statement
 */
export function computeHash(statement: string, choices?: string[]): string {
  const normalized = normalizeStatement(statement)
  const content = choices
    ? `${normalized}::${choices.map(c => c.trim().toLowerCase()).sort().join('|')}`
    : normalized

  return crypto.createHash('sha256').update(content).digest('hex')
}

/**
 * Normalize statement for consistent hashing
 */
export function normalizeStatement(statement: string): string {
  return statement
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s.,?!$\-+=]/g, '')
    .trim()
}

/**
 * Extract fingerprint from problem statement WITHOUT LLM
 */
export function extractFingerprint(
  statement: string,
  providedTopic?: string,
  providedSubtopic?: string
): Fingerprint {
  const normalizedStatement = statement.toLowerCase()
  const words = normalizedStatement.split(/\s+/)

  // Classify topic
  const topic = providedTopic || classifyTopic(normalizedStatement, words)

  // Classify subtopic
  const subtopic = providedSubtopic || classifySubtopic(normalizedStatement, words, topic)

  // Extract what's being asked
  const asked = extractAskedQuantities(statement)

  // Extract key physics keywords
  const keywords = extractKeywords(normalizedStatement, words)

  // Detect diagram type
  const diagramType = detectDiagramType(statement)

  // Extract numerical parameters for similarity matching
  const numericalParams = extractNumericalParams(statement)

  return {
    topic,
    subtopic,
    asked,
    keywords,
    diagramType,
    numericalParams: Object.keys(numericalParams).length > 0 ? numericalParams : undefined,
  }
}

/**
 * Classify topic using keyword matching
 */
function classifyTopic(statement: string, words: string[]): string {
  const scores: Record<string, number> = {}

  for (const [topic, config] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0
    for (const keyword of config.keywords) {
      if (statement.includes(keyword)) {
        score += config.weight
      }
    }
    scores[topic] = score
  }

  // Find topic with highest score
  let bestTopic = 'mechanics' // Default
  let bestScore = 0

  for (const [topic, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      bestTopic = topic
    }
  }

  return bestTopic
}

/**
 * Get subtopic map for a given topic
 */
function getSubtopicMap(topic: string): Record<string, string[]> | null {
  switch (topic) {
    case 'mechanics':
      return MECHANICS_SUBTOPICS
    case 'thermodynamics':
      return THERMODYNAMICS_SUBTOPICS
    case 'electromagnetism':
      return ELECTROMAGNETISM_SUBTOPICS
    case 'optics':
      return OPTICS_SUBTOPICS
    case 'waves':
      return WAVES_SUBTOPICS
    case 'modern':
      return MODERN_SUBTOPICS
    default:
      return null
  }
}

/**
 * Get default subtopic for a topic
 */
function getDefaultSubtopic(topic: string): string {
  switch (topic) {
    case 'mechanics':
      return 'newton_laws_2d'
    case 'thermodynamics':
      return 'ideal_gas'
    case 'electromagnetism':
      return 'coulomb_field'
    case 'optics':
      return 'lenses'
    case 'waves':
      return 'standing_waves'
    case 'modern':
      return 'photoelectric'
    default:
      return 'general'
  }
}

/**
 * Classify subtopic based on topic
 */
function classifySubtopic(statement: string, words: string[], topic: string): string {
  const subtopicMap = getSubtopicMap(topic)

  if (!subtopicMap) {
    return 'general'
  }

  const scores: Record<string, number> = {}

  for (const [subtopic, keywords] of Object.entries(subtopicMap)) {
    let score = 0
    for (const keyword of keywords) {
      if (statement.includes(keyword)) {
        score++
      }
    }
    scores[subtopic] = score
  }

  // Find subtopic with highest score
  let bestSubtopic = getDefaultSubtopic(topic)
  let bestScore = 0

  for (const [subtopic, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      bestSubtopic = subtopic
    }
  }

  // Special case: Check for friction on inclined plane
  if (topic === 'mechanics' && bestSubtopic === 'inclined_plane' && statement.includes('friction')) {
    return 'inclined_plane_friction'
  }

  return bestSubtopic
}

/**
 * Extract what quantities the problem is asking for
 */
function extractAskedQuantities(statement: string): string[] {
  const asked: string[] = []

  for (const [quantity, patterns] of Object.entries(ASKED_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(statement)) {
        asked.push(quantity)
        break
      }
    }
  }

  // Default to acceleration if nothing specific found
  if (asked.length === 0) {
    asked.push('acceleration')
  }

  return asked
}

/**
 * Extract relevant physics keywords
 */
function extractKeywords(statement: string, words: string[]): string[] {
  const allKeywords = Object.values(TOPIC_KEYWORDS).flatMap(t => t.keywords)
  const found: string[] = []

  for (const keyword of allKeywords) {
    if (statement.includes(keyword) && !found.includes(keyword)) {
      found.push(keyword)
    }
  }

  return found.slice(0, 10) // Limit to 10 keywords
}

/**
 * Detect what type of diagram might be needed
 */
function detectDiagramType(statement: string): Fingerprint['diagramType'] {
  for (const [type, patterns] of Object.entries(DIAGRAM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(statement)) {
        return type as Fingerprint['diagramType']
      }
    }
  }

  // Check if any force-related problem - likely needs FBD
  if (/force|newton|acceleration|motion/.test(statement.toLowerCase())) {
    return 'fbd'
  }

  return 'none'
}

/**
 * Extract numerical parameters from problem statement
 * Used to distinguish questions with same concepts but different values
 */
function extractNumericalParams(statement: string): NumericalParams {
  const params: NumericalParams = {}

  for (const [paramType, patterns] of Object.entries(NUMERICAL_PATTERNS)) {
    const values: number[] = []

    for (const pattern of patterns) {
      // Reset regex lastIndex for global patterns
      pattern.lastIndex = 0
      let match
      while ((match = pattern.exec(statement)) !== null) {
        const value = parseFloat(match[1])
        if (!isNaN(value) && !values.includes(value)) {
          values.push(value)
        }
      }
    }

    if (values.length > 0) {
      // Sort values for consistent comparison
      values.sort((a, b) => a - b)
      params[paramType as keyof NumericalParams] = values
    }
  }

  return params
}

// =============================================================================
// Similarity Calculation
// =============================================================================

/**
 * Compute similarity between two fingerprints
 * Returns 0-1 score
 *
 * Weights (total 100):
 * - Topic: 30%
 * - Subtopic: 20%
 * - Numerical params: 25% (critical for distinguishing similar problems)
 * - Asked quantities: 10%
 * - Keywords: 10%
 * - Diagram type: 5%
 */
export function computeSimilarity(a: Fingerprint, b: Fingerprint): number {
  let score = 0
  let maxScore = 0

  // Topic match (30% weight)
  maxScore += 30
  if (a.topic === b.topic) {
    score += 30
  }

  // Subtopic match (20% weight)
  maxScore += 20
  if (a.subtopic === b.subtopic) {
    score += 20
  } else if (a.subtopic.includes(b.subtopic) || b.subtopic.includes(a.subtopic)) {
    score += 10
  }

  // Numerical parameters similarity (25% weight - critical for value differences)
  maxScore += 25
  const numericalSimilarity = computeNumericalSimilarity(a.numericalParams, b.numericalParams)
  score += 25 * numericalSimilarity

  // Asked quantities overlap (10% weight)
  maxScore += 10
  const askedOverlap = setOverlap(new Set(a.asked), new Set(b.asked))
  score += 10 * askedOverlap

  // Keywords overlap (10% weight)
  maxScore += 10
  const keywordOverlap = setOverlap(new Set(a.keywords), new Set(b.keywords))
  score += 10 * keywordOverlap

  // Diagram type match (5% weight)
  maxScore += 5
  if (a.diagramType === b.diagramType) {
    score += 5
  }

  return score / maxScore
}

/**
 * Compute similarity between numerical parameters
 * Returns 0-1 score where 1 means identical values
 */
function computeNumericalSimilarity(
  a: NumericalParams | undefined,
  b: NumericalParams | undefined
): number {
  // If both are undefined, consider them similar (conceptual match)
  if (!a && !b) return 0.8

  // If only one has numerical params, low similarity
  if (!a || !b) return 0.3

  const paramTypes: (keyof NumericalParams)[] = [
    'angles', 'masses', 'distances', 'velocities', 'forces', 'times', 'heights'
  ]

  let totalScore = 0
  let totalWeight = 0

  for (const paramType of paramTypes) {
    const aVals = a[paramType]
    const bVals = b[paramType]

    // Both have this parameter type
    if (aVals && bVals) {
      totalWeight += 1
      // Compare values - exact match or close enough?
      const similarity = compareNumberArrays(aVals, bVals)
      totalScore += similarity
    }
    // Only one has this parameter type
    else if (aVals || bVals) {
      totalWeight += 1
      totalScore += 0.2 // Penalty for missing parameter
    }
    // Neither has this parameter - no contribution
  }

  if (totalWeight === 0) return 0.8 // No params to compare
  return totalScore / totalWeight
}

/**
 * Compare two arrays of numbers for similarity
 * Returns 1 for exact match, decreases based on differences
 */
function compareNumberArrays(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    // Different number of values - partial match at best
    const minLen = Math.min(a.length, b.length)
    const maxLen = Math.max(a.length, b.length)
    let matchScore = 0

    for (let i = 0; i < minLen; i++) {
      if (a[i] === b[i]) {
        matchScore += 1
      } else {
        // Check relative difference
        const relDiff = Math.abs(a[i] - b[i]) / Math.max(Math.abs(a[i]), Math.abs(b[i]), 1)
        if (relDiff < 0.1) matchScore += 0.8
        else if (relDiff < 0.2) matchScore += 0.5
      }
    }

    return (matchScore / maxLen) * 0.8 // Penalty for length mismatch
  }

  // Same length - compare element by element
  let matchScore = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) {
      matchScore += 1
    } else {
      // Check relative difference
      const relDiff = Math.abs(a[i] - b[i]) / Math.max(Math.abs(a[i]), Math.abs(b[i]), 1)
      if (relDiff < 0.05) matchScore += 0.9  // Very close (5%)
      else if (relDiff < 0.1) matchScore += 0.7  // Close (10%)
      else if (relDiff < 0.2) matchScore += 0.4  // Somewhat close (20%)
      else matchScore += 0  // Different values
    }
  }

  return matchScore / a.length
}

/**
 * Compute Jaccard overlap between two sets
 */
function setOverlap<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 1
  if (a.size === 0 || b.size === 0) return 0

  const intersection = new Set([...a].filter(x => b.has(x)))
  const union = new Set([...a, ...b])

  return intersection.size / union.size
}
