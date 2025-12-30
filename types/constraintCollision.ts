/**
 * Constraint Collision Engine Types
 * For detecting when student work contradicts problem constraints
 */

// ============================================
// Physical Object Types
// ============================================

export type ObjectType =
  | 'block'
  | 'sphere'
  | 'particle'
  | 'bead'
  | 'rope'
  | 'string'
  | 'pulley'
  | 'spring'
  | 'incline'
  | 'surface'
  | 'hoop'
  | 'disk'
  | 'rod'
  | 'fluid'
  | 'container'
  | 'wedge'

export type ObjectAttribute =
  | { type: 'mass'; value: number | 'negligible'; unit: string }
  | { type: 'dimensions'; length?: number; radius?: number; unit: string }
  | { type: 'material'; value: string }
  | { type: 'charge'; value: number; unit: string }
  | { type: 'velocity'; magnitude: number; direction: string; unit: string }
  | { type: 'custom'; name: string; value: string }

export interface PhysicalObject {
  id: string
  type: ObjectType
  label: string
  attributes: ObjectAttribute[]
  position?: {
    relative?: string
    coordinate?: { x: number; y: number }
  }
}

// ============================================
// Interaction Types
// ============================================

export type InteractionType =
  | 'contact'
  | 'tension'
  | 'spring_connection'
  | 'gravitational'
  | 'electromagnetic'
  | 'constraint'

export type SurfaceProperty = 'rough' | 'smooth' | 'frictionless'
export type StringProperty = 'taut' | 'slack' | 'inextensible' | 'massless'

export type InteractionAttribute =
  | { type: 'surface_property'; value: SurfaceProperty }
  | { type: 'friction_coefficient'; static?: number; kinetic?: number }
  | { type: 'string_property'; value: StringProperty }
  | { type: 'spring_constant'; value: number; unit: string }
  | { type: 'angle'; value: number; unit: 'degrees' | 'radians' }
  | { type: 'custom'; name: string; value: string }

export interface Interaction {
  id: string
  type: InteractionType
  objects: [string, string]
  attributes: InteractionAttribute[]
}

// ============================================
// Constraint Types
// ============================================

export type ConstraintCategory =
  | 'kinematic'
  | 'force'
  | 'conservation'
  | 'boundary'
  | 'approximation'
  | 'reference_frame'

export interface StatedConstraint {
  id: string
  category: ConstraintCategory
  rawText: string
  normalizedForm: string
  sourceLocation: {
    startIndex: number
    endIndex: number
  }
}

export interface ImpliedConstraint {
  id: string
  category: ConstraintCategory
  description: string
  derivedFrom: {
    type: 'interaction' | 'object_attribute' | 'stated_constraint'
    sourceId: string
  }
  implicationRule: string
}

// ============================================
// Implication Rules
// ============================================

export interface ImplicationRuleCondition {
  type: 'interaction' | 'object_attribute' | 'stated_constraint'
  interactionType?: InteractionType
  objectType?: ObjectType
  attributeType?: string
  attributeValue?: string | string[] | number
  rawTextContains?: string[]
}

export interface ImplicationRule {
  id: string
  name: string
  description: string
  condition: ImplicationRuleCondition
  implies: {
    category: ConstraintCategory
    description: string
    physicsRationale: string
    normalizedForm: string
  }
  domain: string[]
  priority: number
}

// ============================================
// Problem Constraint Data
// ============================================

export interface ProblemConstraintData {
  problemId: string
  physicalObjects: PhysicalObject[]
  interactions: Interaction[]
  statedConstraints: StatedConstraint[]
  impliedConstraints: ImpliedConstraint[]
  extractionMetadata: {
    timestamp: string
    confidence: number
  }
}

// ============================================
// Student Assumption Types
// ============================================

export interface StudentAssumption {
  id: string
  type: 'explicit' | 'implicit'
  description: string
  evidence: string
  category: ConstraintCategory
  affectsForces?: string[]
  affectsEquations?: string[]
}

export interface StudentWorkAnalysis {
  assumptions: StudentAssumption[]
  forcesConsidered: string[]
  forcesMissing: string[]
  equationsUsed: string[]
  referenceFrame?: string
}

// ============================================
// Collision Detection Types
// ============================================

export type CollisionType =
  | 'OMISSION'
  | 'ADDITION'
  | 'REVERSAL'
  | 'SUBSTITUTION'

export type CollisionSeverity = 'low' | 'medium' | 'high'

export interface ConstraintCollision {
  id: string
  problemConstraint: StatedConstraint | ImpliedConstraint
  studentAssumption: StudentAssumption | null
  collisionType: CollisionType
  severity: CollisionSeverity
  errorPatternId: string
  affectedStepIds: number[]
  explanation: string
  confidence: number
}

// ============================================
// Socratic Dialogue Types
// ============================================

export type DialogueStrategy =
  | 'DIRECT_QUESTION'
  | 'CONTRAST_PROMPT'
  | 'REREAD_NUDGE'
  | 'PHYSICAL_INTUITION'
  | 'FORCE_ENUMERATION'

export interface SocraticDialogue {
  question: string
  strategy: DialogueStrategy
  followUpPrompts: string[]
  problemReferenceHint: string
  relatedConceptIds: string[]
  highlightProblemText?: {
    startIndex: number
    endIndex: number
  }
}

// ============================================
// Constraint Detection Pattern
// ============================================

export interface ConstraintPattern {
  pattern: RegExp
  implies: string
  category: ConstraintCategory
  extractValue?: boolean
}

export interface ConstraintPatternGroup {
  surfaceProperties: ConstraintPattern[]
  stringProperties: ConstraintPattern[]
  pulleyProperties: ConstraintPattern[]
  motionConstraints: ConstraintPattern[]
  approximations: ConstraintPattern[]
}
