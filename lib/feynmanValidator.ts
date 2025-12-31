/**
 * Feynman Micro-Prompt Validator
 *
 * Semantic validator that checks if students truly understand WHY
 * something happens, not just WHAT happens.
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  ExplanationCategory,
  ClarityScore,
  KeywordAnalysis,
  FeynmanValidationResult,
  TopicKeywords
} from '@/types/feynman'
import { getTopicKeywords, COMMON_MECHANISM_WORDS, GENERIC_FORBIDDEN_PATTERNS } from './feynmanKeywords'

// Create client lazily to ensure env vars are available in serverless context
function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
  })
}

/**
 * System prompt for the LLM validator
 */
export const FEYNMAN_VALIDATOR_SYSTEM_PROMPT = `You are a Socratic physics tutor evaluating a student's conceptual explanation.

TASK: Analyze whether the student truly understands WHY something happens, not just WHAT happens.

CLASSIFICATION CATEGORIES:
1. VALID_MECHANISM (Score 4-5): Student explains the causal chain. Uses reasoning words with correct physics. Shows understanding of underlying mechanism.
2. PARTIAL_UNDERSTANDING (Score 3): Right general idea but missing key mechanism or depth. Knows what happens but not fully why.
3. VAGUE_INTUITION (Score 2): Hand-wavy explanation without specific mechanism. Uses physics words but doesn't connect them causally.
4. MEMORIZED_PHRASE (Score 2): Quotes textbook/formula without showing understanding. Recites facts without explaining the "why".
5. CIRCULAR_LOGIC (Score 1): "X happens because X" - restates the claim as its own explanation.
6. INCORRECT_MECHANISM (Score 1): Confident but wrong causal reasoning. Has a mechanism but it's physically incorrect.

SCORING RUBRIC (Clarity 1-5):
- 5: Could teach this to a curious 12-year-old with perfect accuracy. Clear cause-effect chain.
- 4: Correct mechanism with minor gaps in articulation. Understands the core "why".
- 3: Partially correct. Has some right ideas but needs prompting to complete the picture.
- 2: Vague or memorized. No real mechanism shown, just restating facts or formulas.
- 1: Circular, wrong, or completely missing the point. No valid explanation.

KEY DETECTION RULES:
- "Because [concept] is conserved" without explaining WHY it's conserved = CIRCULAR_LOGIC
- "The formula shows..." or "By definition..." = likely MEMORIZED_PHRASE
- Uses causal words (because, since, causes, leads to) + correct physics = likely VALID
- Missing ANY causal connector = likely VAGUE_INTUITION
- States what happens without why = PARTIAL at best
- Incorrect physics reasoning = INCORRECT_MECHANISM

OUTPUT FORMAT (JSON only, no other text):
{
  "category": "VALID_MECHANISM" | "PARTIAL_UNDERSTANDING" | "VAGUE_INTUITION" | "MEMORIZED_PHRASE" | "CIRCULAR_LOGIC" | "INCORRECT_MECHANISM",
  "clarityScore": 1-5,
  "feedback": "Brief encouraging feedback (1-2 sentences). Acknowledge what's right before noting gaps.",
  "followUpQuestion": "Specific Socratic question to probe deeper (only if score < 4, otherwise null)",
  "reasoning": "Your internal analysis explaining why you classified this way (for logging)"
}

IMPORTANT GUIDELINES:
- Be encouraging and supportive, not harsh or discouraging
- Always acknowledge what the student got RIGHT before pointing out gaps
- Follow-up questions should be specific and lead toward the key insight
- If score >= 4, set followUpQuestion to null (student passed)
- A good follow-up question doesn't give the answer but points toward it
- Consider the student is learning - partial understanding is progress!`

/**
 * Perform keyword analysis on student explanation (fast, no API call)
 */
export function performKeywordAnalysis(
  explanation: string,
  keywords: TopicKeywords | null
): KeywordAnalysis {
  const lowerExplanation = explanation.toLowerCase()
  
  const result: KeywordAnalysis = {
    hasRequiredKeywords: false,
    hasForbiddenKeywords: false,
    hasMechanismWords: false,
    matchedRequired: [],
    matchedForbidden: [],
    matchedMechanism: []
  }

  // Check mechanism words (causal language)
  for (const word of COMMON_MECHANISM_WORDS) {
    if (lowerExplanation.includes(word.toLowerCase())) {
      result.matchedMechanism.push(word)
    }
  }
  result.hasMechanismWords = result.matchedMechanism.length > 0

  // Check topic-specific keywords if available
  if (keywords) {
    // Required concepts
    for (const concept of keywords.requiredConcepts) {
      if (lowerExplanation.includes(concept.toLowerCase())) {
        result.matchedRequired.push(concept)
      }
    }
    result.hasRequiredKeywords = result.matchedRequired.length > 0

    // Forbidden patterns
    const allForbidden = [...keywords.forbiddenPatterns, ...GENERIC_FORBIDDEN_PATTERNS]
    for (const pattern of allForbidden) {
      if (lowerExplanation.includes(pattern.toLowerCase())) {
        result.matchedForbidden.push(pattern)
      }
    }
    result.hasForbiddenKeywords = result.matchedForbidden.length > 0
  } else {
    // Only check generic forbidden patterns
    for (const pattern of GENERIC_FORBIDDEN_PATTERNS) {
      if (lowerExplanation.includes(pattern.toLowerCase())) {
        result.matchedForbidden.push(pattern)
      }
    }
    result.hasForbiddenKeywords = result.matchedForbidden.length > 0
  }

  return result
}

/**
 * Quick rejection for obviously poor explanations (saves API calls)
 */
function quickReject(
  analysis: KeywordAnalysis,
  topic: string
): FeynmanValidationResult {
  // Circular logic detection
  if (analysis.hasForbiddenKeywords && !analysis.hasMechanismWords) {
    return {
      category: 'MEMORIZED_PHRASE',
      clarityScore: 2,
      feedback: "You're on the right track mentioning key concepts! But try to explain the underlying mechanism - WHY does this happen, not just WHAT happens.",
      followUpQuestion: `Can you explain the physical reason behind this? What's actually causing ${topic.replace(/-/g, ' ')} to work this way?`,
      detectedPatterns: analysis,
      reasoning: 'Quick reject: forbidden patterns detected without causal reasoning'
    }
  }

  // Very short explanation
  if (!analysis.hasMechanismWords && !analysis.hasRequiredKeywords) {
    return {
      category: 'VAGUE_INTUITION',
      clarityScore: 2,
      feedback: "Your explanation is a good start, but it's missing the causal chain. Try using words like 'because', 'since', or 'this causes' to connect your ideas.",
      followUpQuestion: "What's the physical mechanism that makes this happen? Think about cause and effect.",
      detectedPatterns: analysis,
      reasoning: 'Quick reject: no mechanism words or required concepts found'
    }
  }

  // Has forbidden patterns even with some good content
  if (analysis.hasForbiddenKeywords) {
    return {
      category: 'PARTIAL_UNDERSTANDING',
      clarityScore: 3,
      feedback: "Good that you mentioned some key concepts! But phrases like 'by definition' or 'the formula says' don't explain WHY. Try to dig deeper into the physical mechanism.",
      followUpQuestion: "You've got the right concepts, but can you explain WHY this relationship holds? What's the underlying physics?",
      detectedPatterns: analysis,
      reasoning: 'Quick reject: has some good content but relies on forbidden phrases'
    }
  }

  // If we get here, need full LLM analysis
  return null as never
}

/**
 * Parse LLM response into structured result
 */
function parseLLMResponse(
  responseText: string,
  keywordAnalysis: KeywordAnalysis
): FeynmanValidationResult {
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }

    const parsed = JSON.parse(jsonMatch[0])

    return {
      category: parsed.category as ExplanationCategory,
      clarityScore: Math.min(5, Math.max(1, parsed.clarityScore)) as ClarityScore,
      feedback: parsed.feedback || 'Please try to explain the underlying mechanism.',
      followUpQuestion: parsed.clarityScore < 4 ? parsed.followUpQuestion : undefined,
      detectedPatterns: keywordAnalysis,
      reasoning: parsed.reasoning
    }
  } catch (error) {
    console.error('Failed to parse LLM response:', error)
    // Return a safe default
    return {
      category: 'PARTIAL_UNDERSTANDING',
      clarityScore: 3,
      feedback: "Thanks for your explanation! Let's explore this concept a bit deeper.",
      followUpQuestion: "Can you elaborate on the physical mechanism behind this?",
      detectedPatterns: keywordAnalysis,
      reasoning: 'Parse error - returning safe default'
    }
  }
}

/**
 * Main validation function
 */
export async function validateFeynmanExplanation(
  studentExplanation: string,
  topic: string,
  context?: string,
  problemStatement?: string
): Promise<FeynmanValidationResult> {
  // Get topic-specific keywords
  const keywords = getTopicKeywords(topic)

  // Perform keyword pre-analysis
  const keywordAnalysis = performKeywordAnalysis(studentExplanation, keywords)

  // Check for quick rejection cases (saves API calls)
  const explanation = studentExplanation.trim()
  
  // Too short - definitely needs more
  if (explanation.length < 20) {
    return {
      category: 'VAGUE_INTUITION',
      clarityScore: 1,
      feedback: "Your explanation is too brief. Try to write at least one complete sentence explaining WHY this happens.",
      followUpQuestion: "Can you give a more complete explanation? What physical mechanism is at work here?",
      detectedPatterns: keywordAnalysis,
      reasoning: 'Explanation too short (< 20 chars)'
    }
  }

  // Check for quick reject conditions
  if (keywordAnalysis.hasForbiddenKeywords && !keywordAnalysis.hasRequiredKeywords && !keywordAnalysis.hasMechanismWords) {
    return quickReject(keywordAnalysis, topic)
  }

  // Build the prompt for LLM
  const topicInfo = keywords
    ? `
TOPIC: ${keywords.topic}
DESCRIPTION: ${keywords.description}
REQUIRED CONCEPTS (student should mention at least one): ${keywords.requiredConcepts.join(', ')}
FORBIDDEN PATTERNS (red flags for shallow understanding): ${keywords.forbiddenPatterns.slice(0, 5).join('; ')}
EXAMPLE GOOD EXPLANATION: "${keywords.exampleGoodExplanation}"
EXAMPLE BAD EXPLANATIONS: ${keywords.exampleBadExplanations.map(e => `"${e}"`).join(', ')}`
    : `TOPIC: ${topic}`

  const contextInfo = context ? `\nCONTEXT: ${context}` : ''
  const problemInfo = problemStatement ? `\nPROBLEM: ${problemStatement}` : ''

  const userPrompt = `${topicInfo}${contextInfo}${problemInfo}

KEYWORD ANALYSIS (pre-computed):
- Has causal reasoning words: ${keywordAnalysis.hasMechanismWords} (${keywordAnalysis.matchedMechanism.join(', ') || 'none'})
- Has required concepts: ${keywordAnalysis.hasRequiredKeywords} (${keywordAnalysis.matchedRequired.join(', ') || 'none'})
- Has forbidden patterns: ${keywordAnalysis.hasForbiddenKeywords} (${keywordAnalysis.matchedForbidden.join(', ') || 'none'})

STUDENT'S EXPLANATION:
"${studentExplanation}"

Analyze this explanation and respond with JSON only.`

  try {
    const message = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: FEYNMAN_VALIDATOR_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt
        }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    return parseLLMResponse(responseText, keywordAnalysis)
  } catch (error) {
    console.error('LLM validation error:', error)
    
    // Fallback to keyword-based analysis
    if (keywordAnalysis.hasMechanismWords && keywordAnalysis.hasRequiredKeywords) {
      return {
        category: 'PARTIAL_UNDERSTANDING',
        clarityScore: 3,
        feedback: "Good effort! You've mentioned some key concepts. Let's make sure the explanation is complete.",
        followUpQuestion: "Can you connect these ideas more explicitly? What causes what?",
        detectedPatterns: keywordAnalysis,
        reasoning: 'LLM error fallback - has mechanism words and required concepts'
      }
    }

    return {
      category: 'VAGUE_INTUITION',
      clarityScore: 2,
      feedback: "Thanks for trying! Let's work on making the explanation more specific.",
      followUpQuestion: "What's the physical mechanism at work here? Try using 'because' to explain cause and effect.",
      detectedPatterns: keywordAnalysis,
      reasoning: 'LLM error fallback - missing key elements'
    }
  }
}

/**
 * Check if an explanation passes the minimum threshold
 */
export function isExplanationPassing(
  result: FeynmanValidationResult,
  minScore: ClarityScore = 4
): boolean {
  return result.clarityScore >= minScore
}

/**
 * Get encouraging message based on score improvement
 */
export function getProgressMessage(
  previousScore: ClarityScore | null,
  currentScore: ClarityScore
): string {
  if (previousScore === null) {
    if (currentScore >= 4) return "Excellent explanation! You clearly understand the concept."
    if (currentScore === 3) return "Good start! You're on the right track."
    return "Thanks for trying! Let's work on this together."
  }

  const improvement = currentScore - previousScore
  if (improvement > 0) {
    if (currentScore >= 4) return "Great improvement! You've nailed the explanation now."
    return `You're getting closer! Your explanation improved from ${previousScore} to ${currentScore}.`
  }
  if (improvement === 0) {
    return "Let's try a different approach to explain this concept."
  }
  return "That's okay, learning takes time. Let's think about this differently."
}
