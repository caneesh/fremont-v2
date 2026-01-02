#!/usr/bin/env npx ts-node
/**
 * PDF to Question Bank Extractor
 *
 * Extracts physics questions from PDF files using Claude Vision.
 * Outputs structured JSON conforming to question.v1.fixed.schema.json
 *
 * Usage:
 *   npx ts-node scripts/pdf-to-questions.ts <pdf-path> [options]
 *
 * Options:
 *   --output, -o    Output file path (default: stdout)
 *   --source        Source identifier (e.g., "jee", "ncert", "hcv")
 *   --difficulty    Default difficulty 1-5 (default: 3)
 *   --validate      Validate output against schema (default: true)
 *   --batch         Process directory of PDFs
 */

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import Ajv from 'ajv'
import addFormats from 'ajv-formats'

// Types
interface ExtractedQuestion {
  questionText: string
  context?: string
  given: Array<{ label: string; value: string; unit?: string }>
  asked: Array<{ label: string; expectedForm?: string }>
  diagrams: Array<{
    description: string
    type: 'graph' | 'diagram' | 'figure' | 'table'
    annotations?: string[]
  }>
  equations: string[]
  parts?: string[]
  difficulty?: number
  topic?: string
  subtopic?: string
  concepts?: string[]
  source?: {
    page?: number
    questionNumber?: string
  }
}

interface ProcessingOptions {
  source?: string
  sourceKind?: 'original' | 'jee' | 'neet' | 'cbse' | 'ncert' | 'book' | 'other'
  difficulty?: number
  validate?: boolean
  outputPath?: string
}

// Claude Vision prompt for extracting questions
const EXTRACTION_PROMPT = `You are an expert physics question analyzer. Extract all physics questions from this PDF page.

For EACH question found, provide a structured extraction with:

1. **Question Text**: The complete problem statement, preserving all mathematical notation as LaTeX
2. **Context**: Any setup, assumptions, or scenario descriptions
3. **Given Values**: Extract all given quantities with their values and units
4. **Asked Values**: What the question asks to find
5. **Diagrams**: Describe any diagrams, graphs, or figures in detail
6. **Equations**: Any equations shown or referenced
7. **Parts**: If multi-part (a, b, c...), list each part separately
8. **Topic Classification**: Identify the physics topic (mechanics, thermodynamics, electromagnetism, etc.)
9. **Concepts**: Key physics concepts tested
10. **Difficulty**: Estimate 1-5 (1=basic recall, 5=Olympiad level)

OUTPUT FORMAT (JSON array):
\`\`\`json
[
  {
    "questionText": "A block of mass 5 kg slides down a frictionless incline...",
    "context": "Assume the incline is perfectly smooth and air resistance is negligible.",
    "given": [
      {"label": "Mass", "value": "5", "unit": "kg"},
      {"label": "Angle", "value": "30", "unit": "°"},
      {"label": "Initial velocity", "value": "0", "unit": "m/s"}
    ],
    "asked": [
      {"label": "Acceleration", "expectedForm": "numeric"},
      {"label": "Normal force", "expectedForm": "numeric"}
    ],
    "diagrams": [
      {
        "description": "Inclined plane at 30° with a block on it. Forces mg and N are labeled.",
        "type": "diagram",
        "annotations": ["angle θ = 30°", "block mass m", "normal force N", "weight mg"]
      }
    ],
    "equations": ["F = ma", "a = g \\\\sin\\\\theta"],
    "parts": ["(a) Find the acceleration", "(b) Find the normal force"],
    "topic": "mechanics",
    "subtopic": "newton-laws",
    "concepts": ["inclined plane", "force decomposition", "Newton's second law"],
    "difficulty": 2,
    "source": {
      "questionNumber": "Q5"
    }
  }
]
\`\`\`

IMPORTANT:
- Preserve ALL mathematical notation as LaTeX
- Extract exact numerical values with proper units
- For diagrams, describe what's shown
- If a question references a figure, describe it based on visible content

Extract all questions from this page:`

// Convert extracted question to schema format
function toSchemaFormat(
  extracted: ExtractedQuestion,
  options: ProcessingOptions,
  index: number
): Record<string, unknown> {
  const now = new Date().toISOString()
  const questionId = generateQuestionId(extracted, options, index)
  const topicTags = extractTopicTags(extracted)
  const patternTags = extractPatternTags(extracted)
  const steps = generateSteps(extracted)

  return {
    schemaVersion: 'question.v1',
    questionId,
    metadata: {
      title: generateTitle(extracted),
      difficulty: extracted.difficulty || options.difficulty || 3,
      estimatedTimeSec: estimateTime(extracted),
      language: 'en',
      source: {
        kind: options.sourceKind || 'other',
        reference: options.source || 'PDF Import',
        year: new Date().getFullYear()
      },
      version: 1,
      createdAt: now,
      updatedAt: now
    },
    classification: {
      topicTags,
      patternTags,
      metaSkillTags: extractMetaSkills(extracted),
      trapTags: [],
      learningObjectives: []
    },
    prompt: {
      text: extracted.questionText,
      context: extracted.context,
      diagram: extracted.diagrams.length > 0
        ? {
            type: 'static' as const,
            assetId: `${questionId}-diagram-001`,
            annotations: extracted.diagrams[0]?.annotations || []
          }
        : { type: 'none' as const },
      given: extracted.given,
      asked: extracted.asked
    },
    assets: extracted.diagrams.map((diag, i) => ({
      assetId: `${questionId}-diagram-${String(i + 1).padStart(3, '0')}`,
      kind: 'image' as const,
      alt: diag.description
    })),
    steps,
    solutions: {
      finalAnswer: {
        type: 'TEXT' as const,
        value: '[To be filled after solving]',
        notes: 'Extracted from PDF - needs manual solution entry'
      },
      synthesis: [],
      limitingCases: [],
      alternativePaths: []
    },
    authoring: {
      reviewStatus: 'draft' as const,
      notes: `Extracted from PDF. Source: ${options.source || 'Unknown'}`,
      canonicalPatterns: patternTags
    },
    questionBank: {
      isOriginal: false,
      searchKeywords: extractKeywords(extracted),
      conceptIds: extracted.concepts?.map(c => c.toLowerCase().replace(/\s+/g, '-')) || []
    }
  }
}

function generateQuestionId(
  extracted: ExtractedQuestion,
  options: ProcessingOptions,
  index: number
): string {
  const prefix = extracted.topic?.substring(0, 4) || 'phys'
  const subtopic = extracted.subtopic?.substring(0, 3) || 'gen'
  const source = options.source?.substring(0, 3) || 'pdf'
  const num = String(index + 1).padStart(3, '0')
  return `${prefix}-${subtopic}-${source}-${num}`.toLowerCase()
}

function generateTitle(extracted: ExtractedQuestion): string {
  const text = extracted.questionText
  const firstSentence = text.split(/[.!?]/)[0]
  if (firstSentence.length <= 60) return firstSentence
  return firstSentence.substring(0, 57) + '...'
}

function extractTopicTags(extracted: ExtractedQuestion): string[] {
  const tags: string[] = []
  if (extracted.topic) {
    tags.push(extracted.topic.toLowerCase().replace(/\s+/g, '-'))
  }
  if (extracted.subtopic) {
    tags.push(extracted.subtopic.toLowerCase().replace(/\s+/g, '-'))
  }
  extracted.concepts?.forEach(c => {
    const tag = c.toLowerCase().replace(/\s+/g, '-')
    if (!tags.includes(tag)) tags.push(tag)
  })
  return tags.slice(0, 10)
}

function extractPatternTags(extracted: ExtractedQuestion): string[] {
  const patterns: string[] = []
  const text = extracted.questionText.toLowerCase()

  const patternMap: Record<string, string[]> = {
    'inclined-plane': ['incline', 'slope', 'wedge', 'ramp'],
    'projectile': ['projectile', 'thrown', 'launched', 'trajectory'],
    'circular-motion': ['circular', 'orbit', 'rotating', 'centripetal'],
    'collision': ['collision', 'collide', 'impact', 'momentum'],
    'oscillation': ['oscillat', 'harmonic', 'spring', 'pendulum'],
    'energy-conservation': ['energy', 'kinetic', 'potential', 'conservation'],
    'electrostatics': ['charge', 'electric field', 'coulomb', 'capacitor'],
    'magnetism': ['magnetic', 'magnet', 'solenoid', 'inductor'],
    'optics': ['light', 'lens', 'mirror', 'refract', 'reflect'],
    'thermodynamics': ['heat', 'temperature', 'entropy', 'thermal'],
    'waves': ['wave', 'frequency', 'wavelength', 'sound'],
    'fluid': ['fluid', 'pressure', 'buoyancy', 'viscosity']
  }

  for (const [pattern, keywords] of Object.entries(patternMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      patterns.push(pattern)
    }
  }

  return patterns.length > 0 ? patterns : ['general-physics']
}

function extractMetaSkills(extracted: ExtractedQuestion): string[] {
  const skills: string[] = []
  const text = extracted.questionText.toLowerCase()

  if (extracted.diagrams.some(d => d.type === 'diagram')) {
    skills.push('diagram-interpretation')
  }
  if (text.includes('free body') || text.includes('fbd')) {
    skills.push('fbd-drawing')
  }
  if (extracted.equations.length > 0) {
    skills.push('equation-manipulation')
  }
  if (extracted.parts && extracted.parts.length > 1) {
    skills.push('multi-step-problem')
  }

  return skills
}

function estimateTime(extracted: ExtractedQuestion): number {
  const baseTime = 180
  const partTime = (extracted.parts?.length || 1) * 120
  const difficultyMultiplier = (extracted.difficulty || 3) * 0.3 + 0.4
  const diagramBonus = extracted.diagrams.length * 30
  return Math.round((baseTime + partTime + diagramBonus) * difficultyMultiplier)
}

function extractKeywords(extracted: ExtractedQuestion): string[] {
  const keywords: string[] = []
  extracted.given.forEach(g => keywords.push(g.label.toLowerCase()))
  extracted.asked.forEach(a => keywords.push(a.label.toLowerCase()))
  extracted.concepts?.forEach(c => keywords.push(c.toLowerCase()))
  if (extracted.topic) keywords.push(extracted.topic.toLowerCase())
  if (extracted.subtopic) keywords.push(extracted.subtopic.toLowerCase())
  return Array.from(new Set(keywords))
}

function generateSteps(extracted: ExtractedQuestion): Array<Record<string, unknown>> {
  const steps: Array<Record<string, unknown>> = []

  if (extracted.parts && extracted.parts.length > 0) {
    extracted.parts.forEach((part, i) => {
      steps.push({
        stepId: `s${i + 1}`,
        type: 'SHORT_TEXT',
        prompt: part,
        difficulty: extracted.difficulty || 3,
        ui: { allowHint: true, allowReveal: true },
        validation: { requiredBeforeProceed: true, maxAttempts: 3 },
        explanations: { hint: '[Hint to be added]' }
      })
    })
  } else {
    steps.push({
      stepId: 's1-understand',
      type: 'INFO',
      prompt: 'Read the problem carefully and identify the given information.',
      difficulty: 1,
      ui: { allowHint: false, allowReveal: false }
    })
    steps.push({
      stepId: 's2-solve',
      type: 'SHORT_TEXT',
      prompt: extracted.asked.length > 0
        ? `Find: ${extracted.asked.map(a => a.label).join(', ')}`
        : 'Solve the problem',
      difficulty: extracted.difficulty || 3,
      ui: { allowHint: true, allowReveal: true },
      validation: { requiredBeforeProceed: true, maxAttempts: 3 },
      explanations: { hint: '[Hint to be added]' }
    })
  }

  return steps
}

// Main extraction function
async function extractQuestionsFromPDF(
  pdfPath: string,
  options: ProcessingOptions
): Promise<Array<Record<string, unknown>>> {
  const client = new Anthropic()

  const pdfBuffer = fs.readFileSync(pdfPath)
  const pdfBase64 = pdfBuffer.toString('base64')

  console.error(`Processing: ${pdfPath}`)

  // Use type assertion for document block (SDK types may lag API support)
  const documentBlock = {
    type: 'document',
    source: {
      type: 'base64',
      media_type: 'application/pdf',
      data: pdfBase64
    }
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          documentBlock as unknown as Anthropic.TextBlockParam,
          { type: 'text', text: EXTRACTION_PROMPT }
        ]
      }
    ]
  })

  const textContent = response.content.find(c => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  const jsonMatch = textContent.text.match(/```json\s*([\s\S]*?)\s*```/)
  if (!jsonMatch) {
    throw new Error('No JSON found in response')
  }

  const extractedQuestions: ExtractedQuestion[] = JSON.parse(jsonMatch[1])
  console.error(`Extracted ${extractedQuestions.length} questions`)

  return extractedQuestions.map((q, i) => toSchemaFormat(q, options, i))
}

// Validate against schema
async function validateQuestions(
  questions: Array<Record<string, unknown>>
): Promise<{ valid: boolean; errors: Array<{ questionId: unknown; errors: unknown }> }> {
  const schemaPath = path.join(__dirname, '../data/schemas/question.v1.fixed.schema.json')
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'))

  const ajv = new Ajv({ strict: false, allErrors: true })
  addFormats(ajv)

  const validate = ajv.compile(schema)
  const errors: Array<{ questionId: unknown; errors: unknown }> = []

  for (const q of questions) {
    const valid = validate(q)
    if (!valid) {
      errors.push({ questionId: q.questionId, errors: validate.errors })
    }
  }

  return { valid: errors.length === 0, errors }
}

// CLI
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
PDF to Question Bank Extractor

Usage:
  npx ts-node scripts/pdf-to-questions.ts <pdf-path> [options]

Options:
  --output, -o <path>   Output file path (default: stdout)
  --source <name>       Source identifier (e.g., "jee-2023", "hcv-ch5")
  --source-kind <type>  Source type: original|jee|neet|cbse|ncert|book|other
  --difficulty <1-5>    Default difficulty (default: 3)
  --no-validate         Skip schema validation
  --batch <dir>         Process all PDFs in directory

Examples:
  npx ts-node scripts/pdf-to-questions.ts problems.pdf -o questions.json
  npx ts-node scripts/pdf-to-questions.ts jee-2023.pdf --source jee-2023 --source-kind jee
  npx ts-node scripts/pdf-to-questions.ts --batch ./pdfs -o ./output
`)
    process.exit(0)
  }

  const options: ProcessingOptions = { validate: true, difficulty: 3 }
  let pdfPath = ''
  let batchDir = ''

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--output':
      case '-o':
        options.outputPath = args[++i]
        break
      case '--source':
        options.source = args[++i]
        break
      case '--source-kind':
        options.sourceKind = args[++i] as ProcessingOptions['sourceKind']
        break
      case '--difficulty':
        options.difficulty = parseInt(args[++i], 10)
        break
      case '--no-validate':
        options.validate = false
        break
      case '--batch':
        batchDir = args[++i]
        break
      default:
        if (!arg.startsWith('-')) pdfPath = arg
    }
  }

  try {
    let allQuestions: Array<Record<string, unknown>> = []

    if (batchDir) {
      const files = fs.readdirSync(batchDir).filter(f => f.endsWith('.pdf'))
      console.error(`Found ${files.length} PDF files`)

      for (const file of files) {
        const filePath = path.join(batchDir, file)
        const questions = await extractQuestionsFromPDF(filePath, {
          ...options,
          source: options.source || path.basename(file, '.pdf')
        })
        allQuestions.push(...questions)
      }
    } else if (pdfPath) {
      allQuestions = await extractQuestionsFromPDF(pdfPath, options)
    } else {
      console.error('Error: No PDF path provided')
      process.exit(1)
    }

    if (options.validate) {
      console.error('Validating against schema...')
      const { valid, errors } = await validateQuestions(allQuestions)
      if (!valid) {
        console.error('Validation errors:')
        console.error(JSON.stringify(errors, null, 2))
      } else {
        console.error('All questions validated successfully!')
      }
    }

    const output = JSON.stringify(allQuestions, null, 2)
    if (options.outputPath) {
      fs.writeFileSync(options.outputPath, output)
      console.error(`Wrote ${allQuestions.length} questions to ${options.outputPath}`)
    } else {
      console.log(output)
    }

  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

main()
