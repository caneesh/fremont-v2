import Anthropic from '@anthropic-ai/sdk'

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface SolverResponse {
  solution: string
  domain: string
  subdomain: string
}

export interface ScaffolderResponse {
  problem: string
  domain: string
  subdomain: string
  concepts: Array<{
    id: string
    name: string
    definition: string
    formula?: string
  }>
  steps: Array<{
    id: number
    title: string
    hints: Array<{
      level: 1 | 2 | 3 | 4 | 5
      title: 'Concept Identification' | 'Visualization' | 'Strategy Selection' | 'Structural Equation' | 'Full Solution'
      content: string
    }>
    requiredConcepts: string[]
    question?: string
    validationPrompt?: string
  }>
  sanityCheck: {
    question: string
    expectedBehavior: string
    type: 'limit' | 'dimension' | 'symmetry'
  }
}

// Micro-Task Response Types
export interface MicroTaskScaffolderResponse {
  problem: string
  domain: string
  subdomain: string
  concepts: Array<{
    id: string
    name: string
    definition: string
    formula?: string
  }>
  steps: Array<{
    id: number
    title: string
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
  }>
  sanityCheck: {
    question: string
    expectedBehavior: string
    type: 'limit' | 'dimension' | 'symmetry'
  }
}

/**
 * ULTRA-FAST: Progressive Hint Loading
 * Only generates Levels 1-3 initially (15-20s)
 * Levels 4-5 generated on-demand when user clicks (~3s each)
 *
 * @param problem - The problem statement text
 * @param diagramImage - Optional base64-encoded diagram image (data:image/...)
 */
export async function generateScaffold(problem: string, diagramImage?: string): Promise<ScaffolderResponse> {
  const combinedPrompt = `You are an expert IIT-JEE Physics teacher with 20+ years of experience.${diagramImage ? '\n\nNOTE: The student has provided a diagram for this problem. Analyze it carefully along with the problem text.' : ''}

CONTEXT: This problem is for students preparing for IIT-JEE (Indian Institute of Technology Joint Entrance Examination), one of the world's most competitive engineering entrance exams. Students need rigorous understanding of physics concepts, mathematical techniques, and problem-solving strategies at the Irodov/Kleppner level.

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

2. STEPS: Break into 3-6 logical thinking milestones (NOT calculation steps!)
   For EACH step, provide ONLY THE FIRST 3 HINT LEVELS (for faster generation):

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

   NOTE: Levels 4-5 will be generated on-demand when the student requests them.
   IMPORTANT: Only include hints for levels 1, 2, and 3 in the JSON output.

3. SANITY CHECK: One reality check question
   - Limiting case (e.g., "What happens when ω → 0?")
   - Expected physical behavior with reasoning
   - Type: 'limit', 'dimension', or 'symmetry'

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
  }
}

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
  const microTaskPrompt = `You are an expert IIT-JEE Physics teacher creating an ACTIVE LEARNING scaffold.${diagramImage ? '\n\nNOTE: The student has provided a diagram for this problem. Analyze it carefully along with the problem text.' : ''}

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
