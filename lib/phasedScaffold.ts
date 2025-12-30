/**
 * Phased Scaffold Generation Module
 *
 * Implements 3-phase scaffold generation for reduced latency:
 * - Phase A: Outline (fast, ~10-20s) - step list with minimal info
 * - Phase B: Step Expansion (on-demand) - deep content per step
 * - Phase C: Final Solve (optional) - only when explicitly requested
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  OutlineScaffoldResponse,
  StepExpansionResponse,
  FinalSolveResponse,
  OutlineStep,
} from '@/types/phasedScaffold'
import {
  OUTLINE_SYSTEM_PROMPT,
  buildOutlinePrompt,
  OUTLINE_MAX_TOKENS,
} from './prompts/outline'
import {
  STEP_EXPANSION_SYSTEM_PROMPT,
  buildStepExpansionPrompt,
  STEP_EXPANSION_MAX_TOKENS,
} from './prompts/step'
import {
  FINAL_SOLVE_SYSTEM_PROMPT,
  buildFinalSolvePrompt,
  FINAL_SOLVE_MAX_TOKENS,
} from './prompts/final'
import {
  generateScaffoldId,
  getCachedOutline,
  setCachedOutline,
  getCachedStepExpansion,
  setCachedStepExpansion,
  getCachedFinalSolve,
  setCachedFinalSolve,
  SCHEMA_VERSION,
} from './scaffoldCache'

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface OutlineOptions {
  density?: 1 | 2 | 3 | 4 | 5
  include_fbd_hints?: boolean
  diagram_image?: string // base64 encoded image
}

/**
 * Phase A: Generate Outline Scaffold
 *
 * Fast generation (~10-20s) of step list with minimal info.
 * Returns cached result if available.
 *
 * @param problem - The physics problem text
 * @param options - Generation options (density, fbd hints, diagram image)
 * @returns OutlineScaffoldResponse with scaffold_id, steps, and metadata
 */
export async function generateOutlineScaffold(
  problem: string,
  options: OutlineOptions = {}
): Promise<OutlineScaffoldResponse> {
  const { density = 3, include_fbd_hints = true, diagram_image } = options

  // Generate scaffold_id for caching
  const scaffoldId = generateScaffoldId(problem, { density, include_fbd: include_fbd_hints })

  // Check cache first
  const cached = getCachedOutline(scaffoldId)
  if (cached) {
    console.log(`[Phased Scaffold] Cache hit for outline: ${scaffoldId}`)
    return cached
  }

  console.log(`[Phased Scaffold] Generating outline for scaffold_id: ${scaffoldId}`)

  // Build prompt
  const userPrompt = buildOutlinePrompt(problem, density)

  // Build content blocks
  const contentBlocks: Array<{
    type: string
    text?: string
    source?: { type: string; media_type: string; data: string }
  }> = []

  // Add image if provided
  if (diagram_image) {
    const match = diagram_image.match(/^data:image\/(\w+);base64,(.+)$/)
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
    text: userPrompt,
  })

  // Call Anthropic API with reduced token limit for speed
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: OUTLINE_MAX_TOKENS,
    system: OUTLINE_SYSTEM_PROMPT,
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
  let jsonStr = jsonMatch ? jsonMatch[0] : responseText

  // Clean common JSON issues from LLM output
  jsonStr = cleanJsonString(jsonStr)

  try {
    const outlineData = JSON.parse(jsonStr)

    const response: OutlineScaffoldResponse = {
      scaffold_id: scaffoldId,
      schema_version: SCHEMA_VERSION,
      problem,
      tags: outlineData.tags,
      concepts: outlineData.concepts || [],
      steps: outlineData.steps || [],
      estimated_time_mins: outlineData.estimated_time_mins || 15,
    }

    // Cache the result
    setCachedOutline(scaffoldId, response)

    console.log(`[Phased Scaffold] Generated outline with ${response.steps.length} steps`)
    return response
  } catch (error) {
    console.error('Failed to parse outline JSON:', error)
    console.error('Raw JSON string (first 500 chars):', jsonStr.substring(0, 500))
    throw new Error('Failed to generate outline scaffold')
  }
}

/**
 * Phase B: Generate Step Expansion
 *
 * On-demand deep content generation for a single step.
 * Returns cached result if available.
 *
 * @param problem - The original physics problem text
 * @param scaffoldId - The scaffold_id from the outline
 * @param outlineSteps - The steps from the outline (for context)
 * @param targetStepId - Which step to expand (e.g., "s1")
 * @returns StepExpansionResponse with micro-tasks, explanation, hints, etc.
 */
export async function generateStepExpansion(
  problem: string,
  scaffoldId: string,
  outlineSteps: OutlineStep[],
  targetStepId: string
): Promise<StepExpansionResponse> {
  // Check cache first
  const cached = getCachedStepExpansion(scaffoldId, targetStepId)
  if (cached) {
    console.log(`[Phased Scaffold] Cache hit for step expansion: ${scaffoldId}:${targetStepId}`)
    return cached
  }

  console.log(`[Phased Scaffold] Generating step expansion for: ${scaffoldId}:${targetStepId}`)

  // Build prompt
  const userPrompt = buildStepExpansionPrompt(problem, outlineSteps, targetStepId)

  // Call Anthropic API
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: STEP_EXPANSION_MAX_TOKENS,
    system: STEP_EXPANSION_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]+\}/)
  let jsonStr = jsonMatch ? jsonMatch[0] : responseText

  // Clean common JSON issues from LLM output
  jsonStr = cleanJsonString(jsonStr)

  try {
    const expansionData = JSON.parse(jsonStr)

    const response: StepExpansionResponse = {
      scaffold_id: scaffoldId,
      step_id: targetStepId,
      micro_tasks: expansionData.micro_tasks || [],
      explanation: expansionData.explanation || '',
      traps: expansionData.traps || [],
      gating: expansionData.gating || {
        min_correct_tasks: 2,
        pass_on_explanation: true,
        allow_skip_after_attempts: 3,
      },
      hints: expansionData.hints || [],
      fbd_data: expansionData.fbd_data,
      feynman_prompt: expansionData.feynman_prompt,
    }

    // Cache the result
    setCachedStepExpansion(scaffoldId, targetStepId, response)

    console.log(
      `[Phased Scaffold] Generated step expansion with ${response.micro_tasks.length} tasks`
    )
    return response
  } catch (error) {
    console.error('Failed to parse step expansion JSON:', error)
    console.error('Raw JSON string (first 500 chars):', jsonStr.substring(0, 500))
    throw new Error(`Failed to generate step expansion for ${targetStepId}`)
  }
}

/**
 * Phase C: Generate Final Solve
 *
 * Compact final answer generation, only when explicitly requested.
 * Returns cached result if available.
 *
 * @param problem - The original physics problem text
 * @param scaffoldId - The scaffold_id for this problem
 * @param stepsCompleted - Array of step_ids the student completed
 * @returns FinalSolveResponse with final answer, solution outline, key equations
 */
export async function generateFinalSolve(
  problem: string,
  scaffoldId: string,
  stepsCompleted: string[] = []
): Promise<FinalSolveResponse> {
  // Check cache first
  const cached = getCachedFinalSolve(scaffoldId)
  if (cached) {
    console.log(`[Phased Scaffold] Cache hit for final solve: ${scaffoldId}`)
    return cached
  }

  console.log(`[Phased Scaffold] Generating final solve for: ${scaffoldId}`)

  // Build prompt
  const userPrompt = buildFinalSolvePrompt(problem, stepsCompleted)

  // Call Anthropic API
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: FINAL_SOLVE_MAX_TOKENS,
    system: FINAL_SOLVE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]+\}/)
  let jsonStr = jsonMatch ? jsonMatch[0] : responseText

  // Clean common JSON issues from LLM output
  jsonStr = cleanJsonString(jsonStr)

  try {
    const solveData = JSON.parse(jsonStr)

    const response: FinalSolveResponse = {
      scaffold_id: scaffoldId,
      final_answer: solveData.final_answer || '',
      solution_outline: solveData.solution_outline || '',
      key_equations: solveData.key_equations || [],
      verification: solveData.verification || '',
    }

    // Cache the result
    setCachedFinalSolve(scaffoldId, response)

    console.log(`[Phased Scaffold] Generated final solve`)
    return response
  } catch (error) {
    console.error('Failed to parse final solve JSON:', error)
    console.error('Raw JSON string (first 500 chars):', jsonStr.substring(0, 500))
    throw new Error('Failed to generate final solve')
  }
}

// Re-export cache utilities for external use
export { generateScaffoldId, SCHEMA_VERSION } from './scaffoldCache'

/**
 * Helper to clean and repair common JSON issues from LLM output
 */
function cleanJsonString(jsonStr: string): string {
  let cleaned = jsonStr
    // Remove any markdown code block markers
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    // Fix trailing commas before closing brackets
    .replace(/,(\s*[}\]])/g, '$1')
    // Fix unescaped newlines in strings (common LLM issue)
    .replace(/(?<!\\)\\n/g, '\\n')
    // Remove control characters that break JSON
    .replace(/[\x00-\x1F\x7F]/g, (char) => {
      if (char === '\n' || char === '\r' || char === '\t') return char
      return ''
    })

  return cleaned
}
