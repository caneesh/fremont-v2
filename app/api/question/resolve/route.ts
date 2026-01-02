/**
 * Question Scaffolding Engine v1 - Resolve Endpoint
 *
 * POST /api/question/resolve
 *
 * Main entry point for resolving a question to its full scaffold.
 * Implements the caching strategy:
 * 1. Check cache by content hash
 * 2. If miss, check for similar questions to reuse/adapt
 * 3. If no suitable match, generate new (with cost guardrails)
 */

import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export const runtime = 'nodejs' // ioredis requires Node.js runtime
import {
  ResolveRequestSchema,
  type ResolveResponse,
  type QuestionDoc,
} from '@/lib/question-engine/schemas'
import {
  hasQuestion,
  getQuestionBlobUrl,
  saveQuestionIndex,
  getSubtopicHashes,
  getTopicHashes,
  getQuestionSummaries,
  checkQuota,
  updateStatus,
  type QuestionSummary,
} from '@/lib/question-engine/kv-store'
import { saveQuestionToBlob, fetchQuestionFromBlob } from '@/lib/question-engine/blob-store'
import {
  computeHash,
  extractFingerprint,
  computeSimilarity,
} from '@/lib/question-engine/fingerprint'
import { findBestTemplate, getTemplate } from '@/lib/question-engine/templates'
import { generateQuestion, adaptQuestion } from '@/lib/question-engine/anthropic-adapter'

// =============================================================================
// Configuration
// =============================================================================

const SIMILARITY_THRESHOLD_REUSE = 0.85 // High similarity = direct reuse
const SIMILARITY_THRESHOLD_ADAPT = 0.5 // Medium similarity = adapt
const MAX_CANDIDATES_TO_CHECK = 10

// =============================================================================
// Response Helpers
// =============================================================================

function successResponse(
  question: QuestionDoc,
  source: 'reuse' | 'adapted' | 'generated',
  cached: boolean,
  generationTimeMs?: number
): ResolveResponse {
  return {
    success: true,
    question,
    meta: {
      source,
      cached,
      generationTimeMs,
    },
  }
}

function errorResponse(
  code: string,
  message: string,
  statusId?: string
): ResolveResponse {
  return {
    success: false,
    error: { code, message },
    meta: {
      cached: false,
      statusId,
    },
  }
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    // Parse and validate request body
    const body = await request.json()
    const parseResult = ResolveRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        errorResponse(
          'INVALID_REQUEST',
          parseResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
        ),
        { status: 400 }
      )
    }

    const { statement, choices, topic, subtopic, userId } = parseResult.data

    // Generate status ID for tracking (used for long-running generation)
    const statusId = uuidv4()

    // ==========================================================================
    // Step A: Compute content hash and check cache
    // ==========================================================================

    const hash = computeHash(statement, choices)

    // Check if we have an exact match in cache
    const cached = await hasQuestion(hash)
    if (cached) {
      const blobUrl = await getQuestionBlobUrl(hash)
      if (blobUrl) {
        const question = await fetchQuestionFromBlob(blobUrl)
        if (question) {
          return NextResponse.json(
            successResponse(question, 'reuse', true),
            { status: 200 }
          )
        }
      }
    }

    // ==========================================================================
    // Step B: Cache miss - extract fingerprint (NO LLM)
    // ==========================================================================

    await updateStatus(statusId, 'analyzing', 'Analyzing problem structure...', 10)

    const fingerprint = extractFingerprint(statement, topic, subtopic)
    const effectiveTopic = fingerprint.topic
    const effectiveSubtopic = fingerprint.subtopic

    // ==========================================================================
    // Step C: Find best matching template
    // ==========================================================================

    await updateStatus(statusId, 'selecting_template', 'Selecting problem template...', 20)

    const template = findBestTemplate(effectiveTopic, effectiveSubtopic)
    if (!template) {
      return NextResponse.json(
        errorResponse(
          'NO_TEMPLATE',
          `No suitable template found for topic "${effectiveTopic}" and subtopic "${effectiveSubtopic}"`
        ),
        { status: 400 }
      )
    }

    // ==========================================================================
    // Step D: Check for similar questions in topic/subtopic
    // ==========================================================================

    await updateStatus(statusId, 'checking_cache', 'Searching for similar problems...', 30)

    // Get candidate hashes from topic/subtopic indexes
    let candidateHashes = await getSubtopicHashes(effectiveTopic, effectiveSubtopic)
    if (candidateHashes.length < MAX_CANDIDATES_TO_CHECK) {
      const topicHashes = await getTopicHashes(effectiveTopic)
      candidateHashes = [...new Set([...candidateHashes, ...topicHashes])]
    }

    // Limit candidates to check
    candidateHashes = candidateHashes.slice(0, MAX_CANDIDATES_TO_CHECK)

    // Get summaries for similarity comparison
    const summaries = await getQuestionSummaries(candidateHashes)

    // Find best match by similarity
    let bestMatch: { summary: QuestionSummary; similarity: number } | null = null

    for (const summary of summaries) {
      const similarity = computeSimilarity(fingerprint, summary.fingerprint)
      if (!bestMatch || similarity > bestMatch.similarity) {
        bestMatch = { summary, similarity }
      }
    }

    // ==========================================================================
    // Step E: Handle based on similarity
    // ==========================================================================

    // High similarity - direct reuse
    if (bestMatch && bestMatch.similarity >= SIMILARITY_THRESHOLD_REUSE) {
      const blobUrl = await getQuestionBlobUrl(bestMatch.summary.hash)
      if (blobUrl) {
        const question = await fetchQuestionFromBlob(blobUrl)
        if (question) {
          // Save under new hash for future exact matches
          const newBlobUrl = await saveQuestionToBlob(hash, {
            ...question,
            id: uuidv4(),
            statement,
            choices: choices ?? undefined,
            source: 'reuse',
          })

          if (newBlobUrl) {
            const newSummary: QuestionSummary = {
              hash,
              statement: statement.slice(0, 200),
              fingerprint,
              createdAt: new Date().toISOString(),
            }
            await saveQuestionIndex(hash, newBlobUrl, effectiveTopic, effectiveSubtopic, newSummary)
          }

          const generationTimeMs = Date.now() - startTime
          return NextResponse.json(
            successResponse(question, 'reuse', false, generationTimeMs),
            { status: 200 }
          )
        }
      }
    }

    // ==========================================================================
    // Step F: Cost guardrails - check if generation is allowed
    // ==========================================================================

    const quotaResult = await checkQuota(userId ?? null)

    if (!quotaResult.allowed) {
      if (!quotaResult.isAuthenticated) {
        return NextResponse.json(
          errorResponse(
            'QUOTA_EXCEEDED',
            'Daily question generation limit reached. Please sign in for more quota.',
            statusId
          ),
          { status: 402 }
        )
      } else {
        return NextResponse.json(
          errorResponse(
            'QUOTA_EXCEEDED',
            'Daily question generation limit reached. Please try again tomorrow.',
            statusId
          ),
          { status: 429 }
        )
      }
    }

    // ==========================================================================
    // Step G: Medium similarity - adapt existing question
    // ==========================================================================

    if (bestMatch && bestMatch.similarity >= SIMILARITY_THRESHOLD_ADAPT) {
      await updateStatus(statusId, 'adapting', 'Adapting similar problem...', 50)

      const blobUrl = await getQuestionBlobUrl(bestMatch.summary.hash)
      if (blobUrl) {
        const similarQuestion = await fetchQuestionFromBlob(blobUrl)
        if (similarQuestion) {
          const adaptResult = await adaptQuestion(statement, choices, template, similarQuestion)

          if (adaptResult.success && adaptResult.question) {
            await updateStatus(statusId, 'validating', 'Validating scaffold...', 80)

            const newQuestion: QuestionDoc = {
              ...adaptResult.question,
              id: uuidv4(),
              statement,
              choices: choices ?? undefined,
              source: 'adapted',
              createdAt: new Date().toISOString(),
            }

            // Persist
            await updateStatus(statusId, 'saving', 'Saving to cache...', 90)

            const newBlobUrl = await saveQuestionToBlob(hash, newQuestion)
            if (newBlobUrl) {
              const newSummary: QuestionSummary = {
                hash,
                statement: statement.slice(0, 200),
                fingerprint,
                createdAt: newQuestion.createdAt,
              }
              await saveQuestionIndex(hash, newBlobUrl, effectiveTopic, effectiveSubtopic, newSummary)
            }

            await updateStatus(statusId, 'completed', 'Done!', 100)

            const generationTimeMs = Date.now() - startTime
            return NextResponse.json(
              successResponse(newQuestion, 'adapted', false, generationTimeMs),
              { status: 200 }
            )
          }
          // Fall through to full generation if adaptation failed
        }
      }
    }

    // ==========================================================================
    // Step H: Low similarity - full generation (requires auth for unauth users)
    // ==========================================================================

    // Additional guardrail: unauthenticated users can only use reuse/adaptation
    if (!quotaResult.isAuthenticated && bestMatch === null) {
      return NextResponse.json(
        errorResponse(
          'AUTH_REQUIRED',
          'This problem requires full generation. Please sign in to continue.',
          statusId
        ),
        { status: 401 }
      )
    }

    await updateStatus(statusId, 'generating', 'Generating new scaffold...', 50)

    const genResult = await generateQuestion(statement, choices, template)

    if (!genResult.success) {
      await updateStatus(statusId, 'error', genResult.error || 'Generation failed', 100)
      return NextResponse.json(
        errorResponse('GENERATION_FAILED', genResult.error || 'Failed to generate question scaffold'),
        { status: 500 }
      )
    }

    await updateStatus(statusId, 'validating', 'Validating scaffold...', 80)

    const newQuestion: QuestionDoc = {
      ...genResult.question!,
      id: uuidv4(),
      statement,
      choices: choices ?? undefined,
      source: 'generated',
      createdAt: new Date().toISOString(),
    }

    // Persist
    await updateStatus(statusId, 'saving', 'Saving to cache...', 90)

    const newBlobUrl = await saveQuestionToBlob(hash, newQuestion)
    if (newBlobUrl) {
      const newSummary: QuestionSummary = {
        hash,
        statement: statement.slice(0, 200),
        fingerprint,
        createdAt: newQuestion.createdAt,
      }
      await saveQuestionIndex(hash, newBlobUrl, effectiveTopic, effectiveSubtopic, newSummary)
    }

    await updateStatus(statusId, 'completed', 'Done!', 100)

    const generationTimeMs = Date.now() - startTime
    return NextResponse.json(
      successResponse(newQuestion, 'generated', false, generationTimeMs),
      { status: 200 }
    )

  } catch (error) {
    console.error('[resolve] Unexpected error:', error)
    return NextResponse.json(
      errorResponse(
        'INTERNAL_ERROR',
        error instanceof Error ? error.message : 'An unexpected error occurred'
      ),
      { status: 500 }
    )
  }
}

// =============================================================================
// OPTIONS Handler (CORS)
// =============================================================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
