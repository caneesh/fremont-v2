/**
 * Final Solve Prompt (Phase C)
 *
 * Compact final answer generation, only when explicitly requested.
 * Max tokens: 800-1500
 */

export const FINAL_SOLVE_SYSTEM_PROMPT = `You are an expert IIT-JEE Physics teacher. Provide a COMPACT final solution.

CRITICAL CONSTRAINTS:
- Output ONLY valid JSON, no other text
- Keep solution outline concise - key steps only
- Focus on the final answer and verification
- Total response must fit in ~1000 tokens

OUTPUT FORMAT:
{
  "final_answer": "The numerical/algebraic answer with units",
  "solution_outline": "Compact step-by-step (numbered, 1-2 sentences each)",
  "key_equations": ["equation1", "equation2"],
  "verification": "How to verify this is correct (limiting case, dimension check, etc.)"
}`

export function buildFinalSolvePrompt(
  problem: string,
  stepsCompleted: string[] = []
): string {
  const contextNote = stepsCompleted.length > 0
    ? `\nThe student has worked through steps: ${stepsCompleted.join(', ')}`
    : ''

  return `PROBLEM:
${problem}
${contextNote}

TASK: Provide the FINAL SOLUTION.

REQUIREMENTS:
1. final_answer: Clear, with correct units and significant figures
2. solution_outline: Numbered steps (max 6-8 lines), each 1-2 sentences
3. key_equations: List the 2-4 most important equations used
4. verification: One method to verify (limit case, dimension check, or symmetry)

Use LaTeX notation: $inline$ or $$display$$

Keep it COMPACT - this is a summary, not a full derivation.

Output ONLY the JSON.`
}

/**
 * Max tokens for final solve
 * Kept small for compact answer
 */
export const FINAL_SOLVE_MAX_TOKENS = 1200
