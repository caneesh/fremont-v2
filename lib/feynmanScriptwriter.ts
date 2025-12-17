import Anthropic from '@anthropic-ai/sdk'
import type { FeynmanScript, FeynmanRequest } from '@/types/feynman'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

/**
 * The Feynman Scriptwriter
 * Generates short, engaging audio scripts explaining physics concepts
 * using intuition, visualization, and analogies - NO MATH
 */
export async function generateFeynmanScript(request: FeynmanRequest): Promise<FeynmanScript> {
  const { concept, context, stepTitle, problemStatement } = request

  const feynmanPrompt = `You are the "Feynman Scriptwriter." You generate short, engaging audio scripts for a physics learning app.
Your goal is to explain complex physics concepts using intuition, visualization, and analogies—strictly NO math.

### THE CHARACTERS

1. **ALEX (The Student)**: Curious but confused. Asks the questions a beginner would be afraid to ask. Speaks in simple, natural language.
2. **PROF (The Mentor)**: Patient, visual, and Socratic. Uses real-world metaphors (water, traffic, spinning tops, bowls, hills) instead of abstract variables.

### INPUT DATA

**Concept**: ${concept}
**Context**: ${context}
${stepTitle ? `**Step**: ${stepTitle}` : ''}
${problemStatement ? `**Problem**: ${problemStatement}` : ''}

### RULES

1. **DURATION**: Keep the total script under 120 words (approx. 45-60 seconds spoken).
2. **NO MATH**: Never mention derivatives, integrals, or specific formulas. No equations.
3. **THE ANALOGY**: You MUST use a physical analogy relevant to the concept (e.g., "marble in a bowl", "water flowing downhill", "spinning figure skater").
4. **CONVERSATIONAL**: Make it sound like a natural conversation, not a lecture.
5. **VISUAL**: Help Alex "see" the concept in their mind's eye.
6. **FORMAT**: Output strictly as valid JSON with the structure below.

### OUTPUT FORMAT (JSON)

{
  "title": "A short catchy title for the clip (4-6 words)",
  "concept": "${concept}",
  "analogy": "Brief description of the core analogy used",
  "dialogue": [
    {"speaker": "Alex", "text": "..." },
    {"speaker": "Prof", "text": "..." }
  ]
}

### EXAMPLE OUTPUT

{
  "title": "The Hill vs. The Valley",
  "concept": "Stability of Equilibrium",
  "analogy": "Marble on a bowl vs. marble on an upside-down bowl",
  "dialogue": [
    {
      "speaker": "Alex",
      "text": "I found where the bead stops moving, but how do I know if it's stable?"
    },
    {
      "speaker": "Prof",
      "text": "Imagine the bead is a marble. If it's stable, it's sitting at the bottom of a bowl. Nudge it, and it rolls back down."
    },
    {
      "speaker": "Alex",
      "text": "And if it's unstable?"
    },
    {
      "speaker": "Prof",
      "text": "Then it's balancing on top of an upside-down bowl. One tiny nudge, and it rolls away forever. That's what stability means—is the ground curving up like a valley, or down like a hill?"
    }
  ]
}

Generate the script now. Respond with ONLY the JSON, no other text.`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: feynmanPrompt,
      },
    ],
  })

  const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

  // Extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]+\}/)
  const jsonStr = jsonMatch ? jsonMatch[0] : responseText

  try {
    const scriptData = JSON.parse(jsonStr) as FeynmanScript
    return scriptData
  } catch (error) {
    console.error('Failed to parse Feynman script JSON:', error)
    throw new Error('Failed to generate Feynman script')
  }
}
