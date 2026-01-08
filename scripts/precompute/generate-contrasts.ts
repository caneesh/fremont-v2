#!/usr/bin/env npx tsx
/**
 * Concept Contrast Generation Script
 *
 * Pre-generates distractor concepts for major physics principles.
 * Distractors are stored by concept + domain for reuse across questions.
 *
 * Usage:
 *   npx tsx scripts/precompute/generate-contrasts.ts [options]
 *
 * Options:
 *   --dry-run           Preview what would be generated without making API calls
 *   --regenerate        Regenerate even if contrasts exist
 *   --concept=ID        Process specific concept ID
 *   --domain=DOMAIN     Only process concepts in this domain
 *   --concurrency=N     Max parallel API calls (default: 2)
 *   --rate=N            Max requests per minute (default: 20)
 */

import { PrismaClient } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'
import { CURRENT_VERSIONS, estimateCost } from '../../lib/precompute/versioning'

// =============================================================================
// Physics Concepts Library
// =============================================================================

interface PhysicsConcept {
  id: string
  name: string
  formula?: string
  domain: string
  subdomain: string
  description: string
}

// Common physics concepts for IIT-JEE
const PHYSICS_CONCEPTS: PhysicsConcept[] = [
  // Mechanics - Newton's Laws
  {
    id: 'newton-first',
    name: "Newton's First Law (Law of Inertia)",
    domain: 'mechanics',
    subdomain: 'newton-laws',
    description: 'An object at rest stays at rest, and an object in motion stays in motion unless acted upon by an external force.',
  },
  {
    id: 'newton-second',
    name: "Newton's Second Law",
    formula: 'F = ma',
    domain: 'mechanics',
    subdomain: 'newton-laws',
    description: 'Force equals mass times acceleration.',
  },
  {
    id: 'newton-third',
    name: "Newton's Third Law",
    domain: 'mechanics',
    subdomain: 'newton-laws',
    description: 'For every action, there is an equal and opposite reaction.',
  },

  // Mechanics - Conservation Laws
  {
    id: 'momentum-conservation',
    name: 'Conservation of Linear Momentum',
    formula: 'p_i = p_f',
    domain: 'mechanics',
    subdomain: 'momentum',
    description: 'Total momentum of an isolated system remains constant.',
  },
  {
    id: 'energy-conservation',
    name: 'Conservation of Mechanical Energy',
    formula: 'KE_i + PE_i = KE_f + PE_f',
    domain: 'mechanics',
    subdomain: 'energy',
    description: 'Total mechanical energy is conserved when only conservative forces act.',
  },
  {
    id: 'angular-momentum-conservation',
    name: 'Conservation of Angular Momentum',
    formula: 'L_i = L_f',
    domain: 'mechanics',
    subdomain: 'rotation',
    description: 'Total angular momentum of an isolated system remains constant.',
  },

  // Mechanics - Work & Energy
  {
    id: 'work-energy-theorem',
    name: 'Work-Energy Theorem',
    formula: 'W_{net} = \\Delta KE',
    domain: 'mechanics',
    subdomain: 'energy',
    description: 'Net work done equals change in kinetic energy.',
  },
  {
    id: 'power-work',
    name: 'Power as Rate of Work',
    formula: 'P = \\frac{dW}{dt}',
    domain: 'mechanics',
    subdomain: 'energy',
    description: 'Power is the rate at which work is done.',
  },

  // Mechanics - Rotational Motion
  {
    id: 'torque-angular-accel',
    name: 'Torque and Angular Acceleration',
    formula: '\\tau = I\\alpha',
    domain: 'mechanics',
    subdomain: 'rotation',
    description: 'Torque equals moment of inertia times angular acceleration.',
  },
  {
    id: 'rolling-motion',
    name: 'Rolling Without Slipping',
    formula: 'v = \\omega R',
    domain: 'mechanics',
    subdomain: 'rotation',
    description: 'Velocity of center equals angular velocity times radius for pure rolling.',
  },

  // Mechanics - Gravitation
  {
    id: 'newton-gravitation',
    name: "Newton's Law of Gravitation",
    formula: 'F = \\frac{Gm_1m_2}{r^2}',
    domain: 'mechanics',
    subdomain: 'gravitation',
    description: 'Gravitational force between two masses.',
  },
  {
    id: 'kepler-third',
    name: "Kepler's Third Law",
    formula: 'T^2 \\propto r^3',
    domain: 'mechanics',
    subdomain: 'gravitation',
    description: 'Square of orbital period proportional to cube of semi-major axis.',
  },

  // Mechanics - SHM
  {
    id: 'shm-equation',
    name: 'Simple Harmonic Motion',
    formula: 'a = -\\omega^2 x',
    domain: 'mechanics',
    subdomain: 'shm',
    description: 'Acceleration proportional to displacement, opposite in direction.',
  },

  // Electromagnetism - Electrostatics
  {
    id: 'coulomb-law',
    name: "Coulomb's Law",
    formula: 'F = \\frac{kq_1q_2}{r^2}',
    domain: 'electromagnetism',
    subdomain: 'electrostatics',
    description: 'Electrostatic force between two point charges.',
  },
  {
    id: 'gauss-law',
    name: "Gauss's Law",
    formula: '\\oint \\vec{E} \\cdot d\\vec{A} = \\frac{Q_{enc}}{\\epsilon_0}',
    domain: 'electromagnetism',
    subdomain: 'electrostatics',
    description: 'Electric flux through a closed surface equals enclosed charge over epsilon naught.',
  },

  // Electromagnetism - Circuits
  {
    id: 'ohm-law',
    name: "Ohm's Law",
    formula: 'V = IR',
    domain: 'electromagnetism',
    subdomain: 'circuits',
    description: 'Voltage equals current times resistance.',
  },
  {
    id: 'kirchhoff-voltage',
    name: "Kirchhoff's Voltage Law",
    domain: 'electromagnetism',
    subdomain: 'circuits',
    description: 'Sum of voltages around any closed loop equals zero.',
  },
  {
    id: 'kirchhoff-current',
    name: "Kirchhoff's Current Law",
    domain: 'electromagnetism',
    subdomain: 'circuits',
    description: 'Sum of currents entering a junction equals sum of currents leaving.',
  },

  // Electromagnetism - Magnetism
  {
    id: 'biot-savart',
    name: 'Biot-Savart Law',
    formula: 'd\\vec{B} = \\frac{\\mu_0 I d\\vec{l} \\times \\hat{r}}{4\\pi r^2}',
    domain: 'electromagnetism',
    subdomain: 'magnetism',
    description: 'Magnetic field due to a current element.',
  },
  {
    id: 'ampere-law',
    name: "Ampere's Circuital Law",
    formula: '\\oint \\vec{B} \\cdot d\\vec{l} = \\mu_0 I_{enc}',
    domain: 'electromagnetism',
    subdomain: 'magnetism',
    description: 'Line integral of magnetic field around closed loop equals mu naught times enclosed current.',
  },
  {
    id: 'faraday-law',
    name: "Faraday's Law of Induction",
    formula: '\\mathcal{E} = -\\frac{d\\Phi_B}{dt}',
    domain: 'electromagnetism',
    subdomain: 'induction',
    description: 'Induced EMF equals negative rate of change of magnetic flux.',
  },
  {
    id: 'lenz-law',
    name: "Lenz's Law",
    domain: 'electromagnetism',
    subdomain: 'induction',
    description: 'Induced current opposes the change that produces it.',
  },

  // Thermodynamics
  {
    id: 'first-law-thermo',
    name: 'First Law of Thermodynamics',
    formula: '\\Delta U = Q - W',
    domain: 'thermodynamics',
    subdomain: 'laws',
    description: 'Change in internal energy equals heat added minus work done.',
  },
  {
    id: 'second-law-thermo',
    name: 'Second Law of Thermodynamics',
    domain: 'thermodynamics',
    subdomain: 'laws',
    description: 'Entropy of an isolated system never decreases.',
  },
  {
    id: 'ideal-gas-law',
    name: 'Ideal Gas Law',
    formula: 'PV = nRT',
    domain: 'thermodynamics',
    subdomain: 'gases',
    description: 'Relates pressure, volume, amount, and temperature of an ideal gas.',
  },

  // Optics
  {
    id: 'snell-law',
    name: "Snell's Law",
    formula: 'n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2',
    domain: 'optics',
    subdomain: 'refraction',
    description: 'Relates angles of incidence and refraction at an interface.',
  },
  {
    id: 'lens-formula',
    name: 'Lens Formula',
    formula: '\\frac{1}{f} = \\frac{1}{v} - \\frac{1}{u}',
    domain: 'optics',
    subdomain: 'lenses',
    description: 'Relates focal length, image distance, and object distance.',
  },

  // Waves
  {
    id: 'doppler-effect',
    name: 'Doppler Effect',
    domain: 'waves',
    subdomain: 'sound',
    description: 'Change in frequency due to relative motion between source and observer.',
  },
  {
    id: 'interference-condition',
    name: 'Interference Condition',
    formula: '\\Delta x = n\\lambda',
    domain: 'waves',
    subdomain: 'interference',
    description: 'Path difference for constructive interference.',
  },

  // Modern Physics
  {
    id: 'photoelectric-effect',
    name: 'Photoelectric Effect',
    formula: 'KE_{max} = h\\nu - \\phi',
    domain: 'modern-physics',
    subdomain: 'quantum',
    description: 'Maximum kinetic energy of photoelectrons.',
  },
  {
    id: 'bohr-model',
    name: 'Bohr Model of Hydrogen',
    formula: 'E_n = -\\frac{13.6}{n^2} eV',
    domain: 'modern-physics',
    subdomain: 'atomic',
    description: 'Energy levels in hydrogen atom.',
  },
  {
    id: 'radioactive-decay',
    name: 'Radioactive Decay Law',
    formula: 'N = N_0 e^{-\\lambda t}',
    domain: 'modern-physics',
    subdomain: 'nuclear',
    description: 'Exponential decay of radioactive nuclei.',
  },
]

// =============================================================================
// Configuration
// =============================================================================

interface GenerateOptions {
  dryRun: boolean
  regenerate: boolean
  conceptId?: string
  domain?: string
  maxConcurrency: number
  rateLimitPerMin: number
}

interface GenerationStats {
  processed: number
  generated: number
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

class ConceptContrastGenerator {
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
      generated: 0,
      skipped: 0,
      failed: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCostUsd: 0,
      startTime: Date.now(),
    }
  }

  async generate(options: GenerateOptions): Promise<void> {
    console.log('\n🎯 Starting concept contrast generation...')
    console.log(`   Options: ${JSON.stringify(options, null, 2)}\n`)

    // Check if tables exist
    const tablesExist = await this.checkTablesExist()
    if (!tablesExist && !options.dryRun) {
      console.error('❌ Precompute tables do not exist. Run migration first:')
      console.error('   npx prisma migrate dev --name add_precompute_tables')
      process.exit(1)
    }

    // Filter concepts based on options
    let concepts = PHYSICS_CONCEPTS
    if (options.conceptId) {
      concepts = concepts.filter((c) => c.id === options.conceptId)
    }
    if (options.domain) {
      concepts = concepts.filter((c) => c.domain === options.domain)
    }

    console.log(`📚 Processing ${concepts.length} physics concepts\n`)

    if (concepts.length === 0) {
      console.log('No concepts to process. Exiting.')
      return
    }

    // Process concepts with rate limiting
    const delayBetweenCalls = Math.ceil(60000 / options.rateLimitPerMin)

    for (const concept of concepts) {
      await this.semaphore.acquire()
      try {
        await this.processConcept(concept, options, tablesExist)
      } finally {
        this.semaphore.release()
      }

      // Rate limiting
      if (!options.dryRun) {
        await this.sleep(delayBetweenCalls)
      }
    }

    this.printStats()
    await this.prisma.$disconnect()
  }

  private async checkTablesExist(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1 FROM precomputed_concept_contrasts LIMIT 1`
      return true
    } catch {
      return false
    }
  }

  private async processConcept(
    concept: PhysicsConcept,
    options: GenerateOptions,
    tablesExist: boolean
  ): Promise<void> {
    this.stats.processed++

    // Check if already exists
    if (tablesExist && !options.regenerate) {
      const existing = await this.prisma.precomputedConceptContrast.findFirst({
        where: {
          conceptId: concept.id,
          domain: concept.domain,
          subdomain: concept.subdomain,
        },
      })

      if (existing) {
        console.log(`   ⏭️  Skipping ${concept.id}: already has contrasts`)
        this.stats.skipped++
        return
      }
    }

    if (options.dryRun) {
      console.log(`   🔍 [DRY RUN] Would generate contrasts for: ${concept.name}`)
      console.log(`      Domain: ${concept.domain}/${concept.subdomain}`)
      return
    }

    try {
      const distractors = await this.generateDistractors(concept)

      if (!distractors || distractors.length === 0) {
        console.log(`   ⚠️  No distractors generated for: ${concept.name}`)
        this.stats.failed++
        return
      }

      // Save to database
      const version = CURRENT_VERSIONS.concept_contrast
      await this.prisma.precomputedConceptContrast.upsert({
        where: {
          conceptId_domain_subdomain_promptVersion: {
            conceptId: concept.id,
            domain: concept.domain,
            subdomain: concept.subdomain,
            promptVersion: version.promptVersion,
          },
        },
        create: {
          conceptId: concept.id,
          domain: concept.domain,
          subdomain: concept.subdomain,
          promptVersion: version.promptVersion,
          modelVersion: version.modelVersion,
          distractors: distractors as unknown as Record<string, unknown>[],
        },
        update: {
          modelVersion: version.modelVersion,
          distractors: distractors as unknown as Record<string, unknown>[],
          updatedAt: new Date(),
        },
      })

      console.log(`   ✅ Generated ${distractors.length} distractors for: ${concept.name}`)
      this.stats.generated++
    } catch (error) {
      console.error(`   ❌ Failed for ${concept.name}:`, error)
      this.stats.failed++
    }
  }

  private async generateDistractors(concept: PhysicsConcept): Promise<DistractorData[] | null> {
    const version = CURRENT_VERSIONS.concept_contrast
    const startTime = Date.now()

    const prompt = this.buildPrompt(concept)

    try {
      const message = await this.anthropic.messages.create({
        model: version.modelVersion,
        max_tokens: 2048,
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

      return parsed.distractors || []
    } catch (error) {
      console.error(`      Error generating distractors:`, error)
      return null
    }
  }

  private buildPrompt(concept: PhysicsConcept): string {
    return `You are the "Concept Contrast" Agent for PhysiScaffold, an advanced physics tutor for IIT-JEE students.

Your task is to generate DISTRACTOR concepts for when a student selects: **${concept.name}**
${concept.formula ? `Formula: $${concept.formula}$` : ''}

Domain: ${concept.domain}
Subdomain: ${concept.subdomain}
Description: ${concept.description}

### YOUR TASK
Generate 3-4 DISTRACTOR concepts - related laws/principles that:
1. Students commonly confuse with ${concept.name}
2. Are in the same or related physics domain
3. Have subtle but important differences in applicability conditions

For each distractor, provide:
- name: The law/principle name
- whyPlausible: Why students might confuse this with ${concept.name}
- criticalFlaw: The key difference that distinguishes them
- problemConditionViolated: Typical conditions where one applies but not the other
- commonMisconception: The underlying confusion students have
- rejectionHint: A Socratic question to help students distinguish them

### GOOD DISTRACTOR EXAMPLES
For "Conservation of Momentum":
- "Conservation of Kinetic Energy" - similar but different conserved quantity
- "Newton's Second Law" - relates to forces vs. momentum conservation
- "Impulse-Momentum Theorem" - instantaneous vs. before/after analysis

### OUTPUT FORMAT
Respond with ONLY valid JSON:
{
  "distractors": [
    {
      "name": "Name of the distractor law/principle",
      "whyPlausible": "Why students confuse this with the target concept",
      "criticalFlaw": "The fundamental difference between them",
      "problemConditionViolated": "Conditions where target applies but distractor doesn't",
      "commonMisconception": "The underlying confusion",
      "rejectionHint": "A Socratic question to distinguish them"
    }
  ]
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
    console.log('\n' + '='.repeat(60))
    console.log('📊 GENERATION COMPLETE')
    console.log('='.repeat(60))
    console.log(`   Duration: ${Math.round(duration)}s`)
    console.log(`   Concepts processed: ${this.stats.processed}`)
    console.log(`   Generated: ${this.stats.generated}`)
    console.log(`   Skipped: ${this.stats.skipped}`)
    console.log(`   Failed: ${this.stats.failed}`)
    console.log(`   Total tokens: ${this.stats.totalInputTokens} input, ${this.stats.totalOutputTokens} output`)
    console.log(`   Estimated cost: $${this.stats.totalCostUsd.toFixed(4)}`)
    console.log('='.repeat(60) + '\n')
  }
}

// =============================================================================
// Types
// =============================================================================

interface DistractorData {
  name: string
  whyPlausible: string
  criticalFlaw: string
  problemConditionViolated: string
  commonMisconception: string
  rejectionHint: string
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
    dryRun: args.includes('--dry-run'),
    regenerate: args.includes('--regenerate'),
    conceptId: getArg('--concept='),
    domain: getArg('--domain='),
    maxConcurrency: parseInt(getArg('--concurrency=') || '2', 10),
    rateLimitPerMin: parseInt(getArg('--rate=') || '20', 10),
  }
}

async function main() {
  const options = parseArgs()

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY environment variable is required')
    process.exit(1)
  }

  const generator = new ConceptContrastGenerator(options.maxConcurrency)
  await generator.generate(options)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
