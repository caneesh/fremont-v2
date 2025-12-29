'use client'

import { useState } from 'react'
import type { ScaffoldData } from '@/types/scaffold'
import type { SimulationType } from '@/types/simulation'
import { detectSimulationType, extractParameters } from '@/lib/simulationService'
import ProjectileSimulation from './ProjectileSimulation'
import InclinePlaneSimulation from './InclinePlaneSimulation'

interface WhatIfSimulationProps {
  scaffoldData: ScaffoldData
  onClose?: () => void
}

/**
 * WhatIfSimulation - Main wrapper component for physics simulations
 * Detects the appropriate simulation type based on problem content
 * and renders the corresponding interactive simulation
 */
export default function WhatIfSimulation({ scaffoldData, onClose }: WhatIfSimulationProps) {
  const [isOpen, setIsOpen] = useState(false)

  const simulationType = detectSimulationType(scaffoldData)
  const extractedParams = extractParameters(scaffoldData)

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  // Don't render anything if simulation type is unsupported
  if (simulationType === 'unsupported') {
    return null
  }

  return (
    <>
      {/* Simulation Mode Button */}
      {!isOpen && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border-2 border-indigo-200 dark:border-indigo-500/30 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white shadow-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-dark-text-primary">
                  What-If Simulation
                </h3>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                  {simulationType === 'projectile'
                    ? 'Explore how velocity and angle affect the trajectory'
                    : 'See how angle and friction change the motion'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Launch Simulation
            </button>
          </div>

          {/* Feature highlights */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-medium">
              Interactive
            </span>
            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-medium">
              Adjustable Parameters
            </span>
            <span className="px-2 py-1 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 rounded-full text-xs font-medium">
              Real-time Visualization
            </span>
          </div>
        </div>
      )}

      {/* Simulation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-auto animate-scale-in">
            {simulationType === 'projectile' && (
              <ProjectileSimulation
                initialParams={extractedParams.params}
                onClose={handleClose}
              />
            )}
            {simulationType === 'incline' && (
              <InclinePlaneSimulation
                initialParams={extractedParams.params}
                onClose={handleClose}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}

/**
 * SimulationButton - Standalone button to launch simulation
 * Use this when you need just the button without the full card
 */
export function SimulationButton({
  scaffoldData,
  variant = 'default',
}: {
  scaffoldData: ScaffoldData
  variant?: 'default' | 'compact' | 'icon'
}) {
  const [isOpen, setIsOpen] = useState(false)

  const simulationType = detectSimulationType(scaffoldData)
  const extractedParams = extractParameters(scaffoldData)

  if (simulationType === 'unsupported') {
    return null
  }

  const handleClose = () => setIsOpen(false)

  return (
    <>
      {variant === 'icon' ? (
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
          title="Launch What-If Simulation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>
      ) : variant === 'compact' ? (
        <button
          onClick={() => setIsOpen(true)}
          className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Simulate
        </button>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          What-If Simulation
        </button>
      )}

      {/* Simulation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-auto animate-scale-in">
            {simulationType === 'projectile' && (
              <ProjectileSimulation
                initialParams={extractedParams.params}
                onClose={handleClose}
              />
            )}
            {simulationType === 'incline' && (
              <InclinePlaneSimulation
                initialParams={extractedParams.params}
                onClose={handleClose}
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}
