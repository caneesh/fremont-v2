import Anthropic from '@anthropic-ai/sdk'
import { FEATURE_FLAGS } from './featureFlags'
import type { DiagramStepData, RequiredForce, ScenarioType, ObjectShape } from '@/types/diagram'
import type { PreFlightCheck, PreCondition, TrapOption, PreFlightCheckItem } from '@/types/preFlightCheck'

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface SolverResponse {
  solution: string
  domain: string
  subdomain: string
}

/**
 * Error Anticipator Response (Pass 1.5)
 * Identifies common conceptual traps and maps them to specific steps
 */
export interface ErrorAnticipatorResponse {
  commonTraps: Array<{
    title: string           // Short name (e.g., "Sign Convention Error")
    description: string     // Detailed explanation of the misconception
    tags: string[]          // Category tags (e.g., ["sign", "vector"])
  }>
  warningBeacons: Array<{
    stepId: number          // Which step this applies to
    message: string         // Non-spoilery warning (e.g., "Watch your signs here")
    tag: string             // Links to a trap tag
  }>
}

/**
 * Step type for hint routing
 */
export type StepType = 'diagram' | 'physics_concept' | 'math_manipulation' | 'sanity_check'

/**
 * Scaffold density level (1=micro-steps, 5=macro-milestones)
 */
export type ScaffoldDensity = 1 | 2 | 3 | 4 | 5

export interface ScaffolderResponse {
  problem: string
  domain: string
  subdomain: string
  density?: ScaffoldDensity
  concepts: Array<{
    id: string
    name: string
    definition: string
    formula?: string
  }>
  steps: Array<{
    id: number
    title: string
    stepType?: StepType
    diagramData?: DiagramStepData
    prerequisites?: string[]
    hints: Array<{
      level: 1 | 2 | 3 | 4 | 5
      title: 'Concept Identification' | 'Visualization' | 'Strategy Selection' | 'Structural Equation' | 'Full Solution'
      content: string
    }>
    requiredConcepts: string[]
    question?: string
    validationPrompt?: string
    feynmanPrompt?: {
      topic: string
      question: string
      context?: string
      minScore?: number
      maxAttempts?: number
    }
  }>
  sanityCheck: {
    question: string
    expectedBehavior: string
    type: 'limit' | 'dimension' | 'symmetry'
  }
  sanityCheckMatrix?: {
    limitCheck: {
      question: string
      setupPrompt: string
      expectedReasoning: string
      commonMistakes: string[]
      physicalInsight: string
    }
    symmetryCheck: {
      question: string
      setupPrompt: string
      expectedReasoning: string
      commonMistakes: string[]
      physicalInsight: string
    }
    dimensionCheck: {
      question: string
      setupPrompt: string
      expectedReasoning: string
      commonMistakes: string[]
      physicalInsight: string
    }
  }
  // Pre-Flight Checks for formula condition validation
  preFlightChecks?: PreFlightCheck[]
}

// Micro-Task Response Types
export interface MicroTaskScaffolderResponse {
  problem: string
  domain: string
  subdomain: string
  density?: ScaffoldDensity
  concepts: Array<{
    id: string
    name: string
    definition: string
    formula?: string
  }>
  steps: Array<{
    id: number
    title: string
    stepType?: StepType
    diagramData?: DiagramStepData
    prerequisites?: string[]
    tasks: Array<{
      level: 1 | 2 | 3 | 4 | 5
      levelTitle: 'Concept' | 'Visual' | 'Strategy' | 'Equation' | 'Solution'
      type: 'MULTIPLE_CHOICE' | 'FILL_BLANK'
      question: string
      // For MULTIPLE_CHOICE
      options?: string[]
      correctIndex?: number
      // For FILL_BLANK
      sentence?: string
      correctTerm?: string
      distractors?: string[]
      // Common
      explanation: string
    }>
    requiredConcepts: string[]
    feynmanPrompt?: {
      topic: string
      question: string
      context?: string
      minScore?: number
      maxAttempts?: number
    }
  }>
  sanityCheck: {
    question: string
    expectedBehavior: string
    type: 'limit' | 'dimension' | 'symmetry'
  }
  sanityCheckMatrix?: {
    limitCheck: {
      question: string
      setupPrompt: string
      expectedReasoning: string
      commonMistakes: string[]
      physicalInsight: string
    }
    symmetryCheck: {
      question: string
      setupPrompt: string
      expectedReasoning: string
      commonMistakes: string[]
      physicalInsight: string
    }
    dimensionCheck: {
      question: string
      setupPrompt: string
      expectedReasoning: string
      commonMistakes: string[]
      physicalInsight: string
    }
  }
}

/**
 * Density descriptions for prompt generation
 */
const DENSITY_DESCRIPTIONS: Record<ScaffoldDensity, { steps: string; detail: string }> = {
  1: { steps: '8-12', detail: 'extremely detailed micro-steps, breaking down every small reasoning step' },
  2: { steps: '6-8', detail: 'detailed steps with explicit sub-tasks' },
  3: { steps: '4-6', detail: 'balanced steps covering key milestones' },
  4: { steps: '3-4', detail: 'condensed high-level steps' },
  5: { steps: '2-3', detail: 'macro-milestones only, for advanced students' },
}

/**
 * ULTRA-FAST: Progressive Hint Loading
 * Only generates Levels 1-3 initially (15-20s)
 * Levels 4-5 generated on-demand when user clicks (~3s each)
 *
 * @param problem - The problem statement text
 * @param diagramImage - Optional base64-encoded diagram image (data:image/...)
 * @param density - Scaffold density level (1=micro, 5=macro). Default: 3
 */
export async function generateScaffold(
  problem: string,
  diagramImage?: string,
  density: ScaffoldDensity = 3
): Promise<ScaffolderResponse> {
  const densityConfig = DENSITY_DESCRIPTIONS[density]

  const combinedPrompt = `You are an expert IIT-JEE Physics teacher with 20+ years of experience.${diagramImage ? '\n\nNOTE: The student has provided a diagram for this problem. Analyze it carefully along with the problem text.' : ''}

CONTEXT: This problem is for students preparing for IIT-JEE (Indian Institute of Technology Joint Entrance Examination), one of the world's most competitive engineering entrance exams. Students need rigorous understanding of physics concepts, mathematical techniques, and problem-solving strategies at the Irodov/Kleppner level.

SCAFFOLD DENSITY: Level ${density}/5 - Generate ${densityConfig.steps} steps with ${densityConfig.detail}.

PROBLEM:
${problem}

YOUR TASK (TWO INTERNAL STEPS):

STEP 1 (INTERNAL - DO NOT OUTPUT):
First, solve this problem completely in your mind:
- Identify the physics domain and subdomain
- Solve with full mathematical rigor (IIT-JEE Advanced level)
- Verify using limit cases or dimensional analysis
- Identify common pitfalls

STEP 2 (OUTPUT THIS):
Based on your internal solution, create a Socratic learning scaffold with:

1. CONCEPTS: List 4-6 key physics concepts needed
   - Each: id (lowercase-with-dashes), name, definition (2-3 sentences), optional formula
   - Use standard JEE notation and LaTeX: $ for inline, $$ for display

2. STEPS: Break into ${densityConfig.steps} logical thinking milestones.
   For EACH step, you MUST include:

   a) stepType - Classify as one of:
      - "diagram": Setting up coordinate system, drawing forces, visualizing geometry
      - "physics_concept": Applying physics laws, identifying principles, conceptual reasoning
      - "math_manipulation": Algebraic manipulation, calculus, solving equations
      - "sanity_check": Verifying limits, dimensions, physical reasonableness

   b) feynmanPrompt (OPTIONAL but RECOMMENDED for physics_concept steps):
      For steps involving key physics concepts, add a Feynman micro-prompt that asks the student
      to EXPLAIN WHY the concept works BEFORE they start calculating. This builds deep understanding.

      Include feynmanPrompt when:
      - The step applies a fundamental physics law (conservation laws, Newton's laws, etc.)
      - The step requires understanding a non-obvious physical mechanism
      - Students commonly memorize formulas without understanding the underlying physics

      DO NOT include feynmanPrompt for:
      - Pure math manipulation steps
      - Diagram/setup steps (use diagram canvas instead)
      - Steps that just substitute values

      Format:
      "feynmanPrompt": {
        "topic": "conservation-of-momentum" (kebab-case topic identifier),
        "question": "Why is momentum conserved when these objects collide?",
        "context": "No external forces act on the system" (optional setup context)
      }

   c) prerequisites - Array of concept tags this step requires (use concept ids)

   d) hints - ONLY THE FIRST 3 HINT LEVELS (for faster generation):

   Level 1 - Concept Identification:
   • Guide student to identify applicable laws/concepts WITHOUT stating them
   • Example: "Think about what happens to quantities in a rotating system"

   Level 2 - Visualization:
   • Help visualize without showing diagram
   • Prompt about coordinate systems, forces, trajectories
   • Example: "Sketch forces as seen from the rotating platform"

   Level 3 - Strategy Selection:
   • Guide toward solution strategy without revealing equations
   • Example: "Consider energy methods vs force balance - which is cleaner?"

   HINT STYLE BY STEP TYPE:
   - For "physics_concept" steps: Use Socratic questions, no formula dumps
   - For "math_manipulation" steps: Provide math-coach hints (identity reminders, algebra tips)
   - For "diagram" steps: Focus on visualization and setup
   - For "sanity_check" steps: Guide toward limiting cases and physical intuition

   NOTE: Levels 4-5 will be generated on-demand when the student requests them.
   IMPORTANT: Only include hints for levels 1, 2, and 3 in the JSON output.

3. SANITY CHECK: One reality check question
   - Limiting case (e.g., "What happens when ω → 0?")
   - Expected physical behavior with reasoning
   - Type: 'limit', 'dimension', or 'symmetry'

4. PRE-FLIGHT CHECKS (OPTIONAL - for steps using major physics laws):
   When a step applies one of these physics laws, add a preFlightCheck to verify conditions BEFORE formula usage:

   LAWS REQUIRING PRE-FLIGHT CHECKS:
   - kinematic_equations: Requires constant acceleration
   - conservation_mechanical_energy: Requires no non-conservative work (no friction)
   - conservation_momentum: Requires isolated system (no external impulse)
   - newtons_second_law: Requires inertial reference frame
   - work_energy_theorem: Requires known path and all forces identified

   For each applicable step, create a preFlightCheck with:
   - id: Unique identifier (e.g., "preflight-step-2")
   - targetStepId: The step.id this check gates
   - law: One of the laws above (e.g., "kinematic_equations")
   - displayName: Human-readable name (e.g., "Kinematic Equations")
   - formula: LaTeX formula (e.g., "v = v_0 + at")
   - checkItems: Array of condition checks (1-3 items), each with:
     - preCondition: { id, description, checkQuestion, severity ("critical"/"important"), physicsRationale }
     - options: Array of 3-4 options mixing correct answers and "traps" (misconceptions)
     - correctOptionIds: Array of correct option IDs
     - multiSelect: true if multiple correct options
   - problemContext: { relevantText: excerpt from problem showing conditions }
   - requiredToPass: Number of checks needed to proceed
   - maxAttempts: Usually 3

   TRAP OPTIONS: Include common misconceptions students might select:
   - "Acceleration varies with position" (trap for kinematics)
   - "Surface is rough but object moves slowly" (trap for energy conservation)
   - "Analysis from accelerating elevator" (trap for Newton's laws)

CRITICAL RULES:
- NEVER output final numerical answer in Steps 1-4 hints
- Focus on REASONING, not calculation
- Each hint: WHAT to think about, not HOW to calculate

JSON FORMATTING RULES (CRITICAL):
- All strings must be on a single line (no newlines within strings)
- Use \\n for line breaks within hint content if needed
- Escape all quotes within strings using \\"
- Keep hint content concise (2-3 sentences max per hint)
- If content is long, break into multiple short sentences

Output ONLY valid JSON with this EXACT structure:
{
  "domain": "Main physics domain",
  "subdomain": "Specific subdomain",
  "density": ${density},
  "concepts": [
    {
      "id": "concept-id",
      "name": "Concept Name",
      "definition": "Clear definition in 2-3 sentences.",
      "formula": "$F = ma$"
    }
  ],
  "steps": [
    {
      "id": 1,
      "title": "Step Title",
      "stepType": "physics_concept",
      "prerequisites": ["concept-id-1"],
      "feynmanPrompt": {
        "topic": "concept-name-kebab-case",
        "question": "Why does this physics principle apply here? Explain the mechanism.",
        "context": "Brief context about the physical situation"
      },
      "hints": [
        {
          "level": 1,
          "title": "Concept Identification",
          "content": "What underlying physics principles apply here?"
        },
        {
          "level": 2,
          "title": "Visualization",
          "content": "How would you sketch this situation? What's the geometry?"
        },
        {
          "level": 3,
          "title": "Strategy Selection",
          "content": "What approach would work best for this problem?"
        }
      ],
      "requiredConcepts": ["concept-id-1", "concept-id-2"],
      "question": "A Socratic question to prompt reasoning?"
    }
  ],
  "sanityCheck": {
    "question": "What happens in a limiting case? Use $\\\\LaTeX$ notation.",
    "expectedBehavior": "The expected physical behavior described clearly.",
    "type": "limit"
  },
  "sanityCheckMatrix": {
    "limitCheck": {
      "question": "What happens when [parameter] approaches [extreme value]?",
      "setupPrompt": "Before calculating, predict the physical behavior at this limit.",
      "expectedReasoning": "Clear physical reasoning for why the system behaves this way at the limit.",
      "commonMistakes": ["Confusing with equilibrium", "Forgetting constraints"],
      "physicalInsight": "This limit confirms our formula reduces to [known case] - a powerful check!"
    },
    "symmetryCheck": {
      "question": "What if [symmetric condition, e.g., both masses equal]?",
      "setupPrompt": "When there's perfect symmetry, what must happen by symmetry arguments alone?",
      "expectedReasoning": "By symmetry, neither side has an advantage, so [predicted outcome].",
      "commonMistakes": ["Calculating instead of using symmetry", "Missing the symmetry"],
      "physicalInsight": "Symmetry arguments let you predict results without calculation!"
    },
    "dimensionCheck": {
      "question": "Does your final expression have the correct dimensions/units?",
      "setupPrompt": "Check that each term has consistent dimensions.",
      "expectedReasoning": "The dimensions work out: [dimension analysis showing units match].",
      "commonMistakes": ["Forgetting g has units", "Not checking each term separately"],
      "physicalInsight": "Dimensional analysis catches ~50% of physics errors!"
    }
  },
  "preFlightChecks": [
    {
      "id": "preflight-step-2",
      "targetStepId": 2,
      "law": "kinematic_equations",
      "displayName": "Kinematic Equations",
      "formula": "v = v_0 + at",
      "checkItems": [
        {
          "preCondition": {
            "id": "constant_acceleration",
            "description": "Acceleration must be constant throughout the motion",
            "checkQuestion": "Is the acceleration constant in this problem?",
            "severity": "critical",
            "physicsRationale": "Kinematic equations assume constant a. Variable acceleration requires calculus.",
            "hints": ["Check if forces are constant"],
            "problemTextIndicators": ["constant acceleration", "freely falling"]
          },
          "options": [
            { "id": "opt-1", "label": "Yes, only gravity acts (constant g)", "isCorrect": true, "studentReasoningPattern": "Correct identification", "prevalence": "common" },
            { "id": "opt-2", "label": "No, a spring force acts (a varies with x)", "isCorrect": false, "trapType": "condition_violation", "misconceptionExplanation": "Spring force F=-kx means acceleration varies with position.", "studentReasoningPattern": "Ignores position dependence", "prevalence": "common" }
          ],
          "correctOptionIds": ["opt-1"],
          "multiSelect": false
        }
      ],
      "problemContext": { "relevantText": "Extract relevant problem text here" },
      "requiredToPass": 1,
      "maxAttempts": 3
    }
  ]
}

NOTE: Only include preFlightChecks for steps that apply major physics laws where verifying conditions is pedagogically valuable. Usually 0-2 checks per problem.

Respond with ONLY the JSON, no other text.`

  // Build content array with optional image
  const contentBlocks: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = []

  // Add image first if provided (so Claude sees it before the text)
  if (diagramImage) {
    // Extract media type and base64 data
    const match = diagramImage.match(/^data:image\/(\w+);base64,(.+)$/)
    if (match) {
      const [, mediaType, base64Data] = match
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: `image/${mediaType}`,
          data: base64Data,
        },
      })
    }
  }

  // Add text prompt
  contentBlocks.push({
    type: 'text',
    text: combinedPrompt,
  })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 6144, // Reduced since we're only generating 3 hint levels
    messages: [
      {
        role: 'user',
        content: contentBlocks as any,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]+\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : responseText

  try {
    const scaffoldData = JSON.parse(jsonStr)

    return {
      problem,
      ...scaffoldData,
    }
  } catch (error) {
    console.error('Failed to parse scaffold JSON:', error)
    console.error('Raw JSON string (first 500 chars):', jsonStr.substring(0, 500))
    console.error('Raw JSON string (around error position):')
    const errorMatch = error instanceof Error && error.message.match(/position (\d+)/)
    if (errorMatch) {
      const pos = parseInt(errorMatch[1])
      console.error(jsonStr.substring(Math.max(0, pos - 100), Math.min(jsonStr.length, pos + 100)))
    }
    throw new Error('Failed to generate proper scaffold structure')
  }
}

/**
 * MICRO-TASK MODE: Active Learning Scaffold
 * Instead of passive hints, generates micro-tasks that users must complete
 * to earn each insight. Uses MULTIPLE_CHOICE and FILL_BLANK tasks.
 *
 * @param problem - The problem statement text
 * @param diagramImage - Optional base64-encoded diagram image (data:image/...)
 */
export async function generateMicroTaskScaffold(problem: string, diagramImage?: string): Promise<MicroTaskScaffolderResponse> {
  // Conditionally include FBD diagram instructions based on feature flag
  const fbdInstructions = FEATURE_FLAGS.FBD_CANVAS ? `

DIAGRAM STEPS (for mechanics problems with forces):
If the problem involves force analysis on an object (block on incline, hanging mass, pulley system, object on horizontal surface), add a DIAGRAM step as the FIRST step with stepType: "diagram".

For diagram steps, include "diagramData" with:
- scenarioType: "incline" | "hanging" | "pulley" | "horizontal" | "rotating"
- objectShape: "block" | "point" | "sphere"
- surfaceAngle: (for incline only) angle in degrees from horizontal
- requiredForces: array of forces the student must draw, each with:
  - type: "weight" | "normal" | "friction" | "tension" | "applied" | "spring" | "pseudo"
  - direction: "up" | "down" | "left" | "right" | "up-left" | "up-right" | "down-left" | "down-right" | "perpendicular-surface" | "along-surface"
  - tolerance: (optional) degrees of tolerance, default 15

Example diagram step:
{
  "id": 1,
  "title": "Draw Free Body Diagram",
  "stepType": "diagram",
  "diagramData": {
    "scenarioType": "incline",
    "objectShape": "block",
    "surfaceAngle": 30,
    "requiredForces": [
      { "type": "weight", "direction": "down" },
      { "type": "normal", "direction": "perpendicular-surface" },
      { "type": "friction", "direction": "along-surface" }
    ]
  },
  "tasks": [],
  "requiredConcepts": ["free-body-diagram"]
}

For diagram steps, the "tasks" array should be EMPTY - the interactive canvas handles the learning.` : ''

  const microTaskPrompt = `You are an expert IIT-JEE Physics teacher creating an ACTIVE LEARNING scaffold.${diagramImage ? '\n\nNOTE: The student has provided a diagram for this problem. Analyze it carefully along with the problem text.' : ''}${fbdInstructions}

CONTEXT: This problem is for students preparing for IIT-JEE. Instead of passive hints that students just read, you will create MICRO-TASKS that force active engagement. Students must answer a question correctly to unlock each insight.

PROBLEM:
${problem}

YOUR TASK:
1. First, solve this problem completely in your mind (do not output the solution).
2. Create an ACTIVE LEARNING scaffold with micro-tasks instead of hints.

For each of 3-6 thinking milestones (steps), create 3 MICRO-TASKS (one per level 1-3):

LEVEL 1 - Concept (MULTIPLE_CHOICE):
- Test if student can identify the relevant physics concept
- 3-4 plausible options, only ONE correct
- Example: "Which physics principle is most relevant here?"
- Options should include common misconceptions

LEVEL 2 - Visual (FILL_BLANK):
- Test visualization/geometric understanding
- Sentence with ____ placeholder for the blank
- Provide 2-3 distractors (wrong options) alongside correct term
- Example: "The angle θ is measured from the ____ of the hoop."

LEVEL 3 - Strategy (MULTIPLE_CHOICE):
- Test if student can choose the right approach
- 3-4 approach options, only ONE is optimal
- Example: "Which method best simplifies this problem?"

Each task has an "explanation" field - this is the INSIGHT the student earns after answering correctly. Make it valuable and educational!

FEYNMAN MICRO-PROMPTS (OPTIONAL but RECOMMENDED):
For steps involving key physics concepts, add a "feynmanPrompt" that asks the student to EXPLAIN WHY the concept works BEFORE they start the micro-tasks. This builds deep understanding.

Include feynmanPrompt when:
- The step applies a fundamental physics law (conservation laws, Newton's laws, etc.)
- The step requires understanding a non-obvious physical mechanism
- Students commonly memorize formulas without understanding the underlying physics

DO NOT include feynmanPrompt for:
- Pure math manipulation steps
- Diagram/setup steps
- Steps that just substitute values

Format:
"feynmanPrompt": {
  "topic": "conservation-of-energy" (kebab-case topic identifier),
  "question": "Why is mechanical energy conserved in this system?",
  "context": "Only gravity does work on the object" (optional)
}

JSON OUTPUT FORMAT:
{
  "domain": "Main physics domain",
  "subdomain": "Specific subdomain",
  "concepts": [
    {
      "id": "concept-id",
      "name": "Concept Name",
      "definition": "Clear definition in 2-3 sentences.",
      "formula": "$F = ma$"
    }
  ],
  "steps": [
    {
      "id": 1,
      "title": "Step Title (e.g., Choose Reference Frame)",
      "stepType": "physics_concept",
      "feynmanPrompt": {
        "topic": "physics-concept-name",
        "question": "Why does this physics principle apply here? Explain the underlying mechanism.",
        "context": "Brief context about the physical situation"
      },
      "tasks": [
        {
          "level": 1,
          "levelTitle": "Concept",
          "type": "MULTIPLE_CHOICE",
          "question": "Which physics principle applies here?",
          "options": ["Option A", "Option B", "Option C"],
          "correctIndex": 1,
          "explanation": "Correct! Option B applies because... (this is the insight earned)"
        },
        {
          "level": 2,
          "levelTitle": "Visual",
          "type": "FILL_BLANK",
          "question": "Complete the geometric description:",
          "sentence": "The force vector points along the ____ direction.",
          "correctTerm": "radial",
          "distractors": ["tangential", "vertical"],
          "explanation": "The radial direction is key because... (insight earned)"
        },
        {
          "level": 3,
          "levelTitle": "Strategy",
          "type": "MULTIPLE_CHOICE",
          "question": "Which approach simplifies this problem?",
          "options": ["Energy conservation", "Force balance", "Momentum conservation"],
          "correctIndex": 0,
          "explanation": "Energy conservation is cleanest here because... (insight earned)"
        }
      ],
      "requiredConcepts": ["concept-id-1", "concept-id-2"]
    }
  ],
  "sanityCheck": {
    "question": "What happens when ω → 0?",
    "expectedBehavior": "The bead should slide to the bottom.",
    "type": "limit"
  },
  "sanityCheckMatrix": {
    "limitCheck": {
      "question": "What happens when ω → 0?",
      "setupPrompt": "If the wire stops rotating, predict what happens to the bead.",
      "expectedReasoning": "Without rotation, there's no centrifugal effect - the bead slides to the bottom under gravity.",
      "commonMistakes": ["Thinking it stays in place", "Forgetting gravity acts"],
      "physicalInsight": "This limit confirms rotation is essential for equilibrium positions!"
    },
    "symmetryCheck": {
      "question": "If the wire is vertical, what positions are symmetric?",
      "setupPrompt": "Consider the geometry - where might equilibrium occur by symmetry?",
      "expectedReasoning": "The bottom and any angle θ and -θ are symmetric about the vertical axis.",
      "commonMistakes": ["Only considering the bottom", "Ignoring angular symmetry"],
      "physicalInsight": "Symmetry helps identify all possible equilibrium positions!"
    },
    "dimensionCheck": {
      "question": "Does your equilibrium condition have correct dimensions?",
      "setupPrompt": "Your condition involves ω, g, and geometric terms. Check the dimensions.",
      "expectedReasoning": "Both sides should have dimensions of acceleration [m/s²].",
      "commonMistakes": ["Mixing angular and linear quantities", "Forgetting ω² has units 1/s²"],
      "physicalInsight": "Dimensional consistency is your first line of defense against errors!"
    }
  }
}

CRITICAL RULES:
- NEVER reveal the final answer in tasks or explanations
- Each MULTIPLE_CHOICE must have exactly ONE correct option (correctIndex is 0-based)
- Each FILL_BLANK must have ONE correctTerm and 2-3 distractors
- Use ____ (4 underscores) as the placeholder in sentences
- Explanations should teach the insight, not just say "Correct!"
- Wrong options should be plausible (common misconceptions)
- Use LaTeX notation: $inline$ or $$display$$
- All strings on single lines, escape quotes with \\"
- Only generate tasks for levels 1, 2, and 3 (levels 4-5 generated on-demand)

Respond with ONLY valid JSON, no other text.`

  // Build content array with optional image
  const contentBlocks: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = []

  if (diagramImage) {
    const match = diagramImage.match(/^data:image\/(\w+);base64,(.+)$/)
    if (match) {
      const [, mediaType, base64Data] = match
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: `image/${mediaType}`,
          data: base64Data,
        },
      })
    }
  }

  contentBlocks.push({
    type: 'text',
    text: microTaskPrompt,
  })

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: contentBlocks as any,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = responseText.match(/\{[\s\S]+\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : responseText

  try {
    const scaffoldData = JSON.parse(jsonStr)
    return {
      problem,
      ...scaffoldData,
    }
  } catch (error) {
    console.error('Failed to parse micro-task scaffold JSON:', error)
    console.error('Raw JSON string (first 500 chars):', jsonStr.substring(0, 500))
    throw new Error('Failed to generate proper micro-task scaffold structure')
  }
}

/**
 * Pass 1: The Solver (Hidden)
 * Role: The Expert Professor
 * Solves the problem completely with full mathematical steps
 */
export async function solvePhysicsProblem(problem: string): Promise<SolverResponse> {
  const solverPrompt = `You are an expert IIT-JEE physics professor solving a challenging problem.

CONTEXT: This problem is for students preparing for IIT-JEE (Indian Institute of Technology Joint Entrance Examination), one of the world's most competitive engineering entrance exams. Students need rigorous understanding of physics concepts, mathematical techniques, and problem-solving strategies at the Irodov/Kleppner level.

PROBLEM:
${problem}

YOUR TASK:
1. Identify the physics domain and subdomain (e.g., Classical Mechanics → Rotational Dynamics → Non-Inertial Frames)
2. Solve this problem COMPLETELY with every mathematical step shown (IIT-JEE Advanced level rigor)
3. Use standard JEE notation and conventions
4. Verify your result using limit cases or dimensional analysis
5. Show all intermediate equations with proper LaTeX formatting
6. Identify any common pitfalls or conceptual subtleties

Format your response as:
DOMAIN: [Main domain]
SUBDOMAIN: [Specific subdomain]

SOLUTION:
[Complete step-by-step solution with all mathematics - IIT-JEE Advanced standard]

VERIFICATION:
[Check limits, dimensions, or special cases]

COMMON PITFALLS:
[Mention any common mistakes students make on such problems]`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: solverPrompt,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Parse the response
  const domainMatch = responseText.match(/DOMAIN:\s*(.+?)(?:\n|$)/i)
  const subdomainMatch = responseText.match(/SUBDOMAIN:\s*(.+?)(?:\n|$)/i)
  const solutionMatch = responseText.match(/SOLUTION:([\s\S]+?)(?:VERIFICATION:|$)/i)

  return {
    solution: solutionMatch?.[1]?.trim() || responseText,
    domain: domainMatch?.[1]?.trim() || 'Physics',
    subdomain: subdomainMatch?.[1]?.trim() || 'Problem Solving',
  }
}

/**
 * Pass 2: The Scaffolder (Visible)
 * Role: The Teaching Assistant
 * Converts the solution into a pedagogical scaffold without revealing the answer
 */
export async function scaffoldSolution(
  problem: string,
  solverResponse: SolverResponse
): Promise<ScaffolderResponse> {
  const scaffolderPrompt = `You are a strict Socratic Physics Tutor for IIT-JEE preparation. You have a complete solution to a problem, and your job is to create a "Solvability Map" - a framework that guides the student without giving away the answer.

CONTEXT: This is for IIT-JEE (Indian Institute of Technology Joint Entrance Examination) preparation. Students need to develop deep conceptual understanding and systematic problem-solving skills. The scaffold should encourage independent thinking while providing strategic guidance.

PROBLEM:
${problem}

COMPLETE SOLUTION (DO NOT REVEAL THIS):
${solverResponse.solution}

YOUR TASK:
Create a structured learning scaffold with the following components:

1. CONCEPTS: List 4-6 key physics concepts needed (e.g., "Non-inertial Frames", "Centrifugal Force")
   - Each concept needs: id (lowercase with dashes), name, definition (2-3 sentences), and optional formula
   - Use standard JEE notation and conventions
   - Use LaTeX notation in formulas wrapped in $ for inline or $$ for display math
   - Include both the physical intuition and mathematical form

2. STEPS: Break the solution into 3-6 logical milestones (NOT the full solution steps!)
   - Each step should be a THINKING milestone (e.g., "Choose Reference Frame", "Build Effective Potential")
   - For each step, provide a PROGRESSIVE 5-LEVEL HINT LADDER:

     Level 1 - Concept Identification (hint title: "Concept Identification"):
       • "What physics concepts or principles are relevant here?"
       • Guide student to identify applicable laws/concepts WITHOUT stating them directly
       • Example: "Think about what happens to quantities in a rotating system" (don't say "use centrifugal force")

     Level 2 - Visualization (hint title: "Visualization"):
       • "How would you draw this? What does the geometry/setup look like?"
       • Help student visualize the problem without showing the diagram
       • Prompt them to think about coordinate systems, forces, trajectories
       • Example: "Sketch the forces as seen from the rotating platform"

     Level 3 - Strategy Selection (hint title: "Strategy Selection"):
       • "What approach or method should you use to tackle this?"
       • Guide toward the solution strategy without revealing equations
       • Example: "Consider energy methods vs force balance - which is cleaner here?"

     Level 4 - Structural Equation (hint title: "Structural Equation"):
       • Set up the governing equation(s) symbolically WITHOUT numbers
       • Show the mathematical framework but let student fill in specifics
       • Use LaTeX: $$\sum F = ma$$ style
       • Example: "The equation of motion in the rotating frame: $$m\ddot{r} = F_{real} + F_{centrifugal} + F_{coriolis}$$"

     Level 5 - Full Solution (hint title: "Full Solution"):
       • Complete step-by-step solution for this milestone
       • Include all mathematical steps and reasoning
       • This is the "last resort" - student should avoid needing this

   - List required concept IDs
   - Add a Socratic question that prompts reasoning (separate from hints)
   - Encourage students to think about: symmetry, conservation laws, dimensional analysis

3. SANITY CHECK: Create ONE final reality check (crucial for JEE)
   - A limiting case question (e.g., "What happens when ω → 0?")
   - The expected physical behavior with reasoning
   - Type: 'limit', 'dimension', or 'symmetry'
   - This helps build physical intuition and catch calculation errors

CRITICAL RULES:
- NEVER output the final numerical answer or complete derivation
- NEVER show the full equations from the solution
- Focus on the REASONING STRUCTURE, not the calculation steps
- Use proper LaTeX notation: $\\theta$ for inline, $$F = ma$$ for display
- Each hint should guide WHAT to think about, not HOW to calculate
- Emphasize physical intuition and conceptual understanding (key for JEE Advanced)

JSON FORMATTING RULES (CRITICAL):
- All strings must be on a single line (no newlines within strings)
- Use \\n for line breaks within hint content if needed
- Escape all quotes within strings using \"
- Keep hint content concise (2-3 sentences max per hint)
- If content is long, break into multiple short sentences

Output your response as valid JSON with this EXACT structure:
{
  "concepts": [
    {
      "id": "concept-id",
      "name": "Concept Name",
      "definition": "Clear definition in 2-3 sentences with any needed context.",
      "formula": "$F = ma$"
    }
  ],
  "steps": [
    {
      "id": 1,
      "title": "Step Title",
      "hints": [
        {
          "level": 1,
          "title": "Concept Identification",
          "content": "What underlying physics principles apply here?"
        },
        {
          "level": 2,
          "title": "Visualization",
          "content": "How would you sketch this situation? What's the geometry?"
        },
        {
          "level": 3,
          "title": "Strategy Selection",
          "content": "What approach would work best for this problem?"
        },
        {
          "level": 4,
          "title": "Structural Equation",
          "content": "Set up the governing equation: $$F = ma$$"
        },
        {
          "level": 5,
          "title": "Full Solution",
          "content": "Step 1: Identify all forces acting on the system. Step 2: Apply Newton's second law in the chosen reference frame. Step 3: Solve the resulting equations for the unknown quantity."
        }
      ],
      "requiredConcepts": ["concept-id-1", "concept-id-2"],
      "question": "A Socratic question to prompt reasoning?"
    }
  ],
  "sanityCheck": {
    "question": "What happens in a limiting case? Use $\\LaTeX$ notation.",
    "expectedBehavior": "The expected physical behavior described clearly.",
    "type": "limit"
  },
  "sanityCheckMatrix": {
    "limitCheck": {
      "question": "What happens when [parameter] approaches [extreme value]?",
      "setupPrompt": "Before calculating, predict the physical behavior at this limit.",
      "expectedReasoning": "Clear physical reasoning for why the system behaves this way at the limit.",
      "commonMistakes": ["Confusing with equilibrium", "Forgetting constraints"],
      "physicalInsight": "This limit confirms our formula reduces to [known case] - a powerful check!"
    },
    "symmetryCheck": {
      "question": "What if [symmetric condition, e.g., both masses equal]?",
      "setupPrompt": "When there's perfect symmetry, what must happen by symmetry arguments alone?",
      "expectedReasoning": "By symmetry, neither side has an advantage, so [predicted outcome].",
      "commonMistakes": ["Calculating instead of using symmetry", "Missing the symmetry"],
      "physicalInsight": "Symmetry arguments let you predict results without calculation!"
    },
    "dimensionCheck": {
      "question": "Does your final expression have the correct dimensions/units?",
      "setupPrompt": "Check that each term has consistent dimensions.",
      "expectedReasoning": "The dimensions work out: [dimension analysis showing units match].",
      "commonMistakes": ["Forgetting g has units", "Not checking each term separately"],
      "physicalInsight": "Dimensional analysis catches ~50% of physics errors!"
    }
  }
}

Respond with ONLY the JSON, no other text.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 8192, // Increased for 5-level hint ladder
    messages: [
      {
        role: 'user',
        content: scaffolderPrompt,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract JSON from response (in case there's extra text)
  const jsonMatch = responseText.match(/\{[\s\S]+\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : responseText

  try {
    const scaffoldData = JSON.parse(jsonStr)

    return {
      problem,
      domain: solverResponse.domain,
      subdomain: solverResponse.subdomain,
      ...scaffoldData,
    }
  } catch (error) {
    console.error('Failed to parse scaffold JSON:', error)
    console.error('Raw JSON string (first 500 chars):', jsonStr.substring(0, 500))
    console.error('Raw JSON string (around error position):')
    const errorMatch = error instanceof Error && error.message.match(/position (\d+)/)
    if (errorMatch) {
      const pos = parseInt(errorMatch[1])
      console.error(jsonStr.substring(Math.max(0, pos - 100), Math.min(jsonStr.length, pos + 100)))
    }
    throw new Error('Failed to generate proper scaffold structure')
  }
}

/**
 * Pass 1.5: The Error Anticipator
 * Analyzes the problem and hidden solution to identify common conceptual traps
 * Returns warning beacons mapped to specific steps (non-spoilery)
 *
 * @param problem - The problem statement text
 * @param solution - The hidden solution from Pass 1 (Solver)
 * @param stepTitles - Array of step titles from the scaffold (for mapping beacons)
 */
export async function anticipateErrors(
  problem: string,
  solution: string,
  stepTitles: string[]
): Promise<ErrorAnticipatorResponse> {
  const errorAnticipatorPrompt = `You are an experienced IIT-JEE Physics examiner who has graded thousands of student papers. Your job is to ANTICIPATE the most common conceptual mistakes students will make on this problem.

PROBLEM:
${problem}

HIDDEN SOLUTION (for your reference only - DO NOT reveal):
${solution}

SCAFFOLD STEPS:
${stepTitles.map((title, i) => `${i + 1}. ${title}`).join('\n')}

YOUR TASK:
Identify the TOP 3 conceptual traps that students commonly fall into on this type of problem. Then, map these traps to specific steps with subtle warning beacons.

REQUIREMENTS FOR CONCEPTUAL TRAPS:
1. Focus on CONCEPTUAL errors, not calculation mistakes
2. Each trap should have:
   - title: Short name (e.g., "Sign Convention Confusion", "Frame Mixing Error")
   - description: Detailed explanation of WHY students make this mistake and WHAT the correct thinking should be
   - tags: 1-3 category tags (e.g., ["sign", "direction"], ["reference-frame"], ["constraint"])

REQUIREMENTS FOR WARNING BEACONS:
1. Map each trap to the step(s) where students are most likely to make that mistake
2. Keep messages SHORT and NON-SPOILERY (8-12 words max)
3. Use friendly, encouraging language
4. The beacon should hint at the CATEGORY of mistake, NOT the correct answer
5. CRITICAL: NEVER reveal or hint at numerical values or final answers

GOOD BEACON EXAMPLES:
- "Watch your sign conventions carefully here"
- "Make sure you're consistent with your reference frame"
- "Consider all forces, even non-obvious ones"
- "Double-check which direction is positive"

BAD BEACON EXAMPLES (DO NOT DO):
- "The answer should be positive" (reveals answer)
- "Use centrifugal force in rotating frame" (too specific/spoilery)
- "The angle is 30 degrees" (reveals numerical value)

JSON OUTPUT FORMAT:
{
  "commonTraps": [
    {
      "title": "Short Trap Name",
      "description": "Detailed explanation of the conceptual mistake and correct thinking (2-4 sentences).",
      "tags": ["tag1", "tag2"]
    }
  ],
  "warningBeacons": [
    {
      "stepId": 1,
      "message": "Short non-spoilery warning (8-12 words)",
      "tag": "tag1"
    }
  ]
}

CRITICAL RULES:
- Exactly 3 conceptual traps (the most common ones)
- 1-2 warning beacons per step (where applicable)
- stepId must match the step numbers (1-indexed, based on the steps listed above)
- Each beacon's tag must match one of the trap tags
- NEVER hint at numerical answers or specific solution steps
- All strings on single lines, escape quotes with \\"

Respond with ONLY valid JSON, no other text.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: errorAnticipatorPrompt,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = responseText.match(/\{[\s\S]+\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : responseText

  try {
    const errorData = JSON.parse(jsonStr)
    return {
      commonTraps: errorData.commonTraps || [],
      warningBeacons: errorData.warningBeacons || [],
    }
  } catch (error) {
    console.error('Failed to parse error anticipator JSON:', error)
    console.error('Raw JSON string (first 500 chars):', jsonStr.substring(0, 500))
    // Return empty arrays on failure (non-critical feature)
    return {
      commonTraps: [],
      warningBeacons: [],
    }
  }
}
