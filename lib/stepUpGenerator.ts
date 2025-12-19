import Anthropic from '@anthropic-ai/sdk'
import type { StepUpRequest, StepUpProblem } from '@/types/stepUp'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

/**
 * Physics Curriculum Architect
 * Generates "Step-Up" problems that progressively build complexity
 * while maintaining conceptual continuity
 */
export async function generateStepUpProblem(request: StepUpRequest): Promise<StepUpProblem> {
  const { previousProblem, userPerformance, topicTags, previousConcepts, difficulty } = request

  const curriculumPrompt = `You are a Physics Curriculum Architect for IIT-JEE preparation. Your goal is to design a "Step-Up" problem.

The user has just solved a specific physics problem. You must generate the *next* problem in the sequence that builds on their learning while adding appropriate challenge.

### INPUT DATA

**Previous Problem:**
${previousProblem}

**User Performance:** ${userPerformance}

**Topic Tags:** ${topicTags.join(', ')}

${previousConcepts ? `**Previous Concepts:** ${previousConcepts.join(', ')}` : ''}

${difficulty ? `**Previous Difficulty:** ${difficulty}` : ''}

### DESIGN RULES (THE "LADDER" LOGIC)

1. **Retain the Context:** Keep the physical setup (e.g., the hoop, the block, the pulley, the wedge) similar so the user feels familiar and can leverage their previous solution approach.

2. **Add ONE Complexity:** Introduce exactly ONE new constraint or force. Do NOT add multiple new elements.
   * **Examples of Valid Single Additions:**
     - Add friction (kinetic or static)
     - Make a previously fixed support move with constant velocity/acceleration
     - Change a constant parameter to a time-varying function (e.g., ω becomes ω(t))
     - Add air resistance or drag
     - Switch from 1D to 2D or add a dimension
     - Add a spring or elastic element
     - Change from smooth to rough surface
     - Add a constraint (e.g., string, rod)
     - Switch coordinate system (Cartesian ↔ Polar)

3. **The "Bridge":** The solution to the new problem MUST rely on the *intuition* and *techniques* gained in the previous problem. The student should think: "I can use what I learned before, plus this new thing."

4. **Solvability:** The new problem MUST be solvable analytically using standard IIT-JEE level physics. No numerical-only solutions.

5. **Difficulty Progression:**
   - If user "Solved successfully": Increase difficulty by ONE level (Easy→Medium, Medium→Hard)
   - If user "Solved with hints": Keep same difficulty level
   - If user "Struggled": Keep same or slightly reduce complexity

6. **IIT-JEE Relevance:** The problem should match the style and rigor expected in JEE Advanced examinations.

### OUTPUT FORMAT (JSON)

Generate a JSON object with this EXACT structure:

{
  "nextProblemTitle": "Title reflecting the added complexity (concise, 4-8 words)",
  "problemText": "The full text of the new problem. Write it as a complete, self-contained physics problem statement suitable for IIT-JEE. Include all necessary parameters and what needs to be found.",
  "addedComplexity": "Briefly explain what changed from the previous problem (1-2 sentences). Example: 'Added kinetic friction coefficient μ between bead and hoop' or 'Changed constant ω to time-varying ω(t) = ω₀ + αt'",
  "whyThisNext": "Explain why this is the perfect next step for the student (2-3 sentences). Connect it to their previous learning and explain the pedagogical value.",
  "suggestedDifficulty": "Easy" | "Medium" | "Hard",
  "newConcepts": ["List 1-3 NEW physics concepts introduced", "Keep it focused"],
  "estimatedTime": 15-30 (minutes, integer)
}

### CRITICAL REQUIREMENTS

- **Context Continuity**: If the previous problem was about a bead on a hoop, keep it about a bead on a hoop (but modify it)
- **Single Addition**: Only ONE new element. Multiple additions overwhelm students.
- **Analytical Solution**: Must be solvable with equations, not just numerically
- **Bridge Clearly**: Make it obvious how previous knowledge helps
- **IIT-JEE Standard**: Match the rigor and style of actual JEE Advanced problems

### EXAMPLE PROGRESSION

**Problem A:** Bead on rotating hoop (frictionless)
**Problem B:** Bead on rotating hoop WITH friction (add μ)
**Problem C:** Bead on rotating hoop with friction AND time-varying ω(t)

Each step adds ONE thing. Each step builds on previous intuition.

Respond with ONLY the JSON object, no other text.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: curriculumPrompt,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]+\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : responseText

  try {
    const problemData = JSON.parse(jsonStr) as StepUpProblem
    return problemData
  } catch (error) {
    console.error('Failed to parse step-up problem JSON:', error)
    throw new Error('Failed to generate step-up problem')
  }
}
