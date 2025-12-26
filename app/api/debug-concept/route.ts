import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { validateAuthHeader, unauthorizedResponse, quotaExceededResponse } from '@/lib/auth/apiAuth'
import { serverQuotaService } from '@/lib/auth/serverQuotaService'
import { DEFAULT_QUOTA_LIMITS } from '@/types/auth'
import type { DebugConceptRequest, DebugConceptResponse, ChatMessage } from '@/types/debugConcept'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

function buildChatHistory(history: ChatMessage[]): Array<{ role: 'user' | 'assistant', content: string }> {
  return history.map(msg => ({
    role: msg.role,
    content: msg.content
  }))
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authContext = validateAuthHeader(request)
    if (!authContext) {
      return unauthorizedResponse()
    }

    // Quota check - using hints quota for debug interactions
    if (!serverQuotaService.checkQuota(authContext.userId, 'hints')) {
      return quotaExceededResponse('debug interactions', DEFAULT_QUOTA_LIMITS.dailyHints)
    }

    const body: DebugConceptRequest = await request.json()
    const { userInput, problemContext, chatHistory, isInitialSubmission } = body

    if (!userInput || !problemContext) {
      return NextResponse.json(
        { error: 'Missing required fields: userInput and problemContext' },
        { status: 400 }
      )
    }

    console.log(`[${authContext.userId}] Debug concept request - Initial: ${isInitialSubmission}`)
    const startTime = Date.now()

    // Build the system prompt for Socratic tutoring
    const systemPrompt = `You are a Socratic Physics Professor helping an IIT-JEE student who has failed a "Sanity Check" (final reality check) on a physics problem. Your goal is to guide them to understand their mistake through questions, NOT by giving them the answer directly.

## The Problem
${problemContext.problemText}

## Domain
${problemContext.domain} > ${problemContext.subdomain}

## The Sanity Check They Failed
Question: ${problemContext.sanityCheckQuestion}
Expected Answer: ${problemContext.expectedBehavior}
Check Type: ${problemContext.checkType}

## Problem Steps (for reference)
${problemContext.steps.map(s => `Step ${s.id}: ${s.title}`).join('\n')}

## Key Concepts
${problemContext.concepts.map(c => `- ${c.name}`).join('\n')}

## Your Behavior Guidelines
1. **Never reveal the correct answer directly** - use Socratic questioning
2. **Be brief** - 1-2 sentences max per response
3. **Be encouraging** - physics is hard, acknowledge their effort
4. **Target the specific misconception** - if their error relates to a specific step or concept, identify it
5. **Ask ONE guiding question at a time** - don't overwhelm them
6. **Use physical intuition** - relate to everyday experiences when possible

## Response Format
You MUST respond with ONLY valid JSON in this exact format:
{
  "message": "Your Socratic question or response (1-2 sentences)",
  "isCorrect": false,
  "targetStepId": null,
  "targetConceptId": null,
  "encouragement": null,
  "hintsGiven": 1
}

- Set "isCorrect" to true ONLY when the student demonstrates clear understanding of the correct physical behavior
- Set "targetStepId" to the step number (1-based) if their error relates to a specific problem-solving step
- Set "targetConceptId" to the concept ID if their error relates to a specific physics concept
- Set "encouragement" to a brief praise message when isCorrect is true
- "hintsGiven" should be the total count of Socratic questions you've asked so far

## Examples of Good Socratic Questions
- "What happens to the centripetal force when the angular velocity becomes zero?"
- "If the sphere is hollow vs solid, how does the moment of inertia compare?"
- "In the limit where mass approaches infinity, what should the acceleration approach?"
- "Think about dimensional analysis - what are the units of your answer?"

Remember: Your goal is to help them discover the truth themselves, not to tell them.`

    // Build messages array
    const messages: Array<{ role: 'user' | 'assistant', content: string }> = []

    // Add chat history if exists
    if (chatHistory && chatHistory.length > 0) {
      messages.push(...buildChatHistory(chatHistory))
    }

    // Add current user input
    messages.push({
      role: 'user',
      content: isInitialSubmission
        ? `I submitted this answer to the sanity check: "${userInput}"\n\nBut I think I might be wrong. Can you help me understand?`
        : userInput
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      temperature: 0.7, // Some creativity for varied Socratic questions
      system: systemPrompt,
      messages: messages
    })

    const textContent = response.content[0]
    if (textContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse JSON response
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      // Fallback: if Claude didn't return JSON, wrap the response
      console.warn('Claude did not return JSON, using fallback')
      const fallbackResponse: DebugConceptResponse = {
        message: textContent.text.slice(0, 200),
        isCorrect: false,
        hintsGiven: chatHistory.length + 1
      }
      return NextResponse.json(fallbackResponse)
    }

    const debugResponse: DebugConceptResponse = JSON.parse(jsonMatch[0])

    // Ensure hintsGiven is accurate based on chat history
    debugResponse.hintsGiven = chatHistory.filter(m => m.role === 'assistant').length + 1

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`[${authContext.userId}] Debug response in ${duration}s - Correct: ${debugResponse.isCorrect}`)

    // Increment quota
    serverQuotaService.incrementQuota(authContext.userId, 'hints')

    return NextResponse.json(debugResponse)
  } catch (error) {
    console.error('Error in debug-concept:', error)
    return NextResponse.json(
      {
        error: 'Failed to process debug request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
