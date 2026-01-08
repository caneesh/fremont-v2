/**
 * Hook: useSimulationParams
 *
 * Fetches simulation parameters, preferring precomputed params when available.
 * Falls back to client-side extraction for immediate rendering.
 */

import { useState, useEffect } from 'react'
import type { SimulationType } from '@/types/simulation'
import type { ScaffoldData } from '@/types/scaffold'
import { detectSimulationType, extractParameters } from '@/lib/simulationService'

interface SimulationParams {
  type: SimulationType
  params: Record<string, number | undefined>
  source: 'precomputed' | 'live' | 'client'
  isLoading: boolean
}

interface UseSimulationParamsOptions {
  questionId?: string
  scaffoldData?: ScaffoldData
  preferPrecomputed?: boolean
}

/**
 * Hook to get simulation parameters with precompute support
 *
 * @param options.questionId - Question ID for precomputed lookup
 * @param options.scaffoldData - Scaffold data for client-side extraction
 * @param options.preferPrecomputed - Whether to fetch precomputed params (default: true if questionId provided)
 */
export function useSimulationParams(options: UseSimulationParamsOptions): SimulationParams {
  const { questionId, scaffoldData, preferPrecomputed = !!questionId } = options

  // Initialize with client-side extraction for immediate rendering
  const [params, setParams] = useState<SimulationParams>(() => {
    if (scaffoldData) {
      const type = detectSimulationType(scaffoldData)
      const extracted = extractParameters(scaffoldData)
      return {
        type,
        params: extracted.params,
        source: 'client',
        isLoading: preferPrecomputed && !!questionId,
      }
    }
    return {
      type: 'unsupported',
      params: {},
      source: 'client',
      isLoading: preferPrecomputed && !!questionId,
    }
  })

  // Fetch precomputed params if questionId provided
  useEffect(() => {
    if (!questionId || !preferPrecomputed) return

    let cancelled = false

    async function fetchParams() {
      try {
        const response = await fetch(`/api/simulation/params?questionId=${questionId}`)
        const data = await response.json()

        if (cancelled) return

        if (data.success && data.data) {
          setParams({
            type: data.data.type,
            params: data.data.params,
            source: data.source || 'precomputed',
            isLoading: false,
          })
        } else {
          // Keep client-side extracted params
          setParams((prev) => ({ ...prev, isLoading: false }))
        }
      } catch (error) {
        console.error('[useSimulationParams] Error fetching params:', error)
        // Keep client-side extracted params
        setParams((prev) => ({ ...prev, isLoading: false }))
      }
    }

    fetchParams()

    return () => {
      cancelled = true
    }
  }, [questionId, preferPrecomputed])

  return params
}
