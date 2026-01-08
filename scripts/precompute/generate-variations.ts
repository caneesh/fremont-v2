#!/usr/bin/env npx tsx
/**
 * Problem Variations Generation Script
 *
 * Generates easier, harder, and same-difficulty variations
 * for approved questions in the question bank.
 *
 * Usage:
 *   npx tsx scripts/precompute/generate-variations.ts [options]
 *
 * Options:
 *   --dry-run           Preview what would be generated without making API calls
 *   --regenerate        Regenerate even if variations exist
 *   --question=ID       Process specific question ID
 *   --pattern=ID        Only process questions with this pattern
 *   --type=TYPE         Only generate specific type (easier|harder|same)
 *   --concurrency=N     Max parallel API calls (default: 2)
 *   --rate=N            Max requests per minute (default: 20)
 *   --batch=N           Batch size (default: 10)
 */

import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'
import { CURRENT_VERSIONS, estimateCost } from '../../lib/precompute/versioning'

// =============================================================================
// Configuration
// =============================================================================

type VariationType = 'easier' | 'harder' | 'same'

interface GenerateOptions {
  dryRun: boolean
  regenerate: boolean
  questionId?: string
  pattern?: string
  variationType?: VariationType
  maxConcurrency: number
  rateLimitPerMin: number
  batchSize: number
}

interface GenerationStats {
  processed: number
  generated: { easier: number; harder: number; same: number }
  skipped: number
  failed: number
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

class VariationsGenerator {
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
      generated: { easier: 0, harder: 0, same: 0 },
      skipped: 0,
      failed: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      startTime: Date.now(),
    }
  }

  async generate(options: GenerateOptions): Promise<void> {
    console.log('\n🔄 Starting problem variations generation...')
    console.log(`   Options: ${JSON.stringify(options, null, 2)}\n`)

    // Check if tables exist
    const tablesExist = await this.checkTablesExist()
    if (!tablesExist && !options.dryRun) {
      console.error('❌ Precompute tables do not exist. Run migration first:')
      console.error('   npx prisma migrate dev --name add_precompute_tables')
      process.exit(1)
    }

    if (!tablesExist) {
      console.log('⚠️  Precompute tables not found - running in preview mode\n')
    }

    // Get questions to process
    const questions = await this.getQuestionsToProcess(options, tablesExist)
    console.log(`📚 Found ${questions.length} questions to process\n`)

    if (questions.length === 0) {
      console.log('No questions to process. Exiting.')
      return
    }

    // Determine which types to generate
    const typesToGenerate: VariationType[] = options.variationType
      ? [options.variationType]
      : ['easier', 'harder', 'same']

    // Process in batches with rate limiting
    const batches = this.splitIntoBatches(questions, options.batchSize)

    for (let i = 0; i < batches.length; i++) {
      console.log(`\n📦 Processing batch ${i + 1}/${batches.length} (${batches[i].length} questions)`)

      for (const question of batches[i]) {
        await this.semaphore.acquire()
        try {
          await this.processQuestion(question, typesToGenerate, options, tablesExist)
        } finally {
          this.semaphore.release()
        }
      }

      // Rate limiting between batches
      if (i < batches.length - 1 && !options.dryRun) {
        const delay = (60000 / options.rateLimitPerMin) * options.batchSize
        console.log(`   ⏳ Rate limiting: waiting ${Math.round(delay / 1000)}s...`)
        await this.sleep(delay)
      }
    }

    this.printStats()
    await this.prisma.$disconnect()
  }

  private async checkTablesExist(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1 FROM precomputed_variations LIMIT 1`
      return true
    } catch {
      return false
    }
  }

  private async getQuestionsToProcess(options: GenerateOptions, tablesExist: boolean) {
    const where: Record<string, unknown> = {
      lifecycleState: 'approved',
    }

    if (options.questionId) {
      where.id = options.questionId
    }

    if (options.pattern) {
      where.primaryPatternId = options.pattern
    }

    const questions = await this.prisma.question.findMany({
      where,
      select: {
        id: true,
        questionId: true,
        payload: true,
        difficulty: true,
        primaryPatternId: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 500, // Safety limit
    })

    // Filter out questions that already have all variation types (unless regenerating)
    if (tablesExist && !options.regenerate) {
      const filtered = []
      for (const question of questions) {
        const existingCount = await this.prisma.precomputedVariation.count({
          where: { questionId: question.id },
        })
        // Keep if less than 3 variations exist
        if (existingCount < 3) {
          filtered.push(question)
        }
      }
      return filtered
    }

    return questions
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
      difficulty: string | null
    },
    typesToGenerate: VariationType[],
    options: GenerateOptions,
    tablesExist: boolean
  ): Promise<void> {
    this.stats.processed++
    const payload = question.payload as { prompt?: { text?: string }; tags?: { domain?: string; subdomain?: string } }
    const problemText = payload?.prompt?.text

    if (!problemText) {
      console.log(`   ⚠️  Skipping ${question.questionId}: no problem text`)
      this.stats.skipped++
      return
    }

    // Check which types already exist
    let existingTypes: string[] = []
    if (tablesExist && !options.regenerate) {
      const existing = await this.prisma.precomputedVariation.findMany({
        where: { questionId: question.id },
        select: { variationType: true },
      })
      existingTypes = existing.map((e) => e.variationType)
    }

    // Generate each type
    for (const varType of typesToGenerate) {
      if (existingTypes.includes(varType)) {
        console.log(`   ⏭️  Skipping ${question.questionId} ${varType}: already exists`)
        continue
      }

      if (options.dryRun) {
        console.log(`   🔍 [DRY RUN] Would generate ${varType} variation for: ${question.questionId}`)
        continue
      }

      try {
        const variation = await this.generateVariation(
          problemText,
          varType,
          question.difficulty || 'intermediate',
          payload?.tags?.domain,
          payload?.tags?.subdomain
        )

        if (!variation) {
          this.stats.failed++
          continue
        }

        // Save to database
        const version = CURRENT_VERSIONS.problem_variation
        await this.prisma.precomputedVariation.create({
          data: {
            questionId: question.id,
            variationType: varType,
            promptVersion: version.promptVersion,
            modelVersion: version.modelVersion,
            problemStatement: variation.problemStatement,
            whyDifferent: variation.whyDifferent,
          },
        })

        console.log(`   ✅ Generated ${varType} variation for: ${question.questionId}`)
        this.stats.generated[varType]++
      } catch (error) {
        console.error(`   ❌ Failed ${varType} for ${question.questionId}:`, error)
        this.stats.failed++
      }
    }
  }

  private async generateVariation(
    problemText: string,
    variationType: VariationType,
    difficulty: string,
    domain?: string,
    subdomain?: string
  ): Promise<{ problemStatement: string; whyDifferent: string } | null> {
    const version = CURRENT_VERSIONS.problem_variation
    const startTime = Date.now()

    const prompt = this.buildPrompt(problemText, variationType, difficulty, domain, subdomain)

    try {
      const message = await this.anthropic.messages.create({
        model: version.modelVersion,
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      })

      const latencyMs = Date.now() - startTime
      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

      // Parse JSON
      const jsonMatch = responseText.match(/\{[\s\S]+\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(this.cleanJsonString(jsonMatch[0]))

      // Calculate cost
      const inputTokens = message.usage?.input_tokens || 0
      const outputTokens = message.usage?.output_tokens || 0
      const costUsd = estimateCost(inputTokens, outputTokens, version.modelVersion)

      // Update stats
      this.stats.totalInputTokens += inputTokens
      this.stats.totalOutputTokens += outputTokens
      this.stats.totalCostUsd += costUsd

      console.log(`      Latency: ${latencyMs}ms, Cost: $${costUsd.toFixed(4)}`)

      return {
        problemStatement: parsed.problemStatement || parsed.problem_statement || '',
        whyDifferent: parsed.whyDifferent || parsed.why_different || '',
      }
    } catch (error) {
      console.error(`      Error generating variation:`, error)
      return null
    }
  }

  private buildPrompt(
    problemText: string,
    variationType: VariationType,
    difficulty: string,
    domain?: string,
    subdomain?: string
  ): string {
    const difficultyGuidance = {
      easier: `Create an EASIER version that:
- Simplifies the scenario (fewer objects, simpler geometry)
- Reduces the number of steps needed
- Makes the physics more straightforward
- Uses simpler numbers or removes unnecessary complications
- Is appropriate for students still learning the concept`,

      harder: `Create a HARDER version that:
- Adds complexity (more objects, 3D instead of 2D, multiple stages)
- Requires deeper conceptual understanding
- Combines multiple physics concepts
- Has less obvious solution paths
- Is appropriate for advanced IIT-JEE preparation`,

      same: `Create a SIMILAR DIFFICULTY version that:
- Tests the same concept from a different angle
- Uses a completely different physical scenario
- Maintains the same level of mathematical complexity
- Requires similar problem-solving skills
- Would take similar time to solve`,
    }

    return `You are an expert IIT-JEE Physics teacher creating problem variations.

ORIGINAL PROBLEM:
${problemText}

${domain ? `Domain: ${domain}` : ''}
${subdomain ? `Subdomain: ${subdomain}` : ''}
Current Difficulty: ${difficulty}

YOUR TASK:
${difficultyGuidance[variationType]}

CRITICAL RULES:
1. Do NOT include solutions or answers
2. Do NOT include hints or guidance
3. Only provide the problem statement itself
4. Ensure the problem is physically realistic and well-defined
5. Use proper physics notation and units
6. The problem must be completely solvable with standard IIT-JEE physics knowledge

WHAT MAKES A GOOD VARIATION:
- Changes the physical setup, not just numbers
- Tests the same underlying physics principle
- Has a clear, unambiguous problem statement
- All necessary information is provided
- Different from simply changing numerical values

OUTPUT FORMAT:
Respond with ONLY valid JSON:
{
  "problemStatement": "The complete problem statement with all necessary information.",
  "whyDifferent": "One sentence explaining how this variation differs from the original."
}

Respond with ONLY the JSON, no other text.`
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
    const totalGenerated =
      this.stats.generated.easier + this.stats.generated.harder + this.stats.generated.same

    console.log('\n' + '='.repeat(60))
    console.log('📊 GENERATION COMPLETE')
    console.log('='.repeat(60))
    console.log(`   Duration: ${Math.round(duration)}s`)
    console.log(`   Questions processed: ${this.stats.processed}`)
    console.log(`   Variations generated:`)
    console.log(`      - Easier: ${this.stats.generated.easier}`)
    console.log(`      - Harder: ${this.stats.generated.harder}`)
    console.log(`      - Same: ${this.stats.generated.same}`)
    console.log(`      - Total: ${totalGenerated}`)
    console.log(`   Skipped: ${this.stats.skipped}`)
    console.log(`   Failed: ${this.stats.failed}`)
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

  const varType = getArg('--type=')

  return {
    dryRun: args.includes('--dry-run'),
    regenerate: args.includes('--regenerate'),
    questionId: getArg('--question='),
    pattern: getArg('--pattern='),
    variationType: varType as VariationType | undefined,
    maxConcurrency: parseInt(getArg('--concurrency=') || '2', 10),
    rateLimitPerMin: parseInt(getArg('--rate=') || '20', 10),
    batchSize: parseInt(getArg('--batch=') || '10', 10),
  }
}

async function main() {
  const options = parseArgs()

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required')
    process.exit(1)
  }

  const generator = new VariationsGenerator(options.maxConcurrency)
  await generator.generate(options)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
