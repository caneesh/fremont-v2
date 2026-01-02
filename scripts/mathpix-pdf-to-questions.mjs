#!/usr/bin/env node
/**
 * MathPix PDF → Question JSON extractor
 *
 * Pipeline:
 *  1) Upload PDFs to MathPix `/v3/pdf` and download MathPix Markdown (MMD)
 *  2) (Optional) Use Anthropic to structure questions from the MMD
 *  3) Emit JSON objects conforming to `data/schemas/question.v1.fixed.schema.json`
 *
 * Notes:
 *  - This script does NOT rewrite/paraphrase content to “avoid copyright”.
 *    Only run it on PDFs you have the rights/license to process and publish.
 *
 * Env:
 *  - MATHPIX_APP_ID, MATHPIX_APP_KEY
 *  - ANTHROPIC_API_KEY (only if --structure claude)
 */

import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import process from 'node:process'

import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import Anthropic from '@anthropic-ai/sdk'

const DEFAULT_SCHEMA_PATH = path.resolve('data/schemas/question.v1.fixed.schema.json')
const DEFAULT_CACHE_DIR = path.resolve('.cache/mathpix')
const DEFAULT_OUTPUT_DIR = path.resolve('output/mathpix-questions')

function printHelp() {
  // Keep help short; users can read the script for details.
  console.log(`
MathPix PDF → Question JSON extractor

Usage:
  node scripts/mathpix-pdf-to-questions.mjs --pdf <file.pdf> [options]
  node scripts/mathpix-pdf-to-questions.mjs --batch <dir> [options]

Required (MathPix):
  MATHPIX_APP_ID + MATHPIX_APP_KEY (env vars) OR --mathpix-app-id/--mathpix-app-key

Options:
  --pdf <path>                 Process a single PDF
  --batch <dir>                Process all PDFs in a directory (non-recursive)
  --recursive                  Recurse into subdirectories when using --batch
  --output-dir <dir>           Write per-PDF outputs (default: ${DEFAULT_OUTPUT_DIR})
  --no-output-dir              Disable per-PDF outputs (useful with --output-file)
  --output-file, -o <file>     Write a single merged JSON array file
  --structure <none|claude>    Convert MMD → structured questions (default: none)
  --anthropic-model <model>    (default: claude-sonnet-4-20250514)
  --source-kind <kind>         original|jee|neet|cbse|ncert|book|other (default: other)
  --source <ref>               Source reference string (default: PDF filename)
  --difficulty <1-5>           Default difficulty (default: 3)
  --validate / --no-validate   Validate output against schema (default: validate)
  --schema <path>              Schema path (default: ${DEFAULT_SCHEMA_PATH})
  --cache-dir <dir>            Cache dir for MathPix IDs/MMD (default: ${DEFAULT_CACHE_DIR})
  --save-mmd                    Also write the downloaded MMD alongside outputs
  --pretty                      Pretty-print JSON (bigger files)
  --continue-on-error           Keep going after per-PDF failures (default: true)

Examples:
  MATHPIX_APP_ID=... MATHPIX_APP_KEY=... \\
    node scripts/mathpix-pdf-to-questions.mjs --pdf ./pdfs/set1.pdf --output-dir ./out

  MATHPIX_APP_ID=... MATHPIX_APP_KEY=... ANTHROPIC_API_KEY=... \\
    node scripts/mathpix-pdf-to-questions.mjs --batch ./pdfs --structure claude --output-dir ./out
`.trim())
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function parseArgs(argv) {
  const args = {
    pdf: null,
    batch: null,
    recursive: false,
    outputDir: DEFAULT_OUTPUT_DIR,
    noOutputDir: false,
    outputFile: null,
    structure: 'none',
    anthropicModel: 'claude-sonnet-4-20250514',
    sourceKind: 'other',
    source: null,
    difficulty: 3,
    validate: true,
    schemaPath: DEFAULT_SCHEMA_PATH,
    cacheDir: DEFAULT_CACHE_DIR,
    saveMmd: false,
    pretty: false,
    continueOnError: true,
    mathpixAppId: null,
    mathpixAppKey: null
  }

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    switch (a) {
      case '--help':
      case '-h':
        args.help = true
        break
      case '--pdf':
        args.pdf = argv[++i]
        break
      case '--batch':
        args.batch = argv[++i]
        break
      case '--recursive':
        args.recursive = true
        break
      case '--output-dir':
        args.outputDir = argv[++i]
        break
      case '--no-output-dir':
        args.noOutputDir = true
        break
      case '--output-file':
      case '-o':
        args.outputFile = argv[++i]
        break
      case '--structure':
        args.structure = argv[++i]
        break
      case '--anthropic-model':
        args.anthropicModel = argv[++i]
        break
      case '--source-kind':
        args.sourceKind = argv[++i]
        break
      case '--source':
        args.source = argv[++i]
        break
      case '--difficulty':
        args.difficulty = Number.parseInt(argv[++i], 10)
        break
      case '--schema':
        args.schemaPath = argv[++i]
        break
      case '--cache-dir':
        args.cacheDir = argv[++i]
        break
      case '--save-mmd':
        args.saveMmd = true
        break
      case '--pretty':
        args.pretty = true
        break
      case '--validate':
        args.validate = true
        break
      case '--no-validate':
        args.validate = false
        break
      case '--continue-on-error':
        args.continueOnError = true
        break
      case '--fail-fast':
        args.continueOnError = false
        break
      case '--mathpix-app-id':
        args.mathpixAppId = argv[++i]
        break
      case '--mathpix-app-key':
        args.mathpixAppKey = argv[++i]
        break
      default:
        if (a.startsWith('-')) {
          throw new Error(`Unknown flag: ${a}`)
        }
        if (!args.pdf && !args.batch) {
          // Allow a single positional input for convenience.
          args.pdf = a
        } else {
          throw new Error(`Unexpected argument: ${a}`)
        }
    }
  }

  return args
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true })
}

function isPdfFileName(name) {
  return name.toLowerCase().endsWith('.pdf')
}

function listPdfFiles(dirPath, recursive) {
  const out = []
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (recursive) out.push(...listPdfFiles(full, true))
      continue
    }
    if (entry.isFile() && isPdfFileName(entry.name)) out.push(full)
  }
  out.sort((a, b) => a.localeCompare(b))
  return out
}

function makeCacheKey(pdfPath) {
  const stat = fs.statSync(pdfPath)
  return crypto
    .createHash('sha256')
    .update(path.resolve(pdfPath))
    .update('|')
    .update(String(stat.size))
    .update('|')
    .update(String(stat.mtimeMs))
    .digest('hex')
}

function getMathpixCreds(args) {
  const appId = args.mathpixAppId || process.env.MATHPIX_APP_ID
  const appKey = args.mathpixAppKey || process.env.MATHPIX_APP_KEY
  if (!appId || !appKey) {
    throw new Error(
      'Missing MathPix credentials. Set MATHPIX_APP_ID and MATHPIX_APP_KEY, or pass --mathpix-app-id/--mathpix-app-key.'
    )
  }
  return { appId, appKey }
}

async function mathpixUploadPdf(pdfPath, creds) {
  const pdfBuffer = fs.readFileSync(pdfPath)

  const form = new FormData()
  form.set(
    'options_json',
    JSON.stringify({
      conversion_formats: { mmd: true },
      rm_spaces: true
    })
  )
  form.set('file', new Blob([pdfBuffer], { type: 'application/pdf' }), path.basename(pdfPath))

  const res = await fetch('https://api.mathpix.com/v3/pdf', {
    method: 'POST',
    headers: {
      app_id: creds.appId,
      app_key: creds.appKey
    },
    body: form
  })

  const json = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(
      `MathPix upload failed (${res.status}): ${json ? JSON.stringify(json) : await res.text()}`
    )
  }
  if (!json?.pdf_id) {
    throw new Error(`MathPix upload response missing pdf_id: ${JSON.stringify(json)}`)
  }
  return json
}

async function mathpixPollPdf(pdfId, creds, opts) {
  const startedAt = Date.now()
  let waitMs = 1500

  while (true) {
    const res = await fetch(`https://api.mathpix.com/v3/pdf/${pdfId}`, {
      headers: { app_id: creds.appId, app_key: creds.appKey }
    })
    const json = await res.json().catch(() => null)
    if (!res.ok) {
      throw new Error(`MathPix status failed (${res.status}): ${json ? JSON.stringify(json) : await res.text()}`)
    }

    const status = String(json?.status || json?.pdf_status || '').toLowerCase()
    if (status.includes('complete')) return json
    if (status.includes('error') || status.includes('fail')) {
      throw new Error(`MathPix processing failed: ${JSON.stringify(json)}`)
    }

    const elapsedMs = Date.now() - startedAt
    if (elapsedMs > opts.maxWaitMs) {
      throw new Error(`MathPix processing timed out after ${Math.round(elapsedMs / 1000)}s for pdf_id=${pdfId}`)
    }

    await sleep(waitMs)
    waitMs = Math.min(Math.round(waitMs * 1.25), 15000)
  }
}

async function mathpixDownloadMmd(pdfId, creds, statusJson) {
  if (typeof statusJson?.mmd === 'string' && statusJson.mmd.trim()) return statusJson.mmd

  const mmdUrl = statusJson?.mmd_url || statusJson?.urls?.mmd
  if (typeof mmdUrl === 'string' && mmdUrl.startsWith('http')) {
    // Pre-signed URLs usually don't need auth, but include it harmlessly if required.
    const res = await fetch(mmdUrl, {
      headers: { app_id: creds.appId, app_key: creds.appKey }
    })
    if (!res.ok) throw new Error(`Failed to download mmd_url (${res.status})`)
    return await res.text()
  }

  // Fallback: some MathPix deployments support `{pdf_id}.mmd` directly.
  const fallback = `https://api.mathpix.com/v3/pdf/${pdfId}.mmd`
  const res = await fetch(fallback, { headers: { app_id: creds.appId, app_key: creds.appKey } })
  if (!res.ok) {
    throw new Error(
      `MathPix did not provide mmd_url and ${fallback} failed (${res.status}). Raw status: ${JSON.stringify(statusJson)}`
    )
  }
  return await res.text()
}

async function getMmdForPdf(pdfPath, args, creds) {
  ensureDir(args.cacheDir)
  const key = makeCacheKey(pdfPath)
  const metaPath = path.join(args.cacheDir, `${key}.json`)
  const mmdPath = path.join(args.cacheDir, `${key}.mmd`)

  if (fs.existsSync(mmdPath)) {
    const mmd = fs.readFileSync(mmdPath, 'utf-8')
    if (mmd.trim()) return { key, mmd, metaPath, mmdPath, fromCache: true }
  }

  let meta = null
  if (fs.existsSync(metaPath)) {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
  }

  let uploadJson = meta?.upload
  if (!uploadJson?.pdf_id) {
    uploadJson = await mathpixUploadPdf(pdfPath, creds)
    meta = {
      pdfPath: path.resolve(pdfPath),
      key,
      createdAt: new Date().toISOString(),
      upload: uploadJson
    }
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
  }

  const pdfId = uploadJson.pdf_id
  const statusJson = await mathpixPollPdf(pdfId, creds, { maxWaitMs: 20 * 60 * 1000 })
  meta = { ...(meta || {}), lastStatusAt: new Date().toISOString(), status: statusJson }
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))

  const mmd = await mathpixDownloadMmd(pdfId, creds, statusJson)
  fs.writeFileSync(mmdPath, mmd)
  return { key, mmd, metaPath, mmdPath, fromCache: false }
}

const CLAUDE_SYSTEM = `You are an expert physics education content analyzer.
Extract physics questions from OCR'd MathPix Markdown. Preserve all math as LaTeX.`

function buildClaudePrompt(sourceHint) {
  return `You will be given MathPix Markdown (MMD) extracted from a PDF.
Extract ALL distinct physics questions and return JSON in the exact format:

\`\`\`json
{
  "questions": [
    {
      "questionText": "…",
      "context": "…",
      "given": [{"label":"…","value":"…","unit":"…"}],
      "asked": [{"label":"…","expectedForm":"numeric|expression|explanation"}],
      "diagrams": [{"description":"…","type":"diagram|graph|figure|table","annotations":["…"]}],
      "equations": ["…"],
      "parts": ["(a)…","(b)…"],
      "difficulty": 1,
      "topic": "mechanics|…",
      "subtopic": "…",
      "concepts": ["…"]
    }
  ]
}
\`\`\`

Rules:
- Do not invent questions that are not present.
- Use empty arrays when a field is not present.
- Preserve symbols/units; keep LaTeX in questionText.
${sourceHint ? `- Source hint: ${sourceHint}` : ''}

MMD:
`.trim()
}

async function extractQuestionsFromMmdWithClaude(mmd, args, sourceHint) {
  const client = new Anthropic()
  const response = await client.messages.create({
    model: args.anthropicModel,
    max_tokens: 8192,
    system: CLAUDE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: buildClaudePrompt(sourceHint) + '\n\n' + mmd }
        ]
      }
    ]
  })

  const textContent = response.content.find(c => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Anthropic')
  }

  const jsonMatch = textContent.text.match(/```json\\s*([\\s\\S]*?)\\s*```/)
  const raw = jsonMatch ? jsonMatch[1] : textContent.text

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    throw new Error(`Failed to parse JSON from Anthropic. Raw output starts with: ${raw.slice(0, 200)}`)
  }
  if (!Array.isArray(parsed?.questions)) {
    throw new Error(`Anthropic response missing questions[]: ${JSON.stringify(parsed).slice(0, 500)}`)
  }
  return parsed.questions
}

function slugifyTag(s) {
  return String(s).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/g, '')
}

function generateQuestionId(extracted, opts, index) {
  const prefix = slugifyTag(extracted.topic || 'phys').slice(0, 4) || 'phys'
  const subtopic = slugifyTag(extracted.subtopic || 'gen').slice(0, 3) || 'gen'
  const source = slugifyTag(opts.source || 'pdf').slice(0, 6) || 'pdf'
  return `${prefix}-${subtopic}-${source}-${String(index + 1).padStart(3, '0')}`
}

function generateTitle(questionText) {
  const firstSentence = String(questionText || '').split(/[.!?]/)[0] || 'Physics question'
  const trimmed = firstSentence.trim()
  return trimmed.length <= 60 ? trimmed : `${trimmed.slice(0, 57)}...`
}

function toSchemaFormat(extracted, opts, index) {
  const now = new Date().toISOString()
  const questionId = generateQuestionId(extracted, opts, index)

  const topicTags = [
    extracted.topic,
    extracted.subtopic,
    ...(Array.isArray(extracted.concepts) ? extracted.concepts : [])
  ]
    .filter(Boolean)
    .map(slugifyTag)
    .filter(Boolean)

  return {
    schemaVersion: 'question.v1',
    questionId,
    metadata: {
      title: generateTitle(extracted.questionText),
      difficulty: extracted.difficulty || opts.difficulty || 3,
      estimatedTimeSec: 300,
      language: 'en',
      source: {
        kind: opts.sourceKind || 'other',
        reference: opts.source || 'PDF Import',
        year: new Date().getFullYear()
      },
      version: 1,
      createdAt: now,
      updatedAt: now
    },
    classification: {
      topicTags: [...new Set(topicTags)].slice(0, 10),
      patternTags: ['general-physics'],
      metaSkillTags: [],
      trapTags: [],
      learningObjectives: []
    },
    prompt: {
      text: extracted.questionText,
      context: extracted.context || undefined,
      diagram:
        Array.isArray(extracted.diagrams) && extracted.diagrams.length > 0
          ? { type: 'static', assetId: `${questionId}-diagram-001`, annotations: extracted.diagrams[0]?.annotations || [] }
          : { type: 'none' },
      given: Array.isArray(extracted.given) ? extracted.given : [],
      asked: Array.isArray(extracted.asked) ? extracted.asked : []
    },
    assets: Array.isArray(extracted.diagrams)
      ? extracted.diagrams.map((d, i) => ({
          assetId: `${questionId}-diagram-${String(i + 1).padStart(3, '0')}`,
          kind: 'image',
          alt: d.description || 'diagram'
        }))
      : [],
    steps: [
      { stepId: 's1', type: 'INFO', prompt: 'Read the problem carefully.', difficulty: 1, ui: { allowHint: false, allowReveal: false } },
      {
        stepId: 's2',
        type: 'SHORT_TEXT',
        prompt:
          Array.isArray(extracted.asked) && extracted.asked.length > 0
            ? `Find: ${extracted.asked.map(a => a.label).filter(Boolean).join(', ')}`
            : 'Solve the problem.',
        difficulty: extracted.difficulty || opts.difficulty || 3,
        ui: { allowHint: true, allowReveal: true },
        validation: { requiredBeforeProceed: true, maxAttempts: 3 },
        explanations: { hint: '[Hint to be added]' }
      }
    ],
    solutions: {
      finalAnswer: { type: 'TEXT', value: '[To be filled after solving]' },
      synthesis: [],
      limitingCases: [],
      alternativePaths: []
    },
    authoring: {
      reviewStatus: 'draft',
      notes: `Extracted from PDF${opts.source ? ` (${opts.source})` : ''}.`
    },
    questionBank: {
      isOriginal: false,
      searchKeywords: [],
      conceptIds: topicTags
    }
  }
}

function fallbackSingleQuestionFromMmd(mmd, opts) {
  return toSchemaFormat(
    {
      questionText: mmd,
      context: undefined,
      given: [],
      asked: [],
      diagrams: [],
      equations: [],
      parts: [],
      difficulty: opts.difficulty || 3,
      topic: 'physics',
      subtopic: 'import',
      concepts: []
    },
    opts,
    0
  )
}

function validateAgainstSchema(schemaPath, questions) {
  const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf-8'))
  const ajv = new Ajv({ strict: false, allErrors: true })
  addFormats(ajv)
  const validate = ajv.compile(schema)

  const errors = []
  for (const q of questions) {
    const ok = validate(q)
    if (!ok) errors.push({ questionId: q.questionId, errors: validate.errors })
  }
  return { valid: errors.length === 0, errors }
}

function safeBasename(pdfPath) {
  const base = path.basename(pdfPath, path.extname(pdfPath))
  return base.replace(/[^a-zA-Z0-9._-]+/g, '_')
}

async function processOnePdf(pdfPath, args, creds) {
  const sourceRef = args.source || path.basename(pdfPath, path.extname(pdfPath))
  const mmdResult = await getMmdForPdf(pdfPath, args, creds)

  const schemaQuestions = []
  if (args.structure === 'claude') {
    const extracted = await extractQuestionsFromMmdWithClaude(mmdResult.mmd, args, sourceRef)
    extracted.forEach((q, i) => {
      schemaQuestions.push(
        toSchemaFormat(q, { source: sourceRef, sourceKind: args.sourceKind, difficulty: args.difficulty }, i)
      )
    })
  } else {
    schemaQuestions.push(
      fallbackSingleQuestionFromMmd(mmdResult.mmd, {
        source: sourceRef,
        sourceKind: args.sourceKind,
        difficulty: args.difficulty
      })
    )
  }

  return { sourceRef, mmdResult, schemaQuestions }
}

async function main() {
  let args
  try {
    args = parseArgs(process.argv.slice(2))
  } catch (e) {
    console.error(String(e?.message || e))
    printHelp()
    process.exit(2)
  }

  if (args.help || (!args.pdf && !args.batch)) {
    printHelp()
    process.exit(args.help ? 0 : 2)
  }

  if (args.structure !== 'none' && args.structure !== 'claude') {
    console.error(`Invalid --structure: ${args.structure} (expected none|claude)`)
    process.exit(2)
  }

  const creds = getMathpixCreds(args)

  const pdfs = args.batch
    ? listPdfFiles(args.batch, args.recursive)
    : [args.pdf]

  if (pdfs.length === 0) {
    console.error('No PDFs found.')
    process.exit(1)
  }

  const writePerPdf = !args.noOutputDir
  if (!writePerPdf && !args.outputFile) {
    console.error('Nothing to write: pass --output-file or remove --no-output-dir.')
    process.exit(2)
  }

  if (writePerPdf) ensureDir(args.outputDir)
  ensureDir(args.cacheDir)

  const errors = []
  let totalQuestions = 0

  let mergedStream = null
  let mergedFirst = true
  if (args.outputFile) {
    ensureDir(path.dirname(path.resolve(args.outputFile)))
    mergedStream = fs.createWriteStream(args.outputFile, { encoding: 'utf-8' })
    mergedStream.write('[\n')
  }

  for (const pdfPath of pdfs) {
    const label = path.relative(process.cwd(), pdfPath)
    try {
      console.error(`Processing: ${label}`)
      const result = await processOnePdf(pdfPath, args, creds)

      if (mergedStream) {
        for (const q of result.schemaQuestions) {
          if (!mergedFirst) mergedStream.write(',\n')
          mergedStream.write(JSON.stringify(q, null, args.pretty ? 2 : 0))
          mergedFirst = false
        }
      }

      let outJsonPath = null
      if (writePerPdf) {
        const outBase = safeBasename(pdfPath)
        outJsonPath = path.join(args.outputDir, `${outBase}.questions.json`)
        fs.writeFileSync(outJsonPath, JSON.stringify(result.schemaQuestions, null, args.pretty ? 2 : 0))

        if (args.saveMmd) {
          const outMmdPath = path.join(args.outputDir, `${outBase}.mmd`)
          fs.writeFileSync(outMmdPath, result.mmdResult.mmd)
        }
      }

      if (args.validate) {
        const { valid, errors: vErrors } = validateAgainstSchema(args.schemaPath, result.schemaQuestions)
        if (!valid) {
          const outErrPath = writePerPdf
            ? path.join(args.outputDir, `${safeBasename(pdfPath)}.validation-errors.json`)
            : null
          if (outErrPath) {
            fs.writeFileSync(outErrPath, JSON.stringify(vErrors, null, 2))
            console.error(`Schema validation failed (${vErrors.length} issues). See: ${outErrPath}`)
          } else {
            console.error(`Schema validation failed (${vErrors.length} issues).`)
          }
        }
      }

      totalQuestions += result.schemaQuestions.length
      if (outJsonPath) {
        console.error(`Wrote: ${path.relative(process.cwd(), outJsonPath)} (${result.schemaQuestions.length} questions)`)
      } else {
        console.error(`Extracted ${result.schemaQuestions.length} questions`)
      }
    } catch (e) {
      const msg = String(e?.stack || e?.message || e)
      console.error(`Failed: ${label}\n${msg}`)
      errors.push({ pdfPath, error: msg })
      if (!args.continueOnError) break
    }
  }

  if (errors.length > 0) {
    const errPath = writePerPdf ? path.join(args.outputDir, `errors.json`) : null
    if (errPath) {
      fs.writeFileSync(errPath, JSON.stringify(errors, null, 2))
      console.error(`Finished with errors (${errors.length}). Details: ${errPath}`)
    } else {
      console.error(`Finished with errors (${errors.length}).`)
    }
    if (mergedStream) {
      try {
        mergedStream.write('\n]\n')
        mergedStream.end()
      } catch {}
    }
    process.exit(1)
  }

  if (mergedStream) {
    mergedStream.write('\n]\n')
    mergedStream.end()
    console.error(`Wrote merged file: ${path.relative(process.cwd(), args.outputFile)}`)
  }

  console.error(`Done. Total questions written: ${totalQuestions}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
