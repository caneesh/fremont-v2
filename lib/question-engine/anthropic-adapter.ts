/**
 * Question Scaffolding Engine v1 - Anthropic Adapter
 *
 * Wrapper for Anthropic Sonnet with strict template enforcement.
 *
 * Key principles:
 * - LLM can ONLY fill template slots (variables, text, hints, numeric values)
 * - LLM can NEVER add, remove, or reorder steps
 * - Template blueprint and schema are included in the prompt
 * - JSON-only output with max tokens and timeout settings
 */

import Anthropic from '@anthropic-ai/sdk'
import type { PatternTemplate, QuestionDoc, Step } from './schemas'
import { parseQuestionDoc, validateTemplateAdherence } from './schemas'

// =============================================================================
// Configuration
// =============================================================================

const MODEL = 'claude-sonnet-4-20250514'
const MAX_TOKENS = 4096
const TIMEOUT_MS = 60000 // 60 seconds

// =============================================================================
// Prompt Templates
// =============================================================================

function buildGenerationPrompt(
  statement: string,
  choices: string[] | undefined,
  template: PatternTemplate
): string {
  const choicesSection = choices
    ? `\n\nMULTIPLE CHOICE OPTIONS:\n${choices.map((c, i) => `${String.fromCharCode(65 + i)}) ${c}`).join('\n')}`
    : ''

  return `You are an expert IIT-JEE Physics teacher generating a structured learning scaffold.

PROBLEM STATEMENT:
${statement}${choicesSection}

TEMPLATE ID: ${template.templateId}
TOPIC: ${template.topic}
SUBTOPIC: ${template.subtopic}

STEP BLUEPRINTS (YOU MUST FOLLOW EXACTLY):
${JSON.stringify(template.stepBlueprints, null, 2)}

ALLOWED VARIABLES:
${template.allowedVariables.join(', ')}

CRITICAL RULES:
1. You MUST generate EXACTLY ${template.stepBlueprints.length} steps
2. Step IDs MUST match exactly: ${template.stepBlueprints.map(s => s.id).join(', ')}
3. Step types MUST match exactly as specified in blueprints
4. You CANNOT add, remove, or reorder steps
5. You can ONLY fill in the template slots: prompt, expected, hint, trap, solution
6. All required fields must be non-empty strings

Generate a JSON object with this EXACT structure:
{
  "id": "<unique-id>",
  "statement": "<the problem statement>",
  "choices": ${choices ? JSON.stringify(choices) : 'null'},
  "topic": "${template.topic}",
  "subtopic": "${template.subtopic}",
  "fingerprint": {
    "topic": "${template.topic}",
    "subtopic": "${template.subtopic}",
    "asked": ["<what the problem asks for>"],
    "keywords": ["<key physics terms>"],
    "diagramType": "<fbd|incline|pulley|circuit|optics|none|other>"
  },
  "templateId": "${template.templateId}",
  "steps": [
    ${template.stepBlueprints.map(bp => `{
      "id": "${bp.id}",
      "type": "${bp.type}",
      "prompt": "<Socratic question for this step>",
      "expected": {
        "type": "${bp.type === 'mcq' ? 'choice' : bp.type === 'diagram' ? 'diagram_check' : bp.type === 'equation' ? 'exact' : 'exact'}",
        "value": "<expected answer or description>"
      },
      "hint": "<helpful hint without revealing answer>",
      "trap": "<common mistake to avoid>",
      "solution": "<step-by-step solution>"
    }`).join(',\n    ')}
  ],
  "finalAnswer": "<final numerical answer with units>",
  "version": "1.0.0",
  "createdAt": "${new Date().toISOString()}",
  "source": "generated"
}

RESPOND WITH ONLY THE JSON OBJECT. NO MARKDOWN, NO EXPLANATION.`
}

function buildAdaptationPrompt(
  statement: string,
  choices: string[] | undefined,
  template: PatternTemplate,
  similarQuestion: QuestionDoc
): string {
  const choicesSection = choices
    ? `\n\nMULTIPLE CHOICE OPTIONS:\n${choices.map((c, i) => `${String.fromCharCode(65 + i)}) ${c}`).join('\n')}`
    : ''

  return `You are an expert IIT-JEE Physics teacher adapting a similar problem scaffold.

NEW PROBLEM STATEMENT:
${statement}${choicesSection}

SIMILAR QUESTION (use as reference):
${JSON.stringify(similarQuestion, null, 2)}

TEMPLATE ID: ${template.templateId}
TOPIC: ${template.topic}
SUBTOPIC: ${template.subtopic}

STEP BLUEPRINTS (YOU MUST FOLLOW EXACTLY):
${JSON.stringify(template.stepBlueprints, null, 2)}

CRITICAL RULES:
1. ADAPT the similar question to fit the NEW problem
2. Keep the same step structure - EXACTLY ${template.stepBlueprints.length} steps
3. Step IDs MUST match exactly: ${template.stepBlueprints.map(s => s.id).join(', ')}
4. Update numerical values, variable names, and specific content
5. Preserve pedagogical hints and trap descriptions
6. You CANNOT add, remove, or reorder steps

Generate a JSON object with this EXACT structure:
{
  "id": "<new-unique-id>",
  "statement": "<the NEW problem statement>",
  "choices": ${choices ? JSON.stringify(choices) : 'null'},
  "topic": "${template.topic}",
  "subtopic": "${template.subtopic}",
  "fingerprint": {
    "topic": "${template.topic}",
    "subtopic": "${template.subtopic}",
    "asked": ["<what the NEW problem asks for>"],
    "keywords": ["<key physics terms from NEW problem>"],
    "diagramType": "<fbd|incline|pulley|circuit|optics|none|other>"
  },
  "templateId": "${template.templateId}",
  "steps": [
    // EXACTLY ${template.stepBlueprints.length} steps matching the blueprint IDs
  ],
  "finalAnswer": "<final answer for NEW problem>",
  "version": "1.0.0",
  "createdAt": "${new Date().toISOString()}",
  "source": "adapted"
}

RESPOND WITH ONLY THE JSON OBJECT. NO MARKDOWN, NO EXPLANATION.`
}

function buildFixPrompt(
  invalidJson: string,
  errors: string,
  template: PatternTemplate
): string {
  return `The following JSON failed validation:

${invalidJson}

ERRORS:
${errors}

TEMPLATE REQUIREMENTS:
- Exactly ${template.stepBlueprints.length} steps
- Step IDs: ${template.stepBlueprints.map(s => s.id).join(', ')}
- Step types: ${template.stepBlueprints.map(s => `${s.id}=${s.type}`).join(', ')}
- All required fields must be non-empty

Fix the JSON to comply with the schema and template requirements.
RESPOND WITH ONLY THE CORRECTED JSON OBJECT. NO MARKDOWN, NO EXPLANATION.`
}

// =============================================================================
// Client Management
// =============================================================================

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured')
  }
  return new Anthropic({ apiKey })
}

// =============================================================================
// LLM Operations
// =============================================================================

/**
 * Generate a new QuestionDoc from a problem statement
 */
export async function generateQuestion(
  statement: string,
  choices: string[] | undefined,
  template: PatternTemplate
): Promise<{ success: boolean; question?: QuestionDoc; error?: string }> {
  try {
    const client = getAnthropicClient()
    const prompt = buildGenerationPrompt(statement, choices, template)
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return { success: false, error: 'Unexpected response type from LLM' }
    }

    return parseAndValidate(content.text, template)
  } catch (error) {
    console.error('[Anthropic] generateQuestion error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'LLM generation failed',
    }
  }
}

/**
 * Adapt an existing QuestionDoc for a new problem
 */
export async function adaptQuestion(
  statement: string,
  choices: string[] | undefined,
  template: PatternTemplate,
  similarQuestion: QuestionDoc
): Promise<{ success: boolean; question?: QuestionDoc; error?: string }> {
  try {
    const client = getAnthropicClient()
    const prompt = buildAdaptationPrompt(statement, choices, template, similarQuestion)
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return { success: false, error: 'Unexpected response type from LLM' }
    }

    return parseAndValidate(content.text, template)
  } catch (error) {
    console.error('[Anthropic] adaptQuestion error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'LLM adaptation failed',
    }
  }
}

/**
 * Attempt to fix invalid JSON
 */
async function fixQuestion(
  invalidJson: string,
  errors: string,
  template: PatternTemplate
): Promise<{ success: boolean; question?: QuestionDoc; error?: string }> {
  const client = getAnthropicClient()
  const prompt = buildFixPrompt(invalidJson, errors, template)

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return { success: false, error: 'Unexpected response type from LLM' }
    }

    // Parse without retry to avoid infinite loop
    return parseAndValidateNoRetry(content.text, template)
  } catch (error) {
    console.error('[Anthropic] fixQuestion error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'LLM fix failed',
    }
  }
}

/**
 * Parse JSON and validate against schema and template
 * Retries once with fix prompt if validation fails
 */
async function parseAndValidate(
  jsonText: string,
  template: PatternTemplate
): Promise<{ success: boolean; question?: QuestionDoc; error?: string }> {
  // Clean up the response (remove markdown if present)
  const cleanedJson = jsonText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  // Try to parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(cleanedJson)
  } catch (parseError) {
    // Try to fix with LLM
    console.warn('[Anthropic] JSON parse failed, attempting fix')
    const fixResult = await fixQuestion(
      cleanedJson,
      `JSON parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
      template
    )
    return fixResult
  }

  // Validate with Zod schema
  const zodResult = parseQuestionDoc(parsed)
  if (!zodResult.success) {
    console.warn('[Anthropic] Zod validation failed, attempting fix:', zodResult.error)
    const fixResult = await fixQuestion(cleanedJson, zodResult.error!, template)
    return fixResult
  }

  // Validate template adherence
  const templateError = validateTemplateAdherence(zodResult.data!, template)
  if (templateError) {
    console.warn('[Anthropic] Template adherence failed, attempting fix:', templateError)
    const fixResult = await fixQuestion(cleanedJson, templateError, template)
    return fixResult
  }

  return { success: true, question: zodResult.data }
}

/**
 * Parse and validate without retry (used in fix loop)
 */
function parseAndValidateNoRetry(
  jsonText: string,
  template: PatternTemplate
): { success: boolean; question?: QuestionDoc; error?: string } {
  const cleanedJson = jsonText
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(cleanedJson)
  } catch (parseError) {
    return {
      success: false,
      error: `JSON parse error: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
    }
  }

  const zodResult = parseQuestionDoc(parsed)
  if (!zodResult.success) {
    return { success: false, error: zodResult.error }
  }

  const templateError = validateTemplateAdherence(zodResult.data!, template)
  if (templateError) {
    return { success: false, error: templateError }
  }

  return { success: true, question: zodResult.data }
}

// =============================================================================
// Health Check
// =============================================================================

/**
 * Check if Anthropic API is available
 */
export async function isAnthropicAvailable(): Promise<boolean> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return false

  try {
    const client = new Anthropic({ apiKey })
    // Simple health check - just verify we can create a client
    return true
  } catch {
    return false
  }
}

/**
 * Get Anthropic status message
 */
export function getAnthropicStatus(): { available: boolean; message: string } {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return {
      available: false,
      message: 'ANTHROPIC_API_KEY not configured',
    }
  }

  return {
    available: true,
    message: `Anthropic API configured (model: ${MODEL})`,
  }
}
