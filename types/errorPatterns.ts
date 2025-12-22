// Error Pattern Memory System Types

export type ErrorCategory =
  | 'CONCEPTUAL_CONFUSION'      // Mixing up fundamental concepts
  | 'METHOD_SELECTION'          // Choosing wrong approach/method
  | 'SIGN_CONVENTION'          // Getting signs wrong
  | 'UNIT_CONVERSION'          // Unit-related errors
  | 'ALGEBRA_MANIPULATION'     // Mathematical manipulation errors
  | 'ASSUMPTION_VIOLATION'     // Invalid assumptions
  | 'BOUNDARY_CONDITIONS'      // Ignoring constraints
  | 'VECTOR_SCALAR_CONFUSION'  // Mixing vector/scalar quantities
  | 'CONSERVATION_MISAPPLICATION' // Wrongly applying conservation laws
  | 'REFERENCE_FRAME'          // Reference frame issues

export interface ErrorPattern {
  id: string
  category: ErrorCategory
  title: string                 // e.g., "Chooses energy when force analysis is required"
  description: string           // Detailed explanation of the pattern
  commonIn: string[]           // Topics where this error commonly appears
  severity: 'low' | 'medium' | 'high' // Impact on problem solving
  remediation: string          // How to fix this pattern
  relatedConcepts: string[]    // Related physics concepts
}

export interface StudentErrorInstance {
  id: string
  studentId: string
  patternId: string
  problemId: string
  timestamp: string
  problemText: string          // The problem where error occurred
  studentAttempt: string       // What the student tried
  correctApproach: string      // What should have been done
  context: {
    topic: string
    difficulty: string
    hintsUsed: number
    timeSpent: number          // seconds
  }
}

export interface ErrorPatternSummary {
  pattern: ErrorPattern
  occurrences: number
  firstSeen: string
  lastSeen: string
  instances: StudentErrorInstance[]
  trend: 'improving' | 'persistent' | 'worsening'
  mastered: boolean            // True if student hasn't made this error in 5+ problems
}

export interface ErrorAnalysisRequest {
  problemText: string
  studentAttempt: string
  correctApproach: string
  topic: string
  hintsUsed: number
}

export interface ErrorAnalysisResponse {
  patterns: {
    patternId: string
    confidence: number         // 0-1, how confident the LLM is
    reasoning: string          // Why this pattern was identified
  }[]
  summary: string             // Human-readable summary
  recommendations: string[]    // What student should review
}

export interface ErrorPatternInsight {
  type: 'warning' | 'celebration' | 'info'
  message: string
  patternId: string
  actionable: string          // Specific action student can take
  relatedResources?: string[] // Links to study materials
}

// Pre-defined common error patterns for IIT-JEE Physics
export const COMMON_ERROR_PATTERNS: ErrorPattern[] = [
  {
    id: 'EP001',
    category: 'METHOD_SELECTION',
    title: 'Chooses energy when force analysis is required',
    description: 'Student attempts to use energy conservation or work-energy theorem when the problem explicitly requires force analysis (Newton\'s laws).',
    commonIn: ['Mechanics', 'Dynamics', 'Circular Motion'],
    severity: 'high',
    remediation: 'Practice identifying when forces are changing or when instantaneous quantities (force, acceleration) are asked for.',
    relatedConcepts: ['Newton\'s Laws', 'Work-Energy Theorem', 'Force Analysis']
  },
  {
    id: 'EP002',
    category: 'CONSERVATION_MISAPPLICATION',
    title: 'Applies conservation when external work exists',
    description: 'Student uses energy or momentum conservation in situations where external forces do work or external impulses exist.',
    commonIn: ['Mechanics', 'Collisions', 'Energy'],
    severity: 'high',
    remediation: 'Always check: Are there external forces? Is the system isolated? Draw a system boundary.',
    relatedConcepts: ['Conservation Laws', 'System vs Surroundings', 'External Forces']
  },
  {
    id: 'EP003',
    category: 'SIGN_CONVENTION',
    title: 'Gets sign conventions wrong in 1D motion',
    description: 'Inconsistent or incorrect use of positive/negative directions in kinematics problems.',
    commonIn: ['Kinematics', '1D Motion', 'Projectile Motion'],
    severity: 'medium',
    remediation: 'Always define coordinate system first. Stick to chosen convention throughout problem.',
    relatedConcepts: ['Vectors', 'Coordinate Systems', 'Kinematics']
  },
  {
    id: 'EP004',
    category: 'VECTOR_SCALAR_CONFUSION',
    title: 'Treats vector quantity as scalar',
    description: 'Student adds or manipulates vector quantities without considering direction.',
    commonIn: ['Vectors', 'Force', 'Velocity', 'Electric Field'],
    severity: 'high',
    remediation: 'Always ask: Is this a vector? If yes, use component method or vector addition rules.',
    relatedConcepts: ['Vector Addition', 'Components', 'Direction']
  },
  {
    id: 'EP005',
    category: 'REFERENCE_FRAME',
    title: 'Mixes reference frames in analysis',
    description: 'Student switches between different reference frames (ground, moving observer) without proper transformation.',
    commonIn: ['Relative Motion', 'Rotating Systems', 'Non-inertial Frames'],
    severity: 'high',
    remediation: 'Choose ONE reference frame and stick to it. Use relative velocity/acceleration formulas explicitly.',
    relatedConcepts: ['Reference Frames', 'Relative Motion', 'Pseudo Forces']
  },
  {
    id: 'EP006',
    category: 'ASSUMPTION_VIOLATION',
    title: 'Assumes massless string/pulley when mass matters',
    description: 'Student treats strings or pulleys as massless when their mass affects the problem.',
    commonIn: ['Pulleys', 'Rotational Motion', 'Atwood Machine'],
    severity: 'medium',
    remediation: 'Read problem carefully. If mass is given, it matters. Include it in analysis.',
    relatedConcepts: ['Pulleys', 'Tension', 'Rotational Inertia']
  },
  {
    id: 'EP007',
    category: 'UNIT_CONVERSION',
    title: 'Forgets to convert units before calculation',
    description: 'Student mixes different units (cm with m, minutes with seconds) without conversion.',
    commonIn: ['All Topics'],
    severity: 'low',
    remediation: 'Convert ALL quantities to SI units BEFORE starting calculations.',
    relatedConcepts: ['Units', 'Dimensional Analysis']
  },
  {
    id: 'EP008',
    category: 'CONCEPTUAL_CONFUSION',
    title: 'Confuses displacement with distance traveled',
    description: 'Student uses distance when displacement is needed, or vice versa.',
    commonIn: ['Kinematics', 'Work', 'Energy'],
    severity: 'medium',
    remediation: 'Displacement is vector (shortest path). Distance is scalar (actual path). Work uses displacement.',
    relatedConcepts: ['Displacement', 'Distance', 'Work']
  },
  {
    id: 'EP009',
    category: 'ALGEBRA_MANIPULATION',
    title: 'Makes algebraic errors with squared terms',
    description: 'Student incorrectly manipulates squared terms, especially in kinematic equations.',
    commonIn: ['Kinematics', 'Energy', 'SHM'],
    severity: 'low',
    remediation: 'Practice: (a+b)² ≠ a²+b². When squaring, expand carefully.',
    relatedConcepts: ['Algebra', 'Kinematic Equations']
  },
  {
    id: 'EP010',
    category: 'BOUNDARY_CONDITIONS',
    title: 'Ignores constraints in the problem',
    description: 'Student misses stated constraints like "string remains taut" or "block doesn\'t slip".',
    commonIn: ['Constraints', 'Mechanics', 'Rotational Motion'],
    severity: 'high',
    remediation: 'Underline ALL constraint statements. They give extra equations.',
    relatedConcepts: ['Constraints', 'Additional Equations', 'Problem Reading']
  },
  {
    id: 'EP011',
    category: 'METHOD_SELECTION',
    title: 'Uses complicated method when simple one exists',
    description: 'Student chooses long algebraic approach when symmetry or conservation law gives quick solution.',
    commonIn: ['All Topics'],
    severity: 'medium',
    remediation: 'Before solving: Check for symmetry, conservation laws, or special cases.',
    relatedConcepts: ['Problem Solving Strategy', 'Efficiency']
  },
  {
    id: 'EP012',
    category: 'CONCEPTUAL_CONFUSION',
    title: 'Confuses normal force with weight',
    description: 'Student assumes normal force always equals weight, even in accelerating systems.',
    commonIn: ['Forces', 'Circular Motion', 'Lifts/Elevators'],
    severity: 'high',
    remediation: 'Normal force = perpendicular contact force. NOT always equal to weight. Use F=ma.',
    relatedConcepts: ['Normal Force', 'Weight', 'Contact Forces']
  },
]
