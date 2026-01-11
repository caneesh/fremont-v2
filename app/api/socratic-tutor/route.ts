import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type {
  SocraticAnalyzeRequest,
  SocraticAnalyzeResponse,
  GenerateQuestionsRequest,
  GenerateQuestionsResponse,
  ChatMessage,
} from '@/types/socraticTutor'
import type {
  SocraticModeRequest,
  SocraticModeResponse,
  SocraticExchangeRecord,
  SelfReportConfidence,
} from '@/types/socraticFirst'
import {
  getTrackFromQuery,
  getTrackFromBody,
  logTrackUsage,
} from '@/lib/server/getTrackFromRequest'
import {
  buildSocraticQuestionPrompt,
  buildSocraticAnalysisPrompt,
  containsEquationsForF1,
} from '@/lib/server/trackAwarePrompts'

// Create client lazily to ensure env vars are available in serverless context
function getAnthropicClient() {
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
}

// Generate initial comprehension questions for a step
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const problemText = searchParams.get('problemText') || ''
    const stepTitle = searchParams.get('stepTitle') || ''
    const stepContent = searchParams.get('stepContent') || ''
    const concepts = searchParams.get('concepts') || ''

    // Extract track from query params (for future behavior customization)
    const track = getTrackFromQuery(request)
    logTrackUsage('/api/socratic-tutor GET', track, searchParams.has('track') ? 'query' : 'default')

    const prompt = `You are a Socratic physics tutor. Generate 1-2 short comprehension questions to check if a student truly understands a physics step they just completed.

## Problem
${problemText}

## Step: ${stepTitle}
${stepContent}

## Key Concepts
${concepts}

## Your Task
Generate 1-2 quick comprehension questions that:
1. Test understanding, not just recall
2. Focus on the "why" not just the "what"
3. Can be answered in 1-2 sentences
4. Reveal common misconceptions if answered incorrectly

### Respond with JSON:
{
  "questions": [
    {
      "id": "q1",
      "question": "Your first question here?",
      "hint": "A small hint if they struggle"
    }
  ]
}

Rules:
- Keep questions concise (under 25 words each)
- Make them specific to this step, not generic
- Respond with ONLY valid JSON`

    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content[0]
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON')
    }

    const result: GenerateQuestionsResponse = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating questions:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY
    return NextResponse.json(
      {
        error: 'Failed to generate questions',
        details: errorMessage.substring(0, 100),
        hasApiKey
      },
      { status: 500 }
    )
  }
}

// Analyze student answer and generate follow-up if needed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract track from body (for future behavior customization)
    const track = getTrackFromBody(body)
    logTrackUsage('/api/socratic-tutor POST', track, body.track ? 'body' : 'default')

    // Check if this is a Socratic-first mode request
    if (body.mode === 'verification' || body.mode === 'hint_check') {
      return handleSocraticFirstMode(body as SocraticModeRequest, track)
    }

    // Legacy mode: original Socratic tutor flow
    const {
      problemText,
      stepTitle,
      stepContent,
      requiredConcepts,
      question,
      studentAnswer,
      chatHistory = [],
    } = body as SocraticAnalyzeRequest

    // Format chat history for context
    const historyText = chatHistory.length > 0
      ? `\n## Conversation History\n${chatHistory.map(m =>
          `${m.role === 'professor' ? 'Professor' : 'Student'}: ${m.content}`
        ).join('\n')}\n`
      : ''

    const prompt = `You are a warm, encouraging Socratic physics professor having a live tutoring conversation. Analyze the student's answer and guide them toward understanding.

## Problem
${problemText}

## Step: ${stepTitle}
${stepContent}

## Key Concepts
${requiredConcepts.join(', ')}
${historyText}
## Current Question
${question}

## Student's Answer
${studentAnswer}

## Your Task
1. Analyze if the student's answer shows genuine understanding
2. If correct: Celebrate briefly and confirm understanding
3. If incorrect/partial: Ask a gentle follow-up question to guide them

### Respond with JSON:
{
  "analysis": {
    "isCorrect": true/false,
    "understanding": "full" | "partial" | "misconception" | "unclear",
    "feedback": "Brief encouraging feedback",
    "followUpQuestion": "If not resolved, your next Socratic question",
    "conceptGaps": ["List any concepts they seem to misunderstand"]
  },
  "isResolved": true/false,
  "encouragement": "If resolved, a celebratory message"
}

## Personality Rules
- Be warm and encouraging, never condescending
- Use phrases like "Good thinking!", "You're on the right track!", "Almost there!"
- If wrong, never say "wrong" - instead say "Let's think about this..."
- Ask questions that lead to discovery, don't just give answers
- Keep follow-up questions short and focused
- After 2-3 successful exchanges, mark as resolved
- When resolved, be genuinely celebratory!

Respond with ONLY valid JSON.`

    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content[0]
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON')
    }

    const result: SocraticAnalyzeResponse = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error analyzing answer:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY
    return NextResponse.json(
      {
        error: 'Failed to analyze answer',
        details: errorMessage.substring(0, 100),
        hasApiKey
      },
      { status: 500 }
    )
  }
}

/**
 * Handle Socratic-first mode requests (verification, hint_check)
 * @param body - The request body
 * @param track - User's current track for behavior customization
 */
async function handleSocraticFirstMode(body: SocraticModeRequest, track: import('@prisma/client').Track): Promise<NextResponse> {
  const {
    mode,
    problemText,
    stepTitle,
    stepContent,
    concepts,
    question,
    studentAnswer,
    selfReportedConfidence,
    previousExchanges = [],
    hintLevelJustViewed,
  } = body

  // Format previous exchanges for context
  const exchangeHistory = previousExchanges.length > 0
    ? `\n## Previous Exchanges\n${previousExchanges.map(e =>
        `Q: ${e.question}\nA: ${e.studentAnswer} (confidence: ${e.selfReport})\nFeedback: ${e.aiVerification.feedback}`
      ).join('\n\n')}\n`
    : ''

  // Determine context based on mode
  const modeContext = mode === 'hint_check'
    ? `\n## Context\nThe student just viewed a Level ${hintLevelJustViewed} hint. We need to verify they understood it.\n`
    : ''

  // Build track-aware analysis prompt
  const trackAnalysisPrompt = buildSocraticAnalysisPrompt(track)

  // Track-specific feedback instructions
  const trackFeedbackInstructions = track === 'foundation1'
    ? `
### CRITICAL F1 CONSTRAINTS FOR FEEDBACK
- **NEVER use equations** in feedback or explanation (no F=ma, no $...$)
- **Describe relationships in words** ("When mass goes up, acceleration goes down")
- **Use everyday analogies** to explain concepts
- **Focus on direction, comparison, cause-effect**
- If follow-up question is needed, make it qualitative (never "calculate" or "plug in")`
    : track === 'foundation2'
    ? `
### F2 FEEDBACK GUIDELINES
- **Before giving equations**, validate their physical reasoning
- **Explain each symbol's meaning** when introducing equations
- Use LaTeX for math ($...$ for inline)
- Connect math back to physical intuition`
    : ''

  const prompt = `${trackAnalysisPrompt}

## Problem
${problemText}

## Step: ${stepTitle}
${stepContent}

## Key Concepts
${concepts.join(', ')}
${exchangeHistory}${modeContext}
## Current Question
${question || "What's your approach to this step?"}

## Student's Answer
${studentAnswer}

## Student's Self-Reported Confidence
${selfReportedConfidence} (guess = not sure at all, okay = somewhat confident, solid = pretty confident)

## Your Task
1. Assess the quality of the student's answer (excellent, good, partial, or misconception)
2. Compare their self-reported confidence to actual performance
3. Provide warm, encouraging feedback
4. If not complete, generate a follow-up question to guide them deeper
5. Identify any concept gaps
${trackFeedbackInstructions}

### Answer Quality Guidelines:
- "excellent": Shows deep understanding, could teach this to others
- "good": Solid understanding, may miss minor nuances
- "partial": Has the right idea but incomplete or unclear
- "misconception": Fundamental misunderstanding that needs gentle correction

### Calibration Assessment:
- "overconfident": Said "solid" but answer was partial/misconception
- "underconfident": Said "guess" but answer was good/excellent
- "calibrated": Self-assessment matches actual performance

### Response Requirements:
1. ALWAYS provide a detailed explanation (3-5 sentences) that teaches, not just validates
2. ALWAYS ask a follow-up question if:
   - Answer is "partial" or "misconception"
   - Student said "guess" (even if answer is okay)
   - There are concept gaps
3. Only mark as complete if answer is "excellent" or "good" AND student was confident

### Respond with JSON:
{
  "verification": {
    "answerQuality": "excellent" | "good" | "partial" | "misconception",
    "matchesSelfReport": true/false,
    "calibrationAdjustment": "overconfident" | "underconfident" | "calibrated",
    "feedback": "Detailed educational feedback explaining WHY (3-5 sentences). Explain the physics concept, not just whether they're right.",
    "explanation": "A clear explanation of the correct approach/answer for this step (2-4 sentences). Always include this!",
    "followUpQuestion": "A Socratic question to deepen understanding. REQUIRED if not excellent/good with solid confidence.",
    "conceptGaps": ["List specific concepts they're missing, if any"]
  },
  "misconceptionDetails": [
    {
      "conceptId": "concept name",
      "description": "What they misunderstand",
      "severity": "minor" | "moderate" | "major"
    }
  ],
  "isComplete": true/false,
  "encouragement": "If complete, a celebratory message"
}

Respond with ONLY valid JSON.`

  try {
    const client = getAnthropicClient()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      temperature: 0.4,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content[0]
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON')
    }

    const result: SocraticModeResponse = JSON.parse(jsonMatch[0])

    // Post-process for F1: ensure no equations in feedback/explanation
    if (track === 'foundation1' && result.verification) {
      if (containsEquationsForF1(result.verification.feedback || '')) {
        console.log('[socratic-tutor] F1: Sanitizing feedback that contained equations')
        result.verification.feedback = "You're on the right track! Think about what's happening physically here. What direction do the forces point? How does changing one quantity affect the others?"
      }
      if (containsEquationsForF1(result.verification.explanation || '')) {
        console.log('[socratic-tutor] F1: Sanitizing explanation that contained equations')
        result.verification.explanation = "This step involves understanding the physical relationship between the quantities. Think about cause and effect - when one thing changes, what happens to the others?"
      }
      if (result.verification.followUpQuestion && containsEquationsForF1(result.verification.followUpQuestion)) {
        console.log('[socratic-tutor] F1: Sanitizing follow-up question that contained equations')
        result.verification.followUpQuestion = "Can you describe in your own words what physical principle is at work here? Think about direction and magnitude."
      }
    }

    return NextResponse.json({ ...result, track })
  } catch (error) {
    console.error('Error in Socratic-first mode:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        error: 'Failed to verify answer',
        details: errorMessage.substring(0, 100),
      },
      { status: 500 }
    )
  }
}
// Trigger deployment 1767218912
