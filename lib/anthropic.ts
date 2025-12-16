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
    hint: string
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

/**
 * Pass 1: The Solver (Hidden)
 * Role: The Expert Professor
 * Solves the problem completely with full mathematical steps
 */
export async function solvePhysicsProblem(problem: string): Promise<SolverResponse> {
  const solverPrompt = `You are an expert physics professor solving a challenging problem.

PROBLEM:
${problem}

YOUR TASK:
1. Identify the physics domain and subdomain (e.g., Classical Mechanics → Rotational Dynamics → Non-Inertial Frames)
2. Solve this problem COMPLETELY with every mathematical step shown
3. Verify your result using limit cases or dimensional analysis
4. Show all intermediate equations

Format your response as:
DOMAIN: [Main domain]
SUBDOMAIN: [Specific subdomain]

SOLUTION:
[Complete step-by-step solution with all mathematics]

VERIFICATION:
[Check limits, dimensions, or special cases]`

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
  const scaffolderPrompt = `You are a strict Socratic Physics Tutor. You have a complete solution to a problem, and your job is to create a "Solvability Map" - a framework that guides the student without giving away the answer.

PROBLEM:
${problem}

COMPLETE SOLUTION (DO NOT REVEAL THIS):
${solverResponse.solution}

YOUR TASK:
Create a structured learning scaffold with the following components:

1. CONCEPTS: List 4-6 key physics concepts needed (e.g., "Non-inertial Frames", "Centrifugal Force")
   - Each concept needs: id (lowercase with dashes), name, definition (2-3 sentences), and optional formula
   - Use LaTeX notation in formulas wrapped in $ for inline or $$ for display math

2. STEPS: Break the solution into 3-6 logical milestones (NOT the full solution steps!)
   - Each step should be a THINKING milestone (e.g., "Choose Reference Frame", "Build Effective Potential")
   - Include a guiding hint (what to consider, NOT how to do it)
   - List required concept IDs
   - Add a Socratic question that prompts reasoning

3. SANITY CHECK: Create ONE final reality check
   - A limiting case question (e.g., "What happens when ω → 0?")
   - The expected physical behavior
   - Type: 'limit', 'dimension', or 'symmetry'

CRITICAL RULES:
- NEVER output the final numerical answer or complete derivation
- NEVER show the full equations from the solution
- Focus on the REASONING STRUCTURE, not the calculation steps
- Use proper LaTeX notation: $\\theta$ for inline, $$F = ma$$ for display
- Each hint should guide WHAT to think about, not HOW to calculate

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
      "hint": "Guiding hint about what to consider. Use $\\LaTeX$ for math.",
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
    max_tokens: 4096,
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
    throw new Error('Failed to generate proper scaffold structure')
  }
}
