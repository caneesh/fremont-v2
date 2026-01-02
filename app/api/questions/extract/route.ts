import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildExtractionPrompt, QUESTION_EXTRACTION_SYSTEM } from '@/lib/prompts/questionExtraction'

export const maxDuration = 300 // 5 minutes for large PDFs

interface ExtractedQuestion {
  questionText: string
  context?: string
  given: Array<{ label: string; value: string; unit?: string }>
  asked: Array<{ label: string; expectedForm?: string }>
  diagrams?: Array<{
    description: string
    type: string
    annotations?: string[]
  }>
  equations?: string[]
  parts?: string[]
  difficulty?: number
  topic?: string
  subtopic?: string
  concepts?: string[]
  answer?: string
}

/**
 * POST /api/questions/extract
 *
 * Extract physics questions from uploaded PDF
 *
 * Body (multipart/form-data):
 * - file: PDF file
 * - sourceType: optional source type hint (jee, neet, ncert, hcv, irodov)
 * - context: optional additional context
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const sourceType = formData.get('sourceType') as string | null
    const additionalContext = formData.get('context') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 })
    }

    const MAX_SIZE = 20 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 20MB' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = buffer.toString('base64')

    const client = new Anthropic()
    const extractionPrompt = buildExtractionPrompt(sourceType || undefined, additionalContext || undefined)

    // Use type assertion for document block
    const documentBlock = {
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: base64 }
    }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: QUESTION_EXTRACTION_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            documentBlock as unknown as Anthropic.TextBlockParam,
            { type: 'text', text: extractionPrompt }
          ]
        }
      ]
    })

    const textContent = response.content.find(c => c.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'No response from extraction' }, { status: 500 })
    }

    const jsonMatch = textContent.text.match(/```json\s*([\s\S]*?)\s*```/)
    if (!jsonMatch) {
      try {
        const result = JSON.parse(textContent.text)
        return NextResponse.json({ success: true, data: result, usage: response.usage })
      } catch {
        return NextResponse.json({ error: 'Failed to parse extraction result', raw: textContent.text }, { status: 500 })
      }
    }

    const result = JSON.parse(jsonMatch[1])
    const schemaQuestions = (result.questions || []).map((q: ExtractedQuestion, i: number) =>
      convertToSchema(q, { source: sourceType || file.name.replace('.pdf', ''), index: i })
    )

    return NextResponse.json({
      success: true,
      data: { questions: schemaQuestions, raw: result.questions, pageInfo: result.pageInfo },
      count: schemaQuestions.length,
      usage: response.usage
    })

  } catch (error) {
    console.error('Question extraction error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Extraction failed' },
      { status: 500 }
    )
  }
}

function convertToSchema(
  q: ExtractedQuestion,
  opts: { source: string; index: number }
): Record<string, unknown> {
  const now = new Date().toISOString()
  const topicPrefix = (q.topic || 'phys').substring(0, 4).toLowerCase()
  const subtopicPrefix = (q.subtopic || 'gen').substring(0, 3).toLowerCase()
  const sourcePrefix = opts.source.substring(0, 6).toLowerCase().replace(/[^a-z0-9]/g, '')
  const questionId = `${topicPrefix}-${subtopicPrefix}-${sourcePrefix}-${String(opts.index + 1).padStart(3, '0')}`

  const topicTags = [
    q.topic?.toLowerCase().replace(/\s+/g, '-'),
    q.subtopic?.toLowerCase().replace(/\s+/g, '-'),
    ...(q.concepts?.map(c => c.toLowerCase().replace(/\s+/g, '-')) || [])
  ].filter(Boolean) as string[]

  return {
    schemaVersion: 'question.v1',
    questionId,
    metadata: {
      title: q.questionText.split(/[.!?]/)[0].substring(0, 60),
      difficulty: q.difficulty || 3,
      estimatedTimeSec: 300,
      language: 'en',
      source: { kind: 'other', reference: opts.source, year: new Date().getFullYear() },
      version: 1,
      createdAt: now,
      updatedAt: now
    },
    classification: {
      topicTags: [...new Set(topicTags)].slice(0, 10),
      patternTags: ['general'],
      metaSkillTags: [],
      trapTags: [],
      learningObjectives: []
    },
    prompt: {
      text: q.questionText,
      context: q.context,
      diagram: q.diagrams && q.diagrams.length > 0
        ? { type: 'static', assetId: `${questionId}-diagram-001` }
        : { type: 'none' },
      given: q.given,
      asked: q.asked
    },
    assets: (q.diagrams || []).map((d, i) => ({
      assetId: `${questionId}-diagram-${String(i + 1).padStart(3, '0')}`,
      kind: 'image',
      alt: d.description
    })),
    steps: [
      { stepId: 's1', type: 'INFO', prompt: 'Read the problem.', difficulty: 1, ui: { allowHint: false } },
      { stepId: 's2', type: 'SHORT_TEXT', prompt: q.asked.length > 0 ? `Find: ${q.asked.map(a => a.label).join(', ')}` : 'Solve the problem', difficulty: q.difficulty || 3, ui: { allowHint: true }, validation: { maxAttempts: 3 } }
    ],
    solutions: {
      finalAnswer: q.answer ? { type: 'TEXT', value: q.answer } : { type: 'TEXT', value: '[To be filled]' },
      synthesis: [], limitingCases: [], alternativePaths: []
    },
    authoring: { reviewStatus: 'draft', notes: `Extracted from ${opts.source}` },
    questionBank: { isOriginal: false, searchKeywords: [], conceptIds: q.concepts?.map(c => c.toLowerCase().replace(/\s+/g, '-')) || [] }
  }
}
