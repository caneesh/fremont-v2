/**
 * Constraint Extractor
 * Extracts physics constraints from problem text using regex patterns
 */

import type {
  ProblemConstraintData,
  StatedConstraint,
  ImpliedConstraint,
  PhysicalObject,
  Interaction,
  ConstraintCategory,
  ObjectType,
} from '@/types/constraintCollision'
import {
  CONSTRAINT_PATTERNS,
  getAllPatterns,
  IMPLICATION_RULES,
  CONSTRAINT_DESCRIPTIONS,
} from './constraintImplicationRules'

/**
 * Extract constraints from problem statement text
 */
export function extractConstraints(
  problemText: string,
  problemId: string
): ProblemConstraintData {
  const statedConstraints = extractStatedConstraints(problemText)
  const physicalObjects = extractPhysicalObjects(problemText)
  const interactions = extractInteractions(problemText, physicalObjects)
  const impliedConstraints = deriveImpliedConstraints(
    statedConstraints,
    interactions,
    physicalObjects
  )

  return {
    problemId,
    physicalObjects,
    interactions,
    statedConstraints,
    impliedConstraints,
    extractionMetadata: {
      timestamp: new Date().toISOString(),
      confidence: calculateConfidence(statedConstraints, impliedConstraints),
    },
  }
}

/**
 * Extract explicitly stated constraints using regex patterns
 */
export function extractStatedConstraints(problemText: string): StatedConstraint[] {
  const constraints: StatedConstraint[] = []
  const patterns = getAllPatterns()
  let constraintId = 1

  for (const patternDef of patterns) {
    const matches = problemText.matchAll(new RegExp(patternDef.pattern, 'gi'))

    for (const match of matches) {
      if (match.index !== undefined) {
        constraints.push({
          id: `SC${String(constraintId++).padStart(3, '0')}`,
          category: patternDef.category,
          rawText: match[0],
          normalizedForm: patternDef.implies,
          sourceLocation: {
            startIndex: match.index,
            endIndex: match.index + match[0].length,
          },
        })
      }
    }
  }

  // Deduplicate constraints with same normalized form
  return deduplicateConstraints(constraints)
}

/**
 * Extract physical objects mentioned in problem
 */
export function extractPhysicalObjects(problemText: string): PhysicalObject[] {
  const objects: PhysicalObject[] = []
  const objectPatterns: Array<{ pattern: RegExp; type: ObjectType }> = [
    { pattern: /\b(?:a\s+)?block(?:\s+of\s+mass\s+([\d.]+)\s*kg)?/gi, type: 'block' },
    { pattern: /\b(?:a\s+)?sphere(?:\s+of\s+mass\s+([\d.]+)\s*kg)?/gi, type: 'sphere' },
    { pattern: /\b(?:a\s+)?(?:bead|particle)/gi, type: 'particle' },
    { pattern: /\b(?:a\s+)?pulley/gi, type: 'pulley' },
    { pattern: /\b(?:a\s+)?(?:string|rope|cord)/gi, type: 'string' },
    { pattern: /\b(?:a\s+)?spring/gi, type: 'spring' },
    { pattern: /\b(?:an?\s+)?incline(?:d\s+plane)?/gi, type: 'incline' },
    { pattern: /\b(?:a\s+)?wedge/gi, type: 'wedge' },
    { pattern: /\b(?:a\s+)?(?:disk|disc)/gi, type: 'disk' },
    { pattern: /\b(?:a\s+)?hoop/gi, type: 'hoop' },
    { pattern: /\b(?:a\s+)?rod/gi, type: 'rod' },
  ]

  let objectId = 1

  for (const { pattern, type } of objectPatterns) {
    const matches = problemText.matchAll(pattern)
    for (const match of matches) {
      objects.push({
        id: `OBJ${String(objectId++).padStart(3, '0')}`,
        type,
        label: match[0].trim(),
        attributes: extractObjectAttributes(match, type, problemText),
      })
    }
  }

  return objects
}

/**
 * Extract attributes for a physical object
 */
function extractObjectAttributes(
  match: RegExpMatchArray,
  type: ObjectType,
  problemText: string
): PhysicalObject['attributes'] {
  const attributes: PhysicalObject['attributes'] = []

  // Check for mass in the match or nearby text
  if (match[1]) {
    attributes.push({
      type: 'mass',
      value: parseFloat(match[1]),
      unit: 'kg',
    })
  }

  // Check for massless/light object
  const masslessPattern = new RegExp(
    `(?:massless|light)\\s+${type}|${type}\\s+(?:is\\s+)?(?:massless|light)`,
    'i'
  )
  if (masslessPattern.test(problemText)) {
    attributes.push({
      type: 'mass',
      value: 'negligible',
      unit: 'kg',
    })
  }

  return attributes
}

/**
 * Extract interactions between objects
 */
export function extractInteractions(
  problemText: string,
  objects: PhysicalObject[]
): Interaction[] {
  const interactions: Interaction[] = []
  let interactionId = 1

  // Check for surface contacts
  const surfacePatterns = [
    { pattern: /on\s+(?:a\s+)?(?:rough|smooth|frictionless)\s+(?:surface|plane|incline)/i, property: 'surface_property' },
    { pattern: /(?:rough|smooth|frictionless)\s+(?:surface|plane|incline|floor|table)/i, property: 'surface_property' },
  ]

  for (const { pattern } of surfacePatterns) {
    const match = problemText.match(pattern)
    if (match) {
      const surfaceProperty = match[0].toLowerCase().includes('rough')
        ? 'rough'
        : match[0].toLowerCase().includes('smooth') || match[0].toLowerCase().includes('frictionless')
        ? 'frictionless'
        : 'rough'

      // Find the object that's on this surface
      const blockObj = objects.find(o => o.type === 'block' || o.type === 'sphere' || o.type === 'particle')
      const surfaceObj = objects.find(o => o.type === 'incline' || o.type === 'surface')

      interactions.push({
        id: `INT${String(interactionId++).padStart(3, '0')}`,
        type: 'contact',
        objects: [blockObj?.id || 'unknown', surfaceObj?.id || 'surface'],
        attributes: [
          { type: 'surface_property', value: surfaceProperty as 'rough' | 'smooth' | 'frictionless' },
        ],
      })
    }
  }

  // Check for string/rope connections
  const stringObj = objects.find(o => o.type === 'string' || o.type === 'rope')
  if (stringObj) {
    const connectedObjects = objects.filter(
      o => o.type === 'block' || o.type === 'sphere' || o.type === 'particle'
    )

    for (const obj of connectedObjects) {
      const stringAttributes: Interaction['attributes'] = []

      // Check string properties
      if (/(?:massless|light)\s+(?:string|rope)/i.test(problemText)) {
        stringAttributes.push({ type: 'string_property', value: 'massless' })
      }
      if (/(?:string|rope)\s+remains?\s+taut/i.test(problemText)) {
        stringAttributes.push({ type: 'string_property', value: 'taut' })
      }
      if (/inextensible/i.test(problemText)) {
        stringAttributes.push({ type: 'string_property', value: 'inextensible' })
      }

      if (stringAttributes.length > 0) {
        interactions.push({
          id: `INT${String(interactionId++).padStart(3, '0')}`,
          type: 'tension',
          objects: [stringObj.id, obj.id],
          attributes: stringAttributes,
        })
      }
    }
  }

  return interactions
}

/**
 * Derive implied constraints from stated constraints and interactions
 */
export function deriveImpliedConstraints(
  statedConstraints: StatedConstraint[],
  interactions: Interaction[],
  objects: PhysicalObject[]
): ImpliedConstraint[] {
  const implied: ImpliedConstraint[] = []
  let impliedId = 1

  // Check each implication rule
  for (const rule of IMPLICATION_RULES) {
    let matched = false
    let sourceId = ''
    let sourceType: 'interaction' | 'object_attribute' | 'stated_constraint' = 'stated_constraint'

    // Check stated constraints for rawTextContains
    if (rule.condition.rawTextContains) {
      for (const constraint of statedConstraints) {
        const matchesRaw = rule.condition.rawTextContains.some(text =>
          constraint.rawText.toLowerCase().includes(text.toLowerCase())
        )
        if (matchesRaw) {
          matched = true
          sourceId = constraint.id
          sourceType = 'stated_constraint'
          break
        }
      }
    }

    // Check interactions
    if (!matched && rule.condition.type === 'interaction') {
      for (const interaction of interactions) {
        if (
          rule.condition.interactionType &&
          interaction.type === rule.condition.interactionType
        ) {
          // Check attribute match
          const attrMatch = interaction.attributes.some(attr => {
            if (rule.condition.attributeType && attr.type === rule.condition.attributeType) {
              if (rule.condition.attributeValue) {
                const values = Array.isArray(rule.condition.attributeValue)
                  ? rule.condition.attributeValue
                  : [rule.condition.attributeValue]
                return values.includes((attr as { value?: string }).value || '')
              }
              return true
            }
            return false
          })

          if (attrMatch) {
            matched = true
            sourceId = interaction.id
            sourceType = 'interaction'
            break
          }
        }
      }
    }

    // Check object attributes
    if (!matched && rule.condition.type === 'object_attribute') {
      for (const obj of objects) {
        if (rule.condition.objectType && obj.type === rule.condition.objectType) {
          const attrMatch = obj.attributes.some(attr => {
            if (rule.condition.attributeType && attr.type === rule.condition.attributeType) {
              if (rule.condition.attributeValue) {
                return (attr as { value?: string | number }).value === rule.condition.attributeValue
              }
              return true
            }
            return false
          })

          if (attrMatch) {
            matched = true
            sourceId = obj.id
            sourceType = 'object_attribute'
            break
          }
        }
      }
    }

    if (matched) {
      implied.push({
        id: `IC${String(impliedId++).padStart(3, '0')}`,
        category: rule.implies.category,
        description: rule.implies.description,
        derivedFrom: {
          type: sourceType,
          sourceId,
        },
        implicationRule: rule.id,
      })
    }
  }

  return implied
}

/**
 * Deduplicate constraints with same normalized form
 */
function deduplicateConstraints(constraints: StatedConstraint[]): StatedConstraint[] {
  const seen = new Set<string>()
  return constraints.filter(c => {
    if (seen.has(c.normalizedForm)) {
      return false
    }
    seen.add(c.normalizedForm)
    return true
  })
}

/**
 * Calculate confidence score for extraction
 */
function calculateConfidence(
  stated: StatedConstraint[],
  implied: ImpliedConstraint[]
): number {
  // Higher confidence with more constraints found
  const constraintCount = stated.length + implied.length
  if (constraintCount === 0) return 0.3 // Low confidence if nothing found
  if (constraintCount <= 2) return 0.6
  if (constraintCount <= 5) return 0.8
  return 0.9
}

/**
 * Get human-readable description of a constraint
 */
export function getConstraintDescription(normalizedForm: string): string {
  return CONSTRAINT_DESCRIPTIONS[normalizedForm] || normalizedForm
}

/**
 * Check if a specific constraint type is present
 */
export function hasConstraint(
  constraintData: ProblemConstraintData,
  normalizedForm: string
): boolean {
  return (
    constraintData.statedConstraints.some(c => c.normalizedForm === normalizedForm) ||
    constraintData.impliedConstraints.some(c =>
      IMPLICATION_RULES.find(r => r.id === c.implicationRule)?.implies.normalizedForm === normalizedForm
    )
  )
}

/**
 * Get all friction-related constraints
 */
export function getFrictionConstraints(
  constraintData: ProblemConstraintData
): (StatedConstraint | ImpliedConstraint)[] {
  const frictionForms = ['friction_present', 'frictionless', 'friction_coefficient']

  const stated = constraintData.statedConstraints.filter(c =>
    frictionForms.includes(c.normalizedForm)
  )

  const implied = constraintData.impliedConstraints.filter(c => {
    const rule = IMPLICATION_RULES.find(r => r.id === c.implicationRule)
    return rule && frictionForms.includes(rule.implies.normalizedForm)
  })

  return [...stated, ...implied]
}

/**
 * Determine if problem has friction
 */
export function problemHasFriction(constraintData: ProblemConstraintData): boolean {
  return (
    hasConstraint(constraintData, 'friction_present') ||
    hasConstraint(constraintData, 'friction_coefficient')
  )
}

/**
 * Determine if problem is frictionless
 */
export function problemIsFrictionless(constraintData: ProblemConstraintData): boolean {
  return hasConstraint(constraintData, 'frictionless')
}
