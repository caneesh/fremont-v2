/**
 * Step Expansion Prompt (Phase B)
 *
 * Deep content generation for a SINGLE step, on-demand.
 * Max tokens: 1200-2000
 */

import type { OutlineStep } from '@/types/phasedScaffold'

export const STEP_EXPANSION_SYSTEM_PROMPT = `You are an expert IIT-JEE Physics teacher. Expand a SINGLE step with deep learning content.

CRITICAL CONSTRAINTS:
- Output ONLY valid JSON, no other text
- Expand ONLY the requested step_id
- Do NOT modify step title or change step ordering
- Keep explanation under 150 words (BE CONCISE)
- Generate 2-3 micro-tasks per step (NOT 4)
- Keep reasoning fields SHORT (1-2 sentences max)
- COMPLETE the JSON - do not truncate

OUTPUT FORMAT:
{
  "step_id": "s1",
  "micro_tasks": [
    {
      "task_id": "t1",
      "type": "MCQ|FILL_BLANK|SHORT_ANSWER",
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct_index": 0,
      "reasoning": "Why this is correct (1-2 sentences)",
      "difficulty": "easy|medium|hard"
    }
  ],
  "explanation": "Deep explanation of this step (max 250 words)",
  "traps": [
    {
      "trap_id": "trap1",
      "description": "Common mistake",
      "why_wrong": "Why it's incorrect",
      "hint_to_avoid": "Non-spoiler hint"
    }
  ],
  "gating": {
    "min_correct_tasks": 2,
    "pass_on_explanation": true,
    "allow_skip_after_attempts": 3
  },
  "hints": [
    {"level": 1, "content": "Conceptual hint"},
    {"level": 2, "content": "More specific hint"},
    {"level": 3, "content": "Strategy hint"}
  ],
  "feynman_prompt": null or {
    "topic": "topic-id",
    "question": "Why does this principle apply?",
    "context": "Brief context"
  },
  "fbd_data": null or {
    "scenario_type": "incline|hanging|pulley|horizontal|wedge|block-on-wedge|rotating",
    "object_shape": "block|point|sphere",
    "surface_angle": 30,
    "required_forces": [
      {"type": "weight", "direction": "down", "label": "mg"}
    ]
  }

SCENARIO TYPE GUIDE:
- "wedge" or "block-on-wedge": Use for accelerating wedge problems (block on moving wedge)
- "incline": Use for FIXED inclined planes only
- "pulley": Pulley systems
- "hanging": Suspended objects
- "rotating": Circular/rotational motion
- "horizontal": Flat surface problems
}`

export function buildStepExpansionPrompt(
  problem: string,
  outlineSteps: OutlineStep[],
  targetStepId: string
): string {
  const targetStep = outlineSteps.find(s => s.step_id === targetStepId)
  if (!targetStep) {
    throw new Error(`Step ${targetStepId} not found in outline`)
  }

  const stepsContext = outlineSteps
    .map(s => `${s.step_id}: ${s.title} (${s.step_type})`)
    .join('\n')

  return `PROBLEM:
${problem}

SCAFFOLD OUTLINE (for context):
${stepsContext}

TARGET STEP TO EXPAND:
- step_id: ${targetStep.step_id}
- title: ${targetStep.title}
- goal: ${targetStep.goal}
- step_type: ${targetStep.step_type}
- requires_fbd: ${targetStep.requires_fbd || false}

TASK: Generate deep learning content for ONLY step "${targetStep.step_id}".

REQUIREMENTS:
1. Generate 2-4 micro-tasks that test understanding of THIS step
2. Mix task types: MCQ for concepts, FILL_BLANK for terms, SHORT_ANSWER for reasoning
3. Each task must have clear reasoning for the correct answer
4. Include 3-6 common traps/mistakes students make at this step
5. Explanation should be educational but under 250 words
6. Hints should be progressive (level 1 = conceptual, level 3 = more specific)

CONDITIONAL FIELDS:
- Include feynman_prompt ONLY if step_type is "concept" and involves a fundamental law
- Include fbd_data ONLY if requires_fbd is true
- For fbd_data, list ALL forces that should appear (weight, normal, friction, tension, etc.)

OUTPUT the JSON for this single step expansion. Do NOT include other steps.`
}

/**
 * Max tokens for step expansion
 * Moderate limit for detailed single-step content
 * Increased to 2500 to prevent truncation of complex responses
 */
export const STEP_EXPANSION_MAX_TOKENS = 2500
