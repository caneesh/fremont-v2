import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type {
  GenerateConceptContrastRequest,
  GenerateConceptContrastResponse,
  ValidateRejectionRequest,
  ValidateRejectionResponse,
  ConceptContrastChallenge,
  DistractorConcept,
  RejectionValidation,
  RejectionQuality,
} from '@/types/conceptContrast'

// Initialize the Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

/**
 * Concept Contrast API
 *
 * Implements the "Concept Contrast" agent that forces students to verify
 * deep understanding by ruling out "neighboring" concepts.
 *
 * When a student selects a principle, they must explain why they REJECTED
 * related but inapplicable alternatives (distractors).
 */

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint only accepts POST requests. Use POST with action: "generate" or "validate".' },
    { status: 405 }
  )
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body as { action: 'generate' | 'validate' }

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required: "generate" or "validate"' },
        { status: 400 }
      )
    }

    if (action === 'generate') {
      return handleGenerate(body)
    } else if (action === 'validate') {
      return handleValidate(body)
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "generate" or "validate".' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Error in concept-contrast endpoint:', error)
    return NextResponse.json(
      {
        error: 'Failed to process Concept Contrast request',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Handle challenge generation
 */
async function handleGenerate(body: { action: string } & GenerateConceptContrastRequest) {
  const { selectedConcept, problemContext, numDistractors = 2, targetStepId } = body

  if (!selectedConcept || !problemContext) {
    return NextResponse.json(
      { error: 'selectedConcept and problemContext are required' },
      { status: 400 }
    )
  }

  const prompt = buildGeneratePrompt(selectedConcept, problemContext, numDistractors)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Parse the JSON response
  const jsonMatch = responseText.match(/\{[\s\S]+\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : responseText

  try {
    const parsed = JSON.parse(jsonStr)

    // Build the challenge object
    const challenge: ConceptContrastChallenge = {
      id: `cc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      selectedConcept: {
        id: selectedConcept.id,
        name: selectedConcept.name,
        formula: selectedConcept.formula,
      },
      distractors: parsed.distractors.map((d: Partial<DistractorConcept>, idx: number) => ({
        id: `distractor_${idx}`,
        name: d.name || `Distractor ${idx + 1}`,
        whyPlausible: d.whyPlausible || '',
        criticalFlaw: d.criticalFlaw || '',
        problemConditionViolated: d.problemConditionViolated || '',
        commonMisconception: d.commonMisconception || '',
        rejectionHint: d.rejectionHint || '',
      })),
      problemContext,
      targetStepId,
      challengePrompt: parsed.challengePrompt || buildDefaultChallengePrompt(selectedConcept.name),
      requiredCorrectRejections: Math.min(numDistractors, 2),
      maxAttempts: 3,
    }

    const response: GenerateConceptContrastResponse = {
      success: true,
      challenge,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (parseError) {
    console.error('Failed to parse Concept Contrast JSON:', parseError)
    console.error('Raw response:', responseText)

    // Generate fallback distractors
    const fallbackChallenge = generateFallbackChallenge(
      selectedConcept,
      problemContext,
      numDistractors,
      targetStepId
    )

    return NextResponse.json(
      { success: true, challenge: fallbackChallenge },
      { status: 200 }
    )
  }
}

/**
 * Handle rejection validation
 */
async function handleValidate(body: { action: string } & ValidateRejectionRequest) {
  const { challengeId, distractorId, explanation, problemContext } = body

  if (!distractorId || !explanation || !problemContext) {
    return NextResponse.json(
      { error: 'distractorId, explanation, and problemContext are required' },
      { status: 400 }
    )
  }

  const prompt = buildValidatePrompt(distractorId, explanation, problemContext)

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Parse the JSON response
  const jsonMatch = responseText.match(/\{[\s\S]+\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : responseText

  try {
    const parsed = JSON.parse(jsonStr)

    const validation: RejectionValidation = {
      distractorId,
      isAccepted: parsed.isAccepted || false,
      quality: validateQuality(parsed.quality),
      feedback: parsed.feedback || 'Thank you for your explanation.',
      missingInsight: parsed.missingInsight,
      targetCondition: parsed.targetCondition || '',
    }

    const response: ValidateRejectionResponse = {
      success: true,
      validation,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (parseError) {
    console.error('Failed to parse validation JSON:', parseError)

    // Conservative fallback - ask for more detail
    const fallbackValidation: RejectionValidation = {
      distractorId,
      isAccepted: false,
      quality: 'partial',
      feedback: 'Your reasoning shows some understanding. Can you be more specific about which condition in the problem makes this law inapplicable?',
      missingInsight: 'Identify the specific problem condition that violates this law\'s requirements.',
      targetCondition: 'A specific condition from the problem statement.',
    }

    return NextResponse.json(
      { success: true, validation: fallbackValidation },
      { status: 200 }
    )
  }
}

/**
 * Build prompt for generating distractors
 */
function buildGeneratePrompt(
  selectedConcept: { id: string; name: string; formula?: string },
  problemContext: { problemText: string; domain: string; subdomain: string; keyConditions?: string[] },
  numDistractors: number
): string {
  return `You are the "Concept Contrast" Agent for PhysiScaffold, an advanced physics tutor for IITJEE students. Your goal is to verify deep understanding by forcing students to rule out "neighboring" concepts.

### STUDENT SELECTION
The student has chosen: **${selectedConcept.name}**
${selectedConcept.formula ? `Formula: $${selectedConcept.formula}$` : ''}

### PROBLEM CONTEXT
- Domain: ${problemContext.domain}
- Subdomain: ${problemContext.subdomain}
- Problem: ${problemContext.problemText.substring(0, 1000)}${problemContext.problemText.length > 1000 ? '...' : ''}
${problemContext.keyConditions?.length ? `- Key Conditions: ${problemContext.keyConditions.join(', ')}` : ''}

### YOUR TASK
Generate ${numDistractors} DISTRACTOR concepts - related laws/principles that:
1. Are plausible alternatives a student might confuse with the correct choice
2. Are ACTUALLY INAPPLICABLE to this specific problem
3. Have a SPECIFIC condition in the problem that makes them invalid

For each distractor, identify:
- Why a student might think it applies (plausibility)
- The critical flaw that makes it inapplicable here
- The specific problem condition that rules it out
- A Socratic hint to guide rejection (without giving the answer)

### GOOD DISTRACTOR EXAMPLES
- If student chose "Conservation of Momentum":
  - Distractor: "Conservation of Kinetic Energy" (invalid because collision is inelastic)
  - Distractor: "Newton's 2nd Law" (invalid because we need before/after, not instantaneous)

### OUTPUT FORMAT
Respond with ONLY valid JSON:
{
  "distractors": [
    {
      "name": "Name of the distractor law/principle",
      "whyPlausible": "Why a student might think this applies",
      "criticalFlaw": "The fundamental reason this doesn't work here",
      "problemConditionViolated": "The exact phrase/condition from the problem that rules this out",
      "commonMisconception": "The underlying misconception that leads students to pick this",
      "rejectionHint": "A Socratic question to guide the student toward rejection"
    }
  ],
  "challengePrompt": "You've chosen **${selectedConcept.name}**. Interesting choice.\\n\\nBefore we lock that in, look at these two neighbors:\\n[The distractor names will be inserted here]\\n\\nWhy did you throw these out? Specifically, what condition in the problem statement makes them impossible to use here?"
}

Respond with ONLY the JSON, no other text.`
}

/**
 * Build prompt for validating a rejection explanation
 */
function buildValidatePrompt(
  distractorId: string,
  explanation: string,
  problemContext: { problemText: string; domain: string; subdomain: string; keyConditions?: string[] }
): string {
  return `You are evaluating a student's explanation for why they REJECTED a physics law/principle.

### PROBLEM CONTEXT
- Domain: ${problemContext.domain}
- Subdomain: ${problemContext.subdomain}
- Problem: ${problemContext.problemText.substring(0, 1000)}${problemContext.problemText.length > 1000 ? '...' : ''}
${problemContext.keyConditions?.length ? `- Key Conditions: ${problemContext.keyConditions.join(', ')}` : ''}

### STUDENT'S REJECTION EXPLANATION
"${explanation}"

### YOUR TASK
Evaluate whether the student correctly identified why the rejected law/principle is INAPPLICABLE to this problem.

A GOOD rejection explanation should:
1. Identify a SPECIFIC condition in the problem that violates the law's prerequisites
2. Show understanding of WHEN the rejected law would apply
3. Not just say "it doesn't work" but explain WHY

### QUALITY RATINGS
- "excellent": Precisely identifies the problem condition that violates the law's requirements
- "acceptable": Correct reasoning but could be more precise
- "partial": Partially correct, missing the key insight
- "incorrect": Fundamental misunderstanding
- "vague": Too vague to evaluate

### OUTPUT FORMAT
Respond with ONLY valid JSON:
{
  "isAccepted": true/false,
  "quality": "excellent" | "acceptable" | "partial" | "incorrect" | "vague",
  "feedback": "Specific feedback for the student. If incorrect, guide without revealing the answer.",
  "missingInsight": "What key insight is missing (only if not accepted)",
  "targetCondition": "The condition they should have identified"
}

Respond with ONLY the JSON, no other text.`
}

/**
 * Validate quality string
 */
function validateQuality(quality: string): RejectionQuality {
  const validQualities: RejectionQuality[] = ['excellent', 'acceptable', 'partial', 'incorrect', 'vague']
  return validQualities.includes(quality as RejectionQuality)
    ? (quality as RejectionQuality)
    : 'partial'
}

/**
 * Build default challenge prompt
 */
function buildDefaultChallengePrompt(selectedConceptName: string): string {
  return `You've chosen **${selectedConceptName}**. Interesting choice.

Before we lock that in, look at these two neighbors.

Why did you throw these out? Specifically, what condition in the problem statement makes them impossible to use here?`
}

/**
 * Generate fallback challenge when AI fails
 */
function generateFallbackChallenge(
  selectedConcept: { id: string; name: string; formula?: string },
  problemContext: { problemText: string; domain: string; subdomain: string; keyConditions?: string[] },
  numDistractors: number,
  targetStepId?: number
): ConceptContrastChallenge {
  // Generate generic physics distractors based on the domain
  const genericDistractors: Record<string, DistractorConcept[]> = {
    'Classical Mechanics': [
      {
        id: 'distractor_0',
        name: 'Conservation of Energy',
        whyPlausible: 'Energy conservation is a fundamental principle often used in mechanics problems.',
        criticalFlaw: 'This law requires no non-conservative forces (like friction) to be present.',
        problemConditionViolated: 'Check if friction, air resistance, or inelastic collisions are mentioned.',
        commonMisconception: 'Students often forget that energy is not conserved when non-conservative forces are present.',
        rejectionHint: 'What happens to the total mechanical energy when friction is present?',
      },
      {
        id: 'distractor_1',
        name: "Newton's Second Law (F = ma)",
        whyPlausible: 'F = ma is the most fundamental equation in classical mechanics.',
        criticalFlaw: 'This requires knowledge of instantaneous forces and accelerations.',
        problemConditionViolated: 'Check if the problem asks for before/after comparisons rather than instantaneous values.',
        commonMisconception: 'Students try to use F = ma when conservation laws would be more efficient.',
        rejectionHint: 'Does this problem give you enough information about the forces during the collision?',
      },
    ],
    default: [
      {
        id: 'distractor_0',
        name: 'Alternative Principle 1',
        whyPlausible: 'This is a related principle that might seem applicable.',
        criticalFlaw: 'A specific condition in the problem makes this invalid.',
        problemConditionViolated: 'Identify the condition that rules this out.',
        commonMisconception: 'Students often confuse when this principle applies.',
        rejectionHint: 'What are the prerequisites for using this principle?',
      },
      {
        id: 'distractor_1',
        name: 'Alternative Principle 2',
        whyPlausible: 'Another related principle from the same domain.',
        criticalFlaw: 'Different conditions are required for this principle.',
        problemConditionViolated: 'Check the problem statement carefully.',
        commonMisconception: 'The scope of application is often misunderstood.',
        rejectionHint: 'Under what conditions would this principle be valid?',
      },
    ],
  }

  const distractors = (genericDistractors[problemContext.domain] || genericDistractors.default)
    .slice(0, numDistractors)

  return {
    id: `cc_fallback_${Date.now()}`,
    selectedConcept: {
      id: selectedConcept.id,
      name: selectedConcept.name,
      formula: selectedConcept.formula,
    },
    distractors,
    problemContext,
    targetStepId,
    challengePrompt: buildDefaultChallengePrompt(selectedConcept.name),
    requiredCorrectRejections: Math.min(numDistractors, 2),
    maxAttempts: 3,
  }
}
