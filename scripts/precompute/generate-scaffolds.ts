#!/usr/bin/env npx tsx
/**
 * Scaffold Generation Script
 *
 * Batch generates precomputed scaffold outlines and step expansions
 * for approved questions in the question bank.
 *
 * Usage:
 *   npx tsx scripts/precompute/generate-scaffolds.ts [options]
 *
 * Options:
 *   --dry-run           Preview what would be generated without making API calls
 *   --regenerate        Regenerate even if precomputed content exists
 *   --batch=N           Batch size (default: 10)
 *   --concurrency=N     Max parallel API calls (default: 3)
 *   --rate=N            Max requests per minute (default: 50)
 *   --pattern=ID        Only process questions with this pattern
 *   --question=ID       Process specific question ID
 *   --skip-steps        Only generate outlines, skip step expansions
 */

import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'
import {
  CURRENT_VERSIONS,
  generateScaffoldId,
  estimateCost,
} from '../../lib/precompute/versioning'
import {
  OUTLINE_SYSTEM_PROMPT,
  buildOutlinePrompt,
  OUTLINE_MAX_TOKENS,
} from '../../lib/prompts/outline'
import {
  STEP_EXPANSION_SYSTEM_PROMPT,
  buildStepExpansionPrompt,
  STEP_EXPANSION_MAX_TOKENS,
} from '../../lib/prompts/step'
import type { OutlineScaffoldResponse, StepExpansionResponse, OutlineStep } from '../../types/phasedScaffold'

// =============================================================================
// Configuration
// =============================================================================

interface GenerateOptions {
  batchSize: number
  dryRun: boolean
  regenerate: boolean
  maxConcurrency: number
  rateLimitPerMin: number
  pattern?: string
  questionId?: string
  skipSteps: boolean
}

interface GenerationStats {
  processed: number
  outlines: { generated: number; skipped: number; failed: number }
  steps: { generated: number; skipped: number; failed: number }
  totalInputTokens: number
  totalOutputTokens: number
  totalCostUsd: number
  startTime: number
}

// =============================================================================
// Semaphore for concurrency control
// =============================================================================

class Semaphore {
  private permits: number
  private queue: (() => void)[] = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }
    return new Promise((resolve) => this.queue.push(resolve))
  }

  release(): void {
    const next = this.queue.shift()
    if (next) {
      next()
    } else {
      this.permits++
    }
  }
}

// =============================================================================
// Main Generator Class
// =============================================================================

class ScaffoldGenerator {
  private prisma: PrismaClient
  private anthropic: Anthropic
  private stats: GenerationStats
  private semaphore: Semaphore

  constructor(concurrency: number) {
    this.prisma = new PrismaClient()
    this.anthropic = new Anthropic()
    this.semaphore = new Semaphore(concurrency)
    this.stats = {
      processed: 0,
      outlines: { generated: 0, skipped: 0, failed: 0 },
      steps: { generated: 0, skipped: 0, failed: 0 },
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      startTime: Date.now(),
    }
  }

  async generate(options: GenerateOptions): Promise<void> {
    console.log('\n🚀 Starting scaffold generation...')
    console.log(`   Options: ${JSON.stringify(options, null, 2)}\n`)

    // Get questions to process
    const questions = await this.getQuestionsToProcess(options)
    console.log(`📚 Found ${questions.length} questions to process\n`)

    if (questions.length === 0) {
      console.log('No questions to process. Exiting.')
      return
    }

    // Process in batches
    const batches = this.splitIntoBatches(questions, options.batchSize)

    for (let i = 0; i < batches.length; i++) {
      console.log(`\n📦 Processing batch ${i + 1}/${batches.length} (${batches[i].length} questions)`)

      await Promise.all(
        batches[i].map(async (question) => {
          await this.semaphore.acquire()
          try {
            await this.processQuestion(question, options)
          } finally {
            this.semaphore.release()
          }
        })
      )

      // Rate limiting between batches
      if (i < batches.length - 1) {
        const delay = (60000 / options.rateLimitPerMin) * options.batchSize
        console.log(`   ⏳ Rate limiting: waiting ${Math.round(delay / 1000)}s...`)
        await this.sleep(delay)
      }
    }

    this.printStats()
    await this.prisma.$disconnect()
  }

  private async getQuestionsToProcess(options: GenerateOptions) {
    const where: Record<string, unknown> = {
      lifecycleState: 'approved',
    }

    if (options.questionId) {
      where.id = options.questionId
    }

    if (options.pattern) {
      where.primaryPatternId = options.pattern
    }

    // Only get questions without precomputed outlines unless regenerating
    if (!options.regenerate) {
      where.precomputedOutline = null
    }

    return this.prisma.question.findMany({
      where,
      select: {
        id: true,
        questionId: true,
        payload: true,
        difficulty: true,
        primaryPatternId: true,
        precomputedOutline: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 1000, // Safety limit
    })
  }

  private splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize))
    }
    return batches
  }

  private async processQuestion(
    question: {
      id: string
      questionId: string
      payload: unknown
      precomputedOutline: { id: string } | null
    },
    options: GenerateOptions
  ): Promise<void> {
    this.stats.processed++
    const payload = question.payload as { prompt?: { text?: string } }
    const problemText = payload?.prompt?.text

    if (!problemText) {
      console.log(`   ⚠️  Skipping ${question.questionId}: no problem text`)
      this.stats.outlines.skipped++
      return
    }

    // Skip if outline exists and not regenerating
    if (question.precomputedOutline && !options.regenerate) {
      console.log(`   ⏭️  Skipping ${question.questionId}: already has outline`)
      this.stats.outlines.skipped++
      return
    }

    if (options.dryRun) {
      console.log(`   🔍 [DRY RUN] Would generate outline for: ${question.questionId}`)
      return
    }

    try {
      // Generate outline
      const outline = await this.generateOutline(question.id, question.questionId, problemText)

      if (!outline) {
        this.stats.outlines.failed++
        return
      }

      console.log(`   ✅ Generated outline for ${question.questionId} (${outline.steps.length} steps)`)
      this.stats.outlines.generated++

      // Generate step expansions
      if (!options.skipSteps) {
        for (const step of outline.steps) {
          await this.generateStepExpansion(
            outline.savedOutlineId,
            question.id,
            problemText,
            outline.steps,
            step.step_id,
            options
          )
        }
      }
    } catch (error) {
      console.error(`   ❌ Failed for ${question.questionId}:`, error)
      this.stats.outlines.failed++
    }
  }

  private async generateOutline(
    questionId: string,
    questionIdStr: string,
    problemText: string
  ): Promise<{ steps: OutlineStep[]; savedOutlineId: string } | null> {
    const version = CURRENT_VERSIONS.scaffold_outline
    const startTime = Date.now()

    try {
      const message = await this.anthropic.messages.create({
        model: version.modelVersion,
        max_tokens: OUTLINE_MAX_TOKENS,
        system: OUTLINE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildOutlinePrompt(problemText, 3) }],
      })

      const latencyMs = Date.now() - startTime
      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

      // Parse JSON
      const jsonMatch = responseText.match(/\{[\s\S]+\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const outlineData = JSON.parse(this.cleanJsonString(jsonMatch[0])) as OutlineScaffoldResponse

      // Generate scaffold ID
      const scaffoldId = generateScaffoldId(problemText)

      // Calculate cost
      const inputTokens = message.usage?.input_tokens || 0
      const outputTokens = message.usage?.output_tokens || 0
      const costUsd = estimateCost(inputTokens, outputTokens, version.modelVersion)

      // Update stats
      this.stats.totalInputTokens += inputTokens
      this.stats.totalOutputTokens += outputTokens
      this.stats.totalCostUsd += costUsd

      // Save to database
      const saved = await this.prisma.precomputedScaffoldOutline.upsert({
        where: { questionId },
        create: {
          questionId,
          scaffoldId,
          promptVersion: version.promptVersion,
          modelVersion: version.modelVersion,
          domain: outlineData.tags?.domain || 'mechanics',
          subdomain: outlineData.tags?.subdomain || 'general',
          stepCount: outlineData.steps?.length || 0,
          outlineData: outlineData as unknown as Record<string, unknown>,
          inputTokens,
          outputTokens,
          latencyMs,
          costUsd,
        },
        update: {
          scaffoldId,
          promptVersion: version.promptVersion,
          modelVersion: version.modelVersion,
          domain: outlineData.tags?.domain || 'mechanics',
          subdomain: outlineData.tags?.subdomain || 'general',
          stepCount: outlineData.steps?.length || 0,
          outlineData: outlineData as unknown as Record<string, unknown>,
          inputTokens,
          outputTokens,
          latencyMs,
          costUsd,
          updatedAt: new Date(),
        },
      })

      return {
        steps: outlineData.steps || [],
        savedOutlineId: saved.id,
      }
    } catch (error) {
      console.error(`      Error generating outline:`, error)
      return null
    }
  }

  private async generateStepExpansion(
    outlineId: string,
    questionId: string,
    problemText: string,
    outlineSteps: OutlineStep[],
    stepId: string,
    options: GenerateOptions
  ): Promise<void> {
    if (options.dryRun) {
      console.log(`      🔍 [DRY RUN] Would generate step expansion for: ${stepId}`)
      return
    }

    const version = CURRENT_VERSIONS.scaffold_step
    const startTime = Date.now()

    try {
      const message = await this.anthropic.messages.create({
        model: version.modelVersion,
        max_tokens: STEP_EXPANSION_MAX_TOKENS,
        system: STEP_EXPANSION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildStepExpansionPrompt(problemText, outlineSteps, stepId) }],
      })

      const latencyMs = Date.now() - startTime
      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

      // Parse JSON
      const jsonMatch = responseText.match(/\{[\s\S]+\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const expansionData = JSON.parse(this.cleanJsonString(jsonMatch[0])) as StepExpansionResponse

      // Calculate cost
      const inputTokens = message.usage?.input_tokens || 0
      const outputTokens = message.usage?.output_tokens || 0
      const costUsd = estimateCost(inputTokens, outputTokens, version.modelVersion)

      // Update stats
      this.stats.totalInputTokens += inputTokens
      this.stats.totalOutputTokens += outputTokens
      this.stats.totalCostUsd += costUsd

      // Save to database
      await this.prisma.precomputedStepExpansion.upsert({
        where: {
          outlineId_stepId_promptVersion: {
            outlineId,
            stepId,
            promptVersion: version.promptVersion,
          },
        },
        create: {
          outlineId,
          stepId,
          promptVersion: version.promptVersion,
          modelVersion: version.modelVersion,
          expansionData: expansionData as unknown as Record<string, unknown>,
          microTaskCount: expansionData.micro_tasks?.length || 0,
          hasFbd: !!expansionData.fbd_data,
          inputTokens,
          outputTokens,
          latencyMs,
          costUsd,
        },
        update: {
          modelVersion: version.modelVersion,
          expansionData: expansionData as unknown as Record<string, unknown>,
          microTaskCount: expansionData.micro_tasks?.length || 0,
          hasFbd: !!expansionData.fbd_data,
          inputTokens,
          outputTokens,
          latencyMs,
          costUsd,
        },
      })

      console.log(`      ✅ Generated step expansion for: ${stepId}`)
      this.stats.steps.generated++
    } catch (error) {
      console.error(`      ❌ Failed step expansion for ${stepId}:`, error)
      this.stats.steps.failed++
    }
  }

  private cleanJsonString(jsonStr: string): string {
    return jsonStr
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .replace(/,(\s*[}\]])/g, '$1')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private printStats(): void {
    const duration = (Date.now() - this.stats.startTime) / 1000
    console.log('\n' + '='.repeat(60))
    console.log('📊 GENERATION COMPLETE')
    console.log('='.repeat(60))
    console.log(`   Duration: ${Math.round(duration)}s`)
    console.log(`   Questions processed: ${this.stats.processed}`)
    console.log(`   Outlines: ${this.stats.outlines.generated} generated, ${this.stats.outlines.skipped} skipped, ${this.stats.outlines.failed} failed`)
    console.log(`   Steps: ${this.stats.steps.generated} generated, ${this.stats.steps.skipped} skipped, ${this.stats.steps.failed} failed`)
    console.log(`   Total tokens: ${this.stats.totalInputTokens} input, ${this.stats.totalOutputTokens} output`)
    console.log(`   Estimated cost: $${this.stats.totalCostUsd.toFixed(4)}`)
    console.log('='.repeat(60) + '\n')
  }
}

// =============================================================================
// CLI Entry Point
// =============================================================================

function parseArgs(): GenerateOptions {
  const args = process.argv.slice(2)

  const getArg = (prefix: string): string | undefined => {
    const arg = args.find((a) => a.startsWith(prefix))
    return arg ? arg.split('=')[1] : undefined
  }

  return {
    batchSize: parseInt(getArg('--batch=') || '10', 10),
    dryRun: args.includes('--dry-run'),
    regenerate: args.includes('--regenerate'),
    maxConcurrency: parseInt(getArg('--concurrency=') || '3', 10),
    rateLimitPerMin: parseInt(getArg('--rate=') || '50', 10),
    pattern: getArg('--pattern='),
    questionId: getArg('--question='),
    skipSteps: args.includes('--skip-steps'),
  }
}

async function main() {
  const options = parseArgs()

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required')
    process.exit(1)
  }

  const generator = new ScaffoldGenerator(options.maxConcurrency)
  await generator.generate(options)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
