/**
 * Feynman Micro-Prompt Keyword Rules
 *
 * Topic-specific keyword configurations for the semantic validator.
 * These help detect shallow vs deep understanding.
 */

import type { TopicKeywords } from '@/types/feynman'

/**
 * Common mechanism words that indicate causal reasoning
 */
export const COMMON_MECHANISM_WORDS = [
  'because', 'since', 'therefore', 'thus', 'hence',
  'causes', 'results in', 'leads to', 'due to',
  'as a result', 'consequently', 'this means',
  'which makes', 'so that', 'in order to',
  'the reason is', 'this happens when'
]

/**
 * Generic forbidden patterns (apply to all topics)
 */
export const GENERIC_FORBIDDEN_PATTERNS = [
  'by definition',
  'that\'s the law',
  'we learned that',
  'the formula says',
  'it just is',
  'that\'s how it works',
  'my teacher said',
  'the textbook says',
  'you just have to memorize',
  'it\'s always true'
]

/**
 * Physics topic-specific keyword rules
 */
export const PHYSICS_KEYWORDS: Record<string, TopicKeywords> = {
  'conservation-of-momentum': {
    topic: 'Conservation of Momentum',
    description: 'Understanding why momentum is conserved in isolated systems',
    requiredConcepts: [
      'no external force',
      'isolated system',
      'internal forces cancel',
      'newton\'s third law',
      'action-reaction',
      'net force zero',
      'equal and opposite',
      'no outside influence'
    ],
    mechanismWords: COMMON_MECHANISM_WORDS,
    forbiddenPatterns: [
      ...GENERIC_FORBIDDEN_PATTERNS,
      'momentum is conserved because it\'s conserved',
      'it just stays the same',
      'total momentum doesn\'t change',
      'p before equals p after'
    ],
    exampleGoodExplanation: 'Momentum is conserved because there are no external forces acting on the system. The internal forces between objects are equal and opposite (Newton\'s third law), so they cancel out and don\'t change the total momentum.',
    exampleBadExplanations: [
      'Momentum is conserved because that\'s the law of conservation of momentum.',
      'The total momentum stays the same because momentum is always conserved.',
      'p₁ + p₂ = p₁\' + p₂\' because of conservation.'
    ]
  },

  'conservation-of-energy': {
    topic: 'Conservation of Energy',
    description: 'Understanding why mechanical energy is conserved',
    requiredConcepts: [
      'no friction',
      'no dissipation',
      'no non-conservative force',
      'closed system',
      'work-energy',
      'transforms',
      'converts',
      'potential to kinetic',
      'no heat loss',
      'conservative forces only'
    ],
    mechanismWords: COMMON_MECHANISM_WORDS,
    forbiddenPatterns: [
      ...GENERIC_FORBIDDEN_PATTERNS,
      'energy can\'t be created or destroyed',
      'energy is always conserved',
      'KE + PE = constant'
    ],
    exampleGoodExplanation: 'Mechanical energy is conserved here because only gravity (a conservative force) does work on the object. There\'s no friction to dissipate energy as heat, so energy just transforms between kinetic and potential forms without any loss.',
    exampleBadExplanations: [
      'Energy is conserved because energy cannot be created or destroyed.',
      'The total energy stays the same because of the law of conservation of energy.',
      'E_initial = E_final because energy is conserved.'
    ]
  },

  'normal-force': {
    topic: 'Normal Force',
    description: 'Understanding the origin and direction of normal force',
    requiredConcepts: [
      'contact',
      'perpendicular',
      'surface pushes back',
      'prevents penetration',
      'reaction force',
      'electromagnetic',
      'molecular repulsion',
      'deformation',
      'compression'
    ],
    mechanismWords: COMMON_MECHANISM_WORDS,
    forbiddenPatterns: [
      ...GENERIC_FORBIDDEN_PATTERNS,
      'N equals mg',
      'it\'s always equal to weight',
      'normal means perpendicular',
      'the surface just pushes'
    ],
    exampleGoodExplanation: 'The normal force exists because when an object presses against a surface, the surface molecules are compressed slightly. This compression creates an electromagnetic repulsion that pushes back, preventing the object from passing through. The force is perpendicular to the surface.',
    exampleBadExplanations: [
      'Normal force equals mg because that\'s the formula.',
      'The surface exerts a normal force because it\'s a surface.',
      'N is perpendicular because normal means perpendicular.'
    ]
  },

  'friction': {
    topic: 'Friction Force',
    description: 'Understanding the origin and behavior of friction',
    requiredConcepts: [
      'surface roughness',
      'microscopic',
      'interlocking',
      'adhesion',
      'opposes motion',
      'relative motion',
      'normal force dependent',
      'contact area independent'
    ],
    mechanismWords: COMMON_MECHANISM_WORDS,
    forbiddenPatterns: [
      ...GENERIC_FORBIDDEN_PATTERNS,
      'f equals mu N',
      'friction opposes motion',
      'rough surfaces have more friction'
    ],
    exampleGoodExplanation: 'Friction arises because even "smooth" surfaces have microscopic bumps and irregularities. These interlock and create resistance when surfaces try to slide. The harder you press (larger normal force), the more these microscopic features engage, increasing friction.',
    exampleBadExplanations: [
      'Friction is μN because that\'s the formula.',
      'Friction opposes motion because that\'s what friction does.',
      'Rough surfaces have more friction because they\'re rough.'
    ]
  },

  'centripetal-force': {
    topic: 'Centripetal Force',
    description: 'Understanding why circular motion requires center-pointing force',
    requiredConcepts: [
      'change in direction',
      'velocity changing',
      'acceleration toward center',
      'not a new force',
      'net force',
      'inertia',
      'tendency to go straight',
      'continuous turning'
    ],
    mechanismWords: COMMON_MECHANISM_WORDS,
    forbiddenPatterns: [
      ...GENERIC_FORBIDDEN_PATTERNS,
      'centripetal force pulls inward',
      'F = mv²/r',
      'objects in circular motion need centripetal force'
    ],
    exampleGoodExplanation: 'An object moving in a circle is constantly changing direction, which means its velocity is changing even if speed is constant. This change in velocity is acceleration, and by Newton\'s second law, acceleration requires a force. The force must point toward the center to continuously bend the path into a circle.',
    exampleBadExplanations: [
      'Centripetal force is needed for circular motion because F = mv²/r.',
      'The centripetal force pulls the object toward the center.',
      'Circular motion requires centripetal force by definition.'
    ]
  },

  'newtons-third-law': {
    topic: 'Newton\'s Third Law',
    description: 'Understanding action-reaction pairs',
    requiredConcepts: [
      'interaction',
      'mutual',
      'same type',
      'different objects',
      'simultaneous',
      'equal magnitude',
      'opposite direction',
      'cannot cancel'
    ],
    mechanismWords: COMMON_MECHANISM_WORDS,
    forbiddenPatterns: [
      ...GENERIC_FORBIDDEN_PATTERNS,
      'every action has reaction',
      'forces are equal and opposite',
      'action equals reaction'
    ],
    exampleGoodExplanation: 'Forces always come in pairs because a force is an interaction between two objects. When object A pushes on B, B must push back on A with equal force because they\'re experiencing the same interaction from opposite perspectives. These forces act on different objects, so they don\'t cancel.',
    exampleBadExplanations: [
      'For every action there is an equal and opposite reaction.',
      'The forces are equal and opposite because of Newton\'s third law.',
      'Action and reaction are always equal.'
    ]
  },

  'tension-force': {
    topic: 'Tension in Strings/Ropes',
    description: 'Understanding how tension transmits force',
    requiredConcepts: [
      'pulls',
      'along the string',
      'both ends',
      'transmits force',
      'massless',
      'inextensible',
      'same throughout',
      'cannot push'
    ],
    mechanismWords: COMMON_MECHANISM_WORDS,
    forbiddenPatterns: [
      ...GENERIC_FORBIDDEN_PATTERNS,
      'tension equals weight',
      'T = mg',
      'the string pulls'
    ],
    exampleGoodExplanation: 'Tension arises when a string is stretched between two points. The string\'s molecules resist being pulled apart, creating an internal pulling force that transmits through its length. It pulls equally on both attached objects, always along the direction of the string.',
    exampleBadExplanations: [
      'Tension is mg because the weight pulls on the string.',
      'The string has tension because something is hanging from it.',
      'T equals the weight of the object.'
    ]
  },

  'free-body-diagram': {
    topic: 'Free Body Diagram Analysis',
    description: 'Understanding force identification on isolated objects',
    requiredConcepts: [
      'isolate',
      'contact forces',
      'field forces',
      'what touches',
      'gravity always',
      'direction matters',
      'point of application'
    ],
    mechanismWords: COMMON_MECHANISM_WORDS,
    forbiddenPatterns: [
      ...GENERIC_FORBIDDEN_PATTERNS,
      'draw all the forces',
      'include every force'
    ],
    exampleGoodExplanation: 'To identify forces, I isolate the object mentally and ask: What\'s touching it? Each contact point can exert normal and friction forces. Then I consider field forces like gravity that act without contact. Each force has a specific physical origin.',
    exampleBadExplanations: [
      'Draw all forces acting on the object.',
      'Include weight, normal, and friction.',
      'Forces point in different directions.'
    ]
  },

  'equilibrium': {
    topic: 'Static Equilibrium',
    description: 'Understanding conditions for no motion',
    requiredConcepts: [
      'net force zero',
      'balanced',
      'no acceleration',
      'forces cancel',
      'vector sum',
      'each direction',
      'torque zero'
    ],
    mechanismWords: COMMON_MECHANISM_WORDS,
    forbiddenPatterns: [
      ...GENERIC_FORBIDDEN_PATTERNS,
      'sum of forces is zero',
      'the object is balanced',
      'forces are equal'
    ],
    exampleGoodExplanation: 'An object in equilibrium isn\'t accelerating, which by Newton\'s second law means the net force must be zero. This means if I add up all force components in any direction, they must cancel out - what pushes right must equal what pushes left.',
    exampleBadExplanations: [
      'The object is in equilibrium because forces balance.',
      'Sum of forces equals zero for equilibrium.',
      'The forces are equal and opposite.'
    ]
  },

  'inclined-plane': {
    topic: 'Forces on Inclined Plane',
    description: 'Understanding force components on slopes',
    requiredConcepts: [
      'component',
      'parallel',
      'perpendicular',
      'weight splits',
      'angle',
      'sine',
      'cosine',
      'coordinate system'
    ],
    mechanismWords: COMMON_MECHANISM_WORDS,
    forbiddenPatterns: [
      ...GENERIC_FORBIDDEN_PATTERNS,
      'mg sin theta',
      'mg cos theta',
      'weight has components'
    ],
    exampleGoodExplanation: 'On an incline, gravity still pulls straight down, but it\'s useful to split this into parts: one pulling the object down the slope (causing sliding tendency) and one pushing into the slope (determining normal force). The steeper the angle, the more weight goes into the sliding component.',
    exampleBadExplanations: [
      'The component down the slope is mg sin θ.',
      'Weight decomposes into parallel and perpendicular.',
      'Use mg sin θ and mg cos θ for the components.'
    ]
  }
}

/**
 * Get keywords for a topic (case-insensitive, flexible matching)
 */
export function getTopicKeywords(topic: string): TopicKeywords | null {
  const normalizedTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, '-')
  
  // Direct match
  if (PHYSICS_KEYWORDS[normalizedTopic]) {
    return PHYSICS_KEYWORDS[normalizedTopic]
  }
  
  // Partial match
  for (const [key, value] of Object.entries(PHYSICS_KEYWORDS)) {
    if (key.includes(normalizedTopic) || normalizedTopic.includes(key)) {
      return value
    }
    if (value.topic.toLowerCase().includes(topic.toLowerCase())) {
      return value
    }
  }
  
  return null
}

/**
 * Get all available topics
 */
export function getAvailableTopics(): string[] {
  return Object.keys(PHYSICS_KEYWORDS)
}
