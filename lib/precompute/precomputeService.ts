/**
 * Precompute Service
 *
 * Provides lookup methods for precomputed content.
 * Falls back gracefully when content is not precomputed.
 */

import { prisma } from '@/lib/db'
import { getCurrentVersion, isVersionAcceptable } from './versioning'
import type {
  PrecomputeLookupResult,
  PrecomputeLookupOptions,
  ConceptContrastData,
  VariationData,
  SimulationParamsData,
} from './types'
import type { OutlineScaffoldResponse, StepExpansionResponse } from '@/types/phasedScaffold'

class PrecomputeService {
  /**
   * Get precomputed scaffold outline for a question
   */
  async getScaffoldOutline(
    questionId: string,
    options: PrecomputeLookupOptions = {}
  ): Promise<PrecomputeLookupResult<OutlineScaffoldResponse>> {
    const { acceptOlderVersion = false } = options
    const currentVersion = getCurrentVersion('scaffold_outline')

    try {
      // Try exact version match first
      let outline = await prisma.precomputedScaffoldOutline.findFirst({
        where: {
          questionId,
          promptVersion: currentVersion.promptVersion,
          modelVersion: currentVersion.modelVersion,
        },
      })

      // Fall back to any version if allowed
      if (!outline && acceptOlderVersion) {
        outline = await prisma.precomputedScaffoldOutline.findUnique({
          where: { questionId },
        })

        // Validate the version is acceptable
        if (outline && !isVersionAcceptable(
          'scaffold_outline',
          outline.promptVersion,
          outline.modelVersion,
          true
        )) {
          outline = null
        }
      }

      if (!outline) {
        return { found: false, source: 'live' }
      }

      return {
        found: true,
        data: outline.outlineData as OutlineScaffoldResponse,
        source: 'precomputed',
        meta: {
          promptVersion: outline.promptVersion,
          modelVersion: outline.modelVersion,
          generatedAt: outline.createdAt,
          inputTokens: outline.inputTokens ?? undefined,
          outputTokens: outline.outputTokens ?? undefined,
        },
      }
    } catch (error) {
      console.error('[PrecomputeService] Error getting scaffold outline:', error)
      return { found: false, source: 'live' }
    }
  }

  /**
   * Get precomputed step expansion
   */
  async getStepExpansion(
    questionId: string,
    stepId: string,
    options: PrecomputeLookupOptions = {}
  ): Promise<PrecomputeLookupResult<StepExpansionResponse>> {
    const { acceptOlderVersion = false } = options
    const currentVersion = getCurrentVersion('scaffold_step')

    try {
      // First get the outline to find the correct relation
      const outline = await prisma.precomputedScaffoldOutline.findUnique({
        where: { questionId },
        include: {
          stepExpansions: {
            where: { stepId },
          },
        },
      })

      if (!outline) {
        return { found: false, source: 'live' }
      }

      // Find matching expansion with version check
      const expansion = outline.stepExpansions.find((e) => {
        if (acceptOlderVersion) {
          return isVersionAcceptable(
            'scaffold_step',
            e.promptVersion,
            e.modelVersion,
            true
          )
        }
        return (
          e.promptVersion === currentVersion.promptVersion &&
          e.modelVersion === currentVersion.modelVersion
        )
      })

      if (!expansion) {
        return { found: false, source: 'live' }
      }

      return {
        found: true,
        data: expansion.expansionData as StepExpansionResponse,
        source: 'precomputed',
        meta: {
          promptVersion: expansion.promptVersion,
          modelVersion: expansion.modelVersion,
          generatedAt: expansion.createdAt,
          inputTokens: expansion.inputTokens ?? undefined,
          outputTokens: expansion.outputTokens ?? undefined,
        },
      }
    } catch (error) {
      console.error('[PrecomputeService] Error getting step expansion:', error)
      return { found: false, source: 'live' }
    }
  }

  /**
   * Get precomputed concept contrast distractors
   * Can look up by questionId or by conceptId + domain
   */
  async getConceptContrast(
    params: { questionId?: string; conceptId?: string; domain?: string; subdomain?: string },
    options: PrecomputeLookupOptions = {}
  ): Promise<PrecomputeLookupResult<ConceptContrastData>> {
    const { acceptOlderVersion = false } = options
    const currentVersion = getCurrentVersion('concept_contrast')

    try {
      // Build where clause based on provided params
      const where: Record<string, unknown> = {}

      if (params.questionId) {
        where.questionId = params.questionId
      } else if (params.conceptId && params.domain && params.subdomain) {
        where.conceptId = params.conceptId
        where.domain = params.domain
        where.subdomain = params.subdomain
      } else {
        return { found: false, source: 'live' }
      }

      // Add version filter if not accepting older
      if (!acceptOlderVersion) {
        where.promptVersion = currentVersion.promptVersion
        where.modelVersion = currentVersion.modelVersion
      }

      const contrast = await prisma.precomputedConceptContrast.findFirst({
        where,
        orderBy: { createdAt: 'desc' },
      })

      if (!contrast) {
        return { found: false, source: 'live' }
      }

      // Validate version if accepting older
      if (acceptOlderVersion && !isVersionAcceptable(
        'concept_contrast',
        contrast.promptVersion,
        contrast.modelVersion,
        true
      )) {
        return { found: false, source: 'live' }
      }

      return {
        found: true,
        data: contrast.distractors as ConceptContrastData,
        source: 'precomputed',
        meta: {
          promptVersion: contrast.promptVersion,
          modelVersion: contrast.modelVersion,
          generatedAt: contrast.createdAt,
        },
      }
    } catch (error) {
      console.error('[PrecomputeService] Error getting concept contrast:', error)
      return { found: false, source: 'live' }
    }
  }

  /**
   * Get precomputed problem variations
   */
  async getVariations(
    questionId: string,
    variationType?: 'easier' | 'harder' | 'same',
    options: PrecomputeLookupOptions = {}
  ): Promise<PrecomputeLookupResult<VariationData[]>> {
    try {
      const where: Record<string, unknown> = { questionId }

      if (variationType) {
        where.variationType = variationType
      }

      const variations = await prisma.precomputedVariation.findMany({
        where,
        select: {
          variationType: true,
          problemStatement: true,
          whyDifferent: true,
          promptVersion: true,
          modelVersion: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (variations.length === 0) {
        return { found: false, source: 'live' }
      }

      // Filter by version if not accepting older
      const currentVersion = getCurrentVersion('problem_variation')
      const filteredVariations = options.acceptOlderVersion
        ? variations
        : variations.filter(
            (v) =>
              v.promptVersion === currentVersion.promptVersion &&
              v.modelVersion === currentVersion.modelVersion
          )

      if (filteredVariations.length === 0) {
        return { found: false, source: 'live' }
      }

      return {
        found: true,
        data: filteredVariations.map((v) => ({
          variationType: v.variationType as 'easier' | 'harder' | 'same',
          problemStatement: v.problemStatement,
          whyDifferent: v.whyDifferent,
        })),
        source: 'precomputed',
        meta: {
          promptVersion: filteredVariations[0].promptVersion,
          modelVersion: filteredVariations[0].modelVersion,
          generatedAt: filteredVariations[0].createdAt,
        },
      }
    } catch (error) {
      console.error('[PrecomputeService] Error getting variations:', error)
      return { found: false, source: 'live' }
    }
  }

  /**
   * Get precomputed simulation parameters
   */
  async getSimulationParams(
    questionId: string
  ): Promise<PrecomputeLookupResult<SimulationParamsData>> {
    try {
      const simParams = await prisma.precomputedSimulationParams.findUnique({
        where: { questionId },
      })

      if (!simParams) {
        return { found: false, source: 'live' }
      }

      return {
        found: true,
        data: {
          type: simParams.simulationType as 'projectile' | 'incline' | 'unsupported',
          params: simParams.params as SimulationParamsData['params'],
        },
        source: 'precomputed',
        meta: {
          promptVersion: 'regex.v1.0',
          modelVersion: 'n/a',
          generatedAt: simParams.createdAt,
        },
      }
    } catch (error) {
      console.error('[PrecomputeService] Error getting simulation params:', error)
      return { found: false, source: 'live' }
    }
  }

  /**
   * Check if a question has precomputed content
   */
  async hasPrecomputedContent(
    questionId: string,
    contentTypes?: ('outline' | 'steps' | 'contrasts' | 'variations' | 'simulation')[]
  ): Promise<Record<string, boolean>> {
    const types = contentTypes || ['outline', 'steps', 'contrasts', 'variations', 'simulation']
    const result: Record<string, boolean> = {}

    try {
      const [outline, contrasts, variations, simulation] = await Promise.all([
        types.includes('outline')
          ? prisma.precomputedScaffoldOutline.findUnique({
              where: { questionId },
              select: {
                id: true,
                stepExpansions: { select: { id: true } },
              },
            })
          : null,
        types.includes('contrasts')
          ? prisma.precomputedConceptContrast.count({ where: { questionId } })
          : 0,
        types.includes('variations')
          ? prisma.precomputedVariation.count({ where: { questionId } })
          : 0,
        types.includes('simulation')
          ? prisma.precomputedSimulationParams.findUnique({
              where: { questionId },
              select: { id: true },
            })
          : null,
      ])

      result.outline = !!outline
      result.steps = outline ? outline.stepExpansions.length > 0 : false
      result.contrasts = contrasts > 0
      result.variations = variations > 0
      result.simulation = !!simulation

      return result
    } catch (error) {
      console.error('[PrecomputeService] Error checking precomputed content:', error)
      return {}
    }
  }

  /**
   * Get precompute coverage statistics
   */
  async getCoverageStats(): Promise<{
    totalQuestions: number
    withOutlines: number
    withSteps: number
    withContrasts: number
    withVariations: number
    withSimulation: number
    coveragePercent: number
  }> {
    try {
      const [
        totalQuestions,
        withOutlines,
        withSteps,
        withContrasts,
        withVariations,
        withSimulation,
      ] = await Promise.all([
        prisma.question.count({ where: { lifecycleState: 'approved' } }),
        prisma.precomputedScaffoldOutline.count(),
        prisma.precomputedStepExpansion.count(),
        prisma.precomputedConceptContrast.groupBy({ by: ['questionId'] }).then((r) => r.length),
        prisma.precomputedVariation.groupBy({ by: ['questionId'] }).then((r) => r.length),
        prisma.precomputedSimulationParams.count(),
      ])

      const coveragePercent = totalQuestions > 0
        ? Math.round((withOutlines / totalQuestions) * 100)
        : 0

      return {
        totalQuestions,
        withOutlines,
        withSteps,
        withContrasts,
        withVariations,
        withSimulation,
        coveragePercent,
      }
    } catch (error) {
      console.error('[PrecomputeService] Error getting coverage stats:', error)
      return {
        totalQuestions: 0,
        withOutlines: 0,
        withSteps: 0,
        withContrasts: 0,
        withVariations: 0,
        withSimulation: 0,
        coveragePercent: 0,
      }
    }
  }
}

// Singleton instance
export const precomputeService = new PrecomputeService()
