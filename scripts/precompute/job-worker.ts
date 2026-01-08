#!/usr/bin/env npx tsx
/**
 * Precompute Job Worker
 *
 * Background worker that processes pending precompute jobs from the queue.
 * Can be run as a cron job or as a long-running process.
 *
 * Usage:
 *   npx tsx scripts/precompute/job-worker.ts [options]
 *
 * Options:
 *   --once              Process jobs once and exit (for cron)
 *   --poll=N            Poll interval in seconds (default: 30)
 *   --batch=N           Jobs to process per batch (default: 5)
 *   --concurrency=N     Max parallel jobs (default: 2)
 *   --type=TYPE         Only process specific job type
 *   --dry-run           Preview what would be processed without execution
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
import {
  detectSimulationType,
  extractParameters,
} from '../../lib/simulationService'
import type { OutlineScaffoldResponse, StepExpansionResponse, OutlineStep } from '../../types/phasedScaffold'

// =============================================================================
// Configuration
// =============================================================================

type JobType = 'scaffold_outline' | 'scaffold_step' | 'concept_contrast' | 'variation' | 'simulation_params'
type JobStatus = 'pending' | 'running' | 'completed' | 'failed'

interface WorkerOptions {
  runOnce: boolean
  pollIntervalSec: number
  batchSize: number
  maxConcurrency: number
  jobType?: JobType
  dryRun: boolean
}

interface WorkerStats {
  processed: number
  completed: number
  failed: number
  totalTokens: number
  totalCostUsd: number
  startTime: number
}

interface Job {
  id: string
  jobType: string
  questionId: string
  contentKey: string | null
  status: string
  priority: number
  attempts: number
  maxAttempts: number
  lastError: string | null
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
// Job Worker Class
// =============================================================================

class PrecomputeJobWorker {
  private prisma: PrismaClient
  private anthropic: Anthropic
  private stats: WorkerStats
  private semaphore: Semaphore
  private isRunning: boolean = false

  constructor(concurrency: number) {
    this.prisma = new PrismaClient()
    this.anthropic = new Anthropic()
    this.semaphore = new Semaphore(concurrency)
    this.stats = {
      processed: 0,
      completed: 0,
      failed: 0,
      totalTokens: 0,
      totalCostUsd: 0,
      startTime: Date.now(),
    }
  }

  /**
   * Check if precompute tables exist in the database
   */
  private async checkTablesExist(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1 FROM precompute_jobs LIMIT 1`
      return true
    } catch (error) {
      if (error instanceof Error && error.message.includes('does not exist')) {
        return false
      }
      // Re-throw other errors
      throw error
    }
  }

  async run(options: WorkerOptions): Promise<void> {
    console.log('\n🔧 Starting Precompute Job Worker...')
    console.log(`   Options: ${JSON.stringify(options, null, 2)}\n`)

    // Check if required tables exist
    const tablesExist = await this.checkTablesExist()
    if (!tablesExist) {
      if (options.dryRun) {
        console.log('⚠️  Precompute tables do not exist yet.')
        console.log('   Run `npx prisma migrate dev` to create the tables.')
        console.log('\n📋 DRY RUN: Would process jobs from precompute_jobs table.')
        console.log('   No jobs to process (table does not exist).\n')
        return
      } else {
        throw new Error('Precompute tables do not exist. Run `npx prisma migrate dev` first.')
      }
    }

    this.isRunning = true

    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown())
    process.on('SIGTERM', () => this.shutdown())

    if (options.runOnce) {
      await this.processBatch(options)
    } else {
      // Long-running mode
      while (this.isRunning) {
        await this.processBatch(options)

        if (this.isRunning) {
          console.log(`\n⏳ Waiting ${options.pollIntervalSec}s before next poll...`)
          await this.sleep(options.pollIntervalSec * 1000)
        }
      }
    }

    this.printStats()
    await this.prisma.$disconnect()
  }

  private async processBatch(options: WorkerOptions): Promise<void> {
    // Fetch pending jobs
    const jobs = await this.fetchPendingJobs(options)

    if (jobs.length === 0) {
      console.log('📭 No pending jobs found.')
      return
    }

    console.log(`\n📦 Processing ${jobs.length} jobs...`)

    // Process jobs with concurrency control
    await Promise.all(
      jobs.map(async (job) => {
        await this.semaphore.acquire()
        try {
          await this.processJob(job, options)
        } finally {
          this.semaphore.release()
        }
      })
    )
  }

  private async fetchPendingJobs(options: WorkerOptions): Promise<Job[]> {
    const where: Record<string, unknown> = {
      status: 'pending',
    }

    if (options.jobType) {
      where.jobType = options.jobType
    }

    // Also retry failed jobs that haven't exceeded max attempts
    const jobs = await this.prisma.precomputeJob.findMany({
      where: {
        OR: [
          where,
          {
            status: 'failed',
            attempts: { lt: this.prisma.precomputeJob.fields.maxAttempts },
            ...(options.jobType ? { jobType: options.jobType } : {}),
          },
        ],
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
      take: options.batchSize,
    })

    return jobs
  }

  private async processJob(job: Job, options: WorkerOptions): Promise<void> {
    this.stats.processed++

    if (options.dryRun) {
      console.log(`   🔍 [DRY RUN] Would process: ${job.jobType} for question ${job.questionId}`)
      return
    }

    // Mark job as running
    await this.prisma.precomputeJob.update({
      where: { id: job.id },
      data: {
        status: 'running',
        startedAt: new Date(),
        attempts: { increment: 1 },
      },
    })

    try {
      // Get question data
      const question = await this.prisma.question.findUnique({
        where: { id: job.questionId },
        select: {
          id: true,
          questionId: true,
          payload: true,
          difficulty: true,
          primaryPatternId: true,
        },
      })

      if (!question) {
        throw new Error(`Question not found: ${job.questionId}`)
      }

      const payload = question.payload as { prompt?: { text?: string }; tags?: { domain?: string; subdomain?: string } }
      const problemText = payload?.prompt?.text

      if (!problemText) {
        throw new Error('Question has no problem text')
      }

      // Process based on job type
      switch (job.jobType) {
        case 'scaffold_outline':
          await this.processScaffoldOutline(job, question.id, problemText)
          break
        case 'scaffold_step':
          await this.processScaffoldStep(job, question.id, problemText)
          break
        case 'simulation_params':
          await this.processSimulationParams(job, question.id, problemText, payload?.tags?.subdomain)
          break
        case 'concept_contrast':
          await this.processConceptContrast(job, question.id, problemText, payload?.tags?.domain, payload?.tags?.subdomain)
          break
        case 'variation':
          await this.processVariation(job, question.id, problemText, question.difficulty)
          break
        default:
          throw new Error(`Unknown job type: ${job.jobType}`)
      }

      // Mark job as completed
      await this.prisma.precomputeJob.update({
        where: { id: job.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      })

      console.log(`   ✅ Completed: ${job.jobType} for ${job.questionId}`)
      this.stats.completed++
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // Mark job as failed
      await this.prisma.precomputeJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          lastError: errorMessage,
        },
      })

      console.error(`   ❌ Failed: ${job.jobType} for ${job.questionId}: ${errorMessage}`)
      this.stats.failed++
    }
  }

  // ===========================================================================
  // Job Type Handlers
  // ===========================================================================

  private async processScaffoldOutline(job: Job, questionId: string, problemText: string): Promise<void> {
    const version = CURRENT_VERSIONS.scaffold_outline

    const message = await this.anthropic.messages.create({
      model: version.modelVersion,
      max_tokens: OUTLINE_MAX_TOKENS,
      system: OUTLINE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildOutlinePrompt(problemText, 3) }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]+\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const outlineData = JSON.parse(this.cleanJsonString(jsonMatch[0])) as OutlineScaffoldResponse
    const scaffoldId = generateScaffoldId(problemText)

    const inputTokens = message.usage?.input_tokens || 0
    const outputTokens = message.usage?.output_tokens || 0
    this.stats.totalTokens += inputTokens + outputTokens
    this.stats.totalCostUsd += estimateCost(inputTokens, outputTokens, version.modelVersion)

    await this.prisma.precomputedScaffoldOutline.upsert({
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
        updatedAt: new Date(),
      },
    })

    // Queue step expansion jobs for each step
    for (const step of outlineData.steps || []) {
      await this.queueJob('scaffold_step', questionId, step.step_id, job.priority - 1)
    }
  }

  private async processScaffoldStep(job: Job, questionId: string, problemText: string): Promise<void> {
    if (!job.contentKey) throw new Error('Step ID (contentKey) is required')

    const stepId = job.contentKey
    const version = CURRENT_VERSIONS.scaffold_step

    // Get the outline to get step context
    const outline = await this.prisma.precomputedScaffoldOutline.findUnique({
      where: { questionId },
    })

    if (!outline) throw new Error('Outline not found - generate outline first')

    const outlineData = outline.outlineData as unknown as OutlineScaffoldResponse
    const outlineSteps = outlineData.steps || []

    const message = await this.anthropic.messages.create({
      model: version.modelVersion,
      max_tokens: STEP_EXPANSION_MAX_TOKENS,
      system: STEP_EXPANSION_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildStepExpansionPrompt(problemText, outlineSteps, stepId) }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]+\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const expansionData = JSON.parse(this.cleanJsonString(jsonMatch[0])) as StepExpansionResponse

    const inputTokens = message.usage?.input_tokens || 0
    const outputTokens = message.usage?.output_tokens || 0
    this.stats.totalTokens += inputTokens + outputTokens
    this.stats.totalCostUsd += estimateCost(inputTokens, outputTokens, version.modelVersion)

    await this.prisma.precomputedStepExpansion.upsert({
      where: {
        outlineId_stepId_promptVersion: {
          outlineId: outline.id,
          stepId,
          promptVersion: version.promptVersion,
        },
      },
      create: {
        outlineId: outline.id,
        stepId,
        promptVersion: version.promptVersion,
        modelVersion: version.modelVersion,
        expansionData: expansionData as unknown as Record<string, unknown>,
        microTaskCount: expansionData.micro_tasks?.length || 0,
        hasFbd: !!expansionData.fbd_data,
        inputTokens,
        outputTokens,
      },
      update: {
        modelVersion: version.modelVersion,
        expansionData: expansionData as unknown as Record<string, unknown>,
        microTaskCount: expansionData.micro_tasks?.length || 0,
        hasFbd: !!expansionData.fbd_data,
        inputTokens,
        outputTokens,
      },
    })
  }

  private async processSimulationParams(
    job: Job,
    questionId: string,
    problemText: string,
    subdomain?: string
  ): Promise<void> {
    // No AI needed - uses regex extraction
    const simInput = { problem: problemText, subdomain }
    const simType = detectSimulationType(simInput as never)
    const extracted = extractParameters(simInput as never)

    await this.prisma.precomputedSimulationParams.upsert({
      where: { questionId },
      create: {
        questionId,
        simulationType: simType,
        params: extracted.params as Record<string, unknown>,
        isVerified: false,
      },
      update: {
        simulationType: simType,
        params: extracted.params as Record<string, unknown>,
        isVerified: false,
        updatedAt: new Date(),
      },
    })
  }

  private async processConceptContrast(
    job: Job,
    questionId: string,
    problemText: string,
    domain?: string,
    subdomain?: string
  ): Promise<void> {
    // For now, link to existing concept contrasts by domain/subdomain
    // Full implementation would generate question-specific distractors
    console.log(`      Note: Concept contrast for ${questionId} - using domain-based lookup`)
  }

  private async processVariation(
    job: Job,
    questionId: string,
    problemText: string,
    difficulty: string | null
  ): Promise<void> {
    const version = CURRENT_VERSIONS.problem_variation
    const variationType = (job.contentKey || 'same') as 'easier' | 'harder' | 'same'

    const prompt = this.buildVariationPrompt(problemText, variationType, difficulty || 'intermediate')

    const message = await this.anthropic.messages.create({
      model: version.modelVersion,
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]+\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')

    const parsed = JSON.parse(this.cleanJsonString(jsonMatch[0]))

    const inputTokens = message.usage?.input_tokens || 0
    const outputTokens = message.usage?.output_tokens || 0
    this.stats.totalTokens += inputTokens + outputTokens
    this.stats.totalCostUsd += estimateCost(inputTokens, outputTokens, version.modelVersion)

    await this.prisma.precomputedVariation.create({
      data: {
        questionId,
        variationType,
        promptVersion: version.promptVersion,
        modelVersion: version.modelVersion,
        problemStatement: parsed.problemStatement || '',
        whyDifferent: parsed.whyDifferent || '',
      },
    })
  }

  // ===========================================================================
  // Utility Methods
  // ===========================================================================

  private async queueJob(
    jobType: JobType,
    questionId: string,
    contentKey?: string,
    priority: number = 0
  ): Promise<void> {
    // Check if job already exists
    const existing = await this.prisma.precomputeJob.findFirst({
      where: {
        jobType,
        questionId,
        contentKey: contentKey || null,
        status: { in: ['pending', 'running'] },
      },
    })

    if (existing) return

    await this.prisma.precomputeJob.create({
      data: {
        jobType,
        questionId,
        contentKey,
        priority,
        status: 'pending',
      },
    })
  }

  private buildVariationPrompt(problemText: string, variationType: string, difficulty: string): string {
    const guidance: Record<string, string> = {
      easier: 'Create an EASIER version with simpler scenario and fewer steps.',
      harder: 'Create a HARDER version with more complexity and deeper concepts.',
      same: 'Create a SIMILAR DIFFICULTY version testing the same concept differently.',
    }

    return `You are an expert IIT-JEE Physics teacher.

ORIGINAL PROBLEM:
${problemText}

Difficulty: ${difficulty}

TASK: ${guidance[variationType]}

OUTPUT FORMAT (JSON only):
{
  "problemStatement": "Complete problem statement.",
  "whyDifferent": "One sentence explaining the difference."
}

Respond with ONLY valid JSON.`
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

  private shutdown(): void {
    console.log('\n🛑 Shutting down worker...')
    this.isRunning = false
  }

  private printStats(): void {
    const duration = (Date.now() - this.stats.startTime) / 1000
    console.log('\n' + '='.repeat(60))
    console.log('📊 WORKER SESSION COMPLETE')
    console.log('='.repeat(60))
    console.log(`   Duration: ${Math.round(duration)}s`)
    console.log(`   Jobs processed: ${this.stats.processed}`)
    console.log(`   Completed: ${this.stats.completed}`)
    console.log(`   Failed: ${this.stats.failed}`)
    console.log(`   Total tokens: ${this.stats.totalTokens}`)
    console.log(`   Estimated cost: $${this.stats.totalCostUsd.toFixed(4)}`)
    console.log('='.repeat(60) + '\n')
  }
}

// =============================================================================
// CLI Entry Point
// =============================================================================

function parseArgs(): WorkerOptions {
  const args = process.argv.slice(2)

  const getArg = (prefix: string): string | undefined => {
    const arg = args.find((a) => a.startsWith(prefix))
    return arg ? arg.split('=')[1] : undefined
  }

  return {
    runOnce: args.includes('--once'),
    pollIntervalSec: parseInt(getArg('--poll=') || '30', 10),
    batchSize: parseInt(getArg('--batch=') || '5', 10),
    maxConcurrency: parseInt(getArg('--concurrency=') || '2', 10),
    jobType: getArg('--type=') as JobType | undefined,
    dryRun: args.includes('--dry-run'),
  }
}

async function main() {
  const options = parseArgs()

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required')
    process.exit(1)
  }

  const worker = new PrecomputeJobWorker(options.maxConcurrency)
  await worker.run(options)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
