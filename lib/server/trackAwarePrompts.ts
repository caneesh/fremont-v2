/**
 * Track-Aware Prompt Builder
 *
 * Generates track-specific system prompts and performs post-response validation.
 * Ensures F1/F2/Intermediate/Competitive tracks get appropriate tutoring behavior.
 *
 * Key Contracts:
 * - F1 (Foundation 1): NO equations. Focus on diagrams, qualitative reasoning, cause-effect.
 * - F2 (Foundation 2): Equations AFTER eliciting knowns/unknowns and model selection.
 * - Intermediate: Full math, but still Socratic.
 * - Competitive: Direct, efficient, minimal scaffolding.
 */

import type { Track } from '@prisma/client'
import { getTutorContract, type TutorContract } from '../tutorContracts'

/**
 * Track-specific hint level configurations
 * Different tracks have different hint ladders
 */
export interface TrackHintConfig {
  /** Maximum hint level available by default (without explicit request) */
  defaultMaxLevel: number
  /** Hint levels that require explicit user request ("show equations", "full solution") */
  restrictedLevels: number[]
  /** Level-specific focus and style for this track */
  levelDescriptions: Record<number, { focus: string; style: string }>
}

/**
 * Get track-specific hint configurations
 */
export function getTrackHintConfig(track: Track): TrackHintConfig {
  switch (track) {
    case 'foundation1':
      return {
        defaultMaxLevel: 3, // Levels 4-5 require explicit request
        restrictedLevels: [4, 5],
        levelDescriptions: {
          1: {
            focus: 'physical intuition',
            style: 'Ask a Socratic question about what physical principle might apply. Do NOT mention equations or formulas.',
          },
          2: {
            focus: 'diagram and visualization',
            style: 'Guide the student to draw or visualize the physical setup. Ask about forces, directions, or relationships. NO equations.',
          },
          3: {
            focus: 'qualitative reasoning',
            style: 'Help with cause-effect reasoning or comparisons. Ask "What happens if...?" or "Which one is larger?" NO equations.',
          },
          4: {
            focus: 'conceptual relationships',
            style: 'RESTRICTED: Only if student explicitly requested. Describe relationships in words, minimal notation.',
          },
          5: {
            focus: 'guided walkthrough',
            style: 'RESTRICTED: Only if student explicitly requested. Walk through reasoning step-by-step, still avoiding heavy math.',
          },
        },
      }

    case 'foundation2':
      return {
        defaultMaxLevel: 4, // Level 5 requires explicit request
        restrictedLevels: [5],
        levelDescriptions: {
          1: {
            focus: 'model identification',
            style: 'Ask what physical model or principle applies. Elicit knowns and unknowns before any math.',
          },
          2: {
            focus: 'setup and assumptions',
            style: 'Guide the student to identify variables, draw diagrams, and state assumptions. Ask about constraints.',
          },
          3: {
            focus: 'strategy and approach',
            style: 'Help plan the solution approach. What equations connect knowns to unknowns? Explain physical meaning.',
          },
          4: {
            focus: 'key equations with meaning',
            style: 'Provide relevant equations with clear explanation of each term and physical meaning.',
          },
          5: {
            focus: 'complete solution',
            style: 'RESTRICTED: Only if student explicitly requested. Full step-by-step solution with explanations.',
          },
        },
      }

    case 'intermediate':
      return {
        defaultMaxLevel: 4,
        restrictedLevels: [5],
        levelDescriptions: {
          1: {
            focus: 'concept identification',
            style: 'Ask what physics principle applies. Expect student to recognize relevant concepts.',
          },
          2: {
            focus: 'visualization',
            style: 'Help picture the setup. What diagrams or representations would help?',
          },
          3: {
            focus: 'strategy',
            style: 'Outline the general approach. What are the key steps?',
          },
          4: {
            focus: 'key equations',
            style: 'Provide the main equations needed with brief explanation.',
          },
          5: {
            focus: 'full solution',
            style: 'Complete step-by-step solution with explanations.',
          },
        },
      }

    case 'competitive':
      return {
        defaultMaxLevel: 3, // Minimal scaffolding by default
        restrictedLevels: [4, 5],
        levelDescriptions: {
          1: {
            focus: 'strategic hint',
            style: 'Give a brief strategic pointer. The student should figure out the rest.',
          },
          2: {
            focus: 'key insight',
            style: 'Point to the crucial insight or technique needed. Be direct and concise.',
          },
          3: {
            focus: 'approach outline',
            style: 'Briefly outline an efficient approach. Suggest shortcuts or elegant methods.',
          },
          4: {
            focus: 'equations and method',
            style: 'Provide key equations and method. Student expected to execute independently.',
          },
          5: {
            focus: 'full solution',
            style: 'Complete solution with focus on efficiency and elegance.',
          },
        },
      }
  }
}

/**
 * Build track-aware system prompt for hint generation
 */
export function buildTrackAwareHintPrompt(
  track: Track,
  level: number,
  effectiveLevel: number
): string {
  const contract = getTutorContract(track)
  const hintConfig = getTrackHintConfig(track)
  const levelConfig = hintConfig.levelDescriptions[effectiveLevel] || hintConfig.levelDescriptions[1]

  // Base prompt
  let prompt = `You are a ${contract.tone.toLowerCase().split('.')[0]} physics tutor helping a student who is stuck.
Generate a hint at level ${effectiveLevel} (${levelConfig.focus}).

## CRITICAL TRACK RULES (${track.toUpperCase()})
`

  // Track-specific hard constraints
  switch (track) {
    case 'foundation1':
      prompt += `
### ABSOLUTE CONSTRAINTS (VIOLATION = FAILURE)
1. **NEVER output equations.** No F=ma, no v=d/t, no algebraic expressions.
2. **NEVER use the = sign** except in casual speech ("Energy is conserved").
3. **NEVER use LaTeX math notation** ($...$ or $$...$$).
4. **ALWAYS ask at least ONE Socratic question** - do not just give statements.
5. **Focus on:** diagrams, qualitative predictions, cause-effect, comparisons, limiting cases.

### What TO do:
- Ask "What would happen if...?"
- Ask "Which one has more/less...?"
- Ask "Can you draw/picture...?"
- Ask "What direction does X point?"
- Describe relationships in words ("As mass increases, acceleration decreases")

### What NOT to do:
- Do NOT write F = ma or any equation
- Do NOT use $v = at$ or any LaTeX
- Do NOT say "plug in the values"
- Do NOT mention specific formulas by name with their mathematical form
`
      break

    case 'foundation2':
      prompt += `
### KEY CONSTRAINTS
1. **BEFORE any equation**, you MUST first ask about:
   - "What are the knowns and unknowns?"
   - "What physical model/principle applies here?"
2. **Equations are allowed** but explain each term's physical meaning.
3. **Ask at least one assumption-check question** when relevant ("Are we assuming friction is negligible?")
4. **Focus on:** FBD, variable definitions, constraints, model selection.

### Approach:
- First elicit understanding, then introduce equations
- Connect math to physical meaning
- Use dimensional analysis to verify
`
      break

    case 'intermediate':
      prompt += `
### GUIDELINES
- Full mathematical treatment allowed
- Still maintain Socratic approach - guide, don't just tell
- Check for conceptual gaps when errors occur
- Expect student capability but support appropriately
`
      break

    case 'competitive':
      prompt += `
### GUIDELINES
- Be direct and efficient
- Minimal hand-holding - student should struggle productively
- Point out elegant approaches and shortcuts
- Still Socratic for levels 1-3 (no full solutions unless level 5)
`
      break
  }

  // Level-specific style
  prompt += `
## HINT STYLE FOR LEVEL ${effectiveLevel}
${levelConfig.style}

## TONE
${contract.tone}

## LENGTH
${effectiveLevel <= 3 ? '1-3 sentences. Be concise.' : 'More detailed explanation allowed.'}
`

  return prompt
}

/**
 * Check if a hint response violates F1 constraints (no equations)
 * Returns true if the response contains equations and should be replaced
 */
export function containsEquationsForF1(response: string): boolean {
  // Check for LaTeX math blocks
  if (/\$[^$]+\$/.test(response)) return true
  if (/\$\$[^$]+\$\$/.test(response)) return true

  // Check for common equation patterns (variable = expression)
  // More aggressive patterns for F1
  const equationPatterns = [
    /[a-zA-Z]\s*=\s*[a-zA-Z0-9]/, // F = ma, v = 0
    /[a-zA-Z]\s*=\s*\d+/, // v = 10
    /\d+\s*=\s*[a-zA-Z]/, // 10 = v
    /[a-zA-Z]_[a-zA-Z0-9]\s*=/, // v_0 =
    /\\frac\{/, // LaTeX fraction
    /\\sqrt\{/, // LaTeX square root
    /\^2|\^3|\^\{/, // Exponents
    /[+\-*/]\s*[a-zA-Z]\s*[+\-*/=]/, // a + b = c pattern
  ]

  for (const pattern of equationPatterns) {
    if (pattern.test(response)) return true
  }

  return false
}

/**
 * Generate a safe fallback hint for F1 when equation was detected
 */
export function getF1SafeFallbackHint(level: number): string {
  const fallbacks: Record<number, string> = {
    1: "Let's think about this qualitatively first. What physical principle do you think is at play here? Can you describe what's happening in words?",
    2: "Try drawing what's happening in this problem. Where are the forces pointing? What's moving and in which direction?",
    3: "Think about cause and effect here. If you change one thing, what happens to the others? What's the relationship you can describe in words?",
    4: "Let's focus on understanding the physical relationships. What increases when something else decreases? Can you explain the connection without using formulas?",
    5: "Walk me through your physical reasoning step by step. Don't worry about equations yet - just describe what's happening and why.",
  }
  return fallbacks[level] || fallbacks[1]
}

/**
 * Get the effective hint level after applying track restrictions
 */
export function getEffectiveHintLevel(
  track: Track,
  requestedLevel: number,
  userExplicitlyRequested: boolean
): { level: number; wasRestricted: boolean } {
  const config = getTrackHintConfig(track)

  // If user explicitly requested (e.g., "show equations", "full solution"), allow higher levels
  if (userExplicitlyRequested) {
    return { level: Math.min(requestedLevel, 5), wasRestricted: false }
  }

  // Apply track restrictions
  if (config.restrictedLevels.includes(requestedLevel)) {
    return { level: config.defaultMaxLevel, wasRestricted: true }
  }

  return { level: requestedLevel, wasRestricted: false }
}

/**
 * Post-process hint response to ensure track compliance
 */
export function postProcessHint(
  track: Track,
  level: number,
  hint: string
): { hint: string; wasModified: boolean; reason?: string } {
  // For F1, check for equation violations
  if (track === 'foundation1' && containsEquationsForF1(hint)) {
    return {
      hint: getF1SafeFallbackHint(level),
      wasModified: true,
      reason: 'Original hint contained equations (not allowed for Foundation 1)',
    }
  }

  return { hint, wasModified: false }
}

/**
 * Build track-aware system prompt for Socratic question generation
 */
export function buildSocraticQuestionPrompt(track: Track): string {
  const contract = getTutorContract(track)

  let prompt = `You are a ${contract.tone.toLowerCase().split('.')[0]} Socratic physics tutor.
`

  switch (track) {
    case 'foundation1':
      prompt += `
## CRITICAL TRACK RULES (FOUNDATION 1)

### ABSOLUTE CONSTRAINTS
1. **NEVER include equations** in questions or options.
2. **NEVER use the = sign** in mathematical context.
3. **NEVER use LaTeX** ($...$ or $$...$$).
4. **Focus on qualitative understanding** - "what happens when", "which is greater", "what direction".

### Question Types Allowed:
- Conceptual MCQ: "If mass increases, what happens to acceleration?"
- Qualitative comparisons: "Which object experiences more force?"
- Cause-effect reasoning: "What causes the object to slow down?"
- Diagram interpretation: "Looking at the setup, which direction does the force point?"

### Question Types NOT Allowed:
- Fill-in-the-blank with equations
- Any question asking for numerical values
- Any question involving formulas

Instead of fill-blank, use:
- Conceptual completion: "The force that opposes motion is called ___" (answer: friction)
- Relationship completion: "As temperature increases, pressure ___" (answer: increases)
`
      break

    case 'foundation2':
      prompt += `
## TRACK RULES (FOUNDATION 2)

### Guidelines:
1. **Before using equations**, first ask about knowns/unknowns or physical setup.
2. **Equations are allowed** but explain physical meaning of terms.
3. Use LaTeX for math ($...$ for inline, $$...$$ for display).
4. Focus on systematic problem-solving approach.

### Question Sequence:
1. First question: Identify the physical model/principle
2. Second question: May involve equations with clear explanation
3. Third question: Apply understanding to solve or reason
`
      break

    case 'intermediate':
      prompt += `
## TRACK RULES (INTERMEDIATE)

### Guidelines:
- Full mathematical treatment allowed
- Still Socratic - guide, don't just tell
- Use LaTeX for math ($...$ for inline, $$...$$ for display)
- Expect student capability but support as needed
`
      break

    case 'competitive':
      prompt += `
## TRACK RULES (COMPETITIVE)

### Guidelines:
- Be direct and efficient
- Questions should challenge and extend thinking
- Use elegant/advanced approaches when appropriate
- Minimal scaffolding - student should work independently
`
      break
  }

  prompt += `
## TONE
${contract.tone}
`

  return prompt
}

/**
 * Build track-aware prompt for analyzing student answers
 */
export function buildSocraticAnalysisPrompt(track: Track): string {
  const contract = getTutorContract(track)

  let prompt = `You are a ${contract.tone.toLowerCase().split('.')[0]} Socratic physics professor.
`

  switch (track) {
    case 'foundation1':
      prompt += `
## CRITICAL TRACK RULES (FOUNDATION 1)

### In your feedback:
1. **NEVER use equations** - describe relationships in words
2. **NEVER use LaTeX math notation**
3. **Focus on physical intuition** - "think about what happens when..."
4. **Use analogies and everyday examples**

### When giving follow-up questions:
- Ask about directions, comparisons, causes
- Never ask to "calculate" or "plug in"
- Guide toward conceptual understanding, not math

### Example good feedback:
"That's close! Think about which direction the force points. If you push something to the right, which way does it move?"

### Example bad feedback (NEVER DO THIS):
"Let's look at F = ma to find the acceleration..."
`
      break

    case 'foundation2':
      prompt += `
## TRACK RULES (FOUNDATION 2)

### In your feedback:
1. **Before giving equations**, check if student identified knowns/unknowns
2. **Explain physical meaning** of each term in equations
3. Use LaTeX for math ($...$ for inline)
4. Connect math to physical intuition

### Approach:
- First validate their physical reasoning
- Then introduce relevant equations with context
- Always explain what each symbol means
`
      break

    case 'intermediate':
      prompt += `
## TRACK RULES (INTERMEDIATE)

- Full mathematical feedback allowed
- Still warm and encouraging
- Use LaTeX for math
- Guide discovery rather than just giving answers
`
      break

    case 'competitive':
      prompt += `
## TRACK RULES (COMPETITIVE)

- Be direct and efficient
- Point out elegant shortcuts
- Challenge them to think deeper
- Less hand-holding, more guiding
`
      break
  }

  prompt += `
## PERSONALITY RULES (CRITICAL)
- NEVER say "wrong", "incorrect", or "mistake"
- Use: "Let's think about this...", "Almost there!", "Good thinking!"
- ${contract.tone}
`

  return prompt
}

/**
 * Modify question format for F1 (remove equations from fill-blank)
 */
export function adaptQuestionsForF1(questions: Array<{
  type: string
  question: string
  options?: Array<{ id: string; text: string; isCorrect: boolean }>
  blankAnswer?: string
}>): typeof questions {
  return questions.map((q) => {
    // For fill_blank in F1, convert to conceptual completion
    if (q.type === 'fill_blank') {
      // Check if it contains equations
      if (containsEquationsForF1(q.question) || (q.blankAnswer && containsEquationsForF1(q.blankAnswer))) {
        return {
          type: 'open_ended',
          question: 'In your own words, describe what physical principle applies here and why.',
        }
      }
    }

    // For MCQ, check options for equations
    if (q.type === 'multiple_choice' && q.options) {
      const hasEquationInOptions = q.options.some(opt => containsEquationsForF1(opt.text))
      if (hasEquationInOptions || containsEquationsForF1(q.question)) {
        return {
          type: 'multiple_choice',
          question: 'What physical concept is most relevant to this step?',
          options: [
            { id: 'a', text: 'Understanding the forces involved', isCorrect: true },
            { id: 'b', text: 'Memorizing a formula', isCorrect: false },
            { id: 'c', text: 'Guessing the answer', isCorrect: false },
            { id: 'd', text: 'Skipping to the next step', isCorrect: false },
          ],
        }
      }
    }

    return q
  })
}
