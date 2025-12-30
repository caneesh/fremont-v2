// Physics Misconception Detection Types

/**
 * A detected misconception in student's physics reasoning
 */
export interface DetectedMisconception {
  id: string
  type: MisconceptionType
  description: string
  evidence: string // The student text that triggered detection
  confidence: number // 0-1
  clarificationQuestion: string // Socratic question to address the misconception
  correctUnderstanding: string // Brief explanation of correct concept (hidden from student initially)
  relatedConcept: string
  severity: 'low' | 'medium' | 'high'
}

/**
 * Categories of physics misconceptions
 */
export type MisconceptionType =
  | 'FORCE_NATURE' // e.g., "centripetal force is a new force"
  | 'FORCE_DIRECTION' // e.g., "friction always opposes motion"
  | 'ENERGY_CONFUSION' // e.g., "potential energy is stored in the object"
  | 'REFERENCE_FRAME' // e.g., "centrifugal force is real"
  | 'CONSERVATION_SCOPE' // e.g., "energy is always conserved in any system"
  | 'VECTOR_SCALAR' // e.g., "velocity and speed are the same"
  | 'EQUILIBRIUM' // e.g., "no motion means no forces"
  | 'ACTION_REACTION' // e.g., "action-reaction forces cancel out"
  | 'WORK_FORCE' // e.g., "force always does work"
  | 'INERTIA' // e.g., "heavier objects fall faster"

/**
 * A known physics misconception pattern
 */
export interface MisconceptionPattern {
  id: string
  type: MisconceptionType
  title: string
  description: string
  patterns: RegExp[] // Regex patterns to detect this misconception
  keywords: string[] // Keywords that might indicate this misconception
  clarificationQuestions: string[] // Pool of Socratic questions
  correctUnderstanding: string
  relatedConcepts: string[]
  topics: string[] // Physics topics where this commonly appears
  severity: 'low' | 'medium' | 'high'
}

/**
 * Result of misconception detection analysis
 */
export interface MisconceptionAnalysisResult {
  detected: DetectedMisconception[]
  analysisTimestamp: string
  totalPatternChecked: number
}

/**
 * Common physics misconceptions database
 */
export const PHYSICS_MISCONCEPTIONS: MisconceptionPattern[] = [
  // FORCE_NATURE misconceptions
  {
    id: 'MC001',
    type: 'FORCE_NATURE',
    title: 'Centripetal force as a separate/new force',
    description: 'Student believes centripetal force is a distinct force rather than the net force toward the center provided by other forces (tension, gravity, normal, friction).',
    patterns: [
      /centripetal\s+force\s+(?:is|acts\s+as|provides|gives)\s+(?:a\s+)?(?:new|additional|separate|fourth|extra)\s+force/i,
      /(?:the\s+)?centripetal\s+force\s+(?:and|along\s+with|plus|in\s+addition\s+to)\s+(?:tension|gravity|normal|friction)/i,
      /add(?:ing)?\s+(?:the\s+)?centripetal\s+force\s+to\s+(?:the\s+)?(?:other\s+)?forces/i,
      /centripetal\s+force\s+pulls?\s+(?:the\s+)?(?:object|body|mass|block)/i,
    ],
    keywords: ['centripetal force', 'circular motion', 'new force', 'additional force'],
    clarificationQuestions: [
      'Centripetal force describes the NET force direction, not a new force. Looking at your free body diagram, which actual force(s) point toward the center?',
      'If centripetal force were a "new" force, what physical interaction would cause it? What is actually pulling the object toward the center?',
      'In circular motion, we don\'t draw centripetal force on an FBD. What real forces (tension, gravity, normal, friction) provide the center-pointing net force here?',
    ],
    correctUnderstanding: 'Centripetal force is not a new type of force. It is the name for the net force (or component of net force) that points toward the center of the circular path. This net force is provided by real forces like tension, gravity, normal force, or friction.',
    relatedConcepts: ['Circular Motion', 'Free Body Diagrams', 'Net Force'],
    topics: ['Circular Motion', 'Dynamics', 'Rotational Motion'],
    severity: 'high',
  },
  {
    id: 'MC002',
    type: 'REFERENCE_FRAME',
    title: 'Centrifugal force as a real force',
    description: 'Student treats centrifugal force as a real force in an inertial reference frame.',
    patterns: [
      /centrifugal\s+force\s+(?:acts|pushes|pulls|throws)/i,
      /(?:the\s+)?centrifugal\s+force\s+(?:on|acting\s+on)\s+(?:the\s+)?(?:object|body|mass|block|particle)/i,
      /balanced?\s+by\s+(?:the\s+)?centrifugal\s+force/i,
    ],
    keywords: ['centrifugal force', 'outward force', 'thrown outward'],
    clarificationQuestions: [
      'Centrifugal force only appears in rotating (non-inertial) reference frames. Are you analyzing this problem from the ground or from the rotating object\'s perspective?',
      'If you\'re in an inertial frame (like standing on the ground), what real force would push the object outward? Or is the object simply trying to continue in a straight line?',
      'Consider Newton\'s first law: without a net force, objects move in straight lines. What appears as "being pushed outward" is really just inertia. What force is actually acting toward the center?',
    ],
    correctUnderstanding: 'Centrifugal force is a pseudo-force that only appears in rotating (non-inertial) reference frames. In an inertial frame, there is no outward force - objects simply tend to move in straight lines (inertia), and a real inward force is needed to keep them moving in a circle.',
    relatedConcepts: ['Reference Frames', 'Pseudo Forces', 'Inertia', 'Circular Motion'],
    topics: ['Circular Motion', 'Non-inertial Frames', 'Rotational Motion'],
    severity: 'high',
  },
  {
    id: 'MC003',
    type: 'FORCE_DIRECTION',
    title: 'Friction always opposes motion',
    description: 'Student believes friction always opposes the direction of motion, rather than opposing relative motion or impending motion.',
    patterns: [
      /friction\s+(?:always\s+)?(?:opposes|acts\s+against|is\s+opposite\s+to)\s+(?:the\s+)?(?:direction\s+of\s+)?motion/i,
      /friction\s+is\s+(?:always\s+)?backward/i,
      /friction\s+(?:must\s+be|is)\s+opposite\s+(?:to\s+)?velocity/i,
    ],
    keywords: ['friction opposes', 'friction backward', 'friction against motion'],
    clarificationQuestions: [
      'Friction opposes *relative* motion between surfaces. If a box sits on an accelerating truck, which way does friction act on the box?',
      'When you walk forward, your foot pushes backward on the ground. What direction does friction from the ground push on your foot?',
      'Consider static friction: it can point in any direction to prevent slipping. In this problem, what would happen if friction weren\'t there? That tells you friction\'s direction.',
    ],
    correctUnderstanding: 'Friction opposes relative motion (or impending relative motion) between two surfaces, not necessarily the object\'s motion relative to the ground. Static friction can point in any direction needed to prevent slipping. For example, friction accelerates you forward when you walk.',
    relatedConcepts: ['Static Friction', 'Kinetic Friction', 'Relative Motion'],
    topics: ['Friction', 'Dynamics', 'Mechanics'],
    severity: 'medium',
  },
  {
    id: 'MC004',
    type: 'ACTION_REACTION',
    title: 'Action-reaction forces cancel out',
    description: 'Student believes Newton\'s third law pairs cancel because they are equal and opposite.',
    patterns: [
      /action\s+(?:and\s+)?reaction\s+(?:forces?\s+)?cancel/i,
      /(?:they\s+)?cancel\s+(?:out\s+)?because\s+(?:they\s+are\s+)?equal\s+and\s+opposite/i,
      /third\s+law\s+(?:pairs?\s+)?cancel/i,
      /normal\s+(?:force\s+)?(?:and\s+)?weight\s+(?:are\s+)?action[- ]reaction/i,
    ],
    keywords: ['action reaction cancel', 'equal opposite cancel', 'third law cancel'],
    clarificationQuestions: [
      'Action-reaction pairs act on DIFFERENT objects. For forces to cancel, they must act on the SAME object. Which object are you analyzing?',
      'Draw separate FBDs for each object. Does the action force appear on the same FBD as the reaction force?',
      'If action-reaction pairs cancelled, nothing could ever accelerate. When a bat hits a ball, the ball accelerates because only the bat\'s force acts ON the ball. What force acts on the ball in your problem?',
    ],
    correctUnderstanding: 'Newton\'s third law pairs act on DIFFERENT objects, so they never cancel. For forces to cancel (sum to zero), they must act on the SAME object. Normal force and weight on the same object are NOT action-reaction pairs - they happen to be equal in equilibrium but act on the same object.',
    relatedConcepts: ['Newton\'s Third Law', 'Free Body Diagrams', 'Force Pairs'],
    topics: ['Newton\'s Laws', 'Dynamics', 'Force Analysis'],
    severity: 'high',
  },
  {
    id: 'MC005',
    type: 'EQUILIBRIUM',
    title: 'No motion means no forces',
    description: 'Student believes that if an object is stationary, no forces act on it.',
    patterns: [
      /(?:no|zero)\s+(?:net\s+)?force\s+because\s+(?:it\s+is\s+)?(?:stationary|at\s+rest|not\s+moving)/i,
      /(?:it\s+)?(?:is\s+)?not\s+moving\s+(?:so\s+)?(?:there\s+are\s+)?no\s+forces/i,
      /at\s+rest\s+(?:so\s+)?no\s+forces\s+act/i,
    ],
    keywords: ['at rest no force', 'stationary no force', 'not moving no force'],
    clarificationQuestions: [
      'A book on a table is stationary. Is gravity not acting on it? If gravity acts, what prevents the book from accelerating downward?',
      'Equilibrium means forces BALANCE (net force = 0), not that forces are ABSENT. What forces are balancing here?',
      'Newton\'s first law says an object at rest stays at rest if net force is zero. But "net force = 0" can mean many forces that sum to zero. What forces are present?',
    ],
    correctUnderstanding: 'A stationary object may have many forces acting on it that sum to zero (equilibrium). No motion means zero NET force, not zero forces. For example, a book on a table has gravity pulling down and normal force pushing up - these balance but are definitely present.',
    relatedConcepts: ['Equilibrium', 'Newton\'s First Law', 'Net Force'],
    topics: ['Statics', 'Newton\'s Laws', 'Force Analysis'],
    severity: 'medium',
  },
  {
    id: 'MC006',
    type: 'INERTIA',
    title: 'Heavier objects fall faster',
    description: 'Student believes heavier objects fall faster than lighter ones (ignoring air resistance).',
    patterns: [
      /(?:heavier|heavier\s+objects?|more\s+mass)\s+fall(?:s)?\s+faster/i,
      /falls?\s+faster\s+because\s+(?:it\s+is\s+)?(?:heavier|more\s+massive)/i,
      /(?:greater|more)\s+(?:weight|mass)\s+(?:means?\s+)?(?:greater|more|faster)\s+acceleration/i,
    ],
    keywords: ['heavier falls faster', 'more mass faster fall', 'weight acceleration'],
    clarificationQuestions: [
      'A heavier object has more gravitational force, but also more inertia (harder to accelerate). How do mass and weight relate in the equation F = ma for a falling object?',
      'Write out Newton\'s second law for a falling object: mg = ma. What happens when you solve for acceleration?',
      'Galileo showed all objects fall at the same rate (ignoring air resistance). The extra weight of a heavier object is exactly compensated by its extra inertia. Can you verify this mathematically?',
    ],
    correctUnderstanding: 'In free fall (ignoring air resistance), all objects accelerate at g regardless of mass. Although heavier objects experience more gravitational force (F = mg), they also have more inertia. From F = ma: mg = ma, so a = g for all masses.',
    relatedConcepts: ['Free Fall', 'Inertia', 'Newton\'s Second Law', 'Gravitational Force'],
    topics: ['Kinematics', 'Gravity', 'Newton\'s Laws'],
    severity: 'high',
  },
  {
    id: 'MC007',
    type: 'WORK_FORCE',
    title: 'Force always does work',
    description: 'Student believes that any force acting on an object does work on it.',
    patterns: [
      /(?:the\s+)?force\s+does\s+work\s+(?:because\s+)?(?:it\s+is\s+)?acting/i,
      /work\s+(?:is\s+)?done\s+by\s+all\s+(?:the\s+)?forces/i,
      /(?:normal\s+force|tension)\s+does\s+work.*(?:vertical|horizontal)/i,
    ],
    keywords: ['force does work', 'normal force work', 'perpendicular work'],
    clarificationQuestions: [
      'Work = Force × displacement × cos(angle between them). If a force is perpendicular to displacement, what is cos(90°)?',
      'When you carry a box horizontally, you exert an upward force, but the displacement is horizontal. Does your force do work on the box?',
      'Consider the normal force on a block sliding on a horizontal surface. The normal force points up, but the block moves horizontally. What work does normal force do?',
    ],
    correctUnderstanding: 'Work is done only when a force has a component along the direction of displacement: W = F·d·cos(θ). A force perpendicular to motion does zero work (cos 90° = 0). For example, normal force on a horizontal surface does no work on a sliding object.',
    relatedConcepts: ['Work', 'Dot Product', 'Energy Transfer'],
    topics: ['Work and Energy', 'Mechanics'],
    severity: 'medium',
  },
  {
    id: 'MC008',
    type: 'CONSERVATION_SCOPE',
    title: 'Energy is always conserved',
    description: 'Student applies mechanical energy conservation even when non-conservative forces (like friction) do work.',
    patterns: [
      /(?:using\s+)?energy\s+conservation.*(?:with\s+)?friction/i,
      /(?:PE|KE|potential|kinetic)\s+(?:\+|plus).*friction.*conserved/i,
      /mechanical\s+energy\s+(?:is\s+)?conserved.*(?:friction|dissipative)/i,
    ],
    keywords: ['energy conservation friction', 'mechanical energy friction'],
    clarificationQuestions: [
      'Mechanical energy (KE + PE) is only conserved when ONLY conservative forces do work. Friction is non-conservative. What happens to the "lost" mechanical energy?',
      'Write the work-energy theorem: ΔKE = W_net. If friction does negative work, where does that energy go?',
      'Instead of "energy conservation," use "work-energy theorem" when friction is present. How would you write: (KE + PE)_initial + W_friction = (KE + PE)_final?',
    ],
    correctUnderstanding: 'Mechanical energy (KE + PE) is conserved only when only conservative forces do work. When friction or other non-conservative forces act, mechanical energy is NOT conserved - some is converted to thermal energy. Use: E_final = E_initial + W_non-conservative.',
    relatedConcepts: ['Energy Conservation', 'Non-conservative Forces', 'Work-Energy Theorem', 'Dissipation'],
    topics: ['Energy', 'Friction', 'Thermodynamics'],
    severity: 'high',
  },
  {
    id: 'MC009',
    type: 'VECTOR_SCALAR',
    title: 'Velocity and speed are the same',
    description: 'Student treats velocity and speed as interchangeable without considering direction.',
    patterns: [
      /velocity\s+(?:is\s+)?(?:the\s+)?same\s+(?:as\s+)?speed/i,
      /speed\s+(?:is\s+)?(?:the\s+)?same\s+(?:as\s+)?velocity/i,
      /velocity\s*=\s*\d+\s*(?:m\/s|km\/h)(?!\s*(?:north|south|east|west|up|down|at\s+\d+))/i,
    ],
    keywords: ['velocity speed same', 'velocity is speed'],
    clarificationQuestions: [
      'A car going around a circular track at constant speed has constant speed but changing velocity. Why is velocity changing even though speed is constant?',
      'Velocity is a vector (magnitude AND direction). Speed is only the magnitude. In this problem, does direction matter?',
      'When you write "velocity = 5 m/s", that\'s actually speed. What\'s the direction? How would you properly express velocity?',
    ],
    correctUnderstanding: 'Velocity is a vector quantity with both magnitude and direction. Speed is a scalar - just the magnitude of velocity. An object can have constant speed but changing velocity (if direction changes), like in circular motion. Always specify direction for velocity.',
    relatedConcepts: ['Vectors vs Scalars', 'Kinematics', 'Circular Motion'],
    topics: ['Kinematics', 'Vectors', 'Circular Motion'],
    severity: 'medium',
  },
  {
    id: 'MC010',
    type: 'ENERGY_CONFUSION',
    title: 'Potential energy stored in object',
    description: 'Student believes potential energy is stored within an object rather than in the system/field.',
    patterns: [
      /(?:the\s+)?(?:object|block|ball|body)\s+(?:has|stores|contains)\s+potential\s+energy/i,
      /potential\s+energy\s+(?:of|in|stored\s+in)\s+(?:the\s+)?(?:object|block|ball|body)/i,
      /PE\s+(?:is\s+)?stored\s+in\s+(?:the\s+)?(?:object|mass)/i,
    ],
    keywords: ['stored potential energy', 'object has PE', 'PE in object'],
    clarificationQuestions: [
      'Potential energy belongs to a SYSTEM, not a single object. Gravitational PE exists due to the Earth-object system. If there were no Earth, would the object have gravitational PE?',
      'Where is spring potential energy stored - in the block attached to the spring, in the spring, or in the spring-block system?',
      'If you move a charged particle, does it have potential energy, or does the system of charges have potential energy?',
    ],
    correctUnderstanding: 'Potential energy is a property of a SYSTEM, not a single object. Gravitational PE exists in the Earth-object system, spring PE in the spring-object system, and electrical PE in the system of charges. It represents energy stored in the configuration/field.',
    relatedConcepts: ['Potential Energy', 'Systems', 'Fields', 'Energy Storage'],
    topics: ['Energy', 'Gravity', 'Electrostatics'],
    severity: 'low',
  },
  {
    id: 'MC011',
    type: 'FORCE_NATURE',
    title: 'Tension pulls in one direction only',
    description: 'Student thinks tension only acts on one end of a string, or acts in only one direction.',
    patterns: [
      /tension\s+(?:only\s+)?(?:pulls|acts)\s+(?:on\s+)?(?:one\s+)?(?:end|side|object)/i,
      /tension\s+(?:is\s+)?(?:only\s+)?(?:pulling|acting)\s+(?:upward|downward|left|right)/i,
    ],
    keywords: ['tension one direction', 'tension one end'],
    clarificationQuestions: [
      'Tension in a rope acts equally at both ends, but in OPPOSITE directions (pulling each end toward the middle). Draw the FBD for each object separately - which way does tension pull on each?',
      'If tension only pulled one object, Newton\'s third law would be violated. What is the reaction force to the tension on object A?',
      'A rope connecting two blocks has tension T. Block A feels tension pulling right, block B feels tension pulling left. Both experience the same magnitude. Can you draw this?',
    ],
    correctUnderstanding: 'Tension acts equally at both ends of a rope but in opposite directions - each end is pulled toward the center of the rope. This satisfies Newton\'s third law. When drawing FBDs for connected objects, tension pulls each object toward the rope.',
    relatedConcepts: ['Tension', 'Newton\'s Third Law', 'Ropes and Pulleys'],
    topics: ['Dynamics', 'Connected Bodies', 'Pulleys'],
    severity: 'medium',
  },
  {
    id: 'MC012',
    type: 'FORCE_DIRECTION',
    title: 'Normal force always equals weight',
    description: 'Student assumes normal force equals mg regardless of acceleration or incline.',
    patterns: [
      /normal\s+(?:force\s+)?(?:is\s+)?(?:=|equals?)\s*(?:m\s*g|mg|weight)/i,
      /N\s*=\s*(?:m\s*g|mg|weight)(?!\s*cos)/i,
      /normal\s+(?:force\s+)?(?:is\s+)?(?:always\s+)?equal\s+to\s+(?:the\s+)?weight/i,
    ],
    keywords: ['normal equals weight', 'N = mg', 'normal force weight'],
    clarificationQuestions: [
      'Normal force is whatever is needed to prevent the object from passing through the surface. In an elevator accelerating upward, does N = mg?',
      'On an inclined plane, only part of the weight pushes into the surface. What component of weight does normal force balance?',
      'Normal force is a constraint force - it adjusts based on the situation. Apply Newton\'s second law perpendicular to the surface. What do you get for N?',
    ],
    correctUnderstanding: 'Normal force equals mg only in special cases (object on horizontal surface with no vertical acceleration). Generally, N ≠ mg. On inclines: N = mg cos(θ). In accelerating systems: N = m(g ± a). Always use Newton\'s second law to find N.',
    relatedConcepts: ['Normal Force', 'Inclined Planes', 'Accelerating Systems'],
    topics: ['Dynamics', 'Inclined Planes', 'Elevators'],
    severity: 'high',
  },
]
