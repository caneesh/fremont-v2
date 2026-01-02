/**
 * Prompts for extracting physics questions from PDFs
 */

export const QUESTION_EXTRACTION_SYSTEM = `You are an expert physics education content analyzer. Your task is to extract physics problems from educational materials and structure them for a learning platform.

Key responsibilities:
1. Accurately capture all mathematical notation as LaTeX
2. Identify and describe diagrams, graphs, and figures
3. Extract given quantities with proper units
4. Identify what the question asks students to find
5. Classify by topic, difficulty, and concepts tested`

export const QUESTION_EXTRACTION_PROMPT = `Analyze this physics PDF and extract ALL questions found.

For each question, provide structured JSON with these fields:

## Required Fields:
- \`questionText\`: Complete problem statement with LaTeX math
- \`given\`: Array of {label, value, unit} for each given quantity
- \`asked\`: Array of {label, expectedForm} where expectedForm is "numeric", "expression", or "explanation"

## Optional Fields:
- \`context\`: Setup, assumptions, or scenario description
- \`diagrams\`: Array of diagram descriptions with {description, type, annotations}
- \`equations\`: Array of relevant formulas shown
- \`parts\`: Array of sub-parts if multi-part question
- \`topic\`: Primary physics topic (mechanics, electromagnetism, etc.)
- \`subtopic\`: Specific sub-topic (rotational-motion, gauss-law)
- \`concepts\`: Array of physics concepts tested
- \`difficulty\`: 1-5 (1=basic, 3=JEE Mains, 5=Olympiad)
- \`answer\`: Final answer if shown

Output format:
\`\`\`json
{
  "questions": [
    {
      "questionText": "...",
      "given": [...],
      "asked": [...],
      ...
    }
  ],
  "pageInfo": {
    "source": "detected source if visible",
    "chapter": "chapter name if visible"
  }
}
\`\`\``

export function buildExtractionPrompt(sourceType?: string, additionalContext?: string): string {
  let prompt = QUESTION_EXTRACTION_PROMPT

  if (sourceType) {
    const sourceHints: Record<string, string> = {
      jee: `\nThis is JEE content - expect challenging multi-concept problems at difficulty 3-4.`,
      neet: `\nThis is NEET content - focus on biology-relevant physics, difficulty 2-3.`,
      ncert: `\nThis is NCERT textbook content - foundational problems, difficulty 1-2.`,
      hcv: `\nThis is HC Verma content - conceptual problems, difficulty 2-4.`,
      irodov: `\nThis is Irodov content - Olympiad level, difficulty 4-5.`
    }
    prompt += sourceHints[sourceType.toLowerCase()] || ''
  }

  if (additionalContext) {
    prompt += `\n\nAdditional context: ${additionalContext}`
  }

  return prompt
}
