#!/usr/bin/env npx tsx
/**
 * Simulation Parameters Extraction Script
 *
 * Extracts physics simulation parameters from approved questions
 * using regex patterns. No AI calls needed - purely deterministic.
 *
 * Usage:
 *   npx tsx scripts/precompute/extract-sim-params.ts [options]
 *
 * Options:
 *   --dry-run           Preview what would be extracted without saving
 *   --regenerate        Re-extract even if params already exist
 *   --question=ID       Process specific question ID
 *   --pattern=ID        Only process questions with this pattern
 *   --type=TYPE         Only process questions of type (projectile|incline)
 */

import { PrismaClient } from '@prisma/client'
import {
  detectSimulationType,
  extractParameters,
} from '../../lib/simulationService'
import type { SimulationType } from '../../types/simulation'

// Minimal interface matching what simulationService needs
interface SimulationInput {
  problem: string
  subdomain?: string
}

// =============================================================================
// Configuration
// =============================================================================

interface ExtractOptions {
  dryRun: boolean
  regenerate: boolean
  questionId?: string
  pattern?: string
  filterType?: SimulationType
}

interface ExtractionStats {
  processed: number
  extracted: { projectile: number; incline: number; unsupported: number }
  skipped: number
  failed: number
  startTime: number
}

// =============================================================================
// Main Extractor Class
// =============================================================================

class SimParamsExtractor {
  private prisma: PrismaClient
  private stats: ExtractionStats

  constructor() {
    this.prisma = new PrismaClient()
    this.stats = {
      processed: 0,
      extracted: { projectile: 0, incline: 0, unsupported: 0 },
      skipped: 0,
      failed: 0,
      startTime: Date.now(),
    }
  }

  async extract(options: ExtractOptions): Promise<void> {
    console.log('\n🔬 Starting simulation parameters extraction...')
    console.log(`   Options: ${JSON.stringify(options, null, 2)}\n`)

    // Check if precompute tables exist
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

    // Process each question
    for (const question of questions) {
      await this.processQuestion(question, options)
    }

    this.printStats()
    await this.prisma.$disconnect()
  }

  private async checkTablesExist(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1 FROM precomputed_simulation_params LIMIT 1`
      return true
    } catch {
      return false
    }
  }

  private async getQuestionsToProcess(options: ExtractOptions, tablesExist: boolean) {
    const where: Record<string, unknown> = {
      lifecycleState: 'approved',
    }

    if (options.questionId) {
      where.id = options.questionId
    }

    if (options.pattern) {
      where.primaryPatternId = options.pattern
    }

    // Only get questions without precomputed params unless regenerating
    // Skip this filter if tables don't exist (dry-run mode without migration)
    if (!options.regenerate && tablesExist) {
      where.precomputedSimParams = null
    }

    // Build select based on whether tables exist
    const select: Record<string, unknown> = {
      id: true,
      questionId: true,
      payload: true,
      difficulty: true,
      primaryPatternId: true,
    }

    if (tablesExist) {
      select.precomputedSimParams = { select: { id: true } }
    }

    const questions = await this.prisma.question.findMany({
      where,
      select,
      orderBy: { createdAt: 'asc' },
      take: 1000, // Safety limit
    })

    // Add null precomputedSimParams if tables don't exist
    return questions.map((q) => ({
      ...q,
      precomputedSimParams: (q as { precomputedSimParams?: { id: string } | null }).precomputedSimParams ?? null,
    }))
  }

  private async processQuestion(
    question: {
      id: string
      questionId: string
      payload: unknown
      precomputedSimParams: { id: string } | null
    },
    options: ExtractOptions
  ): Promise<void> {
    this.stats.processed++
    const payload = question.payload as { prompt?: { text?: string } }
    const problemText = payload?.prompt?.text

    if (!problemText) {
      console.log(`   ⚠️  Skipping ${question.questionId}: no problem text`)
      this.stats.skipped++
      return
    }

    // Skip if params exist and not regenerating
    if (question.precomputedSimParams && !options.regenerate) {
      console.log(`   ⏭️  Skipping ${question.questionId}: already has params`)
      this.stats.skipped++
      return
    }

    try {
      // Create minimal input for simulation detection
      const simInput: SimulationInput = {
        problem: problemText,
        subdomain: this.extractSubdomain(question.payload),
      }

      // Detect type and extract parameters
      // Cast to any since simulationService expects ScaffoldData but only uses problem/subdomain
      const simType = detectSimulationType(simInput as never)
      const extracted = extractParameters(simInput as never)

      // Filter by type if specified
      if (options.filterType && simType !== options.filterType) {
        console.log(`   ⏭️  Skipping ${question.questionId}: type ${simType} != ${options.filterType}`)
        this.stats.skipped++
        return
      }

      // Track stats by type
      this.stats.extracted[simType]++

      if (options.dryRun) {
        console.log(`   🔍 [DRY RUN] ${question.questionId}: type=${simType}`)
        console.log(`      Params: ${JSON.stringify(extracted.params)}`)
        return
      }

      // Save to database
      await this.prisma.precomputedSimulationParams.upsert({
        where: { questionId: question.id },
        create: {
          questionId: question.id,
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

      const icon = simType === 'unsupported' ? '⚪' : '✅'
      console.log(`   ${icon} ${question.questionId}: ${simType}`)

      if (simType !== 'unsupported') {
        console.log(`      ${JSON.stringify(extracted.params)}`)
      }
    } catch (error) {
      console.error(`   ❌ Failed for ${question.questionId}:`, error)
      this.stats.failed++
    }
  }

  private extractSubdomain(payload: unknown): string | undefined {
    const p = payload as { tags?: { subdomain?: string } }
    return p?.tags?.subdomain
  }

  private printStats(): void {
    const duration = (Date.now() - this.stats.startTime) / 1000
    const total = this.stats.extracted.projectile + this.stats.extracted.incline
    const coverage = this.stats.processed > 0
      ? Math.round((total / this.stats.processed) * 100)
      : 0

    console.log('\n' + '='.repeat(60))
    console.log('📊 EXTRACTION COMPLETE')
    console.log('='.repeat(60))
    console.log(`   Duration: ${Math.round(duration)}s`)
    console.log(`   Questions processed: ${this.stats.processed}`)
    console.log(`   Extracted:`)
    console.log(`      - Projectile: ${this.stats.extracted.projectile}`)
    console.log(`      - Incline: ${this.stats.extracted.incline}`)
    console.log(`      - Unsupported: ${this.stats.extracted.unsupported}`)
    console.log(`   Skipped: ${this.stats.skipped}`)
    console.log(`   Failed: ${this.stats.failed}`)
    console.log(`   Simulation coverage: ${coverage}% (${total}/${this.stats.processed} have supported types)`)
    console.log('='.repeat(60) + '\n')
  }
}

// =============================================================================
// CLI Entry Point
// =============================================================================

function parseArgs(): ExtractOptions {
  const args = process.argv.slice(2)

  const getArg = (prefix: string): string | undefined => {
    const arg = args.find((a) => a.startsWith(prefix))
    return arg ? arg.split('=')[1] : undefined
  }

  const filterType = getArg('--type=')

  return {
    dryRun: args.includes('--dry-run'),
    regenerate: args.includes('--regenerate'),
    questionId: getArg('--question='),
    pattern: getArg('--pattern='),
    filterType: filterType as SimulationType | undefined,
  }
}

async function main() {
  const options = parseArgs()
  const extractor = new SimParamsExtractor()
  await extractor.extract(options)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
